// Picture catalogue for the instruction manual: every person, soldier, siege engine, building and item in the game,
// drawn by the game itself (the 3D models, and the item pictures), with its name, the castle stage it comes at, what it
// costs, and one line on what it does. Writes a PDF.
// usage, from the stronghold-destroyer folder:   node tools/catalog.js <out.pdf>
const { chromium } = require('playwright'); const env = require('../tests/env'); const path = require('path');
const OUT = process.argv[2] || path.join(env.SP, 'Stronghold-Destroyer-Picture-Catalog.pdf');
const PEOPLE = [
  ['civ', 'Citizen', 'Your workers: they build, fetch wood, food and stone, and staff every workplace. New ones grow up in your houses.'],
  ['king', 'Your King', 'Your leader, on foot. The only fighter you start with: strong, and worth guarding.'],
  ['spear', 'Spearman', 'Cheap, quick foot soldier with a long reach. Needs a spear and 10 gold.'],
  ['archer', 'Archer', 'Shoots from a distance, best from walls and towers. Needs a bow and 10 gold.'],
  ['archer.longbow', 'Longbowman', 'Shoots farther and sees twice as far as other soldiers. Needs a bow and 15 gold.'],
  ['archer.crossbow', 'Crossbowman', 'Slow but heavy bolts; a bolt can strike a mounted knight past his horse. Needs a bow, 2 iron and 15 gold.'],
  ['sword', 'Swordsman', 'Steady, well-armoured fighter for close combat. Needs a sword and 10 gold.'],
  ['maceman', 'Maceman', 'Heavy hitter in armour. Needs a mace and 10 gold.'],
  ['maceman.berserker', 'Berserker', 'Psychana only: fierce axe fighter; small bands move unseen. Needs a mace, 2 leather and 10 gold.'],
  ['archer.flame', 'Flamethrower', 'Trained as a squad of ten; sets enemies and buildings ablaze up close. Needs a sword, armour and 20 gold.'],
  ['knight.foot', 'Knight (on foot)', 'Hard to hurt: only knights, kings, ballistas and trebuchets wound him fully. Needs a sword, armour and 20 gold.'],
  ['knight', 'Mounted Knight', 'A knight on a horse from the stable: much faster; the horse takes the blows until it falls.']
];
const SIEGE = [
  ['ram', 'Battering Ram', 'Smashes walls, gates and buildings; cannot hurt soldiers. Guard it.'],
  ['catapult', 'Catapult', 'Lobs heavy stones from far away; best against walls and towers.'],
  ['ballista', 'Ballista', 'Giant crossbow: cuts down soldiers at long range, only chips stone.'],
  ['trebuchet', 'Trebuchet', 'Throws stones farthest of all. Needs the school’s top level.'],
  ['oxcart', 'Ox Cart', 'Hauls cut stone from a quarry to your stores. One comes free with each quarry.']
];
const BUILDINGS = {
  keep: ['Keep', 'Your castle’s heart. It grows through the five stages and shoots at enemies who come near.'],
  house: ['House', 'Room for your people; each house raises a new citizen every few minutes.'],
  farm: ['Farm', 'Grows crops for food and keeps animals (cows, pigs, oxen, hens, turkeys, sheep).'],
  wheatfarm: ['Wheat Field', 'Grows wheat for the mill (flour, then bread) and for ale.'],
  hopfarm: ['Hop Farm', 'Grows hops for the brewery’s ale.'],
  vineyard: ['Vineyard', 'Grows grapes: food, and needed for a feast.'],
  orchard: ['Orchard', 'Grows apples: food, and needed for a feast.'],
  woodhut: ['Woodcutter’s Hut', 'Woodcutters fell trees near it; it grows into the wood and iron yard.'],
  stockpile: ['Stockpile', 'A store for wood, stone, iron and goods, closer to where they are gathered.'],
  granary: ['Granary', 'Stores food (300, 800 once expanded). Beyond that, bugs spoil the extra.'],
  quarry: ['Quarry', 'Beside grey rocks: cuts stone; its ox cart hauls it home.'],
  ironmine: ['Iron Mine', 'On the red iron ground: digs iron for weapons and crossbows.'],
  mill: ['Mill', 'Grinds wheat into flour for the bakeries.'],
  bakery: ['Bakery', 'Bakes bread from flour (Cy Young bakes four and a half times as much).'],
  brewery: ['Brewery', 'Brews ale from hops.'],
  alehouse: ['Alehouse', 'Serves ale to cheer your people; set its price Cheap, Fair or Dear.'],
  tavern: ['Tavern', 'Serves ale to more people than an alehouse; people rest here on breaks.'],
  chapel: ['House of Prayer', 'Lifts spirits and heals the sick nearby.'],
  church: ['Church', 'A bigger house of prayer: cheers and heals more people.'],
  abbey: ['Abbey', 'The greatest house of prayer and healing (stronger for Hekaranok).'],
  apothecary: ['Apothecary', 'Heals the sick nearby and cheers a few people.'],
  garden: ['Garden', 'Cheers people (they work a little slower).'],
  stocks: ['Stocks', 'Frighten people into working harder (they are less happy).'],
  market: ['Market', 'Buy and sell goods and weapons for gold (Ticanologue pays half).'],
  school: ['School', 'Lessons: less waste, cheaper and quicker building, better trade, trained soldiers, engineers.'],
  engineerhut: ['Engineer’s Hut', 'Houses four engineers who build and crew siege engines.'],
  stable: ['Stable', 'Raises horses that turn knights into mounted knights.'],
  bowyer: ['Fletcher (Bowyer)', 'Makes bows from wood.'],
  poleturner: ['Spear-maker', 'Makes spears from wood.'],
  smithy: ['Blacksmith', 'Makes swords, maces or knight armour from iron.'],
  armory: ['Armory', 'Stores weapons; soldiers are armed from it.'],
  waterpot: ['Water Pot', 'Water for putting out fires; it grows as time passes.'],
  wall: ['Wall', 'Draw it from point to point; it grows from wood to stone with the castle.'],
  gate: ['Gate', 'Lets your people through a wall and keeps enemies out.'],
  highwall: ['High Wall', 'Stone wall as tall as the keep; archers climb it by stairs.'],
  stairs: ['Stairs', 'Placed beside a high wall so archers can climb it.'],
  gtower: ['Tower', 'Wooden tower: archers shoot from it, a knight guards its door.'],
  stower: ['Stone Tower', 'Far tougher than the wooden tower; shoots farther, holds more archers.'],
  lookout: ['Lookout Tower', 'Tall and slim: archers on top see and shoot very far.'],
  roundtower: ['Round Tower', 'Giant tower that carries a ballista or a trebuchet.'],
  greattower: ['Great Tower', 'The strongest tower; can carry a siege engine.'],
  moat: ['Moat', 'Water that stops people and engines; citizens, spearmen, swordsmen and flamethrowers can fill it.'],
  pit: ['Spike Pit', 'Hidden spikes: one strike kills an enemy (knights and berserkers take two).']
};
const ITEMS = [
  ['food', 'Food', 'Crops, berries and bread: everyone eats.'], ['wood', 'Wood', 'For building, bows and spears.'], ['stone', 'Stone', 'For stone walls, towers and growing the castle.'],
  ['iron', 'Iron', 'For swords, maces, armour and crossbows.'], ['gold', 'Gold', 'From taxes and trade; pays wages and training.'], ['wheat', 'Wheat', 'Ground into flour; brewed into ale.'],
  ['flour', 'Flour', 'Baked into bread.'], ['bread', 'Bread', 'Good food that adds variety.'], ['hops', 'Hops', 'Brewed into ale.'], ['ale', 'Ale', 'Served at the alehouse and tavern to cheer people.'],
  ['grapes', 'Grapes', 'Food, and part of a feast.'], ['apples', 'Apples', 'Food, and part of a feast.'], ['leather', 'Leather', 'From the farm’s animals; berserkers need it.']
];
const WEAPONS = [['sword', 'Sword', 'For swordsmen, knights and flamethrowers.'], ['spear', 'Spear', 'For spearmen.'], ['bow', 'Bow', 'For archers, longbowmen and crossbowmen.'], ['mace', 'Mace', 'For macemen and berserkers.'], ['armor', 'Knight Armour', 'For knights and flamethrowers.']];
// simple pictures for goods the game shows only as words
const SVG = {
  iron: '<rect x="14" y="40" width="72" height="26" rx="4" fill="#6d7378"/><polygon points="14,40 30,28 102,28 86,40" fill="#9aa2a8"/><polygon points="86,40 102,28 102,54 86,66" fill="#4e5459"/>',
  wheat: '<g stroke="#b88a2a" stroke-width="4" fill="none"><path d="M50 92 L50 30"/><path d="M38 92 L44 36"/><path d="M62 92 L56 36"/></g>' + [30, 40, 50, 60].map(y => `<ellipse cx="44" cy="${y}" rx="6" ry="9" fill="#e0b443"/><ellipse cx="56" cy="${y}" rx="6" ry="9" fill="#e0b443"/>`).join('') + '<rect x="40" y="70" width="20" height="6" fill="#8a5a1a"/>',
  flour: '<path d="M26 34 Q50 20 74 34 L80 86 Q50 96 20 86Z" fill="#efe6d0" stroke="#a89a78" stroke-width="3"/><path d="M36 30 Q50 40 64 30" fill="none" stroke="#a89a78" stroke-width="3"/>',
  bread: '<ellipse cx="50" cy="60" rx="38" ry="22" fill="#c8843a"/><ellipse cx="50" cy="54" rx="34" ry="16" fill="#e0a456"/>' + [32, 46, 60].map(x => `<path d="M${x} 46 l10 10" stroke="#a0602a" stroke-width="4"/>`).join(''),
  hops: [[40, 40], [60, 44], [50, 62]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="16" fill="#8cc04a" stroke="#4f7a2a" stroke-width="2"/>`).join('') + '<path d="M50 20 Q60 26 58 34" stroke="#4f7a2a" stroke-width="3" fill="none"/>',
  ale: '<rect x="24" y="32" width="44" height="54" rx="6" fill="#c9971f" stroke="#6b4a1a" stroke-width="3"/><path d="M68 44 Q86 46 84 62 Q82 74 68 74" fill="none" stroke="#6b4a1a" stroke-width="5"/><ellipse cx="46" cy="32" rx="24" ry="9" fill="#fff6e0"/>',
  grapes: [[40, 40], [56, 40], [32, 54], [48, 54], [64, 54], [40, 68], [56, 68], [48, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#6a3a8a"/>`).join('') + '<path d="M48 30 L52 16" stroke="#4f7a2a" stroke-width="4"/>',
  apples: '<circle cx="38" cy="58" r="20" fill="#c0392b"/><circle cx="64" cy="62" r="18" fill="#d9483a"/><path d="M38 38 L40 28" stroke="#4f3a1a" stroke-width="3"/><ellipse cx="46" cy="28" rx="8" ry="4" fill="#4f8a3a"/>',
  leather: '<path d="M22 30 Q50 18 78 30 L84 62 Q74 70 80 84 Q50 92 20 84 Q26 70 16 62Z" fill="#9a6a3a" stroke="#5a3a1a" stroke-width="3"/>',
  bow: '<path d="M30 12 Q86 50 30 88" fill="none" stroke="#6b4422" stroke-width="7"/><path d="M30 12 L30 88" stroke="#e8e0cc" stroke-width="2"/>',
  mace: '<rect x="46" y="38" width="8" height="54" fill="#6b4422"/><circle cx="50" cy="28" r="16" fill="#8a8f94"/>' + [0, 1, 2, 3, 4, 5].map(i => `<polygon points="${50 + Math.cos(i) * 14},${28 + Math.sin(i) * 14} ${50 + Math.cos(i) * 24},${28 + Math.sin(i) * 24} ${50 + Math.cos(i + 0.4) * 14},${28 + Math.sin(i + 0.4) * 14}" fill="#5d6268"/>`).join(''),
  armor: '<path d="M30 20 L70 20 L80 36 L72 40 L72 86 L28 86 L28 40 L20 36Z" fill="#c9ced3" stroke="#6d7378" stroke-width="3"/><path d="M50 22 L50 84" stroke="#9aa2a8" stroke-width="3"/>'
};
(async () => {
  const b = await chromium.launch(env.LAUNCH), p = await b.newPage({ viewport: { width: 1200, height: 900 } }); await env.use3d(p, { drawMs: 999999 });
  await p.goto(env.GAME_REAL + '?start=0'); await p.waitForTimeout(800);
  await p.click('.fac[data-fac="cyyoung"]'); await p.click('.fac[data-fac="cyyoung"] .fgo'); await p.waitForTimeout(4000);
  const data = await p.evaluate(({ PEOPLE, SIEGE, BUILDINGS, ITEMS, WEAPONS }) => {
    const pic = key => { try { const c = R3D.iconOf(key);   /* (the game's own picture size) */ return c ? c.toDataURL('image/png') : ''; } catch (e) { return ''; } };
    const uiPic = id => { const d = document.createElement('div'); d.className = 'ib'; const c = document.createElement('canvas'); c.dataset.icon = id; d.appendChild(c); document.body.appendChild(d); UI.paintIcons(d); const u = c.toDataURL('image/png'); d.remove(); const blank = !c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0); return blank ? '' : u; };
    const cost = o => ['wood', 'stone', 'gold'].filter(k => o[k]).map(k => o[k] + ' ' + k).join(', ') || 'free';
    const stageName = n => `Stage ${n}, the ${STAGES[n - 1].name}`;
    const unitStage = t => { const [type, kit] = t.split('.'); if (kit && SOLDIERS.kits[kit]) return SOLDIERS.kits[kit].stage; if (t === 'knight') return 4; return stageOfItem(type, true); };
    const people = PEOPLE.map(([k, n, d]) => ({ n, d, pic: pic('u:' + k), stage: stageName(unitStage(k)) }));
    const siege = SIEGE.map(([k, n, d]) => ({ n, d, pic: pic('u:' + k), stage: k === 'oxcart' ? stageName(2) + ' (with a quarry)' : stageName(stageOfItem(k, true)) }));
    const blds = Object.entries(BUILDINGS).map(([k, [n, d]]) => ({ n, d, pic: pic('b:' + k), stage: k === 'keep' ? 'From the start' : stageName(stageOfItem(k, false)), cost: k === 'keep' ? '' : cost(BUILD[k]) }));
    const items = ITEMS.map(([k, n, d]) => ({ k, n, d, pic: uiPic('r:' + k) }));
    const weapons = WEAPONS.map(([k, n, d]) => ({ k, n, d, pic: uiPic('w:' + k) }));
    return { people, siege, blds, items, weapons, factions: FACTION_ORDER.map(k => ({ n: FACTIONS[k].name, e: FACTIONS[k].epithet, plays: FACTIONS[k].plays })) };
  }, { PEOPLE, SIEGE, BUILDINGS, ITEMS, WEAPONS });
  // the keep has no stand-alone model: photograph it in the game, from the same angle
  await p.evaluate(() => { const k = SD.keep(); cam.z = 2.4; SD.centerOn(k.x, k.y - 30); document.getElementById('banner').style.display = 'none'; for (const id of ['tips', 'alertBar', 'btnTrophy', 'side', 'cmdbar', 'mini', 'camCtl']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } window.__drawMs = 0; });
  await p.waitForTimeout(1500);
  const kp = await p.evaluate(() => { const k = SD.keep(), s = SD.scr(k.x, (k.y0 + k.y1) / 2, 60), r = document.getElementById('game').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top }; });
  const shot = await p.screenshot({ clip: { x: Math.max(0, kp.x - 170), y: Math.max(0, kp.y - 200), width: 340, height: 340 } });
  const keepB = data.blds.find(o => o.n === 'Keep'); if (keepB) keepB.pic = 'data:image/png;base64,' + shot.toString('base64');
  const svgPic = k => SVG[k] ? `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + SVG[k] + '</svg>')}` : '';
  for (const it of data.items.concat(data.weapons)) if (!it.pic || SVG[it.k] && ['iron', 'wheat', 'flour', 'bread', 'hops', 'ale', 'grapes', 'apples', 'leather', 'bow', 'mace', 'armor'].includes(it.k)) it.pic = svgPic(it.k) || it.pic;
  const card = (o, extra = '') => `<div class="card"><div class="pic">${o.pic ? `<img src="${o.pic}">` : ''}</div><div class="txt"><h3>${o.n}</h3>${o.stage ? `<div class="st">${o.stage}${o.cost ? ' · ' + o.cost : ''}</div>` : ''}<p>${o.d}</p>${extra}</div></div>`;
  const sec = (title, list) => `<section><h2>${title}</h2><div class="grid">${list.map(o => card(o)).join('')}</div></section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:Letter;margin:14mm} body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:0}
    h1{font-size:34px;margin:0 0 4px} .sub{font-size:18px;margin:0 0 18px;color:#333}
    h2{font-size:26px;border-bottom:3px solid #8a6a2a;padding-bottom:4px;margin:18px 0 10px;break-after:avoid}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .card{display:flex;gap:12px;border:2px solid #c9b48a;border-radius:10px;padding:8px;break-inside:avoid;background:#fbf7ee}
    .pic{flex:0 0 120px;height:120px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#e9e2d0,#cfc4a8);border-radius:8px}
    .pic img{max-width:116px;max-height:116px}
    h3{font-size:20px;margin:2px 0 2px} .st{font-size:14px;color:#5a4a1a;font-weight:bold;margin-bottom:3px} p{font-size:15px;line-height:1.35;margin:0}
    .fac{border:2px solid #c9b48a;border-radius:10px;padding:8px 12px;margin:0 0 8px;background:#fbf7ee;font-size:16px}
    </style></head><body>
    <h1>Stronghold Destroyer</h1><p class="sub">Picture catalogue: every person, soldier, siege engine, building and item, as the game draws them today (the soldiers in your crimson and gold). Made from the game itself on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
    <section><h2>The four factions</h2>${data.factions.map(f => `<div class="fac"><b>${f.n}</b> (${f.e}): ${f.plays}</div>`).join('')}</section>
    ${sec('People and soldiers', data.people)}${sec('Siege engines and carts', data.siege)}${sec('Buildings', data.blds)}${sec('Goods', data.items)}${sec('Weapons', data.weapons)}
    </body></html>`;
  const q = await b.newPage(); await q.setContent(html); await q.waitForTimeout(800);
  await q.pdf({ path: OUT, format: 'Letter', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
  const missing = [...data.people, ...data.siege, ...data.blds, ...data.items, ...data.weapons].filter(o => !o.pic).map(o => o.n);
  console.log('wrote', OUT, 'pictures:', data.people.length + data.siege.length + data.blds.length + data.items.length + data.weapons.length, 'missing pictures:', JSON.stringify(missing));
  await b.close();
})();
