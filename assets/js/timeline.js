/* ============================================================
   50 YIL — zaman rayı
   Kaydır, dokun, ok tuşu. Dönem ışığı yıla göre kayar.
   ============================================================ */
(() => {
  "use strict";

  const DATA = (window.LIMAK_TIMELINE || []).slice().sort((a, b) => a.year - b.year);
  const ERAS = window.LIMAK_ERAS || {};
  const FUT = window.LIMAK_FUTURE || [];
  const N = DATA.length;
  if (!N) return;

  const $ = (id) => document.getElementById(id);
  const rail = $("rail"), track = $("track");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- dönem paleti: 1976 toz → 2026 yeşil ---- */
  const ERA_RAMP = [
    { y: 1976, a: "#7a6543", b: "#2b2317", c: "#e0cda3" },   // sepya toz
    { y: 1990, a: "#6d6552", b: "#26251c", c: "#d6cdb4" },   // solmuş beton
    { y: 2000, a: "#5a6a6b", b: "#1c2626", c: "#c3d2d2" },   // çelik gri
    { y: 2012, a: "#3f6b86", b: "#12232e", c: "#a9cfe4" },   // mavi altyapı
    { y: 2020, a: "#2f7f79", b: "#0e2523", c: "#9fe0d3" },   // turkuaz
    { y: 2026, a: "#4c9c4a", b: "#0d2416", c: "#b6ff8a" },   // canlı yeşil
  ];

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (h1, h2, t) => {
    const A = hex(h1), B = hex(h2);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
  };
  function eraFor(year) {
    let i = 0;
    while (i < ERA_RAMP.length - 2 && year > ERA_RAMP[i + 1].y) i++;
    const A = ERA_RAMP[i], B = ERA_RAMP[i + 1];
    const t = Math.max(0, Math.min(1, (year - A.y) / (B.y - A.y)));
    return { a: mix(A.a, B.a, t), b: mix(A.b, B.b, t), c: mix(A.c, B.c, t) };
  }

  /* ---- ray üzerindeki konum: kronoloji + okunabilir aralık ---- */
  const Y0 = DATA[0].year, Y1 = DATA[N - 1].year;
  const POS = DATA.map((d, i) => {
    const byYear = (d.year - Y0) / (Y1 - Y0);
    const byIndex = i / (N - 1);
    return 0.45 * byYear + 0.55 * byIndex;     // yığılmayı önler, kronolojiyi korur
  });
  const LEFT = 0.07, RIGHT = 0.80;             // sağda gelecek yelpazesine yer
  const xOf = (i) => (LEFT + POS[i] * (RIGHT - LEFT)) * rail.clientWidth;

  /* ============================================================
     DÜĞÜMLER
     ============================================================ */
  function buildRail() {
    track.innerHTML = "";
    DATA.forEach((d, i) => {
      const b = document.createElement("button");
      b.className = "node";
      b.type = "button";
      b.style.setProperty("--c", (ERAS[d.sector] || {}).color || "#8ce563");
      b.style.left = xOf(i) + "px";
      b.setAttribute("aria-label", `${d.year} — ${d.title}`);
      b.innerHTML = `<span class="node__dot"></span><span class="node__yr tabular">${d.year}</span>`;
      b.addEventListener("click", () => go(i));
      track.appendChild(b);
    });

    // on yıl işaretleri
    const dec = $("decades");
    dec.innerHTML = "";
    for (let y = 1980; y <= 2020; y += 10) {
      const near = DATA.reduce((best, d, i) =>
        Math.abs(d.year - y) < Math.abs(DATA[best].year - y) ? i : best, 0);
      const s = document.createElement("span");
      s.className = "rail__dec tabular";
      s.textContent = y;
      s.style.left = xOf(near) + "px";
      dec.appendChild(s);
    }

    // geleceğe açılan eksenler
    const f = $("future");
    f.innerHTML = "";
    FUT.forEach((x, i) => {
      const e = document.createElement("span");
      e.className = "fut";
      e.style.setProperty("--f", x.color);
      e.style.top = `calc(50% + ${(i - (FUT.length - 1) / 2) * 26}px)`;
      e.innerHTML = `<i></i><b>${x.label}</b><span>${x.note}</span>`;
      f.appendChild(e);
    });
  }

  /* ============================================================
     GEÇİŞ
     ============================================================ */
  let cur = -1;

  function go(i, instant) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    const prev = cur;
    cur = i;
    const d = DATA[i];
    const sector = ERAS[d.sector] || { label: d.sector, color: "#8ce563" };
    const era = eraFor(d.year);

    /* dönem ışığı */
    const root = document.body;
    root.style.setProperty("--era-a", era.a);
    root.style.setProperty("--era-b", era.b);
    root.style.setProperty("--era-c", era.c);
    root.style.setProperty("--sector", sector.color);

    /* dev yıl */
    const big = document.querySelector(".yearbig");
    if (prev >= 0 && !instant && !reduce) {
      $("yearGhost").textContent = DATA[prev].year;
      big.classList.remove("is-moving");
      void big.offsetWidth;
      big.classList.add("is-moving");
    }
    $("yearBig").textContent = d.year;

    /* kart */
    const card = $("card");
    if (!instant && !reduce) {
      card.classList.remove("is-moving");
      void card.offsetWidth;
      card.classList.add("is-moving");
    }
    $("cardSector").textContent = sector.label;
    $("cardYear").textContent = `${String(i + 1).padStart(2, "0")} · ${d.year}`;
    $("cardTitle").textContent = d.title;
    $("cardSub").textContent = d.subtitle;
    $("cardText").textContent = d.body;
    $("cardStats").innerHTML = (d.stats || [])
      .map((s) => `<li><b>${s.v}</b><span>${s.l}</span></li>`).join("");

    /* görsel: varsa yükle, yoksa sektör dokusu kalsın */
    const img = $("cardImg");
    img.classList.remove("is-ready");
    const src = `assets/img/tl/${d.year}-${d.sector}.jpg`;
    img.onload = () => img.classList.add("is-ready");
    img.onerror = () => img.removeAttribute("src");
    img.src = src;
    img.alt = d.title;

    /* sayaç + düğümler */
    $("counter").innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b> / ${N}`;
    [...track.children].forEach((n, k) => {
      n.classList.toggle("is-on", k === i);
      n.classList.toggle("is-past", k < i);
    });
    rail.classList.toggle("is-end", i >= N - 2);
    center(i);
    pulse(sector.color);
  }

  /* rayı aktif düğüm görünürde kalacak şekilde kaydır */
  function center(i) {
    const x = xOf(i);
    const w = rail.clientWidth;
    const want = Math.max(0, x - w * 0.42);
    track.style.translate = `${-want}px 0`;
    $("decades").style.translate = `${-want}px 0`;
    track.style.transition = "translate .7s cubic-bezier(.16,1,.3,1)";
    $("decades").style.transition = track.style.transition;
  }

  /* ============================================================
     ETKİLEŞİM
     ============================================================ */
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); go(cur + 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(cur - 1); }
    if (e.key === "Home") go(0);
    if (e.key === "End") go(N - 1);
    if (e.key === "Escape") location.href = "index.html";
    idle = 0;
  });

  /* sürükleyerek kaydırma */
  let drag = null;
  rail.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".node")) return;
    drag = { x: e.clientX, i: cur, moved: 0 };
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.abs(dx);
    const step = rail.clientWidth / (N * 1.5);
    go(drag.i - Math.round(dx / step));
    idle = 0;
  });
  const endDrag = () => (drag = null);
  rail.addEventListener("pointerup", endDrag);
  rail.addEventListener("pointercancel", endDrag);

  /* tekerlek */
  let wheelLock = 0;
  addEventListener("wheel", (e) => {
    const now = performance.now();
    if (now - wheelLock < 260) return;
    wheelLock = now;
    go(cur + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1));
    idle = 0;
  }, { passive: true });

  /* fuar kiosk'u: kimse dokunmazsa kendi kendine ilerlesin */
  let idle = 0;
  setInterval(() => {
    idle++;
    if (idle > 8) go(cur >= N - 1 ? 0 : cur + 1);
  }, 5000);
  ["pointerdown", "pointermove"].forEach((ev) =>
    addEventListener(ev, () => (idle = 0), { passive: true }));

  /* ============================================================
     PARÇACIKLAR — dönem rengiyle akan ışık
     ============================================================ */
  const cv = $("eraPx");
  const ctx = cv.getContext("2d");
  let W = 0, HH = 0, dpr = 1, dust = [], flash = [];

  function size() {
    const b = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = b.width; HH = b.height;
    cv.width = W * dpr; cv.height = HH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust = [];
    const n = reduce ? 0 : Math.round(Math.min(150, (W * HH) / 9000));
    for (let i = 0; i < n; i++) {
      dust.push({
        x: Math.random() * W, y: Math.random() * HH,
        vx: 0.05 + Math.random() * 0.28, vy: (Math.random() - 0.5) * 0.14,
        r: 0.5 + Math.random() * 1.6, a: 0.06 + Math.random() * 0.34,
      });
    }
    buildRail();
    if (cur >= 0) center(cur);
  }

  function pulse(colour) {
    if (reduce) return;
    const r = rail.getBoundingClientRect();
    if (flash.length > 2) flash.shift();
    flash.push({ x: xOf(cur) + (parseFloat(track.style.translate) || 0), y: r.top + r.height / 2, r: 4, a: 0.55, c: colour });
  }

  function frame() {
    ctx.clearRect(0, 0, W, HH);
    const c = getComputedStyle(document.body).getPropertyValue("--sector").trim() || "#8ce563";
    const [R, G, B] = hex(c.length === 7 ? c : "#8ce563");
    ctx.globalCompositeOperation = "lighter";
    for (const p of dust) {
      p.x += p.vx; p.y += p.vy;
      if (p.x > W + 6) { p.x = -6; p.y = Math.random() * HH; }
      if (p.y < -6) p.y = HH + 6; else if (p.y > HH + 6) p.y = -6;
      ctx.fillStyle = `rgba(${R},${G},${B},${p.a * 0.42})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.fill();
    }
    for (let i = flash.length - 1; i >= 0; i--) {
      const f = flash[i];
      f.r += 4.2; f.a -= 0.042;
      if (f.a <= 0) { flash.splice(i, 1); continue; }
      const [r2, g2, b2] = hex(f.c);
      ctx.strokeStyle = `rgba(${r2},${g2},${b2},${f.a})`;
      ctx.lineWidth = 2.2 * f.a;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.284); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }

  /* ============================================================ */
  size();
  addEventListener("resize", size);
  go(0, true);
  requestAnimationFrame(frame);
})();
