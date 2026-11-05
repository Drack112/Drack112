"""Put every GIF/PNG from assets/gifs inside a small pixel-art CRT TV.

Writes animated WebP files (transparent around the TV) to assets/tv/, which is
what api/luckyuro.js serves. Run after adding or removing files in assets/gifs:

    pip install pillow
    python3 scripts/frame-gifs.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "assets" / "gifs", ROOT / "assets" / "tv"
SCALE = 2                       # the TV is drawn at 1x and scaled up with nearest neighbour
W, H = 160, 116                 # TV size at 1x
SCREEN = (14, 26, 118, 90)      # screen hole at 1x (x0, y0, x1, y1)

INK, FACE, HI, LO, BEZEL = "#1A1A14", "#D8CFB0", "#F1EAD2", "#A89F80", "#7A7258"
ORANGE, GREEN, GOLD = "#E8862E", "#8CC84B", "#E9D46A"


def tv_overlay():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # antenna
    d.line((72, 15, 58, 3), fill=INK, width=1)
    d.line((88, 15, 102, 3), fill=INK, width=1)
    d.rectangle((56, 1, 58, 3), fill=ORANGE)
    d.rectangle((102, 1, 104, 3), fill=ORANGE)
    d.rectangle((70, 12, 90, 16), fill=INK)
    d.rectangle((71, 13, 89, 15), fill=LO)
    # body with pixel bevel and clipped corners
    d.rectangle((4, 16, 156, 108), fill=INK)
    d.rectangle((5, 17, 155, 107), fill=LO)
    d.rectangle((5, 17, 153, 105), fill=HI)
    d.rectangle((7, 19, 153, 105), fill=FACE)
    for x, y in ((4, 16), (156, 16), (4, 108), (156, 108)):
        d.point((x, y), fill=(0, 0, 0, 0))
    # screen bezel + hole
    d.rectangle((10, 22, 122, 94), fill=BEZEL)
    d.rectangle((11, 93, 122, 94), fill=HI)
    d.rectangle(SCREEN, fill=(0, 0, 0, 0))
    x0, y0, x1, y1 = SCREEN
    for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
        d.point((x, y), fill=BEZEL)
    # knobs
    for cy, center in ((38, ORANGE), (56, GREEN)):
        d.ellipse((132, cy - 6, 144, cy + 6), fill=INK)
        d.ellipse((134, cy - 4, 142, cy + 4), fill=center)
        d.line((138, cy - 4, 138, cy - 1), fill=INK)
    # speaker grille + power LED
    for y in range(68, 88, 3):
        d.line((128, y, 148, y), fill=BEZEL)
    d.rectangle((130, 96, 132, 98), fill=GREEN)
    d.rectangle((136, 96, 148, 98), fill=BEZEL)
    # feet
    d.rectangle((18, 108, 30, 113), fill=INK)
    d.rectangle((130, 108, 142, 113), fill=INK)

    big = im.resize((W * SCALE, H * SCALE), Image.NEAREST)
    # scanlines and a small glare over the screen (at 2x)
    sx0, sy0, sx1, sy1 = (v * SCALE for v in SCREEN)
    glass = Image.new("RGBA", big.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glass)
    for y in range(sy0, sy1, 2):
        g.line((sx0, y, sx1, y), fill=(0, 0, 0, 46))
    g.rectangle((sx0 + 6, sy0 + 6, sx0 + 14, sy0 + 8), fill=(255, 255, 255, 90))
    g.rectangle((sx0 + 6, sy0 + 10, sx0 + 8, sy0 + 14), fill=(255, 255, 255, 90))
    return Image.alpha_composite(big, glass)


def frame_file(src, overlay):
    sx0, sy0, sx1, sy1 = (v * SCALE for v in SCREEN)
    size = (sx1 - sx0 + 1, sy1 - sy0 + 1)
    frames, durations = [], []
    with Image.open(src) as im:
        for fr in ImageSequence.Iterator(im):
            pic = ImageOps.fit(fr.convert("RGB"), size, Image.LANCZOS)
            canvas = Image.new("RGBA", overlay.size, (0, 0, 0, 0))
            canvas.paste(pic, (sx0, sy0))
            frames.append(Image.alpha_composite(canvas, overlay))
            durations.append(fr.info.get("duration", im.info.get("duration", 80)) or 80)
    out = OUT / (src.stem + ".webp")
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=durations, loop=0,
                   quality=82, method=6, lossless=False)
    return out, len(frames)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    overlay = tv_overlay()
    for src in sorted(p for p in SRC.iterdir() if p.suffix.lower() in (".gif", ".png")):
        out, n = frame_file(src, overlay)
        print(f"{out.relative_to(ROOT)}  {n} frames  {out.stat().st_size // 1024} KB")
