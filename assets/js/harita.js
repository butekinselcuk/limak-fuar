/* ============================================================
   LİMAK DÜNYADA — arayüz: imleçler, kümeler, bilgi kartı,
   geri gezinme ve "Dünyaya dön", boşta otomatik tur, WebGL yoksa düz harita.
   Küreyle yalnız window.LimakKure arayüzü üzerinden konuşur.
   ============================================================ */
(() => {
  "use strict";
  const VERI = window.LIMAK_DUNYA || { noktalar: [] };
  const NOKTALAR = VERI.noktalar;                          // batıdan doğuya: tur sırası
  const NOKTA = Object.fromEntries(NOKTALAR.map((n) => [n.id, n]));
  const M = window.LimakHaritaMat;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
  const param = new URLSearchParams(location.search);

  const SEKTOR = {
    havalimani: { ad: "Havalimanı", ikon: "M2 16l20-6-3.4-2.4-5 1.4-7-5.6-2 .7 4 6-4.6 1.3-2.6-2-1.4.5 2 4.4Z" },
    insaat: { ad: "İnşaat", ikon: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M10.5 12h3" },
    altyapi: { ad: "Altyapı", ikon: "M2 16h20M5 16V9M19 16V9M2 12c4-5 16-5 20 0M9 16v-3M15 16v-3" },
    liman: { ad: "Liman", ikon: "M12 3v13M12 16c-4 0-7-3-7-7M12 16c4 0 7-3 7-7M3 20h18M8 6h8" },
    enerji: { ad: "Enerji", ikon: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z" },
    "elektrik-dagitim": { ad: "Elektrik Dağıtımı", ikon: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z" },
    cimento: { ad: "Çimento", ikon: "M4 20h16M6 20V10l6-4 6 4v10M9 20v-5h6v5M3 10l9-6 9 6" },
    turizm: { ad: "Turizm", ikon: "M3 21h18M4 21V8l8-4 8 4v13M9 21v-5h6v5M8 12h2M14 12h2" },
    gida: { ad: "Gıda", ikon: "M6 3v8a3 3 0 0 0 6 0V3M9 11v10M16 3c-1.5 2-2 4-2 6s.7 3 2 3 2-1 2-3-.5-4-2-6ZM18 12v9" },
    teknoloji: { ad: "Teknoloji", ikon: "M4 6h16v10H4zM8 20h8M12 16v4" },
  };
  const DURUM = { isletmede: "İşletmede", insaat: "Yapım aşamasında", tamamlandi: "Tamamlandı", sozlesme: "Sözleşme imzalandı" };
  const BOSTA_MS = (Number(param.get("bosta")) || 30) * 1000;
  const KART_MS = 7000;

  /* ---------- küre ya da yedek ---------- */
  const tuval = $("kure");
  let kure = null;
  if (window.LimakKure && window.LimakKure.destekli()) {
    try { kure = window.LimakKure.kur(tuval, { zemin: window.LIMAK_DOKU_ZEMIN, surum: "1" }); }
    catch (e) { console.error("LimakKure başlatılamadı, düz harita:", e); kure = null; }
  }
  window.LimakHarita = { kure };                           // tarayıcı testleri için

  /* ---------- imleçler ---------- */
  const kap = $("imlecler");
  const imlec = {};
  for (const n of NOKTALAR) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "imlec";
    b.dataset.id = n.id;
    b.setAttribute("aria-label", `${n.ad} — ${n.ulke}`);
    b.innerHTML = `<i class="imlec__nokta"></i><span class="imlec__ad">${esc(n.sehir)}</span>`;
    b.addEventListener("click", (e) => { e.stopPropagation(); sec(n.id); });
    kap.appendChild(b);
    imlec[n.id] = b;
  }
  /* tekerlek imlecin ya da rozetin üstündeyken de haritayı yakınlaştırır */
  kap.addEventListener("wheel", (e) => {
    if (!kure) return;
    e.preventDefault();
    tuval.dispatchEvent(new WheelEvent("wheel", e));
  }, { passive: false });
  const kumeler = [];
  function kumeDugmesi(i) {
    if (kumeler[i]) return kumeler[i];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kume";
    b.innerHTML = `<span class="kume__daire"></span><span class="kume__ad"></span>`;
    b.addEventListener("click", (e) => { e.stopPropagation(); kumeAc(b._uyeler || []); });
    kap.appendChild(b);
    return (kumeler[i] = b);
  }

  let secili = null;
  const kls = (el, ad, acik) => { if (el["_c" + ad] !== acik) { el["_c" + ad] = acik; el.classList.toggle(ad, acik); } };
  const stil = (el, k, v) => { if (el["_" + k] !== v) { el["_" + k] = v; el.style[k] = v; } };
  function goster(id) {
    const n = NOKTA[id], b = imlec[id], p = n._p;
    kls(b, "is-gorunur", true);
    stil(b, "transform", `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`);
    stil(b, "opacity", p.on < 0.2 ? (p.on / 0.2).toFixed(2) : "");
  }

  /* Her karede: izdüşüm → kümeleme → yerleşim. Dünya görünümünde önce
     ülke ülke toplanır (Türkiye tek imleç), sonra üst üste binen
     imleçler birleşir; orta irtifada yalnız yakınlar; yakında hiç. */
  function yerlestir() {
    const d = kure.durum();
    const gorunen = [];
    for (const n of NOKTALAR) {
      n._p = kure.ekran(n.lat, n.lon);
      if (n._p.on > 0.04) gorunen.push({ id: n.id, x: n._p.x, y: n._p.y });
      else kls(imlec[n.id], "is-gorunur", false);
    }
    /* seçili nokta tek başına gösterilir; kalanlar kümelenmeye devam eder */
    const tekSecili = gorunen.filter((o) => o.id === secili);
    const kalan = tekSecili.length ? gorunen.filter((o) => o.id !== secili) : gorunen;
    let ogeler = kalan;
    if (d.irtifa > 1.2) {
      const ulke = {};
      for (const o of kalan) (ulke[NOKTA[o.id].ulke] = ulke[NOKTA[o.id].ulke] || []).push(o);
      ogeler = Object.values(ulke).map((l) => ({
        uyeler: l.map((o) => o.id),
        x: l.reduce((s, o) => s + o.x, 0) / l.length,
        y: l.reduce((s, o) => s + o.y, 0) / l.length,
      }));
    }
    const esik = d.irtifa > 1.2 ? 26 : d.irtifa > 0.25 ? 34 : 0;
    let k = 0;
    const kutular = [];                                    // yerleşmiş küme rozetleri ve etiketleri
    const cakisir = (a) => kutular.some((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
    const tekler = [], adlar = [];
    for (const o of tekSecili) { goster(o.id); tekler.push(o.id); }
    for (const g of M.kumele(ogeler, esik)) {
      if (g.uyeler.length === 1) { g.uyeler.forEach((id) => { goster(id); tekler.push(id); }); continue; }
      for (const id of g.uyeler) kls(imlec[id], "is-gorunur", false);
      const b = kumeDugmesi(k++);
      b._uyeler = g.uyeler;
      kls(b, "is-gorunur", true);
      stil(b, "transform", `translate3d(${g.x.toFixed(1)}px, ${g.y.toFixed(1)}px, 0)`);
      const ulkeler = new Set(g.uyeler.map((id) => NOKTA[id].ulke));
      kutular.push({ x: g.x - 21, y: g.y - 21, w: 42, h: 42 });
      adlar.push({ g, b, ad: ulkeler.size === 1 ? [...ulkeler][0] : "" });
    }
    for (const id of tekler) { const p = NOKTA[id]._p; kutular.push({ x: p.x - 10, y: p.y - 10, w: 20, h: 20 }); }   // tek imleç noktaları da yer kaplar
    for (const { g, b, ad: tamAd } of adlar) {               // rozetler yerleşti; ülke adı çakışmıyorsa yazılır
      const kutu = { x: g.x + 27, y: g.y - 12, w: tamAd.length * 9 + 24, h: 24 };
      const ad = tamAd && !cakisir(kutu) ? tamAd : "";
      if (ad) kutular.push(kutu);
      const imza = g.uyeler.length + "|" + ad;
      if (b._imza !== imza) {
        b._imza = imza;
        b.firstChild.textContent = String(g.uyeler.length);
        b.lastChild.textContent = ad;
        b.setAttribute("aria-label", `${tamAd || "Bölge"} — ${g.uyeler.length} yatırım`);
      }
    }
    for (; k < kumeler.length; k++) kls(kumeler[k], "is-gorunur", false);
    /* etiketler: seçili önce, sonra batıdan doğuya; çakışan etiket gizlenir */
    const etiket = d.irtifa < 0.9;
    const sira = tekler.slice().sort((a, b) => (b === secili) - (a === secili));
    const etiketli = new Set();
    for (const id of sira) {
      if (!etiket && id !== secili) continue;
      const p = NOKTA[id]._p, ad = NOKTA[id].sehir;
      const kutu = { x: p.x + 15, y: p.y - 12, w: ad.length * 9 + 24, h: 24 };
      if (id !== secili && cakisir(kutu)) continue;
      kutular.push(kutu);
      etiketli.add(id);
    }
    for (const n of NOKTALAR) kls(imlec[n.id], "is-etiket", etiketli.has(n.id));
    kls(document.body, "is-yakin", d.irtifa < 1.5);
    if (gecmis.length && !secili && !kure.ucuyor() && dunyada(d)) gecmis.length = 0;   // dünyaya elle varıldı
    kls(document.body, "is-geri", gecmis.length > 0 && !dunyada(gecmis[gecmis.length - 1]));
  }

  /* ---------- seçim, uçuş, kart ---------- */
  let isNo = 0;
  async function sec(id, { turdan = false } = {}) {
    const n = NOKTA[id];
    if (!n) return false;
    if (!turdan) turDur();
    const no = ++isNo;
    if (!turdan && secili === null) kaydet();              // kart kapanınca bu görünüme dönülür
    kartKapat();
    secili = id;
    for (const b of Object.values(imlec)) b.classList.toggle("is-secili", b.dataset.id === id);
    if (!kure) {
      for (const b of Object.values(imlec)) b.classList.toggle("is-etiket", b.dataset.id === id);
      yedekYakinlas(n); kartAc(n); return true;
    }
    kure.bolgeYukle(n.bolge);
    const d = kure.durum(), e = kure.ekran(n.lat, n.lon);
    if (Math.hypot(e.x - tuval.clientWidth / 2, e.y - tuval.clientHeight / 2) < 8
        && Math.abs(d.irtifa / kure.YAKIN - 1) <= 0.05) { kartAc(n); return true; }   // zaten ortada ve yakında: uçuşsuz aç
    const tamam = await kure.ucus(n.lat, n.lon, kure.YAKIN);
    if (!tamam || no !== isNo) return false;              // iptal ya da sonra başka biri seçildi
    kartAc(n);
    return true;
  }
  function kumeAc(uyeler) {
    turDur();
    if (!kure || !uyeler.length) return;
    if (secili === null) kaydet();
    birak();
    /* düz harita: üyelerin enlem/boylam kutusu ekranın ~%60'ını doldurur; bölgeler nokta seçilince yüklenir */
    const ps = uyeler.map((id) => NOKTA[id]);
    const enlem = ps.map((p) => p.lat), boylam = ps.map((p) => p.lon);
    const dLat = Math.max(...enlem) - Math.min(...enlem), dLon = Math.max(...boylam) - Math.min(...boylam);
    const oran = tuval.clientHeight / Math.max(1, tuval.clientWidth);
    const irtifa = Math.max(dLat, dLon * oran) / 60 / 0.6;
    kure.ucus((Math.max(...enlem) + Math.min(...enlem)) / 2, (Math.max(...boylam) + Math.min(...boylam)) / 2,
      Math.min(1.2, Math.max(kure.YAKIN, irtifa)));
  }
  function kartAc(n) {
    const s = SEKTOR[n.sektor] || { ad: n.sektor, ikon: SEKTOR.insaat.ikon };
    const foto = $("kartFoto");
    foto.classList.toggle("is-ikon", !n.foto);
    foto.innerHTML = n.foto
      ? `<img src="${esc(n.foto)}" alt="" decoding="async">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${s.ikon}"/></svg>`;
    $("kartEye").textContent = `${s.ad} · ${n.ulke}`;
    $("kartBaslik").textContent = n.ad;
    $("kartEn").textContent = n.ad_en || "";
    $("kartMeta").innerHTML = `<span>${esc(n.sehir)}</span><span>${esc(n.yil)}</span>` +
      `<b class="durum durum--${esc(n.durum)}">${esc(DURUM[n.durum] || "")}</b>`;
    $("kartRakam").innerHTML = (n.rakamlar || [])
      .map((r) => `<li><b>${esc(r.v)}</b><span>${esc(r.l)}</span></li>`).join("");
    $("kartOzet").textContent = n.ozet;
    const k = $("kart");
    k.hidden = false;
    requestAnimationFrame(() => k.classList.add("is-acik"));
  }
  function kartKapat() {
    const k = $("kart");
    k.classList.remove("is-acik");
    setTimeout(() => { if (!k.classList.contains("is-acik")) k.hidden = true; }, 420);
  }

  /* ---------- geri gezinme ----------
     Nokta seçmeden ya da kümeye yakınlaşmadan önceki görünüm yığına girer.
     Kartı kapatmak, "Geri", Esc ve Backspace bir adım geri uçar;
     "Dünyaya dön" yığını boşaltır. Tur seçimleri yığına girmez. */
  const gecmis = [];
  const dunyada = (g) => g.irtifa >= kure.DUNYA * 0.95;
  const ayni = (a, b) => Math.abs(a.irtifa / b.irtifa - 1) < 0.05
    && Math.abs(a.lat - b.lat) < b.irtifa && Math.abs(a.lon - b.lon) < b.irtifa;
  function kaydet() {
    if (!kure) return;
    const d = kure.durum();
    if (!gecmis.length || !ayni(gecmis[gecmis.length - 1], d)) gecmis.push(d);
  }
  function birak() {                                       // kart kapanır, seçim düşer, bekleyen uçuşun kartı açılmaz
    isNo++;
    kartKapat();
    secili = null;
    for (const b of Object.values(imlec)) b.classList.remove("is-secili");
  }
  function dunyayaUc() {
    const d = kure.durum();
    kure.ucus(Math.max(-20, Math.min(45, d.lat)), d.lon, kure.DUNYA);
  }
  function geri() {
    turDur();
    const kartVardi = secili !== null;
    birak();
    if (!kure) { yedekSifirla(); return; }
    /* kart yoksa şu anki görünümle aynı kayıtlar atlanır: her basış görünür bir adım olsun */
    if (!kartVardi) while (gecmis.length && ayni(gecmis[gecmis.length - 1], kure.durum())) gecmis.pop();
    const g = gecmis.pop();
    if (g) kure.ucus(g.lat, g.lon, g.irtifa);
    else dunyayaUc();
  }
  $("kartX").addEventListener("click", () => geri());
  $("geriBtn").addEventListener("click", () => geri());
  $("donBtn").addEventListener("click", () => {
    turDur();
    birak();
    gecmis.length = 0;
    if (!kure) { yedekSifirla(); return; }
    dunyayaUc();
  });
  window.addEventListener("keydown", (e) => {
    if ((e.key !== "Escape" && e.key !== "Backspace") || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (secili === null && !document.body.classList.contains("is-yakin")) return;   // dünya görünümünde geri yok
    e.preventDefault();
    geri();
  });

  /* ---------- boşta otomatik tur ---------- */
  let sonDokunus = performance.now(), tur = false;
  function turDur() {
    if (!tur) return;
    tur = false;
    document.body.classList.remove("is-tur");
    if (kure) kure.iptal();                                // görünüm o noktada kalır
  }
  const dokunuldu = () => { sonDokunus = performance.now(); turDur(); };
  for (const t of ["pointerdown", "wheel", "keydown"]) window.addEventListener(t, dokunuldu, { capture: true, passive: true });
  async function turBaslat() {
    if (tur || !NOKTALAR.length) return;
    tur = true;
    gecmis.length = 0;                                     // turdan çıkınca geri: dünya görünümü
    document.body.classList.add("is-tur");
    try {
      let i = Math.max(0, NOKTALAR.findIndex((n) => n.id === secili) + 1);
      while (tur) {
        const n = NOKTALAR[i++ % NOKTALAR.length];
        const ok = await sec(n.id, { turdan: true });
        if (!tur) break;
        if (!ok) { await bekle(50); continue; }
        await bekle(KART_MS);
      }
    } finally {                                            // sec fırlatsa da tur durumda takılı kalmaz
      tur = false;
      document.body.classList.remove("is-tur");
    }
  }
  setInterval(() => {
    if (document.documentElement.classList.contains("kilitli")) { sonDokunus = performance.now(); return; }   // önizleme kilidi açılmadan tur yok
    if (!tur && performance.now() - sonDokunus > BOSTA_MS) turBaslat();
  }, 1000);

  /* ---------- düz harita (WebGL yok) ---------- */
  let yedekHarita = null;
  const yuzde = (n) => [((n.lon + 180) / 360 * 100).toFixed(3) + "%", ((90 - n.lat) / 180 * 100).toFixed(3) + "%"];
  function yedekKur() {
    document.body.classList.add("is-yedek");
    tuval.hidden = true;
    const y = $("yedek");
    y.hidden = false;
    y.innerHTML = `<div class="yedek__harita" id="yedekHarita"><img src="${window.LIMAK_DOKU_ZEMIN || ""}" alt=""></div>`;
    yedekHarita = $("yedekHarita");
    for (const n of NOKTALAR) {
      const b = imlec[n.id];
      const [x, yy] = yuzde(n);
      b.classList.add("is-gorunur");
      b.style.left = x;
      b.style.top = yy;
      yedekHarita.appendChild(b);
    }
  }
  /* Seçili nokta serbest alanın ortasına gelir: yatayda kartın solu,
     dar ekranda kartın üstü. Görüntü kenarları açıkta kalmaz. */
  function yedekYakinlas(n) {
    const vw = innerWidth, vh = innerHeight;
    const W = Math.min(vw, 2 * vh), H = W / 2;
    const dar = matchMedia("(max-width: 820px), (max-aspect-ratio: 4/5)").matches;
    const kartPay = Math.min(440, vw - 32) + Math.max(16, Math.min(40, vw * 0.024)) + 24;
    const cx = dar ? vw / 2 : (vw - kartPay) / 2;
    const cy = dar ? (68 + vh * 0.58) / 2 : vh / 2;
    const olcek = Math.max(4, vh / H, vw / W);
    const sol = (vw - W) / 2, ust = (vh - H) / 2;
    const fx = (n.lon + 180) / 360, fy = (90 - n.lat) / 180;
    const kisit = (v, kucuk, buyuk) => Math.min(buyuk, Math.max(kucuk, v));
    const tx = kisit(cx - sol - olcek * fx * W, vw - olcek * W - sol, -sol);
    const ty = kisit(cy - ust - olcek * fy * H, vh - olcek * H - ust, -ust);
    yedekHarita.style.transformOrigin = "0 0";
    yedekHarita.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${olcek.toFixed(3)})`;
    yedekHarita.style.setProperty("--ters", (1 / olcek).toFixed(3));
    document.body.classList.add("is-yakin");
  }
  function yedekSifirla() {
    for (const b of Object.values(imlec)) b.classList.remove("is-etiket");
    yedekHarita.style.transform = "";
    yedekHarita.style.setProperty("--ters", "1");
    document.body.classList.remove("is-yakin");
  }

  if (kure) kure.kareda(yerlestir);
  else yedekKur();
})();
