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
const SRC = { masry: "أمثال مصرية", saudi: "أمثال سعودية", kalam: "كلام مصري", aflam: "أفلام", hawadit: "حواديت", hekam: "حكم وتراث", sheer: "شعر", tashkeel: "تشكيل", mix: "مكس", fav: "مفضلتي", words: "كلمات", en: "إنجليزي", quran: "قرآن", practice: "تمرين", custom: "نصك", other: "تاني" };
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
  load(); onLogin();
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

/* ============ لوحة التحكم: التبويبات ============ */
const TABS = ["stats", "texts", "inbox"];
let tab = "stats";
function showTab(t) {
  if (!TABS.includes(t)) t = "stats";
  tab = t;
  document.querySelectorAll("#tabs button").forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
  TABS.forEach((x) => { $("tab-" + x).hidden = x !== t; });
  if (location.hash.slice(1) !== t) history.replaceState(null, "", t === "stats" ? location.pathname : "#" + t);
  if (t === "texts" && !TX.data && !TX.loading) loadTexts();
  if (t === "inbox") loadInbox();
}
$("tabs").onclick = (e) => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); };
function onLogin() { showTab(location.hash.slice(1)); if (tab !== "inbox") loadInbox(true); }

async function api(path, body) {
  const u = auth.currentUser; if (!u) throw new Error("signin");
  const init = { headers: { authorization: "Bearer " + await u.getIdToken() }, cache: "no-store" };
  if (body) { init.method = "POST"; init.headers["content-type"] = "application/json"; init.body = JSON.stringify(body); }
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) { const e = new Error(j.error || "http " + r.status); e.code = j.error; throw e; }
  return j;
}
function toast(html, ms = 6000) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.innerHTML = html;
  document.body.appendChild(d); setTimeout(() => d.remove(), ms);
}

/* ============ النصوص ============ */
/* نفس الأقسام اللي في الموقع، وكل قسم بياخد من مخزن أو اتنين في data.js.
   MAIN: المخزن اللي النص الجديد أو المنقول بيروحله */
const CATS = [
  { k: "masry", n: "أمثال مصرية", stores: ["MASRY"], main: "MASRY", src: "مثل شعبي مصري" },
  { k: "saudi", n: "أمثال سعودية", stores: ["SAUDI"], main: "SAUDI", src: "مثل شعبي سعودي" },
  { k: "kalam", n: "كلام مصري", stores: ["KALAM", "MT_EGY"], main: "KALAM", src: "كلام مصري" },
  { k: "aflam", n: "أفلام", stores: ["AFLAM"], main: "AFLAM" },
  { k: "hawadit", n: "حواديت", stores: ["HAWADIT"], main: "HAWADIT" },
  { k: "hekam", n: "حكم وتراث", stores: ["HEKAM", "MT_PD"], main: "HEKAM" },
  { k: "sheer", n: "شعر", stores: ["SHEER", "MT_PD"], main: "SHEER" },
  { k: "en", n: "إنجليزي", stores: ["EN_QUOTES"], main: "EN_QUOTES" },
  { k: "quran", n: "قرآن", stores: ["QURAN"], main: null }
];
const CAT = Object.fromEntries(CATS.map((c) => [c.k, c]));
const SHAPE = { MASRY: "s", SAUDI: "s", KALAM: "s", MT_EGY: "s", HAWADIT: "ts", HEKAM: "ts", SHEER: "ts", MT_PD: "ts", EN_QUOTES: "ts", AFLAM: "aflam", QURAN: "quran" };
const LENS = { s: "قصير", m: "متوسط", l: "طويل", xl: "طويل جدا" };
const ch = (...c) => String.fromCharCode(...c);
const TASHKEEL = new RegExp("[" + ch(0x64B) + "-" + ch(0x652) + ch(0x670, 0x640) + "]", "g");
const INVISIBLE = new RegExp("[" + ch(0x200B) + "-" + ch(0x200F) + ch(0x202A) + "-" + ch(0x202E) + ch(0x2066) + "-" + ch(0x2069, 0xFEFF, 0xA0) + "]");
const INVISIBLE_G = new RegExp(INVISIBLE.source, "g");
const lenCat = (t) => { const n = t.replace(TASHKEEL, "").length; return n < 70 ? "s" : n < 180 ? "m" : n < 320 ? "l" : "xl"; };
const keyOf = (t) => t.replace(TASHKEEL, "").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
const isAr = (t) => /[ء-ي]/.test(t);
const NUMS = (n) => NUM(n);
/* نفس قاعدة data.js: نصوص MT_PD بتاعة المتنبي والمقنع الكندي بتروح للشعر، والباقي للحكم */
const mtpdCat = ([t, s]) => (/المتنبي|المقنع/.test(s) || t.startsWith("دع الأيام")) ? "sheer" : "hekam";

const TX = { data: null, loading: false, canSave: false, items: [], ch: new Map(), added: [], shown: 60, editing: null, nid: 0 };

async function loadTexts() {
  TX.loading = true; $("tinfo").textContent = "بيحمّل النصوص من GitHub…"; $("tlist").innerHTML = "";
  try {
    const j = await api("/api/admin/texts");
    setData(j.data); TX.canSave = j.canSave;
    tokenNote();
  } catch (e) { $("tinfo").textContent = "ما قدرناش نجيب النصوص (" + (e.code || e.message) + "). جرّب تاني بعد شوية."; }
  TX.loading = false;
}
function setData(d) {
  TX.data = d; TX.items = [];
  for (const store of Object.keys(SHAPE)) {
    (d[store] || []).forEach((val, i) => {
      const it = { id: store + ":" + i, store, val, ...fields(store, val) };
      it.cat = store === "MT_PD" ? mtpdCat(val) : CATS.find((c) => c.stores.includes(store)).k;
      TX.items.push(it);
    });
  }
  buildCatSelect(); renderTexts();
}
/* القيمة في data.js ← خانات الفورم */
function fields(store, v) {
  const sh = SHAPE[store];
  if (sh === "s") return { t: v, s: "" };
  if (sh === "ts") return { t: v[0], s: v[1] };
  if (sh === "aflam") return { t: v[0], film: v[1], actor: v[2], year: v[3] };
  return { t: v[0], s: "سورة " + v[1] + "، " + v[2] + (v[3] > v[2] ? "-" + v[3] : "") };
}
/* خانات الفورم ← القيمة بشكل المخزن */
function valueFor(store, f) {
  const sh = SHAPE[store];
  if (sh === "s") return f.t;
  if (sh === "ts") return [f.t, f.s];
  return [f.t, f.film, f.actor, f.year];
}
/* النسخة الحالية من النص بعد التغييرات اللي لسه ما اتنشرتش */
function cur(it) { const c = TX.ch.get(it.id); return c && c.f ? { ...it, ...c.f, cat: c.cat || it.cat } : it; }

/* ملاحظات على النص: حاجات قواعد النصوص بتمنعها */
const BAD = /[«»“”‘’—–…]/;
const INTRO = /^(مكتوب في الحكمة|يُ?قال|قيل|قال الشاعر|قالوا قديما)\s*[:،]/;
function lint(it, dupCount) {
  const w = [];
  const all = [it.t, it.s, it.film, it.actor].filter(Boolean).join(" ");
  if (BAD.test(all) || INVISIBLE.test(all)) w.push({ m: "فيه حروف مش على الكيبورد", fix: true });
  if (/\s{2,}|^\s|\s$/.test(it.t) || /[\n\r\t]/.test(it.t)) w.push({ m: "مسافات زيادة أو سطر جديد", fix: true });
  if (INTRO.test(it.t)) w.push({ m: "فيه مقدمة زي «يُقال:»" });
  if (/^\s*-/.test(it.t)) w.push({ m: "فيه شرطة في أول السطر" });
  if (/^[^\s:،.]{1,15}\s*:/.test(it.t) && it.cat !== "en") w.push({ m: "شكله فيه اسم اللي بيتكلم في الأول" });
  if (it.cat === "en" && isAr(it.t)) w.push({ m: "فيه عربي في قسم الإنجليزي" });
  if (it.cat !== "en" && (it.t.match(/[A-Za-z]/g) || []).length > 2) w.push({ m: "فيه حروف إنجليزي" });
  const sh = SHAPE[it.store || CAT[it.cat].main];
  if (sh === "ts" && !String(it.s || "").trim()) w.push({ m: "مالوش مصدر" });
  if (sh === "aflam" && (!it.film || !it.actor || !it.year)) w.push({ m: "ناقص اسم الفيلم أو الممثل أو السنة" });
  if (dupCount > 1) w.push({ m: "مكرر مع نص تاني" });
  return w;
}
/* بيصلّح الحروف والمسافات */
function fixText(t, en) {
  return String(t || "").replace(INVISIBLE_G, "").replace(/[«»“”]/g, "").replace(/[‘’]/g, "'")
    .replace(/\s*[—–]\s*/g, en ? " - " : "، ").replace(/…/g, en ? "..." : "،").replace(/\s+/g, " ").replace(/\s+([،.,!?؟])/g, "$1").trim();
}

function liveItems() {
  const list = TX.items.map((it) => cur(it));
  return list.concat(TX.added.map((a) => ({ ...a.f, id: a.id, cat: a.cat, store: CAT[a.cat].main, isNew: true })));
}
function dupMap(list) { const m = new Map(); list.forEach((it) => { if (TX.ch.get(it.id) && TX.ch.get(it.id).del) return; const k = keyOf(it.t); m.set(k, (m.get(k) || 0) + 1); }); return m; }

function buildCatSelect() {
  const sel = $("fcat"), v = sel.value;
  sel.innerHTML = `<option value="">كل الأقسام</option>` + CATS.map((c) => `<option value="${c.k}">${c.n}</option>`).join("");
  sel.value = v;
}
function renderCounts(list) {
  const rows = CATS.map((c) => {
    const cnt = { s: 0, m: 0, l: 0, xl: 0 };
    list.forEach((it) => { if (it.cat === c.k && !(TX.ch.get(it.id) || {}).del) cnt[lenCat(it.t)]++; });
    const tot = cnt.s + cnt.m + cnt.l + cnt.xl;
    return `<tr class="pick" data-cat="${c.k}"><td>${c.n}</td>${["s", "m", "l", "xl"].map((l) => `<td class="${cnt[l] ? "" : "zero"}" data-len="${l}">${NUMS(cnt[l])}</td>`).join("")}<td><b>${NUMS(tot)}</b></td></tr>`;
  }).join("");
  $("counts").innerHTML = `<thead><tr><th>القسم</th><th>قصير</th><th>متوسط</th><th>طويل</th><th>طويل جدا</th><th>الكل</th></tr></thead><tbody>${rows}</tbody>`;
}
$("counts").onclick = (e) => {
  const tr = e.target.closest("tr[data-cat]"); if (!tr) return;
  $("fcat").value = tr.dataset.cat; const td = e.target.closest("td[data-len]"); $("flen").value = td ? td.dataset.len : "";
  TX.shown = 60; renderTexts(); $("q").scrollIntoView({ behavior: "smooth", block: "start" });
};

function renderTexts() {
  if (!TX.data) return;
  const list = liveItems(), dups = dupMap(list);
  renderCounts(list);
  const q = keyOf($("q").value.trim()), fc = $("fcat").value, fl = $("flen").value, fw = $("fwarn").checked, fch = $("fchg").checked;
  let res = list.filter((it) => {
    if (fc && it.cat !== fc) return false;
    if (fl && lenCat(it.t) !== fl) return false;
    if (fch && !it.isNew && !TX.ch.has(it.id)) return false;
    if (q && !keyOf([it.t, it.s, it.film, it.actor].filter(Boolean).join(" ")).includes(q)) return false;
    if (fw && !lint(it, dups.get(keyOf(it.t))).length) return false;
    return true;
  });
  // الجديد والمتعدل الأول
  res.sort((a, b) => (b.isNew ? 2 : TX.ch.has(b.id) ? 1 : 0) - (a.isNew ? 2 : TX.ch.has(a.id) ? 1 : 0));
  $("tinfo").textContent = res.length ? NUMS(res.length) + " نص" : "مفيش نصوص بالبحث ده";
  const html = res.slice(0, TX.shown).map((it) => TX.editing === it.id ? formHTML(it) : itemHTML(it, dups)).join("");
  $("tlist").innerHTML = html + (res.length > TX.shown ? `<button type="button" class="btn more" id="more">اعرض ${NUMS(Math.min(60, res.length - TX.shown))} كمان</button>` : "");
  if ($("more")) $("more").onclick = () => { TX.shown += 60; renderTexts(); };
  if (TX.editing) bindForm();
  renderPending();
}
function srcLine(it) {
  if (SHAPE[it.store] === "aflam") return `فيلم ${it.film} (${it.year})، ${it.actor}`;
  return it.s || CAT[it.cat].src || "";
}
function itemHTML(it, dups) {
  const c = TX.ch.get(it.id) || {}, w = lint(it, dups.get(keyOf(it.t)));
  const moved = c.cat && c.cat !== TX.items.find((x) => x.id === it.id)?.cat;
  const tags = [
    it.isNew ? `<span class="tag new">جديد</span>` : "",
    c.del ? `<span class="tag chg">هيتشال</span>` : c.f ? `<span class="tag chg">${moved ? "اتنقل لـ" + CAT[c.cat].n : "متعدل"}</span>` : "",
    `<span class="tag">${CAT[it.cat].n}</span>`, `<span class="tag">${LENS[lenCat(it.t)]}</span>`,
    ...w.map((x) => `<span class="tag warn">${esc(x.m)}</span>`)
  ].join("");
  const quran = SHAPE[it.store] === "quran";
  const btns = c.del || (it.isNew && false) ? `<button type="button" class="btn sm" data-a="undo">رجّعه</button>`
    : `${quran ? "" : `<button type="button" class="btn sm" data-a="edit">تعديل</button>`}${w.some((x) => x.fix) && !quran ? `<button type="button" class="btn sm acc" data-a="fix">صلّح الحروف</button>` : ""}${c.f || it.isNew ? `<button type="button" class="btn sm" data-a="undo">${it.isNew ? "شيله" : "رجّع الأصلي"}</button>` : ""}<button type="button" class="btn sm danger" data-a="del" ${it.isNew ? "hidden" : ""}>احذف</button>`;
  return `<div class="ti ${c.del ? "del" : c.f || it.isNew ? "ch" : ""}" data-id="${esc(it.id)}">
    <div class="tx" dir="${it.cat === "en" ? "ltr" : "rtl"}">${esc(it.t)}</div>
    <div class="ft"><span>— ${esc(srcLine(it))}</span><span class="sp"></span>${tags}</div>
    <div class="ft">${btns}</div></div>`;
}

/* فورم التعديل والإضافة */
function formHTML(it) {
  const cats = CATS.filter((c) => c.main);
  return `<div class="ti ch" data-id="${esc(it.id)}"><div class="f" id="tform">
    <textarea id="f-t" dir="${it.cat === "en" ? "ltr" : "rtl"}" aria-label="النص">${esc(it.t || "")}</textarea>
    <div class="row">
      <label style="display:grid;gap:4px"><small>القسم</small><select id="f-cat">${cats.map((c) => `<option value="${c.k}" ${c.k === it.cat ? "selected" : ""}>${c.n}</option>`).join("")}</select></label>
      <label style="display:grid;gap:4px" data-sh="ts"><small>المصدر أو القائل</small><input id="f-s" value="${esc(it.s || "")}"></label>
      <label style="display:grid;gap:4px" data-sh="aflam"><small>الفيلم</small><input id="f-film" value="${esc(it.film || "")}"></label>
      <label style="display:grid;gap:4px" data-sh="aflam"><small>الممثل</small><input id="f-actor" value="${esc(it.actor || "")}"></label>
      <label style="display:grid;gap:4px;max-width:110px" data-sh="aflam"><small>السنة</small><input id="f-year" value="${esc(it.year || "")}" placeholder="١٩٨٥"></label>
    </div>
    <div class="warns" id="f-warns"></div>
    <div class="acts"><button type="button" class="btn pri" id="f-ok" style="padding:6px 18px;font-size:14px">تمام</button><button type="button" class="btn" id="f-fix">صلّح الحروف</button><button type="button" class="btn" id="f-no">الغي</button><small id="f-len"></small></div>
  </div></div>`;
}
function formVals() { return { t: $("f-t").value, s: $("f-s").value.trim(), film: $("f-film").value.trim(), actor: $("f-actor").value.trim(), year: $("f-year").value.trim(), cat: $("f-cat").value }; }
function bindForm() {
  const sync = () => {
    const v = formVals(), sh = SHAPE[CAT[v.cat].main];
    document.querySelectorAll("#tform [data-sh]").forEach((l) => { l.hidden = l.dataset.sh !== sh; });
    $("f-t").dir = v.cat === "en" ? "ltr" : "rtl";
    const t = v.t.trim(), list = liveItems().filter((x) => x.id !== TX.editing), dup = list.some((x) => !(TX.ch.get(x.id) || {}).del && keyOf(x.t) === keyOf(t));
    const w = t ? lint({ ...v, t: v.t, store: CAT[v.cat].main }, dup ? 2 : 1) : [{ m: "اكتب النص" }];
    $("f-warns").innerHTML = w.map((x) => `<span>• ${esc(x.m)}</span>`).join("");
    $("f-len").textContent = t ? LENS[lenCat(t)] + "، " + NUMS(t.replace(TASHKEEL, "").length) + " حرف" : "";
  };
  ["f-t", "f-s", "f-film", "f-actor", "f-year", "f-cat"].forEach((id) => $(id).addEventListener("input", sync));
  $("f-fix").onclick = () => { const en = $("f-cat").value === "en"; ["f-t", "f-s", "f-film", "f-actor"].forEach((id) => { $(id).value = fixText($(id).value, en); }); sync(); };
  $("f-no").onclick = () => { TX.editing = null; dropDrafts(); renderTexts(); };
  $("f-ok").onclick = saveForm;
  $("f-t").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveForm(); } });
  sync(); $("f-t").focus();
}
function saveForm() {
  const v = formVals(), sh = SHAPE[CAT[v.cat].main], en = v.cat === "en";
  const f = { t: v.t.replace(/\s+/g, " ").trim(), s: v.s, film: v.film, actor: v.actor, year: v.year };
  const bad = !f.t || f.t.length < 2 ? "اكتب النص" : (sh === "ts" && !f.s) ? "اكتب المصدر أو القائل" : (sh === "aflam" && (!f.film || !f.actor || !f.year)) ? "اكتب الفيلم والممثل والسنة" : null;
  if (bad) { $("f-warns").innerHTML = `<span>• ${bad}</span>`; return; }
  if ([f.t, f.s, f.film, f.actor, f.year].some((x) => BAD.test(x || ""))) {
    if (!confirm("فيه حروف مش على الكيبورد. نصلّحها تلقائي؟")) return;
    ["t", "s", "film", "actor"].forEach((k) => { f[k] = fixText(f[k], en); });
  }
  const id = TX.editing;
  const a = TX.added.find((x) => x.id === id);
  if (a) { a.f = f; a.cat = v.cat; a.draft = false; }
  else if (id.startsWith("new")) TX.added.push({ id, f, cat: v.cat });
  else {
    const it = TX.items.find((x) => x.id === id);
    const changed = v.cat !== it.cat || ["t", "s", "film", "actor", "year"].some((k) => (f[k] || "") !== (it[k] || ""));
    if (changed) TX.ch.set(id, { f, cat: v.cat }); else TX.ch.delete(id);
  }
  TX.editing = null; renderTexts();
}
$("addbtn").onclick = () => {
  if (!TX.data) return;
  const cat = CAT[$("fcat").value] && CAT[$("fcat").value].main ? $("fcat").value : "masry";
  TX.editing = "new" + (++TX.nid);
  $("q").value = ""; $("fwarn").checked = false; $("fchg").checked = false;
  // الفورم بيظهر أول واحد في القايمة
  const id = TX.editing;
  dropDrafts();
  TX.added.unshift({ id, f: { t: "", s: "" }, cat, draft: true });
  renderTexts();
};
$("tlist").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, a = b.dataset.a;
  const it = TX.items.find((x) => x.id === id);
  if (a === "edit") { TX.editing = id; dropDrafts(); renderTexts(); return; }
  if (a === "del") TX.ch.set(id, { del: true });
  if (a === "undo") { if (it) TX.ch.delete(id); else TX.added = TX.added.filter((x) => x.id !== id); }
  if (a === "fix") {
    const c = cur(it), en = c.cat === "en";
    const f = { t: fixText(c.t, en), s: fixText(c.s, en), film: fixText(c.film, en), actor: fixText(c.actor, en), year: c.year };
    TX.ch.set(id, { f, cat: c.cat });
  }
  renderTexts();
});
/* فورم نص جديد اتلغى من غير ما يتكتب فيه حاجة */
function dropDrafts() { TX.added = TX.added.filter((x) => !(x.draft && !x.f.t && x.id !== TX.editing)); }
["q", "fcat", "flen", "fwarn", "fchg"].forEach((id) => $(id).addEventListener("input", () => { TX.shown = 60; renderTexts(); }));

function pendingOps() {
  const ops = [];
  TX.ch.forEach((c, id) => {
    const it = TX.items.find((x) => x.id === id); if (!it) return;
    if (c.del) { ops.push({ op: "del", store: it.store, old: it.val }); return; }
    const target = c.cat !== it.cat ? CAT[c.cat].main : it.store;
    if (target === it.store) ops.push({ op: "edit", store: it.store, old: it.val, val: valueFor(it.store, c.f) });
    else { ops.push({ op: "del", store: it.store, old: it.val }); ops.push({ op: "add", store: target, val: valueFor(target, c.f) }); }
  });
  TX.added.filter((a) => a.f.t).forEach((a) => { const st = CAT[a.cat].main; ops.push({ op: "add", store: st, val: valueFor(st, a.f) }); });
  return ops;
}
function renderPending() {
  const e = [...TX.ch.values()].filter((c) => !c.del).length, d = [...TX.ch.values()].filter((c) => c.del).length, a = TX.added.filter((x) => x.f.t).length;
  const n = e + d + a;
  $("pending").hidden = !n;
  if (!n) return;
  const parts = [];
  if (e) parts.push(NUMS(e) + " متعدل");
  if (d) parts.push(NUMS(d) + " هيتشال");
  if (a) parts.push(NUMS(a) + " جديد");
  $("pendtxt").textContent = "تغييرات لسه ما اتنشرتش: " + parts.join("، ");
  $("publish").disabled = !TX.canSave;
  $("publish").title = TX.canSave ? "" : "محتاج مفتاح GitHub الأول";
}
$("pendundo").onclick = () => { if (!confirm("تلغي كل التغييرات اللي لسه ما اتنشرتش؟")) return; TX.ch.clear(); TX.added = []; TX.editing = null; renderTexts(); };
$("publish").onclick = async () => {
  const ops = pendingOps(); if (!ops.length) return;
  const b = $("publish"); b.disabled = true; b.textContent = "بينشر…";
  try {
    const j = await api("/api/admin/texts", { ops });
    TX.ch.clear(); TX.added = []; TX.editing = null; setData(j.data);
    toast(j.nothing ? "مفيش حاجة اتغيرت." : `اتنشر ✓ الموقع هيتحدّث في حوالي دقيقة.${j.commit ? ` <a href="${esc(j.commit)}" target="_blank" rel="noopener">التعديل على GitHub</a>` : ""}`, 9000);
  } catch (e) {
    const M = { notoken: "مفتاح GitHub مش متحط في Cloudflare.", badtoken: "مفتاح GitHub مش شغال أو صلاحيته خلصت.", missing: "في نص اتغير على GitHub من مكان تاني. حدّث الصفحة وجرّب تاني.", value: "في نص شكله غلط (ناقص حاجة أو فيه حروف ممنوعة).", busy: "الملف بيتعدل دلوقتي. جرّب تاني كمان شوية." };
    toast("ما اتنشرش: " + (M[e.code] || "حصلت مشكلة (" + esc(e.code || e.message) + ")"), 9000);
  }
  b.textContent = "انشر على الموقع"; renderPending();
};
window.addEventListener("beforeunload", (e) => { if (pendingOps().length) { e.preventDefault(); e.returnValue = ""; } });
function tokenNote() {
  const n = $("tokennote"); n.hidden = TX.canSave;
  if (!TX.canSave) n.innerHTML = "<b>الحفظ لسه مش شغال.</b> تقدر تتفرج وتجهّز التعديلات، بس النشر محتاج مفتاح GitHub يتحط في إعدادات Cloudflare باسم GITHUB_TOKEN. الخطوات عندك في الشات.";
}

/* ============ الرسايل ============ */
const TYPE = { suggest: "اقتراح نص", bug: "غلطة", note: "رأي" };
const IB = { items: null, filter: "new" };
async function loadInbox(quiet) {
  if (!quiet) $("ilist").innerHTML = `<p class="empty">بيحمّل…</p>`;
  try { const j = await api("/api/admin/inbox"); IB.items = j.items; }
  catch (e) { if (!quiet) $("ilist").innerHTML = `<p class="err">ما قدرناش نجيب الرسايل (${esc(e.code || e.message)}).</p>`; return; }
  renderInbox();
}
function renderInbox() {
  const all = IB.items || [], n = all.filter((m) => m.status === "new").length;
  $("inboxcnt").hidden = !n; $("inboxcnt").textContent = NUMS(n);
  document.querySelectorAll("#ifilter button").forEach((b) => b.classList.toggle("on", b.dataset.v === IB.filter));
  const list = IB.filter === "all" ? all : all.filter((m) => m.status === IB.filter);
  if (!list.length) { $("ilist").innerHTML = `<p class="empty">${IB.filter === "new" ? "مفيش رسايل جديدة." : "مفيش رسايل هنا."}</p>`; return; }
  $("ilist").innerHTML = list.map((m) => {
    const d = new Date(m.t), when = d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) + "، " + d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
    const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.contact || "");
    return `<div class="msg st-${esc(m.status)}" data-id="${esc(m.id)}">
      <div class="mh"><span class="tag ${m.type === "bug" ? "warn" : m.type === "suggest" ? "new" : ""}">${TYPE[m.type] || esc(m.type)}</span><span>${when}</span>${m.ctry ? `<span>${esc(country(m.ctry))}</span>` : ""}${m.contact ? (mail ? `<a href="mailto:${esc(m.contact)}" dir="ltr">${esc(m.contact)}</a>` : `<span dir="auto">${esc(m.contact)}</span>`) : ""}${m.status !== "new" ? `<span class="tag">${m.status === "done" ? "اتعملت" : "اتجاهلت"}</span>` : ""}</div>
      <div class="mt" dir="auto">${esc(m.text)}</div>
      ${m.page ? `<details><summary>النص اللي كان قدامه</summary><p dir="auto">${esc(m.page)}</p></details>` : ""}
      <div class="acts">
        ${m.type === "suggest" ? `<button type="button" class="btn sm acc" data-a="addtext">ضيفه كنص</button>` : ""}
        ${m.page ? `<button type="button" class="btn sm" data-a="find">دوّر على النص</button>` : ""}
        ${m.status !== "done" ? `<button type="button" class="btn sm" data-a="done">اتعملت</button>` : ""}
        ${m.status !== "ignored" ? `<button type="button" class="btn sm" data-a="ignored">اتجاهلت</button>` : ""}
        ${m.status !== "new" ? `<button type="button" class="btn sm" data-a="new">رجّعها جديدة</button>` : ""}
        <button type="button" class="btn sm danger" data-a="delmsg">احذف</button>
      </div></div>`;
  }).join("");
}
$("ifilter").onclick = (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; IB.filter = b.dataset.v; renderInbox(); };
$("ireload").onclick = () => loadInbox();
$("ilist").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, a = b.dataset.a, m = IB.items.find((x) => x.id === id);
  if (a === "addtext") {
    showTab("texts"); $("fwarn").checked = false; $("fchg").checked = false;
    const go = () => { $("addbtn").click(); $("f-t").value = m.text.replace(/\s+/g, " ").trim(); $("f-t").dispatchEvent(new Event("input")); };
    if (TX.data) go(); else { const w = setInterval(() => { if (TX.data) { clearInterval(w); go(); } }, 200); }
    return;
  }
  if (a === "find") {
    showTab("texts");
    $("q").value = m.page.split(" ").slice(0, 4).join(" "); $("fcat").value = ""; $("flen").value = ""; $("fwarn").checked = false; $("fchg").checked = false; TX.shown = 60;
    if (TX.data) renderTexts();
    return;
  }
  b.disabled = true;
  try {
    if (a === "delmsg") { if (!confirm("تحذف الرسالة دي؟")) { b.disabled = false; return; } await api("/api/admin/inbox", { id, del: true }); IB.items = IB.items.filter((x) => x.id !== id); }
    else { await api("/api/admin/inbox", { id, status: a }); m.status = a; }
    renderInbox();
  } catch (err) { b.disabled = false; toast("ما اتحفظش (" + esc(err.code || err.message) + ")"); }
});
