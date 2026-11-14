export const durations = { focus: 25 * 60, break: 5 * 60 };
export function remaining(timer, now = Date.now()) {
  return Math.max(0, timer.running ? Math.ceil((timer.deadline - now) / 1000) : timer.seconds);
}
export function transition(timer, action, now = Date.now()) {
  const next = { mode: 'focus', seconds: durations.focus, running: false, ...timer };
  if (action === 'focus' || action === 'break') return { mode: action, seconds: durations[action], running: false };
  if (action === 'reset') return { mode: next.mode, seconds: durations[next.mode], running: false };
  next.seconds = remaining(next, now);
  if (action === 'pause') next.running = false;
  if (action === 'start' && next.seconds > 0) { next.running = true; next.deadline = now + next.seconds * 1000; }
  if (next.seconds === 0) next.running = false;
  return next;
}
export function mountTimer(host, api) {
  let timer = transition(api.snapshot().profile.focusTimer, 'tick');
  host.innerHTML = '<div class="timer-face"><div><span data-mode></span><p data-clock role="timer" aria-label="Sisa waktu fokus"></p></div><button class="primary timer-toggle" data-timer="start">Mulai</button><button class="timer-toggle" data-timer="pause" hidden>Jeda</button></div><div class="panel-actions timer-modes"><button data-timer="focus" aria-pressed="true">Fokus 25 menit</button><button data-timer="break" aria-pressed="false">Istirahat 5 menit</button><button data-timer="reset">Reset</button></div><p data-timer-status role="status"></p>';
  const status = host.querySelector('[data-timer-status]');
  const save = async () => {
    try { await api.updateDashboard(({profile}) => { profile.focusTimer = {...timer}; }); }
    catch (error) { status.textContent = 'Timer belum tersimpan: ' + error.message; }
  };
  const draw = () => {
    const seconds = remaining(timer);
    host.querySelector('[data-clock]').textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
    host.querySelector('[data-clock]').setAttribute('aria-label',timer.mode === 'break' ? 'Sisa waktu istirahat' : 'Sisa waktu fokus');
    host.querySelector('[data-mode]').textContent = timer.mode === 'break' ? 'Waktu istirahat' : 'Sesi fokus';
    host.querySelector('[data-timer=start]').hidden = timer.running;
    host.querySelector('[data-timer=pause]').hidden = !timer.running;
    host.querySelector('[data-timer=start]').textContent = seconds < durations[timer.mode] ? 'Lanjutkan' : 'Mulai';
    for (const mode of ['focus', 'break']) host.querySelector(`[data-timer=${mode}]`).setAttribute('aria-pressed', String(timer.mode === mode));
    host.querySelector('[data-timer=start]').disabled = timer.running || seconds === 0;
    host.querySelector('[data-timer=pause]').disabled = !timer.running;
    if (timer.running && seconds === 0) { timer = transition(timer, 'tick'); status.textContent = 'Sesi selesai. Pilih fokus atau istirahat berikutnya.'; void save(); }
  };
  host.onclick = async event => {
    const action = event.target.closest('[data-timer]')?.dataset.timer;
    if (!action) return;
    timer = transition(timer, action); status.textContent = ''; draw();
    if (action === 'start' || action === 'pause') host.querySelector(`[data-timer=${timer.running ? 'pause' : 'start'}]`).focus();
    await save();
  };
  draw();
  const interval = setInterval(() => { if (!host.isConnected) clearInterval(interval); else draw(); }, 500);
}
