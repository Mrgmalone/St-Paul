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
      buildings: ['house', 'farm', 'wheatfarm', 'woodhut', 'stockpile', 'granary', 'wall', 'gate', 'gtower', 'pit', 'poleturner', 'bowyer', 'armory', 'garden'] } },
  { n: 2, name: 'Homestead', grow: 2, wall: 'brick', keepHp: 2200,
    need: { people: 12, mood: 50, food: 150, buildings: { house: 3, woodhut: 1, farmAny: 1 } },
    unlock: { units: [], buildings: ['quarry', 'tavern', 'brewery', 'hopfarm', 'highwall', 'stairs', 'lookout', 'chapel', 'stocks', 'moat'] } },
  { n: 3, name: 'Hold', grow: 3, wall: 'stone', keepHp: 3200,
    need: { people: 22, mood: 55, food: 300, stone: 150, buildings: { house: 5, quarry: 1, tavern: 1 } },
    unlock: { units: ['sword', 'maceman', 'ballista'], buildings: ['smithy', 'ironmine', 'market', 'mill', 'bakery', 'stower'] } },
  { n: 4, name: 'Castle', grow: 2, wall: 'thick', keepHp: 4500,
    need: { people: 35, mood: 60, food: 500, stone: 300, iron: 80, buildings: { smithy: 1, market: 1, mill: 1, bakery: 1 } },
    unlock: { units: ['knight', 'ram', 'catapult'], buildings: ['roundtower', 'greattower'] } },
  { n: 5, name: 'Stronghold', grow: 3, wall: 'thick', keepHp: 6500,
    need: { people: 50, mood: 65, food: 800, stone: 500, iron: 200, buildings: { stower: 2 } },   // stand-in until the school is built (Phase 4B)
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
  sites: [[80, 15], [110, 40], [82, 66], [44, 68]],
  friend: true,
  pace: { easy: 0.65, medium: 1.0, hard: 1.35 },
  workersPerStage: [4, 7, 10, 13, 16],
  raid: { first: { easy: 420, medium: 330, hard: 260 }, every: { easy: 150, medium: 120, hard: 95 }, minArmy: 4, largeArmy: 12 }
};

// ---------- rogue bandits ----------
// Small bands that belong to no rival: they come in from the edge of the map, steal from your stores and run off.
const ROGUES = { first: 360, every: 240, band: [2, 4], steal: { food: 30, wood: 30, stone: 15, gold: 15 } };
