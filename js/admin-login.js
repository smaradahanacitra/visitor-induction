/**
 * admin-login.js
 * Logic for Admin Authentication using Supabase Auth.
 */

'use strict';

// ── Toast Utility ───────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ── Handle Login ────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  
  const emailInput = document.getElementById('admin-nrp').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('btn-login');

  if (!emailInput || !password) {
    showToast('Harap isi email dan password.', 'warning');
    return;
  }

  // Basic email validation - if no @, assume it might be NRP and require email format
  let email = emailInput;
  if (!email.includes('@')) {
    // Optional: Auto-append domain if your org uses standard emails like nrp@kmb.com
    // email = `${emailInput}@mnk-bme.com`; 
    showToast('Harap gunakan alamat email terdaftar.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border"></span> Menghubungkan...';

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    // Optional: Check if user has admin profile (requires 'profiles' table)
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      // If not admin, sign out immediately
      await window.supabaseClient.auth.signOut();
      showToast('Akses ditolak. Anda bukan Administrator.', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Masuk ke Dashboard';
      return;
    }

    showToast('Login Berhasil! Mengalihkan...', 'success');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (err) {
    console.error('Login Error:', err.message);
    showToast(err.message === 'Invalid login credentials' ? 'Email atau Password salah.' : err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = 'Masuk ke Dashboard';
  }
}

// ── Session Check ───────────────────────────────────────────────
async function checkActiveSession() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', checkActiveSession);
