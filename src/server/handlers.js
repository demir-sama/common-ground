// Framework-agnostic (req, res) handlers — used by the local server and the Vercel /api functions.
import { createClient } from '../qloo/index.js';
import { CITIES } from '../qloo/mock-catalog.js';
import { DOMAINS } from '../qloo/types.js';
import { runMediator } from '../agent/mediator.js';
import { validatePlanInput } from '../agent/validate.js';

let client = null;
export const getClient = () => (client ??= createClient());
export const setClientForTests = (c) => { client = c; };

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

async function readJson(req) {
  if (req.body !== undefined && req.body !== null) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 256_000) throw new Error('Body too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// Tiny per-IP limiter so a public demo cannot burn the hackathon quota.
const hits = new Map();
export function rateLimited(ip, { limit = 12, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > limit;
}
const ipOf = (req) => String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'local').split(',')[0].trim();

export async function handleStatus(_req, res) {
  const c = getClient();
  json(res, 200, {
    mode: c.mode,
    cities: c.mode === 'mock' ? CITIES : null,
    domains: Object.entries(DOMAINS).map(([key, v]) => ({ key, label: v.label, icon: v.icon })),
    llm: Boolean(process.env.LLM_API_KEY),
    notice: c.mode === 'mock' ? 'Running on bundled MOCK data (no QLOO_API_KEY set). Not real Qloo results.' : null,
  });
}

export async function handleSearch(req, res) {
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
  const types = (url.searchParams.get('type') ?? '').split(',').filter((t) => t in DOMAINS && t !== 'place');
  if (rateLimited(`s:${ipOf(req)}`, { limit: 120 })) return json(res, 429, { error: 'Slow down a little.' });
  if (q.length < 2) return json(res, 200, { results: [] });
  try {
    const results = await getClient().search(q, { types: types.length ? types : undefined, take: 8 });
    json(res, 200, { results });
  } catch (err) {
    json(res, err.status === 401 || err.status === 403 ? 502 : 500, { error: err.message, hint: err.hint });
  }
}

export async function handleSuggest(_req, res) {
  const c = getClient();
  json(res, 200, { results: c.suggest ? await c.suggest(12) : [] });
}

/** Streams newline-delimited JSON events so the UI can show the agent's trace live. */
export async function handlePlan(req, res) {
  if (rateLimited(`p:${ipOf(req)}`)) return json(res, 429, { error: 'Too many plans — try again in a minute.' });
  let body;
  try { body = await readJson(req); } catch { return json(res, 400, { error: 'Invalid JSON body.' }); }
  const v = validatePlanInput(body);
  if (!v.ok) return json(res, 422, { error: v.errors.join(' ') });

  res.statusCode = 200;
  res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-accel-buffering', 'no');
  const emit = (evt) => res.write(`${JSON.stringify(evt)}\n`);
  try {
    await runMediator({ client: getClient(), input: v.value, emit });
  } catch (err) {
    emit({ type: 'error', error: err.message, hint: err.hint });
  }
  res.end();
}
