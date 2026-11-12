const filename = /\.(?:pdf|docx?|pptx?|xlsx?|txt|png|jpe?g|webp|mp3|wav|m4a|mp4|mov|webm)$/i;
export function lessonTitle(source) {
  const named = typeof source?.lessonTitle === 'string' ? source.lessonTitle.trim() : '';
  if (named) return named;
  const title = typeof source?.journey?.title === 'string' ? source.journey.title.trim() : '';
  if (title && !filename.test(title)) return title;
  const original = typeof source?.name === 'string' ? source.name.trim() : '';
  return original && !filename.test(original) ? original : 'Materi belum diberi judul';
}
