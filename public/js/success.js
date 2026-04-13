/**
 * success.js
 * Populates the success page with visitor data from sessionStorage.
 * Guards against direct access without completing induction.
 */

'use strict';

// ── Toast helper ─────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icons = { info: 'ℹ️', success: '✅', error: '❌' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ── Guard ────────────────────────────────────────────────────────
(function guard() {
  const raw  = sessionStorage.getItem('visitor_data');
  const prog = sessionStorage.getItem('video_progress');

  if (!raw || !prog) {
    window.location.replace('index.html');
    return;
  }

  try {
    const visitor  = JSON.parse(raw);
    const progress = JSON.parse(prog);

    // Must have completed all videos
    if (!progress.every(Boolean) || visitor.status !== 'completed') {
      window.location.replace('video.html');
      return;
    }

    populatePage(visitor);
    spawnConfetti();

  } catch {
    window.location.replace('index.html');
  }
})();

// ── Populate success page data ───────────────────────────────────
function populatePage(visitor) {
  const fmt = (str) => str || '—';

  // Greeting name
  const nameEl = document.getElementById('success-name');
  if (nameEl) nameEl.textContent = fmt(visitor.nama);

  // Info fields
  const fields = {
    'info-nama':       visitor.nama,
    'info-perusahaan': visitor.perusahaan,
    'info-jabatan':    visitor.jabatan,
    'info-notelp':     visitor.no_telpon,
    'info-tanggal':    formatDate(visitor.completed_at || visitor.registered_at),
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt(val);
  });
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('id-ID', {
      day:    '2-digit',
      month:  'long',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// ── Confetti ─────────────────────────────────────────────────────
function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;

  const colors = ['#FF6B00', '#FFD700', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.classList.add('confetti-piece');

    const color     = colors[Math.floor(Math.random() * colors.length)];
    const left      = Math.random() * 100;
    const duration  = 2.5 + Math.random() * 3;
    const delay     = Math.random() * 2;
    const size      = 6 + Math.random() * 8;
    const isCircle  = Math.random() > 0.5;

    Object.assign(piece.style, {
      left:            `${left}%`,
      backgroundColor: color,
      width:           `${size}px`,
      height:          `${size * (isCircle ? 1 : 0.5)}px`,
      borderRadius:    isCircle ? '50%' : '2px',
      animationDuration: `${duration}s`,
      animationDelay:    `${delay}s`,
    });

    container.appendChild(piece);
  }

  // Clean up confetti after animation
  setTimeout(() => {
    container.innerHTML = '';
  }, 6000);
}

// ── Start Over (new visitor) ──────────────────────────────────────
function startOver() {
  // Clear session
  sessionStorage.removeItem('visitor_data');
  sessionStorage.removeItem('video_progress');
  sessionStorage.removeItem('video_responses');

  window.location.href = 'index.html';
}
