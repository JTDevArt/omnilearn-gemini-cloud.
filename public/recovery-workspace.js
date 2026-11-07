const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
export function providerNoticeText(data) {
  return data?.model
    ? `${data.fallbackUsed ? 'Model cadangan digunakan. ' : ''}Model: ${data.model}${data.cacheHit ? ' · hasil tersimpan' : ''}. Periksa informasi penting dari sumber.`
    : '';
}
export function providerNotice(data) {
  let notice = document.querySelector('#providerNotice');
  if (!notice) {
    notice = el('p');
    notice.id = 'providerNotice';
    notice.className = 'provider-notice';
    notice.setAttribute('role', 'status');
    document.querySelector('#toolOutput')?.before(notice);
  }
  notice.hidden = !data?.model;
  notice.textContent = providerNoticeText(data);
}
export async function renderRecovery(host, api) {
  host.replaceChildren(
    el('h1', 'Permintaan tersimpan'),
    el(
      'p',
      'Permintaan yang terhenti tetap tersimpan di perangkat. Coba kembali secara manual setelah model tersedia; aplikasi tidak mengulang terus-menerus.'
    )
  );
  const status = el('p');
  status.setAttribute('role', 'status');
  host.append(status);
  try {
    const state = await safeRequestJson('/api/provider/status');
    if (!status.isConnected) return;
    for (const model of state.models)
      host.append(
        el(
          'p',
          `${model.model}: ${model.state}${model.reason ? ' · ' + model.reason : ''}${model.retryAt > Date.now() ? ' · coba setelah ' + new Date(model.retryAt).toLocaleString('id-ID') : ''}`
        )
      );
  } catch (error) {
    status.textContent = error.message;
  }
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
}
window.OmniRecovery = { notice: providerNotice, text: providerNoticeText, render: renderRecovery };
