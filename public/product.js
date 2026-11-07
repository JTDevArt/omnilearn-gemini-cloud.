/* Product navigation adapts the existing learning engine; no duplicate AI clients. */
(async () => {
  document.body.classList.add('product-dashboard');
  const views = {
    dashboard: ['⌂', 'Dashboard'],
    subjects: ['▤', 'Mata Pelajaran'],
    streaks: ['◴', 'Streaks'],
    leaderboard: ['♜', 'Leaderboard'],
    profile: ['♙', 'Profil'],
    help: ['?', 'Bantuan'],
    pinned: ['◇', 'Disematkan'],
    updates: ['✦', 'Patch Updates'],
    learn: ['⌂', 'Belajar'],
    journey: ['↝', 'Jalur belajar'],
    exams: ['◷', 'Simulasi ujian'],
    notes: ['☷', 'Catatan'],
    map: ['⌘', 'Mindmap'],
    quiz: ['✓', 'Kuis'],
    cards: ['▣', 'Flashcard'],
    sources: ['▤', 'Sumber'],
    research: ['⌕', 'Asisten riset'],
    plan: ['▦', 'Rencana belajar'],
    translate: ['文', 'Terjemahan'],
    chat: ['✧', 'Tanya AI'],
    podcast: ['♫', 'Podcast'],
    video: ['▷', 'Video learning'],
    sticky: ['▧', 'Tempel'],
    settings: ['⚙', 'Pengaturan'],
    account: ['♙', 'Akun & cloud'],
    recovery: ['↻', 'Permintaan tersimpan'],
  };
  const tools = new Set([
    'map',
    'quiz',
    'cards',
    'chat',
    'summary',
    'plan',
    'translate',
    'research',
  ]);
  const key = 'omnilearn-library-v2';
  let sources = [];
  let freeChat = [];
  try {
    freeChat = JSON.parse(
      sessionStorage.getItem('omnilearn-free-chat') || '[]'
    );
    if (!Array.isArray(freeChat)) freeChat = [];
  } catch {}
  let profile = {},
    activity = { events: [] },
    stickyNotes = [];
  try {
    profile = JSON.parse(sessionStorage.getItem('omnilearn-profile') || '{}');
    activity = JSON.parse(
      sessionStorage.getItem('omnilearn-activity') || '{"events":[]}'
    );
    stickyNotes = JSON.parse(
      sessionStorage.getItem('omnilearn-sticky') || '[]'
    );
  } catch {}
  const activityAPI = import('/learning-activity.js');
  try {
    sources = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!Array.isArray(sources)) sources = [];
    sources = sources.filter(
      (source) =>
        source &&
        typeof source.id === 'string' &&
        typeof source.name === 'string' &&
        typeof source.text === 'string'
    );
  } catch {}
  if (!profile || typeof profile !== 'object' || Array.isArray(profile))
    profile = {};
  if (!Array.isArray(activity?.events)) activity = { events: [] };
  if (!Array.isArray(stickyNotes)) stickyNotes = [];
  let durableAvailable = false;
  let pendingTasks = [];
  let libraryEpoch = 0;
  try {
    let owner = 'guest';
    try {
      const accountConfig = await safeRequestJson(
        '/api/account/status',
        {},
        { timeoutMs: 10000, stageContext: 'account-config' }
      );
      if (accountConfig.configured) {
        const account = await safeRequestJson(
          '/api/account/me',
          {},
          { timeoutMs: 20000, stageContext: 'account-session' }
        );
        owner = account.user.uid;
      }
    } catch {}
    const previousOwner =
      sessionStorage.getItem('omnilearn-account-owner') || 'guest';
    if (previousOwner !== owner) {
      sources = [];
      profile = {};
      activity = { events: [] };
      stickyNotes = [];
      freeChat = [];
      materialText = '';
      materialName = '';
      materialId = '';
      materialMeta = null;
      chatHistory = [];
      chatMessages.replaceChildren();
      for (const name of [
        key,
        SESSION_MATERIAL_KEY,
        SESSION_CHAT_KEY,
        'omnilearn-profile',
        'omnilearn-activity',
        'omnilearn-sticky',
        'omnilearn-free-chat',
        'omnilearn-free-note',
        'omnilearn-library-epoch',
        'omnilearn-tool-options',
      ])
        sessionStorage.removeItem(name);
      window.OmniProductSourceChange?.();
      renderMaterialBadgeAndSidebar();
    }
    sessionStorage.setItem('omnilearn-account-owner', owner);
    await window.OmniLocalLibrary.setNamespace(owner);
    const saved = await window.OmniLocalLibrary.load();
    if (saved) {
      libraryEpoch = Number(saved.clearedAt) || 0;
      sources = saved.sources || [];
      pendingTasks = Array.isArray(saved.pendingTasks)
        ? saved.pendingTasks
        : [];
      profile = saved.profile || profile;
      activity = saved.activity || activity;
      stickyNotes = saved.stickyNotes || stickyNotes;
      freeChat = saved.freeChat || freeChat;
      if (typeof saved.freeNote === 'string')
        sessionStorage.setItem('omnilearn-free-note', saved.freeNote);
      if (
        libraryEpoch >
        Number(sessionStorage.getItem('omnilearn-library-epoch') || 0)
      ) {
        materialText = '';
        materialName = '';
        materialId = '';
        materialMeta = null;
        chatHistory = [];
        sessionStorage.removeItem(SESSION_MATERIAL_KEY);
        sessionStorage.removeItem(SESSION_CHAT_KEY);
        chatMessages.replaceChildren();
        window.OmniProductSourceChange?.();
        renderMaterialBadgeAndSidebar();
      }
    }
    sessionStorage.setItem('omnilearn-library-epoch', String(libraryEpoch));
    durableAvailable = true;
  } catch (error) {
    toast(
      'Penyimpanan perangkat tidak tersedia; data sementara di tab. ' +
        error.message
    );
  }
  for (const source of sources) {
    source.version ||= 1;
    if (
      !source.analysisSchema &&
      source.generated &&
      Object.keys(source.generated).length
    ) {
      (source.archivedArtifacts ||= []).push({
        reason: 'before-shared-analysis',
        generated: source.generated,
      });
      source.generated = {};
    }
    source.analysisSchema = 'forge-1';
  }
  let durableWrite = Promise.resolve();
  const snapshot = () => ({
    schemaVersion: 1,
    clearedAt: libraryEpoch,
    pendingTasks,
    sources,
    profile,
    activity,
    stickyNotes,
    freeChat,
    freeNote: sessionStorage.getItem('omnilearn-free-note') || '',
  });
  function saveDurable() {
    if (!durableAvailable)
      return Promise.reject(new Error('Penyimpanan perangkat tidak tersedia.'));
    durableWrite = window.OmniLocalLibrary.save(snapshot());
    durableWrite.catch((error) => toast(error.message));
    return durableWrite;
  }
  const shell = document.querySelector('#ruang-belajar > .shell');
  const workspace = shell.querySelector('.workspace');
  const panel = document.createElement('div');
  const chatHome = document.createComment('Conversation workspace anchor');
  const feedbackHome = document.createComment('Diagnostics workspace anchor');
  chatMessages.before(chatHome);
  chatFeedback.before(feedbackHome);
  panel.className = 'product-panel';
  shell.prepend(panel);
  const sidebar = document.createElement('aside');
  sidebar.className = 'product-sidebar';
  sidebar.innerHTML = `<a class="wordmark" href="/">✳ omni<span>learn</span></a><nav aria-label="Menu utama">${Object.entries(
    Object.fromEntries(['dashboard','exams','subjects','streaks','leaderboard','profile','help','pinned','updates'].map(id => [id, views[id]]))
  )
    .map(
      ([id, [icon, label]]) =>
        `<a href="/dashboard?view=${id}" data-view="${id}" title="${label}"><span aria-hidden="true">${icon}</span>　${label}</a>`
    )
    .join(
      ''
    )}</nav><div class="sidebar-bottom"><button id="shellTheme">◐ Tema</button><button id="shellLayout">Coba tampilan baru</button><button id="shellLogout">Keluar</button><p>Pustaka pribadi · OmniLearn v1.01</p></div>`;
  document.body.prepend(sidebar);
  const closeSidebar = document.createElement('button');
  closeSidebar.className = 'menu-product secondary';
  closeSidebar.textContent = 'Tutup menu ×';
  closeSidebar.setAttribute('aria-label', 'Tutup navigasi');
  closeSidebar.addEventListener('click', () => {
    document.body.classList.remove('dashboard-drawer');
    document.querySelector('#productMenu')?.focus();
  });
  sidebar.prepend(closeSidebar);
  const top = document.createElement('header');
  top.className = 'product-top';
  top.innerHTML =
    '<button class="secondary" id="productMenu" aria-label="Buka atau tutup sidebar" aria-expanded="true">☰</button><span>Ruang belajar saya</span><input type="search" id="sourceSearch" aria-label="Cari sumber belajar" placeholder="Cari sumber belajarmu…"><button class="secondary" id="productTheme" aria-label="Ganti tema">◐</button><a class="secondary" href="/dashboard?view=settings" data-view="settings">Perangkat ini</a>';
  document.body.insertBefore(top, document.querySelector('main'));
  sidebar.querySelector('#shellTheme').onclick = () => window.OmniTheme?.cycle();
  sidebar.querySelector('#shellLayout').onclick = () => navigate(current === 'learn' ? 'dashboard' : 'learn');
  sidebar.querySelector('#shellLogout').onclick = async () => {
    try {
      await safeRequestJson('/api/account/logout', {method:'POST'}, {stageContext:'logout'});
      location.reload();
    } catch (error) { toast(error.message); }
  };
  const materialNav = document.createElement('nav');
  materialNav.className = 'material-navigation';
  materialNav.setAttribute('aria-label', 'Workspace materi');
  materialNav.innerHTML = ['map','quiz','cards','sources','chat','podcast','sticky'].map(id => `<a href="/dashboard?view=${id}" data-view="${id}">${views[id][1]}</a>`).join('');
  shell.prepend(materialNav);
  window.OmniTheme?.refreshControls?.();
  safeRequestJson(
    '/api/capabilities',
    {},
    { timeoutMs: 10000, stageContext: 'capabilities' }
  )
    .then((capabilities) => {
      window.OmniCapabilities = capabilities;
      $('materialFile').accept = capabilities.extensions.join(',');
    })
    .catch(() => {});
  const teaching = document.createElement('select');
  teaching.id = 'teachingMode';
  teaching.setAttribute('aria-label', 'Mode penjelasan tutor');
  teaching.innerHTML =
    '<option value="standard">Penjelasan standar</option><option value="simple">Lebih sederhana</option><option value="detailed">Lengkap</option><option value="steps">Langkah demi langkah</option><option value="analogy">Analogi sehari-hari</option><option value="practice">Contoh soal</option><option value="academic">Akademis</option><option value="core">Ringkasan inti</option><option value="interactive">Tanya jawab</option><option value="exam">Persiapan ujian</option><option value="analysis">Analisis mendalam</option>';
  if (profile.teachingMode) teaching.value = profile.teachingMode;
  workspace.querySelector('.head-actions').append(teaching);
  const quizType = document.createElement('select');
  quizType.id = 'quizQuestionType';
  quizType.setAttribute('aria-label', 'Jenis soal');
  quizType.innerHTML =
    '<option value="multiple">Pilihan ganda</option><option value="truefalse">Benar / salah</option><option value="blanks">Isian singkat</option><option value="ordering">Urutan</option><option value="matching">Pasangan</option>';
  document.querySelector('#quizOptions').prepend(quizType);
  const optionIds = [
    'summaryStyle',
    'quizDifficulty',
    'quizCount',
    'cardsCount',
    'outputLanguage',
    'targetLanguage',
    'teachingMode',
    'quizQuestionType',
  ];
  try {
    const saved = JSON.parse(
      sessionStorage.getItem('omnilearn-tool-options') || '{}'
    );
    for (const id of optionIds) {
      const control = $(id);
      if (
        control &&
        [...control.options].some((option) => option.value === saved[id])
      )
        control.value = saved[id];
    }
  } catch {}
  if (profile.language && [...$('outputLanguage').options].some(option => option.value === profile.language))
    $('outputLanguage').value = profile.language;
  document.addEventListener('change', (event) => {
    if (!optionIds.includes(event.target.id)) return;
    const values = {};
    for (const id of optionIds) if ($(id)) values[id] = $(id).value;
    try {
      sessionStorage.setItem('omnilearn-tool-options', JSON.stringify(values));
    } catch {
      toast('Pilihan alat belum tersimpan.');
    }
  });
  const persist = () => {
    if (durableAvailable) saveDurable();
    window.OmniAccounts?.changed();
    try {
      sessionStorage.setItem(key, JSON.stringify(sources));
      return true;
    } catch {
      if (durableAvailable) return true;
      toast(
        'Penyimpanan sesi penuh. Ekspor catatan penting sebelum menutup tab.'
      );
      return false;
    }
  };
  const html = escapeHtml;
  function capture() {
    if (!materialText || !materialName) {
      freeChat = chatHistory.slice(-24);
      try {
        sessionStorage.setItem('omnilearn-free-chat', JSON.stringify(freeChat));
      } catch {}
      persist();
      return;
    }
    const id = materialId || (materialId = crypto.randomUUID());
    const existing = sources.find((s) => s.id === id);
    if (existing) {
      existing.chat = chatHistory.slice(-24);
      persist();
      return;
    }
    sources.unshift({
      id,
      name: materialName,
      text: materialText,
      meta: materialMeta || {},
      createdAt: Date.now(),
      version: 1,
      analysisSchema: 'forge-1',
      notes: '',
      subject: profile.subject || '',
    });
    persist();
  }
  function sourceRequest() {
    const source = sources.find((source) => source.id === materialId);
    return {
      sourceVersion: source?.version || 1,
      sourcePartial: Boolean(
        source?.meta?.truncated || source?.meta?.partialRead
      ),
      acceptPartial: source?.acceptPartial === true,
    };
  }
  async function ensureAnalysis(signal) {
    const source = sources.find((source) => source.id === materialId);
    if (!source) throw new Error('Pilih materi terlebih dahulu.');
    const version = source.version;
    const language = $('outputLanguage').value;
    // The server may have restarted since the local blueprint was saved. Always
    // confirm its hash/version in the server cache before starting a second task.
    chatFeedback.textContent =
      'Menganalisis materi dan memeriksa bukti sebelum membuat hasil…';
    const result = await safeRequestJson(
      '/api/source/analyze',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          materialId: source.id,
          material: source.text,
          outputLanguage: language,
          ...sourceRequest(),
        }),
      },
      {
        timeoutMs: 65000,
        stageContext: 'source-analysis',
        externalSignal: signal,
      }
    );
    if (source.version !== version || source.id !== materialId)
      throw new Error(
        'Materi berubah selama analisis. Ulangi dari sumber aktif.'
      );
    source.blueprint = result.blueprint;
    source.blueprintLanguage = language;
    persist();
    return result.blueprint;
  }
  async function record(event) {
    const { recordActivity } = await activityAPI;
    activity = recordActivity(activity, event);
    persist();
    try {
      sessionStorage.setItem('omnilearn-activity', JSON.stringify(activity));
    } catch {
      toast('Statistik sesi belum bisa disimpan.');
    }
  }
  let freeDeck = [],
    freeReviews = {};
  function renderDeck(cards) {
    if (!window.OmniWorkbench) return false;
    const source = sources.find((s) => s.id === materialId);
    window.OmniWorkbench.installFlashcards(toolOutput, {
      cards: source?.deck || (freeDeck.length && freeDeck) || cards,
      reviews: source?.reviews || freeReviews,
      onCardsChange(updated) {
        if (source) source.deck = updated;
        else freeDeck = updated;
        persist();
      },
      onReview(updated, meta) {
        if (source) {
          source.reviews = updated;
          persist();
        } else freeReviews = updated;
        if (meta?.type === 'grade')
          record({
            id: `review:${materialId}:${meta.review.reviewedAt}:${meta.card.front}`,
            type: 'review',
            topic: materialName,
          });
      },
    });
    return true;
  }
  window.OmniProduct = {
    getSource: id => sources.find(source => source.id === id),
    openTranscript: () => transcriptView(),
    selectSource,
    updateDashboard(mutator) { mutator({sources, profile}); persist(); },
    openRecorder(button) { return recordAudio(button); },
    mountDashboardChat(host) { host.append(chatMessages, chatFeedback); },
    submitDashboardChat(message) {
      if (isConceptMapCommand(message)) navigate('chat');
      chatInput.value = message;
      return sendChat();
    },
    capture,
    record,
    persist,
    renderDeck,
    navigate,
    snapshot: () => structuredClone(snapshot()),
    pendingTasks: () => structuredClone(pendingTasks),
    removeTask(id) {
      pendingTasks = pendingTasks.filter((task) => task.id !== id);
      persist();
    },
    deferTask(route, body, error) {
      if (
        error?.isCancelled ||
        error?.status === 400 ||
        error?.status === 413 ||
        error?.status === 422 ||
        !['/api/chat', '/api/study'].includes(route)
      )
        return;
      const clean = { ...body };
      delete clean.material;
      delete clean.history;
      delete clean.learningContext;
      const key = JSON.stringify([route, clean]);
      if (!pendingTasks.some((task) => task.key === key)) {
        pendingTasks.push({
          id: crypto.randomUUID(),
          key,
          route,
          body: clean,
          createdAt: Date.now(),
          error: String(error?.message || 'Permintaan belum selesai').slice(
            0,
            1000
          ),
        });
        persist();
      }
    },
    async retryTask(id) {
      const task = pendingTasks.find((task) => task.id === id);
      if (!task) return;
      const source = sources.find((s) => s.id === task.body.materialId);
      if (
        task.body.materialId &&
        (!source || source.version !== (task.body.sourceVersion || 1))
      )
        throw new Error(
          'Versi sumber berubah. Pulihkan versi yang sesuai atau buat permintaan baru.'
        );
      if (source) selectSource(source.id);
      else {
        capture();
        materialText = '';
        materialName = '';
        materialId = '';
        materialMeta = null;
        chatHistory = freeChat;
        chatMessages.replaceChildren();
        chatHistory.forEach((m) => addMessage(m.role, m.content));
        window.OmniProductSourceChange?.();
        saveSessionState();
      }
      for (const [field, id] of [
        ['summaryStyle', 'summaryStyle'],
        ['difficulty', 'quizDifficulty'],
        ['questionType', 'quizQuestionType'],
        ['outputLanguage', 'outputLanguage'],
        ['targetLanguage', 'targetLanguage'],
      ])
        if (task.body[field] && $(id)) $(id).value = task.body[field];
      if (task.body.count)
        $(task.body.task === 'cards' ? 'cardsCount' : 'quizCount').value =
          task.body.count;
      pendingTasks = pendingTasks.filter((t) => t.id !== id);
      persist();
      chatInput.value = task.body.message || task.body.topic || '';
      if (task.route === '/api/chat') {
        navigate('chat');
        await sendChat();
      } else {
        navigate(task.body.task);
      }
    },
    addSource(input) {
      capture();
      const source = {
        id: crypto.randomUUID(),
        name: input.name,
        text: input.text,
        meta: input.meta || {},
        version: 1,
        createdAt: Date.now(),
        notes: '',
        subject: profile.subject || '',
        analysisSchema: 'forge-1',
      };
      sources.unshift(source);
      selectSource(source.id);
      persist();
      return source;
    },
    async importLibrary(next, files) {
      if (busy || uploadInFlight)
        throw new Error('Tunggu proses saat ini sebelum mengubah pustaka.');
      setBusy(true);
      try {
        await window.OmniLocalLibrary.importData(
          { ...next, clearedAt: libraryEpoch },
          files
        );
      } finally {
        setBusy(false);
      }
      sources = next.sources;
      profile = next.profile || profile;
      activity = next.activity || activity;
      stickyNotes = next.stickyNotes || stickyNotes;
      freeChat = next.freeChat || [];
      pendingTasks = next.pendingTasks || [];
      if (typeof next.freeNote === 'string')
        sessionStorage.setItem('omnilearn-free-note', next.freeNote);
      if (sources.some((s) => s.id === materialId))
        selectSource(materialId, true);
      else {
        materialText = '';
        materialName = '';
        materialId = '';
        materialMeta = null;
        chatHistory = freeChat;
        chatMessages.replaceChildren();
        for (const message of chatHistory)
          addMessage(message.role, message.content);
        window.OmniProductSourceChange?.();
        saveSessionState();
        renderMaterialBadgeAndSidebar();
        persist();
      }
      sourcesView(current === 'learn');
    },
    canApplyCloud: () =>
      ['learn', 'sources'].includes(current) &&
      !busy &&
      !uploadInFlight &&
      !document.querySelector('dialog[open]') &&
      !document.activeElement?.matches('input,textarea,select'),
    saveMapGraph(graph) {
      if (!conceptMapState.originalGenerated) {
        const { originalGenerated, editorGraph, ...original } = conceptMapState;
        conceptMapState.originalGenerated = structuredClone(original);
      }
      conceptMapState.editorGraph = graph;
      const root = graph.nodes.find((n) => n.id === graph.rootId);
      conceptMapState.centralTopic = root.title;
      conceptMapState.summary = root.description;
      const cacheKey = getTabCacheKey('map'),
        entry = tabViewCache.get(cacheKey) || {};
      entry.conceptMapState = conceptMapState;
      entry.markdown = graph.nodes
        .map(
          (n) => `- **${n.title}**${n.description ? ': ' + n.description : ''}`
        )
        .join('\n');
      tabViewCache.set(cacheKey, entry);
      const persisted = window.OmniProduct.saveTool(cacheKey, entry);
      if (persisted === false)
        throw new Error(
          'Mindmap belum tersimpan. Ekspor JSON untuk mencadangkannya.'
        );
      lastOutput = entry.markdown;
      lastOutputHtml = renderMarkdownToSafeHtml(lastOutput);
      renderInteractiveConceptMap();
      return durableAvailable ? durableWrite : Promise.resolve();
    },
    ensureAnalysis,
    sourceRequest,
    async saveOriginal(file) {
      const source = sources.find((source) => source.id === materialId);
      if (!source || !durableAvailable) return;
      try {
        await window.OmniLocalLibrary.saveFile(source.id, source.version, file);
        source.hasOriginal = true;
        persist();
      } catch {
        toast(
          'Teks tersimpan; file asli belum tersimpan. Periksa kapasitas perangkat.'
        );
      }
    },
    getCurrentSource: () => sources.find((s) => s.id === materialId),
    getSavedTool(cacheKey) {
      return sources.find((s) => s.id === materialId)?.generated?.[
        cacheKey.replace(/^ai4-v\d+\|/, '')
      ];
    },
    saveTool(cacheKey, entry) {
      const source = sources.find((s) => s.id === materialId);
      if (source) {
        source.generated ||= {};
        source.generated[cacheKey.replace(/^ai4-v\d+\|/, '')] = entry;
        return persist();
      }
    },
    setDeck(cards) {
      const source = sources.find((s) => s.id === materialId);
      if (source) source.deck = cards;
      else freeDeck = cards;
      persist();
    },
    context() {
      const source = sources.find((s) => s.id === materialId);
      const chapter = source?.journey?.chapters?.find(
        (c) => c.id === source.activeChapter
      );
      return {
        profile,
        chapter: chapter
          ? { title: chapter.title, explanation: chapter.explanation }
          : null,
      };
    },
  };
  if (materialText && !sources.some((source) => source.id === materialId))
    capture();
  function selectSource(id, force = false) {
    if (busy || uploadInFlight) return false;
    const source = sources.find((s) => s.id === id);
    if (!source) return false;
    if (materialId === id && !force) return true;
    const previous = sources.find((s) => s.id === materialId);
    if (previous && previous.id !== source.id)
      previous.chat = chatHistory.slice(-24);
    cancelActiveStudyRequest();
    materialVersion++;
    tabViewCache.clear();
    materialText = source.text;
    materialName = source.name;
    materialId = source.id;
    materialMeta = source.meta;
    chatHistory = Array.isArray(source.chat) ? source.chat : [];
    chatMessages.replaceChildren();
    for (const item of chatHistory) addMessage(item.role, item.content);
    lastOutput = '';
    lastOutputHtml = '';
    window.OmniProductSourceChange?.();
    saveSessionState();
    renderMaterialBadgeAndSidebar();
    source.lastOpenedAt = Date.now();
    persist();
    return true;
  }
  function sourceCards(query = '') {
    const type = panel.querySelector('#sourceType')?.value || 'all';
    const subject = panel.querySelector('#sourceSubject')?.value || 'all';
    const sort = panel.querySelector('#sourceSort')?.value || 'newest';
    const kind = (s) =>
      s.meta?.extractionMode?.includes('audio')
        ? 'audio'
        : s.meta?.extractionMode?.includes('video')
          ? 'video'
          : s.meta?.extractionMode?.includes('transcript')
            ? 'transcript'
            : 'document';
    const list = sources
      .filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) &&
          (type === 'all' || kind(s) === type) &&
          (subject === 'all' || s.subject === subject)
      )
      .sort((a, b) =>
        sort === 'title'
          ? a.name.localeCompare(b.name)
          : sort === 'oldest'
            ? a.createdAt - b.createdAt
            : sort === 'subject'
              ? (a.subject || '').localeCompare(b.subject || '')
              : b.createdAt - a.createdAt
      );
    if (!list.length)
      return '<div class="empty-panel"><div><h3>Mulai dari satu materi.</h3><p>Upload dokumen atau tempel transkrip. Semua alat belajar memakai sumber yang kamu pilih.</p><button class="primary" data-upload>＋ Tambah sumber</button></div><img src="/mascot.svg" width="140" height="140" alt="Maskot OmniLearn"></div>';
    return `<div class="source-grid">${list.map((s) => `<article class="source-card"><span>▤ ${{ audio: 'Audio', video: 'Video', transcript: 'Transkrip', document: 'Dokumen' }[kind(s)]}</span><h3>${html(s.name)}</h3><p>${Number(s.meta?.pageCount || 1)} bagian · ${s.text.length.toLocaleString('id-ID')} karakter<br>${new Date(s.createdAt).toLocaleDateString('id-ID')}</p><p class="subject-tag">${html(s.subject || '')} · ${s.meta?.partialRead || s.meta?.truncated ? 'Teks sebagian; periksa sumber asli' : 'Teks siap dipakai'}</p><div class="panel-actions"><button data-source="${html(s.id)}" data-action="preview">Pratinjau</button><button data-source="${html(s.id)}" data-action="download">Unduh teks</button><button data-source="${html(s.id)}" data-action="chat">Buka</button><button data-source="${html(s.id)}" data-action="summary">Ringkas</button><button data-source="${html(s.id)}" data-action="quiz">Kuis</button><button data-source="${html(s.id)}" data-action="cards">Kartu</button><button data-source="${html(s.id)}" data-action="map">Mindmap</button><button data-source="${html(s.id)}" data-action="delete">Hapus</button></div></article>`).join('')}</div>`;
  }
  function sourcesView(home = false, query = '') {
    panel.innerHTML = `<span class="handwriting">${home ? 'selangkah lebih paham hari ini' : 'semua materi, satu tempat'}</span><h1>${home ? 'Mau belajar apa hari ini?' : 'Pustaka sumbermu'}</h1><p>${home ? 'Lanjutkan materimu, atau mulai dari rasa ingin tahu yang baru.' : 'Dokumen dan transkrip disimpan di browser perangkat ini. Pilih sumber untuk menghubungkannya ke seluruh alat belajar.'}</p><div class="panel-actions"><button data-explorer>Jelajahi bidang ilmu</button><button data-free-chat data-open="chat">Tanya tanpa dokumen ↗</button></div><div id="sourceResults">${sourceCards(query)}</div>`;
    const intro = panel.querySelector('h1');
    const active = sources.find((source) => source.id === materialId);
    const sourceControls = document.createElement('section');
    sourceControls.className = 'source-intelligence-controls';
    const caption = document.createElement('h2');
    caption.textContent = active
      ? `${active.name} · versi ${active.version}`
      : 'Cadangan pustaka';
    const actions = document.createElement('div');
    actions.className = 'panel-actions';
    sourceControls.append(caption, actions);
    const add = (label, action) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.onclick = action;
      actions.append(button);
    };
    const api = {
      persist,
      ensureAnalysis,
      async restore(source, version) {
        if (busy || uploadInFlight) throw new Error('Tunggu proses saat ini.');
        const next = window.OmniBackup.restoredSource(source, version),
          current = snapshot(),
          files = [];
        if (next.hasOriginal) {
          const file = await window.OmniLocalLibrary.readFile(
            source.id,
            version.version
          );
          if (file)
            files.push({ sourceId: source.id, version: next.version, file });
          else next.hasOriginal = false;
        }
        current.sources = current.sources.map((s) =>
          s.id === source.id ? next : s
        );
        await window.OmniProduct.importLibrary(current, files);
      },
      async revise(source, text) {
        if (busy || uploadInFlight)
          throw new Error('Tunggu proses yang sedang berlangsung.');
        const { versions, ...old } = structuredClone(source);
        (source.versions ||= []).push({ ...old, archivedAt: Date.now() });
        source.text = text;
        source.version++;
        source.updatedAt = Date.now();
        source.meta = {
          ...source.meta,
          partialRead: false,
          truncated: false,
          characters: text.length,
          extractionMode: 'user-revised-text',
        };
        for (const field of [
          'blueprint',
          'blueprintLanguage',
          'generated',
          'journey',
          'activeChapter',
          'completedChapters',
          'deck',
          'reviews',
          'chat',
          'hasOriginal',
        ])
          delete source[field];
        source.generated = {};
        source.chat = [];
        selectSource(source.id, true);
        if (durableAvailable) await durableWrite;
        sourcesView(current === 'learn');
      },
    };
    if (active) {
      add('Analisis & bukti', () =>
        window.OmniSourceTools.showAnalysis(active, api)
      );
      add('Revisi teks sumber', () =>
        window.OmniSourceTools.editSource(active, api)
      );
      add('Arsip versi', () => window.OmniSourceTools.history(active, api));
      if (active.hasOriginal)
        add('Unduh file asli', async () => {
          const file = await window.OmniLocalLibrary.readFile(
            active.id,
            active.version
          );
          if (!file) {
            toast('File asli tidak tersedia di perangkat ini.');
            return;
          }
          const url = URL.createObjectURL(file),
            a = document.createElement('a');
          a.href = url;
          a.download = file.name || active.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    }
    add('Ekspor cadangan JSON', () =>
      window.OmniSourceTools.exportJson(snapshot(), 'omnilearn-library.json')
    );
    add('Cadangkan / impor ZIP', () =>
      window.OmniBackup.open(window.OmniProduct)
    );
    if (active)
      add('Mindmap manual', () => {
        conceptMapState = structuredClone(
          window.OmniProduct.getSavedTool(getTabCacheKey('map'))
            ?.conceptMapState || {
            centralTopic: active.name,
            summary: '',
            branches: [],
            relationships: [],
          }
        );
        window.OmniMapWorkspace.open(conceptMapState, (graph) => {
          const saved = window.OmniProduct.saveMapGraph(graph);
          navigate('map');
          return saved;
        });
      });
    const privacy = document.createElement('p');
    privacy.textContent = durableAvailable
      ? 'Pustaka disimpan di browser perangkat ini, termasuk file asli yang berhasil disimpan. Ekspor cadangan secara berkala. File asli diunduh terpisah dari JSON. Hapus data melalui Pengaturan.'
      : 'Penyimpanan perangkat tidak tersedia. Data hanya sementara di tab ini; ekspor cadangan sebelum menutup.';
    sourceControls.append(privacy);
    panel.querySelector('#sourceResults').before(sourceControls);
    if (home) {
      const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: 'numeric',
          hour12: false,
        }).format(Date.now())
      );
      intro.textContent = `Selamat ${hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam'}${profile.name ? ', ' + profile.name : ''}. Mau belajar apa?`;
    }
    const hub = document.createElement('section');
    hub.className = 'smart-input-hub';
    hub.setAttribute('aria-label', 'Tambahkan sumber belajar');
    const hubCards = [
      [
        'document',
        '▤',
        'Dokumen & slide',
        'Bawa catatanmu. Kita petakan ide pentingnya.',
        'PDF, DOCX, PPTX, XLSX, TXT, PNG, JPG',
      ],
      [
        'audio',
        '♫',
        'Audio & rekaman',
        'Tangkap penjelasan, ubah jadi pemahaman.',
        'MP3, WAV, M4A, rekaman browser',
      ],
      [
        'video',
        '▷',
        'Video',
        'Pelajari ucapan dan visual yang relevan.',
        'MP4, MOV, WEBM',
      ],
      [
        'youtube',
        '▶',
        'YouTube & transkrip',
        'Simpan tautan dan caption yang boleh digunakan.',
        'Transkrip manual; tanpa mengambil video',
      ],
    ];
    hub.innerHTML = `<div class="input-hub-grid">${hubCards.map(([type, icon, title, copy, formats], i) => `<button class="input-hub-card" data-source="${type}" data-input-kind="${type}"><span class="input-hub-number">0${i + 1}</span><span class="input-hub-icon" aria-hidden="true">${icon}</span><h3>${title}</h3><p class="input-hub-copy">${copy}</p><span class="input-hub-formats">${formats}</span><span class="input-hub-cta">${type === 'youtube' ? 'Tempel transkrip' : 'Pilih file'}</span></button>`).join('')}</div><div class="panel-actions"><button data-record-audio>● Rekam audio</button><span role="status" id="recordStatus"></span></div>`;
    panel.querySelector('#sourceResults').before(hub);
    const filters = document.createElement('div');
    filters.className = 'source-filters';
    filters.innerHTML = `<select id="sourceType" aria-label="Filter tipe sumber"><option value="all">Semua tipe</option><option value="document">Dokumen</option><option value="audio">Audio</option><option value="video">Video</option><option value="transcript">Transkrip</option></select><select id="sourceSubject" aria-label="Filter mata pelajaran"><option value="all">Semua pelajaran</option>${[...new Set(sources.map((s) => s.subject).filter(Boolean))].map((s) => `<option>${html(s)}</option>`).join('')}</select><select id="sourceSort" aria-label="Urutkan sumber"><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="title">Judul A–Z</option><option value="subject">Mata pelajaran</option></select>`;
    panel.querySelector('#sourceResults').before(filters);
    filters.onchange = () =>
      (panel.querySelector('#sourceResults').innerHTML = sourceCards(
        top.querySelector('#sourceSearch').value
      ));
    if (home) {
      const stats = document.createElement('div');
      stats.className = 'learning-stats';
      hub.before(stats);
      activityAPI.then(({ activitySummary }) => {
        if (!stats.isConnected) return;
        const summary = activitySummary(activity);
        stats.innerHTML = summary.xp
          ? `<div class="learning-stat"><strong>${summary.xp}</strong><span>XP dari aktivitas tercatat</span></div><div class="learning-stat"><strong>${summary.level}</strong><span>Level belajar</span></div><div class="learning-stat"><strong>${summary.streak}</strong><span>Hari berurutan (WIB)</span></div><div class="learning-stat"><strong>${summary.accuracy ?? '—'}%</strong><span>Akurasi ${summary.answered} jawaban</span></div>`
          : '<p>Belum ada aktivitas belajar tercatat. Mulai dari satu sumber; progres akan muncul dari latihan dan bab yang kamu selesaikan.</p>';
        if (summary.weakTopics.length) {
          const weak = document.createElement('div');
          weak.className = 'source-card';
          weak.innerHTML =
            '<h3>Materi yang perlu diulang</h3>' +
            summary.weakTopics
              .map(
                (item) =>
                  `<p>${html(item.topic)} · ${item.count} jawaban keliru</p>`
              )
              .join('');
          stats.after(weak);
        }
      });
    }
  }
  function notesView() {
    const source = sources.find((s) => s.id === materialId);
    if (window.OmniWorkbench) {
      let value = source?.notes || '';
      try {
        if (!source)
          value = sessionStorage.getItem('omnilearn-free-note') || '';
      } catch {}
      window.OmniWorkbench.installNotes(panel, {
        value,
        sourceName: source?.name || 'Catatan bebas',
        storageLabel: durableAvailable
          ? 'Tersimpan di browser perangkat ini.'
          : 'Tersimpan sementara di tab ini.',
        async onSave(value) {
          if (source) {
            source.notes = value;
            if (!persist())
              throw new Error(
                'Penyimpanan penuh; ekspor catatan untuk menyimpannya.'
              );
          } else
            try {
              sessionStorage.setItem('omnilearn-free-note', value);
            } catch {
              throw new Error('Ekspor catatan; penyimpanan penuh.');
            }
          if (!source) persist();
          if (durableAvailable) await durableWrite;
        },
        onAssist(action, value) {
          lastOutput = value;
          const instruction =
            {
              summarize: 'Ringkas catatan ini',
              clarify: 'Perjelas catatan ini dengan bahasa sederhana',
              questions: 'Buat pertanyaan latihan dari catatan ini',
            }[action] || 'Bantu jelaskan catatan ini';
          chatInput.value = `${instruction}: ${value.slice(0, 6000)}`;
          navigate('chat');
          chatInput.focus();
        },
      });
      return;
    }
    panel.innerHTML = `<span class="handwriting">tulis dengan bahasamu sendiri</span><h1>Catatan belajarmu</h1><p>${html(source?.name || 'Catatan bebas dalam sesi ini')}</p><div class="panel-actions"><button data-fill-note>Ambil hasil AI terakhir</button><button data-export-note>Ekspor .txt</button><button data-open="summary">Buat ringkasan AI ↗</button></div><textarea id="noteEditor" aria-label="Editor catatan" placeholder="Tulis atau tempel catatan di sini…"></textarea><p class="note-status" id="noteStatus">Tersimpan dalam sesi tab ini.</p>`;
    const editor = panel.querySelector('#noteEditor');
    try {
      editor.value =
        source?.notes || sessionStorage.getItem('omnilearn-free-note') || '';
    } catch {}
    editor.addEventListener('input', () => {
      if (source) {
        source.notes = editor.value;
        persist();
      } else
        try {
          sessionStorage.setItem('omnilearn-free-note', editor.value);
        } catch {
          panel.querySelector('#noteStatus').textContent =
            'Penyimpanan penuh. Ekspor catatan untuk menyimpannya.';
        }
    });
  }
  function transcriptView() {
    let subtitleSegments = [],
      subtitleText = '';
    panel.innerHTML =
      '<h1>Tambahkan transkrip</h1><p>Tempel transkrip milikmu atau caption yang boleh kamu gunakan. Tautan disimpan sebagai referensi; aplikasi tidak mengambil video atau caption otomatis.</p><form class="transcript-form"><label>Judul materi<input name="title" maxlength="180" required></label><label>Tautan YouTube (opsional)<input name="url" type="url" placeholder="https://www.youtube.com/watch?v=…"></label><label>Isi transkrip<textarea name="text" maxlength="50000" required></textarea></label><div class="panel-actions"><button class="primary" type="submit">Simpan sebagai sumber</button><button type="button" data-open="sources">Batal</button></div><p role="status" id="transcriptError"></p></form>';
    const transcriptForm = panel.querySelector('form'),
      status = panel.querySelector('#transcriptError'),
      automatic = document.createElement('button'),
      subtitle = document.createElement('input');
    automatic.type = 'button';
    automatic.textContent = 'Ambil caption dengan izin';
    automatic.onclick = async () => {
      automatic.disabled = true;
      status.textContent = 'Memeriksa caption yang diizinkan…';
      try {
        const data = await safeRequestJson(
          '/api/youtube/transcript',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: transcriptForm.elements.url.value }),
          },
          { timeoutMs: 50000, stageContext: 'youtube-captions' }
        );
        window.OmniProduct.addSource({
          name: data.title,
          text: data.text.slice(0, 50000),
          meta: {
            sourceUrl: data.url,
            extractionMode: 'authorized-youtube-captions',
            transcriptSegments: data.segments,
            truncated: data.text.length > 50000,
            captionLanguage: data.language,
          },
        });
        navigate('video');
      } catch (error) {
        status.textContent =
          error.message + ' Tempel transkrip atau pilih subtitle di bawah.';
      } finally {
        automatic.disabled = false;
      }
    };
    subtitle.type = 'file';
    subtitle.accept = '.srt,.vtt';
    subtitle.setAttribute('aria-label', 'Impor subtitle');
    subtitle.onchange = async () => {
      try {
        if (!subtitle.files[0]) return;
        const { parseSubtitles } = await import('/transcripts.js');
        subtitleSegments = parseSubtitles(await subtitle.files[0].text());
        subtitleText = subtitleSegments
          .map((s) => `[${s.start.toFixed(3)}s] ${s.text}`)
          .join('\n');
        transcriptForm.elements.text.value = subtitleText.slice(0, 50000);
        if (!transcriptForm.elements.title.value)
          transcriptForm.elements.title.value = subtitle.files[0].name;
        status.textContent = `${subtitleSegments.length} segmen dibaca dari subtitle.`;
      } catch (error) {
        status.textContent = error.message;
      }
    };
    transcriptForm.prepend(automatic, subtitle);
    panel.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const url = data.get('url').trim();
      if (url) {
        try {
          const u = new URL(url);
          if (
            u.protocol !== 'https:' ||
            !['youtube.com', 'www.youtube.com', 'youtu.be'].includes(
              u.hostname
            ) ||
            u.username ||
            u.password
          )
            throw Error();
        } catch {
          panel.querySelector('#transcriptError').textContent =
            'Gunakan tautan HTTPS YouTube yang valid.';
          return;
        }
      }
      const text = data.get('text').trim();
      if (!text) return;
      const source = {
        id: 'transcript-' + crypto.randomUUID(),
        name: data.get('title').trim(),
        text,
        meta: {
          extractionMode: 'user-transcript',
          sourceUrl: url,
          transcriptSegments: text === subtitleText ? subtitleSegments : [],
          pageCount: 1,
        },
        createdAt: Date.now(),
        version: 1,
        analysisSchema: 'forge-1',
        notes: '',
      };
      sources.unshift(source);
      persist();
      selectSource(source.id);
      navigate('sources');
    });
  }
  function settingsView() {
    const capabilities = window.OmniCapabilities;
    const formats =
      capabilities?.extensions?.join(', ').toUpperCase() ||
      'PDF, DOCX, PPTX, XLSX, TXT, PNG, JPEG, MP3, M4A, WAV, WEBM, MP4';
    panel.innerHTML = `<h1>Pengaturan sesi</h1><p>Sumber, catatan, dan riwayat tersimpan di browser ini. Buka Akun & cloud untuk sinkronisasi jika penyedianya sudah dikonfigurasi.</p><div class="panel-actions"><button data-theme-setting>Ganti tema</button><button data-delete-session>Hapus data perangkat</button></div><h3>Privasi dan AI</h3><p>Materi dikirim ke Gemini saat diproses. Periksa fakta penting dan gunakan materi yang boleh dibagikan kepada penyedia AI.</p><h3>Format yang tersedia</h3><p>Upload ${formats} hingga 15 MB. Caption otomatis memerlukan izin resmi YouTube; transkrip manual dan SRT/VTT tetap tersedia.</p>`;
    const form = document.createElement('form');
    form.className = 'profile-form';
    form.innerHTML = `<h2>Preferensi belajar (opsional)</h2><p>Disimpan di perangkat; bukan akun atau profil psikologis.</p><label>Nama panggilan<input name="name" maxlength="50" value="${html(profile.name || '')}"></label><label>Jenjang pendidikan<input name="education" maxlength="100" value="${html(profile.education || '')}"></label><label>Mata pelajaran<input name="subject" maxlength="100" value="${html(profile.subject || '')}"></label><label>Target belajar<input name="goal" maxlength="200" value="${html(profile.goal || '')}"></label><label>Mode tutor<select name="teachingMode">${teaching.innerHTML}</select></label><label>Tema<select name="theme" data-theme-select><option value="system">Ikuti sistem</option><option value="light">Terang</option><option value="dark">Gelap</option></select></label><button class="primary">Simpan preferensi</button><p role="status" data-profile-status></p>`;
    panel.prepend(form);
    form.elements.teachingMode.value = profile.teachingMode || 'standard';
    form.elements.theme.value = window.OmniTheme?.getPreference() || 'system';
    form.onsubmit = (event) => {
      event.preventDefault();
      const data = new FormData(form);
      profile = {
        ...profile,
        name: data.get('name').trim(),
        education: data.get('education').trim(),
        subject: data.get('subject').trim(),
        goal: data.get('goal').trim(),
        teachingMode: data.get('teachingMode'),
      };
      let saved = false;
      try {
        sessionStorage.setItem('omnilearn-profile', JSON.stringify(profile));
        saved = true;
      } catch {
        toast('Preferensi belum tersimpan.');
      }
      teaching.value = profile.teachingMode;
      teaching.dispatchEvent(new Event('change', { bubbles: true }));
      window.OmniTheme?.setPreference(data.get('theme'));
      persist();
      form.querySelector('[data-profile-status]').textContent = saved
        ? 'Preferensi disimpan untuk sesi ini.'
        : 'Preferensi berlaku sementara dan belum tersimpan.';
    };
  }
  function podcastView() {
    panel.innerHTML =
      '<h1>Dengarkan catatanmu</h1><p>Buat audio yang bisa diputar dan diunduh. Maksimal 6.000 karakter per proses.</p><textarea id="spokenText" aria-label="Teks yang dibacakan" placeholder="Tempel catatan atau ambil hasil AI terakhir…"></textarea><div class="panel-actions"><button data-spoken-last>Ambil hasil AI</button><button data-generate-audio>Buat audio</button><button data-speak>▶ Baca di perangkat</button><button data-pause>Jeda / lanjut</button><button data-stop>Berhenti</button></div><audio controls data-generated-audio hidden></audio><a data-audio-download hidden>Unduh audio WAV</a><p id="speechStatus" role="status"></p>';
    const audio = panel.querySelector('[data-generated-audio]');
    const download = panel.querySelector('[data-audio-download]');
    let audioUrl;
    panel
      .querySelector('[data-generate-audio]')
      .addEventListener('click', async (event) => {
        const button = event.currentTarget;
        const text = panel.querySelector('#spokenText').value.trim();
        const status = panel.querySelector('#speechStatus');
        if (!text) {
          status.textContent = 'Masukkan teks terlebih dahulu.';
          return;
        }
        button.disabled = true;
        status.textContent = 'Membuat audio…';
        try {
          const response = await safeRequestJson(
            '/api/speech',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            },
            { timeoutMs: 50000, stageContext: 'speech' }
          );
          const bytes = Uint8Array.from(atob(response.audioBase64), (char) =>
            char.charCodeAt(0)
          );
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          audioUrl = URL.createObjectURL(
            new Blob([bytes], { type: response.mimeType || 'audio/wav' })
          );
          audio.src = audioUrl;
          audio.hidden = false;
          download.href = audioUrl;
          download.download = 'omnilearn-audio.wav';
          download.hidden = false;
          status.textContent = 'Audio selesai dibuat.';
        } catch (error) {
          status.textContent =
            error.message || 'Audio gagal dibuat. Coba lagi.';
        } finally {
          button.disabled = false;
        }
      });
    panel.querySelector('#spokenText').value = lastOutput || '';
    if (!('speechSynthesis' in window)) {
      panel.querySelector('#speechStatus').textContent =
        'Text-to-speech tidak tersedia di browser ini.';
      panel
        .querySelectorAll('[data-speak],[data-pause],[data-stop]')
        .forEach((b) => (b.disabled = true));
    }
  }
  let current = 'learn';
  function navigate(view, push = true) {
    if (recorder?.state === 'recording') {
      toast('Selesaikan rekaman mikrofon sebelum pindah menu.');
      return;
    }
    if (busy || uploadInFlight) {
      toast('Tunggu proses saat ini selesai.');
      return;
    }
    panel.dashboardRenderId = null;
    chatHome.after(chatMessages);
    feedbackHome.after(chatFeedback);
    if (!views[view] && !tools.has(view)) view = 'dashboard';
    current = view;
    sidebar.querySelector('#shellLayout').textContent = view === 'learn' ? 'Coba tampilan baru' : 'Tampilan klasik';
    if (push)
      history.pushState({}, '', `/dashboard?view=${encodeURIComponent(view)}`);
    document.querySelectorAll('[data-view]').forEach((a) => {
      a.classList.toggle(
        'active',
        a.dataset.view === view ||
          (view === 'summary' && a.dataset.view === 'notes')
      );
      if (a.classList.contains('active'))
        a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.body.classList.remove('dashboard-drawer');
    materialNav.hidden = !materialId;
    workspace.hidden = !tools.has(view);
    panel.hidden = tools.has(view);
    if (['dashboard','subjects','streaks','leaderboard','profile','help','pinned','updates'].includes(view)) {
      window.OmniDashboard.render(panel, view, window.OmniProduct);
      return;
    }
    if (tools.has(view)) {
      if (view === 'research')
        window.OmniResearch?.mount(workspace, window.OmniProduct);
      else
        workspace
          .querySelector('#externalResearch')
          ?.setAttribute('hidden', '');
      selectTab(view);
      return;
    }
    if (view === 'learn' || view === 'sources') sourcesView(view === 'learn');
    if (view === 'notes') notesView();
    if (view === 'settings') settingsView();
    if (view === 'podcast') podcastView();
    if (view === 'exams') window.OmniExams.render(panel, window.OmniProduct);
    if (view === 'video') window.OmniVideo.render(panel, window.OmniProduct);
    if (view === 'account')
      window.OmniAccounts.render(panel, window.OmniProduct);
    if (view === 'recovery')
      window.OmniRecovery.render(panel, window.OmniProduct);
    if (view === 'journey')
      window.OmniJarvis?.renderJourney(panel, window.OmniProduct);
    if (view === 'sticky')
      window.OmniWorkbench?.installSticky(panel, {
        notes: stickyNotes,
        onSave(notes) {
          stickyNotes = notes;
          try {
            sessionStorage.setItem('omnilearn-sticky', JSON.stringify(notes));
          } catch {
            toast('Catatan tempel belum tersimpan.');
          }
          persist();
        },
      });
  }
  let utterance;
  let recorder, recordingStream;
  async function recordAudio(button) {
    const status = panel.querySelector('#recordStatus');
    if (recorder?.state === 'recording') {
      recorder.stop();
      button.textContent = '● Rekam audio';
      return;
    }
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      if (status)
        status.textContent =
          'Rekaman tidak didukung. Upload file audio sebagai alternatif.';
      return;
    }
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const chunks = [];
      let size = 0;
      recorder = new MediaRecorder(recordingStream);
      const limit = 15 * 1024 * 1024;
      recorder.ondataavailable = (e) => {
        if (e.data.size) {
          size += e.data.size;
          if (size > limit) {
            recorder.stop();
            return;
          }
          chunks.push(e.data);
        }
      };
      recorder.onstop = async () => {
        recordingStream.getTracks().forEach((track) => track.stop());
        if (size > limit) {
          toast('Rekaman melebihi 15 MB; coba rekam lebih singkat.');
          return;
        }
        const type = recorder.mimeType;
        const name = type.includes('mp4') ? 'rekaman.m4a' : 'rekaman.webm';
        const file = new File(chunks, name, { type });
        workspace.hidden = false;
        panel.hidden = true;
        await uploadFile(file);
      };
      recorder.onerror = () => {
        recordingStream.getTracks().forEach((track) => track.stop());
        if (status)
          status.textContent = 'Rekaman gagal; coba upload file audio.';
      };
      recorder.start(1000);
      button.textContent = '■ Selesai merekam';
      if (status)
        status.textContent = 'Mikrofon aktif. Klik selesai saat rekaman cukup.';
    } catch {
      if (status)
        status.textContent =
          'Izin mikrofon tidak diberikan atau perangkat tidak tersedia.';
    }
  }
  const mapObserver = new MutationObserver(() => {
    const cards = toolOutput.querySelector('.fc-widget');
    if (cards && !cards.querySelector('[data-review-due]')) {
      const review = document.createElement('button');
      review.className = 'tool-action';
      review.dataset.reviewDue = '';
      review.textContent = 'Ulangi kartu yang jatuh tempo';
      review.addEventListener('click', () => {
        const source = sources.find((s) => s.id === materialId);
        const now = Date.now();
        const due = flashcardState.allCards
          .map((card, index) => ({
            index,
            review: source?.reviews?.[JSON.stringify([card.front, card.back])],
          }))
          .filter((item) => !item.review || item.review.dueAt <= now);
        if (!due.length) {
          toast(
            'Belum ada kartu jatuh tempo. Jadwal tersimpan selama sesi tab.'
          );
          return;
        }
        flashcardState.deckOrder = due
          .sort((a, b) => (a.review?.dueAt || 0) - (b.review?.dueAt || 0))
          .map((item) => item.index);
        flashcardState.currentIndex = 0;
        flashcardState.reviewHardOnly = false;
        renderInteractiveFlashcards();
      });
      cards.append(review);
    }
    const map = toolOutput.querySelector('.cmap-widget');
    if (!map || toolOutput.querySelector('.product-map-tools')) return;
    const controls = document.createElement('div');
    controls.className = 'product-map-tools panel-actions';
    controls.innerHTML =
      '<button data-zoom="-0.1" aria-label="Perkecil mindmap">−</button><button data-zoom="0" aria-label="Reset zoom">100%</button><button data-zoom="0.1" aria-label="Perbesar mindmap">＋</button><button data-fit-map>Pas layar</button><button data-edit-map>Edit node</button><button data-manage-map>Kelola node</button><button data-regenerate-map>Buat ulang</button><button data-export-map>Ekspor JSON</button>';
    const viewport = document.createElement('div');
    viewport.className = 'map-viewport';
    map.before(controls, viewport);
    viewport.append(map);
    let zoom = 1,
      drag = null;
    controls.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-manage-map')) {
        window.OmniMapWorkspace.open(
          conceptMapState,
          window.OmniProduct.saveMapGraph
        );
        return;
      }
      if (button.hasAttribute('data-fit-map')) {
        map.style.zoom = 1;
        zoom = Math.min(1, viewport.clientWidth / map.scrollWidth);
        map.style.zoom = zoom;
        controls.querySelector('[data-zoom="0"]').textContent =
          Math.round(zoom * 100) + '%';
        return;
      }
      if (button.hasAttribute('data-regenerate-map')) {
        runTool('map', '', true);
        return;
      }
      if (button.hasAttribute('data-edit-map')) {
        const nodes = [
          {
            node: conceptMapState,
            titleKey: 'centralTopic',
            detailKey: 'summary',
          },
        ];
        for (const branch of conceptMapState.branches) {
          nodes.push({
            node: branch,
            titleKey: 'title',
            detailKey: 'explanation',
          });
          for (const sub of branch.subconcepts || [])
            nodes.push({ node: sub, titleKey: 'title', detailKey: 'detail' });
        }
        const dialog = document.createElement('dialog');
        dialog.className = 'map-edit-dialog';
        dialog.innerHTML = `<form><h2>Edit node mindmap</h2><label>Pilih node<select name="node">${nodes.map((entry, i) => `<option value="${i}">${html(entry.node[entry.titleKey])}</option>`).join('')}</select></label><label>Judul<input name="title" maxlength="180" required></label><label>Penjelasan<textarea name="detail" maxlength="5000"></textarea></label><div class="panel-actions"><button type="submit">Simpan</button><button type="button" data-close>Batal</button></div><p>Edit ini adalah catatanmu, bukan hasil verifikasi AI.</p></form>`;
        const form = dialog.querySelector('form');
        const fill = () => {
          const entry = nodes[Number(form.elements.node.value)];
          form.elements.title.value = entry.node[entry.titleKey];
          form.elements.detail.value = entry.node[entry.detailKey] || '';
        };
        fill();
        form.elements.node.onchange = fill;
        dialog.querySelector('[data-close]').onclick = () => dialog.close();
        dialog.onclose = () => dialog.remove();
        document.body.append(dialog);
        dialog.showModal();
        form.onsubmit = (event) => {
          event.preventDefault();
          const entry = nodes[Number(form.elements.node.value)];
          const before = entry.node[entry.titleKey];
          const title = form.elements.title.value.trim();
          if (!title) return;
          entry.node[entry.titleKey] = title;
          entry.node[entry.detailKey] = form.elements.detail.value.trim();
          for (const relationship of conceptMapState.relationships || []) {
            if (relationship.from === before) relationship.from = title;
            if (relationship.to === before) relationship.to = title;
          }
          lastOutput =
            conceptMapState.centralTopic +
            '\n\n' +
            conceptMapState.branches
              .map(
                (branch) =>
                  branch.title +
                  ': ' +
                  branch.explanation +
                  '\n' +
                  (branch.subconcepts || [])
                    .map((sub) => '- ' + sub.title + ': ' + sub.detail)
                    .join('\n')
              )
              .join('\n\n');
          lastOutputHtml = renderMarkdownToSafeHtml(lastOutput);
          const cacheKey = getTabCacheKey('map');
          const entryCache = { markdown: lastOutput, conceptMapState };
          tabViewCache.set(cacheKey, entryCache);
          window.OmniProduct.saveTool(cacheKey, entryCache);
          dialog.close();
          renderInteractiveConceptMap();
        };
        return;
      }
      if (button.hasAttribute('data-export-map')) {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(conceptMapState, null, 2)], {
            type: 'application/json',
          })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'omnilearn-mindmap.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const delta = Number(button.dataset.zoom);
      zoom = delta === 0 ? 1 : Math.min(1.5, Math.max(0.5, zoom + delta));
      map.style.zoom = zoom;
      controls.querySelector('[data-zoom="0"]').textContent =
        Math.round(zoom * 100) + '%';
    });
    viewport.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button,a,input')) return;
      drag = {
        x: event.clientX,
        y: event.clientY,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!drag) return;
      viewport.scrollLeft = drag.left + drag.x - event.clientX;
      viewport.scrollTop = drag.top + drag.y - event.clientY;
    });
    viewport.addEventListener('pointerup', () => (drag = null));
    viewport.addEventListener('pointercancel', () => (drag = null));
  });
  mapObserver.observe(toolOutput, { childList: true, subtree: true });
  // Capture the current card before the existing assessment handler advances it.
  document.addEventListener(
    'click',
    async (event) => {
      if (event.target.closest('#clearChat')) {
        const source = sources.find((source) => source.id === materialId);
        if (source) source.chat = [];
        persist();
        return;
      }
      const button = event.target.closest('#fcMarkEasyBtn,#fcMarkHardBtn');
      if (!button || !flashcardState?.allCards?.length) return;
      const index = flashcardState.deckOrder[flashcardState.currentIndex];
      const card = flashcardState.allCards[index];
      const source = sources.find((s) => s.id === materialId);
      if (!source || !card) return;
      const { scheduleReview } = await import('/review-scheduler.js');
      const id = JSON.stringify([card.front, card.back]);
      source.reviews ||= {};
      source.reviews[id] = scheduleReview(
        source.reviews[id],
        button.id === 'fcMarkEasyBtn'
      );
      persist();
      toast(
        `Ulangi kartu ini pada ${new Date(source.reviews[id].dueAt).toLocaleDateString('id-ID')}. Jadwal tersimpan dalam sesi tab.`
      );
    },
    true
  );
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button,a');
    if (!button) return;
    if (button.matches('.tab[data-tab]')) {
      current = button.dataset.tab;
      history.replaceState(
        {},
        '',
        `/dashboard?view=${encodeURIComponent(current)}`
      );
      sidebar.querySelectorAll('[data-view]').forEach((a) => {
        const selected =
          a.dataset.view === current ||
          (current === 'summary' && a.dataset.view === 'notes');
        a.classList.toggle('active', selected);
        if (selected) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }
    if (button.dataset.view) {
      event.preventDefault();
      navigate(button.dataset.view);
    }
    if (button.hasAttribute('data-free-chat')) {
      if (busy || uploadInFlight) return;
      const previous = sources.find((source) => source.id === materialId);
      if (previous) previous.chat = chatHistory.slice(-24);
      cancelActiveStudyRequest();
      materialVersion++;
      tabViewCache.clear();
      materialText = '';
      materialName = '';
      materialId = '';
      materialMeta = null;
      window.OmniProductSourceChange?.();
      chatHistory = freeChat;
      chatMessages.replaceChildren();
      for (const item of chatHistory) addMessage(item.role, item.content);
      saveSessionState();
      renderMaterialBadgeAndSidebar();
      persist();
    }
    if (button.dataset.open) {
      event.preventDefault();
      navigate(button.dataset.open);
    }
    if (button.hasAttribute('data-upload')) {
      workspace.hidden = false;
      panel.hidden = true;
      $('materialFile').accept = (
        window.OmniCapabilities?.extensions || [
          '.pdf',
          '.docx',
          '.pptx',
          '.xlsx',
          '.txt',
          '.png',
          '.jpg',
          '.jpeg',
          '.mp3',
          '.wav',
          '.m4a',
          '.mp4',
          '.mov',
          '.webm',
        ]
      ).join(',');
      $('materialFile').click();
    }
    if (button.hasAttribute('data-transcript')) transcriptView();
    if (button.dataset.inputKind) {
      const kind = button.dataset.inputKind;
      if (kind === 'youtube') transcriptView();
      else {
        const input = $('materialFile');
        input.accept =
          kind === 'audio'
            ? '.mp3,.wav,.m4a,.webm'
            : kind === 'video'
              ? '.mp4,.mov,.webm'
              : '.pdf,.docx,.pptx,.xlsx,.txt,.png,.jpg,.jpeg';
        workspace.hidden = false;
        panel.hidden = true;
        input.click();
      }
    }
    if (button.hasAttribute('data-record-audio')) recordAudio(button);
    if (button.hasAttribute('data-explorer')) {
      const explorer = $('jelajahi');
      explorer.style.display = 'block';
      explorer.scrollIntoView({ behavior: 'smooth' });
    }
    if (button.dataset.source && !button.dataset.inputKind) {
      const id = button.dataset.source;
      if (['preview', 'download'].includes(button.dataset.action)) {
        const source = sources.find((s) => s.id === id);
        if (!source) return;
        if (button.dataset.action === 'download') {
          const url = URL.createObjectURL(
            new Blob([source.text], { type: 'text/plain;charset=utf-8' })
          );
          const link = document.createElement('a');
          link.href = url;
          link.download = 'omnilearn-source.txt';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          const dialog = document.createElement('dialog');
          dialog.className = 'map-edit-dialog';
          const title = document.createElement('h2');
          title.textContent = source.name;
          const text = document.createElement('pre');
          text.style.cssText =
            'white-space:pre-wrap;max-height:55vh;overflow:auto';
          text.textContent = source.text;
          const close = document.createElement('button');
          close.textContent = 'Tutup';
          close.onclick = () => dialog.close();
          dialog.append(title, text, close);
          dialog.onclose = () => dialog.remove();
          document.body.append(dialog);
          dialog.showModal();
        }
        return;
      }
      if (button.dataset.action === 'delete') {
        if (busy || uploadInFlight) return;
        sources = sources.filter((s) => s.id !== id);
        window.OmniLocalLibrary.deleteSourceFiles(id).catch((error) =>
          toast(error.message)
        );
        persist();
        if (id === materialId) $('clearChat').click();
        sourcesView(current === 'learn');
      } else if (selectSource(id)) navigate(button.dataset.action);
    }
    if (
      button.id === 'productTheme' ||
      button.hasAttribute('data-theme-setting')
    )
      $('themeToggle').click();
    if (button.id === 'productMenu') {
      if (innerWidth <= 700) document.body.classList.toggle('dashboard-drawer');
      else document.body.classList.toggle('dashboard-collapsed');
      button.setAttribute(
        'aria-expanded',
        String(
          innerWidth <= 700
            ? document.body.classList.contains('dashboard-drawer')
            : !document.body.classList.contains('dashboard-collapsed')
        )
      );
    }
    if (button.hasAttribute('data-fill-note')) {
      panel.querySelector('#noteEditor').value = lastOutput;
      panel.querySelector('#noteEditor').dispatchEvent(new Event('input'));
    }
    if (button.hasAttribute('data-export-note')) {
      const blob = new Blob([panel.querySelector('#noteEditor').value], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'omnilearn-notes.txt';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (button.hasAttribute('data-delete-session')) {
      if (
        !confirm(
          'Hapus pustaka lokal yang sedang aktif beserta file aslinya? Data cloud dan pustaka akun lain tidak ikut dihapus. Ekspor cadangan terlebih dahulu jika diperlukan.'
        )
      )
        return;
      window.OmniAccounts?.pause();
      try {
        await window.OmniLocalLibrary.clear();
        libraryEpoch = (await window.OmniLocalLibrary.load()).clearedAt;
        sessionStorage.setItem('omnilearn-library-epoch', String(libraryEpoch));
      } catch (error) {
        toast('Data perangkat belum berhasil dihapus: ' + error.message);
        return;
      }
      sources = [];
      activity = { events: [] };
      profile = {};
      stickyNotes = [];
      freeChat = [];
      freeDeck = [];
      freeReviews = {};
      pendingTasks = [];
      for (const storageKey of [
        key,
        'omnilearn-free-note',
        'omnilearn-activity',
        'omnilearn-profile',
        'omnilearn-sticky',
        'omnilearn-free-chat',
      ])
        sessionStorage.removeItem(storageKey);
      $('clearChat').click();
      navigate('learn');
    }
    if (button.hasAttribute('data-spoken-last'))
      panel.querySelector('#spokenText').value = lastOutput || '';
    if (button.hasAttribute('data-speak')) {
      speechSynthesis.cancel();
      utterance = new SpeechSynthesisUtterance(
        panel.querySelector('#spokenText').value
      );
      utterance.lang = $('outputLanguage').value === 'en' ? 'en-US' : 'id-ID';
      const status = panel.querySelector('#speechStatus');
      utterance.onstart = () => (status.textContent = 'Sedang dibacakan…');
      utterance.onend = () => (status.textContent = 'Selesai.');
      utterance.onerror = () =>
        (status.textContent =
          'Suara belum tersedia. Periksa pengaturan suara perangkat.');
      speechSynthesis.speak(utterance);
    }
    if (button.hasAttribute('data-pause')) {
      if (speechSynthesis.paused) speechSynthesis.resume();
      else speechSynthesis.pause();
    }
    if (button.hasAttribute('data-stop')) speechSynthesis.cancel();
  });
  top.querySelector('#sourceSearch').addEventListener('input', (e) => {
    if (!['learn', 'sources'].includes(current)) navigate('sources');
    const results = panel.querySelector('#sourceResults');
    if (results) results.innerHTML = sourceCards(e.target.value);
  });
  window.addEventListener('popstate', () =>
    navigate(new URLSearchParams(location.search).get('view') || 'dashboard', false)
  );
  window.addEventListener('pagehide', () => {
    window.speechSynthesis?.cancel();
    recordingStream?.getTracks().forEach((track) => track.stop());
    panel.querySelectorAll('audio').forEach((audio) => {
      if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.body.classList.remove('dashboard-drawer');
  });
  const initial = new URLSearchParams(location.search);
  const accountReady = () => window.OmniAccounts.install(window.OmniProduct);
  if (window.OmniAccounts) accountReady();
  else window.addEventListener('load', accountReady, { once: true });
  const restoredSource = sources.find((source) => source.id === materialId);
  if (restoredSource) selectSource(restoredSource.id, true);
  else if (!materialText && freeChat.length) {
    chatHistory = freeChat;
    chatMessages.replaceChildren();
    for (const item of freeChat) addMessage(item.role, item.content);
  }
  persist();
  navigate(initial.get('tool') || initial.get('view') || 'dashboard', false);
})();
