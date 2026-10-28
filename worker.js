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

async function feedback(request, env) {
  if (request.method !== "POST") return json(405, { ok: false, error: "method" });
  const origin = request.headers.get("origin") || "";
  if (origin && !/^https:\/\/(taqtaqa\.com|taqtaqa\.[\w-]+\.workers\.dev)$/.test(origin)) return json(403, { ok: false, error: "origin" });
  let d;
  try { d = await request.json(); } catch { return json(400, { ok: false, error: "json" }); }
  // خانة مستخبية: لو اتملت يبقى ده بوت
  if (d && d.website) return json(200, { ok: true });
  const type = TYPES[d && d.type] ? d.type : "note";
  const text = String((d && d.text) || "").trim();
  const contact = String((d && d.contact) || "").trim().slice(0, 200);
  const page = String((d && d.page) || "").slice(0, 300);
  if (text.length < 3 || text.length > 3000) return json(400, { ok: false, error: "length" });

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
