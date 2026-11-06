/* Source review and revision UI. Text is always inserted with textContent. */
(() => {
  function dialog(title) {
    const root = document.createElement('dialog');
    root.className = 'map-edit-dialog source-review-dialog';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const close = document.createElement('button');
    close.textContent = 'Tutup';
    close.onclick = () => root.close();
    root.append(heading, close);
    root.onclose = () => root.remove();
    document.body.append(root);
    root.showModal();
    return root;
  }
  function showAnalysis(source, api) {
    const root = dialog('Analisis sumber · ' + source.name);
    const controller = new AbortController();
    root.addEventListener('close', () => controller.abort());
    const intro = document.createElement('p');
    intro.textContent = `Versi ${source.version || 1}. Pemeriksaan otomatis mencakup kutipan, bagian sumber, rumus literal, dan struktur konsep. Akurasi akademik serta hasil OCR tetap perlu diperiksa.`;
    root.append(intro);
    for (const page of source.meta?.pageQuality || []) {
      const row = document.createElement('p');
      row.textContent = `Halaman ${page.page}: ${page.status}${page.flags?.length ? ' · ' + page.flags.join(', ') : ''}. Confidence OCR numerik tidak disediakan.`;
      root.append(row);
    }
    if (source.meta?.partialRead || source.meta?.truncated) {
      const label = document.createElement('label'),
        accept = document.createElement('input');
      accept.type = 'checkbox';
      accept.checked = source.acceptPartial === true;
      label.append(
        accept,
        ' Saya sudah memeriksa teks dan mengizinkan analisis bagian yang tersedia. Bagian hilang belum dianalisis.'
      );
      accept.onchange = () => {
        source.acceptPartial = accept.checked;
        api.persist();
      };
      root.append(label);
    }
    const run = document.createElement('button');
    run.textContent = source.blueprint
      ? 'Periksa analisis tersimpan'
      : 'Analisis sumber';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const content = document.createElement('div');
    root.append(run, status, content);
    function render(blueprint) {
      content.replaceChildren();
      const summary = document.createElement('p');
      summary.textContent = blueprint.overview;
      const scope = document.createElement('p');
      scope.textContent = `${blueprint.quality.reviewedSections}/${blueprint.quality.totalSections} bagian · ${blueprint.concepts.length} konsep · Model: ${blueprint.model} · ${blueprint.partial ? 'sumber sebagian' : 'teks yang tersedia dianalisis'}`;
      content.append(summary, scope);
      for (const concept of blueprint.concepts) {
        const details = document.createElement('details'),
          title = document.createElement('summary'),
          definition = document.createElement('p'),
          quote = document.createElement('blockquote');
        title.textContent = concept.name;
        definition.textContent = concept.definition;
        quote.textContent = `${concept.evidence.reference || concept.evidence.sectionId}: “${concept.evidence.quote}”`;
        details.append(title, definition, quote);
        content.append(details);
      }
      for (const [key, title] of [
        ['limitations', 'Batasan'],
        ['knowledgeGaps', 'Informasi yang belum tersedia'],
      ]) {
        if (!blueprint[key]?.length) continue;
        const heading = document.createElement('h3');
        heading.textContent = title;
        content.append(heading);
        blueprint[key].forEach((item) => {
          const p = document.createElement('p');
          p.textContent = item;
          content.append(p);
        });
      }
    }
    if (source.blueprint) render(source.blueprint);
    run.onclick = async () => {
      run.disabled = true;
      status.textContent = 'Menganalisis dan memeriksa bukti…';
      try {
        render(await api.ensureAnalysis(controller.signal));
        status.textContent =
          'Struktur dan bukti kutipan lolos pemeriksaan otomatis.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        run.disabled = false;
      }
    };
  }
  function editSource(source, api) {
    const root = dialog('Revisi sumber · ' + source.name);
    const help = document.createElement('p');
    help.textContent =
      'Revisi membuat versi baru. Hasil AI, chat, kartu dan progres lama diarsipkan; catatan pribadi tetap disimpan. Analisis dan hasil baru dibuat ulang dari teks baru.';
    const editor = document.createElement('textarea');
    editor.value = source.text;
    editor.maxLength = 50000;
    editor.setAttribute('aria-label', 'Teks sumber versi baru');
    const save = document.createElement('button');
    save.textContent = 'Simpan sebagai versi baru';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    root.append(help, editor, save, status);
    save.onclick = async () => {
      if (editor.value.trim().length < 20) {
        status.textContent = 'Masukkan minimal 20 karakter materi.';
        return;
      }
      if (source.text === editor.value) {
        status.textContent = 'Teks belum berubah.';
        return;
      }
      save.disabled = true;
      try {
        await api.revise(source, editor.value);
        root.close();
      } catch (error) {
        status.textContent = error.message;
        save.disabled = false;
      }
    };
  }
  function history(source, api) {
    const root = dialog('Arsip versi · ' + source.name);
    const versions = source.versions || [];
    if (!versions.length) {
      const p = document.createElement('p');
      p.textContent =
        'Belum ada versi terdahulu. Revisi sumber akan disimpan di sini.';
      root.append(p);
    }
    for (const version of versions) {
      const row = document.createElement('p'),
        download = document.createElement('button');
      row.textContent = `Versi ${version.version} · ${new Date(version.archivedAt).toLocaleString('id-ID')} · ${(version.chat || []).length} pesan · ${(version.deck || []).length} kartu `;
      download.textContent = 'Ekspor arsip JSON';
      download.onclick = () =>
        exportJson(version, `omnilearn-version-${version.version}.json`);
      row.append(download);
      if (api) {
        const restore = document.createElement('button');
        restore.textContent = 'Pratinjau & pulihkan';
        restore.onclick = () => {
          const preview = dialog(`Pulihkan versi ${version.version}`),
            text = document.createElement('pre'),
            confirmButton = document.createElement('button'),
            status = document.createElement('p');
          text.textContent = version.text;
          text.style.whiteSpace = 'pre-wrap';
          confirmButton.textContent = 'Pulihkan sebagai versi baru';
          confirmButton.onclick = async () => {
            confirmButton.disabled = true;
            try {
              await api.restore(source, version);
              preview.close();
              root.close();
            } catch (error) {
              status.textContent = error.message;
              confirmButton.disabled = false;
            }
          };
          preview.append(text, confirmButton, status);
        };
        row.append(restore);
      }
      root.append(row);
    }
  }
  function exportJson(data, name) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.OmniSourceTools = { showAnalysis, editSource, history, exportJson };
})();
