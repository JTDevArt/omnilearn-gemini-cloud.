import fs from 'node:fs';
import path from 'node:path';
const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(process.cwd(), 'server.js'), 'utf8');
const forbidden = ['@mlc-ai/web-llm', 'navigator.gpu', 'llm-worker.js', 'CreateWebWorkerMLCEngine', 'Llama-3.2-1B'];
const found = forbidden.filter(token => html.includes(token) || server.includes(token));
const required = ['/api/health', '/api/chat', '/api/study', '/api/upload'];
const missing = required.filter(route => !server.includes(route));
if (found.length || missing.length) {
  console.error({ forbiddenFound: found, missingRoutes: missing });
  process.exit(1);
}
for (const feature of ['summary', 'quiz', 'cards', 'map', 'plan', 'translate', 'research']) {
  if (!server.includes(`${feature}:`)) {
    console.error(`Missing study task: ${feature}`);
    process.exit(1);
  }
}
console.log('Migration check passed: no local WebLLM code and all learning API routes/tasks exist.');
