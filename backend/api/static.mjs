import { readFile } from 'node:fs/promises';

const files = {
  '/': ['../../apps/web/index.html', 'text/html'],
  '/main.js': ['../../apps/web/main.js', 'text/javascript'],
  '/client.mjs': ['../../apps/web/client.mjs', 'text/javascript'],
  '/library.mjs': ['../../packages/library/src/index.mjs', 'text/javascript']
};

export async function serveEditor(path, res) {
  if (!Object.hasOwn(files, path)) return false;
  const [file, type] = files[path];
  const data = await readFile(new URL(file, import.meta.url));
  res.writeHead(200, {
    'content-type': `${type}; charset=utf-8`,
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store'
  });
  res.end(data);
  return true;
}