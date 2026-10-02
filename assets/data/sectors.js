/* ============================================================
   Limak yatırım ağacı — "World with Limak"
   26.09 toplantı revizyonu: alt seçenekli yeni yapı.

   VERİ KAYNAĞI: Limak Şirketler Grubu Faaliyet Raporu 2025
   (limak.com.tr/files/LimakFaaliyetRaporu2025.pdf) + sektör siteleri
   + Eylül 2026 basını. Her rakam bu belgelerde doğrulanmıştır.

   DİKKAT — elden çıkarılan varlıklar EKRANDA GÖSTERİLMEZ:
     · İstanbul Havalimanı (İGA): Limak ve MAPA payları Kalyon ve
       Cengiz'e satıldı. Limak'ın payı YOK.
     · UEDAŞ / ÇEDAŞ: Türkiye dağıtım portföyünde değil.
       Yalnızca Kosova'daki KEDS/KESCO güncel.

   Not: fetch() yerine global; sayfa file:// ile de açılabilsin.
   `children` taşıyan düğümler tepside açılır menü olur; sahneye
   yalnızca YAPRAK düğümler yerleşir.
   ============================================================ */

window.LIMAK_SECTORS = [
  {
    id: "cimento",
    name: "Çimento",
    sub: "Cement",
    color: "#cdbfa4",
    // 02.10 revizyonu: "enerji olmadan çimento olamaz" — dizi = biri yeter
    needs: ["gunes", "hidro", "jeotermal"],
    needsName: "bir enerji santrali",
    needsWhy: "Enerji olmadan çimento üretilemez; önce bir santral kurulur.",
    icon: "M4 20h16M6 20V10l6-4 6 4v10M9 20v-5h6v5M3 10l9-6 9 6",
    effect: "Tesis üretime geçti",
    fact: "11 fabrika, 3 ülke, yılda 17,7 milyon ton çimento kapasitesi.",
    lede:
      "Limak Çimento Türkiye'de dokuz fabrikayla; yurt dışında Mozambik ve Fildişi Sahili öğütme-paketleme tesisleriyle üretim yapıyor. 2025'te 2030 ve 2050 net sıfır hedefleri SBTi tarafından onaylandı; Anka Fabrikası'nda dünyada ilk kez kalsinatöre hidrojen-oksijen enjeksiyonuyla %100 alternatif yakıt oranına ulaşıldı.",
    note: "Sağ yamacın eteğine, hammaddeye yakın kurulur.",
    stats: [
      { v: "17,7 mn ton", l: "Yıllık çimento" },
      { v: "9,6 mn ton", l: "Yıllık klinker" },
      { v: "11", l: "Fabrika" },
      { v: "30+", l: "Hazır beton tesisi" },
    ],
  },
  {
    id: "port",
    name: "Liman",
    sub: "Port",
    color: "#4cc9f0",
    icon: "M12 3v13M12 16c-4 0-7-3-7-7M12 16c4 0 7-3 7-7M3 20h18M8 6h8",
    effect: "Liman hizmete açıldı",
    fact: "Yılda 1 milyon TEU kapasite; 2025'te 588.107 TEU elleçlendi.",
    lede:
      "LimakPort İskenderun, 2011'de 36 yıllık işletme hakkı devralınarak 2013'te konteyner operasyonlarına başladı. 920 metrelik konteyner rıhtımı ve 15,5 metre su derinliğiyle Doğu Akdeniz'in en büyük derin su terminallerinden biri. 2025'te hacmini %12 artırdı.",
    note: "Deniz kıyısına yerleşir; otoyol ile havalimanına bağlanır.",
    stats: [
      { v: "1 mn TEU", l: "Yıllık kapasite" },
      { v: "588.107", l: "2025 elleçleme" },
      { v: "15,5 m", l: "Su derinliği" },
      { v: "36 yıl", l: "İşletme hakkı" },
    ],
  },
  {
    id: "hava",
    name: "Havalimanı",
    sub: "Airport",
    color: "#b39dff",
    icon: "M2 16l20-6-3.4-2.4-5 1.4-7-5.6-2 .7 4 6-4.6 1.3-2.6-2-1.4.5 2 4.4Z",
    effect: "Pist hizmete girdi",
    fact: "Priştina ve Dakar'da 2025'te toplam 7,5 milyon yolcu ağırlandı.",
    lede:
      "Limak bugün iki uluslararası havalimanı işletiyor: Kosova'nın tek uluslararası havalimanı Priştina Adem Jashari ve Senegal'in Dakar Blaise-Diagne havalimanı. Priştina 2025'te %12,7 artışla 4,6 milyon yolcuya ulaşarak Avrupa'nın en hızlı büyüyen havalimanları arasına girdi. Kuveyt Uluslararası Havalimanı'nın 750 bin m²'lik yeni terminali de Limak tarafından inşa ediliyor.",
    note: "Ovanın düz zeminine yerleşir; otoyol ile limana bağlanır.",
    stats: [
      { v: "4.595.524", l: "Priştina yolcu (2025)" },
      { v: "2.939.453", l: "Dakar yolcu (2025)" },
      { v: "750.000 m²", l: "Kuveyt T2 terminali" },
      { v: "25 yıl", l: "Dakar işletmesi" },
    ],
  },
  {
    id: "insaat",
    name: "İnşaat",
    sub: "Construction",
    color: "#ff8a3d",
    icon: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M10.5 12h3",
    needs: "cimento",
    needsWhy: "Çimento olmadan şehir kurulamaz.",
    lede:
      "Limak'ın çıkış noktası ve hâlâ omurgası. 200'den fazla tamamlanmış proje, 25 milyar doları aşan toplam değer. ENR'nin 2026 listesinde dünyanın en büyük uluslararası müteahhitleri arasında 51. sırada.",
    children: [
      {
        id: "konut", name: "Konut", sub: "Housing", color: "#ff8a3d",
        // 02.10 revizyonu: bölge beslenmeden yaşam alanı kurulmaz
        needs: "gida",
        needsWhy: "Bölge beslenmeden yaşam alanı kurulmaz; önce gıda gelir.",
        icon: "M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6",
        effect: "Yaşam alanı kuruldu",
        fact: "Tuzla'da 70 villalık Villa Flora ve Üsküp'te 323 bin m² karma proje.",
        lede:
          "İstanbul Tuzla Tepeören'de 38.684 m² arsa üzerinde 70 villa ve sosyal alanlardan oluşan Villa Flora 2025 sonunda tamamlandı; çatı güneş panelleri, yağmur suyu sarnıcı ve şarj üniteleriyle EDGE yeşil bina sertifikasına aday. Üsküp'teki 323 bin m² brüt alanlı karma projede son konut blokları da 2025'te teslim edildi.",
        note: "Vadi yamacına, şehir dokusunun çekirdeğine kurulur.",
        stats: [
          { v: "70", l: "Villa (Villa Flora)" },
          { v: "38.684 m²", l: "Proje arsası" },
          { v: "323.000 m²", l: "Üsküp brüt alan" },
        ],
      },
      {
        id: "stadyum", name: "Stadyum", sub: "Stadium", color: "#ff8a3d",
        icon: "M3 12a9 4.5 0 1 0 18 0a9 4.5 0 1 0-18 0M7 12v5a9 4.5 0 0 0 10 0v-5",
        effect: "Stadyum açıldı",
        fact: "Spotify Camp Nou Mart 2026'da 62 bin kapasiteye ulaştı; hedef 105 bin.",
        lede:
          "FC Barcelona ile 2023'te imzalanan tasarla-inşa et sözleşmesi kapsamında Limak İnşaat, Spotify Camp Nou'yu yeniliyor ve genişletiyor. Stadyum Kasım 2025'te 45 bin kapasiteyle yeniden seyirciyle buluştu; Mart 2026'da Gol Nord tribününün açılmasıyla kapasite 62 bini aştı.",
        note: "Şehir kenarındaki geniş açık alana kurulur.",
        stats: [
          { v: "62.000", l: "Mevcut kapasite" },
          { v: "105.000", l: "Hedef kapasite" },
          { v: "60.000 m²", l: "Çevre peyzajı" },
        ],
      },
      {
        id: "kopru", name: "Köprü", sub: "Bridge", color: "#ff8a3d",
        // Köprü otoyolun parçasıdır: sahnede köprü tabliyesi otoyolun
        // üstünden geçer, otoyol olmadan köprü havada kalırdı.
        needs: "otoyol",
        needsWhy: "Köprü otoyolun parçasıdır; önce yol döşenir.",
        icon: "M2 16h20M5 16V9M19 16V9M2 12c4-5 16-5 20 0M9 16v-3M15 16v-3",
        effect: "İki yaka birleşti",
        fact: "1915Çanakkale: 2.023 m orta açıklıkla dünyanın en uzun orta açıklıklı asma köprüsü.",
        lede:
          "Limak'ın içinde bulunduğu ortak girişim grubu, 2017'de 1915Çanakkale Köprüsü ve Malkara-Çanakkale Otoyolu'nun tasarım, finansman, inşaat ve işletme ihalesini kazandı. Yap-işlet-devret modeliyle dört yılda tamamlanan köprü 18 Mart 2022'de açıldı ve boğaz geçişini 6 dakikaya indirdi.",
        note: "Vadinin daraldığı geçiş noktasına kurulur.",
        stats: [
          { v: "2.023 m", l: "Orta açıklık" },
          { v: "334 m", l: "Kule yüksekliği" },
          { v: "4,6 km", l: "Toplam uzunluk" },
          { v: "6 dk", l: "Geçiş süresi" },
        ],
      },
      {
        id: "otoyol", name: "Otoyol", sub: "Highway", color: "#ff8a3d",
        icon: "M4 21L9 3M20 21L15 3M12 6v3M12 13v3M12 20v1",
        effect: "Havalimanı ile liman bağlandı",
        fact: "Malkara-Çanakkale 101 km; 324 km'lik koridorun bir parçası.",
        lede:
          "1915Çanakkale Köprüsü'nü de kapsayan 101 kilometrelik Malkara-Çanakkale Otoyolu, 324 kilometrelik Kınalı-Tekirdağ-Çanakkale-Savaştepe koridorunun parçası. 105,2 kilometrelik Kınalı-Malkara kesiminin temeli 18 Mart 2025'te atıldı. Limak ayrıca 412 kilometrelik Kuzey Marmara Otoyolu'nun yatırımcıları arasında.",
        note: "Limanı havalimanına bağlar.",
        stats: [
          { v: "101 km", l: "Malkara-Çanakkale" },
          { v: "105,2 km", l: "Kınalı-Malkara" },
          { v: "412 km", l: "Kuzey Marmara" },
        ],
      },
    ],
  },
  {
    id: "enerji",
    name: "Enerji",
    sub: "Energy",
    color: "#5be8c0",
    icon: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
    lede:
      "Limak'ın enerji portföyü hidroelektrik, güneş, jeotermal, doğal gaz ve linyitten oluşuyor; yaklaşık 3.500 MW kurulu güce sahip ve hedef 5.000 MW.",
    children: [
      {
        id: "gunes", name: "Güneş", sub: "Sun", color: "#ffc861",
        icon: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z",
        effect: "Paneller üretime başladı",
        fact: "Hatay Erzin YEKA GES 140 MWp ile Kasım 2024'te tam kapasite devreye girdi.",
        lede:
          "YEKA ihalesi kapsamında Hatay Erzin'de kurulan 140 MWp / 100 MWe gücündeki santral, tek eksen takip sistemi ve 26 güç istasyonuyla donatıldı; denetimlerde %99,59 verimle çalıştığı doğrulandı. Portföy Isparta Gönen, Konya Apa ve Hamitabat öz-tüketim santralleriyle tamamlanıyor.",
        note: "Ön plandaki açık, gölgesiz tarlaya kurulur.",
        stats: [
          { v: "140 MWp", l: "Erzin YEKA GES" },
          { v: "16,3 MWp", l: "Konya Apa" },
          { v: "5,7 MWp", l: "Isparta Gönen" },
          { v: "%99,59", l: "Ölçülen verim" },
        ],
      },
      {
        id: "hidro", name: "Hidroelektrik", sub: "Hydro", color: "#4cc9f0",
        icon: "M12 3s6 6.6 6 10.6A6 6 0 0 1 6 13.6C6 9.6 12 3 12 3Z M9 13.8c0 1.7 1.3 3 3 3",
        effect: "Türbinler devreye girdi",
        fact: "Dokuz santralde 1.319 MW kurulu güç, yılda yaklaşık 4,1 milyar kWh.",
        lede:
          "Çetin, Alkumru, Kirazlık, Uzunçayır, Kargı, Gürsöğüt, Seyrantepe, Pembelik ve Tatar santralleri toplam 1.319,22 MWm kurulu güce sahip. En büyüğü Botan Çayı üzerindeki 420,1 MWe gücündeki Çetin Barajı ve HES — Türkiye ile Avrupa'nın en büyük RCC tipi barajı ve özel sektörün işlettiği en büyük hidroelektrik santrali.",
        note: "İç vadide akarsuyun daraldığı boğaza kurulur.",
        stats: [
          { v: "1.319 MWm", l: "Toplam kurulu güç" },
          { v: "9", l: "Santral" },
          { v: "4,08 mlr kWh", l: "Yıllık kapasite" },
          { v: "420,1 MWe", l: "Çetin HES" },
        ],
      },
      {
        id: "jeotermal", name: "Jeotermal", sub: "Geothermal", color: "#ff8a5c",
        icon: "M12 22c3.9 0 7-3.1 7-7 0-4-4-6-4-10 0 0-3 1-3 5 0-2-1-3-2-4-1 3-5 5-5 9 0 3.9 3.1 7 7 7Z",
        effect: "Yer ısısı devreye girdi",
        fact: "Aydın Buharkent JES 13,77 MWe; 2025 brüt üretimi 118.379 MWh.",
        lede:
          "Büyük Menderes Vadisi'ndeki Buharkent Jeotermal Enerji Santrali, 5 üretim ve 3 reenjeksiyon kuyusuyla Eylül 2018'de üretime geçti. Hava koşullarından bağımsız çalışarak kesintisiz temel yük üretir. Santrale entegre 1,1 MWe'lik hibrit güneş santrali 2023'te devreye alındı.",
        note: "Dağ eteğindeki jeotermal sahaya kurulur.",
        stats: [
          { v: "13,77 MWe", l: "Kurulu güç" },
          { v: "118.379 MWh", l: "2025 brüt üretim" },
          { v: "5 + 3", l: "Üretim / reenjeksiyon kuyusu" },
        ],
      },
    ],
  },
  {
    id: "gida",
    name: "Gıda",
    sub: "Food",
    color: "#8ce563",
    icon: "M6 3v8a3 3 0 0 0 6 0V3M9 11v10M16 3c-1.5 2-2 4-2 6s.7 3 2 3 2-1 2-3-.5-4-2-6ZM18 12v9",
    effect: "Üretim tesisi açıldı",
    fact: "Limkon Adana'da yılda 130 bin ton meyve işliyor; satışının %36'sı ihracat.",
    lede:
      "Limak'ın gıda kolu Limkon, Adana Organize Sanayi Bölgesi'nde 55 bin m² alanda meyve suyu konsantresi, meyve püresi ve domates salçası üretiyor. 2023'teki 7,5 milyon euroluk yatırımla işleme kapasitesi 130 bin tona çıktı; Türkiye'de narenciye ve siyah havuç işlemede ön sıralarda. Çatı güneş santraliyle enerjisinin %35'i yenilenebilir.",
    note: "Tarım düzlüğüne, tarlalara bitişik kurulur.",
    stats: [
      { v: "130.000 ton", l: "Yıllık işleme" },
      { v: "55.000 m²", l: "Tesis alanı" },
      { v: "%36", l: "İhracat payı (2025)" },
      { v: "%35", l: "Yenilenebilir enerji" },
    ],
  },
  {
    id: "turizm",
    name: "Turizm",
    sub: "Tourism",
    color: "#ff7fa8",
    icon: "M3 21h18M4 21V8l8-4 8 4v13M9 21v-5h6v5M8 12h2M14 12h2",
    effect: "Tesis misafir ağırlıyor",
    fact: "Dokuz otel, 6 binden fazla yatak, %80 üzeri doluluk, 40 ülkeden misafir.",
    lede:
      "Limak turizme 1995'te Limak Arcadia ile girdi; bugün Antalya, Ankara, İstanbul, Yalova, Üsküp ve KKTC'de dokuz otel işletiyor. Otellerin yatırımı, inşaatı ve işletmesi tamamen grup bünyesinde yapılıyor.",
    note: "Denize bakan kıyı yamacına kurulur.",
    stats: [
      { v: "9", l: "Otel" },
      { v: "6.000+", l: "Yatak" },
      { v: "%80+", l: "Doluluk" },
      { v: "~40", l: "Misafir ülkesi" },
    ],
  },
];

/* Grubun ölçeği — Faaliyet Raporu 2025 + ENR 2026 (13 Eylül 2026).
   ENR sıralaması 61 → 51'e yükseldi; 48 Türk şirketi arasında 3. sırada. */
window.LIMAK_SCALE = [
  { v: "50", l: "Yıl" },
  { v: "14", l: "Ülke" },
  { v: "8", l: "Sektör" },
  { v: "37.417", l: "Çalışan" },
  { v: "51.", l: "ENR dünya sırası" },
];

window.LIMAK_FINALE = [
  { v: "50", l: "Yıllık miras" },
  { v: "37.417", l: "Çalışan (2025)" },
  { v: "14", l: "Ülke · 3 kıta" },
  { v: "200+", l: "Tamamlanan proje" },
  { v: "51.", l: "ENR dünya sırası" },
];

/* ---- 02.10 revizyonu: tepsi sırası ----
   Enerji · Gıda · Çimento · İnşaat · Liman · Havalimanı · Turizm
   İnşaat alt seçenekleri: Konut · Köprü · Otoyol · Stadyum (AVM kalktı) */
(() => {
  const SIRA = ["enerji", "gida", "cimento", "insaat", "port", "hava", "turizm"];
  const INSAAT = ["konut", "kopru", "otoyol", "stadyum"];
  const sira = (dizi) => (a, b) => dizi.indexOf(a.id) - dizi.indexOf(b.id);
  window.LIMAK_SECTORS.sort(sira(SIRA));
  const ins = window.LIMAK_SECTORS.find((s) => s.id === "insaat");
  if (ins) ins.children.sort(sira(INSAAT));
})();

/* ---- yardımcılar: ağaç ↔ yaprak ---- */
window.LIMAK_LEAVES = window.LIMAK_SECTORS.flatMap((s) =>
  s.children ? s.children.map((c) => ({ ...c, parent: s.id, parentName: s.name })) : [s]
);
window.LIMAK_LEAF = Object.fromEntries(window.LIMAK_LEAVES.map((l) => [l.id, l]));
