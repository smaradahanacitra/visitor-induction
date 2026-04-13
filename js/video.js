/**
 * video.js
 * Manages YouTube video playlist, status tracking, quiz modal logic.
 * 3 tasks: (1) watch all videos + quiz, (2) fill external form, (3) proceed to declaration.
 */

'use strict';

// ── Configuration ────────────────────────────────────────────────
const VIDEOS = [
  {
    id:       'HhQT6WxCbKA',
    title:    'Visitor Induction PT Bumi Suksesindo',
  },
  {
    id:       '2dTtYvy9j1Q',
    title:    'Visitor Induction PT Kemitraan MNK BME',
  },
];

// ── State ────────────────────────────────────────────────────────
let visitorData    = null;
let videoProgress  = [false, false];
let rulesRead      = false;
let currentIndex   = null;
let player         = null;
let playerReady    = false;
let videoEndedFlag = false;
let currentView    = 'video'; // 'video' or 'rules'

// ── Guard: redirect if not registered ───────────────────────────
(function guard() {
  const raw = sessionStorage.getItem('visitor_data');
  if (!raw) { window.location.replace('index.html'); return; }
  try {
    visitorData   = JSON.parse(raw);
    const prog    = sessionStorage.getItem('video_progress');
    if (prog) videoProgress = JSON.parse(prog);
    rulesRead = sessionStorage.getItem('rules_confirmed') === 'true';
  } catch { window.location.replace('index.html'); }
})();

// ── Toast ────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

// ── Init page ────────────────────────────────────────────────────
function initPage() {
  if (visitorData) {
    const nameEl = document.getElementById('visitor-name-target');
    const wrapEl = document.getElementById('visitor-greeting');
    if (nameEl) nameEl.textContent = visitorData.nama;
    if (wrapEl) wrapEl.style.opacity = '1';
  }

  VIDEOS.forEach((v, i) => {
    const titleEl = document.getElementById(`video-title-${i}`);
    if (titleEl) titleEl.textContent = v.title;
  });

  // Restore saved progress
  videoProgress.forEach((done, i) => { if (done) markVideoComplete(i, false); });

  // Restore rules confirmation
  if (rulesRead) {
    const cb = document.getElementById('check-rules-understood');
    if (cb) cb.checked = true;
    updateRulesStatusUI();
  }

  // Event Listeners for switching views
  document.getElementById('btn-show-rules')?.addEventListener('click', () => switchView('rules'));
  
  // Back to video items handled by existing video-item listener

  updateProgressUI();
  updateCompleteButton();
}

// ── Switch View (Video vs Rules) ─────────────────────────────────
function switchView(view) {
  currentView = view;
  
  const videoPane = document.getElementById('view-video-player');
  const rulesPane = document.getElementById('view-induction-rules');
  const navVideos = document.getElementById('sidebar-video-list');
  const navRules  = document.getElementById('btn-show-rules');

  if (view === 'rules') {
    videoPane?.classList.remove('active');
    rulesPane?.classList.add('active');
    navVideos?.classList.remove('active');
    navRules?.classList.add('active');
    
    // Deactivate all video sidebar items
    document.querySelectorAll('.video-item').forEach(item => {
      if (item.id !== 'btn-show-rules') item.classList.remove('active');
    });

    // Pause video if playing
    if (player && playerReady && player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  } else {
    videoPane?.classList.add('active');
    rulesPane?.classList.remove('active');
    navVideos?.classList.add('active');
    navRules?.classList.remove('active');
  }
}

// ── Rules confirm checkbox handler ────────────────────────────────
document.getElementById('check-rules-understood')?.addEventListener('change', (e) => {
  rulesRead = e.target.checked;
  sessionStorage.setItem('rules_confirmed', rulesRead.toString());
  updateRulesStatusUI();
  updateCompleteButton();
  updateProgressUI(); // FIX BUG: progress bar now updates instantly when checked
});

function updateRulesStatusUI() {
  const icon = document.getElementById('status-icon-rules');
  const btn  = document.getElementById('btn-show-rules');
  if (icon) {
    icon.className = rulesRead ? 'video-item-status done' : 'video-item-status pending';
    icon.textContent = rulesRead ? '✅' : '📝';
  }
}

// ── YouTube Player ───────────────────────────────────────────────
function createPlayer(videoId) {
  const placeholder = document.getElementById('player-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  if (player) { try { player.destroy(); } catch (_) {} player = null; playerReady = false; }

  const wrapper = document.getElementById('player-wrapper');
  const oldDiv  = document.getElementById('youtube-player');
  if (oldDiv) oldDiv.remove();
  const newDiv  = document.createElement('div');
  newDiv.id     = 'youtube-player';
  wrapper.appendChild(newDiv);

  videoEndedFlag = false;

  const loadPlayer = () => {
    player = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: { 
        autoplay: 1, 
        rel: 0, 
        modestbranding: 1, 
        playsinline: 1, 
        enablejsapi: 1,
        iv_load_policy: 3, // Disable annotations
        disablekb: 1       // Disable keyboard shortcuts
      },
      events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange },
    });
  };

window.togglePlayPause = function() {
  if (player && playerReady) {
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  }
};

window.toggleFullScreenVideo = function() {
  const elem = document.getElementById('player-wrapper');
  if (!elem) return;
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
};

  if (window._ytApiReady) loadPlayer();
  else window._pendingLoad = loadPlayer;
}

function onPlayerReady() { playerReady = true; }

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED && !videoEndedFlag) {
    videoEndedFlag = true;
    openQuizModal();
  }
}

// ── Select video ─────────────────────────────────────────────────
function selectVideo(index) {
  if (currentView !== 'video') switchView('video');

  document.querySelectorAll('.video-item').forEach((item, i) => {
    item.classList.toggle('active', i === index);
  });

  currentIndex = index;
  const video  = VIDEOS[index];

  document.querySelectorAll('.video-item-status').forEach((el, i) => {
    if (i === index && !videoProgress[i]) {
      el.className = 'video-item-status watching';
      el.textContent = '▶️';
    }
  });

  const titleEl = document.getElementById('current-video-title');
  const subEl   = document.getElementById('current-video-desc');
  if (titleEl) titleEl.textContent = video.title;
  
  const lang = window.currentLang || 'id';
  const txtDone = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["✅ Video ini sudah ditonton — Anda bisa menonton ulang"] : "✅ Video ini sudah ditonton — Anda bisa menonton ulang";
  const txtWait = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["Video sedang diputar..."] : "Video sedang diputar...";
  
  if (subEl)   subEl.textContent = videoProgress[index] ? txtDone : txtWait;

  updateNavBadge();
  createPlayer(video.id);
}

// ── Quiz Modal ───────────────────────────────────────────────────
function openQuizModal() {
  const modal  = document.getElementById('quiz-modal');
  const nameEl = document.getElementById('modal-video-name');

  document.querySelectorAll('input[name="quiz-answer"]').forEach(r => r.checked = false);
  document.getElementById('option-yes').className = 'quiz-option';
  document.getElementById('option-no').className  = 'quiz-option';
  document.getElementById('quiz-warning').classList.remove('show');
  document.getElementById('btn-submit-quiz').disabled = true;
  document.getElementById('btn-submit-quiz').setAttribute('aria-disabled', 'true');

  if (nameEl && currentIndex !== null) nameEl.textContent = VIDEOS[currentIndex].title;
  modal.classList.add('show');
}

function closeQuizModal() {
  document.getElementById('quiz-modal').classList.remove('show');
}

// Option handlers
document.getElementById('option-yes').addEventListener('click', () => {
  document.getElementById('answer-yes').checked = true;
  document.getElementById('option-yes').className = 'quiz-option selected-yes';
  document.getElementById('option-no').className  = 'quiz-option';
  document.getElementById('quiz-warning').classList.remove('show');
  document.getElementById('btn-submit-quiz').disabled = false;
  document.getElementById('btn-submit-quiz').setAttribute('aria-disabled', 'false');
});

document.getElementById('option-no').addEventListener('click', () => {
  document.getElementById('answer-no').checked = true;
  document.getElementById('option-no').className  = 'quiz-option selected-no';
  document.getElementById('option-yes').className = 'quiz-option';
  document.getElementById('quiz-warning').classList.add('show');
  document.getElementById('btn-submit-quiz').disabled = false;
  document.getElementById('btn-submit-quiz').setAttribute('aria-disabled', 'false');
});

// ── Submit quiz ──────────────────────────────────────────────────
function submitQuiz() {
  const yesRadio = document.getElementById('answer-yes');
  const noRadio  = document.getElementById('answer-no');
  const lang = window.currentLang || 'id';

  if (!yesRadio.checked && !noRadio.checked) {
    const msg = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["Pilih salah satu jawaban terlebih dahulu"] : "Pilih salah satu jawaban terlebih dahulu";
    showToast(msg, 'warning');
    return;
  }

  const answered = yesRadio.checked;

  const responses = JSON.parse(sessionStorage.getItem('video_responses') || '[]');
  responses.push({
    visitor_id:  visitorData?.id,
    video_index: currentIndex,
    video_title: VIDEOS[currentIndex]?.title,
    paham:       answered,
    answered_at: new Date().toISOString(),
  });
  sessionStorage.setItem('video_responses', JSON.stringify(responses));

  closeQuizModal();

  if (answered) {
    markVideoComplete(currentIndex, true);
    const msg = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["selesai"] : "selesai";
    showToast(`${VIDEOS[currentIndex].title} ${msg}!`, 'success');
    const subEl = document.getElementById('current-video-sub');
    if (subEl) {
       subEl.textContent = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["✅ Selesai — Pilih video berikutnya"] : '✅ Selesai — Pilih video berikutnya';
    }
  } else {
    const icon = document.getElementById(`status-icon-${currentIndex}`);
    if (icon) { icon.className = 'video-item-status pending'; icon.textContent = '❌'; }
    const msg2 = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["Silakan tonton ulang video untuk lebih memahami materi"] : "Silakan tonton ulang video untuk lebih memahami materi";
    showToast(msg2, 'info');
  }

  updateProgressUI();
  updateCompleteButton();
}

// ── Replay ───────────────────────────────────────────────────────
function replayVideo() {
  closeQuizModal();
  if (player && playerReady) { videoEndedFlag = false; player.seekTo(0); player.playVideo(); }
  else if (currentIndex !== null) selectVideo(currentIndex);
}

// ── Mark complete ────────────────────────────────────────────────
function markVideoComplete(index, save = true) {
  videoProgress[index] = true;

  const icon = document.getElementById(`status-icon-${index}`);
  const item = document.getElementById(`video-item-${index}`);

  if (icon) { icon.className = 'video-item-status done'; icon.textContent = '✅'; }
  if (item) {
    const sub = item.querySelector('.video-item-subtitle');
    const lang = window.currentLang || 'id';
    if (sub) sub.textContent = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["Selesai ✓"] : 'Selesai ✓';
  }

  if (save) sessionStorage.setItem('video_progress', JSON.stringify(videoProgress));
}

// ── Progress UI ──────────────────────────────────────────────────
function updateProgressUI() {
  const videoDone  = videoProgress.filter(Boolean).length;
  const rulesDone  = rulesRead ? 1 : 0;
  const done       = videoDone + rulesDone;
  const total      = VIDEOS.length + 1;
  const pct        = Math.round((done / total) * 100);

  const bar   = document.getElementById('progress-fill');
  const progDone = document.getElementById('prog-done');
  const progTotal = document.getElementById('prog-total');

  if (bar)   bar.style.width = `${pct}%`;
  if (progDone) progDone.textContent = done;
  if (progTotal) progTotal.textContent = total;

  updateNavBadge();
}

function updateNavBadge() {
  const videoDone  = videoProgress.filter(Boolean).length;
  const rulesDone  = rulesRead ? 1 : 0;
  const done       = videoDone + rulesDone;
  const total      = VIDEOS.length + 1;
  const badge      = document.getElementById('navbar-progress-badge');
  if (badge) badge.textContent = `${done}/${total}`;
}

// ── Complete button (all videos done + form confirmed) ───────────
function updateCompleteButton() {
  const btn      = document.getElementById('btn-complete');
  const allDone  = videoProgress.every(Boolean) && rulesRead;

  if (btn) {
    btn.disabled = !allDone;
    btn.classList.toggle('enabled', allDone);
    btn.setAttribute('aria-disabled', allDone ? 'false' : 'true');
  }
}

// ── Go to declaration page ───────────────────────────────────────
function completeInduction() {
  const lang = window.currentLang || 'id';
  if (!videoProgress.every(Boolean)) {
    const msg1 = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["Tonton semua video terlebih dahulu"] : "Tonton semua video terlebih dahulu";
    showToast(msg1, 'warning');
    return;
  }
  if (!rulesRead) {
    const msg2 = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang]["Baca dan konfirmasi seluruh aturan induksi terlebih dahulu"] : "Baca dan konfirmasi seluruh aturan induksi terlebih dahulu";
    showToast(msg2, 'warning');
    return;
  }

  const data = JSON.parse(sessionStorage.getItem('visitor_data') || '{}');
  data.status       = 'in_declaration';
  data.videos_done_at = new Date().toISOString();
  sessionStorage.setItem('visitor_data', JSON.stringify(data));

  window.location.href = 'success.html';
}

// ── Sidebar click listeners ──────────────────────────────────────
document.querySelectorAll('.video-item').forEach((item) => {
  item.addEventListener('click', () => {
    const index = parseInt(item.getAttribute('data-index'), 10);
    selectVideo(index);
  });
});

// ── Bootstrap ────────────────────────────────────────────────────
initPage();
