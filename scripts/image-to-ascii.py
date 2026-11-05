"""Convert an image into Unicode Braille art (2x4 dots per character).

The background is removed with a flood fill from the image border, then a dot
is drawn wherever the picture has an outline or a dark area. Empty cells use
U+2800 (blank braille) instead of spaces so every line keeps the same width.
"""
import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# dot bit for (row, col) inside a 4x2 braille cell
BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]]
BLANK = chr(0x2800)


def background_mask(rgb, tol):
    """Pixels reachable from the border through neighbours of similar colour."""
    h, w, _ = rgb.shape
    px = rgb.astype(np.int32)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))
    for y, x in q:
        seen[y, x] = True
    tol2 = tol * tol
    while q:
        y, x = q.popleft()
        c = px[y, x]
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                if ((px[ny, nx] - c) ** 2).sum() <= tol2:
                    seen[ny, nx] = True
                    q.append((ny, nx))
    return seen


def sobel_magnitude(g):
    p = np.pad(g, 1, mode="edge")
    gx = (p[:-2, 2:] + 2 * p[1:-1, 2:] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[1:-1, :-2] + p[2:, :-2])
    gy = (p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[:-2, 1:-1] + p[:-2, 2:])
    return np.hypot(gx, gy)


def drop_specks(ink, min_size):
    """Remove 8-connected blobs smaller than min_size dots."""
    h, w = ink.shape
    seen = np.zeros_like(ink)
    out = ink.copy()
    for y in range(h):
        for x in range(w):
            if not ink[y, x] or seen[y, x]:
                continue
            stack, comp = [(y, x)], []
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                comp.append((cy, cx))
                for ny in range(cy - 1, cy + 2):
                    for nx in range(cx - 1, cx + 2):
                        if 0 <= ny < h and 0 <= nx < w and ink[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if len(comp) < min_size:
                for cy, cx in comp:
                    out[cy, cx] = False
    return out


def ink_map(path, width, tol, edge, dark, aspect, min_size):
    img = Image.open(path).convert("RGB")
    px_w = width * 2
    # aspect = braille cell width / height as rendered by the target font
    px_h = round(img.height * px_w / img.width * aspect * 2)
    px_h -= px_h % 4
    # detect at 3x and downsample so thin lines stay connected
    big = img.resize((px_w * 3, px_h * 3), Image.LANCZOS).filter(ImageFilter.MedianFilter(3))
    bg = background_mask(np.asarray(big), tol)

    g = np.asarray(big.convert("L"), dtype=np.float64) / 255
    lo, hi = np.percentile(g[~bg], 2), np.percentile(g[~bg], 98)
    g = np.clip((g - lo) / max(hi - lo, 1e-6), 0, 1)
    # outlines inside the figure plus the silhouette itself
    mag = sobel_magnitude(g) + sobel_magnitude(bg.astype(np.float64)) * 2
    ref = np.percentile(mag[~bg], 95) or 1

    ink = ((mag > edge * ref) | ((1 - g) > dark)) & ~bg
    ink = ink.reshape(px_h, 3, px_w, 3).mean(axis=(1, 3)) > 0.3
    return drop_specks(ink, min_size)


def to_braille(ink):
    h, w = ink.shape
    lines = []
    for r in range(0, h, 4):
        row = []
        for c in range(0, w, 2):
            v = 0
            for dy in range(4):
                for dx in range(2):
                    if r + dy < h and c + dx < w and ink[r + dy, c + dx]:
                        v |= BITS[dy][dx]
            row.append(chr(0x2800 + v))
        lines.append("".join(row))
    while lines and set(lines[0]) == {BLANK}:
        lines.pop(0)
    while lines and set(lines[-1]) == {BLANK}:
        lines.pop()
    left = min(len(l) - len(l.lstrip(BLANK)) for l in lines)
    right = min(len(l) - len(l.rstrip(BLANK)) for l in lines)
    return "\n".join(l[left:len(l) - right] for l in lines)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("image")
    p.add_argument("output", help="where to write the .txt art")
    p.add_argument("--width", type=int, default=72, help="width in characters before trimming")
    p.add_argument("--tol", type=float, default=14, help="background colour tolerance")
    p.add_argument("--edge", type=float, default=0.45, help="outline threshold, lower = more lines")
    p.add_argument("--dark", type=float, default=0.8, help="darkness threshold, lower = more fill")
    p.add_argument("--aspect", type=float, default=0.42, help="cell width/height of the font")
    p.add_argument("--min-size", type=int, default=14, help="drop blobs smaller than this")
    a = p.parse_args()

    art = to_braille(ink_map(a.image, a.width, a.tol, a.edge, a.dark, a.aspect, a.min_size))
    out = Path(a.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(art + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(art.splitlines())} lines)")
