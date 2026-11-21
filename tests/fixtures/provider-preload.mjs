// TEST ONLY: Node --import explicitly installs this transport in a child server.
// No production route or environment switch loads this module.
import { createRequire } from 'node:module';
import { pdfFixture } from './pdf-fixtures.mjs';

const require = createRequire(import.meta.url);
const pdfjs = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
const seedDocument = await pdfjs.getDocument(new Uint8Array(await pdfFixture())).promise;
const pagePrototype = Object.getPrototypeOf(await seedDocument.getPage(1));
const getTextContent = pagePrototype.getTextContent;
pagePrototype.getTextContent = async function (...args) {
  const content = await getTextContent.apply(this, args);
  if (content.items.some(item => item.str.includes('Simulated native reader error on this page.'))) {
    throw new Error('Fixture native page read failed');
  }
  return content;
};
await seedDocument.destroy();

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options = {}) => {
  const url = String(input?.url || input);
  if (!url.includes('generativelanguage.googleapis.com'))
    return originalFetch(input, options);
  if (url.includes('gemini-3.8-flash'))
    return new Response(
      JSON.stringify({
        error: {
          code: 404,
          status: 'NOT_FOUND',
          message: 'Test fixture model not found',
        },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : {},
    prompt = (body.contents || [])
      .flatMap((c) => c.parts || [])
      .map((p) => p.text || '')
      .join('\n');
  let text;
  if (prompt.includes('Analyze only this source')) {
    const source =
      prompt
        .match(
          /<untrusted_document_content>([\s\S]*?)<\/untrusted_document_content>/
        )?.[1]
        ?.replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&') || 'Circle source text.';
    const quote = source.slice(0, 80);
    text = JSON.stringify({
      subject: 'Circle geometry',
      overview: 'Fixture source analysis',
      objectives: [],
      concepts: [
        {
          id: 'c1',
          name: 'Radius',
          definition: 'Centre to boundary',
          formula: '',
          example: '',
          evidence: { sectionId: 'section-1', quote },
        },
      ],
      relationships: [],
      chapters: [
        { id: 'ch1', title: 'Circle', conceptIds: ['c1'], prerequisites: [] },
      ],
      coverage: [{ sectionId: 'section-1', quote }],
      limitations: [],
      knowledgeGaps: [],
    });
  } else if (prompt.includes('Build a concise learning journey')) {
    const grounded = prompt.includes('sole grounding for claims and citations');
    const general = prompt.includes('Prior assistant claims may be wrong') && !prompt.includes('sole grounding');
    if ((!grounded && !general) || !prompt.includes('escaped &lt;boundary&gt;')) {
      return new Response(JSON.stringify({error:{code:400,message:'Missing tutor data boundary'}}), {status:400});
    }
    text = JSON.stringify({
      title: 'Circle geometry',
      overview: 'Understand circle measurements.',
      chapters: [{
        title: 'Radius and diameter', objective: 'Identify the radius',
        explanation: 'A radius joins the centre to the boundary.',
        practice: {question:'Where does a radius start?',answer:'The centre.',explanation:'A radius joins the centre to the boundary.'},
        sourceReferences: grounded ? ['[Page 1]'] : []
      }]
    });
  } else {
    // Derive the requested OCR pages from the actual extraction instruction.
    // A PDF-only fallback has no rendered page marker, and defaulting to page
    // one makes mixed-PDF tests fail for the wrong reason on CI machines.
    const requested = prompt.match(/Read ONLY pages ([\d,\s]+) of this \d+-page PDF\./i);
    const explicit = requested?.[1]?.match(/\d+/g)?.map(Number) || [];
    const markers = [...prompt.matchAll(/\[Halaman (\d+)\]/g)].map(m => Number(m[1]));
    const unique = [...new Set(explicit.length ? explicit : markers.length ? markers : [1])];
    const blankFirstPage = unique.length === 2 && unique.includes(1) && unique.includes(2);
    const allBlank = prompt.includes('this 3-page PDF');
    text = unique
      .map(
        (page) =>
          allBlank || (blankFirstPage && page === 1) ? `[Halaman ${page}]\n[blank page]` :
          `[Halaman ${page}]\nA radius joins the centre to the boundary of a circle. The diameter is twice the radius. This is a deterministic test transport response, not live OCR.`
      )
      .join('\n\n');
  }
  return new Response(
    JSON.stringify({
      candidates: [
        { content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' },
      ],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
