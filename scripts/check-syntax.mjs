import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';

const files = [
  'server.js',
  ...['lib', 'public'].flatMap((directory) =>
    readdirSync(directory)
      .filter((name) => /\.(?:m?js)$/.test(name))
      .map((name) => `${directory}/${name}`)
  ),
];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Syntax check failed: ${file}\n`);
    process.exit(1);
  }
}
for (const file of ['public/index.html', 'public/landing.html']) {
  for (const match of readFileSync(file, 'utf8').matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  )) {
    if (!match[2].trim() || /type=["']application\//i.test(match[1])) continue;
    new Script(match[2], { filename: file });
  }
}
console.log(
  `Syntax checks passed for ${files.length} JavaScript modules and HTML inline scripts.`
);
