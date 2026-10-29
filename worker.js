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
    return env.ASSETS.fetch(request);
  }
};

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
async function guard(request, text) {
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const who = await sha(ip), today = day();
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
  const blocked = await guard(request, text);
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
