/* ============================================================
   GİRİŞ — panel odağı, saat, zaman rayı parçacıkları
   ============================================================ */
(() => {
  "use strict";

  /* ---------- panel odağı (fare + dokunma + klavye) ---------- */
  const dip = document.getElementById("diptych");
  const panels = [...document.querySelectorAll(".panel")];

  const focus = (key) => {
    dip.dataset.hover = key || "";
    panels.forEach((p) => p.classList.toggle("is-hot", p.dataset.panel === key));
  };

  panels.forEach((p) => {
    p.addEventListener("pointerenter", () => focus(p.dataset.panel));
    p.addEventListener("focus", () => focus(p.dataset.panel));
    p.addEventListener("pointerdown", () => focus(p.dataset.panel));
  });
  dip.addEventListener("pointerleave", () => focus(null));
  const SIRA = ["world", "time", "harita"];
  const SAYFA = { world: "world.html", time: "timeline.html", harita: "harita.html" };
  document.addEventListener("keydown", (e) => {
    const i = SIRA.indexOf(dip.dataset.hover);
    if (e.key === "ArrowLeft") focus(SIRA[Math.max(0, i - 1)]);
    if (e.key === "ArrowRight") focus(SIRA[Math.min(SIRA.length - 1, i + 1)]);
    if (e.key === "1") location.href = SAYFA.world;
    if (e.key === "2") location.href = SAYFA.time;
    if (e.key === "3") location.href = SAYFA.harita;
  });

  /* Dokunmatik ekranda "hover" yok: sırayla nefes alsın ki
     ziyaretçi üç tarafın da canlı olduğunu görsün. */
  if (window.matchMedia("(hover: none)").matches) {
    let i = 0;
    setInterval(() => focus(SIRA[i++ % SIRA.length]), 4200);
    focus("world");
  }

  /* ---------- saat ---------- */
  const clock = document.getElementById("clock");
  const tick = () => {
    const d = new Date();
    clock.textContent =
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  tick();
  setInterval(tick, 20000);

  /* ---------- zaman çizelgesi fotoğraf akışı ---------- */
  const strip = document.getElementById("strip");
  if (strip && window.LIMAK_TIMELINE) {
    const shots = window.LIMAK_TIMELINE.map((d) => `assets/img/tl/${d.year}-${d.sector}.jpg`);
    // ızgarayı doldur; eksik dosyalar sessizce düşer
    shots.slice(0, 12).forEach((src) => {
      const im = new Image();
      im.decoding = "async";
      im.alt = "";
      im.onerror = () => im.remove();
      im.src = src;
      strip.appendChild(im);
    });
  }

  /* ---------- ray boyunca akan ışık parçacıkları ---------- */
  const cv = document.getElementById("railPx");
  if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d", { alpha: true });

  let W = 0, H = 0, dpr = 1, parts = [];

  const RAIL = (t) => {
    // index.html'deki "M20 300 Q260 300 470 282 T800 224" yolunun 0..1 örneklemesi
    const x = 20 + t * 780;
    const y = 300 - Math.pow(t, 1.7) * 76 - Math.sin(t * Math.PI) * 10;
    return { x: (x / 800) * W, y: (y / 520) * H };
  };

  const COLORS = ["123,145,139", "76,201,240", "91,232,192", "140,229,99", "182,255,138"];

  const seed = () => {
    parts = [];
    const n = Math.round(Math.min(170, (W * H) / 5200));
    for (let i = 0; i < n; i++) {
      parts.push({
        t: Math.random(),
        v: 0.0007 + Math.random() * 0.0022,
        off: (Math.random() - 0.5) * 26,
        r: 0.6 + Math.random() * 1.9,
        a: 0.15 + Math.random() * 0.6,
        fan: Math.random() < 0.42 ? (Math.random() - 0.5) : 0, // gelecekte dağılanlar
      });
    }
  };

  const size = () => {
    const b = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = b.width; H = b.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  };

  const frame = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      p.t += p.v;
      if (p.t > 1.28) p.t -= 1.4;
      const tc = Math.min(p.t, 1);
      const pt = RAIL(tc);
      // 2026'dan sonra yelpaze gibi açılır
      const beyond = Math.max(0, p.t - 0.82) / 0.46;
      const y = pt.y + p.off * (1 - beyond * 0.4) + p.fan * beyond * beyond * H * 0.85;
      const ci = Math.min(COLORS.length - 1, Math.floor(tc * COLORS.length));
      const fade = p.t > 1 ? Math.max(0, 1 - (p.t - 1) / 0.28) : 1;
      ctx.fillStyle = `rgba(${COLORS[ci]},${p.a * fade})`;
      ctx.beginPath();
      ctx.arc(pt.x, y, p.r, 0, 6.284);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  };

  size();
  addEventListener("resize", size);
  requestAnimationFrame(frame);
})();
