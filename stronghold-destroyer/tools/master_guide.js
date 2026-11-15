// Master Guide version 3, step 2 of 2: writes design/Stronghold-Destroyer-Master-Guide-v3.pdf.
// Built on Gerald's Master Guide version 2 (its 17 sections, its wording and its look: dark pages, a gold double frame,
// gold-headed tables, picture cards), with everything added since put where it belongs and marked NEW, the things
// version 2 said that the game now does differently corrected, and photographs of the real game on every page that
// needs one. The pictures and the live numbers come from step 1 (node tools/guide3_shots.js, into tests/.work/guide3);
// the design-sheet art and the troop formation pictures are in design/guide3-art.
// usage, from the stronghold-destroyer folder:   node tools/guide3_shots.js && node tools/master_guide.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), CACHE = path.join(ROOT, 'tests/.work/guide3'), ART = path.join(ROOT, 'design/guide3-art');
const OUT = path.join(ROOT, 'design/Stronghold-Destroyer-Master-Guide-v3.pdf');
const J = JSON.parse(fs.readFileSync(path.join(CACHE, 'data.json'), 'utf8')), D = J.data, SH = J.shots;
// the number of short Help articles, read from the Help file itself (so it is never out of date)
D.helpCount = Function(fs.readFileSync(path.join(ROOT, 'js/helpdata.js'), 'utf8') + ';return HELP_DATA')().articles.length;
const warn = []; const DATE = 'November 15, 2026';
const uri = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const shot = name => { const f = SH[name]; if (!f || !fs.existsSync(path.join(CACHE, f))) { warn.push('no picture: ' + name); return ''; } return uri(path.join(CACHE, f), f.endsWith('.png') ? 'image/png' : 'image/jpeg'); };
const art = name => { const f = path.join(ART, name + '.jpg'); if (!fs.existsSync(f)) { warn.push('no art: ' + name); return ''; } return uri(f, 'image/jpeg'); };
const diamondPng = uri(path.join(ROOT, 'design/Troop-Diamond.png'), 'image/png');
// the goods the game shows only as words get simple pictures (the same ones as the picture catalogue)
const SVG = (() => { const src = fs.readFileSync(path.join(__dirname, 'catalog.js'), 'utf8'), m = src.match(/const SVG = (\{[\s\S]*?\n\});/); return m ? Function('return ' + m[1])() : {}; })();
const svgPic = k => SVG[k] ? `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + SVG[k] + '</svg>')}` : '';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------------------------------------------------------------- the building blocks of a page
const NEW = '<span class="new">NEW</span>', FIXED = '<span class="new fx">CORRECTED</span>';
const blocks = []; const add = (...b) => blocks.push(...b.flat());
let secNo = 0;
const SEC = (title, sub, icon) => { secNo++; const sign = icon && icon.startsWith('sign:'); add(`<div class="sech" id="s${secNo}" data-sec="${secNo}. ${esc(title)}" data-toc="${secNo}. ${esc(title)}"><div class="sico${sign ? ' gem' : ''}">${sign ? icon.slice(5) : icon ? `<img src="${icon}">` : ''}</div><h1>${secNo}. ${title}</h1></div>${sub ? `<p class="sub">${sub}</p>` : ''}`); };
const SECX = (id, title, sub) => add(`<div class="sech pb" id="${id}" data-sec="${esc(title)}" data-toc="${esc(title)}"><div class="sico gem">◆</div><h1>${title}</h1></div>${sub ? `<p class="sub">${sub}</p>` : ''}`);
let subNo = 0;
const H = (t, tocNew) => { const id = 'h' + (++subNo); add(`<h3 id="${id}"${tocNew ? ` data-toc="${esc(t.replace(/<[^>]+>/g, ''))}" data-sub="1"` : ''}>${t}${tocNew ? ' ' + NEW : ''}</h3>`); };
const P = h => add(`<p>${h}</p>`);
const UL = items => add(`<ul class="dl">${items.map(i => `<li>${i}</li>`).join('')}</ul>`);
const NOTE = h => add(`<div class="note">${h}</div>`);
const TBL = (heads, rows, cls = '') => add(`<table class="tbl ${cls}"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
const FIG = (src, cap, w = 100, extra = '') => { if (!src) return; add(`<figure style="width:${w}%">${extra ? `<div class="mkwrap"><img src="${src}">${extra}</div>` : `<img src="${src}">`}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`); };
const FIG2 = (a, b) => { if (!a[0] && !b[0]) return; add(`<div class="two">${[a, b].map(([s, c]) => s ? `<figure><img src="${s}"><figcaption>${c}</figcaption></figure>` : '<div></div>').join('')}</div>`); };
// a picture card for a person, soldier or engine, as in version 2
const CARD = (pic, name, line, bullets) => add(`<div class="card" data-key="${KEY_OF.get(pic) || ''}"><div class="cpic">${pic ? `<img src="${pic}">` : ''}</div><div class="ctxt"><h4>${name}</h4><div class="cl">${line}</div><ul class="dl">${bullets.map(b => `<li>${b}</li>`).join('')}</ul></div></div>`);
// small cards, two to a row (each row is one block, so a page can break between rows)
const MINI = list => { for (let i = 0; i < list.length; i += 2) add(`<div class="minis">${list.slice(i, i + 2).map(o => `<div class="mini" data-key="${KEY_OF.get(o.pic) || ''}"><div class="mpic">${o.pic ? `<img src="${o.pic}">` : ''}</div><div><h5>${o.n}</h5>${o.line ? `<div class="cl">${o.line}</div>` : ''}<p>${o.d}</p></div></div>`).join('')}</div>`); };
const PB = () => add('<div class="pbk pb"></div>');

// ---------------------------------------------------------------- the numbers, from the game
const U = k => D.units[k] || '', B = k => D.blds[k] || '';
// each game picture's name (u:spear, b:house, r:wood, w:sword), for the Help copy of the guide
const KEY_OF = new Map(); for (const [set, pre] of [[D.units, 'u:'], [D.blds, 'b:'], [D.goods, 'r:'], [D.weapons, 'w:']]) for (const [k, v] of Object.entries(set)) if (v && !KEY_OF.has(v)) KEY_OF.set(v, pre + k);
const C = k => D.costs[k] || { name: k, cost: '', stage: 1 };
const stageWord = n => `Stage ${n}`;
const bline = k => `${stageWord(C(k).stage)} · ${C(k).cost}`;
const peace = D.peace.raid, mins = s => (s / 60).toString();
const FG = D.farming || { field: { max: 5, staff: 10 }, farm: { max: 2, staff: 5, levels: [{}, { after: 360 }, { after: 900 }] }, guard: { gold: 25, field: 2, farm: 1 }, well: { wood: 30 }, lookout: { wood: 40 } };   // (4H)
const CC = D.CITIZEN_CALL, mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const BUILD_TEXT = {
  keep: 'Your castle’s heart. It grows through the five stages and shoots at enemies who come near.',
  house: 'Room for your people; each house raises a new citizen every few minutes.', farm: 'Grows crops for food and keeps animals (cows, pigs, oxen, hens, turkeys, sheep).',
  wheatfarm: 'Grows wheat for the mill (flour, then bread) and for ale.', hopfarm: 'Grows hops for the brewery’s ale.', vineyard: 'Grows grapes: food, and needed for a feast.',
  orchard: 'Grows apples: food, and needed for a feast.', woodhut: 'Woodcutters fell trees near it; it grows into the wood and iron yard.',
  stockpile: 'A store for wood, stone, iron and goods, closer to where they are gathered.', granary: 'Stores food (300, 800 once expanded). Beyond that, bugs spoil the extra.',
  quarry: 'Beside grey rocks: cuts stone; its ox cart hauls it home.', ironmine: 'On the red iron ground: digs iron for weapons and crossbows.',
  mill: 'Grinds wheat into flour for the bakeries.', bakery: 'Bakes bread from flour (Cy Young bakes four and a half times as much).', brewery: 'Brews ale from hops.',
  alehouse: 'Serves ale to cheer your people; set its price Cheap, Fair or Dear.', tavern: 'Serves ale to more people than an alehouse; people rest here on breaks.',
  chapel: 'Lifts spirits and heals the sick nearby.', church: 'A bigger house of prayer: cheers and heals more people.', abbey: 'The greatest house of prayer and healing (stronger for Hekaranok).',
  apothecary: 'Heals the sick nearby and cheers a few people.', garden: 'Cheers people (they work a little slower).', stocks: 'Frighten people into working harder (they are less happy).',
  market: 'Buy and sell goods and weapons for gold (Ticanologue pays half).', school: 'Lessons: less waste, cheaper and quicker building, better trade, trained soldiers, engineers.',
  engineerhut: 'Houses four engineers who build and crew siege engines.', stable: 'Raises horses that turn knights into mounted knights.', bowyer: 'Makes bows from wood.',
  poleturner: 'Makes spears from wood.', smithy: 'Makes swords, maces or knight armour from iron.', armory: 'Stores weapons; soldiers are armed from it.',
  waterpot: 'Water for putting out fires; it grows as time passes.', wall: 'Draw it from point to point; it grows from wood to stone with the castle.',
  gate: 'Lets your people through a wall and keeps enemies out.', highwall: 'Stone wall as tall as the keep; archers climb it by stairs.', stairs: 'Placed beside a high wall so archers can climb it.',
  gtower: 'Wooden tower: archers shoot from it, a knight guards its door.', stower: 'Far tougher than the wooden tower; shoots farther, holds more archers.',
  lookout: 'Tall and slim: archers on top see and shoot very far.', roundtower: 'Giant tower that carries a ballista or a trebuchet.', greattower: 'The strongest tower; can carry a siege engine.',
  moat: 'Water that stops people and engines; citizens, spearmen, swordsmen and flamethrowers can fill it.', pit: 'Hidden spikes: one strike kills an enemy (knights, berserkers and mounted knights take two).'
};
const BNAME = { woodhut: 'Woodcutter’s Hut', chapel: 'House of Prayer', bowyer: 'Fletcher (Bowyer)', poleturner: 'Spear-maker', smithy: 'Blacksmith', engineerhut: 'Engineer’s Hut', wheatfarm: 'Field', gtower: 'Tower', stower: 'Stone Tower', pit: 'Spike Pit', highwall: 'High Wall', roundtower: 'Round Tower', greattower: 'Great Tower', lookout: 'Lookout Tower', waterpot: 'Water Pot', hopfarm: 'Hop Farm', ironmine: 'Iron Mine' };
const bcards = keys => keys.map(k => ({ n: BNAME[k] || C(k).name, line: bline(k), d: BUILD_TEXT[k] || '', pic: B(k) }));
const EM = Object.fromEntries((J.emblems || []).map(e => [e.k, e]));

// ================================================================ the guide
// ---------- How to read this guide, and what is new ----------
SECX('read', 'How to read this guide');
UL(['<b>Set</b> means you decided it. It is the rule of the game.',
  '<b>Build</b> means it is how Claude Code set a number or choice in the current game. You can change it. These numbers are meant to be tuned.',
  `${NEW} marks everything that has come into the game since version 2. ${FIXED} marks a place where version 2 said one thing and the game now does another.`,
  `<b>Pictures:</b> every screen, box and button in this guide is a photograph of the real game, taken by Claude Code from the game itself on ${DATE}. Every person, soldier, siege engine, building, wall, tower, good and weapon is shown as the game draws it today. The soldiers, scenes, bricks and ground from your design sheet are shown as the design pictures.`,
  '<b>Stuck?</b> Go straight to section 2. It lists the common problems, what to do, and a few Art of War ideas for winning.',
  '<b>Big text:</b> this edition uses larger letters than version 2, so it has more pages. Nothing was left out to make it shorter.']);
P(`This is the one guide to keep: it now holds the Troop Controls Guide from Phase 4E as well (the troop diamond, the formations and the phone, in section 5). ${NEW}`);
P(`All of this guide is in the game’s Help too: tap the ? and choose <b>The Master Guide</b> from the Topics list, or type what you need in the search box, and the search looks through the whole guide as well as the Help answers. When a rule changes, this guide and the Help change together. ${NEW}`);
H('What is new in version 3');
TBL(['What', 'In short', 'Section'], [
  [`Longer peace ${NEW}`, `${mins(peace.easy)} minutes of peace before the first raid on Easy and Medium, ${mins(peace.hard)} on Hard. Bandits wait too.`, '1, 2'],
  [`Calling citizens ${NEW}`, 'The Citizen button in the Town list calls one more citizen, for food and gold. Unhappy people: slower and dearer. Wars won and generals: sooner and cheaper.', '11'],
  [`The Field ${NEW}`, `${FG.field.max} fields, ${FG.field.staff} people each. Tap a field to choose how many grow wheat (fastest), corn (next) and grapes (slowest). All three can grow at once, in strips.`, '8, 10'],
  [`The Farm ${NEW}`, `${FG.farm.max} farms, ${FG.farm.staff} people each. Tick the animals it raises (chickens, cows, pigs, ducks; turkeys and sheep for the feast) and watch them walk about the pen. It gets better with time, and with a stable.`, '8'],
  [`Guards, wells and lookouts ${NEW}`, `Reserve a guard with a knight’s strength for a field (up to ${FG.guard.field}) or a farm (${FG.guard.farm}), ${FG.guard.gold} gold each. A well grows things 25% faster; a lookout tower sees around and rings the bell for raiders.`, '8'],
  [`Happy people grow more ${NEW}`, 'Very happy people grow food 25% faster in the fields and farms; upset people 20% slower.', '8, 10'],
  [`Animals sell at the top price ${NEW}`, 'At the market, farm animals always sell for the top price, whatever the mood or the school, far more than crops.', '10'],
  [`Smoother walking ${NEW}`, 'People no longer shake or turn back and forth near trees, bushes or each other. They go round anyone in the way, and each picker has his own place at a bush.', '6'],
  [`No “What is this?” ${NEW}`, 'The boxes no longer carry the “What is this?” button. Help (the ?) still answers everything.', '15'],
  [`Wars won and generals ${NEW}`, `Beating off a raid or defeating a rival is a war won. A soldier with ${CC.general.stars} or more stars is a general; at ${CC.general.fiveStar || 10} he is a five-star general.`, '6, 11, 14'],
  [`Stronger raids ${NEW}`, 'A Medium raid is much stronger than an Easy one, and a Hard raid the strongest: more raiders, each hitting harder and taking more blows.', '1, 14'],
  [`Berserkers for everyone ${NEW}`, 'Every faction can train berserkers now. Psychana’s are still the ones who move unseen in small bands.', '3, 6'],
  [`Add fills a formation ${NEW}`, 'Choose a group and tap Add on the diamond: every soldier you train while Add is on marches to the group and takes his place in its formation.', '5'],
  [`The troop diamond ${NEW}`, 'All troop orders sit in one diamond at the bottom left: move, formation, patrol, guard, add, stop and the choosing buttons.', '5'],
  [`Formations ${NEW}`, 'Seven shapes (Free, Line, Column, Wedge, Square, Circle, Loose). Soldiers march together at the pace of the slowest.', '5, 7'],
  [`Tap to close ${NEW}`, 'One tap puts away a hint, a message or the Art of War advice. A double tap on any box closes it.', '5, 15'],
  [`Phones show pictures ${NEW}`, 'On a phone the top bar and the tabs show pictures and numbers; the names show when you tap.', '5'],
  [`The Help screen ${NEW}`, `Search in plain words, ${D.helpCount || 93} short articles with pictures, the whole of this guide, and a Topics drop-down when you tap the ?.`, '15'],
  [`One guide ${NEW}`, 'The Troop Controls Guide from Phase 4E is part of this guide now (section 5).', '5'],
  [`The trophy, with the numbers ${NEW}`, 'Ticks for what is done, crosses for what is not, and every stage’s numbers printed in this guide for each difficulty.', '4'],
  [`Saved games to a file ${NEW}`, 'Named saves, an automatic save, and a save you can keep as a file and load again on another device.', '15'],
  [`The flat view ${NEW}`, 'The V key (or Settings) switches between the 3D view and a flat map view.', '13'],
  [`Soldiers come back ${NEW}`, 'A soldier who runs after an enemy by himself turns back after a set distance instead of following him home.', '7'],
  [`Mourning ${NEW}`, 'When your people die, the town mourns for two minutes, and the mood box says so.', '10'],
  [`Rivals’ own growth ${NEW}`, 'The rivals grow by their own table, printed in this guide.', '14'],
  [`Pictures of every screen ${NEW}`, 'Version 2 had none of the game screens and boxes. Version 3 shows them all.', 'all']]);
H('Where version 2 and the game now differ');
P('These places in version 2 no longer match the game. Version 3 says what the game does now, and each place is marked CORRECTED.');
TBL(['Version 2 said', 'The game now', 'Section'], [
  ['About five minutes of peace (six on Easy).', `${mins(peace.easy)} minutes on Easy and Medium, ${mins(peace.hard)} on Hard (your Phase 4F decision).`, '1, 2'],
  ['Open Settings and press Fix for a glitching person or building.', 'The Fix button over people was taken out (your Phase 4C decision). A stuck building still has <b>Remove &amp; rebuild</b> in its own box. For a stuck person, tell Claude Code.', '2, 15'],
  ['Double-click selects everyone of that kind on the screen.', 'Double-click opens the person’s box (your Phase 4C decision). Use the Soldiers, Citizens and Everyone buttons on the diamond to choose many.', '5'],
  ['Ladder men climb walls beside the ram.', 'There are no ladder men in the game.', '4, 6'],
  ['At stage 5 every tower comes armed with a ballista or trebuchet.', 'You buy each tower’s engine (ballista or trebuchet). The rivals buy theirs by themselves.', '4, 7'],
  ['Armoured swordsmen need two spike strikes.', 'Your decision after Phase 4C: everyone dies at one strike except knights, berserkers and mounted knights, who take two.', '6, 7'],
  ['Globes: North America, Asia, South America, Australia.', 'Russia top left, the United States top right, Australia bottom left, South America bottom right.', '13'],
  ['The trophy shows the word MET.', 'It shows a tick for done and a cross for not yet.', '4'],
  ['Stage numbers are not printed because they are being tuned.', 'They are printed here, for Easy, Medium and Hard. The trophy still shows the live numbers.', '4'],
  ['The People tab is a button at the bottom left.', 'It is the face on the corner of the troop diamond, still at the bottom left.', '5, 11'],
  ['A second citizen cannot be bought.', 'Citizens can now be called with the Citizen button (Phase 4F).', '11']], 'diff');

// ---------- 1 ----------
SEC('The Goal and How a Game Starts', 'Build a castle. Survive the raids. Destroy every rival who comes against you.', B('keep') || U('king'));
H('What the game is');
P('Stronghold Destroyer is a castle-building strategy game that runs in a web browser, on an iPad, a phone or a computer. You pick a faction, build a town, grow a castle, train an army, and fight rivals who are doing the same thing.');
H('How you win and how you lose');
TBL(['', 'The rule'], [
  ['<b>You win</b>', 'Every rival who is against you has lost his keep. A trading friend does not have to fall. (Build)'],
  ['<b>You lose</b>', 'Your keep is destroyed, or all your people are gone and there is no food left to make more.'],
  [`<b>Peace time</b> ${FIXED}`, `<b>${mins(peace.easy)} minutes of peace on Easy and Medium, ${mins(peace.hard)} on Hard</b>, before the first raid. The bandits wait as long. The banner at the start says how long. Use it to gather wood, stone, iron and food, build homes, workshops, farms, walls and towers, and train soldiers. (Set)`],
  ['<b>Raids</b>', 'Rivals send raids from different directions, each one larger, later with battering rams, catapults and ballistas. Rams and siege engines only come with a large army, never with a few riders. Each enemy rival’s first raid comes about a minute and a quarter after the one before. A Medium raid is much stronger than an Easy one, and a Hard raid the strongest (section 14). ${NEW}']]);
H('Setting up a match');
P('Before a game begins you choose these things. You are never forced into four rivals.');
FIG(shot('front'), 'The front page, photographed on an iPad: the four factions side by side, with the match setup.', 92);
TBL(['Choice', 'Options'], [
  ['Your faction', 'Cy Young, Ticanologue, Hekaranok or Psychana. See section 3.'],
  ['Number of rivals', '1, 2, 3 or 4. The maximum is 4. The game does not start with four by default.'],
  ['Which factions fight you', 'You pick them, or leave it random.'],
  ['Trading friend', 'If there are two or more rivals, one of them can be a trading friend.'],
  ['Difficulty', `Easy, Medium or Hard. It tunes how fast the rivals grow, how much your castle stages ask (section 4), and the peace time: ${mins(peace.easy)}, ${mins(peace.medium)} or ${mins(peace.hard)} minutes.`],
  ['Your start spot', 'Random by default. You can also choose one.'],
  [`Load a saved game ${NEW}`, 'A button on the front page opens your saved games (section 15).']]);
FIG(shot('setup'), 'The match setup: rivals, which factions, the trading friend, difficulty and start spot.', 90);
H('How every game begins');
MINI([{ n: 'Your king', d: 'A knight who has just been made king.', pic: U('king') }, { n: 'Your citizens', d: 'A few civilians to start the work.', pic: U('civ') },
  { n: 'A house', d: 'A shack in the woods.', pic: B('house') }, { n: 'A woodcutter’s hut', d: 'Wood comes first.', pic: B('woodhut') }]);
UL(['You start with a knight who has just been made king, a few civilians, a shack in the woods and a small wooden palisade. You have wood and food only, and no soldiers other than the king. (Set)',
  'Your start position is different each game, and so is each rival’s. No one starts in the same place every time and no one starts trapped in trees. (Set)',
  'The map is large but not endless, with room for every faction to grow. You cannot see where the rivals’ camps are. See fog of war in section 13.',
  'The castle then grows by itself through five stages. See section 4.']);

// ---------- 2 ----------
SEC('Stuck? Start Here', 'The common problems, what to do about each, and a few Art of War ideas for winning.', 'sign:?');
P('If you are lost, read this section first. Find your problem in the left column and do what the right column says. Tap and hold on any person to hear what he needs. That one habit solves most problems. The Help screen (the ? at the top) answers questions typed in plain words.');
H('Your first ten minutes');
P(`This is a suggested order, not a rule. You have <b>${mins(peace.easy)} minutes of peace on Easy and Medium, ${mins(peace.hard)} on Hard</b>, before the first raid. ${FIXED}`);
MINI([{ n: '1. Houses', d: 'Your workers come from them.', pic: B('house') }, { n: '2. Woodcutters', d: 'Wood feeds everything you build.', pic: B('woodhut') },
  { n: '3. Field', d: 'Wheat for bread and ale; corn to eat.', pic: B('wheatfarm') }, { n: '4. Farm', d: 'Animals: eggs, milk and meat.', pic: B('farm') },
  { n: '5. Alehouse', d: 'Cheer your people.', pic: B('alehouse') }, { n: '6. Spear-maker', d: 'Spears for your first soldiers.', pic: B('poleturner') },
  { n: '7. Wall and gate', d: 'Close the way in.', pic: B('wall') }, { n: '8. Tower', d: 'On the side the king warns you about.', pic: B('gtower') }]);
UL(['<b>Houses first.</b> Each house raises a new citizen every few minutes, and your workers come from them.',
  `<b>Need people faster?</b> Call a citizen with the Citizen button in the Town list. It costs food and gold, and he walks in when his wait is over (section 11). ${NEW}`,
  '<b>Wood, then food.</b> Woodcutters feed everything you build. Add a field (put people on corn and wheat) and a farm so you never run out of food.',
  '<b>Cheer your people</b> with an alehouse, and arm a few spearmen from the spear-maker.',
  '<b>Wall and gate, then a tower</b> toward the side the king warns you about. Put a <b>spike pit</b> where raiders will walk, and a <b>water pot</b> near your buildings.',
  '<b>Tap the trophy</b> under the settings button to see what the next stage needs.']);
H('Problems and what to do');
TBL(['The problem', 'What to do'], [
  ['People are standing around doing nothing', 'Idle citizens go to the campfire. Make sure each workplace is built and staffed (one citizen runs a building). Open the <b>People tab</b> (the face on the troop diamond) to see what everyone is doing, then press and hold one person to hear what he needs.'],
  ['I am running out of food', 'Tap your field and put more people on corn (it feeds people straight away), and build a farm. Keep your people happy: happy people grow food faster. At stage 2 build a mill; at stage 3 it comes with five bakeries. If the granary is full, expand it at stage 3 or sell the extra, because too much food brings bugs and disease.'],
  ['My people are unhappy or leaving', 'Press and hold one person: the box says <b>why</b>. Tap Mood at the top for every reason. Usual fixes: ale at a fair price, a house of prayer, a garden, lower taxes, more kinds of food, less crowding, and care for the sick (apothecary or house of prayer).'],
  [`Happiness fell and I do not know why ${NEW}`, 'If your people or soldiers were killed, the town mourns for two minutes. The mood box lists it. It passes by itself.'],
  [`I need more people now ${NEW}`, 'Tap the Citizen button in the Town list (key 1). Its label (touch it, or rest the mouse on it) shows what one costs and how long he takes. Happier people come sooner and cheaper. You need room in your houses.'],
  ['The castle will not grow to the next stage', 'Tap the trophy under the settings button. It lists each requirement with what you have and what you need, and says what to do next. The numbers for each difficulty are in section 4.'],
  ['Raiders keep breaking in', 'The king calls out the direction they come from. Put a wall, a gate, a tower, spikes and archers on that side. Add a moat at stage 2, a patrol or Guard order, and archers on a high wall reached by stairs.'],
  ['I cannot find the enemy', 'Fog of war hides rival camps. Longbowmen see twice as far as other soldiers. Explored ground stays revealed. Search or wait for an enemy to show itself.'],
  [`My soldiers ran off after an enemy ${NEW}`, 'A soldier who goes after an enemy by himself turns back once he is about a dozen squares from where he started. Soldiers you send stay on your order.'],
  ['A building is on fire', 'The alarm rings and citizens fetch water. Put a water pot near your buildings. Left for ten seconds, half of a building burns.'],
  ['I am out of stone or iron', 'Stone: a quarry beside grey rocks (stage 2, with its ox cart). Iron: an iron mine on the red iron ground (stage 3). Both need wood to build. Growing the castle uses up the stone and iron it asks for.'],
  ['A moat is blocking my own people', 'Citizens, spearmen, swordsmen and flamethrowers can fill a moat. A filled section becomes ground for good, and enemies can cross it too.'],
  ['Citizens were killed', `They must be replaced. Houses raise new ones every few minutes, and now you can also call one with the Citizen button. ${NEW}`],
  [`A person or building is glitching or walking in circles ${FIXED}`, 'A building: open its box and tap <b>Remove &amp; rebuild (fix a glitch)</b>; it is rebuilt fresh where it stands, at no cost. A person: the floating Fix button was taken out, so tell Claude Code what happened, and where, so it can be fixed for good.'],
  ['Rams are smashing my wall', 'Rams hurt walls, gates and buildings but cannot hurt soldiers. Stand soldiers at the wall, fight the army that comes with them, and keep archers on the walls. Broken walls repair themselves.'],
  [`A panel or a hint is in the way ${NEW}`, 'One tap puts away a hint, a message or the Art of War advice. A double tap (or double click) on any box, away from its buttons, closes it. Every box also has a big X, and Esc closes it.'],
  ['I want to keep my game', 'Settings, then Save. Give it a name. Load or delete saves from the same place, or keep a save as a file (section 15).']]);
H('A few Art of War ideas');
P('The game’s advisor gives tips in the spirit of Sun Tzu’s <i>The Art of War</i>. These are a few of the ideas, in game terms. The in-game hints use their own wording.');
TBL(['The idea', 'In the game'], [
  ['Know yourself and know the enemy', 'Check the trophy and the People tab before you decide, and find out which faction you face. Each one has a weakness (section 3).'],
  ['Be ready, do not hope', 'Do not count on the enemy not coming. Spend peace time on towers, walls and spikes, not just on growing.'],
  ['Hold the high ground', 'Archers on walls and towers shoot farther and are harder to reach. Use a high wall with stairs, and a lookout tower.'],
  ['Set a bait and a trap', 'Leave a gap that leads raiders over hidden spikes or a moat. They break themselves before they reach you.'],
  ['Strike where he is unprepared', 'A rival is small early. Raid his farms and food before he grows and the game can end in about 15 minutes.'],
  ['An army needs supplies', 'Guard your farms, granary and market. Without food and gold your soldiers cannot be made.'],
  ['Win without a siege if you can', 'Taking a strong wall by force costs the most. Slow a rival’s food and trade instead, and bring rams and flames only with a large army.'],
  [`Victory feeds the town ${NEW}`, 'Every war you win brings citizens sooner and cheaper for ten minutes. Keep your veterans alive: generals do the same (section 11).']]);

// ---------- 3 ----------
SEC('The Four Factions', 'You pick one. The computer rivals play the same four by the same rules.', (J.emblems || [])[0] && J.emblems[0].pic);
P('Each faction has one big strength and one real weakness. A weakness can always be used against it. The names are working names and are fine as spelled.');
const FX = { cyyoung: ['Strength: food and money', ['The mill and bakeries make 4 to 5 times the food.', 'They sell the surplus for money, so they out-buy and out-upgrade everyone.', 'Weakness: no special power in a fight.', 'How to beat them: slow them early by raiding their farms and food, before the money snowballs.']],
  ticanologue: ['Strength: trade', ['Market prices are half of everyone else’s.', 'Weakness: the market costs a lot to build.', 'How to beat them: destroy the market. It is the most valuable building they have.']],
  hekaranok: ['Strength: staying alive', ['Wounded units run home, heal, and return to exactly where they were. A bell recalls them.', 'Double the population. Stronger abbeys.', 'Weakness: each person is weaker, and a unit that is killed cannot be healed.', 'How to beat them: kill units outright instead of wounding them.']],
  psychana: ['Strength: seeing and sneaking', ['All units see as far as longbowmen.', 'Their berserkers can sneak up unseen in small bands (every faction has berserkers, but only Psychana’s move unseen).', 'Weakness: towers and palisade towers near a castle still spot them.', 'How to beat them: ring your castle with towers.']] };
for (const k of ['cyyoung', 'ticanologue', 'hekaranok', 'psychana']) { const e = EM[k] || { name: k, epithet: '' }; const st = e.start || {};
  CARD(e.pic, `${e.name} — ${e.epithet}`, FX[k][0], FX[k][1].concat(st.civilians ? [`Starts with: the king, ${st.civilians} civilians, ${st.food} food and ${st.wood} wood.`] : [])); }
H('What the front page shows');
P('The front page shows all four side by side in large, high-contrast text: the name, the emblem and colors, one plain sentence on how it plays, its strengths, its weakness and its starting setup. Tap one to choose it, then choose how many rivals and the difficulty. All the faction names, descriptions and numbers live in one settings block so they can be tuned in one place. (The front page is pictured in section 1.)');

// ---------- 4 ----------
SEC('The Five Castle Stages', 'The castle grows by itself when it is ready. Tap the trophy to see what it needs.', B('stower') || B('keep'));
TBL(['Stage', 'Name', 'Known for'], D.stages.map(s => [`<b>${s.n}</b>`, s.name, ['spear, archer', 'longbow, quarry', 'the big jump', 'mounted, siege', 'trebuchets'][s.n - 1]]), 'narrow');
H('What decides when the castle grows');
P('When the requirements for the next stage are met, the castle grows on its own. The requirements combine people, happiness, food, stone, iron and the right buildings standing. You can still add buildings at any time, but you must gather the stone, iron and food to do it.');
UL(['The requirements were lowered in Phase 4D. An Easy game reaches stage 2 early in the first play session. Each later stage takes longer than the one before, and Medium and Hard take longer than Easy. (Build)',
  `The numbers are now printed below, for each difficulty. ${FIXED} The trophy shows the live numbers.`,
  'Growing the castle <b>uses up</b> the stone and iron it asks for. The food has to be in store, and is kept.']);
H('The trophy button');
P(`A trophy button sits directly below the settings button on the game screen. It is always there, and it never opens on its own. Tap it and a panel shows what you still need for the next stage: for each requirement, what you have, what you need, and <b>a tick when it is done or a cross when it is not</b> ${FIXED}, plus one plain sentence on what to do next. It pauses the game like other panels. At the final stage it tells you that you have reached the top. A double tap on the panel closes it ${NEW}.`);
FIG(shot('trophy'), 'The trophy panel, photographed in a game at stage 2 (the Homestead), on its way to stage 3.', 62);
H('What each stage needs, by difficulty', true);
P('Read across: what your castle needs to grow <i>into</i> that stage. Stone and iron are used up when it grows. The buildings must be standing and finished.');
for (const d of ['easy', 'medium', 'hard']) { const N = D.needs[d]; if (!N) continue;
  const cols = ['People', 'Happiness', 'Food in store', 'Stone (used up)', 'Iron (used up)'];
  const rows = [2, 3, 4, 5].map(n => { const r = N[n] || [], v = w => { const x = r.find(q => q.what === w); return x ? x.need : '—'; }, bl = r.filter(q => !cols.includes(q.what)).map(q => `${q.need} ${q.what.toLowerCase()}`).join(', ');
    return [`<b>${n}. ${D.stages[n - 1].name}</b>`, v('People'), v('Happiness'), v('Food in store'), v('Stone (used up)'), v('Iron (used up)'), bl]; });
  add(`<h4 class="tcap">${d[0].toUpperCase() + d.slice(1)}</h4>`); TBL(['Stage', 'People', 'Happy', 'Food', 'Stone', 'Iron', 'Buildings standing'], rows, 'needs'); }
H('What each stage brings');
TBL(['Stage', 'What comes in'], [
  ['<b>1. Shack</b>', 'Spearmen and archers. Houses, farms and fields. Woodcutter’s huts. The alehouse, fletcher, spear-maker and armory. Wooden walls, gate, towers, spike pits and water pots.'],
  ['<b>2. Homestead</b>', 'Longbowmen (a separate unit, not an upgrade). Stone quarries with ox carts. The tavern, brewery and hop farm. High walls and stairs, lookout towers and moats. The mill, house of prayer, apothecary and stocks.'],
  ['<b>3. Hold</b>', 'The big jump. Swordsmen, macemen, crossbowmen, berserkers and foot knights. Ballistas. The stable, blacksmith and iron mine. The school, market, church, engineer’s hut and stone tower. Bakeries (five to a mill). Vineyard and orchard. Granary expansion. Escorted work groups. The feast.'],
  [`<b>4. Castle</b> ${FIXED}`, 'Mounted knights. Rams, flamethrowers and catapults. The abbey. Round and great towers, which come empty: you buy the ballista or trebuchet for each.'],
  [`<b>5. Stronghold</b> ${FIXED}`, 'Trebuchets, including mobile trebuchets. You buy a ballista or trebuchet for each giant tower (the rivals buy theirs by themselves). A school is required first. Wars are longer and harder, and people are not easily killed.']]);
H('What happens when the castle grows');
UL(['The footprint grows 2 to 3 blocks in every direction and clears the trees and rocks in the way.',
  'Materials upgrade: wood, then brick, then stone, then thicker stone. Buildings, walls and towers grow with the castle.',
  'Your buildings inside the new footprint move inside the new walls automatically. Nothing is lost.',
  'The side buttons and lists change at each stage, so only what is available at that stage can be bought or built.']);
FIG(shot('town3'), 'A castle at stage 3, the Hold, photographed in the game: the stone keep and its ring wall, with the town around it.', 100);

// ---------- 5 ----------
SEC('Controls and Buttons', 'Every key, tap and button, and what it does.', art('formation-wedge'));
H('The game screen');
{ const M = SH.mainParts; let marks = '', legend = [];
  const names = { btnMenu: ['Settings (the gear)', 'Help, the views, sound, voice, saves, Quit. Next to it: ? for Help, and Pause.'], top: ['The top bar', 'Your faction, food, wood, stone, gold, people (and room), happiness, taxes, rivals, soldiers, goods, the season and weather, the wind.'],
    btnTrophy: ['The trophy', 'What the next castle stage needs (section 4).'], tips: ['The Art of War advisor', 'One tip at a time; tap it to put it away.'], side: ['The command panel', 'The five lists: Town, Castle, Army, Rule and Industry (keys 1 to 5). Hide it with Tab.'],
    diamond: ['The troop diamond', 'Every order for your soldiers (see below).'], mini: ['The map', 'Tap or drag it to move the view.'], cMood: ['Happiness', 'Tap for every reason your people are happy or not.'], btnPeople: ['The People tab', 'Everyone at a glance (section 11).'] };
  if (M) { let i = 0; for (const q of M.parts) { if (!names[q.id]) continue; i++; const x = q.id === 'top' ? q.x - q.w * 0.18 : q.id === 'side' ? q.x : q.x, y = q.id === 'side' ? q.y - q.h * 0.25 : q.y;
      marks += `<div class="mk" style="left:${(x / M.vw * 100).toFixed(2)}%;top:${(y / M.vh * 100).toFixed(2)}%">${i}</div>`; legend.push(`<b>${i}. ${names[q.id][0]}</b> — ${names[q.id][1]}`); } }
  FIG(shot('main'), 'The game on an iPad, photographed in a game at stage 2. The numbers are added by this guide.', 100, marks); add(`<ol class="lg">${legend.map(l => `<li>${l}</li>`).join('')}</ol>`); }
H('The camera');
P('The game is a true 3D world seen from one fixed three-quarter angle that looks like an isometric view. There is no camera twist or tilt. You can zoom and scroll. Mouse-edge scrolling is slow, smooth and predictable. The flat view stays, and the V key switches between the two views (section 13).');
H('Mouse and keyboard');
TBL(['Input', 'What it does'], [
  ['Left-click', 'Select a person or building. With soldiers chosen, a click on the ground sends them there.'], ['Drag a box', 'Select several units. Improved for large armies.'],
  [`Double-click ${FIXED}`, 'Opens the person’s box (his work, his happiness, his worries). To choose many at once, use the Soldiers, Citizens or Everyone buttons on the diamond.'],
  ['Right-click', 'Give an order: move, gather, build, attack, climb a wall, deposit goods.'], ['Mouse wheel', 'Zoom.'], ['Arrow keys or screen edge', 'Scroll the map.'],
  ['1 to 5', 'Open the side lists: Town, Castle, Army, Rule, Industry.'], ['H', 'Help.'], ['P', 'Pause.'], ['Space', 'Return to your castle.'], ['R or T', 'Turn a building while placing it.'],
  ['V', 'Switch between the 3D and flat views.'], ['M', 'Sound on or off.'], ['S', 'Stop the selected units.'], ['Z', 'Put a workshop to sleep (Z again wakes it).'], ['Esc', 'Cancel, or close the open box.'], ['Tab', 'Hide the side panel.']]);
H('Touch (iPad and phone)');
UL(['Tap to select. Tap the ground or a target to command.', 'One finger scrolls. Two fingers zoom.',
  'Quick tap on a person shows a small glance. Press and hold for a second or two for the full story (section 11).',
  `<b>One tap</b> on a hint, a message or the Art of War advice puts it away; the next one comes later. <b>A double tap</b> on any box, away from its buttons, closes it: the mood box, the trophy, Settings, Help, the People tab and the building boxes. One tap on a box does not close it, and its buttons still work. ${NEW}`,
  'Every pop-up box also has a big X. The game pauses while you read a panel or menu, unless enemies are close.']);
H('The troop diamond', true);
P('All the troop orders sit in one diamond at the bottom left of the screen, on a computer, an iPad and a phone. Choose soldiers first (tap one, draw a box round several, or tap the crossed swords to choose them all), then use the diamond. Touch any button, or hover over it with the mouse, to see its name. With nobody chosen the order buttons are dimmed, and a dimmed button says why. The green number on the middle button is how many are chosen.');
{ const DP = SH.diamondParts, ord = ['dMoveUp', 'dMoveRight', 'dMoveDown', 'dMoveLeft', 'dMarch', 'btnPatrol', 'btnGuardA', 'camAdd', 'btnStop', 'btnPeople', 'btnSold', 'camHome', 'btnClear', 'btnAll', 'btnCiv'];
  if (DP && SH.diamond) { const marks = DP.items.map(it => `<div class="mk" style="left:${(it.x * 100).toFixed(2)}%;top:${(it.y * 100).toFixed(2)}%">${ord.indexOf(it.id) + 1}</div>`).join('');
    if (DP.items.length < 15) warn.push('diamond: only ' + DP.items.length + ' buttons found');
    FIG(shot('diamond'), 'The troop diamond with six soldiers chosen, photographed in the game. The numbers are added by this guide.', 72, marks); }
  else FIG(diamondPng, 'The troop diamond, photographed in the game, with each button numbered.', 96); }
TBL(['', 'Button', 'What it does'], [
  ['1–4', 'Move up, right, down, left', 'The chosen soldiers walk a short way that way.'], ['5', 'Formation', 'Choose a shape, then send them anywhere (see below).'],
  ['6', 'Patrol', 'Then draw the route with your finger or the mouse.'], ['7', 'Guard', 'Then tap the place they should hold.'], ['8', 'Add', `Tap more soldiers to add them to the group, and every soldier you train while Add is on marches to join its formation (tap Add again to stop). ${NEW}`],
  ['9', 'Stop', 'Stop where they are.'], ['10', 'People', 'Your people: who they are, their work and their worries (section 11).'], ['11', 'Soldiers', 'Choose all your soldiers.'],
  ['12', 'Castle', 'Back to your castle (Space).'], ['13', 'Let go', 'Let go of the chosen people.'], ['14', 'Everyone', 'Choose everyone.'], ['15', 'Citizens', 'Choose all your citizens.']], 'dia');
H('Formations', true);
P('Tap the two walking soldiers in the middle of the diamond: the formations open above it. Choose one and the chosen soldiers form up where they stand; then tap the ground and they march there in that shape. Any number works, from 3 to 30 or more.');
UL(['Tap the ground with soldiers chosen and they march there in the formation you chose (or in a neat block when the formation is Free).', 'They march at the pace of the slowest, so they arrive together, and stand facing the way they went.', 'Soldiers in a formation stay in it until you give them a new order, and they are not taken for other duties.', 'Free is the old way: a neat block with no set shape.', `<b>To fill a formation as you train:</b> choose the group and tap Add on the diamond. Every soldier you train while Add is on marches to the group and takes his place, and the group closes up round him in the same shape, where it stands. Tap Add again and new soldiers go to the rally flag as before. ${NEW}`]);
FIG(art('formations-fan'), 'The formations open above the diamond.', 70);
{ const F = [['free', 'Free', 'No set shape: a neat block, the old way'], ['line', 'Line', 'Side by side, facing the enemy: the most weapons at the front'], ['column', 'Column', 'Two abreast, one behind the other: best through gates, woods and narrow ground'],
    ['wedge', 'Wedge', 'An arrowhead: one at the point, the rest fanning back: to break through'], ['square', 'Square', 'A hollow square facing every way: when you could be attacked from all sides'],
    ['circle', 'Circle', 'A ring round a point: to guard something in the middle'], ['loose', 'Loose', 'Spread wide apart: fewer hit at once by catapults and arrows']];
  for (let i = 0; i < F.length; i += 3) add(`<div class="three">${F.slice(i, i + 3).map(([k, n, t]) => `<figure><img src="${art('formation-' + k)}"><figcaption><b>${n}</b> — ${t}</figcaption></figure>`).join('')}</div>`); }
P('Each picture: ten soldiers (spearmen, with a bowman in every five), seen from above in the flat view, after marching up the page.');
H('The buttons on the screen');
TBL(['Button', 'What it does'], [
  ['Settings icon (a gear)', 'Settings. It replaces the word “Menu”. Help, the views, sound, voice, Save and Load, and Quit Game are inside it.'],
  ['Question mark (?)', 'Help. Search it for a word or an activity, and read the pictures (section 15).'], ['Trophy', 'Directly below the settings button. Shows what the next castle stage needs.'],
  [`People tab ${FIXED}`, 'The face on the corner of the troop diamond, at the bottom left. Opens the people panel (section 11).'],
  ['Side lists 1 to 5', 'Town, Castle, Army, Rule and Industry. Each holds picture buttons.'], ['Picture buttons', 'About one inch square, a big picture, a small count badge in the corner, and the name when you tap or hover.'],
  ['Rally flags', 'Three kinds: a flag beside a shield for soldiers, a flag beside a person for citizens, a flag beside a siege weapon for siege.'],
  [`Patrol and Guard ${NEW}`, 'Now on the troop diamond. Draw a patrol route with a mouse or finger, or tell soldiers to Guard an area.'],
  [`Stage chip ${NEW}`, 'Taken off the top bar: the trophy shows the stage.']]);
H('On a phone');
UL(['The item lists sit at the bottom of the screen and open upward.', 'The panel closes by itself after you pick an item, so you can drag the chosen object into place without the panel covering the battlefield.',
  'The detail box for a person slides up along the bottom of the screen.',
  `<b>Pictures instead of words</b> ${NEW}: the top bar shows the faction’s shield, food, wood, stone, gold, people, happiness (a number) and taxes (dots). The tabs show their pictures. A name shows when you tap a button or it is chosen. This saves room on the small screen.`,
  'The same troop diamond sits above the five list tabs. The people count reads like 12/15 (people, and room for them), and taxes show as dots: none, one or two.']);
FIG2([shot('phone'), 'A phone (an iPhone), photographed in the game.'], [shot('phoneTown'), 'The same phone with the Town list open from the bottom.']);
FIG(art('phone-diamond'), 'The troop diamond on a phone, with soldiers chosen (from the Phase 4E troop guide).', 46);
H('Placing buildings and walls');
UL(['Turn a building before you place it, and place it facing toward or away from you. Drag and drop works with a mouse and with touch.',
  'Walls, fences and gates follow the exact route you draw. They do not reroute around trees, rocks or food. Obstacles in the way are cleared or split. Your intentional gate openings stay.']);

// ---------- 6 ----------
SEC('Units and Soldiers', 'Every person and soldier: the stage it arrives, how it moves, how it fights, how it grows.', U('spear'));
P('Units fight on their own when an enemy comes near, or when you order them. Each attack is a timed swing, and the damage lands at a set moment in the swing. Each picture is the unit as the game draws it today. Speed numbers live in the game settings and are not printed here.');
H('Your people');
CARD(U('civ'), 'Citizen', 'Stage 1 · your workers', ['<b>Does:</b> builds, fetches wood, food and stone, and staffs every workplace.', '<b>Moves:</b> walks between home, work and the campfire. Takes 20 to 30 second breaks at a fire, a house, the tavern or the House of Prayer. Stays near the castle.',
  '<b>Grows:</b> new citizens grow up in your houses. Education at the school makes them put out fires and repair faster.', `<b>Called:</b> you can call more from the countryside with the Citizen button (section 11). ${NEW}`, 'Can fill a moat in.']);
CARD(U('king'), 'Your king', 'Stage 1 · your leader', ['<b>Does:</b> the only fighter you start with. Strong, and worth guarding. He stands on the keep, spots enemies farther than an archer can shoot, and warns you which way they come.', '<b>Moves:</b> on foot, and stays at your castle.', 'Takes only a quarter of the damage from ordinary weapons.']);
H('Foot soldiers');
CARD(U('spear'), 'Spearman', 'Stage 1 · needs a spear and 10 gold', ['<b>Does:</b> cheap, quick foot soldier with a long reach. Escorts work groups.', '<b>Moves:</b> quick on foot. Can fill a moat in.']);
CARD(U('archer'), 'Archer', 'Stage 1 · needs a bow and 10 gold', ['<b>Does:</b> shoots from a distance. Best on walls and towers, where it shoots farther and is hard to reach.', '<b>Moves:</b> on foot, and climbs high walls by the stairs. Can hit flamethrowers, but slowly, about one at a time.']);
CARD(U('archer.longbow'), 'Longbowman', 'Stage 2 · a separate unit, not an upgrade · needs a bow and 15 gold', ['<b>Does:</b> shoots farther and sees <b>twice as far</b> as other soldiers. Every lookout tower gets one at the top.', 'Cannot hit the fast flamethrowers.']);
CARD(U('archer.crossbow'), 'Crossbowman', 'Stage 3 · needs a bow, 2 iron and 15 gold', ['<b>Does:</b> slow but heavy bolts. A bolt can strike a mounted knight’s rider past his horse.', 'A separate unit from the archer and the longbowman; you can keep a mix of all three.', 'Cannot be killed by a flamethrower’s knife.']);
CARD(U('sword'), 'Swordsman', 'Stage 3 · needs a sword and 10 gold', ['<b>Does:</b> steady, well-armoured fighter for close combat.', `Dies from one spike strike, like most soldiers (your decision after Phase 4C). ${FIXED} Can fill a moat in.`]);
CARD(U('maceman'), 'Maceman', 'Stage 3 · needs a mace and 10 gold', ['<b>Does:</b> heavy hitter in armour, made at the blacksmith from iron.']);
CARD(U('maceman.berserker'), `Berserker ${FIXED}`, 'Stage 3 · every faction · needs a mace, 2 leather and 10 gold', ['<b>Does:</b> fierce axe fighter. Sees as far as a longbowman. Psychana’s berserkers move unseen in small bands.', 'Leather comes from the farm’s cows and bulls. Needs two spike strikes to die. Cannot be killed by a flamethrower’s small knife. Cannot fill a moat.']);
CARD(U('knight.foot'), 'Knight (on foot)', 'Stage 3 · needs a sword, armour and 20 gold', ['<b>Does:</b> hard to hurt. Takes a quarter of the damage from ordinary weapons; only knights, kings, ballistas and trebuchets wound him fully.', 'Needs two spike strikes to die. Cannot fill a moat.']);
CARD(U('knight'), 'Mounted knight', 'Stage 4 · a knight plus a horse from the stable', ['<b>Does:</b> very hard to kill. The horse takes the blows first and must fall, then the rider, unless a crossbowman or a ballista hits the rider directly.', '<b>Moves:</b> rides the horse. Cannot fill a moat in.']);
CARD(U('archer.flame'), 'Flamethrower squad', 'Stage 4 · attack wars only · needs a sword, armour and 20 gold', ['<b>Does:</b> one click buys a squad of 10 and it does not cost 10 people. It costs about as much as one unmounted knight.', '<b>Moves:</b> fast. Longbowmen cannot hit them. A group of 20 is hard for archers to stop.', 'Their flame hurts but cannot kill. Their real danger is setting buildings on fire, and the people inside burn.', 'They can fill a moat; they dig moats around themselves in the middle of nowhere. Melee soldiers kill them easily. They never defend and never escort.']);
H('Siege engines and carts');
CARD(U('ram'), `Battering ram ${FIXED}`, 'Stage 4 · attack wars only', ['<b>Does:</b> smashes walls, gates and buildings. It cannot hurt soldiers, so guard it.', 'Comes only with a large army, never with a few riders. (Version 2 mentioned ladder men beside it; there are none in the game.)']);
CARD(U('catapult'), 'Catapult', 'Stage 4 · siege', ['<b>Does:</b> lobs heavy stones from far away. Best against walls and towers.']);
CARD(U('ballista'), 'Ballista', 'Stage 3 · walking or tower-mounted', ['<b>Does:</b> a giant crossbow that cuts down soldiers at long range and only chips stone. Hits mounted riders directly and hurts knights fully.', `On a tower it sees as far as a longbowman. A tower ballista costs ${(D.towerEngine && D.towerEngine.ballista && D.towerEngine.ballista.gold) || 400} gold and ${(D.towerEngine && D.towerEngine.ballista && D.towerEngine.ballista.wood) || 150} wood. (Build)`]);
CARD(U('trebuchet'), 'Trebuchet', 'Stage 5 · mobile or tower-mounted', ['<b>Does:</b> throws farthest of all. Built by engineers. Needs stage 5 and the school’s top level.', `A tower trebuchet costs ${(D.towerEngine && D.towerEngine.trebuchet && D.towerEngine.trebuchet.gold) || 800} gold, ${(D.towerEngine && D.towerEngine.trebuchet && D.towerEngine.trebuchet.wood) || 300} wood and ${(D.towerEngine && D.towerEngine.trebuchet && D.towerEngine.trebuchet.stone) || 100} stone. (Build) Hurts knights fully.`]);
CARD(U('oxcart'), 'Ox cart', 'Stage 2 · comes free with each quarry', ['<b>Does:</b> hauls cut stone from a quarry to your stores. Oxen carry ore and stone; going from one ox to two is automatic.']);
CARD(U('engineer') || U('civ'), 'Engineer', 'Stage 3 · needs an engineer’s hut and school training', ['<b>Does:</b> repairs buildings very fast and works faster as it learns. Builds and crews siege engines, and builds trebuchets at stage 5.']);
H('How a soldier grows: veteran stars');
UL(['Every soldier who survives a battle earns a star above his head when selected. Each further battle adds another, even up to a hundred, shown as a cluster.', 'Star colors change to greater, lighter colors as he advances. Each star makes him stronger.',
  'A plain spearman can end up as fast and strong as a mounted knight without a horse. Every soldier can become important.', 'A quick tap shows his stars, level and education. Press and hold shows his full record, including how many wars he has fought.']);
H('Generals', true);
UL([`A soldier with <b>${CC.general.stars} or more stars</b> is a <b>general</b>, and at <b>${CC.general.fiveStar || 10} stars</b> a <b>five-star general</b>. A banner announces each, and his box says “a general” or “a five-star general”. (Your decision after version 3; the numbers are one setting each.)`,
  `Generals in the field or in the camp encourage the countryside: each general (up to ${CC.general.max}) makes a called citizen come sooner and cost a little less, and makes the houses raise their children sooner (section 11).`, 'So keep your veterans alive: a general lost is felt in the town as well as on the field.']);
FIG(shot('general'), 'A soldier’s box, photographed in the game: this spearman has 12 stars and is a five-star general.', 56);
H('How a soldier grows: education');
P('Once the school is built it has a soldiers button that educates all soldiers together. Up to level 5 they get smarter, harder to kill, and heal and repair faster. It works through hidden numbers, so they may look the same. Stars and education stack, so a soldier who survives many battles can become super strong.');
H('The soldiers as designed');
P('These are the design-sheet pictures of the soldiers and engines. The game pictures above are the same units as they appear in play.');
{ const L = [['spearman', 'Spearman'], ['archer', 'Archer'], ['crossbowman', 'Crossbowman'], ['swordsman', 'Swordsman'], ['heavy-spearman', 'Heavy spearman'], ['berserker', 'Berserker'], ['mounted-knight', 'Mounted knight'], ['flamethrower', 'Flamethrower'], ['catapult', 'Catapult'], ['trebuchet', 'Trebuchet']];
  for (let i = 0; i < L.length; i += 5) add(`<div class="sheet">${L.slice(i, i + 5).map(([k, n]) => `<figure><img src="${art('sheet-' + k)}"><figcaption>${n}</figcaption></figure>`).join('')}</div>`); }
H('Lookouts and the keep');
UL(['Every lookout tower automatically gets a sentry at the door, plus a longbowman and a regular archer at the top, for every faction.', 'Your keep is the heart of the castle. It grows through the five stages and shoots at enemies who come near.']);

// ---------- 7 ----------
SEC('Combat and Defenses', 'Walls, gates, moats, spikes, towers, patrols and how a battle plays.', B('gtower'));
H('Walls and gates');
MINI(bcards(['wall', 'gate', 'highwall', 'stairs']));
P('Walls begin as a wooden palisade and turn to brick as the castle grows. The picture below shows the four brick types from your design sheet: brown, gray, green and black-gray-green, each in a long wall, a short wall, an arch, a corner and a battlement.');
FIG(art('bricks'), 'The brick types, from your design sheet.', 100);
H('Towers');
MINI(bcards(['gtower', 'stower', 'lookout', 'roundtower', 'greattower']));
UL(['Every lookout tower gets a sentry at the door, a longbowman and an archer at the top.',
  `At stage 4 the giant towers come empty. You add a ballista (${D.towerEngine ? D.towerEngine.ballista.gold : 400} gold, ${D.towerEngine ? D.towerEngine.ballista.wood : 150} wood) or, at stage 5, a trebuchet (${D.towerEngine ? D.towerEngine.trebuchet.gold : 800} gold, ${D.towerEngine ? D.towerEngine.trebuchet.wood : 300} wood, ${D.towerEngine ? D.towerEngine.trebuchet.stone : 100} stone). (Build)`,
  `At stage 5 the towers still come empty: you buy each one’s engine. The rivals buy theirs by themselves. ${FIXED}`]);
H('Moats and spikes');
MINI(bcards(['moat', 'pit']));
UL(['A moat is a severe movement barrier. It does not damage or kill.', `Citizens, spearmen, swordsmen and flamethrowers can fill a moat in (your decision after Phase 4C). Knights, anyone on a horse, berserkers, archers and macemen cannot. (The list of fillers is one setting.) ${FIXED}`,
  'Once a section is filled it becomes normal ground for good. Everyone, including enemies, can cross it.',
  `Spikes are lethal: anyone who steps on them dies from one strike, except knights, berserkers and mounted knights, who take two (a mounted knight’s horse falls at the first). Rival lords and kings die from one strike too. ${FIXED}`,
  'Units of the spike owner’s own faction are not hurt. The same rules cover mounted units, horses and bandits.']);
H('How a battle plays');
FIG(shot('battle'), 'Your spearmen and archers meet a raiding party, photographed in the game.', 80);
UL(['Red and yellow sparks fly on every hit. There is no blood. You hear sword clashes and arrow sounds, and bricks fly and tumble through the air.', 'Wind, rain and snow change how far arrows fly.',
  'Knights and the king take only a quarter of the damage from ordinary weapons. Knights, kings, ballistas and trebuchets hurt them fully.', 'Small groups are scouts and light raiders. Random rogues and bandits belong to no rival. They steal and run off.',
  'Raiders follow their routes, cut through trees, and break walls with rams.',
  `<b>Soldiers come back.</b> A soldier who goes after an enemy by himself turns back once he is about a dozen squares from where he started, so he is not drawn into a rival’s castle. Soldiers you send yourself go where you send them. ${NEW}`,
  `<b>A war won.</b> When a raid is beaten off (at least 6 in 10 of the raiders fall and your keep stands), a Victory banner shows. So does defeating a rival. Each war won brings citizens sooner and cheaper for ten minutes (section 11). ${NEW}`]);
FIG(shot('bannerWin'), 'The Victory banner, photographed in the game.', 80);
H('Patrol, Guard, formations and rally flags');
UL([`<b>Patrol:</b> press Patrol on the troop diamond, then draw a route with a mouse or finger. Selected soldiers follow it again and again until you change it or a fight interrupts it. ${NEW}`, '<b>Guard:</b> press Guard on the diamond and tap a place: they defend that area.',
  `<b>Formations:</b> choose a shape on the diamond and the group marches in it, at the pace of the slowest (section 5). ${NEW}`,
  '<b>Rally flags:</b> a flag beside a shield for military, beside a person for citizens, beside a siege weapon for siege equipment. Soldiers and siege follow the main army’s destination unless you give them separate orders. Idle citizens return to the campfire.',
  '<b>Escorted work groups (stage 3):</b> harvesting groups go out together with soldiers to protect them from bandits, wolves and bears. It is automatic. Clicking the building tells you which group needs a soldier, for example “group one needs a soldier”. Only basic soldiers escort: sword, spear or archer, never flamethrowers.']);

// ---------- 8 ----------
SEC('Buildings and Industries', 'What each building does, what it costs, who works in it, and how it grows.', B('house'));
P('Click any building and a box opens whose background is a still picture of the inside of that building. The picture changes as the building grows. First, the big industries in depth, with photographs of their boxes. After them, every building at a glance with its cost.');
FIG(shot('site-quarry'), 'The quarry’s box, photographed in the game.', 50);
H('The big industries');
CARD(shot('keep') || B('keep'), 'The keep and the shack', 'From the start · your home', ['You start in a shack and the castle grows around it through five stages.', 'Your keep is the heart of the game. If it is destroyed, you lose.', 'Sick people are sent to the keep to be cared for.']);
CARD(B('woodhut'), 'Woodcutter’s hut and the wood and iron yard', `${stageWord(C('woodhut').stage)} · ${C('woodhut').cost} · one building that grows`, ['Woodcutters fell trees near it. Huts merge into bigger buildings, even when built in separate places.', 'Stage 1: up to 4 huts of 2 people. Stage 2: up to 3 yards of 5 people. (Build)', 'Stage 3: two buildings of 10 people each, and the blacksmith joins so iron work begins.', 'Stages 4 and 5: one big yard. At stage 5 it holds 15 on wood and 10 on iron, and you choose the split.', 'From stage 3 horse-drawn wagons carry the workers to the forest. Arrows and ballista bolts still cost wood.']);
CARD(B('quarry'), 'Quarry and ox cart', `${stageWord(C('quarry').stage)} · ${C('quarry').cost} · beside grey rocks`, ['Grows and gets more sophisticated, then stops. Maximum two quarries, 10 people in each.', 'Workers go out in sets of two with oxen, and one person always stays behind.', 'On foot, a quarryman can only gather nearby stone. Far stone needs oxen. Going from one ox to two is automatic and free as you grow.', 'Stronger workers and oxen need more food and cost more to replace.']);
FIG(shot('fieldfarm'), 'A field growing wheat, corn and grapes in strips, beside a farm with its animals, a well, lookout towers and guards. Photographed in the game.', 78);
CARD(B('wheatfarm'), `The Field ${NEW}`, bline('wheatfarm'), [`Up to ${FG.field.max} fields at every stage (they no longer merge), each holding up to ${FG.field.staff} people. ${FIXED}`, 'Tap the field: + and − beside Wheat, Corn and Grapes put people on each crop or take them off. It can grow all three at once, in strips, and each worker has his own place in his crop’s strip.', 'Wheat grows fastest and goes to the mill (bread) and the alehouse. Corn is next and feeds your people straight from the granary. Grapes are the slowest, so they sell for the most, and the feast needs them.', 'Too much food? Take people off with −: they stay off and go back to gathering.']);
CARD(B('farm'), `The Farm and the stable ${NEW}`, `Farm ${C('farm').cost}, stage ${C('farm').stage} · stable ${C('stable').cost}, stage ${C('stable').stage}`, [`Up to ${FG.farm.max} farms, each holding up to ${FG.farm.staff} people. Tap the farm and tick the animals it raises: chickens, cows, pigs and ducks (and turkeys and sheep, which the feast needs). You see them walking about the pen; only the ticked ones are born.`, 'The keepers bring in eggs, milk and meat (food). Cows give leather, and their bull calves become oxen for the quarries.', `The farm gets better with time: level 2 after ${Math.round(((FG.farm.levels || [])[1] || { after: 360 }).after / 60)} minutes of work, level 3 after ${Math.round(((FG.farm.levels || [])[2] || { after: 900 }).after / 60)} minutes with a stable beside it. Each level breeds faster and holds more.`, 'The stable stands beside the farm and needs 4 people. Horses live there, pull wagons and turn knights into mounted knights.']);
CARD(B('lookout'), `Guards, wells and lookouts ${NEW}`, `Guard ${FG.guard.gold} gold · well ${FG.well.wood} wood · lookout ${FG.lookout.wood} wood`, [`Fields and farms can stand far from the keep, so each has its own protection. <b>Reserve a guard</b> in its box: a soldier with a knight’s strength, on foot, even before you can train knights. A field takes ${FG.guard.field}, a farm ${FG.guard.farm}. He takes a place in your houses and stays with his field.`, 'A <b>well</b> makes things grow 25% faster, and is water for putting out fires nearby.', 'A <b>lookout tower</b> sees the land around and rings the bell when raiders come near.', 'Happy people grow food faster (25% when very happy, 20% slower when upset).']);
FIG2([shot('site-wheatfarm'), 'The field’s box: its crops at the top.'], [shot('site-farm'), 'The farm’s box: its animals at the top.']);
CARD(B('mill'), 'Mill and bakeries', `Mill stage ${C('mill').stage}, ${C('mill').cost} (Build) · bakery stage ${C('bakery').stage}, ${C('bakery').cost}`, ['One mill feeds five bakeries, each holding up to 3 people. At stage 3 you build one mill and it comes with the five bakeries.', 'Before stage 3 only two mills can be built, with 2 people each.', 'Output is about enough bread for 20 people every couple of minutes. People eat bread fast. Cy Young bakes four and a half times as much.', 'Flour can be bought separately at the market only for cakes for the feast, or to sell.']);
CARD(B('granary'), 'Granary and stockpile', `Granary ${C('granary').cost} · stockpile ${C('stockpile').cost} · stage 1`, ['The granary holds 300 food, and 800 once expanded at stage 3. Fruit and all food go in automatically.', 'Too much food without expansion brings bugs, disease and deaths. Fix it by taking workers off food (they sit by the campfire, no penalty) or by selling food.', 'The stockpile keeps wood, stone, iron and goods closer to where they are gathered.']);
CARD(B('alehouse'), 'Alehouse, tavern and brewery', 'Alehouse stage 1 · tavern and brewery stage 2', ['The alehouse needs one worker. People buy ale there and take it home. Set its price Cheap, Fair or Dear.', 'Too cheap and some people end up drunk and strange in the streets. Too expensive and they get angry. Find the middle price. Ale costs more in wartime.', 'The tavern serves more people and people rest there on breaks. The brewery brews ale from the hop farm’s hops.']);
FIG2([shot('site-alehouse'), 'The alehouse’s box, with its price.'], [shot('site-woodhut'), 'The woodcutter’s hut’s box.']);
CARD(B('market'), 'Market', `${stageWord(C('market').stage)} · ${C('market').cost} · one of the most valuable buildings`, ['If it is destroyed it hurts the most. You can trade goods with rivals who are willing to trade.', 'Goods you buy cost 2.5 times what they cost to make, and you sell at 1.2 times. School level 2 changes that to 2 and 1.5, and level 3 to 1.8 and 1.6. (Build)', 'Your people’s mood also moves prices: up to 25 percent cheaper when they are happy and up to 40 percent higher when they are upset. Ticanologue pays half.']);
FIG(shot('site-market'), 'The market’s box, photographed in a game at stage 3.', 62);
CARD(B('school'), 'School and engineer’s hut', `School stage ${C('school').stage} · engineer’s hut stage ${C('engineerhut').stage}`, ['The school starts small. Clicking it opens a menu to buy education. There are three levels covering better war and better building: less material lost, less money and fewer people needed to build, better trade.', 'The top level trains engineers and is needed before stage 5. It also holds the soldiers button (up to level 5).', 'The engineer’s hut houses four engineers who repair very fast and build and crew siege engines.']);
FIG2([shot('site-school'), 'The school’s box.'], [shot('site-smithy'), 'The blacksmith’s box.']);
CARD(B('chapel'), 'Apothecary, house of prayer, church and abbey', 'Healing and happiness', ['Once built, health and happiness are handled, unless the building is destroyed. Bigger ones are stronger: house of prayer (stage 2), church (stage 3), abbey (stage 4).', 'At stage 5 the apothecary offers a “make the doctor smarter” upgrade. After about two minutes the doctor heals faster.', 'Hekaranok’s abbeys are stronger still.']);
CARD(D.goods.food ? svgPic('grapes') : '', 'The feast', 'Stage 3 · never automatic', ['The old automatic feast is gone. You must gather grapes, apples, chickens, turkeys, a cow and a lamb or sheep.', 'It costs more than all your taxes for that session. In return people stay happy a long time, nothing makes them mad, and they work about twice as hard.']);
H('Every building at a glance');
add('<h4 class="tcap">Homes, fields and farms</h4>'); MINI(bcards(['house', 'farm', 'wheatfarm', 'hopfarm', 'vineyard', 'orchard', 'woodhut', 'quarry', 'ironmine', 'stockpile']));
add('<h4 class="tcap">Food and drink</h4>'); MINI(bcards(['granary', 'mill', 'bakery', 'brewery', 'alehouse', 'tavern']));
add('<h4 class="tcap">Care, happiness and rule</h4>'); MINI(bcards(['chapel', 'church', 'abbey', 'apothecary', 'garden', 'stocks']));
add('<h4 class="tcap">Trade, learning and war workshops</h4>'); MINI(bcards(['market', 'school', 'engineerhut', 'stable', 'bowyer', 'poleturner', 'smithy', 'armory', 'waterpot']));
P(`Costs are read from the game today. The keep has no cost; its picture is a photograph from the game ${NEW}.`);

// ---------- 9 ----------
SEC('Goods, Weapons and How Soldiers Are Made', 'Every item your people make, move and spend, and where each one goes.', D.weapons.sword || svgPic('mace'));
H('Goods');
const GOODS = [['food', 'Food', 'Crops, berries, corn, eggs, milk, meat and bread: everyone eats.'], ['wood', 'Wood', 'For building, bows and spears.'], ['stone', 'Stone', 'For stone walls, towers and growing the castle.'], ['iron', 'Iron', 'For swords, maces, armour and crossbows.'],
  ['gold', 'Gold', 'From taxes and trade; pays wages, training and calling citizens.'], ['wheat', 'Wheat', 'Ground into flour; brewed into ale.'], ['flour', 'Flour', 'Baked into bread.'], ['bread', 'Bread', 'Good food that adds variety.'], ['hops', 'Hops', 'Brewed into ale.'],
  ['ale', 'Ale', 'Served at the alehouse and tavern to cheer people.'], ['grapes', 'Grapes', 'From the field (slowest crop); worth the most of the crops; part of a feast.'], ['apples', 'Apples', 'Food, and part of a feast.'], ['leather', 'Leather', 'From the farm’s animals; berserkers need it.']];
const goodPic = k => (['iron', 'wheat', 'flour', 'bread', 'hops', 'ale', 'grapes', 'apples', 'leather'].includes(k) && svgPic(k)) || D.goods[k] || svgPic(k);
MINI(GOODS.map(([k, n, d]) => ({ n, d, pic: goodPic(k) })));
H('Weapons');
MINI([['sword', 'Sword', 'For swordsmen, knights and flamethrowers.'], ['spear', 'Spear', 'For spearmen.'], ['bow', 'Bow', 'For archers, longbowmen and crossbowmen.'], ['mace', 'Mace', 'For macemen and berserkers.'], ['armor', 'Knight Armour', 'For knights and flamethrowers.']]
  .map(([k, n, d]) => ({ n, d, pic: (['bow', 'mace', 'armor'].includes(k) && svgPic(k)) || D.weapons[k] || svgPic(k) })));
H('How a soldier is made');
P('Weapons come from workshops, wait in the armory, and are issued to a new soldier together with gold.');
TBL(['Soldier', 'Workshop', 'Needs', 'Stage'], [['Spearman', 'Spear-maker', '1 spear + 10 gold', 1], ['Archer', 'Fletcher', '1 bow + 10 gold', 1], ['Longbowman', 'Fletcher', '1 bow + 15 gold', 2],
  ['Crossbowman', 'Fletcher + iron mine', '1 bow + 2 iron + 15 gold', 3], ['Swordsman', 'Blacksmith', '1 sword + 10 gold', 3], ['Maceman', 'Blacksmith', '1 mace + 10 gold', 3],
  ['Berserker (every faction)', 'Blacksmith + farm', '1 mace + 2 leather + 10 gold', 3], ['Knight', 'Blacksmith', '1 sword + armour + 20 gold', 3], ['Mounted knight', 'Knight + stable', 'A knight plus a horse', 4],
  ['Flamethrower squad', 'Blacksmith', 'Sword, armour and 20 gold', 4], [`Citizen ${NEW}`, 'The Citizen button (Town list)', `About ${D.call[60] ? D.call[60].food : CC.base.food} food + ${D.call[60] ? D.call[60].gold : CC.base.gold} gold, more when unhappy (section 11)`, 1]]);

// ---------- 10 ----------
SEC('Economy, Mood and Trade', 'How goods move, how people feel, and how money works.', D.goods.gold);
H('The chains that make things');
const chain = l => `<div class="chain">${l.map((x, i) => `${i ? '<span class="ar">➜</span>' : ''}<span class="lk">${x}</span>`).join('')}</div>`;
add(`<div class="chains">${[['<b>Bread</b>', 'Field (wheat)', 'Mill', '5 bakeries', 'People eat'], ['<b>Corn</b>', 'Field (corn)', 'Granary', 'People eat'], ['<b>Eggs, milk, meat</b>', 'Farm (animals)', 'Granary', 'People eat'], ['<b>Animals</b>', 'Farm', 'Market', 'Top price, always'], ['<b>Ale</b>', 'Hop farm', 'Brewery', 'Alehouse / tavern', 'People buy ale'], ['<b>Stone</b>', 'Quarry (+ oxen)', 'Stockpile', 'Walls, buildings, growing the castle'],
  ['<b>Wood and iron</b>', 'Wood yard / iron mine', 'Fletcher, spear-maker, smith', 'Bows, spears, swords, maces, armour'], ['<b>Money</b>', 'Taxes, surplus food and goods', 'Market', 'Gold', 'Soldiers, upgrades, citizens']].map(chain).join('')}</div>`);
H('What keeps people happy');
UL(['Rations, taxes, ale, a House of Prayer, a variety of food, not too much crowding, and no sickness.', 'Unhappy people leave. Happy towns attract settlers.', 'People who eat well get fat, which makes them happier but slower.', 'Sick people are sent to the keep to be cared for.',
  `<b>Mourning:</b> when your people or soldiers are killed, the town mourns for two minutes. The mood box lists it as a reason, and it passes by itself. ${NEW}`,
  `<b>Happiness and new citizens:</b> the happier your people, the sooner and cheaper a called citizen comes (section 11). ${NEW}`]);
FIG(shot('mood'), 'The mood box (tap Happiness at the top), photographed in the game. Every reason, up or down.', 60);
H('Taxes');
P('Raise or lower taxes with a simple control. Higher taxes bring in more gold and make people less happy. Lower taxes make them happier and bring in less. A person’s detail box shows what he makes and what he pays.');
H('Trade');
UL(['The market buys and sells everything. Buying always costs more than making it yourself.', 'One friendly rival can be a trading friend who trades with you at the same stage level.', 'Cy Young sells its surplus food. Ticanologue pays half price at the market.']);

// ---------- 11 ----------
SEC('Citizens and How You Read Them', 'Every person can tell you what they are doing and what they need.', U('civ'));
UL(['Citizens stay near the castle and do not wander outside it.', 'When citizens are killed they must be replaced. This is the main caveat of the game. New citizens come in and work automatically.',
  'A building needs only one citizen to run. A second citizen takes about 3 to 5 minutes to grow in a house. Some may still be in school, and that is shown.',
  `You can also <b>call</b> a citizen from the countryside, for food and gold (below). ${NEW}`]);
H('Calling more citizens', true);
P(`Open the <b>Town</b> list (key 1) and find the <b>Citizen</b> button (a citizen’s picture). Touch it, or rest the mouse on it, and its label shows what calling one costs right now and how long he takes, for example “${D.call[60] ? `${D.call[60].food} food · ${D.call[60].gold} gold · ${mmss(D.call[60].secs)}` : ''}”. Tap it to call him: you pay, a banner says when he will arrive, and when his wait is over he walks in along the road, saying he answers your call. Your houses go on raising their own children as before. (Your Phase 4F request.)`);
FIG2([shot('townList'), 'The Citizen button in the Town list, with its label, photographed in the game.'], [shot('arrive'), 'A called citizen walks in along the road.']);
FIG(shot('bannerCall'), 'The banner after tapping the Citizen button.', 80);
H('What changes the cost and the wait');
TBL(['', 'The rule'], [
  ['<b>Happiness</b>', 'The unhappier your people, the longer word takes to spread and the more a citizen costs. Below 20 happiness it takes about four and a half minutes. Happy people (70 or more): sooner and cheaper than the normal price.'],
  ['<b>Wars won</b>', `A raid beaten off (at least 6 in 10 of its raiders fall and your keep stands) or a rival defeated. Each war won counts for ${CC.win.lasts / 60} minutes, and up to ${CC.win.max} count at once. Each makes the wait and the cost about ${Math.round((1 - CC.win.time) * 100)}% less, and makes the houses raise their children sooner.`],
  ['<b>Generals</b>', `Soldiers with ${CC.general.stars} or more veteran stars (five-star generals too), in the field or in the camp. Up to ${CC.general.max} count. Each makes the wait about ${Math.round((1 - CC.general.time) * 100)}% shorter and the cost ${Math.round((1 - CC.general.cost) * 100)}% less, and makes the houses raise their children sooner.`],
  ['<b>Limits</b>', `Your houses must have room for him. At most ${CC.queue} can be on their way at once. However much the wars and generals help, the wait is never shorter than ${Math.round(CC.base.secs * CC.floor)} seconds.`]]);
H('The numbers today (Build)');
P('Happiness alone, with no wars won and no generals:');
TBL(['Happiness', 'Food', 'Gold', 'Wait'], Object.keys(D.call).map(Number).sort((a, b) => b - a).map(m => [m, D.call[m].food, D.call[m].gold, mmss(D.call[m].secs)]), 'narrow');
P('At happiness 60, with wars won (generals work the same way, a little more gently):');
TBL(['Wars won', 'Food', 'Gold', 'Wait', 'Houses raise children'], Object.keys(D.wins).map(Number).map(w => [w, D.wins[w].food, D.wins[w].gold, mmss(D.wins[w].secs), w ? `${D.wins[w].boost} times as fast` : 'as usual']), 'narrow');
NOTE(`<b>The balancing act.</b> An unhappy town that keeps losing gets fewer new people, slowly and at a high price. A town that wins its wars and keeps its veterans alive gets them quickly and cheaply, even when it is not very happy. All these numbers are one block in the game’s settings (CITIZEN_CALL), so they can be tuned.`);
H('Tap and hold');
TBL(['Quick tap', 'Press and hold'], [['A small picture of the job (a pick for the quarry). Soldiers show stars, level and education. No words.', '1 to 2 seconds. The person speaks what they do or need, and a detail box opens.']]);
UL(['On an iPad or large screen the detail box floats small next to the person and slides over at screen edges. On a phone it slides up along the bottom.',
  'The detail box shows whether the person is happy and, if not, why, their education level once the school is built, their job, any concerns such as taxes, how much they make, and how much tax they pay.',
  'Only the held person speaks, one at a time, so nothing talks by accident.']);
FIG(shot('card'), 'A citizen’s box, photographed in the game.', 56);
H('The People tab');
P(`The face on the corner of the troop diamond, at the bottom left, is always available ${FIXED}. It opens a well laid-out, scrollable panel that pauses the game. It shows how many people are growing, how many there are, their jobs, and the same information you get from holding on one person.`);
FIG(shot('people'), 'The People tab, photographed in the game.', 60);
H('Needs alerts');
UL(['Every person and every industry says what is needed, for example “Oxen needed, my lord.” or “I need better education, my lord.”', 'It is spoken with the device’s own built-in speech and also shown as text. The Art of War advisor shares the same voice.', 'Only the single most urgent need is spoken at a time. No sound files are used.']);

// ---------- 12 ----------
SEC('Fire and Repair', 'Fires are fought and broken buildings mend themselves.', 'sign:🔥');
H('Fire');
add(`<div class="chains">${chain(['Fire seen', 'Alarm rings', 'Citizens fetch water', 'Fire out'])}</div>`);
UL(['When a fire is seen, an alarm rings in the castle and citizens automatically fetch water and put it out.', 'Each area has a water pot manned by one person. The pot grows over time.', 'Citizens put out fires faster as the school educates them, including bigger fires.',
  'If a fire burns about ten seconds with no one addressing it, half the building burns down and needs repair.', 'Fire always moves like real fire.']);
H('Repair');
UL(['Damaged or destroyed buildings repair automatically, with no click. The people who worked there repair them if alive, otherwise other citizens come out.', 'Engineers repair very fast. Regular citizens take twice as long. Better education means faster repair.',
  'Rebuilding a destroyed building takes twice as long as the original build.', 'If supplies run out, repair waits until supplies return. This applies to every building, every time.']);

// ---------- 13 ----------
SEC('The World, the Map and the Table', 'Fog of war, random starts, the views, the table, the glass, the water and the wildlife.', art('scene-river'));
H('Fog of war and random starts');
TBL(['', 'What it means'], [['<b>Unexplored</b>', 'Black. You know nothing here.'], ['<b>Explored</b>', 'Dim. You have been here; it stays revealed.'], ['<b>In sight</b>', 'Bright. Your units can see it now.']], 'narrow');
UL(['There is fog of war in every game. You do not know where the enemy camps are. Explored ground stays revealed. More is revealed when you search or when an enemy shows itself.', 'Longbowmen see twice as far as other units. A ballista on a tower matches that. Berserkers see as far as a longbowman. All Psychana units see that far.', 'Your start position and each rival’s start position are different every game.']);
FIG(shot('fog'), 'Zoomed out, photographed in the game: your land in sight, and the fog beyond.', 100);
H('The 3D view and the flat view', true);
P('The game is 3D. The V key, or the view button in Settings, switches to a flat view, seen straight from above, and back. Everything works the same in both.');
FIG2([shot('view3d'), 'The 3D view.'], [shot('viewFlat'), 'The same place in the flat view.']);
H('The battlefield');
P('These scenes are from your design sheet: a river valley with a stone bridge, a mountain pass, and a castle approach.');
add(`<div class="three">${[['scene-river', 'River valley'], ['scene-pass', 'Mountain pass'], ['scene-approach', 'Castle approach']].map(([k, n]) => `<figure><img src="${art(k)}"><figcaption>${n}</figcaption></figure>`).join('')}</div>`);
FIG(art('ground'), 'Ground, grass, wildflowers, dirt, an oak and a pine, from your design sheet. Forests are thick in some places so units must cut through them, with some open ground.', 100);
H('The table, the bar and the glass');
UL(['The board sits on a rich brown wood table with a polished finish and visible grain.', 'A brass and gold bar frames the playfield. Inside it, from the land outward: a band of moving water, then the bar. Where the bar meets the table the wood steps like crown molding.',
  `Each corner has a round gold ball with a land on it: <b>Russia top left, the United States top right, Australia bottom left, South America bottom right</b>. ${FIXED} (The layout is one setting.)`,
  'Beyond the bar is dark glass that reflects the table and the live game. The closer you scroll to the edge, the more glass you see. The reflection fades if the game slows down.']);
FIG2([shot('cornerNW'), 'The top-left corner, photographed in the game.'], [shot('cornerSE'), 'The bottom-right corner.']);
H('Water and wildlife');
UL(['Water moves with gentle waves and occasional splashes.', 'Now and then a fish jumps. Birds fly over. Butterflies and frogs appear near the shore.', 'All of it is sporadic and light, with a cap on how many appear at once.']);

// ---------- 14 ----------
SEC('Rivals, Trade and Winning', 'The computer plays the same four factions by the same rules.', (J.emblems || [])[3] && J.emblems[3].pic);
UL(['Every rival plays one of the four factions. Each rival gets a different faction when possible, and its name and colors show in the game.', 'Rivals follow the same five stages and economy as you. They start small with a shack and build up over time. They never start with a finished castle.',
  'A rival’s stage depends on its economy. Raiding its farms and food slows it. A rival rushed early is small and can fall fast, so a game can end in about 15 minutes.', 'Whoever reaches stage 5 first is very hard to kill, so slowing a rival’s growth matters.',
  'Rogues and bandits belong to no rival. They steal and run off.', 'One rival can be a trading friend. The others are enemies.', 'The game is meant to be challenging but winnable. Difficulty tunes how fast the rivals grow.',
  `Each raid you beat off, and each rival you defeat, is a <b>war won</b>, with a Victory banner. Wars won bring citizens sooner and cheaper (section 11). ${NEW}`]);
H('What a rival needs to grow', true);
P('The rivals grow by their own table, the same on every difficulty (their difficulty is how fast they work). When your own stage numbers were lowered in Phase 4D, the rivals kept theirs, so lowering yours did not make their raids stronger sooner. (Build)');
TBL(['Stage', 'People', 'Food', 'Stone', 'Iron'], [[2, 12, 150, '—', '—'], [3, 22, 300, 150, '—'], [4, 35, 500, 300, 80], [5, 50, 800, 500, 200]].map(r => [`<b>${r[0]}. ${D.stages[r[0] - 1].name}</b>`, ...r.slice(1)]), 'narrow');
H('When the raids come', true);
TBL(['Difficulty', 'Peace before the first raid', 'First bandits'], ['easy', 'medium', 'hard'].map(d => [d[0].toUpperCase() + d.slice(1), `${mins(peace[d])} minutes`, `${mins(D.peace.rogue[d])} minutes`]), 'narrow');
P('After the first, each enemy rival’s first raid comes about a minute and a quarter after the one before. The trading friend never raids.');
H('How strong the raids are', true);
P('Your decision after version 3: the Medium raids much stronger than the Easy ones, and the Hard raids the strongest. Two things make them so: how many soldiers a rival may keep (so how many it can send), and how hard each raider hits and how many blows he can take.');
{ const RP = D.raidPower || { easy: { army: 0.75, strength: 1 }, medium: { army: 1.4, strength: 1.25 }, hard: { army: 1.9, strength: 1.5 } }, cap = [3, 6, 10, 14, 18];
  TBL(['Difficulty', 'Army a rival may keep (stages 1 to 5)', 'Each raider'], ['easy', 'medium', 'hard'].map(d => [`<b>${d[0].toUpperCase() + d.slice(1)}</b>`, cap.map(c => Math.round(c * RP[d].army)).join(', '), RP[d].strength === 1 ? 'as trained' : `hits ${RP[d].strength} times as hard and takes ${RP[d].strength} times the blows`]), 'narrow'); }
P('A rival keeps two of its soldiers at home and sends the rest. Raids also come more often on harder levels (about every 5, 4 and 3 minutes).');
H('Each faction’s weakness');
TBL(['Faction', 'Exploit it by'], [['Cy Young', 'Raiding farms and food early, before the money snowballs.'], ['Ticanologue', 'Destroying the market they paid so much to build.'], ['Hekaranok', 'Killing units outright. A killed unit cannot be healed.'], ['Psychana', 'Ringing your castle with towers that spot their sneaking units.']]);

// ---------- 15 ----------
SEC('Advisor, Hints, Help, Settings and Saving', 'Help while you play, and your game kept safe.', 'sign:⚙');
H('The Art of War advisor and hints');
UL(['Always on. It cannot be turned off, even for experienced players.', 'A clear panel in a top corner that does not cover play.', 'Timely tips in the spirit of Sun Tzu’s <i>The Art of War</i>: take the high ground, set a trap, build a tower here, and where raiders are coming from.',
  'Short gameplay hints share the same panel and the same voice, one at a time. They are compact and unobtrusive, especially on phones.', `One tap puts a tip or a hint away. The next one comes later. ${NEW}`]);
H('The Help screen', true);
P(`Tap the <b>?</b> at the top (or press H) and Help opens with a <b>search box</b> and a <b>Topics</b> drop-down that lists every category. ${NEW} On a computer the search box is ready to type in straight away.`);
UL(['<b>Search:</b> type what you need in plain words (“how do I get stone?”). The answers appear as you type: first the short Help articles, then the matching parts of this guide, under “In the Master Guide”. Spelling slips are forgiven.',
  '<b>Topics:</b> pick a category from the drop-down (or from the cards below it). <b>The Master Guide</b> is one of them: all of this guide, section by section, inside the game.',
  `There are ${D.helpCount || 93} short articles, each with a picture, plus the whole of this guide. (The “What is this?” button the boxes used to carry was taken off at your word.) ${NEW}`, 'Reading Help pauses the game (unless enemies are close). A double tap on Help’s text, the X, or Esc closes it.']);
FIG2([shot('helpDrop') || shot('helpHome'), 'Help as it opens: the search box and the Topics drop-down.'], [shot('helpSearch'), 'A search for “stone”: Help answers first, then the guide.']);
FIG2([shot('helpArticle'), 'A Help article: calling citizens.'], [shot('helpGuide'), 'A part of this guide, inside Help.']);
H('Settings');
UL(['The settings icon (a gear) replaces the word “Menu”. The question mark opens Help. Quit Game is inside Settings.', 'Music starts at a low volume with sliders for music and effects. Voice, weather, outlines, trees (detailed or simple) and the view (3D or flat) are switched here.',
  `The Fix button is no longer in Settings or over people. A stuck building is mended from its own box (Remove &amp; rebuild). ${FIXED}`]);
FIG(shot('settings'), 'Settings, photographed in the game.', 60);
H('Saving your game');
UL(['You can name each save, keep several, see a list with the name and the date and time, load one, or delete one. There is also an automatic save every few minutes.',
  `You can also keep a save as a <b>file</b> on your device and load it again later, even on another device. The front page has a button to load a saved game. ${NEW}`,
  'A save keeps everything: the map and fog of war, your faction and every rival, buildings and how they have grown, every person and soldier, stars and education, resources, your castle stage, patrols and rally flags, filled moats, spikes, and fires and repairs in progress.',
  `It also keeps the wars you have won lately, the raids under way, formations and the town’s mourning. ${NEW}`, 'Save and Load are inside Settings.']);
FIG(shot('saves'), 'The saved games, at the bottom of Settings, photographed in the game.', 72);

// ---------- 16 ----------
SEC('Glossary and Search Words', 'The same words the in-game Help search will understand.', 'sign:Aa');
{ const G = [['Abbey', 'Healing and happiness building. Stronger for Hekaranok.'], ['Alehouse', 'One worker. Sells ale. Stage 1.'], ['Archer', 'Ranged soldier. Stage 1.'], ['Ballista', 'Bolt thrower. Stage 3. On towers, sees as far as a longbowman.'],
    ['Bakery', 'Five per mill, 3 people each.'], ['Bell', 'Recalls Hekaranok’s healing units.'], ['Berserker', 'Wild fighter. Stage 3. Every faction.'], ['Campfire', 'Where idle citizens go.'], ['Catapult', 'Siege stone thrower. Stage 4.'],
    [`Citizen button ${NEW}`, 'Town list. Calls one more citizen for food and gold.'], ['Citizens', 'Your workers. Replace them when killed.'], ['Crossbowman', 'Ranged. Stage 3.'], [`Diamond ${NEW}`, 'The troop controls, bottom left.'], ['Education', 'School upgrades for people and soldiers.'],
    ['Engineer', 'Fast repair; builds trebuchets.'], ['Escort', 'Soldiers who protect work groups.'], [`Export ${NEW}`, 'Keep a saved game as a file.'], ['Feast', 'Costly, never automatic. Stage 3.'], ['Fire', 'Citizens fetch water; 10 seconds burns half.'],
    ['Flamethrower', 'Squad of 10. Stage 4. Attack only.'], [`Flat view ${NEW}`, 'Seen from straight above. Key V.'], ['Fog of war', 'Unexplored ground is hidden.'], [`Formation ${NEW}`, 'The shape a group marches in.'], ['Gate', 'Intentional opening in a wall.'],
    [`General ${NEW}`, `A soldier with ${CC.general.stars} or more stars; five-star at ${CC.general.fiveStar || 10}.`], ['Granary', 'Stores food. Expands at stage 3.'], ['Guard', 'Command: defend an area.'], ['Help (?)', 'Search keywords or activities.'], ['Keep', 'Your heart. Lose it and you lose.'],
    ['Knight', 'Foot at stage 3, mounted at stage 4.'], ['Longbowman', 'Twice the sight. Stage 2.'], ['Market', 'Trade. Stage 3.'], ['Mill', 'Feeds five bakeries.'], ['Moat', 'Barrier. Citizens, spearmen, swordsmen, flamethrowers fill it; it becomes ground.'],
    [`Mourning ${NEW}`, 'Two minutes of sorrow after deaths.'], ['Patrol', 'Draw a route soldiers repeat.'], [`Peace time ${NEW}`, '10 minutes (5 on Hard) before the first raid.'], ['People tab', 'The face on the diamond. All people at a glance.'], ['Quarry', 'Stone. Stage 2. Max two.'],
    ['Rally flag', 'Where new units gather.'], ['Repair', 'Automatic. Rebuild takes twice as long.'], ['Save', 'Named saves in Settings.'], ['School', 'Education. Stage 3.'], ['Spikes', 'Lethal to enemies.'], ['Stable', 'Horses and oxen. Stage 3.'],
    ['Stage', 'One of five castle levels.'], ['Star', 'Veteran mark. Each makes him stronger.'], ['Tavern', 'Stage 2. People rest here.'], ['Taxes', 'More gold, less happiness.'], ['Trebuchet', 'Stage 5 siege.'], ['Trophy', 'Shows what the next stage needs.'],
    [`Victory ${NEW}`, 'The banner for a war won.'], [`War won ${NEW}`, 'A raid beaten off, or a rival defeated.'], ['Wheat field', 'Up to 10 workers.'], ['Wood yard', 'Wood and iron building.']];
  const half = Math.ceil(G.length / 2), rows = []; for (let i = 0; i < half; i++) rows.push([`<b>${G[i][0]}</b>`, G[i][1], G[i + half] ? `<b>${G[i + half][0]}</b>` : '', G[i + half] ? G[i + half][1] : '']);
  TBL(['Word', 'Meaning', 'Word', 'Meaning'], rows, 'gloss'); }

// ---------- 17 ----------
SEC('Still Open', 'Things still waiting on you, and things still being finished.', 'sign:✎');
H('Waiting on your decision');
TBL(['Item', 'What the game does now', 'Your call'], [
  [`People in a field ${NEW}`, `A field holds ${FG.field.staff}, a farm ${FG.farm.staff} (your last word: “the field can have 10, the farm can have 5”; you also said up to five in one field).`, 'Is ten for a field right?'],
  [`The guard’s cost ${NEW}`, `Reserve: ${FG.guard.gold} gold and a place in your houses (Claude’s suggestion). You said the guard “comes with these buildings”.`, 'Should he be free, like a tower’s door knight?'],
  [`Turkeys and sheep ${NEW}`, 'Kept as farm choices beside your four, because the feast needs them.', 'Keep them, or change the feast?'],
  [`Vineyard, orchard, hop farm ${NEW}`, 'Kept as they were. The field grows grapes too now.', 'Keep the vineyard, or let the field do it?'],
  [`Farm levels, well and lookout ${NEW}`, `Level 2 after ${Math.round(((FG.farm.levels || [])[1] || { after: 360 }).after / 60)} minutes of work, level 3 after ${Math.round(((FG.farm.levels || [])[2] || { after: 900 }).after / 60)} with a stable. Well ${FG.well.wood} wood (+25%), lookout ${FG.lookout.wood} wood (Claude’s numbers).`, 'Do these suit?'],
  [`The five-star general ${NEW}`, `${CC.general.stars} stars: a general. ${CC.general.fiveStar || 10} stars: a five-star general (Claude’s reading of your answer). Both count the same toward calling citizens.`, 'Is that right? Should a five-star general count for more?'],
  [`Raid strength: the numbers ${NEW}`, (RP => `Easy: armies ${RP.easy.army} of the base number, raiders as trained. Medium: armies ${RP.medium.army} of it, each raider ${RP.medium.strength} times as strong. Hard: armies ${RP.hard.army} of it, each raider ${RP.hard.strength} times as strong (section 14).`)(D.raidPower || { easy: { army: 0.75 }, medium: { army: 1.4, strength: 1.25 }, hard: { army: 1.9, strength: 1.5 } }), 'Keep, or tune?']]);
H('Numbers Claude Code proposed');
P('These are in the current build. You can accept them or change them, and each is one line in the settings file.');
TBL(['Item', 'Current build value'], [['Tower ballista', '400 gold, 150 wood (you agreed; it can change)'], ['Tower trebuchet', '800 gold, 300 wood, 100 stone'], ['Market', 'Buy at 2.5 times, sell at 1.2 times. School level 2: 2 and 1.5. Level 3: 1.8 and 1.6.'],
  ['Wood huts', 'Stage 1: 4 huts of 2 people. Stage 2: 3 yards of 5 people.'], ['Winning', 'Every rival who is against you has lost his keep. The trading friend does not have to fall.'], ['Mill', 'Comes at stage 2 so the two-mills-before-stage-3 rule can apply.'], ['Macemen', 'Stage 3, with swordsmen.']]);
H('Decided since version 2');
TBL(['Item', 'Your decision, now in the game'], [['Moat fillers', 'Citizens, spearmen, swordsmen and flamethrowers. Never knights or anyone on a horse.'], ['Spikes', 'One strike kills, except knights, berserkers and mounted knights (two).'],
  ['Peace time', `${mins(peace.easy)} minutes, ${mins(peace.hard)} on Hard.`], ['Calling citizens', 'Back in the Town list, with happiness, wars won and generals balancing the cost.'], ['Fix button', 'The one over people: taken out. Remove &amp; rebuild stays in every building’s box.'], ['Double-click', 'Opens the person’s box.'],
  ['Troop controls', 'The diamond at the bottom left, with formations, patrol, guard and add.'], ['Boxes', 'One tap puts hints away; a double tap closes any box.'],
  [`Berserkers ${NEW}`, 'Every faction has them. Psychana’s power fits theirs: in small bands they move unseen.'], [`Raids ${NEW}`, 'Medium much stronger than Easy; Hard the strongest.'],
  [`Generals ${NEW}`, `${CC.general.stars} or more stars; a five-star general at ${CC.general.fiveStar || 10}.`], [`Wars won ${NEW}`, 'A raid where at least 6 in 10 raiders fell and your keep stands, or a rival defeated. Each counts for 10 minutes, up to 3 at once.'],
  [`Calling citizens: the numbers ${NEW}`, 'As in section 11.'], [`The diamond ${NEW}`, 'The arrows direct which way to go. Add puts more soldiers in the formation, and soldiers trained while it is on join it.'],
  [`Field and farm ${NEW}`, `Two separate buildings. Field: up to ${FG.field.max}, wheat (fastest), corn, grapes (slowest), you choose the people on each. Farm: up to ${FG.farm.max}, chickens, cows, pigs, ducks, seen in the pen; it gets better with a stable.`],
  [`Selling animals ${NEW}`, 'Farm animals always sell for the top price, far more than crops.'], [`Guards ${NEW}`, `A knight’s strength whether or not knights can be trained: ${FG.guard.field} for a field, ${FG.guard.farm} for a farm.`],
  [`Happy people, more food ${NEW}`, 'Food grows faster when people are happy.'], [`Walking ${NEW}`, 'No glitching near the greenery or among people: they go round.'], [`“What is this?” ${NEW}`, 'Taken off the boxes.']]);
H('Still being finished');
UL(['Higher-resolution art: the pictures of units and buildings here are the game’s own small pictures. Sheet-quality art for the newer soldiers is listed in design/MISSING-ART.md and design/IMAGE-PROMPTS.md.',
  'All remaining stand-in art in the game is being finished.', 'The bug sweep goes on with every phase. Tell Claude Code anything that looks wrong, with where it happened.',
  `Pictures of the game screens and boxes, and of the keep, were missing from version 2. They are in this version. ${NEW}`]);

// ================================================================ the page, the paginator, the PDF
const cover = `<div class="page cover"><div class="fr1"></div><div class="fr2"></div><div class="cin">
  <h1 class="ct">STRONGHOLD<br>DESTROYER</h1><div class="cs">The Master Guide and Picture Manual</div><div class="cv">Version 3</div><div class="cg">Gameplay, rules and help, all in one place</div>
  <div class="cem">${(J.emblems || []).map(e => `<div><img src="${e.pic}"><span>${esc(e.name)}</span></div>`).join('')}</div>
  <div class="cstrip">${['spear', 'archer', 'archer.longbow', 'sword', 'knight', 'catapult', 'ballista', 'trebuchet'].map(k => `<img src="${U(k)}">`).join('')}</div>
  <img class="cscene" src="${art('cover-scene')}"><div class="cfor">Prepared for Gerald Malone<br>${DATE}</div></div></div>`;
const tocPage = `<div class="page"><div class="fr1"></div><div class="fr2"></div><div class="hdr"><span>STRONGHOLD DESTROYER</span><span>Contents</span></div><div class="body"><div class="sech"><div class="sico gem">◆</div><h1>Contents</h1></div><div id="toc"></div></div><div class="pno"><span>2</span></div></div>`;
const CSS = `@page{size:8.5in 11in;margin:0} *{box-sizing:border-box} html,body{margin:0;padding:0;background:#1a120b}
body{font-family:'DejaVu Serif',Georgia,serif;color:#f2e6c9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:8.5in;height:11in;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#33241a 0%,#261a11 70%,#1f150d 100%);page-break-after:always;break-after:page}
.fr1{position:absolute;inset:0.22in;border:2.5px solid #c9a24a;border-radius:2px} .fr2{position:absolute;inset:0.3in;border:1px solid #c9a24a}
.fr2::before,.fr2::after{content:'';position:absolute;width:26px;height:26px;border:2px solid #e2c06a} .fr2::before{left:6px;top:6px;border-right:0;border-bottom:0} .fr2::after{right:6px;bottom:6px;border-left:0;border-top:0}
.hdr{position:absolute;left:0.42in;right:0.42in;top:0.36in;display:flex;justify-content:space-between;font-style:italic;font-size:12px;color:#d8b65e;border-bottom:1px solid #8a6d2c;padding-bottom:3px;letter-spacing:.3px}
.body{position:absolute;left:0.62in;right:0.62in;top:0.72in;height:9.5in;overflow:hidden}
.pno{position:absolute;left:0;right:0;bottom:0.15in;text-align:center} .pno span{display:inline-block;width:34px;height:34px;line-height:34px;transform:rotate(45deg);border:1.5px solid #c9a24a;background:#2a1d12;font-size:13px;color:#e8cf8a;font-weight:bold}
.pno span>b{display:inline-block;transform:rotate(-45deg)}
.sech{display:flex;align-items:center;gap:14px;margin:6px 0 4px} .sico{flex:0 0 62px;height:62px;border-radius:50%;border:2.5px solid #c9a24a;background:#f1e7d3;overflow:hidden;display:flex;align-items:center;justify-content:center}
.sico img{width:100%;height:100%;object-fit:cover} .sico.gem{background:#2a1d12;color:#e2c06a;font-size:28px;font-family:'DejaVu Sans','DejaVu Sans Mono','FreeSerif',sans-serif;font-weight:bold}
h1{font-size:30px;line-height:1.15;color:#ecc964;margin:0;font-weight:bold} p.sub{font-style:italic;color:#d9c39a;font-size:16.5px;margin:2px 0 12px;line-height:1.4}
h3{font-size:21px;color:#ecc964;margin:16px 0 7px;line-height:1.25} h4.tcap{font-size:17px;color:#e8cf8a;margin:10px 0 5px;font-style:italic}
p{font-size:16px;line-height:1.45;margin:0 0 10px}
ul.dl{list-style:none;padding:0;margin:0 0 10px} ul.dl li{position:relative;padding-left:22px;font-size:16px;line-height:1.42;margin:0 0 6px} ul.dl li::before{content:'◆';position:absolute;left:2px;top:0;color:#d9ae4a;font-size:12px}
b{color:#fff3d6}
.new{display:inline-block;background:#e2b13c;color:#1b1209;font:bold 11px 'DejaVu Sans',Arial,sans-serif;letter-spacing:.6px;padding:2px 6px 1px;border-radius:3px;vertical-align:2px;margin:0 2px}
.new.fx{background:#7fc4d8}
table.tbl{width:100%;border-collapse:collapse;margin:4px 0 12px;font-size:15px;line-height:1.36} .tbl th{background:#d7a93f;color:#1d140a;text-align:left;padding:6px 8px;font-size:15px;border:1px solid #9c7a2e}
.tbl td{border:1px solid #7d6331;padding:6px 8px;vertical-align:top;background:rgba(40,28,18,.55)} .tbl td:first-child{font-weight:bold;color:#fff0cc}
.tbl.narrow{width:auto;min-width:60%} .tbl.needs td,.tbl.needs th{text-align:center;padding:5px 6px} .tbl.needs td:first-child,.tbl.needs td:last-child{text-align:left} .tbl.needs td:last-child{font-size:13.5px}
.tbl.dia td:first-child{text-align:center;width:46px} .tbl.gloss{font-size:14px} .tbl.gloss td{padding:4px 6px} .tbl.gloss td:nth-child(3){font-weight:bold;color:#fff0cc} .tbl.diff td:first-child{font-weight:normal;color:#e9d8b4}
figure{margin:6px auto 14px;text-align:center} figure img{max-width:100%;max-height:6.4in;border:2px solid #b8913f;border-radius:8px;display:block;margin:0 auto;background:#000}
figcaption{font-size:14px;font-style:italic;color:#d9c39a;margin-top:5px;line-height:1.35}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:4px 0 8px} .two figure{width:100%;margin:0} .two figure img{max-height:4.6in}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:2px 0 8px} .three figure{margin:0} .three figcaption{font-size:13px;font-style:normal}
.sheet{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:0 0 8px} .sheet figure{margin:0} .sheet img{background:#efe6d2} .sheet figcaption{font-size:12.5px;font-style:normal}
.mkwrap{position:relative;display:block} .mkwrap img{width:100%} .mk{position:absolute;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:#e2b13c;color:#1b1209;font:bold 16px 'DejaVu Sans',Arial,sans-serif;line-height:26px;text-align:center;border:2px solid #fff3d6;box-shadow:0 1px 4px #000}
ol.lg{margin:0 0 10px;padding-left:4px;list-style:none;columns:2;column-gap:22px} ol.lg li{font-size:14.5px;line-height:1.35;margin:0 0 5px;break-inside:avoid}
.card{display:flex;gap:14px;border:1.5px solid #c9a24a;border-radius:10px;padding:10px 12px;margin:0 0 10px;background:rgba(52,37,24,.75)}
.cpic{flex:0 0 112px;height:112px;background:#efe6d2;border:1.5px solid #b8913f;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center} .cpic img{max-width:100%;max-height:100%}
.ctxt{flex:1} .ctxt h4{margin:0;font-size:19px;color:#ecc964} .cl{font-style:italic;color:#e3c27a;font-size:14px;margin:1px 0 5px} .ctxt ul.dl li{font-size:15px;margin-bottom:4px}
.minis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 10px} .mini{display:flex;gap:10px;border:1.5px solid #9c7a2e;border-radius:8px;padding:8px;background:rgba(52,37,24,.7)}
.mpic{flex:0 0 76px;height:76px;background:#efe6d2;border:1px solid #b8913f;border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden} .mpic img{max-width:100%;max-height:100%}
.mini h5{margin:0;font-size:16.5px;color:#ecc964} .mini p{font-size:14.5px;line-height:1.35;margin:2px 0 0} .mini .cl{font-size:13px;margin:0}
.note{border:2px solid #e2b13c;border-radius:10px;padding:10px 14px;margin:6px 0 12px;background:rgba(90,64,24,.45);font-size:16px;line-height:1.45}
.chains{margin:2px 0 12px} .chain{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px} .lk{border:1.5px solid #c9a24a;border-radius:6px;padding:5px 9px;font-size:14.5px;background:rgba(52,37,24,.8)} .ar{color:#e2b13c;font-size:18px}
.pbk{height:0}
#toc{margin-top:16px} .tr{display:flex;align-items:baseline;font-size:18px;margin:0 0 7px} .tr .tt{white-space:nowrap} .tr .dots{flex:1;border-bottom:2px dotted #8a6d2c;margin:0 8px;transform:translateY(-4px)} .tr .pn{color:#ecc964;font-weight:bold}
.tr.sub{font-size:15px;margin:-2px 0 6px 34px;color:#e3c27a}
.cover .cin{position:absolute;inset:0.55in;display:flex;flex-direction:column;align-items:center;text-align:center}
.ct{font-size:58px;letter-spacing:2px;line-height:1.08;margin-top:22px} .cs{font-size:25px;font-style:italic;font-weight:bold;color:#e2c06a;margin-top:12px} .cv{font-size:22px;color:#fff3d6;margin-top:6px;font-weight:bold;letter-spacing:3px;border:2px solid #e2b13c;padding:3px 18px;border-radius:4px}
.cg{font-size:17px;margin-top:10px;color:#e9d8b4} .cem{display:flex;gap:22px;margin-top:20px} .cem div{display:flex;flex-direction:column;align-items:center;font-size:13px;color:#d9c39a} .cem img{width:104px;height:120px;object-fit:contain}
.cstrip{display:flex;gap:6px;margin-top:16px} .cstrip img{width:64px;height:64px;background:#efe6d2;border:1.5px solid #b8913f;border-radius:4px;object-fit:contain}
.cscene{width:4.4in;margin-top:16px;border:2px solid #b8913f;border-radius:6px} .cfor{margin-top:14px;font-size:16px;line-height:1.5}`;
const exporter = `(() => {
  const SECPIC = { read: 'i:book', s1: 'i:start', s2: 'i:book', s3: 'i:crown', s4: 'i:trophy', s5: 'i:diamond', s6: 'u:spear', s7: 'b:gtower', s8: 'b:house', s9: 'w:sword', s10: 'i:coins', s11: 'u:civ', s12: 'i:fire', s13: 'i:map', s14: 'i:raid', s15: 'i:gear', s16: 'i:book', s17: 'i:book' };
  const slug = t => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const tidy = el => { const c = el.cloneNode(true); c.querySelectorAll('img,figure,.cpic,.mpic').forEach(x => x.remove()); c.querySelectorAll('*').forEach(x => { x.removeAttribute('style'); x.removeAttribute('id'); if (!(x.tagName === 'SPAN' && x.classList.contains('new'))) x.removeAttribute('class'); });
    return c.innerHTML.replace(/\\s+/g, ' ').trim(); };
  const plain = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\\s+/g, ' ').trim();
  const out = { sections: [], articles: [] }; let sec = null, art = null, host = null; const used = new Set();   /* (host: the heading a run of cards sits under) */
  const newArt = (title, pic) => { let id = 'g-' + sec.id.replace(/^s/, '') + '-' + slug(plain(title).replace(/\\s*(NEW|CORRECTED)\\s*$/, '')); while (used.has(id)) id += 'x'; used.add(id); art = { id, cat: 'guide', sec: sec.id, secTitle: sec.title, title: plain(title).replace(/\\s*(NEW|CORRECTED)\\s*$/, ''), pic: pic || SECPIC[sec.id] || 'i:book', blocks: [] }; out.articles.push(art); return art; };
  for (const el of document.getElementById('src').children) {
    if (el.classList.contains('sech')) { sec = { id: el.id, title: el.dataset.sec }; out.sections.push(sec); newArt(el.id === 'read' ? 'How to read this guide' : el.dataset.sec.replace(/^\\d+\\.\\s*/, '')); host = art; continue; }
    if (!sec) continue;
    if (el.classList.contains('sub') && el.tagName === 'P') { art.blocks.push({ t: 'p', h: '<i>' + tidy(el) + '</i>' }); continue; }
    if (el.tagName === 'H3') { newArt(tidy(el)); host = art; continue; }
    if (el.classList.contains('tcap')) { art.blocks.push({ t: 'h', h: tidy(el) }); continue; }
    if (el.tagName === 'P' || el.classList.contains('note')) { const h = tidy(el); if (h) art.blocks.push({ t: 'p', h }); continue; }
    if (el.tagName === 'UL' || el.tagName === 'OL') { art.blocks.push({ t: 'ul', items: [...el.children].map(tidy) }); continue; }
    if (el.tagName === 'TABLE') { art.blocks.push({ t: 'table', head: [...el.tHead.rows[0].cells].map(tidy), rows: [...el.tBodies[0].rows].map(r => [...r.cells].map(tidy)) }); continue; }
    if (el.classList.contains('card')) { const a = newArt(el.querySelector('h4').innerHTML, el.dataset.key || null); a.parent = host.title;
      a.blocks.push({ t: 'line', h: tidy(el.querySelector('.cl')) }, { t: 'ul', items: [...el.querySelectorAll('.ctxt li')].map(tidy) }); art = host; continue; }   /* (what follows a card belongs to the heading, not to the card) */
    if (el.classList.contains('minis')) { const last = art.blocks[art.blocks.length - 1], items = [...el.querySelectorAll('.mini')].map(m => ({ pic: m.dataset.key || '', n: tidy(m.querySelector('h5')), line: m.querySelector('.cl') ? tidy(m.querySelector('.cl')) : '', d: tidy(m.querySelector('p')) }));
      if (last && last.t === 'cards') last.items.push(...items); else art.blocks.push({ t: 'cards', items }); continue; }
    if (el.classList.contains('chains')) { for (const c of el.querySelectorAll('.chain')) art.blocks.push({ t: 'p', h: [...c.querySelectorAll('.lk')].map(tidy).join(' → ') }); continue; }
    if (el.tagName === 'FIGURE' || el.classList.contains('two') || el.classList.contains('three') || el.classList.contains('sheet') || el.classList.contains('pbk')) continue;
  }
  out.articles = out.articles.filter(a => a.blocks.length);
  for (const a of out.articles) { const first = a.blocks.find(b => b.t !== 'h'); const t = !first ? '' : first.t === 'ul' ? plain(first.items[0] || '') : first.t === 'cards' ? first.items.map(i => plain(i.n)).join(', ') : first.t === 'table' ? first.rows.slice(0, 3).map(r => plain(r[0])).filter(Boolean).join(', ') + '…' : plain(first.h);
    a.summary = t.length > 110 ? t.slice(0, 107).replace(/\\s+\\S*$/, '') + '…' : t; }
  return out;
})();`;
const pager = `(() => {
  const src = document.getElementById('src'), book = document.getElementById('book'), blocks = [...src.children];
  const tpl = n => { const d = document.createElement('div'); d.className = 'page'; d.innerHTML = '<div class="fr1"></div><div class="fr2"></div><div class="hdr"><span>STRONGHOLD DESTROYER</span><span class="hs"></span></div><div class="body"></div><div class="pno"><span><b>' + n + '</b></span></div>'; return d; };
  let pageNo = 2, cur = null, curPage = null, sec = '';
  const where = {};
  const newPage = () => { pageNo++; curPage = tpl(pageNo); book.appendChild(curPage); cur = curPage.querySelector('.body'); curPage.querySelector('.hs').textContent = sec; };
  const bottom = () => cur.getBoundingClientRect().bottom;
  const used = () => { const l = cur.lastElementChild; return l ? l.getBoundingClientRect().bottom + parseFloat(getComputedStyle(l).marginBottom || 0) - cur.getBoundingClientRect().top : 0; };
  const left = () => cur.clientHeight - used();
  const fits = el => el.getBoundingClientRect().bottom <= bottom() + 0.5;
  const shrinkToFit = el => { for (const im of el.querySelectorAll('img')) { let h = im.getBoundingClientRect().height; while (!fits(el) && h > 120) { h *= 0.9; im.style.maxHeight = h + 'px'; im.style.width = 'auto'; } } };
  newPage();
  const isHead = e => e && (e.tagName === 'H3' || e.classList.contains('tcap') || e.classList.contains('sech') || (e.classList.contains('sub') && e.previousElementSibling && e.previousElementSibling.classList.contains('sech')));
  // headings left at the foot of a page go over with what follows them
  const carry = () => { const out = []; let e = cur.lastElementChild; while (isHead(e)) { out.unshift(e); e = e.previousElementSibling; } if (out.length === cur.children.length) return []; out.forEach(x => x.remove()); return out; };
  const moveOn = () => { const c = carry(); newPage(); for (const x of c) { cur.appendChild(x); if (x.id) where[x.id] = pageNo; } };
  const imgs = el => [...el.querySelectorAll('img')];
  const shrink = (el, minFrac) => { const l = imgs(el), h0 = l.map(im => im.getBoundingClientRect().height); let f = 1; while (!fits(el) && f > minFrac) { f *= 0.95; l.forEach((im, k) => { im.style.maxHeight = (h0[k] * f) + 'px'; im.style.width = 'auto'; }); } };   /* (pictures side by side shrink together) */
  const unshrink = el => { for (const im of imgs(el)) { im.style.maxHeight = ''; im.style.width = ''; } };
  for (let i = 0; i < blocks.length; i++) {
    const el = blocks[i];
    if (el.classList.contains('pb') && cur.children.length) newPage();
    if (el.classList.contains('pbk')) continue;
    const head = el.classList.contains('sech'), sub = el.tagName === 'H3' || el.classList.contains('tcap');
    if (head && cur.children.length && left() < 300) newPage();
    if (sub && cur.children.length && left() < 190) newPage();
    const room = left();
    cur.appendChild(el);
    if (fits(el)) { if (el.id) where[el.id] = pageNo; continue; }
    // tables and lists go on, row by row, with the table's heading repeated
    const splittable = (el.tagName === 'TABLE' && el.tBodies[0].rows.length > 1) || (el.tagName === 'UL' && el.children.length > 1);
    if (splittable && room > 110) {
      const items = el.tagName === 'TABLE' ? [...el.tBodies[0].rows] : [...el.children];
      const shell = () => { const c = el.cloneNode(false); if (el.tagName === 'TABLE') { c.appendChild(el.tHead.cloneNode(true)); c.appendChild(document.createElement('tbody')); } return c; };
      const holder = c => el.tagName === 'TABLE' ? c.tBodies[0] : c;
      el.remove(); let part = shell(); cur.appendChild(part);
      for (const it of items) { holder(part).appendChild(it); if (!fits(part)) { holder(part).removeChild(it); if (!holder(part).children.length) { part.remove(); moveOn(); } else newPage(); part = shell(); cur.appendChild(part); holder(part).appendChild(it); } }
      continue;
    }
    // a picture that nearly fits is made a little smaller rather than leave much of the page empty
    if (imgs(el).length && room > 280) { shrink(el, 0.6); if (fits(el)) { if (el.id) where[el.id] = pageNo; continue; } unshrink(el); }
    el.remove();
    if (cur.children.length) moveOn();
    cur.appendChild(el); if (el.id) where[el.id] = pageNo;
    if (!fits(el)) shrink(el, 0.3);
  }
  // each page's heading names the section it ends in (or the one carried over)
  { let run = ''; for (const pg of book.querySelectorAll('.page')) { const hs = pg.querySelectorAll('.body .sech'); if (hs.length) run = hs[hs.length - 1].dataset.sec; pg.querySelector('.hs').textContent = run; } }
  // the contents
  const toc = document.getElementById('toc');
  for (const el of document.querySelectorAll('[data-toc]')) { const id = el.id; const r = document.createElement('div'); r.className = 'tr' + (el.dataset.sub ? ' sub' : '');
    r.innerHTML = '<span class="tt">' + el.dataset.toc + (el.dataset.sub ? ' <span class="new">NEW</span>' : '') + '</span><span class="dots"></span><span class="pn">' + (where[id] || '?') + '</span>'; toc.appendChild(r); }
  window.__pages = pageNo; window.__where = where;
})();`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Stronghold Destroyer — Master Guide version 3</title><style>${CSS}</style></head><body>
${cover}${tocPage}<div id="book"></div><div id="src" style="position:absolute;left:-9999px;width:7.26in">${blocks.join('\n')}</div><script>window.__guide = ${exporter}</script><script>${pager}</script></body></html>`;

(async () => {
  const tmp = path.join(CACHE, 'guide3.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 900, height: 1100 } });
  pg.on('pageerror', e => warn.push('page error: ' + e.message));
  await pg.goto('file://' + tmp, { waitUntil: 'load' }); await pg.waitForTimeout(800);
  const info = await pg.evaluate(() => ({ pages: window.__pages, where: window.__where, missing: [...document.querySelectorAll('.tr .pn')].filter(e => e.textContent === '?').length,
    toc: [...document.querySelectorAll('.tr')].length, srcLeft: document.getElementById('src').children.length }));
  const guide = await pg.evaluate(() => window.__guide);
  // the whole guide for the Help screen: js/guidedata.js (made here; do not edit it by hand)
  fs.writeFileSync(path.join(ROOT, 'js/guidedata.js'), "'use strict';\n// Stronghold Destroyer — the Master Guide, word for word, for the Help screen (its topic \"The Master Guide\" and its search).\n" +
    `// Made by tools/master_guide.js from the same pages as design/Stronghold-Destroyer-Master-Guide-v3.pdf (${DATE}). Do not edit by hand:\n// change the guide's words in tools/master_guide.js and run it again. The pictures come from the game (u:, b:, r:, w:, i: names).\n` +
    'const GUIDE_DATA = ' + JSON.stringify({ made: DATE, sections: guide.sections, articles: guide.articles }) + ';\n');
  console.log('guide for Help:', guide.sections.length, 'sections,', guide.articles.length, 'parts,', (fs.statSync(path.join(ROOT, 'js/guidedata.js')).size / 1024).toFixed(0) + ' KB');
  await pg.evaluate(() => document.getElementById('src').remove());
  await pg.pdf({ path: OUT, width: '8.5in', height: '11in', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' }, preferCSSPageSize: true });
  await b.close();
  console.log('written', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB', 'pages', info.pages, 'contents rows', info.toc, 'unnumbered', info.missing, 'blocks left over', info.srcLeft);
  console.log('warnings', warn);
})();
