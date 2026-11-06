let apiRef,
  user = null,
  revision = null,
  timer,
  enabled = false,
  inFlight = false,
  dirty = false,
  applying = false,
  generation = 0,
  lastSyncMessage = '';
const el = (tag, text) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};
const request = (path, body) =>
  safeRequestJson(
    path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
    { timeoutMs: 35000, stageContext: 'cloud-account' }
  );
async function assertOwner() {
  const current = (await request('/api/account/me')).user;
  if (!user || current.uid !== user.uid)
    throw new Error(
      'Akun berubah di tab lain. Muat ulang sebelum sinkronisasi.'
    );
}
async function pull() {
  await assertOwner();
  const remote = await request('/api/cloud/library');
  if (remote.ownerUid && remote.ownerUid !== user.uid)
    throw new Error('Akun berubah selama pemuatan cloud. Muat ulang.');
  return remote;
}
async function push() {
  await assertOwner();
  const pushedGeneration = generation;
  const result = await request('/api/cloud/library', {
    snapshot: apiRef.snapshot(),
    expectedRevision: revision,
    expectedOwnerUid: user.uid,
  });
  revision = result.revision;
  dirty = generation !== pushedGeneration;
  return result;
}
function notify(message) {
  lastSyncMessage = message;
  window.toast?.(message);
  window.dispatchEvent(
    new CustomEvent('omnilearn:sync', { detail: { message } })
  );
}
export function installCloud(api) {
  apiRef = api;
  window.addEventListener('online', () => {
    if (enabled && dirty) flush();
  });
  const polling = setInterval(async () => {
    if (
      !enabled ||
      dirty ||
      inFlight ||
      !navigator.onLine ||
      !apiRef.canApplyCloud()
    )
      return;
    inFlight = true;
    try {
      const remote = await pull();
      if (
        enabled &&
        !dirty &&
        remote.revision !== revision &&
        remote.snapshot &&
        apiRef.canApplyCloud()
      ) {
        applying = true;
        try {
          await apiRef.importLibrary(remote.snapshot, []);
          revision = remote.revision;
          notify(
            'Pustaka diperbarui dari cloud. Versi perangkat sebelumnya dapat dipulihkan melalui Cadangan.'
          );
        } finally {
          applying = false;
        }
      }
    } catch (error) {
      enabled = false;
      notify('Sinkronisasi dijeda: ' + error.message);
    } finally {
      inFlight = false;
    }
  }, 20000);
  window.addEventListener('pagehide', () => clearInterval(polling), {
    once: true,
  });
}
export function changed() {
  if (!enabled || applying) return;
  dirty = true;
  generation++;
  clearTimeout(timer);
  timer = setTimeout(flush, 2500);
}
async function flush() {
  if (!enabled || inFlight || !dirty || !navigator.onLine) return;
  inFlight = true;
  try {
    await push();
    notify('Perubahan disinkronkan ke cloud.');
  } catch (error) {
    enabled = false;
    notify(
      error.status === 409
        ? 'Sinkronisasi dijeda karena konflik. Tinjau akun/cloud sebelum melanjutkan.'
        : 'Sinkronisasi dijeda; perubahan tetap di perangkat. ' + error.message
    );
  } finally {
    inFlight = false;
    if (enabled && dirty) {
      clearTimeout(timer);
      timer = setTimeout(flush, 2500);
    }
  }
}
export async function renderAccount(host, api) {
  apiRef = api;
  host.replaceChildren(el('h1', 'Akun & sinkronisasi cloud'));
  const status = el('p');
  status.textContent = lastSyncMessage;
  status.className = 'sync-notice';
  status.setAttribute('role', 'status');
  host.append(status);
  const syncListener = (e) => {
    status.textContent = e.detail.message;
  };
  window.addEventListener('omnilearn:sync', syncListener);
  const observer = new MutationObserver(() => {
    if (!status.isConnected) {
      window.removeEventListener('omnilearn:sync', syncListener);
      observer.disconnect();
    }
  });
  observer.observe(host, { childList: true });
  let config;
  try {
    config = await request('/api/account/status');
  } catch (error) {
    status.textContent = error.message;
    return;
  }
  if (!status.isConnected) return;
  if (!config.configured) {
    status.textContent =
      'Firebase Authentication dan Firestore belum dikonfigurasi. Pustaka tetap disimpan di perangkat. Administrator perlu menyiapkan project, metode email/sandi, rules dan variabel server.';
    return;
  }
  try {
    user = (await request('/api/account/me')).user;
  } catch (error) {
    if (error.status !== 401) status.textContent = error.message;
    user = null;
  }
  if (!status.isConnected) return;
  function action(label, handler) {
    const button = el('button', label);
    button.onclick = async () => {
      button.disabled = true;
      try {
        await handler();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
    host.append(button);
    return button;
  }
  if (!user) {
    const form = el('form');
    form.innerHTML =
      '<label>Email<input name="email" type="email" required autocomplete="username"></label><label>Sandi<input name="password" type="password" minlength="8" maxlength="256" required autocomplete="current-password"></label><button type="submit">Masuk</button>';
    form.onsubmit = async (e) => {
      e.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const result = await request('/api/account/login', {
          email: form.elements.email.value,
          password: form.elements.password.value,
        });
        form.elements.password.value = '';
        user = result.user;
        revision = null;
        await window.OmniLocalLibrary.flush();
        location.reload();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
    host.append(
      el(
        'p',
        'Pustaka tamu dan tiap akun disimpan terpisah di perangkat. Ekspor ZIP sebelum masuk jika ingin memindahkan data tamu ke akun.'
      ),
      form
    );
    action('Daftar akun', async () => {
      const result = await request('/api/account/register', {
        email: form.elements.email.value,
        password: form.elements.password.value,
      });
      form.elements.password.value = '';
      user = result.user;
      await window.OmniLocalLibrary.flush();
      location.reload();
    });
    action('Reset sandi lewat email', async () => {
      const result = await request('/api/account/reset-password', {
        email: form.elements.email.value,
      });
      status.textContent = result.message;
    });
    return;
  }
  host.append(
    el(
      'p',
      `${user.email} · ${user.emailVerified ? 'Email terverifikasi' : 'Email belum diverifikasi'}`
    )
  );
  action('Keluar dari akun di perangkat ini', async () => {
    enabled = false;
    clearTimeout(timer);
    await window.OmniLocalLibrary.flush();
    await request('/api/account/logout', {});
    user = null;
    revision = null;
    location.reload();
  });
  action('Kirim email verifikasi', async () => {
    await request('/api/account/verify-email', {});
    status.textContent = 'Email verifikasi dikirim.';
  });
  action('Perbarui status verifikasi', async () => {
    user = (await request('/api/account/refresh', {})).user;
    renderAccount(host, api);
  });
  const name = el('input');
  name.value = user.displayName;
  name.maxLength = 80;
  name.setAttribute('aria-label', 'Nama akun');
  host.append(name);
  action('Simpan nama akun', async () => {
    user = (await request('/api/account/profile', { displayName: name.value }))
      .user;
    status.textContent = 'Nama akun disimpan.';
  });
  host.append(
    el(
      'p',
      'Data akun dan sumber diisolasi oleh identitas terverifikasi di server serta Firestore rules. File asli berukuran besar tetap lokal; cloud menyimpan teks dan artefak. Ekspor ZIP sebelum menyelesaikan konflik.'
    )
  );
  const preview = el('div');
  host.append(preview);
  action('Tinjau pustaka cloud', async () => {
    const remote = await pull();
    preview.replaceChildren(
      el(
        'p',
        remote.snapshot
          ? `${remote.snapshot.sources.length} sumber di cloud.`
          : 'Pustaka cloud masih kosong.'
      )
    );
    if (remote.snapshot) {
      const merge = el('button', 'Gabungkan sumber cloud sebagai salinan');
      merge.onclick = async () => {
        const { mergeImported } = await import('/backup-format.js');
        const result = mergeImported(api.snapshot(), remote.snapshot, 'copy');
        await api.importLibrary(result.snapshot, []);
        status.textContent =
          'Sumber cloud digabungkan di perangkat. Periksa sebelum mengaktifkan sinkronisasi.';
      };
      preview.append(merge);
      const useCloud = el(
        'button',
        'Gunakan pustaka cloud dan aktifkan sinkronisasi'
      );
      useCloud.onclick = async () => {
        try {
          if (
            !confirm(
              'Gunakan pustaka cloud di perangkat ini? Pustaka perangkat saat ini disimpan sebagai titik pemulihan sebelum impor.'
            )
          )
            return;
          applying = true;
          try {
            await api.importLibrary(remote.snapshot, []);
            revision = remote.revision;
            dirty = false;
            enabled = true;
          } finally {
            applying = false;
          }
          notify('Sinkronisasi aktif; data cloud telah dimuat.');
        } catch (error) {
          status.textContent = error.message;
        }
      };
      preview.append(useCloud);
    }
  });
  action('Aktifkan sinkronisasi dari pustaka perangkat ini', async () => {
    const remote = await pull();
    if (
      remote.snapshot &&
      !confirm(
        'Jadikan pustaka perangkat ini sebagai versi cloud berikutnya? Ekspor ZIP dan gabungkan sumber cloud terlebih dahulu agar data yang dibutuhkan tetap tersedia.'
      )
    )
      return;
    revision = remote.revision;
    await push();
    enabled = true;
    status.textContent =
      'Sinkronisasi aktif pada tab ini. Perubahan offline tetap lokal dan dikirim setelah tersambung kembali.';
  });
  action('Jeda sinkronisasi', async () => {
    enabled = false;
    clearTimeout(timer);
    status.textContent =
      'Sinkronisasi dijeda. Data tetap tersimpan di perangkat.';
  });
}
window.OmniAccounts = {
  install: installCloud,
  changed,
  render: renderAccount,
  pause() {
    enabled = false;
    clearTimeout(timer);
  },
};
