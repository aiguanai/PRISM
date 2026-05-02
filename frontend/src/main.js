// ─── Global configuration ──────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000/api';

// ─── Global state ──────────────────────────────────────────────────────────
window.PRISM = {
  currentJobId: null,
  currentResults: null,
  pollInterval: null,
  uploadStartTime: null,
};

// ─── Screen transitions ────────────────────────────────────────────────────
function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active', 'slide-in');
  });
  const target = document.getElementById(screenId);
  if (!target) return;
  target.style.display = screenId === 'results-screen' ? 'flex' : 'block';
  target.style.flexDirection = screenId === 'results-screen' ? 'column' : '';
  requestAnimationFrame(() => {
    target.classList.add('active', 'slide-in');
  });
}

function showUploadScreen() {
  showScreen('upload-screen');
  resetUploadUI();
}

function showResultsScreen() {
  showScreen('results-screen');
}

// ─── Error utilities ───────────────────────────────────────────────────────
function showErrorBanner(message, retryCallback) {
  const banner = document.getElementById('error-banner');
  const msg = document.getElementById('error-banner-msg');
  const retryBtn = document.getElementById('error-retry-btn');
  msg.textContent = message;
  banner.style.display = 'flex';
  retryBtn.onclick = () => {
    banner.style.display = 'none';
    if (retryCallback) retryCallback();
    else resetUploadUI();
  };
}

function hideErrorBanner() {
  const banner = document.getElementById('error-banner');
  if (banner) banner.style.display = 'none';
}

// ─── Upload UI reset ───────────────────────────────────────────────────────
function resetUploadUI() {
  hideErrorBanner();
  const progressSection = document.getElementById('progress-section');
  const uploadMain = document.querySelector('.upload-main');
  if (progressSection) progressSection.style.display = 'none';
  if (uploadMain) uploadMain.style.display = '';

  const dzDefault = document.getElementById('dz-default');
  const dzSelected = document.getElementById('dz-selected');
  const dzError = document.getElementById('dz-error');
  const analyzeBtn = document.getElementById('analyze-btn');
  const fileInput = document.getElementById('file-input');

  if (dzDefault) dzDefault.style.display = '';
  if (dzSelected) dzSelected.style.display = 'none';
  if (dzError) { dzError.textContent = ''; dzError.style.display = 'none'; }
  if (analyzeBtn) analyzeBtn.disabled = true;
  if (fileInput) fileInput.value = '';

  const dropZone = document.getElementById('drop-zone');
  if (dropZone) dropZone.classList.remove('dragover', 'has-file');

  if (window.PRISM.pollInterval) {
    clearInterval(window.PRISM.pollInterval);
    window.PRISM.pollInterval = null;
  }
  window.PRISM.currentJobId = null;
  window.PRISM.currentResults = null;
}

// ─── API helpers ───────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail || err.message || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return response;
}

// ─── New analysis button ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const newBtn = document.getElementById('new-analysis-btn');
  if (newBtn) newBtn.addEventListener('click', showUploadScreen);
});
