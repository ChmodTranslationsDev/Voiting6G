// Вставь сюда свой URL Apps Script
const API = 'https://script.google.com/macros/s/AKfycbx5uRfQYSGkLbnvqtEsuN0boRl77xG70yVuLOLODgMyqumwufMJRoRw816toSHyYwAK/exec';

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

function apiGet(params) {
  const url = API + '?' + new URLSearchParams(params).toString();
  return jsonp(url);
}

async function apiPost(data) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ===== Voter ID =====
function getVoterId() {
  let id = localStorage.getItem('voterId');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
         ('v_' + Date.now() + '_' + Math.random().toString(36).slice(2));
    localStorage.setItem('voterId', id);
  }
  return id;
}

// ===== Сессия =====
const Session = {
  get role() { return sessionStorage.getItem('role'); },
  set role(v) { v ? sessionStorage.setItem('role', v) : sessionStorage.removeItem('role'); },

  get candidateCode() { return sessionStorage.getItem('candidateCode'); },
  set candidateCode(v) { v ? sessionStorage.setItem('candidateCode', v) : sessionStorage.removeItem('candidateCode'); },

  get blocked() {
    const raw = sessionStorage.getItem('blockedCandidates') || '';
    return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  },
  set blocked(arr) {
    sessionStorage.setItem('blockedCandidates', (arr || []).join(','));
  },

  get stage() {
    const s = sessionStorage.getItem('currentStage');
    return s ? Number(s) : null;
  },
  set stage(v) { v ? sessionStorage.setItem('currentStage', String(v)) : sessionStorage.removeItem('currentStage'); },

  clear() {
    ['role', 'candidateCode', 'blockedCandidates', 'currentStage'].forEach(k => sessionStorage.removeItem(k));
  }
};

// ===== Утилиты =====
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'msg ' + type;
  el.hidden = false;
}

function setStatus(el, text, online = true) {
  el.innerHTML = `<span class="dot" style="${online ? '' : 'background:#ff5c7c;box-shadow:0 0 8px #ff5c7c'}"></span>${text}`;
}
