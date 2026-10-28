// طقطقة: الـ Worker بيعرض ملفات الموقع، وبيوصّل صفحات تسجيل الدخول بتاعة Firebase
// على taqtaqa.com نفسه، عشان نافذة Google تكتب «taqtaqa.com» بدل اسم مشروع Firebase.
const FIREBASE_HOST = "taqtaqa-type.firebaseapp.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__/auth/") || url.pathname.startsWith("/__/firebase/")) {
      const target = new URL(url.pathname + url.search, "https://" + FIREBASE_HOST);
      return fetch(new Request(target, request), { redirect: "manual" });
    }
    return env.ASSETS.fetch(request);
  }
};
