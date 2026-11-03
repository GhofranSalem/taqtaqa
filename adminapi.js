// طقطقة: الـ API بتاع لوحة التحكم (/admin). لصاحب الموقع بس.
//
// /api/admin/texts   GET: كل النصوص من assets/data.js على GitHub (فرع main)
//                    POST: {ops:[...]} بيعدّل data.js ويعمل commit، وGitHub Actions بينشر الموقع في حوالي دقيقة
// /api/admin/inbox   GET: رسايل «ادعم طقطقة» المحفوظة. POST: {id, status} أو {id, del:true}
//
// تعديل النصوص محتاج مفتاح GitHub في إعدادات الـ Worker باسم GITHUB_TOKEN
// (Fine-grained token على ريبو taqtaqa بس، بصلاحية Contents: Read and write). المفتاح ما بيتكتبش في الكود أبدًا.
// /api/admin/announce GET/POST: شريط الإعلان اللي فوق في الموقع
// /api/admin/telegram GET: الأقسام اللي البوت يعرفها. POST: {text, topic, button, pin} رسالة لجروب تليجرام باسم البوت
// الرسايل محفوظة في نفس KV بتاع البوت (BOT) بمفاتيح بتبدأ بـ inbox:، والإعلان في site:announce
//
// ومن الموقع نفسه (من غير تسجيل): /api/report بلاغ عن غلطة في نص، و/api/announce بيرجّع الإعلان

import { verifyIdToken } from "./stats.js";
import { broadcast, broadcastInfo, BROADCAST_TOPICS } from "./bot.js";

const ADMIN_EMAIL = "ghofran.salem@gmail.com";
const ORIGIN = "https://taqtaqa.com";
const REPO = "GhofranSalem/taqtaqa";
const FILE = "assets/data.js";
const AUTHOR = { name: "Ghofran Salem", email: ADMIN_EMAIL };

/* المخازن اللي في data.js، وشكل كل نص فيها:
   s نص بس، ts [نص، مصدر]، aflam [نص، فيلم، ممثل، سنة]، quran [نص، سورة، من، لحد] (حذف بس).
   MT_EGY وMT_PD جوه سطر MT (من Monkeytype)، وبنعدّل ونحذف فيهم بس، والجديد بيروح للمخازن العادية */
export const STORES = {
  MASRY: "s", SAUDI: "s", KALAM: "s", MT_EGY: "s",
  HAWADIT: "ts", HEKAM: "ts", SHEER: "ts", MT_PD: "ts", EN_QUOTES: "ts",
  AFLAM: "aflam", QURAN: "quran"
};
const MT_STORES = ["MT_EGY", "MT_PD"];
const BAD_CHARS = /[«»“”—]/;

/* ---------- قراية وكتابة data.js ---------- */
const blockRe = (n) => new RegExp("^(const " + n + "\\s*=\\s*\\[)\\n([\\s\\S]*?)\\n(\\];)", "m");
const mtRe = /^const MT=(.*);$/m;

export function parseData(src) {
  const out = {};
  for (const n of Object.keys(STORES)) {
    if (MT_STORES.includes(n)) continue;
    const m = src.match(blockRe(n));
    if (!m) throw new Error("block " + n);
    // في AFLAM كان فيه فاصلتين ورا بعض (عنصر فاضي)، فبنشيلهم
    out[n] = JSON.parse("[" + m[2].replace(/\]\s*,\s*,/g, "],").replace(/,\s*$/, "") + "]").filter((x) => x != null);
  }
  const mt = src.match(mtRe);
  if (!mt) throw new Error("block MT");
  const MT = JSON.parse(mt[1]);
  out.MT_EGY = MT.MT_EGY;
  out.MT_PD = MT.MT_PD;
  return out;
}

export function writeData(src, data) {
  for (const n of Object.keys(STORES)) {
    if (MT_STORES.includes(n)) continue;
    const body = data[n].map((x) => JSON.stringify(x)).join(",\n");
    src = src.replace(blockRe(n), (_, a, __, c) => a + "\n" + body + "\n" + c);
  }
  src = src.replace(mtRe, (_, j) => {
    const MT = JSON.parse(j);
    MT.MT_EGY = data.MT_EGY; MT.MT_PD = data.MT_PD;
    return "const MT=" + JSON.stringify(MT) + ";";
  });
  return src;
}

/* بيتأكد إن النص بالشكل الصح قبل ما يتحفظ */
function valid(store, v) {
  const shape = STORES[store];
  const str = (x, min, max) => typeof x === "string" && x.trim() === x && x.length >= min && x.length <= max && !BAD_CHARS.test(x) && !/[\n\r\t]/.test(x);
  if (shape === "s") return str(v, 2, 3000);
  if (shape === "ts") return Array.isArray(v) && v.length === 2 && str(v[0], 2, 3000) && str(v[1], 1, 200);
  if (shape === "aflam") return Array.isArray(v) && v.length === 4 && str(v[0], 2, 3000) && str(v[1], 1, 120) && str(v[2], 1, 120) && str(v[3], 1, 10);
  return false;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* التعديلات: {op:"edit", store, old, val} أو {op:"del", store, old} أو {op:"add", store, val}.
   النص القديم بيتدوّر عليه بقيمته مش برقمه، عشان لو الملف اتغير في النص ما نعدّلش نص تاني */
export function applyOps(data, ops) {
  const n = { edit: 0, del: 0, add: 0 };
  for (const o of ops) {
    if (!o || !STORES[o.store] || !["edit", "del", "add"].includes(o.op)) throw err(400, "op");
    const list = data[o.store];
    if (o.op === "add") {
      if (MT_STORES.includes(o.store) || STORES[o.store] === "quran" || !valid(o.store, o.val)) throw err(400, "value");
      if (list.some((x) => same(x, o.val))) continue;
      list.push(o.val); n.add++; continue;
    }
    const i = list.findIndex((x) => same(x, o.old));
    if (i < 0) throw err(409, "missing");
    if (o.op === "del") { list.splice(i, 1); n.del++; continue; }
    if (STORES[o.store] === "quran" || !valid(o.store, o.val)) throw err(400, "value");
    list[i] = o.val; n.edit++;
  }
  return n;
}
function err(status, code) { const e = new Error(code); e.status = status; e.code = code; return e; }

/* ---------- GitHub ---------- */
function gh(env, path, init = {}) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "taqtaqa-admin", "x-github-api-version": "2022-11-28" };
  if (env.GITHUB_TOKEN) headers.authorization = "Bearer " + env.GITHUB_TOKEN;
  return fetch("https://api.github.com/repos/" + REPO + path, { ...init, headers: { ...headers, ...(init.headers || {}) } });
}
function fromB64(b) {
  const bin = atob(b.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function toB64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function readFile(env) {
  const r = await gh(env, "/contents/" + FILE + "?ref=main", { cf: { cacheTtl: 0 } });
  if (!r.ok) throw err(502, "github " + r.status);
  const j = await r.json();
  return { src: fromB64(j.content), sha: j.sha };
}
function message(n) {
  const parts = [];
  if (n.edit) parts.push("عدّل " + n.edit);
  if (n.del) parts.push("شال " + n.del);
  if (n.add) parts.push("ضاف " + n.add);
  return "النصوص من لوحة التحكم: " + parts.join("، ");
}

/* ---------- الرسايل ---------- */
const INBOX = "inbox:";
/* بيتنادى من worker.js مع كل رسالة «ادعم طقطقة». المفتاح بالعكس عشان الأحدث يطلع الأول في القايمة */
export async function saveMessage(env, msg) {
  if (!env.BOT) return;
  const id = String(1e13 - Date.now()).padStart(13, "0") + "-" + crypto.randomUUID().slice(0, 6);
  try { await env.BOT.put(INBOX + id, JSON.stringify({ ...msg, t: Date.now(), status: "new" })); } catch {}
}
const STATUSES = ["new", "done", "ignored"];

/* ---------- الطلبات ---------- */
const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: H });

export async function admin(request, env) {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "POST") return json(405, { ok: false, error: "method" });
  if (request.method === "POST" && request.headers.get("origin") !== ORIGIN) return json(403, { ok: false, error: "origin" });
  const auth = request.headers.get("authorization") || "";
  const user = auth.startsWith("Bearer ") ? await verifyIdToken(auth.slice(7)) : null;
  if (!user || user.email !== ADMIN_EMAIL || user.email_verified !== true)
    return json(user ? 403 : 401, { ok: false, error: user ? "forbidden" : "signin" });
  try {
    if (url.pathname === "/api/admin/texts") return await texts(request, env);
    if (url.pathname === "/api/admin/inbox") return await inbox(request, env);
    if (url.pathname === "/api/admin/announce") return await announceAdmin(request, env);
    if (url.pathname === "/api/admin/telegram") return await telegramAdmin(request, env);
    return json(404, { ok: false, error: "path" });
  } catch (e) {
    return json(e.status || 500, { ok: false, error: e.code || "server" });
  }
}

async function texts(request, env) {
  if (request.method === "GET") {
    const { src } = await readFile(env);
    return json(200, { ok: true, data: parseData(src), canSave: !!env.GITHUB_TOKEN });
  }
  if (!env.GITHUB_TOKEN) return json(400, { ok: false, error: "notoken" });
  const body = await request.json().catch(() => null);
  const ops = body && Array.isArray(body.ops) ? body.ops : null;
  if (!ops || !ops.length || ops.length > 500) return json(400, { ok: false, error: "ops" });
  // لو حد عدّل الملف في نفس اللحظة، GitHub بيرفض (409)، فبنجيب الجديد ونحاول تاني مرة
  for (let attempt = 0; attempt < 2; attempt++) {
    const { src, sha } = await readFile(env);
    const data = parseData(src);
    const n = applyOps(data, ops);
    if (!n.edit && !n.del && !n.add) return json(200, { ok: true, data, nothing: true });
    const out = writeData(src, data);
    parseData(out); // اتأكد إن الملف لسه سليم قبل ما يتحفظ
    const r = await gh(env, "/contents/" + FILE, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: message(n), content: toB64(out), sha, branch: "main", committer: AUTHOR, author: AUTHOR })
    });
    if (r.status === 409 || r.status === 422) continue;
    if (r.status === 401 || r.status === 403) return json(502, { ok: false, error: "badtoken" });
    if (!r.ok) return json(502, { ok: false, error: "github " + r.status });
    const j = await r.json();
    return json(200, { ok: true, data, counts: n, commit: j.commit && j.commit.html_url });
  }
  return json(409, { ok: false, error: "busy" });
}

async function inbox(request, env) {
  if (!env.BOT) return json(500, { ok: false, error: "nokv" });
  if (request.method === "GET") {
    const { keys } = await env.BOT.list({ prefix: INBOX, limit: 300 });
    const items = await Promise.all(keys.map(async (k) => {
      const v = await env.BOT.get(k.name, "json");
      return v ? { id: k.name.slice(INBOX.length), ...v } : null;
    }));
    return json(200, { ok: true, items: items.filter(Boolean) });
  }
  const b = await request.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^\d{13}-[a-f0-9-]{6}$/.test(b.id)) return json(400, { ok: false, error: "id" });
  const key = INBOX + b.id;
  if (b.del === true) { await env.BOT.delete(key); return json(200, { ok: true }); }
  if (!STATUSES.includes(b.status)) return json(400, { ok: false, error: "status" });
  const v = await env.BOT.get(key, "json");
  if (!v) return json(404, { ok: false, error: "missing" });
  v.status = b.status;
  await env.BOT.put(key, JSON.stringify(v));
  return json(200, { ok: true });
}

/* ---------- شريط الإعلان ---------- */
const ANN = "site:announce";
const cleanAnn = (a) => ({ on: !!a.on, id: String(a.id || ""), ar: String(a.ar || ""), en: String(a.en || ""), link: String(a.link || "") });
/* الموقع بيسأل عليه مرة مع كل فتحة. بيتحفظ في كاش Cloudflare دقيقة، عشان كل زيارة ما تقراش من KV */
export async function announce(request, env, ctx) {
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" };
  const ck = new Request("https://taqtaqa.com/api/announce");
  const hit = await caches.default.match(ck);
  if (hit) return hit;
  let a = null;
  try { a = env.BOT ? await env.BOT.get(ANN, "json") : null; } catch {}
  const body = a && a.on ? cleanAnn(a) : { on: false };
  const res = new Response(JSON.stringify(body), { headers: h });
  ctx.waitUntil(caches.default.put(ck, res.clone()));
  return res;
}
async function announceAdmin(request, env) {
  if (!env.BOT) return json(500, { ok: false, error: "nokv" });
  if (request.method === "GET") return json(200, { ok: true, a: cleanAnn((await env.BOT.get(ANN, "json")) || {}) });
  const b = await request.json().catch(() => null);
  if (!b) return json(400, { ok: false, error: "json" });
  const a = { on: b.on === true, ar: String(b.ar || "").trim().slice(0, 200), en: String(b.en || "").trim().slice(0, 200), link: String(b.link || "").trim().slice(0, 300) };
  if (a.link && !/^(https:\/\/|\/)[^\s"<>]*$/.test(a.link)) return json(400, { ok: false, error: "link" });
  if (a.on && !a.ar) return json(400, { ok: false, error: "empty" });
  const old = (await env.BOT.get(ANN, "json")) || {};
  // id جديد لو الكلام اتغير، عشان اللي قفل الإعلان القديم يشوف الجديد
  a.id = old.id && old.ar === a.ar && old.en === a.en && old.link === a.link ? old.id : Date.now().toString(36);
  await env.BOT.put(ANN, JSON.stringify(a));
  await caches.default.delete(new Request("https://taqtaqa.com/api/announce"));
  return json(200, { ok: true, a: cleanAnn(a) });
}

/* ---------- بلاغ عن نص ---------- */
const KINDS = { typo: "غلطة إملائية", chars: "حرف مش على الكيبورد", source: "المصدر أو القائل غلط", unfit: "النص مش مناسب", other: "حاجة تانية" };
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function report(request, env) {
  const H2 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H2 });
  if (request.method !== "POST") return out(405, { ok: false, error: "method" });
  if (!/^https:\/\/(taqtaqa\.com|taqtaqa\.[\w-]+\.workers\.dev)$/.test(request.headers.get("origin") || "")) return out(403, { ok: false, error: "origin" });
  if (Number(request.headers.get("content-length") || 0) > 8000) return out(413, { ok: false, error: "big" });
  const b = await request.json().catch(() => null);
  if (!b || b.website) return out(200, { ok: true });
  const text = String(b.text || "").trim(), src = String(b.src || "").trim().slice(0, 200), note = String(b.note || "").trim().slice(0, 500);
  const kind = KINDS[b.kind] ? b.kind : "other", cat = /^[a-z_]{1,12}$/.test(b.cat || "") ? b.cat : "";
  if (text.length < 2 || text.length > 3000) return out(400, { ok: false, error: "length" });
  // نفس حدود رسايل «ادعم طقطقة»: رسالة كل ١٠ ثواني و٣ في الدقيقة من كل شبكة، وكل نص مرة واحدة في اليوم من نفس الشبكة
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const who = await sha(ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip.split(".").slice(0, 3).join("."));
  for (const rl of [env.FB_BURST, env.FB_MINUTE]) {
    if (rl) { try { const { success } = await rl.limit({ key: "r" + who }); if (!success) return out(429, { ok: false, error: "wait" }); } catch {} }
  }
  const dk = new Request("https://taqtaqa.com/__rep/" + (await sha(who + text + new Date().toISOString().slice(0, 10))));
  if (await caches.default.match(dk)) return out(200, { ok: true, dup: true });
  await caches.default.put(dk, new Response("1", { headers: { "cache-control": "max-age=86400" } }));
  await saveMessage(env, { type: "report", kind, text: note || KINDS[kind], page: text, src, cat, ctry: (request.cf && request.cf.country) || "" });
  return out(200, { ok: true });
}

/* ---------- رسالة لجروب تليجرام ---------- */
async function telegramAdmin(request, env) {
  if (request.method === "GET") return json(200, { ok: true, ...(await broadcastInfo(env)) });
  const b = await request.json().catch(() => null);
  const text = String((b && b.text) || "").trim();
  if (text.length < 2 || text.length > 3500) return json(400, { ok: false, error: "length" });
  const topic = BROADCAST_TOPICS.includes(b.topic) ? b.topic : "general";
  const r = await broadcast(env, { text, topic, button: b.button === true, pin: b.pin === true });
  return json(r.ok ? 200 : 400, r);
}
