// Shape-faithful samples of Qloo hackathon API responses, trimmed to the fields the app reads.
// Names, ids and copy are PLACEHOLDERS (Qloo's terms forbid publishing their response data in a public repo);
// the *structure* (field names, nesting, URN formats) mirrors what hackathon.api.qloo.com returned when verified live.

export const ID = {
  movieA: '00000000-0000-4000-8000-00000000A001',
  movieB: '00000000-0000-4000-8000-00000000A002',
  artistA: '00000000-0000-4000-8000-00000000B001',
  bookA: '00000000-0000-4000-8000-00000000C001',
  placeA: '00000000-0000-4000-8000-00000000D001',
  placeB: '00000000-0000-4000-8000-00000000D002',
};

// GET /search?query=…&types=urn:entity:movie  → entity has `types` (array), properties.image.url, tags[{id,name,type}]
export const SEARCH_MOVIE = {
  results: [{
    name: 'Sample Movie', entity_id: ID.movieA, types: ['urn:entity:movie'], popularity: 0.99, disambiguation: '2010',
    properties: {
      release_year: 2010, release_date: '2010-07-16', content_rating: 'PG-13',
      description: 'A very long marketing description. '.repeat(30),
      short_descriptions: [{ language: 'de', value: 'Deutsch' }, { language: 'en', value: 'A short English synopsis.' }],
      akas: [{ language: 'fr', value: 'Exemple' }],
      image: { url: 'https://images.example.test/i/movie-a-420x-auto.jpg' },
    },
    tags: [
      { name: 'Plot keyword', tag_id: undefined, id: 'urn:tag:keyword:media:plot_keyword', type: 'urn:tag:keyword:media' },
      { name: 'Mind-Bending', id: 'urn:tag:style:qloo:mind_bending', type: 'urn:tag:style:qloo' },
      { name: 'Thriller', id: 'urn:tag:genre:media:thriller', type: 'urn:tag:genre:media' },
    ],
  }, {
    name: 'Sample Artist', entity_id: ID.artistA, types: ['urn:entity:artist'], disambiguation: 'Sample Artist',
    properties: { short_description: 'An artist.', image: { url: 'https://images.example.test/i/artist-a.jpg' } },
    tags: [{ name: 'Rock', id: 'urn:tag:genre:music:rock', type: 'urn:tag:genre:music' }],
  }],
};

// GET /v2/insights?filter.type=urn:entity:movie…  → `subtype` instead of `types`, plus query.affinity
export const INSIGHTS_MOVIES = {
  success: true,
  results: {
    entities: [{
      name: 'Another Movie', entity_id: ID.movieB, type: 'urn:entity', subtype: 'urn:entity:movie', popularity: 0.98, disambiguation: '1999',
      properties: { release_year: 1999, description: 'Interwoven lives.', image: { url: 'https://images.example.test/i/movie-b.jpg' }, genres: ['Drama'], keywords: ['k1', 'k2'] },
      query: { affinity: 0.8421, measurements: { audience_growth: 0 } },
      tags: [{ id: 'urn:tag:genre:media:drama', name: 'Drama', type: 'urn:tag:genre:media' }],
    }],
  },
  query: {},
};

// GET /v2/insights?filter.type=urn:entity:place&filter.location.query=…  → places: images[], address, geocode, neighborhood, no image.url
export const INSIGHTS_PLACES = {
  success: true,
  results: {
    entities: [{
      name: 'Sample Garden Restaurant', entity_id: ID.placeA, type: 'urn:entity', subtype: 'urn:entity:place',
      location: { lat: 6.43, lon: 3.42, geohash: 'abc' },
      query: { affinity: 0.7923, distance: 0 },
      disambiguation: '12A Example St Victoria Island Lagos, Nigeria',
      properties: {
        address: '12A Example St Victoria Island Lagos, Nigeria', neighborhood: 'Victoria Island',
        geocode: { city: 'Lagos', name: 'Victoria Island', country: 'Nigeria' },
        images: [{ url: 'https://images.example.test/i/place-a-outside.jpg', type: 'urn:image:place:unknown' }],
        short_description: 'Airy garden restaurant.', price_level: 3,
      },
      tags: [{ id: 'urn:tag:genre:place:restaurant', name: 'Restaurant', type: 'urn:tag:genre:place' }],
    }, {
      name: 'Plain Place', entity_id: ID.placeB, type: 'urn:entity', subtype: 'urn:entity:place',
      query: { affinity: 0.7 }, disambiguation: '1 Example Rd London UK',
      properties: { address: '1 Example Rd London UK', geocode: { city: 'London' } }, tags: [],
    }],
  },
};

// GET /v2/insights?filter.type=urn:tag&filter.parents.types=…  → results.tags[{ tag_id, name, query.affinity }]
export const TAG_ANALYSIS = {
  success: true,
  results: {
    tags: [
      { tag_id: 'urn:tag:subgenre:qloo:mind_bending', name: 'Mind-Bending', types: ['urn:entity:movie'], subtype: 'urn:tag:subgenre:qloo', tag_value: 'urn:tag:subgenre:qloo:mind_bending', popularity: 0.98, query: { affinity: 0.9998 } },
      { tag_id: 'urn:tag:genre:media:thriller', name: 'Thriller', types: ['urn:entity:movie'], subtype: 'urn:tag:genre:media', query: { affinity: 0.93 } },
    ],
  },
};
