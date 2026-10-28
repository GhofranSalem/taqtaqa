// طقطقة: الحسابات وحفظ التاريخ على Firebase.
// الموقع بيشتغل عادي من غير الملف ده؛ التاريخ بيتحفظ على المتصفح، ولما تسجل دخول بيتزامن مع حسابك.
// إعدادات المشروع (مش سرية؛ الحماية في قواعد Firestore)
const firebaseConfig = {
  apiKey: "AIzaSyDoUjqkGOiC-ogyhN2mR8ScowPv_YfUDsY",
  authDomain: "taqtaqa-type.firebaseapp.com",
  projectId: "taqtaqa-type",
  storageBucket: "taqtaqa-type.firebasestorage.app",
  messagingSenderId: "506636500827",
  appId: "1:506636500827:web:4c264b5dd9041cb5ea247e"
};

const OWNER_KEY = "tq-owner";
const $ = (id) => document.getElementById(id);

function whenReady(fn) {
  if (window.TQ) fn(); else window.addEventListener("tq:ready", fn, { once: true });
}

whenReady(async () => {
  if (!firebaseConfig) return; // لسه المشروع ما اتظبطش، فمش بنحمّل Firebase خالص
  const V = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [{ initializeApp }, A, F] = await Promise.all([
    import(V + "firebase-app.js"), import(V + "firebase-auth.js"), import(V + "firebase-firestore.js")
  ]);
  const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, deleteUser, reauthenticateWithPopup, updateProfile } = A;
  const { getFirestore, doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp } = F;
  const TQ = window.TQ;
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  auth.languageCode = "ar";
  const db = getFirestore(app);
  let user = null;

  /* ---------- الشكل ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .authbtn{font:inherit;font-size:13px;display:inline-flex;align-items:center;gap:7px;background:var(--panel);color:var(--fg);border:0;border-radius:999px;padding:5px 12px;cursor:pointer;max-width:200px}
  .authbtn:hover{background:var(--line)}
  .authbtn .av{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);font-weight:700;font-size:12px;flex:none;overflow:hidden}
  .authbtn .av img{width:100%;height:100%;object-fit:cover}
  .authbtn .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .amodal{position:fixed;inset:0;z-index:45;background:var(--scrim);display:flex;align-items:flex-start;justify-content:center;padding-block:calc(60px + env(safe-area-inset-top,0px)) 24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));overflow:auto}
  .abox{background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:14px;width:min(400px,100%);padding:22px 20px 18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  .abox h3{margin:0;font-family:var(--f-display);font-weight:700;font-size:24px}
  .abox p{margin:0;font-size:14px;line-height:1.7;color:var(--sub)}
  .abox .row{display:flex;gap:8px;flex-wrap:wrap}
  .abox button{font:inherit;font-size:14.5px;border-radius:9px;padding:9px 14px;cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--fg)}
  .abox button.pri{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:600}
  .abox button.wide{width:100%;display:flex;align-items:center;justify-content:center;gap:10px}
  .abox button.link{background:none;border:0;color:var(--sub);padding:4px 0;font-size:13px;text-decoration:underline}
  .abox button.danger{background:none;border-color:transparent;color:var(--err)}
  .abox button.danger.armed{background:var(--err);color:var(--bg)}
  .abox input{font:inherit;font-size:15px;width:100%;background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:9px;padding:9px 12px;direction:ltr;text-align:left}
  .abox input:focus{outline:2px solid var(--accent);outline-offset:1px}
  .abox label{font-size:13px;color:var(--sub);display:flex;flex-direction:column;gap:5px}
  .abox .or{display:flex;align-items:center;gap:10px;color:var(--sub);font-size:12.5px}
  .abox .or::before,.abox .or::after{content:"";flex:1;height:1px;background:var(--line)}
  .abox .err{color:var(--err);font-size:13.5px;min-height:1em}
  .abox .ok{color:var(--accent);font-size:13.5px}
  .abox .x{align-self:flex-start;margin-inline-start:auto;background:none;border:0;color:var(--sub);font-size:22px;line-height:1;padding:0 4px}
  .abox .who{display:flex;align-items:center;gap:12px}
  .abox .who .av{width:44px;height:44px;border-radius:50%;background:var(--accent);color:var(--bg);display:grid;place-items:center;font-weight:700;font-size:20px;overflow:hidden;flex:none}
  .abox .who .av img{width:100%;height:100%;object-fit:cover}
  .abox .who b{display:block;font-size:16px}
  .abox .who span{font-size:13px;color:var(--sub);direction:ltr;display:block;text-align:right}
  `;
  document.head.appendChild(css);

  let armed = false;
  const slot = $("authslot");
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "authbtn"; btn.id = "authbtn";
  slot.appendChild(btn);

  const modal = document.createElement("div");
  modal.className = "amodal"; modal.hidden = true; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `<div class="abox" dir="rtl"></div>`;
  document.body.appendChild(modal);
  const box = modal.querySelector(".abox");
  modal.addEventListener("mousedown", (e) => { if (e.target === modal) closeModal(); });
  // وانت في نافذة الحساب، اختصارات الاختبار متوقفة
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    e.stopImmediatePropagation();
    if (e.key === "Escape") { e.preventDefault(); closeModal(); }
    else if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); const b = box.querySelector('[data-a="login"]'); if (b) b.click(); }
  }, true);

  function initial(u) { return ((u.displayName || u.email || "؟").trim()[0] || "؟").toUpperCase(); }
  function avatar(u) { return u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(initial(u)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function renderBtn() {
    if (user) {
      const name = user.displayName || (user.email || "").split("@")[0];
      btn.innerHTML = `<span class="av">${avatar(user)}</span><span class="nm">${esc(name)}</span>`;
      btn.setAttribute("aria-label", "حسابك");
    } else {
      btn.innerHTML = `<span class="nm">سجّل دخول</span>`;
      btn.removeAttribute("aria-label");
    }
    const note = $("hnote");
    if (note) note.textContent = user
      ? `محفوظ في حسابك (${user.email || "Google"})، وبيظهر على أي جهاز تدخل منه.`
      : "محفوظ على المتصفح ده بس. سجّل دخول عشان يتحفظ في حسابك ويظهر على أي جهاز.";
  }
  function openModal(view) { modal.hidden = false; view(); const f = box.querySelector("input,button.pri"); if (f) f.focus(); }
  function closeModal() { modal.hidden = true; }
  btn.addEventListener("click", () => openModal(user ? viewAccount : viewSignIn));

  /* ---------- تسجيل الدخول ---------- */
  const ERR = {
    "auth/invalid-email": "الإيميل مكتوب غلط.",
    "auth/missing-password": "اكتب كلمة السر.",
    "auth/weak-password": "كلمة السر لازم تبقى ٦ حروف على الأقل.",
    "auth/email-already-in-use": "الإيميل ده عليه حساب بالفعل. اضغط «دخول» بدل «حساب جديد».",
    "auth/invalid-credential": "الإيميل أو كلمة السر غلط.",
    "auth/user-not-found": "مفيش حساب بالإيميل ده.",
    "auth/wrong-password": "كلمة السر غلط.",
    "auth/too-many-requests": "محاولات كتير. استنى شوية وجرّب تاني.",
    "auth/popup-closed-by-user": "اتقفلت نافذة Google قبل ما الدخول يخلص.",
    "auth/cancelled-popup-request": "اتقفلت نافذة Google قبل ما الدخول يخلص.",
    "auth/popup-blocked": "المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة للموقع وجرّب تاني.",
    "auth/network-request-failed": "مفيش نت. اتأكد من الاتصال وجرّب تاني.",
    "auth/unauthorized-domain": "الدومين ده مش مسموح له في إعدادات Firebase.",
    "auth/operation-not-allowed": "طريقة الدخول دي مش متفعلة في إعدادات Firebase."
  };
  const msg = (e) => ERR[e && e.code] || "حصلت مشكلة. جرّب تاني.";

  function viewSignIn() {
    box.innerHTML = `
      <button type="button" class="x" data-a="close" aria-label="قفل">×</button>
      <h3>سجّل دخول</h3>
      <p>عشان تاريخك وأحسن أرقامك يتحفظوا في حسابك، وتشوفهم من أي جهاز.</p>
      <button type="button" class="pri wide" data-a="google"><span aria-hidden="true">G</span> ادخل بحساب Google</button>
      <div class="or">أو بالإيميل</div>
      <label>الإيميل<input id="a-email" type="email" autocomplete="email" inputmode="email"></label>
      <label>كلمة السر<input id="a-pass" type="password" autocomplete="current-password"></label>
      <div class="err" id="a-err" role="alert"></div>
      <div class="row"><button type="button" data-a="login">دخول</button><button type="button" data-a="signup">حساب جديد</button></div>
      <button type="button" class="link" data-a="reset">نسيت كلمة السر؟</button>
      <p style="font-size:12.5px">بنحفظ إيميلك واسمك ونتايج اختباراتك بس، عشان تشوفهم تاني. تقدر تمسح حسابك وكل بياناته في أي وقت.</p>`;
  }
  function viewAccount() {
    armed = false;
    const name = user.displayName || (user.email || "").split("@")[0];
    box.innerHTML = `
      <button type="button" class="x" data-a="close" aria-label="قفل">×</button>
      <div class="who"><div class="av">${avatar(user)}</div><div><b>${esc(name)}</b><span>${esc(user.email || "")}</span></div></div>
      <p>تاريخك وأحسن أرقامك محفوظين في حسابك، وبيتزامنوا لوحدهم بعد كل اختبار.</p>
      <div class="err" id="a-err" role="alert"></div>
      <div class="row"><button type="button" data-a="logout">خروج</button></div>
      <button type="button" class="danger" data-a="delete">امسح حسابي وكل بياناتي</button>`;
  }

  box.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return;
    const a = b.dataset.a, errEl = $("a-err");
    const email = () => ($("a-email") || {}).value?.trim() || "";
    const pass = () => ($("a-pass") || {}).value || "";
    const busy = (on) => box.querySelectorAll("button").forEach((x) => (x.disabled = on));
    try {
      if (a === "close") return closeModal();
      if (a === "google") { busy(true); await signInWithPopup(auth, new GoogleAuthProvider()); closeModal(); }
      if (a === "login") { busy(true); await signInWithEmailAndPassword(auth, email(), pass()); closeModal(); }
      if (a === "signup") {
        busy(true);
        const cred = await createUserWithEmailAndPassword(auth, email(), pass());
        await updateProfile(cred.user, { displayName: email().split("@")[0] });
        closeModal();
      }
      if (a === "reset") {
        if (!email()) { errEl.textContent = "اكتب إيميلك الأول، وبعدين اضغط «نسيت كلمة السر؟»."; return; }
        busy(true); await sendPasswordResetEmail(auth, email());
        errEl.className = "ok"; errEl.textContent = "بعتنالك إيميل فيه لينك تغيّر بيه كلمة السر.";
      }
      if (a === "logout") { await signOut(auth); closeModal(); }
      if (a === "delete") {
        if (!armed) { armed = true; b.classList.add("armed"); b.textContent = "متأكد؟ اضغط تاني عشان تمسح الحساب نهائيا"; return; }
        busy(true); await deleteAccount(); closeModal();
      }
    } catch (ex) {
      if (errEl) { errEl.className = "err"; errEl.textContent = msg(ex); }
    } finally { busy(false); if (a !== "delete") armed = false; }
  });

  /* ---------- المزامنة ---------- */
  const resultsCol = (uid) => collection(db, "users", uid, "results");
  const userDoc = (uid) => doc(db, "users", uid);
  const clean = (h) => {
    const o = {};
    for (const k of ["v", "t", "wpm", "raw", "acc", "el", "c", "b", "x", "m", "mode", "n", "src", "q", "label"]) if (h[k] !== undefined) o[k] = h[k];
    return o;
  };
  async function writeMany(uid, list) {
    for (let i = 0; i < list.length; i += 400) {
      const batch = writeBatch(db);
      list.slice(i, i + 400).forEach((h) => batch.set(doc(resultsCol(uid), String(h.t)), clean(h)));
      await batch.commit();
    }
  }
  function mergePB(a, b) {
    const o = Object.assign({}, a || {});
    for (const k in (b || {})) { const v = b[k]; if (v && typeof v.wpm === "number" && (!o[k] || v.wpm > o[k].wpm)) o[k] = v; }
    return o;
  }
  async function syncDown(u) {
    let owner = null; try { owner = localStorage.getItem(OWNER_KEY); } catch (e) {}
    const mine = !owner || owner === u.uid; // التاريخ اللي على الجهاز ده بتاعك ولا بتاع حساب تاني
    const local = mine ? TQ.getHist() : [];
    const snap = await getDocs(resultsCol(u.uid));
    const cloud = snap.docs.map((d) => d.data()).filter((h) => typeof h.t === "number");
    const have = new Set(cloud.map((h) => h.t));
    const up = local.filter((h) => typeof h.t === "number" && !have.has(h.t));
    if (up.length) await writeMany(u.uid, up);
    const all = cloud.concat(up).sort((a, b) => a.t - b.t);
    TQ.setHist(all);
    const ud = await getDoc(userDoc(u.uid));
    const pb = mergePB(ud.exists() ? ud.data().pb : {}, mine ? TQ.getPBs() : {});
    TQ.setPBs(pb);
    await setDoc(userDoc(u.uid), {
      name: u.displayName || "", email: u.email || "", pb, updatedAt: serverTimestamp(),
      ...(ud.exists() ? {} : { createdAt: serverTimestamp() })
    }, { merge: true });
    try { localStorage.setItem(OWNER_KEY, u.uid); } catch (e) {}
    TQ.refreshHistory();
    return { up: up.length, total: all.length };
  }
  async function deleteAccount() {
    const u = auth.currentUser; if (!u) return;
    const snap = await getDocs(resultsCol(u.uid));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    const batch = writeBatch(db); batch.delete(userDoc(u.uid)); await batch.commit();
    try { await deleteUser(u); }
    catch (ex) {
      if (ex.code === "auth/requires-recent-login" && u.providerData.some((p) => p.providerId === "google.com")) {
        await reauthenticateWithPopup(u, new GoogleAuthProvider()); await deleteUser(u);
      } else if (ex.code === "auth/requires-recent-login") {
        throw Object.assign(new Error(), { code: "x/relogin" });
      } else throw ex;
    }
    wipeLocal();
    TQ.toast("اتمسح حسابك وكل بياناته.");
  }
  ERR["x/relogin"] = "عشان تمسح الحساب، اخرج وادخل تاني الأول، وبعدين امسحه.";
  function wipeLocal() {
    TQ.setHist([]); TQ.setPBs({});
    try { localStorage.removeItem(OWNER_KEY); } catch (e) {}
    TQ.refreshHistory();
  }

  window.addEventListener("tq:result", async (e) => {
    if (!user) return;
    try {
      const h = e.detail;
      await setDoc(doc(resultsCol(user.uid), String(h.t)), clean(h));
      await setDoc(userDoc(user.uid), { pb: TQ.getPBs(), updatedAt: serverTimestamp() }, { merge: true });
    } catch (ex) { console.warn("taqtaqa sync", ex); }
  });
  window.addEventListener("tq:clear", async () => {
    if (!user) return;
    try {
      const snap = await getDocs(resultsCol(user.uid));
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await setDoc(userDoc(user.uid), { pb: {}, updatedAt: serverTimestamp() }, { merge: true });
    } catch (ex) { console.warn("taqtaqa clear", ex); }
  });

  let wasSignedIn = false;
  onAuthStateChanged(auth, async (u) => {
    user = u; renderBtn();
    if (u) {
      wasSignedIn = true;
      try {
        const r = await syncDown(u);
        TQ.toast(r.up ? `اتحفظ تاريخك في حسابك (${r.up.toLocaleString("ar-EG")} اختبار)` : "دخلت حسابك، وتاريخك متزامن");
      } catch (ex) { console.warn("taqtaqa sync", ex); TQ.toast("ما قدرناش نزامن تاريخك دلوقتي. هنحاول تاني."); }
    } else if (wasSignedIn) {
      wasSignedIn = false;
      wipeLocal(); // الجهاز يرجع فاضي بعد الخروج، وتاريخك محفوظ في حسابك
      TQ.toast("خرجت من حسابك");
    }
  });
  renderBtn();
});
