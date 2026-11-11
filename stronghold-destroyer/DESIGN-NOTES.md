# Stronghold Destroyer — design notes for later

## Multiplayer (not built yet)

Gerald's rules for pausing when multiplayer is added:

- A pause in multiplayer needs **both sides to agree**.
- **No pausing during war** (while enemies are engaged or close by).
- In single player today, the game pauses on its own while a menu is being read
  (Help, Menu, mood report, goods list, building panels), unless enemies are close.

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


## Final art direction (branch `stronghold-destroyer-art`)

Gerald's final art direction is `design/Stronghold_Destroyer_Assets.pdf`: page 1
(`design/sheet4-military-units.png`) has ten units in left, front and right views in a
2008-era isometric RTS style; page 2 (`design/sheet5-battlefields-materials.png`) has
battlefields, brick sets, ground patches and two trees, for the next step.

- `tools/cut_units.py` cuts each unit into transparent views (`sprites/units/`), recolours
  blue and green cloth to Gerald's crimson (gold, steel, wood and skin untouched) and makes a
  Black Stone enemy version (charcoal cloth, ember-orange gold, darker steel). It writes
  `sprites/units.js`, which embeds every view so the game cannot lose them.
- Units drawn only from this art, in 2D and 3D (no code-built fallback): swordsman,
  spearman, archer, knight (the Mounted Knight), catapult, trebuchet. The game waits for the
  art before starting and says plainly if it cannot load.
- Views: the view comes from the direction of travel as the viewer sees it: within about
  43 degrees of straight towards the viewer shows the front; otherwise the side the unit is
  heading towards. The sheet has real right views, so those are used rather than mirrored
  left views. There is no back view: a unit walking away shows the side view of the way it
  drifts (left or right), and keeps its last side when heading straight away.
- In 3D each picture stands on the unit's spot, turns to the camera and leans back to face
  it squarely.
- Waiting on Gerald: Berserker, Flame Trooper, Crossbowman and Heavy Spearman are cut and
  coloured but not used; maceman, ram, ballista, the King, Lord Varek, civilians and the ox
  cart have no art on the sheet and keep their old look until he decides. Camera: the
  recommendation is to lock the 3D camera to one fixed angle (see the report); not changed yet.
- Tests now live in `tests/` (`node tests/run-all.js`).
