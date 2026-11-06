import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSubtitles,
  segmentChapters,
  youtubeId,
} from '../public/transcripts.js';
import { YoutubeCaptionProvider } from '../lib/youtube-provider.js';
import { ResearchProvider } from '../lib/research-provider.js';
import { validateAssessment } from '../lib/exam-assessment.js';
import {
  validateResearchSynthesis,
  researchPrompt,
} from '../lib/research-synthesis.js';
test('research language follows supplied material, query fallback and explicit override', () => {
  const source =
    'A triangle has three sides and the angles are inside the shape.';
  assert.match(
    researchPrompt([], source, { query: 'materi yang ada di sini' }),
    /\*\*English\*\*/
  );
  assert.match(
    researchPrompt([], '', { query: 'materi yang ada di sini' }),
    /\*\*Bahasa Indonesia\*\*/
  );
  assert.match(
    researchPrompt([], source, { outputLanguage: 'id' }),
    /\*\*Bahasa Indonesia\*\*/
  );
  assert.match(
    researchPrompt([], '', { query: '<script>data</script>' }),
    /&lt;script&gt;/
  );
});
test('research interpretation rejects invented reference IDs, links and claims of unprovided uploads', () => {
  const records = [{ title: 'A real registry record' }],
    valid = {
      uploadedSummary: '',
      externalSummary: [
        { claim: 'The record describes a study.', evidenceIds: ['R1'] },
      ],
      interpretation: 'AI interpretation only.',
      limitations: ['Full article not read.'],
    };
  assert.equal(
    validateResearchSynthesis(JSON.stringify(valid), records).references[0]
      .evidenceId,
    'R1'
  );
  assert.throws(() =>
    validateResearchSynthesis(
      JSON.stringify({
        ...valid,
        externalSummary: [{ claim: 'Invented', evidenceIds: ['R2'] }],
      }),
      records
    )
  );
  assert.throws(() =>
    validateResearchSynthesis(
      JSON.stringify({
        ...valid,
        interpretation: 'https://invented.example/paper',
      }),
      records
    )
  );
  assert.throws(() =>
    validateResearchSynthesis(
      JSON.stringify({ ...valid, uploadedSummary: 'Unseen source claim' }),
      records
    )
  );
});
const vtt =
  'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nA <b>radius</b> joins the centre.\n\n00:04:03.000 --> 00:04:06.000\nA diameter crosses the centre.\n';
test('subtitle parsing preserves source timestamps, strips markup and groups actual time ranges', () => {
  const cues = parseSubtitles(vtt);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].start, 1);
  assert.equal(cues[0].text, 'A radius joins the centre.');
  assert.equal(segmentChapters(cues).length, 2);
  assert.equal(
    parseSubtitles('1\n00:00:01,000 --> 00:00:02,500\nHello.\n')[0].end,
    2.5
  );
  assert.throws(() => parseSubtitles('un-timestamped text'));
});
test('YouTube validation rejects deceptive hosts, credentials, ports and invalid IDs', () => {
  assert.equal(youtubeId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  for (const url of [
    'https://youtube.com.evil.test/watch?v=abcdefghijk',
    'https://evil@youtube.com/watch?v=abcdefghijk',
    'https://youtube.com:8443/watch?v=abcdefghijk',
    'javascript:alert(1)',
  ])
    assert.throws(() => youtubeId(url));
});
test('authorized caption adapter handles missing configuration without network calls and parses permitted captions', async () => {
  await assert.rejects(
    new YoutubeCaptionProvider({
      token: '',
      fetcher: () => {
        throw Error('network');
      },
    }).acquire({ url: 'https://youtu.be/abcdefghijk' }),
    (error) => error.code === 'YOUTUBE_NOT_CONFIGURED'
  );
  const provider = new YoutubeCaptionProvider({
    token: 'fixture',
    fetcher: async (url) =>
      new Response(
        url.includes('/captions/caption')
          ? vtt
          : JSON.stringify(
              url.includes('/captions?')
                ? { items: [{ id: 'caption', snippet: { language: 'en' } }] }
                : { items: [{ snippet: { title: 'Circle lesson' } }] }
            ),
        {
          headers: {
            'Content-Type': url.includes('/captions/caption')
              ? 'text/vtt'
              : 'application/json',
          },
        }
      ),
  });
  const result = await provider.acquire({
    url: 'https://youtu.be/abcdefghijk',
  });
  assert.equal(result.segments.length, 2);
  assert.equal(result.title, 'Circle lesson');
});
test('research returns only supplied citation metadata and separates it from uploaded content and AI interpretation', async () => {
  const provider = new ResearchProvider({
    fetcher: async () =>
      new Response(
        JSON.stringify({
          message: {
            items: [
              {
                DOI: '10.1234/test',
                title: ['<b>Real registry title</b>'],
                author: [{ given: 'A', family: 'Researcher' }],
                'container-title': ['Journal'],
                issued: { 'date-parts': [[2024, 5, 1]] },
                abstract: '<p>Supplied abstract.</p>',
              },
            ],
          },
        })
      ),
  });
  const result = await provider.search({
    query: 'circle geometry',
    sessionId: 'a',
  });
  assert.equal(result.results[0].authors[0], 'A Researcher');
  assert.equal(result.results[0].publishedDate, '2024-05-01');
  assert.equal(result.sourceSeparation.aiInterpretation, 'not generated');
  assert.equal(provider.registry.has('a:' + result.results[0].id), true);
  await assert.rejects(
    new ResearchProvider({ webKey: '' }).search({
      query: 'test',
      kind: 'web',
      sessionId: 'a',
    }),
    (error) => error.code === 'WEB_SEARCH_NOT_CONFIGURED'
  );
});
test('AI assessment rejects missing, duplicate, excessive or non-finite criterion scores', () => {
  const q = { maxScore: 5, rubric: [{ id: 'criterion-1', maxScore: 5 }] };
  assert.equal(
    validateAssessment(
      {
        criteria: [
          { id: 'criterion-1', score: 4, feedback: 'Reasoned answer' },
        ],
      },
      q,
      'fixture'
    ).score,
    4
  );
  for (const score of [6, -1, NaN])
    assert.throws(() =>
      validateAssessment(
        { criteria: [{ id: 'criterion-1', score, feedback: 'test' }] },
        q,
        'fixture'
      )
    );
  assert.throws(() => validateAssessment({ criteria: [] }, q, 'fixture'));
});
