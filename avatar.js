/* ZERO → SHIELDED — 26×26 shielded identity generator
   Deterministic pixel portraits, inspired by the zkSNARKs collection's
   strict 26×26 pixel system. Seeded by a string; never leaves the browser. */
(function () {
  const N = 26;

  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function rng(seedStr) {
    let a = hash(seedStr)();
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const PAL = {
    bg: ["#e6d7bb", "#c9b48a", "#9fb4a8", "#b9a4c9", "#d9a58f", "#8fa6c9", "#f4b728", "#2a2622", "#a8c09a"],
    skin: ["#f1c9a5", "#d9a47c", "#b07850", "#7a4e33", "#4e3222", "#c9d6d9", "#9fd1a8", "#e3d17a"],
    cloth: ["#141210", "#2b4c7e", "#6b2f2a", "#3d5a3a", "#5a4a78", "#7d7466", "#c8402a", "#f4b728"],
    hair: ["#141210", "#5a3a22", "#c98f0a", "#8b8172", "#c8402a", "#e6d7bb", "#3a5a8c"]
  };
  const INK = "#141210";

  function traits(seed) {
    const r = rng("zts::" + seed);
    const t = {
      bg: pick(r, PAL.bg),
      skin: pick(r, PAL.skin),
      cloth: pick(r, PAL.cloth),
      hair: pick(r, PAL.hair),
      head: pick(r, ["hood", "hood", "cap", "beanie", "mohawk", "bald", "crown"]),
      eyes: pick(r, ["dots", "dots", "visor", "shades", "glow", "closed"]),
      mouth: pick(r, ["flat", "smile", "mask", "mask", "smirk"]),
      extra: pick(r, ["none", "none", "pendant", "earring", "scar"])
    };
    if (t.cloth === t.bg) t.cloth = INK;
    if (t.hair === t.bg) t.hair = INK;
    return t;
  }

  function build(seed) {
    const t = traits(seed);
    const g = Array.from({ length: N }, () => Array(N).fill(null));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

    // hood back
    if (t.head === "hood") {
      rect(6, 5, 19, 21, t.cloth);
      [[6, 5], [7, 5], [6, 6], [19, 5], [18, 5], [19, 6]].forEach(([x, y]) => set(x, y, null));
    }
    // body / shoulders
    rect(4, 21, 21, 25, t.cloth);
    rect(6, 20, 19, 20, t.cloth);
    [[4, 21], [21, 21]].forEach(([x, y]) => set(x, y, null));
    // neck
    rect(11, 18, 14, 20, t.skin);
    // head
    rect(8, 7, 17, 18, t.skin);
    [[8, 7], [17, 7], [8, 18], [17, 18]].forEach(([x, y]) => set(x, y, null));
    // ears
    if (t.head !== "hood") { set(7, 12, t.skin); set(7, 13, t.skin); set(18, 12, t.skin); set(18, 13, t.skin); }

    // headwear
    switch (t.head) {
      case "hood":
        rect(8, 6, 17, 8, t.cloth); set(8, 9, t.cloth); set(17, 9, t.cloth); break;
      case "cap":
        rect(8, 5, 17, 8, t.hair); rect(9, 4, 16, 4, t.hair); rect(14, 8, 20, 8, t.hair); break;
      case "beanie":
        rect(8, 4, 17, 8, t.hair); rect(9, 3, 16, 3, t.hair); rect(8, 8, 17, 8, "#e6d7bb"); set(12, 2, t.hair); set(13, 2, t.hair); break;
      case "mohawk":
        rect(12, 2, 13, 7, t.hair); rect(11, 4, 14, 6, t.hair); break;
      case "crown":
        rect(9, 4, 16, 6, "#f4b728"); [9, 12, 13, 16].forEach(x => set(x, 3, "#f4b728")); set(12, 5, "#c8402a"); set(13, 5, "#c8402a"); break;
      case "bald":
        break;
    }

    // eyes
    switch (t.eyes) {
      case "dots":
        rect(10, 12, 11, 12, INK); rect(14, 12, 15, 12, INK); set(10, 11, "#fff"); set(14, 11, "#fff"); break;
      case "visor":
        rect(8, 11, 17, 13, INK); rect(9, 12, 16, 12, "#f4b728"); break;
      case "shades":
        rect(9, 11, 11, 13, INK); rect(14, 11, 16, 13, INK); rect(12, 11, 13, 11, INK); set(9, 11, "#5a5148"); set(14, 11, "#5a5148"); break;
      case "glow":
        rect(10, 12, 11, 12, "#f4b728"); rect(14, 12, 15, 12, "#f4b728"); rect(10, 11, 11, 11, INK); rect(14, 11, 15, 11, INK); break;
      case "closed":
        rect(10, 12, 11, 12, INK); rect(14, 12, 15, 12, INK); break;
    }
    // nose
    set(12, 14, "rgba(0,0,0,.22)");

    // mouth
    switch (t.mouth) {
      case "flat": rect(11, 16, 14, 16, INK); break;
      case "smile": rect(11, 16, 14, 16, INK); set(10, 15, INK); set(15, 15, INK); break;
      case "smirk": rect(12, 16, 14, 16, INK); set(15, 15, INK); break;
      case "mask": rect(8, 15, 17, 18, INK); rect(9, 16, 16, 16, "#2a2622"); set(12, 17, "#f4b728"); set(13, 17, "#f4b728"); break;
    }

    // extras
    if (t.extra === "pendant") { rect(12, 22, 13, 23, "#f4b728"); set(11, 21, "#f4b728"); set(14, 21, "#f4b728"); }
    if (t.extra === "earring" && t.head !== "hood") set(7, 14, "#f4b728");
    if (t.extra === "scar") { set(15, 9, "#c8402a"); set(16, 10, "#c8402a"); }

    // ZEC mark on chest (always) — tiny gold Z
    if (t.extra !== "pendant") { set(16, 23, "#f4b728"); set(17, 23, "#f4b728"); set(17, 24, "#f4b728"); set(16, 25, "#f4b728"); set(17, 25, "#f4b728"); }

    // outline pass
    const out = g.map(row => row.slice());
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (g[y][x]) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx]);
      if (nb) out[y][x] = INK;
    }
    return { grid: out, traits: t };
  }

  function draw(canvas, seed, scale) {
    const { grid, traits: t } = build(seed);
    const s = scale || 10;
    canvas.width = N * s; canvas.height = N * s;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, N * s, N * s);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (grid[y][x]) { ctx.fillStyle = grid[y][x]; ctx.fillRect(x * s, y * s, s, s); }
    }
    return t;
  }

  // illustrative QR-like pattern (NOT a scannable QR)
  function drawPseudoQR(canvas, seed) {
    const M = 29, s = 6, r = rng("qr::" + seed);
    canvas.width = M * s; canvas.height = M * s;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, M * s, M * s);
    ctx.fillStyle = "#141210";
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) if (r() > 0.52) ctx.fillRect(x * s, y * s, s, s);
    const finder = (fx, fy) => {
      ctx.fillStyle = "#fff"; ctx.fillRect((fx - 1) * s, (fy - 1) * s, 9 * s, 9 * s);
      ctx.fillStyle = "#141210"; ctx.fillRect(fx * s, fy * s, 7 * s, 7 * s);
      ctx.fillStyle = "#fff"; ctx.fillRect((fx + 1) * s, (fy + 1) * s, 5 * s, 5 * s);
      ctx.fillStyle = "#141210"; ctx.fillRect((fx + 2) * s, (fy + 2) * s, 3 * s, 3 * s);
    };
    finder(0, 0); finder(M - 7, 0); finder(0, M - 7);
    ctx.fillStyle = "#f4b728"; ctx.fillRect(12 * s, 12 * s, 5 * s, 5 * s);
    ctx.fillStyle = "#141210"; ctx.fillRect(13 * s, 13 * s, 3 * s, 1 * s); ctx.fillRect(14 * s, 14 * s, 1 * s, 1 * s); ctx.fillRect(13 * s, 15 * s, 3 * s, 1 * s);
  }

  window.ZAvatar = { draw, traits, rng, drawPseudoQR, build };
})();
