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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export function normalizeEntity(raw) {
  if (!raw) return null;
  const p = raw.properties ?? {};
  const type = keyOfUrn(raw.subtype ?? raw.type ?? '');
  const desc = p.description ?? p.short_description ?? asArray(p.short_descriptions)[0]?.value ?? '';
  const year = p.release_year ?? (p.publication_year ?? null);
  const city = raw.location?.name ?? p.geocode?.name ?? null;
  const subtitle = [year, type === 'place' ? (p.address ?? city) : city].filter(Boolean).join(' · ') || (raw.disambiguation ?? '');
  const affinity = raw.query?.affinity ?? raw.query?.measurements?.affinity ?? raw.affinity ?? undefined;
  return {
    id: raw.entity_id ?? raw.id,
    name: raw.name,
    type,
    year: year ?? null,
    subtitle,
    description: typeof desc === 'string' ? desc : '',
    image: p.image?.url ?? null,
    tags: asArray(raw.tags).map((t) => ({ id: t.id ?? t.tag_id, name: t.name })).filter((t) => t.id && t.name),
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

  /** Taste analysis: which tags best describe this set of entities. */
  async tasteTags(entityIds, { take = 14 } = {}) {
    if (!entityIds.length) return [];
    const body = await this.request('/v2/insights', { 'filter.type': 'urn:tag', 'signal.interests.entities': entityIds, take });
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
      take: Math.min(take, 50),
    };
    const body = await this.request('/v2/insights', params);
    return asArray(body.results?.entities).map(normalizeEntity).filter((e) => e?.id && e.name);
  }
}
