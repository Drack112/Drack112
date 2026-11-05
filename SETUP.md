# Luckyuro ASCII automation

Copy the contents of this folder into the root of your `Drack112/Drack112` repository.

1. Keep the supplied image at `assets/luckyuro.png`.
2. Add the contents of `README-snippet.md` where the ASCII portrait should appear in `README.md`.
3. Commit and push to the `main` branch.
4. Open **Actions → Generate Luckyuro ASCII → Run workflow** for the first run.

The workflow uses `Vinniai/agent-ascii@v1` and replaces only the content between
`<!-- LUCKYURO-START -->` and `<!-- LUCKYURO-END -->`.

The image is tall, so the workflow uses a width of 72 characters to keep the
portrait reasonably compact in the README. Adjust `--width 72` in the workflow
if you want more or less detail.
