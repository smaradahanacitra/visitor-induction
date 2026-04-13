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
  const visitor = allVisitors.find(v => v.id === id);
  if (!visitor) return;
  
  const modal = document.getElementById('detail-modal');
  const body = document.getElementById('modal-body-content');
  const btnDownload = document.getElementById('btn-download-pdf');
  
  // Translation helper
  const t = (key) => {
    const lang = window.currentLang || 'id';
    return (translations[lang] && translations[lang][key]) ? translations[lang][key] : key;
  };
  
  // Fill Modal Body
  const health = visitor.health_data || {};
  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">${t('Nama Lengkap')}</span>
        <span class="detail-val">${visitor.nama || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${t('Perusahaan')}</span>
        <span class="detail-val">${visitor.perusahaan || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${t('Jabatan')}</span>
        <span class="detail-val">${visitor.jabatan || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${t('Telepon')}</span>
        <span class="detail-val">${visitor.telepon || '—'}</span>
      </div>
      <div class="detail-item" style="grid-column: 1 / -1;">
        <span class="detail-label">${t('Alamat')}</span>
        <span class="detail-val">${visitor.alamat || '—'}</span>
      </div>
    </div>

    <div class="detail-grid" style="border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
      <div class="detail-item">
        <span class="detail-label">${t('Kontak Darurat')}</span>
        <span class="detail-val">${visitor.emergency_nama || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${t('Hubungan')}</span>
        <span class="detail-val">${visitor.emergency_relasi || visitor.emergency_hub || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${t('Telp Darurat')}</span>
        <span class="detail-val">${visitor.emergency_telp || '—'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">${t('Waktu Selesai')}</span>
        <span class="detail-val">${formatDate(visitor.completed_at)}</span>
      </div>
    </div>

    <div class="health-summary">
      <h3 style="display:flex; align-items:center; gap:0.5rem;">
        <span>🏥</span> ${t('Riwayat Kesehatan & Fit Condition')}
      </h3>
      <div class="health-item">
        <span>${t('Kondisi Fit to Work')}</span>
        <span style="font-weight:700; color:${(health.fit_to_work === 'yes' ? 'var(--accent-green)' : 'var(--accent-red)')}">
          ${health.fit_to_work === 'yes' ? '✅ FIT' : '❌ NOT FIT'}
        </span>
      </div>
      <div class="health-item">
        <span>${t('Riwayat Alergi')}</span>
        <span>${health.h8_details || (health.h8 === 'ya' ? t('Ya') : t('Tidak Ada'))}</span>
      </div>
      <div class="health-item">
        <span>${t('Pemakaian Obat')}</span>
        <span>${health.h9_details || (health.h9 === 'ya' ? t('Ya') : t('Tidak Ada'))}</span>
      </div>
      <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted);">
        ${t('* Data riwayat penyakit (Jantung, Asma, dll) tersedia lengkap di cetakan PDF.')}
      </div>
    </div>
  `;

  // Set up download button
  btnDownload.onclick = () => downloadVisitorPDF(visitor);
  
  // Show Modal
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('detail-modal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

// ── PDF Generation Logic ───────────────────────────────────────
async function downloadVisitorPDF(visitor) {
  const btn = document.getElementById('btn-download-pdf');
  const health = visitor.health_data || {};
  
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border" style="width:1rem; height:1rem;"></span> Processing...';
  btn.disabled = true;

  try {
    // 1. Prepare Template
    preparePrintForm(visitor, health);
    
    // 2. Generate PDF using html2pdf
    const element = document.getElementById('print-area');
    const namaFormatted = (visitor.nama || 'Visitor').replace(/\s+/g, '_');
    
    const opt = {
      margin:       [0, 0],
      filename:     `Visitor_Induction_${namaFormatted}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.classList.add('pdf-exporting');
          
          const clonedEl = clonedDoc.getElementById('print-area');
          if (clonedEl) {
            clonedEl.style.display = 'block';
            clonedEl.style.visibility = 'visible';
            clonedEl.style.position = 'static';
            clonedEl.style.left = '0';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    await html2pdf().set(opt).from(element).save();
    showToast('PDF berhasil diunduh.', 'success');
  } catch (err) {
    console.error('PDF Error:', err);
    showToast('Gagal membuat PDF.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function preparePrintForm(visitor, health) {
  const setT = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };
  
  // Mapping logic (same as declaration.js)
  setT('p-val-alergi', health.h8_details || (health.h8 === 'ya' ? 'Ada' : 'Tidak Ada'));
  setT('p-val-obat',   health.h9_details || (health.h9 === 'ya' ? 'Ada' : 'Tidak Ada'));
  
  setT('p-final-nama',       visitor.nama);
  setT('p-final-perusahaan', visitor.perusahaan);
  setT('p-final-jabatan',    visitor.jabatan);
  setT('p-final-phone',      visitor.telepon);
  setT('p-final-alamat',     visitor.alamat);
  setT('p-final-ename',      visitor.emergency_nama);
  setT('p-final-erel',       visitor.emergency_relasi || visitor.emergency_hub);
  
  // Page 2
  setT('p2-final-nama',       visitor.nama);
  setT('p2-final-perusahaan', visitor.perusahaan);
  setT('p2-final-jabatan',    visitor.jabatan);
  setT('p2-final-phone',      visitor.telepon);
  setT('p2-final-alamat',     visitor.alamat);
  setT('p2-final-ephone',     visitor.emergency_telp);
  setT('p2-final-ename',      visitor.emergency_nama);
  setT('p2-final-erel',       visitor.emergency_relasi || visitor.emergency_hub);

  // Sign & Date
  const dateStr = formatDate(visitor.completed_at || new Date().toISOString());
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
  
  const lainnyaVal = document.getElementById('p-val-lainnya');
  if (lainnyaVal) lainnyaVal.textContent = health.h7_details || '';

  const fitVal = health.fit_to_work;
  const fyEl = document.getElementById('fit-y');
  const fnEl = document.getElementById('fit-n');
  if (fyEl) fyEl.textContent = (fitVal === 'yes') ? '✓' : '';
  if (fnEl) fnEl.textContent = (fitVal === 'no') ? '✓' : '';
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
