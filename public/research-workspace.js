export function mountResearch(host, api) {
  if (host.querySelector('#externalResearch')) {
    host.querySelector('#externalResearch').hidden = false;
    return;
  }
  const root = document.createElement('section');
  root.id = 'externalResearch';
  root.className = 'research-results';
  root.innerHTML =
    '<h2>Telusuri sumber eksternal</h2><p>Metadata publikasi dan cuplikan web ditampilkan terpisah dari dokumen. Ini bukan klaim bahwa artikel lengkap sudah dibaca.</p><form><label>Kueri<input name="query" minlength="3" maxlength="500" required></label><label>Penyedia<select name="kind"><option value="academic">Crossref · metadata akademik</option><option value="web">Pencarian web · perlu konfigurasi</option></select></label><button>Cari referensi</button></form><p role="status"></p><div data-results></div>';
  root.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const button = root.querySelector('button'),
      status = root.querySelector('[role=status]'),
      results = root.querySelector('[data-results]');
    button.disabled = true;
    status.textContent = 'Menghubungi penyedia riset…';
    results.replaceChildren();
    try {
      const data = await safeRequestJson(
        '/api/research/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            query: event.target.elements.query.value,
            kind: event.target.elements.kind.value,
          }),
        },
        { timeoutMs: 25000, stageContext: 'research-search' }
      );
      for (const item of data.results) {
        const article = document.createElement('article'),
          title = document.createElement('h3'),
          link = document.createElement('a'),
          description = document.createElement('p'),
          citation = document.createElement('p'),
          save = document.createElement('button');
        title.textContent = item.title;
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.doi || item.url;
        description.textContent =
          item.abstract || 'Abstrak tidak disediakan oleh penyedia.';
        citation.textContent = item.citation;
        save.textContent = 'Simpan referensi ke sumber aktif';
        save.onclick = async () => {
          const source = api.getCurrentSource();
          if (!source) {
            status.textContent =
              'Pilih sumber dari pustaka sebelum menyimpan referensi.';
            return;
          }
          source.researchSources ||= [];
          const alreadySaved = source.researchSources.some(r => r.url === item.url);
          if (!alreadySaved) source.researchSources.push(item);
          save.disabled = true;
          save.textContent = 'Menyimpan…';
          try {
            await api.persistAsync();
            save.textContent = 'Referensi tersimpan';
            status.textContent = 'Referensi berhasil tersimpan di perangkat.';
          } catch (error) {
            if (!alreadySaved)
              source.researchSources = source.researchSources.filter(r => r !== item);
            save.disabled = false;
            save.textContent = 'Coba simpan lagi';
            status.textContent = 'Referensi belum tersimpan: ' + error.message;
          }
        };
        const label = document.createElement('label'),
          pick = document.createElement('input');
        pick.type = 'checkbox';
        pick.name = 'research-reference';
        pick.value = item.id;
        label.append(
          pick,
          document.createTextNode('Pilih untuk perbandingan / ringkasan')
        );
        article.append(title, link, description, citation, save, label);
        results.append(article);
      }
      status.textContent = `${data.results.length} hasil. Dokumen unggahan tidak digabungkan; interpretasi AI belum dibuat.`;
      const include = document.createElement('label'),
        includeSource = document.createElement('input'),
        summarize = document.createElement('button'),
        compare = document.createElement('button'),
        output = document.createElement('section');
      includeSource.type = 'checkbox';
      include.append(
        includeSource,
        document.createTextNode(
          'Sertakan sumber unggahan aktif dalam ringkasan AI'
        )
      );
      compare.textContent = 'Bandingkan metadata terpilih';
      compare.onclick = () => {
        output.replaceChildren();
        const selected = new Set(
          [
            ...results.querySelectorAll('[name=research-reference]:checked'),
          ].map((n) => n.value)
        );
        for (const item of data.results.filter((r) => selected.has(r.id))) {
          const row = document.createElement('p');
          row.textContent = `${item.title} · ${item.authors.join(', ') || 'Penulis tidak tersedia'} · ${item.publishedDate || 'Tanggal tidak tersedia'} · ${item.journal || item.provider}`;
          output.append(row);
        }
        status.textContent = selected.size
          ? 'Perbandingan metadata penyedia, tanpa interpretasi AI.'
          : 'Pilih referensi terlebih dahulu.';
      };
      summarize.textContent = 'Buat ringkasan riset dengan AI';
      summarize.onclick = async () => {
        summarize.disabled = true;
        try {
          const ids = [
            ...results.querySelectorAll('[name=research-reference]:checked'),
          ].map((n) => n.value);
          if (!ids.length)
            throw new Error('Pilih 1–8 referensi terlebih dahulu.');
          const source = includeSource.checked ? api.getCurrentSource() : null;
          if (includeSource.checked && !source)
            throw new Error('Pilih sumber unggahan terlebih dahulu.');
          if (source) await api.ensureAnalysis();
          const result = await safeRequestJson(
            '/api/research/synthesize',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                ids,
                query: data.query,
                outputLanguage:
                  document.getElementById('outputLanguage')?.value || 'auto',
                material: source?.text || '',
                materialId: source?.id || '',
                ...(source ? api.sourceRequest() : {}),
              }),
            },
            { timeoutMs: 65000, stageContext: 'research-synthesis' }
          );
          output.replaceChildren();
          const add = (heading, text) => {
            const h = document.createElement('h3'),
              p = document.createElement('p');
            h.textContent = heading;
            p.textContent = text;
            output.append(h, p);
          };
          if (result.synthesis.uploadedSummary)
            add('Informasi sumber unggahan', result.synthesis.uploadedSummary);
          add(
            'Ringkasan metadata eksternal',
            result.synthesis.externalSummary
              .map((c) => `${c.claim} [${c.evidenceIds.join(', ')}]`)
              .join('\n')
          );
          add('Interpretasi AI', result.synthesis.interpretation);
          add('Batasan', result.synthesis.limitations.join('\n'));
          for (const ref of result.synthesis.references)
            add(ref.evidenceId, ref.citation);
          window.OmniRecovery?.notice(result);
          if (source) {
            const previous = source.researchSynthesis;
            source.researchSynthesis = result.synthesis;
            try { await api.persistAsync(); }
            catch (error) {
              if (previous === undefined) delete source.researchSynthesis;
              else source.researchSynthesis = previous;
              throw new Error('Ringkasan belum tersimpan: ' + error.message);
            }
          }
          status.textContent =
            'Ringkasan mengacu pada registry penyedia; artikel lengkap belum diverifikasi.';
        } catch (error) {
          status.textContent = error.message;
        } finally {
          summarize.disabled = false;
        }
      };
      results.append(include, compare, summarize, output);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
  host.prepend(root);
}
window.OmniResearch = { mount: mountResearch };
