# One-off: splits the single-file game (index.html) into a stylesheet and ordered script files.
# Kept for the record of how the split was made; the files it wrote are now edited directly.
import os, re, sys
src = open('index.html').read().split('\n')   # line N of the file is src[N-1]
L = lambda a, b: '\n'.join(src[a - 1:b])
assert src[400] == '<script>' and src[7038] == '</script>' and src[8] == '<style>' and src[212] == '</style>'
PARTS = [  # (file, first line, last line, what it holds)
    ('core.js', 407, 1107, 'constants and helpers, sprites, heraldry, map grid, roads, world objects, terrain, unit definitions, the land, pathfinding, combat helpers, particles'),
    ('units.js', 1108, 1702, 'orders, how each unit thinks and moves, civilians'),
    ('draw2d.js', 1703, 2532, 'the flat view: people, building materials, scenery, trees, atmosphere'),
    ('input.js', 2533, 2914, 'canvas, camera, mouse and keyboard, touch, the status bar'),
    ('rivals.js', 2915, 3186, 'raids and tower archers, the enemy camp, Lord Varek'),
    ('town.js', 3187, 3569, 'mood, economy, self-running workers'),
    ('castle.js', 3570, 4291, 'castle and town building, panels, market'),
    ('audio.js', 4292, 4540, 'sound and music, made live in code'),
    ('ui.js', 4541, 4775, 'interface: status chips, tabs, pictures, minimap, mood report, menu'),
    ('world3d.js', 4776, 6656, 'the 3D world (three.js)'),
    ('main.js', 6657, 7038, 'rally points, weather, outlines, main loop, start'),
]
assert PARTS[0][1] == 407 and all(PARTS[i][2] + 1 == PARTS[i + 1][1] for i in range(len(PARTS) - 1)) and PARTS[-1][2] == 7038
os.makedirs('js', exist_ok=True); os.makedirs('css', exist_ok=True)
head = L(402, 406)   # 'use strict' and the title comment
for name, a, b, what in PARTS:
    with open('js/' + name, 'w') as f:
        f.write("'use strict';\n// Stronghold Destroyer — " + what + '.\n// Loaded in order by index.html; all files share one global scope.\n\n' + L(a, b) + '\n')
with open('css/game.css', 'w') as f: f.write(L(10, 212) + '\n')
tags = '\n'.join(f'<script src="js/{n}"></script>' for n, *_ in PARTS)
out = '\n'.join(src[:8]) + '\n<link rel="stylesheet" href="css/game.css">\n' + L(214, 400) + '\n' + tags + '\n' + '\n'.join(src[7039:])
open('index.html', 'w').write(out)
print('ok')
