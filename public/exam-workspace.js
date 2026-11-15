import {
  validateExam,
  startExam,
  remainingSeconds,
  submitExam,
  examScore,
  examFromQuiz,
  selectExamQuestions,
} from './exam-engine.js';
import { lessonTitle } from './lesson-label.js';
import { installExamBuilder } from './exam-builder.js';
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
const button = (label, fn) => {
  const b = el('button', label);
  b.type = 'button';
  b.onclick = fn;
  return b;
};
export function renderExams(host, api) {
  host.classList.add('exam-page');
  const heading=el('header');heading.className='exam-heading';
  heading.append(el('h1','Ujian'),el('p','Susun latihan dari materimu, kerjakan dengan fokus, lalu pelajari pembahasannya.'));
  host.replaceChildren(heading);
  const source = api.getCurrentSource();
  const sourcePicker = el('select'); sourcePicker.setAttribute('aria-label','Sumber ujian');
  const empty = el('option','Pilih materi'); empty.value=''; sourcePicker.append(empty);
  for (const item of api.snapshot().sources) { const option=el('option',lessonTitle(item));option.value=item.id;option.selected=item.id===source?.id;sourcePicker.append(option); }
  sourcePicker.onchange=()=>{if(api.selectSource(sourcePicker.value))renderExams(host,api);};
  const sourceLabel=el('label','Materi ujian');sourceLabel.className='exam-source';sourceLabel.append(sourcePicker);host.append(sourceLabel);
  if (!source) {
    const empty=el('section');empty.className='exam-empty';
    empty.append(el('img'));const image=empty.querySelector('img');image.src='/mascot.svg';image.alt='Maskot OmniLearn';image.width=100;image.height=100;
    empty.append(el('h2','Latihan dimulai dari satu materi'),el('p','Pilih materi tersimpan atau tambahkan sumber. Setelah itu, buat soal sendiri atau gunakan kuis yang sudah ada.'),button('Pilih atau tambah materi',()=>api.navigate('notes')));host.append(empty);
    return;
  }
  source.exams ||= [];
  const layout=el('div');layout.className='exam-layout';
  const content = el('section');content.className='exam-content';
  const guide=el('aside');guide.className='exam-guide';guide.append(el('h2','Persiapan ujian'));
  const steps=el('ol');for(const copy of ['Periksa sumber dan bank soal.','Atur jumlah soal yang tersedia.','Kerjakan, lalu tinjau jawaban.'])steps.append(el('li',copy));
  guide.append(steps,el('p','Soal objektif dinilai otomatis. Esai dan analisis kasus menunggu penilaian AI yang diminta secara terpisah.'));
  layout.append(content,guide);host.append(layout);
  function save() {
    api.persist();
  }
  function show(attempt) {
    if (!content.isConnected) return;
    if (attempt.status === 'running' && !remainingSeconds(attempt)) {
      Object.assign(attempt, submitExam(attempt));
      save();
    }
    content.replaceChildren();
    content.classList.add('exam-attempt');guide.hidden=true;sourceLabel.hidden=true;
    if (attempt.status === 'submitted') {
      const score = examScore(attempt);
      content.append(
        el('h2', attempt.title),
        el(
          'p',
          `${score.score} / ${score.maxScore} poin · ${score.pending} soal menunggu penilaian AI. Nilai dapat berubah setelah penilaian rubrik.`
        )
      );
      const topics = new Map();
      async function assess(question, answer, row, apply) {
        const status = el('p', 'Meminta penilaian…'),
          controller = new AbortController();
        row.append(status);
        const observer = new MutationObserver(() => {
          if (!row.isConnected) controller.abort();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        try {
          if (attempt.sourceVersion !== source.version) throw new Error('Ujian ini memakai versi sumber lama. Penilaian AI untuk arsip belum tersedia; jawaban tetap tersimpan.');
          await api.ensureAnalysis(controller.signal);
          const response = await safeRequestJson(
            '/api/exam/grade',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question,
                answer,
                material: source.text,
                materialId: source.id,
                sessionId,
                ...api.sourceRequest(),
              }),
            },
            {
              timeoutMs: 65000,
              stageContext: 'exam-grade',
              externalSignal: controller.signal,
            }
          );
          apply(response.grade);
          save();
          show(attempt);
        } catch (error) {
          status.textContent = `Belum dinilai: ${error.message}. Jawaban tetap tersimpan.`;
        } finally {
          observer.disconnect();
        }
      }
      attempt.questions.forEach((q, i) => {
        const result = attempt.results[i],
          row = el('article');
        row.className = 'exam-result';
        row.append(
          el('h3', `${i + 1}. ${q.question}`),
          el(
            'p',
            `Jawaban: ${JSON.stringify(attempt.answers[q.id] ?? 'Belum dijawab')}`
          ),
          el(
            'p',
            `${result.score}/${result.maxScore} · ${result.status === 'pending' ? 'Menunggu evaluasi' : result.status === 'ai-reviewed' ? 'Penilaian AI' : 'Nilai objektif'}`
          )
        );
        row.append(el('p', result.explanation || q.explanation || ''));
        const topic = topics.get(q.topic) || { score: 0, max: 0 };
        if (result.status !== 'pending') {
          topic.score += result.score;
          topic.max += result.maxScore;
          topics.set(q.topic, topic);
        }
        if (
          result.status === 'pending' &&
          (q.type === 'essay' || q.type === 'case')
        )
          row.append(
            button('Nilai dengan AI', () =>
              assess(q, attempt.answers[q.id], row, (grade) => {
                attempt.results[i] = grade;
              })
            )
          );
        if (result.parts)
          result.parts.forEach((p, j) => {
            const partRow = el('section');
            partRow.append(
              el('p', `Bagian ${j + 1}: ${p.score}/${p.maxScore} · ${p.status}`)
            );
            if (
              p.status === 'pending' &&
              ['essay', 'case'].includes(q.parts[j].type)
            )
              partRow.append(
                button(`Nilai bagian ${j + 1} dengan AI`, () =>
                  assess(
                    q.parts[j],
                    attempt.answers[q.id]?.[j],
                    partRow,
                    (grade) => {
                      result.parts[j] = grade;
                      result.score = result.parts.reduce(
                        (sum, part) => sum + part.score,
                        0
                      );
                      result.status = result.parts.some(
                        (part) => part.status === 'pending'
                      )
                        ? 'pending'
                        : 'ai-reviewed';
                    }
                  )
                )
              );
            row.append(partRow);
          });
        content.append(row);
      });
      const weak = [...topics]
        .filter(([, v]) => v.score < v.max * 0.6)
        .map(([name]) => name);
      content.append(
        el(
          'p',
          weak.length
            ? 'Topik untuk diulang: ' + weak.join(', ')
            : 'Tidak ada topik objektif di bawah 60% pada hasil saat ini.'
        )
      );
      content.append(button('Kembali ke daftar', () => renderExams(host, api)));
      return;
    }
    const timer = el('p');
    timer.setAttribute('role', 'timer');
    const update = () => {
      if (!timer.isConnected) return clearInterval(interval);
      const remaining = remainingSeconds(attempt);
      timer.textContent = `Sisa waktu ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
      if (!remaining) {
        clearInterval(interval);
        Object.assign(attempt, submitExam(attempt));
        save();
        show(attempt);
      }
    };
    const interval = setInterval(update, 1000);
    const q = attempt.questions[attempt.currentIndex],
      navigation = el('nav');
    navigation.className = 'panel-actions exam-question-nav';
    navigation.setAttribute('aria-label', 'Navigasi soal');
    attempt.questions.forEach((question, i) =>
      navigation.append(
        button(
          `${i + 1}${attempt.flagged.includes(question.id) ? ' ⚑' : ''}`,
          () => {
            attempt.currentIndex = i;
            save();
            show(attempt);
          }
        )
      )
    );
    content.append(
      el('h2', attempt.title),
      timer,
      el(
        'p',
        'Waktu terus berjalan saat halaman ditutup. Ujian otomatis dikumpulkan ketika waktunya habis.'
      ),
      navigation,
      el('h3', q.question)
    );
    function field(question, answer, onChange, parent) {
      if (question.type === 'multipart') {
        let current = structuredClone(answer || {});
        question.parts.forEach((part, i) => {
          const section = el('section');
          section.append(el('h4', part.question));
          field(
            part,
            current[i],
            (value) => {
              current[i] = value;
              onChange(structuredClone(current));
            },
            section
          );
          parent.append(section);
        });
        return;
      }
      if (question.type === 'multiple' || question.type === 'truefalse') {
        const options =
          question.type === 'multiple' ? question.options : ['Benar', 'Salah'];
        options.forEach((option, i) => {
          const label = el('label'),
            radio = el('input');
          radio.type = 'radio';
          radio.name = `answer-${question.id}`;
          const value = question.type === 'multiple' ? i : i === 0;
          radio.checked = answer === value;
          radio.onchange = () => onChange(value);
          label.className='exam-answer-option';
          label.append(radio, document.createTextNode(option));
          parent.append(label);
        });
      } else {
        const input = el(
          question.type === 'numeric' || question.type === 'short'
            ? 'input'
            : 'textarea'
        );
        input.value = answer ?? '';
        input.setAttribute('aria-label', 'Jawaban');
        input.maxLength = 8000;
        input.oninput = () => onChange(input.value);
        parent.append(input);
      }
    }
    field(
      q,
      attempt.answers[q.id],
      (answer) => {
        if (!remainingSeconds(attempt)) {
          Object.assign(attempt, submitExam(attempt));
          save();
          show(attempt);
          return;
        }
        attempt.answers[q.id] = answer;
        save();
      },
      content
    );
    const actions = el('div');
    actions.className = 'panel-actions';
    actions.append(
      button('Sebelumnya', () => {
        attempt.currentIndex = Math.max(0, attempt.currentIndex - 1);
        save();
        show(attempt);
      }),
      button('Tandai tinjau', () => {
        attempt.flagged = attempt.flagged.includes(q.id)
          ? attempt.flagged.filter((id) => id !== q.id)
          : [...attempt.flagged, q.id];
        save();
        show(attempt);
      }),
      button('Berikutnya', () => {
        attempt.currentIndex = Math.min(
          attempt.questions.length - 1,
          attempt.currentIndex + 1
        );
        save();
        show(attempt);
      }),
      button('Kumpulkan', () => {
        if (confirm('Kumpulkan ujian? Jawaban tersimpan dan akan dinilai.')) {
          Object.assign(attempt, submitExam(attempt));
          save();
          show(attempt);
        }
      })
    );
    actions.lastElementChild.classList.add('primary');
    actions.children[0].disabled=attempt.currentIndex===0;
    actions.children[2].disabled=attempt.currentIndex===attempt.questions.length-1;
    content.append(actions);
    update();
  }
  const attempts=el('section');attempts.className='exam-history';
  if(source.exams.length)attempts.append(el('h2','Percobaan tersimpan'));
  content.append(attempts);
  for (const attempt of [...source.exams].reverse())
    attempts.append(
      button(
        `${attempt.title} · ${attempt.status === 'running' ? 'Lanjutkan' : 'Hasil'}`,
        () => show(attempt)
      )
    );
  const editor = el('textarea');
  editor.setAttribute('aria-label', 'Bank soal JSON');
  editor.className = 'exam-bank';
  editor.value = JSON.stringify(
    {
      title: 'Ujian · ' + lessonTitle(source),
      durationMinutes: 20,
      questions: [],
    },
    null,
    2
  );
  const status = el('p');
  status.setAttribute('role', 'status');
  if (source.examDraft) editor.value = source.examDraft;
  editor.oninput = () => {
    source.examDraft = editor.value;
    save();
  };
  const savedBanks=el('section');savedBanks.className='exam-saved-banks';savedBanks.append(el('h2','Bank soal tersimpan'));
  for(const bank of source.examBanks || []) savedBanks.append(button(`${bank.title} · ${bank.questions.length} soal`,()=>{editor.value=JSON.stringify(bank,null,2);editor.dispatchEvent(new Event('input'));status.textContent='Bank dimuat ke draf.';}));
  savedBanks.append(button('Simpan bank soal',async()=>{
    try { const bank=validateExam(JSON.parse(editor.value)); (source.examBanks ||= []).push({...bank,id:crypto.randomUUID(),savedAt:Date.now(),sourceVersion:source.version});await api.persistAsync();renderExams(host,api); }
    catch(error){status.textContent='Belum tersimpan: '+error.message;}
  })); content.append(savedBanks);
  const builder=el('details');builder.className='exam-author';builder.open=!(source.examDraft || source.examBanks?.length || Object.keys(source.generated || {}).length);
  builder.append(el('summary','Susun atau edit soal'));
  content.append(builder);installExamBuilder(builder, editor, status, source);
  const selection=el('section'),count=el('input'),preset=el('select'),mixFields=el('div'),mix={};
  selection.className='exam-selection';
  count.type='number';count.min=1;count.max=100;count.placeholder='Semua soal';count.setAttribute('aria-label','Jumlah soal ujian');
  for(const [value,label] of [['all','Pilih jumlah dari bank'],['mix','20 PG + 5 isian + 5 esai (dapat diubah)']]){const option=el('option',label);option.value=value;preset.append(option);}
  preset.setAttribute('aria-label','Komposisi ujian');mixFields.hidden=true;
  for(const [type,label,amount] of [['multiple','Jumlah pilihan ganda',20],['short','Jumlah isian',5],['essay','Jumlah esai',5]]){const row=el('label',label),input=el('input');input.type='number';input.min=0;input.max=100;input.value=amount;input.setAttribute('aria-label',label);row.append(input);mixFields.append(row);mix[type]=input;}
  preset.onchange=()=>{mixFields.hidden=preset.value!=='mix';countLabel.hidden=preset.value==='mix';};
  const compositionLabel=el('label','Komposisi'),countLabel=el('label','Jumlah soal');compositionLabel.append(preset);countLabel.append(count);
  selection.append(el('h2','Atur latihan'),compositionLabel,countLabel,mixFields,el('p','Hanya soal yang tersedia di bank yang digunakan. Bank asli tetap tersimpan.'));content.append(selection);
  const advanced = el('details');
  advanced.append(
    el('summary', 'Impor / edit bank soal lanjutan (JSON)'),
    editor
  );
  content.append(
    advanced
  );
  const startButton=button('Mulai ujian', () => {
      try {
        const definition = selectExamQuestions(JSON.parse(editor.value),preset.value==='mix'?{mix:Object.fromEntries(Object.entries(mix).map(([key,input])=>[key,Number(input.value)]))}:{count:count.value});
        const bankVersion=JSON.parse(editor.value).sourceVersion;
        if(bankVersion && bankVersion!==source.version) throw new Error('Bank berasal dari versi sumber lain. Periksa dan simpan ulang bank untuk versi aktif.');
        const attempt = startExam(definition, {
          sourceId: source.id,
          sourceVersion: source.version,
        });
        source.exams.push(attempt);
        save();
        show(attempt);
      } catch (error) {
        status.textContent = error.message;
      }
    });
  startButton.classList.add('primary');
  content.insertBefore(selection,savedBanks);selection.after(startButton);
  content.append(
    button('Ambil kuis materi tersimpan', () => {
      try {
        const quiz = Object.values(source.generated || {})
          .map((entry) => entry.quizState || entry.quizV4)
          .find((value) => value?.questions?.length);
        if (!quiz)
          throw new Error(
            'Buat kuis terlebih dahulu, atau edit bank soal manual.'
          );
        editor.value = JSON.stringify(
          examFromQuiz(quiz, 'Ujian · ' + lessonTitle(source)),
          null,
          2
        );
        editor.dispatchEvent(new Event('input'));
        status.textContent = 'Bank kuis siap diperiksa sebelum mulai.';
      } catch (error) {
        status.textContent = error.message;
      }
    }),
    status
  );
}
window.OmniExams = { render: renderExams };
