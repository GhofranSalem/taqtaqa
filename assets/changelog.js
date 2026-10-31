// طقطقة: رقم الإصدار وسجل التحديثات، من مكان واحد.
//
// إدخال واحد لكل يوم فيه تحديثات، وآخر اليوم بنجمع فيه كل اللي اتعمل. اليوم اللي ما اتعملش فيه حاجة ما لوش إدخال.
//   لو اليوم فيه ميزة جديدة: زوّد الرقم اللي في النص وصفّر الأخير   0.3.1 ← 0.4.0  (وحط big: true)
//   لو كله تصليحات وتحسينات: زوّد الرقم الأخير                      0.3.0 ← 0.3.1
//   لو اتعمل حاجة تانية في نفس اليوم، بتتضاف لإدخال اليوم ده، ولو كانت ميزة والإدخال صغير يبقى كبير.
//   الرقم الأول هيفضل 0 طول ما الموقع تجريبي، ويبقى 1.0.0 لما يخلص.
//
// السجل للمستخدمين: اكتب بس الحاجات اللي يحسّوا بيها (ميزة جديدة، أو حاجة اتغيرت قدامهم).
// أي حاجة أمان تتكتب «تحديثات أمنية»، وأي تصليح أو تنضيف في الواجهة أو الكود يتكتب «تحسينات في واجهة الموقع»،
// من غير تفاصيل تقنية، ومرة واحدة بس في اليوم.
//
// الفوتر في الصفحة الرئيسية بياخد الرقم من أول إدخال، وصفحة changelog.html بتعرض القايمة كلها.
(function () {
  "use strict";
  var BETA = true;
  var CHANGES = [
    { v: "0.3.1", d: "2026-10-31", items: [
      ["قسم «كلام مصري» اتجدد: نصايح ومعلومات مفيدة بالمصري، في الأمان على النت، والفلوس، والصحة، والمذاكرة، والكتابة على الكيبورد", "The Egyptian Arabic section is renewed: useful tips and facts on online safety, money, health, studying and typing"],
      ["كل قسم بقى فيه نصوص قصيرة ومتوسطة وطويلة وطويلة جدًا: معاني الأمثال وحكاياتها، وقصص الأفلام، وحكايات كليلة ودمنة، وقصايد أطول، وآيات أطول، ونكت جحا القصيرة", "Every section now has short, medium, long and extra-long texts: proverb meanings and stories, film stories, Kalila and Dimna tales, longer poems and verses, and short Goha jokes"],
      ["رسمة جديدة للإيدين على الكيبورد: خط واحد حوالين الصوابع والكف زي الرسم بالقلم، والصباع اللي عليه الدور بيتلوّن ويروح للزرار", "New hands drawing on the keyboard: one continuous outline like a pen sketch, and the finger whose turn it is lights up and moves to the key"],
      ["شلنا علامات التنصيص اللي مش موجودة على الكيبورد من النصوص", "Removed quotation marks that are not on the keyboard from the texts"],
      ["صفحة الخصوصية اتحدثت: جروب تليجرام وعدّاد الزيارات", "Privacy page updated: the Telegram group and the visit counter"],
      ["تحديثات أمنية", "Security updates"],
      ["تحسينات في واجهة الموقع", "Interface improvements"]
    ]},
    { v: "0.3.0", d: "2026-10-30", big: true, items: [
      ["الترتيب الأسبوعي: بتتنافس مع ناس في نفس مستواك في ٥ دوريات (ريشة، قلم، كاتب، خطّاط، طقطاق)، بالسرعة أو بالتحسّن أو بالدقايق. الانضمام اختياري وباسم تختاره", "Weekly leaderboard: compete with people at your level in five leagues, by speed, improvement or minutes. Joining is optional, under a name you choose"],
      ["إيدين على الكيبورد بتوريك تحط صوابعك فين، والصباع اللي عليه الدور بيتحرك للزرار", "Hands on the keyboard show where your fingers rest and move the right finger to each key"],
      ["«تاريخي»: العربي والإنجليزي كل واحد لوحده، وكارت لكل قسم، والحروف اللي بتغلط فيها، وخريطة الأيام، وأحسن أرقامك", "History: Arabic and English kept apart, a card per section, your weak keys, a calendar of active days and your personal bests"],
      ["هدف يومي بالدقايق", "A daily goal in minutes"],
      ["تنبيه لو الكيبورد على اللغة الغلط، والنص بيبدأ من الأول لما تحوّل", "A heads-up when your keyboard is on the wrong language; the text restarts once you switch"],
      ["الاختصارات بتتعرض على حسب جهازك (ويندوز أو ماك)", "Shortcuts are shown for your device (Windows or Mac)"],
      ["أول ما تبدأ تكتب، الصفحة بتتظبط على النص والكيبورد", "When you start typing, the page scrolls to the text and keyboard"],
      ["أول ما تدخل الموقع بيسألك عربي ولا إنجليزي، والشرح بيظهر باللغة اللي اخترتها", "On your first visit the site asks Arabic or English, and the tour shows in that language"],
      ["مجتمع طقطقة على تليجرام: t.me/taqtaqaclub", "Taqtaqa community on Telegram: t.me/taqtaqaclub"],
      ["رقم الإصدار في آخر الصفحة، وصفحة «سجل التحديثات» دي", "Version number at the bottom of the page, and this changelog page"],
      ["تنبيه بتسجيل الدخول عشان نتايجك تتحفظ", "A reminder to sign in so your results are saved"],
      ["تحديثات أمنية", "Security updates"],
      ["تحسينات في واجهة الموقع", "Interface improvements"]
    ]},
    { v: "0.2.0", d: "2026-10-29", big: true, items: [
      ["نسخة إنجليزي كاملة من الموقع، وقسم اقتباسات إنجليزي", "A full English version of the site, and an English quotes section"],
      ["قسم «قرآن»: ٨٠ آية من مصحف تنزيل", "Quran section: 80 verses from the Tanzil text"],
      ["زرار «شارك نتيجتك» بيعمل صورة للنتيجة", "Share your result as an image"],
      ["اتمرن على الكلمات اللي غلطت فيها", "Practice the words you got wrong"],
      ["قسم الاختصارات، وEsc بيوقّف الاختبار مؤقتًا، وTab ما بيغيرش النص وانت بتكتب", "Shortcuts section, Esc pauses the test, and Tab no longer changes the text while you type"],
      ["التشكيل بقى على كل النصوص", "Diacritics on every text"],
      ["هيدر ولوجو جداد، وثيمات أريح للعين", "New header and logo, and easier-on-the-eyes themes"]
    ]},
    { v: "0.1.0", d: "2026-10-28", big: true, items: [
      ["أول نسخة من طقطقة: اختبار كتابة بالعربي على أمثال مصرية وسعودية، وأفلام، وحواديت، وشعر", "First version of Taqtaqa: an Arabic typing test on Egyptian and Saudi proverbs, film lines, folk tales and poetry"],
      ["كيبورد على الشاشة، وخط ثمانية، وثيمات، وتشكيل", "On-screen keyboard, the Thmanyah font, themes and diacritics"],
      ["حسابات بـ Google: تاريخك وأحسن أرقامك على أي جهاز", "Google accounts: your history and bests on any device"],
      ["المفضلة، و«آخر مرة» بمؤشر بيمشي بسرعتك القديمة", "Favorites, and a ghost caret at your last speed"],
      ["فورم «ابعتلنا رسالة»", "A contact form"],
      ["الموقع بيشتغل من غير نت ويتنزّل كتطبيق", "Works offline and installs as an app"]
    ]}
  ];

  var en = document.documentElement.lang === "en";
  var ver = CHANGES[0].v;
  var label = BETA ? (en ? "Beta " : "تجريبي ") + ver : (en ? "Version " : "إصدار ") + ver;
  window.TQ_VERSION = ver;

  // الفوتر
  var el = document.getElementById("ver");
  if (el) { el.textContent = label; el.title = en ? "Changelog" : "سجل التحديثات"; }

  // صفحة سجل التحديثات
  var list = document.getElementById("cl");
  if (!list) return;
  var NUM = "٠١٢٣٤٥٦٧٨٩";
  var arNum = function (s) { return en ? s : String(s).replace(/\d/g, function (c) { return NUM[c]; }); };
  var fmt = function (d) {
    try {
      return new Date(d + "T12:00:00Z").toLocaleDateString(en ? "en-GB" : "ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    } catch (e) { return arNum(d); }
  };
  var cur = document.getElementById("cur");
  if (cur) cur.textContent = label;
  CHANGES.forEach(function (c) {
    var sec = document.createElement("section");
    var h = document.createElement("h2");
    var v = document.createElement("bdi");
    v.textContent = c.v;
    h.appendChild(v);
    if (c.big) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = en ? "major" : "تحديث كبير";
      h.appendChild(tag);
    }
    var date = document.createElement("p");
    date.className = "date";
    date.textContent = fmt(c.d);
    var ul = document.createElement("ul");
    c.items.forEach(function (it) {
      var li = document.createElement("li");
      li.textContent = it[en ? 1 : 0];
      ul.appendChild(li);
    });
    sec.appendChild(h); sec.appendChild(date); sec.appendChild(ul);
    list.appendChild(sec);
  });
})();
