import { boundedFetch, integrationError } from './external-http.js';
const plain = (value) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
function safeUrl(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hostname === 'localhost' ||
      url.hostname.endsWith('.localhost') ||
      /^[\d.]+$/.test(url.hostname) ||
      url.hostname.includes(':')
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export class ResearchProvider {
  constructor({
    fetcher = fetch,
    webKey = process.env.BRAVE_SEARCH_API_KEY,
  } = {}) {
    this.fetcher = fetcher;
    this.webKey = webKey;
    this.registry = new Map();
  }
  status() {
    return {
      academic: {
        provider: 'Crossref',
        requiresCredential: false,
        scope:
          'Publication metadata and supplied abstracts; not full-text verification',
      },
      web: { provider: 'Brave Search', configured: Boolean(this.webKey) },
    };
  }
  async search({ query, kind = 'academic', sessionId, signal }) {
    if (
      typeof query !== 'string' ||
      query.trim().length < 3 ||
      query.length > 500
    )
      throw integrationError(
        'Masukkan kueri riset 3–500 karakter.',
        'INVALID_RESEARCH_QUERY',
        400
      );
    let results = [];
    if (kind === 'academic') {
      const r = await boundedFetch(
        `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=8`,
        {
          fetcher: this.fetcher,
          signal,
          headers: { Accept: 'application/json' },
        }
      );
      if (!r.ok)
        throw integrationError(
          'Metadata Crossref belum tersedia. Coba lagi nanti.',
          'RESEARCH_UNAVAILABLE',
          r.status === 429 ? 429 : 503
        );
      results = (r.json().message?.items || [])
        .map((item) => {
          const doi = String(item.DOI || '');
          if (!/^10\.\d{4,9}\/[\w.\-;()/:]+$/i.test(doi)) return null;
          const title = plain(item.title?.[0]);
          if (!title) return null;
          const date = (item.published || item.issued)?.['date-parts']?.[0];
          return {
            provider: 'Crossref',
            kind: 'external-publication-metadata',
            title,
            doi,
            url: `https://doi.org/${encodeURI(doi)}`,
            authors: (item.author || [])
              .slice(0, 30)
              .map((a) =>
                [plain(a.given), plain(a.family)].filter(Boolean).join(' ')
              )
              .filter(Boolean),
            journal: plain(item['container-title']?.[0]),
            publishedDate: Array.isArray(date)
              ? date.map((n) => String(n).padStart(2, '0')).join('-')
              : null,
            abstract: plain(item.abstract).slice(0, 12000),
            verification:
              'Metadata returned by Crossref; article content and claims not independently verified',
          };
        })
        .filter(Boolean);
    } else if (kind === 'web') {
      if (!this.webKey)
        throw integrationError(
          'Pencarian web belum dikonfigurasi. Pilih metadata akademik jika jaringan tersedia.',
          'WEB_SEARCH_NOT_CONFIGURED'
        );
      const r = await boundedFetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
        {
          fetcher: this.fetcher,
          signal,
          headers: {
            'X-Subscription-Token': this.webKey,
            Accept: 'application/json',
          },
        }
      );
      if (!r.ok)
        throw integrationError(
          'Penyedia pencarian web menolak permintaan. Periksa konfigurasi atau kuota.',
          'WEB_SEARCH_UNAVAILABLE',
          r.status === 429 ? 429 : 503
        );
      results = (r.json().web?.results || [])
        .map((item) => ({
          provider: 'Brave Search',
          kind: 'external-search-result',
          title: plain(item.title),
          url: safeUrl(item.url),
          abstract: plain(item.description),
          authors: [],
          journal: null,
          publishedDate: null,
          verification:
            'Search result snippet; full page not retrieved or verified',
        }))
        .filter((item) => item.url && item.title);
    } else
      throw integrationError(
        'Jenis pencarian tidak valid.',
        'INVALID_RESEARCH_KIND',
        400
      );
    const retrievedAt = new Date().toISOString();
    for (const [key, value] of this.registry)
      if (Date.now() - value.timestamp > 1800000) this.registry.delete(key);
    results = results.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      retrievedAt,
      citation: [
        item.authors.join(', ') || 'Penulis tidak tersedia',
        item.publishedDate || 'Tanggal tidak tersedia',
        item.title,
        item.journal,
        item.url,
      ]
        .filter(Boolean)
        .join('. '),
    }));
    for (const item of results)
      this.registry.set(`${sessionId}:${item.id}`, {
        ...item,
        timestamp: Date.now(),
      });
    while (this.registry.size > 300)
      this.registry.delete(this.registry.keys().next().value);
    return {
      query,
      kind,
      results,
      sourceSeparation: {
        uploadedMaterial: 'not included in this search',
        externalFindings: 'provider metadata/snippets only',
        aiInterpretation: 'not generated',
      },
    };
  }
}
