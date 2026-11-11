# Cuts the ten units on the "Military Units" sheet (design/sheet4-military-units.png, page 1 of
# design/Stronghold_Destroyer_Assets.pdf) into transparent left / front / right views, then makes the
# crimson-and-gold army version and the Black Stone enemy version of each.
#
# usage, from the stronghold-destroyer folder:   python3 tools/cut_units.py
# writes:  sprites/units/<unit>_<view>.png   (each view as drawn, dark background removed, for checking by eye)
#          sprites/units_atlas.png            (all 30 views packed into one picture: the sprite atlas)
#          sprites/units_mask.png             (same layout: which pixels are team cloth, gold trim, steel and shield emblem,
#                                              so the game can recolour each team at load time without new art)
#          sprites/atlas.js                   (the atlas, the mask and the frame list embedded for the game)
# The right view on the sheet is used as drawn; the game mirrors the left view when it needs a matching pair.
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


# ---- team-colour mask: the game recolours by these weights at load time (see js/sprites.js) ----
def to_hsv(rgb):
    r, g, b = [rgb[..., i] / 255.0 for i in range(3)]; mx = np.max(rgb[..., :3], -1) / 255.0; mn = np.min(rgb[..., :3], -1) / 255.0; d = mx - mn
    h = np.zeros_like(mx); nz = d > 1e-6
    rm = nz & (mx == r); gm = nz & (mx == g) & ~rm; bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6; h[gm] = (b - r)[gm] / d[gm] + 2; h[bm] = (r - g)[bm] / d[bm] + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx

def smooth(m, r=0.8):
    return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255

def mask_of(img):
    """R: team cloth (the sheet's blue, and its green trim cloth)  G: gold trim  B: bright steel  A: the pale emblem on a blue shield or tabard"""
    a = np.asarray(img).astype(np.float32); h, s, v = to_hsv(a[..., :3])
    blue = (h > 190) & (h < 262) & (s > 0.22) & (v > 0.12)
    green = (h > 68) & (h < 170) & (s > 0.2) & (v > 0.1)
    gold = (h >= 34) & (h < 58) & (s > 0.38) & (v > 0.45)
    steel = (s < 0.16) & (v > 0.35)
    near_blue = np.asarray(Image.fromarray((blue * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    blue_share = smooth(blue.astype(np.float32), 4)
    emblem = (s < 0.3) & (v > 0.62) & near_blue & (blue_share > 0.35)
    cloth = np.clip(smooth(blue | green) * 1.25, 0, 1)
    m = np.dstack([cloth, np.clip(smooth(gold, 0.6) * 1.25, 0, 1), smooth(steel & ~emblem, 0.6), np.clip(smooth(emblem, 0.6) * 1.3, 0, 1)])
    m = m * (a[..., 3:4] / 255)
    return Image.fromarray((m * 255).astype(np.uint8), 'RGBA')

def data_uri(img):
    b = io.BytesIO(); img.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

if __name__ == '__main__':
    import os
    os.makedirs('sprites/units', exist_ok=True)
    cuts = []
    for name, ((y0, y1), cols) in UNITS.items():
        if cols[1][1] == 'split':
            sx = split_column(y0, y1, 905, 960); cols = [cols[0], (cols[1][0], sx), (sx, cols[2][1])]
        for view, (x0, x1) in zip(VIEWS, cols):
            raw = cut(y0, y1, x0, x1); raw.save(f'sprites/units/{name}_{view}.png'); cuts.append((name, view, raw))
    # pack into rows, 2 px apart, tallest first, at most 2048 wide
    order = sorted(cuts, key=lambda c: -c[2].height); W = 2048; x = y = rowh = 0; place = []
    for name, view, im in order:
        if x + im.width + 2 > W: x = 0; y += rowh + 2; rowh = 0
        place.append((name, view, im, x, y)); x += im.width + 2; rowh = max(rowh, im.height)
    H = y + rowh; atlas = Image.new('RGBA', (W, H)); mask = Image.new('RGBA', (W, H))
    frames = {}
    for name, view, im, x, y in place:
        atlas.alpha_composite(im, (x, y)); mask.paste(mask_of(im), (x, y))
        al = np.asarray(im)[..., 3]; rows_ = np.where(al.max(1) > 40)[0]; foot = int(rows_[-1]) if len(rows_) else im.height - 1
        cols_ = np.where(al[max(0, foot - 6):foot + 1].max(0) > 40)[0]; fx = int((cols_[0] + cols_[-1]) / 2) if len(cols_) else im.width // 2
        frames[f'{name}/{view}'] = {'x': x, 'y': y, 'w': im.width, 'h': im.height, 'ax': fx, 'ay': foot}
    atlas = atlas.crop((0, 0, max(f['x'] + f['w'] for f in frames.values()) + 1, H)); mask = mask.crop((0, 0, atlas.width, H))
    atlas.save('sprites/units_atlas.png', optimize=True); mask.save('sprites/units_mask.png', optimize=True)
    with open('sprites/atlas.js', 'w') as f:
        f.write('// Unit sprite atlas cut from design/sheet4-military-units.png by tools/cut_units.py. Do not edit by hand.\n')
        f.write('window.UNIT_ATLAS = ' + json.dumps({'img': data_uri(atlas), 'mask': data_uri(mask), 'frames': frames}) + ';\n')
    for k, v in frames.items(): print(f"{k:24s} {v['w']:4d} x {v['h']:3d}")
    print('atlas', atlas.size, 'atlas.js', os.path.getsize('sprites/atlas.js') // 1024, 'KB')
