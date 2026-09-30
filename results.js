(async function init() {
  try {
    const data = await apiGet({ action: 'status' });
    const subtitle = document.getElementById('subtitle');
    const box = document.getElementById('statsBox');

    if (!data.results || Object.keys(data.results).length === 0) {
      subtitle.textContent = 'Пока нет голосов';
      box.innerHTML = '<p style="color:var(--text-dim)">Результаты появятся после первых голосов</p>';
      return;
    }

    subtitle.textContent = data.finished
      ? 'Голосование завершено'
      : `Этап ${data.stage} • всего голосов: ${data.total}`;

    if (data.finished && data.winner) {
      document.getElementById('winnerCard').hidden = false;
      document.getElementById('winnerName').textContent = '🏆 ' + data.winner;
    }

    const entries = Object.entries(data.results).sort((a, b) => b[1] - a[1]);
    box.innerHTML = entries.map(([name, count]) => {
      const pct = data.total ? Math.round(count / data.total * 100) : 0;
      return `
        <div style="margin:14px 0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-weight:500;">${name}</span>
            <span style="color:var(--accent);font-weight:600;">${count} (${pct}%)</span>
          </div>
          <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent-2));border-radius:4px;transition:width .4s;"></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    document.getElementById('subtitle').textContent = 'Ошибка загрузки';
  }
})();