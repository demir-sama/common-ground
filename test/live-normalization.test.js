import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { LiveQlooClient, normalizeEntity, normalizeTags } from '../src/qloo/live.js';
import { runMediator } from '../src/agent/mediator.js';
import { SEARCH_MOVIE, INSIGHTS_MOVIES, INSIGHTS_PLACES, TAG_ANALYSIS, ID } from './fixtures/qloo-samples.js';

const KEY = 'test-key-not-real';
const router = (calls = []) => async (url) => {
  const u = new URL(url);
  calls.push(u);
  let body;
  if (u.pathname === '/search') body = SEARCH_MOVIE;
  else if (u.searchParams.get('filter.type') === 'urn:tag') body = TAG_ANALYSIS;
  else if (u.searchParams.get('filter.type') === 'urn:entity:place') body = INSIGHTS_PLACES;
  else if (u.searchParams.get('filter.type') === 'urn:entity:movie') body = INSIGHTS_MOVIES;
  else body = { success: true, results: { entities: [] } };
  return { ok: true, status: 200, json: async () => body };
};

test('search shape: types[] array, short English synopsis, image, tags (id) keyword tags last', () => {
  const [movie, artist] = SEARCH_MOVIE.results.map(normalizeEntity);
  assert.equal(movie.id, ID.movieA);
  assert.equal(movie.type, 'movie');
  assert.equal(movie.year, 2010);
  assert.equal(movie.subtitle, '2010');
  assert.equal(movie.description, 'A short English synopsis.');
  assert.equal(movie.image, 'https://images.example.test/i/movie-a-420x-auto.jpg');
  assert.deepEqual(movie.tags.map((t) => t.name), ['Mind-Bending', 'Thriller', 'Plot keyword']);
  assert.equal(artist.type, 'artist');
  assert.equal(artist.subtitle, '', 'a disambiguation equal to the name is noise');
  assert.equal(artist.description, 'An artist.');
  assert.equal(movie.affinity, undefined);
});

test('long descriptions are truncated', () => {
  const e = normalizeEntity({ ...SEARCH_MOVIE.results[0], properties: { description: 'word '.repeat(200) } });
  assert.ok(e.description.length <= 281);
  assert.ok(e.description.endsWith('…'));
});

test('insights shape: subtype + query.affinity', () => {
  const e = normalizeEntity(INSIGHTS_MOVIES.results.entities[0]);
  assert.equal(e.type, 'movie');
  assert.equal(e.affinity, 0.8421);
  assert.equal(e.year, 1999);
  assert.deepEqual(e.tags, [{ id: 'urn:tag:genre:media:drama', name: 'Drama' }]);
});

test('place shape: images[], neighborhood + city subtitle, falls back to city / address', () => {
  const [a, b] = INSIGHTS_PLACES.results.entities.map(normalizeEntity);
  assert.equal(a.type, 'place');
  assert.equal(a.image, 'https://images.example.test/i/place-a-outside.jpg');
  assert.equal(a.subtitle, 'Victoria Island, Lagos');
  assert.equal(a.affinity, 0.7923);
  assert.equal(b.subtitle, 'London');
  assert.equal(b.image, null);
});

test('normalizeTags caps the list and handles tag_id / id', () => {
  const many = Array.from({ length: 300 }, (_, i) => ({ id: `urn:tag:keyword:media:k${i}`, name: `k${i}` }));
  many.push({ tag_id: 'urn:tag:genre:media:comedy', name: 'Comedy' });
  const t = normalizeTags(many);
  assert.equal(t.length, 30);
  assert.equal(t[0].id, 'urn:tag:genre:media:comedy');
  assert.deepEqual(normalizeTags([{ name: 'x' }, null].filter(Boolean)), []);
});

test('tasteTags: media-only parent types by default, tag_id + affinity parsed', async () => {
  const calls = [];
  const c = new LiveQlooClient({ apiKey: KEY, fetchImpl: router(calls) });
  const tags = await c.tasteTags([ID.movieA]);
  assert.equal(calls[0].searchParams.get('filter.type'), 'urn:tag');
  assert.equal(calls[0].searchParams.get('filter.parents.types'), 'urn:entity:movie,urn:entity:tv_show,urn:entity:artist,urn:entity:book,urn:entity:podcast');
  assert.deepEqual(tags[0], { id: 'urn:tag:subgenre:qloo:mind_bending', name: 'Mind-Bending', affinity: 0.9998 });
  await c.tasteTags([ID.movieB], { parentTypes: ['movie', 'movie', 'artist'] });
  assert.equal(calls[1].searchParams.get('filter.parents.types'), 'urn:entity:movie,urn:entity:artist');
});

test('insights for places add the restaurant tag filter and the city; other types do not', async () => {
  const calls = [];
  const c = new LiveQlooClient({ apiKey: KEY, fetchImpl: router(calls) });
  const places = await c.insights({ type: 'place', signalEntities: [ID.movieA], location: 'Lagos' });
  assert.equal(places.length, 2);
  assert.equal(calls[0].searchParams.get('filter.tags'), 'urn:tag:genre:place:restaurant');
  assert.equal(calls[0].searchParams.get('filter.location.query'), 'Lagos');
  await c.insights({ type: 'movie', signalEntities: [ID.movieA], resultEntities: [ID.movieB] });
  assert.equal(calls[1].searchParams.get('filter.tags'), null);
  assert.equal(calls[1].searchParams.get('filter.results.entities'), ID.movieB);
});

test('search sends comma-joined entity URNs and the key only in the header', async () => {
  const calls = []; const headers = [];
  const c = new LiveQlooClient({ apiKey: KEY, fetchImpl: async (url, o) => { headers.push(o.headers); return router(calls)(url); } });
  const r = await c.search('sample', { types: ['movie', 'artist'] });
  assert.equal(r.length, 2);
  assert.equal(calls[0].searchParams.get('types'), 'urn:entity:movie,urn:entity:artist');
  assert.equal(headers[0]['X-Api-Key'], KEY);
  assert.ok(!calls[0].href.includes(KEY));
});

test('whole flow on live-shaped responses: mediator returns a live-mode plan', async () => {
  const c = new LiveQlooClient({ apiKey: KEY, fetchImpl: router() });
  const [movie, artist] = (await c.search('sample'));
  const events = [];
  const result = await runMediator({
    client: c, emit: (e) => events.push(e), env: {},
    input: { city: 'Lagos', domains: ['movie', 'place'], people: [
      { id: 'p0', name: 'Ada', entities: [movie] }, { id: 'p1', name: 'Bayo', entities: [artist] } ] },
  });
  assert.equal(result.mode, 'live');
  const movies = result.domains.find((d) => d.key === 'movie').picks;
  assert.equal(movies[0].entity.name, 'Another Movie');
  assert.ok(movies[0].harmony > 0.5);
  const places = result.domains.find((d) => d.key === 'place').picks;
  assert.equal(places[0].entity.name, 'Sample Garden Restaurant');
  assert.ok(result.plan.headline.length > 0);
  assert.ok(!events.some((e) => e.type === 'error'));
  assert.ok(!JSON.stringify(result).includes(KEY));
});

test('repo hygiene: no Qloo API key committed anywhere in the source tree', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const skip = new Set(['node_modules', '.git', '.vercel']);
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (skip.has(d.name) || d.name.startsWith('.env') && d.name !== '.env.example' ? [] : d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  for (const f of walk(root)) {
    if (/\.(jpg|png|ico)$/.test(f)) continue;
    assert.ok(!/hack_[0-9a-f]{20,}/i.test(readFileSync(f, 'utf8')), `key-like string in ${path.relative(root, f)}`);
  }
});
