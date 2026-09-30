const s1 = document.getElementById('stage1Btn');
const s2 = document.getElementById('stage2Btn');

document.getElementById('backBtn').onclick = () => location.href = 'index.html';

(async function init() {
  try {
    const info = await apiGet({ action: 'stageInfo' });
    if (info.error) { alert('Ошибка: ' + info.error); return; }

    if (info.stage === 0) {
      alert('Голосование сейчас закрыто');
      location.href = 'index.html';
      return;
    }

    if (info.stage === 1 && !info.passedToStage2.length) {
      Session.stage = 1;
      location.href = 'vote.html';
      return;
    }

    s1.disabled = info.stage !== 1;
    s2.disabled = info.stage !== 2;

    s1.onclick = () => { Session.stage = 1; location.href = 'vote.html'; };
    s2.onclick = () => { Session.stage = 2; location.href = 'vote.html'; };
  } catch (err) {
    console.error(err);
    alert('Не удалось загрузить этапы');
  }
})();