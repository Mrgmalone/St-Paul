# Stronghold Destroyer — design notes for later

## Multiplayer (not built yet)

Gerald's rules for pausing when multiplayer is added:

- A pause in multiplayer needs **both sides to agree**.
- **No pausing during war** (while enemies are engaged or close by).
- In single player today, the game pauses on its own while a menu is being read
  (Help, Menu, mood report, goods list, building panels), unless enemies are close.

## Phase 4A: the four factions and the five castle stages (branch upgrade-v2)

Every number below lives in one file, `js/settings.js` (FACTIONS, STAGES, ECONOMY, RIVALS, ROGUES), so renaming or
tuning is done there.

**Factions (front page, four side by side)**
- Cy Young (bread makers): bakeries make 4.5x the bread; food above 200 is sold every 10 seconds, 3 gold per 10.
- Ticanologue (marketers): market buying prices are half (selling prices drop too where needed, so nothing can be
  bought and sold back at a profit); the market costs 3x the wood (180).
- Hekaranok (healers): room for twice the people and 10 civilians at the start; people at 65% health and 80% damage
  (the king keeps full strength); soldiers below 35% health walk home (House of Prayer if built, else the keep), heal
  12 a second (1.5x at the House of Prayer) and walk back to the exact spot; a Bell button calls every soldier home.
- Psychana (sight and stealth): every unit notices enemies at 240 (others 110); berserker bands of fewer than 10 are
  not drawn and not targeted unless within 300 of a tower or palisade tower that stands within 700 of its castle.
- Everyone starts with the king on foot, the civilians (5, Hekaranok 10), the shack and palisade, 100 food (Hekaranok
  120) and 80 wood. No soldiers for anyone.

**Stages** (the castle grows by itself; stone and iron are spent, the rest only checked)

| Into stage | People | Happiness | Food | Stone | Iron | Buildings |
|---|---|---|---|---|---|---|
| 2 Homestead | 12 | 50 | 150 | – | – | 3 houses, 1 woodcutter's hut, 1 farm or wheat field |
| 3 Hold | 22 | 55 | 300 | 150 | – | 5 houses, 1 quarry, 1 tavern |
| 4 Castle | 35 | 60 | 500 | 300 | 80 | blacksmith, market, mill, bakery |
| 5 Stronghold | 50 | 65 | 800 | 500 | 200 | 2 stone towers (stand-in until the school) |

Ground grows 2, 3, 2, 3 squares each direction; ring wall wood, brick, stone, thick stone; keep 1500, 2200, 3200, 4500,
6500. Wages per minute: spearman and archer 1, swordsman and maceman 2, knight 4, ballista and ram 2, catapult 3,
trebuchet 4; unpaid soldiers cost 8 happiness. Taxes x1, 1.2, 1.4, 1.7, 2 by stage.

**Rivals**: four, one per faction, at fixed sites (north-east, east, south-east, south); one (never your faction) is a
trading friend at random. Same stages and needs as you (happiness assumed met). They gather and build visibly; finished
buildings also yield each minute. First raid after 10, 7.5 or 5.5 minutes (Easy, Medium, Hard), 75 seconds later for each
next rival; then every 5, 4 or about 3 minutes each; at least 4 soldiers; siege engines only with 12 or more. A rival
falls when its keep falls; you win when every hostile rival has fallen.

**Waiting for a real building or unit (Phase 4B)**: the mill's five bakeries (any bakery counts now), the abbey (House
of Prayer stands in), longbowmen (Psychana's sight uses 240 for now), berserkers (a swordsman in the berserker kit stands
in), crossbowmen, foot knights (a maceman guards a new tower's door at stage 3), the stable, the school (2 stone towers
stand in at stage 5), the Fletcher, granary expansion, engineers, escorted work groups, ladder men, flamethrowers, mobile
trebuchets, and towers coming armed at stage 5.

**Checks and speed (final 4A, play link version 48)**: all 43 checks pass; four 15-minute long games (one per faction)
with no one stuck, circling, frozen or drifting. Speed in the software 3D test (time per block of frames, lower is
faster), Phase 3 then 4A, measured turn about with nothing else running: 100 people 2,186 then 1,962; 800 people 3,873
then 3,689.

## Phase 4B: industries, citizens, soldiers, fire, fog, rivals, advisor (branch upgrade-v2)

All numbers live in `js/settings.js` (INDUSTRY, SOLDIERS) or at the top of each new file. None of this runs in the older test
game (`?testArmy=1`). Steps were built in order B1 to B8 and saved one by one.

**B1 Industries** (`js/industry.js`, `js/insidepics.js`)
- Wood yard (the Woodcutter's Hut grows): huts allowed 4, 3, 2, 1, 1 by stage, holding 2, 5, 10, 20, 25 people; extra
  huts merge into the busiest ones when the castle grows. From the Hold it is the Wood and Iron Yard: the blacksmith joins,
  40% of the people work iron by default (at the Stronghold 15 on wood, 10 on iron; More on iron / More on wood buttons),
  and wagons carry the woodcutters 1.6x faster and up to 1,100 points into the forest (a wagon and horse stand by it).
- Arrows cost 0.1 wood, bolts 1 wood; with no wood archers tip arrows with stone (80% damage, no quarry needed).
- Quarries: from the Homestead, at most 2, 10 people each. Oxen per quarry 1, 1, 2 (Castle, free), 2; each eats 2 to 5 food
  a minute; a lost ox comes from a farm, or is bought (40 food and 10 gold at the Homestead, up to 120 and 50). On foot,
  stone can be carried only from rocks within 320 points of the keep.
- Animal farm: starts with 2 cows, 2 pigs, 2 oxen, 3 chickens, 1 turkey, 1 sheep; they breed while a keeper works; bulls
  become oxen; hides give leather every 45 s. The Fletcher (was the Bowyer) needs 2 cows; 2 people. The stable (Hold) stands
  in a farm, needs 4 people and breeds a horse every 70 s (up to 8).
- Wheat fields: 5, 5, 3, 2, 2 allowed; 3, 5, 7, 10, 10 people; 2 come by themselves. Each field and farm should have a
  sentry (Post a sentry button; the alerts remind you).
- Mill (from the Homestead): 2 mills of 2 people before the Hold, then 1 mill of 3 that keeps 5 bakeries of 3 going. A miller
  grinds about 15 flour a minute; a baker makes about 6 bread a minute from 3 flour (Cy Young 4.5x).
- Granary: the keep holds 150 food, each granary 300 (800 once expanded, from the Hold: 60 wood, 40 stone). Overfull for 60 s
  brings bugs: the extra spoils 3% a second, someone falls ill every 20 s, and after 2 minutes the sickest die every 30 s.
  Rest the farms (their workers wait by the fire, no penalty) or sell food.
- Alehouse (stage 1, 1 person, brews from wheat, serves 8) and tavern (Homestead, serves 15). Price Cheap / Fair / Dear:
  mood +10 / +8 / -6 at full cover; 0.5 / 1 / 1.8 gold per ale drunk; cheap ale makes some workers drunk (half speed, 30 s).
  In wartime the price goes up half a step by itself (a little more gold, a little grumbling).
- Feast (Hold): never by itself. Needs 10 grapes (Vineyard), 10 apples (Orchard), 4 chickens, 2 turkeys, 1 cow, 1 sheep, and
  gold of at least 200 and more than all the taxes gathered this game (1.1x). +40 mood for 6 minutes, nothing upsets them,
  twice the work.
- Market: one only; prices from what goods cost to make: buy 2.5x and sell 1.2x (school level 2: 2.0x / 1.5x; level 3:
  1.8x / 1.6x); food costs the same to buy and to sell (1.5 gold each); mood still moves prices (-25% to +40%); Ticanologue
  pays half. Losing it costs 30 mood.
- School (Hold, one): 3 levels (150, 300, 600 gold; 1, 1.5, 2 minutes): each wastes 10% less material, builds 10% cheaper
  and 15% quicker; level 2 trades better. Must stand before the Stronghold. Trains engineers (40 gold; 4 per Engineer's
  Hut). Trebuchets need the Stronghold and level 3.
- Apothecary (Homestead), House of Prayer, Church (Hold), Abbey (Castle): the sick within 420 to 720 points recover where
  they are (1.5x to 3x the keep's speed) and the wounded mend; they cheer 10, 20, 35, 50 people. At the Stronghold the
  apothecary's doctor can learn more (400 gold, 2 minutes: twice as fast). Hekaranok's abbey is 1.5x stronger.
- Building boxes show a still picture of the inside (drawn in code; timber walls early, stone from the Hold).

**B2 Escorted work groups** (`js/workgroups.js`): from the Hold a yard's woodcutters go out in groups of five and each
quarry's ox cart is a group; each wants a swordsman, spearman or archer (never a flamethrower). The box shows "Group one
needs a soldier" with an Escort button; a soldier idle for a minute joins a group by himself; your own order takes him off.

**B3 Citizens** (`js/citizens.js`): citizens grow in houses (each house and the keep raise one at a time, 3 to 5 minutes,
until the houses are 85% full, since fuller counts as crowded) and cannot be bought; the killed are replaced the same way; new ones go to work by themselves; every building gets one
worker before any gets a second; jobless citizens gather within 750 points of the keep; 3 study while the school teaches.
People tab (face button, bottom left): counts, growing up, in school, work, everyone; scrolls; pauses the game. Quick tap:
the trade's icon (a soldier: name, stars, health). Hold 1 second: the person speaks and his card opens (happiness and why,
education, work, worries, earnings and tax) beside him on an iPad, sliding up from the bottom on a phone. Needs alerts
(top left) for people and industries; the most urgent is spoken. One voice for alerts and advisor (Menu: Voice on/off).

**B4 Soldiers** (`js/soldiers.js`): a star per battle survived (up to 100; bronze, silver from 10, gold from 25, pale from 50,
white at 100; +0.8% damage and +0.5% toughness each). Soldier lessons at the school: 5 levels (120 to 720 gold), numbers
hidden (+6% damage, +5% toughness a level). Longbowman (Homestead: bow + 15 gold; range 240, sees 2x), Crossbowman (Hold:
bow + 2 iron + 15 gold; 22 damage, strikes riders), Berserker (Psychana only, Hold: mace + 2 leather + 10 gold),
Flamethrowers (Castle: a squad of 10 for one foot knight's cost: sword + armor + 20 gold). Flamethrowers are fast; longbows
cannot hit them and archers do half; their fire cannot kill but their knife kills archers; they set buildings alight; they dig
a short moat when they stop in the field; a soldier filling a moat cannot be hit; they never guard or escort. Knights: on foot
from the Hold; from the Castle a knight takes a stable horse if there is one (the horse takes 180 damage first unless a
crossbow or ballista bolt hits the rider). Lookouts get a longbowman from the Homestead (range 420, two shots). Round and
Great Towers come empty: ballista 400 gold + 150 wood, trebuchet 800 gold + 300 wood + 100 stone (Stronghold and school
level 3).

**B5 Fire and repair** (`js/fire.js`): alarm (banner, bell, spoken); up to 4 citizens fetch water from the nearest Water Pot
(stage 1, 10 wood, one keeper; it holds more every 3 minutes, up to 3x) or the river, and throw it on the fire; school levels
speed this. Unfought for 10 s, half the building burns; people inside burn or flee. Damage is mended by engineers (4x the
building speed) or the building's workers or other citizens (half speed, so twice as long). A destroyed building is rebuilt
on the same spot once its cost can be paid, taking twice as long; torn-down ones are not.

**B6 Start, fog and sight** (`js/startfog.js`): you start at one of five places (the west meadow or a rival site) at random;
rivals take the other four (`?start=0..4` pins it for testing). Fog of war: land not yet seen is dark and hides rivals, their
buildings and their people (map and minimap); once seen it stays seen. Sight: citizens 220, soldiers 320, archers 360,
longbowmen 720, keep 560, towers their range + 40, a tower with a ballista 720; Psychana's soldiers see like longbowmen.
Newcomers walk in along the nearest road. The map stays 128 x 80 squares.

**B7 Rivals** (`js/rivals4b.js`): same new buildings at the same stages; citizens grow (pace by difficulty); granaries spoil;
they fight fires and mend; escorted woodcutters from the Hold; mounted knights with a stable; archers become longbowmen and
crossbowmen; one flamethrower squad with a large army; soldier lessons at their school; ballistas on their great towers; a
scout every 200 s; each raid's last leg comes from a different side; surplus wood or food traded through the friend for stone,
iron or gold every 2 minutes; trebuchets only after their school's top level.

**B8 The Art of War advisor** (`js/advisor.js`): top corner of the map, always on; every 40 s one short plain tip chosen from
what is happening (granary, fire, raids, scouting, morale, wages, escorts, school, horses); shown and spoken (urgent alerts
speak first). Our own words, no quotations.

**Proposed numbers (Gerald to confirm or change; each is one line in settings.js)**
- Yard huts at levels 1 and 2: 4 huts of 2, then 3 yards of 5.
- Tower engines: ballista 400 gold + 150 wood; trebuchet 800 gold + 300 wood + 100 stone (Gerald's 5,000 and 10,000 are far
  beyond this economy, where a town earns tens of gold a minute).
- Market: buy at 2.5x make-cost and sell at 1.2x; with school level 2, 2.0x and 1.5x; level 3, 1.8x and 1.6x.
- School levels 150 / 300 / 600 gold; soldier lessons 120 / 220 / 360 / 520 / 720 gold.
- Winning: you win when every rival lord who is against you has lost his keep; the trading friend need not fall. You lose
  if your keep falls.
- Wages unchanged from 4A, plus longbowman 1, crossbowman 2, flamethrower 1 each, berserker 2. Taxes unchanged.
- Spellings of the faction names unchanged (Cy Young, Ticanologue, Hekaranok, Psychana).

**Conflicts found and how they were settled**
- The mill: "at stage 3 one mill with 5 bakeries" but also "before stage 3, two mills of two". The mill now opens at the
  Homestead (stage 2) so the early rule can apply; bakeries stay at the Hold.
- Trebuchets appear twice (a siege engine you train, and a tower weapon). Both now need the Stronghold and the school's
  top level.
- Knights: Gerald's 4A answer said foot knights at stage 3; 4A had put all knights at stage 4. Now foot knights come at the
  Hold and a knight rides only when the stable has a horse (from the Castle).

**Simplified for now (honest list)**
- Quarry workers do not walk out in pairs beside the ox; the box says so, but they cut at the quarry and the ox cart hauls.
- Bricks are not a separate good (the Homestead's brick wall is part of the castle's growth).
- Engineers do not yet build trebuchets themselves; trebuchets are trained or mounted as before, once the school allows.
- Longbowmen, crossbowmen, flamethrowers and berserkers wear the sheet's outfits on the archer's and maceman's figures.
- Rivals trade with the friend in the background (no carts on the road).

**Art still needed** (drawn in code as stand-ins today): inside pictures for every building box (yard, quarry, farm,
stable, fields, mill, bakery, granary, alehouse and tavern, market, school, engineer's hut, apothecary, chapel/church/abbey,
smithy, Fletcher, spear-maker, armory, brewery, hop farm, vineyard, orchard, stockpile, keep); outside models for the
school, apothecary, church, abbey, engineer's hut, stable, alehouse, water pot, vineyard and orchard (today the workshop,
chapel and hop-farm shapes); a proper horse-and-wagon for the yard; flamethrower, crossbowman and longbowman figures of
their own; and the face for the People button.

**Status**: B1 to B8 built and saved (branch upgrade-v2); each step has its own check (tIndustry, tGroups, tCitizens, tVeterans, tFire, tFog, tRivals4b). Full checks, long games and speed below.

**Checks, long games and speed (final 4B, play link version 49)**: all 50 checks pass in one run (43 older, 7 new). Long
games (15 minutes each, all four factions, several rounds while fixing): no crashes, nobody frozen; the last round had one
brief item in three of the four games (a rival worker jostled in a crowd for about 10 seconds, or one of your idle
soldiers nudged about 46 to 51 points where the check allows 40), and one game clean. The test player in those games never
fights back, and the rivals are clearly stronger than in 4A (lessons, longbows, crossbows, mounted knights, ballistas,
raids from new sides), so its town shrinks; a player who defends does far better. Speed (lower is faster; 4B measured from
the west start like 4A): 100 people Phase 3 2,265, 4A 2,028, 4B 1,980; 800 people Phase 3 3,740, 4A 3,537, 4B 3,412.

## Phase 4C: controls, defenses, match setup and the table frame (branch upgrade-v2)

**The camera.** The game is a fixed three-quarter view of a 3D world: one fixed angle (it looks like an isometric
view), with zoom and scrolling. No twist and no tilt. Phase 4C did not change it.

**Gerald's selection rules (step C0, before C1).** No Fix button floats over people in the real game (Remove & rebuild
stays in every box). A command, a click or tap on the ground or a target, sends the chosen people and lets them go at
once. One click or tap on a person shows who they are, their work and what they are doing; a double click or double tap
opens their box.

**C1, the leftovers from 4B.**
- Real causes found and fixed (not limits raised): idle soldiers were nudged because each new arrival squeezed into the
  crowd at the gathering spot, shoving everyone out a little; now an arriving person takes the nearest open spot. The
  rival worker jostle came from workers choosing the same bush or tree without counting the other teams' people there,
  and noticing "going round" too late; they now count everyone and give a spot up sooner. Also fixed on the way: a rival
  guard chasing just past his leash and back again, a rival builder shuffling on one spot, arrows piling up after the
  game ended, a rival worker jostled right beside a tree (he now works from there), and bandits who could not find a way
  out (they now slip away instead of standing still).
- The long-game test player now defends itself (it sends its soldiers at anyone who comes near, every 5 seconds).
- Quarry workers walk out two by two beside each loaded ox cart while one stays at the stone; after a trip the pair
  works the stone a while before going out again.
- At the Stronghold with the school's top level, an engineer builds a trebuchet at his hut; it goes to the siege flag.
- The new soldiers have outfits of their own (longbow cloak and quiver, crossbow kettle hat and quilted coat,
  flamethrower hood, goggles and apron, berserker horns, war paint and two axes) on the existing jointed figures.
- The new buildings have models of their own: alehouse, apothecary, school (bell cote), engineer's hut (crane), stable
  (with a horse), church (tower and spire), abbey (cloister), orchard trees, low vineyard trellises.

**C2, camera, selection and placement.** Mouse-edge scrolling is much slower and eases in and out (an edge band 34 points
wide; the deeper in, the faster, up to 260 a second against the keys' 620). A box drawn round a crowd picks the soldiers
(civilians only when there are none). While placing, R or T or the Turn button turns the building; the button says which
way it faces (toward you, away from you, left, right). One finger drags a building's outline and lifting it sets it
down; the mouse works the same way. Numbers: CONTROLS in settings.js.

**C3, walls and moats.** Walls, fences and gates follow the exact route drawn (one stroke with the mouse held down or a
finger, bends and all; two clicks still make a straight line). Trees, loose rocks and berry bushes in the way are
cleared, never walked round; buildings, fields, water, iron and existing gates are left as openings. The ground is
blocked at once. Moats stop people and never hurt. **Who may fill a moat is one setting: MOAT_FILLERS in settings.js**
(today citizens, spearmen and flamethrowers; knights and anyone mounted never). A filled square is ordinary ground for
everyone, at once. Those filling cannot be hit, and flamethrowers cannot be hit by them.

**C4, spikes.** An enemy crossing active spikes is struck down: ordinary unarmored people and bandits die from one strike;
knights and armored swordsmen need two; a mounted knight loses his horse to the first. The owner's own people cross
safely. The rivals stand together against you (one side), so a rival's spikes spare the other rivals' men too.
Numbers: SPIKES in settings.js.

**C5, patrols, Guard and rally flags.** Patrol: choose soldiers, press Patrol, draw the route with the mouse or a finger;
they walk it over and over (round and round when the ends meet, otherwise there and back), fight what comes near, and
carry on. Guard: press Guard, tap a place; they hold that area and never chase far outside it. Any new order ends either
duty. Three rally flags, each with its own colour, button picture and model on the map: army (red flag beside a shield),
citizens (green flag beside a person), siege (orange flag beside a catapult; rams, catapults, ballistas, trebuchets).
When three or more soldiers are sent together, that is the main army: soldiers and siege engines without orders of their
own follow it there. Idle citizens go back to the campfire (unless they find work).

**C6, phones and tablets.** On phones the five categories sit in a bar along the bottom; a category opens upward as a sheet
of picture buttons and folds away by itself once a choice needs the map, so the building can be dragged into place.
Tapping the open category again, or Close, folds it too. Tablets and computers keep the side panel. A gear (Settings)
replaces Menu, a ? opens Help, and Quit is inside Settings (it asks for a second tap). Taxes have down and up arrows in
the top bar (with the same consequences as before). The advisor's hints stay on (there is no switch to turn them off),
one at a time, compact on phones, shown and spoken (speech follows the Voice setting, which also covers alerts).

**C7, match setup and random starts.** On the front page: your faction, how many rivals (1 to 4; three unless you change
it), each rival's faction or Random, the difficulty, a trading friend (only with two or more rivals), and where you start
(Random, or west, north, east or south). The choices are remembered. Every game you and each rival start somewhere new:
places are drawn beside the roads (so nobody starts shut in by forest), clear of the river and the mountains, with room
between camps, and your last five starting places are never reused. Choosing a part of the map makes the land afresh
(the page reloads, because the forest grows round the camps). Rivals' camps start hidden in the fog. The winning rule
follows the count: defeat every rival who is not your trading friend ("To win: defeat all N of your rivals").

**C8, the table, the frame and the glass.** From the inside out: land, the moving water band, a brass bar with a gold
ridge and studs, three carved wooden steps down to a polished wooden table (like crown molding), then dark glass over the
wood, and black beyond. A gold ball on each corner has a continent pressed into it: North America (north-west), Asia
(north-east), South America (south-west), Australia (south-east); **FRAME.globes in settings.js changes them** (also
Europe, Africa, or plain). The glass reflects the board, the brass and the gold, and shows the wood faintly. The
reflection is cheap: it reuses a copy of the picture already drawn (the world is not drawn a second time), taken only while
the glass is in view, every other frame; it fades away when the game runs slower than FRAME.fadeBelowFps (40 a second)
and comes back when it is smooth. The map is wider: 148 squares across (was 128), with roads and a mountain in the new
east. (The forests grow in a new arrangement as a result; starting places are random anyway.)

**C9, living water and wildlife.** The sea band rolls in gentle waves; the sea, the river, the pond and every moat carry
moving ripples; now and then a splash. A fish jumps, birds fly over, butterflies and frogs appear by the water. Each kind
has a cap (LIFE_CAP), and fewer appear when the game lowers its detail to stay smooth.

**New checks (Phase 4C):** tSelect, tLeftovers, tControls, tWalls (wall routes, gates, moats, the filler setting), tSpikes
(strikes by unit type), tOrders (patrols, Guard, each rally flag, the army following), tPhone (the phone sheet folding,
Settings, Help, Quit, taxes, hints; phone held both ways and iPad), tMatch (setup with 1, 2, 3 and 4 rivals, twelve random
games in a row, the winning rule by count), tFrame (the table, globes, the glass and its fading under a low frame rate),
tWater.

**Speed (Phase 4C, measured alone, the same way as before; frame time in a software-drawn test browser, lower is faster,
so only the comparison matters):** 100 people: Phase 3 2,269 (two runs averaged), 4B 2,008, 4C 2,232. 800 people: Phase 3
4,326, 4B 3,748, 4C 3,745. Phase 3's speed holds (level at 100, 13% faster at 800). Against 4B, 4C is about 11% slower at
100 people: the wider map accounts for about 7 of that (4C at the old width: 2,084) and the glass about 1 (4C with the
reflection off: 2,214; the test's camera sits near the west edge, where the glass is in view).

**Settings to know (all in js/settings.js):** CONTROLS (scrolling), MOAT_FILLERS and MOAT, SPIKES, FRAME (globes,
reflection strength, fade frame rate, table size), RIVALS (rival defaults; the front page sets the count).

**Assumptions made (Gerald may change any):**
- Three rivals by default (Gerald said "not four"). One of them is a trading friend unless switched off.
- The corner globes follow the map's compass corners (as on a world map). The camera looks across the map at an angle,
  so on screen the map is a diamond; "top-left" was taken to mean north-west.
- A rival's spikes spare the other rivals, because the rivals fight on one side against you.
- Soldiers count as "the main army" when three or more are sent together.
- Choosing a starting place reloads the front page (the land is made round the camps when the page loads).
- The Voice setting still silences all speech, hints included; the hints themselves cannot be switched off.

**Art still needed** (stand-ins working today): painted, sheet-style figures for the longbowman, crossbowman,
flamethrower, berserker and mounted knight (today outfits on the existing jointed figures); sheet-quality art for the
new buildings (today code-built models); the inside pictures for the building boxes and the People button face listed
in 4B; optionally a more detailed continent relief for the corner globes.

## Where we left off (for a fresh session)

**Latest (Phase 4C):** branch `upgrade-v2` holds Phase 4A, Phase 4B and Phase 4C steps C0 to C9, all built and checked;
the Phase 4C section above lists what each step does, the settings, the assumptions and the art still needed.
Earlier: Phase 4B steps B1 to B8; its section lists what each step does, the numbers to confirm, the conflicts, what was
simplified and the art still needed. The older notes below describe the game before Phase 4 and are kept for history.

Gerald asked that, if the conversation runs out of room and restarts, work picks
up from here. State as of the latest build (artifact version 31 or later,
branch `stronghold-destroyer`):

**Done and live**
- Market (Town tab, 60 wood): click it for a panel that buys and sells wood,
  stone, iron, hops, wheat, flour, food, bread, ale and all weapons.
  - Buying always costs more than making it yourself; selling always pays less
    than buying (no buy-and-resell profit at any mood).
  - Prices follow mood: up to 25% cheaper when the people are happy, up to 40%
    market tax when they are upset. Even at best, never as cheap as making it.
  - The Armory's weapon-buy buttons use the same prices.
- A big X closes every pop-up box.
- Fix a glitch: select a person and tap the floating "X Fix" button, or open any
  building's panel (walls, gates and towers now have a small one) and tap
  "Remove & rebuild". It is cleared and rebuilt fresh in place at no cost,
  keeping its job, health and look.
- The King lives on top of the keep. Ordering him anywhere brings him down;
  right-clicking the keep with him selected sends him back up, and he goes back
  by himself after a minute idle. From the roof he sees enemies up to 900 away
  (far beyond any archer) and warns where they are coming from.
- Sound starts very low: music 15%, effects 25% (a one-time reset of saved volumes).
- Turning before placing: a building hovers with a yellow arrow showing its front;
  R or T (or the Turn button) turns it a quarter turn (south, west, north, east).
  Gates turn to sit in north-south walls. Non-square footprints swap width and
  depth. 3D shows the full turn; 2D mirrors west-facing buildings and shows turned
  gates edge-on.
- Tear Down (Castle tab): pull down your own walls and buildings for half the
  cost back; the keep cannot be torn down.
- Workers go inside workshops (bowyer, spear-maker, blacksmith, mill, bakery,
  brewery); people on breaks go inside the tavern, the House of Prayer or a
  house; the sick are cared for inside the keep. Clicking a building shows who
  is inside, with little figures. Outdoor work stays outdoors (farms, food
  gathering, woodcutters, quarry, iron mine, soldiers, the fire).
- Free door knight with every tower and the keep; he charges anyone nearby.
- Lookout Tower about 2 inches above the keep (about 1.5 inches above the
  Round Tower) at the starting zoom on an iPad. The Round Tower was already
  about 3/4 inch above the keep and was left as it was.
- Round helmets (2D domes; 3D domed great helm for knights).
- Bug sweep: running in place fixed (crowded doors, guards blocking their own
  side, settlers spawning inside a tree, the walled-in enemy camp, break-goers
  pulled to the fire, re-planning every frame).

**Art overhaul from Gerald's design sheets (in `design/`)**
Gerald supplied three sheets ("Gerald Studio OS", Phase 1) and asked that they be
implemented thoroughly; they set the look for everything. Keep controls and
gameplay as they are; the 3D view is approved. Work in phases:
1. Soldiers: DONE (first pass). Polished plate with gold edging, layered pauldrons,
   elbow and knee cops; crimson capes and tabards with a gold lion rampant; lion
   shields; longsword with gold hilt. Swordsman bare-headed and bearded; spearman
   in a rounded open kettle helm; maceman = "Armored Soldier" in a closed rounded
   armet; knight in a rounded great helm; archer hooded, leather, crimson cape.
   Team colours: Gerald's army is crimson and gold for every civilisation; the
   enemy became the sheets' "Black Stone" faction (blackened steel, charcoal,
   ember-orange tower emblem). Gerald was told and may change this.
   Still to do: knights on horseback (sheet: cavalry), crossbowman unit (new),
   2D swordsman without a helmet, faces like the sheet portraits.
2. Citizens and workers: male/female citizen, builder (hammer), farmer (straw hat,
   wheat), gatherer (basket, red scarf), miller (sack), brewer (barrel).
3. Castle and walls: gray stone castle with round towers and crimson lion banners;
   modular walls (straight, corner), gatehouse with portcullis, round and square
   towers, wall stairs. Black Stone castle for the enemy.
4. Homes and workshops: thatched peasant home, larger home, half-timbered
   townhouse, barracks, blacksmith (forge glow, smoke), mill with waterwheel,
   brewery.
5. Land: oak, ash, pine, pecan trees; berry bush, herb greens, wild bush, rocks;
   wheat, barley and vegetable fields; grass, dirt, road, wooden and stone bridges,
   water; stone and brick wall textures. Gerald singled out water and stones as
   needing the most work.

**Art quality: Gerald says it does not yet match his sheets**
Shapes built in code cannot reach painted concept-art quality. The two real paths
offered to Gerald: (1) 3D models made from his concept art with an image-to-3D tool,
humans auto-rigged with walk/idle/attack/die animations, delivered as .glb files and
loaded with three.js; (2) sprite sheets from his image tool (each unit in 8
directions, a few frames per action, transparent background, same size and camera
angle). Gerald first chose path (1), 3D models, but has no 3D tool. So his own art is now cut
straight out of his sheets (`tools/cut_sprites.py`) and shown as sprites: the swordsman,
archer and spearman from sheet 3, six views each (front, 3/4 front, side L, back, side R,
3/4 back), in `sprites/` with `sprites/sprites.json`. In 3D each sprite is a card that
faces the camera and shows the view matching the unit's facing; in 2D the matching view
is drawn. Enemies keep the built-in Black Stone figures so the sides stay distinct.
Next: knight, armored soldier, crossbowman (sheet 2 has smaller 360 views), citizens
(only front views exist; more angles would need new pictures from Gerald's image tool).
The .glb loader stays in place should models ever come. The game now loads .glb models listed in
`models/models.json` (see `design/MODELS.md` for names, moves and sizes); anything
without a model keeps its built-in look. Waiting on his first files (swordsman first).

**Still open from earlier**
- A fixed soldier cap: waiting on a number from Gerald.
- Breaks stay 20 to 30 seconds (Gerald approved).
