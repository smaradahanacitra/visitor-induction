/**
 * admin-dashboard.js
 * Logic for Admin Dashboard: Fetching, Filtering, and Monitoring visitor data.
 */

'use strict';

let allVisitors = [];
let filteredVisitors = [];

// ── Authentication Check ───────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // Set admin name if available in profile
  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('nama')
    .eq('id', session.user.id)
    .single();

  if (profile?.nama) {
    document.getElementById('admin-name').textContent = profile.nama;
  }

  // Load data
  fetchVisitors();
}

// ── Data Fetching ──────────────────────────────────────────────
async function fetchVisitors() {
  showLoading(true);
  try {
    const { data, error } = await window.supabaseClient
      .from('visitor_inductions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allVisitors = data || [];
    filteredVisitors = [...allVisitors];
    
    updateStats();
    renderTable();
  } catch (err) {
    console.error('Fetch Error:', err.message);
    showToast('Gagal memuat data visitor.', 'error');
  } finally {
    showLoading(false);
  }
}

// ── Stats Calculation ──────────────────────────────────────────
function updateStats() {
  const total = allVisitors.length;
  const completed = allVisitors.filter(v => v.status === 'completed').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayCount = allVisitors.filter(v => {
    const d = new Date(v.created_at).toISOString().split('T')[0];
    return d === today;
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-today').textContent = todayCount;
  document.getElementById('stat-completed').textContent = completed;
}

// ── Rendering ──────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('visitor-table-body');
  const emptyState = document.getElementById('empty-state');
  
  if (filteredVisitors.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = filteredVisitors.map(v => `
    <tr>
      <td>
        <div style="font-weight:700;">${v.nama || 'Tanpa Nama'}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${v.telepon || 'No Telp —'}</div>
      </td>
      <td>
        <div style="font-weight:600;">${v.perusahaan || 'Personal'}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${v.jabatan || 'Visitor'}</div>
      </td>
      <td>
        <span class="td-status status-${v.status || 'pending'}">
          ${v.status === 'completed' ? '✅ Selesai' : '⏳ Proses'}
        </span>
      </td>
      <td style="font-family:monospace; font-size:0.8rem;">
        ${v.completed_at ? formatDate(v.completed_at) : '<span style="color:#aaa;">Belum Selesai</span>'}
      </td>
      <td style="text-align:right;">
        <button class="btn-action" onclick="viewDetails('${v.id}')">Lihat Detail</button>
      </td>
    </tr>
  `).join('');
}

// ── Filtering ──────────────────────────────────────────────────
function filterVisitors() {
  const query = document.getElementById('visitor-search').value.toLowerCase().trim();
  
  if (!query) {
    filteredVisitors = [...allVisitors];
  } else {
    filteredVisitors = allVisitors.filter(v => 
      (v.nama || '').toLowerCase().includes(query) || 
      (v.perusahaan || '').toLowerCase().includes(query)
    );
  }
  renderTable();
}

// ── Actions ────────────────────────────────────────────────────
function refreshData() {
  fetchVisitors();
}

async function handleLogout() {
  const { error } = await window.supabaseClient.auth.signOut();
  if (error) {
    showToast('Gagal logout.', 'error');
  } else {
    window.location.href = 'login.html';
  }
}

function viewDetails(id) {
  // Expansion: Show medical data / entire form in a modal
  const visitor = allVisitors.find(v => v.id === id);
  if (!visitor) return;
  
  console.log('Viewing details for:', visitor);
  showToast(`Detail untuk ${visitor.nama} (Fitur Detail segera hadir)`, 'info');
}

// ── Utilities ──────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

function showLoading(show) {
  document.getElementById('loading-overlay').classList.toggle('show', show);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// Init
document.addEventListener('DOMContentLoaded', checkAuth);
