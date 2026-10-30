// طقطقة: الـ Worker بيعرض ملفات الموقع، وبيوصّل صفحات تسجيل الدخول بتاعة Firebase
// على taqtaqa.com نفسه، وبيستقبل رسايل «ادعم طقطقة» ويبعتها على الإيميل.
import { EmailMessage } from "cloudflare:email";

const FIREBASE_HOST = "taqtaqa-type.firebaseapp.com";
const FROM = "feedback@taqtaqa.com";
const TO = "ghofran.salem@gmail.com";
const TYPES = { suggest: "اقتراح نص", bug: "غلطة", note: "رأي أو رسالة" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // www.taqtaqa.com بيحوّل للدومين الأساسي، عشان اللي بيكتب www يوصل برضه
    if (url.hostname === "www.taqtaqa.com") {
      url.hostname = "taqtaqa.com";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname.startsWith("/__/auth/") || url.pathname.startsWith("/__/firebase/")) {
      const target = new URL(url.pathname + url.search, "https://" + FIREBASE_HOST);
      return fetch(new Request(target, request), { redirect: "manual" });
    }
    if (url.pathname === "/api/feedback") return feedback(request, env);
    return secure(await env.ASSETS.fetch(request));
  }
};

/* ---------- هيدرز الأمان على كل صفحات وملفات الموقع ----------
   CSP بتقول للمتصفح يشغّل كود من الموقع نفسه ومن الخدمات اللي بنستخدمها بس:
   Firebase (الحسابات)، وCloudflare (عدد الزيارات وTurnstile). أي كود تاني بيترفض */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.gstatic.com https://apis.google.com https://*.googleapis.com https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://www.gstatic.com",
  "font-src 'self' data:",
  "connect-src 'self' data: https://*.googleapis.com https://www.gstatic.com https://cloudflareinsights.com https://challenges.cloudflare.com",
  "frame-src 'self' https://taqtaqa.com https://challenges.cloudflare.com https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");
const SECURITY = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  // تسجيل الدخول بجوجل بيفتح نافذة، فلازم نسمح بالنوافذ اللي بنفتحها
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
};
function secure(res) {
  const out = new Response(res.body, res);
  for (const k in SECURITY) out.headers.set(k, SECURITY[k]);
  return out;
}

/* Turnstile: لو المفتاح السري متحط في إعدادات الـ Worker (TURNSTILE_SECRET)، كل رسالة لازم يكون معاها
   إثبات من المتصفح إن اللي بعتها مش بوت. الإثبات بيتستخدم مرة واحدة بس */
const TURNSTILE_HOSTNAMES = ["taqtaqa.com"];
async function human(token, request, env) {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== "string" || !token || token.length > 2048 || !TURNSTILE_HOSTNAMES.length) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  body.append("remoteip", request.headers.get("cf-connecting-ip") || "");
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    return j.success === true && j.action === "feedback" && TURNSTILE_HOSTNAMES.includes(j.hostname);
  } catch { return false; }
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

/* ---------- الحماية من السبام ----------
   - الطلب لازم يكون جاي من صفحة الموقع نفسه (Origin)، فاللي بيبعت من برّه بأداة أو سكريبت بيترفض
   - كل جهاز (IP): رسالة كل ٣٠ ثانية، و٥ رسايل في اليوم بالكتير
   - نفس الرسالة بالظبط ما بتتبعتش مرتين في نفس اليوم
   العدّاد محفوظ في كاش Cloudflare، فمش محتاج أي إعداد في الداشبورد */
const LIMITS = { gapSec: 30, perDay: 5 };
const day = () => new Date().toISOString().slice(0, 10);
async function sha(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const ckey = (k) => new Request("https://taqtaqa.com/__guard/" + k);
async function cget(k) { const r = await caches.default.match(ckey(k)); return r ? r.text() : null; }
async function cput(k, v, ttl) {
  await caches.default.put(ckey(k), new Response(String(v), { headers: { "cache-control": `max-age=${ttl}` } }));
}
async function guard(request, text, env) {
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const who = await sha(ip), today = day();
  // الحد الأساسي من Cloudflare نفسه (Rate Limiting)، والكاش تحت للحد اليومي والرسايل المكررة
  for (const rl of [env.FB_BURST, env.FB_MINUTE]) {
    if (rl) { try { const { success } = await rl.limit({ key: who }); if (!success) return "wait"; } catch {} }
  }
  if (await cget("gap-" + who)) return "wait";
  const n = +(await cget(`n-${today}-${who}`)) || 0;
  if (n >= LIMITS.perDay) return "day";
  const same = await sha(today + text.toLowerCase().replace(/\s+/g, " "));
  if (await cget("t-" + same)) return "dup";
  await Promise.all([
    cput("gap-" + who, 1, LIMITS.gapSec),
    cput(`n-${today}-${who}`, n + 1, 86400),
    cput("t-" + same, 1, 86400)
  ]);
  return null;
}

async function feedback(request, env) {
  if (request.method !== "POST") return json(405, { ok: false, error: "method" });
  const origin = request.headers.get("origin") || "";
  if (!/^https:\/\/(taqtaqa\.com|taqtaqa\.[\w-]+\.workers\.dev)$/.test(origin)) return json(403, { ok: false, error: "origin" });
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json(415, { ok: false, error: "type" });
  let d;
  try { d = await request.json(); } catch { return json(400, { ok: false, error: "json" }); }
  // خانة مستخبية: لو اتملت يبقى ده بوت
  if (d && d.website) return json(200, { ok: true });
  const type = TYPES[d && d.type] ? d.type : "note";
  const text = String((d && d.text) || "").trim();
  const contact = String((d && d.contact) || "").trim().slice(0, 200);
  const page = String((d && d.page) || "").slice(0, 300);
  if (text.length < 3 || text.length > 3000) return json(400, { ok: false, error: "length" });
  // الصفحة دايما بتبعت النص اللي كان قدامك، فالطلب اللي من غيره مش جاي من الموقع
  if (!page) return json(400, { ok: false, error: "page" });
  if (!(await human(d && d.ts, request, env))) return json(403, { ok: false, error: "captcha" });
  const blocked = await guard(request, text, env);
  if (blocked) return json(429, { ok: false, error: blocked });

  const lines = [
    `النوع: ${TYPES[type]}`,
    contact ? `للتواصل: ${contact}` : "للتواصل: (ما كتبش)",
    page ? `النص اللي كان قدامه: ${page}` : "",
    "",
    text,
    "",
    "—",
    `اتبعتت من taqtaqa.com، ${new Date().toISOString()}`,
    `البلد: ${(request.cf && request.cf.country) || "؟"}`
  ].filter((l, i) => l !== "" || i > 2);
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? contact : null;
  const raw = mime({
    from: FROM, fromName: "طقطقة", to: TO,
    subject: `طقطقة: ${TYPES[type]} — ${text.slice(0, 50).replace(/\s+/g, " ")}`,
    replyTo, body: lines.join("\n")
  });
  try {
    await env.FEEDBACK.send(new EmailMessage(FROM, TO, raw));
    return json(200, { ok: true });
  } catch (e) {
    return json(502, { ok: false, error: "send" });
  }
}

function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const enc = (s) => `=?UTF-8?B?${b64(s)}?=`;

function mime({ from, fromName, to, subject, replyTo, body }) {
  const id = `<${crypto.randomUUID()}@taqtaqa.com>`;
  const headers = [
    `From: ${enc(fromName)} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${enc(subject)}`,
    `Message-ID: ${id}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64"
  ].filter(Boolean);
  const bodyB64 = b64(body).replace(/.{1,76}/g, "$&\r\n");
  return headers.join("\r\n") + "\r\n\r\n" + bodyB64;
}
