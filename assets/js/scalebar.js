/* Ölçek şeridini doldurur — world ve index ortak kullanır. */
(() => {
  "use strict";
  const data = window.LIMAK_SCALE || [];
  if (!data.length) return;
  for (const id of ["introScale", "homeScale"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.replaceChildren(...data.map((x, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", i);
      const b = document.createElement("b");
      b.textContent = x.v;
      const s = document.createElement("span");
      s.textContent = x.l;
      li.append(b, s);
      return li;
    }));
  }
})();
