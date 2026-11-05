// Draws a pixel-art MP3 player (SVG) with the track Drack112 is listening to
// right now and the last few scrobbles, pulled live from Last.fm.
// Env: LASTFM_API_KEY (required), LASTFM_USER (defaults to Drack112).
const USER = process.env.LASTFM_USER || "Drack112";
const API = "https://ws.audioscrobbler.com/2.0/";
// Last.fm's grey star placeholder, served when a track has no cover
const PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f";

const C = {
  ink: "#10201A", body: "#2E4A3A", bodyHi: "#44664F", bodyLo: "#1E3328",
  orange: "#E8862E", gold: "#E9D46A", cream: "#F3EBD3",
  lcd: "#A8C07E", lcdInk: "#1E3328", lcdDim: "#55704A",
};
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// CJK and emoji take two monospace cells
const cells = (ch) => {
  const c = ch.codePointAt(0);
  return c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) || c >= 0x1f300) ? 2 : 1;
};
const width = (s) => Array.from(s).reduce((n, ch) => n + cells(ch), 0);
const fit = (s, max) => {
  if (width(s) <= max) return s;
  let out = "", n = 0;
  for (const ch of s) {
    if (n + cells(ch) > max - 1) break;
    out += ch;
    n += cells(ch);
  }
  return out + "…";
};

const ago = (uts) => {
  if (!uts) return "";
  const m = Math.max(1, Math.round((Date.now() / 1000 - Number(uts)) / 60));
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 60 / 24)}d`;
};

async function getTracks() {
  const key = process.env.LASTFM_API_KEY;
  if (!key) return { tracks: [], error: "no api key" };
  const url = `${API}?method=user.getrecenttracks&user=${encodeURIComponent(USER)}&api_key=${key}&format=json&limit=6`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    // a single scrobble comes back as an object instead of an array
    const list = [].concat((j.recenttracks && j.recenttracks.track) || []);
    return {
      tracks: list.map((t) => ({
        name: t.name,
        artist: (t.artist && (t.artist["#text"] || t.artist.name)) || "",
        album: (t.album && t.album["#text"]) || "",
        image: ((t.image || []).find((i) => i.size === "medium") || {})["#text"] || "",
        nowPlaying: Boolean(t["@attr"] && t["@attr"].nowplaying),
        uts: t.date && t.date.uts,
      })),
      error: j.error ? j.message : null,
    };
  } catch (e) {
    return { tracks: [], error: e.message };
  }
}

async function cover(url) {
  if (!url || url.includes(PLACEHOLDER)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "image/jpeg";
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

function bevel(x0, y0, x1, y1, face, hi, lo, edge = 4) {
  return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${C.ink}"/>` +
    `<rect x="${x0 + 3}" y="${y0 + 3}" width="${x1 - x0 - 6}" height="${y1 - y0 - 6}" fill="${lo}"/>` +
    `<rect x="${x0 + 3}" y="${y0 + 3}" width="${x1 - x0 - 6 - edge}" height="${y1 - y0 - 6 - edge}" fill="${hi}"/>` +
    `<rect x="${x0 + 3 + edge}" y="${y0 + 3 + edge}" width="${x1 - x0 - 6 - 2 * edge}" height="${y1 - y0 - 6 - 2 * edge}" fill="${face}"/>`;
}

const text = (x, y, s, size, fill, extra = "") =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="700" fill="${fill}"${extra}>${esc(s)}</text>`;

function render(tracks, art) {
  const W = 1000, H = 350;
  const now = tracks[0];
  const playing = Boolean(now && now.nowPlaying);
  const o = [];

  // body
  o.push(bevel(14, 14, W - 14, H - 14, C.body, C.bodyHi, C.bodyLo, 6));
  o.push(`<rect x="24" y="24" width="${W - 48}" height="4" fill="${C.orange}"/>`);
  o.push(text(40, 50, "LUCKY-MP3", 18, C.cream, ' letter-spacing="4"'));
  o.push(text(W - 40, 50, "128MB · MEGA BASS · ANTI-SKIP", 12, C.orange, ' text-anchor="end" letter-spacing="2"'));

  // LCD
  const L = { x0: 40, y0: 62, x1: W - 40, y1: 262 };
  o.push(`<rect x="${L.x0 - 8}" y="${L.y0 - 8}" width="${L.x1 - L.x0 + 16}" height="${L.y1 - L.y0 + 16}" fill="${C.ink}"/>`);
  o.push(`<rect x="${L.x0}" y="${L.y0}" width="${L.x1 - L.x0}" height="${L.y1 - L.y0}" fill="${C.lcd}"/>`);

  // status bar
  const status = playing ? "▶ NOW PLAYING" : now ? "❚❚ LAST PLAYED" : "■ NO DISC";
  o.push(`<g>${text(56, 84, status, 14, C.lcdInk)}` +
    (playing ? '<animate attributeName="opacity" values="1;0.25;1" dur="1.6s" calcMode="discrete" repeatCount="indefinite"/>' : "") + "</g>");
  o.push(text(L.x1 - 52, 84, "128kbps · ST", 12, C.lcdDim, ' text-anchor="end"'));
  // battery
  o.push(`<rect x="${L.x1 - 44}" y="72" width="26" height="14" fill="none" stroke="${C.lcdInk}" stroke-width="2"/>` +
    `<rect x="${L.x1 - 18}" y="76" width="3" height="6" fill="${C.lcdInk}"/>` +
    [0, 1, 2].map((k) => `<rect x="${L.x1 - 41 + k * 7}" y="75" width="5" height="8" fill="${C.lcdInk}"/>`).join(""));
  o.push(`<rect x="${L.x0 + 10}" y="92" width="${L.x1 - L.x0 - 20}" height="2" fill="${C.lcdDim}"/>`);

  if (!now) {
    o.push(text(L.x0 + 30, 160, "INSERT COOKIE TO PLAY...", 22, C.lcdInk));
    o.push(text(L.x0 + 30, 190, "no scrobbles found on last.fm", 14, C.lcdDim));
  } else {
    // cover art (64px from Last.fm, doubled with nearest-neighbour for a pixel look)
    const ax = 58, ay = 106, as = 128;
    o.push(`<rect x="${ax - 4}" y="${ay - 4}" width="${as + 8}" height="${as + 8}" fill="${C.lcdInk}"/>`);
    if (art) {
      o.push(`<image x="${ax}" y="${ay}" width="${as}" height="${as}" href="${art}" xlink:href="${art}" preserveAspectRatio="xMidYMid slice" image-rendering="pixelated" style="image-rendering:pixelated"/>`);
      o.push(`<rect x="${ax}" y="${ay}" width="${as}" height="${as}" fill="${C.lcd}" opacity="0.18"/>`);
    } else {
      // pixel note when there is no cover
      o.push(`<rect x="${ax}" y="${ay}" width="${as}" height="${as}" fill="${C.lcdDim}"/>` +
        `<g fill="${C.lcd}"><rect x="${ax + 52}" y="${ay + 34}" width="10" height="58"/><rect x="${ax + 88}" y="${ay + 26}" width="10" height="58"/>` +
        `<path d="M${ax + 52} ${ay + 34}L${ax + 98} ${ay + 26}V${ay + 38}L${ax + 52} ${ay + 46}Z"/>` +
        `<rect x="${ax + 30}" y="${ay + 82}" width="32" height="22"/><rect x="${ax + 66}" y="${ay + 74}" width="32" height="22"/></g>`);
    }

    // title (scrolls when too long), artist, album
    const tx = 206, tw = 370;
    const title = now.name || "";
    const maxTitle = Math.floor(tw / (22 * 0.6));
    if (width(title) > maxTitle) {
      const span = Math.ceil((width(title) + 6) * 22 * 0.6);
      o.push(`<clipPath id="tclip"><rect x="${tx}" y="104" width="${tw}" height="34"/></clipPath>`);
      o.push(`<g clip-path="url(#tclip)"><g>${text(tx, 128, title, 22, C.lcdInk)}${text(tx + span, 128, title, 22, C.lcdInk)}` +
        `<animateTransform attributeName="transform" type="translate" from="0 0" to="-${span} 0" dur="${(span / 45).toFixed(1)}s" repeatCount="indefinite"/></g></g>`);
    } else {
      o.push(text(tx, 128, title, 22, C.lcdInk));
    }
    o.push(text(tx, 154, fit(now.artist, Math.floor(tw / (16 * 0.6))), 16, C.lcdInk));
    o.push(text(tx, 176, fit(now.album || "single", Math.floor(tw / (13 * 0.6))), 13, C.lcdDim));

    // equalizer
    const bars = 14;
    for (let i = 0; i < bars; i++) {
      const x = tx + i * 13, base = 232, max = 40;
      const hs = playing ? [8, 30, 14, 38, 20, 34, 10].map((h) => Math.min(max, h + ((i * 7) % 11))) : [6, 6];
      const vals = hs.concat(hs[0]);
      const heights = vals.join(";"), ys = vals.map((h) => base - h).join(";");
      o.push(`<rect x="${x}" y="${base - vals[0]}" width="9" height="${vals[0]}" fill="${C.lcdInk}">` +
        (playing ? `<animate attributeName="height" values="${heights}" dur="${(0.9 + (i % 5) * 0.17).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>` +
          `<animate attributeName="y" values="${ys}" dur="${(0.9 + (i % 5) * 0.17).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>` : "") +
        "</rect>");
    }
    // progress
    const px = tx + bars * 13 + 12, pw = tx + tw - px;
    o.push(`<rect x="${px}" y="222" width="${pw}" height="10" fill="none" stroke="${C.lcdInk}" stroke-width="2"/>`);
    o.push(`<rect x="${px + 3}" y="225" width="${playing ? 0 : pw - 6}" height="4" fill="${C.lcdInk}">` +
      (playing ? `<animate attributeName="width" values="0;${pw - 6}" dur="40s" repeatCount="indefinite"/>` : "") + "</rect>");
    o.push(text(px, 212, playing ? "♪ live" : `♪ ${ago(now.uts)} ago`, 12, C.lcdDim));

    // playlist
    const lx = 600;
    o.push(`<rect x="${lx - 14}" y="104" width="2" height="${L.y1 - 116}" fill="${C.lcdDim}"/>`);
    o.push(text(lx, 118, "PLAYLIST · RECENT", 13, C.lcdDim, ' letter-spacing="2"'));
    tracks.slice(1, 6).forEach((t, i) => {
      const y = 146 + i * 24;
      const line = `${String(i + 2).padStart(2, "0")} ${t.name} — ${t.artist}`;
      o.push(text(lx, y, fit(line, 34), 14, C.lcdInk));
      o.push(text(L.x1 - 14, y, ago(t.uts), 12, C.lcdDim, ' text-anchor="end"'));
    });
  }

  // LCD dot-matrix grid + glare
  o.push(`<rect x="${L.x0}" y="${L.y0}" width="${L.x1 - L.x0}" height="${L.y1 - L.y0}" fill="url(#dots)"/>`);
  o.push(`<rect x="${L.x0}" y="${L.y0}" width="${L.x1 - L.x0}" height="${L.y1 - L.y0}" fill="url(#glare)" shape-rendering="auto"/>`);

  // controls: prev / play / next
  const by = 304;
  const ctrl = [
    [90, `M80 ${by}l10 -8v16z M90 ${by}l10 -8v16z M77 ${by - 8}h3v16h-3z`],
    [150, playing ? `M142 ${by - 9}h6v18h-6z M152 ${by - 9}h6v18h-6z` : `M144 ${by - 10}l16 10l-16 10z`],
    [210, `M200 ${by - 8}l10 8l-10 8z M210 ${by - 8}l10 8l-10 8z M220 ${by - 8}h3v16h-3z`],
  ];
  for (const [cx, d] of ctrl) {
    o.push(`<circle cx="${cx}" cy="${by}" r="22" fill="${C.ink}" shape-rendering="auto"/>` +
      `<circle cx="${cx}" cy="${by}" r="19" fill="${C.bodyHi}" shape-rendering="auto"/>` +
      `<path d="${d}" fill="${C.cream}"/>`);
  }
  // volume
  o.push(text(270, by + 5, "VOL", 12, C.cream, ' letter-spacing="2"'));
  for (let k = 0; k < 10; k++) {
    const h = 6 + k * 2.4;
    o.push(`<rect x="${306 + k * 10}" y="${by + 9 - h}" width="7" height="${h}" fill="${k < 7 ? C.orange : C.bodyLo}"/>`);
  }
  // stickers: argyle strip + cookie + bell
  for (let k = 0; k < 14; k++) {
    const x = 460 + k * 16;
    o.push(`<path d="M${x} ${by}L${x + 8} ${by - 8}L${x + 16} ${by}L${x + 8} ${by + 8}Z" fill="${k % 2 ? C.orange : "#8CC84B"}" shape-rendering="auto"/>`);
  }
  o.push(`<g shape-rendering="auto"><circle cx="${W - 150}" cy="${by}" r="18" fill="#D9A45B" stroke="#8A5A2B" stroke-width="2"/>` +
    `<circle cx="${W - 156}" cy="${by - 6}" r="2.6" fill="#4A2B12"/><circle cx="${W - 143}" cy="${by - 4}" r="2.2" fill="#4A2B12"/>` +
    `<circle cx="${W - 150}" cy="${by + 7}" r="2.4" fill="#4A2B12"/></g>`);
  o.push(`<g shape-rendering="auto"><path d="M${W - 90} ${by - 16}c-7 0 -10 5 -10 12v6l-4 5h28l-4 -5v-6c0 -7 -3 -12 -10 -12z" fill="${C.gold}" stroke="#6A5410" stroke-width="2"/>` +
    `<circle cx="${W - 90}" cy="${by + 12}" r="3.4" fill="#B89A2E"/>` +
    `<animateTransform attributeName="transform" type="rotate" values="-10 ${W - 90} ${by - 16};10 ${W - 90} ${by - 16};-10 ${W - 90} ${by - 16}" dur="1.2s" calcMode="discrete" repeatCount="indefinite"/></g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <title>${esc(now ? `${playing ? "Now playing" : "Last played"}: ${now.name} — ${now.artist}` : "LUCKY-MP3: no scrobbles")}</title>
  <defs>
    <pattern id="dots" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0h3v1H0zM0 0v3h1V0z" fill="${C.lcd}" opacity="0.45"/></pattern>
    <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.18"/><stop offset="0.35" stop-color="#FFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${o.join("\n  ")}
</svg>`;
}

module.exports = async (req, res) => {
  const { tracks } = await getTracks();
  const art = tracks[0] ? await cover(tracks[0].image) : null;
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  // camo / browsers must refetch; Vercel's edge may reuse it for 30s
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
  res.setHeader("Vercel-CDN-Cache-Control", "max-age=30");
  res.end(render(tracks, art));
};
module.exports.render = render;
