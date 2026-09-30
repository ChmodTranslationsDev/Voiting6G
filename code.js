const input = document.getElementById('candidateCodeInput');
const submitBtn = document.getElementById('submitBtn');

input.focus();

submitBtn.onclick = submit;
input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

async function submit() {
  const code = input.value.trim();
  if (!code) return;

  try {
    const res = await apiGet({ action: 'checkCandidateCode', code });
    if (res.error) {
      input.style.borderColor = 'var(--error)';
      setTimeout(() => { input.style.borderColor = ''; }, 1500);
      return;
    }

    Session.role = 'candidate';
    Session.candidateCode = code;
    Session.blocked = (res.blocked || '').split(',').map(s => s.trim()).filter(Boolean);
    Session.clear;
    sessionStorage.removeItem('currentStage');

    location.href = 'stage.html';
  } catch (err) {
    console.error(err);
    input.style.borderColor = 'var(--error)';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
  }
}

document.getElementById('backBtn').onclick = () => location.href = 'index.html';