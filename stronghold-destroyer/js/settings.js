'use strict';
// Stronghold Destroyer — SETTINGS. Every faction, stage and economy number lives here, in one place,
// so renaming or tuning is done in this file only. Names are working names and may be respelled.
// Loaded first by index.html; the game reads these blocks but never changes them.

// ---------- the four factions ----------
// Shown on the front page in this order. Each has a short key (used inside the game), a name, its colours
// and emblem (drawn in code), one sentence on how it plays, its strengths and weakness, its starting setup,
// and the numbers behind its rules.
const FACTIONS = {
  cyyoung: {
    name: 'Cy Young', epithet: 'the bread makers',
    field: '#2f5a2a', charge: '#e0b443', trim: '#e0b443', emblem: 'wheat',
    plays: 'Bake far more bread than anyone needs, sell the rest, and let the gold buy your way up the stages.',
    strengths: ['Mill and bakeries make 4.5 times the food', 'Food beyond what the people need is sold for gold, every 10 seconds'],
    weakness: 'No special power. Slow them early (raid their farms and mills) before the gold snowballs.',
    start: { king: 1, civilians: 5, food: 100, wood: 80 },
    rules: { bakeryMul: 4.5, sellAbove: 200, sellLot: 10, sellGold: 3, sellEvery: 10 }
  },
  ticanologue: {
    name: 'Ticanologue', epithet: 'the marketers',
    field: '#22427a', charge: '#d7dbe0', trim: '#c8ccd2', emblem: 'scales',
    plays: 'Trade your way to power: everything at the market costs you half, once you can afford the market.',
    strengths: ['Market buying prices are half of everyone else’s'],
    weakness: 'The market costs three times as much to build, so the bargains start late.',
    start: { king: 1, civilians: 5, food: 100, wood: 80 },
    rules: { marketBuyMul: 0.5, marketCostMul: 3 }
  },
  hekaranok: {
    name: 'Hekaranok', epithet: 'the healers',
    field: '#1d6b66', charge: '#f2ead8', trim: '#f2ead8', emblem: 'herb',
    plays: 'Twice the people, each one weaker: the wounded run home, heal, and walk back to exactly where they were.',
    strengths: ['Room for twice the people, and twice the civilians at the start', 'Wounded soldiers run home, heal and return to their spot', 'A bell calls everyone home to heal', 'Abbeys are stronger (stand-in: the House of Prayer)'],
    weakness: 'Each person is weaker, and the killed cannot be healed: kill them, do not just wound them.',
    start: { king: 1, civilians: 10, food: 120, wood: 80 },
    rules: { popMul: 2, hpMul: 0.65, dmgMul: 0.8, fleeBelow: 0.35, healPerSec: 12, abbeyHpMul: 1.5, abbeyHealMul: 1.5 }
  },
  psychana: {
    name: 'Psychana', epithet: 'sight and stealth',
    field: '#3e2464', charge: '#cdb8f0', trim: '#b9a2e0', emblem: 'eye',
    plays: 'See far, strike unseen: small bands of berserkers slip past everything but the towers near a castle.',
    strengths: ['Every unit sees as far as a longbowman', 'Berserkers in groups of fewer than 10 move unseen'],
    weakness: 'Towers and palisade towers near a castle still spot their hidden bands.',
    start: { king: 1, civilians: 5, food: 100, wood: 80 },
    rules: { sight: 240, stealthMax: 9, spotRange: 300, castleRange: 700 }
  }
};
const FACTION_ORDER = ['cyyoung', 'ticanologue', 'hekaranok', 'psychana'];
// what every faction shares before its own rules (the old peoples' neutral values)
const FACTION_BASE = { sHp: 1, sDmg: 1, sSpeed: 1, train: 1, gather: 1, carry: 10, eatEvery: 15, popCap: 15, regrow: 5, heal: 1.5, keepHeal: 0,
  keepHp: 1500, keepRate: 2.2, keepDmg: 7, keepRange: 240, bldHp: 1 };

// ---------- the five castle stages ----------
// unlock: what can be bought or built from this stage on (anything not listed in any stage stays open).
// need: what it takes to grow INTO this stage. people, mood (happiness), food are checked; stone and iron are
// checked and then spent (they become the new walls); buildings must be standing and finished.
// grow: how many squares the castle grows in every direction; wall: the castle ring's material.
const STAGES = [
  { n: 1, name: 'Shack', grow: 0, wall: 'wood', keepHp: 1500,
    unlock: { units: ['civ', 'spear', 'archer'],
      buildings: ['house', 'farm', 'wheatfarm', 'woodhut', 'stockpile', 'granary', 'wall', 'gate', 'gtower', 'pit', 'poleturner', 'bowyer', 'armory', 'garden', 'alehouse', 'waterpot'] } },
  { n: 2, name: 'Homestead', grow: 2, wall: 'brick', keepHp: 2200,
    need: { people: 12, mood: 50, food: 150, buildings: { house: 3, woodhut: 1, farmAny: 1 } },
    unlock: { units: [], buildings: ['quarry', 'tavern', 'brewery', 'hopfarm', 'highwall', 'stairs', 'lookout', 'chapel', 'stocks', 'moat', 'mill', 'apothecary'] } },
  { n: 3, name: 'Hold', grow: 3, wall: 'stone', keepHp: 3200,
    need: { people: 22, mood: 55, food: 300, stone: 150, buildings: { house: 5, quarry: 1, tavern: 1 } },
    unlock: { units: ['sword', 'maceman', 'ballista', 'knight'], buildings: ['smithy', 'ironmine', 'market', 'bakery', 'stower', 'school', 'engineerhut', 'stable', 'vineyard', 'orchard', 'church'] } },
  { n: 4, name: 'Castle', grow: 2, wall: 'thick', keepHp: 4500,
    need: { people: 35, mood: 60, food: 500, stone: 300, iron: 80, buildings: { smithy: 1, market: 1, mill: 1, bakery: 1 } },
    unlock: { units: ['ram', 'catapult'], buildings: ['roundtower', 'greattower', 'abbey'] } },
  { n: 5, name: 'Stronghold', grow: 3, wall: 'thick', keepHp: 6500,
    need: { people: 50, mood: 65, food: 800, stone: 500, iron: 200, buildings: { school: 1, stower: 2 } },   // the school must stand before the Stronghold
    unlock: { units: ['trebuchet'], buildings: [] } }
];

// ---------- wages and taxes ----------
// wages: gold each soldier is paid every minute. Unpaid soldiers make the people unhappy until the gold is found.
// taxes: the existing None / Low / High levels (gold per person every 20 seconds), raised a little at each stage.
const ECONOMY = {
  wages: { spear: 1, archer: 1, sword: 2, maceman: 2, knight: 4, ballista: 2, ram: 2, catapult: 3, trebuchet: 4 },
  unpaidMood: -8,
  taxStageMul: [1, 1.2, 1.4, 1.7, 2]
};

// ---------- the computer rivals ----------
// Four rivals, each playing one of the four factions (each a different one), one of whom may be a trading friend.
// sites: where their shacks stand (map squares). pace: how fast they grow on each difficulty (1 = as fast as a
// steady player). army: soldiers they gather before a raid; siege engines come only with a large army.
const RIVALS = {
  count: 4,
  lords: ['Lord Varek of Ashmoor', 'Lady Brenna of Kestrel Hill', 'Lord Odo of Fenmarch', 'Lady Sibyl of Greyholt'],
  sites: [[80, 15], [110, 40], [82, 66], [52, 66]],   // north-east (the old camp), east, south-east, south
  friend: true,
  pace: { easy: 0.65, medium: 1.0, hard: 1.35 },
  workersPerStage: [8, 15, 24, 32, 38],   // enough people to meet each stage's needs (workers + soldiers + the lord)
  // seconds before a rival's first raid (each later rival waits 75 seconds more), and between its raids
  raid: { first: { easy: 600, medium: 450, hard: 330 }, every: { easy: 300, medium: 240, hard: 170 }, minArmy: 4, largeArmy: 12 }
};

// ---------- rogue bandits ----------
// Small bands that belong to no rival: they come in from the edge of the map, steal from your stores and run off.
const ROGUES = { first: 360, every: 240, band: [2, 4], steal: { food: 30, wood: 30, stone: 15, gold: 15 } };

// ---------- Phase 4B: the industries ----------
// Every list of five is by castle stage (Shack, Homestead, Hold, Castle, Stronghold).
const INDUSTRY = {
  // the wood and iron yard ("Woodcutter's Hut" grows into it): how many may stand, and how many people each holds.
  // From the Hold the blacksmith joins and some of the yard's people work iron (you choose how many); wagons carry
  // the woodcutters to the forest (they travel faster) and a hitching area stands outside.
  yard: { max: [4, 3, 2, 1, 1], staff: [2, 5, 10, 20, 25], ironFrom: 3, ironEvery: 6, wagonSpeed: 1.6 },
  // arrows and bolts cost wood; with no wood, archers make rock-tipped arrows (no quarry needed), a little weaker
  arrowWood: 0.1, boltWood: 1, rockArrow: 0.8,
  // stone quarries (from the Homestead): at most two, ten people each; oxen by stage (the second comes free at the
  // Castle); oxen eat food each minute and cost more to replace as you grow; on foot, people gather stone only nearby
  quarry: { max: 2, staff: 10, oxen: [0, 1, 1, 2, 2], oxFood: [0, 2, 3, 4, 5], oxReplace: [[0, 0], [40, 10], [60, 20], [90, 35], [120, 50]], oxSpeed: [1, 1, 1.15, 1.3, 1.45], footStone: 320 },
  // wheat fields: how many may stand and how many people each holds (they merge as the castle grows); each wants a sentry
  fields: { max: [5, 5, 3, 2, 2], staff: [3, 5, 7, 10, 10] },
  // the mill: before the Hold up to two small mills of two people; from the Hold one mill that comes with five bakeries of three
  mill: { maxEarly: 2, staffEarly: 2, maxLate: 1, staffLate: 3, bakeries: 5, bakeryStaff: 3 },
  // bread: one baker makes about 6 loaves a minute from 3 flour (fifteen bakers feed about twenty people every couple of minutes);
  // a miller grinds about 15 flour a minute from wheat
  bakery: { inp: { flour: 0.5 }, out: 'bread', n: 1, time: 10, batch: 6 },
  millCraft: { inp: { wheat: 1 }, out: 'flour', n: 2, time: 8, batch: 6 },
  // the granary: how much food it holds before bugs get in (expanded at the Hold); the keep holds a little more
  granary: { cap: 300, capExpanded: 800, keepCap: 150, bugsAfter: 60, spoil: 0.03 },
  // the alehouse (one worker): price settings and what they do to the people
  ale: { prices: ['Cheap', 'Fair', 'Dear'], gold: [0.5, 1, 1.8], mood: [10, 8, -6], drunks: [0.012, 0, 0], alehouseServes: 8, tavernServes: 15 },
  // the feast (from the Hold): ingredients, and it costs more than all the taxes you have gathered this game
  feast: { needs: { grapes: 10, apples: 10, chickens: 4, turkeys: 2, cows: 1, sheep: 1 }, minGold: 200, mood: 40, lasts: 360, work: 2 },
  // the market: non-food goods sell for (buy) and buy for (sell) these multiples of what they cost to make, by school level;
  // food costs the same to buy and to sell. Happy or upset people still move prices (up to 25% cheaper, 40% dearer).
  market: { buy: [2.5, 2.5, 2.0, 1.8], sell: [1.2, 1.2, 1.5, 1.6], destroyedMood: -30,
    makeCost: { wood: 1, stone: 1.5, iron: 3, hops: 1, wheat: 1, flour: 2, food: 1, bread: 1.5, ale: 3, bow: 12, spear: 8, sword: 20, mace: 16, armor: 40 } },
  // the school (from the Hold): three levels of learning (gold, seconds); each level wastes less material (10%), builds
  // cheaper and quicker (10% and 15%), and from level 2 trades better
  school: { levels: [[150, 60], [300, 90], [600, 120]], waste: 0.1, buildCost: 0.1, buildTime: 0.15, engineerCost: 40 },
  // the health houses: how much they heal and lift spirits, by size; the Stronghold's doctor upgrade
  // heal: how fast the sick recover nearby (the keep alone is 1); serves: how many people one of them cheers
  health: { apothecary: { heal: 1.5, mood: 2, r: 420, serves: 10 }, chapel: { heal: 1.5, mood: 5, r: 520, serves: 20 }, church: { heal: 2, mood: 6, r: 620, serves: 35 },
    abbey: { heal: 3, mood: 7, r: 720, serves: 50 }, doctorCost: 400, doctorTime: 120, doctorMul: 2 },
  // animals at the farm (and horses at the stable): born every so many seconds while their keepers work, up to a cap
  animals: { cows: [40, 8], pigs: [30, 10], oxen: [60, 6], chickens: [15, 20], turkeys: [25, 8], sheep: [35, 8], horses: [70, 8] },
  farmStart: { cows: 2, pigs: 2, oxen: 2, chickens: 3, turkeys: 1, sheep: 1 }, leatherEvery: 45,
  // the granary's Expand (from the Hold), and the school's engineers (each Engineer's Hut houses four)
  granaryExpand: { wood: 60, stone: 40 }, engineersPerHut: 4
};

// ---------- Phase 4B: soldiers ----------
const SOLDIERS = {
  // veteran stars: one for each battle survived (up to 100); each makes him a little stronger
  stars: { max: 100, dmgPer: 0.008, toughPer: 0.005, battleEnds: 12 },
  // soldier lessons at the school (the Soldiers button): five levels, numbers kept hidden from the player; [gold, seconds]
  lessons: { levels: [[120, 60], [220, 75], [360, 90], [520, 110], [720, 130]], dmgPer: 0.06, toughPer: 0.05 },
  // the soldiers of the sheet, now trained for real (they share the archer's or maceman's figure in a different outfit)
  kits: {
    longbow:  { name: 'Longbowman',  base: 'archer',  stage: 2, needs: ['bow'], gold: 15, hp: 75, dmg: 11, range: 240, cd: 1.9, speed: 70, sight: 2, wage: 1 },
    crossbow: { name: 'Crossbowman', base: 'archer',  stage: 3, needs: ['bow'], iron: 2, gold: 15, hp: 85, dmg: 22, range: 160, cd: 2.9, speed: 66, wage: 2 },
    flame:    { name: 'Flamethrower', base: 'archer', stage: 4, needs: ['sword', 'armor'], gold: 20, squad: 10, hp: 80, dmg: 12, range: 36, cd: 0.8, speed: 96, wage: 1 },
    berserker:{ name: 'Berserker',   base: 'maceman', stage: 3, needs: ['mace'], leather: 2, gold: 10, hp: 150, dmg: 21, range: 5, cd: 1.0, speed: 80, wage: 2, only: 'psychana' }
  },
  // knights: on foot from the Hold; mounted from the Castle when the stable has a horse. The horse takes the blows
  // until it falls, unless a crossbow bolt or ballista bolt strikes the rider.
  knight: { footSpeed: 56, mountedSpeed: 86, horseHp: 180 },
  // a lookout tower: a sentry at the door, an archer on top, and from the Homestead a longbowman too (farther, two shots)
  lookout: { longbowFrom: 2, range: 420 },
  // engines for the giant towers (Round and Great Tower come empty): Gerald's 5,000 and 10,000, scaled to this economy
  towerEngine: { ballista: { gold: 400, wood: 150 }, trebuchet: { gold: 800, wood: 300, stone: 100 } },
  // flamethrowers: dig a short moat round themselves when they stop in the field
  flameMoat: 5
};

// ---------- Phase 4C: controls ----------
// edgeSpeed: how fast the view slides when the mouse rests at the screen's edge (points a second at normal zoom; the
// keyboard stays at 620); edgeZone: how wide the edge band is (the deeper in, the faster, up to edgeSpeed); ease: how
// gently it starts and stops (lower is gentler). boxHold: how long a finger rests before it draws a selection box (ms).
const CONTROLS = { edgeSpeed: 260, edgeZone: 34, ease: 4.5, boxHold: 300 };

// ---------- Phase 4C: moats ----------
// MOAT_FILLERS: who may fill a moat (shovel it full until it is ordinary ground). Use the unit's kind or kit:
// 'civ' citizens, 'spear' spearmen, 'flame' flamethrowers, 'sword' swordsmen, 'maceman', 'archer', 'longbow', 'crossbow',
// 'berserker', 'knight' (knights and anyone on a horse are never allowed). Change this one line to change who may fill.
const MOAT_FILLERS = ['civ', 'spear', 'flame'];
const MOAT = { fillPerSecond: 18 };   // how fast one citizen fills (the moat's strength 160 goes in about 9 seconds)

// ---------- Phase 4C: spikes ----------
// strikes it takes to kill on active spikes: ordinary people one; these armored kinds two (a mounted knight's first strike
// kills the horse). The owner's own side walks over them safely.
const SPIKES = { armored: ['knight', 'sword', 'king'], siegeDamage: 120 };
