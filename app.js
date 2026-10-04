/* =========================================================
   ZERO → SHIELDED — app engine
   A simulated, offline Zcash wallet + public chain, an
   8-chapter journey from zero to first shielded transaction,
   and the SHIELD RUNNER arcade mini-game!
   ========================================================= */
(function () {
  "use strict";
  const D = window.ZDATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => (Math.round(n * 1e8) / 1e8).toFixed(4);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const FEE = 0.0001; // ZIP-317 conventional fee for minimal tx
  const B32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const KEY = "zero-to-shielded:v2";

  /* ---------------- SOUND SYNTHESIZER (WEB AUDIO API) ---------------- */
  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function playSfx(type) {
    try {
      const ctx = getAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === "jump") {
        osc.type = "square";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === "coin") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(659, now);
        osc.frequency.setValueAtTime(987, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === "shield") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === "memo") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === "hit") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(260, now + 0.15);
        osc.frequency.setValueAtTime(190, now + 0.3);
        osc.frequency.setValueAtTime(130, now + 0.45);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.65);
        osc.start(now); osc.stop(now + 0.65);
      }
    } catch (e) { /* ignore audio errors */ }
  }

  /* ---------------- STATE ---------------- */
  const fresh = () => ({
    ch: 0, maxCh: 0, done: {},
    handle: "", wallet: null, seed: [], birthday: 0,
    ua: "", taddr: "", t: 0, s: 0,
    activity: [], ledger: [], height: 3521408 + Math.floor(Math.random() * 900),
    started: Date.now(), finished: 0, txCount: 0, shieldedTotal: 0,
    sub: {}, reroll: 0, checklist: {},
    gameHighScore: +(localStorage.getItem("zero_shielded_high_score") || 0)
  });
  let S = load() || fresh();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }

  /* ---------------- HELPERS ---------------- */
  const rnd = (n, set) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");
  const short = (a, n = 10) => (a.length > n * 2 + 1 ? a.slice(0, n) + "…" + a.slice(-6) : a);
  const genUA = () => "u1" + rnd(139, B32);
  const genT = () => "t1" + rnd(33, B58);
  const genZs = () => "zs1" + rnd(75, B32);

  function toast(msg, ms = 2800) {
    const t = $("#toast"); t.innerHTML = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }
  function scramble(el, finalText, ms = 900) {
    const chars = "▓▒░█▚▞#%&@$01";
    const t0 = performance.now();
    (function frame(now) {
      const p = Math.min(1, (now - t0) / ms);
      const keep = Math.floor(finalText.length * p);
      el.textContent = finalText.slice(0, keep) + Array.from({ length: finalText.length - keep }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }
  function holdButton(btn, ms, onDone) {
    let t0 = 0, raf = 0, holding = false, label = btn.innerHTML;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      btn.style.background = `linear-gradient(90deg, var(--gold) ${p * 100}%, var(--ink) ${p * 100}%)`;
      btn.style.color = p > .5 ? "var(--ink)" : "var(--paper)";
      if (p >= 1) {
        holding = false; cancelAnimationFrame(raf); onDone();
        if (!btn.disabled) { btn.style.background = ""; btn.style.color = ""; }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const start = (e) => {
      if (btn.disabled) return;
      e.preventDefault(); holding = true; label = btn.innerHTML;
      t0 = performance.now(); raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!holding) return;
      holding = false; cancelAnimationFrame(raf);
      btn.style.background = ""; btn.style.color = ""; btn.innerHTML = label;
    };
    btn.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));
  }

  /* ---------------- GUIDANCE HUD SYSTEM ---------------- */
  function guidanceHUD(steps, activeIdx, note) {
    const isDone = activeIdx >= steps.length;
    return `
      <div class="guidance-hud">
        <div class="guidance-header">
          <span class="hud-tag">🎯 MISSION DIRECTIVE</span>
          <span class="hud-status">${isDone ? "✓ ALL OBJECTIVES COMPLETE" : `OBJECTIVE ${activeIdx + 1} OF ${steps.length}`}</span>
        </div>
        <div class="guidance-steps">
          ${steps.map((st, i) => {
            const cls = i < activeIdx ? "done" : i === activeIdx ? "active" : "";
            const icon = i < activeIdx ? "✓" : (i + 1);
            const text = typeof st === "string" ? st : st.en;
            return `
              <div class="step-chip ${cls}">
                <span class="step-icon">${icon}</span>
                <div class="step-desc">
                  <div class="step-en">${text}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
        ${note ? `<div class="guidance-hint">💡 <span>${note}</span></div>` : ""}
      </div>
    `;
  }
  function setTargetPulse(sel) {
    $$(".target-pulse").forEach((el) => el.classList.remove("target-pulse"));
    if (sel) {
      const el = typeof sel === "string" ? $(sel) : sel;
      if (el) el.classList.add("target-pulse");
    }
  }

  /* ---------------- WALLET + CHAIN SIM ---------------- */
  function addActivity(a) { S.activity.unshift(a); S.txCount++; }
  function addTx(tx) {
    S.height += 1 + Math.floor(Math.random() * 2);
    tx.h = S.height; tx.id = rnd(8, "0123456789abcdef"); tx.ts = Date.now();
    S.ledger.unshift(tx); S.ledger = S.ledger.slice(0, 40);
    save(); renderRail(tx.id);
  }
  function ambientTx() {
    if (document.hidden) return;
    const r = Math.random();
    const kind = r < 0.72 ? "shielded" : r < 0.88 ? "public" : r < 0.94 ? "shield" : "unshield";
    const amt = +(Math.random() * 6 + 0.01).toFixed(4);
    addTx({ kind, from: genT(), to: genT(), amt, mine: false });
  }

  /* ---------------- RAIL RENDER ---------------- */
  function renderRail(newId) {
    $("#wallet-name").textContent = S.wallet ? (D.wallets.find((w) => w.id === S.wallet)?.name || "WALLET").toUpperCase() + " · SIM" : "NO WALLET";
    const prevS = $("#bal-s").textContent, prevT = $("#bal-t").textContent;
    $("#bal-total").innerHTML = `${fmt(S.t + S.s)} <small>ZEC</small>`;
    $("#bal-s").textContent = fmt(S.s); $("#bal-t").textContent = fmt(S.t);
    if (prevS !== fmt(S.s)) pulse(".bal-cell.shielded");
    if (prevT !== fmt(S.t)) pulse(".bal-cell.transparent");

    let hint = "Create a wallet to begin.";
    if (S.wallet && S.t + S.s === 0) hint = "Wallet ready. Balance: zero. Let's fix that.";
    if (S.t > 0) hint = "⚠ Transparent funds are publicly visible. Shield them.";
    if (S.s > 0 && S.t === 0) hint = "✓ Fully shielded. Nobody can see this balance but you.";
    $("#device-hint").textContent = hint;

    const act = $("#activity");
    act.innerHTML = S.activity.length ? S.activity.map((a) => `
      <li><span>${a.icon}</span><span>${esc(a.label)}</span><span class="amt ${a.dir}">${a.dir === "in" ? "+" : "−"}${fmt(a.amt)}</span>
      ${a.memo ? `<span class="memo">“${esc(a.memo)}”</span>` : ""}</li>`).join("") : `<li class="empty">— nothing yet —</li>`;

    $("#block-height").textContent = "BLOCK " + S.height.toLocaleString("en-US");
    const L = $("#ledger");
    L.innerHTML = S.ledger.length ? S.ledger.map((tx) => txHTML(tx, tx.id === newId)).join("") : `<li class="empty">The public chain. Anyone, anywhere, forever.</li>`;
  }
  function pulse(sel) { const el = $(sel); if (!el) return; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
  const R = (n) => `<span class="redact">${"x".repeat(n)}</span>`;
  function txHTML(tx, isNew) {
    const yours = tx.mine ? `<span style="color:var(--gold)">← YOURS (only you know)</span>` : "";
    const head = (label, cls) => `<div class="tx-head"><span class="tx-kind ${cls}">${label}</span><span>#${tx.h.toLocaleString("en-US")} · ${tx.id}</span></div>`;
    let body = "";
    if (tx.kind === "public") {
      body = head("TRANSPARENT", "public") + row("FROM", short(tx.from), "exposed") + row("TO", short(tx.to), "exposed") + row("AMT", fmt(tx.amt) + " ZEC", "exposed") + (tx.note ? row("NOTE", tx.note, "exposed") : "");
    } else if (tx.kind === "shield") {
      body = head("SHIELDING  t → z", "mixed") + row("FROM", short(tx.from), "exposed") + row("TO", "◆ shielded pool", "hidden") + row("AMT", fmt(tx.amt) + " ZEC enters pool", "exposed");
    } else if (tx.kind === "unshield") {
      body = head("UNSHIELDING  z → t", "mixed") + row("FROM", "◆ shielded pool", "hidden") + row("TO", short(tx.to), "exposed") + row("AMT", fmt(tx.amt) + " ZEC exits pool", "exposed");
    } else {
      body = head("SHIELDED  z → z", "shielded") + `<div class="tx-row"><span class="k">FROM</span><span class="v">${R(18)}</span></div><div class="tx-row"><span class="k">TO</span><span class="v">${R(18)}</span></div><div class="tx-row"><span class="k">AMT</span><span class="v">${R(9)}</span></div><div class="tx-row"><span class="k">MEMO</span><span class="v">${R(14)}</span></div>` + row("FEE", "0.0001 ZEC", "");
    }
    return `<li class="tx ${isNew ? "new" : ""}" data-kind="${tx.kind}" data-id="${tx.id}">${body}${yours ? `<div class="tx-head" style="margin:4px 0 0">${yours}<span></span></div>` : ""}</li>`;
  }
  const row = (k, v, cls) => `<div class="tx-row"><span class="k">${k}</span><span class="v ${cls}">${esc(v)}</span></div>`;

  // ZECATHON CRT Transaction Inspector / Röntgen Terminal
  function openTxInspector(txId) {
    const tx = S.ledger.find((t) => t.id === txId) || S.ledger[0];
    if (!tx) return;
    const modal = $("#modal-tx");
    const body = $("#modal-tx-body");
    if (!modal || !body) return;

    const isShielded = tx.kind === "shielded";
    const isPublic = tx.kind === "public";
    const isShield = tx.kind === "shield";
    const isUnshield = tx.kind === "unshield";

    let tagClass = "tag-shielded";
    let tagText = "🛡️ 100% ZERO-KNOWLEDGE PROOF ENCRYPTED";
    if (isPublic) {
      tagClass = "tag-public";
      tagText = "⚠️ SURVEILLANCE LEAK DETECTED (TRANSPARENT)";
    } else if (isShield) {
      tagClass = "tag-public";
      tagText = "◐ ENTERING SHIELDED POOL (t → z)";
    } else if (isUnshield) {
      tagClass = "tag-public";
      tagText = "◐ EXITING SHIELDED POOL (z → t)";
    }

    body.innerHTML = `
      <div class="terminal-meta-box">
        <div><span style="color:#52996e">TXID:</span> <b style="color:#00ff88">${esc(tx.id)}</b></div>
        <div><span style="color:#52996e">BLOCK:</span> #${tx.h.toLocaleString("en-US")}</div>
        <div class="tx-tag ${tagClass}">${tagText}</div>
      </div>

      <div class="terminal-grid">
        <div class="terminal-card ${isPublic ? "leak" : "shield"}">
          <h4>${isPublic ? "🚨 SENSOR SURVEILLANCE FEED" : "👁️ EXTERNAL NODE 07 OBSERVATION"}</h4>
          <p>
            ${isPublic
              ? `<b>CRITICAL PRIVACY LEAK:</b> Node 07 sensors recorded plaintext UTXO activity. Sender (<code>${esc(short(tx.from, 14))}</code>) and recipient (<code>${esc(short(tx.to, 14))}</code>) are permanently exposed on the public blockchain. Anyone can track all transactions forward and backward forever.`
              : isShield
              ? `<b>PARTIAL EXPOSURE:</b> Funds transferred from transparent address <code>${esc(short(tx.from, 14))}</code> into the shielded pool. Entry amount (${fmt(tx.amt)} ZEC) is logged by Node 07, but recipient destination is encrypted.`
              : isUnshield
              ? `<b>PARTIAL EXPOSURE:</b> Funds exited shielded pool to transparent address <code>${esc(short(tx.to, 14))}</code>. Withdrawal amount (${fmt(tx.amt)} ZEC) and recipient are cleartext, but origin note remains zero-knowledge shielded.`
              : `<b>ZERO SURVEILLANCE DATA:</b> Node 07 detects only mathematical proof execution. Sender, receiver, amount, and encrypted memo contain <b>0 bytes of plaintext</b>. Computationally indistinguishable from random white noise.`
            }
          </p>
        </div>

        <div class="terminal-card shield">
          <h4>🛡️ ZERO-KNOWLEDGE PROOF ENGINE</h4>
          <p>
            ${isPublic
              ? `<b>NO PROOF SYSTEM:</b> Transparent transactions do not generate zk-SNARKs. They rely on standard Bitcoin-style ECDSA signatures, leaking balances, graph topology, and spending habits.`
              : `<b>HALO 2 / PLONK VERIFIED:</b> Validated via recursive zero-knowledge proofs on Pasta curves without a trusted setup. Mathematical constraints guarantee zero inflation, valid note ownership, and authorized spend without disclosing identity.`
            }
          </p>
        </div>
      </div>

      <table class="terminal-table">
        <thead>
          <tr>
            <th>CRYPTOGRAPHIC PARAMETER</th>
            <th>WHAT SURVEILLANCE NODE 07 SEES</th>
            <th>ZERO-KNOWLEDGE REALITY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="field-name">SENDER IDENTITY</td>
            <td class="${isPublic || isShield ? "val-leak" : "val-zk"}">${isPublic || isShield ? esc(short(tx.from, 16)) : "[ENCRYPTED NULLIFIER HASH]"}</td>
            <td class="val-zk">${isShielded ? "Derived from Spend Authorizing Key (Secret)" : (isShield ? "Transparent t-address exposed" : "Plaintext exposed")}</td>
          </tr>
          <tr>
            <td class="field-name">RECIPIENT DESTINATION</td>
            <td class="${isPublic || isUnshield ? "val-leak" : "val-zk"}">${isPublic || isUnshield ? esc(short(tx.to, 16)) : "[NOTE COMMITMENT (cm)]"}</td>
            <td class="val-zk">${isShielded ? "Diversified Shielded Receiver (Orchard/Sapling)" : "Public destination"}</td>
          </tr>
          <tr>
            <td class="field-name">AMOUNT TRANSFERRED</td>
            <td class="${isShielded ? "val-zk" : "val-leak"}">${isShielded ? "[PEDERSEN VALUE COMMITMENT]" : fmt(tx.amt) + " ZEC"}</td>
            <td class="val-zk">${isShielded ? "Homomorphic Commitment: cv = v·G + r·H" : "Plaintext value broadcast to all nodes"}</td>
          </tr>
          <tr>
            <td class="field-name">ENCRYPTED MEMO</td>
            <td class="${tx.note ? "val-leak" : "val-zk"}">${tx.note ? `"${esc(tx.note)}"` : (isShielded ? "[512-BYTE CIPHERTEXT PAYLOAD]" : "None")}</td>
            <td class="val-zk">${isShielded ? "ChaCha20-Poly1305 (Decryptable only via IVK)" : (tx.note ? "Public cleartext" : "N/A")}</td>
          </tr>
          <tr>
            <td class="field-name">VERIFICATION CIRCUIT</td>
            <td class="val-zk">${isPublic ? "None (Standard Script)" : "Halo 2 / UltraPLONK"}</td>
            <td class="val-zk">${isPublic ? "0% Privacy (Surveillance Open)" : "100% Zero-Knowledge Verified"}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:center;margin-top:14px;">
        <button class="btn-zecathon-scanline" id="modal-tx-btn-close">✕ CLOSE TERMINAL INSPECTOR</button>
      </div>
    `;

    playSfx(isShielded ? "shield" : "coin");
    modal.showModal();
    $("#modal-tx-btn-close")?.addEventListener("click", () => modal.close());
  }

  $("#modal-tx-close")?.addEventListener("click", () => $("#modal-tx")?.close());
  $("#modal-tx")?.addEventListener("click", (e) => { if (e.target === $("#modal-tx")) $("#modal-tx").close(); });

  // Open transaction inspector when clicking any tx in ledger
  $("#ledger").addEventListener("click", (e) => {
    const li = e.target.closest(".tx"); if (!li) return;
    openTxInspector(li.dataset.id);
  });

  /* ---------------- MAP / NAV ---------------- */
  function renderMap() {
    $("#map").innerHTML = D.chapters.map((c, i) => `
      <button class="map-node ${i === S.ch ? "active" : ""} ${S.done[c.id] ? "done" : ""}" data-go="${i}" ${i > S.maxCh ? "disabled" : ""}>${c.short}</button>`).join("");
  }
  $("#map").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b && !b.disabled) go(+b.dataset.go); });
  function go(i) {
    if (AutoPilot.active && !AutoPilot._internal) {
      AutoPilot.stop("Manual navigation detected");
    }
    S.ch = Math.max(0, Math.min(D.chapters.length - 1, i));
    S.maxCh = Math.max(S.maxCh, S.ch);
    save(); render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function complete(id, msg) {
    if (!S.done[id]) { S.done[id] = true; save(); if (msg) toast(msg); }
    const idx = D.chapters.findIndex((c) => c.id === id);
    S.maxCh = Math.max(S.maxCh, idx + 1);
    renderMap();
    const nb = $("#next-btn"), st = $("#next-status");
    if (nb) { nb.disabled = false; setTargetPulse(nb); }
    if (st) { st.textContent = "✓ CHAPTER COMPLETE"; st.classList.add("ok"); }
  }
  function nextBar(id, need) {
    const ok = !!S.done[id];
    return `<div class="next-bar">
      <span class="status ${ok ? "ok" : ""}" id="next-status">${ok ? "✓ CHAPTER COMPLETE" : "◇ " + need}</span>
      <div class="actions" style="margin:0">
        ${S.ch > 0 ? `<button class="btn ghost sm" id="prev-btn">← Back</button>` : ""}
        <button class="btn gold" id="next-btn" ${ok ? "" : "disabled"}>Next chapter →</button>
      </div></div>`;
  }
  function bindNav() {
    $("#next-btn")?.addEventListener("click", () => go(S.ch + 1));
    $("#prev-btn")?.addEventListener("click", () => go(S.ch - 1));
  }
  const kicker = (n, label) => `<div class="kicker"><span class="num">${n}</span><span>${label}</span></div>`;
  const real = (title, inner) => `<details class="real"><summary>▶ DO IT FOR REAL — ${title}</summary><div class="real-body">${inner}</div></details>`;

  /* ---------------- AUTO-PILOT & QUICK LAUNCH SYSTEM ---------------- */
  function quickJumpToArcade() {
    AutoPilot.stop();
    if (!S.handle) S.handle = "CYPHER_RUNNER";
    if (!S.wallet) S.wallet = "zodl";
    if (!S.seed || S.seed.length !== 24) {
      const w = D.words;
      S.seed = Array.from({ length: 24 }, () => w[Math.floor(Math.random() * w.length)]);
    }
    if (!S.ua) S.ua = "u1" + rnd(139, B32);
    if (!S.taddr) S.taddr = "t1" + rnd(33, B58);
    S.t = 0;
    S.s = 1.25;
    S.shieldedTotal = 1.25;
    S.txCount = Math.max(S.txCount, 4);
    D.chapters.forEach((c) => { S.done[c.id] = true; });
    S.maxCh = D.chapters.length - 1;
    save();
    playSfx("shield");
    toast("🎮 Jumped directly to Shield Runner Arcade!");
    const gameIdx = D.chapters.findIndex((c) => c.id === "game");
    go(gameIdx >= 0 ? gameIdx : 9);
  }

  const AutoPilot = {
    active: false,
    _internal: false,

    start() {
      if (this.active) return;
      this.active = true;
      this.showBanner();
      playSfx("shield");
      toast("⚡ Auto-Pilot started! Autonomous tour running...", 3000);
      this.run();
    },

    stop(reason) {
      this.active = false;
      this.hideBanner();
      if (reason) toast("✋ " + reason, 2200);
    },

    showBanner() {
      let b = $("#autopilot-banner");
      if (!b) {
        b = document.createElement("div");
        b.id = "autopilot-banner";
        b.className = "autopilot-banner";
        b.innerHTML = `
          <span class="autopilot-text">⚡ <b>AUTO-PILOT ACTIVE:</b> Autonomous walkthrough running</span>
          <button id="autopilot-stop-btn">✕ Take Manual Control</button>
        `;
        document.body.appendChild(b);
      }
      b.style.display = "flex";
      const stopBtn = $("#autopilot-stop-btn");
      if (stopBtn) {
        stopBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          AutoPilot.stop("Manual control restored");
          AutoPilot.hideBanner();
        };
      }
    },

    hideBanner() {
      const b = $("#autopilot-banner");
      if (b) {
        b.style.display = "none";
        b.remove();
      }
    },

    async run() {
      const stepWait = async (ms) => {
        if (!this.active) return false;
        await sleep(ms);
        return this.active;
      };

      const autoGo = (idx) => {
        this._internal = true;
        go(idx);
        this._internal = false;
      };

      // 00 — INTRO
      autoGo(0);
      if (!S.handle) S.handle = "CYPHER_RUNNER";
      const hInp = $("#handle");
      if (hInp) hInp.value = S.handle;
      if (!await stepWait(1400)) return;
      complete("intro");
      playSfx("coin");

      // 01 — WHY PRIVACY (GLASS HOUSE)
      autoGo(1);
      if (!await stepWait(1300)) return;
      const peekBtn = $("#peek-btn");
      if (peekBtn) peekBtn.click();
      if (!await stepWait(1400)) return;
      const shieldDemoBtn = $("#shield-demo");
      if (shieldDemoBtn) shieldDemoBtn.click();
      if (!await stepWait(1500)) return;
      complete("why");

      // 02 — WALLET SETUP
      autoGo(2);
      if (!await stepWait(1300)) return;
      const zodl = $("[data-w='zodl']");
      if (zodl) zodl.click();
      if (!await stepWait(1300)) return;
      const cover = $("#seed-cover");
      if (cover) {
        cover.style.opacity = "0";
        $("#seed-grid")?.classList.remove("blurred");
      }
      const wroteCb = $("#wrote");
      if (wroteCb) { wroteCb.checked = true; wroteCb.dispatchEvent(new Event("change")); }
      if (!await stepWait(1500)) return;
      const phishAns = $("[data-a='2']", $("#phish"));
      if (phishAns) phishAns.click();
      if (!await stepWait(1600)) return;
      complete("wallet");

      // 03 — ADDRESS ANATOMY
      autoGo(3);
      if (!await stepWait(1400)) return;
      const addrItems = (S.sub && S.sub.address && S.sub.address.items) || [];
      $$("#classify .classify-row").forEach((row) => {
        const it = addrItems[+row.dataset.i];
        if (it) {
          const btn = $(`[data-v="${it.ans}"]`, row);
          btn?.click();
        }
      });
      if (!await stepWait(1500)) return;
      complete("address");
      playSfx("shield");

      // 04 — GETTING ZEC
      autoGo(4);
      if (!await stepWait(1300)) return;
      $("#buy-btn")?.click();
      if (!await stepWait(1000)) return;
      $("#paste-t")?.click();
      if (!await stepWait(1000)) return;
      $("#wd-btn")?.click();
      if (!await stepWait(2800)) return;
      complete("get");

      // 05 — SHIELDING
      autoGo(5);
      if (!await stepWait(1300)) return;
      $("#shield-btn")?.click();
      if (!await stepWait(2400)) return;
      complete("shield");

      // 06 — SEND & RECEIVE
      autoGo(6);
      if (!await stepWait(1300)) return;
      $("#recv-btn")?.click();
      if (!await stepWait(1800)) return;
      $("#review-btn")?.click();
      if (!await stepWait(1200)) return;
      const amt = 0.05;
      S.s = +(S.s - amt - FEE).toFixed(8);
      addTx({ kind: "shielded", amt, mine: true });
      addActivity({ icon: "⬆", label: "To Café Nym (shielded)", amt: amt + FEE, dir: "out", memo: "One flat white, please ☕" });
      complete("send");
      if (!await stepWait(1600)) return;

      // 07 — UNSHIELDING
      autoGo(7);
      if (!await stepWait(1300)) return;
      const unRight = $("[data-a='2']", $("#unq"));
      if (unRight) unRight.click();
      if (!await stepWait(1200)) return;
      const unAmt = 0.5;
      S.s = +(S.s - unAmt - FEE).toFixed(8);
      addTx({ kind: "unshield", to: "t1SimExDepositSafe" + rnd(10, B58), amt: unAmt, mine: true });
      addActivity({ icon: "↗", label: "Unshielded to SimEx", amt: unAmt + FEE, dir: "out" });
      complete("unshield");
      if (!await stepWait(1600)) return;

      // 08 — GRADUATION & SEAMLESS ARCADE LAUNCH
      autoGo(8);
      if (!await stepWait(2000)) return;
      complete("grad");
      toast("🎓 Graduation complete! Launching Shield Runner arcade...", 2800);
      if (!await stepWait(1800)) return;

      // 09 — LAUNCH ARCADE GAME
      quickJumpToArcade();
      toast("🎮 Welcome to SHIELD RUNNER! Arrow keys / Touch to play!", 4000);
    }
  };

  /* ---------------- CHAPTERS ---------------- */
  const CH = {};

  /* 00 — INTRO */
  CH.intro = () => {
    const steps = [
      "Enter your cypherpunk handle below",
      "Click 'Start Interactive Journey →' or pick Auto-Pilot"
    ];
    return {
      html: `<div class="chapter hero">
        <div class="stamp">PRACTICE MODE<b>NO REAL ZEC</b>SAFE TO FAIL</div>
        ${kicker("00", "A PLAYABLE ZCASH ONBOARDING")}
        <h1><span class="line">ZERO</span><span class="line">TO <span class="gold-ink">SHIELDED</span>.</span></h1>
        <div class="tagline"><span>WALLET SETUP</span><span>GETTING ZEC</span><span>SHIELDING</span><span>SEND & RECEIVE</span><span>UNSHIELDING</span></div>
        <p class="lead">Money that doesn't leak. In about <b>10 minutes</b> you'll set up a wallet, get ZEC, shield it, send a private payment with an encrypted memo, receive one, and unshield — on a <b>simulated wallet and chain</b>, so mistakes cost nothing.</p>

        ${guidanceHUD(steps, S.handle ? 1 : 0, "Pick any name or pseudonym. It generates your 26×26 shielded pixel identity!")}

        <div class="panel" style="max-width:560px"><div class="win-title gold"><span>◆ NEW IDENTITY</span><span class="win-sub">STAYS IN YOUR BROWSER</span></div>
          <div class="panel-body">
            <div class="field"><label for="handle">PICK A HANDLE (FOR YOUR CERTIFICATE & AVATAR)</label>
            <input type="text" id="handle" maxlength="24" placeholder="e.g. anon_cypherpunk" value="${esc(S.handle)}" autocomplete="off" /></div>
            <div class="actions" style="margin-top:6px">
              <button class="btn xl gold" id="begin-btn">Start Interactive Journey →</button>
              ${S.maxCh > 0 ? `<button class="btn ghost sm" id="resume-btn">Resume chapter ${S.maxCh}</button>` : ""}
            </div>
            <div class="quick-launch-grid">
              <button class="btn ghost sm" id="btn-autopilot" title="Sit back and watch the autonomous onboarding walkthrough">⚡ Auto-Pilot Demo (40s)</button>
              <button class="btn sm btn-arcade-spotlight" id="btn-quick-game" title="Jump directly to the Shield Runner arcade game">🎮 PLAY ARCADE GAME ★</button>
            </div>
          </div></div>
        <div class="chapter-list">
          ${D.chapters.slice(1, -1).map((c, i) => `<div class="chapter-card"><div class="n">${String(i + 1).padStart(2, "0")}</div><div class="t">${c.title.toUpperCase()}</div></div>`).join("")}
          <div class="chapter-card chapter-card-arcade" id="card-quick-game" style="cursor:pointer;" title="Jump straight into Shield Runner arcade game!"><div class="n">🎮</div><div class="t">SHIELD RUNNER (ARCADE) ★</div></div>
        </div>
      </div>`,
      bind() {
        const inp = $("#handle"), btn = $("#begin-btn");
        if (!S.handle) setTargetPulse(inp); else setTargetPulse(btn);
        inp.addEventListener("input", () => {
          if (inp.value.trim()) setTargetPulse(btn);
        });
        const start = () => {
          S.handle = (inp.value.trim() || "anon").slice(0, 24);
          if (!S.done.intro) S.started = Date.now();
          playSfx("coin");
          complete("intro"); go(1);
        };
        btn.addEventListener("click", start);
        inp.addEventListener("keydown", (e) => e.key === "Enter" && start());
        $("#resume-btn")?.addEventListener("click", () => go(S.maxCh));
        $("#btn-autopilot")?.addEventListener("click", () => AutoPilot.start());
        $("#btn-quick-game")?.addEventListener("click", () => quickJumpToArcade());
        $("#card-quick-game")?.addEventListener("click", () => quickJumpToArcade());
      }
    };
  };

  /* 01 — WHY: THE GLASS HOUSE */
  CH.why = () => {
    let stepIdx = S.done.why ? 2 : 0;
    const steps = [
      "Click '👁 Be the barista' to see public chain surveillance",
      "Click '🛡 Now pay shielded' to see zero-knowledge protection",
      "Click 'Next chapter →' to set up your wallet"
    ];
    return {
      html: `<div class="chapter">
        ${kicker("01", "WHY SHIELDED?")}
        <h2>The glass house.</h2>
        <p class="lead">Most blockchains are <b>public ledgers</b>. Pay someone once, and they can look up your address and read your whole financial life. Try it.</p>

        <div id="why-guidance">${guidanceHUD(steps, stepIdx, "Watch the right column leak your financial history in real-time.")}</div>

        <div class="glass">
          <div class="glass-col">
            <h3>You buy a coffee</h3>
            <div class="receipt">
              <div class="row"><span>CAFÉ GLASS</span><span>#0042</span></div>
              <div class="row"><span>Flat white</span><span>0.0500 ZEC</span></div>
              <div class="row"><span>Paid from</span><span>t1Yx…9fQa</span></div>
              <div class="row"><b>STATUS</b><b>PAID ✓</b></div>
            </div>

            <div class="action-steps-flow" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
              <div class="flow-step" id="flow-step-1">
                <div class="flow-tag" style="font-family:var(--f-pixel);font-size:10px;color:#8b8172;margin-bottom:4px;">STEP 1 · THE PUBLIC LEAK</div>
                <button class="btn sm" id="peek-btn" style="width:100%;justify-content:center;">👁 1. Be the barista: look up t1Yx…</button>
              </div>
              
              <div class="flow-arrow" id="flow-arrow" style="text-align:center;color:var(--gold);font-family:var(--f-pixel);font-size:11px;opacity:0.4;transition:all .3s;">↓ STEP 2 ↓</div>

              <div class="flow-step" id="flow-step-2">
                <div class="flow-tag" style="font-family:var(--f-pixel);font-size:10px;color:#8b8172;margin-bottom:4px;">STEP 2 · ZERO-KNOWLEDGE SHIELD</div>
                <button class="btn gold sm" id="shield-demo" disabled style="width:100%;justify-content:center;">🛡 2. Now pay shielded</button>
              </div>

              <div id="flow-next-container" class="hidden" style="margin-top:10px;">
                <button class="btn gold sm" id="why-inline-next" style="width:100%;justify-content:center;background:var(--gold);color:#000;font-weight:700;">Proceed to Chapter 02: Wallet Setup →</button>
              </div>
            </div>
          </div>
          <div class="glass-col dark">
            <div class="label" style="color:#8b8172" id="glass-label">WHAT THE BARISTA CAN NOW SEE</div>
            <ul class="leak-list" id="leaks">
              <li><span class="what">Current balance</span><span class="amt">41.7310 ZEC</span></li>
              <li><span class="what">Salary from t1Acme… (every 1st)</span><span class="amt">+12.0000</span></li>
              <li><span class="what">Rent to t1Land… (every 3rd)</span><span class="amt">−3.2000</span></li>
              <li><span class="what">Pharmacy, twice this month</span><span class="amt">−0.4100</span></li>
              <li><span class="what">Donation to a political group</span><span class="amt">−1.0000</span></li>
              <li><span class="what">Bought from the same shop as your ex</span><span class="amt">−0.0800</span></li>
              <li><span class="what">Every future payment you make</span><span class="amt">∞</span></li>
            </ul>
            <p class="small" id="glass-note" style="color:#8b8172;margin-top:10px">Nothing hacked. Just a block explorer.</p>
          </div>
        </div>
        <div class="callout tip"><b>Zcash</b> is digital money like Bitcoin, plus zero-knowledge proofs (<b>zk-SNARKs</b>). The network can verify a payment is valid <i>without seeing who paid whom, or how much</i>. That's a <b>shielded</b> transaction.</div>
        <p>Privacy isn't about hiding wrongdoing. It's about not handing your salary, your health, and your politics to every person you pay. Cash had this property. Zcash brings it back.</p>
        ${nextBar("why", "LOOK THROUGH THE GLASS, THEN SHIELD IT")}
      </div>`,
      bind() {
        let peeked = false;
        if (!S.done.why) setTargetPulse("#peek-btn");
        else {
          $("#peek-btn").classList.add("done");
          $("#peek-btn").textContent = "✓ 1. Public Trace Revealed";
          $("#shield-demo").disabled = false;
          $("#shield-demo").classList.add("done");
          $("#shield-demo").textContent = "✓ 2. Encrypted with zk-SNARK";
          $("#flow-next-container")?.classList.remove("hidden");
        }

        $("#peek-btn").addEventListener("click", () => {
          $("#leaks").classList.add("revealed");
          $$("#leaks li").forEach((li, i) => (li.style.transitionDelay = i * 120 + "ms"));
          peeked = true;
          $("#shield-demo").disabled = false;
          playSfx("hit");
          $("#peek-btn").textContent = "✓ 1. Public Trace Revealed";
          $("#peek-btn").style.opacity = "0.75";
          $("#flow-arrow").style.opacity = "1";
          $("#flow-arrow").style.transform = "scale(1.15)";
          $("#flow-arrow").innerHTML = "👇 <b>NEXT STEP</b> 👇";
          setTargetPulse("#shield-demo");
          $("#why-guidance").innerHTML = guidanceHUD(steps, 1, "Now click '2. Now pay shielded' to encrypt your transaction.");
        });

        $("#shield-demo").addEventListener("click", () => {
          if (!peeked && !S.done.why) return;
          playSfx("shield");
          $("#leaks").classList.add("shielded");
          $("#glass-label").textContent = "WHAT THE BARISTA SEES WITH SHIELDED ZEC";
          $("#glass-note").innerHTML = `<span style="color:var(--gold)">They know one thing: <b style="background:none">they got paid 0.05 ZEC.</b> Nothing else.</span>`;
          $("#shield-demo").textContent = "✓ 2. Encrypted with zk-SNARK";
          $("#flow-arrow").innerHTML = "✓ ENCRYPTION COMPLETE";
          $("#flow-arrow").style.color = "var(--green)";
          $("#flow-next-container")?.classList.remove("hidden");
          setTargetPulse("#why-inline-next");
          $("#why-guidance").innerHTML = guidanceHUD(steps, 2, "Mission complete! Click 'Proceed to Chapter 02' below.");
          complete("why", "🛡 That's the whole idea. Let's get you a wallet.");
        });

        $("#why-inline-next")?.addEventListener("click", () => go(2));
      }
    };
  };

  /* 02 — WALLET SETUP */
  CH.wallet = () => {
    const sub = S.sub.wallet || (S.sub.wallet = {});
    // Guarantee that seed words are ALWAYS present and properly generated
    if (!S.seed || S.seed.length !== 24) {
      const w = D.words;
      S.seed = Array.from({ length: 24 }, () => w[Math.floor(Math.random() * w.length)]);
      if (!S.birthday) S.birthday = S.height;
      if (!S.ua) S.ua = genUA();
      if (!S.taddr) S.taddr = genT();
      save();
    }
    const steps = [
      "Choose a shielded-first wallet below (e.g. Zodl)",
      "Press & hold the seed box to reveal 24 words",
      "Check 'I wrote my 24 words down on paper'",
      "Verify 3 secret words correctly",
      "Safely navigate the phishing message trap"
    ];
    let curStep = 0;
    if (S.wallet) curStep = 1;
    if (sub.wrote) curStep = 3;
    if (sub.verified) curStep = 4;
    if (S.done.wallet) curStep = 5;

    return {
      html: `<div class="chapter">
        ${kicker("02", "WALLET SETUP")}
        <h2>Your keys,<br/>your coins.</h2>
        <p class="lead">A Zcash wallet is an app that holds your <b>keys</b>. Choose a <b>shielded-by-default</b> wallet — it keeps your funds private without extra steps. Pick one to simulate (all are real).</p>

        <div id="wallet-guidance">${guidanceHUD(steps, curStep, "Start by clicking any wallet card below.")}</div>

        <h3>Step 1 · Choose a wallet</h3>
        <div class="wallets" id="wallets">
          ${D.wallets.map((w) => `<button class="wallet-card ${S.wallet === w.id ? "selected" : ""}" data-w="${w.id}">
            <div class="wp">${w.platform}</div><div class="wn">${w.name}</div><div class="wd">${w.desc}</div>
            <div>${w.tags.map((t) => `<span class="badge">${t}</span>`).join("")}</div></button>`).join("")}
        </div>

        <div id="step-seed" class="${S.wallet ? "" : "hidden"}">
          <div class="rule"></div>
          <h3>Step 2 · Your secret recovery phrase</h3>
          <p>Your wallet just generated <b>24 words</b>. These words <i>are</i> your wallet. Lose them → lose your funds. Leak them → someone else owns your funds. No company can reset them.</p>
          <div class="seed-wrap mt">
            <div class="seed-grid blurred" id="seed-grid">${S.seed.map((w, i) => `<div class="seed-word"><i>${i + 1}</i>${w}</div>`).join("")}</div>
            <div class="seed-cover" id="seed-cover"><span class="hold">PRESS & HOLD TO REVEAL</span><span>MAKE SURE NOBODY IS WATCHING</span></div>
          </div>
          <div class="callout warn"><b>Write it on paper.</b> No screenshots, no cloud notes, no password-manager autofill on shared devices. Store it somewhere safe from fire and curious eyes.</div>
          <label class="check"><input type="checkbox" id="wrote" ${sub.wrote ? "checked" : ""}/> I wrote my 24 words down, in order, on paper.</label>
          <p class="small mt">Birthday height: <b id="bday">${S.birthday ? S.birthday.toLocaleString("en-US") : "—"}</b> — write this next to your words. Restoring with it makes syncing much faster.</p>
        </div>

        <div id="step-verify" class="${sub.wrote ? "" : "hidden"}">
          <div class="rule"></div>
          <h3>Step 3 · Prove you saved it</h3>
          <p class="small" style="margin-bottom:12px">Real wallets do this too. (Peek above if you need — that's what paper is for.)</p>
          <div id="verify"></div>
        </div>

        <div id="step-phish" class="${sub.verified ? "" : "hidden"}">
          <div class="rule"></div>
          <h3>Step 4 · The #1 way people lose crypto</h3>
          <div class="scenario">
            <div class="who">📩 DIRECT MESSAGE · @ZcashSupport_Help ✓</div>
            <div class="bubble">Hi! We detected a sync error on your wallet 😟 To avoid losing funds, please verify your 24-word phrase at <u>zcash-wallet-verify.app</u> within 30 minutes.</div>
            <div class="answer-list" id="phish">
              <button class="answer" data-a="0">Paste my words there — better safe than sorry.</button>
              <button class="answer" data-a="1">Reply with just the first 12 words, to be careful.</button>
              <button class="answer" data-a="2">Ignore & block. Nobody legitimate ever asks for a seed phrase.</button>
            </div>
            <div class="feedback" id="phish-fb"></div>
          </div>
        </div>

        ${real("WALLET SETUP", `<ol>
          <li>Download <b>only</b> from the official app store listing or the project's official site (linked in Graduation). Fake wallet apps exist.</li>
          <li>Tap <b>Create new wallet</b>. Set a PIN / biometrics.</li>
          <li>Write the <b>24 words + birthday height</b> on paper. Do the verification step.</li>
          <li>Let it <b>sync</b>. Shielded wallets scan the chain on your device — that's what keeps you private.</li>
          <li>Optional: pair a <b>Keystone</b> hardware wallet with Zodl for cold storage with shielded support.</li></ol>`)}
        ${nextBar("wallet", "CHOOSE · SAVE · VERIFY · SURVIVE THE PHISH")}
      </div>`,
      bind() {
        if (!S.wallet) setTargetPulse("#wallets");
        else if (!sub.wrote) setTargetPulse("#seed-cover");

        $("#wallets").addEventListener("click", (e) => {
          const c = e.target.closest("[data-w]"); if (!c) return;
          const firstTime = !S.wallet;
          S.wallet = c.dataset.w;
          playSfx("coin");
          if (firstTime) {
            const w = D.words; S.seed = Array.from({ length: 24 }, () => w[Math.floor(Math.random() * w.length)]);
            S.birthday = S.height; S.ua = genUA(); S.taddr = genT();
            toast("🔑 Wallet created. Now reveal and verify your 24 secret words.");
          }
          save(); render();
          setTimeout(() => {
            $("#step-seed")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setTargetPulse("#seed-cover");
          }, 50);
        });

        if (!S.wallet) return;
        const cover = $("#seed-cover"), grid = $("#seed-grid");
        const show = (e) => {
          e.preventDefault(); grid.classList.remove("blurred"); cover.style.opacity = 0;
          playSfx("shield");
          setTargetPulse("#wrote");
        };
        const hide = () => { grid.classList.add("blurred"); cover.style.opacity = 1; };
        cover.addEventListener("pointerdown", show);
        ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => cover.addEventListener(ev, hide));

        $("#wrote").addEventListener("change", (e) => {
          sub.wrote = e.target.checked; save();
          $("#step-verify").classList.toggle("hidden", !sub.wrote);
          if (sub.wrote) {
            playSfx("coin");
            buildVerify();
            $("#wallet-guidance").innerHTML = guidanceHUD(steps, 3, "Select the correct seed words matching the numbers asked.");
          }
        });
        if (sub.wrote) buildVerify();

        function buildVerify() {
          if (sub.verified) {
            $("#verify").innerHTML = `<p class="small">✓ Verified words #${(sub.qs || []).map((q) => q + 1).join(", #")}.</p>`;
            return;
          }
          const idx = []; while (idx.length < 3) { const n = Math.floor(Math.random() * 24); if (!idx.includes(n)) idx.push(n); }
          idx.sort((a, b) => a - b); sub.qs = idx;
          let right = 0;
          $("#verify").innerHTML = idx.map((n) => {
            const opts = [S.seed[n]]; while (opts.length < 4) { const w = D.words[Math.floor(Math.random() * D.words.length)]; if (!opts.includes(w) && !S.seed.includes(w)) opts.push(w); }
            opts.sort(() => Math.random() - .5);
            return `<div class="verify-q"><div class="q">WORD #${n + 1}</div><div class="opts">${opts.map((o) => `<button class="opt" data-n="${n}" data-w="${o}">${o}</button>`).join("")}</div></div>`;
          }).join("");
          $$("#verify .opt").forEach((b) => b.addEventListener("click", () => {
            const q = b.closest(".verify-q"); if (q.dataset.ok) return;
            const siblings = $$(".opt", q);
            if (S.seed[+b.dataset.n] === b.dataset.w) {
              siblings.forEach((s) => s.classList.remove("wrong"));
              b.classList.add("right");
              b.textContent = "✓ " + b.dataset.w;
              q.dataset.ok = "1";
              right++;
              siblings.forEach((s) => {
                if (s !== b) {
                  s.style.opacity = "0.35";
                  s.style.pointerEvents = "none";
                }
              });
              playSfx("coin");
              if (right === 3) {
                sub.verified = true; save();
                toast("✓ Seed verified! One final security check below!");
                $("#step-phish").classList.remove("hidden");
                $("#wallet-guidance").innerHTML = guidanceHUD(steps, 4, "A fake support account messaged you. What do you do?");
                $("#step-phish").scrollIntoView({ behavior: "smooth", block: "start" });
                setTargetPulse("#phish");
              }
            } else {
              playSfx("hit");
              b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
              toast(`⚠️ That's not word #${+b.dataset.n + 1}. Check your seed list!`);
              setTimeout(() => {
                b.classList.remove("wrong");
              }, 650);
            }
          }));
        }

        $("#phish")?.addEventListener("click", (e) => {
          const b = e.target.closest(".answer"); if (!b) return;
          const a = +b.dataset.a, fb = $("#phish-fb");
          $$("#phish .answer").forEach((x) => x.classList.remove("right", "wrong"));
          fb.classList.add("show");
          if (a === 2) {
            b.classList.add("right");
            playSfx("shield");
            fb.innerHTML = "<b>Correct.</b> Wallet support, exchanges, developers, “admins” — <b>no one</b> needs your seed phrase. Anyone asking is stealing. Verified badges can be bought; urgency is the tell.";
            $("#wallet-guidance").innerHTML = guidanceHUD(steps, 5, "Mission complete! Click 'Next chapter →' to continue.");
            complete("wallet", "🛡 Wallet secured. You're already ahead of most people.");
          } else {
            b.classList.add("wrong");
            playSfx("hit");
            fb.innerHTML = a === 0 ? "<b>Funds gone.</b> That site is a drainer. Your wallet would be emptied within seconds, irreversibly." : "<b>Still gone.</b> Half a seed makes the rest brute-forceable, and you've shown you'll comply. Never share any part.";
          }
        });
      }
    };
  };

  /* 03 — ADDRESSES */
  CH.address = () => {
    const sub = S.sub.address || (S.sub.address = {});
    const items = sub.items || (sub.items = [
      { a: "u1" + rnd(60, B32), ans: "S" }, { a: genT(), ans: "P" }, { a: genZs(), ans: "S" }, { a: "t3" + rnd(33, B58), ans: "P" }
    ].sort(() => Math.random() - .5));
    const allDone = items.every((x) => x.got);
    const steps = [
      "Test copying Unified (u1) and Transparent (t1) addresses",
      "Correctly classify all 4 addresses (u1/zs1 = Shielded, t1/t3 = Public)"
    ];

    return {
      html: `<div class="chapter">
        ${kicker("03", "YOUR ADDRESSES")}
        <h2>One wallet,<br/>two faces.</h2>
        <p class="lead">Your wallet can receive in two ways. Know which is which and you'll never leak by accident.</p>

        <div id="addr-guidance">${guidanceHUD(steps, allDone ? 2 : 1, "Look at the first letters: u1 and zs1 are shielded; t1 and t3 are public.")}</div>

        <div class="grid-2">
          <div class="panel"><div class="win-title gold"><span>🛡 UNIFIED ADDRESS</span><span class="win-sub">SHARE THIS ONE</span></div><div class="panel-body">
            <div class="addr-box"><span class="pfx">u1</span>${S.ua.slice(2)}</div>
            <p class="small mt">Starts with <b>u1</b>. Bundles receivers for the shielded pools (Orchard / Sapling), and the sender's wallet picks the most private one it supports. This is your default.</p>
            <div class="actions" style="margin-top:10px"><button class="copy" data-copy="ua">COPY</button></div>
          </div></div>
          <div class="panel"><div class="win-title"><span>◌ TRANSPARENT ADDRESS</span><span class="win-sub">PUBLIC</span></div><div class="panel-body">
            <div class="addr-box t"><span class="pfx">t1</span>${S.taddr.slice(2)}</div>
            <p class="small mt">Starts with <b>t1</b> (or t3). Works like Bitcoin: every amount and every link is public. Exists for compatibility, mostly with exchanges.</p>
            <div class="actions" style="margin-top:10px"><button class="copy" data-copy="t">COPY</button></div>
          </div></div>
        </div>
        <div class="callout tip">Many shielded wallets can show you a <b>fresh address every time</b>. They look different, but all lead to the same wallet — so the people who pay you can't link you to each other.</div>
        <h3 class="mt">Quick check · Shielded or public?</h3>
        <div class="classify" id="classify">
          ${items.map((it, i) => `<div class="classify-row" data-i="${i}"><code>${short(it.a, 18)}</code><div class="opts">
            <button class="opt ${it.got && it.ans === "S" ? "right" : ""}" data-v="S">🛡 SHIELDED</button><button class="opt ${it.got && it.ans === "P" ? "right" : ""}" data-v="P">◌ PUBLIC</button></div></div>`).join("")}
        </div>
        <p class="small mt">Hint: <b>u1…</b> unified · <b>zs1…</b> Sapling (older shielded) · <b>t1… / t3…</b> transparent.</p>
        ${real("ADDRESSES", `<ol><li>Open your wallet → <b>Receive</b>. The default is your shielded/unified address.</li>
          <li>Most wallets also have a <b>transparent</b> tab — only use it when a service can't send to u1.</li>
          <li>Always <b>copy-paste or scan QR</b>. Check the first and last characters after pasting (clipboard malware exists).</li></ol>`)}
        ${nextBar("address", "CLASSIFY ALL FOUR ADDRESSES")}
      </div>`,
      bind() {
        if (!allDone) setTargetPulse("#classify");
        $$(".copy").forEach((b) => b.addEventListener("click", () => {
          const v = b.dataset.copy === "ua" ? S.ua : S.taddr;
          navigator.clipboard?.writeText(v).catch(() => {});
          playSfx("coin");
          toast("Copied (simulated address — don't send real ZEC here!)");
        }));
        $("#classify").addEventListener("click", (e) => {
          const b = e.target.closest(".opt"); if (!b) return;
          const rowEl = b.closest(".classify-row"), it = items[+rowEl.dataset.i];
          if (it.got) return;
          const siblings = $$(".opt", rowEl);
          if (b.dataset.v === it.ans) {
            siblings.forEach((s) => s.classList.remove("wrong"));
            b.classList.add("right");
            b.textContent = (it.ans === "S" ? "✓ SHIELDED" : "✓ PUBLIC");
            it.got = true;
            save();
            playSfx("coin");
            siblings.forEach((s) => {
              if (s !== b) {
                s.style.opacity = "0.35";
                s.style.pointerEvents = "none";
              }
            });
          } else {
            playSfx("hit");
            b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
            toast(it.ans === "S" ? "⚠️ Starts with u1 or zs1 — that is SHIELDED." : "⚠️ Starts with t1 or t3 — that is TRANSPARENT (PUBLIC).");
            setTimeout(() => {
              b.classList.remove("wrong");
            }, 650);
          }
          if (items.every((x) => x.got)) {
            playSfx("shield");
            $("#addr-guidance").innerHTML = guidanceHUD(steps, 2, "Address classification mastered! Click 'Next chapter →'");
            complete("address", "✓ You can read addresses like a pro.");
          }
        });
      }
    };
  };

  /* 04 — GET ZEC */
  CH.get = () => {
    const sub = S.sub.get || (S.sub.get = { ex: 0 });
    const steps = [
      "Click 'Buy 1 ZEC' on the simulated exchange",
      "Try pasting 'u1...' (see error), then paste 't1...'",
      "Click 'Withdraw' and wait for confirmations"
    ];
    let curStep = 0;
    if (sub.bought) curStep = 1;
    if (sub.withdrawn) curStep = 3;

    return {
      html: `<div class="chapter">
        ${kicker("04", "GETTING ZEC")}
        <h2>Fill the<br/>tank.</h2>
        <p class="lead">There are three common ways in. All of them end the same way: ZEC arrives in your wallet — then you <b>shield it</b>.</p>

        <div id="get-guidance">${guidanceHUD(steps, curStep, "Start by buying 1 ZEC on the SimEx exchange below.")}</div>

        <div class="route-cards">
          <div class="route"><div class="ico">🏦</div><h3>Exchange</h3><p>Buy with card or bank on an exchange that lists ZEC, then <b>withdraw to your own wallet</b>. Many exchanges only withdraw to <b>t-addresses</b>; check whether yours supports unified/shielded.</p></div>
          <div class="route"><div class="ico">🔁</div><h3>In-wallet swap</h3><p>Some wallets (e.g. Zodl, Edge) let you <b>swap other crypto into ZEC</b> straight from the app. Check where the ZEC lands, and shield it if it lands transparent.</p></div>
          <div class="route"><div class="ico">🤝</div><h3>From a person</h3><p>Get paid in ZEC for work, or buy from a friend. Give them your <b>u1 address</b>, and it arrives already shielded.</p></div>
        </div>
        <div class="rule"></div>
        <h3>Simulation · Buy on an exchange & withdraw</h3>
        <div class="sim-app" id="simex">
          <div class="bar"><span>SIMEX · Exchange (fictional)</span><span>ACCOUNT VERIFIED · KYC ✓</span></div>
          <div class="body">
            <div class="grid-2">
              <div>
                <div class="label">EXCHANGE BALANCE</div>
                <div class="price-tag" id="ex-bal">${fmt(sub.ex)} ZEC</div>
                <div class="actions" style="margin-top:8px"><button class="btn sm" id="buy-btn" ${sub.bought ? "disabled" : ""}>Buy 1 ZEC</button></div>
              </div>
              <div>
                <div class="label">WITHDRAW TO</div>
                <div class="opts" style="margin:6px 0 10px">
                  <button class="opt" id="paste-ua" ${!sub.bought || sub.withdrawn ? "disabled" : ""}>Paste my u1… address</button>
                  <button class="opt" id="paste-t" ${!sub.bought || sub.withdrawn ? "disabled" : ""}>Paste my t1… address</button>
                </div>
                <input type="text" id="wd-addr" readonly placeholder="destination address" value="${sub.withdrawn ? esc(S.taddr) : ""}" />
                <div class="err" id="wd-err"></div>
                <p class="small" style="margin-top:6px">Withdrawal fee: 0.0010 ZEC</p>
                <div class="actions" style="margin-top:8px"><button class="btn gold sm" id="wd-btn" disabled>Withdraw</button></div>
              </div>
            </div>
            <div id="confirm-box" class="${sub.withdrawn ? "" : "hidden"}">
              <div class="confirm-meter" id="meter">${Array.from({ length: 10 }, (_, i) => `<span class="${sub.withdrawn ? "on" : ""}"></span>`).join("")}</div>
              <div class="meter-label" id="meter-label">${sub.withdrawn ? "10/10 CONFIRMATIONS · ARRIVED" : ""}</div>
            </div>
          </div>
        </div>
        <div class="callout eye ${sub.withdrawn ? "" : "hidden"}" id="get-eye"><b>Look right, at the world view.</b> Your withdrawal is a <b>fully public</b> transaction: the exchange's hot wallet → your t1 address, amount included. The exchange also knows your real identity. Right now, anyone could watch where those coins go next.<br/><br/>So the next move is obvious: <b>shield them.</b></div>
        ${real("GETTING ZEC", `<ol><li><b>Exchange:</b> buy ZEC → Withdraw → paste your wallet's address. If it rejects u1, use your wallet's <b>transparent</b> receive address, then shield (next chapter).</li>
          <li><b>Swap:</b> in Zodl/Edge, look for Swap / Buy. Confirm the destination and shield if needed.</li>
          <li><b>Test first:</b> send a small amount before a big one.</li>
          <li>Wait for confirmations (~75 seconds per block). Your wallet will show the balance once synced.</li></ol>`)}
        ${nextBar("get", "BUY 1 ZEC AND WITHDRAW IT TO YOUR WALLET")}
      </div>`,
      bind() {
        let chosen = null;
        if (!sub.bought) setTargetPulse("#buy-btn");
        else if (!sub.withdrawn) setTargetPulse("#paste-t");

        $("#buy-btn").addEventListener("click", () => {
          sub.ex = 1; sub.bought = true; save();
          playSfx("coin");
          $("#ex-bal").textContent = fmt(1) + " ZEC"; $("#buy-btn").disabled = true;
          $("#paste-ua").disabled = false; $("#paste-t").disabled = false;
          $("#get-guidance").innerHTML = guidanceHUD(steps, 1, "Try 'Paste my u1…' to see exchange constraints, then paste t1…");
          setTargetPulse("#paste-ua");
          toast("Bought 1 ZEC on SimEx. It's sitting on the exchange — not yours until you withdraw.");
        });
        $("#paste-ua").addEventListener("click", () => {
          $("#wd-addr").value = S.ua; chosen = "ua";
          playSfx("hit");
          $("#wd-err").textContent = "✕ SimEx only supports transparent (t1) withdrawals. (Real exchanges vary — some do accept unified addresses. Always prefer shielded if offered!)";
          $("#wd-btn").disabled = true;
          setTargetPulse("#paste-t");
        });
        $("#paste-t").addEventListener("click", () => {
          $("#wd-addr").value = S.taddr; chosen = "t"; $("#wd-err").textContent = "";
          playSfx("coin");
          $("#wd-btn").disabled = false;
          setTargetPulse("#wd-btn");
          $("#get-guidance").innerHTML = guidanceHUD(steps, 2, "Now click 'Withdraw' to initiate the transaction.");
        });
        $("#wd-btn").addEventListener("click", async () => {
          if (chosen !== "t" || sub.withdrawn) return;
          $("#wd-btn").disabled = true; $("#paste-ua").disabled = true; $("#paste-t").disabled = true;
          sub.ex = 0; $("#ex-bal").textContent = fmt(0) + " ZEC";
          const amt = 0.999;
          addTx({ kind: "public", from: "t1SimExHotWa11et" + rnd(17, B58), to: S.taddr, amt, mine: true, note: "exchange → user" });
          $("#confirm-box").classList.remove("hidden");
          const spans = $$("#meter span");
          for (let i = 0; i < 10; i++) {
            await sleep(240);
            spans[i].classList.add("on");
            playSfx("jump");
            $("#meter-label").textContent = `${i + 1}/10 CONFIRMATIONS`;
          }
          playSfx("coin");
          $("#meter-label").textContent = "10/10 CONFIRMATIONS · ARRIVED";
          S.t += amt; addActivity({ icon: "◌", label: "From SimEx (transparent)", amt, dir: "in" });
          sub.withdrawn = true; save(); renderRail();
          $("#get-eye").classList.remove("hidden");
          $("#get-guidance").innerHTML = guidanceHUD(steps, 3, "Funds arrived transparently! Proceed to Shielding.");
          complete("get", "💰 0.999 ZEC arrived — transparently. Look at the world view.");
        });
      }
    };
  };

  /* 05 — SHIELD */
  function drawNoise(cv) {
    if (!cv) return;
    try {
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const w = (cv.width = cv.clientWidth || 260);
      const h = (cv.height = cv.clientHeight || 180);
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = (v * 0.82) | 0;
        d[i + 2] = 0;
        d[i + 3] = (Math.random() * 130 + 30) | 0;
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) {
      /* ignore canvas noise errors */
    }
  }

  CH.shield = () => {
    const sub = S.sub.shield || (S.sub.shield = {});
    // Fallback: If user arrived with 0 balance (e.g. jumped chapter or restarted), ensure 0.999 ZEC
    if (!sub.done && S.t <= FEE) {
      S.t = 0.999;
      save();
      renderRail();
    }

    const steps = [
      "Click the gold '🛡 Shield 0.999 ZEC' button",
      "Observe the public chain on the right — your balance is now dark!"
    ];
    return {
      html: `<div class="chapter">
        ${kicker("05", "SHIELDING")}
        <h2>Step into<br/>the dark.</h2>
        <p class="lead"><b>Shielding</b> moves ZEC from your transparent address into the <b>shielded pool</b>, where balances and payments are encrypted. It's one tap, and it's the most important habit in Zcash.</p>

        <div id="shield-guidance">${guidanceHUD(steps, sub.done ? 2 : 0, "Click the button below to turn transparent coins into shielded notes.")}</div>

        <div class="vault-scene" id="vault">
          <div class="zone left"><span class="zt">PUBLIC</span><span>t1 · VISIBLE TO ALL</span></div>
          <div class="wall"></div>
          <canvas class="noise-field ${sub.done ? "on" : ""}" id="noise"></canvas>
          <div class="zone right"><span class="zt">SHIELDED</span><span>ENCRYPTED · ZK-PROVEN</span></div>
          <div class="coin ${sub.done ? "go dark" : ""}" id="coin">Z</div>
        </div>
        <div class="actions">
          <button class="btn xl gold" id="shield-btn" ${sub.done || S.t <= FEE ? "disabled" : ""}>${sub.done ? "✓ Already Shielded" : `🛡 Shield ${fmt(Math.max(0, S.t))} ZEC`}</button>
          <span class="small">Network fee ≈ ${FEE} ZEC</span>
        </div>
        <div class="callout eye ${sub.done ? "" : "hidden"}" id="shield-eye"><b>Look at the world view.</b> The shielding transaction <b>is visible</b>: observers see your t1 address put ${fmt(0.999)} ZEC into the pool. That's the one moment of exposure. From here on, what you do with it — <b>who you pay, how much, when</b> — is encrypted.</div>
        <div class="grid-2 mt">
          <div class="callout tip" style="margin:0"><b>Shield everything, promptly.</b> Shielded-by-default wallets often prompt you automatically whenever transparent funds arrive.</div>
          <div class="callout key" style="margin:0"><b>Why it works:</b> your wallet produces a zk-SNARK proving “these coins exist, are mine, and aren't double-spent” — without revealing which coins.</div>
        </div>
        ${real("SHIELDING", `<ol><li>When transparent ZEC arrives, your wallet will show a <b>Shield</b> button or banner (Zodl: “Shield funds”, Zingo/YWallet: shield / “autoshield” options).</li>
          <li>Tap it, confirm the small fee, wait for a confirmation.</li>
          <li>Your <b>shielded</b> balance goes up and transparent goes to zero. Done.</li>
          <li>Tip: shield in one go rather than in many tiny pieces.</li></ol>`)}
        ${nextBar("shield", "SHIELD YOUR TRANSPARENT ZEC")}
      </div>`,
      bind() {
        const cv = $("#noise");
        if (cv) drawNoise(cv);
        if (!sub.done) setTargetPulse("#shield-btn");

        const btn = $("#shield-btn");
        if (btn) {
          btn.addEventListener("click", async () => {
            if (sub.done || S.t <= FEE) return;
            btn.disabled = true;
            playSfx("shield");
            const amt = S.t, net = +(amt - FEE).toFixed(8);
            const coin = $("#coin");
            if (coin) coin.classList.add("go");
            await sleep(900);
            if (coin) coin.classList.add("dark");
            if (cv) {
              cv.classList.add("on");
              drawNoise(cv);
            }
            await sleep(700);
            addTx({ kind: "shield", from: S.taddr, amt, mine: true });
            S.t = 0;
            S.s += net;
            S.shieldedTotal += net;
            addActivity({ icon: "🛡", label: "Shielded", amt: net, dir: "in" });
            sub.done = true;
            save();
            renderRail();
            const eye = $("#shield-eye");
            if (eye) eye.classList.remove("hidden");
            const hud = $("#shield-guidance");
            if (hud) hud.innerHTML = guidanceHUD(steps, 2, "Shielding successful! Advance to Send & Receive.");
            complete("shield", "🛡 You're shielded. Your balance just disappeared from public view.");
          });
        }
      }
    };
  };

  /* 06 — SEND & RECEIVE */
  CH.send = () => {
    const sub = S.sub.send || (S.sub.send = { to: "cafe" });
    const contacts = D.contacts.filter((c) => c.id !== "ada");
    const steps = [
      "Click 'Send my address to Ada' to receive shielded ZEC + memo",
      "Select a recipient, enter amount & encrypted memo, click 'Review'",
      "Hold down 'Hold to send 🛡' to sign and broadcast"
    ];
    let curStep = 0;
    if (sub.received) curStep = 1;
    if (sub.sent) curStep = 3;

    return {
      html: `<div class="chapter">
        ${kicker("06", "SEND & RECEIVE")}
        <h2>Private money,<br/>moving.</h2>
        <p class="lead">Shielded-to-shielded is Zcash at full strength: sender, receiver, amount <b>and</b> memo are all encrypted. First, receive. Then send.</p>

        <div id="send-guidance">${guidanceHUD(steps, curStep, "Start Part A by receiving a shielded payment from Ada.")}</div>

        <h3>Part A · Receive</h3>
        <div class="panel"><div class="panel-body">
          <div class="qr-wrap">
            <canvas class="qr" id="qr"></canvas>
            <div style="flex:1;min-width:240px">
              <p>To get paid, show your <b>QR code</b> or share your <b>u1 address</b>. Your friend Ada wants to send you a welcome gift.</p>
              <div class="addr-box mt" style="font-size:11px"><span class="pfx">u1</span>${S.ua.slice(2, 60)}…</div>
              <div class="actions"><button class="btn sm" id="recv-btn" ${sub.received ? "disabled" : ""}>${sub.received ? "✓ Received from Ada" : "Send my address to Ada →"}</button></div>
              <p class="small mt">QR shown is illustrative and not scannable.</p>
            </div>
          </div>
        </div></div>

        <div id="send-part" class="${sub.received ? "" : "hidden"}">
          <h3>Part B · Send a shielded payment</h3>
          <div class="grid-2">
            <div class="panel" style="margin:0"><div class="win-title"><span>▶ SEND</span><span class="win-sub">FROM SHIELDED</span></div><div class="panel-body">
              <div class="field"><label>TO</label><div style="display:flex;flex-direction:column;gap:8px" id="contacts">
                ${contacts.map((c) => `<button class="contact ${sub.to === c.id ? "selected" : ""}" data-c="${c.id}"><canvas data-av="${c.seed}"></canvas><span><span class="cn">${c.name}</span><br/><span class="ca">${c.role}</span></span></button>`).join("")}
              </div></div>
              <div class="field"><label for="amt">AMOUNT (ZEC)</label><input type="number" id="amt" min="0.001" step="0.01" value="0.05" /></div>
              <div class="field"><label for="memo">ENCRYPTED MEMO · ONLY THE RECIPIENT CAN READ</label><textarea id="memo" maxlength="200" placeholder="One flat white, please ☕">One flat white, please ☕</textarea></div>
              <button class="btn sm" id="review-btn" ${sub.sent ? "disabled" : ""}>Review →</button>
            </div></div>
            <div class="panel" style="margin:0"><div class="win-title gold"><span>◆ REVIEW</span><span class="win-sub">CHECK BEFORE SIGNING</span></div><div class="panel-body">
              <div id="review-box" class="review"><p class="small">${sub.sent ? "✓ Sent. Check the world view — find your transaction." : "Fill in the form and press Review."}</p></div>
              <div class="actions"><button class="btn gold" id="send-btn" disabled>Hold to send 🛡</button></div>
              <div class="err" id="send-err"></div>
            </div></div>
          </div>
        </div>
        <div class="callout eye ${sub.sent ? "" : "hidden"}" id="send-eye"><b>Now try to trace it.</b> Click any <b>SHIELDED z → z</b> transaction in the world view. Yours is among them — and among everyone else's. Every new shielded user makes everyone's crowd bigger. <i>That's your anonymity set.</i></div>
        ${real("SEND & RECEIVE", `<ol><li><b>Receive:</b> Receive tab → share the QR / u1 address. Ask the sender to use a shielded wallet for a fully private payment.</li>
          <li><b>Send:</b> Send → scan or paste the address → amount → optional memo → review → confirm.</li>
          <li>Check the <b>first & last characters</b> of the address. Transactions can't be reversed.</li>
          <li>Memos are only available when sending to a <b>shielded</b> address.</li>
          <li>Fresh shielded funds may need a few confirmations before they're spendable.</li></ol>`)}
        ${nextBar("send", "RECEIVE FROM ADA, THEN SEND A SHIELDED PAYMENT")}
      </div>`,
      bind() {
        ZAvatar.drawPseudoQR($("#qr"), S.ua);
        $$("canvas[data-av]").forEach((c) => ZAvatar.draw(c, c.dataset.av, 3));
        if (!sub.received) setTargetPulse("#recv-btn");
        else if (!sub.sent) setTargetPulse("#review-btn");

        $("#recv-btn").addEventListener("click", async () => {
          if (sub.received) return;
          const b = $("#recv-btn"); b.disabled = true; b.textContent = "Ada is sending…";
          await sleep(1200);
          const amt = 0.25;
          playSfx("coin");
          addTx({ kind: "shielded", amt, mine: true });
          S.s += amt; addActivity({ icon: "⬇", label: "From Ada (shielded)", amt, dir: "in", memo: "welcome to the pool 🛡 — ada" });
          sub.received = true; save(); renderRail();
          b.textContent = "✓ Received from Ada";
          toast("⬇ +0.25 ZEC from Ada — with an encrypted memo only you can read!");
          $("#send-part").classList.remove("hidden");
          $("#send-guidance").innerHTML = guidanceHUD(steps, 1, "Now prepare a shielded transfer to Café Nym and tap 'Review →'");
          $("#send-part").scrollIntoView({ behavior: "smooth", block: "start" });
          setTargetPulse("#review-btn");
        });

        $("#contacts")?.addEventListener("click", (e) => {
          const c = e.target.closest("[data-c]"); if (!c) return;
          sub.to = c.dataset.c; save();
          playSfx("jump");
          $$("#contacts .contact").forEach((x) => x.classList.toggle("selected", x === c));
        });

        let pending = null;
        $("#review-btn")?.addEventListener("click", () => {
          const amt = parseFloat($("#amt").value), memo = $("#memo").value.trim();
          const err = $("#send-err"); err.textContent = "";
          if (!(amt > 0)) { err.textContent = "Enter an amount above zero."; return; }
          if (amt + FEE > S.s + 1e-9) { err.textContent = `Not enough shielded funds. Max ≈ ${fmt(S.s - FEE)} ZEC.`; return; }
          const c = D.contacts.find((x) => x.id === sub.to);
          const addr = "u1" + rnd(60, B32);
          pending = { amt, memo, c, addr };
          playSfx("jump");
          $("#review-box").innerHTML = `
            <div class="row"><span>TO</span><b>${c.name} · ${short(addr, 12)}</b></div>
            <div class="row"><span>AMOUNT</span><b>${fmt(amt)} ZEC</b></div>
            <div class="row"><span>FEE</span><b>${FEE} ZEC</b></div>
            <div class="row"><span>MEMO</span><b>${memo ? "“" + esc(memo) + "”" : "—"}</b></div>
            <div class="row"><span>PRIVACY</span><b style="color:var(--green)">🛡 Fully shielded → shielded</b></div>`;
          $("#send-btn").disabled = false;
          setTargetPulse("#send-btn");
          $("#send-guidance").innerHTML = guidanceHUD(steps, 2, "Press and hold the 'Hold to send 🛡' button to sign and broadcast.");
        });

        const sb = $("#send-btn");
        if (sb) holdButton(sb, 1100, () => {
          if (!pending || sub.sent) return;
          playSfx("shield");
          sb.disabled = true; sb.textContent = "✓ Sent";
          addTx({ kind: "shielded", amt: pending.amt, mine: true });
          S.s = +(S.s - pending.amt - FEE).toFixed(8);
          addActivity({ icon: "⬆", label: "To " + pending.c.name + " (shielded)", amt: pending.amt + FEE, dir: "out", memo: pending.memo });
          sub.sent = true; save(); renderRail();
          $("#review-btn").disabled = true;
          $("#send-eye").classList.remove("hidden");
          $("#send-guidance").innerHTML = guidanceHUD(steps, 3, "Your first shielded transaction is on chain! Click 'Next chapter →'");
          complete("send", "🎉 Your first shielded transaction. The world saw… nothing useful.");
        });
      }
    };
  };

  /* 07 — UNSHIELD */
  CH.unshield = () => {
    const sub = S.sub.unshield || (S.sub.unshield = {});
    const steps = [
      "Choose the safest answer to avoid timing & amount correlation",
      "Press & hold 'Hold to unshield' to simulate a transparent payout"
    ];
    let curStep = sub.done ? 2 : sub.quiz ? 1 : 0;

    return {
      html: `<div class="chapter">
        ${kicker("07", "UNSHIELDING")}
        <h2>Stepping back<br/>into the light.</h2>
        <p class="lead">Sometimes you need to send to a <b>transparent</b> address — like an exchange deposit that doesn't accept shielded ZEC. That's <b>unshielding</b>. It's safe, but it's where careless habits leak.</p>

        <div id="unshield-guidance">${guidanceHUD(steps, curStep, "Learn how to break linkability when moving funds out of the pool.")}</div>

        <h3>The correlation trap</h3>
        <div class="timeline" id="tl">
          ${[10, 30, 50, 70, 90].map((p) => `<div class="tick" style="left:${p}%"></div>`).join("")}
          <div class="ev in" style="left:16%">IN · 1.2345 ZEC · 14:02</div>
          <div class="link" style="left:16%;width:20%"></div>
          <div class="ev out" style="left:36%">OUT · 1.2345 ZEC · 14:05</div>
        </div>
        <p>Encryption hides the path <i>inside</i> the pool. But if <b>1.2345 ZEC</b> goes in and <b>1.2345 ZEC</b> comes out three minutes later, an observer can just <b>match the edges</b>. Unique amounts and quick round-trips leak.</p>
        <div class="scenario">
          <div class="who">🧩 YOUR MOVE</div>
          <div class="bubble">You want to move some ZEC to SimEx, which only accepts transparent deposits. What's the most private approach?</div>
          <div class="answer-list" id="unq">
            <button class="answer" data-a="0">Unshield the exact amount I shielded, right away.</button>
            <button class="answer" data-a="1">Unshield a different, round amount, at a different time — and keep the rest shielded.</button>
            <button class="answer" data-a="2">First check if the destination accepts a shielded / unified address — then I don't need to unshield at all.</button>
          </div>
          <div class="feedback" id="unq-fb"></div>
        </div>
        <div id="un-do" class="${sub.quiz ? "" : "hidden"}">
          <div class="rule"></div>
          <h3>Simulation · Unshield to SimEx</h3>
          <div class="panel"><div class="panel-body">
            <div class="grid-2">
              <div class="field"><label>TO (SIMEX DEPOSIT · TRANSPARENT)</label><input type="text" readonly value="${esc(sub.dest || (sub.dest = genT()))}" /></div>
              <div class="field"><label for="un-amt">AMOUNT (ZEC)</label><input type="number" id="un-amt" step="0.1" value="0.5" /></div>
            </div>
            <div class="callout warn" style="margin-top:0">Your wallet warns you: <b>“This is a transparent address. The amount and recipient will be public.”</b> Good wallets always do.</div>
            <div class="actions" style="margin-top:0"><button class="btn" id="un-btn" ${sub.done ? "disabled" : ""}>${sub.done ? "✓ Unshielded" : "Hold to unshield"}</button><span class="err" id="un-err"></span></div>
          </div></div>
        </div>
        <div class="callout eye ${sub.done ? "" : "hidden"}" id="un-eye"><b>World view:</b> the destination and amount are public. The <b>source is not</b> — observers only see it came “from the shielded pool”. Your remaining balance, your history and Ada's payment stay private.</div>
        ${real("UNSHIELDING", `<ol><li>Prefer destinations that accept <b>shielded / unified</b> addresses. Ask services to support them!</li>
          <li>If you must send to a t-address: Send → paste the t1… address → your wallet will warn you → confirm.</li>
          <li>Avoid unique amounts and immediate round-trips (shield → unshield the same value).</li>
          <li>Never reuse a transparent address you care about.</li></ol>`)}
        ${nextBar("unshield", "PICK A STRATEGY, THEN UNSHIELD")}
      </div>`,
      bind() {
        if (!sub.quiz) setTargetPulse("#unq");
        else if (!sub.done) setTargetPulse("#un-btn");

        $("#unq").addEventListener("click", (e) => {
          const b = e.target.closest(".answer"); if (!b) return;
          const a = +b.dataset.a, fb = $("#unq-fb");
          $$("#unq .answer").forEach((x) => x.classList.remove("right", "wrong")); fb.classList.add("show");
          if (a === 0) {
            b.classList.add("wrong");
            playSfx("hit");
            fb.innerHTML = "<b>Linkable.</b> Same amount, minutes apart — that's the trap above. The pool can't protect a perfect match.";
            return;
          }
          b.classList.add("right");
          playSfx("coin");
          fb.innerHTML = a === 2 ? "<b>Best answer.</b> The most private unshield is the one you don't make. More and more services accept shielded ZEC." : "<b>Good.</b> Breaking amount and timing patterns makes correlation much harder. (Even better: check if the destination accepts shielded!)";
          sub.quiz = true; save();
          $("#un-do").classList.remove("hidden");
          $("#unshield-guidance").innerHTML = guidanceHUD(steps, 1, "Now hold the button to simulate the unshield transaction.");
          setTargetPulse("#un-btn");
        });

        const ub = $("#un-btn");
        if (ub && !sub.done) holdButton(ub, 1000, () => {
          const amt = parseFloat($("#un-amt").value), err = $("#un-err"); err.textContent = "";
          if (!(amt > 0) || amt + FEE > S.s + 1e-9) { err.textContent = `Enter 0 < amount ≤ ${fmt(S.s - FEE)}`; ub.style.background = ""; ub.style.color = ""; return; }
          playSfx("shield");
          addTx({ kind: "unshield", to: sub.dest, amt, mine: true });
          S.s = +(S.s - amt - FEE).toFixed(8);
          addActivity({ icon: "↗", label: "Unshielded to SimEx", amt: amt + FEE, dir: "out" });
          sub.done = true; save(); renderRail();
          ub.disabled = true; ub.textContent = "✓ Unshielded"; $("#un-eye").classList.remove("hidden");
          $("#unshield-guidance").innerHTML = guidanceHUD(steps, 2, "Unshielding completed safely! Proceed to Graduation.");
          complete("unshield", "↗ Unshielded — and you know exactly what leaked and what didn't.");
        });
      }
    };
  };

  /* 08 — GRADUATION */
  CH.grad = () => {
    if (!S.finished) { S.finished = Date.now(); save(); }
    const secs = Math.max(1, Math.round((S.finished - S.started) / 1000));
    const time = `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
    const items = [
      "Install a shielded wallet from its official source",
      "Write your 24 words + birthday height on paper",
      "Get a small amount of ZEC (exchange, swap or a friend)",
      "Shield any transparent balance",
      "Receive a shielded payment with a memo",
      "Send your first real shielded transaction",
      "Tell a friend — every new shielded user grows everyone's anonymity set"
    ];

    const steps = [
      "Download your Proof-of-Shielding Certificate",
      "Share your achievement on 𝕏 (@zksnarks_)",
      "Launch SHIELD RUNNER to play with your character!"
    ];

    return {
      html: `<div class="chapter">
        ${kicker("◆", "GRADUATION")}
        <h2>You are<br/><span style="background:var(--gold);padding:0 10px">shielded.</span></h2>
        <p class="lead">From zero to shielded in <b>${time}</b>. Here's your <b>shielded identity</b>: a 26×26 portrait generated from your handle, in your browser. It represents you without revealing you.</p>

        <div id="grad-guidance">${guidanceHUD(steps, 2, "You've unlocked the arcade game! Play with your custom character below.")}</div>

        <div class="grad">
          <div>
            <div class="avatar-frame"><canvas id="avatar"></canvas>
              <div class="id">${esc(S.handle || "anon").toUpperCase()} · #${String(S.height % 10000).padStart(4, "0")}</div>
              <div class="small" id="traits" style="margin-top:6px"></div>
            </div>
            <div class="actions"><button class="btn sm ghost" id="reroll">↻ Reroll</button><button class="btn sm" id="dl">⬇ Certificate</button></div>
          </div>
          <div>
            <div class="stats">
              <div class="stat"><div class="sv">${S.txCount}</div><div class="sl">TRANSACTIONS</div></div>
              <div class="stat"><div class="sv">${fmt(S.shieldedTotal)}</div><div class="sl">ZEC SHIELDED</div></div>
              <div class="stat"><div class="sv">0 B</div><div class="sl">LEAKED BY YOUR Z→Z TXS</div></div>
              <div class="stat"><div class="sv">${time}</div><div class="sl">ZERO → SHIELDED</div></div>
            </div>
            <div class="actions" style="margin-top:0">
              <a class="btn gold" id="share" target="_blank" rel="noopener">Share on 𝕏</a>
              <button class="btn ghost sm" id="restart">Play again</button>
            </div>
            <div style="margin-top:20px;padding:16px;border:2px solid var(--gold);background:var(--night);color:var(--paper);">
              <div style="font-family:var(--f-pixel);color:var(--gold);font-size:12px;margin-bottom:6px;">🎮 BONUS UNLOCKED // ARCADE MODE</div>
              <h3 style="color:#fff;font-size:24px;margin-bottom:6px;">SHIELD RUNNER</h3>
              <p style="font-size:13px;color:#d0c4b2;margin-bottom:14px;">Survive the Mempool! Take your newly generated 26×26 character into the surveillance grid. Dodge KYC drones, activate zero-knowledge shields, and collect ZEC!</p>
              <button class="btn xl gold" id="launch-game" style="width:100%;justify-content:center;">🎮 PLAY AS YOUR CHARACTER →</button>
            </div>
          </div>
        </div>
        <div class="rule"></div>
        <h2 style="font-size:clamp(40px,5vw,72px)">Now do it<br/>for real.</h2>
        <div class="grid-2">
          <div><h3>Your checklist</h3><ul class="checklist" id="checklist">${items.map((t, i) => `<li data-i="${i}" class="${S.checklist[i] ? "on" : ""}">${t}</li>`).join("")}</ul></div>
          <div><h3>Official links</h3>
            <div class="panel" style="margin:0"><div class="panel-body" style="font-size:14px;line-height:2">
              ◆ <a href="https://z.cash" target="_blank" rel="noopener">z.cash</a> — learn, ecosystem & wallets<br/>
              ◆ <a href="https://zingolabs.org" target="_blank" rel="noopener">Zingo!</a> · <a href="https://ywallet.app" target="_blank" rel="noopener">YWallet</a> · <a href="https://edge.app" target="_blank" rel="noopener">Edge</a> · <a href="https://cakewallet.com" target="_blank" rel="noopener">Cake Wallet</a><br/>
              ◆ Zodl (formerly Zashi) — search “Zodl” in your official app store<br/>
              ◆ <a href="https://keyst.one" target="_blank" rel="noopener">Keystone</a> — hardware wallet with shielded support<br/>
              ◆ <a href="https://forum.zcashcommunity.com" target="_blank" rel="noopener">Zcash Community Forum</a> — ask anything
            </div></div>
            <div class="callout warn">Never type your seed phrase into any website — including this one. We never ask, and never will.</div>
          </div>
        </div>
      </div>`,
      bind() {
        const draw = () => {
          const t = ZAvatar.draw($("#avatar"), (S.handle || "anon") + "::" + S.seed.join("").slice(0, 16) + "::" + S.reroll, 12);
          $("#traits").textContent = [t.head, t.eyes, t.mouth, t.extra].filter((x) => x !== "none").map((x) => x.toUpperCase()).join(" · ");
        };
        draw();
        setTargetPulse("#launch-game");

        $("#reroll").addEventListener("click", () => { S.reroll++; save(); draw(); playSfx("jump"); });
        $("#dl").addEventListener("click", () => { certificate(time); playSfx("coin"); });

        const text = `I just went from zero to my first shielded transaction in ${time} with ZERO→SHIELDED 🛡\n\nWallet setup, getting ZEC, shielding, send/receive, unshielding — all playable.\n\n@zksnarks_ #ZECATHON $ZEC`;
        $("#share").href = "https://x.com/intent/tweet?text=" + encodeURIComponent(text) + (location.protocol.startsWith("http") ? "&url=" + encodeURIComponent(location.origin + location.pathname) : "");

        $("#restart").addEventListener("click", showResetModal);
        $("#checklist").addEventListener("click", (e) => {
          const li = e.target.closest("li"); if (!li) return;
          const i = li.dataset.i; S.checklist[i] = !S.checklist[i]; li.classList.toggle("on"); save();
          playSfx("coin");
        });

        $("#launch-game").addEventListener("click", () => {
          playSfx("shield");
          quickJumpToArcade();
        });

        complete("grad");
      }
    };
  };

  /* 09 — SHIELD RUNNER ARCADE GAME */
  CH.game = () => {
    let animId = 0;
    const steps = [
      "Run through the Mempool with Arrow Keys / WASD / Touch Buttons",
      "Press [SPACE / SHIELD] to enter zk-SNARK stealth mode (dodges lasers)",
      "Collect $ZEC coins & fire Encrypted Memos [X] at drones"
    ];

    return {
      html: `<div class="chapter">
        ${kicker("09", "ARCADE SURVEILLANCE RUNNER")}
        <h2>Shield Runner.</h2>
        <p class="lead">Take your custom <b>26×26 shielded identity</b> into the Mempool! Surveillance searchlights and KYC drones roam the chain. When you are Transparent, you take damage. When you activate <b>zk-SNARK Mode</b>, you turn into an encrypted ghost and phase right through!</p>

        ${guidanceHUD(steps, 1, "Controls: Left/Right to move · Up/W to Jump · Space/Shield to toggle zk-SNARK · X to fire Encrypted Memo")}

        <div class="game-wrap">
          <div class="game-top-bar">
            <div class="game-stats">
              <div class="game-stat-item"><span>IDENTITY:</span> <b class="val" id="g-player-name">${esc((S.handle || "anon").toUpperCase())}</b></div>
              <div class="game-stat-item"><span>SCORE:</span> <b class="val" id="g-score">0.0000 ZEC</b></div>
              <div class="game-stat-item"><span>HEALTH:</span> <b class="val" id="g-hp">100%</b></div>
              <div class="game-stat-item">
                <span>SHIELD ENERGY:</span>
                <span class="shield-bar-outer"><span class="shield-bar-inner" id="g-shield-bar" style="width:100%"></span></span>
              </div>
              <div class="game-stat-item"><span>MEMOS:</span> <b class="val" id="g-memos">3</b></div>
              <div class="game-stat-item"><span>HIGH SCORE:</span> <b class="val" id="g-high">${(S.gameHighScore || 0).toFixed(4)} ZEC</b></div>
            </div>
            <div>
              <button class="menu-btn" id="g-restart-btn" style="border-color:var(--gold);color:var(--gold);">RESTART</button>
            </div>
          </div>

          <div class="canvas-holder">
            <canvas id="game-canvas" width="760" height="380"></canvas>
            <div class="game-overlay" id="g-overlay">
              <div class="overlay-box">
                <h2 id="g-over-title">READY RUNNER?</h2>
                <p id="g-over-desc">Dodge red surveillance beams and KYC drones. Toggle your zk-SNARK Shield to phase through unharmed! Collect ZEC to recharge your shield energy.</p>

                <!-- Game Over Score Summary Card (visible on game over) -->
                <div class="game-over-stats hidden" id="g-over-stats">
                  <div class="gos-item">
                    <span class="gos-label">FINAL SCORE</span>
                    <span class="gos-val gold" id="gos-score">0.0000 ZEC</span>
                  </div>
                  <div class="gos-sep"></div>
                  <div class="gos-item">
                    <span class="gos-label">DRONES NEUTRALIZED</span>
                    <span class="gos-val" id="gos-drones">0</span>
                  </div>
                  <div class="gos-sep"></div>
                  <div class="gos-item">
                    <span class="gos-label">PERSONAL BEST</span>
                    <span class="gos-val" id="gos-high">0.0000 ZEC</span>
                  </div>
                </div>

                <!-- Controls Help (hidden on game over) -->
                <div class="game-controls-help" id="g-controls-help">
                  <span><kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> MOVE</span>
                  <span><kbd>↑</kbd> / <kbd>W</kbd> DOUBLE JUMP (2X)</span>
                  <span><kbd>SPACE</kbd> / <kbd>S</kbd> zk-SNARK SHIELD</span>
                  <span><kbd>X</kbd> FIRE MEMO</span>
                </div>

                <!-- Action Buttons Container -->
                <div class="game-overlay-actions">
                  <button class="btn-game-claim hidden" id="g-claim-btn" title="Deposit your earned in-game ZEC directly into your Shielded Wallet balance!">
                    <span class="claim-icon">🛡️</span>
                    <span class="claim-text" id="g-claim-text">CLAIM 0.0000 ZEC TO SHIELDED WALLET</span>
                    <span class="claim-arrow">→</span>
                  </button>

                  <div class="game-secondary-actions">
                    <button class="btn gold lg" id="g-start-btn">START RUNNING 🛡</button>
                    <a class="btn-tweet-score hidden" id="g-tweet-btn" target="_blank" rel="noopener">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:5px"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>Tweet Score on 𝕏
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Touch Controls for Mobile -->
          <div class="touch-bar">
            <div class="touch-group">
              <button class="touch-btn" id="tb-left">◀ LEFT</button>
              <button class="touch-btn" id="tb-right">RIGHT ▶</button>
            </div>
            <div class="touch-group">
              <button class="touch-btn" id="tb-jump">▲ JUMP</button>
              <button class="touch-btn shield-btn" id="tb-shield">🛡️ SHIELD</button>
              <button class="touch-btn memo-btn" id="tb-memo">✉️ MEMO</button>
            </div>
          </div>
        </div>

        <div class="actions" style="margin-top:20px;">
          <button class="btn ghost sm" id="btn-back-grad">← Back to Certificate</button>
          <a class="btn gold sm" id="share-game" target="_blank" rel="noopener">Share Game on 𝕏</a>
        </div>
      </div>`,
      bind() {
        $("#btn-back-grad").addEventListener("click", () => {
          cancelAnimationFrame(animId);
          go(D.chapters.findIndex((c) => c.id === "grad"));
        });

        const shareUrl = "https://x.com/intent/tweet?text=" + encodeURIComponent("I just played ZERO→SHIELDED and unlocked SHIELD RUNNER! 🛡️⚡ Taking Zcash privacy somewhere unexpected.\n\n@zksnarks_ #ZECATHON $ZEC") + "&url=" + encodeURIComponent("https://zksnarksgame.vercel.app/");
        $("#share-game").href = shareUrl;

        // Initialize and Run the Canvas Game
        const canvas = $("#game-canvas");
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        // Prepare player custom pixel sprite
        const spriteData = ZAvatar.build ? ZAvatar.build((S.handle || "anon") + "::" + S.seed.join("").slice(0, 16) + "::" + S.reroll) : null;

        // Game State
        let running = false;
        let gameOver = false;
        let score = 0;
        let health = 100;
        let shieldEnergy = 100;
        let isShielded = false;
        let memos = 3;
        let dronesDestroyed = 0;
        let blocks = S.height;
        let claimedReward = false;
        let screenShake = 0;
        let boss = null;
        let bossSpawned = false;
        const floatingTexts = [];

        // Physics & Player
        const groundY = 310;
        const player = {
          x: 100, y: groundY - 52,
          w: 48, h: 52,
          vx: 0, vy: 0,
          speed: 4.8,
          jumping: false,
          jumpsRemaining: 2,
          facing: 1,
          bobTimer: 0,
          invulnerable: 0
        };

        const keys = { left: false, right: false, up: false, shield: false };
        const obstacles = []; // drones, searchlights
        const collectibles = []; // zec coins, memos, orchard leaves
        const projectiles = []; // flying memos
        const particles = [];

        // Stars & City Skyline
        const stars = Array.from({ length: 60 }, () => ({
          x: Math.random() * 760,
          y: Math.random() * 200,
          s: Math.random() > .7 ? 2 : 1,
          spd: Math.random() * 0.4 + 0.1
        }));

        function resetGame() {
          running = true;
          gameOver = false;
          score = 0;
          health = 100;
          shieldEnergy = 100;
          isShielded = false;
          memos = 3;
          dronesDestroyed = 0;
          claimedReward = false;
          screenShake = 0;
          boss = null;
          bossSpawned = false;
          floatingTexts.length = 0;
          player.x = 100;
          player.y = groundY - 52;
          player.vx = 0;
          player.vy = 0;
          player.jumping = false;
          player.jumpsRemaining = 2;
          obstacles.length = 0;
          collectibles.length = 0;
          projectiles.length = 0;
          particles.length = 0;
          $("#g-overlay").classList.add("hidden");
          $("#g-tweet-btn")?.classList.add("hidden");
          $("#g-controls-help")?.classList.remove("hidden");
          $("#g-over-stats")?.classList.add("hidden");
          const cb = $("#g-claim-btn");
          if (cb) {
            cb.classList.add("hidden");
            cb.style.opacity = "1";
            cb.style.pointerEvents = "auto";
          }
          updateHUD();
          playSfx("coin");
        }

        function updateHUD() {
          $("#g-score").textContent = fmt(score) + " ZEC";
          $("#g-hp").textContent = health + "%";
          $("#g-hp").style.color = health > 50 ? "var(--gold)" : "var(--red)";
          $("#g-shield-bar").style.width = Math.max(0, shieldEnergy) + "%";
          $("#g-memos").textContent = memos;
          $("#g-high").textContent = (S.gameHighScore || 0).toFixed(4) + " ZEC";
        }

        // Spawn Spawners
        let spawnTimer = 0;
        function spawnEntities() {
          spawnTimer++;
          if (spawnTimer % 95 === 0) {
            // Spawn Drone or Laser Searchlight
            const isLaser = Math.random() > 0.65;
            if (isLaser) {
              obstacles.push({
                type: "laser",
                x: 770, y: 0,
                w: 36, h: groundY,
                vx: -3.2,
                color: "rgba(231, 64, 42, 0.75)"
              });
            } else {
              obstacles.push({
                type: "drone",
                x: 770,
                y: groundY - 60 - Math.random() * 90,
                w: 42, h: 28,
                vx: -(3.8 + Math.random() * 2),
                sineOffset: Math.random() * Math.PI * 2
              });
            }
          }

          if (spawnTimer % 130 === 0) {
            // Spawn Collectibles
            const r = Math.random();
            if (r < 0.6) {
              // ZEC Coin
              collectibles.push({
                type: "coin",
                x: 770, y: groundY - 35 - Math.random() * 80,
                w: 24, h: 24,
                vx: -3.2
              });
            } else if (r < 0.85) {
              // Memo pack
              collectibles.push({
                type: "memo",
                x: 770, y: groundY - 40 - Math.random() * 70,
                w: 26, h: 20,
                vx: -3.2
              });
            } else {
              // Orchard powerup
              collectibles.push({
                type: "orchard",
                x: 770, y: groundY - 70,
                w: 24, h: 24,
                vx: -3.2
              });
            }
          }
        }

        function fireMemo() {
          if (memos <= 0 || !running || gameOver) return;
          memos--;
          playSfx("memo");
          projectiles.push({
            x: player.x + player.w,
            y: player.y + player.h / 2,
            w: 22, h: 14,
            vx: 8.5
          });
          updateHUD();
        }

        function toggleShield(forceVal) {
          if (!running || gameOver) return;
          const next = forceVal !== undefined ? forceVal : !isShielded;
          if (next && shieldEnergy > 5) {
            isShielded = true;
            playSfx("shield");
            $("#tb-shield").classList.add("active");
          } else {
            isShielded = false;
            $("#tb-shield").classList.remove("active");
          }
        }

        function doJump() {
          if (player.jumpsRemaining > 0 && running && !gameOver) {
            player.vy = player.jumpsRemaining === 2 ? -12.5 : -11.2;
            player.jumping = true;
            player.jumpsRemaining--;
            playSfx("jump");
            if (player.jumpsRemaining === 0) {
              // Mid-air double jump thrust
              for (let i = 0; i < 10; i++) {
                particles.push({
                  x: player.x + player.w / 2 + (Math.random() - .5) * 16,
                  y: player.y + player.h,
                  vx: (Math.random() - .5) * 5,
                  vy: 2 + Math.random() * 3,
                  life: 18,
                  color: "#00ff88",
                  text: "zk"
                });
              }
              floatingTexts.push({ text: "DOUBLE JUMP!", x: player.x - 10, y: player.y - 12, vy: -1.2, life: 28, color: "#00ff88" });
            }
          }
        }

        // Input listeners
        window.addEventListener("keydown", (e) => {
          if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
          if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
          if (e.code === "ArrowUp" || e.code === "KeyW") {
            doJump();
          }
          if (e.code === "Space" || e.code === "ArrowDown" || e.code === "KeyS") {
            e.preventDefault();
            toggleShield();
          }
          if (e.code === "KeyX" || e.code === "KeyE") {
            fireMemo();
          }
        });
        window.addEventListener("keyup", (e) => {
          if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
          if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
        });

        // Touch button listeners
        const bindTouch = (id, onDown, onUp) => {
          const el = $(id);
          if (!el) return;
          el.addEventListener("pointerdown", (e) => { e.preventDefault(); onDown(); });
          el.addEventListener("pointerup", (e) => { e.preventDefault(); if (onUp) onUp(); });
          el.addEventListener("pointercancel", (e) => { e.preventDefault(); if (onUp) onUp(); });
        };
        bindTouch("#tb-left", () => { keys.left = true; }, () => { keys.left = false; });
        bindTouch("#tb-right", () => { keys.right = true; }, () => { keys.right = false; });
        bindTouch("#tb-jump", () => doJump());
        bindTouch("#tb-shield", () => toggleShield());
        bindTouch("#tb-memo", () => fireMemo());

        $("#g-start-btn").addEventListener("click", () => resetGame());
        $("#g-restart-btn").addEventListener("click", () => resetGame());

        // Game Loop
        let lastTime = performance.now();
        function loop(now) {
          const dt = Math.min(40, now - lastTime) / 16.666;
          lastTime = now;

          if (running && !gameOver) {
            update(dt);
          }
          renderGame();
          animId = requestAnimationFrame(loop);
        }
        animId = requestAnimationFrame(loop);

        function update(dt) {
          // Player horizontal movement
          if (keys.left) { player.vx = -player.speed; player.facing = -1; }
          else if (keys.right) { player.vx = player.speed; player.facing = 1; }
          else { player.vx *= 0.8; }

          player.x += player.vx * dt;
          player.x = Math.max(10, Math.min(690, player.x));

          // Gravity & Jump
          player.vy += 0.65 * dt;
          player.y += player.vy * dt;
          if (player.y >= groundY - player.h) {
            player.y = groundY - player.h;
            player.vy = 0;
            player.jumping = false;
            player.jumpsRemaining = 2;
          }

          player.bobTimer += 0.2 * dt;
          if (player.invulnerable > 0) player.invulnerable -= dt;
          if (screenShake > 0) screenShake = Math.max(0, screenShake - 0.7 * dt);

          // Update Floating Texts
          for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
          }

          // Spawn Surveillance Overlord Boss at score >= 0.35
          if (score >= 0.35 && !bossSpawned) {
            bossSpawned = true;
            boss = {
              type: "boss",
              x: 770,
              y: groundY - 140,
              w: 88,
              h: 56,
              hp: 6,
              maxHp: 6,
              vx: -1.3,
              targetX: 580,
              hoverOffset: 0,
              shootTimer: 0
            };
            screenShake = 12;
            toast("🚨 SURVEILLANCE OVERLORD INCOMING! Neutralize it with Memos [X]!", 3000);
            floatingTexts.push({ text: "⚠️ BOSS OVERLORD APPROACHING!", x: 260, y: 130, vy: -0.4, life: 60, color: "#ff6b57" });
          }

          if (boss) {
            boss.hoverOffset += 0.05 * dt;
            boss.y = groundY - 140 + Math.sin(boss.hoverOffset) * 20;
            if (boss.x > boss.targetX) {
              boss.x += boss.vx * dt;
            } else {
              boss.x = boss.targetX + Math.sin(boss.hoverOffset * 0.7) * 22;
            }

            boss.shootTimer += dt;
            if (boss.shootTimer >= 110) {
              boss.shootTimer = 0;
              obstacles.push({
                type: "laser",
                x: 760,
                y: 0,
                w: 32,
                h: groundY,
                vx: -4.5,
                color: "rgba(255, 60, 40, 0.85)"
              });
              playSfx("hit");
              floatingTexts.push({ text: "RADAR SWEEP!", x: boss.x - 10, y: boss.y - 12, vy: -0.8, life: 25, color: "#ff8e7f" });
            }
          }

          // Shield energy management
          if (isShielded) {
            shieldEnergy -= 0.35 * dt;
            score += 0.0001 * dt; // Passive privacy staking
            if (shieldEnergy <= 0) {
              isShielded = false;
              playSfx("hit");
              toast("⚡ Shield energy depleted! Collect ZEC to recharge.");
              $("#tb-shield").classList.remove("active");
            }
            // Spawn shield particles
            if (Math.random() > 0.4) {
              particles.push({
                x: player.x + Math.random() * player.w,
                y: player.y + Math.random() * player.h,
                vx: -2 - Math.random() * 2,
                vy: (Math.random() - .5) * 2,
                life: 18,
                color: Math.random() > .5 ? "#f4b728" : "#fff",
                text: Math.random() > .5 ? "01" : "zk"
              });
            }
          }

          spawnEntities();

          // Update Projectiles (Memos)
          for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.x += p.vx * dt;
            if (p.x > 780) { projectiles.splice(i, 1); continue; }

            // Check hit against boss
            if (boss && checkCollision(p, boss)) {
              playSfx("hit");
              boss.hp--;
              screenShake = 8;
              floatingTexts.push({ text: `HIT! HP ${boss.hp}/${boss.maxHp}`, x: boss.x + 10, y: boss.y - 12, vy: -1.5, life: 25, color: "#00ff88" });
              for (let k = 0; k < 8; k++) {
                particles.push({
                  x: p.x,
                  y: p.y,
                  vx: (Math.random() - .5) * 6,
                  vy: (Math.random() - .5) * 6,
                  life: 20,
                  color: "#00ff88"
                });
              }
              projectiles.splice(i, 1);
              if (boss.hp <= 0) {
                score += 0.25;
                dronesDestroyed += 5;
                screenShake = 18;
                playSfx("coin");
                playSfx("shield");
                for (let k = 0; k < 30; k++) {
                  particles.push({
                    x: boss.x + Math.random() * boss.w,
                    y: boss.y + Math.random() * boss.h,
                    vx: (Math.random() - .5) * 12,
                    vy: (Math.random() - .5) * 12,
                    life: 40,
                    color: Math.random() > .5 ? "#00ff88" : "#f4b728"
                  });
                }
                floatingTexts.push({ text: "★ BOSS OVERLORD DESTROYED! +0.25 ZEC ★", x: 200, y: 150, vy: -0.5, life: 80, color: "#00ff88" });
                toast("🏆 VICTORY: Surveillance Overlord de-anonymized! +0.25 ZEC Bounty!");
                boss = null;
                updateHUD();
              }
              continue;
            }

            // Check hit against drones
            for (let j = obstacles.length - 1; j >= 0; j--) {
              const obs = obstacles[j];
              if (obs.type === "drone" && checkCollision(p, obs)) {
                playSfx("hit");
                // Explosion particles
                for (let k = 0; k < 12; k++) {
                  particles.push({
                    x: obs.x + obs.w / 2,
                    y: obs.y + obs.h / 2,
                    vx: (Math.random() - .5) * 8,
                    vy: (Math.random() - .5) * 8,
                    life: 25,
                    color: "#f4b728"
                  });
                }
                obstacles.splice(j, 1);
                projectiles.splice(i, 1);
                score += 0.05;
                dronesDestroyed++;
                screenShake = 6;
                floatingTexts.push({ text: "+0.05 ZEC", x: obs.x, y: obs.y - 10, vy: -1.2, life: 30, color: "#00ff88" });
                toast("💥 Drone decrypted & neutralized! +0.05 ZEC", 1200);
                updateHUD();
                break;
              }
            }
          }

          // Update Obstacles
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x += obs.vx * dt;
            if (obs.type === "drone") {
              obs.y += Math.sin(player.bobTimer + obs.sineOffset) * 0.8;
            }
            if (obs.x + obs.w < -50) {
              obstacles.splice(i, 1);
              continue;
            }

            // Collision with player
            if (checkCollision(player, obs)) {
              if (isShielded) {
                // Phased through unharmed!
                score += 0.01;
              } else if (player.invulnerable <= 0) {
                // Takes damage!
                health -= 25;
                player.invulnerable = 40;
                screenShake = 14;
                playSfx("hit");
                floatingTexts.push({ text: "-25% PRIVACY LEAK!", x: player.x, y: player.y - 14, vy: -1.5, life: 35, color: "#ff6b57" });
                toast("⚠️ SPOTTED BY SURVEILLANCE! Privacy leaked (-25%)", 1800);
                updateHUD();
                if (health <= 0) {
                  triggerGameOver();
                  return;
                }
              }
            }
          }

          // Update Collectibles
          for (let i = collectibles.length - 1; i >= 0; i--) {
            const col = collectibles[i];
            col.x += col.vx * dt;
            if (col.x + col.w < -50) { collectibles.splice(i, 1); continue; }

            if (checkCollision(player, col)) {
              if (col.type === "coin") {
                score += 0.1;
                shieldEnergy = Math.min(100, shieldEnergy + 30);
                playSfx("coin");
                floatingTexts.push({ text: "+0.10 ZEC", x: col.x, y: col.y - 10, vy: -1.4, life: 30, color: "#f4b728" });
              } else if (col.type === "memo") {
                memos += 2;
                score += 0.05;
                playSfx("coin");
                floatingTexts.push({ text: "+2 MEMOS!", x: col.x, y: col.y - 10, vy: -1.4, life: 30, color: "#5c7cb5" });
                toast("✉️ +2 Encrypted Memos acquired!");
              } else if (col.type === "orchard") {
                shieldEnergy = 100;
                isShielded = true;
                score += 0.25;
                playSfx("shield");
                floatingTexts.push({ text: "100% SHIELD / +0.25 ZEC", x: col.x, y: col.y - 10, vy: -1.4, life: 35, color: "#00ff88" });
                toast("🌿 ORCHARD PRIVACY LEAF! 100% Shield Recharged!");
              }
              collectibles.splice(i, 1);
              updateHUD();
            }
          }

          // Update Particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= dt;
            if (pt.life <= 0) particles.splice(i, 1);
          }

          // Ambient score increment
          score += 0.0002 * dt;
          updateHUD();
        }

        function checkCollision(r1, r2) {
          return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
          );
        }

        function triggerGameOver() {
          gameOver = true;
          running = false;
          screenShake = 12;
          playSfx("gameover");
          if (score > (S.gameHighScore || 0)) {
            S.gameHighScore = score;
            localStorage.setItem("zero_shielded_high_score", String(score));
          }
          $("#g-over-title").textContent = "DE-ANONYMIZED!";
          $("#g-over-desc").textContent = "Surveillance spotted your node! Claim your earned privacy reward to withdraw it into your shielded wallet.";
          $("#g-controls-help")?.classList.add("hidden");
          $("#g-over-stats")?.classList.remove("hidden");
          if ($("#gos-score")) $("#gos-score").textContent = fmt(score) + " ZEC";
          if ($("#gos-drones")) $("#gos-drones").textContent = dronesDestroyed;
          if ($("#gos-high")) $("#gos-high").textContent = fmt(S.gameHighScore) + " ZEC";
          $("#g-start-btn").textContent = "PLAY AGAIN ↻";
          $("#g-overlay").classList.remove("hidden");

          const claimBtn = $("#g-claim-btn");
          const claimText = $("#g-claim-text");
          if (claimBtn) {
            if (score > 0) {
              claimBtn.classList.remove("hidden");
              if (claimText) claimText.textContent = `CLAIM ${fmt(score)} ZEC TO SHIELDED WALLET`;
              claimBtn.style.opacity = "1";
              claimBtn.style.pointerEvents = "auto";
              claimBtn.onclick = () => {
                if (claimedReward) return;
                claimedReward = true;
                const claimAmt = Math.max(0.0001, Math.round(score * 1e4) / 1e4);
                S.s = (S.s || 0) + claimAmt;
                addActivity({
                  icon: "🎮",
                  label: "Shield Runner Bounty",
                  amt: claimAmt,
                  dir: "in",
                  memo: "Arcade bounty deposited into shielded balance"
                });
                addTx({
                  kind: "shielded",
                  amt: claimAmt,
                  mine: true,
                  note: "Game Bounty Claim"
                });
                playSfx("shield");
                playSfx("coin");
                toast(`🎉 REWARD CLAIMED: +${fmt(claimAmt)} ZEC deposited directly to your Shielded Wallet balance! Check left rail!`, 4000);
                if (claimText) claimText.textContent = `✓ CLAIMED +${fmt(claimAmt)} ZEC TO WALLET!`;
                claimBtn.style.opacity = "0.7";
                claimBtn.style.pointerEvents = "none";
              };
            } else {
              claimBtn.classList.add("hidden");
            }
          }

          const tweetBtn = $("#g-tweet-btn");
          if (tweetBtn) {
            const tweetText = `I survived the Mempool surveillance grid and scored ${fmt(score)} ZEC in SHIELD RUNNER playing as my custom 26×26 shielded identity! 🛡️⚡\n\n@zksnarks_ #ZECATHON $ZEC`;
            tweetBtn.href = "https://x.com/intent/tweet?text=" + encodeURIComponent(tweetText) + "&url=" + encodeURIComponent("https://zksnarksgame.vercel.app/");
            tweetBtn.classList.remove("hidden");
          }
        }

        function renderGame() {
          ctx.save();
          // Screen Shake translation
          if (screenShake > 0) {
            const sx = (Math.random() - .5) * screenShake * 1.5;
            const sy = (Math.random() - .5) * screenShake * 1.5;
            ctx.translate(sx, sy);
          }

          // Background clear
          ctx.fillStyle = "#0c0a08";
          ctx.fillRect(0, 0, 760, 380);

          // Stars
          ctx.fillStyle = "#8a7e6c";
          stars.forEach((st) => {
            st.x -= st.spd;
            if (st.x < 0) st.x = 760;
            ctx.fillRect(st.x, st.y, st.s, st.s);
          });

          // Neon Zcash Moon
          ctx.fillStyle = "rgba(244, 183, 40, 0.12)";
          ctx.beginPath();
          ctx.arc(640, 90, 52, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f4b728";
          ctx.font = "bold 32px 'Anton'";
          ctx.fillText("Z", 628, 102);

          // City Silhouettes with Neon signs
          ctx.fillStyle = "#181410";
          ctx.fillRect(40, 160, 60, 150);
          ctx.fillRect(160, 130, 80, 180);
          ctx.fillRect(320, 180, 50, 130);
          ctx.fillRect(440, 140, 90, 170);
          ctx.fillRect(590, 170, 70, 140);

          // Billboards
          ctx.font = "9px 'Silkscreen'";
          ctx.fillStyle = "#f4b728";
          ctx.fillText("zk-SNARK", 175, 150);
          ctx.fillStyle = "#4fa3ff";
          ctx.fillText("ORCHARD", 455, 160);

          // Ground & Cyber Grid
          ctx.fillStyle = "#141210";
          ctx.fillRect(0, groundY, 760, 70);
          ctx.strokeStyle = "#383125";
          ctx.lineWidth = 2;
          ctx.strokeRect(0, groundY, 760, 2);

          // Moving grid lines
          const gridOffset = (performance.now() * 0.15) % 40;
          ctx.strokeStyle = "rgba(244, 183, 40, 0.18)";
          for (let x = -gridOffset; x < 760; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x - 30, 380);
            ctx.stroke();
          }

          // Render Obstacles
          obstacles.forEach((obs) => {
            if (obs.type === "laser") {
              // Vertical red scanner beam
              const grad = ctx.createLinearGradient(obs.x, 0, obs.x + obs.w, 0);
              grad.addColorStop(0, "rgba(200, 64, 42, 0.1)");
              grad.addColorStop(0.5, "rgba(255, 70, 40, 0.85)");
              grad.addColorStop(1, "rgba(200, 64, 42, 0.1)");
              ctx.fillStyle = grad;
              ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

              // Scanner emitter at top
              ctx.fillStyle = "#c8402a";
              ctx.fillRect(obs.x - 4, 0, obs.w + 8, 12);
              ctx.font = "8px 'Silkscreen'";
              ctx.fillStyle = "#fff";
              ctx.fillText("SCAN", obs.x + 3, 9);
            } else if (obs.type === "drone") {
              // Flying Surveillance Drone
              ctx.fillStyle = "#1a1614";
              ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
              ctx.strokeStyle = "#c8402a";
              ctx.lineWidth = 2;
              ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

              // Red blinking camera eye
              ctx.fillStyle = (Math.floor(performance.now() / 150) % 2 === 0) ? "#ff3322" : "#880000";
              ctx.beginPath();
              ctx.arc(obs.x + 10, obs.y + obs.h / 2, 5, 0, Math.PI * 2);
              ctx.fill();

              // Drone propeller lines
              ctx.strokeStyle = "#8b8172";
              ctx.beginPath();
              ctx.moveTo(obs.x + 6, obs.y - 4);
              ctx.lineTo(obs.x + obs.w - 6, obs.y - 4);
              ctx.stroke();

              ctx.font = "8px 'Silkscreen'";
              ctx.fillStyle = "#f4b728";
              ctx.fillText("KYC", obs.x + 18, obs.y + 17);
            }
          });

          // Render Boss if present
          if (boss) {
            ctx.fillStyle = "#1e1014";
            ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
            ctx.strokeStyle = "#ff3322";
            ctx.lineWidth = 2;
            ctx.strokeRect(boss.x, boss.y, boss.w, boss.h);

            // Boss red scanning eye
            ctx.fillStyle = (Math.floor(performance.now() / 120) % 2 === 0) ? "#ff3322" : "#990000";
            ctx.beginPath();
            ctx.arc(boss.x + 16, boss.y + boss.h / 2, 8, 0, Math.PI * 2);
            ctx.fill();

            // Boss title
            ctx.font = "bold 8px 'Silkscreen'";
            ctx.fillStyle = "#ff6b57";
            ctx.fillText("OVERLORD", boss.x + 30, boss.y + 18);

            // Boss health bar
            ctx.fillStyle = "#2a1010";
            ctx.fillRect(boss.x, boss.y - 12, boss.w, 6);
            ctx.fillStyle = "#ff3322";
            ctx.fillRect(boss.x, boss.y - 12, boss.w * (boss.hp / boss.maxHp), 6);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.strokeRect(boss.x, boss.y - 12, boss.w, 6);
          }

          // Render Collectibles
          collectibles.forEach((col) => {
            if (col.type === "coin") {
              // Glowing ZEC Coin
              ctx.fillStyle = "#f4b728";
              ctx.beginPath();
              ctx.arc(col.x + col.w / 2, col.y + col.h / 2, 11, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#141210";
              ctx.font = "bold 13px 'Anton'";
              ctx.fillText("Z", col.x + 8, col.y + 16);
            } else if (col.type === "memo") {
              // Encrypted Memo
              ctx.fillStyle = "#5c7cb5";
              ctx.fillRect(col.x, col.y, col.w, col.h);
              ctx.strokeStyle = "#fff";
              ctx.lineWidth = 1;
              ctx.strokeRect(col.x, col.y, col.w, col.h);
              ctx.font = "9px 'Silkscreen'";
              ctx.fillStyle = "#fff";
              ctx.fillText("MEMO", col.x + 2, col.y + 13);
            } else if (col.type === "orchard") {
              // Orchard Privacy Leaf
              ctx.fillStyle = "#40a860";
              ctx.beginPath();
              ctx.arc(col.x + col.w / 2, col.y + col.h / 2, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#fff";
              ctx.font = "12px 'Space Mono'";
              ctx.fillText("🛡", col.x + 5, col.y + 17);
            }
          });

          // Render Projectiles
          projectiles.forEach((p) => {
            ctx.fillStyle = "#f4b728";
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = "#000";
            ctx.font = "bold 9px 'Silkscreen'";
            ctx.fillText("MEMO", p.x + 2, p.y + 10);
          });

          // Render Particles
          particles.forEach((pt) => {
            ctx.fillStyle = pt.color;
            if (pt.text) {
              ctx.font = "9px 'Space Mono'";
              ctx.fillText(pt.text, pt.x, pt.y);
            } else {
              ctx.fillRect(pt.x, pt.y, 3, 3);
            }
          });

          // Render Floating Combat Texts
          floatingTexts.forEach((ft) => {
            ctx.save();
            ctx.font = "bold 11px 'Silkscreen'";
            ctx.fillStyle = ft.color || "#00ff88";
            ctx.shadowColor = ft.color || "#00ff88";
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
          });

          // Render Player Character
          ctx.save();
          if (player.invulnerable > 0 && Math.floor(player.invulnerable / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
          }

          // zk-SNARK Shield Aura
          if (isShielded) {
            ctx.save();
            ctx.strokeStyle = "#f4b728";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#f4b728";
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // Draw the custom 26x26 character
          if (spriteData && spriteData.grid) {
            const grid = spriteData.grid;
            const pxW = player.w / 26;
            const pxH = player.h / 26;
            const bob = player.jumping ? -4 : Math.sin(player.bobTimer * 4) * 2;

            for (let r = 0; r < 26; r++) {
              for (let c = 0; c < 26; c++) {
                const col = grid[r][c];
                if (col) {
                  ctx.fillStyle = isShielded ? (Math.random() > .2 ? col : "#f4b728") : col;
                  const drawX = player.facing === 1 ? player.x + c * pxW : player.x + (25 - c) * pxW;
                  ctx.fillRect(drawX, player.y + r * pxH + bob, Math.ceil(pxW), Math.ceil(pxH));
                }
              }
            }
          } else {
            ctx.fillStyle = isShielded ? "#f4b728" : "#e6d7bb";
            ctx.fillRect(player.x, player.y, player.w, player.h);
          }
          ctx.restore();

          ctx.restore(); // Restore screen shake
        }
      }
    };
  };

  async function certificate(time) {
    await document.fonts.ready;
    const W = 1200, H = 675, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#e6d7bb"; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(80,55,20,${Math.random() * .08})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    x.strokeStyle = "#141210"; x.lineWidth = 6; x.strokeRect(24, 24, W - 48, H - 48);
    x.fillStyle = "#141210"; x.font = "22px 'Space Mono'"; x.fillText("ZECATHON // 05 WILDCARD · ZERO → SHIELDED", 60, 80);
    x.font = "190px Anton"; x.fillText("SHIELDED", 52, 290);
    x.fillStyle = "#f4b728"; x.fillRect(60, 312, 600, 14);
    x.fillStyle = "#141210"; x.font = "bold 30px 'Space Mono'"; x.fillText((S.handle || "anon").toUpperCase(), 60, 380);
    x.font = "22px 'Space Mono'";
    x.fillText("completed the journey from zero to a first", 60, 425);
    x.fillText("shielded Zcash transaction.", 60, 457);
    x.fillText(`Time: ${time}   ·   Txs: ${S.txCount}   ·   ${new Date().toISOString().slice(0, 10)}`, 60, 520);
    x.font = "16px 'Space Mono'"; x.fillStyle = "#5a5148";
    x.fillText("Simulation certificate. No keys, coins or data left the browser.", 60, 600);
    const av = document.createElement("canvas");
    ZAvatar.draw(av, (S.handle || "anon") + "::" + S.seed.join("").slice(0, 16) + "::" + S.reroll, 14);
    x.imageSmoothingEnabled = false;
    x.fillStyle = "#141210"; x.fillRect(756, 166, 384, 384);
    x.drawImage(av, 762, 172, 372, 372);
    x.font = "16px Silkscreen"; x.fillStyle = "#141210"; x.fillText("SHIELDED IDENTITY · 26×26", 800, 585);
    const a = document.createElement("a"); a.download = `shielded-${(S.handle || "anon").replace(/\W+/g, "_")}.png`; a.href = c.toDataURL("image/png"); a.click();
    toast("⬇ Certificate saved. Attach it to your post!");
  }

  /* ---------------- RENDER ---------------- */
  function render() {
    const id = D.chapters[S.ch].id;
    const view = CH[id]();
    $("#stage").innerHTML = view.html;
    view.bind && view.bind();
    bindNav(); renderMap(); renderRail();
    document.title = (S.ch ? D.chapters[S.ch].title + " · " : "") + "ZERO → SHIELDED";
  }
  const resetModal = $("#modal-reset");
  function showResetModal() {
    AutoPilot.stop();
    if (resetModal && resetModal.showModal) {
      resetModal.showModal();
    } else {
      doReset();
    }
  }

  function doReset() {
    if (resetModal && resetModal.open) resetModal.close();
    localStorage.removeItem(KEY);
    S = fresh();
    render();
    toast("↻ Journey reset to zero. Start fresh!");
  }

  /* glossary, reset modal & nav */
  $("#glossary-body").innerHTML = `<dl class="gloss">${D.glossary.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`;
  $("#btn-glossary").addEventListener("click", () => $("#glossary").showModal());
  $("#glossary-close").addEventListener("click", () => $("#glossary").close());
  $("#glossary").addEventListener("click", (e) => { if (e.target.id === "glossary") $("#glossary").close(); });

  $("#modal-reset-close")?.addEventListener("click", () => resetModal && resetModal.close());
  $("#modal-reset-cancel")?.addEventListener("click", () => resetModal && resetModal.close());
  $("#modal-reset-confirm")?.addEventListener("click", doReset);
  $("#modal-reset")?.addEventListener("click", (e) => { if (e.target.id === "modal-reset" && resetModal) resetModal.close(); });

  $("#btn-home").addEventListener("click", () => { AutoPilot.stop(); go(0); });
  $("#btn-reset").addEventListener("click", showResetModal);
  $("#btn-quick-game-nav")?.addEventListener("click", () => quickJumpToArcade());

  /* ============================================================
     SHIELDED WALLET MODAL (FULL SEND, WITHDRAW & RECEIVE SUITE)
     ============================================================ */
  const walletModal = $("#modal-wallet");

  function buildQR(seed) {
    const h = seed.split("").reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) >>> 0, 0);
    let cells = "";
    for (let i = 0; i < 100; i++) {
      const bit = ((h * (i + 1) * 2654435761) >>> 0) & 1;
      cells += `<div class="wm-qr-cell ${bit ? "" : "light"}"></div>`;
    }
    return `<div class="wm-qr" aria-hidden="true">${cells}</div>`;
  }

  function openWalletModal(defaultTab = "receive") {
    if (!walletModal) return;
    const body = $("#modal-wallet-body");
    if (!body) return;

    const totalZec = (S.s + S.t).toFixed(4);
    const sZec = S.s.toFixed(4);
    const tZec = S.t.toFixed(4);
    const uaAddr = S.ua || "u1sampleunifiedaddressfakekey8943729847192847192847192847";
    const tAddr = S.taddr || "t1sampletransparentaddressfakekey8943729847";

    body.innerHTML = `
      <div class="wm-balance-hero">
        <div class="wm-balance-label">TOTAL SIMULATED BALANCE</div>
        <div class="wm-balance-val">${totalZec} <span>ZEC</span></div>
        <div class="wm-balance-sub">
          <span class="wm-pill s">🔒 SHIELDED: ${sZec} ZEC</span>
          <span class="wm-pill t">👁 TRANSPARENT: ${tZec} ZEC</span>
        </div>
      </div>

      <div class="wm-tabs">
        <button class="wm-tab ${defaultTab === 'receive' ? 'active' : ''}" data-wmtab="receive">📥 RECEIVE</button>
        <button class="wm-tab ${defaultTab === 'send' ? 'active' : ''}" data-wmtab="send">🔒 SEND (SHIELDED)</button>
        <button class="wm-tab ${defaultTab === 'withdraw' ? 'active' : ''}" data-wmtab="withdraw">↗ WITHDRAW (UNSHIELD)</button>
        <button class="wm-tab ${defaultTab === 'history' ? 'active' : ''}" data-wmtab="history">📜 HISTORY</button>
      </div>

      <!-- PANE: RECEIVE -->
      <div class="wm-pane ${defaultTab === 'receive' ? 'active' : ''}" id="wm-pane-receive">
        <div class="wm-addr-toggle">
          <button class="wm-addr-btn active" id="btn-show-ua">🔒 Unified (Shielded, u1...)</button>
          <button class="wm-addr-btn" id="btn-show-t">👁 Transparent (t1...)</button>
        </div>
        <div class="wm-address-block">
          <div id="wm-qr-wrap">${buildQR(uaAddr)}</div>
          <div style="font-family:var(--f-mono);font-size:12px;font-weight:700;color:var(--gold);margin-bottom:4px;" id="wm-addr-title">UNIFIED ADDRESS (Z-POOL)</div>
          <div style="font-family:var(--f-mono);font-size:10px;color:#fff;word-break:break-all;line-height:1.5;margin-bottom:10px;" id="wm-addr-val">${uaAddr}</div>
          <button class="btn sm gold" id="btn-copy-addr" style="font-size:11px;">📋 Copy Address</button>
        </div>
        <p style="font-size:11px;color:var(--text-dim);margin:0;line-height:1.4;">Shielded addresses hide your balance and transaction history with zk-SNARKs. Anyone can send to this address without seeing your wallet contents.</p>
      </div>

      <!-- PANE: SEND (SHIELDED) -->
      <div class="wm-pane ${defaultTab === 'send' ? 'active' : ''}" id="wm-pane-send">
        <div class="wm-privacy-bar">
          <span style="font-size:16px;">🛡</span>
          <div>
            <strong>100% Zero-Knowledge Encrypted</strong><br>
            <span>Sender, receiver, and amount remain completely hidden on the blockchain.</span>
          </div>
        </div>
        <div class="wm-form">
          <div class="wm-field">
            <label>Recipient Address (z-address or u1...)</label>
            <input type="text" id="wm-send-to" placeholder="u1... or zs1..." value="u1peer999xshieldednode2026zecathonmempoolzk">
          </div>
          <div class="wm-field">
            <label>Amount (ZEC) · Available: ${sZec} ZEC</label>
            <input type="number" id="wm-send-amt" placeholder="0.1" step="0.01" min="0.0001" max="${S.s}" value="0.5">
          </div>
          <div class="wm-field">
            <label>Encrypted Memo (Optional, 512 bytes)</label>
            <input type="text" id="wm-send-memo" placeholder="Thanks for running the shielded node!" value="Payment for node service #ZECATHON">
          </div>
          <div id="wm-send-review-box" style="display:none;" class="wm-review"></div>
          <div class="actions" style="margin-top:12px;">
            <button class="btn gold" id="wm-btn-send" style="width:100%;justify-content:center;">🔒 SEND SHIELDED ZEC</button>
          </div>
        </div>
      </div>

      <!-- PANE: WITHDRAW (UNSHIELD) -->
      <div class="wm-pane ${defaultTab === 'withdraw' ? 'active' : ''}" id="wm-pane-withdraw">
        <div class="wm-privacy-bar warn">
          <span style="font-size:16px;">⚠️</span>
          <div>
            <strong>Unshielding Warning (De-anonymization)</strong><br>
            <span>Withdrawing to a transparent address (t1...) makes the destination address and withdrawn amount visible to the entire world!</span>
          </div>
        </div>
        <div class="wm-form">
          <div class="wm-field">
            <label>Presets / Quick Select</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn ghost sm wm-preset" data-to="${tAddr}">My t1 Address</button>
              <button class="btn ghost sm wm-preset" data-to="t1SimExHotWallet999DepositNode">SimEx Exchange (Hot Wallet)</button>
              <button class="btn ghost sm wm-preset" data-to="t1BinanceDepositDeskZECWildcard">Exchange t1 Desk</button>
            </div>
          </div>
          <div class="wm-field">
            <label>Withdraw to Transparent Address (t1...)</label>
            <input type="text" id="wm-withdraw-to" placeholder="t1..." value="${tAddr}">
          </div>
          <div class="wm-field">
            <label>Amount to Withdraw (ZEC) · Shielded Balance: ${sZec} ZEC</label>
            <input type="number" id="wm-withdraw-amt" placeholder="0.25" step="0.01" min="0.0001" max="${S.s}" value="0.25">
          </div>
          <div id="wm-withdraw-review-box" style="display:none;" class="wm-review warn"></div>
          <div class="actions" style="margin-top:14px;margin-bottom:8px;">
            <button class="btn" id="wm-btn-withdraw" style="width:100%;justify-content:center;background:var(--red);color:#fff;border-color:var(--red);">↗ CONFIRM WITHDRAWAL</button>
          </div>
        </div>
      </div>

      <!-- PANE: HISTORY -->
      <div class="wm-pane ${defaultTab === 'history' ? 'active' : ''}" id="wm-pane-history">
        <div class="wm-history">
          ${(S.activity && S.activity.length) ? S.activity.map(a => `
            <div class="wm-history-item">
              <span class="wm-history-icon">${a.icon || '📦'}</span>
              <div class="wm-history-info">
                <div class="wm-history-label">${a.label || 'Transaction'}</div>
                ${a.memo ? `<div class="wm-history-memo">💬 "${a.memo}"</div>` : ''}
              </div>
              <div class="wm-history-amt ${a.dir === 'out' ? 'out' : 'in'}">${a.dir === 'out' ? '-' : '+'}${Number(a.amt || 0).toFixed(4)} ZEC</div>
            </div>
          `).join('') : '<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:12px;">No transactions recorded yet.</div>'}
        </div>
      </div>
    `;

    // Tab switching
    body.querySelectorAll(".wm-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        playSfx("tab");
        const t = tab.dataset.wmtab;
        body.querySelectorAll(".wm-tab").forEach(x => x.classList.toggle("active", x === tab));
        body.querySelectorAll(".wm-pane").forEach(p => p.classList.toggle("active", p.id === `wm-pane-${t}`));
      });
    });

    // Receive address toggle
    const btnUa = body.querySelector("#btn-show-ua");
    const btnT = body.querySelector("#btn-show-t");
    const qrWrap = body.querySelector("#wm-qr-wrap");
    const addrTitle = body.querySelector("#wm-addr-title");
    const addrVal = body.querySelector("#wm-addr-val");

    if (btnUa && btnT) {
      btnUa.addEventListener("click", () => {
        playSfx("tab");
        btnUa.classList.add("active");
        btnT.classList.remove("active");
        addrTitle.textContent = "UNIFIED ADDRESS (Z-POOL)";
        addrTitle.style.color = "var(--gold)";
        addrVal.textContent = uaAddr;
        qrWrap.innerHTML = buildQR(uaAddr);
      });
      btnT.addEventListener("click", () => {
        playSfx("tab");
        btnT.classList.add("active");
        btnUa.classList.remove("active");
        addrTitle.textContent = "TRANSPARENT ADDRESS (T-POOL)";
        addrTitle.style.color = "var(--red)";
        addrVal.textContent = tAddr;
        qrWrap.innerHTML = buildQR(tAddr);
      });
    }

    body.querySelector("#btn-copy-addr")?.addEventListener("click", () => {
      playSfx("coin");
      if (navigator.clipboard) navigator.clipboard.writeText(addrVal.textContent);
      toast("Address copied to clipboard!");
    });

    // Withdraw Presets
    body.querySelectorAll(".wm-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        playSfx("click");
        const inp = body.querySelector("#wm-withdraw-to");
        if (inp) inp.value = btn.dataset.to;
      });
    });

    // Send Logic
    let sendReviewing = false;
    const btnSend = body.querySelector("#wm-btn-send");
    const sendReviewBox = body.querySelector("#wm-send-review-box");
    if (btnSend) {
      btnSend.addEventListener("click", () => {
        const to = body.querySelector("#wm-send-to")?.value.trim();
        const amt = parseFloat(body.querySelector("#wm-send-amt")?.value || "0");
        const memo = body.querySelector("#wm-send-memo")?.value.trim();
        const FEE = 0.0001;

        if (!to) { toast("Please enter a recipient address."); return; }
        if (!amt || amt <= 0) { toast("Please enter a valid amount."); return; }
        if (amt + FEE > S.s) { toast(`Insufficient shielded balance! Need ${(amt + FEE).toFixed(4)} ZEC (including fee).`); return; }

        if (!sendReviewing) {
          sendReviewing = true;
          playSfx("click");
          sendReviewBox.style.display = "block";
          sendReviewBox.innerHTML = `
            <div style="font-weight:700;margin-bottom:6px;color:var(--gold);font-size:12px;">REVIEW SHIELDED TRANSFER:</div>
            <div style="margin-bottom:3px;"><strong>To:</strong> <span style="font-family:var(--f-mono);font-size:11px;">${short(to, 16)}</span></div>
            <div style="margin-bottom:4px;"><strong>Amount:</strong> ${amt.toFixed(4)} ZEC (+ 0.0001 miner fee)</div>
            ${memo ? `<div style="margin-bottom:4px;"><strong>Memo:</strong> 💬 ${memo}</div>` : ""}
            <div style="margin-top:6px;font-size:11px;color:#a89f91;">Click below again to broadcast the zk-SNARK transaction to the network.</div>
          `;
          btnSend.textContent = "⚡ BROADCAST SHIELDED TRANSACTION";
          setTimeout(() => {
            sendReviewBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 50);
          return;
        }

        // Execute Send
        playSfx("shield");
        S.s = +(S.s - amt - FEE).toFixed(8);
        addTx({ kind: "shielded", amt, mine: true });
        addActivity({ icon: "🔒", label: `To ${short(to, 10)} (shielded)`, amt: +(amt + FEE).toFixed(4), dir: "out", memo });
        save();
        renderRail();
        toast(`Sent ${amt.toFixed(4)} ZEC privately with zk-SNARKs!`);
        openWalletModal("history");
      });
    }

    // Withdraw Logic
    let withdrawReviewing = false;
    const btnWithdraw = body.querySelector("#wm-btn-withdraw");
    const withdrawReviewBox = body.querySelector("#wm-withdraw-review-box");
    if (btnWithdraw) {
      btnWithdraw.addEventListener("click", () => {
        const to = body.querySelector("#wm-withdraw-to")?.value.trim();
        const amt = parseFloat(body.querySelector("#wm-withdraw-amt")?.value || "0");
        const FEE = 0.0001;

        if (!to) { toast("Please enter a transparent destination address."); return; }
        if (!to.startsWith("t1") && !to.startsWith("tm")) { toast("Destination must be a transparent address (starts with t1...)"); return; }
        if (!amt || amt <= 0) { toast("Please enter a valid amount to withdraw."); return; }
        if (amt + FEE > S.s) { toast(`Insufficient shielded balance! Need ${(amt + FEE).toFixed(4)} ZEC.`); return; }

        if (!withdrawReviewing) {
          withdrawReviewing = true;
          playSfx("alarm");
          withdrawReviewBox.style.display = "block";
          withdrawReviewBox.innerHTML = `
            <div style="font-weight:700;margin-bottom:6px;color:var(--red);font-size:12px;">⚠️ CONFIRM UNSHIELDING / WITHDRAWAL:</div>
            <div style="margin-bottom:3px;"><strong>Destination:</strong> <span style="font-family:var(--f-mono);font-size:11px;color:#ff8e8e;">${to}</span></div>
            <div style="margin-bottom:4px;"><strong>Withdrawing:</strong> ${amt.toFixed(4)} ZEC (+ 0.0001 miner fee)</div>
            <div style="margin-top:6px;font-size:11px;color:#ffcaca;line-height:1.4;background:rgba(200,64,42,0.2);padding:6px 8px;border-left:2px solid var(--red);">
              Notice: Funds exit the shielded pool into the public blockchain. Destination address and amount become public knowledge.
            </div>
          `;
          btnWithdraw.textContent = "⚠️ BROADCAST UNSHIELD TX NOW";
          setTimeout(() => {
            withdrawReviewBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 50);
          return;
        }

        // Execute Withdraw
        playSfx("error");
        S.s = +(S.s - amt - FEE).toFixed(8);
        S.t = +(S.t + amt).toFixed(8);
        addTx({ kind: "unshield", to, amt, mine: true });
        addActivity({ icon: "↗", label: `Withdraw to ${short(to, 10)}`, amt: +(amt + FEE).toFixed(4), dir: "out" });
        save();
        renderRail();
        toast(`Withdrew ${amt.toFixed(4)} ZEC to transparent address!`);
        openWalletModal("history");
      });
    }

    walletModal.showModal();
  }


  $("#btn-open-wallet-modal")?.addEventListener("click", () => openWalletModal("receive"));
  $("#modal-wallet-close")?.addEventListener("click", () => walletModal?.close());
  $("#modal-wallet")?.addEventListener("click", (e) => { if (e.target.id === "modal-wallet") walletModal?.close(); });

  window.addEventListener("keydown", (e) => {
    if (AutoPilot.active && e.key === "Escape") AutoPilot.stop("Manual takeover via Escape");
  });

  /* clock = elapsed journey time */
  setInterval(() => {
    const end = S.finished || Date.now();
    const s = S.done.intro ? Math.floor((end - S.started) / 1000) : 0;
    $("#clock").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);

  /* ambient traffic on the chain */
  if (!S.ledger.length) for (let i = 0; i < 4; i++) ambientTx();
  setInterval(ambientTx, 9000);

  render();
})();
