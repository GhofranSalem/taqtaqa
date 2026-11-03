// طقطقة: الـ API بتاع لوحة التحكم (/admin). لصاحب الموقع بس.
//
// /api/admin/texts   GET: كل النصوص من assets/data.js على GitHub (فرع main)
//                    POST: {ops:[...]} بيعدّل data.js ويعمل commit، وGitHub Actions بينشر الموقع في حوالي دقيقة
// /api/admin/inbox   GET: رسايل «ادعم طقطقة» المحفوظة. POST: {id, status} أو {id, del:true}
//
// تعديل النصوص محتاج مفتاح GitHub في إعدادات الـ Worker باسم GITHUB_TOKEN
// (Fine-grained token على ريبو taqtaqa بس، بصلاحية Contents: Read and write). المفتاح ما بيتكتبش في الكود أبدًا.
// الرسايل محفوظة في نفس KV بتاع البوت (BOT) بمفاتيح بتبدأ بـ inbox:

import { verifyIdToken } from "./stats.js";

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
