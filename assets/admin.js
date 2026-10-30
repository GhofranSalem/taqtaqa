// طقطقة: صفحة الإحصائيات (/admin). بتسجّل دخول بـ Google وتجيب الأرقام من /api/stats.
// الصفحة نفسها ما فيهاش أي أرقام؛ السيرفر بيرجّعها بس لو الحساب هو حساب صاحب الموقع.
const V = "https://www.gstatic.com/firebasejs/10.12.2/";
const [{ initializeApp }, A] = await Promise.all([import(V + "firebase-app.js"), import(V + "firebase-auth.js")]);
const app = initializeApp({
  apiKey: "AIzaSyDoUjqkGOiC-ogyhN2mR8ScowPv_YfUDsY",
  authDomain: "taqtaqa.com",
  projectId: "taqtaqa-type",
  appId: "1:506636500827:web:4c264b5dd9041cb5ea247e"
});
const auth = A.getAuth(app);
auth.languageCode = "ar";

const $ = (id) => document.getElementById(id);
const NUM = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SRC = { masry: "أمثال مصرية", saudi: "أمثال سعودية", kalam: "كلام مصري", aflam: "أفلام", hawadit: "حواديت", hekam: "حكم وتراث", sheer: "شعر", tashkeel: "تشكيل", mix: "مكس", fav: "مفضلتي", words: "كلمات", en: "إنجليزي", quran: "قرآن", practice: "تمرين", other: "تاني" };
const NAMES = { ar: "عربي", en: "إنجليزي", mobile: "موبايل", desktop: "كمبيوتر" };
let regions = null;
try { regions = new Intl.DisplayNames(["ar"], { type: "region" }); } catch {}
const country = (c) => c === "XX" ? "مش معروف" : (regions && regions.of(c)) || c;

let timer = null;

function gate(msg, showBtn = true) {
  $("dash").hidden = true; $("gate").hidden = false;
  $("gatemsg").textContent = msg; $("signin").hidden = !showBtn;
}

$("signin").onclick = async () => {
  $("gateerr").hidden = true;
  try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
  catch (e) { $("gateerr").textContent = "ما قدرناش نسجّل الدخول. جرّب تاني."; $("gateerr").hidden = false; }
};
$("out").onclick = () => A.signOut(auth);

A.onAuthStateChanged(auth, (u) => {
  clearInterval(timer);
  $("out").hidden = !u;
  $("who").textContent = u ? u.email || "" : "";
  if (!u) return gate("الصفحة دي لصاحب الموقع بس. سجّل دخول بحسابك.");
  load();
  timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && auth.currentUser) load(); });

async function load() {
  const u = auth.currentUser; if (!u) return;
  let r;
  try {
    r = await fetch("/api/stats", { headers: { authorization: "Bearer " + await u.getIdToken() }, cache: "no-store" });
  } catch { $("upd").textContent = "مفيش اتصال"; return; }
  if (r.status === 403) { clearInterval(timer); return gate("الحساب ده مش مسموحله يشوف الإحصائيات.", false); }
  if (!r.ok) { $("upd").textContent = "حصلت مشكلة، هنجرّب تاني"; return; }
  render(await r.json());
}

function rows(el, pairs, fmt = (k) => k) {
  const list = Array.isArray(pairs) ? pairs : Object.entries(pairs || {}).sort((a, b) => b[1] - a[1]);
  if (!list.length) { $(el).innerHTML = `<li class="empty">لسه مفيش</li>`; return; }
  const max = Math.max(...list.map((x) => x[1]));
  $(el).innerHTML = list.map(([k, v]) => `<li><span>${esc(fmt(k))}</span><b>${NUM(v)}</b><span class="bar"><i style="width:${Math.round((v / max) * 100)}%"></i></span></li>`).join("");
}

function render(d) {
  $("gate").hidden = true; $("dash").hidden = false;
  const t = d.today;
  $("k-live").textContent = NUM(d.live.total);
  $("k-visits").textContent = NUM(t.visits);
  $("k-tests").textContent = NUM(t.tests);
  $("k-wpm").textContent = NUM(t.avgWpm);
  $("k-acct").textContent = NUM(t.accounts);
  $("k-new").textContent = NUM(t.signups);
  $("k-fb").textContent = NUM(t.feedback);
  $("k-lbar").textContent = NUM(d.leaderboard ? d.leaderboard.ar : 0);
  $("k-lben").textContent = NUM(d.leaderboard ? d.leaderboard.en : 0);
  $("k-tg").textContent = d.telegram == null ? "؟" : NUM(d.telegram);
  rows("l-lang", d.live.lang, (k) => NAMES[k] || k);
  rows("l-dev", d.live.dev, (k) => NAMES[k] || k);
  rows("l-ctry", d.live.ctry, country);
  rows("t-src", t.src, (k) => SRC[k] || k);
  rows("t-ctry", t.ctry, country);
  rows("t-ref", t.ref);
  rows("t-ld", Object.entries(t.lang || {}).concat(Object.entries(t.dev || {})), (k) => NAMES[k] || k);
  chart(d.days);
  $("upd").textContent = "آخر تحديث " + new Date(d.now).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
}

/* أعمدة الزيارات والاختبارات لآخر ١٤ يوم */
function chart(days) {
  const W = 700, H = 200, pad = 26, bw = (W - pad) / days.length;
  const max = Math.max(1, ...days.map((x) => Math.max(x.visits, x.tests)));
  const y = (v) => H - pad - (v / max) * (H - pad - 14);
  let s = `<line x1="0" x2="${W}" y1="${H - pad}" y2="${H - pad}" stroke="#2a2a2a"/>`;
  days.forEach((x, i) => {
    // من اليمين للشمال، زي الكتابة العربي
    const cx = W - (i + 0.5) * bw, w = Math.min(14, bw / 3);
    s += `<rect x="${cx - w - 1}" y="${y(x.visits)}" width="${w}" height="${H - pad - y(x.visits)}" rx="3" fill="#ffc799"><title>${NUM(x.visits)} زيارة</title></rect>`;
    s += `<rect x="${cx + 1}" y="${y(x.tests)}" width="${w}" height="${H - pad - y(x.tests)}" rx="3" fill="#99ffe4"><title>${NUM(x.tests)} اختبار</title></rect>`;
    if (x.visits) s += `<text x="${cx - w / 2 - 1}" y="${y(x.visits) - 4}" fill="#9a9a9a" font-size="10" text-anchor="middle">${NUM(x.visits)}</text>`;
    s += `<text x="${cx}" y="${H - 8}" fill="#9a9a9a" font-size="11" text-anchor="middle">${NUM(Number(x.day.slice(8)))}/${NUM(Number(x.day.slice(5, 7)))}</text>`;
  });
  $("chart").innerHTML = s;
}
