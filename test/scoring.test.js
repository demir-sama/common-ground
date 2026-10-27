import test from 'node:test';
import assert from 'node:assert/strict';
import { harmony, balance, overlap, commonGround, rankCandidates, overlapCoefficient } from '../src/agent/scoring.js';

test('harmony punishes a cold person (least-misery)', () => {
  assert.ok(harmony([0.9, 0.9]) > harmony([1, 0.5]));
  assert.ok(harmony([0.7, 0.7]) > harmony([0.99, 0.3]));
});
test('balance is 1 when even and shrinks with the gap', () => {
  assert.equal(balance([0.8, 0.8]), 1);
  assert.ok(Math.abs(balance([0.9, 0.4]) - 0.5) < 1e-9);
});
test('overlap coefficient', () => {
  const a = new Map([['x', 1], ['y', 1]]); const b = new Map([['x', 1], ['z', 1]]);
  assert.equal(overlapCoefficient(a, b), 0.5);
  assert.equal(overlapCoefficient(a, new Map()), 0);
});
const profiles = [
  { id: 'a', name: 'A', tags: [{ id: 't1', name: 'Noir', affinity: 0.9 }, { id: 't2', name: 'Jazz', affinity: 0.6 }, { id: 't3', name: 'Sci-fi', affinity: 0.8 }] },
  { id: 'b', name: 'B', tags: [{ id: 't1', name: 'Noir', affinity: 0.7 }, { id: 't4', name: 'Folk', affinity: 0.9 }] },
];
test('overlap + common ground', () => {
  const o = overlap(profiles);
  assert.ok(o.score > 0 && o.score < 1);
  const cg = commonGround(profiles);
  assert.deepEqual(cg.shared.map((t) => t.id), ['t1']);
  assert.deepEqual(cg.distinct.a.map((t) => t.id), ['t3', 't2']);
  assert.deepEqual(cg.distinct.b.map((t) => t.id), ['t4']);
});
test('rankCandidates prefers the fair pick over the lopsided favourite', () => {
  const r = rankCandidates([
    { id: 'lopsided', affinities: { a: 0.99, b: 0.35 } },
    { id: 'fair', affinities: { a: 0.7, b: 0.72 } },
  ]);
  assert.equal(r[0].id, 'fair');
});
