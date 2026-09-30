const $candidates = document.getElementById('candidates');
const $voteBtn = document.getElementById('voteBtn');
const $msg = document.getElementById('msg');
const $status = document.getElementById('status');
const $roleBadge = document.getElementById('roleBadge');
const $voteTitle = document.getElementById('voteTitle');

let selected = null;

(async function init() {
  // Проверка сессии
  const role = Session.role;
  const stage = Session.stage;

  if (!role || (role === 'candidate' && !Session.candidateCode)) {
    location.href = 'index.html';
    return;
  }
  if (!stage) {
    location.href = 'stage.html';
    return;
  }

  $roleBadge.textContent = role === 'candidate' ? 'Кандидат' : 'Голосующий';
  $voteTitle.textContent = `Этап ${stage} — выберите кандидата`;

  await loadCandidates(stage);
  await loadStatus();
})();

async function loadCandidates(stage) {
  try {
    setStatus($status, 'Подключение…', false);
    const data = await apiGet({ action: 'candidates', stage });
    if (data.error) throw new Error(data.error);

    const list = data.candidates || [];
    if (!list.length) {
      $candidates.innerHTML = '<div class="candidate"><span class="name">Кандидатов нет</span></div>';
      setStatus($status, 'Список пуст', false);
      return;
    }

    const blocked = Session.blocked;
    const role = Session.role;

    $candidates.innerHTML = '';
    list.forEach(name => {
      const isBlocked = role === 'candidate' && (
        blocked.indexOf('*') !== -1 || blocked.indexOf(name) !== -1
      );

      const el = document.createElement('div');
      el.className = 'candidate' + (isBlocked ? ' candidate-blocked' : '');
      el.innerHTML = `
        <div class="avatar">${initials(name)}</div>
        <div class="name">${name}</div>
        <div class="check">${isBlocked ? '🚫' : ''}</div>
      `;
      if (!isBlocked) el.onclick = () => select(el, name);
      $candidates.appendChild(el);
    });

    setStatus($status, 'Готово к голосованию', true);
  } catch (err) {
    console.error(err);
    $candidates.innerHTML = '<div class="candidate"><span class="name">Не удалось загрузить</span></div>';
    setStatus($status, 'Ошибка загрузки', false);
  }
}

function select(el, name) {
  document.querySelectorAll('.candidate').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selected = name;
  $voteBtn.disabled = false;
}

$voteBtn.onclick = async () => {
  if (!selected) return;
  $voteBtn.disabled = true;
  $voteBtn.classList.add('loading');

  try {
    await fetch(API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'vote',
        candidate: selected,
        voterId: getVoterId(),
        role: Session.role,
        candidateCode: Session.candidateCode || '',
        stage: Session.stage
      })
    });

    showMsg($msg, 'Голос учтён. Спасибо!', 'ok');
    setStatus($status, 'Голос принят', true);

    document.querySelectorAll('.candidate').forEach(c => {
      c.style.pointerEvents = 'none';
      c.style.opacity = '0.6';
    });
    $voteBtn.querySelector('span').textContent = 'Голос принят';
  } catch (err) {
    console.error(err);
    showMsg($msg, 'Ошибка. Попробуй ещё раз.', 'err');
    $voteBtn.disabled = false;
  } finally {
    $voteBtn.classList.remove('loading');
  }
};

async function loadStatus() {
  try {
    const data = await apiGet({ action: 'status' });
    if (!data.finished) return;

    const banner = document.getElementById('winnerBanner');
    document.getElementById('winnerName').textContent = '🏆 ' + data.winner;

    const entries = Object.entries(data.results || {}).sort((a, b) => b[1] - a[1]);
    document.getElementById('winnerStats').innerHTML = entries.map(([n, c]) => {
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
    $voteBtn.disabled = true;
    $voteBtn.querySelector('span').textContent = 'Голосование завершено';
  } catch (e) {
    console.warn('status check failed', e);
  }
}