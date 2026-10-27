// MOCK DATA — illustrative only. This is NOT Qloo data.
// It exists so the app runs end-to-end before a hackathon API key is available.
// Titles/artists are real public works; descriptions and tag assignments are
// original, hand-written approximations. Venues are entirely fictional.

export const TAGS = {
  // mood / style
  scifi: 'Science Fiction', neo_noir: 'Neo-Noir', romance: 'Romance', whimsical: 'Whimsical',
  melancholic: 'Melancholic', dark_comedy: 'Dark Comedy', thriller: 'Thriller', mystery: 'Mystery',
  fantasy: 'Fantasy', coming_of_age: 'Coming of Age', crime: 'Crime', historical: 'Historical',
  horror: 'Horror', action: 'Action', animation: 'Animation', philosophical: 'Philosophical',
  dystopian: 'Dystopian', feel_good: 'Feel-Good', indie: 'Indie', epic: 'Epic', comedy: 'Comedy',
  atmospheric: 'Atmospheric', cinematic: 'Cinematic', nostalgic: 'Nostalgic', uplifting: 'Uplifting',
  introspective: 'Introspective', experimental: 'Experimental', visual_design: 'Visual Design',
  intellectual: 'Intellectual', family: 'Family', true_story: 'True Story', satire: 'Satire',
  documentary: 'Documentary', intense: 'Intense', psychological: 'Psychological', emotional: 'Emotional', global: 'Global',
  // sound
  electronic: 'Electronic', ambient: 'Ambient', indie_rock: 'Indie Rock', hip_hop: 'Hip-Hop',
  afrobeats: 'Afrobeats', jazz: 'Jazz', soul: 'Soul', psychedelic: 'Psychedelic', folk: 'Folk',
  classical: 'Classical', pop: 'Pop', funk: 'Funk', latin: 'Latin', k_pop: 'K-Pop', dream_pop: 'Dream Pop',
  // places
  italian: 'Italian', japanese: 'Japanese', west_african: 'West African', mexican: 'Mexican',
  french: 'French', cocktail_bar: 'Cocktail Bar', cafe: 'Café', bookstore_cafe: 'Bookstore Café',
  rooftop: 'Rooftop', street_food: 'Street Food', vegetarian: 'Vegetarian-Friendly', tasting_menu: 'Tasting Menu',
  vinyl_bar: 'Vinyl Bar', cozy: 'Cozy', lively: 'Lively', romantic: 'Romantic', artsy: 'Artsy',
  late_night: 'Late Night', brunch: 'Brunch',
};

// [name, year, tags, description, extra]
export const MOVIES = [
  ['Blade Runner 2049', 2017, 'scifi neo_noir atmospheric cinematic visual_design dystopian philosophical melancholic', 'A replicant hunter unravels a buried secret in a rain-soaked, neon-lit future.'],
  ['Amélie', 2001, 'romance whimsical feel_good indie nostalgic visual_design comedy', 'A shy Parisian waitress quietly engineers small miracles for strangers.'],
  ['Spirited Away', 2001, 'animation fantasy coming_of_age whimsical atmospheric visual_design family', 'A girl wanders into a spirit-world bathhouse to rescue her parents.'],
  ['Parasite', 2019, 'thriller dark_comedy satire crime cinematic intellectual', 'Two families on opposite ends of Seoul\'s class divide collide.'],
  ['The Grand Budapest Hotel', 2014, 'whimsical comedy visual_design nostalgic indie historical crime', 'A legendary concierge and his lobby boy get tangled in a stolen painting caper.'],
  ['Interstellar', 2014, 'scifi epic emotional philosophical cinematic atmospheric melancholic', 'Explorers cross a wormhole to find humanity a new home.'],
  ['La La Land', 2016, 'romance jazz nostalgic cinematic uplifting melancholic', 'An actress and a jazz pianist chase dreams and each other in Los Angeles.'],
  ['Mad Max: Fury Road', 2015, 'action dystopian epic visual_design cinematic', 'A relentless desert chase for freedom across a ruined wasteland.'],
  ['Everything Everywhere All at Once', 2022, 'scifi comedy philosophical whimsical experimental feel_good family', 'A laundromat owner jumps across universes to save her family and the multiverse.'],
  ['Lost in Translation', 2003, 'romance introspective indie melancholic atmospheric nostalgic', 'Two strangers form a fleeting bond in a neon-lit Tokyo hotel.'],
  ['Knives Out', 2019, 'mystery comedy crime thriller feel_good', 'A detective picks through a wealthy family\'s lies after a patriarch\'s death.'],
  ['The Social Network', 2010, 'true_story intellectual thriller introspective', 'The messy founding of a social media empire.'],
  ['Coco', 2017, 'animation family fantasy uplifting latin nostalgic coming_of_age', 'A boy enters the Land of the Dead to uncover his family\'s musical past.'],
  ['Whiplash', 2014, 'jazz thriller introspective intense cinematic', 'A drummer and a ruthless conductor push each other to the edge.'],
  ['Her', 2013, 'scifi romance introspective melancholic visual_design atmospheric', 'A lonely writer falls for an artificial intelligence.'],
  ['Black Panther', 2018, 'action epic uplifting afrobeats cinematic fantasy', 'A young king defends a hidden technologically advanced African nation.'],
  ['Portrait of a Lady on Fire', 2019, 'romance historical introspective visual_design atmospheric melancholic', 'A painter and her subject share a brief, intense summer in 18th-century Brittany.'],
  ['The Lighthouse', 2019, 'horror psychological atmospheric experimental visual_design', 'Two keepers lose their grip on reality at a remote lighthouse.'],
];

export const TV = [
  ['Severance', 2022, 'scifi thriller dystopian atmospheric visual_design intellectual mystery', 'Office workers surgically split their work and home memories.'],
  ['Fleabag', 2016, 'dark_comedy introspective romance indie satire', 'A sharp-tongued Londoner narrates her chaotic life straight to camera.'],
  ['The Bear', 2022, 'comedy crime coming_of_age lively introspective', 'A chef returns to run his family\'s Chicago sandwich shop.'],
  ['Avatar: The Last Airbender', 2005, 'animation fantasy epic coming_of_age family uplifting', 'A young monk must master four elements and end a century-long war.'],
  ['Succession', 2018, 'satire dark_comedy thriller intellectual', 'A media dynasty\'s heirs fight over control of the empire.'],
  ['Normal People', 2020, 'romance introspective coming_of_age melancholic indie', 'Two Irish teenagers circle each other through the years.'],
  ['Dark', 2017, 'scifi mystery thriller atmospheric philosophical', 'A missing-child case unspools four generations of a German town.'],
  ['Ted Lasso', 2020, 'comedy feel_good uplifting family', 'An American football coach charms an English soccer club.'],
  ['Chef\'s Table', 2015, 'documentary visual_design intellectual cinematic', 'Intimate portraits of the world\'s most inventive chefs.'],
  ['Black Mirror', 2011, 'scifi dystopian satire thriller philosophical', 'Standalone tales of technology bending human behavior.'],
];

export const ARTISTS = [
  ['Radiohead', 1985, 'indie_rock electronic experimental melancholic atmospheric introspective', 'Art-rock pioneers moving between guitars and glitch.'],
  ['Khruangbin', 2009, 'funk psychedelic soul atmospheric cinematic global', 'Instrumental, globe-trotting grooves with Thai funk and dub influences.'],
  ['Tame Impala', 2007, 'psychedelic indie_rock dream_pop electronic atmospheric', 'Kevin Parker\'s swirling psych-pop.'],
  ['Burna Boy', 2010, 'afrobeats hip_hop uplifting global lively', 'Afro-fusion superstar from Port Harcourt.'],
  ['Kendrick Lamar', 2003, 'hip_hop introspective intellectual cinematic', 'Narrative-driven rap with dense storytelling.'],
  ['Nujabes', 1996, 'jazz hip_hop ambient nostalgic atmospheric introspective', 'Jazz-sampled lo-fi hip-hop beloved worldwide.'],
  ['Bad Bunny', 2016, 'latin hip_hop pop lively global', 'Puerto Rican trap and reggaeton heavyweight.'],
  ['Phoebe Bridgers', 2017, 'indie_rock folk melancholic introspective indie', 'Confessional, wry, hushed indie songwriting.'],
  ['Daft Punk', 1993, 'electronic funk nostalgic cinematic uplifting', 'Robot-helmeted French house duo.'],
  ['Billie Eilish', 2015, 'pop dark_comedy melancholic electronic introspective', 'Whispered, bass-heavy bedroom pop.'],
  ['Fela Kuti', 1963, 'afrobeats funk jazz epic global', 'Inventor of Afrobeat; long, ferocious horn-driven grooves.'],
  ['Hans Zimmer', 1980, 'classical cinematic epic atmospheric electronic', 'Film composer with an enormous, sweeping sound.'],
  ['Norah Jones', 2002, 'jazz soul folk cozy introspective', 'Smooth piano-led jazz-pop.'],
  ['Stromae', 2000, 'electronic pop french melancholic uplifting', 'Belgian electro-pop with sharp lyrics.'],
  ['BLACKPINK', 2016, 'k_pop pop lively visual_design', 'Global K-pop powerhouse.'],
  ['Mitski', 2012, 'indie_rock introspective melancholic indie dream_pop', 'Intense, diaristic indie rock.'],
  ['Tems', 2018, 'afrobeats soul atmospheric introspective', 'Lagos-born voice blending R&B and Afro-fusion.'],
  ['Brian Eno', 1971, 'ambient experimental atmospheric intellectual electronic', 'Ambient music inventor and producer.'],
];

export const BOOKS = [
  ['Dune', 1965, 'scifi epic philosophical dystopian fantasy', 'A desert planet, a prophecy, and the politics of spice.'],
  ['Norwegian Wood', 1987, 'romance melancholic introspective nostalgic coming_of_age', 'Memory and loss in 1960s Tokyo.'],
  ['The Alchemist', 1988, 'philosophical uplifting fantasy introspective', 'A shepherd follows his dream to the pyramids.'],
  ['Americanah', 2013, 'romance coming_of_age satire introspective historical', 'Two Nigerians navigate love, race and migration.'],
  ['Piranesi', 2020, 'fantasy mystery atmospheric whimsical introspective', 'A man lives in an endless house of statues and tides.'],
  ['Project Hail Mary', 2021, 'scifi feel_good uplifting thriller comedy', 'A lone astronaut wakes with amnesia on a mission to save Earth.'],
  ['Kafka on the Shore', 2002, 'fantasy philosophical experimental melancholic atmospheric', 'Two parallel quests drift into the surreal.'],
  ['The Remains of the Day', 1989, 'historical introspective melancholic romance', 'A butler reflects on duty and missed chances.'],
  ['One Hundred Years of Solitude', 1967, 'fantasy epic historical latin nostalgic', 'Seven generations of the Buendía family in Macondo.'],
  ['Neuromancer', 1984, 'scifi dystopian neo_noir thriller visual_design', 'A washed-up hacker is pulled into a cyberspace heist.'],
  ['Things Fall Apart', 1958, 'historical epic introspective west_african', 'An Igbo wrestler\'s world is upended by colonization.'],
  ['Sapiens', 2011, 'intellectual true_story philosophical', 'A sweeping history of humankind.'],
];

export const PODCASTS = [
  ['Radiolab', 2002, 'intellectual whimsical documentary', 'Curiosity-driven science and philosophy stories.'],
  ['99% Invisible', 2010, 'visual_design intellectual documentary whimsical', 'The hidden stories behind design and architecture.'],
  ['Song Exploder', 2014, 'intellectual documentary indie experimental', 'Musicians take their songs apart piece by piece.'],
  ['This American Life', 1995, 'documentary introspective true_story', 'Weekly stories on a theme.'],
  ['Hardcore History', 2005, 'historical epic documentary true_story', 'Marathon deep dives into history.'],
  ['The Moth', 1997, 'introspective true_story feel_good', 'True stories told live.'],
];

// Fictional venues. Keyed by city.
export const PLACES = {
  'New York': [
    ['Marlow & Finch (mock)', 'Rooftop cocktails under string lights with a rotating vinyl set.', 'cocktail_bar rooftop vinyl_bar lively romantic artsy late_night'],
    ['Little Orchid Noodle Bar (mock)', 'Hand-pulled noodles and quiet corners.', 'japanese cozy vegetarian late_night street_food'],
    ['The Reading Room Café (mock)', 'Bookshelf-lined café with excellent pastries.', 'bookstore_cafe cafe cozy brunch introspective artsy'],
    ['Casa Alba (mock)', 'Family-style Italian with candlelit tables.', 'italian romantic cozy lively'],
  ],
  'London': [
    ['The Velvet Archive (mock)', 'Basement jazz bar in a former record vault.', 'cocktail_bar vinyl_bar jazz late_night artsy atmospheric'],
    ['Pickle & Plume (mock)', 'Seasonal tasting menus in a glasshouse.', 'tasting_menu french romantic visual_design vegetarian'],
    ['Corner Pages Coffee (mock)', 'Independent bookshop with a flat white worth the queue.', 'bookstore_cafe cafe cozy brunch indie'],
    ['Pasta Parlour (mock)', 'Loud, friendly Italian with open kitchen.', 'italian lively street_food'],
  ],
  'Lagos': [
    ['Ìyá Òkè Kitchen (mock)', 'Smoky jollof, suya and live highlife on weekends.', 'west_african lively street_food afrobeats late_night'],
    ['Terrace 17 (mock)', 'Rooftop lounge with skyline views and DJs.', 'rooftop cocktail_bar lively romantic late_night'],
    ['Ink & Palm Café (mock)', 'Quiet art-and-book café with strong coffee.', 'bookstore_cafe cafe cozy artsy introspective brunch'],
    ['Bamboo Garden (mock)', 'Vegetarian-friendly garden restaurant with fairy lights.', 'vegetarian cozy romantic atmospheric'],
  ],
  'Tokyo': [
    ['Kissaten Mizu (mock)', 'Tiny jazz kissaten with a hi-fi system and hand-drip coffee.', 'cafe jazz vinyl_bar cozy atmospheric nostalgic introspective'],
    ['Neon Alley Izakaya (mock)', 'Lively izakaya beneath the tracks.', 'japanese lively late_night street_food'],
    ['Sora Tasting Room (mock)', 'Kaiseki-inspired tasting menu.', 'japanese tasting_menu romantic visual_design'],
    ['Page One Books & Bar (mock)', 'Bookstore with a cocktail counter.', 'bookstore_cafe cocktail_bar artsy cozy'],
  ],
  'Mexico City': [
    ['Maíz y Luna (mock)', 'Heirloom corn tortillas and mezcal flights.', 'mexican lively cocktail_bar street_food'],
    ['Azotea Verde (mock)', 'Rooftop garden brunches.', 'rooftop brunch vegetarian lively romantic'],
    ['La Biblioteca Café (mock)', 'Old library turned café.', 'bookstore_cafe cafe cozy artsy introspective'],
    ['Vinilo Noche (mock)', 'Listening bar with a Latin jazz selection.', 'vinyl_bar cocktail_bar latin jazz late_night'],
  ],
  'Paris': [
    ['Maison Lune (mock)', 'Candlelit bistro with classic plates.', 'french romantic cozy tasting_menu'],
    ['Le Disque Doux (mock)', 'Wine bar with vinyl on rotation.', 'vinyl_bar cocktail_bar french artsy late_night'],
    ['Librairie Café Étoile (mock)', 'Bookshop café near the river.', 'bookstore_cafe cafe cozy introspective brunch'],
    ['Rue 9 Street Kitchen (mock)', 'Global street food market stalls.', 'street_food lively vegetarian'],
  ],
};

export const CITIES = Object.keys(PLACES);
