/* ============================================================
   Limak sektörleri — "World with Limak" tepsisi
   Not: fetch() yerine global; sayfa file:// ile de açılabilsin.
   ============================================================ */
window.LIMAK_SECTORS = [
  {
    id: "insaat",
    fact: "ENR 2025: dünyanın en büyük müteahhitleri listesinde 61. sıra",
    name: "İnşaat",
    sub: "Taahhüt",
    color: "#ff8a3d",
    icon: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M10.5 12h3",
    effect: "Şehir yükseliyor",
    metric: "Yükselen yapı",
    lede:
      "Limak'ın çıkış noktası ve hâlâ omurgası: yol, köprü, baraj, havalimanı, hastane, stadyum. Yarım asırda Türkiye'nin ve on dört ülkenin fiziksel altyapısını kuran taahhüt gücü.",
    note: "Merkeze bıraktığınızda: platoda kuleler yükselir, kule vinç işe koyulur.",
    stats: [
      { v: "1976", l: "Kuruluş" },
      { v: "14", l: "Ülke" },
      { v: "8", l: "Sektör" },
    ],
  },
  {
    id: "cimento",
    fact: "Yılda 17,7 milyon ton çimento · 3 ülkede 11 fabrika",
    name: "Çimento",
    sub: "Malzeme",
    color: "#cdbfa4",
    icon: "M4 20h16M6 20V10l6-4 6 4v10M9 20v-5h6v5M3 10l9-6 9 6",
    effect: "Viyadük vadiyi geçiyor",
    metric: "Bağlanan yaka",
    lede:
      "Çimento, bir ülkenin ne kadar hızlı büyüyebileceğini belirleyen malzemedir. Limak Çimento, grubun kendi şantiyelerini beslerken yurt içi ve ihracat pazarına da üretim yapar.",
    note: "Merkeze bıraktığınızda: nehri aşan viyadük kurulur, üzerinden trafik akar.",
    stats: [
      { v: "Yurt içi", l: "Üretim ağı" },
      { v: "İhracat", l: "Pazar" },
      { v: "Entegre", l: "Tesis yapısı" },
    ],
  },
  {
    id: "su",
    fact: "Çetin HES 420 MW — özel sektörün en büyük hidroelektrik santrali",
    name: "Hidroelektrik",
    sub: "Su gücü",
    color: "#4cc9f0",
    icon: "M12 3s6 6.6 6 10.6A6 6 0 0 1 6 13.6C6 9.6 12 3 12 3Z M9 13.8c0 1.7 1.3 3 3 3",
    effect: "Nehir doluyor",
    metric: "Akan su",
    lede:
      "Barajlar iki iş yapar: elektrik üretir ve suyu yönetir. Limak'ın enerji tarafındaki ilk büyük yatırımları hidroelektrikti; bugün yenilenebilir portföyün temelini oluşturuyor.",
    note: "Merkeze bıraktığınızda: baraj gövdesi yükselir, savaklar açılır, kuru yatak nehre döner.",
    stats: [
      { v: "Yenilenebilir", l: "Kaynak" },
      { v: "Baraj + HES", l: "Yapı" },
      { v: "Şebeke", l: "Bağlantı" },
    ],
  },
  {
    id: "ruzgar",
    fact: "Yenilenebilir portföy ~3.500 MW → hedef 5.000 MW",
    name: "Rüzgâr",
    sub: "RES",
    color: "#5be8c0",
    icon: "M12 12v9M12 12 8 3.6M12 12l9 1.4M12 12 3.4 16",
    effect: "Türbinler dönüyor",
    metric: "Dönen kanat",
    lede:
      "Rüzgâr, yakıtı olmayan tek sanayi girdisidir. Limak'ın rüzgâr santralleri, karbonsuz elektriği doğrudan şebekeye verir — yakıt maliyeti ve emisyon olmadan.",
    note: "Merkeze bıraktığınızda: sırt boyunca türbinler kurulur, gökyüzü açılır.",
    stats: [
      { v: "0 g", l: "Üretimde emisyon" },
      { v: "7/24", l: "Çalışma" },
      { v: "Yerli", l: "Kaynak" },
    ],
  },
  {
    id: "gunes",
    fact: "Erzin YEKA GES: 140 MWp tam kapasite devrede",
    name: "Güneş",
    sub: "GES",
    color: "#ffc861",
    icon: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z",
    effect: "Güneş açıyor",
    metric: "Toplanan ışık",
    lede:
      "Güneş santralleri hızlı kurulur, sessiz çalışır ve gündüz talebiyle aynı saatte üretir. Limak'ın yenilenebilir portföyünde güneş, rüzgârı tamamlayan ikinci ayaktır.",
    note: "Merkeze bıraktığınızda: ön düzlükte panel tarlası açılır, gökyüzü aydınlanır.",
    stats: [
      { v: "Gündüz", l: "Üretim eğrisi" },
      { v: "Modüler", l: "Kurulum" },
      { v: "Düşük", l: "İşletme yükü" },
    ],
  },
  {
    id: "hava",
    fact: "İstanbul Havalimanı ortak girişimi · 90 milyon yolcu/yıl kapasite",
    name: "Havalimanı",
    sub: "Altyapı",
    color: "#b39dff",
    icon: "M2 16l20-6-3.4-2.4-5 1.4-7-5.6-2 .7 4 6-4.6 1.3-2.6-2-1.4.5 2 4.4Z",
    effect: "Pist ışıkları yanıyor",
    metric: "Açılan kapı",
    lede:
      "Havalimanı bir binadan fazlasıdır: bir ülkenin dünyaya bağlandığı noktadır. Limak, havalimanı yapımından işletmeciliğine kadar zincirin tamamında yer alır.",
    note: "Merkeze bıraktığınızda: terminal ve kule kurulur, pist ışıkları yanar, uçak kalkar.",
    stats: [
      { v: "Yapım", l: "Rol" },
      { v: "İşletme", l: "Rol" },
      { v: "Uluslararası", l: "Ölçek" },
    ],
  },
  {
    id: "turizm",
    fact: "8 otel · 6.000+ yatak · %80 üzeri doluluk",
    name: "Turizm",
    sub: "Konaklama",
    color: "#ff7fa8",
    icon: "M3 21h18M4 21V8l8-4 8 4v13M9 21v-5h6v5M8 12h2M14 12h2",
    effect: "Kıyı canlanıyor",
    metric: "Ağırlanan misafir",
    lede:
      "Limak Hotels, grubun inşaat kültürünü konaklamaya taşıyor: yatırımı da yapan, binayı da kuran, sonra da işleten bir yapı. Turizm, altyapının ekonomiye döndüğü yerdir.",
    note: "Merkeze bıraktığınızda: yamaçta teraslı otel ve havuz belirir, palmiyeler açar.",
    stats: [
      { v: "Yatırım", l: "Rol" },
      { v: "İşletme", l: "Rol" },
      { v: "Şehir + resort", l: "Portföy" },
    ],
  },
  {
    id: "teknoloji",
    fact: "70+ dijital dönüşüm projesi · 25 şirket tek veri zemininde",
    name: "Teknoloji",
    sub: "Dijital",
    color: "#8ce563",
    icon: "M4 6h16v10H4zM8 20h8M12 16v4M9 10.5l2 2 4-4",
    effect: "Ağ birleşiyor",
    metric: "Bağlanan düğüm",
    lede:
      "Sekiz sektörün ayrı ayrı çalışması yetmez; birbirini beslemesi gerekir. Dijital katman, sahadaki her varlığı tek bir görünürlük ve karar zeminine bağlar.",
    note: "Merkeze bıraktığınızda: tüm yapılar arasında veri hattı kurulur, dronlar havalanır.",
    stats: [
      { v: "8", l: "Bağlanan sektör" },
      { v: "Tek", l: "Veri zemini" },
      { v: "Gerçek zamanlı", l: "İzleme" },
    ],
  },
];

/* Final ekranındaki özet — grup ölçeği */
window.LIMAK_FINALE = [
  { v: "50", l: "Yıllık miras" },
  { v: "37.417", l: "Çalışan (2025)" },
  { v: "14", l: "Ülke · 3 kıta" },
  { v: "8", l: "Sektör" },
  { v: "61.", l: "ENR dünya sırası" },
];

/* Grubun ölçeği — Limak Şirketler Grubu 2025 Faaliyet Raporu (Aralık 2025).
   Karşılama anlarında gösterilir: ziyaretçi ekrana ilk baktığında
   karşısındaki şirketin büyüklüğünü görsün. */
window.LIMAK_SCALE = [
  { v: "50", l: "Yıl" },
  { v: "14", l: "Ülke" },
  { v: "8", l: "Sektör" },
  { v: "37.417", l: "Çalışan" },
  { v: "61.", l: "ENR dünya sırası" },
];
