/* ===========================================================
   Presente da Letícia · 04.11
   - Enxame de corações (no lugar das setas do vídeo de referência)
   - Envelope de abertura
   - Cenas que mudam conforme a rolagem
   - Efeito "glitch" de caixas neon entre as cenas
   - Spotify: The First Time, Damiano David
   =========================================================== */
(() => {
  const SPOTIFY_URI = "spotify:track:7ETIZFr7163zFcz3RxKk5O"; // The First Time · Damiano David

  const COLORS = ["#c04bff", "#c04bff", "#8f2bff", "#b51f4a", "#8c1638", "#a6f7c6", "#6fe3a0", "#f4ecfb"];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------------- ENXAME DE CORAÇÕES ---------------- */
  const canvas = $("#swarm");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;

  function heartPath(c, s) {
    // coração clássico, de pé, com a ponta para baixo (+y), centrado em 0,0
    c.beginPath();
    c.moveTo(0, s * 0.95);
    c.bezierCurveTo(-s * 0.15, s * 0.75, -s, s * 0.25, -s, -s * 0.3);
    c.bezierCurveTo(-s, -s * 0.85, -s * 0.3, -s * 1.05, 0, -s * 0.5);
    c.bezierCurveTo(s * 0.3, -s * 1.05, s, -s * 0.85, s, -s * 0.3);
    c.bezierCurveTo(s, s * 0.25, s * 0.15, s * 0.75, 0, s * 0.95);
    c.closePath();
  }

  // sprites pré-renderizados com brilho (rápido de desenhar)
  const SPR = 64;
  const sprites = COLORS.map((col) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = SPR;
    const c = cv.getContext("2d");
    c.translate(SPR / 2, SPR / 2);
    c.shadowColor = col;
    c.shadowBlur = 12;
    c.fillStyle = col;
    heartPath(c, 17);
    c.fill();
    c.shadowBlur = 0;
    c.globalAlpha = 0.35;
    c.fillStyle = "#fff";
    c.beginPath();
    c.ellipse(-8, -6, 3.5, 2.2, -0.7, 0, Math.PI * 2);
    c.fill();
    return cv;
  });

  const N = Math.round(clamp((innerWidth * innerHeight) / 9000, 90, 220));
  const boids = [];
  const mouse = { x: -9999, y: -9999, active: false };
  let mode = "flock"; // flock | heart
  let heartTargets = [];
  let burstUntil = 0;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildHeartTargets();
  }

  function buildHeartTargets() {
    heartTargets = [];
    const scale = Math.min(W, H) / 38;
    const cx = W / 2, cy = H / 2 - scale * 1.2;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      // ~70% no contorno, ~30% preenchendo
      const k = i % 10 < 7 ? 1 : rand(0.25, 0.85);
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      heartTargets.push({ x: cx + x * scale * k, y: cy + y * scale * k });
    }
  }

  function initBoids() {
    for (let i = 0; i < N; i++) {
      const a = rand(0, Math.PI * 2);
      boids.push({
        x: rand(0, W), y: rand(0, H),
        vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
        size: rand(0.42, 0.9),
        spr: sprites[i % sprites.length],
        alpha: rand(0.55, 1),
        wob: rand(0, Math.PI * 2),
      });
    }
  }

  function step(now) {
    const maxSpeed = mode === "heart" ? 6 : 2.6;
    const R_SEP = 22, R_ALI = 60;
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
      for (let j = 0; j < boids.length; j++) {
        if (i === j) continue;
        const o = boids[j];
        const dx = o.x - b.x, dy = o.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R_ALI * R_ALI) {
          ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
          if (d2 < R_SEP * R_SEP && d2 > 0.01) { sx -= dx / d2; sy -= dy / d2; }
        }
      }
      if (mode === "heart") {
        const t = heartTargets[i];
        const dx = t.x - b.x, dy = t.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = Math.min(d / 60, 1) * 0.5;
        b.vx += (dx / d) * pull + sx * 6;
        b.vy += (dy / d) * pull + sy * 6;
        b.vx *= d < 30 ? 0.86 : 0.95;
        b.vy *= d < 30 ? 0.86 : 0.95;
        // leve "respiração" quando está no lugar
        b.wob += 0.05;
        if (d < 8) { b.vx += Math.cos(b.wob) * 0.05; b.vy += Math.sin(b.wob) * 0.05; }
      } else {
        if (n) {
          b.vx += (ax / n - b.vx) * 0.045 + (cx / n - b.x) * 0.0009;
          b.vy += (ay / n - b.vy) * 0.045 + (cy / n - b.y) * 0.0009;
        }
        b.vx += sx * 14; b.vy += sy * 14;
        // atração suave pelo mouse
        if (mouse.active) {
          const dx = mouse.x - b.x, dy = mouse.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 260 && d > 1) {
            const f = d < 50 ? -0.25 : 0.035;
            b.vx += (dx / d) * f * 3; b.vy += (dy / d) * f * 3;
          }
        }
        // vagar um pouco
        b.wob += 0.02;
        b.vx += Math.cos(b.wob + i) * 0.03;
        b.vy += Math.sin(b.wob * 1.3 + i) * 0.03;
      }
      const sp = Math.hypot(b.vx, b.vy);
      const lim = now < burstUntil ? 14 : maxSpeed;
      if (sp > lim) { b.vx = (b.vx / sp) * lim; b.vy = (b.vy / sp) * lim; }
      if (mode !== "heart" && sp < 0.8) { b.vx *= 1.1; b.vy *= 1.1; }
      b.x += b.vx; b.y += b.vy;
      if (mode !== "heart") {
        const m = 30;
        if (b.x < -m) b.x = W + m; else if (b.x > W + m) b.x = -m;
        if (b.y < -m) b.y = H + m; else if (b.y > H + m) b.y = -m;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const b of boids) {
      const ang = Math.atan2(b.vy, b.vx);
      const s = SPR * b.size;
      ctx.globalAlpha = b.alpha;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(mode === "heart" ? Math.sin(b.wob) * 0.2 : ang - Math.PI / 2);
      ctx.drawImage(b.spr, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    step(now);
    draw();
    requestAnimationFrame(loop);
  }

  function burst(cx = W / 2, cy = H / 2, power = 12) {
    burstUntil = performance.now() + 900;
    for (const b of boids) {
      const dx = b.x - cx, dy = b.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      b.vx = (dx / d) * power * rand(0.5, 1.2);
      b.vy = (dy / d) * power * rand(0.5, 1.2);
    }
  }

  addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
  addEventListener("mouseleave", () => { mouse.active = false; });
  addEventListener("resize", resize);
  resize();
  initBoids();
  requestAnimationFrame(loop);

  /* ---------------- GLITCH (caixas neon do vídeo) ---------------- */
  const glitchEl = $("#glitch");
  let glitchBusy = false;
  function glitch(strong = false) {
    if (glitchBusy && !strong) return;
    glitchBusy = true;
    document.body.classList.add("rgb");
    const kinds = ["", "fill", "green", "wine", ""];
    const pieces = [];
    const count = strong ? 26 : 12;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      const r = Math.random();
      if (r < 0.65) {
        el.className = "g " + kinds[(Math.random() * kinds.length) | 0];
        const w = rand(40, strong ? 520 : 360), h = rand(8, strong ? 260 : 140);
        Object.assign(el.style, { left: rand(0, W - w) + "px", top: rand(0, H - h) + "px", width: w + "px", height: h + "px" });
      } else if (r < 0.85) {
        el.className = "gl";
        Object.assign(el.style, { left: rand(0, W * 0.5) + "px", top: rand(0, H) + "px", width: rand(W * 0.2, W * 0.9) + "px" });
      } else {
        el.className = "gv";
        Object.assign(el.style, { left: rand(0, W) + "px", top: rand(0, H * 0.4) + "px", height: rand(H * 0.2, H * 0.7) + "px" });
      }
      glitchEl.appendChild(el);
      pieces.push(el);
    }
    if (strong) {
      const f = document.createElement("div");
      f.className = "flash";
      glitchEl.appendChild(f);
      pieces.push(f);
    }
    // piscar em quadros, como no vídeo
    let frame = 0;
    const frames = strong ? 9 : 6;
    const tick = setInterval(() => {
      frame++;
      for (const p of pieces) {
        if (p.classList.contains("flash")) continue;
        p.style.opacity = Math.random() > 0.35 ? 1 : 0;
        p.style.transform = `translateX(${rand(-30, 30)}px)`;
      }
      if (frame >= frames) {
        clearInterval(tick);
        pieces.forEach((p) => p.remove());
        document.body.classList.remove("rgb");
        glitchBusy = false;
      }
    }, 55);
  }

  /* ---------------- SCRAMBLE DE NÚMEROS ---------------- */
  function scramble(el) {
    const final = el.dataset.scramble;
    const chars = "0123456789♥";
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i > 14) { el.textContent = final; clearInterval(iv); return; }
      el.textContent = final.split("").map(() => chars[(Math.random() * chars.length) | 0]).join("");
    }, 60);
  }

  /* ---------------- TEXTO QUE ACENDE COM A ROLAGEM ---------------- */
  const reveal = $("[data-reveal]");
  const words = reveal.textContent.trim().split(/\s+/);
  reveal.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
  const wordEls = $$(".w", reveal);
  const HOT = ["romântico", "alegria", "felicidade", "beleza", "espírito,", "respiro", "emoções", "mais!", "garoto", "programa,"];
  wordEls.forEach((el) => { if (HOT.includes(el.textContent.toLowerCase())) el.dataset.hot = "1"; });

  /* ---------------- SPOTIFY ---------------- */
  let spotify = null;
  let wantPlay = false;
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    IFrameAPI.createController($("#spotify-embed"), { uri: SPOTIFY_URI, width: "100%", height: 80, theme: "dark" }, (c) => {
      spotify = c;
      if (wantPlay) { try { c.play(); } catch (e) {} }
    });
  };
  function playMusic() {
    wantPlay = true;
    if (spotify) { try { spotify.play(); } catch (e) {} }
  }

  /* ---------------- ABERTURA DO ENVELOPE ---------------- */
  const env = $("#envelope");
  $("#openBtn").addEventListener("click", () => {
    env.classList.add("open");
    playMusic();
    const r = env.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 10);
    setTimeout(() => glitch(true), 1300);
    setTimeout(() => {
      $("#intro").classList.add("gone");
      document.body.classList.remove("locked");
      document.body.classList.add("opened");
      $("#site").removeAttribute("aria-hidden");
      scrollTo(0, 0);
      onScroll();
    }, 1500);
    setTimeout(() => $("#intro").remove(), 2600);
  });

  /* ---------------- CENAS DIRIGIDAS PELA ROLAGEM ---------------- */
  const scenes = $$("[data-scene]");
  const navLinks = $$(".topbar nav a");
  let current = -1;

  function progressOf(sec) {
    const r = sec.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  const track = $("#track");
  const galBar = $("#galBar");
  const galCount = $("#galCount");
  const stackImgs = $$(".stack-img");
  const paras = $$(".para");
  const paraCount = $("#paraCount");
  const heroPhoto = $(".hero-photo");
  const heroLines = $$(".hero-title .split");
  let lastPara = 0, lastCard = 0;

  function onScroll() {
    if (!document.body.classList.contains("opened")) return;

    // cena ativa
    let active = 0;
    scenes.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top <= innerHeight * 0.5) active = i;
      if (r.top < innerHeight * 0.8 && !s.classList.contains("seen")) {
        s.classList.add("seen");
        $$("[data-scramble]", s).forEach(scramble);
      }
    });
    if (active !== current) {
      if (current !== -1) glitch();
      current = active;
      navLinks.forEach((a, i) => a.classList.toggle("active", i === active));
      const id = scenes[active].id;
      document.body.dataset.active = id;
      const newMode = id === "final" ? "heart" : "flock";
      if (newMode !== mode) {
        if (newMode === "flock") burst(W / 2, H / 2, 8);
        mode = newMode;
      }
    }

    // HERO: título se desloca, foto aproxima
    const ph = progressOf($("#hero"));
    heroLines.forEach((el, i) => { el.style.transform = `translateX(${(i ? 1 : -1) * ph * 120}px)`; });
    heroPhoto.style.transform = `scale(${1 + ph * 0.12}) rotate(${ph * 3}deg)`;

    // CARTA 1: palavras acendem
    const p1 = progressOf($("#carta1"));
    const lit = Math.floor(clamp(p1 * 1.15) * wordEls.length);
    wordEls.forEach((w, i) => {
      w.classList.toggle("on", i < lit);
      w.classList.toggle("hot", i < lit && w.dataset.hot === "1");
    });

    // GALERIA: rolagem horizontal
    const pg = progressOf($("#galeria"));
    const maxX = track.scrollWidth - innerWidth;
    track.style.transform = `translateX(${-pg * Math.max(0, maxX)}px)`;
    galBar.style.width = pg * 100 + "%";
    const card = Math.min(7, Math.floor(pg * 8));
    galCount.textContent = String(card + 1).padStart(2, "0");
    if (card !== lastCard) { lastCard = card; }

    // CARTA 2: parágrafos e fotos trocam
    const p2 = progressOf($("#carta2"));
    const idx = Math.min(paras.length - 1, Math.floor(p2 * paras.length));
    if (idx !== lastPara) {
      lastPara = idx;
      glitch();
    }
    paras.forEach((p, i) => p.classList.toggle("is-on", i === idx));
    stackImgs.forEach((p, i) => p.classList.toggle("is-on", i === idx));
    paraCount.textContent = String(idx + 1).padStart(2, "0");
  }

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  $("#replay").addEventListener("click", () => {
    mode = "flock";
    burst(W / 2, H / 2, 14);
    glitch(true);
    setTimeout(() => { if (scenes[current] && scenes[current].id === "final") mode = "heart"; }, 1600);
  });
})();
