const filename = /\.(?:pdf|docx?|pptx?|xlsx?|txt|png|jpe?g|webp|mp3|wav|m4a|mp4|mov|webm)$/i;
export function titleSuggestion(text) {
  if(typeof text!=='string')return '';
  const first=text.split(/\r?\n/).map(line=>line.trim()).find(line=>line && !/^\[(?:halaman|page)\s+\d+\]$/i.test(line));
  return first && first.length>=5 && first.length<=100 && !filename.test(first) && /\p{L}/u.test(first) ? first : '';
}
export function lessonTitle(source) {
  const named = typeof source?.lessonTitle === 'string' ? source.lessonTitle.trim() : '';
  if (named) return named;
  const title = typeof source?.journey?.title === 'string' ? source.journey.title.trim() : '';
  if (title && !filename.test(title)) return title;
  const original = typeof source?.name === 'string' ? source.name.trim() : '';
  return original && !filename.test(original) ? original : 'Materi belum diberi judul';
}
export async function saveLessonTitle(source, value, persist) {
  const title=typeof value==='string' ? value.trim() : '';
  if (!source || !title || title.length>180) throw new Error('Judul harus berisi 1–180 karakter.');
  const previous=source.lessonTitle;
  source.lessonTitle=title;
  try { await persist(); }
  catch(error) {
    if(source.lessonTitle===title) { if(previous===undefined)delete source.lessonTitle;else source.lessonTitle=previous; }
    throw error;
  }
  return title;
}
