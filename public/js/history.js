let allHistoryChats = [];

document.addEventListener('DOMContentLoaded', function() {
  loadHistory();
  setupHistoryEvents();
});

async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Gagal memuat riwayat chat');
    const data = await res.json();
    allHistoryChats = data.chats || [];
    renderHistory();
  } catch (e) {
    console.error('Failed to load history:', e);
    const list = document.getElementById('historyList');
    if (list) {
      list.innerHTML = '<div class="history-empty">Gagal memuat riwayat chat. Coba refresh halaman.</div>';
    }
  }
}

function setupHistoryEvents() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterHistory);
  }
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  list.innerHTML = '';

  if (allHistoryChats.length === 0) {
    list.innerHTML = '<div class="history-empty">Belum ada riwayat chat.</div>';
    return;
  }

  allHistoryChats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const preview = chat.last_message ? chat.last_message.substring(0, 100) : 'No messages';
    const dateStr = chat.updated_at ? new Date(chat.updated_at).toLocaleDateString() : '';
    item.innerHTML = `
      <a href="/chat?id=${chat.id}" class="history-item-info" style="text-decoration:none;color:inherit;">
        <div class="history-title">${escapeHtml(chat.title)}</div>
        <div class="history-preview">${escapeHtml(preview)}</div>
        <div class="history-date">${dateStr}</div>
      </a>
      <div class="history-actions">
        <button onclick="renameChat('${chat.id}')" class="btn-secondary">✏️ Rename</button>
        <button onclick="deleteHistoryChat('${chat.id}')" class="btn-danger">🗑️ Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function filterHistory(e) {
  const query = e.target.value.toLowerCase();
  const items = document.querySelectorAll('.history-item');
  items.forEach(item => {
    const title = item.querySelector('.history-title').textContent.toLowerCase();
    const preview = item.querySelector('.history-preview').textContent.toLowerCase();
    item.style.display = (title.includes(query) || preview.includes(query)) ? 'flex' : 'none';
  });
}

async function renameChat(chatId) {
  const chat = allHistoryChats.find(c => c.id === chatId);
  if (!chat) return;

  const newName = prompt('New name:', chat.title);
  if (!newName) return;

  try {
    const res = await fetch(`/api/history/${chatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newName })
    });
    if (!res.ok) throw new Error('Gagal rename chat');
    chat.title = newName;
    renderHistory();
    if (window.showToast) showToast('Chat renamed', 'success');
  } catch (e) {
    console.error('Rename failed:', e);
    if (window.showToast) showToast('Gagal rename chat', 'error');
  }
}

async function deleteHistoryChat(chatId) {
  if (!confirm('Delete this chat?')) return;

  try {
    const res = await fetch(`/api/history/${chatId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus chat');
    allHistoryChats = allHistoryChats.filter(c => c.id !== chatId);
    renderHistory();
    if (window.showToast) showToast('Chat deleted', 'success');
  } catch (e) {
    console.error('Delete failed:', e);
    if (window.showToast) showToast('Gagal menghapus chat', 'error');
  }
}

async function clearAllHistory() {
  if (!confirm('Clear all chat history? This cannot be undone.')) return;

  try {
    await Promise.all(allHistoryChats.map(c => fetch(`/api/history/${c.id}`, { method: 'DELETE' })));
    allHistoryChats = [];
    renderHistory();
    if (window.showToast) showToast('All history cleared', 'success');
  } catch (e) {
    console.error('Clear all failed:', e);
    if (window.showToast) showToast('Gagal menghapus semua riwayat', 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.renameChat = renameChat;
window.deleteHistoryChat = deleteHistoryChat;
window.clearAllHistory = clearAllHistory;
