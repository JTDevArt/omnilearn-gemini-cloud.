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
  const releases = [
    {
      version: "1.01",
      date: "2026-11-07",
      title: "Master Proficiency Release",
      status: "Validasi lokal; integrasi live belum diuji",
      features: [
        "Dashboard terpadu dan navigasi materi",
        "Mata pelajaran, pin, dan aktivitas nyata",
      ],
      fixes: [],
      improvements: [
        "Mesin pembelajaran dan penyimpanan lama digunakan kembali",
      ],
    },
  ];
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
    if (!host.isConnected || host.dashboardRenderId !== renderId || host.hidden)
      return;
    host.classList.remove("video-learning");
    const summary = activitySummary(state.activity);
    const stats = `<div class="master-stats"><article><strong>${summary.xp}</strong><span>XP tercatat</span></article><article><strong>${summary.level}</strong><span>Level</span></article><article><strong>${summary.streak}</strong><span>Streak hari</span></article><article><strong>${sources.length}</strong><span>Materi</span></article></div>`;
    const top = document.querySelector(".product-top");
    let badge = top.querySelector(".master-profile");
    if (!badge) {
      badge = document.createElement("a");
      badge.className = "master-profile";
      badge.href = "/dashboard?view=profile";
      badge.dataset.view = "profile";
      top.append(badge);
    }
    badge.textContent = `${profile.name || "Profil"} · Level ${summary.level} · ${summary.xp} XP · ${summary.streak} hari`;
    const title = {
      dashboard: "Mulai belajar dari mana hari ini?",
      subjects: "Mata Pelajaran",
      streaks: "Streak & Aktivitas",
      leaderboard: "Leaderboard",
      profile: "Profil",
      help: "Bantuan",
      pinned: "Disematkan",
      updates: "Patch Updates",
    }[view];
    host.innerHTML = `<div class="master-heading">${view === "dashboard" ? '<img src="/mascot.svg" alt="Maskot OmniLearn">' : ""}<div><p class="master-eyebrow">OMNILEARN · RUANG BELAJAR PRIBADI</p><h1>${title}</h1><p>${view === "dashboard" ? "Mulai dari satu pertanyaan, satu materi, atau satu video. OmniLearn akan membantumu memahami semuanya." : "Belajar dengan sumber dan progres milikmu sendiri."}</p></div></div>`;
    const section = (heading, html) => {
      const node = document.createElement("section");
      node.className = "master-section";
      node.innerHTML = `<h2>${heading}</h2>${html}`;
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
        `<div class="master-filters"><input type="search" aria-label="Cari catatan" placeholder="Cari catatan…"><select aria-label="Format catatan"><option value="all">Semua</option><option value="document">Dokumen</option><option value="slide">Slide</option><option value="audio">Audio</option><option value="video">Video</option><option value="youtube">YouTube</option></select><select aria-label="Mata pelajaran"><option value="">Semua pelajaran</option>${[...new Set(sources.map((s) => s.subject).filter(Boolean))].map((s) => `<option>${escape(s)}</option>`).join("")}</select><select aria-label="Urutan"><option value="new">Terbaru</option><option value="old">Terlama</option></select><button data-layout="grid" aria-pressed="true">Galeri</button><button data-layout="list" aria-pressed="false">Daftar</button></div><div class="master-library"></div>`,
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
              s.name.toLowerCase().includes(search.value.toLowerCase()) &&
              (type.value === "all" || kind(s) === type.value) &&
              (!subject.value || s.subject === subject.value),
          )
          .sort(
            (a, b) =>
              (sort.value === "old" ? 1 : -1) * (a.createdAt - b.createdAt),
          );
        results.innerHTML = list.length
          ? list
              .map(
                (s) =>
                  `<article class="master-note"><div class="master-preview" aria-hidden="true">${escape((s.notes || s.text || "").slice(0, 180))}</div><p>${escape(kind(s))} · ${escape(s.subject || "Tanpa pelajaran")}</p><h3>${escape(s.name)}</h3><time>${escape(new Date(s.createdAt).toLocaleDateString("id-ID"))}</time><div class="panel-actions"><button data-source-id="${escape(s.id)}">Buka</button><button data-pin-id="${escape(s.id)}" aria-pressed="${!!s.pinned}">${s.pinned ? "Lepas pin" : "Sematkan"}</button></div></article>`,
              )
              .join("")
          : '<p class="master-empty">Belum ada materi di sini. Unggah sumber pertama untuk mulai belajar.</p>';
      }
      node.oninput = draw;
      node.onchange = draw;
      node.onclick = (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.layout) {
          results.classList.toggle("list", b.dataset.layout === "list");
          node
            .querySelectorAll("[data-layout]")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        }
        if (b.dataset.sourceId) {
          api.selectSource(b.dataset.sourceId);
          api.navigate("notes");
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
    if (view === "dashboard") {
      const hour = new Date().getHours();
      const greeting = document.createElement('p');
      greeting.textContent = `Selamat ${hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam'}, ${profile.name || 'teman belajar'}. ${sources.length} materi tersimpan · ${summary.streak} hari streak.`;
      host.append(greeting);
      const chat = section(
        "Tanya, pahami, lanjutkan",
        `<form class="master-composer"><textarea aria-label="Pertanyaan untuk tutor" placeholder="Rangkum bab, jelaskan konsep, atau buat pelajaran dari materi apa pun..." required maxlength="12000"></textarea><div class="panel-actions"><button type="button" data-record-audio>● Rekam</button><button type="button" data-upload>＋ Unggah</button><button type="button" data-paste-material>Tempel materi</button><button type="button" data-open="sources">▶ YouTube</button><button class="primary" type="submit">Kirim ↑</button></div><span id="recordStatus" role="status"></span></form>`,
      );
      chat.querySelector("form").onsubmit = (e) => {
        e.preventDefault();
        const input = chat.querySelector("textarea");
        const button = chat.querySelector('button[type="submit"]');
        button.disabled = true;
        api.submitDashboardChat(input.value).finally(() => {
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
        dialog.onclose = () => dialog.remove();
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
      host.insertAdjacentHTML("beforeend", stats);
      const recent = [...sources].filter(s => s.text?.trim()).sort((a,b) => (b.lastOpenedAt || b.createdAt) - (a.lastOpenedAt || a.createdAt)).slice(0,4);
      const continuation = section('Lanjutkan belajar', recent.length ? `<div class="master-library">${recent.map(s => {
        const chapters = s.journey?.chapters || [];
        const done = chapters.filter(c => s.completedChapters?.includes(c.id)).length;
        return `<article class="master-note"><h3>${escape(s.name)}</h3><p>${escape(s.subject || 'Tanpa pelajaran')}</p><p>${chapters.length ? `${done}/${chapters.length} bab ditandai selesai` : 'Belum ada jalur belajar'}</p>${chapters.length ? `<progress aria-label="Progres ${escape(s.name)}" max="${chapters.length}" value="${done}"></progress>` : ''}<button data-resume="${escape(s.id)}">Lanjutkan belajar</button></article>`;
      }).join('')}</div>` : '<p class="master-empty">Unggah atau tempel materi untuk memulai pelajaran pertama.</p>');
      continuation.onclick = event => { const id = event.target.closest('[data-resume]')?.dataset.resume; if (id && api.selectSource(id)) api.navigate('journey'); };
      const timer = section('Timer fokus', '<div class="focus-timer"></div>');
      import('./focus-timer.js').then(({mountTimer}) => { if (timer.isConnected) mountTimer(timer.querySelector('.focus-timer'),api); });
      const video = section(
        "Lanjutkan dari video",
        `<p>Video, transkrip, dan ide penting dalam satu tempat.</p><div class="panel-actions"><button data-upload>Unggah video</button>${action("YouTube & transkrip", "sources")}</div><div class="master-video"></div>`,
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
      library();
      section(
        "Satu materi, banyak cara memahami",
        `<div class="master-features">${[
          ["Ringkasan Otomatis", "summary", "Temukan ide utama dari sumbermu."],
          [
            "Tutor AI 24/7",
            "chat",
            "Tanyakan konsep dan lanjutkan percakapan.",
          ],
          ["Smart Flashcards", "cards", "Ulangi konsep dengan latihan aktif."],
          [
            "Kuis Interaktif",
            "quiz",
            "Uji pemahaman dan pelajari umpan balik.",
          ],
        ]
          .map(
            ([name, route, copy]) =>
              `<article><h3>${name}</h3><p>${copy}</p>${action("Mulai →", route)}</article>`,
          )
          .join("")}</div>`,
      );
    }
    if (view === "pinned") library(true);
    if (view === "subjects") {
      const names = [
        ...new Set([
          ...subjectNames(profile.subjects),
          ...sources.map((s) => s.subject).filter(Boolean),
        ]),
      ];
      const node = section(
        "Atur materi berdasarkan pelajaran",
        `<form><label>Nama mata pelajaran <input name="subject" required maxlength="100"></label><button>Tambah</button></form><input class="subject-search" placeholder="Cari mata pelajaran" aria-label="Cari mata pelajaran"><div class="subject-items">${names.map((name, i) => `<article class="master-subject" data-name="${escape(name.toLowerCase())}"><h3>${escape(name)}</h3><p>${sources.filter((s) => s.subject === name).length} materi</p><form data-index="${i}"><label>Ubah nama <input name="subject" value="${escape(name)}" required maxlength="100"></label><button>Simpan</button><button type="button" data-delete="${i}">Hapus</button></form></article>`).join("") || "<p>Belum ada mata pelajaran.</p>"}</div>`,
      );
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
        const b = e.target.closest("[data-delete]");
        if (b && confirm("Hapus pelajaran ini? Materi tetap disimpan."))
          change(names[b.dataset.delete], "");
      };
      node.querySelector(".subject-search").oninput = (e) =>
        node
          .querySelectorAll(".master-subject")
          .forEach(
            (x) =>
              (x.hidden = !x.dataset.name.includes(
                e.target.value.toLowerCase(),
              )),
          );
      section(
        "Kelompokkan materi",
        sources
          .map(
            (s) =>
              `<label class="master-assignment">${escape(s.name)}<select data-assign="${escape(s.id)}"><option value="">Tanpa pelajaran</option>${names.map((n) => `<option ${s.subject === n ? "selected" : ""}>${escape(n)}</option>`).join("")}</select></label>`,
          )
          .join("") || "<p>Unggah materi terlebih dahulu.</p>",
      ).onchange = (e) => {
        if (e.target.dataset.assign)
          commit((s) => {
            s.sources.find((x) => x.id === e.target.dataset.assign).subject =
              e.target.value;
          }, () => render(host, view, api));
      };
    }
    if (view === "streaks") {
      host.insertAdjacentHTML("beforeend", stats);
      const events = state.activity?.events || [],
        days = [...new Set(events.map((e) => e.day))].sort();
      let longest = 0,
        run = 0,
        previous = "";
      for (const day of days) {
        run = Date.parse(day) - Date.parse(previous) === 86400000 ? run + 1 : 1;
        longest = Math.max(longest, run);
        previous = day;
      }
      section(
        "Aktivitas nyata",
        `<p>Streak terpanjang: ${longest} hari · ${events.filter((e) => e.type === "review").length} tinjauan flashcard · ${summary.answered} jawaban kuis</p><div class="master-calendar" aria-label="Kalender aktivitas 365 hari">${Array.from(
          { length: 365 },
          (_, i) => {
            const day = activityDay(Date.now() - (364 - i) * 86400000);
            const count = events.filter((e) => e.day === day).length;
            return `<span class="${count ? "studied" : ""}" title="${day}: ${count} aktivitas" aria-label="${day}: ${count} aktivitas"></span>`;
          },
        ).join(
          "",
        )}</div><p>Hari berwarna menunjukkan aktivitas tersimpan. Riwayat dibatasi 1.000 aktivitas terbaru.</p>${events
          .slice(-20)
          .reverse()
          .map(
            (e) =>
              `<p>${escape(e.day)} · ${escape(e.type)} · ${escape(e.topic)} · ${Number(e.points) || 0} XP</p>`,
          )
          .join("")}`,
      );
    }
    if (view === "leaderboard")
      section(
        "Belajar bersama, berkembang bersama",
        '<div class="master-empty"><h2>Ranking belum tersedia</h2><p>Peringkat lintas pengguna belum terhubung. Progres pribadimu tetap tercatat di halaman Streaks.</p></div>',
      );
    if (view === "profile") {
      host.insertAdjacentHTML("beforeend", stats);
      section(
        escape(profile.name || "Pelajar OmniLearn"),
        `<p>${sources.filter((s) => s.notes).length} catatan · ${sources.filter((s) => s.hasOriginal).length} file asli tersimpan</p><p>Email dan identitas terverifikasi tersedia melalui pengaturan akun.</p>${action("Preferensi AI, bahasa & tema", "settings")}${action("Akun & sinkronisasi", "account")}${action("Cadangan dan pustaka", "sources")}`,
      );
      const preferences = section(
        "Preferensi pribadi",
        `<form><label>Nama <input name="name" maxlength="50" value="${escape(profile.name || "")}"></label><label>Bahasa jawaban <select name="language"><option value="auto">Otomatis</option><option value="id">Indonesia</option><option value="en">English</option></select></label><button>Simpan</button><p role="status"></p></form>`,
      );
      preferences.querySelector("select").value = profile.language || "auto";
      preferences.onsubmit = (e) => {
        e.preventDefault();
        commit((s) => {
          s.profile.name = e.target.elements.name.value.trim();
          s.profile.language = e.target.elements.language.value;
        }, () => {
          e.target.querySelector('[role=status]').textContent = 'Preferensi tersimpan di pustaka perangkat.';
        });
        const language = document.querySelector("#outputLanguage");
        if (language) language.value = e.target.elements.language.value;
        e.target.querySelector('[role=status]').textContent = '';
      };
      const identity = section("Identitas akun", "<p>Memeriksa akun…</p>");
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
    }
    if (view === "help") {
      section(
        "Format yang didukung",
        "<p>PDF, DOCX, PPTX, XLSX, TXT, gambar, MP3, WAV, M4A, MP4, MOV, WEBM serta subtitle SRT/VTT. Batas berkas dan format aktual tercantum pada diagnostik kemampuan server di bawah.</p>",
      );
      section(
        "Mulai belajar",
        "<ol><li>Unggah materi melalui Dashboard.</li><li>Buka sumber dan periksa hasil ekstraksi.</li><li>Pilih ringkasan, tutor, kuis, atau flashcard.</li><li>Cadangkan pustaka melalui halaman Sumber.</li></ol><details><summary>Mengapa AI belum menjawab?</summary><p>Ekstraksi, OCR, dan analisis AI adalah tahap terpisah. Periksa status, tunggu batas retry jika kuota habis, lalu coba ulang melalui Permintaan tersimpan. Materi yang telah tersimpan tetap tersedia.</p></details>" +
          action("Permintaan tersimpan", "recovery"),
      );
      const diagnostic = section(
        "Diagnostik koneksi",
        '<p role="status">Memeriksa server…</p>',
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
          h.textContent = "Diagnostik aman · UI v1.01";
          const pre = document.createElement("pre");
          pre.textContent = JSON.stringify(data, null, 2);
          diagnostic.append(h, pre);
        }
      } catch (error) {
        diagnostic.textContent = error.message;
      }
    }
    if (view === "updates")
      for (const release of releases)
        section(
          `v${release.version} — ${release.title}`,
          `<time>${escape(release.date)}</time><p>Status: ${escape(release.status)}</p><h3>Fitur baru</h3><ul>${release.features.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><h3>Bug fixes</h3><p>${release.fixes.length ? release.fixes.map(escape).join(" · ") : "Tidak ada klaim perbaikan Gemini live pada rilis ini."}</p><h3>Improvements</h3><ul>${release.improvements.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`,
        );
  }
  window.OmniDashboard = { render, releases };
})();
