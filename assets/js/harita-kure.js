/* ============================================================
   LİMAK DÜNYADA — düz dünya haritası (adı tarihsel: ilk sürüm küreydi;
   dosya ve global adları harita-kure.js / window.LimakKure / kure arayüz
   kararlılığı için korunur). three.js r149, klasik betik.
   Tüm dünya tek ekranda: eşdikdörtgen NASA haritası (enlem −58…84,
   boylam −180…180) dik izdüşüm kamerayla; ince enlem-boylam ağı, bölge
   parçaları, uçuş, sürükleme / yakınlaştırma, enlem-boylam → ekran.
   Dünya düzlemi derece birimindedir: x = boylam, y = enlem.
   irtifa = görünen dikey açıklık (derece) / 60.
   DOM'dan yalnız tuvali bilir; imleçler ve kart harita.js'tedir.
   ============================================================ */
(function () {
  "use strict";
  const M = window.LimakHaritaMat;
  const YAKIN = 0.06;              // yatırım görünümü: dikey 3,6° (16:9'da 3,6° × 6,4°)
  const EN_AZ = 0.04;              // en yakın irtifa
  const GUNEY = -58, KUZEY = 84;   // harita bandı (Antarktika dışarıda)
  const BANT = KUZEY - GUNEY;      // 142°
  const ORTA = (KUZEY + GUNEY) / 2;           // bandın orta enlemi: 13
  const ERIME = 9;                 // üst/alt kenarın lacivert zemine eridiği şerit (derece, bandın ~%6'sı)
  const KENAR_YAKIN = 0.18;        // YAKIN'da parça kenar yumuşatması (derece); her yatırımda ekran
                                   // kenarı parçanın ≥ 0,196° içinde → yakın görüş kenardan kenara keskin
  const AG_OPAKLIK = 0.07;         // 30°'lik enlem-boylam ağı: seçilir ama göze batmaz
  const sinir = (v, a, b) => Math.min(b, Math.max(a, v));
  const yumusak = (x) => { const u = sinir(x, 0, 1); return u * u * (3 - 2 * u); };
  // enlemin harita bandı içindeki saydamlığı: kenar şeridinde 1 → 0 (yavaş başlayan erime;
  // parlak buz bile lacivertte sert kenar bırakmaz)
  const erime = (lat) => (yumusak((lat - GUNEY) / ERIME) * yumusak((KUZEY - lat) / ERIME)) ** 2;

  function destekli() {
    if (new URLSearchParams(location.search).get("webgl") === "0") return false;   // yedek görünüm testi
    try {
      const c = document.createElement("canvas");
      return !!(window.THREE && window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  /* zeminin dikey saydamlık haritası; zemin uv'si v = (enlem + 90) / 180
     olduğundan doku tüm 180°'yi kapsar, yalnız bant içi dolu */
  function erimeDokusu() {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 1024;
    const g = c.getContext("2d"), im = g.createImageData(4, 1024);
    for (let y = 0; y < 1024; y++) {
      const a = Math.round(erime(90 - ((y + 0.5) / 1024) * 180) * 255);
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = a;
        im.data[i + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
    return new THREE.CanvasTexture(c);
  }

  /* bölge parçasının kenarı: ortası tam, kenara doğru yumuşakça söner — yüksek
     çözünürlüklü parça zeminle sınır çizgisi bırakmadan birleşir. Yumuşatma payı
     (uv, eksen başına) her karede irtifaya göre verilir: yakında dar (ekran kenarı
     parçanın tam opak içinde kalır), uzaklaştıkça geniş (dikdörtgen seçilmez). */
  function kenarYumusat(mat, pay) {
    mat.onBeforeCompile = (s) => {
      s.uniforms.uKenar = pay;
      s.fragmentShader = "uniform vec2 uKenar;\n" + s.fragmentShader.replace("#include <alphamap_fragment>",
        "vec2 kenarK = min(vUv, 1.0 - vUv) / uKenar;\n\tdiffuseColor.a *= smoothstep(0.0, 1.0, min(kenarK.x, kenarK.y));");
    };
  }

  /* 30°'de bir enlem-boylam çizgileri; uçları harita kenarıyla birlikte söner */
  function agGeometrisi() {
    const p = [], r = [];
    const ekle = (x0, y0, x1, y1) => {
      p.push(x0, y0, 0, x1, y1, 0);
      r.push(1, 1, 1, erime(y0), 1, 1, 1, erime(y1));
    };
    for (let lon = -150; lon <= 150; lon += 30)            // ±180 harita kenarıdır: çizilmez
      for (let lat = GUNEY; lat < KUZEY; lat += 1) ekle(lon, lat, lon, lat + 1);
    for (let lat = -30; lat <= 60; lat += 30) ekle(-180, lat, 180, lat);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(r, 4));
    return geo;
  }

  function kur(tuval, { zemin, bolgeKok = "assets/img/dunya/", surum = "1" } = {}) {
    tuval.style.touchAction = "none";       // dokunmatik sürükleme / kıskaç sayfayı kaydırmasın
    const ciz = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true, powerPreference: "high-performance" });
    ciz.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    ciz.outputEncoding = THREE.sRGBEncoding;
    ciz.setClearColor(0x000000, 0);         // saydam: sayfanın lacivert degradesi görünür
    const sahne = new THREE.Scene();
    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    kamera.position.z = 5;                  // −z yönüne, haritaya dik bakar

    const yukleyici = new THREE.TextureLoader();
    const anizo = ciz.capabilities.getMaxAnisotropy();
    const doku = (url, tamam, hata) => {
      const t = yukleyici.load(url, tamam, undefined, hata);
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = anizo;                 // mipmap varsayılan (LinearMipmapLinear): titreşim yok
      return t;
    };

    // zemin: doğal renk (ışıksız), uv enlem bandına yeniden eşlenir; doku çözülünce yumuşakça belirir
    let zeminHazir = false;
    const zg = new THREE.PlaneGeometry(360, BANT, 1, 1);
    const zp = zg.attributes.position, zuv = zg.attributes.uv;
    for (let i = 0; i < zuv.count; i++) zuv.setY(i, (zp.getY(i) + ORTA + 90) / 180);
    const zeminMat = new THREE.MeshBasicMaterial({
      map: doku(zemin, () => { zeminHazir = true; }), alphaMap: erimeDokusu(),
      transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    });
    const zeminMesh = new THREE.Mesh(zg, zeminMat);
    zeminMesh.position.set(0, ORTA, 0);
    zeminMesh.visible = false;
    sahne.add(zeminMesh);

    // ağ: parçaların da üstünde (parça dikdörtgeni ağda delik açmaz); yakında söner
    const agMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x72c2ef).convertSRGBToLinear(), vertexColors: true,
      transparent: true, opacity: AG_OPAKLIK, depthTest: false, depthWrite: false,
    });
    const ag = new THREE.LineSegments(agGeometrisi(), agMat);
    ag.position.z = 0.02;
    ag.renderOrder = 2;
    sahne.add(ag);

    // bölge parçaları: haritanın hemen üstünde, irtifa inince belirir.
    // GPU belleği için sahnede en çok EN_COK_PARCA parça durur (şimdiki + sönmekte olan önceki).
    const EN_COK_PARCA = 2;
    const parcalar = {};
    const sira = [];                      // isteme sırası, en eski önde
    const istek = {};
    function parcaEkle(ad, { url, bbox }) {
      return new Promise((ok) => {
        const [l0, b0, l1, t1] = bbox;
        const harita = doku(url, () => {
          // doku çözüldükten sonra kur: yarım yüklü (siyah) dikdörtgen hiç görünmez
          const geo = new THREE.PlaneGeometry(l1 - l0, t1 - b0, 1, 1);
          const mat = new THREE.MeshBasicMaterial({
            map: harita, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
          });
          const pay = { value: new THREE.Vector2(0.1, 0.1) };
          kenarYumusat(mat, pay);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.userData = { pay, en: l1 - l0, boy: t1 - b0 };
          mesh.position.set((l0 + l1) / 2, (b0 + t1) / 2, 0.01);
          mesh.renderOrder = 1;
          mesh.visible = false;
          sahne.add(mesh);
          parcalar[ad] = mesh;
          for (const eski of sira.slice()) {           // sınır: en eski isteneni at
            if (Object.keys(parcalar).length <= EN_COK_PARCA) break;
            if (eski !== ad && parcalar[eski]) parcaAt(eski);
          }
          ok(true);
        }, () => ok(false));
      });
    }
    function parcaAt(ad) {
      const m = parcalar[ad];
      sahne.remove(m);
      m.geometry.dispose();
      if (m.material.map) m.material.map.dispose();
      m.material.dispose();
      delete parcalar[ad];
      delete istek[ad];                   // sonradan istenirse yeniden kurulur
      sira.splice(sira.indexOf(ad), 1);
    }
    function bolgeYukle(ad) {
      if (!ad) return Promise.resolve(false);
      const i = sira.indexOf(ad);
      if (i >= 0) sira.splice(i, 1);
      sira.push(ad);
      if (!istek[ad]) istek[ad] = new Promise((ok) => {
        const hazir = () => {
          const k = (window.LIMAK_DOKU_BOLGE || {})[ad];
          if (k) parcaEkle(ad, k).then(ok); else ok(false);
        };
        if ((window.LIMAK_DOKU_BOLGE || {})[ad]) { hazir(); return; }
        const s = document.createElement("script");
        s.src = `${bolgeKok}bolge-${ad}.js?v=${surum}`;
        s.onload = hazir;
        s.onerror = () => ok(false);          // yoksa sessizce zemin kalır
        document.head.appendChild(s);
      });
      return istek[ad].then((v) => {
        if (!v) { delete istek[ad]; const j = sira.indexOf(ad); if (j >= 0) sira.splice(j, 1); }
        return v;
      });
    }

    // ölçü ve sınırlar
    let W = 1, H = 1, hamW = -1, hamH = -1;                     // ham: tuvalin son okunan CSS ölçüsü
    const dunya = () => Math.max(BANT, 360 / (W / H)) / 60;      // tüm bant ekrana sığar; en uzak irtifa
    /* görünüm haritanın dışına taşmaz; görünen açıklık bandı aşan eksende ortalanır.
       Her karede ve uçuş hedefi planlanmadan önce uygulanır. */
    function sinirli({ lat, lon, irtifa }) {
      const i = sinir(irtifa, EN_AZ, dunya());
      const Y = i * 60, G = (Y * W) / H;
      return {
        lat: Y >= BANT - 1e-9 ? ORTA : sinir(lat, GUNEY + Y / 2, KUZEY - Y / 2),
        lon: G >= 360 - 1e-9 ? 0 : sinir(lon, -180 + G / 2, 180 - G / 2),
        irtifa: i,
      };
    }
    // görünüm durumu; açılış: dünya görünümü (irtifa boyutla'da DUNYA olur)
    const d = { lat: ORTA, lon: 0, irtifa: Infinity };
    let ucusAn = null;
    let hiz = { x: 0, y: 0 };             // atalet (piksel / sn)
    let teker = null;                     // tekerlek yakınlaştırması: { hedef, x, y }
    function boyutla() {
      const dunyadaydi = d.irtifa >= dunya() - 1e-9;
      hamW = tuval.clientWidth; hamH = tuval.clientHeight;
      W = Math.max(1, hamW || innerWidth);
      H = Math.max(1, hamH || innerHeight);
      ciz.setSize(W, H, false);
      teker = null;
      if (dunyadaydi) d.irtifa = dunya();                       // dünya görünümünde kalır
      Object.assign(d, sinirli(d));
    }
    addEventListener("resize", boyutla);
    boyutla();

    function kameraKoy() {
      const Y = d.irtifa * 60, G = (Y * W) / H;
      kamera.left = -G / 2; kamera.right = G / 2;
      kamera.top = Y / 2; kamera.bottom = -Y / 2;
      kamera.position.x = d.lon;
      kamera.position.y = d.lat;
      kamera.updateProjectionMatrix();
    }
    // ekran (tuval pikseli) ↔ coğrafya; derece/piksel her iki eksende Y / H
    const cografi = (x, y) => {
      const k = (d.irtifa * 60) / H;
      return { lat: d.lat + (H / 2 - y) * k, lon: d.lon + (x - W / 2) * k };
    };
    const sabitle = (g, x, y) => {            // g noktasını (x, y) pikselinin altına getirir
      const k = (d.irtifa * 60) / H;
      d.lat = g.lat - (H / 2 - y) * k;
      d.lon = g.lon - (x - W / 2) * k;
    };

    // uçuş
    function iptal() {
      if (!ucusAn) return;
      const u = ucusAn;
      ucusAn = null;
      u.ok(false);
    }
    function ucus(lat, lon, irtifa) {
      if (![lat, lon, irtifa].every(Number.isFinite)) return Promise.resolve(false);
      iptal();
      hiz = { x: 0, y: 0 };
      teker = null;
      const plan = M.duzUcusPlani({ ...d }, sinirli({ lat, lon, irtifa }));   // hedef önce sınırlanır: sonda sıçrama yok
      return new Promise((ok) => { ucusAn = { plan, t0: performance.now(), ok }; });
    }

    // elle gezinme: tek parmak haritayı parmakla birebir kaydırır (bırakınca atalet);
    // iki parmak / tekerlek, parmağın / imlecin altındaki noktayı sabit tutarak yakınlaştırır
    const parmak = new Map();
    let iz = [];                          // son hareket örnekleri (atalet hızı için)
    let kiskacOldu = false;
    const yerel = (e) => {
      const r = tuval.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const ikili = () => {                 // ilk iki parmağın orta noktası ve aralığı
      const [a, b] = [...parmak.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, m: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
    };
    tuval.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;         // yalnız sol tuş sürükler
      try { tuval.setPointerCapture(e.pointerId); } catch (_) { /* yakalama iyileştirmedir */ }
      if (!parmak.size) kiskacOldu = false;
      const p = yerel(e);
      parmak.set(e.pointerId, p);
      hiz = { x: 0, y: 0 };
      teker = null;
      iz = [{ t: performance.now(), x: p.x, y: p.y }];
      iptal();
    });
    tuval.addEventListener("pointermove", (e) => {
      const once = parmak.get(e.pointerId);
      if (!once) return;
      const p = yerel(e);
      if (parmak.size >= 2) {
        kiskacOldu = true;
        const ilkIki = [...parmak.keys()].slice(0, 2).includes(e.pointerId);
        if (!ilkIki) { parmak.set(e.pointerId, p); return; }
        const a = ikili();
        parmak.set(e.pointerId, p);
        const b = ikili();
        const g = cografi(a.x, a.y);
        d.irtifa = sinir((d.irtifa * a.m) / b.m, EN_AZ, dunya());
        sabitle(g, b.x, b.y);
        Object.assign(d, sinirli(d));
        return;
      }
      parmak.set(e.pointerId, p);
      const k = (d.irtifa * 60) / H;
      d.lon -= (p.x - once.x) * k;
      d.lat += (p.y - once.y) * k;
      Object.assign(d, sinirli(d));
      const t = performance.now();
      iz.push({ t, x: p.x, y: p.y });
      while (iz.length > 2 && t - iz[0].t > 100) iz.shift();
    });
    const birak = (e) => {
      if (!parmak.has(e.pointerId)) return;
      parmak.delete(e.pointerId);
      if (parmak.size) { iz = []; return; }                 // kıskaçtan tek parmağa: sıçramasız sürer
      const t = performance.now();
      const p = yerel(e), son = iz.filter((o) => t - o.t < 100);
      if (!kiskacOldu && son.length && (p.x !== son[0].x || p.y !== son[0].y)) {
        const sure = Math.max(16, t - son[0].t) / 1000, ust = 6000;
        hiz = { x: sinir((p.x - son[0].x) / sure, -ust, ust), y: sinir((p.y - son[0].y) / sure, -ust, ust) };
      }
      iz = [];
    };
    tuval.addEventListener("pointerup", birak);
    tuval.addEventListener("pointercancel", birak);
    tuval.addEventListener("wheel", (e) => {
      e.preventDefault();
      iptal();
      hiz = { x: 0, y: 0 };
      const birim = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? H : 1;        // satır / sayfa → piksel
      const p = yerel(e);
      const once = teker ? teker.hedef : d.irtifa;
      teker = { hedef: sinir(once * Math.exp(e.deltaY * birim * 0.0035), EN_AZ, dunya()), x: p.x, y: p.y };
    }, { passive: false });

    // döngü
    const kareda = new Set();
    const okumalar = [];
    let bildirildi = false;               // bir abone hatası döngüyü öldürmez; yalnız ilki yazılır
    const bildir = (e) => { if (!bildirildi) { bildirildi = true; console.error("LimakKure:", e); } };
    let sonT = performance.now();
    function kare(simdi) {
      try { kareGovde(simdi); } catch (e) {
        bildir(e);                         // bir istisna döngüyü öldürmez: uçuş sonlanır, durum bozulduysa dünya görünümüne dönülür
        if (ucusAn) { const u = ucusAn; ucusAn = null; try { u.ok(false); } catch (_) { /* yut */ } }
        if (![d.lat, d.lon, d.irtifa].every(Number.isFinite)) { d.lat = ORTA; d.lon = 0; d.irtifa = dunya(); }
      }
    }
    function kareGovde(simdi) {
      const dt = sinir((simdi - sonT) / 1000, 0, 0.05);
      sonT = simdi;
      if (tuval.clientWidth !== hamW || tuval.clientHeight !== hamH) boyutla();   // yerleşim değişince de
      if (ucusAn) {
        const t = (simdi - ucusAn.t0) / 1000 / ucusAn.plan.sure;
        Object.assign(d, ucusAn.plan.at(Math.min(1, t)));
        if (t >= 1) { const u = ucusAn; ucusAn = null; u.ok(true); }
      } else if (teker) {
        // tekerlek: hedef irtifaya yumuşakça yaklaşır, imlecin altındaki nokta sabit
        const g = cografi(teker.x, teker.y);
        const yeni = d.irtifa * Math.pow(teker.hedef / d.irtifa, 1 - Math.exp(-dt * 14));
        d.irtifa = Math.abs(Math.log(teker.hedef / yeni)) < 0.002 ? teker.hedef : yeni;
        sabitle(g, teker.x, teker.y);
        if (d.irtifa === teker.hedef) teker = null;
      } else if (!parmak.size && (hiz.x || hiz.y)) {
        const k = (d.irtifa * 60) / H;
        const lon = d.lon - hiz.x * dt * k, lat = d.lat + hiz.y * dt * k;
        const s = sinirli({ lat, lon, irtifa: d.irtifa });
        if (s.lon !== lon) hiz.x = 0;                         // sınıra çarpan eksen durur
        if (s.lat !== lat) hiz.y = 0;
        d.lat = s.lat; d.lon = s.lon;
        const sonum = Math.exp(-dt * 3.2);
        hiz.x *= sonum; hiz.y *= sonum;
        if (Math.hypot(hiz.x, hiz.y) < 8) hiz = { x: 0, y: 0 };
      }
      Object.assign(d, sinirli(d));        // sınır her karede
      kameraKoy();
      if (zeminHazir && zeminMat.opacity < 1) {
        zeminMesh.visible = true;
        zeminMat.opacity = Math.min(1, zeminMat.opacity + dt * 2.5);
      }
      agMat.opacity = AG_OPAKLIK * yumusak((d.irtifa - 0.4) / 0.8);
      ag.visible = agMat.opacity > 0.0005;
      const hedef = d.irtifa < 0.9 ? 1 : d.irtifa > 1.4 ? 0 : (1.4 - d.irtifa) / 0.5;
      const kenarDerece = KENAR_YAKIN * (d.irtifa / YAKIN) ** 2;
      for (const m of Object.values(parcalar)) {
        m.material.opacity += (hedef - m.material.opacity) * Math.min(1, dt * 4);
        m.visible = m.material.opacity > 0.004;      // görünmezken çizim yükü yok
        const u = m.userData;
        u.pay.value.set(Math.min(0.3, kenarDerece / u.en), Math.min(0.3, kenarDerece / u.boy));
      }
      ciz.render(sahne, kamera);
      if (okumalar.length) {
        const gl = ciz.getContext(), pr = ciz.getPixelRatio(), px = new Uint8Array(4);
        for (const o of okumalar.splice(0)) {
          try {
            gl.readPixels(Math.round(o.x * pr), Math.round((H - o.y) * pr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            o.ok([px[0], px[1], px[2]]);
          } catch (e) { bildir(e); o.hata(e); }
        }
      }
      kareda.forEach((f) => { try { f(); } catch (e) { bildir(e); } });
    }
    ciz.setAnimationLoop(kare);

    // izdüşüm: imleçler için (tuval pikseli); on = görüş alanında (60 px payla) 1, değilse −1
    function ekran(lat, lon) {
      const k = H / (d.irtifa * 60);
      const x = W / 2 + (lon - d.lon) * k, y = H / 2 - (lat - d.lat) * k;
      const on = x > -60 && x < W + 60 && y > -60 && y < H + 60 ? 1 : -1;
      return { x, y, on };
    }

    return {
      get DUNYA() { return dunya(); },
      YAKIN,
      ucus, iptal, ekran, bolgeYukle,
      durum: () => ({ lat: d.lat, lon: d.lon, irtifa: d.irtifa }),
      ucuyor: () => !!ucusAn,
      kareda: (f) => { kareda.add(f); },
      piksel: (x, y) => new Promise((ok, hata) => okumalar.push({ x, y, ok, hata })),   // test kancası
      parcaSayisi: () => Object.keys(parcalar).length,                                  // test kancası
    };
  }

  window.LimakKure = { kur, destekli };
})();
