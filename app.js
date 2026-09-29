const API = 'https://script.google.com/macros/s/AKfycbxUIIVGMnWjCPuSrtD2I4AhZ36OEc6ysPOTd-WOv0TopMwQ0mBfG72F-9cBd4_qyxdx/exec';

// ===== JSONP для GET =====
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, 12000);

    function cleanup() {
      delete window[cb];
      if (script && script.parentNode) script.remove();
    }

    window[cb] = data => {
      clearTimeout(timeout);
      resolve(data);
      cleanup();
    };

    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('jsonp error'));
    };
    document.body.appendChild(script);
  });
}

// ===== Идентификатор избирателя =====
let voterId = localStorage.getItem('voterId');
if (!voterId) {
  voterId = (crypto.randomUUID && crypto.randomUUID()) ||
            ('v_' + Date.now() + '_' + Math.random().toString(36).slice(2));
  localStorage.setItem('voterId', voterId);
}

// ===== Состояние =====
let selected = null;
const $candidates = document.getElementById('candidates');
const $voteBtn    = document.getElementById('voteBtn');
const $msg        = document.getElementById('msg');
const $status     = document.getElementById('status');

// ===== Утилиты =====
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

// ===== Загрузка кандидатов =====
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

    // no-cors не даёт ответ — считаем, что ок
    showMsg('Голос учтён. Спасибо!', 'ok');
    setStatus('Голос принят', true);

    // Блокируем повтор
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

// ===== Старт =====
loadCandidates();