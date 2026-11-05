# Profile README setup

## Random Luckyuro TV

`README.md` shows `https://drack112-ten.vercel.app/api/luckyuro`, which
serves a random clip framed in a small pixel-art TV from `assets/tv/` on every
request (clicking it opens another one). The response is sent with
`Cache-Control: no-cache`, so GitHub's image proxy fetches it again on each
profile view instead of caching the first image.

The Vercel project imports the `Drack112/Drack112` repository (framework
preset **Other**) and is served at `drack112-ten.vercel.app`. Opening
`https://drack112-ten.vercel.app/api/luckyuro` and reloading should show a
different clip each time.

If the domain changes, update the `src` of the TV and of the walkman in
`README.md`.

The source clips live in `assets/gifs/` (`.gif` or `.png`). After adding or
removing one, rebuild the framed versions and push:

```sh
pip install pillow
python3 scripts/frame-gifs.py
```

## LUCKY-MAN walkman (Last.fm)

`README.md` shows `https://drack112-ten.vercel.app/api/mp3`, a cassette
walkman drawn by `api/mp3.js` with the track playing now on the tape label and
the last five scrobbles on the J-card. It runs on the same Vercel project as
the TV.

1. Create a free API key at [last.fm/api/account/create](https://www.last.fm/api/account/create)
   (only the "API key" is needed, not the secret).
2. In the Vercel project, open **Settings → Environment Variables** and add
   `LASTFM_API_KEY`. Optionally add `LASTFM_USER` (defaults to `Drack112`).
3. Redeploy, then open `https://drack112-ten.vercel.app/api/mp3`.

To fill it, make Spotify / YouTube Music / your player scrobble to Last.fm.
Without the key or without scrobbles the walkman shows a blank tape ("insert cookie...").

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
