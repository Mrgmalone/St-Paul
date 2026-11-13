# Image-generator prompts (Phase 4D, step D3)

Everything the game draws today is made in code. These are the pictures code cannot make well: painted, design-sheet
quality art. Each prompt below is ready to paste into an image generator. When a picture comes back, save it with the
**file name** shown and put it in the folder shown; the game picks it up by itself, with no change to the code
(pictures that need cutting out first, marked **cut**, go through `tools/cut_units.py`, which Claude runs).

**Rules for every picture** (from `design/MISSING-ART.md`):

- Style: the asset sheets' look, a 2008-era painted medieval strategy game, soft light from the upper left, crisp edges.
- Figures and buildings: one subject per picture, on **flat pure magenta (#FF00FF)**, no shadow or floor, seen from
  **about 40 degrees above, three-quarter view**. Units in the sheet's **blue and gold** (the game recolours them).
- Inside pictures and the People face: a full painted scene (no magenta), described in each prompt.

---

## 1. Soldier figures (most important)

Today these soldiers wear their own gear on the shared jointed 3D figures (the flat view shows a picture of that 3D
figure). Sheet-quality pictures, once cut out, replace the button pictures (a front view saved as
`art/units/<type>.png`, for example `art/units/archer.png`) and guide the 3D figures.

| # | Picture | File names | Folder | Size | Where it shows |
|---|---|---|---|---|---|
| 1a | Longbowman | `longbow-front.png`, `-left.png`, `-right.png`, `-back.png` | `design/incoming/` (**cut**) | 1024 tall each | flat view, training buttons, People list, Help |
| 1b | Crossbowman | `crossbow-…png` (four views) | `design/incoming/` (**cut**) | 1024 tall | same |
| 1c | Flame trooper | `flame-…png` (four views) | `design/incoming/` (**cut**) | 1024 tall | same |
| 1d | Berserker | `berserker-…png` (four views) | `design/incoming/` (**cut**) | 1024 tall | same |
| 1e | Mounted knight | `mknight-…png` (four views) | `design/incoming/` (**cut**) | 1024 x 1024 | same |

**1a Longbowman**
```
A medieval longbowman for a 2008-era painted real-time strategy game, full body, standing, holding a tall yew longbow as tall as himself, quiver of white-fletched arrows on his back, padded blue gambeson with gold trim, gold-edged hood, leather bracer, brown boots. One figure only, whole, feet at the bottom, on a flat pure magenta (#FF00FF) background, no shadow, no floor. Three-quarter view from about 40 degrees above. Soft light from the upper left, crisp painted edges. Make four separate pictures: front, left side, right side, back.
```

**1b Crossbowman**
```
A medieval crossbowman for a 2008-era painted real-time strategy game, full body, standing, holding a heavy steel crossbow with a stirrup at the front, bolt case at the hip, blue tabard with a gold border over mail, kettle helmet, brown boots. One figure only, whole, feet at the bottom, on a flat pure magenta (#FF00FF) background, no shadow, no floor. Three-quarter view from about 40 degrees above. Soft light from the upper left, crisp painted edges. Make four separate pictures: front, left side, right side, back.
```

**1c Flame trooper**
```
A medieval flame trooper for a 2008-era painted real-time strategy game, full body, standing, a copper fire-pot tank on his back with a hose to a long brass nozzle held in both hands, a small pilot flame at the tip, blue leather apron and gloves with gold rivets, soot-darkened hood and goggles. One figure only, whole, feet at the bottom, on a flat pure magenta (#FF00FF) background, no shadow, no floor. Three-quarter view from about 40 degrees above. Soft light from the upper left, crisp painted edges. Make four separate pictures: front, left side, right side, back.
```

**1d Berserker**
```
A medieval berserker warrior for a 2008-era painted real-time strategy game, full body, standing, broad and fierce, bare muscular arms, a wolf-fur cloak over the shoulders, two hand axes, blue war paint on the face, blue kilt with a gold belt, leather boots. One figure only, whole, feet at the bottom, on a flat pure magenta (#FF00FF) background, no shadow, no floor. Three-quarter view from about 40 degrees above. Soft light from the upper left, crisp painted edges. Make four separate pictures: front, left side, right side, back.
```

**1e Mounted knight**
```
A medieval mounted knight for a 2008-era painted real-time strategy game, a knight in full plate armour with a lance and a kite shield, riding a strong warhorse in a blue caparison with gold trim and a gold-crested helmet plume. One horse and rider only, whole, hooves at the bottom, on a flat pure magenta (#FF00FF) background, no shadow, no floor. Three-quarter view from about 40 degrees above. Soft light from the upper left, crisp painted edges. Make four separate pictures: front, left side, right side, back.
```

---

## 2. Buildings (sheet-quality outsides)

Today these are code-built 3D models (the flat view shows a picture of the 3D model). A painted picture replaces the
button picture, the flat-view picture and the Help picture.

| # | Building | File name | Folder | Size |
|---|---|---|---|---|
| 2a | School | `school.png` | `art/buildings/` | 1024 x 1024 |
| 2b | Apothecary | `apothecary.png` | `art/buildings/` | 1024 x 1024 |
| 2c | Church | `church.png` | `art/buildings/` | 1024 x 1024 |
| 2d | Abbey | `abbey.png` | `art/buildings/` | 1024 x 1024 |
| 2e | Engineer's hut | `engineerhut.png` | `art/buildings/` | 1024 x 1024 |
| 2f | Stable | `stable.png` | `art/buildings/` | 1024 x 1024 |
| 2g | Alehouse | `alehouse.png` | `art/buildings/` | 1024 x 1024 |
| 2h | Water pot | `waterpot.png` | `art/buildings/` | 1024 x 1024 |
| 2i | Vineyard | `vineyard.png` | `art/buildings/` | 1024 x 1024 |
| 2j | Orchard | `orchard.png` | `art/buildings/` | 1024 x 1024 |
| 2k | Wood yard with horse and wagon | `woodhut.png` | `art/buildings/` | 1024 x 1024 |

The same opening goes in front of each: *"A single medieval building for a 2008-era painted real-time strategy game,
seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow,
no ground beyond its own small plot, soft light from the upper left, crisp painted edges, blue and gold banners."*
Each prompt below already includes it.

**2a School**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a small stone schoolhouse with a slate roof, a little bell cupola, tall arched windows, a slate board and benches by the open door, blue and gold banner over the door.
```

**2b Apothecary**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a narrow half-timbered apothecary shop with a steep red-tiled roof, herbs drying under the eaves, coloured glass bottles in the window, a small herb garden in front, a blue and gold sign with a mortar and pestle.
```

**2c Church**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a stone parish church with a square bell tower and a pointed spire topped by a gold cross, a round rose window, a slate roof, wooden doors under a carved arch, blue and gold banners.
```

**2d Abbey**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a large stone abbey with a long nave, a tall bell tower with a gold cross, a cloister garden with a well, stained-glass windows, a slate roof, blue and gold banners.
```

**2e Engineer's hut**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a sturdy timber workshop with a wide open front, a half-built catapult arm and spare wooden wheels outside, rope coils, a drafting table with plans, a small crane, blue and gold banner.
```

**2f Stable**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a long wooden stable with a thatched roof and three half-doors, two horses looking out, hay bales and a water trough in front, a small fenced paddock, blue and gold banner.
```

**2g Alehouse**
```
A single medieval building for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a small cosy half-timbered alehouse with a thatched roof, a hanging sign with a foaming tankard, barrels stacked by the door, a bench outside, warm light in the windows, blue and gold trim.
```

**2h Water pot**
```
A single medieval object for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a large clay water pot on a low stone stand, full of water, with three wooden buckets hanging from it and a small blue and gold pennant on a pole, used by villagers to fight fires.
```

**2i Vineyard**
```
A single medieval vineyard plot for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a small square vineyard of four rows of grape vines on wooden stakes and wires, heavy purple grape bunches, a low wooden fence, a basket of grapes at one corner.
```

**2j Orchard**
```
A single medieval orchard plot for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a small square orchard of nine round apple trees in three rows, red apples in the leaves, green grass, a ladder against one tree and a basket of apples, a low wooden fence.
```

**2k Wood yard with horse and wagon**
```
A single medieval wood yard for a 2008-era painted real-time strategy game, seen from about 40 degrees above at a 45-degree angle, whole, on a flat pure magenta (#FF00FF) background, no shadow, soft light from the upper left, crisp painted edges: a woodcutter's timber hut with a sawhorse, stacked logs and a chopping block with an axe, and a brown horse pulling a four-wheeled wagon loaded with logs beside it, blue and gold pennant.
```

---

## 3. Inside pictures (the picture at the top of each building's box)

Today these are simple code drawings. Each painted picture replaces the drawing for that building at every stage.
**Size 1200 x 480** (wide, 5 by 2). **Folder `art/inside/`**, file name as in the table (a `.jpg` is best).
Keep the **bottom third plain** (floor, ground or a table top): the box's words sit over it.

The opening of every inside prompt (already included below): *"A painted interior scene for a 2008-era medieval
strategy game, wide 5:2 picture, eye-level view into the room, warm light from a window on the upper left, rich but
clear colours, no text, no close-up faces, the bottom third plain floor"*.

| Building | File | Building | File |
|---|---|---|---|
| Wood yard | `woodhut.jpg` | Market | `market.jpg` |
| Quarry | `quarry.jpg` | School | `school.jpg` |
| Iron mine | `ironmine.jpg` | Engineer's hut | `engineerhut.jpg` |
| Farm | `farm.jpg` | Apothecary | `apothecary.jpg` |
| Stable | `stable.jpg` | House of Prayer | `chapel.jpg` |
| Wheat field | `wheatfarm.jpg` | Church | `church.jpg` |
| Hop farm | `hopfarm.jpg` | Abbey | `abbey.jpg` |
| Vineyard | `vineyard.jpg` | Blacksmith | `smithy.jpg` |
| Orchard | `orchard.jpg` | Fletcher (bows) | `bowyer.jpg` |
| Mill | `mill.jpg` | Spear-maker | `poleturner.jpg` |
| Bakery | `bakery.jpg` | Armory | `armory.jpg` |
| Granary | `granary.jpg` | Stockpile | `stockpile.jpg` |
| Alehouse | `alehouse.jpg` | Brewery | `brewery.jpg` |
| Tavern | `tavern.jpg` | The keep (great hall) | `keep.jpg` |

**Wood yard**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain floor: inside a timber wood yard shed, stacked round logs, a sawhorse with a two-man saw, axes on the wall, sawdust in the air.
```
**Quarry**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm afternoon light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain ground: a stone quarry face with cut grey blocks, a wooden crane with a rope, an ox waiting by a sled of stone, chisels and mallets.
```
**Iron mine**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, lantern light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain rock floor: a timber-propped mine tunnel into reddish rock, a mine cart full of rust-red iron ore on rails, picks and lanterns.
```
**Farm**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain straw floor: inside a farm barn, a cow, a pig and hens, a milk pail, sacks of grain, a pitchfork, the door open onto green fields.
```
**Stable**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain straw floor: wooden horse stalls with a brown and a grey horse, saddles and bridles on pegs, hay bales, a water trough.
```
**Wheat field**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, golden late-summer light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain stubble: tall ripe wheat with sheaves bound and stacked, a sickle and a basket, a windmill far off.
```
**Hop farm**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain earth: tall poles wound with green hop vines heavy with pale green hop cones, a basket of picked hops.
```
**Vineyard**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain earth: rows of grape vines on stakes with heavy purple bunches, a wooden basket of grapes, a small wine press.
```
**Orchard**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm light from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain grass: round apple trees full of red apples, a ladder against a trunk, baskets of apples on the grass.
```
**Mill**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: inside a windmill, the great round millstones and wooden gears, flour dust in the light, sacks of flour.
```
**Bakery**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm glow from a domed brick oven on the left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: loaves of bread on a long table, a wooden peel, sacks of flour.
```
**Granary**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a high window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a storehouse with rows of grain sacks, baskets of apples and cabbages, hanging hams, a cat keeping watch.
```
**Alehouse**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm firelight from the left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a small cosy alehouse, barrels with taps along the wall, foaming tankards on a plank table, a small hearth.
```
**Tavern**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm firelight from a big hearth on the left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a busy tavern hall, long tables with tankards and bread, barrels behind the bar, a minstrel's lute on the wall.
```
**Brewery**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: a large copper brewing kettle over a fire, oak barrels, sacks of hops and barley, a wooden paddle.
```
**Market**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, bright daylight from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain cobbles: market stalls under striped red, blue and green awnings, bread, cloth, pots and weapons for sale, a set of scales and coins.
```
**School**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a tall window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a schoolroom with a slate board, wooden benches, books and scrolls on a shelf, a globe and a candle on the master's desk.
```
**Engineer's hut**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a workshop with plans of a catapult pinned to a table, a model trebuchet, spare wheels, ropes and pulleys, carpenter's tools.
```
**Apothecary**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: shelves of coloured glass bottles and clay jars, herbs hanging to dry, a mortar and pestle, a small sick bed with a clean blanket.
```
**House of Prayer**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, soft light through a small window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: a small simple chapel, a plain altar with a wooden cross and two candles, a few wooden pews.
```
**Church**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, coloured light through a stained-glass window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: a stone church nave with pews, an altar with a gold cross and candles, stone arches.
```
**Abbey**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, soft light through tall stained-glass windows on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: a grand abbey church with tall pillars and arches, an altar with a gold cross, choir stalls, hanging lamps.
```
**Blacksmith**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, orange glow from a forge on the left, rich but clear colours, no text, no close-up faces, the bottom third plain earth floor: an anvil with a hammer, tongs and horseshoes, swords and maces on a rack, a water barrel.
```
**Fletcher (bows)**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a bowyer's workshop with unstrung yew bows on the wall, bundles of arrows, feathers and a work bench with a drawknife.
```
**Spear-maker**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain wooden floor: a turner's workshop with long ash spear shafts on a rack, steel spear heads on a bench, a pole lathe.
```
**Armory**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, light from a window on the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: racks of swords, spears and bows, suits of armour on stands, shields with a blue and gold crest on the wall.
```
**Stockpile**
```
A painted scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, daylight from the upper left, rich but clear colours, no text, no close-up faces, the bottom third plain packed earth: a covered store yard with stacked logs, cut stone blocks, sacks and crates under a timber roof.
```
**The keep (great hall)**
```
A painted interior scene for a 2008-era medieval strategy game, wide 5:2 picture, eye-level view, warm firelight from a great hearth on the left, rich but clear colours, no text, no close-up faces, the bottom third plain stone floor: a castle great hall with a long oak table, a carved throne, blue and gold banners on stone walls, torches.
```

---

## 4. The People button face

| Picture | File | Folder | Size |
|---|---|---|---|
| A villager's face | `people-face.png` | `art/ui/` | 256 x 256 |

```
A round portrait icon for a 2008-era painted medieval strategy game: the friendly face of a young medieval villager wearing a blue hood with a gold trim, warm smile, rosy cheeks, soft light from the upper left, painted style, centred in a circle, on a flat pure magenta (#FF00FF) background outside the circle.
```

