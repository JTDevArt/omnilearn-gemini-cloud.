/* Product navigation adapts the existing learning engine; no duplicate AI clients. */
(() => {
  document.body.classList.add('product-dashboard');
  const views = { learn: ['⌂', 'Belajar'], notes: ['☷', 'Catatan'], map: ['⌘', 'Mindmap'], quiz: ['✓', 'Kuis'], cards: ['▣', 'Flashcard'], sources: ['▤', 'Sumber'], chat: ['✧', 'Tanya AI'], podcast: ['♫', 'Podcast'], settings: ['⚙', 'Pengaturan'] };
  const tools = new Set(['map', 'quiz', 'cards', 'chat', 'summary', 'plan', 'translate', 'research']);
  const key = 'omnilearn-library-v2';
  let sources = [];
  try { sources = JSON.parse(sessionStorage.getItem(key) || '[]'); if (!Array.isArray(sources)) sources = []; } catch {}
  const shell = document.querySelector('#ruang-belajar > .shell');
  const workspace = shell.querySelector('.workspace');
  const panel = document.createElement('div'); panel.className = 'product-panel'; shell.prepend(panel);
  const sidebar = document.createElement('aside'); sidebar.className = 'product-sidebar';
  sidebar.innerHTML = `<a class="wordmark" href="/">✳ omni<span>learn</span></a><nav aria-label="Ruang belajar">${Object.entries(views).map(([id,[icon,label]]) => `<a href="/dashboard?view=${id}" data-view="${id}" title="${label}"><span aria-hidden="true">${icon}</span>　${label}</a>`).join('')}</nav><div class="sidebar-bottom">Ruang belajar sesi ini<br>Tanpa akun · tanpa sinkronisasi cloud</div>`;
  document.body.prepend(sidebar);
  const closeSidebar=document.createElement('button');closeSidebar.className='menu-product secondary';closeSidebar.textContent='Tutup menu ×';closeSidebar.setAttribute('aria-label','Tutup navigasi');
  closeSidebar.addEventListener('click',()=>{document.body.classList.remove('dashboard-drawer');document.querySelector('#productMenu')?.focus();});sidebar.prepend(closeSidebar);
  const top = document.createElement('header'); top.className = 'product-top';
  top.innerHTML = '<button class="secondary" id="productMenu" aria-label="Buka atau tutup sidebar" aria-expanded="true">☰</button><span>Ruang belajar saya</span><input type="search" id="sourceSearch" aria-label="Cari sumber belajar" placeholder="Cari sumber belajarmu…"><button class="secondary" id="productTheme" aria-label="Ganti tema">◐</button><a class="secondary" href="/dashboard?view=settings" data-view="settings">Sesi tab ini</a>';
  document.body.insertBefore(top, document.querySelector('main'));
  const teaching = document.createElement('select');
  teaching.id = 'teachingMode'; teaching.setAttribute('aria-label','Mode penjelasan tutor');
  teaching.innerHTML = '<option value="standard">Penjelasan standar</option><option value="simple">Lebih sederhana</option><option value="detailed">Lengkap</option><option value="steps">Langkah demi langkah</option><option value="exam">Persiapan ujian</option><option value="analysis">Analisis mendalam</option>';
  workspace.querySelector('.head-actions').append(teaching);
  const persist = () => { try { sessionStorage.setItem(key, JSON.stringify(sources)); } catch { toast('Penyimpanan sesi penuh. Ekspor catatan penting sebelum menutup tab.'); } };
  const html = escapeHtml;
  function capture() {
    if (!materialText || !materialName) return;
    const id = materialId || materialName;
    const existing = sources.find(s => s.id === id);
    if (existing) return;
    sources.unshift({ id, name: materialName, text: materialText, meta: materialMeta || {}, createdAt: Date.now(), notes: '' });
    persist();
  }
  window.OmniProduct = { capture };
  capture();
  function selectSource(id) {
    if (busy || uploadInFlight) return false;
    const source = sources.find(s => s.id === id); if (!source) return false;
    cancelActiveStudyRequest(); materialVersion++; tabViewCache.clear();
    materialText = source.text; materialName = source.name; materialId = source.id; materialMeta = source.meta;
    chatHistory = []; chatMessages.replaceChildren(); lastOutput = ''; lastOutputHtml = '';
    saveSessionState(); renderMaterialBadgeAndSidebar(); return true;
  }
  function sourceCards(query = '') {
    const list = sources.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
    if (!list.length) return '<div class="empty-panel"><div><h3>Mulai dari satu materi.</h3><p>Upload dokumen atau tempel transkrip. Semua alat belajar memakai sumber yang kamu pilih.</p><button class="primary" data-upload>＋ Tambah sumber</button></div><img src="/mascot.svg" width="140" height="140" alt="Maskot OmniLearn"></div>';
    return `<div class="source-grid">${list.map(s => `<article class="source-card"><span>▤ ${s.meta?.extractionMode?.includes('transcript') ? 'Transkrip' : 'Dokumen'}</span><h3>${html(s.name)}</h3><p>${Number(s.meta?.pageCount || 1)} bagian · ${s.text.length.toLocaleString('id-ID')} karakter<br>${new Date(s.createdAt).toLocaleDateString('id-ID')}</p><div class="panel-actions"><button data-source="${html(s.id)}" data-action="chat">Buka</button><button data-source="${html(s.id)}" data-action="summary">Ringkas</button><button data-source="${html(s.id)}" data-action="quiz">Kuis</button><button data-source="${html(s.id)}" data-action="cards">Kartu</button><button data-source="${html(s.id)}" data-action="map">Mindmap</button><button data-source="${html(s.id)}" data-action="delete">Hapus</button></div></article>`).join('')}</div>`;
  }
  function sourcesView(home = false, query = '') {
    panel.innerHTML = `<span class="handwriting">${home ? 'selangkah lebih paham hari ini' : 'semua materi, satu tempat'}</span><h1>${home ? 'Mau belajar apa hari ini?' : 'Pustaka sumbermu'}</h1><p>${home ? 'Lanjutkan materimu, atau mulai dari rasa ingin tahu yang baru.' : 'Dokumen dan transkrip disimpan di sesi tab ini. Pilih sumber untuk menghubungkannya ke seluruh alat belajar.'}</p><div class="panel-actions"><button class="primary" data-upload>＋ Upload dokumen</button><button data-transcript>Tempel transkrip / YouTube</button><button data-explorer>Jelajahi bidang ilmu</button><button data-open="chat">Tanya tanpa dokumen ↗</button></div><div id="sourceResults">${sourceCards(query)}</div>`;
  }
  function notesView() {
    const source = sources.find(s => s.id === materialId);
    panel.innerHTML = `<span class="handwriting">tulis dengan bahasamu sendiri</span><h1>Catatan belajarmu</h1><p>${html(source?.name || 'Catatan bebas dalam sesi ini')}</p><div class="panel-actions"><button data-fill-note>Ambil hasil AI terakhir</button><button data-export-note>Ekspor .txt</button><button data-open="summary">Buat ringkasan AI ↗</button></div><textarea id="noteEditor" aria-label="Editor catatan" placeholder="Tulis atau tempel catatan di sini…"></textarea><p class="note-status" id="noteStatus">Tersimpan dalam sesi tab ini.</p>`;
    const editor = panel.querySelector('#noteEditor');
    try { editor.value = source?.notes || sessionStorage.getItem('omnilearn-free-note') || ''; } catch {}
    editor.addEventListener('input', () => { if (source) { source.notes = editor.value; persist(); } else try { sessionStorage.setItem('omnilearn-free-note', editor.value); } catch { panel.querySelector('#noteStatus').textContent = 'Penyimpanan penuh. Ekspor catatan untuk menyimpannya.'; } });
  }
  function transcriptView() {
    panel.innerHTML = '<h1>Tambahkan transkrip</h1><p>Tempel transkrip milikmu atau caption yang boleh kamu gunakan. Tautan disimpan sebagai referensi; aplikasi tidak mengambil video atau caption otomatis.</p><form class="transcript-form"><label>Judul materi<input name="title" maxlength="180" required></label><label>Tautan YouTube (opsional)<input name="url" type="url" placeholder="https://www.youtube.com/watch?v=…"></label><label>Isi transkrip<textarea name="text" maxlength="50000" required></textarea></label><div class="panel-actions"><button class="primary" type="submit">Simpan sebagai sumber</button><button type="button" data-open="sources">Batal</button></div><p role="status" id="transcriptError"></p></form>';
    panel.querySelector('form').addEventListener('submit', e => {
      e.preventDefault(); const data = new FormData(e.target); const url = data.get('url').trim();
      if (url) { try { const u = new URL(url); if (u.protocol !== 'https:' || !['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname) || u.username || u.password) throw Error(); } catch { panel.querySelector('#transcriptError').textContent = 'Gunakan tautan HTTPS YouTube yang valid.'; return; } }
      const text = data.get('text').trim(); if (!text) return;
      const source = { id: 'transcript-' + crypto.randomUUID(), name: data.get('title').trim(), text, meta: { extractionMode: 'user-transcript', sourceUrl: url, pageCount: 1 }, createdAt: Date.now(), notes: '' };
      sources.unshift(source); persist(); selectSource(source.id); navigate('sources');
    });
  }
  function settingsView() {
    panel.innerHTML = '<h1>Pengaturan sesi</h1><p>Sumber, catatan, dan riwayat disimpan di tab ini. Belum tersedia akun atau penyimpanan cloud.</p><div class="panel-actions"><button data-theme-setting>Ganti tema</button><button data-delete-session>Hapus data sesi</button></div><h3>Privasi dan AI</h3><p>Isi materi dikirim ke Gemini ketika diproses. Periksa fakta penting dan jangan unggah materi yang tidak boleh dibagikan kepada penyedia AI.</p><h3>Format yang tersedia</h3><p>Upload PDF, DOCX, PPTX, TXT hingga 15 MB. Transkrip audio/video dan YouTube dapat ditempel manual. Upload MP3, WAV, MP4, dan MOV tersedia hingga 15 MB. Pengambilan caption YouTube otomatis belum tersedia.</p>';
  }
  function podcastView() {
    panel.innerHTML = '<h1>Dengarkan catatanmu</h1><p>Pemutar ini menggunakan suara text-to-speech perangkat. Bukan audio rekaman atau file podcast yang dapat diunduh. Ketersediaan suara dan bahasa bergantung pada browser.</p><textarea id="spokenText" aria-label="Teks yang dibacakan" placeholder="Tempel catatan atau ambil hasil AI terakhir…"></textarea><div class="panel-actions"><button data-spoken-last>Ambil hasil AI</button><button data-speak>▶ Putar</button><button data-pause>Jeda / lanjut</button><button data-stop>Berhenti</button></div><p id="speechStatus" role="status"></p>';
    panel.querySelector('#spokenText').value = lastOutput || '';
    if (!('speechSynthesis' in window)) { panel.querySelector('#speechStatus').textContent = 'Text-to-speech tidak tersedia di browser ini.'; panel.querySelectorAll('[data-speak],[data-pause],[data-stop]').forEach(b=>b.disabled=true); }
  }
  let current = 'learn';
  function navigate(view, push = true) {
    if (busy || uploadInFlight) { toast('Tunggu proses saat ini selesai.'); return; }
    if (!views[view] && !tools.has(view)) view = 'learn';
    current = view;
    if (push) history.pushState({}, '', `/dashboard?view=${encodeURIComponent(view)}`);
    document.querySelectorAll('[data-view]').forEach(a => { a.classList.toggle('active', a.dataset.view === view || (view === 'summary' && a.dataset.view === 'notes')); if (a.classList.contains('active')) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    document.body.classList.remove('dashboard-drawer');
    workspace.hidden = !tools.has(view); panel.hidden = tools.has(view);
    if (tools.has(view)) { selectTab(view); return; }
    if (view === 'learn' || view === 'sources') sourcesView(view === 'learn');
    if (view === 'notes') notesView();
    if (view === 'settings') settingsView();
    if (view === 'podcast') podcastView();
  }
  let utterance;
  const mapObserver = new MutationObserver(() => {
    const cards = toolOutput.querySelector('.fc-widget');
    if (cards && !cards.querySelector('[data-review-due]')) {
      const review=document.createElement('button');review.className='tool-action';review.dataset.reviewDue='';review.textContent='Ulangi kartu yang jatuh tempo';
      review.addEventListener('click',()=>{
        const source=sources.find(s=>s.id===materialId);const now=Date.now();
        const due=flashcardState.allCards.map((card,index)=>({index,review:source?.reviews?.[JSON.stringify([card.front,card.back])]})).filter(item=>!item.review||item.review.dueAt<=now);
        if(!due.length){toast('Belum ada kartu jatuh tempo. Jadwal tersimpan selama sesi tab.');return;}
        flashcardState.deckOrder=due.sort((a,b)=>(a.review?.dueAt||0)-(b.review?.dueAt||0)).map(item=>item.index);flashcardState.currentIndex=0;flashcardState.reviewHardOnly=false;renderInteractiveFlashcards();
      });cards.append(review);
    }
    const map = toolOutput.querySelector('.cmap-widget');
    if (!map || toolOutput.querySelector('.product-map-tools')) return;
    const controls = document.createElement('div'); controls.className = 'product-map-tools panel-actions';
    controls.innerHTML = '<button data-zoom="-0.1" aria-label="Perkecil mindmap">−</button><button data-zoom="0" aria-label="Reset zoom">100%</button><button data-zoom="0.1" aria-label="Perbesar mindmap">＋</button><button data-export-map>Ekspor JSON</button>';
    const viewport=document.createElement('div');viewport.className='map-viewport';
    map.before(controls,viewport);viewport.append(map);
    let zoom=1,drag=null;
    controls.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-export-map')){
        const url=URL.createObjectURL(new Blob([JSON.stringify(conceptMapState,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='omnilearn-mindmap.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      const delta=Number(button.dataset.zoom);zoom=delta===0?1:Math.min(1.5,Math.max(.5,zoom+delta));map.style.zoom=zoom;controls.querySelector('[data-zoom="0"]').textContent=Math.round(zoom*100)+'%';
    });
    viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button,a,input'))return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);});
    viewport.addEventListener('pointermove',event=>{if(!drag)return;viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;});
    viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
  });
  mapObserver.observe(toolOutput,{childList:true,subtree:true});
  // Capture the current card before the existing assessment handler advances it.
  document.addEventListener('click', async event => {
    const button = event.target.closest('#fcMarkEasyBtn,#fcMarkHardBtn');
    if (!button || !flashcardState?.allCards?.length) return;
    const index = flashcardState.deckOrder[flashcardState.currentIndex];
    const card = flashcardState.allCards[index];
    const source = sources.find(s => s.id === materialId);
    if (!source || !card) return;
    const { scheduleReview } = await import('/review-scheduler.js');
    const id = JSON.stringify([card.front,card.back]);
    source.reviews ||= {};
    source.reviews[id] = scheduleReview(source.reviews[id], button.id === 'fcMarkEasyBtn');
    persist();
    toast(`Ulangi kartu ini pada ${new Date(source.reviews[id].dueAt).toLocaleDateString('id-ID')}. Jadwal tersimpan dalam sesi tab.`);
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('button,a'); if (!button) return;
    if (button.matches('.tab[data-tab]')) {
      current=button.dataset.tab;
      history.replaceState({},'',`/dashboard?view=${encodeURIComponent(current)}`);
      sidebar.querySelectorAll('[data-view]').forEach(a=>{const selected=a.dataset.view===current||(current==='summary'&&a.dataset.view==='notes');a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    }
    if (button.dataset.view) { event.preventDefault(); navigate(button.dataset.view); }
    if (button.dataset.open) { event.preventDefault(); navigate(button.dataset.open); }
    if (button.hasAttribute('data-upload')) { workspace.hidden = false; panel.hidden = true; $('materialFile').click(); }
    if (button.hasAttribute('data-transcript')) transcriptView();
    if (button.hasAttribute('data-explorer')) { const explorer=$('jelajahi');explorer.style.display='block';explorer.scrollIntoView({behavior:'smooth'}); }
    if (button.dataset.source) {
      const id = button.dataset.source;
      if (button.dataset.action === 'delete') { if (busy || uploadInFlight) return; sources = sources.filter(s => s.id !== id); persist(); if (id === materialId) $('clearChat').click(); sourcesView(current === 'learn'); }
      else if (selectSource(id)) navigate(button.dataset.action);
    }
    if (button.id === 'productTheme' || button.hasAttribute('data-theme-setting')) $('themeToggle').click();
    if (button.id === 'productMenu') { if (innerWidth <= 700) document.body.classList.toggle('dashboard-drawer'); else document.body.classList.toggle('dashboard-collapsed'); button.setAttribute('aria-expanded', String(innerWidth <= 700 ? document.body.classList.contains('dashboard-drawer') : !document.body.classList.contains('dashboard-collapsed'))); }
    if (button.hasAttribute('data-fill-note')) { panel.querySelector('#noteEditor').value = lastOutput; panel.querySelector('#noteEditor').dispatchEvent(new Event('input')); }
    if (button.hasAttribute('data-export-note')) { const blob = new Blob([panel.querySelector('#noteEditor').value], {type:'text/plain;charset=utf-8'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download='omnilearn-notes.txt'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
    if (button.hasAttribute('data-delete-session')) { sources = []; sessionStorage.removeItem(key); sessionStorage.removeItem('omnilearn-free-note'); $('clearChat').click(); navigate('learn'); }
    if (button.hasAttribute('data-spoken-last')) panel.querySelector('#spokenText').value = lastOutput || '';
    if (button.hasAttribute('data-speak')) { speechSynthesis.cancel(); utterance = new SpeechSynthesisUtterance(panel.querySelector('#spokenText').value); utterance.lang = $('outputLanguage').value === 'en' ? 'en-US' : 'id-ID'; const status=panel.querySelector('#speechStatus'); utterance.onstart=()=>status.textContent='Sedang dibacakan…'; utterance.onend=()=>status.textContent='Selesai.'; utterance.onerror=()=>status.textContent='Suara belum tersedia. Periksa pengaturan suara perangkat.'; speechSynthesis.speak(utterance); }
    if (button.hasAttribute('data-pause')) { if (speechSynthesis.paused) speechSynthesis.resume(); else speechSynthesis.pause(); }
    if (button.hasAttribute('data-stop')) speechSynthesis.cancel();
  });
  top.querySelector('#sourceSearch').addEventListener('input', e => { if (!['learn','sources'].includes(current)) navigate('sources'); const results=panel.querySelector('#sourceResults'); if (results) results.innerHTML=sourceCards(e.target.value); });
  window.addEventListener('popstate',()=>navigate(new URLSearchParams(location.search).get('view')||'learn',false));
  window.addEventListener('pagehide',()=>window.speechSynthesis?.cancel());
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('dashboard-drawer');});
  const initial = new URLSearchParams(location.search); navigate(initial.get('tool') || initial.get('view') || 'learn',false);
})();
