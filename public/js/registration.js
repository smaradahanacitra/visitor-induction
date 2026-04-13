/**
 * registration.js
 * Handles form validation and submission for visitor registration.
 * Data is saved to sessionStorage and will later be synced to Supabase.
 */

'use strict';

// ── Field configuration ─────────────────────────────────────────
const FIELDS = [
  { id: 'nama',             errorId: 'nama-error',      label: 'Nama lengkap' },
  { id: 'perusahaan',       errorId: 'perusahaan-error',label: 'Nama perusahaan' },
  { id: 'jabatan',          errorId: 'jabatan-error',   label: 'Jabatan' },
  { id: 'no_telpon',        errorId: 'notelp-error',    label: 'No. telepon' },
  { id: 'alamat',           errorId: 'alamat-error',    label: 'Alamat' },
  { id: 'emergency_telp',   errorId: 'emtelp-error',    label: 'No. telepon darurat' },
  { id: 'emergency_nama',   errorId: 'emname-error',    label: 'Nama kontak darurat' },
  { id: 'emergency_relasi', errorId: 'emrelasi-error',  label: 'Hubungan kontak darurat' },
];

// ── Helpers ─────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icons = { info: 'ℹ️', success: '✅', error: '❌' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function setFieldState(fieldId, errorId, isValid, forceShow = false) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;

  if (!isValid && forceShow) {
    input.classList.add('error');
    input.classList.remove('success');
    error.classList.add('show');
  } else if (isValid && input.value.trim() !== '') {
    input.classList.remove('error');
    input.classList.add('success');
    error.classList.remove('show');
  } else {
    input.classList.remove('error', 'success');
    error.classList.remove('show');
  }
}

function validatePhone(value) {
  // Accept formats: 0812-3456-7890 / 08123456789 / +628123456789
  return /^[\+]?[\d\s\-]{8,16}$/.test(value.trim());
}

function validateField(fieldId, errorId, forceShow = false) {
  const input = document.getElementById(fieldId);
  if (!input) return true;

  const value = input.value.trim();
  let isValid = value.length > 0;

  // Extra validation for phone fields
  if ((fieldId === 'no_telpon' || fieldId === 'emergency_telp') && value.length > 0) {
    isValid = validatePhone(value);
    const errorEl = document.getElementById(errorId);
    if (errorEl && !isValid && forceShow) {
      errorEl.querySelector
        ? null
        : null;
      // update error message for invalid format
      errorEl.innerHTML = `<span>⚠️</span> Format nomor tidak valid`;
    }
  }

  setFieldState(fieldId, errorId, isValid, forceShow);
  return isValid;
}

// ── Real-time validation ─────────────────────────────────────────
FIELDS.forEach(({ id, errorId }) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener('blur', () => validateField(id, errorId, true));
  el.addEventListener('input', () => {
    if (el.classList.contains('error')) {
      validateField(id, errorId, false);
    }
  });
});

// ── Form Submit ──────────────────────────────────────────────────
const form     = document.getElementById('registration-form');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate all fields
  let allValid = true;
  FIELDS.forEach(({ id, errorId }) => {
    const valid = validateField(id, errorId, true);
    if (!valid) allValid = false;
  });

  if (!allValid) {
    showToast('Harap lengkapi semua field yang wajib diisi', 'error');
    // Scroll to first error
    const firstError = form.querySelector('.form-input.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Collect form data
  const visitorData = {
    id:               crypto.randomUUID(),
    nama:             document.getElementById('nama').value.trim(),
    perusahaan:       document.getElementById('perusahaan').value.trim(),
    jabatan:          document.getElementById('jabatan').value.trim(),
    no_telpon:        document.getElementById('no_telpon').value.trim(),
    alamat:           document.getElementById('alamat').value.trim(),
    emergency_telp:   document.getElementById('emergency_telp').value.trim(),
    emergency_nama:   document.getElementById('emergency_nama').value.trim(),
    emergency_relasi: document.getElementById('emergency_relasi').value.trim(),
    status:           'pending',
  };

  // Loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    // End-to-End: Save to Supabase
    const { data, error } = await window.supabaseClient
      .from('visitor_inductions')
      .insert([visitorData])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    const insertedRecord = data[0];
    // Save to sessionStorage (needed for next steps)
    sessionStorage.setItem('visitor_data', JSON.stringify(insertedRecord));
    // Track which videos have been completed (all start as false)
    sessionStorage.setItem('video_progress', JSON.stringify([false, false]));

    // Small delay for UX
    await new Promise(r => setTimeout(r, 600));

    // Redirect to video page
    window.location.href = 'video.html';

  } catch (err) {
    console.error('Registration error:', err);
    showToast('Terjadi kesalahan database. Silakan coba lagi.', 'error');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});
