#!/usr/bin/env node
/* بيعمل النسخة الإنجليزي en/index.html من index.html.
   الكود واحد في النسختين؛ الفرق في كلام الصفحة بس. شغّله بعد أي تعديل في index.html:
   node tools/build-en.js
   ولو في جملة عربي جديدة في الصفحة ومالهاش ترجمة هنا، السكريبت بيقف ويقولك عليها. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
let s = fs.readFileSync(path.join(root, "index.html"), "utf8");

const SITE = "https://taqtaqa.com/en/";
const DESC = "Taqtaqa is a free Arabic typing test and Arabic keyboard trainer. Type real Egyptian and Saudi proverbs, famous film lines, folk tales and poetry, with an on-screen Arabic keyboard, diacritics practice and English quotes.";

/* [النص العربي، الترجمة]. كل سطر لازم يلاقي اللي يبدّله، وإلا السكريبت بيقف */
const T = [
  ['<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">'],
  ['<meta name="apple-mobile-web-app-title" content="طقطقة">', '<meta name="apple-mobile-web-app-title" content="Taqtaqa">'],
  ['<link rel="canonical" href="https://taqtaqa.com/">', `<link rel="canonical" href="${SITE}">`],
  ['<meta property="og:site_name" content="طقطقة">', '<meta property="og:site_name" content="Taqtaqa">'],
  ['<meta property="og:locale" content="ar_EG">', '<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="ar_EG">'],
  ['<meta property="og:url" content="https://taqtaqa.com/">', `<meta property="og:url" content="${SITE}">`],
  ['<meta property="og:title" content="طقطقة: اختبار سرعة الكتابة بالعربي">', '<meta property="og:title" content="Taqtaqa: Arabic typing test">'],
  ['<meta name="twitter:title" content="طقطقة: اختبار سرعة الكتابة بالعربي">', '<meta name="twitter:title" content="Taqtaqa: Arabic typing test">'],
  ['<meta property="og:image:alt" content="طقطقة: موقع تدريب على الكتابة بالعربي">', '<meta property="og:image:alt" content="Taqtaqa: Arabic typing practice">'],
  ['طقطقة موقع مجاني تتعلم فيه الكتابة على الكيبورد العربي وتقيس سرعتك، على أمثال مصرية وسعودية وجمل من الأفلام وحواديت وشعر، ومعاها تدريب على التشكيل.', DESC],
  ['<title>طقطقة Taqtaqa | اختبار سرعة الكتابة بالعربي وتعلم الكيبورد</title>', '<title>Taqtaqa | Arabic Typing Test and Arabic Keyboard Practice</title>'],
  /* الملفات من جذر الموقع، عشان الصفحة في فولدر en/ */
  ['href="manifest.webmanifest"', 'href="/manifest.webmanifest"'],
  ['href="icons/', 'href="/icons/'],
  ['href="favicon.ico"', 'href="/favicon.ico"'],
  ['href="fonts/', 'href="/fonts/'],
  ['href="assets/', 'href="/assets/'],
  ['src="assets/', 'src="/assets/'],
  ['src="cloud.js"', 'src="/cloud.js"'],

  ['<div class="page" dir="rtl" lang="ar">', '<div class="page" dir="ltr" lang="en">'],
  ['title="ابدأ من جديد" aria-label="طقطقة، ابدأ من جديد"', 'title="Start over" aria-label="Taqtaqa, start over"'],
  ['<span class="lw" id="logoword">طقطقة</span>', '<span class="lw" id="logoword">Taqtaqa</span>'],
  ['<span id="tagtext">اتمرن على الكتابة بالعربي</span>', '<span id="tagtext">Practice typing in Arabic</span>'],
  ['data-s="؟">شرح الموقع<', 'data-s="?">Tour<'],
  ['>تاريخي<', '>History<'],
  ['title="النصوص اللي حفظتها">مفضلتي<', 'title="Texts you saved">Favorites<'],
  ['<a class="langbtn" id="langbtn" href="/en/" hreflang="en" lang="en" title="Taqtaqa in English">EN</a>', '<a class="langbtn" id="langbtn" href="/" hreflang="ar" lang="ar" title="طقطقة بالعربي">عربي</a>'],
  ['aria-label="الثيمات"', 'aria-label="Themes"'],
  ['<span class="sr" id="tname">طقطقة</span>', '<span class="sr" id="tname">Taqtaqa</span>'],
  ['aria-label="إعدادات الاختبار"', 'aria-label="Test settings"'],
  ['>أمثال مصرية<', '>Egyptian proverbs<'],
  ['>أمثال سعودية<', '>Saudi proverbs<'],
  ['>كلام مصري<', '>Egyptian Arabic<'],
  ['title="جمل مشهورة من أفلام مصرية">أفلام<', 'title="Famous lines from Egyptian films">Films<'],
  ['>حواديت<', '>Folk tales<'],
  ['>حكم وتراث<', '>Wisdom<'],
  ['>شعر<', '>Poetry<'],
  ['title="آيات من القرآن الكريم">قرآن<', 'title="Verses from the Quran">Quran<'],
  ['title="اقتباسات بالإنجليزي">إنجليزي<', 'title="Quotes in English">English<'],
  ['>مكس<', '>Mix<'],
  ['data-v="words">كلمات<', 'data-v="words">Words<'],
  ['>وقت<', '>Time<'],
  ['>عدد كلمات<', '>Words<'],
  ['>اقتباس<', '>Quote<'],
  ['>١٥<', '>15<'], ['>٣٠<', '>30<'], ['>٦٠<', '>60<'], ['>١٢٠<', '>120<'],
  ['>١٠<', '>10<'], ['>٢٥<', '>25<'], ['>٥٠<', '>50<'], ['>١٠٠<', '>100<'],
  ['>الكل<', '>All<'],
  ['>قصير<', '>Short<'], ['>متوسط<', '>Medium<'], ['>طويل<', '>Long<'], ['>طويل جدا<', '>Very long<'],
  ['>إعدادات<span class="badge" id="setbadge" hidden>بالتشكيل</span>', '>Settings<span class="badge" id="setbadge" hidden>Diacritics</span>'],
  ['aria-label="إعدادات"', 'aria-label="Settings"'],
  ['<h4>الكتابة</h4>', '<h4>Typing</h4>'],
  ['التشكيل<small>الحركات بتظهر ولازم تكتبها</small>', 'Diacritics<small>Arabic marks show up and you type them too</small>'],
  ['تساهل في الهمزات<small>أ إ آ = ا، ة = ه، ى = ي</small>', 'Lenient letters<small lang="ar" dir="rtl">أ إ آ = ا، ة = ه، ى = ي</small>'],
  ['علامات الترقيم<small>النقط والفواصل جوه النص</small>', 'Punctuation<small>Periods and commas inside the text</small>'],
  ['مؤشر آخر مرة<small>لو كتبت النص قبل كده، مؤشر بيمشي بسرعتك القديمة</small>', 'Last-time caret<small>If you typed the text before, a caret moves at your old speed</small>'],
  ['الكيبورد<small>بيوريك الزرار الجاي</small>', 'Keyboard<small>Shows you the next key</small>'],
  ['الإيدين على الكيبورد<small>بتوريك أنهي صباع يدوس كل زرار</small>', 'Hands on the keyboard<small>Shows which finger presses each key</small>'],
  ['<h4>خط النص</h4>', '<h4>Text font</h4>'],
  ['<h4>هدف يومي</h4>', '<h4>Daily goal</h4>'],
  ['data-v="0">مفيش<', 'data-v="0">Off<'],
  ['data-v="5">٥ د<', 'data-v="5">5 min<'],
  ['data-v="10">١٠ د<', 'data-v="10">10 min<'],
  ['data-v="15">١٥ د<', 'data-v="15">15 min<'],
  ['data-v="20">٢٠ د<', 'data-v="20">20 min<'],
  ['data-v="30">٣٠ د<', 'data-v="30">30 min<'],
  ['data-v="45">٤٥ د<', 'data-v="45">45 min<'],
  ['data-v="60">ساعة<', 'data-v="60">1 hour<'],
  ['aria-expanded="false">ثمانية<', 'aria-expanded="false">Thmanyah<'],
  ['<h4>حجم النص</h4>', '<h4>Text size</h4>'],
  ['aria-label="صغير">أ<', 'aria-label="Small">A<'],
  ['aria-label="عادي">أ<', 'aria-label="Normal">A<'],
  ['aria-label="كبير">أ<', 'aria-label="Large">A<'],
  ['>اضغط هنا أو اكتب أي حرف عشان تبدأ<', '>Click here or type any letter to start<'],
  ['<b>واقف مؤقتًا</b><span><kbd>Esc</kbd> أو أي حرف تكمّل</span><span><bdi dir="ltr"><kbd>Shift</kbd>+<kbd>Enter</kbd></bdi> ابدأ النص من الأول</span><span><kbd>Tab</kbd> نص تاني</span>',
   '<b>Paused</b><span><kbd>Esc</kbd> or any letter to resume</span><span><kbd>Shift</kbd>+<kbd>Enter</kbd> restart the text</span><span><kbd>Tab</kbd> another text</span>'],
  ['aria-label="اكتب هنا"', 'aria-label="Type here"'],
  ['aria-label="تاريخ الاختبارات"', 'aria-label="Test history"'],
  ['<h2 id="htitle" class="sr">تاريخك</h2>', '<h2 id="htitle" class="sr">Your history</h2>'],
  ['role="tab">تاريخك</button>', 'role="tab">History</button>'],
  ['role="tab">الترتيب الأسبوعي</button>', 'role="tab">Weekly leaderboard</button>'],
  ['>محفوظ على المتصفح ده بس. سجّل دخول عشان يتحفظ في حسابك ويظهر على أي جهاز.<', '>Saved in this browser only. Sign in to keep it in your account and see it on any device.<'],
  ['>رجوع للكتابة <kbd>', '>Back to typing <kbd>'],
  ['<span id="kblabel">ترتيب الكيبورد</span>', '<span id="kblabel">Keyboard layout</span>'],
  ['>ويندوز (Arabic PC)<', '>Windows (Arabic PC)<'],
  ['>ماك<', '>Mac<'],
  ['>ويندوز<', '>Windows<'],
  ['>اختصارات هتساعدك تبقى سريع<', '>Shortcuts that help you type faster<'],
  ['aria-label="نظام التشغيل"', 'aria-label="Operating system"'],
  ['id="supbtn">ادعم طقطقة<', 'id="supbtn">Support Taqtaqa<'],
  ['<a href="privacy.html">الخصوصية</a><a href="credits.html">المصادر والرخصة</a><a href="changelog.html">سجل التحديثات</a><a href="https://t.me/taqtaqaclub" target="_blank" rel="noopener">مجتمع طقطقة</a>', '<a href="privacy.html">Privacy</a><a href="credits.html">Credits and license</a><a href="changelog.html">Changelog</a><a href="https://t.me/taqtaqaclub" target="_blank" rel="noopener">Community</a>'],
  ['<b>انضم لمجتمع طقطقة</b>', '<b>Join the Taqtaqa community</b>'],
  ['<span>جروب على تليجرام: شارك نتايجك واقتراحاتك، وأي مشكلة بتوصلنا على طول.</span>', '<span>A Telegram group: share your results and ideas, and any issue reaches us right away.</span>'],
  ['rel="noopener">ادخل الجروب</a>', 'rel="noopener">Join the group</a>'],
  ['id="ver" href="changelog.html">تجريبي<', 'id="ver" href="changelog.html">Beta<'],
  ['aria-label="خط النص"', 'aria-label="Text font"'],
  ['<div class="sbox" dir="rtl">', '<div class="sbox" dir="ltr">'],
  ['aria-label="قفل"', 'aria-label="Close"'],
  ['<h3 id="stitle">ادعم طقطقة</h3>', '<h3 id="stitle">Support Taqtaqa</h3>'],
  ['<p>طقطقة مجاني ومن غير إعلانات. لو عجبك، دي حاجات بسيطة بتفرق معانا كتير.</p>', '<p>Taqtaqa is free and has no ads. If you like it, these small things make a big difference.</p>'],
  ['<b>شارك الموقع</b>', '<b>Share the site</b>'],
  ['<span>ابعته لحد بيحب يتمرن على الكتابة، أو بيتعلم عربي.</span>', '<span>Send it to someone who likes to practice typing, or who is learning Arabic.</span>'],
  ['>انسخ اللينك<', '>Copy link<'],
  ['>واتساب<', '>WhatsApp<'], ['>تيليجرام<', '>Telegram<'], ['>إكس<', '>X<'],
  ['<b>حط نجمة على GitHub</b>', '<b>Star it on GitHub</b>'],
  ['<span>النجوم بتساعد ناس أكتر يلاقوا المشروع.</span>', '<span>Stars help more people find the project.</span>'],
  ['>★ افتح الريبو<', '>★ Open the repo<'],
  ['<b>ابعتلنا رسالة</b>', '<b>Send us a message</b>'],
  ['<span>اقترح مثل أو جملة، أو قولنا على غلطة، أو اكتب رأيك. من غير تسجيل.</span>', '<span>Suggest a proverb or a line, report a mistake, or tell us what you think. No sign-in needed.</span>'],
  ['aria-label="نوع الرسالة"', 'aria-label="Message type"'],
  ['>اقتراح نص<', '>Suggest a text<'], ['>غلطة<', '>Mistake<'], ['>رأي<', '>Feedback<'],
  ['placeholder="اكتب هنا…" aria-label="الرسالة"', 'placeholder="Write here…" aria-label="Message"'],
  ['placeholder="إيميلك، لو عايز رد (اختياري)" aria-label="إيميلك، لو عايز رد"', 'placeholder="Your email, if you want a reply (optional)" aria-label="Your email, if you want a reply"'],
  ['id="fbsend">ابعت<', 'id="fbsend">Send<'],
  ['<span class="fbmail">أو ابعت إيميل على ', '<span class="fbmail">Or email '],
  ['id="mailcopy">انسخ<', 'id="mailcopy">Copy<'],
  ['placeholder="دور بالعربي أو الإنجليزي…" aria-label="دور على ثيم"', 'placeholder="Search themes…" aria-label="Search themes"'],
  ['>غامق<', '>Dark<'], ['>فاتح<', '>Light<'],
];

const missing = [];
for (const [a, b] of T) {
  if (!s.includes(a)) { missing.push(a); continue; }
  s = s.split(a).join(b);
}

/* بيانات جوجل المنظمة */
s = s.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify([
  { "@context": "https://schema.org", "@type": "WebPage", "@id": SITE, "url": SITE, "name": "Taqtaqa: Arabic Typing Test and Arabic Keyboard Practice", "inLanguage": "en", "about": { "@id": "https://taqtaqa.com/#app" }, "isPartOf": { "@id": "https://taqtaqa.com/#website" } },
  { "@context": "https://schema.org", "@type": "WebApplication", "@id": "https://taqtaqa.com/#app", "name": "Taqtaqa", "alternateName": "طقطقة", "url": SITE, "description": DESC, "applicationCategory": "EducationalApplication", "operatingSystem": "Windows, macOS, iOS, Android, Linux", "inLanguage": ["en", "ar"], "isAccessibleForFree": true, "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "image": "https://taqtaqa.com/og-2.png", "screenshot": "https://taqtaqa.com/screens/wide-1.png", "featureList": ["Arabic typing speed test by time or word count", "On-screen Arabic keyboard for Windows and Mac layouts", "Arabic diacritics (tashkeel) practice", "Egyptian and Saudi proverbs, film lines, folk tales and poetry", "English quotes", "History and personal bests saved to your account"], "sameAs": ["https://github.com/GhofranSalem/taqtaqa"] }
])}</script>`);

/* «عن طقطقة» بالإنجليزي */
s = s.replace(/<details class="about" id="about">[\s\S]*?<\/details>/, `<details class="about" id="about">
    <summary><h2 id="about-t">About Taqtaqa</h2></summary>
    <p><strong>Taqtaqa</strong> (طقطقة) is a free <strong>Arabic typing test</strong> and <strong>Arabic keyboard trainer</strong>, like Monkeytype but made for Arabic. Instead of random words, you type real Egyptian and Saudi proverbs, famous lines from Egyptian films, Juha folk tales, wisdom, verses from the Quran and classical Arabic poetry. There is also a tab of English quotes.</p>
    <div class="acols">
      <div>
        <h3>How you practice</h3>
        <ul>
          <li><b>Timed tests</b> of 15, 30, 60 or 120 seconds, with words per minute and accuracy.</li>
          <li><b>Word count and full quote modes</b> to finish a text from start to end.</li>
          <li><b>Arabic diacritics (tashkeel):</b> turn on diacritics in Settings and every Arabic text shows simple marks (shadda, fatha, kasra, damma and tanween) that you type along with the letters.</li>
          <li><b>Practice your mistakes:</b> after each test, practice the exact words you got wrong.</li>
        </ul>
      </div>
      <div>
        <h3>What helps you</h3>
        <ul>
          <li><b>On-screen Arabic keyboard</b> for the Windows (Arabic 101) and Mac layouts that lights up the next key, including when you need Shift.</li>
          <li><b>History and personal bests</b> are saved, and if you sign in with Google or email they follow you across devices.</li>
          <li>Works on desktop and mobile. You can install it as an app, and it keeps working offline. No ads and no paywall.</li>
        </ul>
      </div>
    </div>
    <p class="alang"><a href="/" hreflang="ar" lang="ar" dir="rtl" data-lang="ar">طقطقة بالعربي: الموقع بواجهة عربي</a></p>
  </details>`);

if (missing.length) { console.error("مالقيتش الجمل دي في index.html، حدّث السكريبت:\n" + missing.join("\n")); process.exit(1); }

/* أي كلام عربي فاضل من غير ترجمة؟ (من غير التعليقات واللوجو ولينكات العربي) */
const ALLOWED = ["طقطقة بالعربي: الموقع بواجهة عربي", "طقطقة بالعربي", "عربي", "طقطقة", "أ إ آ = ا، ة = ه، ى = ي"];
let check = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
for (const a of ALLOWED) check = check.split(a).join("");
const left = [...new Set((check.match(/[^\s<>"]*[؀-ۿ][^<>"]*/g) || []).map((x) => x.trim()))];
if (left.length) { console.error("في كلام عربي من غير ترجمة:\n" + left.join("\n")); process.exit(1); }

fs.mkdirSync(path.join(root, "en"), { recursive: true });
fs.writeFileSync(path.join(root, "en", "index.html"), s.replace("<head>", "<head>\n<!-- الملف ده بيتعمل من index.html بـ node tools/build-en.js، ما تعدلوش بإيدك -->"));
console.log("اتعملت en/index.html");
