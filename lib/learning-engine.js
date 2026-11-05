import { ThinkingLevel } from '@google/genai';

export const SUMMARY_STYLES = {
  ringkasan_singkat: {
    label: 'Ringkasan singkat',
    instruction: `Gaya Ringkasan: **Ringkasan Singkat (Intisari Cepat)**
- Fokus pada gagasan sentral dan kesimpulan utama dalam 3–5 bagian pendek yang padat.
- Sajikan definisi inti, rumus utama (jika ada), dan hubungan kunci tanpa penjelasan bertele-tele.
- Cocok untuk tinjauan cepat 3 menit sebelum kelas atau diskusi.`
  },
  ringkasan_lengkap: {
    label: 'Ringkasan lengkap',
    instruction: `Gaya Ringkasan: **Ringkasan Lengkap & Komprehensif**
- Cakup seluruh bagian materi secara proporsional dari awal hingga akhir.
- Bedakan secara tegas antara **Gagasan Utama**, **Penjelasan Mekanisme**, **Data/Bukti Pendukung**, **Rumus/Persamaan**, dan **Contoh Konkret**.
- Pertahankan seluruh terminologi teknis asli beserta penjelasan artinya.`
  },
  catatan_kuliah: {
    label: 'Catatan kuliah',
    instruction: `Gaya Ringkasan: **Catatan Kuliah Akademis Terstruktur**
- Susun layaknya catatan kuliah mahasiswa teladan: gunakan hierarki topik, subtopik, definisi formal, alur logika/mekanisme, contoh kasus, dan catatan kaki konseptual.
- Sertakan bagian **Istilah & Definisi Penting** serta **Pertanyaan Refleksi Mandiri** di akhir catatan.`
  },
  poin_ujian: {
    label: 'Poin penting ujian',
    instruction: `Gaya Ringkasan: **Poin Penting Persiapan Ujian (Exam Cram Sheet)**
- Fokus pada konsep yang paling sering diujikan: definisi kunci, perbandingan konsep yang sering tertukar, rumus wajib hafal beserta arti simbolnya, syarat berlakunya suatu hukum/teori, dan jebakan miskonsepsi umum.
- Gunakan format yang mudah dipindai secara visual untuk pengulangan cepat.`
  },
  per_bab: {
    label: 'Penjelasan per bab',
    instruction: `Gaya Ringkasan: **Penjelasan Terstruktur Per Bab / Bagian / Halaman**
- Organisasikan pembahasan secara berurutan mengikuti pembagian bab, bagian, atau halaman (\`[Halaman X]\`) pada materi sumber.
- Untuk setiap bab/bagian, jelaskan: (1) Pokok Bahasan Utama, (2) Konsep & Mekanisme Kunci, (3) Rumus/Contoh Penting, dan (4) Keterkaitan dengan bagian berikutnya.
- Jangan mengarang bab yang tidak ada pada materi.`
  },
  konsep_mekanisme: {
    label: 'Ringkasan konsep dan mekanisme',
    instruction: `Gaya Ringkasan: **Ringkasan Konsep dan Mekanisme Sebab-Akibat**
- Fokus mendalam pada *apa* konsepnya dan *bagaimana/mengapa* mekanismenya bekerja.
- Uraikan rantai proses langkah demi langkah (sebab → proses/mekanisme → akibat), variabel yang terlibat, kondisi batas/pengecualian, serta contoh penerapannya di dunia nyata.`
  }
};

/**
 * Infers the conceptual explanation depth (BASIC, INTERMEDIATE, ADVANCED)
 * and corresponding Gemini ThinkingLevel from the learner's message.
 */
export function inferExplanationDepth(message, hasMaterial = false) {
  const clean = String(message || '').trim();
  const wordCount = clean ? clean.split(/\s+/).length : 0;

  const explicitBasicPattern = /\b(secara sederhana|untuk pemula|anak sd|anak smp|bahasa sehari-hari|singkat saja|ringkas saja|intinya saja|mudah dipahami|dasar sekali)\b/i;
  const advancedPattern = /\b(mekanisme|relativitas khusus|relativitas umum|kuantum|termodinamika|elektrodinamika|turunkan|derivasi|pembuktian|buktikan|analisis kritis|evaluasi kritis|metodologi|epistemologi|paradigma|kompleksitas|asymptotic|diferensial|integral|stokiometri|patofisiologi|farmakokinetik|makroekonomi|mikroekonomi|ekonometrika|historiografi|batasan dan pengecualian|secara mendalam|secara teknis|secara matematis|persamaan matematis)\b/i;
  const analyticalPattern = /\b(analisis|evaluasi|kritik|bandingkan|perbandingan|hipotesis|riset|penelitian|argumen|sebab[\s-]akibat|implikasi|sintesis|studi kasus|mengapa dan bagaimana)\b/i;
  const basicQuestionPattern = /^(apa itu|siapa itu|kapan|di mana|dimana|berapa|definisi dari|arti kata|jelaskan mengapa langit berwarna biru|mengapa langit berwarna biru|kenapa langit biru|contoh singkat)\b/i;

  if (explicitBasicPattern.test(clean)) {
    return {
      depth: 'BASIC',
      thinkingLevel: ThinkingLevel.LOW,
      guidance: 'Tingkat kedalaman: BASIC. Gunakan bahasa sehari-hari yang sangat jernih, kalimat pendek, analogi akrab, dan jelaskan ide paling mendasar terlebih dahulu tanpa jargon berat.'
    };
  }

  if (advancedPattern.test(clean) || (analyticalPattern.test(clean) && wordCount >= 8) || clean.length > 280) {
    return {
      depth: 'ADVANCED',
      thinkingLevel: ThinkingLevel.HIGH,
      guidance: 'Tingkat kedalaman: ADVANCED. Berikan penjelasan mekanisme secara rinci dan sistematis, gunakan terminologi ilmiah/teknis yang presisi (jelaskan artinya saat pertama kali muncul), sertakan persamaan matematis/ilmiah yang relevan (dalam format LaTeX $...$ atau $$...$$), analisis kritis, serta jelaskan batasan, asumsi, atau pengecualian konsep tersebut.'
    };
  }

  if (!hasMaterial && wordCount <= 9 && basicQuestionPattern.test(clean)) {
    return {
      depth: 'BASIC',
      thinkingLevel: ThinkingLevel.LOW,
      guidance: 'Tingkat kedalaman: BASIC–INTERMEDIATE. Langsung jawab inti pertanyaan dengan bahasa yang mengalir alami, jelaskan konsep dan alasan ilmiahnya secara lugas, berikan satu contoh nyata sehari-hari, dan jangan membuat esai yang terlalu panjang.'
    };
  }

  return {
    depth: 'INTERMEDIATE',
    thinkingLevel: ThinkingLevel.MEDIUM,
    guidance: 'Tingkat kedalaman: INTERMEDIATE. Jelaskan konsep inti dan mekanisme kerjanya secara jernih, tunjukkan hubungan antar-ide, perkenalkan istilah teknis dengan penjelasan yang mudah dicerna, dan sertakan contoh relevan dari kehidupan nyata.'
  };
}

/**
 * Selects the most relevant material sections/pages for a query, preserving [Halaman X] markers.
 */
export function selectRelevantMaterialExcerpt(fullMaterial, queryText, maxChars = 18000) {
  const cleanMaterial = String(fullMaterial || '').trim().slice(0, 50000);
  if (!cleanMaterial || cleanMaterial.length <= maxChars) return cleanMaterial;

  const keywords = String(queryText || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !['yang', 'dari', 'untuk', 'pada', 'dengan', 'adalah', 'dalam', 'bagaimana', 'mengapa', 'jelaskan', 'apakah', 'sebutkan'].includes(w));

  // Split by [Halaman X] blocks if present so page references remain intact
  const hasPageMarkers = /\[Halaman\s+\d+\]/i.test(cleanMaterial);
  const chunks = hasPageMarkers
    ? cleanMaterial.split(/(?=\[Halaman\s+\d+\])/i).map(c => c.trim()).filter(Boolean)
    : cleanMaterial.split(/\n{2,}/).map(c => c.trim()).filter(Boolean);

  if (!keywords.length) {
    // Evenly sample across the document if there are no specific keywords (e.g., general summary/plan)
    return sampleMaterialEvenly(chunks, maxChars);
  }

  // Also check if user explicitly asked for a page number, e.g., "halaman 3" or "hal 2"
  const requestedPages = new Set();
  const pageMatches = String(queryText || '').matchAll(/\b(?:halaman|hal\.?|page)\s*(\d+)\b/gi);
  for (const m of pageMatches) {
    requestedPages.add(Number(m[1]));
  }

  const scored = chunks.map((chunk, idx) => {
    const lower = chunk.toLowerCase();
    let score = idx === 0 ? 2 : 0;
    const pageTagMatch = chunk.match(/^\[Halaman\s+(\d+)\]/i);
    const pageNum = pageTagMatch ? Number(pageTagMatch[1]) : null;

    if (pageNum && requestedPages.has(pageNum)) {
      score += 50;
    }
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Count occurrences up to 3
        const occurrences = Math.min(3, lower.split(kw).length - 1);
        score += 3 + occurrences;
      }
    }
    return { chunk, idx, score };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  const selected = [];
  let total = 0;
  for (const item of scored) {
    if (total + item.chunk.length + 2 > maxChars) {
      if (selected.length === 0) {
        selected.push({ ...item, chunk: item.chunk.slice(0, maxChars) });
      }
      continue;
    }
    selected.push(item);
    total += item.chunk.length + 2;
  }
  selected.sort((a, b) => a.idx - b.idx);
  return selected.map(s => s.chunk).join('\n\n') || cleanMaterial.slice(0, maxChars);
}

export function sampleMaterialEvenly(chunks, maxChars = 24000) {
  if (!Array.isArray(chunks) || !chunks.length) return '';
  const joined = chunks.join('\n\n');
  if (joined.length <= maxChars) return joined;

  const selected = [];
  let total = 0;
  const step = Math.max(1, Math.floor(chunks.length / 10));
  const visited = new Set();

  for (let i = 0; i < chunks.length; i += step) {
    if (total + chunks[i].length + 2 <= maxChars) {
      selected.push({ idx: i, chunk: chunks[i] });
      total += chunks[i].length + 2;
      visited.add(i);
    }
  }
  for (let i = 0; i < chunks.length; i++) {
    if (visited.has(i)) continue;
    if (total + chunks[i].length + 2 <= maxChars) {
      selected.push({ idx: i, chunk: chunks[i] });
      total += chunks[i].length + 2;
    }
  }
  selected.sort((a, b) => a.idx - b.idx);
  return selected.map(s => s.chunk).join('\n\n').slice(0, maxChars);
}

export function sanitizeJsonLatexEscapes(jsonCandidate) {
  const s = String(jsonCandidate || '');
  return s.replace(/\\\\|\\([a-zA-Z]+)|\\(.)/g, (match, word, singleChar) => {
    if (match === '\\\\') return '\\\\';
    if (word) {
      if (word.length === 1 && ['b', 'f', 'n', 'r', 't'].includes(word)) {
        return match;
      }
      if (/^u[0-9a-fA-F]{4}/.test(word)) {
        return '\\' + word;
      }
      return '\\\\' + word;
    }
    if (singleChar && ['"', '\\', '/'].includes(singleChar)) {
      return match;
    }
    return '\\\\' + (singleChar || '');
  });
}

function tryParseJsonWithLatex(str) {
  const trimmed = String(str || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (_) {}
  try {
    return JSON.parse(sanitizeJsonLatexEscapes(trimmed));
  } catch (_) {}
  // Also try removing trailing commas before } or ]
  try {
    const noTrailingCommas = sanitizeJsonLatexEscapes(trimmed).replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(noTrailingCommas);
  } catch (_) {}
  return null;
}

/**
 * Extracts a JSON block or object/array from raw AI text safely, preserving LaTeX commands.
 */
export function extractJsonFromText(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  // Try fenced ```json ... ``` first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    const parsedFence = tryParseJsonWithLatex(fenceMatch[1]);
    if (parsedFence) return parsedFence;
  }

  // Try direct JSON parse
  const direct = tryParseJsonWithLatex(text);
  if (direct) return direct;

  // Try locating the outermost { ... } or [ ... ]
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket > firstBracket && (firstBrace === -1 || firstBracket < firstBrace)) {
    const arrParsed = tryParseJsonWithLatex(text.slice(firstBracket, lastBracket + 1));
    if (arrParsed) return arrParsed;
  }
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objParsed = tryParseJsonWithLatex(text.slice(firstBrace, lastBrace + 1));
    if (objParsed) return objParsed;
  }
  return null;
}

/**
 * Parses and validates Quiz questions from Gemini JSON response, guaranteeing
 * 4 options (A-D), valid answer key, and specific wrong-option explanations.
 */
export function normalizeQuizData(rawOutput, requestedCount = 10, defaultDifficulty = 'campuran') {
  const parsed = typeof rawOutput === 'string' ? extractJsonFromText(rawOutput) : rawOutput;
  const rawList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

  const seenQuestions = new Set();
  const questions = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const questionText = String(item.question || item.pertanyaan || '').trim();
    if (!questionText) continue;

    const normKey = questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestions.has(normKey)) continue;
    seenQuestions.add(normKey);

    const rawOpts = item.options || item.pilihan || {};
    const options = {
      A: String(rawOpts.A || rawOpts.a || (Array.isArray(rawOpts) ? rawOpts[0] : '') || '').replace(/^[A-Da-d][\.\)]\s*/, '').trim(),
      B: String(rawOpts.B || rawOpts.b || (Array.isArray(rawOpts) ? rawOpts[1] : '') || '').replace(/^[A-Da-d][\.\)]\s*/, '').trim(),
      C: String(rawOpts.C || rawOpts.c || (Array.isArray(rawOpts) ? rawOpts[2] : '') || '').replace(/^[A-Da-d][\.\)]\s*/, '').trim(),
      D: String(rawOpts.D || rawOpts.d || (Array.isArray(rawOpts) ? rawOpts[3] : '') || '').replace(/^[A-Da-d][\.\)]\s*/, '').trim()
    };

    if (!options.A || !options.B || !options.C || !options.D) continue;

    let correct = String(item.correctAnswer || item.answer || item.kunci || 'A').trim().toUpperCase().charAt(0);
    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      correct = 'A';
    }

    const diffRaw = String(item.difficulty || item.tingkat || defaultDifficulty).toLowerCase();
    const difficultyLabel = diffRaw.includes('mudah') || diffRaw.includes('easy')
      ? 'Mudah'
      : diffRaw.includes('sulit') || diffRaw.includes('hard')
        ? 'Sulit'
        : 'Sedang';

    const correctExplanation = String(
      item.correctExplanation ||
      item.explanation ||
      item.pembahasan ||
      `Pilihan ${correct} (${options[correct]}) merupakan jawaban yang paling tepat sesuai konsep materi.`
    ).trim();

    const rawOptExp = item.optionExplanations || item.alasanPilihan || {};
    const optionExplanations = {};
    for (const letter of ['A', 'B', 'C', 'D']) {
      if (letter === correct) {
        optionExplanations[letter] = String(rawOptExp[letter] || rawOptExp[letter.toLowerCase()] || correctExplanation).trim();
      } else {
        optionExplanations[letter] = String(
          rawOptExp[letter] ||
          rawOptExp[letter.toLowerCase()] ||
          `Pilihan ${letter} (${options[letter]}) kurang tepat karena tidak sesuai dengan mekanisme atau definisi utama yang ditanyakan pada soal.`
        ).trim();
      }
    }

    questions.push({
      id: questions.length + 1,
      difficulty: difficultyLabel,
      question: questionText,
      options,
      correctAnswer: correct,
      correctExplanation,
      optionExplanations
    });

    if (questions.length >= requestedCount) break;
  }

  return questions;
}

export function formatQuizToMarkdown(questions, difficultyLabel = 'Campuran') {
  if (!Array.isArray(questions) || !questions.length) return '';
  const lines = [
    `**Tingkat Kesulitan:** ${difficultyLabel} · **Jumlah Soal:** ${questions.length} Soal`,
    ''
  ];

  for (const q of questions) {
    lines.push(`### ${q.id}. [${q.difficulty}] ${q.question}`);
    lines.push(`- **A.** ${q.options.A}`);
    lines.push(`- **B.** ${q.options.B}`);
    lines.push(`- **C.** ${q.options.C}`);
    lines.push(`- **D.** ${q.options.D}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('### Kunci Jawaban & Pembahasan');
  lines.push('');
  for (const q of questions) {
    lines.push(`- **Soal ${q.id}: Jawaban ${q.correctAnswer}** — ${q.correctExplanation}`);
  }
  return lines.join('\n');
}

/**
 * Parses and validates Flashcard items from Gemini JSON response.
 */
export function normalizeFlashcardsData(rawOutput) {
  const parsed = typeof rawOutput === 'string' ? extractJsonFromText(rawOutput) : rawOutput;
  const rawList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.cards)
      ? parsed.cards
      : [];

  const seenFronts = new Set();
  const cards = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const front = String(item.front || item.depan || item.question || '').trim();
    const back = String(item.back || item.belakang || item.answer || '').trim();
    if (!front || !back) continue;

    const normKey = front.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenFronts.has(normKey)) continue;
    seenFronts.add(normKey);

    const category = String(item.category || item.kategori || 'Konsep Inti').trim();
    cards.push({
      id: cards.length + 1,
      category,
      front,
      back
    });
  }

  return cards;
}

export function formatFlashcardsToMarkdown(cards) {
  if (!Array.isArray(cards) || !cards.length) return '';
  return cards.map(c => [
    `### Kartu ${c.id} · *${c.category}*`,
    `- **Depan (Pertanyaan / Konsep):** ${c.front}`,
    `- **Belakang (Jawaban Inti):** ${c.back}`
  ].join('\n')).join('\n\n');
}

/**
 * Parses and validates Concept Map hierarchical tree from Gemini JSON response.
 */
export function normalizeConceptMapData(rawOutput) {
  const parsed = typeof rawOutput === 'string' ? extractJsonFromText(rawOutput) : rawOutput;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const centralTopic = String(parsed.centralTopic || parsed.topikUtama || '').trim();
  const rawBranches = Array.isArray(parsed.branches || parsed.cabangUtama) ? (parsed.branches || parsed.cabangUtama) : [];
  if (!centralTopic || !rawBranches.length) return null;

  const branches = rawBranches.map((b, idx) => {
    const title = String(b?.title || b?.nama || `Konsep Utama ${idx + 1}`).trim();
    const relationToCenter = String(b?.relationToCenter || b?.hubunganKePusat || 'mencakup').trim();
    const explanation = String(b?.explanation || b?.penjelasan || '').trim();
    const example = String(b?.example || b?.contoh || '').trim();
    const rawSubs = Array.isArray(b?.subconcepts || b?.subkonsep) ? (b.subconcepts || b.subkonsep) : [];

    const subconcepts = rawSubs.map((s, sIdx) => ({
      id: `${idx + 1}-${sIdx + 1}`,
      title: String(s?.title || s?.nama || `Subkonsep ${idx + 1}.${sIdx + 1}`).trim(),
      relation: String(s?.relation || s?.hubungan || 'terkait dengan').trim(),
      detail: String(s?.detail || s?.penjelasan || '').trim(),
      causeEffect: String(s?.causeEffect || s?.sebabAkibat || '').trim(),
      example: String(s?.example || s?.contoh || '').trim()
    })).filter(s => s.title);

    return {
      id: `branch-${idx + 1}`,
      title,
      relationToCenter,
      explanation,
      example,
      subconcepts
    };
  }).filter(b => b.title);

  const rawRels = Array.isArray(parsed.relationships || parsed.hubunganAntarKonsep)
    ? (parsed.relationships || parsed.hubunganAntarKonsep)
    : [];
  const relationships = rawRels.map(r => ({
    from: String(r?.from || r?.konsepA || '').trim(),
    relation: String(r?.relation || r?.hubungan || 'memengaruhi').trim(),
    to: String(r?.to || r?.konsepB || '').trim(),
    explanation: String(r?.explanation || r?.penjelasan || '').trim()
  })).filter(r => r.from && r.to);

  const summary = String(parsed.summary || parsed.intisari || '').trim();

  return {
    centralTopic,
    summary,
    branches,
    relationships
  };
}

export function formatConceptMapToMarkdown(mapData) {
  if (!mapData || !mapData.centralTopic) return '';
  const lines = [
    `### Topik Pusat: ${mapData.centralTopic}`,
    ''
  ];

  for (const b of mapData.branches) {
    lines.push(`- **${b.title}** *(${b.relationToCenter})*: ${b.explanation}${b.example ? ` — *Contoh:* ${b.example}` : ''}`);
    for (const sub of b.subconcepts) {
      lines.push(`  - **${sub.title}** *(${sub.relation})*: ${sub.detail}${sub.causeEffect ? ` | *Sebab–Akibat:* ${sub.causeEffect}` : ''}${sub.example ? ` | *Contoh:* ${sub.example}` : ''}`);
    }
  }

  if (mapData.relationships?.length) {
    lines.push('', '### Matriks Hubungan Antarkonsep', '');
    lines.push('| Konsep A | Hubungan / Sebab-Akibat | Konsep B | Penjelasan Mekanisme |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const r of mapData.relationships) {
      lines.push(`| **${r.from}** | ${r.relation} | **${r.to}** | ${r.explanation} |`);
    }
  }

  if (mapData.summary) {
    lines.push('', '### Intisari Keterkaitan', '', mapData.summary);
  }

  return lines.join('\n');
}
