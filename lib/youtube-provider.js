import {
  youtubeId,
  parseSubtitles,
  segmentChapters,
} from '../public/transcripts.js';
import { boundedFetch, integrationError } from './external-http.js';
export class YoutubeCaptionProvider {
  constructor({
    token = process.env.YOUTUBE_OAUTH_TOKEN,
    fetcher = fetch,
  } = {}) {
    this.token = token;
    this.fetcher = fetcher;
  }
  status() {
    return {
      configured: Boolean(this.token),
      mechanism:
        'YouTube Data API OAuth; captions must be accessible to the authorized account',
      manualFallback: true,
    };
  }
  async acquire({ url, language = 'auto', signal }) {
    let id;
    try {
      id = youtubeId(url);
    } catch {
      throw integrationError(
        'Tautan YouTube tidak valid.',
        'INVALID_YOUTUBE_URL',
        400
      );
    }
    if (!this.token)
      throw integrationError(
        'Transkrip otomatis belum dikonfigurasi. Tempel transkrip atau unggah SRT/VTT.',
        'YOUTUBE_NOT_CONFIGURED'
      );
    const headers = { Authorization: `Bearer ${this.token}` };
    const get = async (path) => {
      const r = await boundedFetch(
        `https://www.googleapis.com/youtube/v3/${path}`,
        { headers, fetcher: this.fetcher, signal }
      );
      if (!r.ok)
        throw integrationError(
          'Caption tidak tersedia untuk akun yang diberi izin. Gunakan transkrip manual/SRT/VTT.',
          'YOUTUBE_CAPTION_UNAVAILABLE',
          r.status === 429 ? 429 : 403
        );
      return r;
    };
    const tracks =
      (await get(`captions?part=snippet&videoId=${id}`)).json().items || [];
    const track =
      tracks.find((t) => t.snippet?.language === language) ||
      tracks.find((t) => !t.snippet?.isDraft);
    if (
      typeof track?.id !== 'string' ||
      !track.id ||
      track.id.length > 500 ||
      /[\u0000-\u001f]/.test(track.id)
    )
      throw integrationError(
        'Video ini tidak memiliki caption yang dapat diakses.',
        'YOUTUBE_CAPTION_UNAVAILABLE',
        404
      );
    const caption = await get(
        `captions/${encodeURIComponent(track.id)}?tfmt=vtt`
      ),
      segments = parseSubtitles(caption.text);
    const metadata = (await get(`videos?part=snippet&id=${id}`)).json()
      .items?.[0]?.snippet;
    return {
      provider: 'youtube-data-api',
      videoId: id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: metadata?.title || 'YouTube ' + id,
      language: track.snippet?.language || 'und',
      segments,
      chapters: segmentChapters(segments),
      text: segments
        .map((s) => `[${s.start.toFixed(3)}s] ${s.text}`)
        .join('\n'),
      retrievedAt: new Date().toISOString(),
    };
  }
}
