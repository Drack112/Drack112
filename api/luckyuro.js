// Serves a random Luckyuro GIF/PNG from assets/gifs on every request.
// The no-cache headers make GitHub's image proxy (camo) fetch it again on each
// README view instead of caching the first image it saw.
const fs = require("fs");
const path = require("path");

const DIR = path.join(process.cwd(), "assets", "gifs");
const TYPES = { ".gif": "image/gif", ".png": "image/png" };

const files = fs.readdirSync(DIR).filter((f) => TYPES[path.extname(f)]);

module.exports = (req, res) => {
  const file = files[Math.floor(Math.random() * files.length)];
  res.setHeader("Content-Type", TYPES[path.extname(file)]);
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
  res.setHeader("Expires", "0");
  res.setHeader("X-Luckyuro-File", file);
  res.end(fs.readFileSync(path.join(DIR, file)));
};
