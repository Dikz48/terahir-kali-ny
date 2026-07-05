document.addEventListener('DOMContentLoaded', function() {
  loadSettingsUI();
  setupSettingsEvents();
});

function loadSettingsUI() {
  const themeSelect = document.getElementById('themeSelect');
  const tempSlider = document.getElementById('temperatureSlider');
  const maxTokens = document.getElementById('maxTokens');
  const modelSelect = document.getElementById('modelSelect');

  const settings = loadSettings();

  if (themeSelect) {
    themeSelect.value = settings.theme || 'dark';
  }

  if (tempSlider) {
    tempSlider.value = settings.temperature || 0.7;
    updateTempDisplay(tempSlider.value);
  }

  if (maxTokens) {
    maxTokens.value = settings.maxTokens || 2000;
  }

  if (modelSelect) {
    modelSelect.value = settings.model || 'Qwen/Qwen2.5-7B-Instruct';
  }
}

function setupSettingsEvents() {
  const tempSlider = document.getElementById('temperatureSlider');
  if (tempSlider) {
    tempSlider.addEventListener('input', function(e) {
      updateTempDisplay(e.target.value);
      changeTemperature(e.target.value);
    });
  }
}

function loadSettings() {
  const saved = localStorage.getItem('appSettings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }
  return {
    theme: 'dark',
    temperature: 0.7,
    maxTokens: 2000,
    model: 'Qwen/Qwen2.5-7B-Instruct'
  };
}

function saveSettings(settings) {
  localStorage.setItem('appSettings', JSON.stringify(settings));
}

function changeTheme(theme) {
  const settings = loadSettings();
  settings.theme = theme;
  saveSettings(settings);
  applyTheme(theme);
  showToast('Theme updated', 'success');
}

function changeTemperature(value) {
  const settings = loadSettings();
  settings.temperature = parseFloat(value);
  saveSettings(settings);
}

function updateTempDisplay(value) {
  const display = document.getElementById('tempValue');
  if (display) {
    display.textContent = parseFloat(value).toFixed(1);
  }
}

function changeMaxTokens(value) {
  const settings = loadSettings();
  settings.maxTokens = parseInt(value);
  saveSettings(settings);
  showToast('Max tokens updated', 'success');
}

function changeModel(value) {
  const settings = loadSettings();
  settings.model = value;
  saveSettings(settings);
  window.currentModel = value;
  showToast('Model changed', 'success');
}

function exportSettings() {
  const settings = loadSettings();
  const json = JSON.stringify(settings, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dikz-ai-settings.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Settings exported', 'success');
}

function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const settings = JSON.parse(event.target.result);
          saveSettings(settings);
          loadSettingsUI();
          showToast('Settings imported successfully', 'success');
        } catch (err) {
          showToast('Failed to import settings', 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.style.background = '#f5f5f5';
    document.body.style.color = '#333';
  } else {
    document.body.style.background = 'var(--bg-dark)';
    document.body.style.color = 'var(--text-primary)';
  }
}

window.changeTheme = changeTheme;
window.changeTemperature = changeTemperature;
window.changeMaxTokens = changeMaxTokens;
window.changeModel = changeModel;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
