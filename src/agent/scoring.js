// Group-taste maths. Pure functions, no I/O — unit tested.

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Harmony = how well a candidate works for EVERYONE.
 * Least-misery (the worst-off person) dominates; the average breaks ties.
 * This is what stops one enthusiast from dragging the group somewhere the other would hate.
 */
export function harmony(affinities) {
  const xs = affinities.filter((x) => typeof x === 'number');
  if (!xs.length) return 0;
  const min = Math.min(...xs);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return clamp01(0.6 * min + 0.4 * mean);
}

/** 1 = perfectly even across people, 0 = one person loves it and another is cold. */
export function balance(affinities) {
  const xs = affinities.filter((x) => typeof x === 'number');
  if (xs.length < 2) return 1;
  return clamp01(1 - (Math.max(...xs) - Math.min(...xs)));
}

/**
 * Overlap coefficient between two {tagId -> weight} maps:
 * sum(min) / min(sum(A), sum(B)) — "how much of the smaller taste profile is covered by the other".
 * More intuitive for a human-facing "taste overlap" than plain Jaccard.
 */
export function overlapCoefficient(a, b) {
  let inter = 0, sa = 0, sb = 0;
  for (const [k, x] of a) { sa += x; inter += Math.min(x, b.get(k) ?? 0); }
  for (const y of b.values()) sb += y;
  const d = Math.min(sa, sb);
  return d ? inter / d : 0;
}

/** Weighted Jaccard between two {tagId -> weight} maps. */
export function weightedJaccard(a, b) {
  let inter = 0, union = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const x = a.get(k) ?? 0, y = b.get(k) ?? 0;
    inter += Math.min(x, y);
    union += Math.max(x, y);
  }
  return union ? inter / union : 0;
}

export const toTagMap = (tags) => new Map(tags.map((t) => [t.id, t.affinity ?? 0.5]));

/** Average pairwise overlap across all people, plus each pair's score. */
export function overlap(profiles) {
  const pairs = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      pairs.push({ a: profiles[i].id, b: profiles[j].id, score: overlapCoefficient(toTagMap(profiles[i].tags), toTagMap(profiles[j].tags)) });
    }
  }
  const score = pairs.length ? pairs.reduce((s, p) => s + p.score, 0) / pairs.length : 0;
  return { score, pairs };
}

/**
 * Tags everyone shares (the "common ground") and, per person, the tags that are
 * theirs alone (the "gap" the agent has to bridge).
 */
export function commonGround(profiles, { limit = 10 } = {}) {
  const maps = profiles.map((p) => toTagMap(p.tags));
  const names = new Map(profiles.flatMap((p) => p.tags.map((t) => [t.id, t.name])));
  const shared = [];
  for (const id of maps[0]?.keys() ?? []) {
    if (maps.every((m) => m.has(id))) {
      shared.push({ id, name: names.get(id), weight: maps.reduce((s, m) => s + m.get(id), 0) / maps.length });
    }
  }
  shared.sort((a, b) => b.weight - a.weight);
  const distinct = {};
  profiles.forEach((p, i) => {
    distinct[p.id] = p.tags
      .filter((t) => !maps.some((m, j) => j !== i && m.has(t.id)))
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, 6)
      .map((t) => ({ id: t.id, name: t.name, weight: t.affinity }));
  });
  return { shared: shared.slice(0, limit), distinct };
}

/** Rank candidates (each with .affinities {personId: n}) by harmony, then balance. */
export function rankCandidates(cands) {
  return cands
    .map((c) => {
      const vals = Object.values(c.affinities);
      return { ...c, harmony: harmony(vals), balance: balance(vals) };
    })
    .sort((a, b) => b.harmony - a.harmony || b.balance - a.balance);
}
