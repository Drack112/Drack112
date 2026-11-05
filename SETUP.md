# Luckyuro portrait

The portrait in `README.md` is static text committed to the repository; there
is no GitHub Actions workflow. It sits between `<!-- LUCKYURO-START -->` and
`<!-- LUCKYURO-END -->`, so it can be regenerated locally whenever the image
in `assets/luckyuro.png` changes.

The portrait is Unicode Braille art (2×4 dots per character), which keeps much
more detail than plain ASCII at the same width. The converter removes the
image background, draws the outlines and fills the darkest areas. Useful flags:

- `--width 72`: detail level (characters before trimming the empty margins)
- `--dark 0.8`: lower it to fill more dark areas
- `--edge 0.45`: lower it to draw more lines
- `--aspect 0.42`: character cell proportion of GitHub's code font

Regenerate:

```sh
pip install pillow numpy
python3 scripts/image-to-ascii.py assets/luckyuro.png .agent-ascii-out/luckyuro.txt
python3 scripts/update-readme.py
rm -rf .agent-ascii-out
```

The header (`assets/web/header.svg`), the 88×31 buttons and the
under-construction banner in `assets/web/` are plain SVG files with no external
dependencies.
