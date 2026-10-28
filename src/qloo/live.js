// LiveQlooClient: thin, defensive wrapper over Qloo's hackathon API.
//   base URL : https://hackathon.api.qloo.com   (hackathon keys 401 on any other host)
//   auth     : X-Api-Key header                  (never a query param / Bearer token)
//   insights : GET /v2/insights with query-string params (never POST)
// The key stays server-side. Responses are cached privately in memory only.
import { DOMAINS, urnOf, keyOfUrn } from './types.js';

export const DEFAULT_BASE_URL = 'https://hackathon.api.qloo.com';

export class QlooError extends Error {
  constructor(message, { status, hint, path } = {}) {
    super(message);
    this.name = 'QlooError';
    this.status = status;
    this.hint = hint;
    this.path = path;
  }
}

const HINTS = {
  401: 'Check QLOO_API_KEY and that QLOO_BASE_URL is https://hackathon.api.qloo.com (hackathon keys do not work on api.qloo.com / staging).',
  403: 'The key is valid but this entity type or parameter is not permitted. Use urn:entity:artist (not music) and urn:entity:place or brand (not food_and_drink).',
  404: 'No results (or a wrong path).',
  429: 'Rate limit hit. Retry shortly or ask for a higher quota in the Qloo Discord #api-help.',
};

const MEDIA_PARENTS = ['movie', 'tv_show', 'artist', 'book', 'podcast'];
const PLACE_TAG = 'urn:tag:genre:place:restaurant';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// Qloo returns slightly different shapes per endpoint:
//   /search          -> { types: ['urn:entity:movie'], properties.image.url, tags[{ id, name }] }
//   /v2/insights     -> { subtype: 'urn:entity:movie', query.affinity, tags[{ id, name }] }
//   places           -> properties.images[], properties.address, location { lat, lon }
//   tag analysis     -> results.tags[{ tag_id, name, query.affinity }]
const typeUrnOf = (raw) => {
  const t = raw.subtype ?? (Array.isArray(raw.types) ? raw.types[0] : raw.types) ?? raw.type ?? '';
  return typeof t === 'string' && t.startsWith('urn:entity:') ? t : (Array.isArray(raw.types) ? raw.types.find((x) => x?.startsWith?.('urn:entity:')) ?? '' : '');
};
const englishOf = (list) => asArray(list).find((x) => x?.language === 'en')?.value ?? asArray(list)[0]?.value;
const truncate = (s, n = 280) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);

// Qloo can attach 300+ tags to one entity (mostly plot keywords). Keep the taste-bearing ones
// (genre, style, theme, audience...) first and cap the list so payloads stay small.
const KEYWORD_RE = /^urn:tag:keyword:/;
export function normalizeTags(rawTags, max = 30) {
  const tags = asArray(rawTags).map((t) => ({ id: t.id ?? t.tag_id, name: t.name })).filter((t) => t.id && t.name);
  const rank = (t) => (KEYWORD_RE.test(t.id) ? 1 : 0);
  return tags.map((t, i) => ({ t, i })).sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i).slice(0, max).map(({ t }) => t);
}

export function normalizeEntity(raw) {
  if (!raw) return null;
  const p = raw.properties ?? {};
  const type = keyOfUrn(typeUrnOf(raw));
  const short = typeof p.short_description === 'string' ? p.short_description : englishOf(p.short_descriptions);
  const long = typeof p.description === 'string' ? p.description : '';
  const desc = short || long;
  const year = p.release_year ?? p.publication_year ?? (typeof p.release_date === 'string' ? Number(p.release_date.slice(0, 4)) || null : null);
  const where = type === 'place' ? [p.neighborhood ?? p.geocode?.name, p.geocode?.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ') : '';
  const subtitle = [year, where || (type === 'place' ? p.address : '')].filter(Boolean).join(' · ') || (raw.disambiguation && raw.disambiguation !== raw.name ? raw.disambiguation : '');
  const affinity = raw.query?.affinity ?? raw.query?.measurements?.affinity ?? raw.affinity;
  const image = p.image?.url ?? asArray(p.images)[0]?.url ?? null;
  return {
    id: raw.entity_id ?? raw.id,
    name: raw.name,
    type,
    year: year ?? null,
    subtitle,
    description: truncate(String(desc ?? '')),
    image,
    tags: normalizeTags(raw.tags),
    ...(typeof affinity === 'number' ? { affinity } : {}),
  };
}

export class LiveQlooClient {
  mode = 'live';

  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, maxRetries = 2, timeoutMs = 20000, concurrency = 4, cacheTtlMs = 60 * 60 * 1000 } = {}) {
    if (!apiKey) throw new Error('LiveQlooClient requires an apiKey');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map();
    this.active = 0;
    this.waiters = [];
    this.concurrency = concurrency;
    this.stats = { requests: 0, cacheHits: 0 };
  }

  async #slot() {
    if (this.active >= this.concurrency) await new Promise((r) => this.waiters.push(r));
    this.active++;
  }
  #release() { this.active--; this.waiters.shift()?.(); }

  async request(path, params = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    const url = `${this.baseUrl}${path}?${qs}`;
    const hit = this.cache.get(url);
    if (hit && hit.exp > Date.now()) { this.stats.cacheHits++; return hit.body; }

    await this.#slot();
    try {
      for (let attempt = 0; ; attempt++) {
        this.stats.requests++;
        let res;
        try {
          res = await this.fetch(url, { method: 'GET', headers: { 'X-Api-Key': this.apiKey, accept: 'application/json' }, signal: AbortSignal.timeout(this.timeoutMs) });
        } catch (err) {
          if (attempt < this.maxRetries) { await sleep(400 * 2 ** attempt); continue; }
          throw new QlooError(`Network error calling Qloo: ${err.message}`, { path });
        }
        if (res.status === 404 && path === '/search') return { results: [] };
        if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) { await sleep(500 * 2 ** attempt); continue; }
        if (!res.ok) throw new QlooError(`Qloo ${path} failed with ${res.status}`, { status: res.status, hint: HINTS[res.status], path });
        const body = await res.json();
        this.cache.set(url, { body, exp: Date.now() + this.cacheTtlMs });
        if (this.cache.size > 500) this.cache.delete(this.cache.keys().next().value);
        return body;
      }
    } finally { this.#release(); }
  }

  /** Entity search by name. Falls back to a sensible type set. */
  async search(query, { types = Object.keys(DOMAINS).filter((k) => k !== 'place'), take = 8 } = {}) {
    const body = await this.request('/search', { query, types: types.map(urnOf).filter(Boolean), take });
    const rows = Array.isArray(body.results) ? body.results : body.results?.entities ?? [];
    return rows.map(normalizeEntity).filter((e) => e?.id && e.name);
  }

  /**
   * Taste analysis: which tags best describe this set of entities (Insights with filter.type=urn:tag).
   * `parentTypes` limits tags to the entity types the signals came from (without it Qloo mixes in
   * unrelated place/brand tags such as "VISA" or "Women-owned").
   */
  async tasteTags(entityIds, { take = 14, parentTypes } = {}) {
    if (!entityIds.length) return [];
    if (!parentTypes?.length) parentTypes = MEDIA_PARENTS;
    const body = await this.request('/v2/insights', {
      'filter.type': 'urn:tag',
      'filter.parents.types': [...new Set(parentTypes)].map((t) => (t.startsWith('urn:') ? t : urnOf(t))).filter(Boolean),
      'signal.interests.entities': entityIds,
      take,
    });
    return asArray(body.results?.tags).map((t) => ({
      id: t.tag_id ?? t.id, name: t.name, affinity: t.query?.affinity ?? t.affinity ?? 0.5,
    })).filter((t) => t.id && t.name);
  }

  /** Recommendations for a domain, optionally restricted to given candidate ids to read per-signal affinity. */
  async insights({ type, signalEntities, excludeEntities = [], resultEntities = null, location = null, take = 20 }) {
    const params = {
      'filter.type': urnOf(type),
      'signal.interests.entities': signalEntities,
      'filter.exclude.entities': excludeEntities,
      'filter.results.entities': resultEntities ?? undefined,
      'filter.location.query': type === 'place' ? location ?? undefined : undefined,
      // Without a category Qloo also returns ATMs, bus stops and the like; we want somewhere to eat/drink together.
      'filter.tags': type === 'place' ? PLACE_TAG : undefined,
      take: Math.min(take, 50),
    };
    const body = await this.request('/v2/insights', params);
    return asArray(body.results?.entities).map(normalizeEntity).filter((e) => e?.id && e.name);
  }
}
