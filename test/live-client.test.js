import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveQlooClient, normalizeEntity, DEFAULT_BASE_URL } from '../src/qloo/live.js';
import { createClient } from '../src/qloo/index.js';

const fakeFetch = (routes, calls = []) => async (url, opts) => {
  calls.push({ url: new URL(url), opts });
  const u = new URL(url);
  const r = routes[u.pathname];
  if (!r) return { ok: false, status: 404, json: async () => ({}) };
  const body = typeof r === 'function' ? r(u) : r;
  return { ok: true, status: 200, json: async () => body };
};

const rawEntity = {
  name: 'Everything Everywhere All at Once', entity_id: 'F0D354AA-BA7E-49D2-8ABA-9A8250F5C852', type: 'urn:entity', subtype: 'urn:entity:movie',
  properties: { release_year: 2022, description: 'A laundromat owner jumps universes.', image: { url: 'https://images.qloo.com/x.jpg' } },
  tags: [{ id: 'urn:tag:genre:media:comedy', name: 'Comedy', type: 'urn:tag:genre:media' }],
  query: { affinity: 0.91 },
};

test('createClient: mock without key, live with key', () => {
  assert.equal(createClient({}).mode, 'mock');
  assert.equal(createClient({ QLOO_API_KEY: 'k' }).mode, 'live');
  assert.equal(createClient({ QLOO_API_KEY: 'k', QLOO_FORCE_MOCK: '1' }).mode, 'mock');
});

test('normalizeEntity maps Qloo shape to app shape', () => {
  const e = normalizeEntity(rawEntity);
  assert.equal(e.id, rawEntity.entity_id);
  assert.equal(e.type, 'movie');
  assert.equal(e.year, 2022);
  assert.equal(e.affinity, 0.91);
  assert.equal(e.image, 'https://images.qloo.com/x.jpg');
  assert.deepEqual(e.tags, [{ id: 'urn:tag:genre:media:comedy', name: 'Comedy' }]);
});

test('live client: hackathon host, X-Api-Key header, GET + query string', async () => {
  const calls = [];
  const c = new LiveQlooClient({ apiKey: 'SECRET', fetchImpl: fakeFetch({ '/v2/insights': { results: { entities: [rawEntity] } } }, calls) });
  const out = await c.insights({ type: 'movie', signalEntities: ['A', 'B'], excludeEntities: ['A'], take: 5 });
  assert.equal(out.length, 1);
  const { url, opts } = calls[0];
  assert.equal(url.origin, DEFAULT_BASE_URL);
  assert.equal(opts.method, 'GET');
  assert.equal(opts.headers['X-Api-Key'], 'SECRET');
  assert.equal(url.searchParams.get('filter.type'), 'urn:entity:movie');
  assert.equal(url.searchParams.get('signal.interests.entities'), 'A,B');
  assert.equal(url.searchParams.get('filter.exclude.entities'), 'A');
  assert.equal(url.searchParams.get('take'), '5');
  assert.ok(!url.search.includes('SECRET'), 'key must never appear in the URL');
});

test('live client: place queries carry the city; tag analysis hits urn:tag', async () => {
  const calls = [];
  const c = new LiveQlooClient({ apiKey: 'k', fetchImpl: fakeFetch({ '/v2/insights': (u) => (u.searchParams.get('filter.type') === 'urn:tag'
    ? { results: { tags: [{ tag_id: 'urn:tag:x', name: 'X', query: { affinity: 0.8 } }] } } : { results: { entities: [] } }) }, calls) });
  await c.insights({ type: 'place', signalEntities: ['A'], location: 'Lagos' });
  assert.equal(calls[0].url.searchParams.get('filter.location.query'), 'Lagos');
  const tags = await c.tasteTags(['A']);
  assert.deepEqual(tags, [{ id: 'urn:tag:x', name: 'X', affinity: 0.8 }]);
});

test('live client: search 404 = no results; 401 carries a helpful hint; responses are cached', async () => {
  const calls = [];
  const c = new LiveQlooClient({ apiKey: 'k', fetchImpl: fakeFetch({}, calls) });
  assert.deepEqual(await c.search('zzzz'), []);
  const bad = new LiveQlooClient({ apiKey: 'k', maxRetries: 0, fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  await assert.rejects(() => bad.insights({ type: 'movie', signalEntities: ['A'] }), (e) => e.status === 401 && /hackathon\.api\.qloo\.com/.test(e.hint));
  const f2 = []; const c2 = new LiveQlooClient({ apiKey: 'k', fetchImpl: fakeFetch({ '/search': { results: [rawEntity] } }, f2) });
  await c2.search('eeaao'); await c2.search('eeaao');
  assert.equal(f2.length, 1);
});

test('live client retries 429 with bounded backoff', async () => {
  let n = 0;
  const c = new LiveQlooClient({ apiKey: 'k', maxRetries: 2, fetchImpl: async () => (++n < 3 ? { ok: false, status: 429, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ results: [rawEntity] }) }) });
  const r = await c.search('x');
  assert.equal(r.length, 1); assert.equal(n, 3);
});
