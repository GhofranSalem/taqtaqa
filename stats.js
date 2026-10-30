// طقطقة: إحصائيات الموقع لصاحبه بس (صفحة /admin).
//
// الموقع بيبعت نبضة صغيرة كل دقيقة وهو مفتوح (/api/ping): رقم عشوائي للجلسة، واللغة، وموبايل ولا كمبيوتر.
// مفيش كوكيز، ومفيش أي حاجة بتعرّف الشخص. والدولة بتيجي من Cloudflare.
// العدّاد نفسه Durable Object واحد: بيعرف مين فاتح دلوقتي، وبيحفظ أرقام كل يوم لمدة ٦٠ يوم.
//
// /api/stats بيرجّع الأرقام بس لو الطلب معاه تسجيل دخول Firebase صحيح بإيميل صاحب الموقع.

import { DurableObject } from "cloudflare:workers";

const ADMIN_EMAIL = "ghofran.salem@gmail.com";
const PROJECT = "taqtaqa-type";
const ORIGIN = "https://taqtaqa.com";
const LIVE_MS = 150 * 1000; // اللي بعت نبضة في آخر دقيقتين ونص
const KEEP_DAYS = 60;
const SRCS = /^[a-z0-9_-]{1,20}$/;

/* اليوم بتوقيت السعودية */
const dayKey = (t = Date.now()) => new Date(t + 3 * 3600e3).toISOString().slice(0, 10);

/* ---------- /api/ping من الموقع ---------- */
export async function ping(request, env) {
  if (request.method !== "POST") return text(405, "method");
  if (request.headers.get("origin") !== ORIGIN) return text(403, "origin");
  if (env.STATS_RL && !(await env.STATS_RL.limit({ key: request.headers.get("cf-connecting-ip") || "x" })).success) return text(429, "slow");
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 4096) return text(413, "big");
  const b = await request.json().catch(() => null);
  if (!b || typeof b.s !== "string" || !/^[a-f0-9]{16}$/.test(b.s)) return text(400, "bad");

  const msg = {
    s: b.s, f: b.f === true, l: b.l === "en" ? "en" : "ar", m: b.m === true,
    c: /^[A-Z]{2}$/.test(request.cf && request.cf.country || "") ? request.cf.country : "XX",
    r: typeof b.r === "string" && /^[a-z0-9.-]{1,60}$/i.test(b.r) ? b.r.toLowerCase().replace(/^www\./, "") : ""
  };
  if (b.e && b.e.type === "test" && typeof b.e.wpm === "number" && b.e.wpm > 0 && b.e.wpm <= 250)
    msg.test = { wpm: Math.round(b.e.wpm), src: typeof b.e.src === "string" && SRCS.test(b.e.src) ? b.e.src : "other" };
  // حساب: لازم تسجيل دخول Firebase صحيح، فمحدش يقدر يزوّد عدد الحسابات
  if (typeof b.a === "string" && b.a.length < 4096) {
    const u = await verifyIdToken(b.a);
    if (u) msg.acct = { id: await hash(u.sub), isNew: b.n === true };
  }
  await stub(env).fetch("https://stats/ping", { method: "POST", body: JSON.stringify(msg) });
  return text(204);
}

/* بيتنادى من worker.js لما رسالة «ادعم طقطقة» تتبعت */
export async function countFeedback(env) {
  try { await stub(env).fetch("https://stats/feedback", { method: "POST" }); } catch {}
}

/* ---------- /api/stats لصاحب الموقع بس ---------- */
export async function stats(request, env) {
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
  if (request.method !== "GET") return new Response("{}", { status: 405, headers: h });
  const auth = request.headers.get("authorization") || "";
  const user = auth.startsWith("Bearer ") ? await verifyIdToken(auth.slice(7)) : null;
  if (!user || user.email !== ADMIN_EMAIL || user.email_verified !== true)
    return new Response(JSON.stringify({ ok: false, error: user ? "forbidden" : "signin" }), { status: user ? 403 : 401, headers: h });

  const [core, tg, lb] = await Promise.all([
    stub(env).fetch("https://stats/read").then((r) => r.json()),
    telegramMembers(env),
    leaderboardCount()
  ]);
  return new Response(JSON.stringify({ ok: true, now: Date.now(), ...core, telegram: tg, leaderboard: lb }), { headers: h });
}

/* ---------- العدّاد ---------- */
export class Stats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.live = new Map(); // sid -> {t, l, m, c}
  }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/ping") return this.onPing(await request.json());
    if (path === "/feedback") { await this.bump((d) => { d.fb = (d.fb || 0) + 1; }); return new Response(null, { status: 204 }); }
    if (path === "/read") return Response.json(await this.read());
    return new Response("not found", { status: 404 });
  }
  async day(k = dayKey()) {
    return (await this.ctx.storage.get("d:" + k)) || { v: 0, t: 0, ws: 0, fb: 0, su: 0, lang: {}, dev: {}, ctry: {}, ref: {}, src: {}, acct: {} };
  }
  async bump(fn) {
    const k = dayKey(), d = await this.day(k);
    fn(d);
    await this.ctx.storage.put("d:" + k, d);
  }
  async onPing(p) {
    const now = Date.now();
    this.live.set(p.s, { t: now, l: p.l, m: p.m, c: p.c });
    if (this.live.size > 5000) for (const [k, v] of this.live) if (now - v.t > LIVE_MS) this.live.delete(k);
    if (p.f || p.test || p.acct) {
      await this.bump((d) => {
        if (p.f) {
          d.v++;
          inc(d.lang, p.l); inc(d.dev, p.m ? "mobile" : "desktop"); inc(d.ctry, p.c);
          if (p.r) inc(d.ref, p.r);
        }
        if (p.test) { d.t++; d.ws += p.test.wpm; inc(d.src, p.test.src); }
        if (p.acct) {
          // الحساب الجديد بيتحسب مرة واحدة بس، أول ما يظهر في اليوم
          if (!d.acct[p.acct.id]) { d.acct[p.acct.id] = 1; if (p.acct.isNew) d.su++; }
        }
      });
    }
    return new Response(null, { status: 204 });
  }
  async read() {
    const now = Date.now();
    const live = [...this.live.values()].filter((v) => now - v.t <= LIVE_MS);
    for (const [k, v] of this.live) if (now - v.t > LIVE_MS) this.live.delete(k);
    const liveBy = (f) => live.reduce((o, v) => (inc(o, f(v)), o), {});
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const k = dayKey(now - i * 864e5), d = await this.day(k);
      days.push({ day: k, visits: d.v, tests: d.t, avgWpm: d.t ? Math.round(d.ws / d.t) : 0, accounts: Object.keys(d.acct).length, signups: d.su, feedback: d.fb });
    }
    const today = await this.day();
    // تنضيف الأيام القديمة
    const old = await this.ctx.storage.list({ prefix: "d:", end: "d:" + dayKey(now - KEEP_DAYS * 864e5) });
    if (old.size) await this.ctx.storage.delete([...old.keys()]);
    return {
      live: { total: live.length, lang: liveBy((v) => v.l), dev: liveBy((v) => (v.m ? "mobile" : "desktop")), ctry: liveBy((v) => v.c) },
      today: { day: dayKey(now), visits: today.v, tests: today.t, avgWpm: today.t ? Math.round(today.ws / today.t) : 0, accounts: Object.keys(today.acct).length, signups: today.su, feedback: today.fb,
        lang: today.lang, dev: today.dev, ctry: top(today.ctry), ref: top(today.ref), src: top(today.src) },
      days
    };
  }
}

/* ---------- أدوات ---------- */
const stub = (env) => env.STATS.get(env.STATS.idFromName("taqtaqa"));
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const text = (status, body = null) => new Response(body, { status, headers: { "cache-control": "no-store" } });
async function hash(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tq-acct:" + s));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function telegramMembers(env) {
  if (!env.TG_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/getChatMemberCount?chat_id=@taqtaqaclub`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    return j.ok ? j.result : null;
  } catch { return null; }
}

/* عدد اللي في الترتيب الأسبوعي دلوقتي (Firestore، القراية متاحة للكل) */
async function leaderboardCount() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  const week = new Date(d.getTime() - ((d.getUTCDay() + 1) % 7) * 864e5).toISOString().slice(0, 10);
  const out = { week, ar: 0, en: 0 };
  await Promise.all(["ar", "en"].flatMap((lang) => [1, 2, 3, 4, 5].map(async (lg) => {
    try {
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/leaderboard/${week}_${lang}_${lg}/players?pageSize=300&mask.fieldPaths=speed`, { signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      out[lang] += (j.documents || []).length;
    } catch {}
  })));
  return out;
}

/* ---------- التحقق من تسجيل دخول Firebase ----------
   التوكن JWT موقّع من جوجل (RS256). بنتأكد من التوقيع بمفاتيح جوجل العامة، وإنه لمشروعنا، ولسه صالح */
let JWKS = null, JWKS_AT = 0;
async function googleKeys() {
  if (JWKS && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com", { signal: AbortSignal.timeout(5000) });
  const j = await r.json();
  JWKS = j.keys || []; JWKS_AT = Date.now();
  return JWKS;
}
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const b64json = (s) => JSON.parse(new TextDecoder().decode(b64(s)));
export async function verifyIdToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const head = b64json(parts[0]), body = b64json(parts[1]);
    if (head.alg !== "RS256" || typeof head.kid !== "string") return null;
    const now = Math.floor(Date.now() / 1000);
    if (body.aud !== PROJECT || body.iss !== "https://securetoken.google.com/" + PROJECT) return null;
    if (typeof body.sub !== "string" || !body.sub || body.sub.length > 128) return null;
    if (!(body.exp > now) || !(body.iat <= now + 300) || !(body.auth_time <= now + 300)) return null;
    let jwk = (await googleKeys()).find((k) => k.kid === head.kid);
    if (!jwk) { JWKS = null; jwk = (await googleKeys()).find((k) => k.kid === head.kid); }
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    return ok ? body : null;
  } catch { return null; }
}
