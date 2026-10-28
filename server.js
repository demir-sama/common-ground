// Zero-dependency local server:  node server.js   (or: npm start)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Minimal .env loader (no dependency). Real env vars win.
const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ['.env.local', '.env']) {
  const envFile = path.join(here, name);
  if (!existsSync(envFile)) continue;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const { handleStatus, handleSearch, handlePlan, handleSuggest, getClient } = await import('./src/server/handlers.js');

const PUBLIC = path.join(here, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/status') return handleStatus(req, res);
    if (url.pathname === '/api/search') return handleSearch(req, res);
    if (url.pathname === '/api/suggest') return handleSuggest(req, res);
    if (url.pathname === '/api/plan' && req.method === 'POST') return handlePlan(req, res);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end('Forbidden'); }
    const s = await stat(file).catch(() => null);
    if (!s?.isFile()) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', MIME[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.statusCode = 500;
    res.end('Server error');
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  const mode = getClient().mode;
  console.log(`\n  Common Ground  →  http://localhost:${port}`);
  console.log(mode === 'live' ? '  Qloo: LIVE (hackathon API)\n' : '  Qloo: MOCK data (set QLOO_API_KEY in .env for live results)\n');
});
