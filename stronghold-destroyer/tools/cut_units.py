# Cuts the ten units on the "Military Units" sheet (design/sheet4-military-units.png, page 1 of
# design/Stronghold_Destroyer_Assets.pdf) into transparent left / front / right views, then makes the
# crimson-and-gold army version and the Black Stone enemy version of each.
#
# usage, from the stronghold-destroyer folder:   python3 tools/cut_units.py
# writes:  sprites/units/<unit>_<view>.png          (the art as drawn, background removed)
#          sprites/units/<unit>_<view>_army.png     (recoloured: crimson and gold)
#          sprites/units/<unit>_<view>_enemy.png    (recoloured: Black Stone charcoal and ember)
#          sprites/units.js                         (all army and enemy views as embedded pictures, for the game)
#          sprites/units_preview.png                (everything side by side, for checking by eye)
import base64, io, json, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

SRC = 'design/sheet4-military-units.png'
# each figure's column range on the sheet (found by scanning for non-background columns), and the row band
ROW1, ROW2 = (215, 445), (572, 810)
UNITS = {
    'berserker':      (ROW1, [(5, 113), (123, 233), (260, 341)]),
    'swordsman':      (ROW1, [(365, 466), (489, 576), (608, 687)]),
    'mounted-knight': (ROW1, [(716, 835), (853, 928), (948, 1067)]),
    'spearman':       (ROW1, [(1107, 1177), (1213, 1288), (1325, 1399)]),
    'archer':         (ROW1, [(1447, 1530), (1550, 1650), (1665, 1758)]),
    'trebuchet':      (ROW2, [(13, 134), (144, 233), (241, 359)]),
    'catapult':       (ROW2, [(368, 491), (492, 585), (586, 708)]),
    'flame-trooper':  (ROW2, [(710, 826), (847, 'split'), ('split', 1070)]),
    'crossbowman':    (ROW2, [(1095, 1172), (1198, 1298), (1310, 1410)]),
    'heavy-spearman': (ROW2, [(1446, 1532), (1556, 1648), (1672, 1752)]),
}
VIEWS = ['left', 'front', 'right']

src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
LUM, SAT = src.mean(2), src.max(2) - src.min(2)
BG = np.median(src[215:810][(LUM[215:810] < 70) & (SAT[215:810] < 20)], axis=0)
BGL = BG.mean()

def split_column(y0, y1, a, b):
    """the emptiest column between two touching figures"""
    band = src[y0:y1, a:b]; d = np.sqrt(((band - BG) ** 2).sum(2)); cnt = ((d > 28) | (SAT[y0:y1, a:b] > 30)).sum(0)
    return a + int(np.argmin(cnt))

def flood(cand, seeds):
    h, w = cand.shape; m = np.zeros((h, w), bool); q = deque()
    for y, x in seeds:
        if cand[y, x] and not m[y, x]: m[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and cand[yy, xx] and not m[yy, xx]: m[yy, xx] = True; q.append((yy, xx))
    return m

def components(mask):
    h, w = mask.shape; lab = np.zeros((h, w), np.int32); sizes = [0]; n = 0
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not lab[y0, x0]:
                n += 1; c = 0; q = deque([(y0, x0)]); lab[y0, x0] = n
                while q:
                    y, x = q.popleft(); c += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; q.append((yy, xx))
                sizes.append(c)
    return lab, sizes

def cut(y0, y1, x0, x1):
    im = src[y0:y1, x0:x1]; lum, sat = LUM[y0:y1, x0:x1], SAT[y0:y1, x0:x1]; h, w = lum.shape
    dist = np.sqrt(((im - BG) ** 2).sum(2))
    # backdrop and the soft ground shadow: dark and colourless, reached from the edge of the picture
    # backdrop: very close to the backdrop grey; the soft ground shadow (darker still) only along the bottom, where the feet stand
    feet = np.zeros((h, w), bool); feet[int(h * 0.84):] = True
    cand = ((dist < 15) & (sat < 16)) | (feet & (lum < BGL + 6) & (sat < 16))
    edge = [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)] + [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)]
    fg = ~flood(cand, edge)
    # backdrop trapped inside the figure (between a bow and its string, inside a frame): pure backdrop pockets
    pocket = fg & (dist < 11) & (sat < 10)
    plab, psz = components(pocket)
    for i, n in enumerate(psz):
        if i and n >= 25: fg[plab == i] = False
    # keep the figure and anything sizeable attached to it (a stone in a sling, a flame), drop specks
    lab, sizes = components(fg); big = max(sizes[1:]) if len(sizes) > 1 else 0
    keep = np.isin(lab, [i for i, s in enumerate(sizes) if i and s >= max(40, big * 0.02)])
    # trim the one-pixel rim where the art was blended into the dark backdrop, so no dark halo is left round the figure
    keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
    alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.55))
    a = np.asarray(alpha).astype(np.float32) / 255
    a = np.clip((a - 0.12) / 0.76, 0, 1)   # firm edges, a one-pixel soft rim
    # bleed the figure's own colours outwards, so the soft rim and any scaling never pick up the backdrop
    inner = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(np.float32) / 255
    col = im.astype(np.float32); acc = col * inner[..., None]; wgt = inner.copy()
    for r in (1.5, 3, 6):
        bl = lambda x: np.asarray(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
        wb = bl(wgt * 255) / 255; cb = np.dstack([bl(acc[..., c]) for c in range(3)])
        fill = (wgt < 0.5) & (wb > 0.02)
        col[fill] = (cb[fill] / np.maximum(wb[fill][..., None], 1e-3))
        acc = col * np.maximum(wgt, (wb > 0.02))[..., None]; wgt = np.maximum(wgt, (wb > 0.02).astype(np.float32))
    edge = (a > 0) & (inner < 1)
    out_rgb = im.astype(np.float32); out_rgb[edge] = col[edge]
    rgba = np.dstack([np.clip(out_rgb, 0, 255).astype(np.uint8), (a * 255).astype(np.uint8)])
    out = Image.fromarray(rgba, 'RGBA'); bb = out.getbbox()
    return out.crop((max(0, bb[0] - 2), max(0, bb[1] - 2), min(w, bb[2] + 2), min(h, bb[3] + 2)))

# ---- recolouring: hue moves only, so the painted light and shade stay exactly as drawn ----
def to_hsv(rgb):
    r, g, b = [rgb[..., i] / 255.0 for i in range(3)]; mx = np.max(rgb[..., :3], -1) / 255.0; mn = np.min(rgb[..., :3], -1) / 255.0; d = mx - mn
    h = np.zeros_like(mx); nz = d > 1e-6
    rm = nz & (mx == r); gm = nz & (mx == g) & ~rm; bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6; h[gm] = (b - r)[gm] / d[gm] + 2; h[bm] = (r - g)[bm] / d[bm] + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx

def from_hsv(h, s, v):
    c = v * s; hp = (h % 360) / 60; x = c * (1 - abs(hp % 2 - 1)); z = np.zeros_like(h)
    conds = [(hp < 1), (hp < 2), (hp < 3), (hp < 4), (hp < 5), (hp >= 5)]
    vals = [(c, x, z), (x, c, z), (z, c, x), (z, x, c), (x, z, c), (c, z, x)]
    r = np.select(conds, [v_[0] for v_ in vals]); g = np.select(conds, [v_[1] for v_ in vals]); b = np.select(conds, [v_[2] for v_ in vals])
    m = v - c
    return np.dstack([(r + m), (g + m), (b + m)]) * 255

def smooth_mask(m, r=1.2):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255

def army(img):
    """blue and green cloth become crimson; gold, steel, wood, leather and skin are left alone"""
    a = np.asarray(img).astype(np.float32); h, s, v = to_hsv(a[..., :3])
    blue = (h > 190) & (h < 262) & (s > 0.22) & (v > 0.12)
    green = (h > 68) & (h < 170) & (s > 0.2) & (v > 0.1)
    w = np.clip(smooth_mask(blue | green, 0.8) * 1.25, 0, 1)
    nh = np.full_like(h, 355.0); ns = np.clip(s * 1.05 + 0.08, 0, 0.92); nv = np.clip(v * np.where(green, 1.08, 1.22), 0, 1)
    rgb = a[..., :3] * (1 - w[..., None]) + from_hsv(nh, ns, nv) * w[..., None]
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a[..., 3]]).astype(np.uint8), 'RGBA')

def enemy(img):
    """from the army version: crimson cloth turns charcoal, gold turns ember orange, steel is darkened to blackened iron"""
    a = np.asarray(img).astype(np.float32); h, s, v = to_hsv(a[..., :3])
    red = ((h > 330) | (h < 14)) & (s > 0.35) & (v > 0.12)
    gold = (h >= 34) & (h < 58) & (s > 0.38) & (v > 0.45)
    steel = (s < 0.16) & (v > 0.35)
    rgb = a[..., :3].copy()
    wr = np.clip(smooth_mask(red, 0.8) * 1.25, 0, 1)
    charcoal = np.dstack([v * 0.62 * 255 * 0.95, v * 0.62 * 255 * 0.96, v * 0.62 * 255 * 1.05])
    rgb = rgb * (1 - wr[..., None]) + charcoal * wr[..., None]
    wg = np.clip(smooth_mask(gold, 0.6) * 1.25, 0, 1)
    rgb = rgb * (1 - wg[..., None]) + from_hsv(np.full_like(h, 24.0), np.clip(s * 1.1, 0, 1), np.clip(v * 0.95, 0, 1)) * wg[..., None]
    ws = smooth_mask(steel, 0.6)[..., None]
    rgb = rgb * (1 - ws * 0.38)
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a[..., 3]]).astype(np.uint8), 'RGBA')

def data_uri(img):
    b = io.BytesIO(); img.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

if __name__ == '__main__':
    import os
    os.makedirs('sprites/units', exist_ok=True)
    manifest, sizes, rows = {}, {}, []
    for name, ((y0, y1), cols) in UNITS.items():
        if cols[1][1] == 'split':
            sx = split_column(y0, y1, 905, 960); cols = [cols[0], (cols[1][0], sx), (sx, cols[2][1])]
        views = {}
        for view, (x0, x1) in zip(VIEWS, cols):
            raw = cut(y0, y1, x0, x1); arm = army(raw); en = enemy(arm)
            raw.save(f'sprites/units/{name}_{view}.png'); arm.save(f'sprites/units/{name}_{view}_army.png'); en.save(f'sprites/units/{name}_{view}_enemy.png')
            views[view] = {'w': raw.width, 'h': raw.height, 'army': data_uri(arm), 'enemy': data_uri(en)}
            sizes[f'{name} {view}'] = (raw.width, raw.height)
            rows.append((raw, arm, en))
        manifest[name] = views
    with open('sprites/units.js', 'w') as f:
        f.write('// Unit pictures cut from design/sheet4-military-units.png by tools/cut_units.py. Do not edit by hand.\n')
        f.write('window.UNIT_ART = ' + json.dumps(manifest) + ';\n')
    # a preview: the art as drawn, the army version and the enemy version, on grass green
    W = sum(r[0].width + 8 for r in rows[:15]); H = 3 * 215
    for part, sl in (('a', rows[:15]), ('b', rows[15:])):
        pv = Image.new('RGBA', (sum(r[0].width + 8 for r in sl) + 8, 3 * 220 + 8), (96, 140, 70, 255)); x = 8
        for raw, arm, en in sl:
            for k, im in enumerate((raw, arm, en)): pv.alpha_composite(im, (x, 8 + k * 220 + (212 - im.height)))
            x += raw.width + 8
        pv.save(f'sprites/units_preview_{part}.png')
    for k, v in sizes.items(): print(f'{k:24s} {v[0]:4d} x {v[1]:3d}')
    print('units.js', os.path.getsize('sprites/units.js') // 1024, 'KB')
