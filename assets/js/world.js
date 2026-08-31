/* ============================================================
   WORLD WITH LIMAK — etkileşim motoru
   Sahne üç fotoğraf katmanından oluşur; hepsi aynı ana karenin
   türevi olduğu için hizalama kusursuzdur:
     plate-dead  → çorak arazi
     plate-alive → aynı arazi canlı hâlde, merkezden dışa açılır
     s-<sektör>  → o yapının işlendiği kare, bölge maskesiyle
   ============================================================ */
(() => {
  "use strict";

  const SECTORS = window.LIMAK_SECTORS || [];
  const SCENE = window.LIMAK_SCENE || { w: 1920, h: 1080, core: [960, 858], regions: {} };
  const [CX, CY] = SCENE.core;
  const SW = SCENE.w, SH = SCENE.h;

  /* simülasyondaki karbon katkısı */
  const CO2 = { ruzgar: 12, gunes: 11, su: 10, teknoloji: 8, insaat: 5, hava: 5, cimento: 4, turizm: 3 };

  /* görsel önbelleği: script sürümü görsellere de damgalanır; sahne
     dosyaları güncellenince tarayıcı eski kopyayı gösteremez */
  const AV = (document.querySelector('script[src*="world.js"]')?.src.match(/v=(\d+)/) || [])[1] || "1";

  const $ = (id) => document.getElementById(id);
  const stage = $("stage"), scene = $("scene"), core = $("core");
  const fx = $("fx"), trayRail = $("trayRail"), tray = $("tray");
  const gaugeFill = $("gaugeFill"), gaugeNum = $("gaugeNum"), gauge = $("gauge");
  const carbonBox = $("carbon"), carbonVal = $("carbonVal");
  const coreLabel = $("coreLabel"), trayHint = $("trayHint"), trayCount = $("trayCount");
  const readouts = $("readouts"), sheet = $("sheet"), finale = $("finale");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* merkezden taşan ışık */
  const surge = document.createElement("span");
  surge.className = "surge";
  stage.appendChild(surge);

  const placed = new Set();
  let coreScreen = { x: 0, y: 0 }, sceneScale = 1, lastInput = performance.now();

  /* ============================================================
     SES — küçük WebAudio sentezi, harici dosya yok
     ============================================================ */
  const Snd = (() => {
    let ac = null;
    const ready = () => {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
      if (ac.state === "suspended") ac.resume();
      return ac;
    };
    const tone = (f0, f1, dur, type = "sine", gain = 0.05) => {
      const c = ready(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), c.currentTime + dur);
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    };
    return {
      lift: () => tone(320, 520, 0.16, "triangle", 0.032),
      drop: () => { tone(170, 85, 0.5, "sine", 0.07); tone(680, 1360, 0.32, "triangle", 0.026); },
      back: () => tone(300, 160, 0.18, "sine", 0.028),
      done: () => [0, 0.13, 0.27, 0.46].forEach((d, i) =>
        setTimeout(() => tone([523, 659, 784, 1046][i], [523, 659, 784, 1046][i] * 1.5, 0.7, "triangle", 0.048), d * 1000)),
    };
  })();

  /* ============================================================
     SEKTÖR KATMANLARI
     ============================================================ */
  const layerOf = {}, healOf = {};
  function buildLayers() {
    const host = $("sectors");
    const heals = $("heals");
    host.innerHTML = "";
    heals.innerHTML = "";
    const abs = (p) => new URL(p, document.baseURI).href;
    SECTORS.forEach((s) => {
      if (!SCENE.regions || !SCENE.regions[s.id]) return;   // henüz üretilmemişse atla
      const d = document.createElement("div");
      d.className = "sector";
      d.dataset.sector = s.id;
      // Göreli url() stil sayfasına göre çözüldüğü için mutlak URL kullanılır.
      d.style.backgroundImage = `url("${abs(`assets/img/scene/s-${s.id}.jpg`)}?v=${AV}")`;

      // Maske scene.js içine gömülü gelir. Sayfa file:// ile açıldığında
      // tarayıcı ayrı dosyadan maske yüklemeyi reddediyor; gömülü data: URI
      // bu kısıtı aşar, dosyadan çift tıklayarak açınca da çalışır.
      const rgn = SCENE.regions[s.id] || {};
      const mask = rgn.mask || abs(`assets/img/scene/m-${s.id}.png`);
      d.style.setProperty("--rgn", `url("${mask}")`);
      host.appendChild(d);
      layerOf[s.id] = d;

      // bölgesel iyileşme katmanı: canlı arazinin bu bölgeye açılan kopyası
      if (rgn.zone) {
        const h = document.createElement("div");
        h.className = "heal";
        h.dataset.sector = s.id;
        h.style.backgroundImage = `url("${abs("assets/img/scene/plate-alive.jpg")}?v=${AV}")`;
        heals.appendChild(h);
        healOf[s.id] = h;
      }
    });
  }

  /* ============================================================
     ÖLÇÜM — object-fit:cover eşlemesi
     ============================================================ */
  const zoneScr = {};              // bölge merkezleri ekran uzayında
  function measure() {
    const b = stage.getBoundingClientRect();
    sceneScale = Math.max(b.width / SW, b.height / SH);
    const dx = (b.width - SW * sceneScale) / 2;
    const dy = (b.height - SH * sceneScale) / 2;
    coreScreen = { x: b.left + dx + CX * sceneScale, y: b.top + dy + CY * sceneScale };

    const px = ((coreScreen.x - b.left) / b.width) * 100;
    const py = ((coreScreen.y - b.top) / b.height) * 100;
    scene.style.setProperty("--cx", px + "%");
    scene.style.setProperty("--cy", py + "%");
    surge.style.setProperty("--sx", px + "%");
    surge.style.setProperty("--sy", py + "%");

    core.style.left = coreScreen.x - b.left + "px";
    core.style.top = coreScreen.y - b.top + "px";

    /* bölge maskeleri arka planla aynı cover dönüşümünü kullansın */
    scene.style.setProperty("--mw", (SW * sceneScale).toFixed(1) + "px");
    scene.style.setProperty("--mh", (SH * sceneScale).toFixed(1) + "px");
    scene.style.setProperty("--mx", dx.toFixed(1) + "px");
    scene.style.setProperty("--my", dy.toFixed(1) + "px");

    /* bölgeler: sahne pikselini object-fit:cover eşlemesiyle ekrana taşı */
    for (const id in SCENE.regions) {
      const z = SCENE.regions[id].zone;
      if (!z) continue;
      const [zx, zy, zrx, zry] = z;
      const sx = dx + zx * sceneScale, sy = dy + zy * sceneScale;
      zoneScr[id] = { x: sx, y: sy, rx: zrx * sceneScale, ry: zry * sceneScale,
                      px: (sx / b.width) * 100, py: (sy / b.height) * 100 };
      const h = healOf[id];
      if (h) {
        h.style.setProperty("--hx", zoneScr[id].px + "%");
        h.style.setProperty("--hy", zoneScr[id].py + "%");
        h.style.setProperty("--hrx", (zoneScr[id].rx * 1.5).toFixed(0) + "px");
        h.style.setProperty("--hry", (zoneScr[id].ry * 1.9).toFixed(0) + "px");
      }
    }

    fx.width = b.width * DPR; fx.height = b.height * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    FXW = b.width; FXH = b.height;
    setBloom();
  }

  /* canlı arazinin açılım yarıçapı: ilerlemeyle büyür */
  function setBloom(extra = 0) {
    const b = stage.getBoundingClientRect();
    const far = Math.hypot(Math.max(coreScreen.x - b.left, b.right - coreScreen.x),
                           Math.max(coreScreen.y - b.top, b.bottom - coreScreen.y));
    const p = placed.size / Math.max(1, SECTORS.length);
    // Açılım eğrisi: 0.62 üssü ilk bırakmada ekranın üçte birini birden
    // yeşertiyordu; sonraki yedi bırakma anlamsızlaşıyordu. 0.82 ile her
    // adım gözle görülür ve eşit bir genişleme yapar.
    const r = far * 1.06 * Math.pow(p, 0.82) + extra;
    scene.style.setProperty("--bloom", r.toFixed(0) + "px");
  }

  /* ============================================================
     CANVAS EFEKTLERİ
     ============================================================ */
  const ctx = fx.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let FXW = 0, FXH = 0;
  const rings = [], sparks = [], motes = [];

  const ring = (color = "182,255,138", speed = 1, life = 1) =>
    rings.push({ r: 24 * sceneScale, v: (7 + Math.random() * 3) * speed * sceneScale,
                 a: 0.8 * life, w: 4 * sceneScale, color });

  function burst(n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (2.2 + Math.random() * 8.5) * sceneScale;
      sparks.push({ x: coreScreen.x, y: coreScreen.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 1.4 * sceneScale,
        r: (1.1 + Math.random() * 2.6) * sceneScale,
        a: 1, decay: 0.008 + Math.random() * 0.013, color });
    }
  }
  function seedMotes(n) {
    for (let i = 0; i < n; i++)
      motes.push({ x: Math.random() * FXW, y: Math.random() * FXH,
        vx: (Math.random() - 0.5) * 0.2, vy: -0.08 - Math.random() * 0.3,
        r: 0.5 + Math.random() * 1.6, a: 0.08 + Math.random() * 0.34 });
  }

  /* ============================================================
     ORTAM EFEKTLERİ — yerleşen sektör sahnede YAŞAMAYA başlar
       rüzgâr   : sırtta akan hava çizgileri
       su       : barajdan şehre giden elektrik darbeleri
       hava     : pistten kalkan uçak + çakan iniş ışıkları
       çimento  : viyadükte akan araç farları
       güneş    : panellerde gezinen parıltılar
       inşaat   : akşam pencereleri + vinç ikaz ışığı
       turizm   : havuzda ışıltı
       teknoloji: bölgeleri bağlayan yeşil veri darbeleri
     Fotoğrafa dokunmadan efekt tuvalinde çizilir.
     ============================================================ */
  const ambPts = {};
  function ptsFor(id, n, seed) {
    if (!ambPts[id]) {
      let s = seed;
      const r = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
      ambPts[id] = Array.from({ length: n }, () => [r() * 2 - 1, r() * 2 - 1, r()]);
    }
    return ambPts[id];
  }
  const glowDot = (x, y, r, rgb, a) => {
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${a * 0.28})`;
    ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 6.284); ctx.fill();
  };

  const AMBFX = {
    ruzgar(t, z) {
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.1 + i * 0.26) % 1;
        const x = z.x - z.rx * 1.05 + p * z.rx * 2.1;
        const y = z.y - z.ry * (0.1 + 0.5 * ((i * 0.37) % 1)) + Math.sin(p * 9 + i * 2) * 6;
        const a = Math.sin(Math.PI * p) * 0.32;
        const L = 52 * sceneScale;
        const g = ctx.createLinearGradient(x - L, y, x + L, y);
        g.addColorStop(0, "rgba(235,247,255,0)");
        g.addColorStop(0.5, `rgba(235,247,255,${a})`);
        g.addColorStop(1, "rgba(235,247,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - L, y);
        ctx.quadraticCurveTo(x, y - 8, x + L, y); ctx.stroke();
      }
    },
    su(t, z) {
      const c = zoneScr.insaat || { x: z.x + 230 * sceneScale, y: z.y - 120 * sceneScale };
      const mx = (z.x + c.x) / 2, my = Math.min(z.y, c.y) - 80 * sceneScale;
      ctx.strokeStyle = "rgba(120,225,255,0.07)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(z.x, z.y - z.ry * 0.3);
      ctx.quadraticCurveTo(mx, my, c.x, c.y + c.ry * 0.4); ctx.stroke();
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.32 + i * 0.5) % 1;
        const q = 1 - p;
        const X = q * q * z.x + 2 * q * p * mx + p * p * c.x;
        const Y = q * q * (z.y - z.ry * 0.3) + 2 * q * p * my + p * p * (c.y + c.ry * 0.4);
        glowDot(X, Y, 2.4 * sceneScale, "130,228,255", Math.sin(Math.PI * p) * 0.9);
      }
      for (const [ox, , s] of ptsFor("su", 5, 771))       // savakta köpük ışıltısı
        if ((t * 1.6 + s * 4) % 4 < 0.4)
          glowDot(z.x + ox * z.rx * 0.5, z.y + z.ry * 0.42, 1.6, "230,250,255", 0.5);
    },
    hava(t, z) {
      for (const [ox, , s] of ptsFor("hava", 6, 442))     // pist kenar ışıkları
        glowDot(z.x + ox * z.rx * 0.85, z.y + z.ry * 0.34, 1.5,
                "196,180,255", 0.28 + 0.5 * Math.max(0, Math.sin(t * 2.4 + s * 6.28)));
    },
    cimento(t, z) {
      for (let i = 0; i < 3; i++) {
        const dir = i % 2 ? 1 : -1;
        const p = (t * 0.09 + i * 0.34) % 1;
        const x = z.x + dir * (z.rx * 0.92 - p * z.rx * 1.84);
        glowDot(x, z.y - z.ry * 0.18, 1.7 * sceneScale,
                dir > 0 ? "255,236,190" : "255,120,90", 0.75);
      }
    },
    gunes(t, z) {
      for (const [ox, oy, s] of ptsFor("gunes", 7, 909)) {
        const a = Math.pow(Math.max(0, Math.sin(t * 1.7 + s * 6.283)), 5) * 0.85;
        if (a < 0.03) continue;
        const x = z.x + ox * z.rx * 0.8, y = z.y + oy * z.ry * 0.7;
        const r = (3 + s * 4) * sceneScale;
        ctx.strokeStyle = `rgba(255,232,150,${a})`; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
        glowDot(x, y, 1.3, "255,240,190", a);
      }
    },
    insaat(t, z) {
      for (const [ox, oy, s] of ptsFor("insaat", 10, 313)) {
        const on = Math.sin(t * 0.5 + s * 40) > -0.2;     // pencereler yavaş yanar söner
        if (on) glowDot(z.x + ox * z.rx * 0.7, z.y - z.ry * 0.1 + oy * z.ry * 0.6,
                        1.3 * sceneScale, "255,214,140", 0.32 + s * 0.3);
      }
      if (Math.sin(t * 3.1) > 0.55)                        // vinç ikaz ışığı
        glowDot(z.x + z.rx * 0.16, z.y - z.ry * 0.98, 2, "255,110,70", 0.9);
    },
    turizm(t, z) {
      for (const [ox, , s] of ptsFor("turizm", 5, 606)) {
        const a = Math.pow(Math.max(0, Math.sin(t * 2.1 + s * 6.283)), 4) * 0.55;
        if (a > 0.03) glowDot(z.x + ox * z.rx * 0.5, z.y + z.ry * 0.3,
                              1.4, "210,246,255", a);
      }
    },
    teknoloji(t, z) {
      let i = 0;
      for (const id of placed) {
        if (id === "teknoloji" || !zoneScr[id]) continue;
        const o = zoneScr[id];
        const p = (t * 0.3 + i * 0.19) % 1;
        const mx = (z.x + o.x) / 2, my = Math.min(z.y, o.y) - 60 * sceneScale;
        const q = 1 - p;
        ctx.strokeStyle = "rgba(140,229,99,0.05)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(z.x, z.y);
        ctx.quadraticCurveTo(mx, my, o.x, o.y); ctx.stroke();
        glowDot(q * q * z.x + 2 * q * p * mx + p * p * o.x,
                q * q * z.y + 2 * q * p * my + p * p * o.y,
                1.9 * sceneScale, "160,255,120", Math.sin(Math.PI * p) * 0.8);
        i++;
      }
    },
  };

  function drawFX() {
    ctx.clearRect(0, 0, FXW, FXH);
    ctx.globalCompositeOperation = "lighter";

    /* yerleşen sektörlerin yaşayan efektleri */
    const tSec = performance.now() / 1000;
    for (const id of placed) {
      const z = zoneScr[id], f = AMBFX[id];
      if (z && f) f(tSec, z);
    }
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy;
      if (m.y < -10) { m.y = FXH + 10; m.x = Math.random() * FXW; }
      if (m.x < -10) m.x = FXW + 10; else if (m.x > FXW + 10) m.x = -10;
      // çölde kum tozu, dünya yeşerdikçe filiz zerreciği
      const pr = placed.size / Math.max(1, SECTORS.length);
      const R2 = Math.round(214 - 18 * pr), G2 = Math.round(196 + 59 * pr), B2 = Math.round(150 + 20 * pr);
      ctx.fillStyle = `rgba(${R2},${G2},${B2},${m.a * (0.34 + pr * 0.16)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.284); ctx.fill();
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const R = rings[i];
      R.r += R.v; R.v *= 0.986; R.a -= 0.0102;
      if (R.a <= 0) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(${R.color},${R.a})`;
      ctx.lineWidth = Math.max(0.6, R.w * R.a);
      ctx.beginPath();
      ctx.ellipse(coreScreen.x, coreScreen.y, R.r, R.r * 0.34, 0, 0, 6.284);
      ctx.stroke();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy;
      s.vy += 0.1 * sceneScale; s.vx *= 0.986; s.vy *= 0.986;
      s.a -= s.decay;
      if (s.a <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(${s.color},${s.a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.a, 0, 6.284); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(drawFX);
  }

  /* ============================================================
     TEPSİ + OKUMALAR
     ============================================================ */
  const chipOf = {};
  function buildTray() {
    trayRail.innerHTML = "";
    SECTORS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.style.setProperty("--c", s.color);
      b.dataset.id = s.id;
      b.type = "button";
      b.setAttribute("aria-label", `${s.name} — merkeze sürükle`);
      b.innerHTML = `
        <svg class="chip__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="${s.icon}"/></svg>
        <span class="chip__name">${s.name}</span>
        <span class="chip__sub">${s.sub}</span>
        <span class="chip__check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg></span>`;
      b.addEventListener("pointerdown", (e) => startDrag(e, s, b));
      b.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(s); }
      });
      trayRail.appendChild(b);
      chipOf[s.id] = b;
    });
  }

  function buildReadouts() {
    readouts.innerHTML = "";
    SECTORS.forEach((s) => {
      const d = document.createElement("div");
      d.className = "ro";
      d.style.setProperty("--c", s.color);
      d.dataset.id = s.id;
      d.innerHTML = `
        <span class="ro__dot"></span>
        <span class="ro__txt"><b class="ro__name">${s.name}</b><span class="ro__val">Bekliyor</span></span>
        <svg class="ro__i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1" stroke-linecap="round"/></svg>`;
      d.addEventListener("click", () => { if (placed.has(s.id)) openSheet(s); });
      readouts.appendChild(d);
    });
  }

  /* ============================================================
     SÜRÜKLEME
     ============================================================ */
  let drag = null;
  const R_OUT = () => 470 * sceneScale;
  const R_SNAP = () => 165 * sceneScale;

  function startDrag(e, sector, chip) {
    if (placed.has(sector.id) || drag) return;
    e.preventDefault();
    lastInput = performance.now();
    Snd.lift();

    const r = chip.getBoundingClientRect();
    const clone = chip.cloneNode(true);
    clone.classList.add("is-drag");
    clone.style.left = r.left + "px";
    clone.style.top = r.top + "px";
    clone.style.width = r.width + "px";
    document.body.appendChild(clone);
    chip.style.visibility = "hidden";

    drag = { sector, chip, clone,
      dx: e.clientX - r.left - r.width / 2, dy: e.clientY - r.top - r.height / 2,
      w: r.width, h: r.height, home: { x: r.left, y: r.top }, near: false };

    $("intro")?.classList.add("is-done");
    core.classList.add("is-dragging");
    coreLabel.textContent = `${sector.name} — merkeze bırak`;
    trayHint.textContent = `${sector.effect} için merkeze yaklaş`;
    trayHint.classList.add("is-alert");
    layerOf[sector.id]?.classList.add("is-ghost");

    chip.setPointerCapture?.(e.pointerId);
    addEventListener("pointermove", onMove, { passive: false });
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onUp);
    onMove(e);
  }

  function onMove(e) {
    if (!drag) return;
    e.preventDefault?.();
    lastInput = performance.now();

    const cx = e.clientX - drag.dx, cy = e.clientY - drag.dy;
    drag.clone.style.left = cx - drag.w / 2 + "px";
    drag.clone.style.top = cy - drag.h / 2 + "px";

    const dist = Math.hypot(cx - coreScreen.x, cy - coreScreen.y);
    const prox = Math.max(0, Math.min(1, 1 - dist / R_OUT()));
    const eased = prox * prox;

    layerOf[drag.sector.id]?.style.setProperty("--ghost", (eased * 0.72).toFixed(3));
    surge.style.opacity = (eased * 0.85).toFixed(3);
    surge.style.setProperty("--sr", (240 + eased * 480) * sceneScale + "px");
    setBloom(eased * 260 * sceneScale);

    const near = dist < R_SNAP();
    if (near !== drag.near) {
      drag.near = near;
      core.classList.toggle("is-near", near);
      drag.clone.classList.toggle("is-hot", near);
      coreLabel.textContent = near ? "BIRAK" : `${drag.sector.name} — merkeze bırak`;
      if (near) { ring(rgbOf(drag.sector.color), 1.2, 0.7); Snd.lift(); }
    }
    if (!reduce && eased > 0.25 && Math.random() < eased * 0.2)
      ring(rgbOf(drag.sector.color), 0.75, eased * 0.55);
  }

  function onUp() {
    if (!drag) return;
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerup", onUp);
    removeEventListener("pointercancel", onUp);

    const c = drag.clone.getBoundingClientRect();
    const dist = Math.hypot(c.left + c.width / 2 - coreScreen.x, c.top + c.height / 2 - coreScreen.y);
    const ok = dist < R_SNAP();
    const d = drag;
    drag = null;

    core.classList.remove("is-dragging", "is-near");
    surge.style.opacity = "0";
    trayHint.classList.remove("is-alert");

    if (ok) {
      d.clone.style.transition = "left .32s cubic-bezier(.5,0,.75,0), top .32s cubic-bezier(.5,0,.75,0), scale .32s, opacity .32s";
      d.clone.style.left = coreScreen.x - d.w / 2 + "px";
      d.clone.style.top = coreScreen.y - d.h / 2 + "px";
      d.clone.style.scale = "0.2";
      d.clone.style.opacity = "0";
      setTimeout(() => d.clone.remove(), 340);
      setTimeout(() => commit(d.sector), 190);
    } else {
      Snd.back();
      const L = layerOf[d.sector.id];
      if (L) { L.classList.remove("is-ghost"); L.style.removeProperty("--ghost"); }
      setBloom();
      d.clone.style.transition = "left .42s var(--ease-spring), top .42s var(--ease-spring), scale .42s, opacity .3s .18s";
      d.clone.style.left = d.home.x + "px";
      d.clone.style.top = d.home.y + "px";
      d.clone.style.opacity = "0";
      setTimeout(() => { d.clone.remove(); d.chip.style.visibility = ""; }, 440);
      coreLabel.textContent = "Merkeze bırak";
      trayHint.textContent = "Bir yatırımı sürükle ve merkeze bırak";
    }
  }

  /* ============================================================
     YERLEŞTİRME
     ============================================================ */
  let punchT = 0, factT = 0, factT2 = 0, msT = 0, msT2 = 0;

  /* Yerleştirme sayısı arttıkça ritim: her çeyrekte bir an.
     Sekiz bırakma düz bir liste gibi akmasın, tırmansın. */
  const MILESTONES = {
    2: "Temel atıldı",
    4: "Dünyanın yarısı ayakta",
    6: "Ekosistem birbirine bağlanıyor",
    8: "Sekiz sektör, tek dünya",
  };
  function showMilestone(n) {
    const txt = MILESTONES[n];
    if (!txt) return;
    const el = $("milestone");
    $("msNum").textContent = n + " / 8";
    $("msTxt").textContent = txt;
    clearTimeout(msT); clearTimeout(msT2);
    msT2 = setTimeout(() => el.classList.add("is-show"), 900);
    msT = setTimeout(() => el.classList.remove("is-show"), 3600);
  }

  /* bilgi çipi: bölgenin üstünde gerçek Limak verisi */
  function showFact(sector, z) {
    const chip = $("factchip");
    if (!sector.fact || !z) return;
    chip.style.setProperty("--fc", sector.color);
    $("factEye").textContent = `${sector.name} · Limak`;
    $("factTxt").textContent = sector.fact;
    chip.style.left = Math.min(Math.max(z.x, 240), FXW - 240) + "px";
    chip.style.top = Math.max(z.y - z.ry * 0.75, 96) + "px";
    chip.classList.remove("is-show");
    clearTimeout(factT); clearTimeout(factT2);
    factT2 = setTimeout(() => chip.classList.add("is-show"), 500);
    factT = setTimeout(() => chip.classList.remove("is-show"), 6500);
  }

  function commit(sector) {
    if (placed.has(sector.id)) return;
    placed.add(sector.id);
    Snd.drop();
    $("intro")?.classList.add("is-done");

    const L = layerOf[sector.id];
    if (L) {
      L.classList.remove("is-ghost");
      L.style.removeProperty("--ghost");
      L.classList.add("is-on");
    }

    /* bölgesel iyileşme: bu yatırım KENDİ bölgesini anında yeşertir */
    healOf[sector.id]?.classList.add("is-on");

    /* kamera dalışı: sahne kısa süre bölgeye yaklaşır, sonra geri açılır */
    const z = zoneScr[sector.id];
    if (z && !reduce) {
      scene.style.transformOrigin = `${z.px}% ${z.py}%`;
      scene.classList.add("is-punch");
      clearTimeout(punchT);
      punchT = setTimeout(() => scene.classList.remove("is-punch"), 2100);
    }
    showFact(sector, z);

    if (!reduce) {
      const rgb = rgbOf(sector.color);
      ring("182,255,138", 1.5, 1);
      setTimeout(() => ring(rgb, 1.15, 0.85), 110);
      setTimeout(() => ring(rgb, 0.85, 0.6), 240);
      const step = placed.size / SECTORS.length;          // sona doğru şiddetlenir
      burst(Math.round(46 + step * 60), rgb);
      burst(Math.round(18 + step * 30), "255,255,255");
      seedMotes(Math.round(10 + step * 22));
      stage.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.18)" }, { filter: "brightness(1)" }],
        { duration: 560, easing: "cubic-bezier(.16,1,.3,1)" });
    }

    showMilestone(placed.size);

    const chip = chipOf[sector.id];
    if (chip) { chip.classList.add("is-placed"); chip.style.visibility = ""; chip.disabled = true; }
    const ro = readouts.querySelector(`.ro[data-id="${sector.id}"]`);
    if (ro) { ro.classList.add("is-on"); ro.querySelector(".ro__val").textContent = sector.effect; }

    updateProgress();
  }

  function updateProgress() {
    const n = placed.size, total = SECTORS.length, p = n / total;
    setBloom();
    gaugeFill.style.width = (p * 100).toFixed(1) + "%";
    gaugeNum.textContent = Math.round(p * 100) + "%";
    gauge.setAttribute("aria-valuenow", Math.round(p * 100));
    trayCount.innerHTML = `<b>${n}</b> / ${total}`;

    const co2 = [...placed].reduce((a, id) => a + (CO2[id] || 0), 0);
    carbonVal.textContent = "−%" + co2;
    carbonBox.classList.toggle("is-good", co2 > 0);

    if (n === 0) {
      trayHint.textContent = "Bir yatırımı sürükle ve merkeze bırak";
      coreLabel.textContent = "Merkeze bırak";
    } else if (n < total) {
      trayHint.textContent = `${total - n} yatırım daha — dünya ${Math.round(p * 100)}% hazır`;
      coreLabel.textContent = "Sıradakini bırak";
    } else {
      trayHint.textContent = "Dünya tamamlandı";
      core.classList.add("is-full");
      tray.classList.add("is-empty");
      setTimeout(showFinale, 2200);
    }
  }

  /* ============================================================
     KART · FİNAL · SIFIRLAMA
     ============================================================ */
  function openSheet(s) {
    const p = sheet.querySelector(".sheet__panel");
    p.style.setProperty("--c", s.color);
    $("sheetTag").textContent = s.sub + " · Limak";
    $("sheetTitle").textContent = s.name;
    $("sheetLede").textContent = s.lede;
    $("sheetStats").innerHTML = s.stats.map((x) => `<li><b>${x.v}</b><span>${x.l}</span></li>`).join("");
    $("sheetNote").textContent = s.note;
    sheet.hidden = false;
  }
  const closeSheet = () => (sheet.hidden = true);
  $("sheetX").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  function showFinale() {
    $("finaleStats").innerHTML = (window.LIMAK_FINALE || [])
      .map((x) => `<li><b>${x.v}</b><span>${x.l}</span></li>`).join("");
    finale.hidden = false;
    Snd.done();
    if (!reduce) { burst(90, "182,255,138"); ring("182,255,138", 1.8, 1); seedMotes(36); }
  }
  $("againBtn").addEventListener("click", reset);

  function reset() {
    placed.clear();
    finale.hidden = true; sheet.hidden = true;
    core.classList.remove("is-full");
    tray.classList.remove("is-empty");
    rings.length = 0; sparks.length = 0; motes.length = 0;
    Object.values(layerOf).forEach((L) => {
      L.classList.remove("is-on", "is-ghost");
      L.style.removeProperty("--ghost");
    });
    Object.values(healOf).forEach((h) => h.classList.remove("is-on"));
    $("intro")?.classList.remove("is-done");
    $("milestone")?.classList.remove("is-show");
    scene.classList.remove("is-punch");
    $("factchip").classList.remove("is-show");
    document.querySelectorAll(".chip").forEach((c) => {
      c.classList.remove("is-placed"); c.disabled = false; c.style.visibility = "";
    });
    document.querySelectorAll(".ro").forEach((r) => {
      r.classList.remove("is-on"); r.querySelector(".ro__val").textContent = "Bekliyor";
    });
    seedMotes(22);
    updateProgress();
  }

  /* ============================================================
     KLAVYE + BOŞTA SIFIRLAMA
     ============================================================ */
  document.addEventListener("keydown", (e) => {
    lastInput = performance.now();
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key.toLowerCase() === "r") { reset(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SECTORS.length) commit(SECTORS[n - 1]);
  });
  ["pointerdown", "pointermove", "wheel"].forEach((ev) =>
    addEventListener(ev, () => (lastInput = performance.now()), { passive: true }));
  setInterval(() => {
    if (placed.size > 0 && performance.now() - lastInput > 150000) reset();
  }, 10000);

  const rgbOf = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1).slice(i, i + 2), 16)).join(",");

  /* ============================================================ */
  buildLayers();
  buildTray();
  buildReadouts();
  measure();
  seedMotes(24);
  updateProgress();
  addEventListener("resize", measure);
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  requestAnimationFrame(drawFX);
})();
