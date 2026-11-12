import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Fully offline demo bundle. It never accesses the production data store or
// contacts Gemini. Inline assets are only for this explicitly requested export.
const dir = 'public';
let html = readFileSync(join(dir, 'design-preview.html'), 'utf8');
const css = readFileSync(join(dir, 'design-preview.css'), 'utf8');
const js = readFileSync(join(dir, 'design-preview.js'), 'utf8');
const releaseJson = readFileSync(join(dir, 'data', 'releases.json'), 'utf8');

const stylesheet = '<link rel="stylesheet" href="/design-preview.css">';
const scriptTag = '<script type="module" src="/design-preview.js"></script>';
if (!html.includes(stylesheet) || !html.includes(scriptTag))
  throw new Error('Preview export failed: asset tags have changed.');
if (css.includes('</style') || js.includes('</script'))
  throw new Error('Preview export failed: unsafe inline terminator.');
const manifest = releaseJson.replace(/</g, '\\u003c');
html = html.replace(stylesheet, '<style>'+css+'</style>');
html = html.replace(scriptTag,
  '<script id="previewReleaseData" type="application/json">'+manifest+'</script>'+
  '<script type="module">'+js+'</script>');
html = html.replaceAll('href="/dashboard?', 'href="https://omnilearnid.ai.studio/dashboard?');
mkdirSync('dist', {recursive:true});
writeFileSync('dist/omnilearn-design-preview.html', html);
console.log('Standalone preview written:', html.length, 'bytes');
