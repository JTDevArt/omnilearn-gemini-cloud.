/* V4 lesson/quiz workspaces use the existing same-origin request helper. */
(() => {
  const safe = (value) => escapeHtml(String(value ?? ''));
  async function check(question, answer) {
    return safeRequestJson(
      '/api/quiz/check',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer })
      },
      { timeoutMs: 10000, stageContext: 'quiz-check' }
    );
  }
  function renderQuiz(host, data, state = { index: 0, answers: {} }) {
    const questions = data.questions;
    const index = state.index;
    const question = questions[index];
    if (!question) return;
    const checked = state.answers[index];
    const field =
      question.type === 'truefalse'
        ? '<label><input type="radio" name="v4answer" value="true"> Benar / True</label><label><input type="radio" name="v4answer" value="false"> Salah / False</label>'
        : question.type === 'blanks'
          ? '<label>Jawaban singkat<input name="v4answer" autocomplete="off" required></label>'
          : question.type === 'ordering'
            ? `<p>Pilih urutan, tanpa mengulang pilihan.</p>${question.items.map((_, i) => `<label>Posisi ${i + 1}<select name="position">${question.items.map((item) => `<option value="${safe(item.id)}">${safe(item.text)}</option>`).join('')}</select></label>`).join('')}`
            : question.left
                .map(
                  (item) =>
                    `<label>${safe(item.text)}<select name="pair" data-left="${safe(item.id)}">${question.right.map((right) => `<option value="${safe(right.id)}">${safe(right.text)}</option>`).join('')}</select></label>`
                )
                .join('');
    const correct = Object.values(state.answers).filter(
      (a) => a.correct
    ).length;
    host.innerHTML = `<section class="v4-quiz"><div class="panel-actions"><span>Soal ${index + 1} / ${questions.length}</span><span>${correct} benar dari ${Object.keys(state.answers).length} dijawab</span><button data-reset-quiz>Ulangi</button></div><h3>${safe(question.question)}</h3><form><fieldset ${checked ? 'disabled' : ''}>${field}</fieldset><div class="panel-actions"><button type="submit" ${checked ? 'disabled' : ''}>Periksa jawaban</button><button type="button" data-hint>Petunjuk</button></div><p data-check-status role="status"></p></form>${checked ? `<div class="quiz-feedback-box ${checked.correct ? 'is-correct' : 'is-wrong'}"><strong>${checked.correct ? '✓ Tepat' : 'Perlu diulang'}</strong><div>${renderMarkdownToSafeHtml(checked.explanation)}</div></div>` : ''}<div class="panel-actions"><button data-prev ${index === 0 ? 'disabled' : ''}>Sebelumnya</button><button data-next ${!checked || index === questions.length - 1 ? 'disabled' : ''}>Berikutnya</button></div></section>`;
    host.querySelector('[data-hint]').onclick = () =>
      (host.querySelector('[data-check-status]').textContent =
        question.hint || 'Baca kembali konsep terkait di sumber.');
    host.querySelector('[data-reset-quiz]').onclick = () => {
      state.index = 0;
      state.answers = {};
      renderQuiz(host, data, state);
    };
    host.querySelector('[data-prev]').onclick = () => {
      state.index--;
      renderQuiz(host, data, state);
    };
    host.querySelector('[data-next]').onclick = () => {
      state.index++;
      renderQuiz(host, data, state);
    };
    host.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      if (state.answers[index]) return;
      let answer;
      if (question.type === 'truefalse') {
        const selected = host.querySelector('[name=v4answer]:checked');
        if (!selected) return;
        answer = selected.value === 'true';
      } else if (question.type === 'blanks')
        answer = host.querySelector('[name=v4answer]').value;
      else if (question.type === 'ordering')
        answer = [...host.querySelectorAll('[name=position]')].map(
          (el) => el.value
        );
      else
        answer = [...host.querySelectorAll('[name=pair]')].map((el) => ({
          leftId: el.dataset.left,
          rightId: el.value
        }));
      const submit = event.target.querySelector('[type=submit]');
      submit.disabled = true;
      try {
        const result = await check(question, answer);
        if (!result.valid)
          throw new Error(
            'Pilihan tidak valid. Periksa urutan atau pasangan yang berulang.'
          );
        state.answers[index] = result;
        window.OmniProduct?.record({
          id: `quiz:${materialId}:${question.id}:${question.question}`,
          type: 'quiz',
          correct: result.correct,
          topic: question.question
        });
        renderQuiz(host, data, state);
      } catch (error) {
        submit.disabled = false;
        host.querySelector('[data-check-status]').textContent = error.message;
      }
    };
    return state;
  }
  async function renderJourney(panel, api) {
    const source = api.getCurrentSource();
    panel.innerHTML =
      '<h1>Jalur belajarmu</h1><p>Bab dibuat dari sumber aktif, dengan materi, latihan, dan progres yang kamu tandai sendiri.</p>';
    if (!source) {
      panel.insertAdjacentHTML(
        'beforeend',
        '<p>Pilih atau upload sumber terlebih dahulu.</p>'
      );
      return;
    }
    if (!source.journey) {
      const button = document.createElement('button');
      button.className = 'primary';
      button.textContent = 'Susun jalur dari materi ini';
      panel.append(button);
      button.onclick = async () => {
        button.disabled = true;
        button.textContent = 'Gemini sedang menyusun bab…';
        try {
          await api.ensureAnalysis();
          const result = await safeRequestJson(
            '/api/study',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task: 'journey',
                material: source.text,
                materialId: source.id,
                sessionId,
                ...api.sourceRequest(),
                outputLanguage: $('outputLanguage').value
              })
            },
            { timeoutMs: 65000, stageContext: 'journey' }
          );
          source.journey = result.structuredData;
          api.persist();
          renderJourney(panel, api);
        } catch (error) {
          button.disabled = false;
          button.textContent = 'Coba susun kembali';
          toast(error.message);
        }
      };
      return;
    }
    const chapters = source.journey.chapters;
    source.completedChapters ||= [];
    const active = source.activeChapter || chapters[0].id;
    const chapter = chapters.find((c) => c.id === active) || chapters[0];
    panel.innerHTML = `<div class="panel-actions"><h1>${safe(source.journey.title)}</h1><span>${source.completedChapters.length}/${chapters.length} bab ditandai selesai</span></div><progress max="${chapters.length}" value="${source.completedChapters.length}" aria-label="Progres bab"></progress><div class="journey-workspace"><nav aria-label="Bab pembelajaran">${chapters.map((c, i) => `<button data-chapter="${safe(c.id)}" class="${c.id === chapter.id ? 'active' : ''}">${source.completedChapters.includes(c.id) ? '✓' : i + 1} ${safe(c.title)}</button>`).join('')}</nav><article><h2>${safe(chapter.title)}</h2><p>${safe(chapter.objective)}</p><div class="md-rendered">${renderMarkdownToSafeHtml(chapter.explanation)}</div>${chapter.example ? `<h3>Contoh</h3><div class="md-rendered">${renderMarkdownToSafeHtml(chapter.example)}</div>` : ''}${chapter.formula ? `<div class="md-rendered">${renderMarkdownToSafeHtml(chapter.formula)}</div>` : ''}${Array.isArray(chapter.sourceReferences) && chapter.sourceReferences.length ? `<p class="note-status">${chapter.sourceReferences.map(safe).join(' · ')}</p>` : ''}<h3>Coba jelaskan sendiri</h3><p>${safe(chapter.practice.question)}</p><textarea aria-label="Jawaban latihan" placeholder="Coba tulis pemahamanmu…"></textarea><details><summary>Lihat jawaban dan pembahasan</summary><div class="md-rendered">${renderMarkdownToSafeHtml(chapter.practice.answer + '\n\n' + chapter.practice.explanation)}</div></details><div class="panel-actions"><button data-complete>✓ Tandai sudah dipelajari</button><button data-ask-chapter>Tanya tutor tentang bab ini</button><button data-next-chapter ${chapters.indexOf(chapter) === chapters.length - 1 ? 'disabled' : ''}>Bab berikutnya →</button></div><p>Penanda selesai mencatat aktivitasmu; bukan penilaian otomatis atas penguasaan materi.</p></article></div>`;
    panel.querySelectorAll('[data-chapter]').forEach(
      (button) =>
        (button.onclick = () => {
          source.activeChapter = button.dataset.chapter;
          api.persist();
          renderJourney(panel, api);
        })
    );
    panel.querySelector('[data-complete]').onclick = () => {
      if (!source.completedChapters.includes(chapter.id))
        source.completedChapters.push(chapter.id);
      api.record({
        id: `lesson:${source.id}:${chapter.id}`,
        type: 'lesson',
        topic: chapter.title
      });
      api.persist();
      renderJourney(panel, api);
    };
    panel.querySelector('[data-ask-chapter]').onclick = () => {
      source.activeChapter = chapter.id;
      api.persist();
      api.navigate('chat');
      chatInput.value = `Jelaskan lagi konsep dalam bab ${chapter.title}.`;
      chatInput.focus();
    };
    panel.querySelector('[data-next-chapter]').onclick = () => {
      const next = chapters[chapters.indexOf(chapter) + 1];
      if (next) {
        source.activeChapter = next.id;
        api.persist();
        renderJourney(panel, api);
      }
    };
  }
  window.OmniJarvis = { renderQuiz, renderJourney };
})();
