// Domains the app understands, mapped to Qloo entity URNs.
export const DOMAINS = {
  movie: { urn: 'urn:entity:movie', label: 'Film', icon: '🎬' },
  tv_show: { urn: 'urn:entity:tv_show', label: 'Series', icon: '📺' },
  artist: { urn: 'urn:entity:artist', label: 'Music', icon: '🎧' },
  book: { urn: 'urn:entity:book', label: 'Book', icon: '📖' },
  podcast: { urn: 'urn:entity:podcast', label: 'Podcast', icon: '🎙️' },
  place: { urn: 'urn:entity:place', label: 'Place', icon: '📍' },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS);
export const urnOf = (key) => DOMAINS[key]?.urn;
export const keyOfUrn = (urn) =>
  DOMAIN_KEYS.find((k) => DOMAINS[k].urn === urn) ??
  (typeof urn === 'string' ? urn.replace('urn:entity:', '') : undefined);

/**
 * Normalized entity shape used everywhere above the client layer:
 * { id, name, type, subtitle, description, image, year, tags:[{id,name}], affinity? }
 *
 * Client interface (implemented by LiveQlooClient and MockQlooClient):
 *   mode: 'live' | 'mock'
 *   search(query, { types?: string[], take?: number }) -> Entity[]
 *   tasteTags(entityIds, { take?: number }) -> [{ id, name, affinity }]
 *   insights({ type, signalEntities, excludeEntities?, resultEntities?, location?, take? }) -> Entity[] (with affinity)
 */
