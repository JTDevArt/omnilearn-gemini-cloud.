export function youtubeId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Tautan YouTube tidak valid.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error('Tautan YouTube tidak aman.');
  const host = url.hostname.toLowerCase(),
    parts = url.pathname.split('/').filter(Boolean);
  let id;
  if (host === 'youtu.be') id = parts[0];
  else if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'www.youtube-nocookie.com',
    ].includes(host)
  )
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(parts[0])
          ? parts[1]
          : null;
  if (!/^[\w-]{11}$/.test(id || ''))
    throw new Error('ID video YouTube tidak valid.');
  return id;
}
export function timeLabel(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function seconds(value) {
  const parts = value.replace(',', '.').split(':').map(Number);
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((n) => !Number.isFinite(n) || n < 0) ||
    parts.at(-1) >= 60 ||
    parts.at(-2) >= 60
  )
    throw new Error('Timestamp subtitle tidak valid.');
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}
export function parseSubtitles(raw) {
  if (typeof raw !== 'string' || raw.length > 500000)
    throw new Error('Subtitle maksimal 500.000 karakter.');
  const lines = raw
      .replace(/^\uFEFF/, '')
      .replace(/\r/g, '')
      .split('\n'),
    segments = [];
  for (let i = 0; i < lines.length; i++) {
    const timing = lines[i].match(
      /^\s*((?:\d{1,3}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,3}:)?\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$/
    );
    if (!timing) continue;
    const start = seconds(timing[1]),
      end = seconds(timing[2]),
      text = [];
    while (i + 1 < lines.length && lines[i + 1].trim()) {
      i++;
      text.push(lines[i]);
    }
    const cleaned = text
      .join('\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .trim();
    if (end <= start || end > 86400 || cleaned.length > 4000)
      throw new Error('Rentang atau isi subtitle tidak valid.');
    if (cleaned)
      segments.push({
        id: `cue-${segments.length + 1}`,
        start,
        end,
        text: cleaned,
      });
    if (segments.length > 10000)
      throw new Error('Terlalu banyak segmen subtitle.');
  }
  if (!segments.length)
    throw new Error('Tidak ditemukan cue SRT/VTT yang valid.');
  return segments.sort((a, b) => a.start - b.start);
}
export function segmentChapters(segments, gap = 240) {
  const chapters = [];
  for (const segment of segments) {
    let chapter = chapters.at(-1);
    if (!chapter || segment.start - chapter.start >= gap) {
      chapter = {
        id: `chapter-${chapters.length + 1}`,
        start: segment.start,
        end: segment.end,
        title: segment.text.split(/[.!?\n]/)[0].slice(0, 90),
        description: segment.text.slice(0, 250),
        origin: 'subtitle-time-group',
      };
      chapters.push(chapter);
    } else chapter.end = Math.max(chapter.end, segment.end);
  }
  return chapters;
}
