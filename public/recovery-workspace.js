const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
let lastProviderResult = '';
function providerNoticeText(data) {
  return data?.model
    ? `${data.fallbackUsed ? 'Model cadangan digunakan. ' : ''}Model: ${data.model}${data.cacheHit ? ' · hasil tersimpan' : ''}. Periksa informasi penting dari sumber.`
    : '';
}
export function providerNotice(data) {
  lastProviderResult = providerNoticeText(data);
}
export function renderRecovery(host, api) {
  host.replaceChildren(
    el('h1', 'Permintaan tersimpan'),
    el(
      'p',
      'Permintaan yang terhenti tetap tersimpan di perangkat. Coba kembali saat layanan tersedia.'
    )
  );
  const status = el('p');
  status.setAttribute('role', 'status');
  host.append(status);
  const tasks = api.pendingTasks();
  if (!tasks.length)
    host.append(el('p', 'Belum ada permintaan yang menunggu.'));
  for (const task of tasks) {
    const row = el('article');
    row.className = 'exam-result';
    row.append(
      el('h3', task.body.message || task.body.task || 'Permintaan belajar'),
      el('p', task.error)
    );
    const retry = el('button', 'Coba kembali');
    if (task.retryAt > Date.now()) {
      row.append(el('p', 'Coba setelah ' + new Date(task.retryAt).toLocaleString('id-ID') + '. Buka ulang halaman ini setelah jeda.'));
      retry.disabled = true;
    }
    retry.onclick = async () => {
      retry.disabled = true;
      try {
        await api.retryTask(task.id);
      } catch (error) {
        status.textContent = error.message;
        retry.disabled = false;
      }
    };
    const remove = el('button', 'Hapus permintaan');
    remove.onclick = () => {
      api.removeTask(task.id);
      row.remove();
    };
    row.append(retry, remove);
    host.append(row);
  }
  const diagnostics = el('details');
  diagnostics.append(el('summary', 'Diagnostik layanan'));
  if (lastProviderResult) diagnostics.append(el('p', lastProviderResult));
  const serviceStatus = el('p');
  serviceStatus.setAttribute('role', 'status');
  diagnostics.append(serviceStatus);
  let checked = false;
  diagnostics.ontoggle = async () => {
    if (!diagnostics.open || checked) return;
    checked = true;
    serviceStatus.textContent = 'Memeriksa layanan…';
    try {
      const state = await safeRequestJson('/api/provider/status');
      serviceStatus.textContent = '';
      for (const model of state.models) {
        diagnostics.append(el('p', `${model.model}: ${model.state}${model.reason ? ' · ' + model.reason : ''}${model.retryAt > Date.now() ? ' · coba setelah ' + new Date(model.retryAt).toLocaleString('id-ID') : ''}`));
      }
    } catch (error) {
      checked = false;
      serviceStatus.textContent = error.message;
    }
  };
  host.append(diagnostics);
}
window.OmniRecovery = { notice: providerNotice, render: renderRecovery };
