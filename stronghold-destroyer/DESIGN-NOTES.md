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

## Where we left off (for a fresh session)

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
