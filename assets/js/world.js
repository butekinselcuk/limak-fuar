/* ============================================================
   WORLD WITH LIMAK — etkileşim motoru

   SAHNE MİMARİSİ (Faz B · 2. yaklaşım)
   plate-base  → sessiz sabah: yapısız vadi, serin puslu ışık
   plate-alive → aynı yapısız vadi, günün tam ışığında; merkezden açılır
   plate-dunya → gelişmiş dünya; her sektör katmanı bunu kendi
                 maskesiyle gösterir, böylece yapılar tek bir tutarlı
                 karenin parçasıdır (aralarında yollar ve ortak ölçek var)
   Sahne üç fotoğraf katmanından oluşur; hepsi aynı ana karenin
   türevi olduğu için hizalama kusursuzdur:
     plate-base  → sessiz sabah hâli
     plate-alive → aynı arazi canlı hâlde, merkezden dışa açılır
     s-<sektör>  → o yapının işlendiği kare, bölge maskesiyle
   ============================================================ */
(() => {
  "use strict";

  const SECTORS = window.LIMAK_SECTORS || [];
  /* Sahneye yalnızca YAPRAK düğümler yerleşir; dallar tepside menü olur. */
  const LEAVES = window.LIMAK_LEAVES || SECTORS;
  const LEAF = window.LIMAK_LEAF || Object.fromEntries(SECTORS.map((s) => [s.id, s]));
  const SCENE = window.LIMAK_SCENE || { w: 1920, h: 1080, core: [960, 858], regions: {} };
  const [CX, CY] = SCENE.core;
  const SW = SCENE.w, SH = SCENE.h;

  /* Kurulum aşamasında her yatırımın bıraktığı ETKİ payı.
     2. aşamada (etki azaltma) alınan önlemlerle bu pay geri kazanılır.
     Toplam 100 olacak şekilde dağıtıldı. */
  const ETKI = {
    // 02.10: AVM kalktı; payı konut/stadyum/gıda/turizm'e dağıtıldı (toplam 100)
    cimento: 16, port: 12, hava: 12, konut: 12, stadyum: 7, kopru: 7, otoyol: 8,
    gunes: 3, hidro: 4, jeotermal: 3, gida: 8, turizm: 8,
  };

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
  const flash = document.createElement("span");
  flash.className = "flash";
  flash.setAttribute("aria-hidden", "true");
  stage.appendChild(flash);
  const plateAlive = $("plateAlive");

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
  function setMaske(el, url) {
    const v = `url("${url}")`;
    el.style.webkitMaskImage = v;
    el.style.maskImage = v;
    el.dataset.mask = "1";
  }
  function buildLayers() {
    const host = $("sectors");
    const heals = $("heals");
    host.innerHTML = "";
    heals.innerHTML = "";
    const abs = (p) => new URL(p, document.baseURI).href;
    LEAVES.forEach((s) => {
      if (!SCENE.regions || !SCENE.regions[s.id]) return;   // henüz üretilmemişse atla
      const d = document.createElement("div");
      d.className = "sector";
      d.dataset.sector = s.id;
      // Tüm sektörler AYNI gelişmiş dünya karesini kullanır; onları
      // ayıran şey yalnızca maskeleridir. Her sektöre ayrı 800 KB'lık
      // kare vermek gereksizdi (13 x 800 KB ≈ 10 MB).
      // Göreli url() stil sayfasına göre çözüldüğü için mutlak URL kullanılır.
      // Maske scene.js içine gömülü gelir. Sayfa file:// ile açıldığında
      // tarayıcı ayrı dosyadan maske yüklemeyi reddediyor; gömülü data: URI
      // bu kısıtı aşar, dosyadan çift tıklayarak açınca da çalışır.
      const rgn = SCENE.regions[s.id] || {};
      // Bazı katmanların kendi görüntüsü var: otoyol, köprünün altından
      // geçtiği için köprüsüz bir varyant kullanır; köprü onun ÜSTÜNE
      // çizilir (rgn.z). Böylece hangi sırayla konulursa konsun doğru görünür.
      const img = rgn.img || "assets/img/scene/plate-dunya.jpg";
      d.style.backgroundImage = `url("${abs(img)}?v=${AV}")`;
      if (rgn.z) d.style.zIndex = String(rgn.z);
      const mask = rgn.mask || abs(`assets/img/scene/m-${s.id}.png`);
      // AKICILIK: maske doğrudan mask-image'e bir kez yazılır. Önceden
      // var(--rgn) üzerinden veriliyordu; maskeler 10-30 KB'lık data: metni
      // olduğu için tarayıcı HER stil hesabında bu metni yeniden ayrıştırıyor,
      // yerleştirme anında kare başına ~24 ms harcıyordu.
      setMaske(d, mask);
      host.appendChild(d);
      layerOf[s.id] = d;

      // bölgesel iyileşme katmanı: canlı arazinin bu bölgeye açılan kopyası
      if (rgn.zone) {
        const h = document.createElement("div");
        h.className = rgn.heal ? "heal heal--iz" : "heal";
        h.dataset.sector = s.id;
        if (rgn.heal) setMaske(h, rgn.heal);
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
  /* AKICILIK: stil değeri yalnızca değiştiyse yazılır. measure() menü
     açılıp kapanırken de çağrılıyor; aynı değeri yeniden yazmak bile
     sahnedeki 300+ elemanı stil hesabına sokuyordu. */
  const _son = new WeakMap();
  function yaz(el, k, v) {
    if (!el) return;
    let m = _son.get(el);
    if (!m) { m = {}; _son.set(el, m); }
    if (m[k] === v) return;
    m[k] = v;
    el.style.setProperty(k, v);
  }
  function measure() {
    const b = stage.getBoundingClientRect();
    sceneScale = Math.max(b.width / SW, b.height / SH);
    const dx = (b.width - SW * sceneScale) / 2;
    const dy = (b.height - SH * sceneScale) / 2;
    coreScreen = { x: b.left + dx + CX * sceneScale, y: b.top + dy + CY * sceneScale };
    sahneOf.x = b.left + dx; sahneOf.y = b.top + dy;

    const px = ((coreScreen.x - b.left) / b.width) * 100;
    const py = ((coreScreen.y - b.top) / b.height) * 100;
    yaz(scene, "--cx", px + "%");
    yaz(scene, "--cy", py + "%");
    yaz(surge, "--sx", px + "%");
    yaz(surge, "--sy", py + "%");

    yaz(core, "left", coreScreen.x - b.left + "px");
    yaz(core, "top", coreScreen.y - b.top + "px");

    /* bölge maskeleri arka planla aynı cover dönüşümünü kullansın */
    yaz(scene, "--mw", (SW * sceneScale).toFixed(1) + "px");
    yaz(scene, "--mh", (SH * sceneScale).toFixed(1) + "px");
    yaz(scene, "--mx", dx.toFixed(1) + "px");
    yaz(scene, "--my", dy.toFixed(1) + "px");

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
        yaz(h, "--hx", zoneScr[id].px + "%");
        yaz(h, "--hy", zoneScr[id].py + "%");
        yaz(h, "--hrx", (zoneScr[id].rx * 1.5).toFixed(0) + "px");
        yaz(h, "--hry", (zoneScr[id].ry * 1.9).toFixed(0) + "px");
      }
    }

    /* alt arayüzün kapladığı yükseklik: tepsi, alt tepsi açıksa o da dahil */
    const tr = tray.getBoundingClientRect();
    const st = $("subtray");
    const stTop = st && !st.hidden ? st.getBoundingClientRect().top : Infinity;
    const altUst = Math.min(tr.top, stTop);
    const altYuk = Math.max(0, b.height - altUst);
    yaz(document.documentElement, "--ui-alt", altYuk.toFixed(0) + "px");
    // Okumalar artık üst şeritte (gökyüzü bandı); sütun sıkıştırması gerekmez.

    // Tuvalin boyutunu atamak onu SİLER ve ekran kartında yeniden ayırır;
    // yalnızca boyut gerçekten değiştiyse yapılır (yoksa her menü aç/kapa
    // anında halka/kıvılcım katmanı bir kare boş kalıp titriyordu).
    const fw = Math.round(b.width * DPR), fh = Math.round(b.height * DPR);
    if (fx.width !== fw || fx.height !== fh) {
      fx.width = fw; fx.height = fh;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    FXW = b.width; FXH = b.height;
    setBloom();
    if (Object.keys(pusOf).length) pusYerlestir();
  }

  /* canlı arazinin açılım yarıçapı: ilerlemeyle büyür */
  function setBloom(extra = 0) {
    const b = stage.getBoundingClientRect();
    const far = Math.hypot(Math.max(coreScreen.x - b.left, b.right - coreScreen.x),
                           Math.max(coreScreen.y - b.top, b.bottom - coreScreen.y));
    const p = placed.size / Math.max(1, LEAVES.length);
    // Açılım eğrisi: 0.62 üssü ilk bırakmada ekranın üçte birini birden
    // yeşertiyordu; sonraki yedi bırakma anlamsızlaşıyordu. 0.82 ile her
    // adım gözle görülür ve eşit bir genişleme yapar.
    const r = far * 1.06 * Math.pow(p, 0.82) + extra;
    // yalnızca onu kullanan katmana yazılır: sahneye yazılınca 25+ katmanın
    // hepsi her değişimde stil hesabına giriyordu
    yaz(plateAlive || scene, "--bloom", r.toFixed(0) + "px");
  }

  /* ============================================================
     CANVAS EFEKTLERİ
     ============================================================ */
  const ctx = fx.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let FXW = 0, FXH = 0;
  const rings = [], sparks = [], motes = [];

  /* `at` verilirse halka çekirdek yerine o noktadan açılır —
     2. aşamada önlem alınan bölgenin üstünde. */
  const ring = (color = "182,255,138", speed = 1, life = 1, at = null) =>
    rings.push({ r: 24 * sceneScale, v: (7 + Math.random() * 3) * speed * sceneScale,
                 a: 0.8 * life, w: 4 * sceneScale, color,
                 x: at ? at.x : null, y: at ? at.y : null });

  function burst(n, color, at = null) {
    const ox = at ? at.x : coreScreen.x, oy = at ? at.y : coreScreen.y;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (2.2 + Math.random() * 8.5) * sceneScale;
      sparks.push({ x: ox, y: oy,
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

  /* Her yerleşen yatırım sahnede YAŞAMAYA başlar: vinç ikazı, pist ışığı,
     yolda farlar, barajda köpük, jeotermalde buhar. Hepsi bölgenin kendi
     elipsine göre çizilir; pencere oranı değişse de yerinde kalır. */
  const AMBFX = {
    port(t, z) {
      // vinç ikaz ışıkları
      for (let i = 0; i < 2; i++)
        if (Math.sin(t * 2.6 + i * 2.1) > 0.4)
          glowDot(z.x + (i ? 0.34 : -0.16) * z.rx, z.y - z.ry * 0.52,
                  2 * sceneScale, "255,120,80", 0.85);
      // rıhtımda çalışma ışıkları
      for (const [ox, oy, s] of ptsFor("port", 6, 214))
        glowDot(z.x + ox * z.rx * 0.62, z.y + oy * z.ry * 0.34, 1.4 * sceneScale,
                "220,238,255", 0.2 + 0.36 * Math.max(0, Math.sin(t * 1.6 + s * 6.28)));
    },
    hava(t, z) {
      for (const [ox, , s] of ptsFor("hava", 6, 442))     // pist kenar ışıkları
        glowDot(z.x + ox * z.rx * 0.85, z.y + z.ry * 0.34, 1.5,
                "196,180,255", 0.28 + 0.5 * Math.max(0, Math.sin(t * 2.4 + s * 6.28)));
      // (02.10) eski "yaklaşan uçak" ışık noktası kalktı: gerçek uçak
      // iniş-kalkışı aşağıdaki UÇAK bölümünde çiziliyor
    },
    otoyol(t, z) {
      // iki yönde akan farlar — yol dikey uzandığı için dikey akar
      for (const [ox, , s] of ptsFor("otoyol", 8, 553)) {
        const yon = s > 0.5 ? 1 : -1;
        const p = ((t * 0.19 + s) % 1);
        const y = z.y + (yon > 0 ? -1 : 1) * z.ry * (1 - 2 * p);
        const x = z.x + ox * z.rx * 0.26 + yon * z.rx * 0.2;
        glowDot(x, y, 1.5 * sceneScale,
                yon > 0 ? "255,244,220" : "255,140,110", 0.55);
      }
    },
    kopru(t, z) {
      for (let i = 0; i < 2; i++)                          // pilon ikaz ışığı
        if (Math.sin(t * 2.2 + i * 3.1) > 0.55)
          glowDot(z.x + (i ? 0.3 : -0.3) * z.rx, z.y - z.ry * 0.82,
                  1.9 * sceneScale, "255,110,80", 0.9);
      for (const [, , s] of ptsFor("kopru", 4, 118)) {     // köprüden geçiş
        const p = (t * 0.26 + s) % 1;
        glowDot(z.x - z.rx * 0.9 + p * z.rx * 1.8, z.y + z.ry * 0.12,
                1.3 * sceneScale, "255,240,214", 0.5);
      }
    },
    hidro(t, z) {
      for (const [ox, , s] of ptsFor("hidro", 6, 771))     // savakta köpük ışıltısı
        if ((t * 1.6 + s * 4) % 3 < 0.5)
          glowDot(z.x + ox * z.rx * 0.5, z.y + z.ry * 0.5, 1.6, "232,250,255", 0.55);
      // enerji hattı: baraj -> en yakın yerleşim
      const c = zoneScr.konut;
      if (!c) return;
      const mx = (z.x + c.x) / 2, my = Math.min(z.y, c.y) - 80 * sceneScale;
      ctx.strokeStyle = "rgba(120,225,255,0.06)"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(z.x, z.y);
      ctx.quadraticCurveTo(mx, my, c.x, c.y); ctx.stroke();
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.3 + i * 0.5) % 1, q = 1 - p;
        glowDot(q * q * z.x + 2 * q * p * mx + p * p * c.x,
                q * q * z.y + 2 * q * p * my + p * p * c.y,
                2.2 * sceneScale, "130,228,255", Math.sin(Math.PI * p) * 0.8);
      }
    },
    // Jeotermal ve gıda: fotoğrafta gerçek buhar var. Canvas'ın düz,
    // yarı saydam buhar elipsleri üstüne binince "yapıştırılmış" bir disk
    // gibi duruyordu; yalnız ince bir çalışma ışığı kalır.
    jeotermal(t, z) {
      if (Math.sin(t * 1.9) > 0.3)
        glowDot(z.x - z.rx * 0.2, z.y + z.ry * 0.2, 1.3 * sceneScale, "255,214,160", 0.45);
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
    // Stadyum: sahanın üstüne boyanan ışık halesi yapıyı çevresinden
    // koparıyordu (müşteri: "yapıştırma gibi duruyor"). Yerine dört
    // projektör direğinde küçük, sırayla yanıp sönen ışıklar.
    stadyum(t, z) {
      const direk = [[-0.62, -0.5], [0.62, -0.5], [-0.66, 0.42], [0.66, 0.42]];
      direk.forEach(([ox, oy], i) => {
        const a = 0.35 + 0.25 * Math.max(0, Math.sin(t * 1.4 + i * 1.7));
        glowDot(z.x + ox * z.rx, z.y + oy * z.ry, 1.4 * sceneScale, "255,248,225", a);
      });
    },
    konut(t, z) {
      for (const [ox, oy, s] of ptsFor("konut", 10, 313)) {
        const on = Math.sin(t * 0.5 + s * 40) > -0.2;      // pencereler yavaş yanar
        if (on) glowDot(z.x + ox * z.rx * 0.72, z.y + oy * z.ry * 0.52,
                        1.3 * sceneScale, "255,214,140", 0.3 + s * 0.28);
      }
    },
    gida(t, z) {
      if (Math.sin(t * 1.3) > 0.2)                          // yükleme rampası ışığı
        glowDot(z.x + z.rx * 0.3, z.y + z.ry * 0.3, 1.3 * sceneScale, "255,226,180", 0.4);
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
    turizm(t, z) {
      for (const [ox, , s] of ptsFor("turizm", 5, 606)) {  // havuz ve teras ışıltısı
        const a = Math.pow(Math.max(0, Math.sin(t * 2.1 + s * 6.283)), 4) * 0.55;
        if (a > 0.03) glowDot(z.x + ox * z.rx * 0.5, z.y + z.ry * 0.3,
                              1.4, "210,246,255", a);
      }
    },
  };

  /* "dijital rota" — müşterinin 2. aşama için istediği efekt: alınan
     karar sahnede bir hat boyunca komşu yatırımlara yayılır. */
  const rotalar = [];
  function rotaAt(id, rgb) {
    const a = zoneScr[id];
    if (!a) return;
    const komsu = [...placed].filter((x) => x !== id && zoneScr[x]);
    komsu.sort((p, q) =>
      Math.hypot(zoneScr[p].x - a.x, zoneScr[p].y - a.y) -
      Math.hypot(zoneScr[q].x - a.x, zoneScr[q].y - a.y));
    komsu.slice(0, 3).forEach((b, i) =>
      rotalar.push({ a, b: zoneScr[b], t0: performance.now() + i * 180, rgb }));
  }

  function drawRotalar(now) {
    for (let i = rotalar.length - 1; i >= 0; i--) {
      const R = rotalar[i];
      const p = (now - R.t0) / 2300;
      if (p < 0) continue;
      if (p > 1) { rotalar.splice(i, 1); continue; }
      const mx = (R.a.x + R.b.x) / 2;
      const my = Math.min(R.a.y, R.b.y) - 92 * sceneScale;
      const q = 1 - p;
      // hattın kendisi: kesikli, akan bir veri yolu
      ctx.strokeStyle = `rgba(${R.rgb},${Math.sin(Math.PI * Math.min(1, p * 1.7)) * 0.3})`;
      ctx.lineWidth = 1.5 * sceneScale;
      ctx.setLineDash([9 * sceneScale, 7 * sceneScale]);
      ctx.lineDashOffset = -now * 0.055;
      ctx.beginPath();
      ctx.moveTo(R.a.x, R.a.y);
      ctx.quadraticCurveTo(mx, my, R.b.x, R.b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // hat boyunca ilerleyen darbe
      glowDot(q * q * R.a.x + 2 * q * p * mx + p * p * R.b.x,
              q * q * R.a.y + 2 * q * p * my + p * p * R.b.y,
              3.2 * sceneScale, R.rgb, Math.sin(Math.PI * p));
    }
  }

  /* ============================================================
     2. AŞAMA ÖNLEM EFEKTLERİ (02.10) — "decarbonization yapılırken
     değişiklikler belirgin olmalı". Alınan her önlem sahnede SÜREKLİ
     görünür bir karşılık bırakır; geri alınınca kaybolur.
       yeni   : GES ile yatırım arasında gidip gelen enerji zerreleri
       akil   : limanda yanıp sönen lojistik takip ışıkları (gıdada
                akıllı enerji ağı)
       led    : terminal binası aydınlanır, pist ışıkları güçlenir
       elek   : elektrikli araçlar — mavi, hareketli ışıklar
       sarj   : şarj noktalarında atan yeşil halkalar
       iklim  : yapının üstünde ince koruma kubbesi
       su/yagmur : yağmur suyu hasadı — süzülen damlalar
       atik   : geri kazanım döngüsü
       tedarik: dışarıdan yapıya akan sorumlu tedarik hattı
       yakit  : alternatif yakıt — fırında yeşil alev
       ccus   : bacadan yükselen karbon geri yakalanır
     ============================================================ */
  const sahneOf = { x: 0, y: 0 };                 // measure() yazar
  const ekr = (x, y) => ({ x: sahneOf.x + x * sceneScale, y: sahneOf.y + y * sceneScale });
  /* sahne pikselinde ölçülen noktalar (plate-dunya.jpg üzerinde) */
  const FXN = {
    limanSaha: [[280, 620], [330, 627], [380, 595], [425, 585], [280, 660], [225, 680],
                [310, 650], [350, 610], [250, 635], [200, 690], [400, 575], [440, 580]],
    terminal: [785, 478, 885, 498],               // x0, y0, x1, y1
    kule: [846, 440],
    pistUzak: [[740, 363], [767, 363]],           // uzak uç sol/sağ kenar
    pistYakin: [[588, 514], [652, 506]],          // yakın uç sol/sağ kenar
  };
  const kimlikTohum = (s) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 997, 7) / 997;
  const bez = (a, c, b, p) => {
    const q = 1 - p;
    return { x: q * q * a.x + 2 * q * p * c.x + p * p * b.x, y: q * q * a.y + 2 * q * p * c.y + p * p * b.y };
  };

  function enerjiAkisi(t, g, z, id) {
    if (!g) return;
    const c = { x: (g.x + z.x) / 2, y: Math.min(g.y, z.y) - 130 * sceneScale };
    // hattın kendisi: ince, altın rengi bir enerji yolu
    ctx.strokeStyle = "rgba(255,214,110,0.30)";
    ctx.lineWidth = 1.8 * sceneScale;
    ctx.setLineDash([3 * sceneScale, 6 * sceneScale]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo(c.x, c.y, z.x, z.y); ctx.stroke();
    ctx.setLineDash([]);
    const tohum = kimlikTohum(id);
    // GES → yatırım (gelen enerji) ve yatırım → GES (dönüş): "gitsin gelsin"
    for (let i = 0; i < 7; i++) {
      const gidis = i < 4;
      let p = ((t / 3.0) + tohum + i / (gidis ? 4 : 3)) % 1;
      if (!gidis) p = 1 - p;
      const P = bez(g, c, z, p);
      const a = Math.sin(Math.PI * p);
      for (let k = 3; k >= 1; k--) {                 // kısa iz
        const pp = gidis ? p - k * 0.012 : p + k * 0.012;
        if (pp < 0 || pp > 1) continue;
        const Q = bez(g, c, z, pp);
        glowDot(Q.x, Q.y, (2.2 - k * 0.4) * sceneScale, "255,214,110", a * 0.35);
      }
      glowDot(P.x, P.y, (gidis ? 3.6 : 2.8) * sceneScale, gidis ? "255,226,130" : "180,255,160", a);
    }
    // varış noktasında küçük nabız
    const nab = (t * 1.2 + tohum) % 1;
    ctx.strokeStyle = `rgba(255,214,110,${(1 - nab) * 0.5})`;
    ctx.lineWidth = 1.2 * sceneScale;
    ctx.beginPath(); ctx.ellipse(z.x, z.y, (6 + nab * 22) * sceneScale, (3 + nab * 9) * sceneScale, 0, 0, 6.284); ctx.stroke();
  }

  const ONLEMFX = {
    yeni(t, z, id) { enerjiAkisi(t, zoneScr.gunes, z, id); },
    akil(t, z, id) {
      if (id === "port") {
        // lojistik takip: saha ışıkları sırayla yanıp söner, bir "tarama" dolaşır
        const tara = Math.floor(t * 6) % FXN.limanSaha.length;
        FXN.limanSaha.forEach(([sx, sy], i) => {
          const P = ekr(sx, sy);
          const yan = Math.sin(t * 4.2 + i * 1.9) > 0.35 || i === tara;
          if (yan) glowDot(P.x, P.y, (i === tara ? 2.8 : 2) * sceneScale,
                           i === tara ? "160,255,210" : "110,220,255", i === tara ? 1 : 0.8);
        });
        return;
      }
      // akıllı enerji yönetimi: tesis üstünde atan küçük bir ağ
      for (const [ox, oy, s] of ptsFor("akil-" + id, 6, 377)) {
        const P = { x: z.x + ox * z.rx * 0.55, y: z.y + oy * z.ry * 0.45 };
        glowDot(P.x, P.y, 1.6 * sceneScale, "120,240,220", 0.35 + 0.55 * Math.max(0, Math.sin(t * 3 + s * 6.28)));
      }
    },
    led(t, z, id) {
      if (id !== "hava") return;
      // terminal binası aydınlanır
      const [x0, y0, x1, y1] = FXN.terminal;
      const A = ekr(x0, y0), B = ekr(x1, y1);
      const g = ctx.createRadialGradient((A.x + B.x) / 2, (A.y + B.y) / 2, 0, (A.x + B.x) / 2, (A.y + B.y) / 2, (B.x - A.x) * 0.75);
      g.addColorStop(0, "rgba(255,236,190,0.30)"); g.addColorStop(1, "rgba(255,236,190,0)");
      ctx.fillStyle = g;
      ctx.fillRect(A.x - (B.x - A.x) * 0.3, A.y - (B.y - A.y) * 2.5, (B.x - A.x) * 1.6, (B.y - A.y) * 5);
      for (let x = x0 + 6; x < x1 - 4; x += 6) {         // pencere sırası
        const P = ekr(x, y0 + (y1 - y0) * 0.55);
        glowDot(P.x, P.y, 1.1 * sceneScale, "255,246,220", 0.75 + 0.2 * Math.sin(t * 2 + x));
      }
      const K = ekr(...FXN.kule);
      glowDot(K.x, K.y, 2.2 * sceneScale, "255,250,235", 0.7 + 0.3 * Math.sin(t * 3));
      // pist kenar ışıkları: LED ile parlak ve düzenli
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        for (let s = 0; s < 2; s++) {
          const a = FXN.pistYakin[s], b = FXN.pistUzak[s];
          const P = ekr(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u);
          const dalga = Math.max(0, Math.sin(t * 5 - u * 9));
          glowDot(P.x, P.y, (1.4 - u * 0.5) * sceneScale, "220,240,255", 0.45 + dalga * 0.5);
        }
      }
    },
    elek(t, z, id) {
      // elektrikli araçlar: mavi ışıklar sahada dolaşır
      const yol = id === "port" ? FXN.limanSaha.map(([x, y]) => ekr(x, y)) : null;
      for (let i = 0; i < 5; i++) {
        let P;
        if (yol) {
          const p = (t * 0.22 + i / 5) % 1, n = yol.length;
          const f = p * n, a = yol[Math.floor(f) % n], b = yol[(Math.floor(f) + 1) % n], u = f % 1;
          P = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
        } else {
          const an = t * 0.5 + i * 1.257;
          P = { x: z.x + Math.cos(an) * z.rx * 0.45, y: z.y + Math.sin(an) * z.ry * 0.35 };
        }
        glowDot(P.x, P.y, 1.9 * sceneScale, "110,200,255", 0.9);
        if (Math.sin(t * 7 + i * 2) > 0.92) glowDot(P.x, P.y - 3 * sceneScale, 1.1 * sceneScale, "220,245,255", 1);
      }
    },
    sarj(t, z, id) {
      for (const [ox, , s] of ptsFor("sarj-" + id, 3, 515)) {
        const P = { x: z.x + ox * z.rx * 0.6, y: z.y + (s - 0.5) * z.ry * 0.5 };
        const p = (t / 1.6 + s) % 1;
        glowDot(P.x, P.y, 2 * sceneScale, "120,255,160", 0.9);
        ctx.strokeStyle = `rgba(120,255,160,${(1 - p) * 0.7})`;
        ctx.lineWidth = 1.3 * sceneScale;
        ctx.beginPath(); ctx.ellipse(P.x, P.y, (3 + p * 14) * sceneScale, (1.5 + p * 6) * sceneScale, 0, 0, 6.284); ctx.stroke();
      }
    },
    iklim(t, z) {
      // koruma kubbesi: yapının üstünde ince bir yay, üzerinde dolaşan parıltı
      ctx.strokeStyle = "rgba(140,220,255,0.22)";
      ctx.lineWidth = 1.5 * sceneScale;
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.rx * 0.75, z.ry * 1.25, 0, Math.PI, 2 * Math.PI); ctx.stroke();
      const an = Math.PI + ((t * 0.35) % 1) * Math.PI;
      glowDot(z.x + Math.cos(an) * z.rx * 0.75, z.y + Math.sin(an) * z.ry * 1.25, 2.2 * sceneScale, "170,235,255", 0.85);
    },
    su(t, z, id) { ONLEMFX.yagmur(t, z, id); },
    yagmur(t, z, id) {
      for (const [ox, , s] of ptsFor("yagmur-" + id, 7, 828)) {
        const p = (t * 0.7 + s) % 1;
        const x = z.x + ox * z.rx * 0.6, y = z.y - z.ry * 0.9 + p * z.ry * 0.9;
        glowDot(x, y, 1.3 * sceneScale, "140,210,255", Math.sin(Math.PI * p) * 0.85);
      }
    },
    atik(t, z, id) {
      // geri kazanım döngüsü: üç zerre küçük bir halkada döner
      const r = Math.min(z.rx, z.ry * 2) * 0.28;
      for (let i = 0; i < 3; i++) {
        const an = t * 1.6 + i * 2.094;
        glowDot(z.x + Math.cos(an) * r, z.y + Math.sin(an) * r * 0.45, 2 * sceneScale, "150,240,140", 0.9);
      }
    },
    tedarik(t, z, id) {
      for (let i = 0; i < 4; i++) {
        const an = i * 1.571 + 0.6, p = (t * 0.4 + i * 0.25) % 1;
        const R = 1.6 - p * 1.2;
        glowDot(z.x + Math.cos(an) * z.rx * R, z.y + Math.sin(an) * z.ry * R * 0.8,
                1.7 * sceneScale, "180,255,170", Math.sin(Math.PI * p) * 0.85);
      }
    },
    yakit(t, z) {
      const F = { x: z.x - z.rx * 0.2, y: z.y - z.ry * 0.05 };
      for (let i = 0; i < 5; i++) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 9 + i * 1.3));
        glowDot(F.x + (i - 2) * 3 * sceneScale, F.y - a * 4 * sceneScale, 1.5 * sceneScale, "120,255,170", a * 0.8);
      }
    },
    ccus(t, z) {
      // bacadan yükselen karbon zerreleri kıvrılıp yakalama noktasına iner
      const B = { x: z.x + z.rx * 0.15, y: z.y - z.ry * 0.45 };
      const Y = { x: z.x + z.rx * 0.55, y: z.y + z.ry * 0.1 };
      const C = { x: (B.x + Y.x) / 2, y: B.y - 70 * sceneScale };
      for (let i = 0; i < 6; i++) {
        const p = (t * 0.35 + i / 6) % 1;
        const P = bez(B, C, Y, p);
        glowDot(P.x, P.y, 1.7 * sceneScale, p < 0.5 ? "220,220,220" : "120,240,190", Math.sin(Math.PI * p) * 0.8);
      }
      const nab = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(120,240,190,${0.35 + nab * 0.4})`;
      ctx.lineWidth = 1.4 * sceneScale;
      ctx.beginPath(); ctx.ellipse(Y.x, Y.y, 6 * sceneScale, 3 * sceneScale, 0, 0, 6.284); ctx.stroke();
    },
  };

  function drawOnlemFx(t) {
    for (const k of uygulanan) {
      const [id, oid] = k.split(":");
      const z = zoneScr[id], f = ONLEMFX[oid];
      if (z && f) f(t, z, id);
    }
  }

  /* KALAN ETKİ PUSU — 2. aşamada her yatırımın üstünde, kalan etkisiyle
     orantılı yumuşak bir pus. Önlem alındıkça o yatırımın üstü açılır;
     "değişiklik belirgin olsun" talebinin en okunur karşılığı.
     DOM katmanı + yalnız opaklık geçişi: ekran kartında çizilir. */
  const pusOf = {};
  const pusKap = document.createElement("div");
  pusKap.className = "puslar";
  pusKap.setAttribute("aria-hidden", "true");
  scene.after(pusKap);
  function pusKur() {
    pusKap.replaceChildren();
    for (const id of Object.keys(pusOf)) delete pusOf[id];
    for (const leaf of LEAVES) {
      if (!placed.has(leaf.id) || !onlemleri(leaf.id).length || !zoneScr[leaf.id]) continue;
      const d = document.createElement("span");
      d.className = "pus";
      pusKap.appendChild(d);
      pusOf[leaf.id] = d;
    }
    pusYerlestir();
  }
  function pusYerlestir() {
    for (const [id, d] of Object.entries(pusOf)) {
      const z = zoneScr[id];
      if (!z) continue;
      d.style.left = (z.x - z.rx * 1.25).toFixed(0) + "px";
      d.style.top = (z.y - z.ry * 1.9).toFixed(0) + "px";
      d.style.width = (z.rx * 2.5).toFixed(0) + "px";
      d.style.height = (z.ry * 3.1).toFixed(0) + "px";
    }
  }
  function pusTazele() {
    for (const [id, d] of Object.entries(pusOf))
      d.style.opacity = asama === 2 ? (kalanEtki(id) / 100).toFixed(3) : "0";
  }

  /* ============================================================
     UÇAK — havalimanında belirli aralıklarla kalkış ve iniş (02.10)
     "kesinlikle profesyonel, sırıtmadan". Uçak gerçek fotoğraf
     dokusunda (assets/img/scene/ucak.png) ve pist DÜZLEMİNDE çizilir:
     pistin dört köşesi sahnede ölçüldü, pist yerel koordinatından
     (u: boy, v: en, metre) sahne pikseline bir homografi kuruldu
     (tools/rev2/pist.py). Uçak her an o noktadaki yerel perspektifle
     (homografinin türevi) eğilir; uzaklaştıkça küçülür, yerden
     kalkınca gölgesi yerde kalır.
     ============================================================ */
  const PIST_H = [1.744416147, 1.130817446, 624.453334092,
                  0.497032568, -0.131635088, 502.5,
                  0.0020237, -0.00026196, 1.0];     // L = 600 m, en 45 m
  const PIST_L = 600;
  const pistNokta = (u, v) => {
    const h = PIST_H, w = h[6] * u + h[7] * v + h[8];
    return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w];
  };
  const ucakImg = new Image(), golgeImg = new Image();
  ucakImg.src = `assets/img/scene/ucak.png?v=${AV}`;
  golgeImg.src = `assets/img/scene/ucak-golge.png?v=${AV}`;
  let havaT0 = 0;                                  // havalimanının kurulduğu an
  const UCAK_DONGU = 50;                           // saniye
  const yumusak = (x) => x * x * (3 - 2 * x);

  /* Döngü içindeki konum: { u, z (metre), ileri, a (opaklık) } ya da null */
  function ucakDurum(s) {
    // KALKIŞ (0-16 sn): eşikte belir → hızlan → 380 m'de kalk → ufka tırman
    if (s < 16) {
      const a = Math.min(1, s / 0.8);
      let u;
      if (s < 2) u = 40;
      else if (s < 10) u = 40 + Math.pow((s - 2) / 8, 2) * 520;
      else u = 560 + 130 * (s - 10);
      // gerçekçi tırmanış: ~%12 eğimle başlar, yavaşça dikleşir; uçak
      // dağ sırtının üstüne çıkmadan vadinin derinliğinde kaybolur
      const k = Math.max(0, u - 380);
      const z = 0.12 * k + 0.0002 * k * k;
      const sonu = Math.max(0, Math.min(1, (u - 850) / 260));
      return { u, z, ileri: true, a: a * (1 - sonu) };
    }
    // İNİŞ (24-43 sn): ufuktan alçal → uzak eşiğe değ → izleyiciye doğru yavaşla
    if (s >= 24 && s < 43) {
      const t = s - 24;
      const tYak = 7.8;                               // yaklaşma süresi
      if (t < tYak) {
        const u = 1300 - 100 * t;                     // ~7° süzülüş
        return { u, z: (u - 520) * 0.12, ileri: false, a: Math.min(1, t / 1.5) };
      }
      const T = t - tYak, ivme = 11.9, dur = 100 / ivme;
      const TT = Math.min(T, dur);
      const u = 520 - (100 * TT - 0.5 * ivme * TT * TT);
      const a = T > dur ? Math.max(0, 1 - (T - dur) / 1.2) : 1;
      return a > 0 ? { u, z: 0, ileri: false, a } : null;
    }
    return null;
  }

  function ucakCiz(tSec) {
    if (!placed.has("hava") || reduce || !ucakImg.complete || !ucakImg.naturalWidth) return;
    const s = (tSec - havaT0) % UCAK_DONGU;
    const d = ucakDurum(s);
    if (!d || d.a <= 0.01) return;
    const e = 0.5;
    const [px, py] = pistNokta(d.u, 0);
    const [ax1, ay1] = pistNokta(d.u + e, 0), [ax0, ay0] = pistNokta(d.u - e, 0);
    const [bx1, by1] = pistNokta(d.u, e), [bx0, by0] = pistNokta(d.u, -e);
    // sahne pikseli/metre: boy (a) ve en (b) yönünde; ekrana sceneScale ile
    const a = [(ax1 - ax0) / (2 * e) * sceneScale, (ay1 - ay0) / (2 * e) * sceneScale];
    const b = [(bx1 - bx0) / (2 * e) * sceneScale, (by1 - by0) / (2 * e) * sceneScale];
    const P = ekr(px, py);
    // 1,3 ×: dar bölgesel pistte gövde okunur kalsın (geniş gövdeli uçak oranı)
    const k = 1.3 * 37.6 / ucakImg.naturalHeight;   // metre / görsel pikseli
    const yon = d.ileri ? 1 : -1;
    const bLen = Math.hypot(b[0], b[1]);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    // gölge: yerde kalır, yükseldikçe kayar ve solar (güneş batıdan)
    if (golgeImg.complete && golgeImg.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = d.a * Math.max(0, 1 - d.z / 180) * 0.85;
      ctx.transform(b[0] * k * yon, b[1] * k * yon, -a[0] * k * yon, -a[1] * k * yon,
                    P.x + d.z * 0.5 * bLen, P.y + d.z * 0.12 * bLen);
      ctx.drawImage(golgeImg, -golgeImg.naturalWidth / 2, -golgeImg.naturalHeight / 2);
      ctx.restore();
    }
    ctx.globalAlpha = d.a;
    ctx.transform(b[0] * k * yon, b[1] * k * yon, -a[0] * k * yon, -a[1] * k * yon,
                  P.x, P.y - d.z * bLen * 0.9);
    ctx.drawImage(ucakImg, -ucakImg.naturalWidth / 2, -ucakImg.naturalHeight / 2);
    ctx.restore();
    // çakar ışık: yalnız havadayken, kısa beyaz bir parlama (gerçek uçak
    // gibi). Renkli kanat ışıkları bu ölçekte "oyuncak" gibi duruyordu.
    if (d.z > 4 && d.a > 0.3 && (tSec * 1.1) % 1 < 0.06)
      glowDot(P.x, P.y - d.z * bLen * 0.9, 0.9 * sceneScale, "255,255,255", d.a * 0.8);
  }

  /* önlem paneli açıkken ilgili yatırım sahnede kesikli bir halkayla
     işaretlenir — panel nereye kayarsa kaysın hangi yapıyla ilgili belli */
  function isaretle(z, s, t) {
    const rgb = rgbOf(s.color);
    const nab = 0.5 + 0.5 * Math.sin(t * 3.2);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${rgb},${0.55 + nab * 0.35})`;
    ctx.lineWidth = 2 * sceneScale;
    ctx.setLineDash([10 * sceneScale, 7 * sceneScale]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.rx * (0.9 + nab * 0.04), z.ry * (0.9 + nab * 0.04), 0, 0, 6.284);
    ctx.stroke();
    ctx.restore();
  }

  function drawFX() {
    ctx.clearRect(0, 0, FXW, FXH);
    ctx.globalCompositeOperation = "lighter";

    /* yerleşen sektörlerin yaşayan efektleri */
    const tSec = performance.now() / 1000;
    for (const id of placed) {
      const z = zoneScr[id], f = AMBFX[id];
      if (z && f) f(tSec, z);
    }
    ucakCiz(tSec);
    if (rotalar.length) drawRotalar(tSec * 1000);
    if (acikFix && zoneScr[acikFix]) isaretle(zoneScr[acikFix], LEAF[acikFix], tSec);
    if (asama === 2) drawOnlemFx(tSec);
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy;
      if (m.y < -10) { m.y = FXH + 10; m.x = Math.random() * FXW; }
      if (m.x < -10) m.x = FXW + 10; else if (m.x > FXW + 10) m.x = -10;
      // çölde kum tozu, dünya yeşerdikçe filiz zerreciği
      const pr = placed.size / Math.max(1, LEAVES.length);
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
      ctx.ellipse(R.x ?? coreScreen.x, R.y ?? coreScreen.y,
                  R.r, R.r * 0.34, 0, 0, 6.284);
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

  const ikon = (d) =>
    `<svg class="chip__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <path d="${d}"/></svg>`;
  const tik =
    `<span class="chip__check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg></span>`;

  /* Bir yaprak yerleşebilir mi? Dalın `needs` koşulu sağlanmalı.
     "Çimento olmadan şehir olmaz" — İnşaat dalı çimentoya bağlı. */
  function engel(leaf, kume = placed) {
    const dal = leaf.parent ? SECTORS.find((s) => s.id === leaf.parent) : null;
    // Dalın koşulu (İnşaat → çimento) önce, yaprağın kendi koşulu
    // (Köprü → otoyol, Konut → gıda, Çimento → enerji) sonra; hepsi sağlanmalı.
    for (const kaynak of [dal, leaf]) {
      if (kaynak && !ihtiyacVar(kaynak.needs, kume)) {
        uyarNeden = kaynak.needsWhy || "";
        return `Önce ${ihtiyacAdi(kaynak)} yerleşmeli`;
      }
    }
    return null;
  }
  /* `needs` tek kimlik ya da dizi olabilir; dizi "bunlardan biri yeter"
     demektir (çimento için herhangi bir enerji santrali). */
  function ihtiyacVar(needs, kume = placed) {
    if (!needs) return true;
    return Array.isArray(needs) ? needs.some((id) => kume.has(id)) : kume.has(needs);
  }
  function ihtiyacAdi(kaynak) {
    if (kaynak.needsName) return kaynak.needsName;
    const n = LEAF[kaynak.needs];
    return n ? n.name : String(kaynak.needs);
  }
  let uyarNeden = "";

  function yapraKCipi(leaf) {
    const b = document.createElement("button");
    b.className = "chip";
    b.style.setProperty("--c", leaf.color);
    b.dataset.id = leaf.id;
    b.type = "button";
    b.setAttribute("aria-label", `${leaf.name} — merkeze sürükle`);
    b.innerHTML = `${ikon(leaf.icon)}
      <span class="chip__name">${leaf.name}</span>
      <span class="chip__sub">${leaf.sub}</span>
      <span class="chip__geri" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
        geri al</span>${tik}
      <span class="chip__lock" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg></span>`;
    b.addEventListener("pointerdown", (e) => {
      // 02.10: kurulmuş yatırıma dokunmak onu kaldırır (bağlı olanlarla birlikte)
      if (placed.has(leaf.id)) { e.preventDefault(); kaldirKullanici(leaf.id); return; }
      const n = engel(leaf);
      if (n) { e.preventDefault(); uyar(n, leaf); return; }
      startDrag(e, leaf, b);
    });
    b.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (placed.has(leaf.id)) { kaldirKullanici(leaf.id); return; }
        const n = engel(leaf);
        n ? uyar(n, leaf) : commit(leaf);
      }
    });
    chipOf[leaf.id] = b;
    return b;
  }

  /* Dallı düğüm: dokununca alt seçenekler açılır (müşteri talebi) */
  function dalCipi(s) {
    const b = document.createElement("button");
    b.className = "chip chip--branch";
    b.style.setProperty("--c", s.color);
    b.dataset.branch = s.id;
    b.type = "button";
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-label", `${s.name} — ${s.children.length} seçenek`);
    b.innerHTML = `${ikon(s.icon)}
      <span class="chip__name">${s.name}</span>
      <span class="chip__sub"><b class="chip__done">0</b>/${s.children.length} seçenek</span>
      <span class="chip__caret" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg></span>`;
    b.addEventListener("click", () => dalAc(s.id));
    return b;
  }

  let acikDal = null;
  function dalAc(id) {
    const panel = $("subtray");
    if (acikDal === id) { dalKapat(); return; }
    // Dal düğümü yaprak tablosunda yoktur; ağacın kökünden aranır.
    const s = SECTORS.find((x) => x.id === id);
    if (!s || !s.children) return;
    acikDal = id;
    panel.style.setProperty("--c", s.color);
    $("subtrayTitle").textContent = `${s.name} · ${s.sub}`;
    const rail = $("subtrayRail");
    rail.replaceChildren(...s.children.map((c) => yapraKCipi(LEAF[c.id])));
    tazeleCipler();
    panel.hidden = false;
    konumlaMenu(id);
    requestAnimationFrame(() => { panel.classList.add("is-open"); measure(); });
    trayRail.querySelectorAll(".chip--branch").forEach((c) =>
      c.setAttribute("aria-expanded", String(c.dataset.branch === id)));
    trayRail.querySelectorAll(".chip--branch").forEach((c) =>
      c.classList.toggle("is-open", c.dataset.branch === id));
    Snd.lift();
  }
  /* Paneli tıklanan çipin üstüne hizala; ekrandan taşarsa içeri çek
     ve oku çipe bakacak şekilde kaydır. */
  function hizala(panel, cip) {
    if (!panel || !cip) return;
    panel.style.left = "0px";
    panel.style.bottom = "0px";
    const c = cip.getBoundingClientRect();
    const tr = tray.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const kenar = 14;
    const merkez = c.left + c.width / 2;
    let sol = merkez - p.width / 2;
    sol = Math.max(kenar, Math.min(sol, innerWidth - p.width - kenar));
    panel.style.left = sol.toFixed(0) + "px";
    panel.style.bottom = (innerHeight - tr.top + 12).toFixed(0) + "px";
    panel.style.setProperty("--arrow", (merkez - sol).toFixed(0) + "px");
  }

  function konumlaMenu(id) {
    hizala($("subtray"), trayRail.querySelector(`.chip--branch[data-branch="${id}"]`));
  }

  addEventListener("resize", () => { if (acikDal) konumlaMenu(acikDal); });

  /* Menü dışına dokununca kapansın — fuar ekranında doğal davranış */
  document.addEventListener("pointerdown", (e) => {
    if (!acikDal) return;
    if (e.target.closest("#subtray, .chip--branch")) return;
    dalKapat();
  }, true);

  function dalKapat() {
    const panel = $("subtray");
    acikDal = null;
    panel.classList.remove("is-open");
    setTimeout(() => { if (!acikDal) { panel.hidden = true; measure(); } }, 320);
    trayRail.querySelectorAll(".chip--branch").forEach((c) => {
      c.setAttribute("aria-expanded", "false");
      c.classList.remove("is-open");
    });
  }
  $("subtrayX")?.addEventListener("click", dalKapat);

  function buildTray() {
    trayRail.innerHTML = "";
    SECTORS.forEach((s) => {
      trayRail.appendChild(s.children ? dalCipi(s) : yapraKCipi(LEAF[s.id]));
    });
    tazeleCipler();
  }

  /* Kilit ve tamamlanma göstergelerini güncelle */
  function tazeleCipler() {
    for (const leaf of LEAVES) {
      const c = chipOf[leaf.id];
      if (!c || !c.isConnected) continue;
      const kondu = placed.has(leaf.id);
      const n = kondu ? null : engel(leaf);
      c.classList.toggle("is-placed", kondu);
      c.classList.toggle("is-locked", !!n);
      // kurulmuş çip artık devre dışı değil: dokununca geri alınır
      c.disabled = false;
      c.setAttribute("aria-label", kondu ? `${leaf.name} — kaldırmak için dokun` : `${leaf.name} — bölgesine sürükle`);
      if (n) c.title = n; else if (kondu) c.title = "Geri almak için dokun"; else c.removeAttribute("title");
    }
    SECTORS.filter((s) => s.children).forEach((s) => {
      const b = trayRail.querySelector(`.chip--branch[data-branch="${s.id}"]`);
      if (!b) return;
      const n = s.children.filter((c) => placed.has(c.id)).length;
      b.querySelector(".chip__done").textContent = n;
      b.classList.toggle("is-placed", n === s.children.length);
      const kilit = !ihtiyacVar(s.needs);
      b.classList.toggle("is-locked", kilit);
      if (kilit) b.title = `Önce ${ihtiyacAdi(s)} yerleşmeli`;
      else b.removeAttribute("title");
    });
  }

  /* Kapı uyarısı — sahnenin ortasında, kısa ve net.
     `geri` verilirse aynı kutu kaldırma bildirimi olarak kullanılır. */
  let uyarT = 0;
  function uyar(metin, leaf, geri = null) {
    const el = $("gatewarn");
    if (!el) return;
    el.style.setProperty("--c", (leaf && leaf.color) || "var(--sprout)");
    el.classList.toggle("is-geri", geri != null);
    $("gatewarnTxt").textContent = metin;
    $("gatewarnWhy").textContent = geri != null ? geri : (uyarNeden || "Çimento olmadan şehir kurulamaz.");
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-show"));
    clearTimeout(uyarT);
    uyarT = setTimeout(() => {
      el.classList.remove("is-show");
      setTimeout(() => (el.hidden = true), 360);
    }, 3200);
    Snd.back();
  }

  /* Okuma sütunu tepsiyle aynı yapıyı taşır: 7 grup.
     13 yaprağın tamamı ayrı satır olsaydı sütun tepsinin üstüne taşardı
     (ölçüldü: 747px sütun, 622px'te başlayan tepsi → 226px çakışma). */
  function buildReadouts() {
    readouts.innerHTML = "";
    SECTORS.forEach((s) => {
      const d = document.createElement("div");
      d.className = "ro" + (s.children ? " ro--branch" : "");
      d.style.setProperty("--c", s.color);
      d.dataset.id = s.id;
      const alt = s.children
        ? `<span class="ro__pips" aria-hidden="true"></span>`
        : "";
      d.innerHTML = `
        <span class="ro__dot"></span>
        <span class="ro__txt">
          <b class="ro__name">${s.name}</b>
          <span class="ro__val">Bekliyor</span>${alt}
        </span>
        <svg class="ro__i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1" stroke-linecap="round"/></svg>`;
      if (s.children) {
        const pips = d.querySelector(".ro__pips");
        s.children.forEach((c) => {
          const i = document.createElement("i");
          i.dataset.leaf = c.id;
          i.title = c.name;
          pips.appendChild(i);
        });
      }
      d.addEventListener("click", () => {
        if (s.children) {
          const son = [...placed].reverse().find((id) => s.children.some((c) => c.id === id));
          if (son) openSheet(LEAF[son]);
        } else if (placed.has(s.id)) openSheet(LEAF[s.id]);
      });
      readouts.appendChild(d);
    });
  }

  /* Okuma sütununu tazele.
     1. aşamada "ne kuruldu", 2. aşamada "kaç önlem alındı" gösterir;
     yoksa etki azaltma sürerken sütun eski metinde donup kalıyordu. */
  function tazeleOkumalar() {
    const alinan = (id) =>
      onlemleri(id).filter((o) => uygulanan.has(id + ":" + o.id)).length;

    SECTORS.forEach((s) => {
      const d = readouts.querySelector(`.ro[data-id="${s.id}"]`);
      if (!d) return;
      const yapraklar = s.children ? s.children.map((c) => c.id) : [s.id];

      if (asama === 2) {
        const say = yapraklar.reduce((a, id) => a + onlemleri(id).length, 0);
        const al = yapraklar.reduce((a, id) => a + alinan(id), 0);
        d.classList.toggle("is-on", al > 0);
        d.querySelector(".ro__val").textContent =
          say ? `${al}/${say} önlem` : "Azaltım kaynağı";
        d.querySelectorAll(".ro__pips i").forEach((i) =>
          i.classList.toggle("is-on",
            !onlemleri(i.dataset.leaf).length ||
            alinan(i.dataset.leaf) === onlemleri(i.dataset.leaf).length));
        return;
      }

      if (s.children) {
        const kondu = s.children.filter((c) => placed.has(c.id));
        d.classList.toggle("is-on", kondu.length > 0);
        d.querySelector(".ro__val").textContent =
          kondu.length ? `${kondu.length}/${s.children.length} yerleşti` : "Bekliyor";
        d.querySelectorAll(".ro__pips i").forEach((i) =>
          i.classList.toggle("is-on", placed.has(i.dataset.leaf)));
      } else {
        const kondu = placed.has(s.id);
        d.classList.toggle("is-on", kondu);
        d.querySelector(".ro__val").textContent = kondu ? LEAF[s.id].effect : "Bekliyor";
      }
    });
  }

  /* ============================================================
     SÜRÜKLEME
     ============================================================ */
  let drag = null;
  const R_OUT = () => 470 * sceneScale;
  const R_SNAP = () => 165 * sceneScale;

  /* Her yatırımın sahnede KENDİ yeri var: liman kıyıya, havalimanı ovaya,
     köprü vadiye. Hepsini ekranın ortasındaki tek daireye bırakmak
     coğrafi olarak anlamsızdı. Hedef halkası artık sürüklenen yatırımın
     bölgesine taşınıyor; bırakma mesafesi de oraya göre ölçülüyor. */
  function hedef(id) {
    const z = zoneScr[id];
    if (z) return { x: z.x, y: z.y, rx: z.rx, ry: z.ry };
    return { x: coreScreen.x, y: coreScreen.y, rx: 165 * sceneScale, ry: 165 * sceneScale };
  }

  /* Bölge elips olduğu için mesafe de elipse göre normalize edilir:
     1.0 = tam kenarında, 0 = tam ortasında. */
  function hedefUzaklik(id, x, y) {
    const h = hedef(id);
    const rx = Math.max(90 * sceneScale, h.rx * 1.35);
    const ry = Math.max(70 * sceneScale, h.ry * 1.9);
    return Math.hypot((x - h.x) / rx, (y - h.y) / ry);
  }

  function hedefiTasi(id) {
    const h = hedef(id);
    const b = stage.getBoundingClientRect();
    core.style.left = h.x - b.left + "px";
    core.style.top = h.y - b.top + "px";
  }

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
    document.body.classList.add("is-suruk");     // alt menü hedefi örtmesin (02.10)
    hedefiTasi(sector.id);                       // halka yatırımın yerine gitsin
    core.style.setProperty("--c", sector.color);
    core.classList.add("is-dragging", "is-armed");
    coreLabel.textContent = sector.note || `${sector.name} — buraya bırak`;
    trayHint.textContent = `${sector.name} · ${sector.note || "işaretli alana bırakın"}`;
    trayHint.classList.add("is-alert");
    layerOf[sector.id]?.classList.add("is-ghost");

    /* Bilinmeyen bir pointerId ile setPointerCapture NotFoundError atar ve
       sürüklemeyi burada kesip dinleyicilerin hiç bağlanmamasına yol açar.
       Yakalama iyileştirmedir, zorunlu değil — hatası akışı bozmamalı. */
    try { chip.setPointerCapture?.(e.pointerId); } catch { /* yoksay */ }
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

    /* yakınlık artık yatırımın KENDİ bölgesine göre: 0 = tam üstünde */
    const u = hedefUzaklik(drag.sector.id, cx, cy);
    const prox = Math.max(0, Math.min(1, 1 - u / 2.6));
    const eased = prox * prox;

    layerOf[drag.sector.id]?.style.setProperty("--ghost", (eased * 0.72).toFixed(3));
    surge.style.opacity = (eased * 0.85).toFixed(3);
    surge.style.setProperty("--sr", (240 + eased * 480) * sceneScale + "px");
    // AKICILIK: burada setBloom çağrılıyordu; her fare hareketinde tam ekran
    // fotoğraf maskesi yeniden çiziliyordu. Yakınlık ışığını 'surge' zaten veriyor.

    const near = u < 1;
    if (near !== drag.near) {
      drag.near = near;
      core.classList.toggle("is-near", near);
      drag.clone.classList.toggle("is-hot", near);
      coreLabel.textContent = near ? "BURAYA BIRAK" : (drag.sector.note || `${drag.sector.name} — işaretli alana`);
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
    const d = drag;
    drag = null;
    document.body.classList.remove("is-suruk");
    /* bırakma kararı yatırımın kendi bölgesine göre; cömert bir pay bırakılır
       ki dokunmatik ekranda kimse zorlanmasın */
    const ok = hedefUzaklik(d.sector.id, c.left + c.width / 2, c.top + c.height / 2) < 1.15;
    const h = hedef(d.sector.id);

    core.classList.remove("is-dragging", "is-near", "is-armed");
    surge.style.opacity = "0";
    trayHint.classList.remove("is-alert");

    if (ok) {
      d.clone.style.transition = "left .32s cubic-bezier(.5,0,.75,0), top .32s cubic-bezier(.5,0,.75,0), scale .32s, opacity .32s";
      d.clone.style.left = h.x - d.w / 2 + "px";
      d.clone.style.top = h.y - d.h / 2 + "px";
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
      coreLabel.textContent = "İşaretli alana bırakın";
      trayHint.textContent = `${d.sector.name} ${d.sector.note ? "— " + d.sector.note.toLowerCase() : "kendi alanına yerleşir"}`;
    }
  }

  /* ============================================================
     AÇILIŞ — ekrana dokununca süreç başlar
     Ziyaretçi ilk ekranda "sürükle" talimatını anlamıyordu; artık
     perdenin herhangi bir yerine dokunmak yeterli. Ardından tepsi
     kısa bir süre vurgulanır ki ilk adım (yatırım seçmek) belli olsun.
     ============================================================ */
  let introT = 0;
  function introyuKapat() {
    const el = $("intro");
    if (!el || el.classList.contains("is-done")) return;
    el.classList.add("is-done");
    lastInput = performance.now();
    Snd.lift();
    trayHint.classList.add("is-alert");
    document.body.classList.add("is-tray-cue");
    clearTimeout(introT);
    introT = setTimeout(() => {
      if (!drag) trayHint.classList.remove("is-alert");
      document.body.classList.remove("is-tray-cue");
    }, 2800);
  }
  {
    const el = $("intro");
    /* pointerdown: dokunmatik ekranda anında tepki verir ve sahnedeki diğer
       dokunma işleyicilerinin "click"i yutmasından etkilenmez */
    el?.addEventListener("pointerdown", (e) => { e.stopPropagation(); introyuKapat(); });
    el?.addEventListener("click", (e) => { e.stopPropagation(); introyuKapat(); });
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); introyuKapat(); }
    });
  }

  /* ============================================================
     YERLEŞTİRME
     ============================================================ */
  let punchT = 0, factT = 0, factT2 = 0, msT = 0, msT2 = 0;

  /* Yerleştirme sayısı arttıkça ritim: her çeyrekte bir an.
     Sekiz bırakma düz bir liste gibi akmasın, tırmansın. */
  const MILESTONES = {
    3: "Temel atıldı",
    6: "Bölge şekilleniyor",
    9: "Ekosistem birbirine bağlanıyor",
    11: "Son adım kaldı",            // 02.10: AVM kalktı, 12 yatırım
  };
  function showMilestone(n) {
    const txt = MILESTONES[n];
    if (!txt) return;
    const el = $("milestone");
    $("msNum").textContent = n + " / " + LEAVES.length;
    $("msTxt").textContent = txt;
    clearTimeout(msT); clearTimeout(msT2);
    msT2 = setTimeout(() => el.classList.add("is-show"), 900);
    msT = setTimeout(() => el.classList.remove("is-show"), 3600);
  }

  /* ============================================================
     KUTU YERLEŞİMİ (02.10) — "tıklayınca çıkan yazılar ilgili projeyi
     kapatmamalı". Kutu için aday konumlar puanlanır: ilgili yatırımın
     üstüne binmek çok ağır, diğer kurulu yatırımların üstüne binmek
     hafif cezalanır; üst şerit ve alt tepsi bölgesine taşmaz.
     ============================================================ */
  const kutuAlani = (z, k = 0.82) => ({ x0: z.x - z.rx * k, x1: z.x + z.rx * k, y0: z.y - z.ry * k, y1: z.y + z.ry * k });
  function ortusme(x, y, w, h, b) {           // b alanının yüzde kaçı örtülüyor
    const ox = Math.max(0, Math.min(x + w, b.x1) - Math.max(x, b.x0));
    const oy = Math.max(0, Math.min(y + h, b.y1) - Math.max(y, b.y0));
    return (ox * oy) / Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
  }
  function uiSinir() {
    const tr = tray.getBoundingClientRect();
    const st = $("subtray");
    const stTop = st && !st.hidden ? st.getBoundingClientRect().top : Infinity;
    return { ust: 96, alt: Math.min(tr.top, stTop) - 12 };
  }
  function kutuPuani(x, y, w, h, z, sahip) {
    let s = ortusme(x, y, w, h, kutuAlani(z)) * 60;
    for (const id of placed) {
      const o = zoneScr[id];
      if (o && id !== sahip) s += ortusme(x, y, w, h, kutuAlani(o, 0.7)) * 5;
    }
    return s;
  }
  function kutuYeri(w, h, z, sahip, pay = 16) {
    const { ust, alt } = uiSinir(), kenar = 16;
    const ex = z.rx * 0.86, ey = z.ry * 0.86;
    const adaylar = [
      [z.x - w / 2, z.y - ey - pay - h, 0],          // üst (tercih)
      [z.x + ex + pay, z.y - h / 2, 0.15],           // sağ
      [z.x - ex - pay - w, z.y - h / 2, 0.15],       // sol
      [z.x - w / 2, z.y + ey + pay, 0.3],            // alt
    ];
    let en = null;
    for (const [ax, ay, tercih] of adaylar) {
      const x = Math.min(Math.max(ax, kenar), innerWidth - w - kenar);
      const y = Math.min(Math.max(ay, ust), Math.max(ust, alt - h));
      const s = kutuPuani(x, y, w, h, z, sahip) + tercih
              + (Math.abs(x - ax) + Math.abs(y - ay)) * 0.0015;
      if (!en || s < en.s) en = { x, y, s };
    }
    return en;
  }

  /* bilgi çipi: bölgenin yanında gerçek Limak verisi — yatırımı örtmez */
  function showFact(sector, z) {
    const chip = $("factchip");
    if (!sector.fact || !z) return;
    factSahibi = sector.id;
    chip.style.setProperty("--fc", sector.color);
    $("factEye").textContent = `${sector.name} · Limak`;
    $("factTxt").textContent = sector.fact;
    chip.style.translate = "0 0";
    const w = chip.offsetWidth || 380, h = chip.offsetHeight || 96;
    const yer = kutuYeri(w, h, z, sector.id);
    chip.style.left = yer.x.toFixed(0) + "px";
    chip.style.top = yer.y.toFixed(0) + "px";
    chip.classList.remove("is-show");
    clearTimeout(factT); clearTimeout(factT2);
    factT2 = setTimeout(() => chip.classList.add("is-show"), 500);
    // 4-5 saniye ekranda kalsın (müşteri talebi), sonra sessizce çekilsin
    factT = setTimeout(() => chip.classList.remove("is-show"), 5200);
  }

  /* Yerleşmiş bir yapıya tekrar dokunulursa künyesi yeniden açılır.
     Sol sütundaki okuma kartı zaten kart açıyor; burası sahnenin
     kendisine dokunmayı karşılar. */
  function factAt(clientX, clientY) {
    let best = null, bestD = Infinity;
    for (const id of placed) {
      const z = zoneScr[id];
      if (!z) continue;
      const d = Math.hypot((clientX - z.x) / z.rx, (clientY - z.y) / z.ry);
      if (d < 1.25 && d < bestD) { bestD = d; best = id; }
    }
    return best;
  }

  stage.addEventListener("pointerup", (e) => {
    if (drag || e.target.closest(".chip, .core, .ro")) return;
    const id = factAt(e.clientX, e.clientY);
    if (!id) return;
    // 2. aşamada sahneye dokunmak o yatırımın önlem panelini açar
    if (asama === 2) { fixAc(id); return; }
    const s = LEAF[id];
    if (s) { showFact(s, zoneScr[id]); Snd.lift(); }
  });

  /* ============================================================
     GERİ ALMA (02.10 revizyonu)
     · "Geri al" düğmesi son adımı geri alır (kurulum ve etki azaltma)
     · kurulmuş yatırımın tepsideki düğmesine dokunmak onu kaldırır
     · kaldırılan yatırıma BAĞLI olanlar da düşer (çimento giderse inşaat)
     Geçmiş kaydı: { tip: "kur"|"kaldir"|"onlem"|"onlemGeri", ... }
     ============================================================ */
  const gecmis = [];
  const undoBtn = $("undoBtn");
  const tazeleUndo = () => { if (undoBtn) undoBtn.hidden = gecmis.length === 0; };
  const adlar = (ids) => ids.map((id) => (LEAF[id] ? LEAF[id].name : id)).join(", ");

  /* `ids` kaldırılırsa koşulu bozulacak diğer kurulu yatırımlar,
     keşif sırasıyla (önce doğrudan bağlılar) */
  function bagimlilar(ids) {
    const kalan = new Set(placed);
    ids.forEach((id) => kalan.delete(id));
    const dusen = [];
    let degisti = true;
    while (degisti) {
      degisti = false;
      for (const leaf of LEAVES) {
        if (kalan.has(leaf.id) && engel(leaf, kalan)) {
          kalan.delete(leaf.id); dusen.push(leaf.id); degisti = true;
        }
      }
    }
    return dusen;
  }

  /* tek yatırımı sahneden indir — kayıt tutmaz, toplu işlemin parçası */
  function kaldirTek(id) {
    if (!placed.has(id)) return;
    placed.delete(id);
    const L = layerOf[id];
    if (L) { L.classList.remove("is-on", "is-ghost"); L.style.removeProperty("--ghost"); }
    healOf[id]?.classList.remove("is-on");
    // yerleşirken eklenen zerreler de çekilir — dünya küçülünce hava da sakinleşir
    motes.splice(0, Math.min(motes.length, Math.round(10 + (placed.size / LEAVES.length) * 22)));
    if (!reduce && zoneScr[id]) ring("255,196,160", 0.7, 0.5, zoneScr[id]);
  }

  /* toplu kaldırma: sonrası tek seferde tazelenir */
  function kaldirToplu(ids) {
    ids.slice().reverse().forEach(kaldirTek);   // önce bağlılar, sonra kendisi
    if (ids.length) Snd.back();
    if (factSahibi && ids.includes(factSahibi)) $("factchip").classList.remove("is-show");
    tazeleOkumalar();
    tazeleCipler();
    updateProgress();
  }

  /* kullanıcı kurulu bir yatırımın düğmesine dokundu */
  function kaldirKullanici(id) {
    if (asama !== 1 || !placed.has(id)) return;
    lastInput = performance.now();
    const ids = [id, ...bagimlilar([id])];
    kaldirToplu(ids);
    gecmis.push({ tip: "kaldir", ids });
    tazeleUndo();
    const s = LEAF[id];
    uyar(`${s.name} kaldırıldı`, s,
      ids.length > 1 ? `Bağlı oldukları için ${adlar(ids.slice(1))} da kaldırıldı.`
                     : "Geri getirmek için “Geri al”a dokunun.");
  }

  /* son adımı geri al */
  function geriAl() {
    const k = gecmis.pop();
    tazeleUndo();
    if (!k) return;
    lastInput = performance.now();
    if (k.tip === "kur") {
      const ids = [...k.ids, ...bagimlilar(k.ids)];
      kaldirToplu(ids);
    } else if (k.tip === "kaldir") {
      // önkoşullar önce: kaldırma sırasının tersi
      k.ids.forEach((id) => LEAF[id] && commit(LEAF[id], { kayit: false, sessiz: true }));
    } else if (k.tip === "onlem") {
      onlemGeri(k.id, k.oid, { kayit: false });
    } else if (k.tip === "onlemGeri") {
      const o = onlemleri(k.id).find((x) => x.id === k.oid);
      if (o) onlemUygula(k.id, o, null, { kayit: false });
    }
  }
  undoBtn?.addEventListener("click", geriAl);

  let factSahibi = null;

  function commit(sector, { kayit = true, sessiz = false } = {}) {
    if (placed.has(sector.id)) return;
    placed.add(sector.id);
    if (kayit) { gecmis.push({ tip: "kur", ids: [sector.id] }); tazeleUndo(); }
    if (sector.id === "hava") havaT0 = performance.now() / 1000 + 3;
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

    /* kamera dalışı: sahne kısa süre bölgeye yaklaşır, sonra geri açılır.
       Geri alma ile geri getirilen yatırımda dalış ve künye yok (sessiz). */
    const z = zoneScr[sector.id];
    if (z && !reduce && !sessiz) {
      scene.style.transformOrigin = `${z.px}% ${z.py}%`;
      scene.classList.add("is-punch");
      clearTimeout(punchT);
      punchT = setTimeout(() => scene.classList.remove("is-punch"), 2100);
    }
    if (!sessiz) showFact(sector, z);

    if (!reduce && sessiz) {
      if (z) ring(rgbOf(sector.color), 0.8, 0.6, z);
      seedMotes(Math.round(10 + (placed.size / LEAVES.length) * 22));
    } else if (!reduce) {
      const rgb = rgbOf(sector.color);
      ring("182,255,138", 1.5, 1);
      setTimeout(() => ring(rgb, 1.15, 0.85), 110);
      setTimeout(() => ring(rgb, 0.85, 0.6), 240);
      const step = placed.size / LEAVES.length;          // sona doğru şiddetlenir
      burst(Math.round(46 + step * 60), rgb);
      burst(Math.round(18 + step * 30), "255,255,255");
      seedMotes(Math.round(10 + step * 22));
      // parlama: yalnızca opaklığı değişen bir perde (filter tüm sahneyi yeniden birleştiriyordu)
      if (z) { flash.style.setProperty("--fx", z.px + "%"); flash.style.setProperty("--fy", z.py + "%"); }
      flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.28 }, { opacity: 0 }],
        { duration: 620, easing: "cubic-bezier(.16,1,.3,1)" });
    }

    if (!sessiz) showMilestone(placed.size);

    const chip = chipOf[sector.id];
    if (chip) { chip.classList.add("is-placed"); chip.style.visibility = ""; }
    tazeleOkumalar();
    tazeleCipler();

    updateProgress();
  }

  function updateProgress() {
    if (asama === 2) { azaltimIlerleme(); return; }
    const n = placed.size, total = LEAVES.length, p = n / total;
    setBloom();
    gaugeFill.style.width = (p * 100).toFixed(1) + "%";
    gaugeNum.textContent = Math.round(p * 100) + "%";
    gauge.setAttribute("aria-valuenow", Math.round(p * 100));
    trayCount.innerHTML = `<b>${n}</b> / ${total}`;

    const co2 = [...placed].reduce((a, id) => a + (ETKI[id] || 0), 0);
    carbonVal.textContent = "−%" + co2;
    carbonBox.classList.toggle("is-good", co2 > 0);

    core.classList.toggle("is-full", n === total);
    if (n === 0) {
      trayHint.textContent = "Bir yatırımı seç, ışıyan bölgesine bırak";
      coreLabel.textContent = "Buraya bırak";
    } else if (n < total) {
      trayHint.textContent = `${total - n} yatırım daha — dünya ${Math.round(p * 100)}% hazır`;
      coreLabel.textContent = "Buraya bırak";
    } else {
      trayHint.textContent = "Dünya tamamlandı · geri almak için bir yatırıma dokunabilirsin";
    }
    // 02.10: dünya tamamlanınca ekran kapanmaz; ziyaretçi bakar, hazır
    // olunca "Devam" ile etki azaltma sayfasına geçer. Tepsi açık kalır
    // ki son anda da geri alınabilsin.
    ileriGoster(n === total ? "devam" : null);
  }

  /* İLERİ düğmesi: 1. aşamada "Devam", 2. aşamada "Bitir" */
  const ileriBtn = $("ileriBtn");
  let ileriMod = null;
  function ileriGoster(mod) {
    if (mod === ileriMod) return;
    ileriMod = mod;
    if (!ileriBtn) return;
    if (!mod) {
      ileriBtn.classList.remove("is-show");
      setTimeout(() => { if (!ileriMod) ileriBtn.hidden = true; }, 400);
      return;
    }
    $("ileriEye").textContent = mod === "devam" ? "Dünya tamamlandı" : "Tüm önlemler alındı";
    $("ileriTxt").textContent = mod === "devam" ? "Devam" : "Bitir";
    ileriBtn.hidden = false;
    requestAnimationFrame(() => ileriBtn.classList.add("is-show"));
    if (mod === "devam") Snd.done();
  }
  ileriBtn?.addEventListener("click", () => {
    const mod = ileriMod;
    ileriGoster(null);
    if (mod === "devam") showPhase2();
    else if (mod === "bitir") showDidYou();
  });

  /* ============================================================
     2. AŞAMA — ETKİ AZALTMA
     "Şimdi dünyayı kurduk, etkileri azaltma vakti."  (26.09 · D)

     Önlem listeleri sunumdaki tablodan birebir gelir:
     assets/data/mitigation.js
     ============================================================ */
  const AZALTIM = window.LIMAK_AZALTIM || {};
  const uygulanan = new Set();        // "port:elek" biçiminde anahtarlar
  const fixCipOf = {};
  let asama = 1, acikFix = null, sonBilgi = null;

  /* Yenilenebilir üretim yapan yatırımlar azaltımın KENDİSİdir;
     onlara ayrıca önlem uygulanmaz (mitigation.js · _KAYNAK). */
  const onlemleri = (id) => (AZALTIM[id] && AZALTIM[id].onlemler) || [];
  const azaltilabilir = () => LEAVES.filter((l) => placed.has(l.id) && onlemleri(l.id).length);
  const toplamOnlem = () => azaltilabilir().reduce((a, l) => a + onlemleri(l.id).length, 0);

  /* Bir yatırımın kalan etkisi: 100'den alınan önlemler düşülür.
     Sıfıra inmez — hiçbir tesisin izi tamamen silinmez, dürüst olan bu. */
  function kalanEtki(id) {
    const a = AZALTIM[id];
    if (!a || !a.onlemler) return 0;
    const dus = a.onlemler.reduce(
      (t, o) => t + (uygulanan.has(id + ":" + o.id) ? o.dus : 0), 0);
    return Math.max(0, a.etki - dus);
  }

  function azaltimCipi(leaf) {
    const id = leaf.id, a = AZALTIM[id] || {}, n = onlemleri(id).length;
    const b = document.createElement("button");
    b.className = "chip chip--fix";
    b.style.setProperty("--c", leaf.color);
    b.dataset.fix = id;
    b.type = "button";
    b.setAttribute("aria-label", n ? `${leaf.name} — ${n} önlem` : `${leaf.name} — azaltım kaynağı`);
    b.innerHTML = `${ikon(leaf.icon)}
      <span class="chip__name">${leaf.name}</span>
      <span class="chip__sub">${n ? `<b class="chip__done">0</b>/${n} önlem` : "Azaltım kaynağı"}</span>
      <span class="chip__meter" aria-hidden="true"><i></i></span>`;
    if (!n) b.classList.add("is-kaynak");
    b.addEventListener("click", () => fixAc(id));
    fixCipOf[id] = b;
    return b;
  }

  function onlemCipi(id, o) {
    const anahtar = id + ":" + o.id;
    const b = document.createElement("button");
    b.className = "fix";
    b.type = "button";
    b.innerHTML = `<span class="fix__top">
        <b class="fix__ad">${o.ad}</b>
        <span class="fix__dus tabular">−${o.dus}</span></span>
      <span class="fix__en">${o.en}</span>
      <span class="fix__not">${o.not}</span>
      <span class="fix__tik" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="3.4" stroke-linecap="round"
        stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg></span>
      <span class="fix__geri" aria-hidden="true">geri almak için dokun</span>`;
    b.dataset.k = anahtar;
    b.classList.toggle("is-on", uygulanan.has(anahtar));
    // 02.10: alınmış önleme tekrar dokunmak onu geri alır
    b.addEventListener("click", () =>
      uygulanan.has(anahtar) ? onlemGeri(id, o.id) : onlemUygula(id, o, b));
    return b;
  }
  /* açık paneldeki kartı durumla eşitle (geri alma paneli kapalıyken de olur) */
  function tazeleFixKart(anahtar) {
    const b = document.querySelector(`.fix[data-k="${anahtar}"]`);
    if (b) b.classList.toggle("is-on", uygulanan.has(anahtar));
  }

  function fixAc(id) {
    const panel = $("fixpanel");
    if (acikFix === id) { fixKapat(); return; }
    const s = LEAF[id], a = AZALTIM[id];
    if (!s || !a) return;
    acikFix = id;
    panel.style.setProperty("--c", s.color);
    $("fixTitle").innerHTML = `${s.name}<span>${s.sub}</span>`;
    const rail = $("fixRail");
    if (a.kaynak) {
      rail.classList.add("is-kaynak");
      rail.innerHTML = `<p class="fix__kaynak"><b>${a.baslik}</b>${a.metin}</p>`;
    } else {
      rail.classList.remove("is-kaynak");
      rail.replaceChildren(...a.onlemler.map((o) => onlemCipi(id, o)));
    }
    fixOlcek(id);
    panel.hidden = false;
    fixYerlestir(panel, id);
    requestAnimationFrame(() => { panel.classList.add("is-open"); measure(); });
    trayRail.querySelectorAll(".chip--fix").forEach((c) =>
      c.classList.toggle("is-open", c.dataset.fix === id));
    Snd.lift();
  }

  /* Önlem paneli (02.10): panel artık ilgili yatırımı örtmez. Adaylar:
     tepsinin üstü veya üst şeridin altı × çipe hizalı / sol / orta / sağ.
     Tepside çipe hizalı alt konum tercih edilir; yatırım oradaysa panel
     yukarı ya da yana kayar. Hizalı değilse ok işareti gizlenir. */
  function fixYerlestir(panel, id) {
    const z = zoneScr[id], cip = fixCipOf[id];
    hizala(panel, cip);                          // ölçü ve varsayılan konum
    panel.classList.remove("is-ust", "is-oksuz");
    if (!z) return;
    const p = panel.getBoundingClientRect();
    const w = p.width, h = p.height;
    const { ust, alt } = uiSinir();
    const c = cip ? cip.getBoundingClientRect() : { left: innerWidth / 2, width: 0 };
    const merkez = c.left + c.width / 2, kenar = 14;
    const xHizali = Math.max(kenar, Math.min(merkez - w / 2, innerWidth - w - kenar));
    const xs = [xHizali, kenar, (innerWidth - w) / 2, innerWidth - w - kenar];
    const ys = [[alt - h, 0], [ust, 0.35]];             // tepsinin üstü | üst şeridin altı
    let en = null;
    for (const [y, tercih] of ys) for (const x of xs) {
      const s = kutuPuani(x, y, w, h, z, id) + tercih + Math.abs(x - xHizali) * 0.0004;
      if (!en || s < en.s) en = { x, y, s, ustte: y === ust };
    }
    panel.style.left = en.x.toFixed(0) + "px";
    panel.style.bottom = (innerHeight - en.y - h).toFixed(0) + "px";
    const okKonum = merkez - en.x;
    const oklu = !en.ustte && okKonum > 24 && okKonum < w - 24;
    panel.style.setProperty("--arrow", okKonum.toFixed(0) + "px");
    panel.classList.toggle("is-ust", en.ustte);
    panel.classList.toggle("is-oksuz", !oklu);
  }

  function fixKapat() {
    const panel = $("fixpanel");
    acikFix = null;
    panel.classList.remove("is-open");
    setTimeout(() => { if (!acikFix) { panel.hidden = true; measure(); } }, 320);
    trayRail.querySelectorAll(".chip--fix").forEach((c) => c.classList.remove("is-open"));
  }
  $("fixX")?.addEventListener("click", fixKapat);
  document.addEventListener("pointerdown", (e) => {
    if (!acikFix) return;
    if (e.target.closest("#fixpanel, .chip--fix")) return;
    fixKapat();
  }, true);
  addEventListener("resize", () => { if (acikFix) fixYerlestir($("fixpanel"), acikFix); });

  /* panel başlığındaki kalan-etki ölçeri */
  function fixOlcek(id) {
    const k = onlemleri(id).length ? kalanEtki(id) : 0;
    $("fixFill").style.width = k + "%";
    $("fixNum").textContent = onlemleri(id).length ? "kalan etki %" + k : "—";
  }

  function onlemUygula(id, o, btn, { kayit = true } = {}) {
    const anahtar = id + ":" + o.id;
    if (uygulanan.has(anahtar)) return;
    uygulanan.add(anahtar);
    if (kayit) { gecmis.push({ tip: "onlem", id, oid: o.id }); tazeleUndo(); }
    tazeleFixKart(anahtar);
    Snd.drop();

    const s = LEAF[id], z = zoneScr[id];
    if (!reduce) {
      const rgb = rgbOf(s.color);
      rotaAt(id, rgb);                       // müşterinin istediği "dijital rota"
      if (z) { ring(rgb, 1.2, 0.9, z); burst(26, rgb, z); }
    }
    if (o.bilgi) sonBilgi = { s, o };        // final kartı buradan beslenir
    pusTazele();
    fixOlcek(id);
    tazeleFixCipler();
    tazeleOkumalar();
    azaltimIlerleme();
  }

  /* önlemi geri al — etkisi sahneden çekilir, kalan etki geri yükselir */
  function onlemGeri(id, oid, { kayit = true } = {}) {
    const anahtar = id + ":" + oid;
    if (!uygulanan.has(anahtar)) return;
    uygulanan.delete(anahtar);
    lastInput = performance.now();
    if (kayit) { gecmis.push({ tip: "onlemGeri", id, oid }); tazeleUndo(); }
    tazeleFixKart(anahtar);
    Snd.back();
    if (!reduce && zoneScr[id]) ring("255,196,160", 0.8, 0.55, zoneScr[id]);
    if (sonBilgi && sonBilgi.s.id === id && sonBilgi.o.id === oid) {
      // final kartı geri alınmış bir karara dayanmasın: kalanların sonuncusu
      sonBilgi = null;
      for (const k of uygulanan) {
        const [i, o] = k.split(":");
        const ob = onlemleri(i).find((x) => x.id === o);
        if (ob && ob.bilgi) sonBilgi = { s: LEAF[i], o: ob };
      }
    }
    if (acikFix === id) fixOlcek(id);
    pusTazele();
    tazeleFixCipler();
    tazeleOkumalar();
    azaltimIlerleme();
  }

  function tazeleFixCipler() {
    for (const leaf of LEAVES) {
      const c = fixCipOf[leaf.id];
      if (!c || !c.isConnected) continue;
      const liste = onlemleri(leaf.id);
      if (!liste.length) continue;
      const n = liste.filter((o) => uygulanan.has(leaf.id + ":" + o.id)).length;
      const d = c.querySelector(".chip__done");
      if (d) d.textContent = n;
      const m = c.querySelector(".chip__meter i");
      if (m) m.style.width = 100 - kalanEtki(leaf.id) + "%";
      c.classList.toggle("is-placed", n === liste.length);
    }
  }

  function azaltimIlerleme() {
    const hepsi = toplamOnlem(), n = uygulanan.size;
    const p = hepsi ? n / hepsi : 1;
    gaugeFill.style.width = (p * 100).toFixed(1) + "%";
    gaugeNum.textContent = Math.round(p * 100) + "%";
    gauge.setAttribute("aria-valuenow", Math.round(p * 100));
    trayCount.innerHTML = `<b>${n}</b> / ${hepsi}`;

    const liste = azaltilabilir();
    const kalan = liste.length
      ? Math.round(liste.reduce((a, l) => a + kalanEtki(l.id), 0) / liste.length)
      : 0;
    carbonVal.textContent = "%" + kalan;
    carbonBox.classList.toggle("is-good", n > 0);

    trayHint.textContent = n === 0
      ? "Bir yatırıma dokun, önlemini seç"
      : n < hepsi
        ? `${hepsi - n} önlem daha — kalan etki ortalama %${kalan}`
        : "Tüm önlemler alındı · geri almak için bir önleme dokunabilirsin";

    // 02.10: tamamlanınca kendiliğinden geçmez; "Bitir" düğmesi çıkar
    ileriGoster(hepsi && n >= hepsi ? "bitir" : null);
  }

  function showPhase2() {
    const P = $("phase2");
    P.hidden = false;
    requestAnimationFrame(() => P.classList.add("is-show"));
    Snd.done();
  }

  function startPhase2() {
    asama = 2;
    gecmis.length = 0; tazeleUndo();   // geri alma artık önlemler için
    const P = $("phase2");
    P.classList.remove("is-show");
    setTimeout(() => (P.hidden = true), 520);
    document.body.classList.add("is-asama2");
    dalKapat();
    tray.classList.remove("is-empty");
    core.classList.remove("is-full");
    $("carbonLbl").textContent = "Kalan etki";
    trayRail.replaceChildren(
      ...LEAVES.filter((l) => placed.has(l.id)).map(azaltimCipi));
    tazeleFixCipler();
    tazeleOkumalar();
    azaltimIlerleme();
    measure();
    pusKur();
    setTimeout(pusTazele, 700);        // her yatırımın izi yavaşça belirir
  }
  $("phase2Btn")?.addEventListener("click", startPhase2);

  /* 2. aşamanın finali: müşterinin sunumdaki "DID YOU KNOW" sayfası */
  function showDidYou() {
    const el = $("didyou");
    if (!el.hidden) return;
    const D = window.LIMAK_BUNU_BILIYOR_MUYDUNUZ || {};
    $("didyouEye").textContent = D.baslik || "Bunu biliyor muydunuz?";
    $("didyouPick").textContent = sonBilgi ? `${sonBilgi.s.name} · ${sonBilgi.o.ad}` : "";
    $("didyouTxt").textContent = sonBilgi ? sonBilgi.o.bilgi : (D.varsayilan || "");
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-show"));
    Snd.done();
  }
  $("didyouBtn")?.addEventListener("click", () => {
    const el = $("didyou");
    el.classList.remove("is-show");
    setTimeout(() => { el.hidden = true; showFinale(); }, 420);
  });

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

    /* 2. aşamayı da başa al */
    asama = 1; sonBilgi = null;
    gecmis.length = 0; tazeleUndo();
    ileriGoster(null);
    pusKap.replaceChildren();
    for (const id of Object.keys(pusOf)) delete pusOf[id];
    uygulanan.clear();
    fixKapat();
    Object.keys(fixCipOf).forEach((k) => delete fixCipOf[k]);
    document.body.classList.remove("is-asama2");
    $("phase2").hidden = true; $("phase2").classList.remove("is-show");
    $("didyou").hidden = true; $("didyou").classList.remove("is-show");
    $("carbonLbl").textContent = "Karbon";
    buildTray();

    rings.length = 0; sparks.length = 0; motes.length = 0; rotalar.length = 0;
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
    tazeleOkumalar();
    // 02.10: uçuşan zerreler yapıldıkça çıkar — ilk ekranda yok
    updateProgress();
  }

  /* ============================================================
     KLAVYE + BOŞTA SIFIRLAMA
     ============================================================ */
  document.addEventListener("keydown", (e) => {
    lastInput = performance.now();
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key === "Backspace" || (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); geriAl(); return;
    }
    if (e.key.toLowerCase() === "r") { reset(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= LEAVES.length) { const L = LEAVES[n - 1]; if (!engel(L)) commit(L); }
  });
  ["pointerdown", "pointermove", "wheel"].forEach((ev) =>
    addEventListener(ev, () => (lastInput = performance.now()), { passive: true }));
  setInterval(() => {
    if (placed.size > 0 && performance.now() - lastInput > 150000) reset();
  }, 10000);

  /* AKICILIK: maskeler ve fotoğraflar açılışta bir kez çözülür (decode).
     Aksi hâlde her yatırımın maskesi ilk göründüğü anda çözülüyor ve o
     kare gecikiyor ya da katman bir an eksik çiziliyordu. */
  function onCoz() {
    const urls = new Set();
    const cssUrl = (v) => { const m = /url\(["']?(.*?)["']?\)/.exec(v || ""); return m && m[1]; };
    document.querySelectorAll(".sector, .heal").forEach((el) => {
      const cs = el.style;
      [cssUrl(cs.backgroundImage), cssUrl(cs.maskImage || cs.webkitMaskImage)]
        .forEach((u) => u && urls.add(u));
    });
    let i = 0;
    const list = [...urls];
    // tek seferde değil, boşta kalan zamanlarda sırayla: açılış takılmasın
    const next = () => {
      if (i >= list.length) return;
      const im = new Image();
      im.decoding = "async";
      im.src = list[i++];
      (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).finally(() => {
        if (window.requestIdleCallback) requestIdleCallback(next, { timeout: 300 });
        else setTimeout(next, 30);
      });
      onCozulen.push(im);           // referans tutulur ki önbellekten düşmesin
    };
    next();
  }
  const onCozulen = [];

  const rgbOf = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1).slice(i, i + 2), 16)).join(",");

  /* ============================================================ */
  buildLayers();
  onCoz();
  buildTray();
  buildReadouts();
  tazeleOkumalar();
  measure();
  // 02.10: uçuşan zerreler ilk ekranda yok; her yerleştirmeyle eklenir
  updateProgress();
  addEventListener("resize", measure);
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  requestAnimationFrame(drawFX);
})();
