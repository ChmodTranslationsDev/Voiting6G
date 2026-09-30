const API = 'https://script.google.com/macros/s/AKfycbyUL6oNzppDun9vCgvAoS-7CmTAxv9z8ARZ9zzWzhBwu864Od3a0Ae4XK7X6_yb7zm3/exec';

// ===== JSONP =====
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const timeout = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 12000);

    function cleanup() {
      delete window[cb];
      if (script && script.parentNode) script.remove();
    }

    window[cb] = data => { clearTimeout(timeout); resolve(data); cleanup(); };

    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    script.onerror = () => { clearTimeout(timeout); cleanup(); reject(new Error('jsonp error')); };
    document.body.appendChild(script);
  });
}

// ===== ID избирателя =====
let voterId = localStorage.getItem('voterId');
if (!voterId) {
  voterId = (crypto.randomUUID && crypto.randomUUID()) ||
            ('v_' + Date.now() + '_' + Math.random().toString(36).slice(2));
  localStorage.setItem('voterId', voterId);
}

// ===== Состояние =====
let selected = null;
const $candidates = document.getElementById('candidates');
const $voteBtn = document.getElementById('voteBtn');
const $msg = document.getElementById('msg');
const $status = document.getElementById('status');

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function showMsg(text, type) {
  $msg.textContent = text;
  $msg.className = 'msg ' + type;
  $msg.hidden = false;
}

function setStatus(text, online = true) {
  $status.innerHTML = `<span class="dot" style="${online ? '' : 'background:#ff5c7c;box-shadow:0 0 8px #ff5c7c'}"></span>${text}`;
}

// ===== Кандидаты =====
async function loadCandidates() {
  try {
    setStatus('Подключение…', false);
    const data = await jsonp(API + '?action=candidates');
    if (data.error) throw new Error(data.error);

    const list = data.candidates || [];
    if (!list.length) {
      $candidates.innerHTML = '<div class="candidate"><span class="name">Кандидатов нет</span></div>';
      setStatus('Список пуст', false);
      return;
    }

    $candidates.innerHTML = '';
    list.forEach(name => {
      const el = document.createElement('div');
      el.className = 'candidate';
      el.innerHTML = `
        <div class="avatar">${initials(name)}</div>
        <div class="name">${name}</div>
        <div class="check"></div>
      `;
      el.onclick = () => select(el, name);
      $candidates.appendChild(el);
    });

    setStatus('Готово к голосованию', true);
  } catch (err) {
    console.error(err);
    $candidates.innerHTML = '<div class="candidate"><span class="name">Не удалось загрузить</span></div>';
    setStatus('Ошибка загрузки', false);
  }
}

function select(el, name) {
  document.querySelectorAll('.candidate').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selected = name;
  $voteBtn.disabled = false;
}

// ===== Голосование =====
$voteBtn.onclick = async () => {
  if (!selected) return;
  $voteBtn.disabled = true;
  $voteBtn.classList.add('loading');

  try {
    await fetch(API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'vote', candidate: selected, voterId })
    });

    showMsg('Голос учтён. Спасибо!', 'ok');
    setStatus('Голос принят', true);

    document.querySelectorAll('.candidate').forEach(c => {
      c.style.pointerEvents = 'none';
      c.style.opacity = '0.6';
    });
    $voteBtn.querySelector('span').textContent = 'Голос принят';
  } catch (err) {
    console.error(err);
    showMsg('Ошибка. Попробуй ещё раз.', 'err');
    $voteBtn.disabled = false;
  } finally {
    $voteBtn.classList.remove('loading');
  }
};

// ===== Статус (итоги) =====
async function loadStatus() {
  try {
    const data = await jsonp(API + '?action=status');
    if (!data.finished) return;

    const banner = document.getElementById('winnerBanner');
    const nameEl = document.getElementById('winnerName');
    const statsEl = document.getElementById('winnerStats');

    nameEl.textContent = '🏆 ' + data.winner;

    const entries = Object.entries(data.results || {}).sort((a, b) => b[1] - a[1]);
    statsEl.innerHTML = entries.map(([n, c]) => {
      const word = c === 1 ? 'голос' : (c < 5 ? 'голоса' : 'голосов');
      return `<div class="row ${n === data.winner ? 'winner' : ''}">
        <span>${n}</span><span>${c} ${word}</span>
      </div>`;
    }).join('');

    banner.hidden = false;

    document.querySelectorAll('.candidate').forEach(c => {
      c.style.pointerEvents = 'none';
      c.style.opacity = '0.4';
    });
    const btn = document.getElementById('voteBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Голосование завершено';
  } catch (e) {
    console.warn('status check failed', e);
  }
}

// ===== Старт =====
loadCandidates().then(loadStatus);
