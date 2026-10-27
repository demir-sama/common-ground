# Devpost draft — Common Ground

**Tagline:** An agent that finds the plan nobody has to compromise on — powered by Qloo's Taste AI.

## Inspiration
Every group has the "what are we watching / listening to / eating tonight?" standoff. Recommendation engines are built for *one* person; the moment two people with different taste share an evening, someone loses. Qloo models taste as a graph of cultural entities and tags, which is exactly what you need to ask a better question: not "what does *she* like?" but "what do *they* both genuinely connect with?" Taste is also universal — it doesn't depend on language or country — so the idea works anywhere in the world.

## What it does
Each person (2–4) adds a few things they love — films, series, artists, books, podcasts. Common Ground's agent then:
- reads each person's **taste profile** from Qloo and shows the **common ground** (shared tags) and what is distinctly theirs,
- discovers films, series, music, books and **places in your city** that fit the combined taste,
- scores each candidate **per person** and ranks by a least-misery "harmony" score, so no one gets a pick they'd hate,
- explains every pick by **bridging** each person's own favourites ("this bridges Maya's Blade Runner 2049 and Jonas's Amélie"),
- streams its reasoning live in an agent trace and draws a "constellation" of where each pick lands between people.

## How we built it
- **Qloo API (hackathon endpoint)** is the core, used four ways: `/search` for entity resolution, `/v2/insights` with `filter.type=urn:tag` for taste profiles, `/v2/insights` with combined `signal.interests.entities` (+ `filter.exclude.entities`, `filter.location.query` for places) for discovery, and `/v2/insights` with `filter.results.entities` for per-person affinity of each candidate.
- **Agent:** a small tool-using orchestrator (understand → profile → overlap → discover → compose → narrate) whose tools are Qloo calls; every step is streamed as NDJSON to the UI. Group scoring: `harmony = 0.6·min + 0.4·mean`, overlap coefficient over tag-affinity maps, tag-sharing "bridges" for explanations. An optional LLM only *rephrases* Qloo-derived facts.
- **Stack:** zero-dependency Node 20 server (works on Vercel as serverless functions), plain ES-module front end with hand-built SVG/CSS animation (aurora, animated Venn, orbit constellation), `node:test` test suite. Qloo key is server-side only, with per-IP rate limits, input validation, in-memory caching and retries with back-off.
- **Responsible by design:** names never leave our server, only entity IDs go to Qloo; no Qloo data stored; affinities are described as aggregate taste signals, not predictions about individuals.

## Challenges we ran into
- **Making "fair" computable:** a plain average lets one super-fan hide a lukewarm partner. A least-misery blend plus a per-person re-score pass (asking Qloo again for each person's own affinity) fixed that.
- **Explainability without hallucination:** we trace every pick to the specific favourites that share tags with it instead of letting an LLM invent reasons.
- **Quota and latency:** a plan takes many calls, so we cap concurrency, cache, retry with back-off, and stream progress so the wait is part of the show.
- **Time-boxed build:** a fully labelled mock client mirrors Qloo's response shapes so the product, tests and demo could be developed in parallel with API access.

## Accomplishments we're proud of
A polished, motion-heavy UI that makes the agent's reasoning visible; a fairness model that gives non-obvious but defensible picks; and an architecture where the data source is swappable behind a 3-method interface.

## What we learned
Taste tags are a far better "common language" between people than genre labels; asking Qloo for *per-person* affinity on a shared candidate list is the key to fairness.

## What's next
Shareable plan links and group voting, calendar/booking hand-off (tables, tickets), more domains (food, travel, brands), saved "taste circles" for recurring groups, and a conversational mode where an LLM agent negotiates with the group using Qloo as its tool.

## Built with
Qloo API, JavaScript (Node.js), HTML/CSS, SVG, Vercel (optional)

## Links (fill in before submitting)
- Live demo: `<https://… — hosted with QLOO_API_KEY set server-side>`
- Code: `<https://github.com/… — public, MIT license visible in About>`
- Video (if required): `<…>`
