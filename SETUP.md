# Luckyuro ASCII automation

Copy the contents of this folder into the root of your `Drack112/Drack112` repository.

1. Keep the image at `assets/luckyuro.png`.
2. Replace the repository's `README.md` with the one in this folder (it already
   contains the generated portrait between `<!-- LUCKYURO-START -->` and
   `<!-- LUCKYURO-END -->`). To use the portrait in another README, paste
   `README-snippet.md` where it should appear.
3. Commit and push to the `main` branch.
4. Optionally open **Actions → Generate Luckyuro ASCII → Run workflow** to
   regenerate the portrait on GitHub.

The workflow runs `scripts/image-to-ascii.py` (Pillow + NumPy) and then
`scripts/update-readme.py`, which replaces only the content between the markers.

The portrait is Unicode Braille art (2×4 dots per character), which keeps much
more detail than plain ASCII at the same width. The converter removes the
image background, draws the outlines and fills the darkest areas. Useful flags:

- `--width 72`: detail level (characters before trimming the empty margins)
- `--dark 0.8`: lower it to fill more dark areas
- `--edge 0.45`: lower it to draw more lines
- `--aspect 0.42`: character cell proportion of GitHub's code font

Run locally:

```sh
pip install pillow numpy
python3 scripts/image-to-ascii.py assets/luckyuro.png .agent-ascii-out/luckyuro.txt
python3 scripts/update-readme.py
```
