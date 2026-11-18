const sourceFileTitle = /\.(?:pdf|docx?|pptx?|xlsx?|txt|png|jpe?g|webp)$/i;

const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
};

export function conversationForLesson(question, answer) {
  const prompt = question.trim().slice(0, 2000);
  return `Pertanyaan: ${prompt}\n\nJawaban tutor: ${answer.trim()}`.slice(0, 12000);
}

export async function openChatMaterial({trigger, question, answer, context, generate, save, open}) {
  if (document.querySelector('.chat-material-dialog[open]')) return;

  const dialog = node('dialog');
  dialog.className = 'chat-material-dialog forge-dialog';
  dialog.setAttribute('aria-labelledby', 'chatMaterialHeading');
  const heading = node('h2', 'Jadikan Materi');
  heading.id = 'chatMaterialHeading';
  const provenance = node('p', context.scope === 'document'
    ? 'Materi turunan dari sumber yang sedang dibahas. Sumber asli tetap tersimpan.'
    : 'Draf dari percakapan AI umum. Periksa fakta dan isi bab sebelum menyimpan.');
  const details = node('details');
  const conversation = conversationForLesson(question, answer);
  details.append(node('summary', 'Percakapan terpilih'), node('p', conversation));
  const form = node('form');
  const status = node('p', 'Menyusun draf bab…');
  status.setAttribute('role', 'status');
  const preview = node('div');
  preview.className = 'chat-material-preview';
  const actions = node('div');
  actions.className = 'panel-actions';
  const primary = node('button', 'Simpan dan buka');
  primary.type = 'submit';
  primary.className = 'primary';
  primary.disabled = true;
  const retry = node('button', 'Coba susun ulang');
  retry.type = 'button';
  retry.hidden = true;
  const close = node('button', 'Batal');
  close.type = 'button';
  close.onclick = () => dialog.close();
  actions.append(primary, retry, close);
  form.append(preview, status, actions);
  dialog.append(heading, provenance, details, form);
  const signal = new AbortController();
  let draft;
  let saving = false;
  let saved;
  let titleField;
  let chapterFields = [];

  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    signal.abort();
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, {once:true});

  function field(labelText, value, limit, multiline = false) {
    const label = node('label', labelText);
    const input = node(multiline ? 'textarea' : 'input');
    input.value = value;
    input.maxLength = limit;
    input.required = true;
    label.append(input);
    return [label, input];
  }

  async function load() {
    retry.hidden = true;
    status.textContent = 'Menyusun draf bab…';
    try {
      const result = await generate(conversation, signal.signal);
      if (signal.signal.aborted) return;
      if (!result?.chapters?.length || !result.chapters.every(chapter =>
        chapter?.id && typeof chapter.title === 'string' && typeof chapter.explanation === 'string')) {
        throw new Error('Draf belum berisi bab yang bisa dibaca.');
      }
      draft = result;
      const proposed = draft.title?.trim().slice(0, 180) || '';
      const [label, input] = field('Judul topik', sourceFileTitle.test(proposed) ? '' : proposed, 180);
      titleField = input;
      chapterFields = draft.chapters.map((chapter, index) => {
        const section = node('details');
        section.open = index === 0;
        const [name, title] = field('Judul bab', chapter.title, 180);
        const [body, explanation] = field('Isi bab', chapter.explanation, 20000, true);
        section.append(node('summary', `Bab ${index + 1} · ${chapter.title}`), name, body);
        return {section, title, explanation};
      });
      preview.replaceChildren(label, ...chapterFields.map(chapter => chapter.section));
      status.textContent = 'Tinjau judul dan isi bab.';
      primary.disabled = false;
    } catch (error) {
      if (signal.signal.aborted) return;
      status.textContent = error.message || 'Draf belum bisa disusun.';
      retry.hidden = false;
    }
  }
  retry.onclick = load;
  form.onsubmit = async event => {
    event.preventDefault();
    if (saving || !draft) return;
    const title = titleField.value.trim();
    if (!title || sourceFileTitle.test(title) || chapterFields.some(chapter =>
      !chapter.title.value.trim() || !chapter.explanation.value.trim())) {
      status.textContent = 'Isi judul topik dan setiap bab. Gunakan judul materi yang berbeda dari nama file.';
      return;
    }
    saving = true;
    primary.disabled = close.disabled = true;
    status.textContent = 'Menyimpan ke Catatan…';
    try {
      saved ||= await save({
        ...draft, title, chapters: draft.chapters.map((chapter, index) => ({
          ...chapter,
          title: chapterFields[index].title.value.trim(),
          explanation: chapterFields[index].explanation.value.trim(),
        })),
      }, conversation);
      open(saved);
      dialog.close();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      saving = false;
      primary.disabled = close.disabled = false;
    }
  };

  document.body.append(dialog);
  dialog.showModal();
  await load();
}
