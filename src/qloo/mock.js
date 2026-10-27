// MockQlooClient: a deterministic, offline stand-in for Qloo's API.
// It honours the same client interface as LiveQlooClient. NOT real Qloo data.
import { TAGS, MOVIES, TV, ARTISTS, BOOKS, PODCASTS, PLACES, CITIES } from './mock-catalog.js';

const tagObj = (key) => ({ id: `urn:tag:mock:${key}`, name: TAGS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function build() {
  const all = [];
  const add = (type, rows, extra = () => ({})) => {
    for (const [name, year, tagStr, description] of rows) {
      all.push({
        id: `mock-${type}-${slug(name)}`, name, type, year, description, image: null,
        subtitle: year ? String(year) : '',
        tags: tagStr.split(' ').filter(Boolean).map(tagObj), ...extra(),
      });
    }
  };
  add('movie', MOVIES); add('tv_show', TV); add('artist', ARTISTS); add('book', BOOKS); add('podcast', PODCASTS);
  for (const [city, rows] of Object.entries(PLACES)) {
    for (const [name, description, tagStr] of rows) {
      all.push({
        id: `mock-place-${slug(city)}-${slug(name)}`, name, type: 'place', year: null, description, image: null,
        subtitle: city, city, tags: tagStr.split(' ').map(tagObj),
      });
    }
  }
  return all;
}

const CATALOG = build();
const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

function tagVector(entities) {
  const v = new Map();
  for (const e of entities) for (const t of e.tags) v.set(t.id, (v.get(t.id) ?? 0) + 1);
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; dot += x * (b.get(k) ?? 0); }
  for (const x of b.values()) nb += x * x;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
// Maps cosine similarity to a 0..1 "affinity" with deterministic jitter, so ordering is stable.
function affinityOf(entity, signalVec, salt) {
  const sim = cosine(signalVec, tagVector([entity]));
  const jitter = (hash(entity.id + salt) - 0.5) * 0.05;
  return Math.max(0.05, Math.min(0.99, 0.3 + Math.pow(sim, 0.65) * 0.66 + jitter));
}

const strip = (e, affinity) => ({ ...e, ...(affinity != null ? { affinity: Number(affinity.toFixed(4)) } : {}) });

export class MockQlooClient {
  mode = 'mock';
  cities = CITIES;

  async search(query, { types = [], take = 8 } = {}) {
    const q = String(query ?? '').trim().toLowerCase();
    if (!q) return [];
    const wanted = new Set(types);
    return CATALOG
      .filter((e) => (!wanted.size || wanted.has(e.type)))
      .filter((e) => e.type !== 'place') // places are discovered by city, not searched, in the mock
      .map((e) => {
        const n = e.name.toLowerCase();
        const score = n === q ? 3 : n.startsWith(q) ? 2 : n.includes(q) ? 1 : 0;
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
      .slice(0, take)
      .map((x) => strip(x.e));
  }

  async suggest(take = 12) {
    // starter shelf for the empty-state autocomplete
    return CATALOG.filter((e) => e.type !== 'place' && hash(e.id) > 0.55).slice(0, take).map((e) => strip(e));
  }

  async tasteTags(entityIds, { take = 14 } = {}) {
    const ents = entityIds.map((id) => BY_ID.get(id)).filter(Boolean);
    const v = tagVector(ents);
    const max = Math.max(1, ...v.values());
    return [...v.entries()]
      .map(([id, c]) => ({ id, name: [...ents.flatMap((e) => e.tags)].find((t) => t.id === id).name, affinity: Number((0.35 + 0.6 * (c / max)).toFixed(3)) }))
      .sort((a, b) => b.affinity - a.affinity || a.name.localeCompare(b.name))
      .slice(0, take);
  }

  async insights({ type, signalEntities = [], excludeEntities = [], resultEntities = null, location = null, take = 20 }) {
    const sig = signalEntities.map((id) => BY_ID.get(id)).filter(Boolean);
    if (!sig.length) return [];
    const vec = tagVector(sig);
    const salt = sig.map((e) => e.id).sort().join('|');
    const exclude = new Set(excludeEntities);
    let pool = CATALOG.filter((e) => e.type === type && !exclude.has(e.id));
    if (type === 'place') {
      const city = CITIES.find((c) => c.toLowerCase() === String(location ?? '').trim().toLowerCase()) ?? CITIES[0];
      pool = pool.filter((e) => e.city === city);
    }
    if (resultEntities) { const want = new Set(resultEntities); pool = CATALOG.filter((e) => want.has(e.id)); }
    return pool
      .map((e) => strip(e, affinityOf(e, vec, salt)))
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, take);
  }
}
