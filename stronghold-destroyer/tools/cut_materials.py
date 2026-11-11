# Cuts the building and ground materials from page 2 of the asset PDF (design/sheet5-battlefields-materials.png):
#   the four brick sets (brown, gray, green, black-gray-green) as repeating wall textures, plus each set's arch piece,
#   and the grass, meadow-flower and dirt-road ground, and river water, as repeating ground textures.
# usage, from the stronghold-destroyer folder:   python3 tools/cut_materials.py
# writes:  sprites/materials.js (all textures embedded for the game), sprites/materials_preview.png (for checking by eye)
import base64, io, json
import numpy as np
from PIL import Image, ImageFilter

SRC = 'design/sheet5-battlefields-materials.png'
src = Image.open(SRC).convert('RGB')
ROW_Y = {'brown': 0, 'gray': 100, 'green': 202, 'blackgreen': 302}

def seamless(im, fade=0.22):
    """make a crop repeat without visible seams: each edge is blended into the opposite edge"""
    a = np.asarray(im).astype(np.float32); h, w = a.shape[:2]
    fx, fy = max(2, int(w * fade)), max(2, int(h * fade))
    out = a.copy()
    for i in range(fx):   # left edge takes on the right edge's look
        t = i / fx; out[:, i] = a[:, i] * t + a[:, w - fx + i] * (1 - t)
    out = out[:, :w - fx]; a2 = out.copy(); h2, w2 = a2.shape[:2]
    for j in range(fy):
        t = j / fy; out[j] = a2[j] * t + a2[h2 - fy + j] * (1 - t)
    out = out[:h2 - fy]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def cutout(box):
    """a piece on the dark backdrop: the backdrop and its soft shadow become transparent"""
    im = np.asarray(src.crop(box)).astype(np.float32); lum = im.mean(2); sat = im.max(2) - im.min(2)
    bg = np.median(im[(lum < 60) & (sat < 18)], axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(2))
    keep = ~(((d < 30) & (sat < 26)) | (lum < bg.mean() + 4))
    keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))) > 128
    keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
    a = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.uint8)
    out = Image.fromarray(np.dstack([im.astype(np.uint8), a]), 'RGBA'); return out.crop(out.getbbox())

def uri(im):
    b = io.BytesIO(); im.save(b, 'PNG' if im.mode == 'RGBA' else 'JPEG', **({'optimize': True} if im.mode == 'RGBA' else {'quality': 88}))
    return ('data:image/png;base64,' if im.mode == 'RGBA' else 'data:image/jpeg;base64,') + base64.b64encode(b.getvalue()).decode()

tex = {}
for name, dy in ROW_Y.items():
    tex['brick_' + name] = seamless(src.crop((322, 449 + dy, 500, 493 + dy)), 0.12)   # the long face of the straight wall piece
    tex['arch_' + name] = cutout((772, 400 + dy, 948, 502 + dy))
tex['grass'] = seamless(src.crop((290, 893, 455, 968)), 0.25)
tex['meadow'] = seamless(src.crop((540, 890, 725, 975)), 0.25)
tex['dirt'] = seamless(src.crop((850, 905, 985, 958)), 0.3)
tex['water'] = seamless(src.crop((356, 331, 448, 358)), 0.3)

pv = Image.new('RGB', (1100, 520), (255, 0, 255)); x = y = rowh = 0
for k, im in tex.items():
    if x + im.width > 1100: x = 0; y += rowh + 6; rowh = 0
    t = im.convert('RGBA'); pv.paste(t, (x, y), t); x += im.width + 6; rowh = max(rowh, im.height)
pv.save('sprites/materials_preview.png')
with open('sprites/materials.js', 'w') as f:
    f.write('// Materials cut from design/sheet5-battlefields-materials.png by tools/cut_materials.py. Do not edit by hand.\n')
    f.write('window.MATERIALS = ' + json.dumps({k: uri(v) for k, v in tex.items()}) + ';\n')
for k, v in tex.items(): print(k, v.size)
