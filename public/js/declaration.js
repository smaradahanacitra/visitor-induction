/**
 * declaration.js
 * Handles the declaration/pernyataan page (success.html).
 * Guards against direct access. Handles health declaration form + final submission.
 */

'use strict';

let visitorData = null;
let fitAnswer   = null;  // 'yes' | 'no'

// ── Toast ────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ── Guard ────────────────────────────────────────────────────────
(function guard() {
  const raw  = sessionStorage.getItem('visitor_data');
  const prog = sessionStorage.getItem('video_progress');

  if (!raw || !prog) { window.location.replace('index.html'); return; }

  try {
    visitorData = JSON.parse(raw);
    const videoProgress = JSON.parse(prog);
    const rulesConfirmed = sessionStorage.getItem('rules_confirmed') === 'true';

    // Update navbar name
    const navName = document.getElementById('visitor-name-target');
    const wrapEl = document.getElementById('visitor-greeting');
    if (navName) navName.textContent = visitorData.nama;
    if (wrapEl) wrapEl.style.opacity = '1';

    if (!videoProgress.every(Boolean) || !rulesConfirmed) {
      window.location.replace('video.html');
      return;
    }
  } catch { window.location.replace('index.html'); }
})();

// ── Fit to work selection ────────────────────────────────────────
function selectFit(val, event) {
  if (event) {
    // If clicking the label, prevent duplicate clicks from the 'for' attribute
    // but ensured the radio is still checked.
    // Actually, just let the radio change handle it if we used an event listener.
    // Instead, we'll keep manual sync but be more careful.
  }
  fitAnswer = val;
  const radYes = document.getElementById('fit-yes');
  const radNo  = document.getElementById('fit-no');
  if (radYes) radYes.checked = (val === 'yes');
  if (radNo)  radNo.checked  = (val === 'no');

  const lYes = document.getElementById('fit-yes-label');
  const lNo  = document.getElementById('fit-no-label');
  if (lYes) lYes.className = 'fit-option' + (val === 'yes' ? ' selected-fit' : '');
  if (lNo)  lNo.className  = 'fit-option' + (val === 'no' ? ' selected-notfit' : '');
  
  checkSubmitReady();
}

// ── Agree checkbox ───────────────────────────────────────────────
function onAgreeChange() {
  checkSubmitReady();
}

// ── Enable submit when all filled ───────────────────────────────
function checkSubmitReady() {
  const allHealthAnswered = checkAllHealthAnswered();
  const fitAnswered       = fitAnswer !== null;
  const agreed            = document.getElementById('agree-checkbox')?.checked;

  const btn = document.getElementById('btn-submit-decl');
  if (btn) {
    const ready = allHealthAnswered && fitAnswered && agreed;
    btn.disabled = !ready;
    btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
  }
}

function toggleHealthInput(prefix, show) {
  const wrapper = document.getElementById(`h${prefix}-input-wrapper`);
  const input = document.getElementById(`h${prefix}-input`);
  if (wrapper && input) {
    wrapper.style.display = show ? 'block' : 'none';
    if (!show) input.value = ''; // clear when hidden
  }
  checkSubmitReady();
}

function checkAllHealthAnswered() {
  for (let i = 1; i <= 9; i++) {
    const radios = document.querySelectorAll(`input[name="h${i}"]`);
    const isChecked = Array.from(radios).some(r => r.checked);
    if (!isChecked) return false;
    
    // For h8 and h9, if 'ya' is selected, the text input must not be empty
    if (i === 8 || i === 9) {
      const yesChecked = document.querySelector(`input[name="h${i}"][value="ya"]`)?.checked;
      if (yesChecked) {
        const textVal = document.getElementById(`h${i}-input`)?.value.trim();
        if (!textVal) return false;
      }
    }
  }
  return true;
}

// ── Listen to health radio changes ──────────────────────────────
document.querySelectorAll('.health-yn input[type="radio"]').forEach(radio => {
  radio.addEventListener('change', checkSubmitReady);
});

// ── Submit Declaration ───────────────────────────────────────────
function submitDeclaration() {
  // Collect health answers
  const health = {};
  for (let i = 1; i <= 9; i++) {
    const checked = document.querySelector(`input[name="h${i}"]:checked`);
    health[`h${i}`] = checked ? checked.value : null;

    if ((i === 8 || i === 9) && health[`h${i}`] === 'ya') {
      health[`h${i}_details`] = document.getElementById(`h${i}-input`)?.value.trim();
    }
  }

  if (!fitAnswer) {
    const lang = window.currentLang || 'id';
    const msg = (translations[lang] && translations[lang]["Pilih kondisi kesehatan Anda saat ini"]) ? translations[lang]["Pilih kondisi kesehatan Anda saat ini"] : "Pilih kondisi kesehatan Anda saat ini";
    showToast(msg, 'warning');
    return;
  }

  if (!document.getElementById('agree-checkbox')?.checked) {
    const lang = window.currentLang || 'id';
    const msg = (translations[lang] && translations[lang]["Anda harus menyetujui pernyataan terlebih dahulu"]) ? translations[lang]["Anda harus menyetujui pernyataan terlebih dahulu"] : "Anda harus menyetujui pernyataan terlebih dahulu";
    showToast(msg, 'warning');
    return;
  }

  // Save declaration data
  const declarationData = {
    ...health,
    fit_to_work:    fitAnswer,
    agreed:         true,
    declared_at:    new Date().toISOString(),
  };
  sessionStorage.setItem('declaration_data', JSON.stringify(declarationData));

  // Update visitor status
  const data = JSON.parse(sessionStorage.getItem('visitor_data') || '{}');
  data.status       = 'completed';
  data.completed_at = new Date().toISOString();
  
  // Push update to Supabase
  const btn = document.getElementById('btn-submit-decl');
  btn.disabled = true;
  const lang = window.currentLang || 'id';
  const saving = (translations[lang] && translations[lang]["Sedang Menyimpan..."]) ? translations[lang]["Sedang Menyimpan..."] : "Sedang Menyimpan...";
  btn.innerHTML = `<span class="spinner-border"></span> ${saving}`;

  window.supabaseClient
    .from('visitor_inductions')
    .update({ 
      health_data: declarationData,
      status: 'completed',
      completed_at: data.completed_at
    })
    .eq('id', data.id)
    .then(({ error }) => {
      if (error) {
        console.error('Supabase update error:', error);
        showToast('Gagal menyimpan ke database.', 'error');
        btn.disabled = false;
        btn.innerHTML = '✅ Submit Pernyataan';
        return;
      }
      
      sessionStorage.setItem('visitor_data', JSON.stringify(data));
      // Show done state
      preparePrintForm(data, declarationData);
      showDoneState(data);
      spawnConfetti();
      showToast('Pernyataan berhasil disubmit!', 'success');
    });
}

// ── Show done state ──────────────────────────────────────────────
function showDoneState(data) {
  // Jump to top immediately to prevent "pull down" feeling
  window.scrollTo(0, 0);

  document.getElementById('declaration-form-wrap').style.display = 'none';
  document.getElementById('declaration-done-wrap').style.display = 'block';

  const fmt = s => s || '—';
  const nameEl = document.getElementById('done-name');
  if (nameEl) nameEl.textContent = fmt(data.nama);

  const fields = {
    'done-nama':       data.nama,
    'done-perusahaan': data.perusahaan,
    'done-jabatan':    data.jabatan,
    'done-tanggal':    formatDate(data.completed_at),
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt(val);
  });
}

// ── Prepare PDF Template Data ────────────────────────────────────
function preparePrintForm(visitor, health) {
  const setT = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };
  
  // Basic info in PDF
  setT('p-val-alergi', health.h8_details || 'Tidak Ada');
  setT('p-val-obat',   health.h9_details || 'Tidak Ada');
  
  setT('p-final-nama',       visitor.nama);
  setT('p-final-perusahaan', visitor.perusahaan);
  setT('p-final-jabatan',    visitor.jabatan);
  setT('p-final-phone',      visitor.no_telpon || visitor.telepon);
  setT('p-final-alamat',     visitor.alamat);
  setT('p-final-ename',      visitor.emergency_nama);
  setT('p-final-erel',       visitor.emergency_relasi || visitor.emergency_hub);
  setT('p-final-waktu',      'Waktu: ' + formatDate(visitor.completed_at));

  // Page 2 Details
  setT('p2-final-nama',       visitor.nama);
  setT('p2-final-perusahaan', visitor.perusahaan);
  setT('p2-final-jabatan',    visitor.jabatan);
  setT('p2-final-phone',      visitor.no_telpon || visitor.telepon);
  setT('p2-final-alamat',     visitor.alamat);
  setT('p2-final-ename',      visitor.emergency_nama);
  setT('p2-final-erel',       visitor.emergency_relasi || visitor.emergency_hub);
  setT('p2-final-ephone',     visitor.emergency_telp);

  // Digital Signature section
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  setT('p-sign-date', 'Signed on: ' + dateStr);
  setT('p2-sign-name', visitor.nama);

  // Health History Checkboxes (h1-h7)
  for (let i = 1; i <= 7; i++) {
    const key = `h${i}`;
    const val = health[key];
    const yEl = document.getElementById(`${key}-y`);
    const nEl = document.getElementById(`${key}-n`);
    if (yEl) yEl.textContent = (val === 'ya') ? '✓' : '';
    if (nEl) nEl.textContent = (val === 'tidak') ? '✓' : '';
  }

  // Others text
  const lainnyaVal = document.getElementById('p-val-lainnya');
  if (lainnyaVal) lainnyaVal.textContent = health.h7_details || '';

  // Fit to Work Checkboxes
  const fitVal = health.fit_to_work;
  const fyEl = document.getElementById('fit-y');
  const fnEl = document.getElementById('fit-n');
  if (fyEl) fyEl.textContent = (fitVal === 'yes') ? '✓' : '';
  if (fnEl) fnEl.textContent = (fitVal === 'no') ? '✓' : '';
}

// ── PDF Export Logic ───────────────────────────────────────────────
function downloadPDF() {
  const btn = document.getElementById('btn-download-pdf');
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '⏱️ <span data-i18n="Menyiapkan PDF...">Memproses...</span>';
  btn.disabled = true;

  // Terapkan class sementara ke body untuk styling
  document.body.classList.add('pdf-exporting');
  const element = document.getElementById('print-area');
  
  if (!visitorData) {
    visitorData = JSON.parse(sessionStorage.getItem('visitor_data') || '{}');
  }
  const namaFormated = (visitorData.nama || 'Visitor').replace(/\s+/g, '_');

  const opt = {
    margin:       [0, 0],
    filename:     `Visitor_Induction_${namaFormated}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Reset lingkungan kloningan
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.padding = '0';
        clonedDoc.body.classList.add('pdf-exporting');
        
        const clonedEl = clonedDoc.getElementById('print-area');
        if (clonedEl) {
          clonedEl.style.display = 'block';
          clonedEl.style.visibility = 'visible';
        }
      }
    },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  // Langsung eksekusi tanpa timeout panjang karena onclone yang menangani visibilitas
  html2pdf().set(opt).from(element).save().then(() => {
    document.body.classList.remove('pdf-exporting');
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }).catch(err => {
    console.error('PDF Export error:', err);
    document.body.classList.remove('pdf-exporting');
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    showToast('Gagal membuat PDF. Silakan coba lagi.', 'error');
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── Confetti ─────────────────────────────────────────────────────
function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  const colors = ['#FF6B00','#FFD700','#22c55e','#3b82f6','#a855f7','#ffffff'];

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.classList.add('confetti-piece');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = 6 + Math.random() * 8;
    const isCircle = Math.random() > 0.5;
    Object.assign(piece.style, {
      left:              `${Math.random() * 100}%`,
      backgroundColor:   color,
      width:             `${size}px`,
      height:            `${size * (isCircle ? 1 : 0.5)}px`,
      borderRadius:      isCircle ? '50%' : '2px',
      animationDuration: `${2.5 + Math.random() * 3}s`,
      animationDelay:    `${Math.random() * 2}s`,
    });
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, 6000);
}

// ── Start over ───────────────────────────────────────────────────
function startOver() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}
