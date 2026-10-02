/* ============================================================
   LİMAK DÜNYADA — önizleme kilidi.
   Sayfa müşteriye açılana kadar şifre ister. <head> içinde, eş zamanlı
   yüklenir: kilitliyse <html>'e "kilitli" sınıfı sayfa çizilmeden
   eklenir, harita bir an bile görünmez. Doğru şifre bu sekme kapanana
   kadar hatırlanır (sessionStorage).
   Statik sitede bu bir perde, güvenlik değildir: kaynak kod herkese
   açıktır. Şifre düz metin tutulmaz, yalnız özeti (FNV-1a) karşılaştırılır.
   Kilidi kaldırmak için harita.html'den bu betiğin satırını silmek yeter.
   ============================================================ */
(() => {
  "use strict";
  const ANAHTAR = "limak-dunyada-acik";
  const OZET = "68fe5393";                                 // "limak-dunyada|" + şifre
  const ozet = (s) => {
    let h = 0x811c9dc5;
    for (const c of new TextEncoder().encode("limak-dunyada|" + s)) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  };
  const kok = document.documentElement;
  let acik = false;
  try { acik = sessionStorage.getItem(ANAHTAR) === OZET; } catch (_) { /* depolama kapalı: her açılışta sorulur */ }
  if (acik) return;
  kok.classList.add("kilitli");

  document.addEventListener("DOMContentLoaded", () => {
    const perde = document.getElementById("kilit");
    const form = document.getElementById("kilitForm");
    const alan = document.getElementById("kilitSifre");
    const hata = document.getElementById("kilitHata");
    if (!perde || !form || !alan) { kok.classList.remove("kilitli"); return; }
    /* kilitliyken arkadaki harita klavyeyle de gezilemez */
    const arka = [...document.body.children].filter((e) => e !== perde && e.tagName !== "SCRIPT");
    arka.forEach((e) => { e.inert = true; });
    alan.focus();
    alan.addEventListener("input", () => { hata.textContent = ""; perde.classList.remove("is-hata"); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (ozet(alan.value.trim()) !== OZET) {
        hata.textContent = "Şifre hatalı. Tekrar deneyin.";
        perde.classList.remove("is-hata");
        void perde.offsetWidth;                            // sallanma her yanlışta yeniden oynasın
        perde.classList.add("is-hata");
        alan.value = "";
        alan.focus();
        return;
      }
      try { sessionStorage.setItem(ANAHTAR, OZET); } catch (_) { /* yalnız bu açılış için açılır */ }
      alan.blur();
      arka.forEach((e) => { e.inert = false; });
      perde.classList.add("is-cikis");
      setTimeout(() => kok.classList.remove("kilitli"), 600);
    });
  });
})();
