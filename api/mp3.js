// Draws a pixel-art cassette walkman (SVG) playing the track Drack112 is
// listening to right now, with the last few scrobbles written on the tape's
// J-card. Data comes live from Last.fm.
// Env: LASTFM_API_KEY (required), LASTFM_USER (defaults to Drack112).
const USER = process.env.LASTFM_USER || "Drack112";
const API = "https://ws.audioscrobbler.com/2.0/";
// Last.fm's grey star placeholder, served when a track has no cover
const PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f";

const C = {
  ink: "#10201A", body: "#2E4A3A", bodyHi: "#44664F", bodyLo: "#1E3328",
  orange: "#E8862E", gold: "#E9D46A", cream: "#F3EBD3", green: "#8CC84B",
  shell: "#3A3A36", shellHi: "#4E4E48", tape: "#4A2E1E", paper: "#F6EFD9", rule: "#D9CDAA", pen: "#2B2A55",
};
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace";
const HAND = "'Comic Sans MS','Chalkboard SE','Comic Neue','Marker Felt',cursive";

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

const text = (x, y, s, size, fill, extra = "", font = MONO) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="700" fill="${fill}"${extra}>${esc(s)}</text>`;
const hand = (x, y, s, size, fill, extra = "") => text(x, y, s, size, fill, extra, HAND);

// one cassette reel: tape pack, hub and six teeth that spin while playing
function reel(cx, cy, pack, spinning) {
  const teeth = [0, 60, 120, 180, 240, 300].map((a) =>
    `<rect x="${cx - 1.5}" y="${cy - 10}" width="3" height="4" fill="${C.cream}" transform="rotate(${a} ${cx} ${cy})"/>`).join("");
  const spin = spinning
    ? `<animateTransform attributeName="transform" type="rotate" values="${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `${a} ${cx} ${cy}`).join(";")}" dur="0.8s" calcMode="discrete" repeatCount="indefinite"/>`
    : "";
  return `<circle cx="${cx}" cy="${cy}" r="${pack}" fill="${C.tape}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="13" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>` +
    `<circle cx="${cx}" cy="${cy}" r="8" fill="${C.ink}"/>` +
    `<g>${teeth}${spin}</g>`;
}

function render(tracks, art) {
  const W = 640, H = 300;
  const now = tracks[0];
  const playing = Boolean(now && now.nowPlaying);
  const o = [];

  // transport keys on top of the walkman; the pressed one shows the state
  const keys = [["REW", "M-9 0l9 -6v12z M0 0l9 -6v12z"], ["PLAY", "M-5 -7l12 7l-12 7z"],
    ["FF", "M-9 -6l9 6l-9 6z M0 -6l9 6l-9 6z"], ["STOP", "M-6 -6h12v12h-12z"]];
  const pressed = playing ? "PLAY" : "STOP";
  keys.forEach(([name, icon], i) => {
    const x = 40 + i * 66, down = name === pressed ? 6 : 0;
    o.push(bevel(x, 8 + down, x + 58, 40, name === pressed ? C.bodyLo : C.bodyHi, C.bodyHi, C.bodyLo, 3));
    o.push(`<path d="${icon}" transform="translate(${x + 29} ${21 + down})" fill="${name === pressed ? C.orange : C.cream}"/>`);
  });
  // headphone jack
  o.push(`<rect x="356" y="18" width="22" height="14" fill="${C.ink}"/><circle cx="367" cy="25" r="4" fill="#000" shape-rendering="auto"/>`);

  // body
  o.push(bevel(10, 30, 414, 292, C.body, C.bodyHi, C.bodyLo, 6));
  // volume wheel on the side
  o.push(`<rect x="412" y="104" width="10" height="70" fill="${C.ink}"/>` +
    Array.from({ length: 11 }, (_, k) => `<rect x="414" y="${108 + k * 6}" width="6" height="3" fill="${C.bodyHi}"/>`).join(""));

  // smoked window
  o.push(`<rect x="30" y="50" width="364" height="184" fill="${C.ink}"/>`);
  o.push(`<rect x="36" y="56" width="352" height="172" fill="#0B1712"/>`);

  // cassette shell + screws
  o.push(`<rect x="46" y="64" width="332" height="158" fill="${C.shell}"/>`);
  o.push(`<rect x="46" y="64" width="332" height="3" fill="${C.shellHi}"/>`);
  for (const [sx, sy] of [[54, 72], [370, 72], [54, 214], [370, 214]]) {
    o.push(`<circle cx="${sx}" cy="${sy}" r="3" fill="${C.shellHi}" stroke="${C.ink}" stroke-width="1" shape-rendering="auto"/>`);
  }

  // label sticker
  const lx0 = 62, ly0 = 72, lx1 = 362, ly1 = 148;
  o.push(`<rect x="${lx0}" y="${ly0}" width="${lx1 - lx0}" height="${ly1 - ly0}" fill="${C.cream}"/>`);
  o.push(`<rect x="${lx0}" y="${ly0}" width="${lx1 - lx0}" height="8" fill="${C.orange}"/>`);
  o.push(text(lx0 + 8, ly0 + 46, "A", 28, C.orange));
  const ax = lx0 + 32, ay = ly0 + 16, as = 50;
  o.push(`<rect x="${ax - 2}" y="${ay - 2}" width="${as + 4}" height="${as + 4}" fill="${C.ink}"/>`);
  if (art) {
    o.push(`<image x="${ax}" y="${ay}" width="${as}" height="${as}" href="${art}" xlink:href="${art}" preserveAspectRatio="xMidYMid slice" image-rendering="pixelated" style="image-rendering:pixelated"/>`);
  } else {
    o.push(`<rect x="${ax}" y="${ay}" width="${as}" height="${as}" fill="${C.body}"/>` +
      `<g fill="${C.gold}"><rect x="${ax + 20}" y="${ay + 12}" width="5" height="24"/><rect x="${ax + 35}" y="${ay + 9}" width="5" height="24"/>` +
      `<path d="M${ax + 20} ${ay + 12}L${ax + 40} ${ay + 9}V${ay + 15}L${ax + 20} ${ay + 18}Z"/>` +
      `<rect x="${ax + 11}" y="${ay + 32}" width="14" height="9"/><rect x="${ax + 26}" y="${ay + 29}" width="14" height="9"/></g>`);
  }
  const tx = ax + as + 12, tw = lx1 - tx - 10;
  const status = playing ? "NOW PLAYING" : now ? "LAST PLAYED" : "BLANK TAPE";
  o.push(`<g>${text(tx, ly0 + 24, status, 11, playing ? C.orange : "#7A7258", ' letter-spacing="2"')}` +
    (playing ? '<animate attributeName="opacity" values="1;0.3;1" dur="1.6s" calcMode="discrete" repeatCount="indefinite"/>' : "") + "</g>");
  const title = now ? now.name : "insert cookie...";
  const maxTitle = Math.floor(tw / (17 * 0.6));
  if (width(title) > maxTitle) {
    const span = Math.ceil((width(title) + 5) * 17 * 0.6);
    o.push(`<clipPath id="tclip"><rect x="${tx}" y="${ly0 + 30}" width="${tw}" height="24"/></clipPath>`);
    o.push(`<g clip-path="url(#tclip)"><g>${text(tx, ly0 + 47, title, 17, C.ink)}${text(tx + span, ly0 + 47, title, 17, C.ink)}` +
      `<animateTransform attributeName="transform" type="translate" from="0 0" to="-${span} 0" dur="${(span / 40).toFixed(1)}s" repeatCount="indefinite"/></g></g>`);
  } else {
    o.push(text(tx, ly0 + 47, title, 17, C.ink));
  }
  o.push(text(tx, ly0 + 66, fit(now ? now.artist : "no scrobbles on last.fm", Math.floor(tw / (13 * 0.6))), 13, "#55704A"));

  // tape window with the two reels
  o.push(`<rect x="104" y="158" width="216" height="50" fill="#140E0B"/>`);
  o.push(`<clipPath id="win"><rect x="104" y="158" width="216" height="50"/></clipPath>`);
  o.push(`<g clip-path="url(#win)" shape-rendering="auto">${reel(150, 183, 30, playing)}${reel(274, 183, 21, playing)}` +
    `<rect x="104" y="158" width="216" height="12" fill="#FFF" opacity="0.06"/></g>`);
  o.push(`<rect x="104" y="158" width="216" height="50" fill="none" stroke="${C.ink}" stroke-width="3"/>`);
  // bottom ramp of the shell
  o.push(`<path d="M112 222L128 210H296L312 222Z" fill="${C.shellHi}"/>` +
    [150, 186, 222, 258].map((x) => `<rect x="${x}" y="214" width="12" height="5" fill="${C.ink}"/>`).join(""));

  // glare on the window
  o.push(`<rect x="36" y="56" width="352" height="172" fill="url(#glare)" shape-rendering="auto"/>`);

  // orange stripe
  o.push(`<rect x="16" y="242" width="392" height="6" fill="${C.orange}"/>`);

  // tape counter (last digit rolls while playing)
  o.push(`<rect x="34" y="256" width="78" height="26" fill="${C.ink}"/>`);
  const count = now && now.uts ? String(Math.min(999, Math.round((Date.now() / 1000 - now.uts) / 60))).padStart(3, "0") : "000";
  [0, 1].forEach((k) => {
    o.push(`<rect x="${38 + k * 24}" y="259" width="20" height="20" fill="${C.cream}"/>` + text(43 + k * 24, 275, count[k], 16, C.ink));
  });
  o.push(`<rect x="86" y="259" width="20" height="20" fill="${C.cream}"/>`);
  o.push(`<clipPath id="cnt"><rect x="86" y="259" width="20" height="20"/></clipPath>`);
  if (playing) {
    const strip = Array.from({ length: 11 }, (_, d) => text(91, 275 + d * 20, String(d % 10), 16, C.ink)).join("");
    const vals = Array.from({ length: 10 }, (_, d) => `0 ${-d * 20}`).join(";");
    o.push(`<g clip-path="url(#cnt)"><g>${strip}<animateTransform attributeName="transform" type="translate" values="${vals}" dur="10s" calcMode="discrete" repeatCount="indefinite"/></g></g>`);
  } else {
    o.push(text(91, 275, count[2], 16, C.ink));
  }
  // play LED
  o.push(`<circle cx="130" cy="269" r="6" fill="${C.ink}" shape-rendering="auto"/>` +
    `<circle cx="130" cy="269" r="4" fill="${playing ? C.orange : "#4A3A2A"}" shape-rendering="auto">` +
    (playing ? '<animate attributeName="opacity" values="1;0.35" dur="0.7s" calcMode="discrete" repeatCount="indefinite"/>' : "") + "</circle>");
  o.push(text(142, 273, playing ? "PLAY" : "STOP", 11, C.cream, ' letter-spacing="2"'));
  // brand
  o.push(text(400, 270, "LUCKY-MAN", 20, C.cream, ' text-anchor="end" letter-spacing="3"'));
  o.push(text(400, 284, "AUTO REVERSE · MEGA BASS", 9, C.orange, ' text-anchor="end" letter-spacing="1"'));

  // J-card with the recent tracks, slightly tilted like it was just pulled out of the case
  const jx0 = 438, jy0 = 16, jx1 = 628, jy1 = 288;
  const j = [];
  j.push(`<rect x="${jx0 + 4}" y="${jy0 + 4}" width="${jx1 - jx0}" height="${jy1 - jy0}" fill="#000" opacity="0.18"/>`);
  j.push(`<rect x="${jx0}" y="${jy0}" width="${jx1 - jx0}" height="${jy1 - jy0}" fill="${C.paper}" stroke="${C.rule}" stroke-width="2"/>`);
  j.push(`<rect x="${jx0}" y="${jy0}" width="${jx1 - jx0}" height="30" fill="${C.orange}"/>`);
  j.push(hand(jx0 + 10, jy0 + 21, "SIDE A · recent mix", 14, C.paper));
  for (let y = jy0 + 58; y < jy1 - 20; y += 22) {
    j.push(`<rect x="${jx0 + 6}" y="${y}" width="${jx1 - jx0 - 12}" height="1" fill="${C.rule}"/>`);
  }
  const rest = tracks.slice(1, 6);
  if (!rest.length) {
    j.push(hand(jx0 + 12, jy0 + 74, "nothing recorded yet...", 13, C.pen));
  }
  rest.forEach((t, i) => {
    const y = jy0 + 54 + i * 44;
    j.push(hand(jx0 + 10, y, `${i + 1}. ${fit(t.name, 19)}`, 13, C.pen));
    j.push(hand(jx0 + 24, y + 18, fit(t.artist, 24), 11, "#6A6488"));
    j.push(hand(jx1 - 8, y, ago(t.uts), 11, C.orange, ' text-anchor="end"'));
  });
  j.push(hand(jx1 - 10, jy1 - 10, "♥ drack112", 11, C.orange, ' text-anchor="end"'));
  o.push(`<g transform="rotate(2 ${(jx0 + jx1) / 2} ${(jy0 + jy1) / 2})" shape-rendering="auto">${j.join("")}</g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <title>${esc(now ? `${playing ? "Now playing" : "Last played"}: ${now.name} — ${now.artist}` : "LUCKY-MAN: blank tape")}</title>
  <defs>
    <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.16"/><stop offset="0.3" stop-color="#FFF" stop-opacity="0"/>
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
