/* طقطقة: كود الموقع.
   الأجزاء بالترتيب: الإعدادات واللغة، مساعدات، النصوص والأقسام، حالة الاختبار، الإدخال والاختصارات،
   العرض، النتيجة، المشاركة، الكيبورد، الثيمات، آخر مرة، المفضلة، التاريخ (والأيام وأحسن الأرقام
   والحروف والهدف اليومي)، الخطوط، الإعدادات، ادعم طقطقة، الاختصارات، النقل، الجولة، اللوجو، البداية. */
(function(){
"use strict";

/* ============ الإعدادات واللغة ============ */
const DEF = {src:"masry",mode:"time",time:30,words:25,qlen:"all",lenient:true,punct:true,kb:true,layout:"pc",theme:"vesper",tfilter:"dark",tfont:"sans",tsize:"m",tashkeel:false,pace:true,goal:10};
let cfg = Object.assign({},DEF);
try{const s=JSON.parse(localStorage.getItem("tq-cfg")||"null"); if(s) cfg=Object.assign(cfg,s);}catch(e){}
if(cfg.src==="tashkeel") cfg.src="mix";
if(!cfg.theme) cfg.theme="vesper";
function saveCfg(){try{localStorage.setItem("tq-cfg",JSON.stringify(cfg));}catch(e){}}
function getPBs(){try{return JSON.parse(localStorage.getItem("tq-pb")||"{}");}catch(e){return {};}}
function setPBs(o){try{localStorage.setItem("tq-pb",JSON.stringify(o));}catch(e){}}

const $=id=>document.getElementById(id);
const wordsEl=$("words"), caret=$("caret"), slab=$("slab"), ti=$("ti"), fmsg=$("fmsg");
/* اللغة: الصفحة الإنجليزي (en/) بنفس الكود، والفرق في الكلام بس */
const EN=document.documentElement.lang==="en";
const L=(ar,en)=>EN?en:ar;
const AR_NUM=n=>EN?String(n):String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
const PCT=L("٪","%"), WPM=L("ك/د","wpm");

/* ============ مساعدات النص ============ */
const TASHKEEL=/[ً-ْٰـ]/g;
const HARAKAT=/[\u064B-\u0652]/g;
function isMark(c){return !!c&&c>="\u064B"&&c<="\u0652";}
/* الشدة الأول وبعدين الحركة، زي ما الناس بتكتبها */
function canonMarks(t){return t.replace(/[\u064B-\u0652]{2,}/g,r=>[...r].sort((a,b)=>(a==="\u0651"?0:1)-(b==="\u0651"?0:1)).join(""));}
/* الحركات بتظهر لما اختيار التشكيل يكون شغال، وبتتشال لما يتقفل */
function clean(t,tk){
  t=(cfg.tashkeel&&tk)?canonMarks(t.replace(/[\u0670\u0640]/g,"")):t.replace(TASHKEEL,"");
  t=t.replace(/\.{2,}/g,/[\u0600-\u06FF]/.test(t)?"،":".").replace(/[ﻻﻹﻷﻵ]/g,m=>({"ﻻ":"لا","ﻹ":"لإ","ﻷ":"لأ","ﻵ":"لآ"}[m]));
  if(!cfg.punct) t=t.replace(/[،؛؟!?;.:,"«»\-]/g," ");
  return t.replace(/\s+/g," ").trim();
}
const NMAP={"أ":"ا","إ":"ا","آ":"ا","ٱ":"ا","ة":"ه","ى":"ي","ؤ":"و","ئ":"ي"};
function N(c){return cfg.lenient?(NMAP[c]||c):c;}
function eq(a,b){return a===b||N(a)===N(b);}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
/* أي نص بيتحط جوه HTML */
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function tok(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function avgLast(a,k,f){const s=a.slice(-k);return s.length?s.reduce((x,y)=>x+y[f],0)/s.length:0;}
/* اليوم بتوقيت الجهاز، عشان «النهارده» و«أيام التمرين» */
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();};
function toast(msg){ document.querySelectorAll(".toast").forEach(x=>x.remove()); const d=document.createElement("div"); d.className="toast"; d.setAttribute("role","status"); d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),5000); }

/* الأقسام العربي، واللي «مكس» بيجمع منها */
const AR_CATS=["masry","saudi","kalam","aflam","hawadit","hekam","sheer"];
const CATS={
  masry:()=>MASRY.map(t=>({t,s:L("مثل شعبي مصري","Egyptian proverb"),tk:true})),
  saudi:()=>SAUDI.map(t=>({t,s:L("مثل شعبي سعودي","Saudi proverb"),tk:true})),
  kalam:()=>KALAM.map(t=>({t,s:L("كلام مصري","Egyptian Arabic"),tk:true})).concat(MT_EGY.map(t=>({t,s:L("كلام مصري، من اقتباسات Monkeytype","Egyptian Arabic, from Monkeytype quotes"),tk:true}))),
  hawadit:()=>HAWADIT.map(([t,s])=>({t,s,tk:true})),
  aflam:()=>AFLAM.map(([t,f,a,y])=>({t,s:EN?`From the film ${f} (${y}), ${a}`:`فيلم ${f} (${y})، ${a}`,tk:true})),
  hekam:()=>HEKAM.map(([t,s])=>({t,s,tk:true})),
  sheer:()=>SHEER.map(([t,s])=>({t,s,tk:true})),
  /* اقتباسات إنجليزي: بتتكتب من الشمال لليمين، ومش داخلة في «مكس» */
  en:()=>EN_QUOTES.map(([t,s])=>({t,s,en:true})),
  /* القرآن: قسم لوحده، ومش داخل في «مكس» */
  quran:()=>QURAN.map(([t,n,a,b])=>({t,s:quranSrc(n,a,b),tk:true,quran:true})),
  fav:()=>{ const cur=new Map(); AR_CATS.concat("en","quran").forEach(c=>CATS[c]().forEach(q=>cur.set(favKey(q.t),q))); return getFavs().map(f=>cur.get(favKey(f.t))||{t:f.t,s:f.s,tk:f.tk,en:f.en||!/[\u0600-\u06FF]/.test(f.t)}); }
};
/* «سورة البقرة، الآية ٢٥٥» أو «Quran, Al-Baqarah 2:255» */
function quranSrc(n,a,b){
  const nm=QURAN_SURAS[n]||[String(n),String(n)];
  if(EN) return `Quran, ${nm[1]} ${n}:${a}${b>a?"-"+b:""}`;
  return `سورة ${nm[0]}، ${b>a?"الآيات "+AR_NUM(a)+"-"+AR_NUM(b):"الآية "+AR_NUM(a)}`;
}
function allQuotes(){
  const keys=(cfg.src==="mix"||cfg.src==="words")?AR_CATS:[cfg.src];
  return keys.flatMap(k=>CATS[k]());
}
function lenCat(t){const n=t.replace(TASHKEEL,"").length;return n<70?"s":n<180?"m":n<320?"l":"xl";}

/* شنطة بتلف على كل النصوص قبل ما تكرر */
const bags={};
function draw(key,list){
  let b=bags[key]; if(!b||!b.length) b=bags[key]=shuffle(list);
  return b.pop();
}
let gen=null, genLog=null;
/* اتجاه النص: الإنجليزي من الشمال لليمين */
const qDir=q=>q&&q.en?"ltr":"rtl";
function makeGen(){
  if(cfg.src==="words"){
    let last="";
    const g=()=>{const out=[];for(let i=0;i<20;i++){let w;do{w=WORDS[Math.random()*WORDS.length|0];}while(w===last);last=w;if(genLog)genLog.push({t:w});out.push(clean(w));}return out.join(" ").split(" ").filter(Boolean);};
    g.dir="rtl"; return g;
  }
  /* في المفضلة بالوقت أو بعدد كلمات، ما بنخلطش عربي وإنجليزي في نفس الاختبار */
  let qs=allQuotes();
  if(cfg.src==="fav"){ const ar=qs.filter(q=>!q.en); if(ar.length) qs=ar; }
  const key="stream-"+cfg.src+(qs[0]&&qs[0].en?"-en":"");
  const g=()=>{ const q=draw(key,qs); if(genLog) genLog.push(q); return clean(q.t,q.tk).split(" ").filter(Boolean); };
  g.dir=qDir(qs[0]); return g;
}

/* ============ حالة الاختبار ============ */
let T;
function fresh(words,quote){
  return {words,typed:[""],idx:0,started:false,done:false,t0:0,ok:0,bad:0,secKeys:0,secErr:0,samples:[],nextSec:1,timer:null,quote,missed:new Set(),ek:{}};
}
function buildWords(){
  if(cfg.src==="fav"&&!getFavs().length){ cfg.src="mix"; saveCfg(); syncConfig(); toast(L("مفضلتك فاضية، فرجعناك لـ«مكس».","Your favorites are empty, so we switched you to Mix.")); }
  gen=makeGen();
  if(cfg.mode==="quote"){
    let qs=allQuotes(); if(cfg.qlen!=="all"){const f=qs.filter(q=>lenCat(q.t)===cfg.qlen); if(f.length) qs=f;}
    const q=draw("q-"+cfg.src+"-"+cfg.qlen,qs);
    return {words:clean(q.t,q.tk).split(" ").filter(Boolean),quote:q,count:qs.length,dir:qDir(q)};
  }
  const need=cfg.mode==="words"?cfg.words:90; let w=[];
  genLog=[];
  while(w.length<need) w=w.concat(gen());
  const raw=genLog; genLog=null;
  if(cfg.mode==="words") w=w.slice(0,cfg.words);
  return {words:w,quote:null,raw,dir:gen.dir};
}
/* بيطلّع كلمات النص من الأصل بالإعدادات الحالية، عشان التشكيل والترقيم يتغيروا من غير ما النص يتغير */
function wordsFor(b){
  if(b.quote) return clean(b.quote.t,b.quote.tk).split(" ").filter(Boolean);
  if(b.raw){ let w=b.raw.flatMap(r=>clean(r.t,r.tk).split(" ").filter(Boolean)); if(cfg.mode==="words") w=w.slice(0,cfg.words); return w; }
  return b.words.slice();
}
/* تاريخ النصوص: Tab للي بعده، Shift+Tab للي قبله */
let hist=[], hpos=-1;
function go(dir){
  /* dir: ١ اللي بعده، -١ اللي قبله، ٠ نفس النص */
  if(dir<0){ if(hpos>0) hpos--; else return flashNav(L("ده أول نص","This is the first text")); }
  else if(dir>0||hpos<0){
    if(hpos<hist.length-1) hpos++;
    else { hist.push(buildWords()); if(hist.length>50) hist.shift(); hpos=hist.length-1; }
  }
  start(hist[hpos]);
}
function resetHistory(){ hist=[]; hpos=-1; go(1); }
function flashNav(msg){ $("navhint").textContent=msg; clearTimeout(flashNav.t); flashNav.t=setTimeout(updateNav,1200); }
function updateNav(){
  const b=hist[hpos]; let s="";
  if(cfg.mode==="quote"&&b&&b.count) s=EN?`Text ${hpos+1} of ${b.count} in this section`:"نص رقم "+AR_NUM(hpos+1)+" وفي "+AR_NUM(b.count)+" نص في القسم ده";
  $("navhint").textContent=s;
}
function start(b){
  if(T&&T.timer) clearInterval(T.timer);
  slab.classList.remove("paused","wronglang"); $("pausemsg").hidden=true; $("langmsg").hidden=true;
  setTyping(false);
  gen=makeGen();
  T=fresh(wordsFor(b),b.quote);
  T.segs=segsFor(b); T.practice=!!b.practice;
  T.dir=b.dir||qDir(b.quote);
  wordsEl.classList.toggle("ltr",T.dir==="ltr");
  ti.dir=T.dir; ti.lang=T.dir==="ltr"?"en":"ar";
  if(kbLay!==curLay()) buildKb();
  T.key=T.practice?null:runKey(); T.last=T.key?getLastRuns()[T.key]||null:null;
  $("results").hidden=true; $("history").hidden=true; $("stage").hidden=false; document.body.classList.remove("inhist");
  wordsEl.style.transform="";
  wordsEl.innerHTML=T.words.map((_,i)=>`<span class="w">${letters(i)}</span>`).join("");
  ti.value="";
  updateUnder();
  $("live").textContent="";
  showLastRun(); placeGhost();
  updateNav(); updateCounter(); refresh(); showPB();
  focusInput();
}
/* الحروف اللي ليها نفس الحالة بتتجمع في عنصر واحد عشان سفاري ما يقطعش الكلمة */
/* الحرف وحركاته بيتعرضوا مع بعض في نفس العنصر، عشان الحركة ما تنفصلش عن حرفها */
const RANK={"":0,ok:1,extra:2,bad:3};
function letters(i){
  const tg=T.words[i], ty=T.typed[i]||"";
  const n=Math.max(tg.length,ty.length);
  let h="", cur=null, buf="";
  let j=0;
  while(j<n){
    let k=j+1; while(k<n&&isMark(k<tg.length?tg[k]:ty[k])) k++;
    let cls="", txt="";
    for(let q=j;q<k;q++){
      let c,ch;
      if(q<tg.length){c=q<ty.length?(eq(ty[q],tg[q])?"ok":"bad"):"";ch=tg[q];}
      else{c="extra";ch=ty[q];}
      if(RANK[c]>RANK[cls]) cls=c;
      txt+=esc(ch);
    }
    if(cls!==cur){ if(cur!==null) h+=`<span class="${cur}">${buf}</span>`; cur=cls; buf=""; }
    buf+=txt; j=k;
  }
  if(cur!==null) h+=`<span class="${cur}">${buf}</span>`;
  return h;
}
/* مستطيل حرف رقم j جوه الكلمة */
function charRect(w,j){
  const rg=document.createRange(); let off=0;
  for(const sp of w.children){
    const tn=sp.firstChild; if(!tn) continue; const len=tn.length;
    if(j<off+len){
      for(let k=j-off;k>=0;k--){ rg.setStart(tn,k); rg.setEnd(tn,k+1); const r=rg.getBoundingClientRect(); if(r.width>0) return r; }
      return null;
    }
    off+=len;
  }
  return null;
}
function wordCorrect(i){const a=T.typed[i]||"",b=T.words[i];if(a.length!==b.length)return false;for(let j=0;j<a.length;j++)if(!eq(a[j],b[j]))return false;return true;}
function prefixOk(i){const a=T.typed[i]||"",b=T.words[i]||"";if(a.length>b.length)return false;for(let j=0;j<a.length;j++)if(!eq(a[j],b[j]))return false;return true;}
function updateWord(i){
  const el=wordsEl.children[i]; if(!el) return;
  el.innerHTML=letters(i);
  el.classList.toggle("err", i<T.idx && !wordCorrect(i));
}
function appendWords(){
  const startI=T.words.length;
  genLog=[]; let add=[]; while(add.length<40) add=add.concat(gen());
  let at=startI; genLog.forEach(q=>{ T.segs.push({q,from:at}); at+=clean(q.t,q.tk).split(" ").filter(Boolean).length; }); genLog=null;
  T.words=T.words.concat(add);
  const frag=document.createDocumentFragment();
  for(let i=startI;i<T.words.length;i++){const s=document.createElement("span");s.className="w";s.innerHTML=letters(i);frag.appendChild(s);}
  wordsEl.appendChild(frag);
}

/* ============ الإدخال ============ */
function startTest(){ T.started=true; T.t0=performance.now(); T.timer=setInterval(tick,100); setTyping(true); runGhost(); }
function pauseTest(){
  if(!T||!T.started||T.done||T.paused) return;
  T.paused=performance.now(); clearInterval(T.timer); cancelAnimationFrame(ghostRAF);
  setTyping(false); slab.classList.add("paused"); $("pausemsg").hidden=false; $("ghost").hidden=true;
}
function resumeTest(){
  if(!T||!T.paused) return;
  T.t0+=performance.now()-T.paused; T.paused=0;
  slab.classList.remove("paused"); $("pausemsg").hidden=true;
  T.timer=setInterval(tick,100); runGhost(); focusInput();
}
function setTyping(on){ document.body.classList.toggle("typing",!!on); if(on){ closeFontMenu(false); closeSetMenu(false); } }
document.addEventListener("mousemove",e=>{ if(Math.abs(e.movementX)+Math.abs(e.movementY)>3) setTyping(false); });
/* اختبار بالوقت؟ التمرين على الكلمات الغلط بيخلص بآخر كلمة حتى لو الوضع «وقت» */
function timed(){ return cfg.mode==="time"&&!(T&&T.practice); }
function setTyped(nv){
  const old=T.typed[T.idx]; if(nv===old) return;
  if(!T.started&&nv.length) startTest();
  const tg=T.words[T.idx];
  let k=0; while(k<old.length&&k<nv.length&&old[k]===nv[k]) k++;
  for(let j=k;j<nv.length;j++){
    const good=j<tg.length&&eq(nv[j],tg[j]);
    /* الحرف اللي كان المفروض يتكتب واتكتب غلط، عشان «الحروف اللي بتغلط فيها» */
    if(!good&&j<tg.length){ const c=tg[j]; T.ek[c]=(T.ek[c]||0)+1; }
    if(good)T.ok++;else{T.bad++;T.secErr++;T.missed.add(T.idx);flashBad();}
    T.secKeys++;
  }
  T.typed[T.idx]=nv; updateWord(T.idx);
  if(!timed()&&T.idx===T.words.length-1&&wordCorrect(T.idx)) finish();
}
function commitWord(){
  const i=T.idx, good=wordCorrect(i);
  if(good)T.ok++;else{T.bad++;T.secErr++;T.missed.add(i);}
  T.secKeys++;
  if(i===T.words.length-1&&!timed()){finish();return;}
  T.idx++; T.typed[T.idx]="";
  updateWord(i); updateWord(T.idx); updateUnder();
  if(timed()&&T.words.length-T.idx<40) appendWords();
}
/* ============ الكيبورد على اللغة الغلط ============ */
/* لو النص عربي واتكتب حرف إنجليزي (أو العكس)، بننبهك تحوّل اللغة وبنبدأ نفس النص من الأول */
const LAT_RE=/[A-Za-z]/, AR_RE=/[\u0621-\u064A]/;
function wrongScript(v,tg){ const re=T.dir==="ltr"?AR_RE:LAT_RE; return re.test(v)&&!re.test(tg); }
let langT=0;
function hideLangMsg(){ clearTimeout(langT); $("langmsg").hidden=true; slab.classList.remove("wronglang"); }
function wrongLang(){
  const toAr=T.dir!=="ltr", mac=curOS()==="mac";
  const keys=mac?'<kbd>Ctrl</kbd>+<kbd>Space</kbd>':'<kbd>Alt</kbd>+<kbd>Shift</kbd>';
  go(0);
  const M=$("langmsg");
  M.innerHTML=EN
    ?`<b>Your keyboard is in ${toAr?"English":"Arabic"}</b><span>Switch to ${toAr?"Arabic":"English"} with <bdi dir="ltr">${keys}</bdi>${mac?" or the 🌐 key":""}, then start typing.</span><span>We restarted the same text.</span>`
    :`<b>الكيبورد على ${toAr?"الإنجليزي":"العربي"}</b><span>حوّل ${toAr?"للعربي":"للإنجليزي"} بـ <bdi dir="ltr">${keys}</bdi>${mac?" أو زرار 🌐":""}، وابدأ اكتب.</span><span>بدأنا نفس النص من الأول.</span>`;
  M.hidden=false; slab.classList.add("wronglang");
  clearTimeout(langT); langT=setTimeout(hideLangMsg,8000);
}
ti.addEventListener("input",()=>{
  if(T.paused&&!T.done&&!tourOpen()) resumeTest();
  if(T.done||tourOpen()){ti.value=T.done?"":(T.typed[T.idx]||"");return;}
  if(T.started) setTyping(true);
  let v=ti.value.replace(/\n/g," ").replace(/[ﻻﻹﻷﻵ]/g,m=>({"ﻻ":"لا","ﻹ":"لإ","ﻷ":"لأ","ﻵ":"لآ"}[m]));
  v=v.replace(/[\u0670\u0640]/g,"");
  if(cfg.tashkeel) v=canonMarks(v); else if(cfg.lenient) v=v.replace(HARAKAT,"");
  if(wrongScript(v,T.words[T.idx]||"")){ wrongLang(); return; }
  if(!$("langmsg").hidden) hideLangMsg();
  const parts=v.split(" ");
  for(let p=0;p<parts.length;p++){
    setTyped(parts[p]); if(T.done) break;
    if(p<parts.length-1){ if(!T.typed[T.idx].length) continue; commitWord(); if(T.done) break; }
  }
  ti.value=T.done?"":T.typed[T.idx];
  refresh();
});
ti.addEventListener("keydown",e=>{
  /* مسح الكلمة كلها: Ctrl+Backspace على ويندوز، وOption أو Cmd+Backspace على ماك */
  if(e.key==="Backspace"&&(e.ctrlKey||e.altKey||e.metaKey)&&!T.done){
    e.preventDefault();
    if(T.typed[T.idx]){ T.typed[T.idx]=""; updateWord(T.idx); }
    else if(T.idx>0&&!wordCorrect(T.idx-1)){ T.idx--; T.typed[T.idx]=""; updateWord(T.idx+1); updateWord(T.idx); }
    ti.value=""; refresh(); return;
  }
  if(e.key==="Backspace"&&ti.value===""&&T.idx>0&&!T.done&&!wordCorrect(T.idx-1)){
    e.preventDefault(); T.typed[T.idx]=""; updateWord(T.idx); T.idx--; ti.value=T.typed[T.idx];
    updateWord(T.idx); refresh();
  }
});
ti.addEventListener("focus",()=>{slab.classList.remove("blur");fmsg.hidden=true;
  if(matchMedia("(pointer:coarse)").matches) setTimeout(()=>{ try{$("stage").scrollIntoView({block:"start",behavior:"smooth"});}catch(e){} },250);
});
ti.addEventListener("blur",()=>{ if(!T.done){slab.classList.add("blur");fmsg.hidden=false;} });
function focusInput(){ if(!$("tpanel").hidden||tourOpen()) return; try{ti.focus({preventScroll:true});}catch(e){ti.focus();} }

document.addEventListener("keydown",e=>{
  if(tourOpen()){
    if(e.key==="Escape"){ e.preventDefault(); endTour(); }
    else if(e.key===(EN?"ArrowRight":"ArrowLeft")||e.key==="Enter"&&document.activeElement.tagName!=="BUTTON"){ e.preventDefault(); tourNav("next"); }
    else if(e.key===(EN?"ArrowLeft":"ArrowRight")){ e.preventDefault(); tourNav("prev"); }
    else if(e.key.length===1&&e.key!==" "&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); }
    else if(e.key==="Tab"){ e.preventDefault(); const bs=[...$("tour").querySelectorAll("button")]; let i=bs.indexOf(document.activeElement); i=(i+(e.shiftKey?-1:1)+bs.length)%bs.length; bs[i].focus(); }
    return;
  }
  if(!$("fontmenu").hidden){
    if(e.key==="Escape"||e.key==="Tab"){e.preventDefault();closeFontMenu(true);return;}
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){
      e.preventDefault(); const opts=[...$("fontmenu").querySelectorAll(".fopt")]; let i=opts.indexOf(document.activeElement);
      i=e.key==="ArrowDown"?Math.min(opts.length-1,i+1):Math.max(0,i-1); if(opts[i]) opts[i].focus();
    }
    return;
  }
  if(!$("setmenu").hidden&&(e.key==="Escape"||e.key==="Tab")){ e.preventDefault(); closeSetMenu(true); return; }
  const panelOpen=!$("tpanel").hidden;
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.code==="KeyP")){e.preventDefault(); panelOpen?closeThemes():openThemes(); return;}
  if(panelOpen){
    if(e.key==="Escape"){e.preventDefault();closeThemes();}
    return;
  }
  if(!$("history").hidden){
    if(e.key==="Escape"){e.preventDefault();closeHistory();}
    else if(e.key==="Tab"){e.preventDefault();$("history").hidden=true;$("kbwrap").hidden=!cfg.kb;go(e.shiftKey?-1:1);}
    return;
  }
  pressKey(e.code,true);
  /* Tab وانت بتكتب ما بيعملش حاجة، عشان لو اتداس بالغلط النص ما يتغيرش.
     بيشتغل قبل ما تبدأ، ولما توقّف مؤقتًا بـ Esc، وفي شاشة النتيجة */
  if(e.key==="Tab"){ e.preventDefault(); if(T&&T.started&&!T.done&&!T.paused) return; go(e.shiftKey?-1:1); return; }
  /* Esc بيوقّف مؤقتًا وبيكمّل. وShift+Enter بيبدأ النص من الأول: مش مستخدم في ويندوز ولا ماك ولا المتصفحات */
  if(e.key==="Enter"&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){ e.preventDefault(); go(0); return; }
  if(e.key==="Escape"){
    e.preventDefault();
    if(!$("results").hidden) go(0);
    else if(T&&T.paused) resumeTest();
    else if(T&&T.started&&!T.done) pauseTest();
    return;
  }
  /* لو Esc اتداس بالغلط، أول حرف تكتبه بيكمّل الاختبار ويتكتب عادي */
  if(T&&T.paused&&e.key.length===1&&!e.ctrlKey&&!e.metaKey){ resumeTest(); }
  if(!$("results").hidden&&e.key==="Enter"&&document.activeElement.tagName!=="BUTTON"){e.preventDefault();go(1);return;}
  if(document.activeElement!==ti&&$("results").hidden&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&document.activeElement.tagName!=="BUTTON"&&document.activeElement.tagName!=="INPUT") focusInput();
});
document.addEventListener("keyup",e=>pressKey(e.code,false));
window.addEventListener("blur",()=>document.querySelectorAll(".k.press").forEach(k=>k.classList.remove("press")));

/* ============ العرض ============ */
let caretIdle;
function refresh(){
  if(!T||T.done) return;
  const w=wordsEl.children[T.idx]; if(!w) return;
  for(let i=Math.max(0,T.idx-60);i<T.idx;i++) wordsEl.children[i].classList.toggle("err",!wordCorrect(i));
  const lh=w.offsetHeight||72; slab.style.setProperty("--lh",lh+"px");
  const shift=Math.max(0,w.offsetTop-lh);
  wordsEl.style.transform=shift?`translateY(${-shift}px)`:"";
  placeCaret(); placeGhost(); updateCounter(); updateKb();
  caret.classList.remove("idle"); clearTimeout(caretIdle); caretIdle=setTimeout(()=>caret.classList.add("idle"),600);
}
function placeCaret(){
  const w=wordsEl.children[T.idx]; if(!w) return;
  const box=slab.getBoundingClientRect(), ty=T.typed[T.idx]||"";
  const total=Math.max(ty.length,T.words[T.idx].length);
  const rtl=T.dir!=="ltr";
  let r=w.getBoundingClientRect(), x=rtl?r.right+1:r.left-1;
  if(ty.length){ const cr=charRect(w,Math.min(ty.length,total)-1); if(cr) x=rtl?cr.left-1:cr.right+1; }
  caret.style.height=(r.height*0.56)+"px";
  caret.style.transform=`translate(${x-box.left-1}px,${r.top-box.top+r.height*0.24}px)`;
}
function updateCounter(){
  const c=$("counter");
  if(timed()){
    const el=T.started?(performance.now()-T.t0)/1000:0;
    c.textContent=AR_NUM(Math.max(0,Math.ceil(cfg.time-el)));
  } else c.textContent=AR_NUM(T.idx)+" / "+AR_NUM(T.words.length);
}
function correctChars(){
  let n=0; for(let i=0;i<T.idx;i++) if(wordCorrect(i)) n+=T.words[i].length+1;
  if(prefixOk(T.idx)) n+=(T.typed[T.idx]||"").length;
  return n;
}
function tick(){
  if(T.done) return;
  const el=(performance.now()-T.t0)/1000;
  while(el>=T.nextSec){ pushSample(T.nextSec); T.nextSec++; }
  updateCounter();
  if(el>=1) $("live").textContent=AR_NUM(Math.round(correctChars()/5/(el/60)))+L(" كلمة/دقيقة"," wpm");
  if(timed()&&el>=cfg.time) finish();
}
function pushSample(s){ T.samples.push({s,wpm:correctChars()/5/(s/60),raw:T.secKeys*12,err:T.secErr}); T.secKeys=0;T.secErr=0; }

/* ============ النتيجة ============ */
function finish(){
  if(T.done) return; T.done=true; clearInterval(T.timer); setTyping(false);
  let el=timed()?cfg.time:(performance.now()-T.t0)/1000;
  el=Math.max(el,0.5);
  const frac=el-(T.nextSec-1);
  if(frac>0.4||!T.samples.length){T.samples.push({s:+el.toFixed(1),wpm:correctChars()/5/(el/60),raw:T.secKeys*(60/Math.max(frac,0.5))/5,err:T.secErr});}
  const cc=correctChars();
  const wpm=cc/5/(el/60), total=T.ok+T.bad, raw=total/5/(el/60), acc=total?T.ok/total*100:0;
  let c=0,b=0,x=0,m=0;
  for(let i=0;i<=T.idx&&i<T.words.length;i++){
    const tg=T.words[i],ty=T.typed[i]||"";
    for(let j=0;j<Math.max(tg.length,ty.length);j++){
      if(j>=tg.length)x++;else if(j>=ty.length){if(i<T.idx||!timed())m++;}else if(eq(ty[j],tg[j]))c++;else b++;
    }
  }
  const key=pbKey(), pbs=getPBs(), prev=pbs[key];
  const isPB=!T.practice&&wpm>0&&acc>=75&&(!prev||wpm>prev.wpm);
  if(isPB){pbs[key]={wpm:Math.round(wpm),acc:Math.round(acc)};setPBs(pbs);}
  const rr={wpm,raw,acc,c,b,x,m,el,isPB,prev,last:T.last}; if(total>0) addHist(rr);
  if(total>0&&wpm>0&&T.key) saveLastRun(T.key,{w:Math.round(wpm*10)/10,a:Math.round(acc),t:Date.now()});
  $("ghost").hidden=true;
  showResults(rr);
  ti.blur(); updateKb();
}
const SRC_NAME=EN?{masry:"Egyptian proverbs",saudi:"Saudi proverbs",kalam:"Egyptian Arabic",aflam:"Films",hawadit:"Folk tales",hekam:"Wisdom",sheer:"Poetry",tashkeel:"Diacritics",mix:"Mix",fav:"Favorites",words:"Words",en:"English quotes",quran:"Quran",practice:"Practice"}
  :{masry:"أمثال مصرية",saudi:"أمثال سعودية",kalam:"كلام مصري",aflam:"أفلام",hawadit:"حواديت",hekam:"حكم وتراث",sheer:"شعر",tashkeel:"تشكيل",mix:"مكس",fav:"مفضلتي",words:"كلمات",en:"إنجليزي",quran:"قرآن",practice:"تمرين"};
const PRACTICE_LBL=L("تمرين على الكلمات اللي غلطت فيها","Practice on the words you missed");
/* اسم الاختبار، بيتحسب من نوعه عشان يظهر بلغة الصفحة */
function labelFor(mode,n,src,tk){
  if(mode==="practice") return PRACTICE_LBL;
  const QL=EN?{all:"",s:"short",m:"medium",l:"long",xl:"very long"}:{all:"",s:"قصير",m:"متوسط",l:"طويل",xl:"طويل جدا"};
  const m=EN?(mode==="time"?n+" seconds":mode==="words"?n+" words":(QL[n]?QL[n]+" quote":"Quote"))
    :(mode==="time"?AR_NUM(n)+" ثانية":mode==="words"?AR_NUM(n)+" كلمة":"اقتباس "+(QL[n]||""));
  return m.trim()+L("، ",", ")+(SRC_NAME[src]||src)+(tk?L("، بالتشكيل",", with diacritics"):"");
}
function modeLabel(){
  if(T&&T.practice) return PRACTICE_LBL;
  return labelFor(cfg.mode,cfg.mode==="time"?cfg.time:cfg.mode==="words"?cfg.words:cfg.qlen,cfg.src,cfg.tashkeel);
}
function pbKey(){return [cfg.mode,cfg.mode==="time"?cfg.time:cfg.mode==="words"?cfg.words:cfg.qlen,cfg.src].join("-")+(cfg.tashkeel?"-t":"");}
function showPB(){
  const p=getPBs()[pbKey()];
  $("pb").innerHTML=p?(EN?`Your best here: <strong>${p.wpm}</strong> wpm, ${p.acc}% accuracy`:`أحسن رقم ليك هنا: <strong>${AR_NUM(p.wpm)}</strong> كلمة/دقيقة، دقة ${AR_NUM(p.acc)}٪`):"";
}
function showResults(r){
  $("stage").hidden=true;
  const R=$("results"); R.hidden=false; R.className="results";
  const q=T.quote?`<div class="quote-done" dir="${qDir(T.quote)}">${clean(T.quote.t,T.quote.tk)}<small>— ${T.quote.s}</small></div>`:"";
  R.innerHTML=`
    <div class="big">
      <div class="stat"><div class="lbl">${L("كلمة في الدقيقة","words per minute")}</div><div class="val">${AR_NUM(Math.round(r.wpm))}</div></div>
      <div class="stat"><div class="lbl">${L("الدقة","accuracy")}</div><div class="val sm">${AR_NUM(Math.round(r.acc))}${PCT}</div></div>
      ${(()=>{const h=getHist();return h.length>=3?`<div class="avg10">${L("متوسطك في آخر ١٠:","Your last 10 average:")} ${AR_NUM(Math.round(avgLast(h,10,"wpm")))} ${WPM}</div>`:"";})()}
      ${r.last?(()=>{const d=Math.round(r.wpm)-Math.round(r.last.w);return `<div class="vslast">${L("آخر مرة في النص ده:","Last time on this text:")} <b>${AR_NUM(Math.round(r.last.w))}</b> ${WPM}${L("، ",", ")}${d>0?`<span class="up">${L("أسرع بـ","faster by")} ${AR_NUM(d)}</span>`:d<0?`${L("أبطأ بـ","slower by")} ${AR_NUM(-d)}`:L("نفس السرعة","same speed")}</div>`;})():""}
      ${r.isPB?`<div class="newpb">${L("رقم قياسي جديد ليك","New personal best")}${r.prev?` (${L("كان","was")} ${AR_NUM(r.prev.wpm)})`:""}</div>`:""}
    </div>
    <div class="chartbox"><canvas id="chart" aria-label="${L("السرعة على مدار الاختبار","Speed over the test")}" role="img"></canvas></div>
    <div class="small">
      <div><div class="stat"><div class="lbl">${L("السرعة الخام","raw speed")}</div></div><div class="v">${AR_NUM(Math.round(r.raw))}</div></div>
      <div><div class="stat"><div class="lbl">${L("الحروف: صح / غلط / زيادة / ناقصة","characters: correct / wrong / extra / missed")}</div></div><div class="v">${AR_NUM(r.c)} <i>/</i> ${AR_NUM(r.b)} <i>/</i> ${AR_NUM(r.x)} <i>/</i> ${AR_NUM(r.m)}</div></div>
      <div><div class="stat"><div class="lbl">${L("الوقت","time")}</div></div><div class="v">${AR_NUM(Math.round(r.el))} <i>${L("ث","s")}</i></div></div>
      <div><div class="stat"><div class="lbl">${L("الاختبار","test")}</div></div><div class="v" style="font-size:16px">${modeLabel()}</div></div>
    </div>
    ${q}
    ${(()=>{const mw=missedWords();return mw.length?`<div class="missline" dir="${T.dir}">${L("غلطت في:","You missed:")} ${mw.map(w=>`<span>${esc(w)}</span>`).join("")}</div>`:"";})()}
    ${loginNudge()?`<div class="loginline" id="loginline" role="note"><span>${EN?`You have ${getHist().length} ${getHist().length===1?"test":"tests"} saved in this browser only. Sign in to keep your results and progress in your account and follow them on any device.`:`${getHist().length===1?"عندك اختبار واحد محفوظ":`عندك ${AR_NUM(getHist().length)} اختبار محفوظين`} على المتصفح ده بس. سجّل دخول عشان نتايجك وتطورك يتحفظوا في حسابك، وتتابعهم من أي جهاز.`}</span><span class="lbtns"><button type="button" class="pri" id="b-login">${L("سجّل دخول","Sign in")}</button><button type="button" class="later" id="b-later">${L("مش دلوقتي","Not now")}</button></span></div>`
    :(getHist().length%5===0&&getHist().length>0)?`<div class="supline">${L("عجبك طقطقة؟","Enjoying Taqtaqa?")} <button type="button" id="b-sup">${L("ادعمه بمشاركة أو نجمة","Support it with a share or a star")}</button></div>`:""}
    <div class="actions">
      <button type="button" class="primary" id="b-new">${L("النص اللي بعده","Next text")}<kbd>Tab</kbd></button>
      ${missedWords().length?`<button type="button" class="practact" id="b-pract">${L("اتمرن على الكلمات دي","Practice these words")} (${AR_NUM(missedWords().length)})</button>`:""}
      <button type="button" class="shareact" id="b-share">${L("شارك نتيجتك","Share your result")}</button>
      <button type="button" id="b-same">${L("نفس النص تاني","Same text again")}<kbd>Shift+Enter</kbd></button>
      <button type="button" id="b-prev">${L("اللي قبله","Previous")}<kbd>Shift+Tab</kbd></button>
      ${curQuote()?'<button type="button" class="favact" id="b-fav"></button>':""}
    </div>`;
  T.result=r;
  $("b-new").onclick=()=>go(1);
  $("b-share").onclick=()=>shareResult(r);
  if($("b-pract")) $("b-pract").onclick=practiceMissed;
  $("b-same").onclick=()=>go(0);
  $("b-prev").onclick=()=>go(-1);
  if($("b-fav")){ $("b-fav").onclick=()=>toggleFav(curQuote()); paintFav(); }
  if($("b-sup")) $("b-sup").onclick=()=>window.openSupport&&window.openSupport();
  if($("b-login")) $("b-login").onclick=()=>window.TQ_AUTH&&window.TQ_AUTH.open();
  if($("b-later")) $("b-later").onclick=()=>{ try{localStorage.setItem("tq-login-later",String(Date.now()+3*864e5));}catch(e){} $("loginline").remove(); };
  drawChart(); showPB();
}
/* ============ تنبيه تسجيل الدخول ============ */
/* بيظهر في النتيجة لو مش داخل بحساب. «مش دلوقتي» بتخفيه ٣ أيام */
function loginNudge(){
  const A=window.TQ_AUTH; if(!A||!A.ready||A.user) return false;
  let later=0; try{later=+localStorage.getItem("tq-login-later")||0;}catch(e){}
  return Date.now()>later;
}
/* ============ تمرين على الكلمات اللي غلطت فيها ============ */
function missedWords(){
  /* آيات القرآن ما بنقطّعهاش ونلخبط كلماتها في تمرين */
  if(!T||!T.missed||(T.segs||[]).some(sg=>sg.q&&sg.q.quran)) return [];
  const seen=new Set(), out=[];
  [...T.missed].sort((a,b)=>a-b).forEach(i=>{ const w=T.words[i]; if(i<=T.idx&&w&&!seen.has(w)){ seen.add(w); out.push(w); } });
  return out;
}
/* كل كلمة بتتكرر ٣ مرات (٥ لو كلمة أو اتنين بس)، متلخبطين ومن غير ما نفس الكلمة تيجي ورا بعضها */
function practiceMissed(){
  const mw=missedWords(); if(!mw.length) return;
  const reps=mw.length<=2?5:3; let list=[];
  mw.forEach(w=>{ for(let k=0;k<reps;k++) list.push(w); });
  for(let tries=0;tries<30;tries++){ list=shuffle(list); if(list.every((w,i)=>!i||w!==list[i-1])) break; }
  list=list.slice(0,60);
  hist.push({words:list,quote:null,practice:true,dir:T.dir}); if(hist.length>50) hist.shift(); hpos=hist.length-1;
  start(hist[hpos]);
}

/* ============ شارك نتيجتك ============ */
/* صورة ١٠٨٠×١٣٥٠ بألوان الثيم الحالي: السرعة والدقة والنص اللي اتكتب */
async function resultCard(r){
  const W=1080,H=1350,P=96, c=document.createElement("canvas"); c.width=W; c.height=H;
  const x=c.getContext("2d"), bg=tok("--bg"), fg=tok("--fg"), sub=tok("--sub"), acc=tok("--accent"), panel=tok("--panel");
  const disp='"TQ Display", serif', sans='"TQ Sans", sans-serif';
  try{ await Promise.all([document.fonts.load('700 72px "TQ Display"'),document.fonts.load('500 72px "TQ Sans"'),document.fonts.load('400 40px "TQ Sans"')]); }catch(e){}
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  x.textBaseline="alphabetic";
  /* الكارت بيتكتب من ناحية لغة الصفحة: يمين للعربي وشمال للإنجليزي */
  const side=d=>{ x.direction=d; x.textAlign=d==="rtl"?"right":"left"; };
  const R=EN?P:W-P, mv=(a,v)=>EN?a+v:a-v;
  side(EN?"ltr":"rtl");
  /* اللوجو */
  x.font=`700 76px ${disp}`; x.fillStyle=fg;
  const lw=x.measureText(LOGO_WORD).width;
  x.fillText(LOGO_WORD,R,P+70); x.fillStyle=acc; x.fillText(".",mv(R,lw),P+70);
  /* السرعة */
  x.font=`500 300px ${sans}`; x.fillStyle=acc; x.fillText(AR_NUM(Math.round(r.wpm)),R,P+400);
  x.font=`400 46px ${sans}`; x.fillStyle=sub; x.fillText(L("كلمة في الدقيقة","words per minute"),R,P+475);
  /* الدقة والوقت والاختبار */
  x.font=`500 40px ${sans}`; x.fillStyle=fg;
  const secs=Math.round(r.el), facts=EN?[`${Math.round(r.acc)}% accuracy`,`${secs} second${secs===1?"":"s"}`]:[`الدقة ${AR_NUM(Math.round(r.acc))}٪`,`${AR_NUM(secs)} ثانية`];
  if(r.isPB) facts.push(L("رقم قياسي جديد","new personal best"));
  x.fillText(facts.join(EN?"   ·   ":"  ،   "),R,P+560);
  /* النص */
  const q=T.quote||curQuote();
  let y=P+680;
  if(q){
    /* النص نفسه بيتكتب في اتجاهه، والخط اللي جنبه في أوله */
    const qd=qDir(q), QR=qd==="ltr"?P:W-P, qm=(a,v)=>qd==="ltr"?a+v:a-v; side(qd);
    const words=clean(q.t,q.tk).split(" "), maxW=W-P*2-40, lines=[]; let line="";
    x.font=`400 44px ${sans}`;
    for(const w of words){ const t=line?line+" "+w:w; if(x.measureText(t).width>maxW&&line){ lines.push(line); line=w; } else line=t; }
    if(line) lines.push(line);
    const shown=lines.slice(0,6); if(lines.length>6) shown[5]=shown[5].replace(/\s*\S+$/,"")+"…";
    x.fillStyle=acc; x.fillRect(qd==="ltr"?QR:QR-6,y-44,6,shown.length*70+66);
    x.fillStyle=fg; shown.forEach((l,i)=>x.fillText(l,qm(QR,36),y+i*70));
    x.font=`400 32px ${sans}`; x.fillStyle=sub; x.fillText("— "+q.s,qm(QR,36),y+shown.length*70+12);
  }
  /* الدعوة */
  x.fillStyle=panel; const by=H-P-110; x.beginPath(); x.roundRect?x.roundRect(P,by,W-P*2,110,24):x.rect(P,by,W-P*2,110); x.fill();
  x.font=`500 42px ${sans}`; x.fillStyle=fg; x.textAlign="center"; x.direction=EN?"ltr":"rtl"; x.fillText(L("جرّب تسبقني على taqtaqa.com","Try to beat me on taqtaqa.com"),W/2,by+70);
  return new Promise(res=>c.toBlob(res,"image/png"));
}
async function shareResult(r){
  const b=$("b-share"); b.disabled=true;
  try{
    const blob=await resultCard(r), file=new File([blob],"taqtaqa.png",{type:"image/png"});
    const text=EN?`I typed ${Math.round(r.wpm)} words per minute in Arabic on Taqtaqa. Try to beat me`:`كتبت ${AR_NUM(Math.round(r.wpm))} كلمة في الدقيقة على طقطقة. جرّب تسبقني`;
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file],text:text+": https://taqtaqa.com"+(EN?"/en/":"")}); }catch(e){ if(e&&e.name!=="AbortError") throw e; }
    }else{
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="taqtaqa.png"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      toast(L("اتنزلت صورة نتيجتك. شاركها مع أصحابك.","Your result image was downloaded. Share it with your friends."));
    }
  }catch(e){ toast(L("ما قدرناش نعمل الصورة. جرّب تاني.","We couldn't make the image. Try again.")); }
  b.disabled=false;
}
function drawChart(){
  const cv=$("chart"); if(!cv||!T) return;
  const S=T.samples; const dpr=window.devicePixelRatio||1;
  const W=cv.clientWidth,H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr;
  const ctx=cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const pl=34,pr=10,pt=10,pb=24, iw=W-pl-pr, ih=H-pt-pb;
  const mx=Math.max(10,...S.map(s=>Math.max(s.wpm,s.raw)));
  const top=Math.ceil(mx*1.1/10)*10;
  const n=S.length; const X=i=>pl+(n<=1?iw/2:i/(n-1)*iw); const Y=v=>pt+ih-(v/top)*ih;
  ctx.font="11px "+tok("--f-ui"); ctx.fillStyle=tok("--sub"); ctx.strokeStyle=tok("--line"); ctx.lineWidth=1;
  ctx.textAlign="right"; ctx.textBaseline="middle";
  for(let g=0;g<=4;g++){const v=top*g/4,y=Y(v);ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(W-pr,y);ctx.stroke();ctx.fillText(Math.round(v),pl-6,y);}
  ctx.textAlign="center"; ctx.textBaseline="top";
  const step=Math.max(1,Math.ceil(n/8));
  S.forEach((s,i)=>{if(i%step===0||i===n-1)ctx.fillText(Math.round(s.s),X(i),H-pb+6);});
  ctx.strokeStyle=tok("--sub"); ctx.lineWidth=1.5; ctx.beginPath(); S.forEach((s,i)=>i?ctx.lineTo(X(i),Y(s.raw)):ctx.moveTo(X(i),Y(s.raw))); ctx.stroke();
  const acc=tok("--accent");
  ctx.globalAlpha=.13; ctx.fillStyle=acc; ctx.beginPath(); ctx.moveTo(X(0),Y(0)); S.forEach((s,i)=>ctx.lineTo(X(i),Y(s.wpm))); ctx.lineTo(X(n-1),Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
  ctx.strokeStyle=acc; ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.beginPath(); S.forEach((s,i)=>i?ctx.lineTo(X(i),Y(s.wpm)):ctx.moveTo(X(i),Y(s.wpm))); ctx.stroke();
  if(n){ctx.fillStyle=acc;ctx.beginPath();ctx.arc(X(n-1),Y(S[n-1].wpm),3.5,0,7);ctx.fill();}
  ctx.fillStyle=tok("--err");
  S.forEach((s,i)=>{if(s.err){ctx.beginPath();ctx.arc(X(i),pt+6,Math.min(2+s.err,6),0,7);ctx.fill();}});
}

/* ============ الكيبورد ============ */
/* حروف اللاتيني اللي بتظهر صغيرة فوق كل زرار */
const LAT={KeyQ:"Q",KeyW:"W",KeyE:"E",KeyR:"R",KeyT:"T",KeyY:"Y",KeyU:"U",KeyI:"I",KeyO:"O",KeyP:"P",BracketLeft:"[",BracketRight:"]",
  KeyA:"A",KeyS:"S",KeyD:"D",KeyF:"F",KeyG:"G",KeyH:"H",KeyJ:"J",KeyK:"K",KeyL:"L",Semicolon:";",Quote:"'",
  KeyZ:"Z",KeyX:"X",KeyC:"C",KeyV:"V",KeyB:"B",KeyN:"N",KeyM:"M",Comma:",",Period:".",Slash:"/",Backquote:"`"};
const CODES=[
  ["Backquote","Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"],
  ["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP","BracketLeft","BracketRight","Backslash"],
  ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL","Semicolon","Quote"],
  ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash"]
];
/* الترتيبين زي ما هما في Monkeytype: arabic_101.json و arabic_mac.json */
const LAYOUTS={
  pc:[
    [["ذ","ّ"],["1","!"],["2","@"],["3","#"],["4","$"],["5","%"],["6","^"],["7","&"],["8","*"],["9",")"],["0","("],["-","_"],["=","+"]],
    [["ض","َ"],["ص","ً"],["ث","ُ"],["ق","ٌ"],["ف","لإ"],["غ","إ"],["ع","‘"],["ه","÷"],["خ","×"],["ح","؛"],["ج","<"],["د",">"],["\\","|"]],
    [["ش","ِ"],["س","ٍ"],["ي","]"],["ب","["],["ل","لأ"],["ا","أ"],["ت","ـ"],["ن","،"],["م","/"],["ك",":"],["ط","\""]],
    [["ئ","~"],["ء","ْ"],["ؤ","}"],["ر","{"],["لا","لآ"],["ى","آ"],["ة","’"],["و",","],["ز","."],["ظ","؟"]]
  ],
  mac:[
    [["§","±"],["1","!"],["2","@"],["3","#"],["4","$"],["5","%"],["6","^"],["7","&"],["8","*"],["9","("],["0",")"],["-","_"],["=","+"]],
    [["ض","َ"],["ص","ً"],["ث","ِ"],["ق","ٍ"],["ف","ُ"],["غ","ٌ"],["ع","ْ"],["ه","ّ"],["خ","]"],["ح","["],["ج","}"],["ة","{"],["\\","|"]],
    [["ش","«"],["س","»"],["ي","ى"],["ب",""],["ل",""],["ا","آ"],["ت",""],["ن","٫"],["م","٬"],["ك",":"],["؛","\""]],
    [["ظ","'"],["ط",""],["ذ","ئ"],["د","ء"],["ز","أ"],["ر","إ"],["و","ؤ"],["،",">"],[".","<"],["/","؟"]]
  ],
  /* الكيبورد الإنجليزي (US)، للاقتباسات الإنجليزي */
  us:[
    [["`","~"],["1","!"],["2","@"],["3","#"],["4","$"],["5","%"],["6","^"],["7","&"],["8","*"],["9","("],["0",")"],["-","_"],["=","+"]],
    [["q","Q"],["w","W"],["e","E"],["r","R"],["t","T"],["y","Y"],["u","U"],["i","I"],["o","O"],["p","P"],["[","{"],["]","}"],["\\","|"]],
    [["a","A"],["s","S"],["d","D"],["f","F"],["g","G"],["h","H"],["j","J"],["k","K"],["l","L"],[";",":"],["'","\""]],
    [["z","Z"],["x","X"],["c","C"],["v","V"],["b","B"],["n","N"],["m","M"],[",","<"],[".",">"],["/","?"]]
  ]
};
let KMAP={}, kbLay=null;
/* لو النص إنجليزي بنعرض الكيبورد الإنجليزي، وغير كده الترتيب اللي اخترته */
function curLay(){ return T&&T.dir==="ltr"?"us":(LAYOUTS[cfg.layout]?cfg.layout:"pc"); }
function buildKb(){
  const lay=curLay(), LY=LAYOUTS[lay]; KMAP={}; kbLay=lay;
  const key=(code,b,s)=>{
    const lat=lay!=="us"&&LAT[code]&&code!=="Backquote"?`<span class="lat">${LAT[code]}</span>`:"";
    if(b&&!(b in KMAP)) KMAP[b]={code,shift:false};
    if(s&&!(s in KMAP)) KMAP[s]={code,shift:true};
    /* الحروف الإنجليزي بتظهر كابيتال زي الكيبورد الحقيقي */
    if(lay==="us"&&/^[a-z]$/.test(b)) return `<div class="k" data-code="${code}">${b.toUpperCase()}</div>`;
    return `<div class="k" data-code="${code}">${lat}${s?`<span class="sh">${esc(s)}</span>`:""}${esc(b)}</div>`;
  };
  const fn=(code,label)=>`<div class="k" data-code="${code}"><span class="fn">${label}</span></div>`;
  let h="";
  h+=`<div class="row r0">${CODES[0].map((c,i)=>key(c,LY[0][i][0],LY[0][i][1])).join("")}${fn("Backspace","⌫")}</div>`;
  h+=`<div class="row r1">${fn("Tab","Tab")}${CODES[1].map((c,i)=>key(c,LY[1][i][0],LY[1][i][1])).join("")}</div>`;
  h+=`<div class="row r2">${fn("CapsLock","Caps")}${CODES[2].map((c,i)=>key(c,LY[2][i][0],LY[2][i][1])).join("")}${fn("Enter","Enter")}</div>`;
  h+=`<div class="row r3">${fn("ShiftLeft","Shift")}${CODES[3].map((c,i)=>key(c,LY[3][i][0],LY[3][i][1])).join("")}${fn("ShiftRight","Shift")}</div>`;
  h+=`<div class="row r4">${fn("AltLeft",cfg.layout==="mac"?"⌥":"Alt")}${fn("Space",L("مسافة","Space"))}${fn("AltRight",cfg.layout==="mac"?"⌥":"Alt")}</div>`;
  $("kb").innerHTML=h;
  $("g-layout").hidden=lay==="us";
  $("kblabel").textContent=lay==="us"?L("الكيبورد الإنجليزي (US)","English keyboard (US)"):L("ترتيب الكيبورد","Keyboard layout");
  KMAP[" "]={code:"Space",shift:false};
}
function kEl(code){return document.querySelector(`.k[data-code="${code}"]`);}
function pressKey(code,down){const k=kEl(code);if(k)k.classList.toggle("press",down);}
let badT;
function flashBad(){ if(!cfg.kb) return; const k=kEl("Backspace"); if(!k) return; k.classList.add("flashbad"); clearTimeout(badT); badT=setTimeout(()=>k.classList.remove("flashbad"),180); }
function updateKb(){
  document.querySelectorAll(".k.next").forEach(k=>k.classList.remove("next"));
  if(!cfg.kb||!T||T.done) return;
  const tg=T.words[T.idx]||"", ty=T.typed[T.idx]||"";
  let mark=[];
  if(!prefixOk(T.idx)) mark=["Backspace"];
  else if(ty.length>=tg.length) mark=["Space"];
  else{
    const ch=tg[ty.length];
    const m=KMAP[ch]||KMAP[N(ch)];
    if(m){ mark=[m.code]; if(m.shift) mark.push("ShiftLeft","ShiftRight"); }
  }
  mark.forEach(c=>{const k=kEl(c);if(k)k.classList.add("next");});
}

/* ============ الثيمات (من Monkeytype) ============ */
const THEMES=MT.THEMES; /* [name, isDark, [bg,main,caret,sub,subAlt,text,error,errorExtra]] */
const VARS=["--bg","--panel","--fg","--sub","--dim","--accent","--caret","--accent-soft","--err","--err-dim","--line","--key","--key-fg","--key-edge","--scrim"];
function prettyName(n){return (!EN&&AR_THEME[n])||n.replace(/_/g," ");}
/* راحة العين: لو لون النص اللي لسه ما اتكتبش باهت أوي على الخلفية، بنقرّبه من لون النص لحد ما يبقى مقروء */
function hexRgb(h){h=String(h).trim().replace("#","");if(h.length<6)h=h.split("").map(c=>c+c).join("");return [0,2,4].map(k=>parseInt(h.slice(k,k+2),16));}
function relLum(rgb){const [r,g,b]=rgb.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;}
function contrast(a,b){const x=relLum(a),y=relLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function readable(col,bg,toward,min){
  const c=hexRgb(col),B=hexRgb(bg),t=hexRgb(toward);
  for(let k=0;k<=1.0001;k+=0.05){ const m=c.map((v,i)=>Math.round(v+(t[i]-v)*k)); if(contrast(m,B)>=min) return "#"+m.map(v=>v.toString(16).padStart(2,"0")).join(""); }
  return toward;
}
function applyTheme(name){
  const root=document.documentElement.style;
  const t=THEMES.find(x=>x[0]===name);
  if(!t){ VARS.forEach(v=>root.removeProperty(v)); root.removeProperty("color-scheme"); try{localStorage.setItem("tq-tv","false");}catch(e){} }
  else{
    const [bg,main,car,sub,subAlt,text,err,errX]=t[2];
    const set={"--bg":bg,"--panel":subAlt,"--fg":text,"--sub":readable(sub,bg,text,3),"--dim":readable(sub,bg,text,3.5),"--accent":main,"--caret":car,"--accent-soft":main+"24",
      "--err":err,"--err-dim":errX,"--line":subAlt,"--key":subAlt,"--key-fg":text,"--key-edge":t[1]?"rgba(0,0,0,.45)":sub+"80","--scrim":"rgba(0,0,0,.5)"};
    for(const k in set) root.setProperty(k,set[k]);
    root.setProperty("color-scheme",t[1]?"dark":"light");
    try{localStorage.setItem("tq-tv",JSON.stringify({v:set,cs:t[1]?"dark":"light"}));}catch(e){}
  }
  const nm=t?prettyName(name):L("طقطقة","Taqtaqa");
  $("tname").textContent=nm; $("themebtn").title=L("الثيم: ","Theme: ")+nm; $("themebtn").setAttribute("aria-label",L("الثيمات، الحالي ","Themes, current: ")+nm);
  $("tdots").innerHTML=(t?[t[2][1],t[2][3],t[2][5]]:["var(--accent)","var(--sub)","var(--fg)"]).map(c=>`<i style="background:${c}"></i>`).join("");
  if(T&&T.done) drawChart(); else if(T) refresh();
}
function renderThemes(){
  const raw=$("tsearch").value.trim().toLowerCase(), q=raw.replace(/\s+/g,"_");
  const list=THEMES.filter(t=>(cfg.tfilter==="all"||(cfg.tfilter==="dark")===t[1])&&(!q||t[0].includes(q)||prettyName(t[0]).includes(raw))).sort((a,b)=>prettyName(a[0]).localeCompare(prettyName(b[0]),EN?"en":"ar"));
  const def=(!q&&cfg.tfilter!=="light")?`<button type="button" class="tcard${cfg.theme==="taqtaqa"?" cur":""}" data-name="taqtaqa" title="taqtaqa" style="background:#121b1b;color:#e8e2d3"><span>${L("طقطقة","Taqtaqa")}</span><span class="dots"><i style="background:#e2aa3f"></i><i style="background:#5d6c69"></i><i style="background:#e8e2d3"></i></span></button>`:"";
  $("tgrid").innerHTML=def+list.map(t=>{const c=t[2];return `<button type="button" class="tcard${cfg.theme===t[0]?" cur":""}" data-name="${t[0]}" title="${t[0].replace(/_/g," ")}" style="background:${c[0]};color:${c[5]}"><span>${prettyName(t[0])}</span><span class="dots"><i style="background:${c[1]}"></i><i style="background:${c[3]}"></i><i style="background:${c[5]}"></i></span></button>`;}).join("");
  $("tcount").textContent=EN?`${list.length} themes. Hover to preview before you pick.`:AR_NUM(list.length)+" ثيم، عدّي بالماوس عشان تشوفه قبل ما تختار";
  document.querySelectorAll("#g-tf button").forEach(b=>b.classList.toggle("on",b.dataset.v===cfg.tfilter));
}
function openThemes(){ $("tpanel").hidden=false; $("tsearch").value=""; renderThemes(); setTimeout(()=>$("tsearch").focus(),0); }
function closeThemes(){ $("tpanel").hidden=true; applyTheme(cfg.theme); focusInput(); }
$("themebtn").onclick=openThemes;
$("tclose").onclick=()=>closeThemes();
$("tpanel").addEventListener("mousedown",e=>{ if(e.target.id==="tpanel") closeThemes(); });
$("tsearch").addEventListener("input",renderThemes);
$("tsearch").addEventListener("keydown",e=>{ if(e.key==="Enter"){const f=$("tgrid").querySelector(".tcard"); if(f){cfg.theme=f.dataset.name;saveCfg();closeThemes();}} });
$("g-tf").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;cfg.tfilter=b.dataset.v;saveCfg();renderThemes();});
$("tgrid").addEventListener("click",e=>{const b=e.target.closest(".tcard");if(!b)return;cfg.theme=b.dataset.name;saveCfg();closeThemes();});
$("tgrid").addEventListener("mouseover",e=>{const b=e.target.closest(".tcard");if(b)applyTheme(b.dataset.name);});
$("tgrid").addEventListener("focusin",e=>{const b=e.target.closest(".tcard");if(b)applyTheme(b.dataset.name);});
$("tgrid").addEventListener("mouseleave",()=>applyTheme(cfg.theme));

/* ============ آخر مرة كتبت النص ده ============ */
const LKEY="tq-last", LMAX=3000;
function getLastRuns(){try{const o=JSON.parse(localStorage.getItem(LKEY)||"{}");return o&&typeof o==="object"&&!Array.isArray(o)?o:{};}catch(e){return {};}}
function setLastRuns(o){
  const ks=Object.keys(o); if(ks.length>LMAX){ ks.sort((a,b)=>(o[a].t||0)-(o[b].t||0)).slice(0,ks.length-LMAX).forEach(k=>delete o[k]); }
  try{localStorage.setItem(LKEY,JSON.stringify(o));}catch(e){}
}
function saveLastRun(k,rec){
  if(!k) return; const o=getLastRuns(); o[k]=rec; setLastRuns(o);
  try{window.dispatchEvent(new CustomEvent("tq:last",{detail:{k,rec}}));}catch(e){}
}
function hashStr(s){let h=5381,g=0;for(let i=0;i<s.length;i++){h=(h*33+s.charCodeAt(i))>>>0;g=(g*31+s.charCodeAt(i))>>>0;}return h.toString(36)+g.toString(36);}
/* النص نفسه زي ما ظاهر (بالتشكيل والترقيم)، ومعاه الوضع */
function runKey(){
  if(!T||!T.words.length) return null;
  const pre=cfg.mode==="quote"?"q":cfg.mode==="time"?"t"+cfg.time:"w";
  return pre+"-"+hashStr(T.words.slice(0,120).join(" "));
}
function showLastRun(){
  const L=$("lastrun"), l=T&&T.last;
  if(!l){ L.hidden=true; return; }
  L.hidden=false;
  L.innerHTML=EN?`Last time: <b>${Math.round(l.w)}</b> wpm, ${l.a}%`:`آخر مرة: <b>${AR_NUM(Math.round(l.w))}</b> ك/د، ${AR_NUM(l.a)}٪`;
  L.title=cfg.pace?(EN?"The grey caret moves at your speed from last time. Try to beat it.":"المؤشر الرمادي ماشي بسرعتك آخر مرة. حاول تسبقه."):(EN?"Turn on the last-time caret in Settings":"تقدر تشغّل «مؤشر آخر مرة» من الإعدادات");
}
let ghostRAF=0;
function ghostOn(){ return !!(cfg.pace&&T&&T.last&&T.last.w>0&&!T.done&&!T.paused); }
/* مكان المؤشر بعد عدد حروف معيّن، والمسافة بتتحسب حرف زي ما بنحسب السرعة */
function placeGhost(){
  const g=$("ghost");
  if(!ghostOn()||!T.started){ g.hidden=true; return; }
  const el=(performance.now()-T.t0)/1000;
  let c=el*T.last.w*5/60, wi=0;
  const box=slab.getBoundingClientRect();
  /* مكان المؤشر بعد n حرف جوه كلمة رقم i */
  const at=(i,n)=>{
    const w=wordsEl.children[i]; if(!w) return null;
    const rtl=T.dir!=="ltr", r=w.getBoundingClientRect(); let x=rtl?r.right+1:r.left-1;
    if(n>0){ const cr=charRect(w,Math.min(n,T.words[i].length)-1); if(cr) x=rtl?cr.left-1:cr.right+1; }
    return {x,top:r.top,h:r.height,bottom:r.bottom};
  };
  let p=null;
  while(wi<T.words.length){
    const L=T.words[wi].length;
    if(c<=L){
      const n0=Math.floor(c), f=c-n0, a=at(wi,n0), b=n0<L?at(wi,n0+1):a;
      if(a) p={x:a.x+((b?b.x:a.x)-a.x)*f,top:a.top,h:a.h,bottom:a.bottom};
      break;
    }
    if(c<L+1){ /* المسافة اللي بعد الكلمة */
      const a=at(wi,L), b=at(wi+1,0), f=c-L;
      if(a) p=(b&&Math.abs(b.top-a.top)<2)?{x:a.x+(b.x-a.x)*f,top:a.top,h:a.h,bottom:a.bottom}:a;
      break;
    }
    c-=L+1; wi++;
  }
  if(!p){ const i=T.words.length-1; p=at(i,T.words[i].length); }
  if(!p||p.top<box.top-2||p.bottom>box.bottom+2){ g.hidden=true; return; }
  g.hidden=false;
  g.style.height=(p.h*0.56)+"px";
  g.style.transform=`translate(${p.x-box.left-1}px,${p.top-box.top+p.h*0.24}px)`;
}
function runGhost(){
  cancelAnimationFrame(ghostRAF);
  if(!ghostOn()||!T.started) return;
  const loop=()=>{ if(!ghostOn()||!T.started){ $("ghost").hidden=true; return; } placeGhost(); ghostRAF=requestAnimationFrame(loop); };
  ghostRAF=requestAnimationFrame(loop);
}

/* ============ المفضلة ============ */
const FKEY="tq-fav", FMAX=500;
function getFavs(){try{const a=JSON.parse(localStorage.getItem(FKEY)||"[]");return Array.isArray(a)?a.filter(f=>f&&typeof f.t==="string"):[];}catch(e){return [];}}
function setFavs(a,silent){
  try{localStorage.setItem(FKEY,JSON.stringify(a.slice(-FMAX)));}catch(e){}
  for(const k in bags) if(/-fav(-|$)/.test(k)) delete bags[k];
  if(!silent){ try{window.dispatchEvent(new CustomEvent("tq:fav",{detail:getFavs()}));}catch(e){} }
  paintFav(); syncConfig();
}
const favKey=t=>String(t).replace(TASHKEEL,"").replace(/\s+/g," ").trim();
function isFav(q){if(!q)return false;const k=favKey(q.t);return getFavs().some(f=>favKey(f.t)===k);}
function toggleFav(q){
  if(!q||!q.s) return;
  let a=getFavs();
  const k=favKey(q.t);
  if(a.some(f=>favKey(f.t)===k)){ a=a.filter(f=>favKey(f.t)!==k); toast(L("اتشال من مفضلتك","Removed from your favorites")); }
  else { const o={t:q.t,s:q.s,at:Date.now()}; if(q.tk) o.tk=true; if(q.en) o.en=true; a.push(o); toast(L("اتحفظ في مفضلتك. هتلاقيه في «مفضلتي».","Saved. You'll find it in Favorites.")); }
  setFavs(a);
  if(T&&!T.done) focusInput();
}
function segsFor(b){
  if(b.quote) return [{q:b.quote,from:0}];
  const out=[]; let at=0;
  (b.raw||[]).forEach(r=>{ if(r&&r.s){ out.push({q:r,from:at}); } at+=clean(r.t,r.tk).split(" ").filter(Boolean).length; });
  return out;
}
function curQuote(){
  if(!T||!T.segs) return null;
  let q=null; for(const sg of T.segs){ if(sg.from<=T.idx) q=sg.q; else break; }
  return q;
}
function updateUnder(){
  const q=curQuote();
  $("src").textContent=T&&T.practice?"— "+PRACTICE_LBL:q?("— "+q.s):"";
  paintFav();
}
function paintFav(){
  const q=curQuote(), on=isFav(q);
  const fb=$("favbtn");
  if(fb){ fb.hidden=!q; fb.classList.toggle("on",on); fb.textContent=on?L("★ محفوظ","★ Saved"):L("☆ احفظ","☆ Save"); fb.title=on?L("شيله من مفضلتي","Remove from favorites"):L("احفظ النص ده في مفضلتي","Save this text to favorites"); fb.setAttribute("aria-pressed",on); }
  const rb=$("b-fav");
  if(rb){ rb.classList.toggle("on",on); rb.textContent=on?L("★ في مفضلتك","★ In your favorites"):L("☆ احفظ في مفضلتي","☆ Save to favorites"); }
}
$("favbtn").addEventListener("mousedown",e=>e.preventDefault());
$("favbtn").addEventListener("click",()=>toggleFav(curQuote()));

/* ============ زرار «مفضلتي» في الهيدر ============ */
function paintFavHead(){ const b=$("favhbtn"); if(b) b.setAttribute("aria-pressed",cfg.src==="fav"); }
$("favhbtn").addEventListener("click",()=>{
  const b=$("favhbtn"); b.blur();
  if(cfg.src==="fav"){ cfg.src=cfg.prevSrc&&cfg.prevSrc!=="fav"?cfg.prevSrc:"mix"; }
  else{
    if(!getFavs().length){ toast(L("لسه مفيش نصوص في مفضلتك. دوس «احفظ» تحت أي نص عشان يتحفظ هنا.","No favorites yet. Click Save under any text to keep it here.")); return; }
    cfg.prevSrc=cfg.src; cfg.src="fav";
  }
  saveCfg(); syncConfig(); resetHistory();
});
/* ============ التاريخ ============ */
const HKEY="tq-history", HMAX=2000;
function getHist(){try{const a=JSON.parse(localStorage.getItem(HKEY)||"[]");return Array.isArray(a)?a:[];}catch(e){return [];}}
function setHist(a){try{localStorage.setItem(HKEY,JSON.stringify(a.slice(-HMAX)));return true;}catch(e){return false;}}
function addHist(r){
  const a=getHist();
  a.push({v:1,t:Date.now(),wpm:+r.wpm.toFixed(1),raw:+r.raw.toFixed(1),acc:+r.acc.toFixed(1),el:+r.el.toFixed(1),
    c:r.c,b:r.b,x:r.x,m:r.m,mode:T.practice?"practice":cfg.mode,n:T.practice?T.words.length:cfg.mode==="time"?cfg.time:cfg.mode==="words"?cfg.words:cfg.qlen,src:T.practice?"practice":cfg.src,
    q:T.quote?T.quote.s:null,label:modeLabel(),lang:T.dir==="ltr"?"en":"ar",...(Object.keys(T.ek).length?{ek:T.ek}:{})});
  const before=todayMins(a.slice(0,-1));
  setHist(a);
  /* الهدف اليومي: لو الاختبار ده كمّله، بنقولك */
  if(cfg.goal>0&&before<cfg.goal&&todayMins(a)>=cfg.goal) setTimeout(()=>toast(EN?`You hit today's goal: ${cfg.goal} minutes of typing.`:`خلّصت هدف النهارده: ${AR_NUM(cfg.goal)} دقايق كتابة.`),400);
  paintGoal();
  try{window.dispatchEvent(new CustomEvent("tq:result",{detail:a[a.length-1]}));}catch(e){}
}
/* التاريخ مقسوم: كتابة العربي لوحدها والإنجليزي لوحده. والاختبارات القديمة بنعرف لغتها من القسم */
const histLang=h=>h.lang||(h.src==="en"?"en":"ar");
let hFilter="all", hLang=null, hSrc="all", hShown=30, hArmed=false;
function openHistory(){
  if(T&&T.timer&&!T.done){clearInterval(T.timer);}
  setTyping(false);
  $("stage").hidden=true; $("results").hidden=true; $("history").hidden=false; $("kbwrap").hidden=true;
  document.body.classList.add("inhist");
  hLang=T&&T.dir==="ltr"?"en":"ar"; hSrc="all";
  hShown=30; hArmed=false; renderHistory(); ti.blur(); window.scrollTo(0,0);
}
function closeHistory(){ $("history").hidden=true; $("kbwrap").hidden=!cfg.kb; go(0); }
function fmtDate(t){
  try{return new Date(t).toLocaleString(EN?"en-US":"ar-EG",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});}catch(e){return new Date(t).toISOString().slice(0,16);}
}
/* اللي بيظهر في التاريخ دلوقتي: اللغة، وبعدين نوع الاختبار، وبعدين القسم */
function histView(){
  const all=getHist();
  const langs={ar:all.filter(h=>histLang(h)==="ar"),en:all.filter(h=>histLang(h)==="en")};
  if(!hLang||!langs[hLang].length) hLang=langs.ar.length?"ar":"en";
  const byMode=langs[hLang].filter(h=>hFilter==="all"||h.mode===hFilter);
  if(hSrc!=="all"&&!byMode.some(h=>h.src===hSrc)) hSrc="all";
  return {all,langs,byMode,a:hSrc==="all"?byMode:byMode.filter(h=>h.src===hSrc)};
}
/* كام يوم ورا بعض اتمرنت فيهم، لحد النهارده أو امبارح */
function streakDays(all){
  const day=t=>{const d=new Date(t);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5;};
  const days=new Set(all.map(h=>day(h.t))), today=day(Date.now());
  let d=days.has(today)?today:today-1, n=0;
  while(days.has(d)){ n++; d--; }
  return {n,total:days.size};
}
const dayWord=n=>EN?(n===1?"day":"days"):(n>=3&&n<=10?"أيام":"يوم");
function renderHistory(){
  const B=$("hbody"), V=histView(), all=V.all, a=V.a;
  if(!all.length){ B.innerHTML=`<div class="hempty">${L("لسه مفيش اختبارات. خلّص أول اختبار وهيظهر هنا.","No tests yet. Finish your first test and it will show up here.")}</div>`; return; }
  const best=a.reduce((m,h)=>h.wpm>m.wpm?h:m,{wpm:0});
  const mins=a.reduce((s,h)=>s+h.el,0)/60;
  const pbKeys={}; a.forEach((h,i)=>{const k=h.mode+"|"+h.n+"|"+h.src; if(!pbKeys[k]||h.wpm>a[pbKeys[k]].wpm) pbKeys[k]=i;});
  const pbIdx=new Set(Object.values(pbKeys));
  const rows=a.map((h,i)=>({h,i})).reverse().slice(0,hShown);
  /* الأقسام: عدد الاختبارات ومتوسط السرعة وأحسن رقم في كل قسم */
  const secs={}; V.byMode.forEach(h=>{ const k=h.src||"mix"; const o=secs[k]||(secs[k]={k,n:0,sum:0,best:0}); o.n++; o.sum+=h.wpm; o.best=Math.max(o.best,h.wpm); });
  const secList=Object.values(secs).sort((x,y)=>y.n-x.n||y.best-x.best), maxN=secList.length?secList[0].n:1;
  const top=secList[0];
  const st=streakDays(all);
  /* اتحسنت قد إيه: متوسط آخر ١٠ قصاد أول ١٠ */
  let grow=null; if(a.length>=20){ grow=Math.round(avgLast(a,10,"wpm")-a.slice(0,10).reduce((x,h)=>x+h.wpm,0)/10); }
  const secName=k=>SRC_NAME[k]||k;
  B.innerHTML=`
    <div class="hbar">
      ${V.langs.en.length&&V.langs.ar.length?`<div class="seg hlang" id="hlang" role="group" aria-label="${L("لغة الكتابة","Typing language")}">
        <button type="button" data-v="ar">${L("كتابة عربي","Arabic typing")} <small>${AR_NUM(V.langs.ar.length)}</small></button><button type="button" data-v="en">${L("كتابة إنجليزي","English typing")} <small>${AR_NUM(V.langs.en.length)}</small></button>
      </div>`:""}
      <div class="seg" id="hfilter">
        <button type="button" data-v="all">${L("الكل","All")}</button><button type="button" data-v="time">${L("وقت","Time")}</button><button type="button" data-v="words">${L("عدد كلمات","Words")}</button><button type="button" data-v="quote">${L("اقتباس","Quote")}</button>
      </div>
    </div>
    ${a.length?`
    <div class="hstats">
      <div><div class="v">${AR_NUM(a.length)}</div><div class="lbl">${L("اختبار","tests")}</div></div>
      <div><div class="v">${AR_NUM(Math.round(best.wpm))} <small>${WPM}</small></div><div class="lbl">${L("أحسن سرعة","best speed")}</div></div>
      <div><div class="v">${AR_NUM(Math.round(avgLast(a,10,"wpm")))} <small>${WPM}</small></div><div class="lbl">${L("متوسط آخر ١٠","last 10 average")}</div></div>
      <div><div class="v">${AR_NUM(Math.round(avgLast(a,10,"acc")))}${PCT}</div><div class="lbl">${L("دقة آخر ١٠","last 10 accuracy")}</div></div>
      ${grow!==null?`<div><div class="v${grow<0?" down":""}">${grow>0?"+":grow<0?"−":""}${AR_NUM(Math.abs(grow))} <small>${WPM}</small></div><div class="lbl">${L("من أول ١٠ اختبارات","since your first 10")}</div></div>`:""}
      <div><div class="v">${AR_NUM(mins<60?Math.round(mins):+(mins/60).toFixed(1))} <small>${mins<60?L("دقيقة","min"):L("ساعة","hr")}</small></div><div class="lbl">${L("وقت الكتابة","time typing")}</div></div>
      <div><div class="v">${AR_NUM(st.n)} <small>${dayWord(st.n)}</small></div><div class="lbl">${L("ورا بعض","in a row")}${st.total>st.n?(EN?`, of ${st.total} days`:`، من ${AR_NUM(st.total)} ${dayWord(st.total)} اتمرنت فيهم`):""}</div></div>
    </div>
    ${calHTML(all)}
    ${pbCardsHTML(V.langs[hLang])}
    ${secList.length>1||hSrc!=="all"?`<div class="hsecs">
      <h3>${L("الأقسام","Sections")}${top?` <small>${L("أكتر قسم بتكتب فيه:","Your most typed:")} <b>${esc(secName(top.k))}</b></small>`:""}</h3>
      <div class="hseclist" id="hsecs">
        ${secList.map(o=>`<button type="button" class="hsec${hSrc===o.k?" on":""}" data-src="${esc(o.k)}" aria-pressed="${hSrc===o.k}">
          <span class="nm">${esc(secName(o.k))}</span>
          <span class="n">${AR_NUM(o.n)} ${L("اختبار","tests")}</span>
          <span class="bar"><i style="width:${Math.max(4,Math.round(o.n/maxN*100))}%"></i></span>
          <span class="av">${L("متوسط","avg")} <b>${AR_NUM(Math.round(o.sum/o.n))}</b></span>
          <span class="bs">${L("أحسن","best")} <b>${AR_NUM(Math.round(o.best))}</b></span>
        </button>`).join("")}
      </div>
      ${hSrc!=="all"?`<button type="button" class="hsecall" id="hsecall">${L("اعرض كل الأقسام","Show all sections")}</button>`:""}
    </div>`:""}
    ${weakHTML(V.langs[hLang])}
    <div>
      <canvas id="hchart" role="img" aria-label="${L("السرعة في كل اختبار","Speed in each test")}"></canvas>
      <div class="hlegend"><span style="--c:var(--sub)">${L("كل اختبار","each test")}</span><span style="--c:var(--accent)">${L("متوسط آخر ١٠","last 10 average")}</span></div>
    </div>
    <div class="htable-wrap"><table class="htable">
      <thead><tr>${(EN?["When","Speed","Accuracy","Raw","Test","Time","Text"]:["الوقت","السرعة","الدقة","الخام","الاختبار","المدة","النص"]).map(x=>`<th>${x}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(({h,i})=>`<tr class="${pbIdx.has(i)?"hpb":""}"><td>${fmtDate(h.t)}</td><td class="w">${AR_NUM(Math.round(h.wpm))}</td><td>${AR_NUM(Math.round(h.acc))}${PCT}</td><td>${AR_NUM(Math.round(h.raw))}</td><td>${histLabel(h)}</td><td>${AR_NUM(Math.round(h.el))} ${L("ث","s")}</td><td class="q">${h.q?esc(h.q):""}</td></tr>`).join("")}</tbody>
    </table></div>`:`<div class="hempty">${L("مفيش اختبارات من النوع ده لسه.","No tests of this type yet.")}</div>`}
    <div class="hfoot">
      ${a.length>hShown?`<button type="button" id="hmore">${L("اعرض ٣٠ كمان","Show 30 more")}</button>`:"<span></span>"}
      <button type="button" class="danger${hArmed?" armed":""}" id="hclear">${hArmed?L("متأكد؟ اضغط تاني عشان تمسح كل التاريخ","Sure? Click again to clear all history"):L("امسح التاريخ","Clear history")}</button>
    </div>`;
  document.querySelectorAll("#hfilter button").forEach(b=>b.classList.toggle("on",b.dataset.v===hFilter));
  document.querySelectorAll("#hlang button").forEach(b=>{ const on=b.dataset.v===hLang; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); });
  $("hfilter").onclick=e=>{const b=e.target.closest("button");if(!b)return;hFilter=b.dataset.v;hShown=30;renderHistory();};
  if($("hlang")) $("hlang").onclick=e=>{const b=e.target.closest("button");if(!b)return;hLang=b.dataset.v;hSrc="all";hShown=30;renderHistory();};
  if($("hsecs")) $("hsecs").onclick=e=>{const b=e.target.closest(".hsec");if(!b)return;hSrc=hSrc===b.dataset.src?"all":b.dataset.src;hShown=30;renderHistory();};
  if($("hsecall")) $("hsecall").onclick=()=>{hSrc="all";hShown=30;renderHistory();};
  if($("hmore")) $("hmore").onclick=()=>{hShown+=30;renderHistory();};
  $("hclear").onclick=()=>{ if(!hArmed){hArmed=true;renderHistory();return;} setHist([]); try{localStorage.removeItem("tq-pb");}catch(e){} hArmed=false; renderHistory(); showPB(); try{window.dispatchEvent(new Event("tq:clear"));}catch(e){} };
  if($("hweak")) $("hweak").onclick=()=>practiceKeys(weakKeys(V.langs[hLang]).filter(([c])=>!isMark(c)).slice(0,5).map(([c])=>c),hLang);
  if(a.length) drawHist(a.slice(-100));
}
/* ============ خريطة الأيام ============ */
/* مربع لكل يوم في آخر ٢٦ أسبوع، ولونه بيغمق على قد الدقايق اللي كتبتها */
function todayMins(a){ const k=dayKey(Date.now()); return (a||getHist()).reduce((s,h)=>s+(dayKey(h.t)===k?h.el:0),0)/60; }
function calHTML(all){
  const per=new Map(); all.forEach(h=>{const k=dayKey(h.t),o=per.get(k)||{n:0,s:0}; o.n++; o.s+=h.el; per.set(k,o);});
  const end=new Date(); end.setHours(12,0,0,0);
  const d=new Date(end); d.setDate(d.getDate()-d.getDay()-25*7);
  let cells="", active=0;
  while(d<=end){
    const o=per.get(dayKey(d)), m=o?o.s/60:0, lv=!o?0:m<5?1:m<15?2:m<30?3:4;
    if(o) active++;
    const dt=d.toLocaleDateString(EN?"en-US":"ar-EG",{weekday:"short",day:"numeric",month:"short"});
    const tip=o?(EN?`${dt}: ${o.n} tests, ${Math.max(1,Math.round(m))} min`:`${dt}: ${AR_NUM(o.n)} اختبار، ${AR_NUM(Math.max(1,Math.round(m)))} دقيقة`):(EN?`${dt}: no typing`:`${dt}: ما اتمرنتش`);
    cells+=`<i class="l${lv}" title="${esc(tip)}"></i>`; d.setDate(d.getDate()+1);
  }
  return `<div class="hcal"><h3>${L("أيام التمرين","Practice days")} <small>${EN?`${active} days in the last 6 months`:`${AR_NUM(active)} ${dayWord(active)} في آخر ٦ شهور`}</small></h3>
    <div class="calwrap"><div class="cal">${cells}</div></div>
    <div class="callegend">${L("أقل","Less")}<i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i>${L("أكتر","More")}</div></div>`;
}
/* ============ أحسن أرقامك ============ */
function pbCardsHTML(list){
  const C=[["time",15],["time",30],["time",60],["time",120],["quote",null]];
  const out=C.map(([m,n])=>{ let b=null; list.forEach(h=>{ if(h.mode===m&&(n===null||+h.n===n)&&(!b||h.wpm>b.wpm)) b=h; }); return {m,n,b}; }).filter(x=>x.b);
  if(!out.length) return "";
  const nm=(m,n)=>m==="quote"?L("اقتباس","Quote"):EN?`${n} seconds`:`${AR_NUM(n)} ثانية`;
  const dt=t=>new Date(t).toLocaleDateString(EN?"en-US":"ar-EG",{day:"numeric",month:"short"});
  return `<div class="hpbs"><h3>${L("أحسن أرقامك","Personal bests")}</h3><div class="pbrow">${out.map(x=>`<div class="pbc"><span class="pk">${nm(x.m,x.n)}</span><span class="v">${AR_NUM(Math.round(x.b.wpm))} <small>${WPM}</small></span><span class="s">${AR_NUM(Math.round(x.b.acc))}${PCT}${L("، ",", ")}${dt(x.b.t)}</span></div>`).join("")}</div></div>`;
}
/* ============ الحروف اللي بتغلط فيها ============ */
/* من آخر ٥٠ اختبار، عشان يوريك حالك دلوقتي مش زمان */
function weakKeys(list){
  const e={}; list.slice(-50).forEach(h=>{ for(const c in (h.ek||{})) e[c]=(e[c]||0)+h.ek[c]; });
  return Object.entries(e).sort((a,b)=>b[1]-a[1]);
}
function weakHTML(list){
  const w=weakKeys(list); if(!w.length) return "";
  const lay=hLang==="en"?"us":(LAYOUTS[cfg.layout]?cfg.layout:"pc"), LY=LAYOUTS[lay], m=new Map(w), max=w[0][1];
  const show=c=>isMark(c)?"ـ"+c:c;
  let kb="";
  for(let r=0;r<4;r++){
    kb+=`<div class="wrow">${CODES[r].map((code,i)=>{ const [b,sh]=LY[r][i]; const n=(m.get(b)||0)+(sh?m.get(sh)||0:0);
      const lbl=lay==="us"&&/^[a-z]$/.test(b)?b.toUpperCase():b;
      return `<span class="wk${n?" hot":""}" style="--a:${n?Math.round(18+n/max*82):0}%" title="${esc(lbl)}${n?`: ${EN?n+" mistakes":AR_NUM(n)+" غلطة"}`:""}">${esc(lbl)}</span>`; }).join("")}</div>`;
  }
  const top=w.slice(0,8), letters=w.filter(([c])=>!isMark(c));
  return `<div class="hweak"><h3>${L("الحروف اللي بتغلط فيها أكتر","Letters you miss most")} <small>${L("من آخر ٥٠ اختبار","from your last 50 tests")}</small></h3>
    <div class="wtop">${top.map(([c,n])=>`<span class="wch"><b ${hLang==="en"?'dir="ltr"':'lang="ar"'}>${esc(show(c))}</b>${AR_NUM(n)}</span>`).join("")}</div>
    <div class="wkb" dir="ltr">${kb}</div>
    ${letters.length?`<button type="button" class="hweakbtn" id="hweak">${L("اتمرن على كلمات فيها الحروف دي","Practice words with these letters")}</button>`:""}</div>`;
}
/* تمرين: كلمات فيها الحروف اللي بتغلط فيها */
function practiceKeys(chars,lang){
  if(!chars.length) return;
  let pool=lang==="en"?[...new Set(EN_QUOTES.flatMap(([t])=>t.split(" ")).map(w=>w.replace(/[^A-Za-z']/g,"")).filter(w=>w.length>2))]:[...new Set(WORDS.map(w=>clean(w)).filter(w=>w&&!w.includes(" ")))];
  let pick=pool.filter(w=>chars.some(c=>w.includes(c)||(lang!=="en"&&[...w].some(x=>N(x)===N(c)))));
  if(pick.length<5) return toast(L("مالقيناش كلمات كفاية فيها الحروف دي.","We couldn't find enough words with these letters."));
  let list=[]; while(list.length<40) list=list.concat(shuffle(pick)); list=list.slice(0,40);
  $("history").hidden=true; $("kbwrap").hidden=!cfg.kb;
  hist.push({words:list,quote:null,practice:true,dir:lang==="en"?"ltr":"rtl"}); if(hist.length>50) hist.shift(); hpos=hist.length-1;
  start(hist[hpos]);
}
/* ============ الهدف اليومي ============ */
/* دايرة صغيرة في الهيدر بتتملي على قد اللي كتبته النهارده */
function paintGoal(){
  const b=$("goalbtn"); if(!b) return;
  b.hidden=!(cfg.goal>0); if(b.hidden) return;
  const m=todayMins(), p=Math.min(1,m/cfg.goal), C=2*Math.PI*8;
  b.classList.toggle("done",p>=1);
  b.querySelector(".gp").style.strokeDasharray=`${(C*p).toFixed(2)} ${C.toFixed(2)}`;
  const t=EN?`Today's goal: ${Math.floor(m)} of ${cfg.goal} min`:`هدف النهارده: ${AR_NUM(Math.floor(m))} من ${AR_NUM(cfg.goal)} دقايق`;
  b.title=t; b.setAttribute("aria-label",t);
  b.querySelector(".gt").textContent=p>=1?"✓":AR_NUM(Math.floor(m));
}
/* اسم الاختبار في التاريخ بلغة الصفحة، حتى لو اتعمل من الصفحة التانية */
function histLabel(h){
  if(!h.mode||h.n===undefined||!h.src) return esc(h.label||"");
  return labelFor(h.mode,h.n,h.src,/بالتشكيل|diacritics/.test(h.label||""));
}
function drawHist(S){
  const cv=$("hchart"); if(!cv) return; const dpr=window.devicePixelRatio||1;
  const W=cv.clientWidth,H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr;
  const ctx=cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const pl=34,pr=10,pt=10,pb=22, iw=W-pl-pr, ih=H-pt-pb, n=S.length;
  const top=Math.ceil(Math.max(10,...S.map(s=>s.wpm))*1.1/10)*10;
  const X=i=>pl+(n<=1?iw/2:i/(n-1)*iw), Y=v=>pt+ih-(v/top)*ih;
  ctx.font="11px "+tok("--f-ui"); ctx.fillStyle=tok("--sub"); ctx.strokeStyle=tok("--line"); ctx.lineWidth=1; ctx.textAlign="right"; ctx.textBaseline="middle";
  for(let g=0;g<=4;g++){const v=top*g/4,y=Y(v);ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(W-pr,y);ctx.stroke();ctx.fillText(Math.round(v),pl-6,y);}
  ctx.fillStyle=tok("--sub"); S.forEach((s,i)=>{ctx.beginPath();ctx.arc(X(i),Y(s.wpm),2.2,0,7);ctx.fill();});
  const avg=S.map((s,i)=>{const w=S.slice(Math.max(0,i-9),i+1);return w.reduce((a,b)=>a+b.wpm,0)/w.length;});
  ctx.strokeStyle=tok("--accent"); ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.beginPath(); avg.forEach((v,i)=>i?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v))); ctx.stroke();
}
$("histbtn").onclick=openHistory;
if($("goalbtn")) $("goalbtn").onclick=openHistory;
$("hclose").onclick=closeHistory;

/* ============ خطوط النص ============ */
/* [id, الاسم بالعربي, family أو stack, المجموعة] */
const FONTS=[
  ["sans","ثمانية","var(--f-sans)","site"],
  ["serif","ثمانية سيريف","var(--f-serif)","site"],
  ["Geeza Pro","جيزة برو","Geeza Pro","mac"],
  ["Al Nile","النيل","Al Nile","mac"],
  ["Al Bayan","البيان","Al Bayan","mac"],
  ["Baghdad","بغداد","Baghdad","mac"],
  ["Damascus","دمشق","Damascus","mac"],
  ["Sana","سنا","Sana","mac"],
  ["Muna","منى","Muna","mac"],
  ["Nadeem","نديم","Nadeem","mac"],
  ["Waseem","وسيم","Waseem","mac"],
  ["Farah","فرح","Farah","mac"],
  ["Al Tarikh","التاريخ","Al Tarikh","mac"],
  ["KufiStandardGK","كوفي","KufiStandardGK","mac"],
  ["Diwan Kufi","ديوان كوفي","Diwan Kufi","mac"],
  ["DecoType Naskh","نسخ ديكوتايب","DecoType Naskh","mac"],
  ["Farisi","فارسي","Farisi","mac"],
  ["Mishafi","مصحفي","Mishafi","mac"],
  ["Diwan Thuluth","ديوان ثلث","Diwan Thuluth","mac"],
  ["Segoe UI","سيجو","Segoe UI","win"],
  ["Tahoma","تاهوما","Tahoma","win"],
  ["Arial","آريال","Arial","win"],
  ["Times New Roman","تايمز","Times New Roman","win"],
  ["Simplified Arabic","عربي مبسّط","Simplified Arabic","win"],
  ["Traditional Arabic","عربي تقليدي","Traditional Arabic","win"],
  ["Sakkal Majalla","سكّال مجلة","Sakkal Majalla","win"],
  ["Arabic Typesetting","أرابيك تايبستنج","Arabic Typesetting","win"],
  ["Aldhabi","الذهبي","Aldhabi","win"],
  ["Andalus","أندلس","Andalus","win"]
];
let fontAvail=null;
const fontName=f=>EN?(f[0]==="sans"?"Thmanyah":f[0]==="serif"?"Thmanyah Serif":f[0]):f[1];
/* بنقيس عرض نص بالخط ده وبخط احتياطي؛ لو اختلف يبقى الخط متسطّب */
function detectFonts(){
  const out=new Set(["sans","serif"]);
  try{
    const c=document.createElement("canvas").getContext("2d"), smp="طقطقة كتابة عربية سريعة abcXYZ 0123";
    const w=f=>{c.font="40px "+f;return c.measureText(smp).width;};
    const base={monospace:w("monospace"),serif:w("serif"),"sans-serif":w("sans-serif")};
    FONTS.forEach(([id,,fam,grp])=>{
      if(grp==="site") return;
      for(const b in base){ if(Math.abs(w(`"${fam}", ${b}`)-base[b])>0.5){ out.add(id); break; } }
    });
  }catch(e){}
  return out;
}
function fontStack(id){
  const f=FONTS.find(x=>x[0]===id)||FONTS[0];
  return f[3]==="site"?f[2]:`"${f[2]}", var(--f-sans)`;
}
function applyFont(){
  if(!fontAvail) fontAvail=detectFonts();
  if(!fontAvail.has(cfg.tfont)) cfg.tfont="sans";
  document.documentElement.style.setProperty("--f-text",fontStack(cfg.tfont));
  const f=FONTS.find(x=>x[0]===cfg.tfont);
  $("fontbtn").textContent=f?fontName(f):L("ثمانية","Thmanyah");
}
function renderFontMenu(){
  if(!fontAvail) fontAvail=detectFonts();
  const M=$("fontmenu"); let h="";
  [["site"],["mac","win"]].forEach(gs=>{
    const list=FONTS.filter(f=>gs.includes(f[3])&&fontAvail.has(f[0]));
    if(!list.length) return;
    h+=`<h4>${gs[0]==="site"?L("خطوط الموقع","Site fonts"):L("خطوط على جهازك","Fonts on your device")}</h4>`;
    /* اسم الخط بالعربي مكتوب بالخط نفسه عشان تشوف شكله */
    h+=list.map(f=>{const [id,ar]=f; return `<button type="button" role="menuitemradio" aria-checked="${cfg.tfont===id}" class="fopt${cfg.tfont===id?" on":""}" data-id="${esc(id)}"><span class="smp" lang="ar" style="font-family:${esc(fontStack(id))}">${ar}</span><span class="nm">${EN?esc(fontName(f)):gs[0]==="site"?"":esc(id)}</span></button>`;}).join("");
  });
  h+=`<div class="fnote">${L("بيظهر هنا بس الخطوط المتسطّبة على جهازك. الخط بيتغيّر في النص اللي بتكتبه بس.","Only fonts installed on your device show up here. The font changes the text you type, not the rest of the site.")}</div>`;
  M.innerHTML=h;
}
/* القايمة بتفتح تحت الزرار، ولو المساحة تحت قليلة (زي على الموبايل) بتفتح فوقه، وطولها على قد المساحة عشان تتعمل سكرول */
function placeFontMenu(){
  const r=$("fontbtn").getBoundingClientRect(), M=$("fontmenu"), mw=M.offsetWidth, vw=document.documentElement.clientWidth, vh=window.innerHeight;
  const below=vh-r.bottom-12, above=r.top-12, up=below<260&&above>below;
  M.style.maxHeight=Math.max(160,Math.min(460,(up?above:below)-6))+"px";
  M.style.top=(up?Math.max(12,r.top-6-Math.min(M.scrollHeight,parseFloat(M.style.maxHeight))):r.bottom+6)+"px";
  M.style.left=Math.max(16,Math.min(EN?r.left:r.right-mw,vw-mw-16))+"px";
}
function openFontMenu(){
  renderFontMenu(); const M=$("fontmenu"); M.hidden=false; placeFontMenu();
  $("fontbtn").setAttribute("aria-expanded","true");
  const cur=M.querySelector(".fopt.on")||M.querySelector(".fopt"); if(cur){cur.focus({preventScroll:true}); cur.scrollIntoView({block:"nearest"});}
}
function closeFontMenu(back){
  $("fontmenu").hidden=true; $("fontbtn").setAttribute("aria-expanded","false");
  if(back&&T&&!T.done) focusInput();
}
$("fontbtn").addEventListener("click",e=>{ e.stopPropagation(); $("fontmenu").hidden?openFontMenu():closeFontMenu(true); });
$("fontmenu").addEventListener("click",e=>{
  const b=e.target.closest(".fopt"); if(!b) return;
  cfg.tfont=b.dataset.id; saveCfg(); applyFont(); closeFontMenu(false);
  if(T&&!T.done) requestAnimationFrame(()=>{refresh();focusInput();}); else if(T&&T.done) drawChart();
});
document.addEventListener("mousedown",e=>{ if(!$("fontmenu").hidden&&!e.target.closest("#fontmenu")&&!e.target.closest("#fontbtn")) closeFontMenu(false); });
window.addEventListener("scroll",()=>{ if(!$("fontmenu").hidden) placeFontMenu(); },{passive:true});

/* ============ قايمة الإعدادات ============ */
function placeSetMenu(){
  const r=$("setbtn").getBoundingClientRect(), M=$("setmenu"), mw=M.offsetWidth, vw=document.documentElement.clientWidth;
  M.style.top=(r.bottom+6)+"px";
  M.style.left=Math.max(16,Math.min(r.left+r.width/2-mw/2,vw-mw-16))+"px";
}
function openSetMenu(){ const M=$("setmenu"); M.hidden=false; placeSetMenu(); $("setbtn").setAttribute("aria-expanded","true"); const f=M.querySelector("button"); if(f) f.focus({preventScroll:true}); }
function closeSetMenu(back){ if($("setmenu").hidden) return; closeFontMenu(false); $("setmenu").hidden=true; $("setbtn").setAttribute("aria-expanded","false"); if(back&&T&&!T.done) focusInput(); }
$("setbtn").addEventListener("click",e=>{ e.stopPropagation(); $("setmenu").hidden?openSetMenu():closeSetMenu(true); });
document.addEventListener("mousedown",e=>{ if(!$("setmenu").hidden&&!e.target.closest("#setmenu")&&!e.target.closest("#setbtn")&&!e.target.closest("#fontmenu")) closeSetMenu(false); });
window.addEventListener("scroll",()=>{ if(!$("setmenu").hidden) placeSetMenu(); },{passive:true});

/* ============ أزرار الإعدادات ============ */
function syncConfig(){
  paintFavHead();
  if(cfg.mode==="quote"&&cfg.src==="words") cfg.src="mix";
  document.querySelectorAll(".config .group[data-k], #setmenu .group[data-k], #g-layout").forEach(g=>{
    const k=g.dataset.k;
    g.querySelectorAll("button").forEach(b=>{ const on=String(cfg[k])===b.dataset.v; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); });
  });
  document.querySelectorAll(".tog").forEach(b=>{b.classList.toggle("on",!!cfg[b.dataset.t]);b.setAttribute("aria-pressed",!!cfg[b.dataset.t]);});
  const counts={s:0,m:0,l:0,xl:0}; allQuotes().forEach(q=>counts[lenCat(q.t)]++);
  if(cfg.qlen!=="all"&&!counts[cfg.qlen]) cfg.qlen="all";
  document.querySelectorAll("#g-qlen button").forEach(b=>{ const v=b.dataset.v; if(v!=="all"){ b.disabled=!counts[v]; b.title=counts[v]?(EN?counts[v]+" texts":AR_NUM(counts[v])+" نص"):L("مفيش نصوص بالطول ده هنا","No texts of this length here"); } b.classList.toggle("on",cfg.qlen===v); });
  $("g-time").hidden=cfg.mode!=="time"; $("g-words").hidden=cfg.mode!=="words"; $("g-qlen").hidden=cfg.mode!=="quote";
  document.querySelector('.group[data-k="src"] button[data-v="words"]').disabled=cfg.mode==="quote";
  $("kbwrap").hidden=!cfg.kb;
  $("setbadge").hidden=!cfg.tashkeel;
  const de=document.documentElement;
  de.classList.remove("ts-s","ts-l"); if(cfg.tsize!=="m") de.classList.add("ts-"+cfg.tsize);
}
function onConfigClick(e){
  const b=e.target.closest("button"); if(!b||b.disabled||b.id==="setbtn"||b.id==="fontbtn") return;
  const g=b.closest(".group[data-k]");
  if(g){ const k=g.dataset.k; cfg[k]=(k==="time"||k==="words"||k==="goal")?+b.dataset.v:b.dataset.v; }
  else if(b.dataset.t){ cfg[b.dataset.t]=!cfg[b.dataset.t]; }
  saveCfg(); syncConfig(); b.blur();
  if(g&&g.dataset.k==="goal"){ paintGoal(); if(T&&!T.done) focusInput(); return; }
  if(b.dataset.t==="pace"){ if(T&&!T.done){ showLastRun(); placeGhost(); runGhost(); focusInput(); } return; }
  if(b.dataset.t==="kb"){ if(!T.done){updateKb();focusInput();} return; }
  if(g&&(g.dataset.k==="tsize")){ if(T&&!T.done) requestAnimationFrame(()=>{refresh();focusInput();}); else if(T&&T.done) drawChart(); return; }
  if(b.dataset.t==="tashkeel"||b.dataset.t==="punct"){ go(0); return; }
  if(b.dataset.t==="lenient"&&T&&!T.done){ for(let i=0;i<=T.idx;i++) updateWord(i); refresh(); focusInput(); return; }
  resetHistory();
}
$("config").addEventListener("click",onConfigClick);
$("setmenu").addEventListener("click",onConfigClick);
$("g-layout").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  cfg.layout=b.dataset.v; saveCfg(); syncConfig(); buildKb(); b.blur(); updateKb(); if(T&&!T.done) focusInput();
});
slab.addEventListener("mousedown",e=>{ if(e.target!==ti){e.preventDefault();focusInput();} });

/* ============ ادعم طقطقة ============ */
(function(){
  const SITE="https://taqtaqa.com"+(EN?"/en/":"");
  const pitch=L("اتمرن على الكتابة بالعربي على أمثال مصرية وجمل من الأفلام","Practice typing in Arabic on real proverbs, film lines and poetry");
  const msg=pitch+": "+SITE;
  const enc=encodeURIComponent;
  $("swa").href="https://wa.me/?text="+enc(msg);
  $("stg").href="https://t.me/share/url?url="+enc(SITE)+"&text="+enc(pitch);
  $("sx").href="https://x.com/intent/post?text="+enc(msg);
  /* فورم الرسايل: بيتبعت للـ Worker، واللي بيبعته إيميل */
  const onSite=/(^|\.)taqtaqa\.com$|\.workers\.dev$/.test(location.hostname);
  let ftype="suggest";
  document.querySelectorAll("#fbform [data-ft]").forEach(b=>b.onclick=()=>{
    ftype=b.dataset.ft;
    document.querySelectorAll("#fbform [data-ft]").forEach(x=>{ const on=x===b; x.classList.toggle("on",on); x.setAttribute("aria-checked",on); });
    $("fbtext").placeholder=(EN?{suggest:"The proverb or line, and its source if you know it…",bug:"What's wrong? If it's a text, write it as shown and how it should be…",note:"Tell us what you think…"}:{suggest:"المثل أو الجملة، ومصدرها لو تعرفه…",bug:"إيه الغلطة؟ ولو في نص، اكتبه زي ما ظاهر وإزاي المفروض يبقى…",note:"اكتب رأيك…"})[ftype];
    $("fbtext").focus();
  });
  $("fbtext").placeholder=L("المثل أو الجملة، ومصدرها لو تعرفه…","The proverb or line, and its source if you know it…");
  $("mailcopy").onclick=async()=>{ const b=$("mailcopy"); try{ await navigator.clipboard.writeText("hello@taqtaqa.com"); b.textContent=L("اتنسخ ✓","Copied ✓"); }catch(e){ b.textContent="hello@taqtaqa.com"; } setTimeout(()=>b.textContent=L("انسخ","Copy"),2000); };
  if(!onSite){ $("fbsend").disabled=true; $("fbmsg").textContent=L("الفورم شغال على taqtaqa.com","The form works on taqtaqa.com"); }
  $("fbform").addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=$("fbmsg"), btn=$("fbsend"), text=$("fbtext").value.trim();
    msg.className="fbmsg";
    if(text.length<3){ msg.className="fbmsg err"; msg.textContent=L("اكتب رسالتك الأول.","Write your message first."); $("fbtext").focus(); return; }
    btn.disabled=true; msg.textContent=L("بيتبعت…","Sending…");
    const page=(T&&T.words)?T.words.slice(0,40).join(" "):"";
    try{
      const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:ftype,text,contact:$("fbcontact").value.trim(),page,website:$("fbsite").value})});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){ msg.className="fbmsg ok"; msg.textContent=L("وصلت، شكرا ليك ✓","Sent, thank you ✓"); $("fbtext").value=""; }
      else if(r.status===429){ msg.className="fbmsg err"; msg.textContent=({
        wait:L("استنى نص دقيقة قبل الرسالة اللي بعدها.","Wait half a minute before your next message."),
        day:L("وصلنا منك رسايل كتير النهارده. ابعت تاني بكره.","We got a lot of messages from you today. Send again tomorrow."),
        dup:L("الرسالة دي وصلتنا قبل كده.","We already got this message.")})[j.error]||L("ما وصلتش. جرّب تاني بعد شوية.","It didn't go through. Try again in a bit."); }
      else{ msg.className="fbmsg err"; msg.textContent=L("ما وصلتش. جرّب تاني بعد شوية.","It didn't go through. Try again in a bit."); }
    }catch(_){ msg.className="fbmsg err"; msg.textContent=L("مفيش نت. جرّب تاني.","No connection. Try again."); }
    btn.disabled=false;
  });
  const M=$("smodal");
  window.openSupport=function(){ closeFontMenu(false); closeSetMenu(false); setTyping(false); try{ti.blur();}catch(e){} M.hidden=false; $("sshare").focus(); };
  function close(){ M.hidden=true; focusInput(); }
  $("sclose").onclick=close;
  M.addEventListener("mousedown",e=>{ if(e.target===M) close(); });
  document.addEventListener("keydown",e=>{ if(M.hidden) return; e.stopImmediatePropagation(); if(e.key==="Escape"){ e.preventDefault(); close(); } },true);
  $("sshare").onclick=async()=>{
    const b=$("sshare");
    if(navigator.share){ try{ await navigator.share({title:L("طقطقة","Taqtaqa"),text:L("اتمرن على الكتابة بالعربي","Practice typing in Arabic"),url:SITE}); return; }catch(e){ if(e&&e.name==="AbortError") return; } }
    try{ await navigator.clipboard.writeText(SITE); b.textContent=L("اتنسخ ✓","Copied ✓"); }
    catch(e){ const t=document.createElement("textarea"); t.value=SITE; document.body.appendChild(t); t.select(); try{document.execCommand("copy"); b.textContent=L("اتنسخ ✓","Copied ✓");}catch(_){ b.textContent=SITE; } t.remove(); }
    setTimeout(()=>{ b.textContent=L("انسخ اللينك","Copy link"); },2000);
  };
  $("supbtn").onclick=window.openSupport;
})();

/* ============ اختصارات هتساعدك تبقى سريع ============ */
/* [الوصف، توضيح صغير، مفاتيح ويندوز، مفاتيح ماك] */
const SHORTCUTS=EN?[
  ["While typing",[
    ["Delete the whole word","If the word before it has a mistake, it takes you back to it",["Ctrl","⌫"],["⌥ Option","⌫"]],
    ["Switch between Arabic and English","",["Alt","Shift"],["Ctrl","Space"],"or Win+Space","or the 🌐 key alone"],
    ["Move word by word","In any other app",["Ctrl","← →"],["⌥ Option","← →"]],
    ["Select word by word","",["Ctrl","Shift","← →"],["⌥ Option","Shift","← →"]],
    ["Undo","",["Ctrl","Z"],["⌘ Cmd","Z"]]
  ]],
  ["In Taqtaqa",[
    ["Next text","Before you start typing, after Esc, or on the results",["Tab"],["Tab"]],
    ["Previous text","",["Shift","Tab"],["Shift","Tab"]],
    ["Pause and resume","If you hit it by mistake, the next letter you type resumes",["Esc"],["Esc"]],
    ["Restart the same text","",["Shift","Enter"],["Shift","Enter"]],
    ["Themes","",["Ctrl","Shift","P"],["⌘ Cmd","Shift","P"]]
  ]]
]:[
  ["وانت بتكتب",[
    ["امسح الكلمة كلها","ولو الكلمة اللي قبلها فيها غلط، بيرجعك ليها",["Ctrl","⌫"],["⌥ Option","⌫"]],
    ["بدّل بين العربي والإنجليزي","",["Alt","Shift"],["Ctrl","Space"],"أو Win+Space","أو زرار 🌐 لوحده"],
    ["اتنقل كلمة كلمة","في أي برنامج تاني",["Ctrl","← →"],["⌥ Option","← →"]],
    ["حدد كلمة كلمة","",["Ctrl","Shift","← →"],["⌥ Option","Shift","← →"]],
    ["تراجع عن آخر حاجة","",["Ctrl","Z"],["⌘ Cmd","Z"]]
  ]],
  ["في طقطقة",[
    ["النص اللي بعده","قبل ما تبدأ تكتب، أو بعد Esc، أو في النتيجة",["Tab"],["Tab"]],
    ["النص اللي قبله","",["Shift","Tab"],["Shift","Tab"]],
    ["وقّف مؤقتًا، وكمّل","ولو اتداس بالغلط، أول حرف تكتبه بيكمّل",["Esc"],["Esc"]],
    ["ابدأ نفس النص من الأول","",["Shift","Enter"],["Shift","Enter"]],
    ["الثيمات","",["Ctrl","Shift","P"],["⌘ Cmd","Shift","P"]]
  ]]
];
function renderShortcuts(){
  const os=curOS();
  $("sclist").innerHTML=SHORTCUTS.map(([g,rows])=>`<div><h3>${g}</h3>${rows.map(([t,n,w,m,nw,nm])=>{ const note=n||(os==="mac"?nm:nw)||""; return `<div class="scrow"><span>${t}${note?`<small>${note}</small>`:""}</span><span class="ks">${(os==="mac"?m:w).map(k=>`<kbd>${esc(k)}</kbd>`).join("+")}</span></div>`; }).join("")}</div>`).join("");
  document.querySelectorAll("#g-os button").forEach(b=>{ const on=b.dataset.v===os; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); });
}
/* الاختصارات بتتعرض على حسب نظام الجهاز اللي فاتح منه، إلا لو اخترت بنفسك */
function detectOS(){
  const p=(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent||"";
  return /mac|iphone|ipad|ios/i.test(p)?"mac":"win";
}
function curOS(){ return cfg.osPick==="mac"||cfg.osPick==="win"?cfg.osPick:detectOS(); }
$("g-os").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; cfg.osPick=b.dataset.v===detectOS()?undefined:b.dataset.v; saveCfg(); renderShortcuts(); b.blur(); });

/* ============ النقل من اللينكات القديمة لـ taqtaqa.com ============ */
const NEW_HOME="https://taqtaqa.com/";
function importFromOldLink(){
  const h=location.hostname;
  if(/\.workers\.dev$|\.github\.io$/.test(h)){
    $("movebar").hidden=false;
    $("movebtn").onclick=()=>{
      let pb={},cf=null; try{pb=JSON.parse(localStorage.getItem("tq-pb")||"{}");cf=JSON.parse(localStorage.getItem("tq-cfg")||"null");}catch(e){}
      const data={h:getHist(),pb,cfg:cf};
      location.href=NEW_HOME+"#import="+encodeURIComponent(JSON.stringify(data));
    };
  }
  if(location.hash.startsWith("#import=")){
    try{
      const d=JSON.parse(decodeURIComponent(location.hash.slice(8)));
      const cur=getHist(), seen=new Set(cur.map(x=>x.t));
      const add=(Array.isArray(d.h)?d.h:[]).filter(x=>x&&typeof x.t==="number"&&typeof x.wpm==="number"&&!seen.has(x.t));
      setHist(cur.concat(add).sort((a,b)=>a.t-b.t));
      const pbs=getPBs(); for(const k in (d.pb||{})){ const v=d.pb[k]; if(v&&typeof v.wpm==="number"&&(!pbs[k]||v.wpm>pbs[k].wpm)) pbs[k]=v; } setPBs(pbs);
      let had=null; try{had=localStorage.getItem("tq-cfg");}catch(e){}
      if(!had&&d.cfg&&typeof d.cfg==="object"){ cfg=Object.assign({},DEF,d.cfg); saveCfg(); syncConfig(); applyFont(); buildKb(); applyTheme(cfg.theme); }
      toast(add.length?(EN?`Your history moved: ${add.length} tests`:`اتنقل تاريخك: ${AR_NUM(add.length)} اختبار`):L("تاريخك موجود هنا بالفعل","Your history is already here"));
      showPB();
    }catch(e){ toast(L("ما قدرناش ننقل التاريخ. جرّب تاني من اللينك القديم.","We couldn't move your history. Try again from the old link.")); }
    try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){ location.hash=""; }
  }
}

/* ============ جولة التعريف (أول مرة بس) ============ */
const TOUR=EN?[
  {sel:null,t:"Welcome to Taqtaqa",b:"A place to practice typing in Arabic on real Egyptian and Saudi proverbs, film lines, folk tales and poetry. Here's a one-minute tour."},
  {sel:"#slab",t:"Type what you see",b:'Just start typing, and the timer starts with your first letter. Correct letters turn white, mistakes turn red. <span class="k2">Space</span> moves to the next word, and <span class="k2">⌫</span> deletes.'},
  {sel:'.config .group[data-k="src"]',t:"Pick your texts",b:"Egyptian and Saudi proverbs, Egyptian Arabic, film lines, folk tales, wisdom, verses from the Quran, poetry, or Mix. Words gives you single words, and English has English quotes."},
  {sel:"#favhbtn",t:"Favorites",b:"Texts you saved with the Save button under the text. Click it to type from them, and click again to go back."},
  {sel:'.config .group[data-k="mode"]',t:"Pick a test type",b:"<b>Time:</b> type as much as you can in a number of seconds.<br><b>Words:</b> finish a set number of words.<br><b>Quote:</b> one full text from start to end."},
  {sel:()=>["#g-time","#g-words","#g-qlen"].map(s=>$(s.slice(1))).find(e=>e&&!e.hidden),t:"Pick the length",b:"Set the seconds, the word count, or the quote length, depending on the test type."},
  {sel:"#setbtn",t:"Settings",b:"<ul><li><b>Diacritics:</b> every Arabic text shows simple marks that you type too.</li><li><b>Lenient hamza:</b> أ, إ and آ count as ا.</li><li><b>Punctuation</b> and the <b>keyboard</b>.</li><li><b>Text font</b> and <b>size</b>.</li></ul>"},
  {sel:"#kbwrap",t:"On-screen keyboard",b:"The key you need to press lights up, and so does Shift when you need it. Above it you can pick the Windows or Mac Arabic layout."},
  {sel:"#histbtn",t:"History",b:"Every test is saved here with your speed and accuracy, plus a chart of how you're improving."},
  {sel:"#themebtn",t:"Themes",b:'More than 100 dark and light themes. You can also open them with <span class="k2">Ctrl</span>+<span class="k2">Shift</span>+<span class="k2">P</span>.'},
  {sel:null,t:"Shortcuts you'll need",b:'<span class="k2">Tab</span> next text (before you start, or after Esc)<br><span class="k2">Shift</span>+<span class="k2">Tab</span> previous text<br><span class="k2">Esc</span> pause and resume<br><span class="k2">Shift</span>+<span class="k2">Enter</span> restart the text<br><span class="k2">Ctrl</span>+<span class="k2">⌫</span> delete the whole word (<span class="k2">⌥</span>+<span class="k2">⌫</span> on Mac)<br><br>All the shortcuts that help you type faster, for Windows and Mac, are at the bottom of the page.<br><br>To see this tour again, click Tour at the top.',last:true}
]:[
  {sel:null,t:"أهلا بيك في طقطقة",b:"موقع تتمرن فيه على الكتابة بالعربي على أمثال مصرية، وجمل من الأفلام، وحواديت، وشعر. خلينا نوريك الموقع في دقيقة."},
  {sel:"#slab",t:"اكتب اللي قدامك",b:'ابدأ اكتب على طول، والوقت بيبدأ مع أول حرف. الحرف الصح بيبقى أبيض، والغلط أحمر. <span class="k2">مسافة</span> بتنقلك للكلمة اللي بعدها، و<span class="k2">⌫</span> بيمسح.'},
  {sel:'.config .group[data-k="src"]',t:"اختار النصوص",b:"أمثال مصرية وسعودية، كلام مصري، أفلام، حواديت، حكم، آيات من القرآن، شعر، أو «مكس» من كله. و«كلمات» بيجيبلك كلمات لوحدها، و«إنجليزي» فيه اقتباسات بالإنجليزي."},
  {sel:"#favhbtn",t:"مفضلتي",b:"النصوص اللي حفظتها بزرار «احفظ» اللي تحت النص. دوس عليه عشان تكتب منها، ودوس تاني عشان ترجع."},
  {sel:'.config .group[data-k="mode"]',t:"اختار طريقة الاختبار",b:"<b>وقت:</b> اكتب أكتر ما تقدر في عدد ثواني.<br><b>عدد كلمات:</b> خلّص عدد كلمات معين.<br><b>اقتباس:</b> نص واحد كامل من أوله لآخره."},
  {sel:()=>["#g-time","#g-words","#g-qlen"].map(s=>$(s.slice(1))).find(e=>e&&!e.hidden),t:"اختار المدة أو الطول",b:"هنا بتحدد عدد الثواني، أو عدد الكلمات، أو طول الاقتباس، على حسب الطريقة اللي اخترتها."},
  {sel:"#setbtn",t:"الإعدادات",b:"<ul><li><b>التشكيل:</b> كل النصوص بتظهر بحركات بسيطة ولازم تكتبها.</li><li><b>تساهل في الهمزات:</b> أ وإ وآ بتتحسب ا.</li><li><b>علامات الترقيم</b> و<b>الكيبورد</b>.</li><li><b>خط النص</b> و<b>حجمه</b>.</li></ul>"},
  {sel:"#kbwrap",t:"الكيبورد اللي على الشاشة",b:"الزرار اللي عليك تدوسه بيتلوّن، ولو محتاج Shift بينوّره كمان. ومن فوقه تختار ترتيب ويندوز أو ماك."},
  {sel:"#histbtn",t:"تاريخك",b:"كل اختبار بيتحفظ هنا بسرعتك ودقتك، ومعاه رسمة بتوضح بتتحسن ازاي."},
  {sel:"#themebtn",t:"الثيمات",b:'أكتر من ١٠٠ ثيم، غامق وفاتح. تقدر تفتحها كمان بـ <span class="k2">Ctrl</span>+<span class="k2">Shift</span>+<span class="k2">P</span>.'},
  {sel:null,t:"اختصارات هتحتاجها",b:'<span class="k2">Tab</span> النص اللي بعده (قبل ما تبدأ، أو بعد Esc)<br><span class="k2">Shift</span>+<span class="k2">Tab</span> النص اللي قبله<br><span class="k2">Esc</span> توقّف مؤقتًا وتكمّل<br><span class="k2">Shift</span>+<span class="k2">Enter</span> تبدأ النص من الأول<br><span class="k2">Ctrl</span>+<span class="k2">⌫</span> تمسح الكلمة كلها (على ماك <span class="k2">⌥</span>+<span class="k2">⌫</span>)<br><br>وكل الاختصارات اللي هتساعدك تبقى سريع، لويندوز وماك، تحت في آخر الصفحة.<br><br>ولو حبيت تشوف الشرح ده تاني، اضغط «شرح الموقع» فوق.',last:true}
];
let tourI=-1, tourSteps=[];
function tourOpen(){ return tourI>=0; }
function tourTarget(st){
  if(!st.sel) return null;
  const el=typeof st.sel==="function"?st.sel():document.querySelector(st.sel);
  if(!el||el.hidden||el.offsetParent===null) return null;
  return el;
}
function startTour(){
  closeFontMenu(false); closeSetMenu(false);
  if(!$("tpanel").hidden) closeThemes();
  if(!$("history").hidden) closeHistory();
  if(T&&T.timer&&!T.done) go(0);
  setTyping(false); try{ti.blur();}catch(e){}
  tourSteps=TOUR.filter(st=>!st.sel||tourTarget(st));
  let root=$("tour");
  if(!root){
    root=document.createElement("div"); root.id="tour"; root.className="tour"; root.setAttribute("role","dialog"); root.setAttribute("aria-modal","true"); root.setAttribute("aria-label",L("شرح الموقع","Site tour"));
    root.innerHTML=`<div class="tblock"></div><div class="spot"></div><div class="tcardx" dir="${EN?"ltr":"rtl"}"></div>`;
    document.body.appendChild(root);
  }
  root.hidden=false; tourI=0; showTourStep();
}
function endTour(){
  const r=$("tour"); if(r) r.hidden=true; tourI=-1;
  try{localStorage.setItem("tq-tour","1");}catch(e){}
  focusInput();
}
function showTourStep(){
  const st=tourSteps[tourI], card=$("tour").querySelector(".tcardx");
  const n=tourSteps.length;
  card.innerHTML=`<div class="tstep">${AR_NUM(tourI+1)} ${L("من","of")} ${AR_NUM(n)}</div><h3>${st.t}</h3><p>${st.b}</p>
    <div class="tbtns">${st.last?"":`<button type="button" class="skip" data-a="skip">${L("تخطّي","Skip")}</button>`}<span class="sp"></span>
    <div class="tdots">${tourSteps.map((_,i)=>`<i class="${i===tourI?"on":""}"></i>`).join("")}</div><span class="sp"></span>
    ${tourI>0?`<button type="button" data-a="prev">${L("السابق","Back")}</button>`:""}
    <button type="button" class="pri" data-a="next">${st.last?L("يلا نبدأ","Let's start"):L("التالي","Next")}</button></div>`;
  card.querySelector('[data-a="next"]').focus({preventScroll:true});
  const el=tourTarget(st);
  if(el){ try{el.scrollIntoView({block:"center",behavior:"instant"});}catch(e){el.scrollIntoView();} }
  else window.scrollTo(0,0);
  requestAnimationFrame(()=>placeTour(el));
}
function placeTour(el){
  const root=$("tour"); if(!root||root.hidden) return;
  const spot=root.querySelector(".spot"), card=root.querySelector(".tcardx");
  const vw=document.documentElement.clientWidth, vh=window.innerHeight, pad=8, cw=card.offsetWidth, ch=card.offsetHeight;
  if(!el){
    spot.classList.add("none");
    card.style.left=Math.round((vw-cw)/2)+"px"; card.style.top=Math.round(Math.max(16,(vh-ch)/2))+"px"; return;
  }
  spot.classList.remove("none");
  const r=el.getBoundingClientRect();
  const x=Math.max(4,r.left-pad), y=Math.max(4,r.top-pad), w=Math.min(vw-8,r.width+pad*2), h=r.height+pad*2;
  Object.assign(spot.style,{left:x+"px",top:y+"px",width:w+"px",height:h+"px"});
  let top;
  if(y+h+14+ch<=vh-12) top=y+h+14;
  else if(y-14-ch>=12) top=y-14-ch;
  else top=Math.max(12,vh-ch-12);
  let left=EN?r.left:r.right-cw; left=Math.max(16,Math.min(left,vw-cw-16));
  card.style.top=Math.round(top)+"px"; card.style.left=Math.round(left)+"px";
}
function tourNav(a){
  if(a==="next"){ if(tourI>=tourSteps.length-1) endTour(); else { tourI++; showTourStep(); } }
  else if(a==="prev"){ if(tourI>0){ tourI--; showTourStep(); } }
  else if(a==="skip") endTour();
}
document.addEventListener("click",e=>{ const b=e.target.closest("#tour [data-a]"); if(b) tourNav(b.dataset.a); });
$("helpbtn").onclick=startTour;
/* زرار عربي / English: بيفتكر اختيارك، فلو فتحت الموقع تاني بيفتح على نفس اللغة */
document.querySelectorAll("#langbtn,[data-lang]").forEach(b=>b.addEventListener("click",()=>{ try{localStorage.setItem("tq-lang",b.dataset.lang||(EN?"ar":"en"));}catch(e){} }));
$("logo").addEventListener("click",e=>{ e.preventDefault(); location.reload(); });
/* «عن طقطقة»: بيفتح لو اللينك فيه #about، وبينزل عليه لما يتفتح */
(function(){ const d=$("about"); if(!d) return;
  if(location.hash==="#about") d.open=true;
  d.addEventListener("toggle",()=>{ if(d.open) setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),30); });
})();
/* ============ كشيدة اللوجو ============ */
/* بنمطّ «طقطقة» بالكشيدة بعد حرفي القاف لحد ما اللوجو يبقى بعرض الجملة اللي تحته، من غير ما يعدّيها */
/* في الصفحة الإنجليزي اللوجو «Taqtaqa.» من غير كشيدة */
const LOGO_WORD=EN?"Taqtaqa":"طقطقة";
function stretchLogo(){
  const lw=$("logoword"), logo=$("logo"), target=$("tagtext").getBoundingClientRect().width;
  if(EN){ lw.textContent=LOGO_WORD; return LOGO_WORD; }
  if(!target) return lw.textContent;
  let best=LOGO_WORD;
  for(let n=0;n<=16;n++){
    const k1="ـ".repeat(Math.floor(n/2)), k2="ـ".repeat(Math.ceil(n/2));
    const w=LOGO_WORD.slice(0,2)+k1+LOGO_WORD.slice(2,4)+k2+LOGO_WORD.slice(4);
    lw.textContent=w;
    if(logo.getBoundingClientRect().width>target+1) break;
    best=w;
  }
  lw.textContent=best;
  return best;
}

/* ============ افتتاحية اللوجو ============ */
function playIntro(){
  const H=document.documentElement;
  const ready=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
  if(!H.classList.contains("intro")){ ready.then(stretchLogo); return; }
  const lw=$("logoword"), dot=document.querySelector(".logo b"), tg=$("tagtext"), hr=document.querySelector(".hright");
  const tag=tg.textContent;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  (async()=>{
    await ready;
    const word=stretchLogo();
    lw.textContent=word.slice(0,1); lw.classList.add("on");
    await wait(420);
    /* كل خطوة بتكتب حرف ومعاه الكشيدة اللي بعده */
    for(let i=2;i<=word.length;i++){ if(word[i]==="ـ") continue; lw.textContent=word.slice(0,i); dot.classList.add("tick"); setTimeout(()=>dot.classList.remove("tick"),70); await wait(85+Math.random()*55); }
    lw.textContent=word; await wait(160);
    hr.classList.add("show");
    tg.textContent=""; tg.classList.add("on","typing");
    for(let i=1;i<=tag.length;i++){ tg.textContent=tag.slice(0,i); await wait(tag[i-1]===" "?55:24+Math.random()*18); }
    await wait(700); tg.classList.remove("typing");
    await wait(500); H.classList.remove("intro");
    try{sessionStorage.setItem("tq-intro","1");}catch(e){}
  })().catch(()=>{ tg.textContent=tag; H.classList.remove("intro"); stretchLogo(); });
}

/* ============ تغيير حجم الشاشة ============ */
/* كل اللي مكانه أو مقاسه بيتحسب بالبكسل بيتعاد حسابه هنا */
let stretchT;
window.addEventListener("resize",()=>{
  if(!$("history").hidden){ const f=histView().a; if(f.length) drawHist(f.slice(-100)); }
  else if(T&&T.done) drawChart(); else if(T) refresh();
  if(!$("fontmenu").hidden) placeFontMenu();
  if(!$("setmenu").hidden) placeSetMenu();
  if(tourOpen()) placeTour(tourTarget(tourSteps[tourI]));
  if(!document.documentElement.classList.contains("intro")){ clearTimeout(stretchT); stretchT=setTimeout(stretchLogo,150); }
});

/* ============ البداية ============ */
/* الموقع العربي دايما بيفتح على «اقتباس» في «شعر»، وأول نص قصيدة «ولرُبّ نازلة» للإمام الشافعي */
/* والموقع الإنجليزي بيفتح على «إنجليزي» على اقتباس عشوائي */
const OPENING=EN?null:"ولرب نازلة";
function openOnPoem(){
  cfg.mode="quote"; cfg.src=EN?"en":"sheer"; cfg.qlen="all"; saveCfg(); syncConfig();
  const qs=allQuotes(), q=OPENING&&qs.find(x=>favKey(x.t).startsWith(OPENING));
  if(!q){ resetHistory(); return; }
  const key="q-"+cfg.src+"-all"; if(!bags[key]) bags[key]=shuffle(qs.filter(x=>x!==q));
  hist=[{words:clean(q.t,q.tk).split(" ").filter(Boolean),quote:q,count:qs.length}]; hpos=0;
  start(hist[0]);
}
if(cfg.theme!=="taqtaqa"&&!THEMES.some(t=>t[0]===cfg.theme)) cfg.theme="vesper";
delete cfg.os; /* كان بيتحفظ لوحده زمان، فبقى بيثبت على أول جهاز */
applyFont(); buildKb(); applyTheme(cfg.theme); renderShortcuts(); paintGoal();
importFromOldLink();
openOnPoem();
(function(){ let seen=null; try{seen=localStorage.getItem("tq-tour");}catch(e){} if(!seen) setTimeout(startTour,450); })();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(T&&!T.done) refresh(); });
playIntro();

/* واجهة صغيرة لـ cloud.js (الحسابات والمزامنة) */
window.TQ={getHist,setHist,getPBs,setPBs,getFavs,setFavs(a){ setFavs(a,true); },getLastRuns,setLastRuns,toast,refreshHistory(){ if(!$("history").hidden) renderHistory(); showPB(); paintGoal(); }};
try{window.dispatchEvent(new Event("tq:ready"));}catch(e){}
})();

/* ============ التشغيل من غير نت ============ */
if("serviceWorker" in navigator && location.protocol==="https:"){
  window.addEventListener("load",()=>{ navigator.serviceWorker.register("/sw.js").catch(()=>{}); });
}
