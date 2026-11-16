// World data for the atlas. Coordinates are authored in "chart units" (x east, y south) and shifted
// so Erilea sits around the origin. Coastlines are an original interpretation of the published map.
//
// SPOILER RULE: every place and every note carries the book it belongs to. Nothing past the
// reader's chosen progress is ever shown. Notes are written to be safe for someone part-way
// through that book. Do not add content past Heir of Fire without the reader asking.

const P = (x, y) => [x - 945, y - 699];
const L = (arr) => arr.map(([x, y]) => P(x, y));

// Book 0 is the prequel collection; it is switched on separately from the main reading order.
export const PREQUEL = { n: 0, title: 'The Assassin\u2019s Blade' };
export const BOOKS = [
  { n: 1, title: 'Throne of Glass' },
  { n: 2, title: 'Crown of Midnight' },
  { n: 3, title: 'Heir of Fire' },
];
export const LOCKED_BOOKS = ['Queen of Shadows', 'Empire of Storms', 'Tower of Dawn', 'Kingdom of Ash'];

export const BOUNDS = { minX: -760, maxX: 1800, minZ: -660, maxZ: 1000 };

export const LANDS = [
  { id: 'erilea', pts: L([
    [430, 150], [440, 200], [400, 260], [370, 340], [390, 420], [350, 500], [330, 580], [360, 660], [340, 740],
    [370, 820], [350, 900], [380, 980], [400, 1060], [430, 1130], [520, 1150], [600, 1110], [660, 1050], [700, 1000],
    [745, 960], [770, 900], [800, 850], [850, 820], [920, 830], [980, 850], [1020, 880], [1040, 930], [1030, 990],
    [1060, 1050], [1120, 1090], [1200, 1110], [1280, 1130], [1340, 1170], [1400, 1210], [1450, 1220], [1500, 1180],
    [1520, 1110], [1510, 1040], [1530, 960], [1520, 900], [1500, 850], [1490, 800], [1480, 740], [1440, 700],
    [1400, 680], [1385, 665], [1410, 640], [1440, 600], [1430, 540], [1445, 490], [1470, 430], [1500, 370],
    [1490, 330], [1480, 280], [1440, 230], [1420, 180], [1380, 140], [1250, 125], [1100, 135], [1060, 170],
    [1030, 230], [1000, 265], [950, 280], [900, 270], [860, 240], [830, 200], [800, 150], [650, 130], [520, 135],
  ]) },
  { id: 'wendlyn', book: 3, pts: L([
    [1950, 300], [2100, 240], [2300, 230], [2500, 280], [2600, 400], [2620, 560], [2580, 720], [2600, 860],
    [2520, 980], [2380, 1050], [2200, 1060], [2050, 1000], [1960, 900], [1930, 780], [1950, 700], [1920, 600],
    [1900, 480], [1920, 380],
  ]) },
  // A coast glimpsed to the south. Deliberately featureless and fog-bound.
  { id: 'south', uncharted: true, pts: L([
    [700, 1560], [900, 1500], [1150, 1520], [1400, 1480], [1650, 1530], [1850, 1600], [1900, 1800], [650, 1800],
  ]) },
];

export const ISLANDS = [
  [880, 1125, 22], [915, 1150, 15], [850, 1160, 13], [900, 1190, 17], [940, 1120, 10], [865, 1095, 9],
  [1560, 620, 8], [330, 420, 10],
].map(([x, y, r]) => [...P(x, y), r]);

// Mountain ridges: line, peak height, half-width.
export const RIDGES = [
  { pts: L([[1100, 185], [1200, 165], [1320, 195], [1420, 235]]), h: 62, w: 34 },           // Staghorns
  { pts: L([[1125, 395], [1150, 430], [1195, 455]]), h: 40, w: 24 },                         // above Endovier
  { pts: L([[1000, 395], [1035, 465], [1065, 525]]), h: 55, w: 28 },                         // Ruhnns
  { pts: L([[1092, 600], [1108, 680], [1160, 742], [1232, 790], [1295, 812]]), h: 64, w: 28 }, // White Fangs
  { pts: L([[860, 560], [900, 640], [880, 725]]), h: 42, w: 30 },
  { pts: L([[560, 330], [640, 420], [620, 520]]), h: 38, w: 34 },
  { pts: L([[590, 205], [720, 232]]), h: 30, w: 26 },
  { pts: L([[480, 700], [520, 780]]), h: 22, w: 30 },
  { pts: L([[2210, 330], [2190, 450], [2222, 560], [2200, 680], [2232, 800], [2210, 930]]), h: 70, w: 44, book: 3 }, // Cambrians
];

export const RIVERS = [
  { id: 'avery', pts: L([[1190, 628], [1235, 648], [1290, 664], [1335, 660], [1362, 667], [1398, 672]]) },
  { id: 'florine', pts: L([[1285, 215], [1305, 270], [1325, 325], [1375, 352], [1440, 372], [1502, 366]]) },
  { id: 'wend1', pts: L([[2262, 520], [2345, 548], [2428, 562], [2535, 580], [2625, 566]]) },
  { id: 'wend2', pts: L([[2268, 648], [2355, 608], [2428, 562]]) },
];

export const LAKES = [[1176, 676, 13]].map(([x, y, r]) => [...P(x, y), r]);

// Forest density blobs [x, y, radius, density]
export const FORESTS = [
  [1290, 300, 110, 1], [1250, 420, 100, 1], [1240, 545, 110, 1], [1295, 625, 80, 0.9], [1300, 720, 80, 0.9],
  [1335, 850, 90, 0.8], [1380, 930, 60, 0.7], [1180, 250, 90, 0.8], [1130, 900, 80, 0.5], [900, 400, 90, 0.25],
  [2060, 560, 120, 0.8], [2080, 800, 110, 0.8], [2400, 720, 120, 0.9], [2380, 400, 100, 0.8],
].map(([x, y, r, d]) => [...P(x, y), r, d]);

// Climate blobs [x, y, radius]
export const DESERTS = [[591, 859, 230]].map(([x, y, r]) => [...P(x, y), r]);
export const WASTES = [[700, 450, 300], [900, 680, 160]].map(([x, y, r]) => [...P(x, y), r]);
export const MARSH = [[1420, 1150, 70]].map(([x, y, r]) => [...P(x, y), r]);

// Big lettering.
export const REGIONS = [
  ['Terrasen', 1300, 255, 'realm'], ['Adarlan', 1315, 560, 'realm'], ['Fenharrow', 1385, 800, 'realm'],
  ['Melisande', 1150, 960, 'realm'], ['Eyllwe', 1390, 1050, 'realm'], ['The Western Wastes', 700, 470, 'realm'],
  ['The Witch Kingdom', 930, 690, 'realm'], ['The Deserted Land', 570, 880, 'realm'],
  ['Wendlyn', 2060, 690, 'realm', 3], ['Doranelle', 2440, 480, 'realm', 3],
  ['Great Ocean', 1700, 560, 'sea'], ['North Sea', 950, 215, 'sea'], ['Gulf of Oro', 880, 960, 'sea'],
  ['The Narrow Sea', 1300, 1330, 'sea'],
  ['Oakwald Forest', 1235, 500, 'feature'], ['Staghorn Mountains', 1260, 150, 'feature'],
  ['White Fang Mountains', 1215, 815, 'feature'], ['Ruhnn Mountains', 1010, 440, 'feature'],
  ['Silver Lake', 1195, 690, 'feature'], ['River Avery', 1270, 640, 'feature'], ['River Florine', 1420, 395, 'feature'],
  ['Red Desert', 560, 800, 'feature'], ['The Dead Islands', 890, 1215, 'feature'], ['Stone Marshes', 1425, 1175, 'feature'],
  ['Cambrian Mountains', 2215, 760, 'feature', 3],
  ['Uncharted', 1280, 1600, 'sea'],
].map(([name, x, y, kind, book = 1]) => ({ name, pos: P(x, y), kind, book }));

// kind: capital | city | town | fortress | mine
// notes: [book, text] — only notes at or below the reader's progress are shown.
const place = (id, name, x, y, kind, realm, book, notes, scene = {}) => ({ id, name, pos: P(x, y), kind, realm, book, notes, scene });
const onMap = 'Marked on the map of Erilea. The story has not travelled here yet.';

export const PLACES = [
  place('rifthold', 'Rifthold', 1357, 663, 'capital', 'Adarlan', 1, [
    [1, 'Capital of Adarlan, at the mouth of the River Avery. The king’s glass castle rises over the city, and Celaena was brought here from Endovier to compete to become the King’s Champion.'],
    [0, 'Before the mines, this was Celaena\u2019s city: the Assassins\u2019 Keep, the Vaults, the theatre, and the rooftops she and Sam Cortland ran across.'],
    [2, 'Beyond the palace: the slums and docks along the Avery, where Celaena keeps an apartment above a warehouse, and the Assassins’ Keep where she was raised.'],
  ]),
  place('endovier', 'Endovier', 1157, 468, 'mine', 'Adarlan', 1, [
    [1, 'The Salt Mines of Endovier, a death camp of slave labour beneath the mountains. Celaena survived a year here before Captain Westfall and the Crown Prince came for her.'],
  ]),
  place('orynth', 'Orynth', 1327, 330, 'capital', 'Terrasen', 1, [
    [1, 'Capital of Terrasen in the cold north, on the River Florine beneath the Staghorn Mountains. Conquered by Adarlan ten years before the story begins.'],
  ]),
  place('perranth', 'Perranth', 1255, 410, 'city', 'Terrasen', 1, [[1, 'A city of Terrasen on the northern edge of Oakwald.']]),
  place('anielle', 'Anielle', 1151, 665, 'city', 'Adarlan', 1, [
    [1, 'A mountain city on the Silver Lake, in the shadow of the White Fangs. Chaol Westfall was born heir to its lordship.'],
  ]),
  place('morath', 'Morath', 1220, 762, 'fortress', 'Adarlan', 1, [
    [1, 'Duke Perrington’s stronghold, deep in the mountains south of Anielle.'],
    [3, 'By Heir of Fire, the Duke has withdrawn here, and the rumours about what he is doing are growing darker.'],
  ]),
  place('ferian', 'Ferian Gap', 1082, 562, 'fortress', 'Adarlan', 3, [
    [3, 'A pass between the White Fang and Ruhnn Mountains. Two peaks face each other across it, the Omega and the Northern Fang, and inside them the Ironteeth witches are learning to fly wyverns for the king.'],
  ]),
  place('calaculla', 'Calaculla', 1313, 983, 'mine', 'Eyllwe', 1, [
    [1, 'A labour camp in Eyllwe, sister to Endovier, where Adarlan sends rebels and prisoners.'],
  ]),
  place('banjali', 'Banjali', 1417, 1103, 'capital', 'Eyllwe', 1, [
    [1, 'Capital of Eyllwe and home of Princess Nehemia Ytger.'],
  ]),
  place('bellhaven', 'Bellhaven', 1470, 808, 'city', 'Fenharrow', 2, [
    [2, 'A wealthy port city on the coast of Fenharrow. Crown of Midnight opens with the King’s Champion returning from a mission here.'],
  ]),
  place('meah', 'Meah', 1407, 490, 'town', 'Adarlan', 1, [[1, onMap]]),
  place('suria', 'Suria', 1467, 330, 'town', 'Terrasen', 1, [[1, onMap]]),
  place('allsbrook', 'Allsbrook', 1187, 280, 'town', 'Terrasen', 1, [[1, onMap]]),
  place('rosamel', 'Rosamel', 1095, 310, 'town', 'Terrasen', 1, [[1, onMap]]),
  place('amaroth', 'Amaroth', 485, 198, 'town', 'The Western Wastes', 1, [[1, onMap]]),
  place('briarcliff', 'Briarcliff', 750, 586, 'town', 'The Western Wastes', 1, [[1, onMap], [0, 'The home Ansel spoke of, far across the Wastes.']]),
  place('innish', 'Innish', 1034, 874, 'town', 'Melisande', 1, [
    [1, 'A port town of Melisande on the Gulf of Oro.'],
    [0, 'Celaena waited here for a ship to the Red Desert, lodging at the White Pig Inn, where she met the barmaid Yrene Towers.'],
  ]),
  place('skullsbay', 'Skull\u2019s Bay', 884, 1128, 'city', 'The Dead Islands', 0, [
    [0, 'The pirate haven of the Dead Islands, ruled by the Pirate Lord, Captain Rolfe. Arobynn sent Celaena and Sam here, and what they found waiting in the harbour changed everything between them and their master.'],
  ]),
  place('xandria', 'Xandria', 628, 1052, 'city', 'The Deserted Land', 0, [
    [0, 'A merchant city on the edge of the Red Desert, ruled by Lord Berick. Its market sells everything from spidersilk to Asterion horses.'],
  ]),
  place('silent', 'The Silent Assassins', 548, 850, 'fortress', 'The Deserted Land', 0, [
    [0, 'The hidden fortress of the Silent Assassins, deep in the dunes of the Red Desert. Celaena was sent here to train under the Mute Master, and here she met Ansel of Briarcliff.'],
  ]),
  place('yurpa', 'Yurpa', 733, 953, 'town', 'The Deserted Land', 1, [[1, onMap]]),
  place('noll', 'Noll', 434, 1070, 'town', 'The Deserted Land', 1, [[1, onMap]]),
  place('leriba', 'Leriba', 1467, 1002, 'town', 'Eyllwe', 1, [[1, onMap]]),
  place('varese', 'Varese', 1968, 705, 'capital', 'Wendlyn', 3, [
    [3, 'Capital of Wendlyn, a sun-baked port of pale stone and terracotta roofs. Heir of Fire opens on its rooftops.'],
  ]),
  place('mistward', 'Mistward', 2168, 612, 'fortress', 'Wendlyn', 3, [
    [3, 'A fortress hidden in the misty foothills of the Cambrian Mountains, home to demi-Fae and ringed by ancient ward-stones.'],
  ]),
  place('doranelle', 'Doranelle', 2430, 562, 'capital', 'Doranelle', 3, [
    [3, 'Queen Maeve’s city of the Fae, beyond the Cambrian Mountains: pale stone built among rivers.'],
  ]),
];

// ---- Local scenes (what you see when you enter a place) -------------------------------------
// Positions are local metres-ish: x east, z south, origin at the centre of the settlement.

const PAL = {
  adarlan: { walls: ['#d9d3c2', '#c9bfa8', '#b8ad98', '#e6e0d0'], roofs: ['#4a5a63', '#5d6b70', '#6e5d4f', '#7a4a3a'] },
  slum: { walls: ['#8c7a66', '#7b6a58', '#9a8a74'], roofs: ['#4f4338', '#5a4a3c', '#3f3a36'] },
  north: { walls: ['#eeeae0', '#dedad0', '#cfc8b8'], roofs: ['#55626e', '#465360', '#6a7480'] },
  south: { walls: ['#e8d8b4', '#dcc79c', '#f0e4c8'], roofs: ['#b9683f', '#c27a4a', '#a8582f'] },
  sand: { walls: ['#d8c29a', '#c9b086', '#e2d0aa'], roofs: ['#b89468', '#a8845c', '#c9a878'] },
  camp: { walls: ['#6e6257', '#5c5148', '#7a6e62'], roofs: ['#3e3833', '#4a423b'] },
  fae: { walls: ['#f1eee6', '#e4e2da', '#d8dcd6'], roofs: ['#8fa9a6', '#7c9a98', '#a9bdb6'] },
  dark: { walls: ['#4c4a4d', '#3f3d42', '#56545a'], roofs: ['#262529', '#2e2c31'] },
};

export const SCENES = {
  rifthold: {
    radius: 300, seed: 79, palette: PAL.adarlan, walls: true, view: 0.8,
    river: { w: 16, amp: 34 }, coast: { x: 345 }, ships: 9,
    hills: [[-185, -190, 30, 150]],
    districts: [{ at: [150, 95], r: 150, palette: PAL.slum, scale: 0.8 }],
    landmarks: [
      { type: 'glassCastle', id: 'castle', name: 'The Glass Castle', at: [-185, -190], clear: 128, book: 1, interior: 'castle', notes: [
        [1, 'The king’s palace. The old stone castle of Adarlan’s kings is still there underneath, and the glass castle is built on top of it: towers, spires and bridges of glass that catch the light for miles. The competition to become King’s Champion is held inside.'],
        [1, 'Inside the gates lies the great courtyard; beside it, the royal gardens and the obsidian clock tower.'],
      ] },
      { type: 'keep', id: 'keep', name: 'The Assassins’ Keep', at: [165, -150], clear: 48, book: 1, interior: 'keep', notes: [
        [1, 'Seat of Arobynn Hamel, King of the Assassins, and the house where Celaena Sardothien was trained.'],
        [0, 'A grand, pale-stone house on a respectable street: marble halls and fine carpets above, training rooms and dungeons below.'],
      ] },
      { type: 'warehouse', id: 'apartment', name: 'Celaena’s Apartment', at: [150, 100], clear: 18, book: 2, interior: 'apartment', notes: [
        [2, 'A warehouse in the slums by the Avery. The upper floor is hers alone: bought with her own money, lavishly furnished, and kept secret.'],
        [0, 'She bought it to be free of Arobynn, and shared it with Sam.'],
      ] },
      { type: 'theater', id: 'theater', name: 'The Royal Theatre', at: [30, -105], clear: 30, book: 2, interior: 'theater', notes: [
        [2, 'Rifthold’s great stage. Celaena loves music and performance more than almost anything the capital offers.'],
      ] },
      { type: 'label', id: 'vaults', name: 'The Vaults', at: [215, 150], book: 0, interior: 'vaults', notes: [[0, 'An underground den of pit-fighting and worse, down in the slums.']] },
      { type: 'label', id: 'docks', name: 'The Docks', at: [270, 28], book: 1, notes: [[1, 'Where the Avery meets the sea. Merchant ships and slavers alike tie up here.']] },
      { type: 'label', id: 'slums', name: 'The Slums', at: [110, 170], book: 2, notes: [[2, 'The crowded southern bank of the Avery.']] },
      { type: 'label', id: 'avery', name: 'River Avery', at: [-120, 12], book: 1, notes: [[1, 'The river that runs through Rifthold to the Great Ocean.']] },
    ],
  },
  endovier: {
    radius: 150, seed: 12, palette: PAL.camp, palisade: true, mountains: 150, treeless: true, sparse: 0.5,
    pits: [[-40, -30, 46, 22], [55, 40, 38, 18], [70, -70, 30, 14]],
    landmarks: [
      { type: 'mine', id: 'mines', name: 'The Salt Mines', at: [-40, -30], clear: 50, book: 1, interior: 'mines', notes: [[1, 'Open pits and tunnels of rock salt, worked by slaves under the overseers’ whips.']] },
      { type: 'label', id: 'barracks', name: 'Slave Barracks', at: [20, 95], book: 1, notes: [[1, 'Long, unheated sheds inside the wall.']] },
    ],
  },
  calaculla: {
    radius: 140, seed: 31, palette: PAL.camp, palisade: true, biome: 'dry', treeless: true, sparse: 0.5,
    pits: [[30, -20, 44, 18], [-60, 40, 34, 14]],
    landmarks: [{ type: 'mine', id: 'mines', name: 'The Labour Camp', at: [30, -20], clear: 46, book: 1, notes: [[1, 'Calaculla’s workings, in the heat of Eyllwe.']] }],
  },
  orynth: {
    radius: 250, seed: 77, palette: PAL.north, walls: true, snow: true, river: { w: 12, amp: 50 }, mountains: 170, mountainDir: -1.6,
    hills: [[0, -150, 30, 80]],
    landmarks: [{ type: 'castle', id: 'palace', name: 'The Palace of Orynth', at: [0, -150], clear: 70, book: 1, tone: 'pale', notes: [[1, 'Seat of Terrasen’s royal house before the conquest.']] }],
  },
  anielle: {
    radius: 170, seed: 44, palette: PAL.adarlan, walls: true, mountains: 190, mountainDir: 3.1, lake: [150, 120, 190],
    hills: [[-90, -60, 24, 60]],
    landmarks: [
      { type: 'castle', id: 'keep', name: 'The Keep of Anielle', at: [-90, -60], clear: 55, book: 1, notes: [[1, 'Seat of the Lord of Anielle, built into the mountainside above the lake.']] },
      { type: 'label', id: 'lake', name: 'Silver Lake', at: [170, 150], book: 1, notes: [[1, 'The cold lake Anielle is built upon.']] },
    ],
  },
  morath: {
    radius: 90, seed: 66, palette: PAL.dark, mountains: 230, treeless: true, sparse: 0.35, mood: 'grim',
    hills: [[0, 0, 34, 80]],
    landmarks: [{ type: 'castle', id: 'keep', name: 'Morath Keep', at: [0, 0], clear: 60, book: 1, tone: 'dark', notes: [[1, 'Duke Perrington’s seat.']] }],
  },
  ferian: { custom: 'ferian' },
  skullsbay: { radius: 150, seed: 61, palette: PAL.slum, palisade: true, coast: { x: 150 }, ships: 12, biome: 'warm', mountains: 60, mountainDir: 3.1, forest: 0.9,
    landmarks: [
      { type: 'label', id: 'seadragon', name: 'The Sea Dragon', at: [60, 10], book: 0, interior: 'tavern', notes: [[0, 'Captain Rolfe\u2019s tavern and seat of business. The map of the world\u2019s oceans is inked on his hands.']] },
      { type: 'chain', id: 'shipbreaker', name: 'Ship-Breaker', at: [330, 0], book: 0, notes: [[0, 'The great chain strung between two watchtowers across the mouth of the bay. Nothing sails in or out while it is raised.']] },
    ] },
  xandria: { radius: 200, seed: 37, palette: PAL.sand, walls: true, biome: 'desert', treeless: true, coast: { x: 240 }, ships: 4,
    hills: [[-70, -80, 16, 80]],
    landmarks: [
      { type: 'castle', id: 'palace', name: 'Lord Berick\u2019s Palace', at: [-70, -80], clear: 60, book: 0, tone: 'sand', notes: [[0, 'Seat of the Lord of Xandria.']] },
      { type: 'label', id: 'market', name: 'The Market', at: [40, 60], book: 0, notes: [[0, 'Where Celaena spent a small fortune on spidersilk.']] },
    ] },
  silent: { radius: 60, seed: 19, palette: PAL.sand, biome: 'desert', treeless: true, sparse: 0, dunes: true, lake: [400, 330, 62],
    landmarks: [
      { type: 'castle', id: 'fortress', name: 'The Fortress', at: [0, 0], clear: 70, book: 0, tone: 'sand', interior: 'silent', notes: [[0, 'Sandstone halls where the Silent Assassins train, cooled by water channels and open courtyards.']] },
      { type: 'oasis', id: 'oasis', name: 'The Oasis', at: [400, 330], book: 0, notes: [[0, 'The nearest water, miles off across the dunes. The Master’s students run there and back with buckets, and Celaena was made to run it too, in the full heat of the day.']] },
    ] },
  varese: {
    radius: 240, seed: 53, palette: PAL.south, walls: true, coast: { x: -250, flip: true }, ships: 7, biome: 'warm',
    hills: [[110, -90, 20, 80]],
    landmarks: [
      { type: 'castle', id: 'palace', name: 'The Royal Palace', at: [110, -90], clear: 65, book: 3, tone: 'pale', notes: [[3, 'Home of the Ashryver royal family of Wendlyn.']] },
      { type: 'label', id: 'market', name: 'The Markets', at: [-60, 40], book: 3, notes: [[3, 'Crowded streets of vendors, teggya bread and wine.']] },
    ],
  },
  mistward: {
    radius: 70, seed: 88, palette: PAL.north, mountains: 180, mountainDir: 0, forest: 1.6, sparse: 0.0, mood: 'mist',
    landmarks: [
      { type: 'mistward', id: 'fortress', name: 'Mistward Fortress', at: [0, 0], clear: 75, book: 3, interior: 'mistward', notes: [[3, 'Grey stone walls and towers, kitchens and training grounds, sheltered by a ring of ward-stones older than the fortress itself.']] },
      { type: 'label', id: 'wards', name: 'The Ward-stones', at: [0, 118], book: 3, notes: [[3, 'Carved standing stones that guard the approach.']] },
      { type: 'cave', id: 'cave', name: 'The Cave', at: [260, -40], face: -1.42, clear: 34, book: 3, interior: 'cave', notes: [[3, 'A cave up in the mountains beyond Mistward, where Celaena and Rowan fought a creature in the dark.']] },
    ],
  },
  doranelle: {
    radius: 240, seed: 15, palette: PAL.fae, river: { w: 20, amp: 60 }, river2: true, biome: 'lush', forest: 1.2,
    hills: [[-40, -120, 18, 80]],
    landmarks: [{ type: 'castle', id: 'palace', name: 'Maeve’s Palace', at: [-40, -120], clear: 65, book: 3, tone: 'pale', interior: 'maeve', notes: [[3, 'The seat of the Fae Queen. Step inside to see her throne room.']] }],
  },
  banjali: { radius: 200, seed: 23, palette: PAL.sand, walls: true, biome: 'dry', river: { w: 10, amp: 40 },
    hills: [[40, -90, 14, 80]],
    landmarks: [{ type: 'castle', id: 'palace', name: 'The Royal Palace', at: [40, -90], clear: 60, book: 1, tone: 'sand', notes: [[1, 'Seat of the King and Queen of Eyllwe.']] }] },
  bellhaven: { radius: 190, seed: 29, palette: PAL.south, walls: true, coast: { x: 215 }, ships: 6, biome: 'warm', landmarks: [] },
  perranth: { radius: 180, seed: 35, palette: PAL.north, walls: true, snow: true, forest: 1.3, landmarks: [] },
};

const tower = (name) => [{ type: 'clockTower', id: 'tower', name: 'The Clock Tower', at: [18, -14], clear: 20, book: 1, notes: [
  [1, `A clock tower of black stone stands over ${name}.`],
  [3, 'It is the twin of the obsidian tower in the gardens of the glass castle.'],
] }];
const TOWERS = { noll: tower('Noll'), amaroth: tower('Amaroth') };
// the towers show on the continent map too, and are mentioned when the town is selected
for (const p of PLACES) if (TOWERS[p.id]) { p.tower = true; p.notes = [[1, `A small town in ${p.realm.replace(/^The /, 'the ')}. A clock tower of black stone stands over it.`]]; }

// Generic scene for places without a hand-made one.
export function sceneFor(p) {
  if (SCENES[p.id]) return SCENES[p.id];
  const seed = [...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 9973;
  const north = p.pos[1] < -250, south = p.pos[1] > 150, west = p.pos[0] < -150;
  return {
    radius: 110, seed, landmarks: TOWERS[p.id] || [],
    palette: west ? PAL.sand : north ? PAL.north : south ? PAL.south : PAL.adarlan,
    snow: north, biome: west || south ? 'dry' : undefined, palisade: true, forest: west ? 0.08 : undefined,
  };
}
