// Turns structured Qloo evidence into human copy.
// Default: deterministic templates grounded in the Qloo tags (works with no LLM).
// Optional: if LLM_API_KEY is set, an OpenAI-compatible chat model rewrites the copy.
// The LLM never invents entities — it only phrases results Qloo already returned.

const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

const h = (str) => [...String(str)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

export function templateWhy(pick, people, shared) {
  const sharedTags = pick.entity.tags.filter((t) => shared.has(t.id)).map((t) => t.name.toLowerCase()).slice(0, 3);
  const echoes = people
    .map((p) => pick.bridges?.[p.id] && { who: p.name, thing: pick.bridges[p.id].entityName })
    .filter(Boolean);
  const gap = Math.round(Math.abs(Math.max(...Object.values(pick.affinities)) - Math.min(...Object.values(pick.affinities))) * 100);
  const evenness = gap <= 8 ? 'Almost perfectly even for everyone.' : gap <= 18 ? 'Close to even for everyone.' : 'A touch more of a favourite for one of you — worth the trade.';
  const echoText = echoes.length > 1 ? list(echoes.map((e) => `${e.who}'s ${e.thing}`)) : echoes[0] ? `${echoes[0].who}'s ${echoes[0].thing}` : '';
  const sharedText = sharedTags.length ? list(sharedTags) : '';
  const variants = [
    () => echoText && sharedText ? `${echoText} both point here — it lives in the ${sharedText} ground you share.` : null,
    () => echoText ? `Bridges ${echoText}. ${evenness}` : null,
    () => sharedText ? `Lands right on your shared ${sharedText} taste. ${evenness}` : null,
  ];
  const start = h(pick.entity.id) % variants.length;
  for (let k = 0; k < variants.length; k++) { const out = variants[(start + k) % variants.length](); if (out) return out; }
  return `Where your tastes overlap most in this category. ${evenness}`;
}

export function templateHeadline(result) {
  const names = result.people.map((p) => p.name);
  const shared = result.commonGround.shared.slice(0, 3).map((t) => t.name.toLowerCase());
  const pct = Math.round(result.overlap.score * 100);
  if (!shared.length) return `${list(names)}: different worlds, one good night.`;
  return `${list(names)} overlap ${pct}% — the sweet spot is ${list(shared)}.`;
}

async function llmRewrite(result, env, fetchImpl) {
  const base = (env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const labels = Object.fromEntries(result.people.map((p, i) => [p.id, `Person ${i + 1}`]));
  const payload = {
    people: result.people.map((p) => labels[p.id]),
    shared_tags: result.commonGround.shared.map((t) => t.name),
    picks: result.plan.items.map((it) => ({
      id: it.entity.id, domain: it.domain, title: it.entity.name, tags: it.entity.tags.map((t) => t.name).slice(0, 8),
      affinity: Object.fromEntries(Object.entries(it.affinities).map(([k, v]) => [labels[k], Math.round(v * 100)])),
      echoes: Object.fromEntries(Object.entries(it.bridges ?? {}).map(([k, v]) => [labels[k], v.entityName])),
    })),
  };
  const res = await fetchImpl(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.LLM_API_KEY}` },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a warm, witty taste mediator. Using ONLY the evidence given (Qloo affinity data), write one headline (max 14 words) and one "why" sentence (max 28 words) per pick explaining why it works for everyone. Never add titles that are not in the evidence. Return JSON: {"headline": string, "why": {"<pick id>": string}}.' },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const out = JSON.parse((await res.json()).choices?.[0]?.message?.content ?? '{}');
  const unlabel = (s) => result.people.reduce((t, p, i) => t.replaceAll(`Person ${i + 1}`, p.name), String(s));
  return { headline: out.headline ? unlabel(out.headline) : null, why: Object.fromEntries(Object.entries(out.why ?? {}).map(([k, v]) => [k, unlabel(v)])) };
}

/** Mutates + returns result with `why` strings and headline. Always succeeds (LLM is best-effort). */
export async function narrate(result, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const shared = new Set(result.commonGround.shared.map((t) => t.id));
  const all = result.domains.flatMap((d) => d.picks).concat(result.plan.items);
  for (const pick of all) pick.why = templateWhy(pick, result.people, shared);
  result.plan.headline = templateHeadline(result);
  result.narration = 'template';
  if (env.LLM_API_KEY) {
    try {
      const out = await llmRewrite(result, env, fetchImpl);
      if (out.headline) result.plan.headline = out.headline;
      for (const it of result.plan.items) if (out.why[it.entity.id]) it.why = out.why[it.entity.id];
      for (const d of result.domains) for (const pk of d.picks) {
        const planned = result.plan.items.find((it) => it.entity.id === pk.entity.id);
        if (planned) pk.why = planned.why;
      }
      result.narration = 'llm';
    } catch { /* keep templates */ }
  }
  return result;
}
