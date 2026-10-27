// Defensive input validation for the public API (keeps the Qloo key + quota safe).
import { DOMAIN_KEYS } from '../qloo/types.js';

const MAX_PEOPLE = 4, MAX_ENTITIES = 8, MAX_STR = 120;
const clean = (s, n = MAX_STR) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const idOk = (s) => /^[A-Za-z0-9_:\-.]{3,80}$/.test(s);

export function validatePlanInput(body) {
  const errs = [];
  const people = Array.isArray(body?.people) ? body.people.slice(0, MAX_PEOPLE) : [];
  if (people.length < 2) errs.push('Add at least two people.');
  const out = people.map((p, i) => {
    const entities = (Array.isArray(p?.entities) ? p.entities : []).slice(0, MAX_ENTITIES)
      .map((e) => ({
        id: clean(e?.id, 80), name: clean(e?.name), type: clean(e?.type, 20),
        tags: (Array.isArray(e?.tags) ? e.tags : []).slice(0, 30).map((t) => ({ id: clean(t?.id, 120), name: clean(t?.name, 60) })).filter((t) => t.id && t.name),
      }))
      .filter((e) => idOk(e.id) && e.name);
    if (!entities.length) errs.push(`${clean(p?.name) || `Person ${i + 1}`} needs at least one loved thing.`);
    return { id: `p${i}`, name: clean(p?.name, 24) || `Person ${i + 1}`, entities };
  });
  const domains = (Array.isArray(body?.domains) ? body.domains : []).filter((d) => DOMAIN_KEYS.includes(d));
  return { ok: !errs.length, errors: errs, value: { people: out, city: clean(body?.city, 60) || null, domains } };
}
