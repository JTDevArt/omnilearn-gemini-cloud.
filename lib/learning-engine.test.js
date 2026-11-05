import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferExplanationDepth,
  selectRelevantMaterialExcerpt,
  normalizeQuizData,
  formatQuizToMarkdown,
  normalizeFlashcardsData,
  normalizeConceptMapData
} from './learning-engine.js';

test('inferExplanationDepth classifies BASIC, INTERMEDIATE, and ADVANCED questions accurately', () => {
  const basic = inferExplanationDepth('Jelaskan mengapa langit berwarna biru.', false);
  assert.equal(basic.depth, 'BASIC');
  assert.equal(basic.thinkingLevel, 'LOW');

  const advanced = inferExplanationDepth(
    'Jelaskan mekanisme relativitas waktu menurut teori relativitas khusus.',
    false
  );
  assert.equal(advanced.depth, 'ADVANCED');
  assert.equal(advanced.thinkingLevel, 'HIGH');

  const intermediate = inferExplanationDepth(
    'Bagaimana proses fotosintesis menghasilkan glukosa dan oksigen pada tumbuhan hijau?',
    false
  );
  assert.equal(intermediate.depth, 'INTERMEDIATE');
  assert.equal(intermediate.thinkingLevel, 'MEDIUM');
});

test('selectRelevantMaterialExcerpt preserves [Halaman X] markers and prioritizes queried pages/keywords', () => {
  const sampleDoc = [
    '[Halaman 1]\nPengantar Hukum Newton dan Gerak Lurus. Gaya sebanding dengan percepatan.',
    '[Halaman 2]\nTermodinamika dan Entropi. Hukum kedua termodinamika menyatakan entropi sistem terisolasi meningkat.',
    '[Halaman 3]\nGelombang Elektromagnetik dan Hamburan Rayleigh pada atmosfer bumi.'
  ].join('\n\n');

  const excerpt = selectRelevantMaterialExcerpt(sampleDoc, 'Apa isi halaman 2 tentang entropi?', 120);
  assert.equal(excerpt.includes('[Halaman 2]'), true);
  assert.equal(excerpt.includes('Entropi'), true);
});

test('normalizeQuizData deduplicates questions, enforces A-D options, and provides wrong-answer explanations', () => {
  const rawJson = JSON.stringify({
    questions: [
      {
        difficulty: 'Mudah',
        question: 'Apa fenomena fisika yang menyebabkan langit tampak biru di siang hari?',
        options: {
          A: 'Hamburan Rayleigh',
          B: 'Efek Doppler',
          C: 'Pembiasan Total',
          D: 'Difraksi Kisi'
        },
        correctAnswer: 'A',
        correctExplanation: 'Cahaya biru memiliki panjang gelombang pendek sehingga dihamburkan lebih kuat oleh molekul udara.',
        optionExplanations: {
          A: 'Benar, molekul atmosfer jauh lebih kecil dari panjang gelombang cahaya tampak.',
          B: 'Salah, Efek Doppler berkaitan dengan perubahan frekuensi akibat gerak relatif sumber dan pengamat.',
          C: 'Salah, pembiasan total terjadi ketika cahaya merambat dari medium rapat ke kurang rapat melebihi sudut kritis.',
          D: 'Salah, difraksi kisi terjadi saat gelombang melewati celah-celah sempit sejajar.'
        }
      },
      {
        difficulty: 'Mudah',
        question: 'Apa fenomena fisika yang menyebabkan langit tampak biru di siang hari?',
        options: { A: '1', B: '2', C: '3', D: '4' },
        correctAnswer: 'A'
      }
    ]
  });

  const normalized = normalizeQuizData(rawJson, 10, 'mudah');
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].correctAnswer, 'A');
  assert.equal(normalized[0].options.A, 'Hamburan Rayleigh');
  assert.equal(normalized[0].optionExplanations.B.includes('Efek Doppler'), true);

  const md = formatQuizToMarkdown(normalized, 'Mudah');
  assert.equal(md.includes('Hamburan Rayleigh'), true);
});

test('normalizeFlashcardsData validates front/back pairs and removes duplicates even with raw LaTeX backslashes', () => {
  const raw = `\`\`\`json
  {
    "cards": [
      { "category": "Definisi", "front": "Apa itu Hamburan Rayleigh?", "back": "Hamburan elastis cahaya oleh partikel yang jauh lebih kecil dari panjang gelombang cahaya." },
      { "category": "Definisi", "front": "Apa itu Hamburan Rayleigh?", "back": "Duplikat" },
      { "category": "Rumus", "front": "Reaksi Fotosintesis & Energi Bebas", "back": "Persamaan $6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2$ dengan $\\Delta G > 0$ dan $\\frac{1}{2} m v^2$." }
    ]
  }
  \`\`\``;

  const cards = normalizeFlashcardsData(raw);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].category, 'Definisi');
  assert.equal(cards[1].category, 'Rumus');
  assert.equal(cards[1].back.includes('\\rightarrow'), true);
  assert.equal(cards[1].back.includes('\\Delta G'), true);
});

test('normalizeConceptMapData builds hierarchical tree and relationships', () => {
  const raw = JSON.stringify({
    centralTopic: 'Relativitas Khusus Einstein',
    summary: 'Teori yang menjelaskan hubungan ruang dan waktu bagi pengamat dalam kerangka acuan inersia.',
    branches: [
      {
        title: 'Postulat Dasar',
        relationToCenter: 'mendasari',
        explanation: 'Dua asumsi fundamental teori relativitas khusus.',
        example: 'Kecepatan cahaya konstan di ruang hampa.',
        subconcepts: [
          {
            title: 'Invariansi Kecepatan Cahaya',
            relation: 'menetapkan',
            detail: 'Laju cahaya c sama untuk semua pengamat inersia.',
            causeEffect: 'Menyebabkan waktu dan panjang bersifat relatif.',
            example: 'Percobaan Michelson-Morley'
          }
        ]
      }
    ],
    relationships: [
      {
        from: 'Invariansi Kecepatan Cahaya',
        relation: 'mengakibatkan',
        to: 'Dilatasi Waktu',
        explanation: 'Agar c tetap konstan, selang waktu bagi pengamat bergerak melambat.'
      }
    ]
  });

  const map = normalizeConceptMapData(raw);
  assert.ok(map);
  assert.equal(map.centralTopic, 'Relativitas Khusus Einstein');
  assert.equal(map.branches.length, 1);
  assert.equal(map.branches[0].subconcepts.length, 1);
  assert.equal(map.relationships.length, 1);
});
