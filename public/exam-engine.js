const text = (value, max = 8000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const normalized = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
export function validateExam(raw) {
  if (
    !raw ||
    !text(raw.title, 200) ||
    !Array.isArray(raw.questions) ||
    !raw.questions.length ||
    raw.questions.length > 100
  )
    throw new Error('Ujian memerlukan judul dan 1–100 soal.');
  function question(q, index, depth = 0) {
    if (
      !q ||
      !text(q.question) ||
      ![
        'multiple',
        'truefalse',
        'numeric',
        'short',
        'essay',
        'case',
        'multipart',
      ].includes(q.type)
    )
      throw new Error(`Struktur soal ${index + 1} tidak valid.`);
    const result = {
      id: String(q.id || `q${index + 1}`),
      type: q.type,
      question: text(q.question),
      topic: text(q.topic, 200) || 'Umum',
      explanation: text(q.explanation),
      maxScore: Number(q.maxScore ?? 1),
    };
    if (!/^[\w.-]{1,100}$/.test(result.id))
      throw new Error('ID soal tidak valid.');
    if (
      !Number.isFinite(result.maxScore) ||
      result.maxScore <= 0 ||
      result.maxScore > 100
    )
      throw new Error('Bobot soal tidak valid.');
    if (q.type === 'multiple') {
      if (
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.length > 8 ||
        !Number.isInteger(q.correctAnswer) ||
        q.correctAnswer < 0 ||
        q.correctAnswer >= q.options.length
      )
        throw new Error('Pilihan atau kunci jawaban tidak valid.');
      result.options = q.options.map((v) => text(v, 2000));
      if (
        result.options.some((v) => !v) ||
        new Set(result.options.map(normalized)).size !== result.options.length
      )
        throw new Error('Pilihan kosong atau berulang.');
      result.correctAnswer = q.correctAnswer;
    }
    if (q.type === 'truefalse') {
      if (typeof q.correctAnswer !== 'boolean')
        throw new Error('Kunci benar/salah tidak valid.');
      result.correctAnswer = q.correctAnswer;
    }
    if (q.type === 'short') {
      if (
        !Array.isArray(q.acceptedAnswers) ||
        !q.acceptedAnswers.length ||
        q.acceptedAnswers.length > 20
      )
        throw new Error('Isian memerlukan jawaban yang diterima.');
      result.acceptedAnswers = q.acceptedAnswers
        .map((v) => text(v, 1000))
        .filter(Boolean);
      if (!result.acceptedAnswers.length)
        throw new Error('Kunci isian kosong.');
    }
    if (q.type === 'numeric') {
      if (
        typeof q.correctAnswer !== 'number' ||
        !Number.isFinite(q.correctAnswer)
      )
        throw new Error('Kunci numerik harus berupa angka terbatas.');
      const tolerance = Number(q.tolerance ?? 0),
        relativeTolerance = Number(q.relativeTolerance ?? 0);
      if (
        !Number.isFinite(tolerance) ||
        tolerance < 0 ||
        !Number.isFinite(relativeTolerance) ||
        relativeTolerance < 0 ||
        relativeTolerance > 1
      )
        throw new Error('Toleransi numerik tidak valid.');
      if (
        q.precision !== undefined &&
        (!Number.isInteger(q.precision) || q.precision < 0 || q.precision > 12)
      )
        throw new Error('Presisi harus 0–12.');
      Object.assign(result, {
        correctAnswer: q.correctAnswer,
        tolerance,
        relativeTolerance,
        unit: text(q.unit, 60),
        unitAliases: (Array.isArray(q.unitAliases) ? q.unitAliases : [])
          .slice(0, 20)
          .map((v) => text(v, 60))
          .filter(Boolean),
        unitOptional: q.unitOptional === true,
        ...(q.precision !== undefined ? { precision: q.precision } : {}),
      });
    }
    if (q.type === 'essay' || q.type === 'case') {
      if (!Array.isArray(q.rubric) || !q.rubric.length || q.rubric.length > 10)
        throw new Error('Esai/kasus memerlukan rubrik eksplisit.');
      result.rubric = q.rubric.map((r, i) => {
        if (
          !text(r.criterion, 500) ||
          !(Number(r.maxScore) > 0) ||
          Number(r.maxScore) > 100
        )
          throw new Error('Rubrik tidak valid.');
        return {
          id: `criterion-${i + 1}`,
          criterion: text(r.criterion, 500),
          maxScore: Number(r.maxScore),
        };
      });
      result.maxScore = result.rubric.reduce((sum, r) => sum + r.maxScore, 0);
      if (result.maxScore > 100)
        throw new Error('Total bobot rubrik maksimal 100.');
    }
    if (q.type === 'multipart') {
      if (
        depth ||
        !Array.isArray(q.parts) ||
        !q.parts.length ||
        q.parts.length > 10
      )
        throw new Error('Subsoal tidak valid.');
      result.parts = q.parts.map((part, i) => question(part, i, 1));
      if (new Set(result.parts.map((p) => p.id)).size !== result.parts.length)
        throw new Error('ID subsoal berulang.');
      result.maxScore = result.parts.reduce((sum, p) => sum + p.maxScore, 0);
      if (result.maxScore > 100)
        throw new Error('Total bobot subsoal maksimal 100.');
    }
    return result;
  }
  const questions = raw.questions.map((q, i) => question(q, i));
  if (new Set(questions.map((q) => q.id)).size !== questions.length)
    throw new Error('ID soal berulang.');
  const durationSeconds = Math.floor(
    Number(raw.durationSeconds ?? Number(raw.durationMinutes) * 60)
  );
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 60 ||
    durationSeconds > 86400
  )
    throw new Error('Durasi harus 1 menit–24 jam.');
  return {
    schemaVersion: 1,
    title: text(raw.title, 200),
    subject: text(raw.subject, 160),
    difficulty: ['easy', 'medium', 'hard', 'mixed'].includes(raw.difficulty)
      ? raw.difficulty
      : 'mixed',
    durationSeconds,
    questions,
  };
}
export function gradeQuestion(question, answer) {
  if (question.type === 'multipart') {
    const parts = question.parts.map((q, i) => gradeQuestion(q, answer?.[i]));
    return {
      status: parts.some((p) => p.status === 'pending') ? 'pending' : 'graded',
      score: parts.reduce((sum, p) => sum + p.score, 0),
      maxScore: question.maxScore,
      parts,
    };
  }
  if (question.type === 'essay' || question.type === 'case')
    return {
      status: normalized(answer) ? 'pending' : 'graded',
      score: 0,
      maxScore: question.maxScore,
      correct: false,
      explanation: normalized(answer)
        ? 'Menunggu penilaian AI berdasarkan rubrik.'
        : 'Tidak dijawab.',
    };
  let correct = false;
  if (question.type === 'multiple' || question.type === 'truefalse')
    correct = answer === question.correctAnswer;
  if (question.type === 'short')
    correct = question.acceptedAnswers.some(
      (value) => normalized(value) === normalized(answer)
    );
  if (question.type === 'numeric') {
    const match = String(answer ?? '')
      .trim()
      .match(/^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?)\s*([^\d]*)$/i);
    if (match) {
      let actual = Number(match[1].replace(',', '.')),
        expected = question.correctAnswer;
      const unit = normalized(match[2]),
        units = [question.unit, ...question.unitAliases].map(normalized);
      if (question.precision !== undefined) {
        actual = Number(actual.toFixed(question.precision));
        expected = Number(expected.toFixed(question.precision));
      }
      const tolerance = Math.max(
        question.tolerance,
        Math.abs(expected) * question.relativeTolerance
      );
      correct =
        Number.isFinite(actual) &&
        Math.abs(actual - expected) <=
          tolerance + Number.EPSILON * Math.max(1, Math.abs(expected)) * 4 &&
        (!question.unit
          ? unit === ''
          : units.includes(unit) || (question.unitOptional && !unit));
    }
  }
  return {
    status: 'graded',
    score: correct ? question.maxScore : 0,
    maxScore: question.maxScore,
    correct,
    explanation: question.explanation || '',
  };
}
export function startExam(
  definition,
  { sourceId = '', sourceVersion = 1, now = Date.now() } = {}
) {
  const exam = validateExam(definition);
  return {
    ...exam,
    id: crypto.randomUUID(),
    sourceId,
    sourceVersion,
    startedAt: now,
    deadlineAt: now + exam.durationSeconds * 1000,
    status: 'running',
    answers: {},
    flagged: [],
    currentIndex: 0,
  };
}
export function remainingSeconds(attempt, now = Date.now()) {
  return attempt.status === 'running'
    ? Math.max(0, Math.ceil((attempt.deadlineAt - now) / 1000))
    : 0;
}
export function submitExam(attempt, now = Date.now()) {
  if (attempt.status === 'submitted') return attempt;
  const definition = validateExam(attempt);
  return {
    ...attempt,
    ...definition,
    status: 'submitted',
    submittedAt: now,
    timedOut: now >= attempt.deadlineAt,
    results: definition.questions.map((q) =>
      gradeQuestion(q, attempt.answers[q.id])
    ),
  };
}
export function examScore(attempt) {
  const results = attempt.results || [];
  return {
    score: results.reduce((s, r) => s + r.score, 0),
    maxScore: attempt.questions.reduce((s, q) => s + q.maxScore, 0),
    pending: results.filter((r) => r.status === 'pending').length,
  };
}
export function examFromQuiz(quiz, title = 'Latihan dari kuis') {
  const questions = (quiz.questions || [])
    .map((q, index) =>
      q.type === 'truefalse'
        ? { ...q, type: 'truefalse' }
        : q.type === 'blanks'
          ? { ...q, type: 'short', acceptedAnswers: q.acceptedAnswers }
          : q.options && q.correctAnswer
            ? {
                id: `q${index + 1}`,
                type: 'multiple',
                question: q.question,
                options: Object.values(q.options),
                correctAnswer: Object.keys(q.options).indexOf(q.correctAnswer),
                explanation: q.correctExplanation,
                topic: q.question,
              }
            : null
    )
    .filter(Boolean);
  return validateExam({ title, durationMinutes: 30, questions });
}
