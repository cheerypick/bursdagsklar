#!/usr/bin/env python3
"""
Makes the printed invitation assets (run once by hand; nothing here runs in the app):

  assets/images/invite/<card>.webp        the drawing, A5 at 300 dpi (1748 x 2480), on WHITE paper
  assets/images/invite/thumb-<card>.webp  a small version on cream for the «Velg kort» picker
  src/core/rules/printFonts.ts            the app fonts, subset, as base64 WOFF2

The drawings are our own watercolour illustrations (made in advance, no text in them). The source PNGs are
painted on cream paper; the cream is taken out (colour-to-alpha against the paper colour, then laid on white)
so one file serves both papers: the print lays the cream back on with `background-blend-mode: multiply`, and
«Hvit bakgrunn» simply leaves it white.

Usage: python3 scripts/make-invite-art.py SRC_DIR   (SRC_DIR holds <card>.png for every card)
Needs: pip install pillow numpy fonttools brotli
"""
import base64
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

CARDS = ['bursdag', 'enhjorning', 'dinosaurer', 'verdensrommet', 'fotball', 'dyr-i-skogen']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'images', 'invite')
CREAM = np.array([251, 245, 232], np.float32)  # PAPER_CREAM in printInvitations.ts
UNICODES = (
    'U+0020-007E,U+00A0-00FF,U+0100-017F,U+0218-021B,U+02BC,U+02C6,U+02DA,U+02DC,U+2010-2015,'
    'U+2018-201E,U+2022,U+2026,U+2032,U+2033,U+2039,U+203A,U+20AC'
)
FONTS = [
    ('bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf', 'BkDisplay', 800),
    ('figtree/400Regular/Figtree_400Regular.ttf', 'BkBody', 400),
    ('figtree/600SemiBold/Figtree_600SemiBold.ttf', 'BkBody', 600),
    ('figtree/800ExtraBold/Figtree_800ExtraBold.ttf', 'BkBody', 800),
]


def paper_colour(a):
    h, w, _ = a.shape
    return np.median(a[int(h * .35):int(h * .65), int(w * .3):int(w * .7)].reshape(-1, 3), axis=0)


def on_white(src):
    im = Image.open(src).convert('RGB').resize((1748, 2480), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(1.2, 40, 2))
    a = np.asarray(im).astype(np.float32)
    ref = paper_colour(a)
    d = a - ref
    up = np.where(d > 0, d / np.maximum(255 - ref, 1), 0)
    dn = np.where(d < 0, -d / np.maximum(ref, 1), 0)
    alpha = np.max(np.maximum(up, dn), axis=2)
    lo, hi = 0.035, 0.09  # the paper texture goes, the washes stay
    k = np.clip((alpha - lo) / (hi - lo), 0, 1)
    alpha_c = np.where(alpha < hi, alpha * k, alpha)
    col = np.clip(ref + (a - ref) / np.maximum(alpha, 1e-6)[..., None], 0, 255)
    w = col * alpha_c[..., None] + 255 * (1 - alpha_c[..., None])
    return Image.fromarray(np.clip(w, 0, 255).round().astype(np.uint8), 'RGB')


def main(src_dir):
    os.makedirs(OUT, exist_ok=True)
    for card in CARDS:
        img = on_white(os.path.join(src_dir, f'{card}.png'))
        path = os.path.join(OUT, f'{card}.webp')
        for q in (80, 76, 72, 68, 64, 60):
            img.save(path, 'WEBP', quality=q, method=6)
            if os.path.getsize(path) < 440_000:
                break
        thumb = Image.fromarray((np.asarray(img).astype(np.float32) * CREAM / 255).round().astype(np.uint8))
        thumb.resize((300, 425), Image.LANCZOS).save(os.path.join(OUT, f'thumb-{card}.webp'), 'WEBP', quality=78)
        print(card, q, os.path.getsize(path))

    fonts_dir = os.path.join(ROOT, 'node_modules', '@expo-google-fonts')
    consts, faces = [], []
    for rel, family, weight in FONTS:
        out = f'/tmp/{family}-{weight}.woff2'
        subprocess.run(['pyftsubset', os.path.join(fonts_dir, rel), f'--unicodes={UNICODES}', '--flavor=woff2',
                        '--layout-features=kern,liga,calt,ccmp,locl,mark,mkmk', f'--output-file={out}'], check=True)
        b64 = base64.b64encode(open(out, 'rb').read()).decode()
        name = f'{family.upper()}_{weight}'
        consts.append(f"const {name} =\n  '{b64}';\n")
        faces.append(f"  `@font-face {{ font-family: '{family}'; font-style: normal; font-weight: {weight}; "
                     f"font-display: block; src: url(data:font/woff2;base64,${{{name}}}) format('woff2'); }}`,\n")
    head = open(os.path.join(ROOT, 'src', 'core', 'rules', 'printFonts.ts')).read().split('const BKDISPLAY_800')[0]
    body = head + ''.join(consts) + '\n/** @font-face rules (base64 WOFF2), put first in the print styles. */\n'
    body += 'export const PRINT_FONT_CSS = [\n' + ''.join(faces) + "].join('\\n');\n"
    open(os.path.join(ROOT, 'src', 'core', 'rules', 'printFonts.ts'), 'w').write(body)


if __name__ == '__main__':
    main(sys.argv[1])
