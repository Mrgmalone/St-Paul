# Stronghold Destroyer — 3D model checklist (Path A)

Gerald chose 3D models made from his design sheets. The game is ready for them:
when a model file is present it replaces the built-in figure or building; anything
without a model keeps its current look. Controls and gameplay do not change.

## How the game finds models

- Files live in a `models/` folder next to the game, listed in `models/models.json`
  (Claude writes this list when the files arrive).
- One file per unit or building, in **.glb** format (binary glTF, textures inside).
- Moves (animations) can be inside the same file, or in separate files named
  `<name>-walk.glb`, `<name>-attack.glb` and so on.
- Enemy (Black Stone) versions are optional: `<name>-enemy.glb`. Without one, the
  game darkens the player model for the enemy.

## File names

| Game unit | File name |
|---|---|
| Swordsman | `swordsman.glb` |
| Spearman | `spearman.glb` |
| Archer | `archer.glb` |
| Armored Soldier (maceman) | `armored-soldier.glb` |
| Knight | `knight.glb` |
| King | `king.glb` |
| Crossbowman (new unit, coming) | `crossbowman.glb` |
| Male citizen | `citizen-male.glb` |
| Female citizen | `citizen-female.glb` |
| Builder | `builder.glb` |
| Farmer | `farmer.glb` |
| Gatherer | `gatherer.glb` |
| Miller | `miller.glb` |
| Brewer | `brewer.glb` |

Buildings use the game's own names: `keep.glb`, `house.glb`, `market.glb`,
`tavern.glb`, `chapel.glb` (House of Prayer), `mill.glb`, `bakery.glb`,
`brewery.glb`, `smithy.glb` (Blacksmith), `granary.glb`, `stockpile.glb`,
`woodhut.glb`, `quarry.glb`, `wall.glb`, `gate.glb`, `gtower.glb` (wood tower),
`stower.glb` (stone tower), `roundtower.glb`, `lookout.glb`, `greattower.glb`.

## Moves for people (names the game understands)

| Move | Used when | Name it (any of these words work) |
|---|---|---|
| Idle | standing | `Idle` |
| Walk | moving | `Walk` |
| Run | charging, fleeing | `Run` |
| Attack | striking or shooting | `Attack` (or Slash, Thrust, Fire, Shoot) |
| Die | killed | `Die` (or Death) |
| Work | citizens at work | `Work` (or Chop, Hammer, Gather, Build, Dig) |

## Size and performance (iPad)

- Character facing forward, standing on the ground, any height (the game sizes it).
- About 10,000 to 15,000 triangles per person, textures 1024 x 1024 or smaller.
- Buildings: up to about 40,000 triangles, textures 2048 x 2048 or smaller.
- Keep each file under about 10 MB.

## Delivery

Put the files in the Google Drive folder "Game Two — RTS" (a `Models` folder in it
is ideal) or attach them in the chat. Start with one unit (the swordsman) to prove
the look, then the rest.
