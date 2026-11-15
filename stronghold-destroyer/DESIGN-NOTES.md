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
tWater, and tTablet (the touch round by finger on an iPad and on a phone: choose and send, a finger box, a patrol, a
house dragged into place, citizens filling a moat, then the way straight over the filled square and round a wall).

**Checks and long games (final 4C, play link version 51):** all 61 checks pass (50 from before Phase 4C, 11 new). Three older
checks needed updating for Gerald's 4C changes (three rivals by default; the phone card resting on the new bottom bar; the
water check's camera placed over the river); none was a fault in the game. Long games (15 minutes each, all four factions,
Easy, Medium and Hard, 1 to 4 rivals): after the last fixes, 5 of 6 games had zero problems of any kind; in one, two rival
soldiers moved back and forth on one spot of their own ground for about 10 seconds; it did not happen again in 4 more
games run with a trace to catch its cause (so the cause is not yet confirmed). Fixed on the way, each a real cause:
bandits with no way out stood still for ever (now they slip away); a rival worker kept walking at trees he could not
reach (now he checks the way first); a rival worker jostled beside a tree (now he works from there).
How the difficulties feel with the simple test player (it defends but stays small and builds no walls): Easy, it reached
stage 2 with 26 to 29 people and 11 to 13 soldiers, keep untouched, rivals at stage 1 to 2; Medium, it was worn down at
stage 1 or 2 (keep damaged in most games), rivals at stage 2 to 3 with 6 to 10 soldiers; Hard, the keep fell in two of
three games, rivals at stage 2 to 3 with up to 13 soldiers.

**Speed (Phase 4C, measured alone, the same way as before; frame time in a software-drawn test browser, lower is faster,
so only the comparison matters):** 100 people: Phase 3 2,269 (two runs averaged), 4B 2,008, 4C 2,232. 800 people: Phase 3
4,326, 4B 3,748, 4C 3,745. Phase 3's speed holds (level at 100, 13% faster at 800). Against 4B, 4C is about 11% slower at
100 people: the wider map accounts for about 7 of that (4C at the old width: 2,084) and the glass about 1 (4C with the
reflection off: 2,214; the test's camera sits near the west edge, where the glass is in view).

**Gerald's decisions after Phase 4C (applied, play link version 52):**
- Hints are not spoken when Voice is off (that was already so; a check now proves it).
- Moats: flamethrowers, spearmen and the regular soldiers (swordsmen) fill them, with the citizens as before; never knights
  or anyone on a horse (berserkers, archers and macemen do not either). MOAT_FILLERS in settings.js.
- Spikes are very strong: anybody who steps on them dies from one strike, except knights, berserkers and mounted knights,
  who take two (the mounted knight's horse falls at the first). Rival lords and the King now die from one strike too.
  SPIKES in settings.js.
- Globes: top left Russia, top right the United States, bottom left Australia, bottom right South America (by the map's
  corners, north at the top). FRAME.globes in settings.js.
- Scrolling: the mouse scrolls at the edge of the game's own picture (not the monitor or the window); over the command
  panel or off the game it does not scroll. Settings has a scroll speed: Slow, Medium or Fast (remembered), which also sets
  the arrow keys' speed. CONTROLS.scroll in settings.js holds the three speeds.

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

## Phase 4D: stage trophy, saved games, art in both views, and a bug sweep (branch upgrade-v2)

**Gerald's decisions for 4D.** Ballista and trebuchet prices stay. Faction names stay as spelled. The 2D view stays:
both views work, and every change of look shows in both.

**D1, stage requirements and the trophy.**
- The stage needs were far too high; they are now low enough that Easy reaches stage 2 in about two minutes. Each later
  stage takes longer, and from stage 3 on Medium and Hard take longer than Easy (stage 2 comes at about the same
  time on every difficulty: its numbers differ by only one or two people). The table is in `js/settings.js` (STAGES, lines 67, 70,
  73 and 76 for stages 2 to 5; STAGE_PACE line 85; the rivals' own numbers, RIVAL_NEED, lines 91 and 92). Easy numbers are the table itself; Medium
  and Hard multiply food, stone and iron by an amount that grows with each stage (Medium x1.15, 1.35, 1.55, 1.75; Hard
  x1.3, 1.7, 2.1, 2.5), people and houses and stone towers by half as much, and ask 3 or 6 more happiness.
  People rise less because more people also means more workers (the automatic games showed raising people sped things up).
- Rivals keep the people, food, stone and iron they needed before 4D (RIVAL_NEED), at every difficulty (their
  difficulty is their economy's speed); their buildings follow the new table. (The first try, the new table times 1.6,
  asked 13 people for stage 2 where a rival's stage 1 holds about 12, so on many maps rivals never grew: found by the
  rivals check in the bug sweep and fixed.)
- Bug fixed: Cy Young's automatic food sale kept nothing back, so any stage asking more than 200 stored food was close to
  impossible for Cy Young (and for a Cy Young rival). The sale now keeps what the next stage needs.
- The trophy (just below Settings): have / need / tick for each requirement, one plain sentence on what to do next (it
  names the worst happiness complaint and its fix, says when the granaries are too small for the food asked, and that
  the mill grinds the same wheat the alehouse brews from), pauses the game, never opens by itself, says when the final
  stage is reached. Large, high-contrast text; phone and iPad.
- tests/pace.js plays a whole game on its own (pays its own way, raids on unless NORAIDS=1) and prints the minute each
  stage is reached and what was last to be met. SEED=n plays the same map at every difficulty. Final results, map 7,
  Cy Young, minutes to reach stages 2 / 3 / 4 / 5:

  | Difficulty | Raids held off (the economy alone) | Raids on |
  |---|---|---|
  | Easy   | 2.3 / 7.4 / 14.5 / 27.3 | 2.3 / 7.8 / 13.7 / 23.8 |
  | Medium | 2.3 / 8.4 / 18.9 / 33.6 | 2.6 / 9.0 / then the keep fell at 30.8 minutes |
  | Hard   | 2.0 / 10.1 / 21.2 / 66.7 | 2.3 / 10.3 / then the keep fell at 23.2 minutes |

  Every game reached stage 2 (in 2 to 2.6 minutes on every difficulty; the difference between difficulties grows
  with each stage). Stone is what is met last at nearly every stage. With raids on, Medium and Hard rivals reach stage 3
  by about 25 minutes and their raids overran this test player, which trains soldiers and builds wooden towers but no
  walls; that is raid strength against a weak defender, a balance question for Gerald, not a fault. (Earlier timing
  runs that reached stage 5 on Hard with raids on were made while the rival fault above kept rivals at stage 1.)

**D2, saved games.** Named saves with the date and time, an autosave slot (every five game-minutes and when the page is
put away), Load, Delete (second tap), Export to a .json file and Import, inside Settings (and "Load a saved game" on the
front page). A save keeps the whole game; loading makes the page again from the saved starting places, so the land
comes out the same. Saves live in this browser (IndexedDB, or local storage); export a file to keep one safe or move
it to another device. On an iPad: Export opens the share sheet in the Claude app (Save to Files) or downloads to Files
in Safari; Import opens the Files picker. (Not tried on a real iPad here: the checks run in a desktop browser.)
Saving 800 people takes about 80 ms and makes a 1.2 MB file.

**D3, art in both views.** The flat (2D) view is back: Settings, View (or V). Buildings and the sheet's soldiers that
have no flat drawing are shown there as pictures of their 3D models, so a change of look shows in both views. Finished
stand-ins: a full-height longbow; the flame trooper's copper fire-pot, hose and pilot flame; a horse and log wagon at
the wood yard; a painted-style People face; richer inside pictures (light, outdoor scenes, the iron mine, church, abbey
and great hall of their own). Painted pictures from files replace the drawn ones with no code change (art/buildings,
art/units, art/inside, art/ui); design/IMAGE-PROMPTS.md has a ready prompt for each picture code cannot make.
A picture catalogue of every person, soldier, engine, building and item is in design/Stronghold-Destroyer-Picture-
Catalog.pdf (made by tools/catalog.js from the game itself).

**D4, the bug sweep.** Eight long games of 30 game-minutes (all four factions, Easy to Hard, 1 to 4
  rivals, the castle stepped through all five stages; tests/soak.js with STAGEUP), five-screen button sweep (144 buttons
  and every panel on a computer, an iPad and a phone, both ways up; tests/tSweepUI.js), and the automatic timing games.
  No crashes and no page errors anywhere. Found and fixed at the cause:
  - Quarry ox cart waited forever with its load when the spot beside the keep it chose was walled in by other buildings
    (stone stayed at nothing for half an hour, twice): each trip now heads for a spot it can really reach (tests/tCart.js).
  - Cy Young's food sale kept nothing back (D1). No ale with an alehouse standing: the mill grinds the same wheat; the
    trophy says so.
  - Panels ran off the screen (building boxes, the market's by a thousand points, Settings with its saved games, the
    rivals list, the escort box above the top): every open panel stays in the game area and scrolls (js/fixes4d.js).
  - The top bar squeezed Settings, Help and Pause under their words and cut counters off: the counters wrap instead.
  - Soldiers chased a foe into a rival's castle: an idle soldier who went for a rival scout followed it all the way
    home and died there (11 deaths in 10 minutes on one Hard map with raids held off). A fight a soldier starts by
    himself now has a leash (CHASE_LEASH in js/units.js, 360 points); fights you order go as far as you send them
    (tests/tChase.js). On that map the deaths went from 11 to none, and happiness stayed up.
  - Each death of your people takes 3 from happiness, but the reasons never said so, so a town losing soldiers saw
    only "there is no ale". The reasons and the trophy now say "they mourn the people who died" for two minutes.
  - The check runner could wait forever on a check whose browser outlived it; it now stops both.
  - Stone is the usual hold-up, and the cause is the ox cart, not the cutters: the quarry's pile sits full at 60
    while one cart carries 24 a trip. The trophy now says so when a pile is full ("build a second quarry (it brings
    its own cart) or a stockpile near the quarry for shorter trips"); before, it only said "build a quarry".
    The timing test player now builds that second quarry too.
  - Not explained: in one Medium timing game no stone arrived for 35 minutes (both carts busy, the pile full), then
    it came again. The stuck-cart detector had a fault and missed it (fixed); three more games on three maps, with the
    detector fixed, showed no stuck cart. If it is seen again, tests/pace.js now prints where the cart is and why.
  - Castle growth can never take stone or iron below nothing. Saves are stored as text made once (cheaper).
  Checked and not bugs: the "dead" Add-worker buttons in the sweep had no free citizen to add (each adds one when there
  is); soldiers flagged as wandering were walking to guard posts that moved when the castle grew.
  After the rival fix the eight long games were played again (tests/.work/sweepF-*.log): no page errors (only "file
  not found" for picture files Gerald has not sent yet, which the game does without). The keep stood to stage 5 in
  four (both Easy, Medium with 1 and 2 rivals) and fell to raids in four (all three Hard, Medium with 4 rivals): the
  long-game test player is a weak defender. Seen once each and not traced: a citizen going round while gathering, a
  builder stuck once, two soldiers wandering while idle; a quarry never built in a town raids had cut to 6 people.
  Slow frames in those games came with eight to ten browsers sharing the machine; the speed test below is the quiet
  measure. Speed (tests/bench.js, a big battle in the 3D view, milliseconds per frame, the average of two runs taken in
  turns on a quiet machine; this machine draws 3D in software with no graphics chip, so only the comparison counts,
  not the size of the numbers):

  | People | End of 4C (before) | 4D (after) | 4D with the Help screen |
  |---|---|---|---|
  | 100 | 1,856 | 1,854 | 1,859 |
  | 800 | 3,098 | 3,119 | 3,087 |

  No slowdown (the differences are within 1%, the run-to-run spread). The flat view at 800 people: 103 ms.

**Art still needed** (stand-ins working today): painted, sheet-quality pictures for everything in design/IMAGE-PROMPTS.md
(the five sheet soldiers, eleven buildings, 28 inside pictures, the People face). The corner globes stay code-made.

## The Help screen with search and pictures (after Phase 4D)

- Opens from the ? button and the H key, pauses the game, closes with the big X (or Escape, or Close). Large,
  high-contrast text; fits an iPad and a phone both ways up. Works offline: everything is in the game's own files.
- **All the help text is in one file: `js/helpdata.js`.** 14 topics, 89 articles. Each article has a picture, 3 to 6
  short lines, most have a "How do I ...?" with numbered steps, and related links. Numbers come from the game itself
  where they can ({cost:house}, {name:knight}, {stagetable}), so they stay right when the settings change.
- Search shows results as you type: plain-word questions, other words for the same thing and common misspellings
  (each article has its own search-word list), each result with a title, a one-line summary and a small picture. No
  match: it says so and suggests nearby topics.
- "What is this?" in every building box, a person's box and the panels opens the matching article (the context list
  at the end of js/helpdata.js says which).
- Pictures: the game's own 3D pictures for buildings, people and goods, drawn icons for the rest. **Gerald's own
  pictures need no code change:** put art/help/<article id>.png (or art/help/cat-<topic id>.png for a topic card)
  beside the game and it is used instead.
- The source named for the content, the Master Guide PDF (Stronghold-Destroyer-Master-Guide.pdf), was not found on
  Google Drive or in the files here, so the help was written from the game itself; no PDF/game differences could be
  checked. The old help text (one long page) is replaced.
- tests/tHelp.js: 61 sample questions (the right article in the top three for every one), every topic and article,
  pausing, the X and the H key, the context links, and iPad and phone sizes. Speed: no change with Help in the game
  (100 people 1,859 ms against 1,854; 800 people 3,087 against 3,119; see the 4D table above). Help adds work only
  while it is open, plus a look for new panels every two seconds.

## Phase 4E: the troop diamond, formations, tap-away boxes, pictures on phones (after the Help screen)

Gerald's request: on a phone, small symbols and pictures, names only when tapped; a tap on a hint or suggestion (any
box, the Art of War included) makes it go away, or a double tap; no Stage icon at the top (the trophy does that); the
troop controls in a neat diamond at the bottom left instead of the bar across the bottom (stop, go, which way, what to
do, patrol, add more people, with buttons round its sides); formations for any number of soldiers ("a very important
upgrade to the way the troops move"); then a picture and a PDF of what the buttons do.

- **The diamond** (js/ui4e.js, styles at the end of css/game.css). Nine diamond-shaped buttons: arrows on the four
  points (the chosen soldiers walk five squares that way on the screen, whichever way the view is turned); Patrol,
  Guard, Add and Stop between them; in the middle two walking soldiers with the number chosen, which open the seven
  formations above it. Round the outside: People, Soldiers (choose all), Castle (back home), Let go on the corners;
  Everyone and Citizens (and Hekaranok's bell) beside it. The buttons are the game's own, moved out of the old bottom
  bar (#cmdbar, now hidden), so they keep their names and jobs. With nobody chosen the order buttons dim and say why.
  At least 44 points on every screen; on a phone held sideways People joins the column and the formations open to the
  right, clear of the trophy and the top bar. Assumptions (Gerald did not name them): the arrows are the "which way"
  buttons; Add is "add more people" (tap soldiers to add them to the group), and now works with a mouse too.
- **Formations** (js/formations.js): Free (the old block), Line, Column, Wedge, Square, Circle, Loose, for any number.
  The group marches at the pace of the slowest (one more than 60 points behind may catch up), arrives together and
  stands facing the way it went (in 3D and in the flat view); rows fill from the front with whoever is furthest
  forward, so nobody walks through the others; in a line the bowmen stand behind the fighters; one knocked off his
  place steps back into it (for 12 seconds after arriving). Choosing a formation with soldiers chosen forms them up
  where they stand (facing up the screen); tapping the ground sends them in that shape. Soldiers in a chosen
  formation stay in it (they are not taken for tower-door duty) until given a new order; a march counts as your
  order, so no automatic duty takes them for 30 seconds. A blocked place moves to the nearest free point that is not
  another's place. Measured on open ground in tests/tFormation.js.
- **Boxes that are in the way:** one tap puts away a hint, a banner, an alert or the Art of War advice (the next tip
  comes back); a double tap or double click on any box, away from its buttons, closes it the box's own way (tests/tDismiss.js).
- **Top bar and phones:** the Stage chip is gone (the trophy shows the stage). On a phone the faction's name is its
  shield, people read 12/15, happiness is a number, taxes are dots, Rivals, Goods and the weather are their signs, and
  the five tabs show pictures (the open one its name); touching any of them shows its name.
- **Help:** articles "The troop diamond", "Formations" and "Putting boxes away"; the touch, top bar, patrol, People
  and advisor articles describe the new layout (92 articles; 68 sample questions).
- **The guide:** design/Troop-Controls-Guide.pdf (4 pages: the numbered diamond and what each button does, good to
  know, the formations menu, the seven formations seen from above, the phone) and design/Troop-Diamond.png, both made
  from the game by tools/controls_guide.js, so they say what the game says.
- Checks: tests/tDiamond.js (computer, iPad, iPhone both ways), tests/tFormation.js, tests/tDismiss.js; all 71 checks pass. Speed (tests/bench.js,
  3D view, milliseconds per frame, the average of two runs in turns): 100 people 2,188 before and 2,113 after; 800
  people 3,784 before and 3,625 after. No slowdown (the machine was slower this day than on the 4D day, so compare
  only within a table).

## Phase 4F: ten minutes of peace, calling citizens, wars won and generals, the Master Guide version 3 (after 4E)

Gerald's request: the build time at the start up to 10 minutes (5 on Hard); citizens can be built or called again from
the Town list; unhappy people make them slower and dearer (below 20% happiness about 3 to 5 minutes each); winning wars
makes them cheaper and makes more come; a couple of generals in the field or the camp make more come too ("a balancing
act"); then the gameplay guide rebuilt from his version 2 with every new feature and pictures of what things look like,
named "Master Guide version three".

- **Peace:** RIVALS.raid.first and ROGUES.first in settings.js: 600 seconds on Easy and Medium, 300 on Hard, for the
  first rival raid and the first bandits. The opening banner says "10 (or 5) minutes of peace". The enemy rivals' first
  raids are 75 seconds apart, counted after the trading friend is chosen (before, when rival 0 was the friend, the first
  raid came 75 seconds late).
- **Calling citizens** (js/callcitizens.js; numbers in CITIZEN_CALL in settings.js): the Citizen button in the Town list
  calls one more citizen from the countryside; he walks in along the road when his wait is over ("... answers your
  call"). The houses still raise their own. The button's label (touch it, or rest the mouse on it) shows "food · gold
  · m:ss" for right now. Base 20 food, 10 gold, 60 seconds; happiness bands 70+ (x0.75 time, x0.85 cost), 50+ (x1),
  35+ (x1.6, x1.25), 20+ (x2.5, x1.6), below 20 (x4.5 = 4:30, x2.2). Each war won (up to 3, each counting 10 minutes):
  time and cost x0.85. Each general (up to 3): time x0.9, cost x0.95. Never under a quarter of the base wait. Houses
  full or 5 already on the way: none can be called. Wars won and generals also make the houses raise children sooner
  (the same factors). Measured: happiness 80 → 17 food, 9 gold, 0:45; 60 → 20, 10, 1:00; 40 → 25, 13, 1:36; 25 → 32,
  16, 2:30; 10 → 44, 22, 4:30. Two wars won at 60: 0:43 and 14 food; three generals at 60: 0:44.
- **Wars won:** a rival raid is over when none of its raiders is still raiding; it is won when at least 6 in 10 of them
  fell and your keep stands; a rival defeated is a war won too. A Victory banner says so. Saved with the game
  (warWins, raidGroups).
- **Generals:** a soldier with 10 or more veteran stars. A banner when one earns his tenth star; his box says
  "a general".
- **Assumptions for Gerald to confirm:** a general = 10+ stars; a war won = 60% of a raid fell (or a rival defeated),
  counting 10 minutes, at most 3 at once; all the numbers above.
- **Help:** a new "Calling citizens" article; Citizens, Veterans (generals), Raids and Getting started updated
  (93 articles). tests/tHelp.js: 3 more questions.
- **Checks:** tests/tCallCitizens.js (peace on each difficulty, the button, the terms, calling and arrival, wars won,
  generals, a raid beaten off, the limits). tests/tCitizens.js: its 4B check "citizens cannot be bought" now checks
  that the Citizen button is open (Gerald reversed that rule in 4F).
- **The Master Guide version 3** (design/Stronghold-Destroyer-Master-Guide-v3.pdf, 66 pages, 9.4 MB): built on
  Gerald's version 2 (its 17 sections, wording and look), larger letters, NEW marks on everything added since, and
  CORRECTED marks where version 2 no longer matched the game (peace time, the Fix button, double-click, ladder men,
  stage 5 towers, spikes for swordsmen, the globes, the trophy's ticks, the stage numbers now printed, the People tab,
  calling citizens). Photographs of the real game throughout (the front page, the main screen numbered, the trophy,
  the mood box, People, a citizen's and a general's box, building boxes, the Citizen button, the banners, Help,
  Settings and the saved games, the diamond numbered, the phone, the views, fog, the table's corners, a battle).
  Made in two steps: tools/guide3_shots.js takes the pictures and reads the live numbers into tests/.work/guide3
  (ONLY=name,name retakes some), then tools/master_guide.js lays out the pages (tables split with their headings,
  headings kept with what follows) and prints the PDF. The design-sheet art and the 4E formation pictures it uses are
  in design/guide3-art.
- **Gerald's follow-up: one guide, all of it in Help, a search and a drop-down on the ?.**
  - *One PDF:* the Troop Controls Guide (4E) is folded into the Master Guide (section 5: the diamond, the formations,
    "tap the ground and they march in the formation", the phone and its diamond picture), so design/Stronghold-
    Destroyer-Master-Guide-v3.pdf is the one guide to keep. (Assumption: "merge together" meant these two PDFs.)
  - *All of the guide in Help:* tools/master_guide.js also writes js/guidedata.js (GUIDE_DATA: the 18 sections in 118
    parts, word for word, tables and picture lists included, each with the game's own picture). Help shows it as the
    topic "The Master Guide" (sections, then parts), and its search looks through it after the short articles: the
    results list the short articles first, then "In the Master Guide". Do not edit js/guidedata.js by hand: change the
    guide's words in tools/master_guide.js and run it again, and the PDF and Help change together.
  - *The ? opens on the search:* Help opens with the Topics drop-down open (every category, with how many articles each
    has), and with a mouse the search box is ready to type in (on touch screens it is not focused, so the keyboard does
    not cover the screen). Typing folds the drop-down away; the Topics button opens and closes it; Esc closes it first.
  - A new short article, "Using Help" (94 articles). tests/tHelp.js: the drop-down (computer, iPad, iPhone), 15 topic
    cards, questions only the guide answers, every part of the guide found by its title and opening with its words.
- **Correction to 4E:** design/Troop-Diamond.png had its picture squeezed by the page layout, which hid buttons 14
  and 15 (Everyone, Citizens). tools/controls_guide.js no longer lets the picture shrink, and the picture is now trimmed
  to the diamond and its list (it had a blank lower half). The 4E PDF is remade from the same pictures.
- **Fix after the play link went up (version 57):** in Help, each guide card named the card before it as its heading
  (Trebuchet showed "Ballista"). The exporter now names the heading the cards sit under ("Siege engines and carts").
  Only the 29 labels changed; every part's words, and the PDF's words, are the same.
- **Checks:** the full suite passed, 72 of 72; tDismiss and tButtons were run again after the Help changes and passed;
  tHelp passed again after the label fix. The published files were loaded in a browser: no page errors, the Topics
  drop-down open with 15 rows, the search box ready, and "In the Master Guide" in the results.

## Phase 4G: Gerald's answers after 4F

Gerald's answers to the open questions (his words, by voice): "A general has 7 or more stars. That's what's called a
5-star general. And once he has a 10..."; the war-won rule, the citizen numbers and "merge" (troop guide + v3) are
correct; raids: "much stronger than the easy ones ... and the hardest one is the top"; "berserkers belong to everyone ...
whatever Psychana's power is, it fits the berserker"; the arrows direct which way to go; "the add button puts more people
or more troops in the formation. If you hit the add button, when I build a troop, it goes to that formation".

- **Generals:** CITIZEN_CALL.general.stars 7 (was 10), fiveStar 10. A banner at 7 ("is now a general") and at 10 ("is now
  a five-star general"); the box says "a general" or "a five-star general". Both count the same for calling citizens.
  *Assumption to confirm:* the sentence was cut off; read as 7 = general, 10 = five-star general.
- **Berserkers for everyone:** the kit has no `only` any more; the Army tab shows it for every faction. Rivals: from the
  Hold, a Psychana rival's swordsmen are all berserkers (as before), any other rival's about half. Psychana's stealth
  (bands under 10 unseen) still applies to Psychana's berserkers only.
- **Raids:** RIVALS.power in settings.js. army: the soldiers a rival may keep, times ARMY_CAP for its stage (Easy 0.75 as
  before, Medium 1.4 (was 1.0), Hard 1.9 (was 1.35)); strength: raiders carry raidMul (Easy 1, Medium 1.25, Hard 1.5),
  which multiplies the blows they strike and divides the blows they take (strongMul, toughMul). Measured in 45-minute
  test games (keep held, raiders removed once counted, as a defended castle would; scratch tool raidmeasure.js):
  Medium average raid 10.2 raiders / power 1,446 before, 12.8 / 3,295 after; Hard 12.8 / 2,221 before, 14 / 4,650 after
  (largest 26 raiders); Hard has more raids too (43 to Medium's 27). Easy is unchanged: its rivals were still at stage 1
  or 2 after 45 minutes, with no raid or a few raids of 3. Before, with the keep left alone, Hard raids were no bigger than
  Medium's (5.5 and 5.6 raiders on average).
- **Add fills a formation** (js/formations.js, the end): tapping Add with soldiers chosen marks that group (joinGroup)
  and its formation (the one most of them stand in, else the chosen one). Soldiers tapped or clicked while Add is on join
  it; every soldier trained while Add is on marches to the group (js/town.js, where trained soldiers come out) and the
  group re-forms round him in the same shape, where it stands (or where it is marching to), facing the same way; those
  fighting stay where they are. Tap Add again: new soldiers go to the rally flag. Add with nobody chosen says to choose
  soldiers first. *Correction to 4E:* Add did not work with a mouse (a click still chose only that soldier, though the
  code's note said it worked): a click, and a drawn box, now add while Add is on.
- A wording fault seen in the guide's photograph: a soldier's box said "soldiers' lessons: none level"; now "none yet".
- **Help and the guide:** the Berserker, Psychana, Veteran stars, Calling citizens, Difficulty, Raids, Diamond and
  Formations articles follow the answers (94 articles); the Master Guide too (What's new rows, the berserker card, the
  generals, a "How strong the raids are" table in section 14, section 17's decided list). Its general's photograph was
  retaken. tools/guide3_shots.js: DATA=1 with ONLY= reads the numbers again as well.
- **Checks:** tests/tDecisions4G.js (berserkers for Cy Young and a Cy Young rival; raids at the Hold on each difficulty:
  6, 12 and 17 raiders, each x1, x1.25, x1.5; Add marks the group, a mouse click adds, a trained soldier marches to the
  wedge and all six stand in it, Add off goes to the rally flag, Add with nobody chosen explains). tests/tCallCitizens.js:
  7 stars a general, 10 a five-star general, 6 not. tests/tHelp.js: four more questions.
- **Full suite (after the fresh play link):** 72 of 73 passed. tS2 timed out in the suite (its mouse click on the bowyer
  missed while two checks shared the machine, so the panel never opened and the next click waited); run alone it passed
  (34 to 47 seconds in earlier suites). Not caused by 4G: Add is off by default, so the mouse click works as before.

## Phase 4H: the Field and the Farm; walking without glitches (Gerald, after 4G)

**What Gerald asked** (voice, transcribed): more control over the fields and what is made; "there should be two separate
things, a field and a farm"; the field holds 10, the farm 5; at most 5 fields and 2 farms; the field grows wheat (fastest),
corn (next) and grapes (slow), up to three types; the farm holds chickens, cows, pigs, ducks, seen running about depending
on which you pick; both can have a well; the farm can have a stable and gets better over time; happy things around make
food faster, so distribution is faster; too much food, take workers off; a lookout tower and a person reserved to guard,
shown in each box (two for a field, one for a farm); Reserve gives an armed soldier with a knight's strength whether or
not knights have been made, because these buildings stand far from the keep; farm things sell for a lot more than field
things, livestock always top dollar; "suggest any rules to fit"; remove the glitching near the greenery (go round people
in the way); remove the "What is this?" button.

**How it reads in the game** (all numbers in settings.js, FARMING):
- **Field** (`wheatfarm`, renamed Field; 4 by 4 squares now, was 2 by 2): 5 at every stage (no more merging), 10 people.
  The box opens on Wheat, Corn and Grapes with − and +; the field grows them in strips sized by their people; each worker
  has his own place in his strip (js/farming.js farmSpot). Seconds of work for one: wheat 6, corn 8, grapes 15. Loads
  carried to the stores: wheat 10, corn 8, grapes 4 (so slow grapes still come in steadily). Wheat goes to the stores
  (mill, alehouse); corn is food (a new food kind, `corn`); grapes go to the granary. People taken off with − stay off.
- **Farm** (4 by 4, was 2 by 2): 2 at most, 5 people; ticks for chickens, cows, pigs, ducks (Gerald's four, raised from
  the start) and turkeys and sheep (kept: the feast needs them). Only ticked kinds are born (oxen still come from cows).
  Keepers bring in eggs, milk and meat (food kind `farm`, every 8 s of work each, loads of 6). Levels: 2 after 6 minutes
  of work, 3 after 15 minutes with a stable beside it; each breeds faster (x1.25, x1.5) and holds more (x1.5, x2).
  The 3D pen has a little barn, a trough, a pond when ducks are raised, and the animals walking about (world3d.js
  farmPen, animalModel, syncHerd). − Remove worker sticks (the farm keeps the number you set).
- **Speed:** very happy (70+) x1.25, upset (below 40) x0.8, a well x1.25, rain and snow as before, a feast x2.
- **Well** (30 wood): x1.25, and a full bucket for fire fighters nearby (fire.js nearestWater).
- **Lookout tower** (40 wood): clears the fog 440 around; a banner and bell when a raider comes within 400.
- **Reserve a guard** (25 gold, a place in the houses; a civilian is called up if they are full): a knight (260 health,
  his blow) on foot, at any stage; 2 for a field, 1 for a farm; he stays with his field (guardOf) and goes after raiders
  who come near. "Post one of your soldiers" (the old sentry) still works and counts toward the guards.
- **Market:** rows for corn and the six animals. Animals always sell at the top price (the best the market ever pays:
  the top school level's rate in the happiest town), whatever the mood or the school; buying them costs more than
  that. Worth (cost to make): wheat 1, corn 1.5, grapes 3, chickens and ducks 8, turkeys 14, sheep 20, pigs 24, cows 40.
- **Rivals** keep their simple fields and farms (bigger now, as BUILD sizes are shared).
- **"What is this?"** taken off every box (help.js); the box-to-article map stays for Help's own use.

**Walking (Gerald: "remove any glitching... they should just go around that person"):** measured first
(tests/tWalk4H.js): twelve people walking through the forest, ten soldiers through a line of people standing in their way,
ten picking berries five to a bush. Causes found by switching parts off: separate() shoved everyone apart every frame,
backwards too, and fully in one frame; slideAround picked a side again every frame; people at work counted as "moving"
so passers-by shoved them; the places round a bush were closer together than a person is wide. Fixes (units.js): a
walker is only nudged aside, never back against his way, and no more than about a point a frame; one side is kept a
moment when passing, two meeting head-on both keep right, and walkers going the same way follow; each worker gets his
own place round a bush, tree or rock, a person's width apart, and walks right to it; a person at work does not budge for
passers-by. 3D figures face the way they are going (the next point of their path), not the way a nudge moved them.

| | back-and-forth turns a minute | sudden head turns a minute | shifting while standing (points a second) |
|---|---|---|---|
| forest, before → after | 59 → about 8 | 102 → about 13 | 2.9 → 0.8 |
| through people | 52 → about 5 | 71 → 0 to 1 | 2.1 → about 1 |
| berry picking | 10 → 7 to 13 (crowded two-way traffic) | 20 → about 6 to 9 | 4.9 → 0.5 to 0.9 |

**Checks:** tests/tFarming4H.js (five fields of ten, no merging, the crops and their speeds, people on and off, mood and
well, two farms of five, ticked animals only, farm food, levels with the stable, the lookout, the guards, the market,
the boxes); tests/tWalk4H.js; tests/tHelp.js (no "What is this?" anywhere).

**Full suite:** 70 of 75 in one run; all five failures traced. tFormation, tGroups and tSoldiers: the game's chance
illness sent a watched soldier walking to the keep (as designed); shown by making him ill on purpose (the same failure
each time) and by the old build failing tFormation 1 run in 6. Those checks now clear illness for the soldiers they watch.
tWater (butterflies by the shore): the old build fails it too, 1 run in 3 (they settle in the meadow when no shore spot
is found quickly); left as it is. tTg2 timed out while another heavy check ran beside it; alone it passes.
**Speed** (tests/bench.js, game logic only, 800 people in a big battle, ms a frame; this machine varies a lot): before
6.0, 6.4, 6.3; after 7.6, 7.4, 6.9, 7.0, 8.2. About 1 ms more at 800 (the walking fix), far inside 16.7 ms; at 400 no
change (2.9 against 3.0).
**Guide pictures:** tools/guide3_shots.js passed 'player' as a building's direction, so every building it placed for the
photographs was left out of the 3D pictures (the town photographs in the 4F and 4G guides had no houses, market, school
and so on). Fixed; all 45 pictures retaken; the Field's and Farm's pictures show their crops and animals.

**Waiting on Gerald:** ten in a field (he also said "up to five people can be in one field"); whether the guard should be
free (he said it "comes with these buildings"; it costs 25 gold now); turkeys and sheep kept; the vineyard, orchard and
hop farm kept; the farm level times, well and lookout costs (Claude's numbers).

## Phase 4I: tap a field or farm; food first; guards free (Gerald, after 4H)

**What Gerald said:** "I do not see the improvement to the field yet, nor to the farm... I don't have a box that pops up
once I click on the farm or the field... a box pops up right next to it"; people were short of food and leaving ("I keep
getting the response that I need to send people to the farm"); "the food needs to be picked first... automatically...
even if I build the field, they need to go back and pick the food, and then someone else gets the field"; answers: ten in
a field is right; the guard "comes with the building... free like the knight that comes for the tower"; keep turkeys,
sheep and the vineyard; the numbers suit.

**Causes found:** the 3D view's picker (world3d.js pick) and the flat view's (input.js pickAt) looked only at people and
`structures`; fields and farms live in `farms`, so a tap on one found nothing (on a computer a click could sometimes reach
it through pickResource; on an iPad never), and a tap on a worker in the field chose the worker. Food: in 4H the farm's
keepers brought food every 8 s (the old farm gave about 50 a minute; the new one about 15), a new field started on wheat
(no food until a mill), and every new workplace called people away from picking berries.

**Now:**
- A tap or click anywhere on your field or farm (even on someone working or guarding it) opens its box; on an iPad or
  computer it opens beside it (the view slides, and steps back a little if needed, so both fit); a phone keeps its own
  place. The farm's box has People − and + at the top. Orders still work: people chosen and sent to a field work it.
- Food first (settings.js FOOD_FIRST, in minutes of eating): below 4 (and 120 food), no one picking food is called away
  and people with no job (and jobless wood and stone gatherers, unless you sent them) pick food; below 2, work that is
  not food takes at most one; below 0.75, people leave such work to pick food, the alehouse first and the woodcutters
  last, until enough pick (one picker for about 18 food a minute). Food work (farm, a field on corn, mill, bakeries) keeps
  its people.
- A new field starts with two on corn; seconds of work: wheat 4, corn 5, grapes 10; loads 10, 10, 5. Farm keepers every
  2.5 s, loads of 10.
- Guards come with the field (2) and farm (1) when finished, free and with no place in the houses (u.gift, as the
  tower's knight); Reserve brings a new one free; the box shows their health and whether they are fighting.

**Checks:** tests/tTapField4I.js (real mouse clicks and finger taps on the field, the farm, a worker and a guard, the box
beside them, sending a citizen to the field; the guards; food first). tFarming4H, tIndustry and tCitizens updated (they
switch food-first off where a town of 40 has little food, or remove the field's guards to see the sentry alert).
Master Guide: a photograph of a tap opening the field's box beside it; the farm's and field's boxes retaken.

## Where we left off (for a fresh session)

**Latest (Phase 4I, the fresh play link https://claude.ai/artifact/4ah7F6R1GD71CrfrJacMEK version 4):** a tap opens a field's or farm's box beside it; food first; guards free (section above). Before that, Phase 4H (version 2): the Field and the Farm, guards, wells and lookouts, animals at the top price, walking without glitches, no "What is this?" (section above). Before that, Phase 4G (play link version 58): Gerald's answers after 4F (generals, berserkers, raids, Add); before that, Phase 4F: branch `upgrade-v2` holds Phases 4A to 4F and the Help screen, all
built and checked, and the Master Guide version 3; the sections above list what each step does, the tests, the speed and the art still needed. Open for
Gerald: whether a five-star general (10 stars) should count for more, and whether the raid numbers suit (Phase 4G).
Before that: Phase 4C (steps C0 to C9); its section lists the settings, the assumptions and the art still needed.
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
