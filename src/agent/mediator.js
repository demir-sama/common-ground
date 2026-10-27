// The Mediator agent.
// Given what each person loves, it calls Qloo's taste graph as tools, reasons over the
// evidence (least-misery group scoring), and returns a plan that works for everyone.
// Every step is emitted as a trace event so the UI can show the agent working.
import { DOMAINS, DOMAIN_KEYS } from '../qloo/types.js';
import { commonGround, overlap, rankCandidates } from './scoring.js';
import { narrate } from './narrator.js';

export const DEFAULT_DOMAINS = ['movie', 'tv_show', 'artist', 'book', 'place'];
const PICKS_PER_DOMAIN = 3;
const CANDIDATES = 14;

/** Run async tasks with a small concurrency cap. */
async function pool(tasks, limit = 3) {
  const out = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) { const i = next++; out[i] = await tasks[i](); }
  }));
  return out;
}

const bridgeFor = (pick, person) => {
  const pickTags = new Set(pick.tags.map((t) => t.id));
  let best = null;
  for (const e of person.entities) {
    const shared = (e.tags ?? []).filter((t) => pickTags.has(t.id));
    if (shared.length && (!best || shared.length > best.shared.length)) best = { entityName: e.name, shared };
  }
  return best ? { entityName: best.entityName, sharedTags: best.shared.map((t) => t.name).slice(0, 3) } : null;
};

export async function runMediator({ client, input, emit = () => {}, env = process.env, fetchImpl }) {
  const t0 = Date.now();
  const people = input.people;
  const domains = (input.domains?.length ? input.domains : DEFAULT_DOMAINS).filter((d) => DOMAIN_KEYS.includes(d));
  const city = input.city || null;
  const step = (id, title, detail = '', tool = null) => emit({ type: 'step', id, status: 'start', title, detail, tool });
  const done = (id, detail, extra = {}) => emit({ type: 'step', id, status: 'done', detail, ...extra });

  // 1 — understand
  const loved = people.reduce((n, p) => n + p.entities.length, 0);
  step('understand', 'Reading the room', `${people.length} people · ${loved} loved things · ${domains.length} categories to search${city ? ` · ${city}` : ''}`);
  done('understand', `${people.map((p) => `${p.name}: ${p.entities.map((e) => e.name).join(', ')}`).join('  |  ')}`);

  // 2 — taste profile per person (Qloo taste analysis)
  const profiles = await pool(people.map((p, i) => async () => {
    const id = `profile-${i}`;
    step(id, `Profiling ${p.name}'s taste`, `${p.entities.length} signals → taste tags`, 'qloo.tasteTags');
    const tags = await client.tasteTags(p.entities.map((e) => e.id), { take: 16 }).catch(() => []);
    done(id, tags.length ? `Top tags: ${tags.slice(0, 5).map((t) => t.name).join(', ')}` : 'No tags returned — falling back to the entities\' own tags');
    return { id: p.id, name: p.name, tags: tags.length ? tags : fallbackTags(p) };
  }), 4);

  // 3 — overlap + common ground
  step('overlap', 'Mapping common ground', 'Comparing tag affinity across everyone', 'agent.overlap');
  const ov = overlap(profiles);
  const cg = commonGround(profiles);
  done('overlap', `${Math.round(ov.score * 100)}% overlap · shared: ${cg.shared.slice(0, 4).map((t) => t.name).join(', ') || 'none yet — the agent will bridge via related tags'}`);

  // 4 — discover per domain
  const allIds = people.flatMap((p) => p.entities.map((e) => e.id));
  const domainResults = await pool(domains.map((d) => async () => {
    const id = `discover-${d}`;
    const label = DOMAINS[d].label;
    step(id, `Searching ${label.toLowerCase()} for everyone`, `Combined taste signal → ${CANDIDATES} candidates, then each person's own affinity`, 'qloo.insights');
    try {
      const cands = await client.insights({ type: d, signalEntities: allIds, excludeEntities: allIds, location: d === 'place' ? city : null, take: CANDIDATES });
      if (!cands.length) { done(id, 'Nothing found'); return { key: d, label, icon: DOMAINS[d].icon, picks: [], note: d === 'place' && !city ? 'Add a city to get places.' : 'No results from Qloo for this category.' }; }
      const candIds = cands.map((c) => c.id);
      const per = await Promise.all(people.map((p) =>
        client.insights({ type: d, signalEntities: p.entities.map((e) => e.id), resultEntities: candIds, location: d === 'place' ? city : null, take: CANDIDATES }).catch(() => [])));
      const scored = cands.map((c) => {
        let estimated = false;
        const affinities = {};
        people.forEach((p, i) => {
          const hit = per[i].find((x) => x.id === c.id);
          if (hit && typeof hit.affinity === 'number') affinities[p.id] = hit.affinity;
          else { affinities[p.id] = typeof c.affinity === 'number' ? c.affinity * 0.85 : 0.5; estimated = true; }
        });
        return { entity: c, domain: d, affinities, estimated };
      });
      const ranked = rankCandidates(scored).slice(0, PICKS_PER_DOMAIN).map((r) => ({
        ...r,
        bridges: Object.fromEntries(people.map((p) => [p.id, bridgeFor(r.entity, p)]).filter(([, v]) => v)),
      }));
      done(id, `Best fit: ${ranked[0].entity.name} (harmony ${Math.round(ranked[0].harmony * 100)})`);
      return { key: d, label, icon: DOMAINS[d].icon, picks: ranked };
    } catch (err) {
      done(id, `Skipped — ${err.message}${err.hint ? ` (${err.hint})` : ''}`, { error: true });
      return { key: d, label, icon: DOMAINS[d].icon, picks: [], note: err.message };
    }
  }), 3);

  // 5 — compose the plan
  step('compose', 'Composing tonight\'s plan', 'Picking the best harmony in each category', 'agent.compose');
  const items = domainResults.filter((d) => d.picks.length).map((d) => d.picks[0]);
  const result = {
    mode: client.mode,
    city,
    people: people.map((p, i) => ({ id: p.id, name: p.name, index: i, loved: p.entities.map((e) => ({ id: e.id, name: e.name, type: e.type })), topTags: (profiles[i].tags).slice(0, 6) })),
    overlap: ov,
    commonGround: cg,
    domains: domainResults,
    plan: { headline: '', items },
    disclaimer: 'Qloo results are aggregate cultural affinities, not predictions about any individual. Names you type are labels only and are never sent to Qloo.',
    ms: 0,
  };
  await narrate(result, { env, fetchImpl });
  result.ms = Date.now() - t0;
  done('compose', result.plan.headline);
  emit({ type: 'result', result });
  return result;
}

function fallbackTags(person) {
  const m = new Map();
  for (const e of person.entities) for (const t of e.tags ?? []) m.set(t.id, { id: t.id, name: t.name, affinity: Math.min(0.95, (m.get(t.id)?.affinity ?? 0.3) + 0.2) });
  return [...m.values()].sort((a, b) => b.affinity - a.affinity).slice(0, 14);
}
