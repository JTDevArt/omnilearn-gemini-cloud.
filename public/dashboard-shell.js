/* Source-first learning Home and the owner's compact management dashboard. */
/* Dashboard views share the existing source store and learning engines. */
(() => {
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  // Update List loads the versioned public release manifest on demand.
  const HOME_DRAFT_KEY = 'omnilearn-home-draft';
  const action = (label, view) =>
    `<button data-open="${view}">${label}</button>`;
  async function render(host, view, api) {
    const renderId = Symbol();
    host.dashboardRenderId = renderId;
    const state = api.snapshot(),
      sources = state.sources || [],
      profile = state.profile || {};
    const { activitySummary, activityDay } =
      await import("./learning-activity.js");
    const { progressMetrics } = await import("./progress-metrics.js");
    const { lessonTitle } = await import('./lesson-label.js');
    const { dashboardMetrics } = await import('./dashboard-metrics.js');
    if (!host.isConnected || host.dashboardRenderId !== renderId || host.hidden)
      return;
    host.classList.remove("video-learning");
    host.classList.toggle('master-home-mode', view === 'home');
    host.classList.toggle('master-dashboard-mode', view === 'dashboard');
    for (const page of ['subjects','streaks','profile','leaderboard'])
      host.classList.toggle('page-' + page, view === page);
    const summary = activitySummary(state.activity);
    const metrics = progressMetrics(sources, state.activity);
    const dashboard = dashboardMetrics(sources, profile, state.activity);
    const top = document.querySelector(".product-top");
    let badge = top.querySelector(".master-profile");
    if (!badge) {
      badge = document.createElement("a");
      badge.className = "master-profile";
      badge.href = "/dashboard?view=profile";
      badge.dataset.view = "profile";
      top.append(badge);
    }
    badge.textContent = profile.name || 'Profil';
    badge.setAttribute('aria-label', `Profil ${profile.name || 'pelajar'}, level ${summary.level}`);
    const title = {
      home: "Halo, siap belajar hari ini?",
      dashboard: "Ringkasan belajarmu",
      notes: "Catatan",
      subjects: "Mata Pelajaran",
      streaks: "Streak & Aktivitas",
      leaderboard: "Leaderboard",
      profile: "Profil",
      help: "Bantuan",
      pinned: "Disematkan",
      updates: "Update List",
    }[view];
    host.innerHTML = window.OmniHtml.sanitize(`<div class="master-heading">${view === "home" ? '<img src="/mascot.svg" width="106" height="106" fetchpriority="high" alt="Maskot OmniLearn">' : ''}<div><h1>${title}</h1><p>${view === "home" ? "Mulai dengan pertanyaan. Hubungkan materi saat kamu perlu jawaban dari sumber tertentu." : "Belajar dengan sumber dan progres milikmu sendiri."}</p></div></div>`);
    const section = (heading, content) => {
      const node = document.createElement("section");
      node.className = "master-section";
      const title = document.createElement('h2');
      title.textContent = heading;
      node.append(title);
      if (typeof content === 'string') node.append(document.createTextNode(content));
      else if (window.OmniHtml.isSanitizedNode(content)) node.append(content);
      else throw new TypeError('Section content must be text or a sanitized fragment.');
      host.append(node);
      return node;
    };
    const saveStatus = document.createElement('p');
    saveStatus.setAttribute('role', 'status');
    host.append(saveStatus);
    let saving = false;
    async function commit(mutator, onSaved = () => {}) {
      if (saving) return;
      saving = true;
      saveStatus.textContent = 'Menyimpan di perangkat…';
      try {
        await api.updateDashboard(mutator);
        saveStatus.textContent = 'Tersimpan di perangkat.';
        if (host.dashboardRenderId === renderId) await onSaved();
      } catch (error) {
        saveStatus.textContent = 'Belum tersimpan di perangkat. ' + error.message;
      } finally { saving = false; }
    }
    const subjectNames = value => Array.isArray(value)
      ? value.filter(name => typeof name === 'string') : [];
    function library(pinned = false) {
      const node = section(
        pinned ? "Materi disematkan" : "Catatan",
        window.OmniHtml.fragment(`<div class="master-filters"><input type="search" aria-label="Cari catatan" placeholder="Cari catatan…"><select aria-label="Format catatan"><option value="all">Semua</option><option value="document">Dokumen</option><option value="slide">Slide</option><option value="audio">Audio</option><option value="video">Video</option><option value="youtube">YouTube</option></select><select aria-label="Mata pelajaran"><option value="">Semua pelajaran</option>${[...new Set(sources.map((s) => s.subject).filter(Boolean))].map((s) => `<option>${escape(s)}</option>`).join("")}</select><select aria-label="Urutan"><option value="new">Terbaru</option><option value="old">Terlama</option></select><button data-layout="grid" aria-pressed="true">Galeri</button><button data-layout="list" aria-pressed="false">Daftar</button></div><div class="master-library"></div>`),
      );
      const [search, type, subject, sort] =
          node.querySelectorAll("input,select"),
        results = node.querySelector(".master-library");
      const kind = (s) =>
        /youtube/.test(s.meta?.sourceUrl || s.meta?.youtubeUrl || "")
          ? "youtube"
          : /pptx/.test(s.name)
            ? "slide"
            : /video/.test(s.meta?.extractionMode || "")
              ? "video"
              : /audio/.test(s.meta?.extractionMode || "")
              ? "audio"
              : "document";
      function draw() {
        const list = sources
          .filter(
            (s) =>
              (!pinned || s.pinned) &&
              ([lessonTitle(s), s.subject, s.notes, s.text].some(value => String(value || '').toLowerCase().includes(search.value.trim().toLowerCase()))) &&
              (type.value === "all" || kind(s) === type.value) &&
              (!subject.value || s.subject === subject.value),
          )
          .sort(
            (a, b) =>
              (sort.value === "old" ? 1 : -1) * (a.createdAt - b.createdAt),
          );
        results.innerHTML = window.OmniHtml.sanitize(list.length
          ? list
              .map(
                (s) =>
                  `<article class="master-note"><div class="note-identity"><span class="note-subject">${escape(s.subject || 'Tanpa pelajaran')}</span>${s.pinned ? '<span class="note-pin">Disematkan</span>' : ''}</div><h3><button class="note-title" data-source-id="${escape(s.id)}">${escape(lessonTitle(s))}</button></h3><p class="note-excerpt">${escape((s.notes || s.text || '').trim().slice(0, 180)) || 'Belum ada teks untuk dipelajari.'}</p><div class="note-metadata"><span>${escape(({document:'Dokumen',slide:'Slide',audio:'Audio',video:'Video',youtube:'YouTube'})[kind(s)])}</span><span>${Array.isArray(s.journey?.chapters) ? `${s.journey.chapters.length} bab` : 'Bab belum disusun'}</span></div>${s.meta?.uploadState && s.meta.uploadState !== 'completed' ? '<p class="note-warning">Ekstraksi belum selesai. Tinjau sumber asli.</p>' : s.meta?.partialRead || s.meta?.truncated ? '<p class="note-warning">Teks sebagian; periksa sumber asli.</p>' : ''}<div class="note-footer"><time>${escape(new Date(s.lastOpenedAt || s.createdAt).toLocaleDateString('id-ID'))}</time><details class="note-actions"><summary aria-label="Kelola ${escape(lessonTitle(s))}">Kelola</summary><div class="panel-actions"><button data-edit-note="${escape(s.id)}">Edit catatan</button><button data-rename-id="${escape(s.id)}">Ubah judul</button><button data-pin-id="${escape(s.id)}" aria-pressed="${!!s.pinned}">${s.pinned ? 'Lepas pin' : 'Sematkan'}</button><button data-source="${escape(s.id)}" data-action="delete">Hapus</button></div><details><summary>Sumber asli</summary><p>${escape(s.name)}</p></details></details></div></article>`,
              )
              .join("")
          : `<p class="master-empty">${sources.some(s => !pinned || s.pinned) ? 'Tidak ada materi yang cocok. Ubah pencarian atau filter.' : pinned ? 'Belum ada materi disematkan.' : 'Belum ada materi. Unggah sumber pertama untuk mulai belajar.'}</p>`);
        node.querySelector('.library-result-count').textContent = `${list.length} materi`;
      }
      node.classList.add('notes-collection');
      results.insertAdjacentHTML('beforebegin', '<p class="library-result-count" role="status" aria-live="polite"></p>');
      node.oninput = draw;
      node.onchange = draw;
      node.onclick = async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.layout) {
          results.classList.toggle("list", b.dataset.layout === "list");
          node
            .querySelectorAll("[data-layout]")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        }
        if (b.dataset.sourceId) {
          if (api.selectSource(b.dataset.sourceId)) api.navigate(api.getSource(b.dataset.sourceId)?.text?.trim() ? 'journey' : 'sources');
          else saveStatus.textContent='Materi belum dapat dibuka. Tunggu proses yang sedang berjalan.';
        }
        if (b.dataset.editNote) {
          if (api.selectSource(b.dataset.editNote)) api.navigate('note-editor');
          else saveStatus.textContent='Materi belum dapat dibuka. Tunggu proses yang sedang berjalan.';
        }
        if (b.dataset.renameId) {
          const item = api.getSource(b.dataset.renameId);
          if (!item) return;
          const value = prompt('Judul topik materi', item.lessonTitle || (lessonTitle(item) === 'Materi belum diberi judul' ? '' : lessonTitle(item)));
          if (value === null || !value.trim()) return;
          const next = value.trim().slice(0, 180);
          b.disabled = true;
          try {
            await api.renameLesson(item.id, next);
            const local=sources.find(x=>x.id===item.id); if(local)local.lessonTitle=next;
            saveStatus.textContent='Judul tersimpan di perangkat.'; draw();
          } catch(error) {
            saveStatus.textContent='Judul belum tersimpan: '+error.message;
            b.disabled=false;
          }
        }
        if (b.dataset.pinId) {
          commit((s) => {
            const item = s.sources.find((x) => x.id === b.dataset.pinId);
            item.pinned = !item.pinned;
          }, () => {
            const item = sources.find((x) => x.id === b.dataset.pinId);
            item.pinned = api.getSource(item.id).pinned;
            draw();
          });
        }
      };
      draw();
    }
    if (view === "home") {
      const hero=host.querySelector('.master-heading');
      hero.classList.add('home-hero');
      hero.querySelector('h1').textContent=profile.name?profile.name+', mau memahami apa?':'Apa yang ingin kamu pahami?';
      hero.querySelector('p').textContent='Tulis pertanyaan atau bawa materimu. Kita mulai dari sana.';
      const progressLabel=document.createElement('p');progressLabel.className='home-progress-label';
      progressLabel.textContent=metrics.xp+' XP · '+summary.streak+' hari streak';hero.append(progressLabel);
      const chat = document.createElement('section');
      chat.className = 'home-session';
      chat.setAttribute('aria-label', 'Tutor AI');
      chat.innerHTML = `<form class="home-composer master-composer"><label class="home-input-label" for="homeQuestion">Pertanyaan untuk tutor</label><textarea id="homeQuestion" placeholder="Tanya AI apa saja…" required maxlength="12000" rows="3"></textarea><div class="home-composer-actions"><button type="button" data-record-audio>Rekam</button><button type="button" data-upload>Unggah</button><button type="button" data-open="sources">YouTube</button><button class="primary" type="submit">Kirim</button></div><span id="recordStatus" role="status"></span></form><details class="home-secondary-tools"><summary>Tambahkan materi teks</summary><button type="button" data-paste-material>Tempel materi</button></details>`;
      const selectedSource = api.getCurrentSource();
      const chatScope = api.getChatScope();
      chat.classList.toggle('has-source', Boolean(selectedSource) && chatScope === 'document');
      chat.insertAdjacentHTML('afterbegin', `<div class="home-source-context"><div><span>${selectedSource ? 'Sumber percakapan' : 'Percakapan umum'}</span><strong>${selectedSource ? escape(lessonTitle(selectedSource)) : 'Belum memakai materi tersimpan'}</strong></div><button type="button" data-open="notes">${selectedSource ? 'Ganti materi' : 'Pilih materi'}</button>${selectedSource?.journey?.chapters?.length ? '<button type="button" data-open="learn">Baca materi</button>' : ''}</div>`);
      host.append(chat);
      const scopeControl = document.createElement('fieldset'); scopeControl.className = 'chat-scope';
      const scopeLabel = document.createElement('legend'); scopeLabel.textContent = 'Konteks jawaban'; scopeControl.append(scopeLabel);
      for (const [scope, label] of [['general','Tanya umum'],['document','Berdasarkan materi']]) {
        const choice = document.createElement('button'); choice.type = 'button'; choice.dataset.chatScope = scope;
        choice.textContent = label; choice.setAttribute('aria-pressed', String(chatScope === scope));
        choice.disabled = scope === 'document' && !selectedSource; scopeControl.append(choice);
      }
      chat.prepend(scopeControl);
      const contextLabel = chat.querySelector('.home-source-context span');
      contextLabel.textContent = chatScope === 'document' ? 'Sumber percakapan' : 'Percakapan umum';
      const draftInput = chat.querySelector("textarea");
      try { draftInput.value = sessionStorage.getItem(HOME_DRAFT_KEY) || ''; }
      catch { /* Session storage can be unavailable in private mode. */ }
      draftInput.addEventListener('input', () => {
        try { sessionStorage.setItem(HOME_DRAFT_KEY, draftInput.value); } catch {}
      });
      chat.querySelector("form").onsubmit = (e) => {
        e.preventDefault();
        const input = chat.querySelector("textarea");
        const submitted = input.value;
        const button = chat.querySelector('button[type="submit"]');
        button.disabled = true;
        Promise.resolve(api.submitDashboardChat(submitted))
          .then(async result => {
            if (result?.ok !== true) return;
            const {clearSubmittedDraft} = await import('./home-draft.js');
            let cleared = false;
            try { cleared = clearSubmittedDraft(sessionStorage, HOME_DRAFT_KEY, submitted); } catch {}
            if (input.value === submitted && (cleared || input.isConnected)) input.value = '';
          })
          .catch(error => {
            const status = chat.querySelector('[role="status"]') ||
              chat.appendChild(document.createElement('p'));
            status.setAttribute('role','status');
            status.textContent = error?.message || 'Pesan belum terkirim.';
          })
          .finally(() => {
            button.disabled = false;
            if (input.isConnected) input.focus();
          });
      };
      const youtube = chat.querySelector('[data-open="sources"]');
      delete youtube.dataset.open;
      youtube.setAttribute("data-transcript", "");
      chat.querySelector('[data-paste-material]').onclick = () => {
        const dialog = document.createElement('dialog');
        dialog.innerHTML = '<form><h2>Tempel materi</h2><label>Judul<input name="title" required maxlength="200"></label><label>Teks sumber<textarea name="text" required minlength="20" maxlength="50000"></textarea></label><p role="status"></p><div class="panel-actions"><button type="submit">Simpan materi</button><button type="button">Batal</button></div></form>';
        document.body.append(dialog); dialog.showModal();
        dialog.onclose = () => { dialog.remove(); chat.querySelector('[data-paste-material]')?.focus(); };
        dialog.querySelector('[type=button]').onclick = () => dialog.close();
        dialog.querySelector('form').onsubmit = async event => {
          event.preventDefault();
          const button = dialog.querySelector('[type=submit]'); button.disabled = true;
          try {
            if (!dialog.dataset.sourceId) {
              const source = api.addSource({name: dialog.querySelector('[name=title]').value.trim(), text: dialog.querySelector('[name=text]').value.trim(), meta: {extractionMode:'paste'}});
              dialog.dataset.sourceId = source.id;
            }
            await api.persistAsync(); dialog.close(); api.navigate('dashboard');
          } catch (error) { dialog.querySelector('[role=status]').textContent = error.message; button.disabled = false; }
        };
      };
      api.mountDashboardChat(chat);
      const quick=section('Alat belajar',window.OmniHtml.fragment('<div class="home-quick-grid">'+[
        ['sources','Unggah materi','<path d="M12 16V3m-4 4 4-4 4 4M4 14v7h16v-7"/>'],
        ['notes','Catatan','<path d="M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4"/>'],
        ['quiz','Kuis','<path d="M8 5H5v16h14V5h-3M8 3h8v4H8zM8 14l3 3 5-6"/>'],
        ['cards','Flashcard','<rect x="5" y="6" width="15" height="15" rx="2"/><path d="M4 17H3V3h14v1M9 11h7m-7 5h5"/>'],
        ['map','Mindmap','<path d="M9 10 5 6m10 4 4-4M9 14l-4 4m10-4 4 4"/><circle cx="12" cy="12" r="4"/><circle cx="3" cy="4" r="2"/><circle cx="21" cy="4" r="2"/><circle cx="3" cy="20" r="2"/><circle cx="21" cy="20" r="2"/>'],
        ['podcast','Podcast','<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>']
      ].map(([route,label,icon])=>'<button class="home-quick" data-open="'+route+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icon+'</svg>'+label+'</button>').join('')+'</div>'));
      quick.className='home-quick-section';
      const ordered=[...sources].sort((a,b)=>(b.lastOpenedAt||b.createdAt)-(a.lastOpenedAt||a.createdAt));
      const resume=event=>{
        const id=event.target.closest('[data-resume]')?.dataset.resume;
        if(id && api.selectSource(id))api.navigate(api.getSource(id)?.text?.trim()?'journey':'sources');
      };
      const continueHtml=ordered.filter(s=>s.text?.trim()).slice(0,1).map(source=>{
        const chapters=source.journey?.chapters||[],done=chapters.filter(c=>source.completedChapters?.includes(c.id)).length;
        const current=chapters.find(c=>c.id===source.activeChapter);
        return '<article><h3>'+escape(lessonTitle(source))+'</h3><p>'+escape(source.subject||'Tanpa mata pelajaran')+'</p><p>'+escape(current?.title||'Bab belum dipilih')+'</p>'+
          (chapters.length?'<progress aria-label="Progres '+escape(lessonTitle(source))+'" value="'+done+'" max="'+chapters.length+'"></progress><small>'+done+'/'+chapters.length+' bab selesai</small>':'<small>Bab belum disusun</small>')+
          '<button data-resume="'+escape(source.id)+'">Lanjutkan belajar</button></article>';
      }).join('');
      const continuation=section('Lanjutkan belajar',window.OmniHtml.fragment(continueHtml||'<p>Materi yang sudah kamu baca akan muncul di sini.</p><button data-upload>Tambah materi</button>'));
      continuation.classList.add('home-continuation');continuation.onclick=resume;
      const layout=document.createElement('div');layout.className='home-learning-layout';chat.before(layout);layout.append(chat);host.append(continuation);chat.append(quick);
      const collection=section('Pustaka belajarmu',window.OmniHtml.fragment('<div class="home-recent-controls"><input type="search" aria-label="Cari catatan" placeholder="Cari judul atau pelajaran…"><select aria-label="Filter mata pelajaran"><option value="">Semua pelajaran</option>'+[...new Set(sources.map(s=>s.subject).filter(Boolean))].map(subject=>'<option>'+escape(subject)+'</option>').join('')+'</select><div class="home-layout-controls" role="group" aria-label="Tampilan materi"><button type="button" data-home-layout="grid" aria-pressed="true">Galeri</button><button type="button" data-home-layout="list" aria-pressed="false">Daftar</button></div><button data-open="notes">Kelola catatan</button></div><div class="home-recent-rows"></div>'));
      collection.classList.add('home-library');collection.onclick=resume;
      const search=collection.querySelector('input'),rows=collection.querySelector('.home-recent-rows'),subjectFilter=collection.querySelector('select');
      collection.querySelectorAll('[data-home-layout]').forEach(button=>button.onclick=()=>{
        rows.classList.toggle('list',button.dataset.homeLayout==='list');
        collection.querySelectorAll('[data-home-layout]').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));
      });
      const draw=()=>{
        const query=search.value.toLocaleLowerCase('id-ID');
        const matches=ordered.filter(source=>(!subjectFilter.value||source.subject===subjectFilter.value)&&(lessonTitle(source)+' '+(source.subject||'')).toLocaleLowerCase('id-ID').includes(query)).slice(0,8);
        rows.replaceChildren(window.OmniHtml.fragment(matches.length?matches.map(source=>{
          const date=new Date(source.lastOpenedAt||source.createdAt).toLocaleDateString('id-ID');
          const chapters=source.journey?.chapters||[];
          return '<article><div class="home-resource-kind"><span>'+escape(source.subject||'Materi')+'</span><span>'+chapters.length+' bab</span></div><div><h3>'+escape(lessonTitle(source))+'</h3><p>'+escape((source.notes||source.text||'Belum ada teks. Tinjau sumber asli.').trim().slice(0,130))+'</p></div><footer><time>'+escape(date)+'</time><button data-resume="'+escape(source.id)+'">Buka materi</button></footer></article>';
        }).join(''):'<p class="master-empty">'+(query?'Tidak ada materi yang cocok.':'Belum ada materi. Unggah sumber pertamamu untuk mulai belajar.')+'</p>'));
      };
      search.oninput=draw;subjectFilter.onchange=draw;draw();
    }
    if (view === "dashboard") {
      const hour = new Date().getHours();
      host.querySelector('h1').textContent = `Selamat ${hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam'}${profile.name ? ', ' + profile.name : ''}!`;
      host.querySelector('.master-heading p').textContent = 'Lanjutkan perjalanan belajarmu di OmniLearn AI.';
      host.querySelector('.master-heading p').textContent=summary.answered
        ? summary.answered+' jawaban kuis tersimpan'+(summary.accuracy===null?'':' · '+summary.accuracy+'% benar')
        : 'Belum ada jawaban kuis. Progres akan dihitung dari aktivitas belajarmu.';
      const summaryItems=[[dashboard.subjects,'Mata pelajaran','subjects'],[dashboard.notes,'Catatan','notes'],[dashboard.exams,'Ujian selesai','exams'],['Level '+metrics.level,metrics.xp+' XP','streaks']];
      host.insertAdjacentHTML('beforeend',window.OmniHtml.sanitize('<div class="master-stats dashboard-summary">'+summaryItems.map(([value,label,route])=>'<a href="/dashboard?view='+route+'" data-view="'+route+'"><strong>'+escape(value)+'</strong><span>'+escape(label)+'</span></a>').join('')+'</div>'));
      const level = section('Progres level', window.OmniHtml.fragment(`<div class="progress-level"><div><strong>Menuju level ${metrics.level+1}</strong><span>${metrics.nextLevelXp-metrics.xp} XP lagi</span></div><progress max="100" value="${metrics.levelProgress}" aria-label="Progres XP">${metrics.levelProgress}%</progress><div class="dashboard-next-step"><span>${metrics.cardsDue ? `${metrics.cardsDue} flashcard siap diulang` : 'Belum ada flashcard jatuh tempo'}</span>${dashboard.reviewSourceId ? '<button data-review-due>Mulai review</button>' : action('Buka materi','notes')}</div></div>`));
      level.classList.add('dashboard-level');
      level.querySelector('[data-review-due]')?.addEventListener('click', () => {
        if (api.selectSource(dashboard.reviewSourceId)) api.navigate('cards');
      });
      const timer = section('Timer fokus', window.OmniHtml.fragment('<div class="focus-timer"></div>'));
      timer.classList.add('dashboard-focus');
      import('./focus-timer.js').then(({ mountTimer }) => {
        if (timer.isConnected) mountTimer(timer.querySelector('.focus-timer'), api);
      }).catch(() => { timer.querySelector('.focus-timer').textContent = 'Timer belum tersedia.'; });
      const weekMax=Math.max(1,...dashboard.week.map(day=>day.count));
      section('Progres mingguan', window.OmniHtml.fragment(`<div class="dashboard-week">${dashboard.week.map(day=>`<div><div class="dashboard-bar" aria-hidden="true"><span style="--activity:${day.count / weekMax}"></span></div><strong>${day.count}</strong><time datetime="${day.day}">${escape(new Date(day.day+'T00:00:00Z').toLocaleDateString('id-ID',{weekday:'short',timeZone:'UTC'}))}</time></div>`).join('')}</div><p>Jumlah aktivitas per hari. Waktu Jakarta.</p>`)).classList.add('dashboard-weekly');
      section('Aktivitas terbaru', window.OmniHtml.fragment(dashboard.recent.length ? `<ul class="dashboard-activity">${dashboard.recent.map(event=>`<li><span><strong>${escape(({lesson:'Pelajaran',quiz:'Kuis',review:'Flashcard',note:'Catatan'})[event.type] || 'Aktivitas')}</strong><span>${escape(event.topic || 'Belajar')}</span></span><time datetime="${escape(event.day)}">${escape(event.day)}</time></li>`).join('')}</ul>` : '<p class="master-empty">Belum ada aktivitas. Mulai belajar untuk melihat progresmu.</p>')).classList.add('dashboard-recent');
      const recent = [...sources].filter(s => s.text?.trim()).sort((a,b) => (b.lastOpenedAt || b.createdAt) - (a.lastOpenedAt || a.createdAt)).slice(0,4);
      const continuation = section('Lanjutkan belajar', window.OmniHtml.fragment(recent.length ? `<div class="master-library">${recent.map(s => {
        const chapters = s.journey?.chapters || [];
        const done = chapters.filter(c => s.completedChapters?.includes(c.id)).length;
        return `<article class="master-note"><h3>${escape(lessonTitle(s))}</h3><p>${escape(s.subject || 'Tanpa pelajaran')}</p><p>${chapters.length ? `${done}/${chapters.length} bab ditandai selesai` : 'Belum ada jalur belajar'}</p>${chapters.length ? `<progress aria-label="Progres ${escape(lessonTitle(s))}" max="${chapters.length}" value="${done}"></progress>` : ''}<button data-resume="${escape(s.id)}">Lanjutkan belajar</button></article>`;
      }).join('')}</div>` : '<p class="master-empty">Unggah atau tempel materi untuk memulai pelajaran pertama.</p>'));
      continuation.onclick = event => { const id = event.target.closest('[data-resume]')?.dataset.resume; if (id && api.selectSource(id)) api.navigate('journey'); };
      continuation.classList.add('dashboard-continue');
      const studyColumn=document.createElement('div');studyColumn.className='dashboard-study-column';
      const planningColumn=document.createElement('aside');planningColumn.className='dashboard-planning-column';planningColumn.setAttribute('aria-label','Level dan fokus');
      host.append(studyColumn,planningColumn);
      studyColumn.append(host.querySelector('.dashboard-weekly'),continuation,host.querySelector('.dashboard-recent'));
      planningColumn.append(level,timer);
      const video = section(
        "Lanjutkan dari video",
        window.OmniHtml.fragment(`<p>Video, transkrip, dan ide penting dalam satu tempat.</p><div class="panel-actions"><button data-upload>Unggah video</button>${action("YouTube & transkrip", "sources")}</div><div class="master-video"></div>`),
      );
      const videoSource = sources.find(
        (s) =>
          /video/.test(s.meta?.extractionMode || "") ||
          s.meta?.youtubeUrl ||
          /youtube/.test(s.meta?.sourceUrl || ""),
      );
      const youtubeVideo = video.querySelector('[data-open="sources"]');
      delete youtubeVideo.dataset.open;
      youtubeVideo.setAttribute("data-transcript", "");
      if (videoSource && window.OmniVideo)
        window.OmniVideo.render(video.querySelector(".master-video"), {
          ...api,
          getCurrentSource: () => api.getSource(videoSource.id),
          navigate: (route) => {
            api.selectSource(videoSource.id);
            api.navigate(route);
          },
        });
      else
        video.querySelector(".master-video").innerHTML =
          '<p class="master-empty">Belum ada video. Tambahkan video atau transkrip YouTube untuk melanjutkan belajar.</p>';
      const extras = document.createElement('details');
      extras.className = 'dashboard-materials';
      extras.innerHTML = '<summary>Video dan pustaka materi</summary>';
      host.append(extras);
      extras.append(video);
      library();
      extras.append(host.lastElementChild);
    }
    if (view === "pinned") library(true);
    if (view === "notes") {
      host.querySelector('.master-heading p').textContent = 'Materi, bab, dan catatan belajarmu dalam satu koleksi.';
      host.querySelector('.master-heading').insertAdjacentHTML('beforeend', `<div class="panel-actions">${action('Tambah sumber','sources')}${action('Edit catatan aktif','note-editor')}</div>`);
      library();
    }
    if (view === "subjects") {
      const names = [
        ...new Set([
          ...subjectNames(profile.subjects),
          ...sources.map((s) => s.subject).filter(Boolean),
        ]),
      ];
      host.querySelector('.master-heading p').textContent = 'Kelompokkan materi dan lanjutkan belajar per pelajaran.';
      const node = section(
        "Koleksi pelajaran",
        window.OmniHtml.fragment(`<div class="subject-toolbar"><input type="search" class="subject-search" placeholder="Cari mata pelajaran" aria-label="Cari mata pelajaran"><select aria-label="Urutan mata pelajaran" class="subject-sort"><option value="name">Nama A–Z</option><option value="count">Materi terbanyak</option></select><details class="subject-add"><summary>Tambah pelajaran</summary><form><label>Nama mata pelajaran <input name="subject" required maxlength="100" autocomplete="off"></label><button class="primary">Tambah</button></form></details></div><p class="subject-result-count" role="status"></p><div class="subject-items">${names.map((name, i) => {
          const materials = sources.filter(source => source.subject === name);
          return `<article class="master-subject" data-name="${escape(name.toLowerCase())}" data-count="${materials.length}"><span class="subject-book" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15"/></svg></span><h3>${escape(name)}</h3><p>${materials.length} materi tersimpan</p><details class="subject-materials"><summary>Buka materi</summary>${materials.length ? `<ul>${materials.map(source => `<li><button data-subject-source="${escape(source.id)}">${escape(lessonTitle(source))}</button></li>`).join('')}</ul>` : '<p>Belum ada materi di pelajaran ini. Kelompokkan materi melalui panel di bawah.</p>'}</details><details class="subject-edit"><summary>Kelola pelajaran</summary><form data-index="${i}"><label>Ubah nama <input name="subject" value="${escape(name)}" required maxlength="100"></label><button>Simpan</button><button type="button" data-delete="${i}">Hapus pelajaran</button></form><p>Materi tetap tersimpan saat pelajaran dihapus.</p></details></article>`;
        }).join("") || '<div class="subject-empty"><img src="/mascot.svg" width="96" height="96" alt=""><h3>Belum ada mata pelajaran</h3><p>Tambahkan pelajaran pertama, lalu kelompokkan materi yang sudah kamu simpan.</p></div>'}</div><p class="subject-no-match" hidden>Tidak ada pelajaran yang cocok. Ubah pencarianmu.</p>`),
      );
      node.classList.add('subjects-collection');
      function change(old, name) {
        commit((s) => {
          if (s.profile.subjects !== undefined && !Array.isArray(s.profile.subjects))
            s.profile.legacySubjects = s.profile.subjects;
          s.profile.subjects = [
            ...new Set(
              [...subjectNames(s.profile.subjects), ...names]
                .filter((x) => x !== old)
                .concat(name ? [name] : []),
            ),
          ];
          s.sources.forEach((x) => {
            if (x.subject === old) x.subject = name;
          });
        }, () => render(host, view, api));
      }
      node.onsubmit = (e) => {
        e.preventDefault();
        const value = e.target.elements.subject.value.trim();
        if (value)
          change(
            e.target.dataset.index === undefined
              ? null
              : names[e.target.dataset.index],
            value,
          );
      };
      node.onclick = (e) => {
        const open = e.target.closest('[data-subject-source]');
        if (open) {
          if (api.selectSource(open.dataset.subjectSource)) api.navigate(api.getSource(open.dataset.subjectSource)?.text?.trim() ? 'journey' : 'sources');
          else saveStatus.textContent = 'Materi belum dapat dibuka. Tunggu proses saat ini selesai.';
          return;
        }
        const b = e.target.closest("[data-delete]");
        if (b && confirm("Hapus pelajaran ini? Materi tetap disimpan."))
          change(names[b.dataset.delete], "");
      };
      const sortSubjects = () => {
        const query=node.querySelector('.subject-search').value.toLowerCase();
        const byCount=node.querySelector('.subject-sort').value==='count';
        const items=[...node.querySelectorAll('.master-subject')].sort((a,b)=>(byCount?Number(b.dataset.count)-Number(a.dataset.count):0)||a.dataset.name.localeCompare(b.dataset.name,'id'));
        for(const item of items){item.hidden=!item.dataset.name.includes(query);node.querySelector('.subject-items').append(item);}
        const visible = items.filter(item => !item.hidden).length;
        node.querySelector('.subject-result-count').textContent = `${visible} pelajaran`;
        node.querySelector('.subject-no-match').hidden = !items.length || visible > 0;
      };
      node.querySelector('.subject-search').oninput=sortSubjects;node.querySelector('.subject-sort').onchange=sortSubjects;sortSubjects();
      section(
        "Kelompokkan materi",
        window.OmniHtml.fragment(sources
          .map(
            (s) =>
              `<label class="master-assignment">${escape(lessonTitle(s))}<select data-assign="${escape(s.id)}"><option value="">Tanpa pelajaran</option>${names.map((n) => `<option ${s.subject === n ? "selected" : ""}>${escape(n)}</option>`).join("")}</select></label>`,
          )
          .join("") || "<p>Unggah materi terlebih dahulu.</p>"),
      ).onchange = (e) => {
        if (e.target.dataset.assign)
          commit((s) => {
            s.sources.find((x) => x.id === e.target.dataset.assign).subject =
              e.target.value;
          }, () => render(host, view, api));
      };
    }
    if (view === "streaks") {
      host.querySelector('.master-heading p').textContent = 'Konsistensi belajar dari aktivitas yang benar-benar kamu lakukan.';
      const events = state.activity?.events || [];
      host.insertAdjacentHTML('beforeend', `<div class="learning-summary">${[[summary.streak+' hari','Streak saat ini'],[metrics.longestStreak+' hari','Streak terpanjang'],[metrics.xp.toLocaleString('id-ID'),'Total XP'],[metrics.cardsDue,'Flashcard perlu diulang']].map(([value,label])=>`<article><strong>${value}</strong><span>${label}</span></article>`).join('')}</div>`);
      const counts = new Map();
      for (const event of events) counts.set(event.day, (counts.get(event.day) || 0) + 1);
      const calendar = section('Kalender belajar', window.OmniHtml.fragment(`<p>365 hari terakhir. Semua tanggal mengikuti waktu Jakarta.</p><div class="activity-calendar-scroll"><div class="master-calendar" role="img" aria-label="Kalender: ${counts.size} hari memiliki aktivitas dalam riwayat yang tersimpan. Rincian aktivitas tersedia di bawah.">${Array.from({length:365},(_,i)=>{
        const day=activityDay(Date.now()-(364-i)*86400000), count=counts.get(day)||0;
        return `<span class="${count?'studied':''}" title="${day}: ${count} aktivitas" aria-hidden="true"></span>`;
      }).join('')}</div></div><div class="activity-legend"><span><i aria-hidden="true"></i>Belum tercatat</span><span><i class="studied" aria-hidden="true"></i>Ada aktivitas</span></div><p class="activity-footnote">Riwayat dibatasi 1.000 aktivitas terbaru. Warna menunjukkan aktivitas, bukan tingkat penguasaan.</p>`));
      calendar.classList.add('activity-calendar-panel');
      const labels={lesson:'Bab dipelajari',quiz:'Jawaban kuis',review:'Ulangan flashcard',note:'Catatan disimpan'};
      section('Riwayat terbaru', window.OmniHtml.fragment(events.length ? `<ul class="study-history">${events.slice(-20).reverse().map(event=>`<li><div><strong>${escape(labels[event.type]||'Aktivitas belajar')}</strong><p>${escape(event.topic||'Tanpa topik')}</p></div><div><time datetime="${escape(event.day)}">${escape(event.day)}</time><span>${Number(event.points)||0} XP</span></div></li>`).join('')}</ul>` : `<div class="progress-empty"><h3>Mulai dari satu pelajaran</h3><p>Selesaikan bab, jawab kuis, atau ulangi flashcard. Aktivitasmu akan tercatat di sini.</p>${action('Buka materi','notes')}</div>`));
    }
    if (view === "leaderboard") {
      host.querySelector('.master-heading p').textContent = 'Progres pribadi tetap milikmu. Peringkat bersama belum tersedia.';
      section('Belajar bersama', window.OmniHtml.fragment(`<div class="ranking-empty"><svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 7h16v12c0 8-16 8-16 0V7Zm0 4H8v6c0 6 8 7 8 7m16-13h8v6c0 6-8 7-8 7M24 25v12m-8 4h16"/></svg><h2>Ranking belum tersedia</h2><p>Belum ada peringkat lintas pengguna yang terhubung. XP dan aktivitas pribadimu tetap tersimpan, tanpa membagikannya ke pengguna lain.</p><div class="panel-actions">${action('Lihat progresku','streaks')}${action('Lanjutkan belajar','notes')}</div></div>`));
    }
    if (view === "profile") {
      host.querySelector('.master-heading p').textContent = 'Kelola identitas, preferensi, dan data belajarmu.';
      section('Profil pelajar', window.OmniHtml.fragment(`<div class="profile-person"><div class="profile-avatar" aria-hidden="true">${escape((profile.name||'O').trim().charAt(0).toLocaleUpperCase('id-ID'))}</div><div><h2>${escape(profile.name||'Pelajar OmniLearn')}</h2><p>Level ${metrics.level} · Progres tersimpan di perangkat ini</p></div><button data-open="account">Kelola akun</button></div><div class="learning-summary">${[[metrics.xp.toLocaleString('id-ID'),'Total XP'],[summary.streak+' hari','Streak'],[sources.filter(s=>typeof s.notes==='string'&&s.notes.trim()).length,'Catatan terisi'],[dashboard.exams,'Ujian selesai']].map(([value,label])=>`<article><strong>${value}</strong><span>${label}</span></article>`).join('')}</div><div class="profile-level"><span>Level ${metrics.level}</span><progress max="100" value="${metrics.levelProgress}" aria-label="Progres XP">${metrics.levelProgress}%</progress><span>${metrics.nextLevelXp-metrics.xp} XP ke level berikutnya</span></div>`)).classList.add('profile-overview');
      const preferences = section(
        "Preferensi pribadi",
        window.OmniHtml.fragment(`<form><label>Nama tampilan <input name="learnerName" maxlength="50" value="${escape(profile.name || "")}" autocomplete="nickname"></label><label>Bahasa jawaban <select name="language"><option value="auto">Otomatis</option><option value="id">Indonesia</option><option value="en">English</option></select></label><div class="panel-actions"><button class="primary">Simpan preferensi</button><button type="button" data-open="settings">Tampilan &amp; preferensi AI</button></div><p role="status"></p></form>`),
      );
      preferences.querySelector("select").value = profile.language || "auto";
      preferences.onsubmit = (e) => {
        e.preventDefault();
        commit((s) => {
          s.profile.name = e.target.elements.learnerName.value.trim();
          s.profile.language = e.target.elements.language.value;
        }, () => {
          e.target.querySelector('[role=status]').textContent = 'Preferensi tersimpan di pustaka perangkat.';
          const name = api.snapshot().profile.name || 'Pelajar OmniLearn';
          host.querySelector('.profile-person h2').textContent = name;
          host.querySelector('.profile-avatar').textContent = name.trim().charAt(0).toLocaleUpperCase('id-ID');
          badge.textContent = name;
          badge.setAttribute('aria-label', `Profil ${name}, level ${metrics.level}`);
        });
        const language = document.querySelector("#outputLanguage");
        if (language) language.value = e.target.elements.language.value;
        e.target.querySelector('[role=status]').textContent = '';
      };
      const identity = section("Identitas akun", window.OmniHtml.fragment("<p>Memeriksa akun…</p>"));
      const usage = section("Penggunaan nyata",
        window.OmniHtml.fragment(`<div class="profile-usage-grid">
          <article><strong>${sources.length}</strong><span>Materi tersimpan</span></article>
          <article><strong>${sources.filter(s => typeof s.notes === 'string' && s.notes.trim()).length}</strong><span>Catatan terisi</span></article>
          <article><strong>${sources.filter(s => s.hasOriginal).length}</strong><span>File asli tersimpan</span></article>
          <article><strong>${metrics.cardsReviewed}</strong><span>Ulangan flashcard</span></article>
          <article><strong>${summary.answered}</strong><span>Jawaban kuis tercatat</span></article>
          <article><strong>${metrics.xp}</strong><span>XP tercatat</span></article>
        </div><p>Hanya aktivitas yang tercatat di perangkat ini. Batas langganan atau kuota API tidak ditampilkan karena belum diverifikasi.</p>`));
      host.insertBefore(usage, identity);
      const profileSections = [preferences, usage, identity];
      const profileTabs = document.createElement('div');
      profileTabs.className = 'profile-tabs';
      profileTabs.setAttribute('role', 'tablist');
      profileTabs.setAttribute('aria-label', 'Bagian profil');
      const tabButtons = ['Preferensi', 'Penggunaan', 'Akun'].map((label, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'profile-tab-' + index;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'profile-panel-' + index);
        button.textContent = label;
        profileTabs.append(button);
        const section = profileSections[index];
        section.id = 'profile-panel-' + index;
        section.setAttribute('role', 'tabpanel');
        section.setAttribute('aria-labelledby', button.id);
        return button;
      });
      const activateProfileTab = index => {
        profileSections.forEach((panel, i) => { panel.hidden = i !== index; });
        tabButtons.forEach((button, i) => {
          button.setAttribute('aria-selected', String(i === index));
          button.tabIndex = i === index ? 0 : -1;
        });
      };
      tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => activateProfileTab(index));
        button.addEventListener('keydown', e => {
          const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabButtons.length - 1 :
            delta ? (index + delta + tabButtons.length) % tabButtons.length : null;
          if (next === null) return;
          e.preventDefault();
          activateProfileTab(next);
          tabButtons[next].focus();
        });
      });
      host.insertBefore(profileTabs, preferences);
      activateProfileTab(0);
      try {
        const response = await fetch("/api/account/me");
        const result = await response.json();
        if (identity.isConnected)
          identity.textContent = response.ok
            ? `${result.user.displayName || ""} · ${result.user.email || ""}`
            : "Belum masuk ke akun. Preferensi dan pustaka perangkat tetap tersedia.";
      } catch {
        if (identity.isConnected)
          identity.textContent = "Identitas akun belum dapat diperiksa.";
      }
      if (identity.isConnected) {
        const links = document.createElement('div');
        links.className = 'panel-actions';
        const accountButton = document.createElement('button');
        accountButton.type = 'button';
        accountButton.textContent = 'Akun & sinkronisasi';
        accountButton.onclick = () => api.navigate('account');
        const backupButton = document.createElement('button');
        backupButton.type = 'button';
        backupButton.textContent = 'Cadangan & sumber';
        backupButton.onclick = () => api.navigate('sources');
        links.append(accountButton, backupButton);
        identity.append(links);
      }
    }
    if (view === "help") {
      section(
        "Format yang didukung",
        window.OmniHtml.fragment("<p>PDF, DOCX, PPTX, XLSX, TXT, gambar, MP3, WAV, M4A, MP4, MOV, WEBM serta subtitle SRT/VTT. Batas berkas dan format aktual tercantum pada diagnostik kemampuan server di bawah.</p>"),
      );
      section(
        "Mulai belajar",
        window.OmniHtml.fragment("<ol><li>Unggah materi melalui Dashboard.</li><li>Buka sumber dan periksa hasil ekstraksi.</li><li>Pilih ringkasan, tutor, kuis, atau flashcard.</li><li>Cadangkan pustaka melalui halaman Sumber.</li></ol><details><summary>Mengapa AI belum menjawab?</summary><p>Ekstraksi, OCR, dan analisis AI adalah tahap terpisah. Periksa status, tunggu batas retry jika kuota habis, lalu coba ulang melalui Permintaan tersimpan. Materi yang telah tersimpan tetap tersedia.</p></details>" +
          action("Permintaan tersimpan", "recovery")),
      );
      const diagnostic = section(
        "Diagnostik koneksi",
        window.OmniHtml.fragment('<p role="status">Memeriksa server…</p>'),
      );
      try {
        const data = await Promise.all(
          ["/api/health", "/api/provider/status", "/api/capabilities"].map(
            async (url) => {
              const response = await fetch(url);
              if (!response.ok) throw Error(`HTTP ${response.status}`);
              return response.json();
            },
          ),
        );
        if (diagnostic.isConnected) {
          diagnostic.replaceChildren();
          const h = document.createElement("h2");
          h.textContent = "Diagnostik aman · versi pengembangan";
          const pre = document.createElement("pre");
          pre.textContent = JSON.stringify(data, null, 2);
          diagnostic.append(h, pre);
        }
      } catch (error) {
        diagnostic.textContent = error.message;
      }
    }
    if (view === "updates") {
      const updates = section("Riwayat versi", window.OmniHtml.fragment('<p role="status">Memuat riwayat perubahan…</p>'));
      try {
        const [module, response] = await Promise.all([
          import('./release-history.js'),
          fetch('/data/releases.json', { cache: 'no-store' })
        ]);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const manifest = module.validateReleaseManifest(await response.json());
        if (host.isConnected && host.dashboardRenderId === renderId)
          module.mountReleaseHistory(updates, manifest);
      } catch (error) {
        if (host.isConnected && host.dashboardRenderId === renderId) {
          updates.replaceChildren();
          const message = document.createElement('p');
          message.setAttribute('role', 'alert');
          message.textContent = 'Riwayat versi belum bisa dimuat: ' + error.message;
          updates.append(message);
        }
      }
    }
    if (host.isConnected && host.dashboardRenderId === renderId) {
      const { enterView } = await import('./ui-motion.js');
      if (host.dashboardRenderId === renderId) enterView(host);
    }
  }
  window.OmniDashboard = { render };
})();
