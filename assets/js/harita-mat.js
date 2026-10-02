/* ============================================================
   LİMAK DÜNYADA — harita matematiği: küre yönleri, uçuş eğrileri
   (küre ve düz harita), kümeleme (DOM ve three.js bilmez)
   Tarayıcıda window.LimakHaritaMat, Node'da module.exports.
   Eksen düzeni three.js SphereGeometry ile aynı: y kuzey kutbu,
   boylam 0 → +x, boylam 90 → −z; eşdikdörtgen doku u=0 → −180°.
   ============================================================ */
(function (kok) {
  "use strict";
  const D2R = Math.PI / 180;
  const sinir = (v, a, b) => Math.min(b, Math.max(a, v));

  function birim(v) {
    const n = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / n, v[1] / n, v[2] / n];
  }
  const nokta = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  /** enlem/boylam (derece) → birim vektör */
  function yon(lat, lon) {
    const f = (lon + 180) * D2R, t = (90 - lat) * D2R;
    return [-Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)];
  }

  /** birim vektör → { lat, lon } (boylam −180…180) */
  function enlemBoylam(v) {
    const [x, y, z] = birim(v);
    const lat = 90 - Math.acos(sinir(y, -1, 1)) / D2R;
    let lon = Math.atan2(z, -x) / D2R - 180;
    lon = ((lon + 540) % 360) - 180;
    return { lat, lon };
  }

  /** iki vektör arasındaki açı (radyan) */
  const aci = (a, b) => Math.acos(sinir(nokta(birim(a), birim(b)), -1, 1));

  /** küresel ara değer */
  function slerp(a, b, t) {
    const w = aci(a, b);
    if (w < 1e-9) return birim(a);
    const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
    return birim([a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb]);
  }

  const yavasla = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Google Earth benzeri uçuş: yön küre üzerinde kayar, irtifa yolun
      ortasında yükselir (uzak atlayışta daha çok), sonra hedefe iner.
      Uçlardan biri dünya görünümündeyse tümsek olmaz. */
  function ucusPlani(bas, son, dunyaIrtifasi = 2.6) {
    const a = yon(bas.lat, bas.lon), b = yon(son.lat, son.lon);
    const w = aci(a, b);
    const sure = sinir(1.9 + w * 1.15, 2.0, 3.2);
    const yuksek = Math.max(bas.irtifa, son.irtifa);
    const tumsek = Math.min(1.25, w * 0.85) * (1 - Math.min(1, yuksek / dunyaIrtifasi));
    return {
      sure,
      at(t) {
        const u = sinir(t, 0, 1), e = yavasla(u);
        const irtifa = bas.irtifa + (son.irtifa - bas.irtifa) * e + tumsek * Math.sin(Math.PI * u);
        if (u === 0) return { lat: bas.lat, lon: bas.lon, irtifa };
        if (u === 1) return { lat: son.lat, lon: son.lon, irtifa };
        const ll = enlemBoylam(slerp(a, b, e));
        return { lat: ll.lat, lon: ll.lon, irtifa };
      },
    };
  }

  /** Düz harita uçuşu (Google Haritalar'daki uzaklaş-kay-yakınlaş): merkez
      yumuşak eğriyle doğrusal kayar; irtifa logaritmik ara değerle değişir
      ve uzak atlayışta yolun ortasında yükselir (iki uç birlikte görünecek
      kadar). Uçlar tam. */
  function duzUcusPlani(bas, son) {
    const kos = Math.cos(((bas.lat + son.lat) / 2) * D2R);
    const d = Math.hypot((son.lon - bas.lon) * kos, son.lat - bas.lat);        // derece
    const l0 = Math.log(bas.irtifa), l1 = Math.log(son.irtifa);
    const orta = Math.exp((l0 + l1) / 2);
    const tepe = Math.min(3, (d * 0.6) / 60);                                  // ortada istenen irtifa
    const m = Math.max(1, tepe / orta);
    const sure = sinir(1.6 + 0.35 * Math.log2(1 + d / (60 * Math.min(bas.irtifa, son.irtifa)))
      + 0.15 * Math.abs(l1 - l0), 1.8, 3.0);
    return {
      sure,
      at(t) {
        const u = sinir(t, 0, 1);
        if (u === 0) return { lat: bas.lat, lon: bas.lon, irtifa: bas.irtifa };
        if (u === 1) return { lat: son.lat, lon: son.lon, irtifa: son.irtifa };
        const e = yavasla(u);
        return {
          lat: bas.lat + (son.lat - bas.lat) * e,
          lon: bas.lon + (son.lon - bas.lon) * e,
          irtifa: Math.exp(l0 + (l1 - l0) * e) * (1 + (m - 1) * Math.sin(Math.PI * u)),
        };
      },
    };
  }

  /** Ekranda yakın imleçleri açgözlü kümeler (sırayı korur). Öğe tek bir
      'id' ya da önceden gruplanmış 'uyeler' taşıyabilir. */
  function kumele(ogeler, esik) {
    const kumeler = [];
    for (const o of ogeler) {
      const ids = o.uyeler ? o.uyeler.slice() : [o.id];
      let k = null;
      for (const c of kumeler) if (Math.hypot(c.x - o.x, c.y - o.y) < esik) { k = c; break; }
      if (k) {
        const n0 = k.uyeler.length, n1 = n0 + ids.length;
        k.x = (k.x * n0 + o.x * ids.length) / n1;
        k.y = (k.y * n0 + o.y * ids.length) / n1;
        k.uyeler.push(...ids);
      } else {
        kumeler.push({ uyeler: ids, x: o.x, y: o.y });
      }
    }
    return kumeler;
  }

  /** Noktaları birlikte gösterecek görünüm: merkez = ortalama yön; irtifa,
      en uzak noktanın açısal uzaklığı görüş yarı genişliğinin 'doluluk'
      oranı kadar olacak biçimde. */
  function kapsam(noktalar, { yarimGorus = 17.5, enAz = 0.05, enCok = 2.6, doluluk = 0.6 } = {}) {
    const vs = noktalar.map((p) => yon(p.lat, p.lon));
    const m = birim(vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]));
    const r = Math.max(...vs.map((v) => aci(m, v)));
    const irtifa = r / (Math.tan(yarimGorus * D2R) * doluluk);
    return { ...enlemBoylam(m), irtifa: sinir(irtifa, enAz, enCok) };
  }

  /** Noktanın kameradan görünürlüğü: > 0 ön yüz, 0 ufuk, < 0 arka yüz */
  function onYuz(yonNokta, kamera) {
    const d = birim([kamera[0] - yonNokta[0], kamera[1] - yonNokta[1], kamera[2] - yonNokta[2]]);
    return nokta(yonNokta, d);
  }

  const api = { yon, enlemBoylam, aci, slerp, ucusPlani, duzUcusPlani, kumele, kapsam, onYuz };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else kok.LimakHaritaMat = api;
})(typeof window !== "undefined" ? window : globalThis);
