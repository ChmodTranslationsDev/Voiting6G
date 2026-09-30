let password = sessionStorage.getItem('adminPwd') || '';
let candidates = [];

const $ = id => document.getElementById(id);

$('loginBtn').onclick = async () => {
  const pwd = $('passwordInput').value.trim();
  if (!pwd) return;
  const res = await apiPost({ action: 'adminLogin', password: pwd });
  if (res.error) { showMsg($('adminMsg'), 'Неверный пароль', 'err'); return; }
  password = pwd;
  sessionStorage.setItem('adminPwd', pwd);
  enterPanel();
};

$('passwordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('loginBtn').click();
});

async function enterPanel() {
  $('loginView').hidden = true;
  $('panelView').hidden = false;
  await loadCandidates();
  await loadStats();
  await loadStageInfo();
}

async function loadCandidates() {
  const data = await apiGet({ action: 'candidates' });
  candidates = data.candidates || [];
  const sel = $('candidateSelect');
  sel.innerHTML = '';
  candidates.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

async function setStage(s) {
  const res = await apiPost({ action: 'adminSetStage', password, stage: s });
  if (res.error) { showMsg($('adminMsg'), res.error, 'err'); return; }
  showMsg($('adminMsg'), `Этап ${s === 0 ? 'закрыт' : s + ' открыт'}`, 'ok');
  await loadStageInfo();
  await loadStats();
}

$('stage0Btn').onclick = () => setStage(0);
$('openStage1Btn').onclick = () => setStage(1);
$('openStage2Btn').onclick = () => setStage(2);

$('closeStage1Btn').onclick = async () => {
  if (!confirm('Завершить Этап 1 и посчитать 5%?')) return;
  const res = await apiPost({ action: 'adminCloseStage1', password });
  if (res.error) {
    const map = { no_votes: 'Нет голосов на Этапе 1' };
    showMsg($('adminMsg'), map[res.error] || res.error, 'err');
    return;
  }

  const box = $('stageInfoBox');
  box.innerHTML = `
    Всего голосов: <b>${res.total}</b><br>
    Порог 5%: <b>${res.threshold}</b><br>
    <span style="color:var(--success)">Прошли: ${res.passed.join(', ') || '—'}</span><br>
    <span style="color:var(--error)">Вылетели: ${res.eliminated.join(', ') || '—'}</span>
  `;

  showMsg($('adminMsg'), 'Этап 1 завершён. Открой Этап 2', 'ok');
};

async function loadStageInfo() {
  const info = await apiGet({ action: 'stageInfo' });
  const box = $('stageInfoBox');
  box.innerHTML = `
    Текущий этап: <b>${info.stage === 0 ? 'закрыт' : info.stage}</b><br>
    Прошли во 2-й этап: ${info.passedToStage2.length ? info.passedToStage2.join(', ') : '—'}<br>
    Итоги подведены: <b>${info.finished ? 'да' : 'нет'}</b>
  `;
}

async function loadStats() {
  const data = await apiGet({ action: 'status' });
  const box = $('statsBox');

  if (!data.results || Object.keys(data.results).length === 0) {
    box.innerHTML = `<p style="color:var(--text-dim)">Пока нет голосов${data.stage ? ' на этапе ' + data.stage : ''}</p>`;
    return;
  }

  const entries = Object.entries(data.results).sort((a, b) => b[1] - a[1]);
  box.innerHTML = entries.map(([name, count]) =>
    `<div class="stats-row"><span class="stats-name">${name}</span><span class="stats-count">${count}</span></div>`
  ).join('') +
  `<div class="stats-row" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--border)">
     <span style="color:var(--text-dim)">Всего${data.stage ? ' (этап ' + data.stage + ')' : ''}</span>
     <span style="color:var(--text);font-weight:600">${data.total}</span>
   </div>` +
  (data.finished ? `<div style="margin-top:12px;color:var(--success);font-size:13px;">✅ Итоги: ${data.winner}</div>` : '');
}

$('refreshBtn').onclick = loadStats;

$('genIdBtn').onclick = async () => {
  const res = await apiPost({ action: 'adminGenId', password });
  if (res.error) { showMsg($('adminMsg'), res.error, 'err'); return; }
  const box = $('idBox');
  box.textContent = res.voterId;
  box.style.display = 'block';
  $('voterIdInput').value = res.voterId;
  showMsg($('adminMsg'), 'ID создан', 'ok');
};

$('addVoteBtn').onclick = async () => {
  const candidate = $('candidateSelect').value;
  const voterId = $('voterIdInput').value.trim();
  if (!candidate) { showMsg($('adminMsg'), 'Выбери кандидата', 'err'); return; }
  if (!voterId) { showMsg($('adminMsg'), 'Нужен ID', 'err'); return; }

  const res = await apiPost({ action: 'adminAddVote', password, candidate, voterId });
  if (res.error) {
    const map = {
      already_voted: 'Этот ID уже голосовал на этом этапе',
      bad_password: 'Пароль слетел, войди заново',
      voting_closed: 'Голосование закрыто',
      no_candidate: 'Кандидат не найден'
    };
    showMsg($('adminMsg'), map[res.error] || res.error, 'err');
    return;
  }
  showMsg($('adminMsg'), 'Голос добавлен за ' + candidate, 'ok');
  $('voterIdInput').value = '';
  $('idBox').style.display = 'none';
  await loadStats();
};

$('genAllCodesBtn').onclick = async () => {
  if (!confirm('Сгенерировать коды? Если коды уже есть — появятся дубликаты.')) return;

  const res = await apiPost({ action: 'adminGenAllCandidateCodes', password });
  if (res.error) { showMsg($('adminMsg'), res.error, 'err'); return; }

  const box = $('codesList');
  box.innerHTML = res.codes.map(c =>
    `<div class="id-box" style="margin-bottom:8px;">
      <div style="color:var(--text-dim);font-size:11px;">${c.name}</div>
      <div style="color:var(--success);user-select:all;">${c.code}</div>
    </div>`
  ).join('');

  showMsg($('adminMsg'), 'Коды сгенерированы — скопируй их сразу!', 'ok');
};

$('finishBtn').onclick = async () => {
  if (!confirm('Подвести итоги? Победитель появится на основном сайте.')) return;
  const res = await apiPost({ action: 'adminFinish', password });
  if (res.error) { showMsg($('adminMsg'), res.error, 'err'); return; }
  showMsg($('adminMsg'), 'Итоги: ' + res.winner, 'ok');
  await loadStats();
  await loadStageInfo();
};

$('resetBtn').onclick = async () => {
  if (!confirm('Сбросить статус? Голоса останутся.')) return;
  const res = await apiPost({ action: 'adminReset', password });
  if (res.error) { showMsg($('adminMsg'), res.error, 'err'); return; }
  showMsg($('adminMsg'), 'Статус сброшен', 'ok');
  await loadStats();
  await loadStageInfo();
};

if (password) enterPanel();