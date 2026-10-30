// طقطقة: بوت جروب تليجرام @taqtaqaclub
//
// بيشتغل جوه نفس الـ Worker بتاع الموقع، ومجاني بالكامل (من غير ذكاء اصطناعي):
//   - بيرحّب بالأعضاء الجداد بالعربي والإنجليزي
//   - بيمسح السبام: لينكات من أعضاء لسه داخلين، ولينكات جروبات تانية، وكلام الاستثمار والعملات
//   - أي رسالة في قسم «مشاكل» بتتبعت لصاحب الجروب على الخاص
//   - بيرد على الأسئلة عن الموقع لما حد يعمله منشن أو يرد عليه، أو يكلمه على الخاص
//   - كل سبت بينزّل أوائل الترتيب الأسبوعي في قسم «نتايجكم»
//
// الإعداد:
//   1. TG_TOKEN في Variables and Secrets بتاعة الـ Worker (من @BotFather، ما يتكتبش في الكود)
//   2. افتح https://taqtaqa.com/api/tg/setup مرة واحدة، بيربط البوت بالـ Worker
//   3. البوت أدمن في الجروب، وصاحب الجروب يدوس Start عند البوت على الخاص
// البوت بيتعلم أقسام الجروب لوحده من أساميها أول ما حد يكتب فيها.

const GROUP = "taqtaqaclub";
const BOT = "taqtaqaclubbot";
const SITE = "https://taqtaqa.com";
const FIRESTORE = "https://firestore.googleapis.com/v1/projects/taqtaqa-type/databases/(default)/documents/leaderboard/";

/* ---------- الدخول ---------- */
export async function telegram(request, env, ctx) {
  if (!env.TG_TOKEN) return new Response("bot is off", { status: 404 });
  const url = new URL(request.url);
  if (url.pathname === "/api/tg/setup") {
    // مرة في الدقيقة بالكتير، عشان محدش يزعج تليجرام بيه
    if (env.FB_MINUTE && !(await env.FB_MINUTE.limit({ key: "tg-setup" })).success) return new Response("wait a minute", { status: 429 });
    return setup(env, url);
  }
  if (request.method !== "POST" || request.headers.get("x-telegram-bot-api-secret-token") !== await hookSecret(env))
    return new Response("forbidden", { status: 403 });
  const update = await request.json().catch(() => null);
  if (update) ctx.waitUntil(handle(update, env).catch((e) => console.log("bot error", e && e.stack)));
  return new Response("ok");
}

/* كل سبت: أوائل الأسبوع اللي خلص */
export async function weekly(env) {
  if (!env.TG_TOKEN) return;
  const week = weekId(Date.now() - 2 * DAY);
  const ar = await readBoard(week, "ar", "ar"), en = await readBoard(week, "en", "ar");
  if (!ar && !en) return;
  const cfg = await getCfg(env);
  const text = `🏆 <b>أوائل الأسبوع اللي فات</b>\n<i>Last week's top typists</i>\n\n${ar ? "<b>عربي</b>\n" + ar + "\n" : ""}${en ? "<b>English</b>\n" + en + "\n" : ""}\nأسبوع جديد بدأ والترتيب اتصفّر، يلا 👇\nA new week has started.`;
  await api(env, "sendMessage", {
    chat_id: cfg.group || "@" + GROUP, message_thread_id: cfg.topics.results || undefined,
    text, parse_mode: "HTML", link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [[{ text: "افتح طقطقة", url: SITE }, { text: "English", url: SITE + "/en/" }]] }
  });
}

/* ---------- ربط البوت بالـ Worker (آمن تتفتح أكتر من مرة) ---------- */
async function setup(env, url) {
  const me = await api(env, "getMe", {});
  const hook = await api(env, "setWebhook", {
    url: `https://${url.hostname}/api/tg`, secret_token: await hookSecret(env),
    allowed_updates: ["message", "edited_message"], drop_pending_updates: false
  });
  const cmdsAr = [
    { command: "help", description: "البوت بيعمل إيه" },
    { command: "lb", description: "أوائل الترتيب الأسبوعي دلوقتي" },
    { command: "faq", description: "أسئلة كتير بتتسأل عن الموقع" },
    { command: "rules", description: "قواعد الجروب" },
    { command: "site", description: "لينك الموقع" }
  ];
  const cmdsEn = [
    { command: "help", description: "What this bot does" },
    { command: "lb", description: "This week's leaderboard" },
    { command: "faq", description: "Common questions about the site" },
    { command: "rules", description: "Group rules" },
    { command: "site", description: "Site link" }
  ];
  await api(env, "setMyCommands", { commands: cmdsAr });
  await api(env, "setMyCommands", { commands: cmdsEn, language_code: "en" });
  await api(env, "setMyShortDescription", { short_description: "مساعد مجتمع طقطقة: موقع تدريب على الكتابة بالعربي والإنجليزي. taqtaqa.com" });
  await api(env, "setMyShortDescription", { short_description: "Taqtaqa community helper: Arabic and English typing practice. taqtaqa.com", language_code: "en" });
  await api(env, "setMyDescription", { description: "أهلًا! أنا مساعد مجتمع طقطقة.\nاسألني أي حاجة عن الموقع، وأنا بوصّل مشاكلك لصاحب الموقع على طول.\n\nالجروب: t.me/taqtaqaclub\nالموقع: taqtaqa.com" });
  await api(env, "setMyDescription", { description: "Hi! I'm the Taqtaqa community helper.\nAsk me anything about the site, and I pass your issues straight to its owner.\n\nGroup: t.me/taqtaqaclub\nSite: taqtaqa.com", language_code: "en" });
  const ok = !!(me.ok && hook.ok);
  return new Response(JSON.stringify({ ok, bot: me.ok ? "@" + me.result.username : null, webhook: hook.ok, storage: !!env.BOT, error: ok ? undefined : (me.description || hook.description) }, null, 2),
    { status: ok ? 200 : 500, headers: { "content-type": "application/json; charset=utf-8" } });
}

/* ---------- الرسايل ---------- */
async function handle(u, env) {
  const m = u.message || u.edited_message;
  if (!m || !m.chat) return;
  if (m.chat.type === "private") return u.message && privateChat(m, env);
  if (m.chat.type !== "supergroup" && m.chat.type !== "group") return;

  const cfg = await getCfg(env);
  // البوت بيشتغل في جروب طقطقة بس، ولو حد ضافه في جروب تاني بيخرج
  const ours = (m.chat.username || "").toLowerCase() === GROUP || m.chat.id === cfg.group;
  if (!ours) return api(env, "leaveChat", { chat_id: m.chat.id });
  let dirty = false;
  if (cfg.group !== m.chat.id) { cfg.group = m.chat.id; dirty = true; }
  if (learnTopic(m, cfg)) dirty = true;
  if (dirty) await putCfg(env, cfg);

  if (m.new_chat_members) return welcome(m, env, cfg);
  if (m.left_chat_member) return api(env, "deleteMessage", { chat_id: m.chat.id, message_id: m.message_id });
  const from = m.from;
  if (!from || from.is_bot || m.sender_chat) return; // رسايل الأدمن المخفي والقنوات المربوطة

  const admin = await isAdmin(env, m.chat.id, from.id);
  if (!admin && await spam(m, env, cfg)) return;
  if (!u.message) return; // الرسايل المتعدلة بنفحصها للسبام بس

  const thread = m.is_topic_message ? m.message_thread_id : 0;
  if (thread && thread === cfg.topics.bugs && !admin) return reportBug(m, env, cfg);

  const text = (m.text || "").trim();
  const cmd = command(text);
  if (cmd === "topics") return from.id === await ownerId(env, cfg) ? setupTopics(m, env, cfg) : null;
  if (cmd) return answerCommand(cmd, text, m, env);
  const mentioned = text.toLowerCase().includes("@" + BOT) || (m.reply_to_message && m.reply_to_message.from && m.reply_to_message.from.username === BOT);
  if (mentioned) return reply(env, m, faqAnswer(text.replace(new RegExp("@" + BOT, "ig"), "")));
}

async function privateChat(m, env) {
  const text = (m.text || m.caption || "").trim();
  const cmd = command(text);
  if (cmd === "start") {
    const cfg = await getCfg(env);
    const owner = await ownerId(env, cfg);
    if (owner && owner === m.from.id) return reply(env, m, "أهلًا يا صاحب الجروب 👋\nأي رسالة تتكتب في قسم «مشاكل» هتوصلك هنا على طول.");
    return reply(env, m, isAr(m.from.language_code, text) ? HELP_AR : HELP_EN, joinButtons());
  }
  if (cmd) return answerCommand(cmd, text, m, env);
  if (text) return reply(env, m, faqAnswer(text, m.from.language_code));
}

async function answerCommand(cmd, text, m, env) {
  const ar = isAr(m.from && m.from.language_code, text);
  if (cmd === "help" || cmd === "start") return reply(env, m, ar ? HELP_AR : HELP_EN, joinButtons());
  if (cmd === "site") return reply(env, m, ar ? "طقطقة: taqtaqa.com\nوبالإنجليزي: taqtaqa.com/en" : "Taqtaqa: taqtaqa.com/en\nArabic: taqtaqa.com", joinButtons());
  if (cmd === "rules") return reply(env, m, RULES);
  if (cmd === "faq") return reply(env, m, ar ? FAQ_LIST_AR : FAQ_LIST_EN);
  if (cmd === "lb") {
    const lang = /\ben\b|english|انجليزي|إنجليزي/i.test(text) ? "en" : "ar";
    const week = weekId(Date.now());
    const body = await boardText(week, lang, ar ? "ar" : "en");
    const head = ar ? `🏆 <b>الترتيب الأسبوعي دلوقتي (${lang === "ar" ? "عربي" : "إنجليزي"})</b>` : `🏆 <b>This week's leaderboard (${lang === "ar" ? "Arabic" : "English"})</b>`;
    const empty = ar ? "لسه محدش دخل الترتيب الأسبوع ده. ادخل من «تاريخي» ثم «الترتيب الأسبوعي» في الموقع وكن أول واحد 💪" : "Nobody has joined this week yet. Open History, then Weekly leaderboard on the site, and be the first 💪";
    const tip = ar ? (lang === "ar" ? "\n\nللإنجليزي: /lb en" : "") : (lang === "ar" ? "\n\nFor English: /lb en" : "");
    return reply(env, m, `${head}\n\n${body || empty}${tip}`, joinButtons());
  }
}

/* ---------- الترحيب ---------- */
async function welcome(m, env, cfg) {
  const people = m.new_chat_members.filter((p) => !p.is_bot);
  await api(env, "deleteMessage", { chat_id: m.chat.id, message_id: m.message_id });
  if (!people.length) return;
  for (const p of people) await put(env, "join:" + p.id, Date.now(), DAY / 1000);
  const names = people.map((p) => `<a href="tg://user?id=${p.id}">${esc(p.first_name || "صديق")}</a>`).join("، ");
  const text = `أهلًا بيك ${names} في مجتمع طقطقة 👋\n\nهنا بنشارك نتايجنا، واقتراحاتنا، وأي مشكلة بتقابلنا في الموقع.\n• نزّل سكرين نتيجتك في «نتايجكم» 🏆\n• أي غلطة في الموقع اكتبها في «مشاكل»، وبتوصل لصاحب الموقع على طول\n• عندك سؤال؟ اعملي منشن @${BOT}\n\nWelcome! Share your results, ideas and issues here. English chat is in the English topic.`;
  const old = await get(env, "lastWelcome");
  if (old) await api(env, "deleteMessage", { chat_id: m.chat.id, message_id: old });
  const r = await api(env, "sendMessage", {
    chat_id: m.chat.id, message_thread_id: cfg.topics.welcome || (m.is_topic_message ? m.message_thread_id : undefined),
    text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: joinButtons()
  });
  if (r.ok) await put(env, "lastWelcome", r.result.message_id);
}

/* ---------- السبام ---------- */
const SPAM_WORDS = /(استثمار|استثمر|ارباح|أرباح|اربح|ربح يومي|دخل يومي|تداول|فوركس|بيتكوين|عملات رقمية|كريبتو|crypto|bitcoin|usdt|forex|invest(ment|ing)?|airdrop|earn \$|giveaway|onlyfans|casino|كازينو|مراهنات|قروض|سلفة)/i;
const OK_HOSTS = /^(www\.)?(taqtaqa\.com|github\.com|t\.me\/taqtaqaclub)/i;

function links(m) {
  const text = m.text || m.caption || "", out = [];
  for (const e of m.entities || m.caption_entities || []) {
    if (e.type === "url") out.push(text.substr(e.offset, e.length));
    if (e.type === "text_link") out.push(e.url);
  }
  return out.map((l) => l.replace(/^https?:\/\//i, ""));
}
async function spam(m, env, cfg) {
  const text = m.text || m.caption || "";
  const ls = links(m).filter((l) => !OK_HOSTS.test(l));
  const fresh = !!(await get(env, "join:" + m.from.id));
  const invite = ls.some((l) => /^(t\.me|telegram\.me|telegram\.dog)\//i.test(l)) || /(t\.me|telegram\.me)\/(\+|joinchat)/i.test(text);
  const forwarded = !!(m.forward_origin && (m.forward_origin.type === "channel" || m.forward_origin.type === "chat"));
  const bad = invite || SPAM_WORDS.test(text) && (ls.length || fresh) || fresh && (ls.length || forwarded);
  if (!bad) return false;

  await api(env, "deleteMessage", { chat_id: m.chat.id, message_id: m.message_id });
  const strikes = ((await get(env, "strike:" + m.from.id)) || 0) + 1;
  await put(env, "strike:" + m.from.id, strikes, DAY / 1000);
  const who = `<a href="tg://user?id=${m.from.id}">${esc(m.from.first_name || "")}</a>`;
  let note;
  if (strikes >= 2) {
    await api(env, "banChatMember", { chat_id: m.chat.id, user_id: m.from.id, revoke_messages: true });
    note = `🚫 ${who} اتشال من الجروب بسبب السبام.`;
    const owner = await ownerId(env, cfg);
    if (owner) await api(env, "sendMessage", { chat_id: owner, text: `🚫 البوت شال ${who} (id ${m.from.id}) بسبب سبام.\nلو ده غلط، فك الحظر من إعدادات الجروب.\n\nالرسالة:\n${esc(text.slice(0, 500))}`, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  } else {
    note = fresh ? `${who} اتمسحت رسالتك: الأعضاء الجداد ما ينفعش يبعتوا لينكات أو رسايل محوّلة في أول يوم.\nNew members can't post links in their first day.`
      : `${who} اتمسحت رسالتك لأنها شكلها سبام. لو دي غلطة، كلّم الأدمن.\nYour message looked like spam and was removed.`;
  }
  const old = await get(env, "lastNote");
  if (old) await api(env, "deleteMessage", { chat_id: m.chat.id, message_id: old });
  const r = await api(env, "sendMessage", { chat_id: m.chat.id, message_thread_id: m.is_topic_message ? m.message_thread_id : undefined, text: note, parse_mode: "HTML" });
  if (r.ok) await put(env, "lastNote", r.result.message_id);
  return true;
}

/* ---------- المشاكل بتوصل لصاحب الجروب ---------- */
async function reportBug(m, env, cfg) {
  const owner = await ownerId(env, cfg);
  await api(env, "setMessageReaction", { chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: "emoji", emoji: "👀" }] });
  if (!owner) return;
  const who = `<a href="tg://user?id=${m.from.id}">${esc([m.from.first_name, m.from.last_name].filter(Boolean).join(" "))}</a>${m.from.username ? " @" + m.from.username : ""}`;
  const link = m.chat.username ? `https://t.me/${m.chat.username}/${m.message_thread_id}/${m.message_id}` : "";
  const r = await api(env, "sendMessage", { chat_id: owner, text: `🐞 <b>مشكلة جديدة</b> من ${who}${link ? `\n<a href="${link}">افتح الرسالة في الجروب</a>` : ""}`, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  if (r.ok) await api(env, "copyMessage", { chat_id: owner, from_chat_id: m.chat.id, message_id: m.message_id });
}

/* ---------- الترتيب الأسبوعي من Firestore (القراية متاحة للكل) ---------- */
const DAY = 864e5;
const LEAGUES = [[1, "ريشة", "Feather"], [2, "قلم", "Pen"], [3, "كاتب", "Writer"], [4, "خطّاط", "Calligrapher"], [5, "طقطاق", "Taqtaq"]];
function weekId(t) {
  const d = new Date(t); d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - ((d.getUTCDay() + 1) % 7) * DAY).toISOString().slice(0, 10);
}
async function boardText(week, lang, ui) {
  // محفوظ ٥ دقايق، عشان /lb لو اتكتب كتير ما يقراش من Firestore كل مرة
  const key = `${SITE}/__bot/board/${week}_${lang}_${ui}`;
  const hit = await caches.default.match(key);
  if (hit) return hit.text();
  const text = await readBoard(week, lang, ui);
  await caches.default.put(key, new Response(text, { headers: { "cache-control": "max-age=300" } }));
  return text;
}
async function readBoard(week, lang, ui) {
  const lines = [];
  for (const [id, ar, en] of LEAGUES) {
    let rows = [];
    try {
      const r = await fetch(`${FIRESTORE}${week}_${lang}_${id}/players?pageSize=300`);
      const j = await r.json();
      rows = (j.documents || []).map((d) => {
        const f = d.fields || {};
        const n = (k) => Number((f[k] && (f[k].doubleValue ?? f[k].integerValue)) || 0);
        return { name: f.name && f.name.stringValue || "", speed: n("speed") };
      }).filter((x) => x.name && x.speed > 0).sort((a, b) => b.speed - a.speed).slice(0, 3);
    } catch {}
    if (!rows.length) continue;
    const medals = ["🥇", "🥈", "🥉"];
    lines.push(`<b>${ui === "ar" ? ar : en}</b>\n` + rows.map((x, i) => `${medals[i]} ${esc(x.name)}: ${Math.round(x.speed)} ${ui === "ar" ? "ك/د" : "wpm"}`).join("\n"));
  }
  return lines.join("\n\n");
}

/* ---------- الأسئلة ---------- */
const FAQ = [
  [/تشكيل|حركات|تنوين|diacritic|tashkeel|harakat/i,
    "التشكيل: من «إعدادات» فوق النص فعّل «التشكيل»، وكل النصوص هتظهر بحركات بسيطة لازم تكتبها.",
    "Diacritics: open Settings above the text and turn on Tashkeel. Every text then shows simple diacritics you need to type."],
  [/ترتيب|دوري|ليدر|leader|league|rank/i,
    "الترتيب الأسبوعي: من «تاريخي» افتح «الترتيب الأسبوعي» وادخل باسم تختاره (لازم تكون مسجّل دخول). بتتنافس مع ناس في نفس مستواك في ٥ دوريات: ريشة، قلم، كاتب، خطّاط، طقطاق. السرعة = متوسط أحسن ٣ اختبارات ليك في الأسبوع (١٥ ثانية أو أكتر ودقة ٩٠٪ أو أكتر)، وفيه كمان ترتيب للتحسّن وللدقايق. الترتيب بيتصفّر كل سبت.",
    "Weekly leaderboard: open History, then Weekly leaderboard, and join with a name you choose (you need to be signed in). You compete with people at your level across 5 leagues. Speed is the average of your best 3 tests that week (15s or longer, 90%+ accuracy); there are also boards for improvement and minutes. It resets every Saturday."],
  [/ك\/د|سرع|wpm|speed|بتتحسب|حساب السرعة/i,
    "السرعة بتتحسب بالكلمات في الدقيقة (ك/د): كل ٥ حروف صح = كلمة. والدقة = الحروف الصح من كل اللي كتبته.",
    "Speed is in words per minute: every 5 correct characters count as one word. Accuracy is correct characters out of everything you typed."],
  [/تسجيل|حساب|دخول|جوجل|google|login|sign ?in|account|sync/i,
    "تسجيل الدخول بحساب Google من الزرار اللي فوق في الموقع. بيحفظ تاريخك وأحسن أرقامك ومفضلتك في حسابك، فتلاقيهم على أي جهاز. ومن غير تسجيل، كل حاجة بتتحفظ على المتصفح بس.",
    "Sign in with Google from the button at the top. It saves your history, bests and favorites to your account so you get them on any device. Without signing in, everything stays in that browser only."],
  [/ماك|ويندوز|mac|windows|ترتيب الكيبورد|layout/i,
    "ترتيب الكيبورد: تحت الكيبورد اللي على الشاشة تختار «ويندوز» أو «ماك». والاختصارات في آخر الصفحة بتتغير لوحدها على حسب جهازك.",
    "Keyboard layout: pick Windows or Mac under the on-screen keyboard. The shortcuts at the bottom switch to your device automatically."],
  [/إيد|ايد|صوابع|صباع|hand|finger/i,
    "الإيدين على الكيبورد بيوروك تحط صوابعك فين، والصباع اللي عليه الدور بيتحرك للزرار. تقدر تقفلهم من «إعدادات».",
    "The hands on the keyboard show where your fingers rest and move the right finger to each key. You can turn them off in Settings."],
  [/هدف|goal/i,
    "الهدف اليومي: الدايرة اللي فوق جنب الأزرار، بتختار كام دقيقة عاوز تتمرن كل يوم، والموقع بيقولك لما توصل.",
    "Daily goal: the ring at the top lets you pick how many minutes to practice each day, and the site tells you when you hit it."],
  [/تطبيق|نت|offline|install|app|موبايل|mobile|phone/i,
    "طقطقة بيتسطّب كتطبيق من المتصفح (Add to Home Screen أو Install)، وبيشتغل من غير نت بعد أول مرة. وعلى الموبايل بيشتغل مع الكيبورد الخارجي أحسن.",
    "Taqtaqa installs as an app from your browser (Add to Home Screen or Install) and works offline after the first visit. On phones it works best with an external keyboard."],
  [/إنجليزي|انجليزي|english/i,
    "فيه نسخة إنجليزي كاملة من زرار EN فوق، وقسم «إنجليزي» فيه اقتباسات تتمرن عليها.",
    "There is a full English version from the EN button at the top, and an English section with quotes to practice on."],
  [/قرآن|قران|آي|quran/i,
    "قسم «قرآن» فيه ٨٠ آية من مصحف تنزيل، منقولة زي ما هي.",
    "The Quran section has 80 verses from the Tanzil text, copied exactly."],
  [/اختصار|shortcut|tab|esc/i,
    "أهم الاختصارات: Tab النص اللي بعده، وEsc توقّف مؤقتًا، وShift+Enter تبدأ النص من الأول، وCtrl+Backspace تمسح الكلمة كلها. والقايمة كاملة في آخر الصفحة.",
    "Key shortcuts: Tab for the next text, Esc to pause, Shift+Enter to restart, Ctrl+Backspace to delete a word. The full list is at the bottom of the page."],
  [/تاريخ|نتايج|نتائج|history|result/i,
    "«تاريخي» فيه كل اختباراتك، مقسومة عربي وإنجليزي، ومعاها الحروف اللي بتغلط فيها، وخريطة الأيام، وأحسن أرقامك.",
    "History has all your tests split by Arabic and English, plus your weak keys, a calendar of active days and your personal bests."],
  [/اقترح|اقتراح|نص جديد|suggest|idea/i,
    "اقتراحك نورنا 🙏 اكتبه في قسم «اقتراحات» في الجروب، أو من زرار «ادعم طقطقة» في آخر الموقع.",
    "Thanks! Post it in the Suggestions topic, or use the Support Taqtaqa button at the bottom of the site."],
  [/مشكل|غلط|bug|error|مش شغال|broken|issue/i,
    "اكتب المشكلة في قسم «مشاكل» في الجروب ومعاها سكرين لو تقدر، وبتوصل لصاحب الموقع على طول.",
    "Post the issue in the Issues topic, with a screenshot if you can, and it goes straight to the site owner."]
];
const FAQ_LIST_AR = "❓ <b>أسئلة كتير بتتسأل</b>\nاعملي منشن واسأل عن أي حاجة من دول:\n• التشكيل\n• الترتيب الأسبوعي والدوريات\n• السرعة بتتحسب ازاي\n• تسجيل الدخول\n• ترتيب ويندوز وماك\n• الإيدين على الكيبورد\n• الهدف اليومي\n• التطبيق ومن غير نت\n• النسخة الإنجليزي\n• الاختصارات";
const FAQ_LIST_EN = "❓ <b>Common questions</b>\nMention me and ask about any of these:\n• Diacritics\n• Weekly leaderboard and leagues\n• How speed is calculated\n• Signing in\n• Windows and Mac layouts\n• Hands on the keyboard\n• Daily goal\n• Installing and offline use\n• English version\n• Shortcuts";
function faqAnswer(text, langCode) {
  const ar = isAr(langCode, text);
  const hit = FAQ.find(([re]) => re.test(text));
  if (hit) return hit[ar ? 1 : 2];
  if (!text.trim()) return ar ? "أيوه؟ 😄 اسألني عن أي حاجة في الموقع، أو اكتب /faq" : "Yes? 😄 Ask me anything about the site, or send /faq";
  return ar ? "مش متأكد إني فاهم سؤالك 🤔 جرّب /faq تشوف الحاجات اللي أعرف أرد عليها، أو اكتبه في قسم «مشاكل» وصاحب الموقع هيرد عليك."
    : "I'm not sure I got that 🤔 Try /faq to see what I can answer, or post it in the Issues topic and the site owner will reply.";
}

const HELP_AR = "أهلًا! أنا مساعد مجتمع طقطقة 🤖\n\n• اسألني أي حاجة عن الموقع (اعملي منشن في الجروب)\n• /lb أوائل الترتيب الأسبوعي دلوقتي\n• /faq أسئلة كتير بتتسأل\n• /rules قواعد الجروب\n\nوأي حاجة تكتبها في قسم «مشاكل» بتوصل لصاحب الموقع على طول.";
const HELP_EN = "Hi! I'm the Taqtaqa community helper 🤖\n\n• Ask me anything about the site (mention me in the group)\n• /lb this week's leaderboard\n• /faq common questions\n• /rules group rules\n\nAnything posted in the Issues topic goes straight to the site owner.";
const RULES = "📌 <b>قواعد الجروب</b>\n١. احترم الكل، ومن غير شتيمة أو تنمّر.\n٢. ممنوع الإعلانات واللينكات الغريبة. الأعضاء الجداد ما يبعتوش لينكات في أول يوم.\n٣. كل حاجة في قسمها: النتايج في «نتايجكم»، والمشاكل في «مشاكل».\n٤. اللي بيبعت سبام مرتين بيتشال من الجروب.\n\n<b>Rules</b>\n1. Be kind. No insults or bullying.\n2. No ads or strange links. New members can't post links on day one.\n3. Keep each thing in its topic.\n4. Two spam messages and you're removed.";

/* ---------- أدوات ---------- */
async function api(env, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${method}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000)
    });
    const j = await r.json();
    if (!j.ok) console.log("tg", method, j.description);
    return j;
  } catch (e) { return { ok: false, description: String(e) }; }
}
function reply(env, m, text, markup) {
  return api(env, "sendMessage", {
    chat_id: m.chat.id, message_thread_id: m.is_topic_message ? m.message_thread_id : undefined,
    text, parse_mode: "HTML", link_preview_options: { is_disabled: true },
    reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true }, reply_markup: markup
  });
}
const joinButtons = () => ({ inline_keyboard: [[{ text: "افتح طقطقة", url: SITE }, { text: "English", url: SITE + "/en/" }]] });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function isAr(code, text) {
  const t = (text || "").replace(/^\/\w+(@\w+)?/, "");
  if (/[\u0600-\u06FF]/.test(t)) return true;
  if (/[a-z]/i.test(t)) return false;
  return !code || /^ar/i.test(code);
}
function command(text) {
  const c = /^\/([a-z]+)(@\w+)?(\s|$)/i.exec(text || "");
  if (!c || c[2] && c[2].toLowerCase() !== "@" + BOT) return null;
  return c[1].toLowerCase();
}
async function hookSecret(env) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("taqtaqa-hook:" + env.TG_TOKEN));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}

/* أقسام الجروب: البوت بيعرفها من أساميها */
const TOPIC_NAMES = [["bugs", /مشاكل|مشكلة|bug|issue/i], ["results", /نتا[يئ]ج|result|score/i], ["ideas", /اقتراح|suggest|idea/i], ["welcome", /أهل|اهل|ترحيب|قواعد|welcome|rules/i], ["chat", /دردشة|chat/i], ["en", /english/i]];

/* /topics (لصاحب الجروب بس): البوت بيعمل الأقسام اللي ناقصة، وبيثبّت القواعد في «أهلًا» */
const TOPICS = [
  ["welcome", "👋 أهلًا وقواعد", 7322096],
  ["results", "🏆 نتايجكم", 16766590],
  ["ideas", "💡 اقتراحات", 9367192],
  ["bugs", "🐞 مشاكل", 16478047],
  ["chat", "💬 دردشة", 13338331],
  ["en", "🌍 English", 16749490]
];
const TOPIC_INTRO = {
  welcome: null,
  results: "🏆 نزّل هنا سكرين نتيجتك من الموقع (زرار «شارك نتيجتك»)، وكل سبت بنزّل هنا أوائل الترتيب الأسبوعي.\nShare your result screenshots here. Every Saturday the weekly top typists are posted here.",
  ideas: "💡 عندك فكرة لميزة، أو نص تحب يتضاف، أو قسم جديد؟ اكتبه هنا.\nIdeas for features, texts or new sections go here.",
  bugs: "🐞 لقيت حاجة مش شغالة؟ اكتبها هنا ومعاها سكرين لو تقدر، وقول جهازك والمتصفح. كل رسالة هنا بتوصل لصاحب الموقع على طول.\nFound something broken? Post it here with a screenshot, your device and browser. It goes straight to the site owner.",
  chat: "💬 أي كلام عن الكتابة والكيبوردات وأي حاجة تانية.\nGeneral chat about typing, keyboards and anything else.",
  en: "🌍 English chat lives here. Ask anything about Taqtaqa, or mention @" + BOT + " for quick answers."
};
async function setupTopics(m, env, cfg) {
  const made = [];
  for (const [key, name, color] of TOPICS) {
    if (cfg.topics[key]) continue;
    const r = await api(env, "createForumTopic", { chat_id: m.chat.id, name, icon_color: color });
    if (!r.ok) return reply(env, m, `ما قدرتش أعمل قسم «${esc(name)}»: ${esc(r.description || "")}\nاتأكد إن الأقسام متفعّلة وإن البوت عنده صلاحية Manage Topics.`);
    const id = r.result.message_thread_id;
    cfg.topics[key] = id; made.push(name);
    await putCfg(env, cfg);
    const intro = key === "welcome" ? RULES : TOPIC_INTRO[key];
    const p = await api(env, "sendMessage", { chat_id: m.chat.id, message_thread_id: id, text: intro, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: key === "welcome" ? joinButtons() : undefined });
    if (p.ok) await api(env, "pinChatMessage", { chat_id: m.chat.id, message_id: p.result.message_id, disable_notification: true });
  }
  return reply(env, m, made.length ? "✅ عملت الأقسام دي:\n" + made.join("\n") : "كل الأقسام موجودة ✅");
}
function learnTopic(m, cfg) {
  const t = m.forum_topic_created || m.reply_to_message && m.reply_to_message.forum_topic_created;
  if (!t || !t.name || !m.message_thread_id) return false;
  const hit = TOPIC_NAMES.find(([, re]) => re.test(t.name));
  // القسم اللي اتعرف قبل كده ما بيتغيرش، عشان محدش يعمل قسم بنفس الاسم ويسحب رسايل «مشاكل» لعنده
  if (!hit || cfg.topics[hit[0]]) return false;
  cfg.topics[hit[0]] = m.message_thread_id;
  return true;
}

/* صاحب الجروب والأدمنز (محفوظين ١٠ دقايق) */
async function admins(env, chatId) {
  let a = await get(env, "admins");
  if (!a) {
    const r = await api(env, "getChatAdministrators", { chat_id: chatId });
    a = r.ok ? { ids: r.result.map((x) => x.user.id), owner: (r.result.find((x) => x.status === "creator") || {}).user?.id || null } : { ids: [], owner: null };
    await put(env, "admins", a, 600);
  }
  return a;
}
const isAdmin = async (env, chatId, id) => (await admins(env, chatId)).ids.includes(id);
async function ownerId(env, cfg) {
  return (await admins(env, cfg.group || "@" + GROUP)).owner;
}

/* التخزين: Workers KV (BOT)، ولو مش موجود بنستخدم كاش Cloudflare */
async function get(env, k) {
  if (env.BOT) return env.BOT.get(k, "json");
  const r = await caches.default.match(`${SITE}/__bot/${k}`);
  return r ? r.json() : null;
}
async function put(env, k, v, ttl) {
  if (env.BOT) return env.BOT.put(k, JSON.stringify(v), ttl ? { expirationTtl: Math.max(60, Math.round(ttl)) } : undefined);
  await caches.default.put(`${SITE}/__bot/${k}`, new Response(JSON.stringify(v), { headers: { "cache-control": `max-age=${ttl ? Math.round(ttl) : 31536000}` } }));
}
async function getCfg(env) {
  const c = (await get(env, "cfg")) || {};
  return { group: c.group || null, topics: c.topics || {} };
}
const putCfg = (env, c) => put(env, "cfg", c);
