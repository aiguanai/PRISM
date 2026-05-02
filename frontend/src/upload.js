// ─── Upload screen logic ───────────────────────────────────────────────────

const ALLOWED_TYPES = ['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png'];
const ALLOWED_EXTS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_SIZE = 10 * 1024 * 1024;

const FILE_ICONS = {
  'pdf': '📕', 'docx': '📘', 'doc': '📘',
  'jpg': '🖼', 'jpeg': '🖼', 'png': '🖼',
};

let selectedFile = null;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

function validateFile(file) {
  const ext = '.' + getExt(file.name);
  if (!ALLOWED_EXTS.includes(ext)) {
    return `Unsupported file type "${ext}". Please upload a PDF, DOCX, JPG, or PNG.`;
  }
  if (file.size > MAX_SIZE) {
    return `File is too large (${formatBytes(file.size)}). Maximum size is 10 MB.`;
  }
  return null;
}

function showFileSelected(file) {
  const dzDefault = document.getElementById('dz-default');
  const dzSelected = document.getElementById('dz-selected');
  const fileIcon = document.getElementById('file-icon');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const analyzeBtn = document.getElementById('analyze-btn');
  const dzError = document.getElementById('dz-error');

  if (dzDefault) dzDefault.style.display = 'none';
  if (dzSelected) dzSelected.style.display = 'flex';
  if (dzError) { dzError.textContent = ''; dzError.style.display = 'none'; }

  const ext = getExt(file.name);
  if (fileIcon) fileIcon.textContent = FILE_ICONS[ext] || '📄';
  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = formatBytes(file.size);
  if (analyzeBtn) analyzeBtn.disabled = false;

  const dz = document.getElementById('drop-zone');
  if (dz) dz.classList.add('has-file');
}

function showFileError(message) {
  const dzDefault = document.getElementById('dz-default');
  const dzSelected = document.getElementById('dz-selected');
  const dzError = document.getElementById('dz-error');
  if (dzDefault) dzDefault.style.display = '';
  if (dzSelected) dzSelected.style.display = 'none';
  if (dzError) {
    dzError.textContent = message;
    dzError.style.display = 'block';
  }
  selectedFile = null;
  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) analyzeBtn.disabled = true;
}

function handleFileSelected(file) {
  const error = validateFile(file);
  if (error) {
    showFileError(error);
  } else {
    selectedFile = file;
    showFileSelected(file);
  }
}

// ─── Progress tracking ────────────────────────────────────────────────────
const STAGE_LABELS = {
  extracting: 'Extracting document text…',
  segmenting: 'Identifying clause boundaries…',
  classifying: 'Analysing clauses for predatory patterns…',
  validating: 'Cross-checking RBI regulations…',
  generating_report: 'Generating your risk report…',
};

const STAGE_ORDER = ['extracting', 'segmenting', 'classifying', 'validating', 'generating_report'];

function updateProgress(progress, stage) {
  const fill = document.getElementById('progress-fill');
  const pct = document.getElementById('progress-pct');
  const stageText = document.getElementById('progress-stage-text');

  if (fill) fill.style.width = progress + '%';
  if (pct) pct.textContent = progress + '%';
  if (stageText && stage) stageText.textContent = STAGE_LABELS[stage] || 'Processing…';

  // Update step nodes
  if (stage) {
    const currentIdx = STAGE_ORDER.indexOf(stage);
    STAGE_ORDER.forEach((s, i) => {
      const node = document.querySelector(`.step-item[data-stage="${s}"] .step-node`);
      if (!node) return;
      node.classList.remove('active', 'done');
      if (i < currentIdx) node.classList.add('done');
      else if (i === currentIdx) node.classList.add('active');
    });
  }

  // Estimated time
  if (window.PRISM.uploadStartTime) {
    const elapsed = (Date.now() - window.PRISM.uploadStartTime) / 1000;
    if (progress > 5) {
      const estimatedTotal = elapsed / (progress / 100);
      const remaining = Math.max(0, estimatedTotal - elapsed);
      const timeEl = document.getElementById('progress-time');
      if (timeEl) {
        timeEl.textContent = remaining > 5
          ? `~${Math.round(remaining)}s remaining`
          : 'Almost done…';
      }
    }
  }
}

function showProgressSection() {
  const uploadMain = document.querySelector('.upload-main');
  const progressSection = document.getElementById('progress-section');
  if (uploadMain) uploadMain.style.display = 'none';
  if (progressSection) progressSection.style.display = 'block';
  // Reset all steps
  STAGE_ORDER.forEach(s => {
    const node = document.querySelector(`.step-item[data-stage="${s}"] .step-node`);
    if (node) node.classList.remove('active', 'done');
  });
}

// ─── Upload and polling ───────────────────────────────────────────────────
async function startUpload(file) {
  hideErrorBanner();
  showProgressSection();
  window.PRISM.uploadStartTime = Date.now();
  updateProgress(0, 'extracting');

  let jobId;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await apiFetch('/upload', { method: 'POST', body: formData });
    const data = await resp.json();
    jobId = data.job_id;
    window.PRISM.currentJobId = jobId;
  } catch (err) {
    showUploadError(`Upload failed: ${err.message}`);
    return;
  }

  // Poll for status
  window.PRISM.pollInterval = setInterval(async () => {
    try {
      const statusResp = await apiFetch(`/status/${jobId}`);
      const status = await statusResp.json();

      updateProgress(status.progress || 0, status.current_stage);

      if (status.status === 'completed') {
        clearInterval(window.PRISM.pollInterval);
        window.PRISM.pollInterval = null;
        updateProgress(100, null);
        // Mark all steps done
        STAGE_ORDER.forEach(s => {
          const node = document.querySelector(`.step-item[data-stage="${s}"] .step-node`);
          if (node) { node.classList.remove('active'); node.classList.add('done'); }
        });
        setTimeout(() => loadResults(jobId), 600);

      } else if (status.status === 'failed') {
        clearInterval(window.PRISM.pollInterval);
        window.PRISM.pollInterval = null;
        const stage = status.failed_stage || 'processing';
        showUploadError(
          `Analysis failed during the ${stage} stage. Please try again.`,
          () => startUpload(selectedFile || file)
        );
      }
    } catch (err) {
      // Network glitch — keep polling
      console.warn('Poll error:', err);
    }
  }, 2000);
}

function showUploadError(message, retryFn) {
  const uploadMain = document.querySelector('.upload-main');
  const progressSection = document.getElementById('progress-section');
  if (progressSection) progressSection.style.display = 'none';
  if (uploadMain) uploadMain.style.display = '';
  showErrorBanner(message, retryFn);
}

// ─── Demo analysis ────────────────────────────────────────────────────────
async function startDemo() {
  hideErrorBanner();
  showProgressSection();
  window.PRISM.uploadStartTime = Date.now();
  updateProgress(5, 'extracting');

  try {
    const resp = await apiFetch('/demo', { method: 'GET' });
    const data = await resp.json();
    const jobId = data.job_id;
    window.PRISM.currentJobId = jobId;

    window.PRISM.pollInterval = setInterval(async () => {
      try {
        const statusResp = await apiFetch(`/status/${jobId}`);
        const status = await statusResp.json();
        updateProgress(status.progress || 0, status.current_stage);

        if (status.status === 'completed') {
          clearInterval(window.PRISM.pollInterval);
          window.PRISM.pollInterval = null;
          updateProgress(100, null);
          STAGE_ORDER.forEach(s => {
            const node = document.querySelector(`.step-item[data-stage="${s}"] .step-node`);
            if (node) { node.classList.remove('active'); node.classList.add('done'); }
          });
          setTimeout(() => loadResults(jobId), 600);
        } else if (status.status === 'failed') {
          clearInterval(window.PRISM.pollInterval);
          showUploadError('Demo analysis failed. Is the backend running?');
        }
      } catch (err) {
        console.warn('Demo poll error:', err);
      }
    }, 2000);
  } catch (err) {
    showUploadError(`Could not start demo: ${err.message}. Make sure the backend is running at ${API_BASE}.`);
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const demoBtn = document.getElementById('demo-btn');
  const dzHover = document.getElementById('dz-hover');
  const dzDefault = document.getElementById('dz-default');

  // Click on drop zone opens file picker
  dropZone.addEventListener('click', (e) => {
    if (!e.target.closest('button')) fileInput.click();
  });
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  // Drag events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
    if (dzDefault) dzDefault.style.display = 'none';
    if (dzHover) dzHover.style.display = 'flex';
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('dragover');
      if (dzHover) dzHover.style.display = 'none';
      if (dzDefault && !selectedFile) dzDefault.style.display = '';
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (dzHover) dzHover.style.display = 'none';
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelected(files[0]);
  });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFileSelected(fileInput.files[0]);
  });

  // Analyze button
  analyzeBtn.addEventListener('click', () => {
    if (selectedFile) startUpload(selectedFile);
  });
  analyzeBtn.addEventListener('mousedown', () => analyzeBtn.classList.add('pressed'));
  analyzeBtn.addEventListener('mouseup', () => analyzeBtn.classList.remove('pressed'));

  // Demo button
  demoBtn.addEventListener('click', startDemo);
});
