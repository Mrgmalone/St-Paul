# Cuts a row of six character views (front, 3/4 front, side L, back, side R, 3/4 back) out of a design sheet.
# usage, from the stronghold-destroyer folder: python3 tools/cut_sprites.py X0 X1 Y0 Y1 name
import numpy as np, sys
from PIL import Image, ImageFilter
from collections import deque
src = Image.open('design/sheet3-core-military-units.png').convert('RGB')
names = ['front', 'front34', 'sideL', 'back', 'sideR', 'back34']
X0, X1, Y0, Y1 = [int(v) for v in sys.argv[1:5]] if len(sys.argv) > 5 else (8, 552, 402, 578)
OUT = sys.argv[5] if len(sys.argv) > 5 else 'swordsman'
cw = (X1 - X0) / 6
sheet = Image.new('RGBA', (6 * 128, 256), (0, 0, 0, 0))
for i, n in enumerate(names):
    box = (int(X0 + i * cw), Y0, int(X0 + (i + 1) * cw), Y1)
    im = np.asarray(src.crop(box)).astype(np.int32); h, w, _ = im.shape
    lum = im.mean(axis=2); sat = im.max(axis=2) - im.min(axis=2)
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    darkish = im[(lum < 90) & (sat < 26)]
    bg = np.median(darkish, axis=0) if len(darkish) > 200 else np.median(border, axis=0)   # the backdrop is the commonest dark grey in the picture
    dist = np.sqrt(((im - bg) ** 2).sum(axis=2))
    bl = bg.mean(); cand = (dist < 34) & (sat < 30) & (lum < 95)
    mask = np.zeros((h, w), bool); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x]: mask[y, x] = True; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not mask[y, x]: mask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and not mask[yy, xx] and cand[yy, xx]:
                if abs(lum[yy, xx] - lum[y, x]) < 14: mask[yy, xx] = True; q.append((yy, xx))
    fg = ~mask
    ys = np.where(fg.any(axis=1))[0]
    if len(ys):   # the ground shadow first: dark, colourless pixels along the feet
        bot = ys.max(); band = max(10, int((bot - ys.min()) * 0.13))
        for y in range(bot - band, bot + 1): fg[y] &= ~((lum[y] < bl + 40) & (sat[y] < 28))
    fg0 = fg.copy()
    fg = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0   # cut thin bridges between pieces
    # keep only the biggest piece: the figure, not scraps of its neighbours or the panel border
    lab = np.zeros((h, w), np.int32); best, bestn, cur = 0, 0, 0
    for y0 in range(h):
        for x0 in range(w):
            if fg[y0, x0] and not lab[y0, x0]:
                cur += 1; n = 0; dq = deque([(y0, x0)]); lab[y0, x0] = cur
                while dq:
                    y, x = dq.popleft(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and fg[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; dq.append((yy, xx))
                if n > bestn: bestn, best = n, cur
    fg = lab == best
    grown = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    fg = fg0 & grown   # back to full size, but only around the main figure
    # fill pinholes inside the figure
    holes = ~fg; lab2 = np.zeros((h, w), bool); dq = deque()
    for y in range(h):
        for x in (0, w - 1):
            if holes[y, x]: lab2[y, x] = True; dq.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if holes[y, x] and not lab2[y, x]: lab2[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and holes[yy, xx] and not lab2[yy, xx]: lab2[yy, xx] = True; dq.append((yy, xx))
    fg = fg | (holes & ~lab2 & (sat > 18))
    mask = ~fg
    alpha = Image.fromarray(((~mask) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = Image.fromarray(im.astype(np.uint8)).convert('RGBA'); rgba.putalpha(alpha)
    bb = rgba.getbbox(); fig = rgba.crop(bb)
    s = 240 / fig.height; fig = fig.resize((max(1, int(fig.width * s)), 240), Image.LANCZOS)
    cell = Image.new('RGBA', (128, 256), (0, 0, 0, 0)); cell.paste(fig, (64 - fig.width // 2, 256 - 240 - 4), fig)
    sheet.paste(cell, (i * 128, 0))
sheet.save('sprites/' + OUT + '_dirs.png')
prev = Image.new('RGBA', sheet.size, (110, 160, 90, 255)); prev.alpha_composite(sheet); prev.save('sprites/' + OUT + '_dirs_preview.png')
print('ok')
