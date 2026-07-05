document.addEventListener('DOMContentLoaded', function() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    setTimeout(() => {
      loadingEl.classList.add('hide');
    }, 1500);
  }
  
  initializeApp();
});

let aiStatus = 'online';
let currentModel = 'Qwen/Qwen2.5-7B-Instruct';
let appInitialized = false;

function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  checkAPIStatus();
  loadSettings();
  setupEventListeners();
}

function checkAPIStatus() {
  console.log('[app] checking API status...');
  fetch('/health')
    .then(response => {
      if (response.ok) {
        updateStatus('online');
      } else {
        updateStatus('offline');
      }
    })
    .catch(error => {
      console.error('[app] API status check failed:', error);
      updateStatus('offline');
    });
}

function updateStatus(status) {
  aiStatus = status;
  const indicator = document.getElementById('statusIndicator');
  const text = document.getElementById('statusText');

  if (!indicator || !text) return;

  indicator.className = `status-${status}`;

  if (status === 'online') {
    text.textContent = 'Online';
  } else if (status === 'thinking') {
    text.textContent = 'Thinking...';
  } else {
    text.textContent = 'Offline';
  }
}

function loadSettings() {
  fetch('/api/settings')
    .then(res => res.json())
    .then(settings => {
      if (settings.model) {
        currentModel = settings.model;
      }
      if (settings.theme) {
        applyTheme(settings.theme);
      }
    })
    .catch(err => console.error('Failed to load settings:', err));
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.style.background = '#f0f0f0';
    document.body.style.color = '#1a1a2e';
  } else {
    document.body.style.background = 'var(--bg-dark)';
    document.body.style.color = 'var(--text-primary)';
  }
}

function setupEventListeners() {
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      if (input) {
        sendMessage();
      }
    }
  });
}

function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Navigation functions
function getSidebarEls() {
  // chat.html uses ids (#chatSidebar/#sidebarOverlay); history/settings/about/support
  // pages use classes (.page-sidebar/.page-overlay) with no id, so both must be checked.
  const sidebar = document.getElementById('chatSidebar') || document.querySelector('.page-sidebar');
  const overlay = document.getElementById('sidebarOverlay') || document.querySelector('.page-overlay');
  return { sidebar, overlay };
}

function toggleSidebar() {
  const { sidebar, overlay } = getSidebarEls();
  if (sidebar) sidebar.classList.toggle('active');
  if (overlay) overlay.classList.toggle('active');
}

function closeSidebar() {
  const { sidebar, overlay } = getSidebarEls();
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

// Export to global scope
window.showToast = showToast;
window.updateStatus = updateStatus;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.initializeApp = initializeApp;
