import test from 'node:test';
import assert from 'node:assert/strict';
import { MockQlooClient } from '../src/qloo/mock.js';
import { runMediator } from '../src/agent/mediator.js';
import { validatePlanInput } from '../src/agent/validate.js';

const client = new MockQlooClient();
const find = async (n) => (await client.search(n))[0];

test('mock search finds titles', async () => {
  const e = await find('blade runner');
  assert.equal(e.name, 'Blade Runner 2049');
});

test('mediator returns a fair, explained plan end-to-end (mock)', async () => {
  const input = { city: 'London', domains: ['movie', 'artist', 'place'], people: [
    { id: 'p0', name: 'Maya', entities: [await find('Blade Runner 2049'), await find('Radiohead')] },
    { id: 'p1', name: 'Jonas', entities: [await find('Amélie'), await find('Khruangbin')] },
  ] };
  const events = [];
  const result = await runMediator({ client, input, emit: (e) => events.push(e), env: {} });
  assert.equal(result.mode, 'mock');
  assert.ok(events.some((e) => e.type === 'step' && e.id === 'discover-movie' && e.status === 'done'));
  assert.equal(events.at(-1).type, 'result');
  assert.equal(result.plan.items.length, 3);
  const loved = new Set(input.people.flatMap((p) => p.entities.map((e) => e.id)));
  for (const it of result.plan.items) {
    assert.ok(!loved.has(it.entity.id), 'never recommends what they already love');
    assert.ok(it.harmony > 0 && it.harmony <= 1);
    assert.equal(Object.keys(it.affinities).length, 2);
    assert.ok(it.why.length > 10);
  }
  const place = result.plan.items.find((i) => i.domain === 'place');
  assert.equal(place.entity.subtitle, 'London');
  // best pick in a domain has the top harmony among that domain's picks
  for (const d of result.domains) for (let i = 1; i < d.picks.length; i++) assert.ok(d.picks[i - 1].harmony >= d.picks[i].harmony);
  assert.ok(result.plan.headline.length > 5);
});

test('mediator degrades gracefully when a domain errors', async () => {
  const flaky = Object.create(client);
  flaky.insights = async (args) => { if (args.type === 'book') throw Object.assign(new Error('boom'), { hint: 'try later' }); return client.insights(args); };
  const input = { city: 'Lagos', domains: ['movie', 'book'], people: [
    { id: 'p0', name: 'A', entities: [await find('Dune')] }, { id: 'p1', name: 'B', entities: [await find('Parasite')] } ] };
  const result = await runMediator({ client: flaky, input, env: {} });
  assert.equal(result.domains.find((d) => d.key === 'book').picks.length, 0);
  assert.ok(result.domains.find((d) => d.key === 'movie').picks.length > 0);
});

test('input validation', () => {
  assert.equal(validatePlanInput({ people: [{ name: 'x', entities: [] }] }).ok, false);
  const ok = validatePlanInput({ people: [
    { name: '<b>Maya</b>', entities: [{ id: 'mock-movie-dune', name: 'Dune', type: 'movie' }] },
    { name: 'Jonas', entities: [{ id: 'ABC-123', name: 'Amélie', type: 'movie' }, { id: 'bad id!!', name: 'x' }] } ], domains: ['movie', 'hax'] });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.people[0].name, 'bMaya/b'); // angle brackets stripped; the UI also escapes
  assert.equal(ok.value.people[1].entities.length, 1);
  assert.deepEqual(ok.value.domains, ['movie']);
});
