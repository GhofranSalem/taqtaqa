/* طقطقة: كود الموقع */
(function(){
"use strict";

/* ============ إعدادات ============ */
const DEF = {src:"masry",mode:"time",time:30,words:25,qlen:"all",lenient:true,punct:true,kb:true,layout:"pc",theme:"vesper",tfilter:"dark",tfont:"sans",tsize:"m",tashkeel:false,pace:true};
let cfg = Object.assign({},DEF);
try{const s=JSON.parse(localStorage.getItem("tq-cfg")||"null"); if(s) cfg=Object.assign(cfg,s);}catch(e){}
if(cfg.src==="tashkeel") cfg.src="mix";
if(!cfg.theme) cfg.theme="vesper";
function saveCfg(){try{localStorage.setItem("tq-cfg",JSON.stringify(cfg));}catch(e){}}
function getPBs(){try{return JSON.parse(localStorage.getItem("tq-pb")||"{}");}catch(e){return {};}}
function setPBs(o){try{localStorage.setItem("tq-pb",JSON.stringify(o));}catch(e){}}

const $=id=>document.getElementById(id);
const wordsEl=$("words"), caret=$("caret"), slab=$("slab"), ti=$("ti"), fmsg=$("fmsg");
const AR_NUM=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);

/* ============ مساعدات النص ============ */
const TASHKEEL=/[ً-ْٰـ]/g;
const HARAKAT=/[\u064B-\u0652]/g;
function isMark(c){return !!c&&c>="\u064B"&&c<="\u0652";}
/* الشدة الأول وبعدين الحركة، زي ما الناس بتكتبها */
function canonMarks(t){return t.replace(/[\u064B-\u0652]{2,}/g,r=>[...r].sort((a,b)=>(a==="\u0651"?0:1)-(b==="\u0651"?0:1)).join(""));}
/* الحركات بتظهر لما اختيار التشكيل يكون شغال، وبتتشال لما يتقفل */
function clean(t,tk){
  t=(cfg.tashkeel&&tk)?canonMarks(t.replace(/[\u0670\u0640]/g,"")):t.replace(TASHKEEL,"");
  t=t.replace(/\.{2,}/g,"،").replace(/[ﻻﻹﻷﻵ]/g,m=>({"ﻻ":"لا","ﻹ":"لإ","ﻷ":"لأ","ﻵ":"لآ"}[m]));
  if(!cfg.punct) t=t.replace(/[،؛؟!.:,"«»\-]/g," ");
  return t.replace(/\s+/g," ").trim();
}
const NMAP={"أ":"ا","إ":"ا","آ":"ا","ٱ":"ا","ة":"ه","ى":"ي","ؤ":"و","ئ":"ي"};
function N(c){return cfg.lenient?(NMAP[c]||c):c;}
function eq(a,b){return a===b||N(a)===N(b);}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function esc(c){return c==="<"?"&lt;":c===">"?"&gt;":c==="&"?"&amp;":c;}
function toast(msg){ document.querySelectorAll(".toast").forEach(x=>x.remove()); const d=document.createElement("div"); d.className="toast"; d.setAttribute("role","status"); d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),5000); }

const CATS={
  masry:()=>MASRY.map(t=>({t,s:"مثل شعبي مصري",tk:true})),
  saudi:()=>SAUDI.map(t=>({t,s:"مثل شعبي سعودي",tk:true})),
  kalam:()=>KALAM.map(t=>({t,s:"كلام مصري",tk:true})).concat(MT_EGY.map(t=>({t,s:"كلام مصري، من اقتباسات Monkeytype",tk:true}))),
  hawadit:()=>HAWADIT.map(([t,s])=>({t,s,tk:true})),
  aflam:()=>AFLAM.map(([t,f,a,y])=>({t,s:`فيلم ${f} (${y})، ${a}`,tk:true})),
  hekam:()=>HEKAM.map(([t,s])=>({t,s,tk:true})),
  sheer:()=>SHEER.map(([t,s])=>({t,s,tk:true})),
  fav:()=>{ const cur=new Map(); ["masry","saudi","kalam","aflam","hawadit","hekam","sheer"].forEach(c=>CATS[c]().forEach(q=>cur.set(favKey(q.t),q))); return getFavs().map(f=>cur.get(favKey(f.t))||{t:f.t,s:f.s,tk:f.tk}); }
};
function allQuotes(){
  const keys=(cfg.src==="mix"||cfg.src==="words")?["masry","saudi","kalam","aflam","hawadit","hekam","sheer"]:[cfg.src];
  return keys.flatMap(k=>CATS[k]());
}
function lenCat(t){const n=t.length;return n<70?"s":n<180?"m":n<320?"l":"xl";}

/* شنطة بتلف على كل النصوص قبل ما تكرر */
const bags={};
function draw(key,list){
  let b=bags[key]; if(!b||!b.length) b=bags[key]=shuffle(list);
  return b.pop();
}
let gen=null, genLog=null;
function makeGen(){
  if(cfg.src==="words"){
    let last="";
    return ()=>{const out=[];for(let i=0;i<20;i++){let w;do{w=WORDS[Math.random()*WORDS.length|0];}while(w===last);last=w;if(genLog)genLog.push({t:w});out.push(clean(w));}return out.join(" ").split(" ").filter(Boolean);};
  }
  const qs=allQuotes(), key="stream-"+cfg.src;
  return ()=>{ const q=draw(key,qs); if(genLog) genLog.push(q); return clean(q.t,q.tk).split(" ").filter(Boolean); };
}

/* ============ حالة الاختبار ============ */
let T;
function fresh(words,quote){
  return {words,typed:[""],idx:0,started:false,done:false,t0:0,ok:0,bad:0,secKeys:0,secErr:0,samples:[],nextSec:1,timer:null,quote};
}
function buildWords(){
  if(cfg.src==="fav"&&!getFavs().length){ cfg.src="mix"; saveCfg(); syncConfig(); toast("مفضلتك فاضية، فرجعناك لـ«مكس»."); }
  gen=makeGen();
  if(cfg.mode==="quote"){
    let qs=allQuotes(); if(cfg.qlen!=="all"){const f=qs.filter(q=>lenCat(q.t)===cfg.qlen); if(f.length) qs=f;}
    const q=draw("q-"+cfg.src+"-"+cfg.qlen,qs);
    return {words:clean(q.t,q.tk).split(" ").filter(Boolean),quote:q,count:qs.length};
  }
  const need=cfg.mode==="words"?cfg.words:90; let w=[];
  genLog=[];
  while(w.length<need) w=w.concat(gen());
  const raw=genLog; genLog=null;
  if(cfg.mode==="words") w=w.slice(0,cfg.words);
  return {words:w,quote:null,raw};
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
  if(dir===0&&hpos>=0){ /* نفس النص */ }
  else if(dir<0){ if(hpos>0) hpos--; else return flashNav("ده أول نص"); }
  else if(hpos<hist.length-1){ hpos++; }
  else { hist.push(buildWords()); if(hist.length>50) hist.shift(); hpos=hist.length-1; }
  start(hist[hpos]);
}
function resetHistory(){ hist=[]; hpos=-1; go(1); }
function flashNav(msg){ $("navhint").textContent=msg; clearTimeout(flashNav.t); flashNav.t=setTimeout(updateNav,1200); }
function updateNav(){
  const b=hist[hpos]; let s="";
  if(cfg.mode==="quote"&&b&&b.count) s="نص "+AR_NUM(hpos+1)+"، فيه "+AR_NUM(b.count)+" نص في القسم ده";
  $("navhint").textContent=s;
}
function start(b){
  if(T&&T.timer) clearInterval(T.timer);
  setTyping(false);
  gen=makeGen();
  T=fresh(wordsFor(b),b.quote);
  T.segs=segsFor(b);
  T.key=runKey(); T.last=getLastRuns()[T.key]||null;
  $("results").hidden=true; $("history").hidden=true; $("stage").hidden=false;
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
function setTyping(on){ document.body.classList.toggle("typing",!!on); if(on){ closeFontMenu(false); closeSetMenu(false); } }
document.addEventListener("mousemove",e=>{ if(Math.abs(e.movementX)+Math.abs(e.movementY)>3) setTyping(false); });
function setTyped(nv){
  const old=T.typed[T.idx]; if(nv===old) return;
  if(!T.started&&nv.length) startTest();
  const tg=T.words[T.idx];
  let k=0; while(k<old.length&&k<nv.length&&old[k]===nv[k]) k++;
  for(let j=k;j<nv.length;j++){
    const good=j<tg.length&&eq(nv[j],tg[j]);
    if(good)T.ok++;else{T.bad++;T.secErr++;flashBad();}
    T.secKeys++;
  }
  T.typed[T.idx]=nv; updateWord(T.idx);
  if(cfg.mode!=="time"&&T.idx===T.words.length-1&&wordCorrect(T.idx)) finish();
}
function commitWord(){
  const i=T.idx, good=wordCorrect(i);
  if(good)T.ok++;else{T.bad++;T.secErr++;}
  T.secKeys++;
  if(i===T.words.length-1&&cfg.mode!=="time"){finish();return;}
  T.idx++; T.typed[T.idx]="";
  updateWord(i); updateWord(T.idx); updateUnder();
  if(cfg.mode==="time"&&T.words.length-T.idx<40) appendWords();
}
ti.addEventListener("input",()=>{
  if(T.done||tourOpen()){ti.value=T.done?"":(T.typed[T.idx]||"");return;}
  if(T.started) setTyping(true);
  let v=ti.value.replace(/\n/g," ").replace(/[ﻻﻹﻷﻵ]/g,m=>({"ﻻ":"لا","ﻹ":"لإ","ﻷ":"لأ","ﻵ":"لآ"}[m]));
  v=v.replace(/[\u0670\u0640]/g,"");
  if(cfg.tashkeel) v=canonMarks(v); else if(cfg.lenient) v=v.replace(HARAKAT,"");
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
    else if(e.key==="ArrowLeft"||e.key==="Enter"&&document.activeElement.tagName!=="BUTTON"){ e.preventDefault(); tourNav("next"); }
    else if(e.key==="ArrowRight"){ e.preventDefault(); tourNav("prev"); }
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
  if(e.key==="Tab"){ e.preventDefault(); go(e.shiftKey?-1:1); return; }
  if(e.key==="Escape"){ e.preventDefault(); go(0); return; }
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
  let r=w.getBoundingClientRect(), x=r.right+1;
  if(ty.length){ const cr=charRect(w,Math.min(ty.length,total)-1); if(cr) x=cr.left-1; }
  caret.style.height=(r.height*0.56)+"px";
  caret.style.transform=`translate(${x-box.left-1}px,${r.top-box.top+r.height*0.24}px)`;
}
function updateCounter(){
  const c=$("counter");
  if(cfg.mode==="time"){
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
  if(el>=1) $("live").textContent=AR_NUM(Math.round(correctChars()/5/(el/60)))+" كلمة/دقيقة";
  if(cfg.mode==="time"&&el>=cfg.time) finish();
}
function pushSample(s){ T.samples.push({s,wpm:correctChars()/5/(s/60),raw:T.secKeys*12,err:T.secErr}); T.secKeys=0;T.secErr=0; }

/* ============ النتيجة ============ */
function finish(){
  if(T.done) return; T.done=true; clearInterval(T.timer); setTyping(false);
  let el=cfg.mode==="time"?cfg.time:(performance.now()-T.t0)/1000;
  el=Math.max(el,0.5);
  const frac=el-(T.nextSec-1);
  if(frac>0.4||!T.samples.length){T.samples.push({s:+el.toFixed(1),wpm:correctChars()/5/(el/60),raw:T.secKeys*(60/Math.max(frac,0.5))/5,err:T.secErr});}
  const cc=correctChars();
  const wpm=cc/5/(el/60), total=T.ok+T.bad, raw=total/5/(el/60), acc=total?T.ok/total*100:0;
  let c=0,b=0,x=0,m=0;
  for(let i=0;i<=T.idx&&i<T.words.length;i++){
    const tg=T.words[i],ty=T.typed[i]||"";
    for(let j=0;j<Math.max(tg.length,ty.length);j++){
      if(j>=tg.length)x++;else if(j>=ty.length){if(i<T.idx||cfg.mode!=="time")m++;}else if(eq(ty[j],tg[j]))c++;else b++;
    }
  }
  const key=pbKey(), pbs=getPBs(), prev=pbs[key];
  const isPB=wpm>0&&acc>=75&&(!prev||wpm>prev.wpm);
  if(isPB){pbs[key]={wpm:Math.round(wpm),acc:Math.round(acc)};setPBs(pbs);}
  const rr={wpm,raw,acc,c,b,x,m,el,isPB,prev,last:T.last}; if(total>0) addHist(rr);
  if(total>0&&wpm>0) saveLastRun(T.key,{w:Math.round(wpm*10)/10,a:Math.round(acc),t:Date.now()});
  $("ghost").hidden=true;
  showResults(rr);
  ti.blur(); updateKb();
}
const SRC_NAME={masry:"أمثال مصرية",saudi:"أمثال سعودية",kalam:"كلام مصري",aflam:"أفلام",hawadit:"حواديت",hekam:"حكم وتراث",sheer:"شعر",tashkeel:"تشكيل",mix:"مكس",fav:"مفضلتي",words:"كلمات"};
function modeLabel(){
  const m=cfg.mode==="time"?AR_NUM(cfg.time)+" ثانية":cfg.mode==="words"?AR_NUM(cfg.words)+" كلمة":"اقتباس "+({all:"",s:"قصير",m:"متوسط",l:"طويل",xl:"طويل جدا"}[cfg.qlen]);
  return m.trim()+"، "+SRC_NAME[cfg.src]+(cfg.tashkeel?"، بالتشكيل":"");
}
function pbKey(){return [cfg.mode,cfg.mode==="time"?cfg.time:cfg.mode==="words"?cfg.words:cfg.qlen,cfg.src].join("-")+(cfg.tashkeel?"-t":"");}
function showPB(){
  const p=getPBs()[pbKey()];
  $("pb").innerHTML=p?`أحسن رقم ليك هنا: <strong>${AR_NUM(p.wpm)}</strong> كلمة/دقيقة، دقة ${AR_NUM(p.acc)}٪`:"";
}
function showResults(r){
  $("stage").hidden=true;
  const R=$("results"); R.hidden=false; R.className="results";
  const q=T.quote?`<div class="quote-done">${clean(T.quote.t,T.quote.tk)}<small>— ${T.quote.s}</small></div>`:"";
  R.innerHTML=`
    <div class="big">
      <div class="stat"><div class="lbl">كلمة في الدقيقة</div><div class="val">${AR_NUM(Math.round(r.wpm))}</div></div>
      <div class="stat"><div class="lbl">الدقة</div><div class="val sm">${AR_NUM(Math.round(r.acc))}٪</div></div>
      ${(()=>{const h=getHist();return h.length>=3?`<div class="avg10">متوسطك في آخر ١٠: ${AR_NUM(Math.round(avgLast(h,10,"wpm")))} ك/د</div>`:"";})()}
      ${r.last?(()=>{const d=Math.round(r.wpm)-Math.round(r.last.w);return `<div class="vslast">آخر مرة في النص ده: <b>${AR_NUM(Math.round(r.last.w))}</b> ك/د، ${d>0?`<span class="up">أسرع بـ ${AR_NUM(d)}</span>`:d<0?`أبطأ بـ ${AR_NUM(-d)}`:"نفس السرعة"}</div>`;})():""}
      ${r.isPB?`<div class="newpb">رقم قياسي جديد ليك${r.prev?` (كان ${AR_NUM(r.prev.wpm)})`:""}</div>`:""}
    </div>
    <div class="chartbox"><canvas id="chart" aria-label="السرعة على مدار الاختبار" role="img"></canvas></div>
    <div class="small">
      <div><div class="stat"><div class="lbl">السرعة الخام</div></div><div class="v">${AR_NUM(Math.round(r.raw))}</div></div>
      <div><div class="stat"><div class="lbl">الحروف: صح / غلط / زيادة / ناقصة</div></div><div class="v">${AR_NUM(r.c)} <i>/</i> ${AR_NUM(r.b)} <i>/</i> ${AR_NUM(r.x)} <i>/</i> ${AR_NUM(r.m)}</div></div>
      <div><div class="stat"><div class="lbl">الوقت</div></div><div class="v">${AR_NUM(Math.round(r.el))} <i>ث</i></div></div>
      <div><div class="stat"><div class="lbl">الاختبار</div></div><div class="v" style="font-size:16px">${modeLabel()}</div></div>
    </div>
    ${q}
    ${(getHist().length%5===0&&getHist().length>0)?'<div class="supline">عجبك طقطقة؟ <button type="button" id="b-sup">ادعمه بمشاركة أو نجمة</button></div>':""}
    <div class="actions">
      <button type="button" class="primary" id="b-new">النص اللي بعده<kbd>Tab</kbd></button>
      <button type="button" class="shareact" id="b-share">شارك نتيجتك</button>
      <button type="button" id="b-same">نفس النص تاني<kbd>Esc</kbd></button>
      <button type="button" id="b-prev">اللي قبله<kbd>Shift+Tab</kbd></button>
      ${curQuote()?'<button type="button" class="favact" id="b-fav"></button>':""}
    </div>`;
  T.result=r;
  $("b-new").onclick=()=>go(1);
  $("b-share").onclick=()=>shareResult(r);
  $("b-same").onclick=()=>go(0);
  $("b-prev").onclick=()=>go(-1);
  if($("b-fav")){ $("b-fav").onclick=()=>toggleFav(curQuote()); paintFav(); }
  if($("b-sup")) $("b-sup").onclick=()=>window.openSupport&&window.openSupport();
  drawChart(); showPB();
}
/* ============ شارك نتيجتك ============ */
/* صورة ١٠٨٠×١٣٥٠ بألوان الثيم الحالي: السرعة والدقة والنص اللي اتكتب */
async function resultCard(r){
  const W=1080,H=1350,P=96, c=document.createElement("canvas"); c.width=W; c.height=H;
  const x=c.getContext("2d"), bg=tok("--bg"), fg=tok("--fg"), sub=tok("--sub"), acc=tok("--accent"), panel=tok("--panel");
  const disp='"TQ Display", serif', sans='"TQ Sans", sans-serif';
  try{ await Promise.all([document.fonts.load('700 72px "TQ Display"'),document.fonts.load('500 72px "TQ Sans"'),document.fonts.load('400 40px "TQ Sans"')]); }catch(e){}
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  x.direction="rtl"; x.textAlign="right"; x.textBaseline="alphabetic";
  const R=W-P;
  /* اللوجو */
  x.font=`700 76px ${disp}`; x.fillStyle=fg; x.fillText("طقطقة",R,P+70);
  const lw=x.measureText("طقطقة").width; x.fillStyle=acc; x.fillText(".",R-lw,P+70);
  /* السرعة */
  x.font=`500 300px ${sans}`; x.fillStyle=acc; x.fillText(AR_NUM(Math.round(r.wpm)),R,P+400);
  x.font=`400 46px ${sans}`; x.fillStyle=sub; x.fillText("كلمة في الدقيقة",R,P+475);
  /* الدقة والوقت والاختبار */
  x.font=`500 40px ${sans}`; x.fillStyle=fg;
  const facts=[`الدقة ${AR_NUM(Math.round(r.acc))}٪`,`${AR_NUM(Math.round(r.el))} ثانية`];
  if(r.isPB) facts.push("رقم قياسي جديد");
  x.fillText(facts.join("  ،   "),R,P+560);
  /* النص */
  const q=T.quote||curQuote();
  let y=P+680;
  if(q){
    const words=clean(q.t,q.tk).split(" "), maxW=W-P*2-40, lines=[]; let line="";
    x.font=`400 44px ${sans}`;
    for(const w of words){ const t=line?line+" "+w:w; if(x.measureText(t).width>maxW&&line){ lines.push(line); line=w; } else line=t; }
    if(line) lines.push(line);
    const shown=lines.slice(0,6); if(lines.length>6) shown[5]=shown[5].replace(/\s*\S+$/,"")+"…";
    x.fillStyle=acc; x.fillRect(R-6,y-44,6,shown.length*70+66);
    x.fillStyle=fg; shown.forEach((l,i)=>x.fillText(l,R-36,y+i*70));
    x.font=`400 32px ${sans}`; x.fillStyle=sub; x.fillText("— "+q.s,R-36,y+shown.length*70+12);
  }
  /* الدعوة */
  x.fillStyle=panel; const by=H-P-110; x.beginPath(); x.roundRect?x.roundRect(P,by,W-P*2,110,24):x.rect(P,by,W-P*2,110); x.fill();
  x.font=`500 42px ${sans}`; x.fillStyle=fg; x.textAlign="center"; x.fillText("جرّب تسبقني على taqtaqa.com",W/2,by+70);
  return new Promise(res=>c.toBlob(res,"image/png"));
}
async function shareResult(r){
  const b=$("b-share"); b.disabled=true;
  try{
    const blob=await resultCard(r), file=new File([blob],"taqtaqa.png",{type:"image/png"});
    const text=`كتبت ${AR_NUM(Math.round(r.wpm))} كلمة في الدقيقة على طقطقة. جرّب تسبقني`;
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file],text:text+": https://taqtaqa.com"}); }catch(e){ if(e&&e.name!=="AbortError") throw e; }
    }else{
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="taqtaqa.png"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      toast("اتنزلت صورة نتيجتك. شاركها مع أصحابك.");
    }
  }catch(e){ toast("ما قدرناش نعمل الصورة. جرّب تاني."); }
  b.disabled=false;
}
function tok(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
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
window.addEventListener("resize",()=>{ if(!$("history").hidden){ const a=getHist(); const f=hFilter==="all"?a:a.filter(h=>h.mode===hFilter); if(f.length) drawHist(f.slice(-100)); } else if(T&&T.done) drawChart(); else if(T) refresh(); });

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
  ]
};
let KMAP={};
function buildKb(){
  const L=LAYOUTS[cfg.layout]||LAYOUTS.pc; KMAP={};
  const key=(code,b,s)=>{
    const lat=LAT[code]&&code!=="Backquote"?`<span class="lat">${LAT[code]}</span>`:"";
    if(b&&!(b in KMAP)) KMAP[b]={code,shift:false};
    if(s&&!(s in KMAP)) KMAP[s]={code,shift:true};
    return `<div class="k" data-code="${code}">${lat}${s?`<span class="sh">${esc(s)}</span>`:""}${esc(b)}</div>`;
  };
  const fn=(code,label)=>`<div class="k" data-code="${code}"><span class="fn">${label}</span></div>`;
  let h="";
  h+=`<div class="row r0">${CODES[0].map((c,i)=>key(c,L[0][i][0],L[0][i][1])).join("")}${fn("Backspace","⌫")}</div>`;
  h+=`<div class="row r1">${fn("Tab","Tab")}${CODES[1].map((c,i)=>key(c,L[1][i][0],L[1][i][1])).join("")}</div>`;
  h+=`<div class="row r2">${fn("CapsLock","Caps")}${CODES[2].map((c,i)=>key(c,L[2][i][0],L[2][i][1])).join("")}${fn("Enter","Enter")}</div>`;
  h+=`<div class="row r3">${fn("ShiftLeft","Shift")}${CODES[3].map((c,i)=>key(c,L[3][i][0],L[3][i][1])).join("")}${fn("ShiftRight","Shift")}</div>`;
  h+=`<div class="row r4">${fn("AltLeft",cfg.layout==="mac"?"⌥":"Alt")}${fn("Space","مسافة")}${fn("AltRight",cfg.layout==="mac"?"⌥":"Alt")}</div>`;
  $("kb").innerHTML=h;
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
function prettyName(n){return AR_THEME[n]||n.replace(/_/g," ");}
function applyTheme(name){
  const root=document.documentElement.style;
  const t=THEMES.find(x=>x[0]===name);
  if(!t){ VARS.forEach(v=>root.removeProperty(v)); root.removeProperty("color-scheme"); try{localStorage.setItem("tq-tv","false");}catch(e){} }
  else{
    const [bg,main,car,sub,subAlt,text,err,errX]=t[2];
    const set={"--bg":bg,"--panel":subAlt,"--fg":text,"--sub":sub,"--dim":sub,"--accent":main,"--caret":car,"--accent-soft":main+"24",
      "--err":err,"--err-dim":errX,"--line":subAlt,"--key":subAlt,"--key-fg":text,"--key-edge":t[1]?"rgba(0,0,0,.45)":sub+"80","--scrim":"rgba(0,0,0,.5)"};
    for(const k in set) root.setProperty(k,set[k]);
    root.setProperty("color-scheme",t[1]?"dark":"light");
    try{localStorage.setItem("tq-tv",JSON.stringify({v:set,cs:t[1]?"dark":"light"}));}catch(e){}
  }
  const nm=prettyName(t?name:"taqtaqa");
  $("tname").textContent=nm; $("themebtn").title="الثيم: "+nm; $("themebtn").setAttribute("aria-label","الثيمات، الحالي "+nm);
  $("tdots").innerHTML=(t?[t[2][1],t[2][3],t[2][5]]:["var(--accent)","var(--sub)","var(--fg)"]).map(c=>`<i style="background:${c}"></i>`).join("");
  if(T&&T.done) drawChart(); else if(T) refresh();
}
function renderThemes(){
  const raw=$("tsearch").value.trim().toLowerCase(), q=raw.replace(/\s+/g,"_");
  const list=THEMES.filter(t=>(cfg.tfilter==="all"||(cfg.tfilter==="dark")===t[1])&&(!q||t[0].includes(q)||prettyName(t[0]).includes(raw))).sort((a,b)=>prettyName(a[0]).localeCompare(prettyName(b[0]),"ar"));
  const def=(!q&&cfg.tfilter!=="light")?`<button type="button" class="tcard${cfg.theme==="taqtaqa"?" cur":""}" data-name="taqtaqa" title="taqtaqa" style="background:#121b1b;color:#e8e2d3"><span>طقطقة</span><span class="dots"><i style="background:#e2aa3f"></i><i style="background:#5d6c69"></i><i style="background:#e8e2d3"></i></span></button>`:"";
  $("tgrid").innerHTML=def+list.map(t=>{const c=t[2];return `<button type="button" class="tcard${cfg.theme===t[0]?" cur":""}" data-name="${t[0]}" title="${t[0].replace(/_/g," ")}" style="background:${c[0]};color:${c[5]}"><span>${prettyName(t[0])}</span><span class="dots"><i style="background:${c[1]}"></i><i style="background:${c[3]}"></i><i style="background:${c[5]}"></i></span></button>`;}).join("");
  $("tcount").textContent=AR_NUM(list.length)+" ثيم، عدّي بالماوس عشان تشوفه قبل ما تختار";
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
  L.innerHTML=`آخر مرة: <b>${AR_NUM(Math.round(l.w))}</b> ك/د، ${AR_NUM(l.a)}٪`;
  L.title=cfg.pace?"المؤشر الرمادي ماشي بسرعتك آخر مرة. حاول تسبقه.":"تقدر تشغّل «مؤشر آخر مرة» من الإعدادات";
}
let ghostRAF=0;
function ghostOn(){ return !!(cfg.pace&&T&&T.last&&T.last.w>0&&!T.done); }
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
    const r=w.getBoundingClientRect(); let x=r.right+1;
    if(n>0){ const cr=charRect(w,Math.min(n,T.words[i].length)-1); if(cr) x=cr.left-1; }
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
  if(a.some(f=>favKey(f.t)===k)){ a=a.filter(f=>favKey(f.t)!==k); toast("اتشال من مفضلتك"); }
  else { const o={t:q.t,s:q.s,at:Date.now()}; if(q.tk) o.tk=true; a.push(o); toast("اتحفظ في مفضلتك. هتلاقيه في «مفضلتي»."); }
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
  $("src").textContent=q?("— "+q.s):"";
  paintFav();
}
function paintFav(){
  const q=curQuote(), on=isFav(q);
  const fb=$("favbtn");
  if(fb){ fb.hidden=!q; fb.classList.toggle("on",on); fb.textContent=on?"★ محفوظ":"☆ احفظ"; fb.title=on?"شيله من مفضلتي":"احفظ النص ده في مفضلتي"; fb.setAttribute("aria-pressed",on); }
  const rb=$("b-fav");
  if(rb){ rb.classList.toggle("on",on); rb.textContent=on?"★ في مفضلتك":"☆ احفظ في مفضلتي"; }
}
$("favbtn").addEventListener("mousedown",e=>e.preventDefault());
$("favbtn").addEventListener("click",()=>toggleFav(curQuote()));

/* ============ التاريخ ============ */
const HKEY="tq-history", HMAX=2000;
function getHist(){try{const a=JSON.parse(localStorage.getItem(HKEY)||"[]");return Array.isArray(a)?a:[];}catch(e){return [];}}
function setHist(a){try{localStorage.setItem(HKEY,JSON.stringify(a.slice(-HMAX)));return true;}catch(e){return false;}}
function addHist(r){
  const a=getHist();
  a.push({v:1,t:Date.now(),wpm:+r.wpm.toFixed(1),raw:+r.raw.toFixed(1),acc:+r.acc.toFixed(1),el:+r.el.toFixed(1),
    c:r.c,b:r.b,x:r.x,m:r.m,mode:cfg.mode,n:cfg.mode==="time"?cfg.time:cfg.mode==="words"?cfg.words:cfg.qlen,src:cfg.src,
    q:T.quote?T.quote.s:null,label:modeLabel()});
  setHist(a);
  try{window.dispatchEvent(new CustomEvent("tq:result",{detail:a[a.length-1]}));}catch(e){}
}
function avgLast(a,k,f){const s=a.slice(-k);return s.length?s.reduce((x,y)=>x+y[f],0)/s.length:0;}
let hFilter="all", hShown=30, hArmed=false;
function openHistory(){
  if(T&&T.timer&&!T.done){clearInterval(T.timer);}
  setTyping(false);
  $("stage").hidden=true; $("results").hidden=true; $("history").hidden=false; $("kbwrap").hidden=true;
  hShown=30; hArmed=false; renderHistory(); ti.blur(); window.scrollTo(0,0);
}
function closeHistory(){ $("history").hidden=true; $("kbwrap").hidden=!cfg.kb; go(0); }
function fmtDate(t){
  try{return new Date(t).toLocaleString("ar-EG",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});}catch(e){return new Date(t).toISOString().slice(0,16);}
}
function renderHistory(){
  const all=getHist(), B=$("hbody");
  if(!all.length){ B.innerHTML=`<div class="hempty">لسه مفيش اختبارات. خلّص أول اختبار وهيظهر هنا.</div>`; return; }
  const a=hFilter==="all"?all:all.filter(h=>h.mode===hFilter);
  const best=a.reduce((m,h)=>h.wpm>m.wpm?h:m,{wpm:0});
  const mins=a.reduce((s,h)=>s+h.el,0)/60;
  const pbKeys={}; a.forEach((h,i)=>{const k=h.mode+"|"+h.n+"|"+h.src; if(!pbKeys[k]||h.wpm>a[pbKeys[k]].wpm) pbKeys[k]=i;});
  const pbIdx=new Set(Object.values(pbKeys));
  const rows=a.map((h,i)=>({h,i})).reverse().slice(0,hShown);
  B.innerHTML=`
    <div class="hbar">
      <div class="seg" id="hfilter">
        <button type="button" data-v="all">الكل</button><button type="button" data-v="time">وقت</button><button type="button" data-v="words">عدد كلمات</button><button type="button" data-v="quote">اقتباس</button>
      </div>
    </div>
    ${a.length?`
    <div class="hstats">
      <div><div class="v">${AR_NUM(a.length)}</div><div class="lbl">اختبار</div></div>
      <div><div class="v">${AR_NUM(Math.round(best.wpm))} <small>ك/د</small></div><div class="lbl">أحسن سرعة</div></div>
      <div><div class="v">${AR_NUM(Math.round(avgLast(a,10,"wpm")))} <small>ك/د</small></div><div class="lbl">متوسط آخر ١٠</div></div>
      <div><div class="v">${AR_NUM(Math.round(avgLast(a,10,"acc")))}٪</div><div class="lbl">دقة آخر ١٠</div></div>
      <div><div class="v">${AR_NUM(mins<60?Math.round(mins):+(mins/60).toFixed(1))} <small>${mins<60?"دقيقة":"ساعة"}</small></div><div class="lbl">وقت الكتابة</div></div>
    </div>
    <div>
      <canvas id="hchart" role="img" aria-label="السرعة في كل اختبار"></canvas>
      <div class="hlegend"><span style="--c:var(--sub)">كل اختبار</span><span style="--c:var(--accent)">متوسط آخر ١٠</span></div>
    </div>
    <div class="htable-wrap"><table class="htable">
      <thead><tr><th>الوقت</th><th>السرعة</th><th>الدقة</th><th>الخام</th><th>الاختبار</th><th>المدة</th><th>النص</th></tr></thead>
      <tbody>${rows.map(({h,i})=>`<tr class="${pbIdx.has(i)?"hpb":""}"><td>${fmtDate(h.t)}</td><td class="w">${AR_NUM(Math.round(h.wpm))}</td><td>${AR_NUM(Math.round(h.acc))}٪</td><td>${AR_NUM(Math.round(h.raw))}</td><td>${h.label||""}</td><td>${AR_NUM(Math.round(h.el))} ث</td><td class="q">${h.q?esc2(h.q):""}</td></tr>`).join("")}</tbody>
    </table></div>`:`<div class="hempty">مفيش اختبارات من النوع ده لسه.</div>`}
    <div class="hfoot">
      ${a.length>hShown?`<button type="button" id="hmore">اعرض ٣٠ كمان</button>`:"<span></span>"}
      <button type="button" class="danger${hArmed?" armed":""}" id="hclear">${hArmed?"متأكد؟ اضغط تاني عشان تمسح كل التاريخ":"امسح التاريخ"}</button>
    </div>`;
  document.querySelectorAll("#hfilter button").forEach(b=>b.classList.toggle("on",b.dataset.v===hFilter));
  $("hfilter").onclick=e=>{const b=e.target.closest("button");if(!b)return;hFilter=b.dataset.v;hShown=30;renderHistory();};
  if($("hmore")) $("hmore").onclick=()=>{hShown+=30;renderHistory();};
  $("hclear").onclick=()=>{ if(!hArmed){hArmed=true;renderHistory();return;} setHist([]); try{localStorage.removeItem("tq-pb");}catch(e){} hArmed=false; renderHistory(); showPB(); try{window.dispatchEvent(new Event("tq:clear"));}catch(e){} };
  if(a.length) drawHist(a.slice(-100));
}
function esc2(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
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
  $("fontbtn").textContent=f?f[1]:"ثمانية";
}
function renderFontMenu(){
  if(!fontAvail) fontAvail=detectFonts();
  const M=$("fontmenu"); let h="";
  [["site"],["mac","win"]].forEach(gs=>{
    const list=FONTS.filter(f=>gs.includes(f[3])&&fontAvail.has(f[0]));
    if(!list.length) return;
    h+=`<h4>${gs[0]==="site"?"خطوط الموقع":"خطوط على جهازك"}</h4>`;
    h+=list.map(([id,ar])=>`<button type="button" role="menuitemradio" aria-checked="${cfg.tfont===id}" class="fopt${cfg.tfont===id?" on":""}" data-id="${esc2(id)}"><span class="smp" style="font-family:${esc2(fontStack(id))}">${ar}</span><span class="nm">${gs[0]==="site"?"":esc2(id)}</span></button>`).join("");
  });
  h+=`<div class="fnote">بيظهر هنا بس الخطوط المتسطّبة على جهازك. الخط بيتغيّر في النص اللي بتكتبه بس.</div>`;
  M.innerHTML=h;
}
function placeFontMenu(){
  const r=$("fontbtn").getBoundingClientRect(), M=$("fontmenu"), mw=M.offsetWidth, vw=document.documentElement.clientWidth;
  M.style.top=(r.bottom+6)+"px";
  M.style.left=Math.max(16,Math.min(r.right-mw,vw-mw-16))+"px";
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
window.addEventListener("resize",()=>{ if(!$("fontmenu").hidden) placeFontMenu(); });
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
window.addEventListener("resize",()=>{ if(!$("setmenu").hidden) placeSetMenu(); });
window.addEventListener("scroll",()=>{ if(!$("setmenu").hidden) placeSetMenu(); },{passive:true});

/* ============ ادعم طقطقة ============ */
(function(){
  const SITE="https://taqtaqa.com", REPO="https://github.com/GhofranSalem/taqtaqa";
  const msg="اتمرن على الكتابة بالعربي على أمثال مصرية وجمل من الأفلام: "+SITE;
  const enc=encodeURIComponent;
  $("swa").href="https://wa.me/?text="+enc(msg);
  $("stg").href="https://t.me/share/url?url="+enc(SITE)+"&text="+enc("اتمرن على الكتابة بالعربي على أمثال مصرية وجمل من الأفلام");
  $("sx").href="https://x.com/intent/post?text="+enc(msg);
  /* فورم الرسايل: بيتبعت للـ Worker، واللي بيبعته إيميل */
  const onSite=/(^|\.)taqtaqa\.com$|\.workers\.dev$/.test(location.hostname);
  let ftype="suggest";
  document.querySelectorAll("#fbform [data-ft]").forEach(b=>b.onclick=()=>{
    ftype=b.dataset.ft;
    document.querySelectorAll("#fbform [data-ft]").forEach(x=>{ const on=x===b; x.classList.toggle("on",on); x.setAttribute("aria-checked",on); });
    $("fbtext").placeholder={suggest:"المثل أو الجملة، ومصدرها لو تعرفه…",bug:"إيه الغلطة؟ ولو في نص، اكتبه زي ما ظاهر وإزاي المفروض يبقى…",note:"اكتب رأيك…"}[ftype];
    $("fbtext").focus();
  });
  $("fbtext").placeholder="المثل أو الجملة، ومصدرها لو تعرفه…";
  $("mailcopy").onclick=async()=>{ const b=$("mailcopy"); try{ await navigator.clipboard.writeText("hello@taqtaqa.com"); b.textContent="اتنسخ ✓"; }catch(e){ b.textContent="hello@taqtaqa.com"; } setTimeout(()=>b.textContent="انسخ",2000); };
  if(!onSite){ $("fbsend").disabled=true; $("fbmsg").textContent="الفورم شغال على taqtaqa.com"; }
  $("fbform").addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=$("fbmsg"), btn=$("fbsend"), text=$("fbtext").value.trim();
    msg.className="fbmsg";
    if(text.length<3){ msg.className="fbmsg err"; msg.textContent="اكتب رسالتك الأول."; $("fbtext").focus(); return; }
    btn.disabled=true; msg.textContent="بيتبعت…";
    const page=(T&&T.words)?T.words.slice(0,40).join(" "):"";
    try{
      const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:ftype,text,contact:$("fbcontact").value.trim(),page,website:$("fbsite").value})});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){ msg.className="fbmsg ok"; msg.textContent="وصلت، شكرا ليك ✓"; $("fbtext").value=""; }
      else{ msg.className="fbmsg err"; msg.textContent="ما وصلتش. جرّب تاني بعد شوية."; }
    }catch(_){ msg.className="fbmsg err"; msg.textContent="مفيش نت. جرّب تاني."; }
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
    if(navigator.share){ try{ await navigator.share({title:"طقطقة",text:"اتمرن على الكتابة بالعربي",url:SITE}); return; }catch(e){ if(e&&e.name==="AbortError") return; } }
    try{ await navigator.clipboard.writeText(SITE); b.textContent="اتنسخ ✓"; }
    catch(e){ const t=document.createElement("textarea"); t.value=SITE; document.body.appendChild(t); t.select(); try{document.execCommand("copy"); b.textContent="اتنسخ ✓";}catch(_){ b.textContent=SITE; } t.remove(); }
    setTimeout(()=>{ b.textContent="انسخ اللينك"; },2000);
  };
  $("supbtn").onclick=window.openSupport;
})();

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
  document.querySelectorAll("#g-qlen button").forEach(b=>{ const v=b.dataset.v; if(v!=="all"){ b.disabled=!counts[v]; b.title=counts[v]?AR_NUM(counts[v])+" نص":"مفيش نصوص بالطول ده هنا"; } b.classList.toggle("on",cfg.qlen===v); });
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
  if(g){ const k=g.dataset.k; cfg[k]=(k==="time"||k==="words")?+b.dataset.v:b.dataset.v; }
  else if(b.dataset.t){ cfg[b.dataset.t]=!cfg[b.dataset.t]; }
  saveCfg(); syncConfig(); b.blur();
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

/* ============ اختصارات هتساعدك تبقى سريع ============ */
/* [الوصف، توضيح صغير، مفاتيح ويندوز، مفاتيح ماك] */
const SHORTCUTS=[
  ["وانت بتكتب",[
    ["امسح الكلمة كلها","ولو الكلمة اللي قبلها فيها غلط، بيرجعك ليها",["Ctrl","⌫"],["⌥ Option","⌫"]],
    ["بدّل بين العربي والإنجليزي","",["Alt","Shift"],["Ctrl","Space"],"أو Win+Space","أو زرار 🌐 لوحده"],
    ["اتنقل كلمة كلمة","في أي برنامج تاني",["Ctrl","← →"],["⌥ Option","← →"]],
    ["حدد كلمة كلمة","",["Ctrl","Shift","← →"],["⌥ Option","Shift","← →"]],
    ["تراجع عن آخر حاجة","",["Ctrl","Z"],["⌘ Cmd","Z"]]
  ]],
  ["في طقطقة",[
    ["النص اللي بعده","",["Tab"],["Tab"]],
    ["النص اللي قبله","",["Shift","Tab"],["Shift","Tab"]],
    ["ابدأ نفس النص من الأول","",["Esc"],["Esc"]],
    ["الثيمات","",["Ctrl","Shift","P"],["⌘ Cmd","Shift","P"]]
  ]]
];
function renderShortcuts(){
  const os=cfg.os==="mac"?"mac":"win";
  $("sclist").innerHTML=SHORTCUTS.map(([g,rows])=>`<div><h3>${g}</h3>${rows.map(([t,n,w,m,nw,nm])=>{ const note=n||(os==="mac"?nm:nw)||""; return `<div class="scrow"><span>${t}${note?`<small>${note}</small>`:""}</span><span class="ks">${(os==="mac"?m:w).map(k=>`<kbd>${esc2(k)}</kbd>`).join("+")}</span></div>`; }).join("")}</div>`).join("");
  document.querySelectorAll("#g-os button").forEach(b=>{ const on=b.dataset.v===os; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); });
}
$("g-os").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; cfg.os=b.dataset.v; saveCfg(); renderShortcuts(); b.blur(); });

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
      toast(add.length?`اتنقل تاريخك: ${AR_NUM(add.length)} اختبار`:"تاريخك موجود هنا بالفعل");
      showPB();
    }catch(e){ toast("ما قدرناش ننقل التاريخ. جرّب تاني من اللينك القديم."); }
    try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){ location.hash=""; }
  }
}

/* ============ جولة التعريف (أول مرة بس) ============ */
const TOUR=[
  {sel:null,t:"أهلا بيك في طقطقة",b:"موقع تتمرن فيه على الكتابة بالعربي على أمثال مصرية، وجمل من الأفلام، وحواديت، وشعر. خلينا نوريك الموقع في دقيقة."},
  {sel:"#slab",t:"اكتب اللي قدامك",b:'ابدأ اكتب على طول، والوقت بيبدأ مع أول حرف. الحرف الصح بيبقى أبيض، والغلط أحمر. <span class="k2">مسافة</span> بتنقلك للكلمة اللي بعدها، و<span class="k2">⌫</span> بيمسح.'},
  {sel:'.config .group[data-k="src"]',t:"اختار النصوص",b:"أمثال مصرية وسعودية، كلام مصري، أفلام، حواديت، حكم، شعر، أو «مكس» من كله. و«كلمات» بيجيبلك كلمات لوحدها. "},
  {sel:"#favhbtn",t:"مفضلتي",b:"النصوص اللي حفظتها بزرار «احفظ» اللي تحت النص. دوس عليه عشان تكتب منها، ودوس تاني عشان ترجع."},
  {sel:'.config .group[data-k="mode"]',t:"اختار طريقة الاختبار",b:"<b>وقت:</b> اكتب أكتر ما تقدر في عدد ثواني.<br><b>عدد كلمات:</b> خلّص عدد كلمات معين.<br><b>اقتباس:</b> نص واحد كامل من أوله لآخره."},
  {sel:()=>["#g-time","#g-words","#g-qlen"].map(s=>$(s.slice(1))).find(e=>e&&!e.hidden),t:"اختار المدة أو الطول",b:"هنا بتحدد عدد الثواني، أو عدد الكلمات، أو طول الاقتباس، على حسب الطريقة اللي اخترتها."},
  {sel:"#setbtn",t:"الإعدادات",b:"<ul><li><b>التشكيل:</b> كل النصوص بتظهر بحركات بسيطة ولازم تكتبها.</li><li><b>تساهل في الهمزات:</b> أ وإ وآ بتتحسب ا.</li><li><b>علامات الترقيم</b> و<b>الكيبورد</b>.</li><li><b>خط النص</b> و<b>حجمه</b>.</li></ul>"},
  {sel:"#kbwrap",t:"الكيبورد اللي على الشاشة",b:"الزرار اللي عليك تدوسه بيتلوّن، ولو محتاج Shift بينوّره كمان. ومن فوقه تختار ترتيب ويندوز أو ماك."},
  {sel:"#histbtn",t:"تاريخك",b:"كل اختبار بيتحفظ هنا بسرعتك ودقتك، ومعاه رسمة بتوضح بتتحسن ازاي."},
  {sel:"#themebtn",t:"الثيمات",b:'أكتر من ١٠٠ ثيم، غامق وفاتح. تقدر تفتحها كمان بـ <span class="k2">Ctrl</span>+<span class="k2">Shift</span>+<span class="k2">P</span>.'},
  {sel:null,t:"اختصارات هتحتاجها",b:'<span class="k2">Tab</span> النص اللي بعده<br><span class="k2">Shift</span>+<span class="k2">Tab</span> النص اللي قبله<br><span class="k2">Esc</span> تعيد نفس النص<br><span class="k2">Ctrl</span>+<span class="k2">⌫</span> تمسح الكلمة كلها (على ماك <span class="k2">⌥</span>+<span class="k2">⌫</span>)<br><br>وكل الاختصارات اللي هتساعدك تبقى سريع، لويندوز وماك، تحت في آخر الصفحة.<br><br>ولو حبيت تشوف الشرح ده تاني، اضغط «شرح الموقع» فوق.',last:true}
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
    root=document.createElement("div"); root.id="tour"; root.className="tour"; root.setAttribute("role","dialog"); root.setAttribute("aria-modal","true"); root.setAttribute("aria-label","شرح الموقع");
    root.innerHTML='<div class="tblock"></div><div class="spot"></div><div class="tcardx" dir="rtl"></div>';
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
  card.innerHTML=`<div class="tstep">${AR_NUM(tourI+1)} من ${AR_NUM(n)}</div><h3>${st.t}</h3><p>${st.b}</p>
    <div class="tbtns">${st.last?"":'<button type="button" class="skip" data-a="skip">تخطّي</button>'}<span class="sp"></span>
    <div class="tdots">${tourSteps.map((_,i)=>`<i class="${i===tourI?"on":""}"></i>`).join("")}</div><span class="sp"></span>
    ${tourI>0?'<button type="button" data-a="prev">السابق</button>':""}
    <button type="button" class="pri" data-a="next">${st.last?"يلا نبدأ":"التالي"}</button></div>`;
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
  let left=r.right-cw; left=Math.max(16,Math.min(left,vw-cw-16));
  card.style.top=Math.round(top)+"px"; card.style.left=Math.round(left)+"px";
}
function tourNav(a){
  if(a==="next"){ if(tourI>=tourSteps.length-1) endTour(); else { tourI++; showTourStep(); } }
  else if(a==="prev"){ if(tourI>0){ tourI--; showTourStep(); } }
  else if(a==="skip") endTour();
}
document.addEventListener("click",e=>{ const b=e.target.closest("#tour [data-a]"); if(b) tourNav(b.dataset.a); });
window.addEventListener("resize",()=>{ if(tourOpen()) placeTour(tourTarget(tourSteps[tourI])); });
$("helpbtn").onclick=startTour;
$("logo").addEventListener("click",e=>{ e.preventDefault(); location.reload(); });
/* «عن طقطقة»: بيفتح لو اللينك فيه #about، وبينزل عليه لما يتفتح */
(function(){ const d=$("about"); if(!d) return;
  if(location.hash==="#about") d.open=true;
  d.addEventListener("toggle",()=>{ if(d.open) setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),30); });
})();
/* ============ زرار «مفضلتي» في الهيدر ============ */
function paintFavHead(){ const b=$("favhbtn"); if(b) b.setAttribute("aria-pressed",cfg.src==="fav"); }
$("favhbtn").addEventListener("click",()=>{
  const b=$("favhbtn"); b.blur();
  if(cfg.src==="fav"){ cfg.src=cfg.prevSrc&&cfg.prevSrc!=="fav"?cfg.prevSrc:"mix"; }
  else{
    if(!getFavs().length){ toast("لسه مفيش نصوص في مفضلتك. دوس «احفظ» تحت أي نص عشان يتحفظ هنا."); return; }
    cfg.prevSrc=cfg.src; cfg.src="fav";
  }
  saveCfg(); syncConfig(); resetHistory();
});
/* ============ كشيدة اللوجو ============ */
/* بنمطّ «طقطقة» بالكشيدة بعد حرفي القاف لحد ما اللوجو يبقى بعرض الجملة اللي تحته، من غير ما يعدّيها */
const LOGO_WORD="طقطقة";
function stretchLogo(){
  const lw=$("logoword"), logo=$("logo"), target=$("tagtext").getBoundingClientRect().width;
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
let stretchT;
window.addEventListener("resize",()=>{ if(document.documentElement.classList.contains("intro")) return; clearTimeout(stretchT); stretchT=setTimeout(stretchLogo,150); });

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

/* ============ البداية ============ */
/* الموقع دايما بيفتح على «اقتباس» في «شعر»، وأول نص قصيدة «ولرُبّ نازلة» للإمام الشافعي */
const OPENING="ولرب نازلة";
function openOnPoem(){
  cfg.mode="quote"; cfg.src="sheer"; cfg.qlen="all"; saveCfg(); syncConfig();
  const qs=allQuotes(), q=qs.find(x=>favKey(x.t).startsWith(OPENING));
  if(!q){ resetHistory(); return; }
  const key="q-sheer-all"; if(!bags[key]) bags[key]=shuffle(qs.filter(x=>x!==q));
  hist=[{words:clean(q.t,q.tk).split(" ").filter(Boolean),quote:q,count:qs.length}]; hpos=0;
  start(hist[0]);
}
if(!cfg.os) cfg.os=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent)?"mac":"win";
applyFont(); buildKb(); applyTheme(cfg.theme); renderShortcuts();
importFromOldLink();
openOnPoem();
(function(){ let seen=null; try{seen=localStorage.getItem("tq-tour");}catch(e){} if(!seen) setTimeout(startTour,450); })();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(T&&!T.done) refresh(); });
playIntro();

/* واجهة صغيرة لـ cloud.js (الحسابات والمزامنة) */
window.TQ={getHist,setHist,getPBs,setPBs,getFavs,setFavs(a){ setFavs(a,true); },getLastRuns,setLastRuns,toast,showPB,refreshHistory(){ if(!$("history").hidden) renderHistory(); showPB(); }};
try{window.dispatchEvent(new Event("tq:ready"));}catch(e){}
})();

/* ============ التشغيل من غير نت ============ */
if("serviceWorker" in navigator && location.protocol==="https:"){
  window.addEventListener("load",()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
}
