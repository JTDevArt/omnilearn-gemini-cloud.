import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8080);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_MATERIAL_CHARS = 50000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 90,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi beberapa menit.' }
});
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 35,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Batas permintaan AI sementara tercapai. Coba lagi nanti.' }
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak upload. Coba lagi nanti.' }
});
app.use('/api', apiLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 }
});

const SYSTEM_INSTRUCTION = `Kamu adalah OmniLearn, tutor universal untuk semua bidang ilmu. Jawab dalam bahasa pengguna; jika tidak jelas, gunakan Bahasa Indonesia. Jelaskan dengan bahasa yang jelas, ramah, dan tidak kaku. Mulai dari inti, lanjutkan langkah demi langkah, dan beri contoh sederhana. Sesuaikan tingkat penjelasan dengan pengguna. Jangan mengarang fakta, sumber, kutipan, DOI, atau referensi. Jika tidak yakin, katakan dengan jelas. Jika pengguna memberikan materi, jadikan materi itu sumber utama dan bedakan isi dokumen dari pengetahuan umum. Untuk topik medis, hukum, keuangan, dan keselamatan, berikan edukasi umum dan sarankan verifikasi profesional untuk keputusan penting. Bantu pengguna belajar, bukan menyontek ujian aktif.`;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('Secret GEMINI_API_KEY belum tersedia di server. Tambahkan melalui Settings → Secrets di Google AI Studio.');
    error.status = 503;
    throw error;
  }
  return new GoogleGenAI({ apiKey });
}
function asText(value, max = 50000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function safeProviderError(error) {
  const message = String(error?.message || '');
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(message)) return 'Kuota atau batas permintaan Gemini tercapai. Coba lagi nanti.';
  if (/API_KEY_INVALID|API key not valid|permission denied|403/i.test(message)) return 'Kunci Gemini tidak valid atau belum memiliki akses API. Periksa Settings → Secrets.';
  if (/SAFETY|blocked/i.test(message)) return 'Permintaan tidak dapat diproses karena aturan keamanan Gemini.';
  return 'Gemini gagal memproses permintaan. Coba lagi sebentar.';
}
async function generateText({ contents, systemInstruction = SYSTEM_INSTRUCTION, maxOutputTokens = 1800, temperature = 0.45 }) {
  try {
    const response = await getAI().models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction, maxOutputTokens, temperature }
    });
    const output = response.text?.trim();
    if (!output) throw new Error('Gemini tidak mengembalikan teks.');
    return output;
  } catch (error) {
    console.error('Gemini request failed:', error?.name || 'Error', error?.status || '');
    if (error?.status === 503) throw error;
    const wrapped = new Error(safeProviderError(error));
    wrapped.status = /quota|RESOURCE_EXHAUSTED|429/i.test(String(error?.message || '')) ? 429 : 502;
    throw wrapped;
  }
}
function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map(item => {
    const role = item?.role === 'assistant' || item?.role === 'model' ? 'model' : 'user';
    const text = asText(item?.content, 5000);
    return text ? { role, parts: [{ text }] } : null;
  }).filter(Boolean);
}
function decodeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
async function extractPptx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
  const slides = [];
  for (let index = 0; index < slidePaths.length; index++) {
    const xml = await zip.file(slidePaths[index]).async('string');
    const words = [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(match => decodeXml(match[1]));
    if (words.length) slides.push(`SLIDE ${index + 1}\n${words.join(' ')}`);
  }
  return slides.join('\n\n');
}
async function extractFileText(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension === '.txt') return file.buffer.toString('utf8');
  if (extension === '.pdf') {
    const parsed = await pdfParse(file.buffer);
    return parsed.text || '';
  }
  if (extension === '.docx') {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value || '';
  }
  if (extension === '.pptx') return await extractPptx(file.buffer);
  const error = new Error('Format belum didukung. Gunakan PDF, DOCX, PPTX, atau TXT.');
  error.status = 415;
  throw error;
}

app.get('/api/health', (_req, res) => {
  const ready = Boolean(process.env.GEMINI_API_KEY);
  res.json({ ready, provider: 'Gemini Cloud', model: MODEL, message: ready ? 'Server secret tersedia.' : 'GEMINI_API_KEY belum tersedia.' });
});

app.post('/api/chat', aiLimiter, async (req, res, next) => {
  try {
    const message = asText(req.body?.message, 8000);
    if (!message) return res.status(400).json({ error: 'Tulis pertanyaan terlebih dahulu.' });
    const material = asText(req.body?.material, MAX_MATERIAL_CHARS);
    const materialName = asText(req.body?.materialName, 180) || 'materi pengguna';
    const contextualMessage = material
      ? `${message}\n\nMATERI PENGGUNA (${materialName}):\n${material}\n\nGunakan materi ini sebagai konteks utama. Jika jawaban tidak ada di materi, jelaskan batasnya dan pisahkan pengetahuan umum.`
      : message;
    const contents = normalizeHistory(req.body?.history);
    contents.push({ role: 'user', parts: [{ text: contextualMessage }] });
    const answer = await generateText({ contents, maxOutputTokens: 1800, temperature: 0.5 });
    res.json({ answer, model: MODEL });
  } catch (error) { next(error); }
});

const STUDY_TASKS = {
  summary: ({ source }) => `Buat ringkasan belajar yang runtut dari materi berikut. Susun: gambaran umum, 5–10 gagasan utama, istilah penting, contoh sederhana, dan 3 hal yang perlu diingat. Jangan menambah fakta yang tidak didukung materi.\n\nMATERI/TOPIK:\n${source}`,
  quiz: ({ source, count }) => `Buat ${count} soal pilihan ganda dari materi berikut. Setiap soal punya 4 opsi A-D. Setelah semua soal, berikan kunci jawaban dan pembahasan singkat. Campur tingkat mudah, sedang, dan sulit. Jangan membuat pertanyaan yang jawabannya tidak didukung materi.\n\nMATERI/TOPIK:\n${source}`,
  cards: ({ source }) => `Buat 10 flashcard dari materi berikut. Format jelas: KARTU 1, DEPAN: pertanyaan/istilah, BELAKANG: jawaban singkat. Fokus pada konsep inti dan istilah penting.\n\nMATERI/TOPIK:\n${source}`,
  map: ({ source }) => `Buat peta konsep teks dari materi berikut. Gunakan hierarki dan panah (→), mulai dari topik utama lalu konsep cabang dan hubungan antarkonsep. Akhiri dengan ringkasan hubungan terpenting.\n\nMATERI/TOPIK:\n${source}`,
  plan: ({ source }) => `Buat rencana belajar 7 hari untuk menguasai topik berikut. Setiap hari berisi tujuan, materi yang dipelajari, aktivitas 20–45 menit, dan cara mengecek pemahaman. Hari ke-7 berisi evaluasi dan pengulangan. Buat realistis untuk pelajar/mahasiswa.\n\nTOPIK/MATERI:\n${source}`,
  translate: ({ source, targetLanguage }) => `Terjemahkan teks berikut ke ${targetLanguage}. Pertahankan makna, struktur, angka, nama diri, dan istilah teknis. Jangan meringkas atau menambahkan informasi. Jika istilah teknis memiliki padanan baku, gunakan padanan yang tepat.\n\nTEKS:\n${source}`,
  research: ({ source }) => `Bertindak sebagai asisten perencanaan riset akademik. Berdasarkan topik atau materi berikut, buat: (1) fokus masalah, (2) 3–5 pertanyaan penelitian, (3) tujuan penelitian, (4) konsep/variabel yang mungkin relevan, (5) kerangka teori atau konsep yang perlu ditelusuri, (6) pilihan desain/metode dan alasan, (7) jenis data yang dibutuhkan, (8) kata kunci pencarian literatur. Jangan mengarang nama penulis, judul artikel, DOI, hasil penelitian, atau sitasi. Tandai semua saran sebagai rancangan awal yang perlu diverifikasi.\n\nTOPIK/MATERI:\n${source}`
};

app.post('/api/study', aiLimiter, async (req, res, next) => {
  try {
    const task = asText(req.body?.task, 30);
    if (!Object.hasOwn(STUDY_TASKS, task)) return res.status(400).json({ error: 'Jenis alat belajar tidak dikenal.' });
    const material = asText(req.body?.material, MAX_MATERIAL_CHARS);
    const topic = asText(req.body?.topic, 5000);
    const materialName = asText(req.body?.materialName, 180);
    const targetLanguage = asText(req.body?.targetLanguage, 80) || 'Bahasa Inggris';
    if (task === 'translate' && !material && !topic) return res.status(400).json({ error: 'Masukkan teks atau unggah materi untuk diterjemahkan.' });
    const source = material
      ? `${materialName ? `Nama materi: ${materialName}\n` : ''}${material}`
      : `Topik belajar: ${topic || 'dasar-dasar ilmu pengetahuan umum'}. Buat materi pengantar yang akurat dan terstruktur.`;
    const count = Math.max(3, Math.min(15, Number(req.body?.count) || 8));
    const prompt = STUDY_TASKS[task]({ source, count, targetLanguage });
    const result = await generateText({
      contents: prompt,
      maxOutputTokens: task === 'plan' || task === 'research' ? 3000 : 2200,
      temperature: task === 'quiz' ? 0.35 : 0.45
    });
    res.json({ result, task, model: MODEL });
  } catch (error) { next(error); }
});

app.post('/api/upload', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Pilih file terlebih dahulu.' });
    const extension = path.extname(req.file.originalname || '').toLowerCase();
    if (!['.pdf', '.docx', '.pptx', '.txt'].includes(extension)) {
      return res.status(415).json({ error: 'Format belum didukung. Gunakan PDF, DOCX, PPTX, atau TXT.' });
    }
    let text = (await extractFileText(req.file)).replace(/\u0000/g, '').trim();
    if (!text) return res.status(422).json({ error: 'Tidak ada teks yang dapat dibaca. PDF hasil scan perlu OCR terlebih dahulu.' });
    const truncated = text.length > MAX_MATERIAL_CHARS;
    const characters = text.length;
    text = text.slice(0, MAX_MATERIAL_CHARS);
    res.json({ text, filename: path.basename(req.file.originalname), characters, truncated });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Ukuran file maksimal 15 MB.' });
  }
  const status = Number(error?.status) || 500;
  const message = status >= 500 && status !== 502 && status !== 503
    ? 'Server mengalami kesalahan. Coba lagi.'
    : (error?.message || 'Permintaan gagal diproses.');
  if (status >= 500) console.error('Request failed:', error?.name || 'Error', status);
  res.status(status).json({ error: message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OmniLearn Gemini Cloud listening on port ${PORT}`);
});
