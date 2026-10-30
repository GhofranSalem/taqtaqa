// طقطقة: رقم الإصدار وسجل التحديثات، من مكان واحد.
//
// مع كل تحديث بيتنشر، ضيف إدخال جديد في أول القايمة:
//   تحديث صغير (تصليح أو تعديل بسيط): زوّد الرقم الأخير    0.9.2 ← 0.9.3
//   تحديث كبير (ميزة جديدة):           زوّد الرقم اللي قبله  0.9.3 ← 0.10.0
//   الرقم الأول هيفضل 0 طول ما الموقع تجريبي، ويبقى 1.0.0 لما يخلص.
//
// الفوتر في الصفحة الرئيسية بياخد الرقم من أول إدخال، وصفحة changelog.html بتعرض القايمة كلها.
(function () {
  "use strict";
  var BETA = true;
  var CHANGES = [
    { v: "0.9.2", d: "2026-10-30", items: [
      ["رقم الإصدار في آخر الصفحة، وصفحة «سجل التحديثات» دي", "Version number at the bottom of the page, and this changelog page"]
    ]},
    { v: "0.9.1", d: "2026-10-30", items: [
      ["عنوان «تاريخي» ما بيتكررش مع التابات، وتظبيطات صغيرة في الترتيب الأسبوعي", "The history title no longer repeats the tabs, plus small leaderboard fixes"]
    ]},
    { v: "0.9.0", d: "2026-10-30", big: true, items: [
      ["الترتيب الأسبوعي: بتتنافس مع ناس في نفس مستواك (ريشة، قلم، كاتب، خطّاط، طقطاق)", "Weekly leaderboard: you compete with people at your level (five leagues)"],
      ["ترتيب بالسرعة، وبالتحسّن عن مستواك، وبالدقايق اللي اتمرنتها", "Rank by speed, by improvement over your own level, or by minutes practiced"],
      ["الانضمام اختياري، وتقدر تختار اسمك أو تخرج في أي وقت", "Joining is optional; pick your display name or leave any time"]
    ]},
    { v: "0.8.0", d: "2026-10-30", big: true, items: [
      ["إيدين على الكيبورد: بتوريك تحط صوابعك فين، والصباع اللي عليه الدور بيتحرك للزرار", "Hands on the keyboard: shows where your fingers rest and moves the right finger to each key"],
      ["تقدر تقفلها من «إعدادات»", "You can turn them off in Settings"]
    ]},
    { v: "0.7.2", d: "2026-10-30", items: [
      ["أول ما تبدأ تكتب، الصفحة بتتظبط على النص والكيبورد بدل ما تطلع لفوق", "When you start typing, the page scrolls to the text and keyboard instead of jumping to the top"]
    ]},
    { v: "0.7.1", d: "2026-10-30", items: [
      ["حماية فورم الرسايل من السبام (Turnstile وحد للرسايل)", "Spam protection for the message form (Turnstile and rate limits)"],
      ["هيدرز أمان للموقع كله", "Security headers across the site"]
    ]},
    { v: "0.7.0", d: "2026-10-30", big: true, items: [
      ["تنبيه لو الكيبورد على اللغة الغلط، والنص بيبدأ من الأول لما تحوّل", "A heads-up when your keyboard is on the wrong language; the text restarts once you switch"],
      ["الاختصارات بتتعرض على حسب نظام جهازك (ويندوز أو ماك)", "Shortcuts are shown for your device's system (Windows or Mac)"]
    ]},
    { v: "0.6.1", d: "2026-10-30", items: [
      ["مراجعة للتصميم وتنضيف للكود", "Design review and code cleanup"],
      ["«نص رقم ١ وفي ٨٠ نص في القسم ده»", "Clearer text counter in each section"]
    ]},
    { v: "0.6.0", d: "2026-10-30", big: true, items: [
      ["«تاريخي»: العربي والإنجليزي كل واحد لوحده، وكارت لكل قسم", "History: Arabic and English kept apart, with a card per section"],
      ["الحروف اللي بتغلط فيها، وخريطة الأيام، وأحسن أرقامك، وأيام ورا بعض", "Your weak keys, a calendar of active days, personal bests and a streak"],
      ["هدف يومي بالدقايق", "A daily goal in minutes"],
      ["تنبيه بتسجيل الدخول عشان نتايجك تتحفظ", "A reminder to sign in so your results are saved"]
    ]},
    { v: "0.5.1", d: "2026-10-29", items: [
      ["Tab ما بيغيرش النص وانت بتكتب", "Tab no longer changes the text while you type"]
    ]},
    { v: "0.5.0", d: "2026-10-29", big: true, items: [
      ["قسم «قرآن»: ٨٠ آية من مصحف تنزيل", "Quran section: 80 verses from the Tanzil text"]
    ]},
    { v: "0.4.0", d: "2026-10-29", big: true, items: [
      ["نسخة إنجليزي كاملة من الموقع", "A full English version of the site"],
      ["قسم اقتباسات إنجليزي", "English quotes section"]
    ]},
    { v: "0.3.0", d: "2026-10-29", big: true, items: [
      ["هيدر ولوجو جداد", "New header and logo"],
      ["زرار «شارك نتيجتك» بيعمل صورة للنتيجة", "Share your result as an image"],
      ["قسم الاختصارات، وEsc بيوقّف الاختبار مؤقتًا", "Shortcuts section, and Esc pauses the test"],
      ["اتمرن على الكلمات اللي غلطت فيها", "Practice the words you got wrong"],
      ["التشكيل بقى على كل النصوص، وثيمات أريح للعين", "Diacritics on every text, and easier-on-the-eyes themes"]
    ]},
    { v: "0.2.0", d: "2026-10-28", big: true, items: [
      ["حسابات بـ Google: تاريخك وأحسن أرقامك على أي جهاز", "Google accounts: your history and bests on any device"],
      ["المفضلة، و«آخر مرة» بمؤشر بيمشي بسرعتك القديمة", "Favorites, and a ghost caret at your last speed"],
      ["قسم «أمثال سعودية»، وفورم «ابعتلنا رسالة»", "Saudi proverbs section, and a contact form"]
    ]},
    { v: "0.1.0", d: "2026-10-28", big: true, items: [
      ["أول نسخة من طقطقة: اختبار كتابة بالعربي على أمثال وأفلام وحواديت وشعر", "First version of Taqtaqa: an Arabic typing test on proverbs, film lines, folk tales and poetry"],
      ["كيبورد على الشاشة، وخط ثمانية، وثيمات، وتشكيل", "On-screen keyboard, the Thmanyah font, themes and diacritics"],
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
