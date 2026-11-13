# Stronghold Destroyer: master design (owner: Gerald)

## How to work
- Keep what already works: rules, economy, combat, controls, sound. The changes are mostly the look, plus the gameplay listed here.
- One phase at a time. At the end of each phase, run the tests and long automated games, then report in plain language: what changed, what I need to decide, anything that looks wrong. I don't read code.
- Never leave the game broken or slower. Measure frame rate before and after each phase on a large game.
- Must keep opening from a link and running on iPad.
- Don't invent numbers silently. Propose costs, thresholds and balance, explain each in one line, and I will adjust.

## Look
- Final art direction is the asset PDF: page 1 military units, page 2 battlefields, bricks (brown, gray, green, black-gray-green; straight wall, block, arch, corner, battlement), ground and vegetation, bridge, river. Style is a 2008-era isometric RTS. Replace the old character looks completely.
- ONE view only: fixed isometric. Remove the 2D/3D toggle and the camera turning and tilting. Pick the lightest way to render it and tell me why.
  - Update (Gerald's Phase 2 follow-up, overrides the line above): the game STAYS TRUE 3D in three.js. No isometric or 2D view. The 2D view and the V toggle are gone; no camera turning or tilting (no Q, E, R, F, no twist or tilt buttons). The camera is fixed at one angle (45 degrees round, 40 degrees down) with smooth zoom (wheel, pinch, buttons) and scrolling only.
  - Units are the sheet's flat pictures standing in the 3D world, facing the camera, using the left, front and right views (right is the left view mirrored). Terrain, water, walls, towers and buildings are real 3D, built in the sheet's brick, wood and ground style.
  - Outlines, not cutouts: a person hidden behind a building, wall, tower or tree is drawn as a team-coloured silhouette over the top. Buildings stay solid.
- Keep the trees. Redo ground, grass, water, bridges and castle bricks to match the sheet.
- King: the knight with a crown, regal robe, bigger sword and richer helmet. Civilians restyled to match.
- For every unit or building with no art on the sheet (back views, walk frames, civilians, maceman, ram, ballista, king), make a stand-in in the same style, and give me a list of the images I should make in an image generator.
- The old buttons and layout were bad. Redesign for iPad touch first: big clear buttons, uncluttered, tidy panels.
  - Button rules (side panel: training people, collecting materials, placing buildings): no names under the buttons; each button is a large picture of the item filling nearly all of it, with a thin margin and a small corner badge for the count. About one inch square on the iPad (130 points), the same size everywhere, never under 44 points. Tapping or hovering shows the name in a small label above. Items with no picture yet get a stand-in in the same style and go on the missing-art list.

## Calm people and glitches
- Idle people sit or stand still and only move their head or eyes. They don't wander. People on watch sit and look around.
- No circling, no freezing in doorways, no stuck units. My other game, Glowroot Town, solved this. If you can access that project, compare how it handles movement and bring the fixes over. If you can't, say so and fix it independently. Long test games must show zero stuck units.
- Keep the game smooth with many units. Raise the cap on people substantially, as high as stays smooth, and tell me the number you reached.
- People near each other should look like they are talking (chatter sound or a small gesture), without heavy animation.

## Map and fog of war
- The land is much wider now (128 by 80 squares, was 96 by 56). The world ends at a fancy gold frame like a game board, with ornate gold corner pieces. Inside the frame is a band of water, then the land; outside the frame is plain black. Trees and ground run right to the water.
- Living water: all water moves, with gentle waves and occasional splashes; now and then a fish jumps. Birds fly over, butterflies flutter over the grass, frogs sit by the shore. Sporadic, cheap to draw, capped, and fewer automatically when the frame rate drops.
- Large map, not endless, with room for every people to grow. Start positions are random every game, for me and the rivals. Offer a seed option for testing only.
- Fog of war every game. I don't know where the enemy camp is. Explored ground stays revealed. Ground is revealed by exploring, or when enemies show themselves.
- Sight: longbowmen see twice as far as any other unit. A ballista on a tower matches longbow sight. Berserkers see as far as longbowmen.
- Reserve growth ground around every camp ahead of time.

## Start and castle growth
- I start with a knight just made king, a few civilians, a shack in the woods and a small palisade. Wood and food only.
- (Gerald, after Phase 3) The king starts on foot, since mounted knights do not come until stage 4. No faction starts with an army: my first soldiers are bought at stage 1, and those are spearmen and archers. Swordsmen stay in the game; which stage they belong to is Gerald's call (Claude suggested stage 3, the Hold, since swords need iron). To confirm: the Units line below says knights come at stage 3.
- Five stages: 1 Shack. 2 Homestead (palisade, houses, farms, small barracks). 3 Hold (small stone keep, first stone walls and towers, iron workshop, swordsmen, knights). 4 Castle (full keep, gatehouse, giant towers, siege engines). 5 Stronghold (great castle, best armor).
- Upgrades happen automatically when requirements are met (people, happy people, food, stone, iron, buildings standing). Propose the thresholds. Adding to the castle still costs stone, iron, food and building time.
- On upgrade the castle footprint grows about 2-3 blocks in every direction. Trees and rocks in the way are cleared. Wood becomes brick becomes stone becomes thicker stone. Any of my buildings inside the new footprint move inside the new walls automatically, with a small payment if needed. Nothing is lost.
- Units: stages 1-2 are spearmen, berserkers, crossbowmen and archers. Archers upgrade to longbowmen at stage 2 and cost more. Knights need iron and come at stage 3.
- Towers: stage 4 giant towers come empty. A ballista can be added (about 5,000 coins) or a trebuchet (about 10,000). At stage 5 every tower comes with one. Scale prices to the economy so these are real goals.
- Apothecary, church, monastery and abbey: once built, health and happiness are handled unless the building is destroyed, and the bigger ones are stronger. Taxes and food stay but should be light. Build these in the sheet's brick look in different colors.

## Four peoples (working names)
I pick one at the start and it changes how I build. The computer plays the rivals (number is a start-up setting), and one rival can be a trading friend who trades with me at the same stage level but with a different build.
- Cy Young (bread makers): mill and bakery make 4-5x the food and they sell surplus for money, so they out-buy and out-upgrade others. No special power. The weakness is that slowing them early is the best counter.
- Ticanologue (marketers): their market prices are half of everyone else's, but the market costs a lot to build.
- Hekaranok (healers): wounded units run home to the castle or abbey, heal and return to exactly where they were. I can ring a bell to recall them. Double the people, but each is weaker. Killed units are not healed. Their abbeys are stronger.
- Psychana (sight and stealth): all units see as far as longbowmen. Berserkers can sneak up unseen in groups under 10. Towers and palisade towers near a castle still spot them.

## Rivals, raids and combat
- Rivals follow the same stages and the same economy rules as me. They build up visibly over time, with houses and food and workshops, and never start with a finished castle. Their stage depends on their economy, so raiding their farms slows them. A rival rushed early is small, and the game can end fast.
- Raids come from different directions each time. Rams, catapults and other siege engines come only with a large army, never with a few riders. Small groups are scouts and light raiders.
- Separate random rogues and bandits unrelated to any rival steal and run off.
- Effects: red and yellow sparks on every hit (no blood), sword clash sounds, arrow sounds, bricks visibly tumbling through the air. Generate sounds in code.
- Challenging but winnable. A good player who rushes an early rival can win in about 15 minutes.

## Art of War advisor
- Always on, cannot be turned off. A small panel in a top corner, clear but not covering play.
- Gives timely tips based on the situation (high ground, traps, which direction raiders come from, build a tower here). Short, in your own words, credited to Sun Tzu's The Art of War. One tip at a time, not constant.

## Phases
1. Foundation: save tests, split the one big file, fix idle behavior and circling, measure speed and the people cap. No look changes. (Done.)
2. The new look and interface: true 3D with a fixed camera, the sheet's art direction, team colours, picture-first buttons, wider map with the gold frame, living water. (Done.)
3. Fix-up (Gerald's list after Phase 2): soldiers rebuilt as moving, fighting 3D figures in the sheet's look (no flat pictures); the enemy in the Black Stone look; my start as a shack in the woods with a small wooden palisade; ground, roads, water, stone bridge and brick walls rebuilt in the sheet's style; dense forests with clear roads; the old menu, help screen and building panels restyled to match the new interface. (Done; waiting for Gerald's review.)
4. The four peoples, rival factions (start screen, rival AI, trading friend), and the wildlife and detail effects.
5. Big map, random starts, fog of war.
6. Castle stages, growth, absorbing buildings, unit unlocks, new buildings, tower weapons.
7. Raids, combat effects and sounds, difficulty.
8. Art of War advisor and final polish.

## Where we left off
- Phase 1 (foundation) is done: tests saved, one big file split into modules, calm idle people, no circling or stuck units in the long games, people cap 400.
- Phase 2 (look and interface) is done, as changed by Gerald's follow-up: true 3D with a fixed camera (45 degrees round, 40 degrees down) and zoom only; the sheet's units as picture cards with team colours (crimson and gold with a gold lion; Black Stone charcoal and ember) from one recolour system ready for the four peoples; buildings and ground in the sheet's bricks, grass, dirt and water; team-coloured outlines behind buildings, walls, towers and trees; picture-first side buttons; a wider map ending in water and a gold frame; living water and small wildlife. The list of pictures still to make is design/MISSING-ART.md.
- Phase 3 (fix-up) is done and waiting for Gerald's review. Gerald will not make more art in an image generator: every unit is built in code from the sheet. Done: soldiers are jointed 3D figures that walk, wind up, swing, flinch and fall, with sparks and no blood (the king wears a crown, the knight rides a trotting horse); the Black Stone camp in blackened brick with ember trim; the start is a log shack with a lookout, a small log palisade, a few civilians, wood and food only, and a newly made king; a river from shore to shore with a stone bridge at each road; dense forests with clear roads; the menu, help screen, start screen and building panels in the dark style with big buttons and a big round X. Speed is level with Phase 1 at 100 people and better at 800. The long games show no stuck, circling or frozen units.
- Gerald's answers after Phase 3: no starting army for any faction (removed: your 3 swordsmen, 2 spearmen and gift knight on horseback, your 2 spears and 2 bows in store, and the enemy's 5 guards; the enemy keeps its lord and its workers); keep the simple crowns deep in the woods with full detail at the edges, as long as the speed matches Phase 1, with a soft change between them; side buttons stay 130 points on the iPad (about an inch) and scale down on phones (64 points), still easy to tap.
- After Gerald's answers (done): civilians dressed from the sheet (linen shirts, leather vests, bodices, aprons, hats and scarves; team sash at the waist); the knight's horse cloth has a rear panel; guards no longer get shoved off their post; enemy siege engines no longer get stuck by their own camp; simple crowns deep in the woods keep a finer leaf pattern and a quarter of the first row behind each edge keeps full detail (speed level with Phase 1). Phone buttons 64 points, iPad 130.
- Open for Gerald: knights at stage 3 or mounted knights at stage 4 (the two lines disagree); which stage swordsmen belong to (Claude suggests 3); zoomed all the way in, the simple crowns still show flat facets: a rounder shape fits Phase 1's speed only in place of the softer edge, not with it; the phone layout as a whole (top bar wraps, the command bar and map cover much of the view) has not been redone.
- Still rough: the extra soldier outfits (longbowman, crossbowman, flame trooper, berserker, heavy spearman) show only in tests until Phase 4 brings the peoples.
