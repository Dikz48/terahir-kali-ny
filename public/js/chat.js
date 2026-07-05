let currentChatId = null;
let isGenerating = false;
let currentAbortController = null;

document.addEventListener('DOMContentLoaded', function() {
  initializeChatPage();
});

function initializeChatPage() {
  renderChatHistory();
  setupChatEvents();
  focusInput();

  const params = new URLSearchParams(window.location.search);
  const chatIdParam = params.get('id');
  if (chatIdParam) {
    loadChat(chatIdParam);
  }
}

function getUserSettings() {
  try {
    const saved = localStorage.getItem('appSettings');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to read settings:', e);
  }
  return {};
}

function setupChatEvents() {
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('chatInput');
  const stopBtn = document.getElementById('stopBtn');

  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    input.addEventListener('input', function() {
      autoResizeTextarea();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', stopGeneration);
  }
}

function autoResizeTextarea() {
  const input = document.getElementById('chatInput');
  if (input) {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  }
}

function focusInput() {
  const input = document.getElementById('chatInput');
  if (input) {
    input.focus();
  }
}

function newChat() {
  currentChatId = null;
  const messagesContainer = document.getElementById('chatMessages');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
  renderChatHistory();
  closeSidebar();
  focusInput();
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim() || isGenerating) {
    return;
  }

  const message = input.value.trim();
  input.value = '';
  input.style.height = 'auto';

  addMessageToChat('user', message);
  isGenerating = true;
  updateSendButton();

  const settings = getUserSettings();

  try {
    currentAbortController = new AbortController();
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        chatId: currentChatId,
        model: (typeof currentModel !== 'undefined' ? currentModel : settings.model),
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
      }),
      signal: currentAbortController.signal
    });

    if (!response.ok) {
      let errMsg = 'Failed to get response from server';
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch (e) {
        // response body not JSON, keep default message
      }
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    let messageElement = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            continue;
          }

          try {
            const json = JSON.parse(data);

            if (json.error) {
              showToast(json.error, 'error');
              addMessageToChat('system', json.error);
            }

            if (json.content) {
              assistantMessage += json.content;
              if (!messageElement) {
                messageElement = addMessageToChat('assistant', assistantMessage, true);
              } else {
                updateMessage(messageElement, assistantMessage);
              }
              autoScrollChat();
            }

            if (json.done && json.chatId) {
              currentChatId = json.chatId;
            }
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        }
      }
    }

    if (messageElement) {
      finalizeMessage(messageElement);
    }

    // Refresh sidebar so the (possibly new) chat shows up / moves to top
    renderChatHistory();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Generation stopped by user');
    } else {
      console.error('Error:', error);
      showToast(error.message || 'Error communicating with server', 'error');
      addMessageToChat('system', 'Sorry, there was an error processing your request: ' + (error.message || ''));
    }
  } finally {
    isGenerating = false;
    updateSendButton();
    focusInput();
  }
}

function addMessageToChat(role, content, isStreaming = false) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;

  if (role === 'user') {
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  } else if (role === 'system') {
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  } else {
    messageDiv.innerHTML = `<div class="message-content" id="msg-${Date.now()}">${marked.parse(content)}</div>`;
  }

  messagesContainer.appendChild(messageDiv);
  autoScrollChat();

  if (isStreaming) {
    return messageDiv.querySelector('.message-content');
  }
}

function updateMessage(element, content) {
  if (element) {
    element.innerHTML = marked.parse(content);
    highlightCode();
  }
}

function finalizeMessage(element) {
  if (element) {
    highlightCode();
    addMessageActions(element);
  }
}

function addMessageActions(element) {
  const parent = element.parentElement;
  if (parent && !parent.querySelector('.message-actions')) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.innerHTML = `
      <button class="action-btn" onclick="copyMessage(this)">📋 Copy</button>
      <button class="action-btn" onclick="regenerateMessage(this)">🔄 Regenerate</button>
    `;
    parent.appendChild(actions);
  }
}

function copyMessage(btn) {
  const message = btn.closest('.message').querySelector('.message-content').textContent;
  navigator.clipboard.writeText(message).then(() => {
    showToast('Copied to clipboard', 'success');
  });
}

function regenerateMessage(btn) {
  const messageEl = btn.closest('.message').querySelector('.message-content');
  if (messageEl && messageEl.textContent) {
    document.getElementById('chatInput').value = messageEl.textContent;
    focusInput();
  }
}

function highlightCode() {
  document.querySelectorAll('pre code').forEach(block => {
    if (!block.classList.contains('hljs')) {
      hljs.highlightElement(block);
    }
  });
}

function autoScrollChat() {
  const messagesContainer = document.getElementById('chatMessages');
  if (messagesContainer) {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
  }
}

function updateSendButton() {
  const sendBtn = document.getElementById('sendBtn');
  const stopBtn = document.getElementById('stopBtn');

  if (isGenerating) {
    if (sendBtn) sendBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';
  } else {
    if (sendBtn) sendBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
  }
}

async function stopGeneration() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  try {
    await fetch('/api/chat/stop', { method: 'POST' });
  } catch (e) {
    // best-effort; local abort already stopped the UI stream
  }
  isGenerating = false;
  updateSendButton();
}

// ===== History (backend-backed, so nothing gets lost between devices/sessions) =====

async function renderChatHistory() {
  const historyContainer = document.getElementById('chatHistory');
  if (!historyContainer) return;

  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Gagal memuat riwayat chat');
    const data = await res.json();
    const chats = data.chats || [];

    historyContainer.innerHTML = '';
    chats.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'chat-history-item';
      if (chat.id === currentChatId) {
        item.classList.add('active');
      }
      item.innerHTML = `
        <div class="chat-history-title" onclick="loadChat('${chat.id}')">${escapeHtml(chat.title)}</div>
        <button class="chat-history-delete" onclick="deleteChat('${chat.id}')">🗑️</button>
      `;
      historyContainer.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
}

async function loadChat(chatId) {
  try {
    const res = await fetch(`/api/history/${chatId}`);
    if (!res.ok) throw new Error('Chat tidak ditemukan');
    const data = await res.json();

    currentChatId = chatId;
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      (data.messages || []).forEach(msg => {
        const el = addMessageToChat(msg.role, msg.content);
      });
      // Re-add action buttons to the last assistant message
      const lastAssistant = messagesContainer.querySelector('.message-assistant:last-child .message-content');
      if (lastAssistant) {
        highlightCode();
        addMessageActions(lastAssistant);
      }
    }
    renderChatHistory();
    closeSidebar();
  } catch (error) {
    console.error('Failed to load chat:', error);
    showToast('Gagal memuat chat', 'error');
  }
}

async function deleteChat(chatId) {
  if (!confirm('Delete this chat?')) return;
  try {
    const res = await fetch(`/api/history/${chatId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus chat');

    if (currentChatId === chatId) {
      currentChatId = null;
      const messagesContainer = document.getElementById('chatMessages');
      if (messagesContainer) messagesContainer.innerHTML = '';
    }
    renderChatHistory();
  } catch (error) {
    console.error('Failed to delete chat:', error);
    showToast('Gagal menghapus chat', 'error');
  }
}

async function exportChat() {
  if (!currentChatId) {
    showToast('Belum ada chat untuk di-export', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/history/export/${currentChatId}`);
    if (!res.ok) throw new Error('Gagal export chat');
    const data = await res.json();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentChatId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export chat:', error);
    showToast('Gagal export chat', 'error');
  }
}

function clearChat() {
  if (confirm('Clear all messages in this view? (History tetap tersimpan di server, ini hanya membersihkan tampilan)')) {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export to global scope
window.sendMessage = sendMessage;
window.stopGeneration = stopGeneration;
window.newChat = newChat;
window.loadChat = loadChat;
window.deleteChat = deleteChat;
window.exportChat = exportChat;
window.clearChat = clearChat;
window.copyMessage = copyMessage;
window.regenerateMessage = regenerateMessage;
