/* طقطقة: أول حاجة بتشتغل قبل ما الصفحة تظهر. ملف لوحده بدل كود جوه الصفحة، عشان سياسة الأمان (CSP) تمنع أي كود مش من الموقع */
(function(){
  var h=document.documentElement;
  /* لو اخترت الإنجليزي قبل كده من زرار اللغة، الصفحة العربي بتفتح على الإنجليزي */
  try{ if(h.lang==="ar"&&localStorage.getItem("tq-lang")==="en"&&!/[?&]lang=ar/.test(location.search)){ location.replace("/en/"+location.hash); return; } }catch(e){}
  /* افتتاحية اللوجو: مرة في الجلسة، وبتتلغي لو الجهاز طالب حركة أقل، وبتتشال لوحدها لو حصل أي خطأ */
  try{ var seen=false; try{seen=sessionStorage.getItem("tq-intro")==="1";}catch(e){}
    if(!seen&&!matchMedia("(prefers-reduced-motion: reduce)").matches){ h.classList.add("intro"); setTimeout(function(){h.classList.remove("intro");},4000); } }catch(e){}
  /* بيطبّق الثيم قبل ما الصفحة تظهر، عشان ما يبانش الثيم القديم لحظة */
  var d=null; try{d=JSON.parse(localStorage.getItem("tq-tv")||"null");}catch(e){}
  if(d===null) d={v:{"--bg":"#101010","--panel":"#1c1c1c","--fg":"#ffffff","--sub":"#a0a0a0","--dim":"#a0a0a0","--accent":"#ffc799","--caret":"#99ffe4","--accent-soft":"#ffc79924","--err":"#ff8080","--err-dim":"#b25959","--line":"#1c1c1c","--key":"#1c1c1c","--key-fg":"#ffffff","--key-edge":"rgba(0,0,0,.45)","--scrim":"rgba(0,0,0,.5)"},cs:"dark"};
  if(d&&d.v){ var r=h.style; for(var k in d.v) if(/^--[\w-]+$/.test(k)) r.setProperty(k,String(d.v[k])); r.setProperty("color-scheme",d.cs==="light"?"light":"dark"); }
})();
