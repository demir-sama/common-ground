# Common Ground — a taste mediator agent, powered by Qloo

> Two (or four) people. Everyone's favourite films, albums and books. **One plan that nobody has to compromise on.**

Common Ground is an agentic web app built for the **Qloo LLM / Agentic Hackathon**. Each person tells it a few things they love. An agent then uses the **Qloo Taste AI™ API** to:

1. read every person's *taste profile* (the tags behind what they love),
2. measure how much those tastes overlap and find the **common ground**,
3. search for things *everybody* would enjoy — films, series, music, books and places in your city — and score every candidate **per person**,
4. pick the fairest option in each category and explain *why*, tracing it back to each person's own favourites.

It works for date nights, roommates, friend groups, team offsites, family movie night… anywhere two people with different taste have to share one evening. Taste is universal, so the product is too — it is language- and country-agnostic. In live mode any city Qloo has place data for works (verified with Lagos, London, New York and Tokyo); the offline mock ships with six cities.

*Screenshots below are from the deployed demo running on live Qloo data (Lagos preset).*

![Home](docs/img/01-home.jpg)
![Verdict](docs/img/03-verdict.jpg)
![Plan](docs/img/04-plan.jpg)
![Constellation](docs/img/05-constellation.jpg)

**Live demo:** https://common-ground-sama-5806.vercel.app — runs on the **live Qloo hackathon API** (green `● Live Qloo data` badge). The API key is a server-side environment variable on Vercel; the browser only ever talks to this app's own `/api/*` routes, never to Qloo.

## Run it (one command)

Requires Node 20+. **No dependencies, no build step.**

```bash
git clone <this repo> && cd common-ground-qloo
npm start            # http://localhost:3000
```

- **Without a Qloo key** the app starts in **MOCK mode** (see below) and shows an amber `DEMO DATA · MOCK` badge in the header.
- **With a key**: copy `.env.example` to `.env.local` (git-ignored; `.env` also works), set `QLOO_API_KEY=…`, run `npm start`. The badge turns into `● Live Qloo data`, and the server log says `Qloo: LIVE`.
- `npm run mock` forces mock mode even when a key is present. `npm test` runs the test-suite (Node's built-in runner).

## Mock vs. live

| | What it is |
|---|---|
| **LIVE** (the deployed demo) | `src/qloo/live.js` calls `https://hackathon.api.qloo.com` (`/search`, `/v2/insights`) with the `X-Api-Key` header. Used automatically when `QLOO_API_KEY` is set. Every title, artist, book, place, tag and affinity score in the UI comes from Qloo. |
| **MOCK** (offline fallback) | `src/qloo/mock.js` + `mock-catalog.js`: a small **hand-written** catalog (18 films, 10 series, 18 artists, 12 books, 6 podcasts, 24 *fictional* venues named `… (mock)`) with taste tags and a deterministic cosine-similarity "affinity". It exists so contributors can run the app without a key. **It is not Qloo data and not Qloo's algorithm**, and the UI labels it `Demo data · mock`. |

Both clients implement the same tiny interface (`search`, `tasteTags`, `insights`; see `src/qloo/types.js`), so the agent and UI never know which is behind them.

**Verified against the real API (hackathon host).** The live client was exercised end-to-end with real responses (search → taste profile → discovery → per-person affinity → plan) for several groups and cities. Things we learned from the real responses and handled in `normalizeEntity` / the client:

- `/search` returns `types: [urn:entity:…]` while `/v2/insights` returns `subtype`; tags carry `id` on entities but `tag_id` in taste analysis; place images are in `properties.images[]`; one entity can carry 300+ tags (mostly plot keywords), so tags are ranked (taste tags before keywords) and capped at 30.
- Taste analysis (`filter.type=urn:tag`) needs `filter.parents.types`, otherwise Qloo mixes in unrelated place/brand tags ("VISA", "women-owned"…).
- Place discovery needs a category tag (`filter.tags=urn:tag:genre:place:restaurant`) or Qloo also returns ATMs and bus stops.
- Taste analysis surfaces each person's most *distinctive* tags, so two people with different taste would show ~0 % overlap. We blend in the loved things' own Qloo tags (at lower weight) so shared broad tastes (Rock, Atmospheric, Fiction…) are found.

Unit tests (`test/live-normalization.test.js`) use shape-faithful but **placeholder** fixtures (`test/fixtures/qloo-samples.js`) — we deliberately do not commit real Qloo response data, per Qloo's terms for public repositories.

## How the agent works

`src/agent/mediator.js` is a tool-using agent with a small, deterministic plan, so every recommendation is grounded in Qloo, never invented. Each step is streamed to the browser as it happens (the "agent trace" panel):

```
understand ─▶ profile each person ─▶ overlap & common ground ─▶ discover (per category) ─▶ compose plan ─▶ narrate
              Qloo: tag analysis      client-side math           Qloo: insights ×2 passes      best per      template or
              (urn:tag insights)                                                               category      optional LLM
```

**Qloo is used for the hard part, three ways:**

| Step | Qloo call | Why |
|---|---|---|
| Search-as-you-type | `GET /search?query=…&types=urn:entity:…` | resolve what people love to Qloo entity IDs |
| Taste profile | `GET /v2/insights?filter.type=urn:tag&filter.parents.types=<types of their favourites>&signal.interests.entities=<one person's IDs>` | the tags (and strength) behind a person's taste → overlap + "common ground" chips |
| Candidate discovery | `GET /v2/insights?filter.type=urn:entity:<domain>&signal.interests.entities=<everyone's IDs>&filter.exclude.entities=<already loved>[&filter.location.query=<city>&filter.tags=urn:tag:genre:place:restaurant]` | what the *combined* taste points to |
| Fairness check | same call again per person with `filter.results.entities=<candidates>` and only that person's signals | each person's own affinity for each candidate |

**Group scoring** (`src/agent/scoring.js`):

- `harmony = 0.6 · min(affinities) + 0.4 · mean(affinities)` — a least-misery blend: a pick one person hates cannot win on the other's enthusiasm.
- `balance = 1 − (max − min)`; shown in the copy ("almost perfectly even" vs "a touch more of a favourite for one of you").
- taste overlap = overlap coefficient `Σ min(a,b) / min(Σa, Σb)` over the two people's tag-affinity maps.
- **bridges**: for each pick, the entity from each person's list that shares the most tags with it — that's how a recommendation says *"Bridges Maya's Blade Runner 2049 and Jonas's Amélie"*.

**Narration.** By default the "why" copy is templated from the Qloo-derived facts (bridges, shared tags, evenness). Set `LLM_API_KEY` (any OpenAI-compatible endpoint) and an LLM will only *rephrase* those facts; it never chooses items and never sees real names (people are relabelled "Person N").

## Responsible use / privacy

- People's names are labels in the browser/our server only — **never sent to Qloo**. Only entity IDs go out.
- The Qloo key stays server-side (Vercel environment variable / git-ignored `.env.local`). It is sent only in the `X-Api-Key` header from the server, never in a URL, the logs, the repo, or the browser bundle; a test fails the build if a key-like string is committed.
- Nothing from Qloo is stored in this repo; the only cache is a private, in-memory, 1-hour TTL cache on the server. (The mock catalog and test fixtures are original, hand-written placeholders.)
- Input is validated (≤ 4 people, ≤ 8 loved things each, size caps, ID whitelist) and the public endpoints are rate-limited per IP (12 plans / min, 120 searches / min) so a hosted demo can't burn the quota.
- Affinities are population-level signals about *taste*, not predictions about an individual. The UI says so.

## Project layout

```
server.js               local server (+ tiny .env.local / .env loader)
api/*.js                Vercel serverless wrappers around the same handlers
src/qloo/               types · live client · mock client + catalog · factory
src/agent/              mediator (the agent) · scoring · narrator · validation
src/server/handlers.js  /api/status · /api/search · /api/suggest · POST /api/plan (NDJSON stream)
public/                 the UI (plain ES modules, no build) 
test/                   node:test suites (scoring, live client + live-response normalisation, mediator, validation)
docs/                   DEMO_SCRIPT.md · DEVPOST.md · screenshots
```

## Deploy

It is Vercel-ready (`vercel.json` serves `public/`, `api/*.js` are the functions). Set `QLOO_API_KEY` (and `QLOO_BASE_URL=https://hackathon.api.qloo.com`) as **server-side** environment variables (mark the key *Sensitive*). Pushing to `main` redeploys. Any Node 20+ host also works with `npm start`.

## Known limitations

- Qloo's hackathon keys are rate/quota limited and are deactivated after judging; if the key is revoked or over quota the deployed app will show Qloo's error rather than silently falling back to mock.
- A live plan takes roughly 5–12 s (about 20–25 Qloo calls); results are cached in memory per server instance for an hour, so repeats are instant.
- Qloo affinities in a tight candidate pool are close together (often 0.85–0.95), so harmony differences between picks are small; the picks are Qloo's, ranked by our least-misery blend.
- Place picks are restaurants/venues from Qloo's place graph filtered by a restaurant tag; some results are only loosely food-related (malls, landmarks with a café).
- Overlap % is computed on Qloo tag affinities and is low (single digits) for genuinely different tastes; it is a relative signal, not a percentage of agreement.
- Place discovery relies on Qloo's `filter.location.query`; coverage depends on Qloo's place data for the city.
- No accounts and no persistence, by design.

## License

[MIT](LICENSE) © 2026 Demir
