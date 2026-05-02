// ─── Report download handler ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-btn');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', async () => {
    const jobId = window.PRISM?.currentJobId;
    if (!jobId) {
      alert('No analysis available to download.');
      return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ Preparing report…';

    try {
      const resp = await fetch(`${API_BASE}/report/${jobId}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
        throw new Error(err.detail || 'Download failed');
      }

      // Detect content type to determine file extension
      const contentType = resp.headers.get('Content-Type') || '';
      const isHtml = contentType.includes('text/html');
      const ext = isHtml ? 'html' : 'pdf';
      const filename = `PRISM_Report_${jobId.slice(0, 8)}.${ext}`;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      alert(`Could not download report: ${err.message}`);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '↓ Download Full Report PDF';
    }
  });
});
