/* ============================================================
   50 YIL — zaman rayı
   Kaydır, dokun, ok tuşu. Dönem ışığı yıla göre kayar.

   Geçiş dili:
   · YIL    — kilometre sayacı: rakamlar kendi sütunlarında döner, ara
              yılların hepsinden geçerek sayar (zamanda yolculuk)
   · SAYFA  — kart bir kitap sayfası gibi sol kenarından döner; ileri
              gidince eski sayfa açılır, geri gelince önceki sayfa kapanır
   · IŞIK   — arka plandaki zerreler zamanın yönünde çizgi olup akar
   · SIĞMA  — metin taşarsa önce yazı, sonra görsel kademeli küçülür;
              her tarayıcıda, her pencere boyunda kaydırma çubuğu çıkmaz
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
  /* on yıllar — dev yılın altındaki bölüm adı */
  const BOLUM = [
    { y: 1970, ad: "1970'ler · Kuruluş" },
    { y: 1980, ad: "1980'ler · Büyüme" },
    { y: 1990, ad: "1990'lar · Çeşitlenme" },
    { y: 2000, ad: "2000'ler · Yatırım" },
    { y: 2010, ad: "2010'lar · Küresel ölçek" },
    { y: 2020, ad: "2020'ler · Gelecek" },
  ];
  const bolumOf = (y) => BOLUM.filter((b) => b.y <= y).pop().ad;

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

  /* görselleri önceden yükle: sayfa çevrilirken yeni sayfa hazır olsun */
  const imgSrc = (d) => `assets/img/tl/${d.year}-${d.sector}.jpg`;
  DATA.forEach((d) => { const im = new Image(); im.decoding = "async"; im.src = imgSrc(d); });

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

    const f = $("future");
    f.innerHTML = "";
    FUT.forEach((x, i) => {
      const e = document.createElement("span");
      e.className = "fut";
      e.style.setProperty("--f", x.color);
      // satır aralığı ray yüksekliğine göre: kısa ekranda sıkışır, taşmaz
      const ara = Math.max(18, Math.min(26, (rail.clientHeight - 36) / FUT.length));
      e.style.top = `calc(50% + ${(i - (FUT.length - 1) / 2) * ara}px)`;
      e.innerHTML = `<i></i><b>${x.label}</b><span>${x.note}</span>`;
      f.appendChild(e);
    });
  }

  /* ============================================================
     YIL — KİLOMETRE SAYACI
     ============================================================ */
  const odo = $("odo");
  const COLS = 4;
  let odoVal = DATA[0].year, odoRaf = 0;

  function buildOdo() {
    odo.innerHTML = "";
    for (let i = 0; i < COLS; i++) {
      const col = document.createElement("span");
      col.className = "odo__col";
      col.style.setProperty("--i", i);
      const strip = document.createElement("span");
      strip.className = "odo__strip";
      for (let d = 0; d <= 10; d++) {             // 0..9 ve sarma için tekrar 0
        const s = document.createElement("span");
        s.className = "odo__d";
        s.textContent = d % 10;
        strip.appendChild(s);
      }
      col.appendChild(strip);
      odo.appendChild(col);
    }
    olcOdo();
    odoSet(odoVal, 0);
  }

  /* Sütun genişliği: en geniş rakamın gerçek genişliği (yazı tipine göre) */
  function olcOdo() {
    const probe = document.createElement("span");
    probe.className = "odo__d";
    probe.style.cssText = "position:absolute;visibility:hidden;width:auto;background:none;-webkit-text-stroke:0";
    odo.appendChild(probe);
    let w = 0;
    for (let d = 0; d <= 9; d++) { probe.textContent = d; w = Math.max(w, probe.getBoundingClientRect().width); }
    const fs = parseFloat(getComputedStyle(odo).fontSize) || 1;
    probe.remove();
    const cw = w / fs * 0.94;                    // hafif sıkı dizgi
    document.querySelector(".yearbig").style.setProperty("--cw", cw.toFixed(3) + "em");
  }

  /* Gerçek bir sayaç gibi: bir üst basamak, alttaki 9→0'a dönerken döner */
  function colPos(v, k) {
    const p = Math.pow(10, k);
    const base = Math.floor(v / p) % 10;
    const lower = v - Math.floor(v / p) * p;     // 0 .. p
    const frac = lower > p - 1 ? lower - (p - 1) : 0;
    return base + frac;
  }

  function odoSet(v, hiz) {
    const cols = odo.children;
    for (let i = 0; i < COLS; i++) {
      const k = COLS - 1 - i;
      const strip = cols[i].firstChild;
      strip.style.transform = `translate3d(0, ${(-colPos(v, k)).toFixed(4)}em, 0)`;
      // hareket bulanıklığı: sütunun kendi hızına göre (üst basamaklar yavaş)
      const blur = Math.min(3.2, Math.abs(hiz) / Math.pow(10, k) * 0.045);
      strip.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
    }
  }

  function odoGo(hedef) {
    cancelAnimationFrame(odoRaf);
    const from = odoVal, fark = Math.abs(hedef - from);
    if (reduce || fark < 0.001) { odoVal = hedef; odoSet(hedef, 0); return; }
    const sure = Math.min(1600, 560 + fark * 26);
    const t0 = performance.now();
    let sonV = from, sonT = t0;
    odo.classList.add("is-rolling");
    odo.classList.remove("is-settle");
    const adim = (now) => {
      const t = Math.min(1, (now - t0) / sure);
      // yavaş başla, hızlan, yumuşak dur — zaman makinesi
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const v = from + (hedef - from) * e;
      const dt = Math.max(8, now - sonT) / 1000;
      odoSet(v, (v - sonV) / dt);
      sonV = v; sonT = now; odoVal = v;
      if (t < 1) { odoRaf = requestAnimationFrame(adim); return; }
      odoVal = hedef;
      odoSet(hedef, 0);
      odo.classList.remove("is-rolling");
      void odo.offsetWidth;
      odo.classList.add("is-settle");
    };
    odoRaf = requestAnimationFrame(adim);
  }

  /* ============================================================
     SIĞDIRMA — her tarayıcıda, her pencerede kaydırmasız
     ============================================================ */
  function sigdir(card) {
    const body = card.querySelector(".card__body");
    const tasar = () => body.scrollHeight > body.clientHeight + 1;
    let fit = 1, media = 1;
    const F = (v) => card.style.setProperty("--fit", (fit = +v.toFixed(2)));
    const M = (v) => card.style.setProperty("--media", (media = +v.toFixed(2)));
    F(1); M(1);
    card.style.removeProperty("--media-h");
    card.classList.remove("is-nomedia");
    body.classList.remove("is-scroll");
    // 1) yazı biraz küçülür
    while (tasar() && fit > 0.9) F(fit - 0.02);
    // 2) görsel alçalır
    while (tasar() && media > 0.45) M(media - 0.05);
    // 3) yazı biraz daha küçülür
    while (tasar() && fit > 0.8) F(fit - 0.02);
    // 4) çok kısa pencere: görsel tamamen çekilir, yazı okunur kalır
    if (tasar()) { M(0); card.classList.add("is-nomedia"); F(0.9); while (tasar() && fit > 0.74) F(fit - 0.02); }
    // 5) son çare: kaydırma
    if (tasar()) { body.classList.add("is-scroll"); return; }
    // 6) BOŞ ALAN: metin kısa kaldıysa fotoğraf büyüyüp alanı doldurur
    //    (en çok kartın yarısı) — metinle istatistik arasında boşluk kalmaz
    if (media >= 1) {
      body.classList.add("is-olc");
      const son = body.lastElementChild;
      const dolu = son.offsetTop + son.offsetHeight + parseFloat(getComputedStyle(body).paddingBottom);
      body.classList.remove("is-olc");
      const bos = body.clientHeight - dolu;
      if (bos > 16) {
        const mEl = card.querySelector(".card__media");
        const h = mEl.offsetHeight;
        const hedef = Math.min(h + bos - 6, card.clientHeight * 0.5);
        if (hedef > h + 4) card.style.setProperty("--media-h", Math.round(hedef) + "px");
      }
    }
  }

  /* ============================================================
     SAYFA ÇEVİRME
     ============================================================ */
  let aktifCevirme = null;

  function cevirmeyiBitir() {
    if (!aktifCevirme) return;
    aktifCevirme.forEach((a) => { try { a.finish(); } catch (e) { /* yoksay */ } });
    aktifCevirme = null;
  }

  function sayfaKopyasi(card, book) {
    const br = book.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const k = card.cloneNode(true);
    k.removeAttribute("id");
    k.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    k.classList.remove("is-reveal", "is-quick");
    k.classList.add("page");
    // eski sayfa kendi döneminin renginde kalır (yeni yılın rengini almaz)
    Object.entries(eskiRenk).forEach(([ad, v]) => { if (v) k.style.setProperty(ad, v); });
    Object.assign(k.style, {
      left: cr.left - br.left + "px", top: cr.top - br.top + "px",
      width: cr.width + "px", height: cr.height + "px",
    });
    return k;
  }

  function katman(sinif, ref, book) {
    const br = book.getBoundingClientRect(), r = ref.getBoundingClientRect();
    const e = document.createElement("span");
    e.className = sinif;
    Object.assign(e.style, {
      left: r.left - br.left + "px", top: r.top - br.top + "px",
      width: r.width + "px", height: r.height + "px",
    });
    return e;
  }

  const EASE_SAYFA = "cubic-bezier(.62,.02,.28,1)";
  const SURE_SAYFA = 1050;

  function sayfaCevir(yon, uygula) {
    const card = $("card"), book = $("book");
    cevirmeyiBitir();
    if (reduce) { uygula(); sigdir(card); return; }

    const eski = sayfaKopyasi(card, book);
    const anims = [];

    if (yon > 0) {
      /* İLERİ — eski sayfa sol kenarından kalkıp açılır, alttan yenisi görünür */
      uygula(); sigdir(card);
      const shade = document.createElement("span"); shade.className = "page__shade";
      const gloss = document.createElement("span"); gloss.className = "page__gloss";
      eski.append(shade, gloss);
      const golge = katman("cast", card, book);
      book.append(golge, eski);
      card.classList.remove("is-reveal"); void card.offsetWidth; card.classList.add("is-reveal");

      // sayfa opak kalır: 90°'yi geçince arka yüzü gizlenir (backface),
      // saydamlık hilesi yok — alttaki sayfanın yazısı içinden okunmaz
      anims.push(eski.animate([
        { transform: "rotateY(0deg)" },
        { transform: "rotateY(-96deg)" },
      ], { duration: SURE_SAYFA, easing: EASE_SAYFA, fill: "forwards" }));
      anims.push(shade.animate([{ opacity: 0 }, { opacity: 0.9 }],
        { duration: SURE_SAYFA, easing: "ease-in", fill: "forwards" }));
      anims.push(gloss.animate([
        { opacity: 0, backgroundPosition: "120% 0" },
        { opacity: 1, backgroundPosition: "40% 0", offset: 0.45 },
        { opacity: 0, backgroundPosition: "-40% 0" },
      ], { duration: SURE_SAYFA, easing: "ease-out", fill: "forwards" }));
      anims.push(golge.animate([
        { opacity: 0.75, transform: "scaleX(1)" },
        { opacity: 0, transform: "scaleX(0.25)" },
      ], { duration: SURE_SAYFA * 0.85, easing: "ease-out", fill: "forwards" }));
      anims[0].onfinish = () => { eski.remove(); golge.remove(); };
    } else {
      /* GERİ — önceki sayfa soldan kapanarak üstüne gelir */
      eski.classList.add("page--under");
      book.insertBefore(eski, card);
      uygula(); sigdir(card);
      const shade = document.createElement("span"); shade.className = "page__shade";
      card.appendChild(shade);
      const golge = katman("cast", card, book);
      book.insertBefore(golge, card);
      card.style.zIndex = "3";

      // -89°: sayfa ilk karede tam kenarından görünür, boş bekleme olmaz
      anims.push(card.animate([
        { transform: "rotateY(-89deg)" },
        { transform: "rotateY(0deg)" },
      ], { duration: SURE_SAYFA, easing: EASE_SAYFA }));
      anims.push(shade.animate([{ opacity: 0.9 }, { opacity: 0 }],
        { duration: SURE_SAYFA, easing: "ease-out", fill: "forwards" }));
      anims.push(golge.animate([
        { opacity: 0, transform: "scaleX(0.25)" },
        { opacity: 0.7, transform: "scaleX(1)", offset: 0.8 },
        { opacity: 0, transform: "scaleX(1)" },
      ], { duration: SURE_SAYFA, easing: "ease-in", fill: "forwards" }));
      anims[0].onfinish = () => { eski.remove(); golge.remove(); shade.remove(); card.style.zIndex = ""; };
    }
    aktifCevirme = anims;
    anims[0].addEventListener("finish", () => { if (aktifCevirme === anims) aktifCevirme = null; });
  }

  /* ============================================================
     GEÇİŞ
     ============================================================ */
  let cur = -1, sonGo = 0;
  let eskiRenk = {};                            // çevrilen sayfanın dönem renkleri

  function icerik(i) {
    const d = DATA[i];
    const sector = ERAS[d.sector] || { label: d.sector, color: "#8ce563" };
    $("cardSector").textContent = sector.label;
    $("cardYear").textContent = `${String(i + 1).padStart(2, "0")} · ${d.year}`;
    $("cardTitle").textContent = d.title;
    $("cardSub").textContent = d.subtitle;
    $("cardText").textContent = d.body;
    $("cardStats").innerHTML = (d.stats || [])
      .map((s) => `<li><b>${s.v}</b><span>${s.l}</span></li>`).join("");
    const img = $("cardImg");
    const src = imgSrc(d);
    img.alt = d.title;
    img.onerror = () => { img.removeAttribute("src"); img.classList.remove("is-ready"); };
    if (img.getAttribute("src") !== src) {
      img.classList.remove("is-ready");
      img.onload = () => img.classList.add("is-ready");
      img.src = src;
      if (img.complete && img.naturalWidth) img.classList.add("is-ready");
    }
  }

  function go(i, instant) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    const prev = cur;
    cur = i;
    const d = DATA[i];
    const sector = ERAS[d.sector] || { label: d.sector, color: "#8ce563" };
    const era = eraFor(d.year);
    const now = performance.now();
    const hizli = now - sonGo < 380;            // sürükleme / hızlı tuş
    sonGo = now;

    /* dönem ışığı */
    const root = document.body;
    eskiRenk = {};
    ["--era-a", "--era-b", "--era-c", "--sector"].forEach((ad) => { eskiRenk[ad] = root.style.getPropertyValue(ad); });
    root.style.setProperty("--era-a", era.a);
    root.style.setProperty("--era-b", era.b);
    root.style.setProperty("--era-c", era.c);
    root.style.setProperty("--sector", sector.color);

    /* yıl */
    $("yearBig").textContent = d.year;
    if (prev < 0 || instant) { odoVal = d.year; odoSet(d.year, 0); } else odoGo(d.year);
    const lab = $("yearLabel");
    const yeniBolum = bolumOf(d.year);
    if (lab.textContent !== yeniBolum) {
      lab.textContent = yeniBolum;
      if (prev >= 0 && !reduce) { lab.classList.remove("is-in"); void lab.offsetWidth; lab.classList.add("is-in"); }
    }

    /* sayfa */
    const card = $("card");
    if (prev < 0 || instant) {
      icerik(i); sigdir(card);
    } else if (hizli || reduce) {
      cevirmeyiBitir();
      icerik(i); sigdir(card);
      if (!reduce) { card.classList.remove("is-quick", "is-reveal"); void card.offsetWidth; card.classList.add("is-quick"); }
    } else {
      sayfaCevir(i > prev ? 1 : -1, () => icerik(i));
    }

    /* zaman yönünde ışık akışı */
    if (prev >= 0 && !reduce) warp = Math.sign(i - prev) * Math.min(1, 0.45 + Math.abs(d.year - DATA[prev].year) / 24);

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

  let drag = null;
  rail.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".node")) return;
    drag = { x: e.clientX, i: cur, moved: 0 };
    try { rail.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
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

  /* kartı yana kaydırarak sayfa çevirme (dokunmatik kiosk) */
  let swipe = null;
  $("book").addEventListener("pointerdown", (e) => { swipe = { x: e.clientX, y: e.clientY }; });
  $("book").addEventListener("pointerup", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1));
  });

  let wheelLock = 0;
  addEventListener("wheel", (e) => {
    const now = performance.now();
    if (now - wheelLock < 420) return;
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
     PARÇACIKLAR — dönem rengiyle akan ışık; geçişte zaman yönünde akar
     ============================================================ */
  const cv = $("eraPx");
  const ctx = cv.getContext("2d");
  let W = 0, HH = 0, dpr = 1, dust = [], flash = [], warp = 0;

  function size() {
    const b = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = b.width; HH = b.height;
    cv.width = W * dpr; cv.height = HH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust = [];
    const n = reduce ? 0 : Math.round(Math.min(160, (W * HH) / 8500));
    for (let i = 0; i < n; i++) {
      dust.push({
        x: Math.random() * W, y: Math.random() * HH,
        vx: 0.05 + Math.random() * 0.28, vy: (Math.random() - 0.5) * 0.14,
        r: 0.5 + Math.random() * 1.6, a: 0.06 + Math.random() * 0.34, z: 0.4 + Math.random() * 0.6,
      });
    }
    buildRail();
    olcOdo();
    if (cur >= 0) { center(cur); sigdir($("card")); }
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
    warp *= 0.94;
    if (Math.abs(warp) < 0.004) warp = 0;
    for (const p of dust) {
      const hiz = p.vx + warp * 26 * p.z;
      p.x += hiz; p.y += p.vy;
      if (p.x > W + 40) { p.x = -40; p.y = Math.random() * HH; }
      else if (p.x < -40) { p.x = W + 40; p.y = Math.random() * HH; }
      if (p.y < -6) p.y = HH + 6; else if (p.y > HH + 6) p.y = -6;
      const iz = Math.abs(warp) * 60 * p.z;
      if (iz > 2) {
        // zaman yönünde çizgi: arkası sönük, önü parlak
        const g = ctx.createLinearGradient(p.x - Math.sign(warp) * iz, p.y, p.x, p.y);
        g.addColorStop(0, `rgba(${R},${G},${B},0)`);
        g.addColorStop(1, `rgba(${R},${G},${B},${Math.min(0.9, p.a * 1.4)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = p.r * 1.1;
        ctx.beginPath(); ctx.moveTo(p.x - Math.sign(warp) * iz, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${R},${G},${B},${p.a * 0.42})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.fill();
      }
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
  buildOdo();
  size();
  addEventListener("resize", size);
  go(0, true);
  // yazı tipleri geç yüklenirse ölçüleri yenile (sütun genişliği, sığma)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { olcOdo(); sigdir($("card")); });
  requestAnimationFrame(frame);

  // denetim kancası (QA): belirli bir kayda anında git
  window.__tl = {
    go: (i) => go(i, true), git: (i) => go(i), sigdir: () => sigdir($("card")), N,
    odo: (v, hiz) => { cancelAnimationFrame(odoRaf); odo.classList.add("is-rolling"); odoSet(v, hiz || 0); },
  };
})();
