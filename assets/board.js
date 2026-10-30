/* طقطقة: الترتيب الأسبوعي.
   - كل واحد في «دوري» مع ناس قريبين من سرعته، وما بيشوفش غير دوريه (وممكن يتفرج على الباقي)
   - الترتيب بيتصفّر كل سبت
   - ٣ ترتيبات: الأسرع، أكتر واحد اتحسّن، أكتر واحد اتمرّن
   - الدخول في الترتيب اختياري، وباسم بتختاره إنت، وتقدر تخرج منه في أي وقت
   cloud.js بيحمّل الملف ده بعد Firebase، وapp.js بيعرضه في صفحة «تاريخي» */

const EN = document.documentElement.lang === "en";
const L = (ar, en) => (EN ? en : ar);
const NUM = (n) => (EN ? String(n) : String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const WPM = L("ك/د", "wpm");

/* الدوريات: [من، لحد) كلمة في الدقيقة */
export const LEAGUES = [
  { id: 1, ar: "ريشة", en: "Feather", from: 0, to: 20 },
  { id: 2, ar: "قلم", en: "Pen", from: 20, to: 35 },
  { id: 3, ar: "كاتب", en: "Writer", from: 35, to: 50 },
  { id: 4, ar: "خطّاط", en: "Calligrapher", from: 50, to: 70 },
  { id: 5, ar: "طقطاق", en: "Taqtaq", from: 70, to: 200 }
];
const leagueName = (lg) => (EN ? lg.en : lg.ar);
const leagueFor = (wpm) => LEAGUES.find((l) => wpm < l.to) || LEAGUES[LEAGUES.length - 1];

/* الأسبوع بيبدأ السبت الساعة ١٢ بليل بتوقيت جرينتش (٢ الفجر في مصر، ٣ في السعودية) */
const DAY = 864e5;
function weekStart(t) {
  const d = new Date(t); d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - ((d.getUTCDay() + 1) % 7) * DAY;
}
const weekId = (t) => new Date(weekStart(t)).toISOString().slice(0, 10);
const langOf = (h) => h.lang || (h.src === "en" ? "en" : "ar");

/* اختبار بيتحسب في السرعة: مش تمرين، و١٥ ثانية على الأقل، ودقته ٩٠٪ أو أكتر، ورقمه منطقي */
const counts = (h) => h.src !== "practice" && h.mode !== "practice" && (h.el || 0) >= 15 && h.acc >= 90 && h.wpm > 0 && h.wpm <= 200;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/* بيحسب أرقامك في أسبوع ولغة معيّنة من تاريخك */
export function myStats(hist, lang, now = Date.now()) {
  const ws = weekStart(now), mine = hist.filter((h) => langOf(h) === lang && typeof h.t === "number");
  const week = mine.filter((h) => h.t >= ws && h.t < ws + 7 * DAY);
  const good = week.filter(counts), top = good.map((h) => h.wpm).sort((a, b) => b - a).slice(0, 3);
  const before = mine.filter((h) => h.t >= ws - 28 * DAY && h.t < ws && counts(h)).map((h) => h.wpm);
  const base = before.length >= 5 ? avg(before) : null;
  /* الدوري ثابت طول الأسبوع: من متوسطك في الـ ٤ أسابيع اللي فاتوا، ولو جديد فمن أول اختبار ليك الأسبوع ده */
  const first = good.slice().sort((a, b) => a.t - b.t)[0];
  const league = base !== null ? leagueFor(base) : first ? leagueFor(first.wpm) : LEAGUES[0];
  const nowAvg = avg(good.map((h) => h.wpm));
  return {
    week: weekId(now), lang, league,
    speed: top.length ? Math.round(avg(top) * 10) / 10 : 0,
    tests: week.length,
    minutes: Math.round(week.reduce((s, h) => s + (h.el || 0), 0) / 6) / 10,
    improve: base && good.length >= 3 ? Math.round(((nowAvg - base) / base) * 1000) / 10 : null,
    base, nowAvg
  };
}

let ctx = null; // {db, F, getUser, TQ, openSignIn}
let profile = null; // {name, hide} من حساب المستخدم
const cache = {}; // board id → {t, rows}
const state = { lang: null, tab: "speed", league: null };

export function init(c) {
  ctx = c;
  window.TQ_LB = { render, publish };
  window.dispatchEvent(new Event("tq:lb"));
}

const boardId = (week, lang, lg) => `${week}_${lang}_${lg}`;
async function loadProfile() {
  const u = ctx.getUser(); if (!u) { profile = null; return null; }
  if (profile && profile.uid === u.uid) return profile;
  const { doc, getDoc } = ctx.F;
  const d = await getDoc(doc(ctx.db, "users", u.uid));
  const lb = d.exists() && d.data().lb && typeof d.data().lb === "object" ? d.data().lb : {};
  profile = { uid: u.uid, name: typeof lb.name === "string" ? lb.name : "", hide: !!lb.hide };
  return profile;
}

/* بعد كل اختبار: بنحدّث مكانك في ترتيب الأسبوع (للي داخل الترتيب بس) */
export async function publish() {
  if (!ctx) return;
  const u = ctx.getUser(); if (!u) return;
  try {
    const p = await loadProfile(); if (!p || !p.name || p.hide) return;
    const { doc, setDoc, serverTimestamp } = ctx.F, hist = ctx.TQ.getHist();
    for (const lang of ["ar", "en"]) {
      const s = myStats(hist, lang); if (!s.tests) continue;
      await setDoc(doc(ctx.db, "leaderboard", boardId(s.week, lang, s.league.id), "players", u.uid), {
        name: p.name, speed: s.speed, tests: s.tests, minutes: s.minutes, improve: s.improve, updatedAt: serverTimestamp()
      });
      delete cache[boardId(s.week, lang, s.league.id)];
    }
  } catch (e) { console.warn("taqtaqa board", e); }
}
async function leave() {
  const u = ctx.getUser(); if (!u) return;
  const { doc, setDoc, writeBatch } = ctx.F, hist = ctx.TQ.getHist(), batch = writeBatch(ctx.db);
  for (const lang of ["ar", "en"]) { const s = myStats(hist, lang); batch.delete(doc(ctx.db, "leaderboard", boardId(s.week, lang, s.league.id), "players", u.uid)); }
  await batch.commit();
  await setDoc(doc(ctx.db, "users", u.uid), { lb: { name: profile.name || "", hide: true } }, { merge: true });
  profile.hide = true; for (const k in cache) delete cache[k];
}
async function join(name) {
  const u = ctx.getUser(); if (!u) return;
  const { doc, setDoc } = ctx.F;
  await setDoc(doc(ctx.db, "users", u.uid), { lb: { name, hide: false } }, { merge: true });
  profile = { uid: u.uid, name, hide: false };
  await publish();
}
async function players(id) {
  const c = cache[id]; if (c && Date.now() - c.t < 60e3) return c.rows;
  const { collection, getDocs } = ctx.F;
  const snap = await getDocs(collection(ctx.db, "leaderboard", id, "players"));
  const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((r) => typeof r.name === "string");
  cache[id] = { t: Date.now(), rows };
  return rows;
}

const NAME_RE = /^[\p{L}\p{N} _.\-]{2,20}$/u;
const fmtVal = (tab, r) => tab === "speed" ? `${NUM(Math.round(r.speed))} <small>${WPM}</small>`
  : tab === "improve" ? `${r.improve > 0 ? "+" : r.improve < 0 ? "−" : ""}${NUM(Math.abs(Math.round(r.improve)))}${L("٪", "%")}`
  : `${NUM(Math.round(r.minutes))} <small>${L("دقيقة", "min")}</small>`;

/* الترتيب في صفحة «تاريخي» */
export async function render(root) {
  if (!ctx) return;
  const hist = ctx.TQ.getHist(), u = ctx.getUser();
  if (!state.lang) state.lang = hist.some((h) => langOf(h) === "ar") || !hist.length ? "ar" : "en";
  const me = myStats(hist, state.lang);
  if (!state.league) state.league = me.league.id;
  const lg = LEAGUES.find((l) => l.id === state.league) || LEAGUES[0];
  const ws = weekStart(Date.now()), left = Math.max(1, Math.ceil((ws + 7 * DAY - Date.now()) / DAY));
  root.innerHTML = `<div class="hempty">${L("بيحمّل الترتيب…", "Loading the leaderboard…")}</div>`;
  let rows = [], p = null, failed = false;
  try { [rows, p] = await Promise.all([players(boardId(me.week, state.lang, lg.id)), u ? loadProfile() : null]); }
  catch (e) { failed = true; console.warn("taqtaqa board", e); }
  const joined = !!(u && p && p.name && !p.hide);
  /* الترتيب نفسه: الأسرع، أو اللي اتحسّن، أو اللي اتمرّن */
  const key = state.tab, list = rows
    .filter((r) => key === "speed" ? r.speed > 0 : key === "improve" ? typeof r.improve === "number" : r.minutes > 0)
    .sort((a, b) => (b[key] - a[key]) || (b.speed - a.speed));
  const myIdx = u ? list.findIndex((r) => r.uid === u.uid) : -1;
  /* أول ٣ دايمًا، وبعدين إنت و٥ فوقك و٥ تحتك */
  const show = new Set([0, 1, 2]);
  if (myIdx >= 0) { for (let i = myIdx - 5; i <= myIdx + 5; i++) if (i >= 0 && i < list.length) show.add(i); }
  else { for (let i = 3; i < 10 && i < list.length; i++) show.add(i); }
  let html = "", prev = -1;
  [...show].sort((a, b) => a - b).forEach((i) => {
    if (i >= list.length) return;
    if (prev >= 0 && i > prev + 1) html += `<li class="gap" aria-hidden="true">…</li>`;
    const r = list[i], mine = myIdx === i;
    html += `<li class="${mine ? "me" : ""}"><span class="rk">${NUM(i + 1)}</span><span class="nm">${esc(r.name)}${mine ? ` <em>${L("إنت", "you")}</em>` : ""}</span><span class="vl">${fmtVal(key, r)}</span></li>`;
    prev = i;
  });
  /* فاضلك قد إيه وتعدّي اللي قدامك */
  let chase = "";
  if (myIdx > 0) {
    const a = list[myIdx - 1], m = list[myIdx], d = key === "speed" ? Math.ceil(a.speed - m.speed + .1) : key === "improve" ? Math.ceil(a.improve - m.improve + .1) : Math.ceil(a.minutes - m.minutes + .1);
    chase = key === "speed" ? L(`فاضلك ${NUM(d)} ك/د وتعدّي ${esc(a.name)}`, `${d} wpm more to pass ${esc(a.name)}`)
      : key === "improve" ? L(`فاضلك ${NUM(d)}٪ تحسّن وتعدّي ${esc(a.name)}`, `${d}% more improvement to pass ${esc(a.name)}`)
      : L(`فاضلك ${NUM(d)} دقيقة تمرين وتعدّي ${esc(a.name)}`, `${d} more minutes of practice to pass ${esc(a.name)}`);
  } else if (myIdx === 0 && list.length > 1) chase = L("إنت الأول في الدوري ده الأسبوع ده 🎉", "You're first in this league this week 🎉");
  /* هتطلع الدوري اللي بعده؟ */
  const next = LEAGUES.find((l) => l.id === me.league.id + 1);
  const promo = me.nowAvg && next ? (me.nowAvg >= next.from
    ? L(`متوسطك الأسبوع ده ${NUM(Math.round(me.nowAvg))} ك/د، ولو فضل كده هتطلع دوري «${next.ar}» الأسبوع الجاي.`, `Your average this week is ${Math.round(me.nowAvg)} wpm. Keep it up and you move up to ${next.en} next week.`)
    : L(`متوسطك الأسبوع ده ${NUM(Math.round(me.nowAvg))} ك/د، وفاضلك ${NUM(Math.ceil(next.from - me.nowAvg))} وتطلع دوري «${next.ar}».`, `Your average this week is ${Math.round(me.nowAvg)} wpm. ${Math.ceil(next.from - me.nowAvg)} more and you move up to ${next.en}.`)) : "";
  const tabs = [["speed", L("الأسرع", "Fastest")], ["improve", L("اتحسّن أكتر", "Most improved")], ["minutes", L("اتمرّن أكتر", "Most practice")]];
  const tabNote = { speed: L("متوسط أحسن ٣ اختبارات ليك الأسبوع ده (١٥ ثانية أو أكتر، ودقة ٩٠٪ أو أكتر)", "Average of your best 3 tests this week (15 seconds or longer, 90% accuracy or more)"),
    improve: L("متوسطك الأسبوع ده قصاد متوسطك في الـ ٤ أسابيع اللي فاتوا. بيظهر بعد ٣ اختبارات الأسبوع ده و٥ قبله", "This week's average against your average over the 4 weeks before. Shows after 3 tests this week and 5 before"),
    minutes: L("كل الدقايق اللي كتبتها الأسبوع ده", "All the minutes you typed this week") }[key];
  const hasEn = hist.some((h) => langOf(h) === "en");
  root.innerHTML = `
    <div class="lbtop">
      <div class="lbleague"><span class="lbl">${L("دوريك", "Your league")}</span><b>${esc(leagueName(me.league))}</b><span class="rng">${me.league.to === 200 ? `${NUM(me.league.from)}+` : `${NUM(me.league.from)}–${NUM(me.league.to)}`} ${WPM}</span></div>
      <div class="lbweek">${L(`الترتيب بيبدأ من جديد كل سبت. ${left === 1 ? "فاضل يوم واحد" : left === 2 ? "فاضل يومين" : `فاضل ${NUM(left)} أيام`}.`, `The leaderboard starts over every Saturday. ${left} ${left === 1 ? "day" : "days"} left.`)}</div>
    </div>
    ${promo ? `<p class="lbpromo">${promo}</p>` : ""}
    ${!u ? `<div class="loginline"><span>${L("سجّل دخول وادخل الترتيب الأسبوعي مع ناس قريبين من سرعتك.", "Sign in to join the weekly leaderboard with people near your speed.")}</span><span class="lbtns"><button type="button" class="pri" id="lbsign">${L("سجّل دخول", "Sign in")}</button></span></div>`
      : !joined ? `<form class="lbjoin" id="lbjoin"><b>${L("ادخل الترتيب الأسبوعي", "Join the weekly leaderboard")}</b><span>${L("اختار اسم يظهر بيه للناس، مش لازم يكون اسمك الحقيقي. تقدر تخرج من الترتيب في أي وقت.", "Pick a name people will see. It doesn't have to be your real name. You can leave any time.")}</span>
        <div class="srow"><input id="lbname" maxlength="20" autocomplete="nickname" value="${esc((p && p.name) || (u.displayName || "").split(" ")[0].slice(0, 20))}" aria-label="${L("الاسم اللي هيظهر", "Display name")}"><button type="submit" class="pri">${L("ادخل الترتيب", "Join")}</button></div><span class="err" id="lberr" role="alert"></span></form>` : ""}
    <div class="hbar">
      <div class="seg" id="lbtabs">${tabs.map(([v, t]) => `<button type="button" data-v="${v}" class="${v === key ? "on" : ""}">${t}</button>`).join("")}</div>
      ${hasEn ? `<div class="seg" id="lblang"><button type="button" data-v="ar" class="${state.lang === "ar" ? "on" : ""}">${L("عربي", "Arabic")}</button><button type="button" data-v="en" class="${state.lang === "en" ? "on" : ""}">${L("إنجليزي", "English")}</button></div>` : ""}
    </div>
    <div class="lbleagues" id="lbleagues">${LEAGUES.map((l) => `<button type="button" data-v="${l.id}" class="${l.id === lg.id ? "on" : ""}${l.id === me.league.id ? " mine" : ""}">${esc(leagueName(l))}</button>`).join("")}</div>
    <p class="lbnote">${tabNote}</p>
    ${failed ? `<div class="hempty">${L("ما قدرناش نجيب الترتيب دلوقتي. جرّب تاني بعد شوية.", "We couldn't load the leaderboard right now. Try again in a bit.")}</div>`
      : list.length ? `<ol class="lblist">${html}</ol>${chase ? `<p class="lbchase">${chase}</p>` : ""}`
      : `<div class="hempty">${L("لسه محدش في الترتيب ده الأسبوع ده. خلّص اختبار وكن أول واحد.", "Nobody is on this board yet this week. Finish a test and be the first.")}</div>`}
    ${joined ? `<p class="lbfoot">${L(`بتظهر في الترتيب باسم «${esc(p.name)}».`, `You appear as "${esc(p.name)}".`)} <button type="button" id="lbleave">${L("اخرج من الترتيب", "Leave the leaderboard")}</button></p>` : ""}`;
  const $ = (id) => document.getElementById(id), again = () => render(root);
  if ($("lbsign")) $("lbsign").onclick = () => ctx.openSignIn();
  $("lbtabs").onclick = (e) => { const b = e.target.closest("button"); if (b) { state.tab = b.dataset.v; again(); } };
  if ($("lblang")) $("lblang").onclick = (e) => { const b = e.target.closest("button"); if (b) { state.lang = b.dataset.v; state.league = null; again(); } };
  $("lbleagues").onclick = (e) => { const b = e.target.closest("button"); if (b) { state.league = +b.dataset.v; again(); } };
  if ($("lbjoin")) $("lbjoin").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("lbname").value.trim().replace(/\s+/g, " ");
    if (!NAME_RE.test(name)) { $("lberr").textContent = L("الاسم لازم يبقى من ٢ لـ ٢٠ حرف أو رقم.", "The name needs 2 to 20 letters or numbers."); return; }
    try { await join(name); again(); } catch (ex) { $("lberr").textContent = L("ما قدرناش ندخّلك الترتيب. جرّب تاني.", "We couldn't add you. Try again."); }
  };
  if ($("lbleave")) $("lbleave").onclick = async () => { try { await leave(); again(); } catch (ex) { console.warn(ex); } };
}
