import {
  exportBackup,
  importBackup,
  mergeImported,
  restoredSource,
} from './backup-format.js';
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
export function openBackup(api) {
  const root = el('dialog');
  root.className = 'forge-dialog';
  root.append(el('h2', 'Cadangkan & pulihkan pustaka'));
  const close = el('button', 'Tutup');
  close.onclick = () => root.close();
  const status = el('p');
  status.setAttribute('role', 'status');
  const exportButton = el('button', 'Ekspor ZIP lengkap');
  exportButton.onclick = async () => {
    exportButton.disabled = true;
    try {
      status.textContent = 'Membaca sumber dan file asli…';
      const bytes = await exportBackup({
        JSZip: window.JSZip,
        snapshot: api.snapshot(),
        readFile: window.OmniLocalLibrary.readFile,
        onProgress: (p) => {
          status.textContent = `Mencadangkan sumber ${p.completed}/${p.total}`;
        },
      });
      const url = URL.createObjectURL(
          new Blob([bytes], { type: 'application/zip' })
        ),
        a = el('a');
      a.href = url;
      a.download = 'omnilearn-backup.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent =
        'Cadangan ZIP dibuat. File asli yang tidak tersedia hanya dicatat sebagai referensi hilang.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      exportButton.disabled = false;
    }
  };
  const input = el('input');
  input.type = 'file';
  input.accept = '.zip';
  input.setAttribute('aria-label', 'Pilih cadangan ZIP');
  const preview = el('section');
  input.onchange = async () => {
    preview.replaceChildren();
    if (!input.files[0]) return;
    status.textContent = 'Memvalidasi manifest, ukuran dan checksum…';
    try {
      const bundle = await importBackup({
        JSZip: window.JSZip,
        bytes: await input.files[0].arrayBuffer(),
        onProgress: (p) => {
          status.textContent = `Memeriksa file ${p.completed}/${p.total}`;
        },
      });
      const current = api.snapshot(),
        duplicates = bundle.snapshot.sources.filter((s) =>
          current.sources.some((c) => c.id === s.id)
        ).length;
      preview.append(
        el(
          'p',
          `${bundle.snapshot.sources.length} sumber · ${bundle.files.length} file asli · ${duplicates} ID yang sudah ada. Data perangkat yang lain tetap dipertahankan.`
        )
      );
      bundle.snapshot.sources.forEach((s) =>
        preview.append(
          el('p', `${s.name} · versi ${s.version} · ${s.text.length} karakter`)
        )
      );
      const policy = el('select');
      policy.setAttribute('aria-label', 'Konflik impor');
      for (const [value, label] of [
        ['copy', 'Buat salinan untuk ID yang sama'],
        ['skip', 'Lewati ID yang sama'],
      ]) {
        const option = el('option', label);
        option.value = value;
        policy.append(option);
      }
      const apply = el('button', 'Konfirmasi impor');
      apply.onclick = async () => {
        apply.disabled = true;
        try {
          const merged = mergeImported(
              api.snapshot(),
              bundle.snapshot,
              policy.value
            ),
            files = bundle.files
              .filter((f) => merged.mapping.has(f.sourceId))
              .map((f) => ({
                sourceId: merged.mapping.get(f.sourceId),
                version: f.version,
                file: new File([f.data], f.name, { type: f.mimeType }),
              }));
          await api.importLibrary(merged.snapshot, files);
          root.close();
        } catch (error) {
          status.textContent = error.message;
          apply.disabled = false;
        }
      };
      preview.append(policy, apply);
      status.textContent =
        'Validasi selesai. Periksa pratinjau sebelum mengimpor.';
    } catch (error) {
      status.textContent = `Impor ditolak: ${error.message}`;
    }
  };
  root.append(
    close,
    el(
      'p',
      'Format ZIP berversi dengan checksum SHA-256. Impor tidak menjalankan isi arsip dan tidak menimpa sumber lain.'
    ),
    exportButton,
    input,
    status,
    preview
  );
  const rollback = el('button', 'Pulihkan pustaka sebelum impor terakhir');
  rollback.onclick = async () => {
    try {
      const previous = await window.OmniLocalLibrary.readRollback();
      if (!previous) {
        status.textContent =
          'Belum ada pustaka sebelum impor yang dapat dipulihkan.';
        return;
      }
      if (
        !confirm(
          `Pulihkan ${previous.sources.length} sumber dari sebelum impor terakhir? Pustaka saat ini akan disimpan sebagai titik pemulihan berikutnya.`
        )
      )
        return;
      await api.importLibrary(previous, []);
      root.close();
    } catch (error) {
      status.textContent = error.message;
    }
  };
  root.append(rollback);
  root.onclose = () => root.remove();
  document.body.append(root);
  root.showModal();
}
window.OmniBackup = { open: openBackup, restoredSource };
