// طقطقة: الحسابات وحفظ التاريخ على Firebase.
// الموقع بيشتغل عادي من غير الملف ده؛ التاريخ بيتحفظ على المتصفح، ولما تسجل دخول بيتزامن مع حسابك.
// إعدادات المشروع (مش سرية؛ الحماية في قواعد Firestore)
const firebaseConfig = {
  apiKey: "AIzaSyDoUjqkGOiC-ogyhN2mR8ScowPv_YfUDsY",
  authDomain: "taqtaqa.com",
  projectId: "taqtaqa-type",
  storageBucket: "taqtaqa-type.firebasestorage.app",
  messagingSenderId: "506636500827",
  appId: "1:506636500827:web:4c264b5dd9041cb5ea247e"
};

const OWNER_KEY = "tq-owner";
// الصفحة الإنجليزي (en/) بنفس الملف، والفرق في الكلام بس
const EN = document.documentElement.lang === "en";
const L = (ar, en) => (EN ? en : ar);
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
  auth.languageCode = EN ? "en" : "ar";
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
  .abox button.gbtn{background:#fff;color:#1f1f1f;border-color:#dadce0;font-weight:500}
  .abox button.gbtn:hover{background:#f2f2f2}
  .abox .glogo{display:inline-grid;place-items:center;width:20px;height:20px}
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
  .abox .who span{font-size:13px;color:var(--sub);direction:ltr;display:block;text-align:${EN ? "left" : "right"}}
  `;
  document.head.appendChild(css);

  let armed = false;
  const slot = $("authslot");
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "authbtn"; btn.id = "authbtn";
  slot.appendChild(btn);

  const modal = document.createElement("div");
  modal.className = "amodal"; modal.hidden = true; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `<div class="abox" dir="${EN ? "ltr" : "rtl"}"></div>`;
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
      // الصورة بس، والاسم بيظهر لما تقف عليها، عشان الاسم الطويل ما يزقّش الأزرار اللي جنبه
      btn.innerHTML = `<span class="av">${avatar(user)}</span>`;
      btn.setAttribute("aria-label", L("حسابك: ", "Your account: ") + name);
      btn.title = name;
    } else {
      btn.innerHTML = `<span class="nm">${L("سجّل دخول", "Sign in")}</span>`;
      btn.removeAttribute("aria-label");
      btn.removeAttribute("title");
    }
    const note = $("hnote");
    if (note) note.textContent = user
      ? (EN ? `Saved in your account (${user.email || "Google"}), and shows up on any device you sign in from.` : `محفوظ في حسابك (${user.email || "Google"})، وبيظهر على أي جهاز تدخل منه.`)
      : L("محفوظ على المتصفح ده بس. سجّل دخول عشان يتحفظ في حسابك ويظهر على أي جهاز.", "Saved in this browser only. Sign in to keep it in your account and see it on any device.");
  }
  function openModal(view) { modal.hidden = false; view(); const f = box.querySelector("input,button.pri"); if (f) f.focus(); }
  function closeModal() { modal.hidden = true; }
  btn.addEventListener("click", () => openModal(user ? viewAccount : viewSignIn));

  /* ---------- تسجيل الدخول ---------- */
  const ERR = EN ? {
    "auth/invalid-email": "That email doesn't look right.",
    "auth/missing-password": "Enter your password.",
    "auth/weak-password": "The password needs at least 6 characters.",
    "auth/email-already-in-use": "This email already has an account. Click Sign in instead of New account.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-not-found": "There's no account with this email.",
    "auth/wrong-password": "Wrong password.",
    "auth/too-many-requests": "Too many attempts. Wait a little and try again.",
    "auth/popup-closed-by-user": "The Google window closed before sign-in finished.",
    "auth/cancelled-popup-request": "The Google window closed before sign-in finished.",
    "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/network-request-failed": "No connection. Check your internet and try again.",
    "auth/unauthorized-domain": "This domain isn't allowed in the Firebase settings.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled in the Firebase settings."
  } : {
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
  const msg = (e) => ERR[e && e.code] || L("حصلت مشكلة. جرّب تاني.", "Something went wrong. Try again.");

  function viewSignIn() {
    box.innerHTML = `
      <button type="button" class="x" data-a="close" aria-label="${L("قفل", "Close")}">×</button>
      <h3>${L("سجّل دخول", "Sign in")}</h3>
      <p>${L("عشان تاريخك وأحسن أرقامك يتحفظوا في حسابك، وتشوفهم من أي جهاز.", "So your history and best scores are saved in your account, and you can see them on any device.")}</p>
      <button type="button" class="gbtn wide" data-a="google"><span class="glogo" aria-hidden="true"><svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg></span><span>${L("ادخل بحساب Google", "Continue with Google")}</span></button>
      <div class="or">${L("أو بالإيميل", "or with email")}</div>
      <label>${L("الإيميل", "Email")}<input id="a-email" type="email" autocomplete="email" inputmode="email"></label>
      <label>${L("كلمة السر", "Password")}<input id="a-pass" type="password" autocomplete="current-password"></label>
      <div class="err" id="a-err" role="alert"></div>
      <div class="row"><button type="button" data-a="login">${L("دخول", "Sign in")}</button><button type="button" data-a="signup">${L("حساب جديد", "New account")}</button></div>
      <button type="button" class="link" data-a="reset">${L("نسيت كلمة السر؟", "Forgot your password?")}</button>
      <p style="font-size:12.5px">${L("بنحفظ إيميلك واسمك ونتايج اختباراتك بس، عشان تشوفهم تاني. تقدر تمسح حسابك وكل بياناته في أي وقت.", "We only save your email, your name and your test results, so you can see them again. You can delete your account and all its data at any time.")}</p>`;
  }
  function viewAccount() {
    armed = false;
    const name = user.displayName || (user.email || "").split("@")[0];
    box.innerHTML = `
      <button type="button" class="x" data-a="close" aria-label="${L("قفل", "Close")}">×</button>
      <div class="who"><div class="av">${avatar(user)}</div><div><b>${esc(name)}</b><span>${esc(user.email || "")}</span></div></div>
      <p>${L("تاريخك وأحسن أرقامك محفوظين في حسابك، وبيتزامنوا لوحدهم بعد كل اختبار.", "Your history and best scores are saved in your account, and sync on their own after every test.")}</p>
      <div class="err" id="a-err" role="alert"></div>
      <div class="row"><button type="button" data-a="logout">${L("خروج", "Sign out")}</button></div>
      <button type="button" class="danger" data-a="delete">${L("امسح حسابي وكل بياناتي", "Delete my account and all my data")}</button>`;
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
        if (!email()) { errEl.textContent = L("اكتب إيميلك الأول، وبعدين اضغط «نسيت كلمة السر؟».", "Enter your email first, then click Forgot your password?"); return; }
        busy(true); await sendPasswordResetEmail(auth, email());
        errEl.className = "ok"; errEl.textContent = L("بعتنالك إيميل فيه لينك تغيّر بيه كلمة السر.", "We sent you an email with a link to change your password.");
      }
      if (a === "logout") { await signOut(auth); closeModal(); }
      if (a === "delete") {
        if (!armed) { armed = true; b.classList.add("armed"); b.textContent = L("متأكد؟ اضغط تاني عشان تمسح الحساب نهائيا", "Sure? Click again to delete the account for good"); return; }
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
    // المفضلة: بنجمع اللي على الجهاز مع اللي في الحساب
    try {
      const cf = ud.exists() && Array.isArray(ud.data().fav) ? ud.data().fav : [];
      const seen = new Set(), favs = [];
      for (const f of cf.concat(mine ? TQ.getFavs() : [])) if (f && typeof f.t === "string" && !seen.has(f.t)) { seen.add(f.t); favs.push(f); }
      TQ.setFavs(favs);
      await setDoc(userDoc(u.uid), { fav: favs.slice(-500), updatedAt: serverTimestamp() }, { merge: true });
    } catch (ex) { console.warn("taqtaqa fav", ex); }
    // آخر مرة في كل نص: بناخد الأحدث من الاتنين
    try {
      const cq = ud.exists() && ud.data().ql && typeof ud.data().ql === "object" ? ud.data().ql : {};
      const lq = mine ? TQ.getLastRuns() : {};
      const all = Object.assign({}, cq);
      for (const k in lq) if (!all[k] || (lq[k].t || 0) > (all[k].t || 0)) all[k] = lq[k];
      TQ.setLastRuns(all);
      await setDoc(userDoc(u.uid), { ql: TQ.getLastRuns(), updatedAt: serverTimestamp() }, { merge: true });
    } catch (ex) { console.warn("taqtaqa last", ex); }
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
    TQ.toast(L("اتمسح حسابك وكل بياناته.", "Your account and all its data were deleted."));
  }
  ERR["x/relogin"] = L("عشان تمسح الحساب، اخرج وادخل تاني الأول، وبعدين امسحه.", "To delete the account, sign out and back in first, then delete it.");
  function wipeLocal() {
    TQ.setHist([]); TQ.setPBs({}); TQ.setFavs([]); TQ.setLastRuns({});
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
  window.addEventListener("tq:fav", async (e) => {
    if (!user) return;
    try { await setDoc(userDoc(user.uid), { fav: (e.detail || []).slice(-500), updatedAt: serverTimestamp() }, { merge: true }); }
    catch (ex) { console.warn("taqtaqa fav", ex); }
  });
  window.addEventListener("tq:last", async (e) => {
    if (!user || !e.detail) return;
    try { await setDoc(userDoc(user.uid), { ql: { [e.detail.k]: e.detail.rec }, updatedAt: serverTimestamp() }, { merge: true }); }
    catch (ex) { console.warn("taqtaqa last", ex); }
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
        TQ.toast(r.up ? (EN ? `Your history was saved to your account (${r.up} tests)` : `اتحفظ تاريخك في حسابك (${r.up.toLocaleString("ar-EG")} اختبار)`) : L("دخلت حسابك، وتاريخك متزامن", "You're signed in, and your history is synced"));
      } catch (ex) { console.warn("taqtaqa sync", ex); TQ.toast(L("ما قدرناش نزامن تاريخك دلوقتي. هنحاول تاني.", "We couldn't sync your history right now. We'll try again.")); }
    } else if (wasSignedIn) {
      wasSignedIn = false;
      wipeLocal(); // الجهاز يرجع فاضي بعد الخروج، وتاريخك محفوظ في حسابك
      TQ.toast(L("خرجت من حسابك", "You signed out"));
    }
  });
  renderBtn();
});
