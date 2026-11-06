import { validateExam } from './exam-engine.js';
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
export function installExamBuilder(host, editor, status, source) {
  const form = el('form'),
    title = el('input'),
    duration = el('input'),
    type = el('select'),
    question = el('textarea'),
    key = el('input'),
    options = el('textarea'),
    tolerance = el('input'),
    unit = el('input'),
    rubric = el('textarea'),
    explanation = el('textarea'),
    difficulty = el('select'),
    preview = el('div');
  form.className = 'exam-builder';
  title.value = 'Ujian · ' + source.name;
  duration.type = 'number';
  duration.value = 20;
  duration.min = 1;
  duration.max = 1440;
  question.maxLength = 8000;
  key.maxLength = 1000;
  tolerance.type = 'number';
  tolerance.min = 0;
  tolerance.step = 'any';
  tolerance.value = 0;
  unit.maxLength = 60;
  for (const [value, label] of [
    ['multiple', 'Pilihan ganda'],
    ['truefalse', 'Benar / salah'],
    ['numeric', 'Numerik'],
    ['short', 'Isian singkat'],
    ['essay', 'Esai'],
    ['case', 'Analisis kasus'],
  ]) {
    const o = el('option', label);
    o.value = value;
    type.append(o);
  }
  for (const [value, label] of [
    ['mixed', 'Campuran'],
    ['easy', 'Mudah'],
    ['medium', 'Sedang'],
    ['hard', 'Sulit'],
  ]) {
    const o = el('option', label);
    o.value = value;
    difficulty.append(o);
  }
  options.placeholder = 'Satu pilihan per baris';
  rubric.placeholder = 'Satu kriteria per baris: alasan yang tepat | 5';
  function label(text, input) {
    const node = el('label', text);
    input.setAttribute('aria-label', text);
    node.append(input);
    form.append(node);
    return node;
  }
  label('Judul ujian', title);
  label('Durasi (menit)', duration);
  label('Tingkat kesulitan', difficulty);
  label('Jenis soal', type);
  label('Pertanyaan', question);
  const optionLabel = label('Pilihan jawaban', options),
    keyLabel = label('Kunci jawaban', key),
    toleranceLabel = label('Toleransi angka', tolerance),
    unitLabel = label('Satuan', unit),
    rubricLabel = label('Rubrik dan bobot', rubric);
  label('Pembahasan', explanation);
  function fields() {
    optionLabel.hidden = type.value !== 'multiple';
    toleranceLabel.hidden = unitLabel.hidden = type.value !== 'numeric';
    rubricLabel.hidden = !['essay', 'case'].includes(type.value);
    keyLabel.hidden = ['essay', 'case'].includes(type.value);
    key.placeholder =
      type.value === 'multiple'
        ? 'A, B, C, ...'
        : type.value === 'truefalse'
          ? 'Benar atau Salah'
          : 'Jawaban yang tepat';
  }
  type.onchange = fields;
  fields();
  const changed = () => editor.dispatchEvent(new Event('input'));
  function list() {
    preview.replaceChildren();
    try {
      const bank = JSON.parse(editor.value);
      for (const [index, q] of bank.questions.entries()) {
        const row = el('p', `${index + 1}. ${q.question} (${q.type}) `),
          remove = el('button', 'Hapus');
        remove.type = 'button';
        remove.onclick = () => {
          bank.questions.splice(index, 1);
          editor.value = JSON.stringify(bank, null, 2);
          changed();
          list();
        };
        row.append(remove);
        preview.append(row);
      }
    } catch {
      preview.append(el('p', 'Format bank soal belum valid.'));
    }
  }
  const add = el('button', 'Tambahkan soal');
  add.type = 'submit';
  form.append(add);
  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const bank = JSON.parse(editor.value),
        q = {
          id: crypto.randomUUID(),
          type: type.value,
          question: question.value,
          explanation: explanation.value,
          topic: source.subject || source.name,
        };
      if (type.value === 'multiple') {
        q.options = options.value
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean);
        q.correctAnswer = key.value.trim().toUpperCase().charCodeAt(0) - 65;
      }
      if (type.value === 'truefalse') {
        const answer = key.value.trim().toLowerCase();
        if (!['true', 'false', 'benar', 'salah'].includes(answer))
          throw new Error('Kunci harus Benar atau Salah.');
        q.correctAnswer = ['true', 'benar'].includes(answer);
      }
      if (type.value === 'numeric') {
        q.correctAnswer = Number(key.value.replace(',', '.'));
        if (!key.value.trim()) throw new Error('Kunci numerik wajib diisi.');
        q.tolerance = Number(tolerance.value);
        q.unit = unit.value;
      }
      if (type.value === 'short') q.acceptedAnswers = [key.value];
      if (['essay', 'case'].includes(type.value))
        q.rubric = rubric.value
          .split('\n')
          .filter((v) => v.trim())
          .map((line) => {
            const parts = line.split('|');
            return { criterion: parts[0].trim(), maxScore: Number(parts[1]) };
          });
      delete bank.durationSeconds;
      Object.assign(bank, {
        title: title.value,
        durationMinutes: Number(duration.value),
        difficulty: difficulty.value,
        subject: source.subject || '',
      });
      bank.questions.push(q);
      validateExam(bank);
      editor.value = JSON.stringify(bank, null, 2);
      changed();
      list();
      question.value = '';
      key.value = '';
      status.textContent = `${bank.questions.length} soal tersimpan dalam draf.`;
    } catch (error) {
      status.textContent = error.message;
    }
  };
  for (const control of [title, duration, difficulty])
    control.onchange = () => {
      try {
        const bank = JSON.parse(editor.value);
        delete bank.durationSeconds;
        Object.assign(bank, {
          title: title.value,
          durationMinutes: Number(duration.value),
          difficulty: difficulty.value,
        });
        editor.value = JSON.stringify(bank, null, 2);
        changed();
      } catch {}
    };
  editor.addEventListener('input', list);
  host.append(form, preview);
  list();
}
