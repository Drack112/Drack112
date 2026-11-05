# Profile README setup

## Random Luckyuro GIF

`README.md` shows `https://drack112-readme.vercel.app/api/luckyuro`, which
serves a random file from `assets/gifs/` on every request. The response is sent
with `Cache-Control: no-cache`, so GitHub's image proxy fetches it again on each
profile view instead of caching the first image.

Deploy once:

1. On [vercel.com/new](https://vercel.com/new), import the `Drack112/Drack112`
   repository.
2. Name the project `drack112-readme` (that gives the URL used in the README),
   keep the framework preset as **Other** and deploy.
3. Open `https://drack112-readme.vercel.app/api/luckyuro`: each reload should
   show a different GIF.

If the project gets another name, update the `src` of the GIF in `README.md`.
To add or remove images, change the files in `assets/gifs/` (`.gif` or `.png`)
and push; Vercel redeploys on its own.

## Pixel-art assets

`assets/web/` holds plain SVG files with no external dependencies: the animated
header, the CRT monitor with the stack, the 88×31 buttons and the
under-construction banner.

## Braille portrait (currently not in the README)

`scripts/image-to-ascii.py` turns `assets/luckyuro.png` into Braille art and
`scripts/update-readme.py` writes it between `<!-- LUCKYURO-START -->` and
`<!-- LUCKYURO-END -->` in `README.md`. To bring it back, add those two markers
to the README and run:

```sh
pip install pillow numpy
python3 scripts/image-to-ascii.py assets/luckyuro.png .agent-ascii-out/luckyuro.txt
python3 scripts/update-readme.py
rm -rf .agent-ascii-out
```
