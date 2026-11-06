/* Editable learning tools. User content stays Markdown/text; previews use the shared sanitizer. */
(() => {
  'use strict';
  const statuses = {new: 'Baru', learning: 'Sedang belajar', overdue: 'Tertunggak', mastered: 'Dikuasai'};
  const colors = ['yellow', 'lavender', 'blue', 'peach', 'green'];
  let counter = 0;
  const uid = () => globalThis.crypto?.randomUUID?.() || `note-${Date.now()}-${++counter}`;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, action, className = '') => {
    const node = element('button', `omni-wb-button ${className}`.trim(), label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const render = (node, value) => {
    // There is no raw HTML fallback if the optional renderer has not loaded.
    if (typeof window.renderMarkdownToSafeHtml === 'function') node.innerHTML = window.renderMarkdownToSafeHtml(String(value || ''));
    else node.textContent = String(value || '');
    node.querySelectorAll('a').forEach(link => { link.target = '_blank'; link.rel = 'noopener noreferrer'; });
  };
  const download = (value, name, type = 'text/plain;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([value], {type}));
    const link = element('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const filename = value => (String(value || 'catatan-omnilearn').replace(/\.[a-z0-9]{1,6}$/i, '').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 90) || 'catatan-omnilearn');

  function installNotes(panel, options = {}) {
    let current = String(options.value ?? '');
    let history = [current], historyIndex = 0, destroyed = false;
    panel.replaceChildren();
    const root = element('section', 'omni-notebook');
    const heading = element('div', 'omni-wb-heading');
    heading.append(element('span', 'handwriting', 'tulis dengan bahasamu sendiri'), element('h1', '', 'Catatan belajarmu'), element('p', '', options.sourceName || 'Catatan bebas · tersimpan di sesi tab ini'));
    const toolbar = element('div', 'omni-note-toolbar');
    toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Format catatan');
    const editor = element('textarea', 'omni-note-editor');
    editor.id = 'noteEditor'; editor.value = current;
    editor.setAttribute('aria-label', 'Editor catatan Markdown');
    editor.placeholder = 'Tulis ide utamamu di sini. Pilih teks untuk memberi format…';
    editor.spellcheck = true;
    const preview = element('article', 'omni-note-preview md-rendered');
    preview.setAttribute('aria-label', 'Pratinjau catatan');
    const status = element('p', 'omni-note-status', 'Tersimpan di sesi tab ini.');
    status.setAttribute('role', 'status');
    const count = element('span', 'omni-note-count');
    let saveVersion = 0;
    const save = async () => {
      const version = ++saveVersion;
      try {
        if (typeof options.onSave === 'function') await options.onSave(editor.value);
        if (!destroyed && version === saveVersion) status.textContent = options.storageLabel || 'Tersimpan di sesi tab ini.';
        return true;
      } catch {
        if (!destroyed) status.textContent = 'Belum tersimpan. Ekspor Markdown agar catatan tetap aman.';
        return false;
      }
    };
    const refresh = () => {
      current = editor.value;
      render(preview, current || '*Pratinjau catatan akan tampil di sini.*');
      count.textContent = `${current.length.toLocaleString('id-ID')} karakter`;
      undo.disabled = historyIndex === 0; redo.disabled = historyIndex === history.length - 1;
    };
    const commit = () => {
      if (editor.value !== history[historyIndex]) {
        history = history.slice(0, historyIndex + 1);
        history.push(editor.value);
        if (history.length > 80) history.shift();
        historyIndex = history.length - 1;
      }
      refresh(); void save();
    };
    const replaceSelection = (prefix, suffix = '', fallback = 'teks') => {
      const start = editor.selectionStart, end = editor.selectionEnd;
      const selected = editor.value.slice(start, end) || fallback;
      editor.setRangeText(prefix + selected + suffix, start, end, 'end');
      editor.focus(); editor.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      commit();
    };
    const linePrefix = numbered => {
      const start = editor.value.lastIndexOf('\n', editor.selectionStart - 1) + 1;
      const selectedEnd = editor.selectionEnd;
      const end = editor.value.indexOf('\n', selectedEnd);
      const lines = editor.value.slice(start, end < 0 ? editor.value.length : end).split('\n');
      const replacement = lines.map((line, i) => `${numbered ? `${i + 1}.` : '-'} ${line}`).join('\n');
      editor.setRangeText(replacement, start, end < 0 ? editor.value.length : end, 'select');
      editor.focus(); commit();
    };
    const undo = button('↶ Urungkan', () => { if (historyIndex > 0) { editor.value = history[--historyIndex]; refresh(); void save(); } });
    const redo = button('↷ Ulangi', () => { if (historyIndex < history.length - 1) { editor.value = history[++historyIndex]; refresh(); void save(); } });
    const formats = [
      ['Tebal', '**', '**', 'teks tebal'], ['Miring', '*', '*', 'teks miring'],
      ['Garis bawah', '<u>', '</u>', 'teks bergaris bawah'], ['Sorot', '<mark>', '</mark>', 'poin penting']
    ];
    formats.forEach(([label, before, after, fallback]) => toolbar.append(button(label, () => replaceSelection(before, after, fallback))));
    toolbar.append(button('• Daftar', () => linePrefix(false)), button('1. Urutan', () => linePrefix(true)),
      button('Tabel', () => replaceSelection('\n\n', '\n\n', '| Konsep | Penjelasan |\n| --- | --- |\n| Konsep 1 | Penjelasan singkat |')),
      button('∑ Rumus', () => replaceSelection('$$\n', '\n$$', 'E = mc^2')), undo, redo);
    const actions = element('div', 'omni-wb-actions');
    actions.append(button('Simpan', () => void save(), 'omni-wb-primary'),
      button('Ekspor Markdown', () => download(editor.value, `${filename(options.sourceName)}.md`, 'text/markdown;charset=utf-8')),
      button('Cetak / PDF', () => {
        const frame = element('iframe', 'omni-print-frame'); frame.title = 'Cetak catatan';
        document.body.append(frame);
        const doc = frame.contentDocument;
        if (!doc) { frame.remove(); status.textContent = 'Cetak tidak tersedia. Gunakan ekspor Markdown.'; return; }
        const title = doc.createElement('title'); title.textContent = options.sourceName || 'Catatan OmniLearn'; doc.head.append(title);
        const style = doc.createElement('style');
        style.textContent = 'body{font:15px/1.65 system-ui,sans-serif;color:#20202b;max-width:800px;margin:35px auto;padding:0 24px}h1,h2,h3{line-height:1.2}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}pre{white-space:pre-wrap}img,svg{max-width:100%}.katex-html{display:none}mark{background:#fff1a8}@page{margin:20mm}';
        doc.head.append(style);
        const titleHeading = doc.createElement('h1'); titleHeading.textContent = options.sourceName || 'Catatan belajarku';
        const content = doc.createElement('article'); render(content, editor.value);
        doc.body.append(titleHeading, content);
        status.textContent = 'Pilih “Simpan sebagai PDF” pada dialog cetak browser.';
        frame.contentWindow.addEventListener('afterprint', () => frame.remove(), {once:true});
        setTimeout(() => { try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { status.textContent = 'Dialog cetak tidak tersedia. Gunakan ekspor Markdown.'; frame.remove(); } }, 100);
        setTimeout(() => frame.remove(), 60_000);
      }));
    if (typeof options.onAssist === 'function') {
      const assist = element('select', 'omni-wb-select'); assist.setAttribute('aria-label', 'Bantuan AI untuk catatan');
      [['summarize', 'Ringkas catatan'], ['clarify', 'Perjelas bahasa'], ['questions', 'Buat pertanyaan latihan']].forEach(([value,text]) => { const item = element('option','',text); item.value = value; assist.append(item); });
      const aiButton = button('✦ Bantu dengan AI', async () => {
        aiButton.disabled = true; status.textContent = 'AI sedang membantu catatanmu…';
        try { await options.onAssist(assist.value, editor.value); status.textContent = 'Periksa bantuan AI sebelum mengubah catatanmu.'; }
        catch { status.textContent = 'Bantuan AI belum berhasil. Catatanmu tetap tersimpan.'; }
        finally { aiButton.disabled = false; }
      });
      actions.append(assist, aiButton);
    }
    const layout = element('div', 'omni-note-layout');
    const editorPane = element('div', 'omni-note-pane');
    const editLabel = element('label', 'omni-wb-label', 'Tulis · Markdown'); editLabel.htmlFor = editor.id;
    editorPane.append(editLabel, editor);
    const previewPane = element('div', 'omni-note-pane'); previewPane.append(element('span', 'omni-wb-label', 'Pratinjau'), preview);
    layout.append(editorPane, previewPane);
    const footer = element('div', 'omni-note-footer'); footer.append(status, count);
    root.append(heading, toolbar, layout, actions, footer); panel.append(root);
    editor.addEventListener('input', commit);
    editor.addEventListener('keydown', event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { event.preventDefault(); (event.shiftKey ? redo : undo).click(); }
      if (key === 'y') { event.preventDefault(); redo.click(); }
      if (key === 'b') { event.preventDefault(); replaceSelection('**', '**'); }
      if (key === 'i') { event.preventDefault(); replaceSelection('*', '*'); }
      if (key === 's') { event.preventDefault(); void save(); }
    });
    refresh();
    return {
      getValue: () => editor.value,
      setValue(value) { editor.value = String(value ?? ''); commit(); },
      save,
      destroy() { destroyed = true; }
    };
  }

  function installSticky(panel, options = {}) {
    let notes = (Array.isArray(options.notes) ? options.notes : []).filter(item => item && typeof item.text === 'string').map(item => ({id: String(item.id || uid()), text: item.text, color: colors.includes(item.color) ? item.color : 'yellow', updatedAt: Number(item.updatedAt) || Date.now()}));
    panel.replaceChildren();
    const root = element('section', 'omni-sticky-board');
    root.append(element('span', 'handwriting', 'ide kecil, pemahaman besar'), element('h1', '', 'Tempel ide pentingmu'), element('p', '', options.sourceName || 'Catatan singkat disimpan di sesi tab ini.'));
    const status = element('p', 'omni-note-status'); status.setAttribute('role','status');
    const grid = element('div', 'omni-sticky-grid');
    const save = () => {
      try {
        const result = options.onSave?.(notes.map(note => ({...note})));
        Promise.resolve(result).catch(() => { status.textContent = 'Belum tersimpan. Salin catatan penting sebelum meninggalkan halaman.'; });
        status.textContent = `${notes.length} catatan · sesi tab ini`;
      } catch { status.textContent = 'Belum tersimpan. Salin catatan penting sebelum meninggalkan halaman.'; }
    };
    const addCard = note => {
      const card = element('article', `omni-sticky omni-sticky-${note.color}`);
      const editor = element('textarea'); editor.value = note.text;
      editor.placeholder = 'Tangkap satu ide penting…';
      editor.setAttribute('aria-label', 'Isi catatan tempel');
      editor.addEventListener('input', () => { note.text = editor.value; note.updatedAt = Date.now(); save(); });
      const footer = element('div', 'omni-sticky-footer');
      const palette = element('select', 'omni-wb-select'); palette.setAttribute('aria-label', 'Warna catatan');
      const labels = ['Kuning', 'Ungu', 'Biru', 'Persik', 'Hijau'];
      colors.forEach((color,i) => { const item = element('option','',labels[i]); item.value = color; palette.append(item); });
      palette.value = note.color;
      palette.addEventListener('change', () => { note.color = palette.value; note.updatedAt = Date.now(); card.className = `omni-sticky omni-sticky-${note.color}`; save(); });
      footer.append(palette, button('Hapus', () => { notes = notes.filter(item => item !== note); card.remove(); save(); }));
      card.append(editor, footer); grid.append(card);
      return editor;
    };
    const actions = element('div', 'omni-wb-actions');
    actions.append(button('＋ Tempel ide', () => { const note = {id:uid(),text:'',color:colors[notes.length % colors.length],updatedAt:Date.now()}; notes.push(note); addCard(note).focus(); save(); }, 'omni-wb-primary'),
      button('Ekspor catatan', () => download(notes.map((note,i) => `## Catatan ${i + 1}\n\n${note.text}`).join('\n\n'), 'omnilearn-tempel.md', 'text/markdown;charset=utf-8')));
    root.append(actions, grid, status); panel.append(root);
    notes.forEach(addCard);
    status.textContent = notes.length ? `${notes.length} catatan · sesi tab ini` : 'Mulai dengan satu ide yang ingin kamu ingat.';
    return {getNotes: () => notes.map(note => ({...note})), destroy() {}};
  }

  function installFlashcards(host, options = {}) {
    let cards = (Array.isArray(options.cards) ? options.cards : []).filter(card => card && typeof card.front === 'string' && typeof card.back === 'string').map(card => ({...card}));
    let reviews = {...(options.reviews || {})};
    let order = cards.map((_,i) => i), cursor = 0, flipped = false, dueOnly = false, scheduler, disposed = false;
    host.replaceChildren();
    const root = element('section', 'omni-flashcards'); root.tabIndex = -1;
    const header = element('div', 'omni-wb-heading');
    header.append(element('h2', '', 'Sedikit demi sedikit, makin ingat.'), element('p', '', 'Pikirkan jawabannya, balik kartu, lalu nilai pemahamanmu.'));
    const statistics = element('div', 'omni-review-stats'); statistics.setAttribute('aria-label', 'Statistik pengulangan');
    const controls = element('div', 'omni-wb-actions');
    const message = element('p', 'omni-note-status'); message.setAttribute('role','status');
    const stage = element('div', 'omni-card-stage');
    const progress = element('p', 'omni-card-progress');
    const cardArea = element('div', 'omni-review-card');
    cardArea.setAttribute('role', 'button'); cardArea.setAttribute('tabindex', '0'); cardArea.setAttribute('aria-label', 'Balik flashcard');
    const inner = element('div', 'omni-review-card-inner');
    const front = element('article', 'omni-review-face omni-review-front md-rendered');
    const back = element('article', 'omni-review-face omni-review-back md-rendered');
    inner.append(front,back); cardArea.append(inner);
    const navigation = element('div', 'omni-wb-actions omni-card-navigation');
    const assessments = element('div', 'omni-review-grades');
    const formHost = element('div', 'omni-card-form-host');
    const currentCard = () => cards[order[cursor]];
    const keyFor = card => JSON.stringify([card.front, card.back]);
    const notify = () => { options.onCardsChange?.(cards.map(card => ({...card}))); options.onReview?.({...reviews},{type:'change'}); };
    const statusText = review => {
      if (!scheduler) return '';
      const state = scheduler.reviewStatus(review);
      return statuses[state] + (review?.dueAt ? ` · Ulangi ${new Date(review.dueAt).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : '');
    };
    const drawStats = () => {
      statistics.replaceChildren();
      if (!scheduler) return;
      const stats = scheduler.reviewStats(cards,reviews);
      [['due','Perlu diulang'],['new','Baru'],['learning','Belajar'],['mastered','Dikuasai']].forEach(([key,label]) => {
        const item = element('div', 'omni-review-stat'); item.append(element('strong','',String(stats[key])),element('span','',label)); statistics.append(item);
      });
    };
    const draw = () => {
      flipped = false; cardArea.classList.remove('is-flipped'); cardArea.setAttribute('aria-pressed','false');
      const card = currentCard();
      stage.hidden = !card;
      drawStats();
      if (!card) { message.textContent = cards.length ? 'Selesai untuk sesi ini. Latih semua kartu atau kembali saat jadwal berikutnya.' : 'Belum ada kartu. Tambahkan kartu atau buat dari materi dengan AI.'; return; }
      progress.textContent = `${cursor + 1} / ${order.length} kartu${dueOnly ? ' jatuh tempo' : ''} · ${statusText(reviews[keyFor(card)])}`;
      render(front,card.front); render(back,card.back);
      front.setAttribute('aria-hidden','false'); back.setAttribute('aria-hidden','true');
      flip.textContent = 'Balik kartu';
      previous.disabled = cursor === 0; next.disabled = cursor >= order.length - 1;
      gradeButtons.forEach(node => node.disabled = true);
      message.textContent = 'Spasi untuk membalik · 1–4 untuk menilai setelah dibalik.';
    };
    const flipCard = () => {
      if (!currentCard()) return;
      flipped = !flipped; cardArea.classList.toggle('is-flipped',flipped); cardArea.setAttribute('aria-pressed',String(flipped));
      front.setAttribute('aria-hidden',String(flipped)); back.setAttribute('aria-hidden',String(!flipped));
      flip.textContent = flipped ? 'Lihat pertanyaan' : 'Balik kartu';
      gradeButtons.forEach(node => node.disabled = !flipped || !scheduler);
    };
    const grade = value => {
      const card = currentCard(); if (!card || !flipped || !scheduler) return;
      const key = keyFor(card);
      reviews[key] = scheduler.scheduleReview(reviews[key],value);
      try { options.onReview?.({...reviews},{type:'grade',grade:value,card:{...card},review:{...reviews[key]}}); }
      catch { message.textContent = 'Jadwal belum tersimpan. Ekspor kartu sebelum menutup sesi.'; return; }
      if (dueOnly) order.splice(cursor,1);
      else cursor++;
      draw();
    };
    const resetDeck = onlyDue => {
      dueOnly = onlyDue;
      order = cards.map((_,i) => i).filter(i => !onlyDue || !reviews[keyFor(cards[i])] || reviews[keyFor(cards[i])].dueAt <= Date.now());
      cursor = 0; draw();
    };
    const edit = index => {
      const existing = Number.isInteger(index) ? cards[index] : null;
      formHost.replaceChildren();
      const form = element('form','omni-card-form');
      const title = element('h3','',existing ? 'Edit kartu' : 'Tambah kartu');
      const questionLabel = element('label','omni-wb-label','Pertanyaan');
      const question = element('textarea'); question.required = true; question.value = existing?.front || ''; question.rows = 3;
      const answerLabel = element('label','omni-wb-label','Jawaban');
      const answer = element('textarea'); answer.required = true; answer.value = existing?.back || ''; answer.rows = 4;
      questionLabel.append(question); answerLabel.append(answer);
      const actions = element('div','omni-wb-actions');
      const submit = element('button','omni-wb-button omni-wb-primary','Simpan kartu'); submit.type = 'submit';
      actions.append(submit,button('Batal',()=>formHost.replaceChildren()));
      form.append(title,questionLabel,answerLabel,actions); formHost.append(form); question.focus();
      form.addEventListener('submit',event => {
        event.preventDefault();
        if (!question.value.trim() || !answer.value.trim()) return;
        const card = {...(existing || {}),front:question.value.trim(),back:answer.value.trim()};
        if (existing) {
          const oldKey = keyFor(existing), newKey = keyFor(card);
          if (oldKey !== newKey && reviews[oldKey]) { reviews[newKey] = reviews[oldKey]; if (!cards.some((other,i) => i !== index && keyFor(other) === oldKey)) delete reviews[oldKey]; }
          cards[index] = card;
        } else { cards.push(card); }
        try { notify(); formHost.replaceChildren(); resetDeck(false); cursor = existing ? index : cards.length - 1; draw(); }
        catch { message.textContent = 'Kartu belum tersimpan. Coba simpan kembali.'; }
      });
    };
    const gradeButtons = [['again','1 · Lagi'],['hard','2 · Sulit'],['good','3 · Bagus'],['easy','4 · Mudah']].map(([value,label]) => {
      const node = button(label,()=>grade(value),`omni-grade-${value}`); node.title = 'Balik kartu sebelum menilai'; assessments.append(node); return node;
    });
    const previous = button('← Sebelumnya',()=>{ if (cursor > 0) {cursor--;draw();} });
    const flip = button('Balik kartu',flipCard,'omni-wb-primary');
    const next = button('Berikutnya →',()=>{if(cursor < order.length - 1){cursor++;draw();}});
    navigation.append(previous,flip,next);
    controls.append(button('Jadwal hari ini',()=>resetDeck(true)),button('Latih semua',()=>resetDeck(false)),
      button('Acak',()=>{for(let i=order.length - 1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}cursor=0;draw();}),
      button('＋ Tambah',()=>edit()),button('Edit',()=>{if(currentCard())edit(order[cursor]);}),
      button('Hapus kartu',()=>{
        const card = currentCard(); if(!card)return;
        const confirmHost = element('div','omni-inline-confirm'); confirmHost.setAttribute('role','group'); confirmHost.setAttribute('aria-label','Hapus kartu');
        confirmHost.append(element('p','','Hapus kartu ini dari materi?'),button('Ya, hapus',()=>{const index=order[cursor];cards.splice(index,1);if(!cards.some(other=>keyFor(other)===keyFor(card)))delete reviews[keyFor(card)];notify();formHost.replaceChildren();resetDeck(dueOnly);}),button('Batal',()=>formHost.replaceChildren()));
        formHost.replaceChildren(confirmHost);
      }),
      button('Reset progres',()=>{
        const confirmation = element('div','omni-inline-confirm');
        confirmation.append(element('p','','Jadwal semua kartu pada materi ini akan dihapus. Isi kartu tetap ada.'),button('Reset jadwal',()=>{cards.forEach(card=>delete reviews[keyFor(card)]);options.onReview?.({...reviews},{type:'reset'});formHost.replaceChildren();resetDeck(false);}),button('Batal',()=>formHost.replaceChildren()));
        formHost.replaceChildren(confirmation);
      }),button('Bagikan / ekspor',async()=>{
        const text = cards.map((card,i)=>`## ${i+1}. ${card.front}\n\n${card.back}`).join('\n\n');
        if (navigator.share) { try {await navigator.share({title:'Flashcard OmniLearn',text});return;}catch(error){if(error.name==='AbortError')return;} }
        download(text,'omnilearn-flashcards.md','text/markdown;charset=utf-8');
      }));
    stage.append(progress,cardArea,navigation,assessments);
    root.append(header,statistics,controls,formHost,stage,message);host.append(root);
    cardArea.addEventListener('click',event=>{if(!event.target.closest('a'))flipCard();});
    const keyboard = event => {
      if (disposed || !root.isConnected || host.hidden || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
      // Root-scoped shortcuts prevent another active tool or browser field from grading cards.
      if (!root.contains(event.target) && event.target !== document.body) return;
      if ((event.key === ' ' && event.target === cardArea) || (event.key === 'Enter' && event.target === cardArea)) {event.preventDefault();flipCard();}
      const index = ['1','2','3','4'].indexOf(event.key);
      if(index>=0 && flipped){event.preventDefault();grade(['again','hard','good','easy'][index]);}
    };
    root.addEventListener('keydown',keyboard);
    draw();
    import('/review-scheduler.js').then(module=>{
      if(disposed)return;
      scheduler=module;drawStats();
      const card=currentCard();if(card)progress.textContent=`${cursor+1} / ${order.length} kartu · ${statusText(reviews[keyFor(card)])}`;
      gradeButtons.forEach(node=>node.disabled=!flipped);
    }).catch(()=>{if(!disposed)message.textContent='Jadwal belum tersedia. Kamu tetap dapat membaca, mengedit, dan mengekspor kartu.';});
    return {getCards:()=>cards.map(card=>({...card})),getReviews:()=>({...reviews}),reviewDue:()=>resetDeck(true),destroy(){disposed=true;root.removeEventListener('keydown',keyboard);}};
  }

  window.OmniWorkbench = {installNotes,installSticky,installFlashcards};
})();
