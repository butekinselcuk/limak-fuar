/* ============================================================
   2. AŞAMA — ETKİ AZALTMA
   "Şimdi dünyayı kurduk, etkileri azaltma vakti."

   KAYNAK: 26.09 Toplantı Özeti (world with Limak).pptx · Slayt 5-6.
   Önlem listeleri sunumdaki tablodan BİREBİR alınmıştır; sıralaması
   ve İngilizce terimleri korunmuştur.

   `bilgi` alanı yalnızca Limak'ta GERÇEK karşılığı doğrulanmış
   önlemlerde doldurulur (Faaliyet Raporu 2025). Doğrulanmamış bir
   önleme uydurma iddia yazılmaz — final "DID YOU KNOW" kartı yalnız
   bu alanı dolu olanlardan seçilir.

   `teyit: true` = sunumda karşılığı olmayan, müşteri onayı bekleyen
   eşleme (bkz. rapor).

   02.10 Toplantı Özeti: her yatırımın önlemleri TOPLAM 100 eder —
   hepsi alınınca kalan etki sıfırlanır, alttaki çubuk tam dolar
   ("alttaki bar tam dolmalı"). Yaşam Alanı'ndan Sorumlu Tedarik,
   Çimento'dan Araç Elektrifikasyonu kalktı; Köprü/Otoyol'a
   Yenilenebilir Enerji eklendi.
   ============================================================ */

/* Yenilenebilir üretim yapan yatırımlar azaltımın KENDİSİdir;
   onlara ayrıca önlem uygulanmaz. */
const _KAYNAK = {
  kaynak: true,
  baslik: "Bu yatırım azaltımın kendisi",
  metin:
    "Diğer sektörlerin listesindeki “Renewable Energy” önlemi tam olarak " +
    "budur. Bu santral kurulduğu an dünyanın geri kalanının karbonunu " +
    "düşürmeye başlar.",
};

/* Sunumdaki "LIVING SPACE" seti — yaşam merkezi ve büyük kamu yapısı */
const _YASAM = [
  { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 30,
    not: "Çatı ve otopark güneş üretimi binanın kendi tüketimini karşılar." },
  { id: "su", ad: "Su Verimliliği", en: "Water Efficiency", dus: 20,
    not: "Yağmur suyu hasadı, kaçak tespiti ve düşük debili armatürler." },
  { id: "sarj", ad: "Elektrikli Araç Şarjı", en: "EV Charging Station", dus: 18,
    not: "Otoparkta şarj altyapısı ziyaretçiyi elektrikli araca geçiriyor." },
  // 02.10: Sorumlu Tedarik kaldırıldı
  { id: "iklim", ad: "İklim Dayanıklılığı", en: "Climate Resilience", dus: 16,
    not: "Yapı, fırtına, aşırı sıcak ve sel senaryolarına göre boyutlandırılır." },
  { id: "atik", ad: "Atık Yönetimi", en: "Waste Management", dus: 16,
    not: "Ayrıştırma ve geri kazanımla düzenli depolamaya giden atık azalır." },
];

/* Otoyol ve köprü sunumda tek başlık altında verilmiştir */
const _YOL = [
  // 02.10: "Yenilenebilir enerji ekleyelim"
  { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 30,
    not: "Yol aydınlatması, gişe ve işletme binaları güneş enerjisiyle beslenir." },
  { id: "sarj", ad: "Elektrikli Araç Şarjı", en: "EV Charging Station", dus: 38,
    not: "Hat boyunca şarj istasyonları uzun mesafeyi elektrikli araca açar." },
  { id: "iklim", ad: "İklim Dayanıklılığı", en: "Climate Resilience", dus: 32,
    not: "Drenaj, rüzgâr ve sıcaklık tasarımı yolu iklim riskine karşı korur." },
];

window.LIMAK_AZALTIM = {
  port: {
    etki: 100,
    onlemler: [
      { id: "elek", ad: "Elektrifikasyon", en: "Electrification", dus: 40,
        not: "Saha araçları, terminal çekicileri ve forkliftler elektriğe geçer.",
        bilgi: "Bu kararın gerçek adresi LimakPort İskenderun: 920 metrelik " +
               "rıhtımı ve 1 milyon TEU kapasitesiyle Doğu Akdeniz'in en büyük " +
               "derin su terminallerinden biri. 2025'te 588.107 konteyner elleçledi." },
      { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 35,
        not: "Rıhtım ve depo çatılarındaki güneş üretimi limanı besler." },
      { id: "akil", ad: "Akıllı Trafik ve Lojistik Yönetimi",
        en: "Smart Traffic and Logistic Management", dus: 25,
        not: "Planlama, kapıdaki bekleme ve rölanti süresini kısaltır." },
    ],
  },

  hava: {
    etki: 100,
    onlemler: [
      { id: "led", ad: "LED Aydınlatma", en: "LED Lighting", dus: 35,
        not: "Terminal, apron ve pist aydınlatması LED'e geçer." },
      { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 65,
        not: "Terminal çatısı ve otopark güneş üretimi havalimanını besler.",
        bilgi: "Limak iki uluslararası havalimanı işletiyor: Priştina Adem " +
               "Jashari ve Dakar Blaise-Diagne. 2025'te ikisinde toplam " +
               "7,5 milyon yolcu ağırlandı." },
    ],
  },

  cimento: {
    etki: 100,
    onlemler: [
      // 02.10: Araç Elektrifikasyonu kaldırıldı
      { id: "yakit", ad: "Alternatif Yakıt ve Hammadde",
        en: "Alternative Fuel & Raw Material Use", dus: 38,
        not: "Fosil yakıt yerine atıktan türetilmiş yakıt ve ikame hammadde.",
        bilgi: "Limak Çimento Anka Fabrikası'nda kalsinatöre hidrojen-oksijen " +
               "enjeksiyonuyla dünyada ilk kez %100 alternatif yakıt oranına " +
               "ulaşıldı." },
      { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 30,
        not: "Atık ısı geri kazanımı ve güneş üretimi fabrikayı besler." },
      { id: "ccus", ad: "Karbon Yakalama ve Depolama",
        en: "CCUS · Carbon Capture Utilization and Storage", dus: 32,
        not: "Bacadan çıkan karbon yakalanır, kullanılır ya da depolanır.",
        bilgi: "Limak Çimento'nun 2030 ara ve 2050 net sıfır hedefleri " +
               "2025'te SBTi (Science Based Targets initiative) tarafından " +
               "onaylandı." },
    ],
  },

  gida: {
    etki: 100,
    onlemler: [
      { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 40,
        not: "Tesis çatısındaki güneş santrali üretimin enerjisini karşılar.",
        bilgi: "Limkon'un Adana'daki 55 bin m²'lik tesisi enerjisinin %35'ini " +
               "kendi çatı güneş santralinden karşılıyor." },
      { id: "atik", ad: "Gıda Atığı Yönetimi", en: "Food Waste Management", dus: 33,
        not: "Posa ve kabuk yem ya da biyogaza dönüşür; çöpe gitmez." },
      { id: "akil", ad: "Akıllı Enerji Yönetimi", en: "Smart Energy Management", dus: 27,
        not: "Soğutma ve buhar hatları anlık ölçümle optimize edilir." },
    ],
  },

  turizm: {
    // müşteri teyidi bekleniyor (26.09 · E maddesi)
    teyit: true,
    etki: 100,
    onlemler: [
      { id: "yeni", ad: "Yenilenebilir Enerji", en: "Renewable Energy", dus: 58,
        not: "Güneş ısıtma ve çatı üretimi otelin yükünü karşılar.",
        bilgi: "Limak Turizm dokuz otelde 6 binden fazla yatak işletiyor; " +
               "yatırım, inşaat ve işletme tamamen grup bünyesinde yapılıyor." },
      { id: "elek", ad: "Elektrifikasyon", en: "Electrification", dus: 42,
        not: "Ekipman değişimi ve misafir için elektrikli araç şarj istasyonu." },
    ],
  },

  otoyol: { etki: 100, onlemler: _YOL.map((x) => ({ ...x })) },
  kopru: {
    etki: 100,
    onlemler: _YOL.map((x) =>
      x.id === "iklim"
        ? { ...x, bilgi: "1915Çanakkale Köprüsü 2.023 metrelik orta açıklığıyla " +
                         "dünyanın en uzun orta açıklıklı asma köprüsü; 334 metrelik " +
                         "kuleleri rüzgâr ve deprem senaryolarına göre tasarlandı." }
        : { ...x }),
  },



  // 02.10 (2): konut + stadyum = Yaşam Alanı → sunumdaki LIVING SPACE seti
  yasam: {
    etki: 100,
    onlemler: _YASAM.map((x) =>
      x.id === "su"
        ? { ...x, bilgi: "Tuzla'daki 70 villalık Villa Flora projesi çatı güneş panelleri, " +
                         "yağmur suyu sarnıcı ve şarj üniteleriyle EDGE yeşil bina " +
                         "sertifikasına aday." }
        : { ...x }),
  },

  gunes: { ..._KAYNAK },
  hidro: { ..._KAYNAK },
  jeotermal: { ..._KAYNAK },
  ruzgar: { ..._KAYNAK },
};

/* Final kartı — müşterinin sunumdaki örneği aynen korunur. */
window.LIMAK_BUNU_BILIYOR_MUYDUNUZ = {
  baslik: "BUNU BİLİYOR MUYDUNUZ?",
  varsayilan:
    "Bugün verdiğin her karar bir yerde uygulanıyor. Limak'ın 14 ülkedeki " +
    "sahasında bu önlemler sahada çalışan gerçek projelere dönüşüyor.",
};
