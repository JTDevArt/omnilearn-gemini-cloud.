// TEST ONLY: Node --import explicitly installs this transport in a child server.
// No production route or environment switch loads this module.
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
  } else {
    // Derive the requested OCR pages from the actual extraction instruction.
    // A PDF-only fallback has no rendered page marker, and defaulting to page
    // one makes mixed-PDF tests fail for the wrong reason on CI machines.
    const requested = prompt.match(/Read ONLY pages ([\\d,\\s]+) of this \\d+-page PDF\\./i);
    const explicit = requested?.[1]?.match(/\\d+/g)?.map(Number) || [];
    const markers = [...prompt.matchAll(/\\[Halaman (\\d+)\\]/g)].map(m => Number(m[1]));
    const unique = [...new Set(explicit.length ? explicit : markers.length ? markers : [1])];
    text = unique
      .map(
        (page) =>
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
