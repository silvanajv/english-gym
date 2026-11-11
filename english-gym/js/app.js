/*
 * English Gym · Lógica de la app: diccionario, corrector, modelo de errores, sesiones, vistas y eventos.
 * Carga después de los archivos en js/data/.
 */
/* ============================== DICTIONARY + SPELLING (no AI) ============================== */
const DICT={st:"idle",rank:null,valid:null};
function loadDict(){
  if(DICT.st!=="idle")return DICT.p;DICT.st="loading";
  const get=f=>fetch("data/"+f).then(r=>{if(!r.ok)throw new Error("http "+f);return r.text()});
  return DICT.p=Promise.all(["words-ranked.txt","words-valid-1.txt","words-valid-2.txt","words-valid-3.txt","words-valid-4.txt"].map(get)).then(parts=>{
    const ranked=parts[0].split("\n"),rest=parts.slice(1).join("\n").split("\n");
    DICT.names=new Set();DICT.list=ranked.map(w=>{if(w.endsWith("*")){w=w.slice(0,-1);DICT.names.add(w)}return w});DICT.rank=new Map();DICT.list.forEach((w,i)=>DICT.rank.set(w,i+1));DICT.valid=new Set(rest);DICT.st="ready";
    ["lab","session"].forEach(c=>{if(document.getElementById("draft-"+c))refreshEditor(c)});
  }).catch(e=>{DICT.st="error";["lab","session"].forEach(c=>{const el=$("#score-"+c);if(el)refreshEditor(c)});throw e});
}
function known(w){
  w=lo(w).replace(/[’]/g,"'").replace(/'s$/,"");
  if(!w)return true;
  return DICT.rank.has(w)||DICT.valid.has(w)||(state.dict||[]).includes(w);
}
function wRank(w){return DICT.rank.get(lo(w))||null}
const ABC="abcdefghijklmnopqrstuvwxyz";
function edits1(w){const out=new Set();for(let i=0;i<=w.length;i++){const a=w.slice(0,i),b=w.slice(i);
  if(b)out.add(a+b.slice(1));if(b.length>1)out.add(a+b[1]+b[0]+b.slice(2));
  for(const c of ABC){if(b)out.add(a+c+b.slice(1));out.add(a+c+b)}}return out}
function suggest(w){
  w=lo(w);const best=new Map();
  for(const e of edits1(w)){const r=DICT.rank.get(e);if(r)best.set(e,r)}
  if(best.size<2&&w.length<=10){for(const e of edits1(w))for(const e2 of edits1(e)){const r=DICT.rank.get(e2);if(r&&r<30000)best.set(e2,Math.min(best.get(e2)||1e9,r+50000))}}
  return[...best.entries()].sort((a,b)=>a[1]-b[1]).slice(0,3).map(x=>x[0]);
}
function spellIssues(text){
  if(DICT.st!=="ready")return[];
  const out=[],re=/[A-Za-z]+(?:['’][A-Za-z]+)?/g;let m;
  while((m=re.exec(text))){
    const w=m[0],i=m.index;
    if(w.length<2&&w!=="i")continue;
    if(w.length>1&&w===w.toUpperCase())continue;
    const before=text.slice(0,i).replace(/\s+$/,"");
    const sentStart=!before||/[.!?:"“(\n]$/.test(before);
    if(/^[A-Z]/.test(w)&&!sentStart)continue; // proper noun
    if(known(w))continue;
    const sg=suggest(w).map(s=>/^[A-Z]/.test(w)?s.charAt(0).toUpperCase()+s.slice(1):s);
    out.push({start:i,end:i+w.length,w,sg});
  }
  return out;
}

/* ============================== TOPIC LEXICON + SCORE (no AI) ============================== */
const TOPICS={
wr1:"wake alarm breakfast coffee shower dress commute bus train metro walk class schedule morning early prepare routine brush teeth phone email leave arrive minutes usually always".split(" "),
wr2:"abroad exchange culture independence growth personal professional career skills language network experience adapt employers job opportunities international perspective challenges confidence mature university develop global".split(" "),
wr3:"deadline extension assignment request week submit reason appreciate understand apologize inconvenience professor sincerely regards grateful circumstances complete quality schedule additional".split(" "),
wr4:"artificial intelligence tool chatbot students writing writers skills thinking critical creativity feedback grammar depend rely original plagiarism learn essay assist improve argument evidence research".split(" "),
wr5:"problem issue solution solve fix decide try attempt approach step result outcome challenge figure analyze test error team help learned eventually worked".split(" "),
wr6:"proposal idea point concern alternative suggest approach agree disagree budget time risk option consider perhaps team plan reservations benefit instead".split(" "),
wr7:"remote home office flexibility commute productivity isolation communication colleagues balance distractions technology meetings schedule costs collaboration employers employees advantages disadvantages team".split(" "),
wr8:"expected surprised city town people food culture streets weather travel visit trip local different imagined atmosphere buildings market landscape beach mountains".split(" ")
};
function stemOf(w){w=lo(w);return w.length<=4?w:w.slice(0,Math.max(4,w.length-3))}
function topicHits(text,pid){
  const list=TOPICS[pid];if(!list)return null;
  const tk=new Set((lo(text).match(/[a-z]+/g)||[]));const toks=[...tk];
  const hit=list.filter(w=>{const st=stemOf(w);return w.length<=4?(tk.has(w)||tk.has(w+"s")):toks.some(t=>t.startsWith(st))});
  return{hit,miss:list.filter(w=>!hit.includes(w))};
}
const STOPW=new Set("the a an and or but of to in on at for with from by as is are was were be been being it its this that these those i you he she we they me my your our their his her them us do does did have has had not no so if then than there here what which who when where why how all any some can could will would should may might must just also very really more most other such into about over after before up out".split(" "));
function mattr(words,win=30){if(words.length<=win)return words.length?new Set(words).size/words.length:0;let s=0,n=0;for(let i=0;i+win<=words.length;i+=5){s+=new Set(words.slice(i,i+win)).size/win;n++}return s/n}
function scoreText(text,ex){
  const words=(lo(text).match(/[a-z]+(?:'[a-z]+)?/g)||[]),n=words.length;if(n<15)return null;
  const per100=x=>x*100/n,band=(v,cuts)=>{for(let i=0;i<cuts.length;i++)if(v<=cuts[i])return 5-i;return 1};
  const an=analyzeText(text,{formal:ex&&ex.p==="register"});
  const gErr=an.issues.filter(i=>i.kind==="g"||i.kind==="m"||i.kind==="n").length;
  const crit={};
  crit.gram={v:band(per100(gErr),[0,1.5,3,5]),d:`${gErr} posibles errores detectados por reglas`};
  if(DICT.st==="ready"){const sp=spellIssues(text).length;crit.spell={v:band(per100(sp),[0,1.5,3,6]),d:sp?`${sp} palabras fuera del diccionario`:"Sin palabras desconocidas"}}
  const m=textMetrics(text),mt=mattr(words);
  let adv=0,content=0;
  if(DICT.st==="ready")words.forEach(w=>{if(w.length<4||STOPW.has(w))return;content++;const r=wRank(w);if(!r||r>5000)adv++});
  const advPct=content?adv/content*100:0;
  const bankUsed=allWords().filter(wd=>wordRegex(wd).test(text)).length;
  let voc=1+(mt>=.7?1:0)+(mt>=.8?1:0)+(advPct>=8?1:0)+(advPct>=15||bankUsed>=2?1:0)-(m.weak.length>3?1:0);
  crit.vocab={v:clamp(voc,1,5),d:`variedad ${Math.round(mt*100)}%`+(DICT.st==="ready"?` · ${Math.round(advPct)}% palabras poco frecuentes`:"")+(bankUsed?` · ${bankUsed} del Word Bank`:"")};
  let coh=[1,2,3,4,4,5][Math.min(5,m.conns.length)]-((m.avg&&(m.avg<8||m.avg>30))?1:0)-(m.sents<3?1:0);
  crit.coh={v:clamp(coh,1,5),d:`${m.conns.length} conectores distintos · ${m.avg} palabras por oración`};
  const th=ex?topicHits(text,ex.id):null;
  if(th){crit.topic={v:band(-th.hit.length,[-7,-5,-3,-2]),d:th.hit.length?`Usas: ${th.hit.slice(0,8).join(", ")}`:"Casi no hay palabras del tema",sug:th.miss.slice(0,6)}}
  if(ex&&ex.min){const lo2=ex.min,hi=ex.max;crit.len={v:n>=lo2&&n<=hi+15?5:n>=lo2*.8&&n<=hi*1.3?3:1,d:`${n} palabras (meta ${lo2}–${hi})`}}
  const vals=Object.values(crit).map(c=>c.v),avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  const lvl=avg>=4.5?"C1":avg>=3.8?"B2+":avg>=3.1?"B2":avg>=2.4?"B1":"A2";
  return{crit,avg,lvl};
}
const CRIT_N={gram:"Gramática",spell:"Ortografía",vocab:"Vocabulario",coh:"Coherencia",topic:"Tema",len:"Extensión"};
function scoreHTML(text,ex){
  const sc=scoreText(text,ex);
  const dictNote=DICT.st==="loading"?" · cargando diccionario…":DICT.st==="error"?" · diccionario no disponible":"";
  if(!sc)return`<span class="eyebrow">Evaluación del texto${dictNote}</span><p class="muted" style="font-size:.88rem">Aparece cuando tengas al menos 15 palabras. Revisa ortografía con un diccionario de 280 mil palabras, la gramática con las reglas del corrector, la variedad de vocabulario, los conectores y si usas palabras del tema.</p>`;
  return`<div class="row" style="justify-content:space-between"><span class="eyebrow">Evaluación del texto${dictNote}</span><span class="chip acc">≈ ${sc.lvl} · ${sc.avg.toFixed(1)}/5</span></div>
  <div class="stack" style="gap:8px">${Object.entries(sc.crit).map(([k,c])=>`<div class="crit"><span class="cn">${CRIT_N[k]}</span><div class="hbar"><i style="width:${c.v*20}%;background:${c.v>=4?"var(--ok)":c.v>=3?"var(--plate-1)":"var(--bad)"}"></i></div><span class="mono" style="width:30px;text-align:right">${c.v}/5</span><span class="cd muted">${esc(c.d)}${c.sug&&c.v<4?` · Prueba: <i>${esc(c.sug.join(", "))}</i>`:""}</span></div>`).join("")}</div>
  <p class="muted" style="font-size:.8rem">Es una estimación por reglas y estadísticas de texto: detecta errores conocidos y patrones, no entiende el significado. Úsala para comparar tus textos entre sí.</p>`;
}

/* ============================== STATE ============================== */
const LS_KEY="english-gym-state-v1", LS_TEXTS="english-gym-texts-v1";
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
function fresh(){return{v:1,created:Date.now(),updated:0,placed:false,skill:50,startLevel:null,hist:[],xp:0,items:{},pats:{},days:[],sessions:[],ach:{},mistakes:[],custom:[],cands:[],stats:{fixOk:0,revOk:0,spoken:0},plan:null,lang:"auto",lastWrite:{},words:{},customWords:[],coach:{},wpat:{},pron:{},time:{},wotd:null,dict:[],spell:{}}}
let state=Object.assign(fresh(),lsGet(LS_KEY)||{});
let texts=lsGet(LS_TEXTS)||[];
let view=state.placed?"home":"onboard";
let sess=null, place=null, labUI={prompt:null,draft:"",cmpA:null,cmpB:null,ai:null,busy:false}, reviewUI={confirmReset:false,genBusy:false,genErr:"",genPat:null}, toastT;
let cloud={status:"local",db:null,col:null,sample:null};

/* ============================== HELPERS ============================== */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const fmtD=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=()=>fmtD(new Date());
const addDays=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return fmtD(d)};
const daysBetween=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const prettyD=s=>{const d=new Date(s+"T12:00:00");return d.toLocaleDateString("es-MX",{day:"numeric",month:"short"})};
function cefr(sk){let r="A1";for(const [m,n] of BANDS){if(sk>=m&&n)r=n}return r}
function bandProgress(sk){for(let i=0;i<BANDS.length-1;i++){if(sk>=BANDS[i][0]&&sk<BANDS[i+1][0]){return{lo:BANDS[i][0],hi:BANDS[i+1][0],pct:(sk-BANDS[i][0])/(BANDS[i+1][0]-BANDS[i][0]),next:BANDS[i+1][1]}}}return{pct:1,next:""}}
function useEnglish(){return state.lang==="en"||(state.lang==="auto"&&state.skill>=70)}
const L=(es,en)=>useEnglish()?en:es;
function gymLevel(xp){let n=1,need=0;while(true){const step=Math.round(120*Math.pow(n,1.4));if(xp<need+step)return{n,into:xp-need,step};need+=step;n++}}
const EX={};
function indexBank(){for(const k in EX)delete EX[k];BANK.forEach(e=>EX[e.id]=e);(state.custom||[]).forEach(e=>EX[e.id]=e);wordExercises().forEach(e=>EX[e.id]=e)}
indexBank();

function norm(s){
  s=String(s||"").toLowerCase().replace(/[’‘`]/g,"'").replace(/[“”]/g,'"');
  const rep=[[/\bi'm\b/g,"i am"],[/\bwon't\b/g,"will not"],[/\bcan't\b/g,"cannot"],[/\bcannot\b/g,"can not"],[/n't\b/g," not"],[/'ve\b/g," have"],[/'re\b/g," are"],[/'ll\b/g," will"],[/'d\b/g," would"],[/\b(it|that|what|there|he|she|this)'s\b/g,"$1 is"]];
  rep.forEach(([a,b])=>s=s.replace(a,b));
  return s.replace(/[^a-z0-9' -]/g," ").replace(/-/g," ").replace(/\s+/g," ").trim();
}
function matchAny(ans,list){const n=norm(ans);return list.some(x=>norm(x)===n)}

function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}
function blankify(s){return esc(s).replace(/_{3,}/g,'<span class="blank"></span>')}

/* ============================== PERSISTENCE ============================== */
let saving=false,dirty=false,saveT;
function save(){state.updated=Date.now();lsSet(LS_KEY,state);if(cloud.col){clearTimeout(saveT);saveT=setTimeout(flush,1200)}}
async function flush(){if(!cloud.col)return;if(saving){dirty=true;return}saving=true;
  try{await cloud.col.doc("state").set({json:JSON.stringify(state),updated:state.updated});if(cloud.status!=="cloud"){cloud.status="cloud";renderSync()}}
  catch(e){cloud.status="local";renderSync()}
  saving=false;if(dirty){dirty=false;flush()}}
function saveTexts(){lsSet(LS_TEXTS,texts)}
async function cloudText(t,del){if(!cloud.col)return;try{del?await cloud.col.doc(t.id).delete():await cloud.col.doc(t.id).set({kind:"text",json:JSON.stringify(t)})}catch(e){}}
function withTimeout(p,ms){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error("timeout")),ms))])}
async function initCloud(){
  if(!window.claude||!window.claude.use){const d=webDictation();if(d)hookDictation(d);dictCtl.tts=webTTS();renderSync();render();return}
  cloud.status="connecting";renderSync();
  claude.use("dictation").then(d=>{if(d){hookDictation(d);render()}}).catch(()=>{});
  claude.use("tts").then(t=>{if(t){dictCtl.tts=t;render()}}).catch(()=>{});
  try{
    const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);
    if(!db||!user){cloud.status="local";renderSync();return}
    const uid=await user.id(); if(!uid){cloud.status="local";renderSync();return}
    const col=db.collection("data/users/"+uid);
    const snap=await withTimeout(col.get(),10000);
    let remote=null; const rtexts=[];
    snap.docs.forEach(d=>{const v=d.data()||{};try{if(d.id==="state")remote=JSON.parse(v.json);else if(v.kind==="text")rtexts.push(JSON.parse(v.json))}catch(e){}});
    cloud.col=col; cloud.status="cloud";
    if(remote&&(remote.updated||0)>(state.updated||0)){
      if(!sess&&!place){state=Object.assign(fresh(),remote);indexBank();if(view==="onboard"&&state.placed)view="home"}
    } else if(state.placed||state.updated){flush()}
    const ids=new Set(texts.map(t=>t.id));rtexts.forEach(t=>{if(!ids.has(t.id))texts.push(t)});
    const rids=new Set(rtexts.map(t=>t.id));texts.forEach(t=>{if(!rids.has(t.id))cloudText(t)});
    texts.sort((a,b)=>b.ts-a.ts);saveTexts();lsSet(LS_KEY,state);
    render();
  }catch(e){cloud.status="local";cloud.col=null;renderSync()}
}
function renderSync(){const el=$("#sync");if(!el)return;el.textContent=cloud.status==="cloud"?"● guardado en tu cuenta":cloud.status==="connecting"?"conectando…":"● guardado en este navegador"}

/* ============================== LEARNING MODEL ============================== */
function rec(id){return state.items[id]||(state.items[id]={box:0,due:null,n:0,ok:0,wrong:0,last:null,lastWrong:null,lastOk:null})}
function pat(p){return state.pats[p]||(state.pats[p]={n:0,ok:0,h:[]})}
function patAcc(p){const s=state.pats[p];if(!s||!s.h.length)return null;const h=s.h.slice(-10);return h.reduce((a,b)=>a+b,0)/h.length}
function patStatus(p){
  const s=state.pats[p];if(!s||!s.n)return{k:"none",t:"Sin datos",cls:""};
  const h=s.h,last6=h.slice(-6),wr=last6.filter(x=>!x).length,everWrong=h.some(x=>!x);
  if(s.n>=8&&last6.length>=6&&wr<=1&&h.slice(-3).every(x=>x))return{k:"mastered",t:"Dominado",cls:"ok"};
  if(wr>=2)return{k:"recurring",t:"Error recurrente",cls:"bad"};
  if(everWrong&&h.slice(-3).length===3&&h.slice(-3).every(x=>x))return{k:"improving",t:"Mejorando",cls:"acc"};
  if(!h[h.length-1])return{k:"new",t:"Error reciente",cls:"warn"};
  return{k:"progress",t:"En progreso",cls:""};
}
function itemStatus(r){
  if(!r||!r.n)return null;
  if(r.box>=4&&r.lastOk&&(!r.lastWrong||r.lastOk>r.lastWrong))return{t:"Dominado",cls:"ok"};
  const lastWasWrong=r.lastWrong&&(!r.lastOk||r.lastWrong>=r.lastOk);
  if(lastWasWrong&&r.wrong>=2)return{t:"Recurrente",cls:"bad"};
  if(lastWasWrong)return{t:"Error reciente",cls:"warn"};
  if(r.wrong>0)return{t:"Mejorado",cls:"acc"};
  return{t:"En progreso",cls:""};
}
function updSkill(l,ok){const exp=1/(1+Math.exp((DIFF[l]-state.skill)/10));state.skill=clamp(state.skill+5*((ok?1:0)-exp),5,98)}
function record(ex,ok,ansText,retry){
  const r=rec(ex.id),t=today(),now=Date.now(),wasReview=r.n>0&&r.wrong>0;
  r.n++;r.last=t;
  if(ok){r.ok++;r.box=Math.min(r.box+1,5);r.lastOk=now}else{r.wrong++;r.box=0;r.lastWrong=now}
  r.due=addDays(t,INTERVALS[r.box]);
  if(!retry){const s=pat(ex.p);s.n++;if(ok)s.ok++;s.h.push(ok?1:0);if(s.h.length>30)s.h=s.h.slice(-30)}
  if(ex.t!=="write"&&!retry)updSkill(ex.l,ok);
  if(ex.wid)recordWord(ex,ok);
  if(ex.wid&&state.wotd&&state.wotd.id===ex.wid&&state.wotd.d===today())state.wotd.done=true;
  if(ok&&ex.t==="fix")state.stats.fixOk++;
  if(ok&&wasReview)state.stats.revOk++;
  if(!ok){state.mistakes.unshift({id:ex.id,d:t,a:String(ansText||"").slice(0,200)});if(state.mistakes.length>150)state.mistakes.length=150}
  return wasReview;
}
function priorMistake(ex){
  const r=state.items[ex.id];
  if(r&&r.wrong>0&&r.lastWrong){const d=fmtD(new Date(r.lastWrong));return`Ya fallaste este ejercicio el ${prettyD(d)}. Bien que vuelva: así se fija.`}
  const st=patStatus(ex.p);
  if(st.k==="recurring")return`Este punto (${PATS[ex.p]}) es un error recurrente para ti. Vale la pena detenerse en la explicación.`;
  const m=state.mistakes.find(m=>m.id!==ex.id&&EX[m.id]&&EX[m.id].p===ex.p);
  if(m)return`Relacionado con un error reciente: “${EX[m.id].s||EX[m.id].q}” (${PATS[ex.p]}).`;
  return null;
}

/* ============================== SESSION BUILDER ============================== */
function tierW(l){return 0.12+Math.exp(-Math.pow((DIFF[l]-state.skill)/14,2))}
function patW(p){const a=patAcc(p);const st=patStatus(p).k;const w=state.wpat&&state.wpat[p];return 1+(w?Math.min(1,w.err/Math.max(1,w.texts)):0)+2*(1-(a==null?0.6:a))+(st==="recurring"?1.5:0)+(st==="new"?0.6:0)-(st==="mastered"?0.6:0)}
function buildPlan(opts={}){
  const t=today(),picked=[],q=Object.assign({},QUOTA);
  const pool=Object.values(EX).filter(e=>e.t!=="write"&&!e.wb);
  const due=pool.filter(e=>{const r=state.items[e.id];return r&&r.n&&r.due&&r.due<=t}).sort((a,b)=>(state.items[a.id].box-state.items[b.id].box)||(state.items[a.id].due<state.items[b.id].due?-1:1));
  if(opts.reviewOnly){return{d:t,items:due.slice(0,8).map(e=>e.id).concat(pickWords(4,0)),write:null,review:true,done:false}}
  if(opts.words){return{d:t,items:pickWords(10,6),write:null,review:true,done:false,words:true}}
  for(const e of due){if(picked.length>=4)break;if(q[e.t]>0){picked.push(e.id);q[e.t]--}}
  const usedCats={};picked.forEach(id=>usedCats[EX[id].c]=(usedCats[EX[id].c]||0)+1);
  for(const type of Object.keys(q)){
    while(q[type]>0){
      const cands=pool.filter(e=>(e.t===type)&&!picked.includes(e.id));
      if(!cands.length)break;
      let best=null,bs=-1;
      for(const e of cands){const r=state.items[e.id];
        let fam=!r||!r.n?1.35:(r.box>=4?0.2:(r.due&&r.due>t?0.45:0.9));
        const sc=tierW(e.l)*patW(e.p)*fam*(1/(1+(usedCats[e.c]||0)*0.6))*(0.6+Math.random()*0.8);
        if(sc>bs){bs=sc;best=e}}
      picked.push(best.id);usedCats[best.c]=(usedCats[best.c]||0)+1;q[type]--;
    }
  }
  // order: warm-up (easiest recognition) → harder → production; avoid same category back-to-back
  const rank=e=>e.l*10+({mc:0,scenario:1,fill:2,build:3,fix:4,transform:5}[e.t]||0);
  let ord=picked.map(id=>EX[id]).sort((a,b)=>rank(a)-rank(b));
  for(let i=1;i<ord.length;i++){if(ord[i].c===ord[i-1].c){const j=ord.findIndex((e,k)=>k>i&&e.c!==ord[i-1].c);if(j>0){const tmp=ord[i];ord[i]=ord[j];ord[j]=tmp}}}
  const wsel=pickWords(2,3,wotd().id).map(id=>EX[id]).filter(Boolean);
  if(wsel[0])ord.splice(Math.min(2,ord.length),0,wsel[0]);if(wsel[1])ord.splice(Math.min(8,ord.length),0,wsel[1]);
  const writes=Object.values(EX).filter(e=>e.t==="write");
  const w=writes.map(e=>({e,s:tierW(e.l)*(state.lastWrite[e.id]?0.5:1.2)*(0.5+Math.random())})).sort((a,b)=>b.s-a.s)[0].e;
  const wid=wotd().id;return{d:t,items:[wotdExId()].concat(ord.map(e=>e.id)),write:w.id,review:false,done:false,dueCount:Math.min(due.length,4),wotd:wid};
}
function todayPlan(){if(!state.plan||state.plan.d!==today()||!state.plan.items.every(id=>EX[id])||(!state.plan.done&&state.plan.wotd!==wotd().id)){state.plan=buildPlan();save()}return state.plan}
function dueCount(){const t=today();return Object.entries(state.items).filter(([id,r])=>EX[id]&&EX[id].t!=="write"&&r.n&&r.due&&r.due<=t).length}

/* ============================== BARBELL ============================== */
function barbell(ids,writeId,opts={}){
  const all=ids.map(id=>EX[id]).concat(writeId?[EX[writeId]]:[]);
  const plates=all.map((e,i)=>{
    const r=state.items[e.id];const rev=r&&r.n&&r.wrong>0;
    let cls="plate "+(e.t==="write"?"tw":(opts.wotd&&i===0&&e.wid===opts.wotd)?"wd":"t"+e.l)+(rev&&e.t!=="write"&&!(opts.wotd&&i===0)?" rev":"");
    if(opts.live){const res=opts.results[i];if(res)cls+=res.ok?" done":" miss";if(i===opts.cur)cls+=" cur"}
    return`<span class="${cls}" title="${esc(cls.includes(" wd")?"Palabra del día":(e.t==="write"?"Finisher · ":TIERS[e.l].kg+" kg · ")+CATS[e.c].n)}"></span>`}).join("");
  return`<div class="barbell ${opts.live?"live":""} ${opts.sm?"sm":""}" role="img" aria-label="${all.length} ejercicios"><span class="collar"></span>${plates}<span class="collar"></span></div>`;
}
function legend(){return`<div class="legend"><span><i style="background:var(--surface);border:2px solid var(--accent)"></i>Palabra del día</span><span><i style="background:var(--plate-1)"></i>15 kg · B2 Core</span><span><i style="background:var(--plate-2)"></i>20 kg · B2 Precision</span><span><i style="background:var(--plate-3)"></i>25 kg · B2→C1 Challenge</span><span><i style="background:var(--plate-w)"></i>Finisher · Writing</span></div>`}

/* ============================== VIEWS ============================== */
function renderNav(){
  const nav=$("#nav");
  if(repsUI){nav.innerHTML=`<button data-act="reps-exit">Salir de las reps</button>`;return}
  if(wbUI){nav.innerHTML=`<button data-act="wb-exit">Salir (se guarda tu avance)</button>`;return}
  if(!state.placed||sess||place){nav.innerHTML=sess&&!sess.done?`<button data-act="quit-session">${L("Salir de la sesión","Leave session")}</button>`:"";return}
  const tabs=[["home","Hoy"],["review","Repaso"],["words","Palabras"],["lab","Writing Lab"],["progress","Progreso"]];
  nav.innerHTML=tabs.map(([k,n])=>`<button data-act="go" data-v="${k}" ${view===k?'aria-current="page"':""}>${n}</button>`).join("");
}
function render(){
  renderNav();renderSync();
  const app=$("#app");
  const v=place?"placement":repsUI?"reps":wbUI?"wbreps":sess?(sess.done?"summary":"session"):view;
  app.innerHTML=({onboard:vOnboard,placement:vPlacement,home:vHome,session:vSession,summary:vSummary,review:vReview,lab:vLab,progress:vProgress,words:vWords,reps:vReps,wbreps:vWbReps}[v]||vHome)();
  const f=app.querySelector("[data-autofocus]");if(f&&!f.disabled){f.focus({preventScroll:true});if(f.setSelectionRange&&f.value)f.setSelectionRange(f.value.length,f.value.length)}
}

function vOnboard(){
  const demo=["g1","c2","t1","a3","ac1","r2","v1","g3","t9","a1","c4","ac6"];
  return`<section class="stack" style="padding-top:20px">
  <span class="eyebrow">Entrena tu inglés como entrenas tu cuerpo</span>
  <h1>English Gym</h1>
  <p style="max-width:62ch;font-size:1.1rem">Sesiones diarias de unos 20 minutos que se adaptan a tus errores. Cada día cargas la barra con ejercicios a tu medida: gramática, colocaciones, construcción de oraciones, registro académico y situaciones reales. Lo que fallas vuelve en el momento justo para que se quede.</p>
  <div class="hero stack">
    <div class="row" style="justify-content:space-between"><span class="eyebrow">Ejemplo de una sesión</span><span class="mono muted" style="font-size:.85rem">12 sets · ~20 min</span></div>
    ${barbell(demo,"wr2")}
    ${legend()}
  </div>
  <div class="grid3">
    <div class="card stack" style="gap:6px"><h3>1 · Evaluación inicial</h3><p class="muted">14 preguntas rápidas para estimar tu nivel MCER (A1–C2).</p></div>
    <div class="card stack" style="gap:6px"><h3>2 · Entrenamiento diario</h3><p class="muted">Ejercicios variados elegidos según tu nivel, tus errores y lo que toca repasar.</p></div>
    <div class="card stack" style="gap:6px"><h3>3 · Progreso real</h3><p class="muted">Ves qué patrones mejoraron, cuáles dominas y cuáles siguen pendientes.</p></div>
  </div>
  <div class="row"><button class="btn primary big" data-act="start-placement">Empezar evaluación</button>
  <span class="muted" style="font-size:.92rem">o elige tu nivel:</span>
  ${["B1","B2","C1"].map(l=>`<button class="btn sm" data-act="set-level" data-l="${l}">${l}</button>`).join("")}</div>
  <p class="muted" style="font-size:.85rem">Las instrucciones y explicaciones están en español; los ejercicios, en inglés. Cuando subas de nivel, verás más inglés en la interfaz.</p>
  </section>`;
}

function vPlacement(){
  const i=place.i,it=PLACEMENT[i];
  if(place.done){const lv=place.level;return`<section class="stack" style="padding-top:20px">
    <span class="eyebrow">Resultado de la evaluación</span>
    <div class="row" style="align-items:flex-end;gap:18px"><span class="cefr" style="font-size:5rem">${lv}</span><p style="max-width:48ch">Este es tu punto de partida estimado. No es una etiqueta fija: el sistema ajusta tu nivel con cada ejercicio que haces.</p></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Nivel</th><th>Aciertos</th></tr></thead><tbody>
    ${["A2","B1","B2","C1","C2"].map(l=>{const its=PLACEMENT.map((p,k)=>({p,k})).filter(x=>x.p.lv===l);const ok=its.filter(x=>place.ans[x.k]===x.p.a).length;return`<tr><td>${l}</td><td class="num">${ok} / ${its.length}</td></tr>`}).join("")}
    </tbody></table></div></div>
    <div class="row"><button class="btn primary big" data-act="finish-placement" data-autofocus>Ir a mi entrenamiento</button></div></section>`}
  return`<section class="stack" style="padding-top:16px">
  <div class="ex-head"><span class="eyebrow">Evaluación inicial · ${i+1} / ${PLACEMENT.length}</span><button class="btn ghost sm" data-act="skip-placement">Saltar</button></div>
  <div class="meter"><i style="width:${(i/PLACEMENT.length)*100}%"></i></div>
  <p class="ex-q">Choose the correct option.</p>
  <div class="ex-s">${blankify(it.s)}</div>
  <div class="opts">${it.o.map((o,k)=>`<button class="opt" data-act="place-ans" data-k="${k}" ${k===0?"data-autofocus":""}><span class="k">${"ABC"[k]}</span><span>${esc(o)}</span></button>`).join("")}
  <button class="opt" data-act="place-ans" data-k="-1"><span class="k">?</span><span class="muted">No lo sé</span></button></div>
  <p class="muted" style="font-size:.88rem">Sin presión: si no sabes, elige “No lo sé”. Así la estimación es más precisa.</p></section>`;
}

function vHome(){
  const plan=todayPlan(),sk=state.skill,lv=cefr(sk),bp=bandProgress(sk),gl=gymLevel(state.xp),t=today();
  const last=state.days[state.days.length-1];
  const gap=last?daysBetween(last,t):0;
  const welcome=!state.sessions.length?"Tu primera sesión está lista. Empieza suave; el sistema aprende de ti desde el primer ejercicio."
    : gap>=3?"Qué bueno verte de nuevo. Nada se perdió: retomamos tus repasos pendientes."
    : plan.done?"Sesión de hoy completada. Puedes repasar, escribir en el Writing Lab o hacer una sesión extra."
    : "Tu sesión de hoy está cargada según tus errores y repasos pendientes.";
  const focus=Object.keys(PATS).map(p=>({p,st:patStatus(p),a:patAcc(p)})).filter(x=>x.st.k==="recurring"||x.st.k==="new").slice(0,4);
  const nDue=dueCount();
  const cats=[...new Set(plan.items.map(id=>EX[id].c))];
  const trainedMonth=state.days.filter(d=>d.slice(0,7)===t.slice(0,7)).length;
  const days14=[...Array(14)].map((_,k)=>addDays(t,k-13));
  const wd=wotdWord(),wo=wotd(),secs=todaySecs(),mins=Math.floor(secs/60),goal=secs>=GOAL;
  const steps=[
    {on:wo.done,tx:`Palabra del día: <i>${esc(wd.w)}</i>`,sub:"Primer set del entrenamiento"},
    {on:plan.done,tx:"Entrenamiento del día",sub:plan.done?"Completado":(plan.doneIds&&plan.doneIds.length?`${plan.doneIds.length} de ${plan.items.length} ejercicios + escritura`:`${plan.items.length+1} sets · ejercicios + escritura`)},
    {on:goal,tx:"20 minutos de estudio",sub:goal?"Cumplido":`Llevas ${mins} min · faltan ${Math.max(1,Math.ceil((GOAL-secs)/60))}`}
  ];
  const nextI=steps.findIndex(x=>!x.on);
  const status=nextI<0?"Todo listo por hoy. Lo que hagas de aquí en adelante es extra."
    :nextI===2?"Ya hiciste el entrenamiento. Completa los 20 minutos con un repaso, el Word Bank o el Writing Lab."
    :"Tu siguiente paso está marcado en azul.";
  return`<section class="stack" style="padding-top:18px">
  <div class="hero stack">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <h1>${plan.done?"Done for today":"Today's workout"}</h1>
      <span class="chip mono">${plan.items.length+1} sets</span>
    </div>
    <p style="max-width:60ch">${welcome}</p>
    <div class="hero-grid">
      <div class="wotd"><span class="eyebrow" style="color:var(--accent)">${wo.done?"Palabra del día ✓":"Empiezas con · palabra del día"}</span>
        <b class="wword">${esc(wd.w)}</b><span style="font-size:.95rem">${esc(wd.es)}</span>
        ${wd.trap?`<span class="trap">${esc(wd.trap)}</span>`:""}
        ${dictCtl.tts&&wd.ex?`<div><button class="btn sm ghost" data-act="say" data-t="${esc(wd.w.replace(/^to /,"")+". "+wd.ex)}">${SPK} Escuchar</button></div>`:""}</div>
      <div class="stack" style="gap:8px;min-width:0">${barbell(plan.items,plan.write,{wotd:plan.wotd})}${legend()}</div>
    </div>
    <div class="row" style="gap:6px">${cats.map(c=>`<span class="chip">${CATS[c].n}</span>`).join("")}${plan.dueCount?`<span class="chip warn">${plan.dueCount} de repaso</span>`:""}</div>
    <div class="row">${plan.done
      ?`<button class="btn primary big" data-act="extra-session">Sesión extra</button>`
      :`<button class="btn primary big" data-act="start-session" data-autofocus>${plan.doneIds&&plan.doneIds.length?"Continuar entrenamiento":"Empezar entrenamiento"}</button>`}
      ${(()=>{const p=wbProgress();return p.total?`<button class="btn sm" data-act="wb-start" ${p.done>=p.total?"disabled":""}>Reps de palabras · ${p.done}/${p.total}</button>`:""})()}
      ${spellDue().length?`<button class="btn sm" data-act="reps-start">Reps de ortografía · ${spellDue().length}</button>`:""}
      <button class="btn ghost sm" data-act="reroll">Cargar otra combinación</button></div>
  </div>
  <div class="grid3">
    <div class="card stack" style="gap:10px"><span class="eyebrow">Nivel estimado (MCER)</span>
      <div class="row" style="align-items:flex-end;gap:10px"><span class="cefr">${lv}</span><span class="muted mono" style="font-size:.85rem;padding-bottom:6px">${Math.round(sk)} / 100</span></div>
      <div class="meter"><i style="width:${Math.round(bp.pct*100)}%"></i></div>
      <span class="muted" style="font-size:.85rem">${bp.next?`${Math.round(bp.pct*100)}% del camino hacia ${bp.next}`:"Nivel máximo"}</span></div>
    <div class="card stack" style="gap:10px"><span class="eyebrow">Últimos 14 días</span>
      <div class="days">${days14.map(d=>`<span class="${state.days.includes(d)?"on":""} ${d===t?"today":""}" title="${prettyD(d)}"></span>`).join("")}</div>
      <span class="muted" style="font-size:.85rem">${trainedMonth} ${trainedMonth===1?"día entrenado":"días entrenados"} este mes. Cada día suma; ninguno resta.</span></div>
    <div class="card stack" style="gap:10px"><span class="eyebrow">Gym level ${gl.n}</span>
      <div class="stat"><span class="n mono">${state.xp}</span> <span class="muted">XP</span></div>
      <div class="meter"><i style="width:${Math.round(gl.into/gl.step*100)}%;background:var(--plate-w)"></i></div>
      <span class="muted" style="font-size:.85rem">${gl.step-gl.into} XP para el nivel ${gl.n+1}</span></div>
  </div>
  <div class="grid2">
    <div class="card stack" style="gap:10px"><span class="eyebrow">Foco de entrenamiento</span>
      ${focus.length?`<div class="list">${focus.map(f=>`<div class="li"><div class="grow"><b>${PATS[f.p]}</b></div><span class="chip ${f.st.cls}">${f.st.t}</span></div>`).join("")}</div>
        <p class="muted" style="font-size:.85rem">Estos patrones aparecen más seguido en tus sesiones hasta que se estabilicen.</p>`
      :`<p class="muted">Todavía no hay patrones de error. Aparecerán aquí cuando el sistema detecte qué te cuesta más.</p>`}
    </div>
    <div class="card stack" style="gap:10px"><span class="eyebrow">Repaso espaciado</span>
      <div class="stat"><span class="n mono">${nDue}</span> <span class="muted">${nDue===1?"concepto toca hoy":"conceptos tocan hoy"}</span></div>
      <p class="muted" style="font-size:.9rem">Lo que fallas regresa en 1, 2, 4, 8, 16 y 32 días según lo vayas acertando.</p>
      <div class="row"><button class="btn sm" data-act="start-review" ${nDue?"":"disabled"}>Repaso rápido</button><button class="btn ghost sm" data-act="go" data-v="lab">Abrir Writing Lab</button></div>
    </div>
  </div>
  </section>`;
}

/* ---------- session ---------- */
function startSession(plan){
  let items=plan.items.slice();
  if(plan===state.plan&&!plan.done&&plan.doneIds&&plan.doneIds.length){const rest=items.filter(id=>!plan.doneIds.includes(id));if(rest.length)items=rest}
  sess={plan,items,write:plan.write,i:0,intro:(!plan.review&&!(state.wotd&&state.wotd.done&&state.wotd.d===today())&&plan.wotd&&EX[items[0]]&&EX[items[0]].wid===plan.wotd)?plan.wotd:null,secs:0,results:[],start:Date.now(),xp:0,skill0:state.skill,fb:null,orders:{},tiles:null,draft:"",writeDone:false,ai:null,done:false,lv0:cefr(state.skill),pats0:JSON.parse(JSON.stringify(state.pats))};
  items.forEach(id=>{const e=EX[id];if(e.o)sess.orders[id]=shuffle(e.o.map((_,k)=>k))});
  render();window.scrollTo({top:0});
}
function curEx(){if(!sess)return null;if(sess.i<sess.items.length)return EX[sess.items[sess.i]];if(sess.write&&!sess.writeDone)return EX[sess.write];return null}
function vSession(){
  const ex=curEx();if(!ex){finishSession();return vSummary()}
  const total=sess.items.length+(sess.write?1:0),idx=sess.items.length&&sess.i<sess.items.length?sess.i:sess.items.length;
  if(sess.intro&&sess.i===0&&!sess.fb){const wd=allWords().find(w=>w.id===sess.intro);if(wd)return`<section class="stack" style="padding-top:12px">
    ${barbell(sess.items,sess.write,{live:true,results:sess.results,cur:0,sm:true,wotd:sess.plan.wotd})}
    <span class="eyebrow">Calentamiento · palabra del día</span>
    <p class="muted" style="max-width:62ch">Lee la palabra, escúchala y dila en voz alta con el ejemplo. Después la practicas en el primer set y vuelve a aparecer en tus repasos.</p>
    ${wordCard(wd,{intro:true})}
    <div class="row"><button class="btn primary big" data-act="intro-done" data-autofocus>Empezar con esta palabra</button></div></section>`}
  const head=`<div class="stack" style="gap:8px;padding-top:12px">
    ${barbell(sess.items,sess.write,{live:true,results:sess.results,cur:idx,sm:true,wotd:sess.plan.wotd})}
    <div class="ex-head"><span class="eyebrow">Set ${idx+1} / ${total} · ${idx===0&&ex.wid&&ex.wid===sess.plan.wotd?"Palabra del día":CATS[ex.c].n}</span>
    <span class="row" style="gap:6px"><span class="chip">${L(TYPES[ex.t].es,TYPES[ex.t].en)}</span>${ex.t!=="write"?`<span class="chip mono">${TIERS[ex.l].kg} kg</span>`:""}${sess.items.indexOf(ex.id)<sess.i?'<span class="chip warn">Repetición</span>':""}</span></div></div>`;
  return`<section class="stack">${head}${ex.t==="write"?wWrite(ex):wExercise(ex)}</section>`;
}
function wExercise(ex){
  const fb=sess.fb,locked=!!fb;
  let body="";
  if(ex.t==="mc"||ex.t==="scenario"){
    const ord=sess.orders[ex.id]||ex.o.map((_,k)=>k);
    body=`${ex.s?`<div class="ex-s">${blankify(ex.s)}</div>`:""}<div class="opts">${ord.map((k,pos)=>{
      let cls="opt";if(fb){if(k===ex.a)cls+=" right";else if(k===fb.choice)cls+=" wrong"}
      return`<button class="${cls}" data-act="answer-mc" data-k="${k}" ${locked?"disabled":""} ${pos===0&&!locked?"data-autofocus":""}><span class="k">${"ABCD"[pos]}</span><span>${esc(ex.o[k])}</span></button>`}).join("")}</div>`;
  } else if(ex.t==="fill"){
    const parts=esc(ex.s).split(/_{3,}/);
    body=`<form class="ex-s" data-form="fill">${parts[0]}<input class="fill-in" type="text" id="ans-${ex.id}" autocomplete="off" autocapitalize="off" spellcheck="false" ${locked?"disabled":""} value="${esc(fb?fb.ans:"")}" data-autofocus aria-label="Tu respuesta">${parts[1]||""}</form>`;
  } else if((ex.t==="fix"||ex.t==="transform")&&ex.imp&&sess.choice&&!locked){
    if(!sess.chOrd)sess.chOrd=shuffle(ex.ch.map((_,k)=>k));
    body=`<div class="ex-s">${hlSentence(ex)}</div>
    <div class="helpbox"><b>Qué falla:</b><span>${esc(ex.why)}</span></div>
    <p style="font-weight:600">Elige la versión más natural:</p>
    <div class="opts">${sess.chOrd.map((k,pos)=>`<button class="opt" data-act="answer-ch" data-k="${k}" ${pos===0?"data-autofocus":""}><span class="k">${"ABC"[pos]}</span><span>${esc(ex.ch[k])}</span></button>`).join("")}</div>
    <div><button class="btn ghost sm" data-act="hide-choices">Mejor la escribo yo</button></div>`;
  } else if(ex.t==="fix"||ex.t==="transform"){
    body=`${ex.imp?`<div class="ex-s">${hlSentence(ex)}</div>${!locked?`<div class="helpbox"><b>Qué falla:</b><span>${esc(ex.why)}</span></div>`:""}`:ex.t==="transform"?`<div class="ex-s">${esc(ex.s)}</div>`:""}
    <textarea id="ans-${ex.id}" rows="3" spellcheck="false" ${locked?"disabled":""} data-autofocus aria-label="Tu respuesta" placeholder="${ex.t==="transform"?"Write your answer…":""}">${esc(fb?fb.ans:(ex.t==="fix"?ex.s:""))}</textarea>
    ${!locked?`<p class="muted" style="font-size:.85rem">${ex.t==="fix"?"Edita la oración directamente.":"Escribe tu respuesta antes de ver la respuesta modelo."}</p>`:""}
    ${!locked&&ex.imp?`<div><button class="btn sm" data-act="show-choices">No sé cómo mejorarla: ver 3 opciones</button> <span class="muted" style="font-size:.82rem">Escribirla tú da más XP.</span></div>`:""}`;
  } else if(ex.t==="build"){
    if(!sess.tiles||sess.tiles.id!==ex.id){const words=ex.s.replace(/[.?!]$/,"").split(" ");sess.tiles={id:ex.id,words,pool:shuffle(words.map((_,k)=>k)),ans:[]};
      if(sess.tiles.pool.join()===words.map((_,k)=>k).join())sess.tiles.pool.reverse()}
    const T=sess.tiles,end=(ex.s.match(/[.?!]$/)||[""])[0];
    body=`<div class="stack" style="gap:8px"><span class="eyebrow">Tu oración</span>
    <div class="tiles answer">${T.ans.length?T.ans.map((k,pos)=>`<button class="tile" data-act="tile-back" data-pos="${pos}" ${locked?"disabled":""}>${esc(T.words[k])}</button>`).join("")+`<span style="align-self:center;font-weight:600">${end}</span>`:`<span class="muted" style="align-self:center">Toca las palabras en orden.</span>`}</div>
    <div class="tiles">${T.pool.map((k,pos)=>`<button class="tile" data-act="tile-pick" data-pos="${pos}" ${locked?"disabled":""}>${esc(T.words[k])}</button>`).join("")}</div>
    ${!locked&&T.ans.length?`<div><button class="btn ghost sm" data-act="tile-reset">Reiniciar</button></div>`:""}</div>`;
  }
  const canCheck=ex.t!=="mc"&&ex.t!=="scenario";
  const hint=ex.h&&!locked?`<details><summary class="muted" style="cursor:pointer">${L("Pista","Hint")}</summary><p style="margin-top:6px">${esc(ex.h)}</p></details>`:"";
  const actions=!locked?(canCheck?`<div class="row"><button class="btn primary" data-act="check">${L("Comprobar","Check")}</button><button class="btn ghost sm" data-act="dontknow">No lo sé</button></div>`:`<div class="row"><button class="btn ghost sm" data-act="dontknow">No lo sé</button></div>`):"";
  const choosing=ex.imp&&sess.choice&&!locked;
  return`<p class="ex-q">${esc(ex.q)}</p>${ex.ins?`<p class="ins">${esc(ex.ins)}</p>`:""}${body}${choosing?"":hint}${choosing?"":actions}${fb?wFeedback(ex,fb):""}`;
}
function correctText(ex){
  if(ex.t==="mc"||ex.t==="scenario")return ex.o[ex.a];
  if(ex.t==="build")return ex.s;
  if(ex.t==="fill")return ex.s.replace(/_{3,}/,ex.a[0]);
  return ex.m||capitalize(ex.a[0]);
}
function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function wFeedback(ex,fb){
  if(fb.pending){
    return`<div class="fb pend" role="status"><span class="verdict">${L("Compara tu respuesta","Compare your answer")}</span>
      <p>Tu respuesta no coincide con las respuestas guardadas, pero puede ser válida: muchas oraciones admiten varias versiones.</p>
      <div><span class="lbl">Respuesta modelo</span><span class="ans">${esc(correctText(ex))}</span></div>
      ${ex.a&&ex.a.length>1?`<div><span class="lbl">Otras respuestas aceptadas</span><span>${ex.a.slice(1,4).map(a=>esc(capitalize(a))).join(" · ")}</span></div>`:""}
      <div class="row">
        <button class="btn sm" data-act="self" data-v="0">Tenía un error</button>
        <button class="btn sm" data-act="self" data-v="1">Es equivalente</button>
      </div></div>`;
  }
  const kind=!fb.ok?KINDS[fb.kind||ex.k||"g"]:null;
  const rem=!fb.ok?fb.reminder:null;
  if(fb.ok){const showAns=ex.t!=="mc"&&ex.t!=="scenario"&&norm(fb.ans)!==norm(correctText(ex));
    return`<div class="fb ok" role="status">
    <span class="verdict">${L("Correcto","Correct")}</span>
    ${showAns?`<div><span class="lbl">${L("Versión modelo","Model answer")}</span><span class="ans">${esc(correctText(ex))}</span></div>`:""}
    <details class="why"><summary>${L("Ver explicación","See explanation")}</summary><div>
      <div><span class="lbl">Por qué</span>${esc(ex.e)}</div>
      ${ex.x?`<div><span class="lbl">${L("Otro ejemplo","Another example")}</span><span class="exl">${esc(ex.x)}</span></div>`:""}</div></details>
    <div class="row"><button class="btn primary" data-act="next" data-autofocus>${L("Continuar","Continue")}</button><span class="mono muted" style="font-size:.85rem">+${fb.xp} XP</span></div></div>`}
  return`<div class="fb ${fb.ok?"ok":"bad"}" role="status">
    <div class="row" style="justify-content:space-between"><span class="verdict">${fb.ok?L("Correcto","Correct"):L("No exactamente","Not quite")}</span>${kind&&!fb.dk?`<span class="chip ${kind.cls}">${kind.es}</span>`:""}</div>
    ${!fb.ok||ex.t!=="mc"?`<div><span class="lbl">${L("Respuesta correcta","Correct answer")}</span><span class="ans">${esc(correctText(ex))}</span></div>`:""}
    <div><span class="lbl">Por qué</span>${esc(ex.e)}</div>
    ${ex.x?`<div><span class="lbl">${L("Otro ejemplo","Another example")}</span><span class="exl">${esc(ex.x)}</span></div>`:""}
    ${rem?`<div class="remind">${esc(rem)}</div>`:""}
    <span style="font-size:.9rem;font-weight:600">Este ejercicio vuelve al final del set hasta que lo aciertes.</span>
    <div class="row"><button class="btn primary" data-act="next" data-autofocus>${L("Continuar","Continue")}</button><span class="mono muted" style="font-size:.85rem">+${fb.xp} XP</span></div></div>`;
}
function settle(ex,ok,ans,extra={}){
  const reminder=!ok?priorMistake(ex):null;
  const retry=sess.items.indexOf(ex.id)<sess.i;
  const wasReview=record(ex,ok,ans,retry);
  const xp=ok?(retry?2:extra.assist?3+ex.l:6+4*ex.l):1;state.xp+=xp;sess.xp+=xp;
  sess.results[sess.i]={id:ex.id,ok,review:wasReview,retry};
  if(!ok)sess.items.push(ex.id);
  if(sess.plan===state.plan){state.plan.doneIds=state.plan.doneIds||[];if(!state.plan.doneIds.includes(ex.id))state.plan.doneIds.push(ex.id)}
  sess.fb=Object.assign({ok,ans,xp,reminder},extra);
  save();render();
}
function answerMC(k){const ex=curEx();const ok=k===ex.a;const kind=!ok&&ex.ok&&ex.ok[k]&&ex.ok[k]!=="-"?ex.ok[k]:(ex.k||"g");settle(ex,ok,ex.o[k],{choice:k,kind})}
function checkFree(){
  const ex=curEx();
  if(ex.t==="build"){const T=sess.tiles;if(T.ans.length<T.words.length){toast("Usa todas las palabras");return}
    const ans=T.ans.map(k=>T.words[k]).join(" ");const ok=norm(ans)===norm(ex.s)||(ex.alt||[]).some(a=>norm(a)===norm(ans));settle(ex,ok,ans,{kind:"g"});return}
  const el=document.getElementById("ans-"+ex.id);const ans=(el?el.value:"").trim();
  if(!ans){toast("Escribe una respuesta o elige “No lo sé”");return}
  if(ex.t==="fix"&&norm(ans)===norm(ex.s)){settle(ex,false,ans,{kind:ex.k||"g"});return}
  if(matchAny(ans,ex.a)){settle(ex,true,ans);return}
  if(ex.t==="fill"&&ans.split(/\s+/).length<=3){settle(ex,false,ans,{kind:ex.k||"g"});return}
  sess.fb={pending:true,ans};render();
}
function nextItem(){
  sess.fb=null;sess.tiles=null;sess.choice=false;sess.chOrd=null;
  if(sess.i<sess.items.length)sess.i++;
  const nid=sess.items[sess.i];
  if(nid&&sess.items.indexOf(nid)<sess.i){const e=EX[nid];if(e&&e.o)sess.orders[nid]=shuffle(e.o.map((_,k)=>k))}
  render();window.scrollTo({top:0});
}

/* ---------- writing (session finisher + lab) ---------- */
function wc(s){return(String(s).trim().match(/[A-Za-z0-9’']+/g)||[]).length}
function textMetrics(s){
  const words=String(s).toLowerCase().match(/[a-z’']+/g)||[];
  const sents=String(s).split(/[.!?]+/).map(x=>x.trim()).filter(x=>x.split(/\s+/).length>1);
  const uniq=new Set(words);
  const CONN=["however","although","therefore","moreover","furthermore","because","while","whereas","in addition","on the other hand","for example","for instance","as a result","consequently","nevertheless","overall","in conclusion","first","then","finally","since"];
  const low=" "+String(s).toLowerCase().replace(/[^a-z' ]/g," ")+" ";
  const conns=CONN.filter(c=>low.includes(" "+c+" "));
  const weak=["very","thing","things","good","bad","nice","a lot","stuff","really","get","got"].filter(w=>low.includes(" "+w+" "));
  return{words:words.length,sents:sents.length,avg:sents.length?Math.round(words.length/sents.length):0,variety:words.length?Math.round(uniq.size/words.length*100):0,conns,weak};
}
function writeChecklist(ex,txt){
  const m=textMetrics(txt),n=wc(txt),low=txt.toLowerCase();
  const focusHit=(ex.focus||[]).filter(f=>low.includes(f));
  const items=[
    [n>=ex.min&&n<=ex.max+15,`Longitud: ${ex.min}–${ex.max} palabras`],
    [m.sents>=3,"Al menos 3 oraciones completas"],
    [m.avg>=10&&m.avg<=28,"Oraciones de 10 a 28 palabras en promedio"],
    [focusHit.length>=2,`Usa expresiones de la tarea (${(ex.focus||[]).slice(0,4).join(", ")}…)`],
    [m.weak.length<=2,"Pocas palabras genéricas (very, thing, good, a lot)"],
    [wordRegex(wotdWord()).test(txt),`Usa la palabra del día: ${wotdWord().w}`]
  ];
  return`<div class="stack" style="gap:6px">${items.map(([on,t])=>`<div class="check ${on?"on":""}"><span class="m">${on?"✓":""}</span><span>${esc(t)}</span></div>`).join("")}</div>`;
}
function wotdChallenge(){const wd=wotdWord();return`<div class="wotd" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px 14px"><span class="eyebrow" style="color:var(--accent)">Reto · usa la palabra del día</span><b class="wword" style="font-size:1.25rem">${esc(wd.w)}</b><span style="font-size:.92rem;flex:1 1 220px;min-width:0">${esc(wd.es)}</span>${wd.ex?`<i style="font-size:.9rem;flex-basis:100%">${esc(wd.ex)}</i>`:""}</div>`}
function wWrite(ex){
  const done=sess.writeSaved;
  return`<p class="ex-q">${esc(ex.q)}</p>
  <p class="muted">Escribe o dicta ${ex.min}–${ex.max} palabras. Criterios: gramática, vocabulario, coherencia, expresiones naturales y desarrollo de ideas.</p>
  ${done?`<div class="textbox">${esc(sess.draft)}</div>
    ${sess.usedWords&&sess.usedWords.length?`<p style="font-size:.92rem">Usaste del Word Bank: <b>${esc(sess.usedWords.join(", "))}</b>. Ya cuentan como palabras activas.</p>`:""}
    <div class="row"><button class="btn primary" data-act="finish-write">Terminar sesión</button></div>`
  :`${wotdChallenge()}${editorHTML("session",ex,sess.draft)}
    <div class="row"><button class="btn primary" data-act="save-write">Guardar texto</button><button class="btn ghost sm" data-act="skip-write">Saltar el finisher hoy</button><span class="muted" style="font-size:.85rem">Se guarda en tu Writing Lab.</span></div>`}`;
}
function saveTextEntry(ex,body){
  const st=arguments[2]||{};const words=wc(body);
  const t={id:"text-"+Date.now(),ts:Date.now(),d:today(),prompt:ex.q,promptId:ex.id,body,metrics:textMetrics(body),skill:Math.round(state.skill),ai:null,
    mode:st.dictWords&&st.dictWords>=words*0.5?"dictado":st.dictWords?"mixto":"escrito",dictWords:st.dictWords||0};
  t.usedWords=markUsedWords(body);
  Object.keys(PATS).forEach(p=>{const w=state.wpat[p]||(state.wpat[p]={err:0,texts:0});w.texts++});
  t.coach=analyzeText(body,{formal:ex.p==="register"}).issues.length;
  const sc=scoreText(body,ex);if(sc){t.score={avg:+sc.avg.toFixed(2),lvl:sc.lvl,c:Object.fromEntries(Object.entries(sc.crit).map(([k,v])=>[k,v.v]))}}
  texts.unshift(t);saveTexts();cloudText(t);state.lastWrite[ex.id]=today();
  return t;
}
function finishSession(){
  if(!sess||sess.done)return;
  sess.done=true;const t=today();
  const first=sess.results.filter(r=>r&&!r.retry),n=first.length,ok=first.filter(r=>r.ok).length;
  if(n||sess.writeSaved){
    if(!state.days.includes(t))state.days.push(t);
    state.sessions.push({d:t,n,ok,xp:sess.xp,dur:Math.round((sess.secs||0)/60),skill:Math.round(state.skill*10)/10,review:!!sess.plan.review});
    if(state.sessions.length>300)state.sessions=state.sessions.slice(-300);
    state.hist.push({d:t,s:Math.round(state.skill*10)/10});if(state.hist.length>400)state.hist=state.hist.slice(-400);
    if(!sess.plan.review&&sess.plan===state.plan&&sess.plan.items.every(id=>(state.plan.doneIds||[]).includes(id)))state.plan.done=true;
  }
  sess.newAch=checkAch({sessAcc:n?ok/n:0,n});
  save();
}
function checkAch(ctx){
  const got=[];const give=id=>{if(!state.ach[id]){state.ach[id]=today();got.push(id)}};
  const S=state.sessions.length;
  if(S>=1)give("first");if(S>=5)give("s5");if(S>=20)give("s20");if(state.days.length>=7)give("d7");
  if(ctx&&ctx.n>=8&&ctx.sessAcc>=0.9)give("acc90");
  if(texts.length>=1)give("text1");if(texts.length>=5)give("text5");
  if(state.stats.fixOk>=10)give("fix10");if(state.stats.revOk>=10)give("rev10");
  if(Object.keys(state.pats).some(p=>patStatus(p).k==="mastered"&&state.pats[p].h.some(x=>!x)))give("master");
  const start=state.startLevel?LEVEL_START[state.startLevel]:null;
  const order=["A1","A2","B1","B2","C1","C2"];
  if(state.startLevel&&order.indexOf(cefr(state.skill))>order.indexOf(state.startLevel))give("levelup");
  if(state.skill>=70)give("c1");
  if((state.stats.spoken||0)>=10)give("voice10");
  if(Object.values(state.words).filter(r=>r.used>0).length>=5)give("active5");
  return got;
}
function vSummary(){
  const all=sess.results.filter(Boolean),res=all.filter(r=>!r.retry),n=res.length,ok=res.filter(r=>r.ok).length,acc=n?Math.round(ok/n*100):0,reps=all.length-res.length;
  const lv1=cefr(state.skill),d=state.skill-sess.skill0;
  const patsTouched=[...new Set(res.map(r=>EX[r.id].p))];
  const wrong=res.filter(r=>!r.ok).map(r=>EX[r.id]);
  const improved=patsTouched.filter(p=>{const st=patStatus(p).k;return st==="improving"||st==="mastered"});
  const mins=Math.max(1,Math.round((sess.secs||0)/60)),todayM=Math.floor(todaySecs()/60);
  return`<section class="stack" style="padding-top:16px">
  <span class="eyebrow">${sess.plan.review?"Repaso completado":"Sesión completada"} · ${mins} min · hoy llevas ${todayM} de 20 min${todayM>=20?" ✓":""}</span>
  <h1>${acc>=85?"Strong session":acc>=60?"Solid work":"Good reps"}</h1>
  ${barbell(sess.items,sess.writeSaved?sess.write:null,{live:true,results:sess.results.concat(sess.writeSaved?[{ok:true}]:[]),cur:-1})}
  <div class="grid3">
    <div class="card stat"><span class="eyebrow">Precisión</span><div><span class="n mono">${acc}%</span></div><span class="muted">${ok} de ${n} al primer intento${reps?` · ${reps} ${reps===1?"repetición":"repeticiones"} hasta acertar`:""}</span></div>
    <div class="card stat"><span class="eyebrow">XP ganado</span><div><span class="n mono">+${sess.xp}</span></div><span class="muted">Los errores también suman XP</span></div>
    <div class="card stat"><span class="eyebrow">Nivel estimado</span><div><span class="n">${lv1}</span> <span class="mono ${d>=0?"":"muted"}" style="font-size:.9rem">${d>=0?"+":""}${d.toFixed(1)}</span></div><span class="muted">${lv1!==sess.lv0?`Subiste desde ${sess.lv0}`:"Se ajusta con cada ejercicio"}</span></div>
  </div>
  ${(sess.newAch||[]).length?`<div class="card stack" style="gap:8px"><span class="eyebrow">Logros nuevos</span><div class="row">${sess.newAch.map(id=>{const a=ACH.find(x=>x.id===id);return`<span class="chip ok">${esc(a.n)}</span>`}).join("")}</div></div>`:""}
  <div class="grid2">
    <div class="card stack" style="gap:8px"><span class="eyebrow">Patrones entrenados</span><div class="list">${patsTouched.map(p=>{const st=patStatus(p);return`<div class="li"><div class="grow">${PATS[p]}</div><span class="chip ${st.cls}">${st.t}</span></div>`}).join("")}</div></div>
    <div class="card stack" style="gap:8px"><span class="eyebrow">Para tu cuaderno de errores</span>
    ${wrong.length?`<div class="list">${wrong.map(e=>`<div class="li"><div class="grow stack" style="gap:2px"><span style="font-size:.95rem">${esc(e.s||e.q)}</span><b style="font-size:.95rem">${esc(correctText(e))}</b></div></div>`).join("")}</div><p class="muted" style="font-size:.85rem">Volverán mañana. Cada acierto los aleja un poco más.</p>`:`<p class="muted">Sin errores en esta sesión. Estos ejercicios volverán más espaciados.</p>`}
    ${improved.length?`<p style="font-size:.92rem">Mejorando: <b>${improved.map(p=>PATS[p]).join(", ")}</b>.</p>`:""}</div>
  </div>
  <div class="row"><button class="btn primary big" data-act="end-summary" data-autofocus>Volver a Hoy</button><button class="btn ghost sm" data-act="go-after" data-v="review">Ver cuaderno de errores</button></div></section>`;
}

/* ---------- review ---------- */
function vReview(){
  const pats=Object.keys(PATS).map(p=>({p,st:patStatus(p),a:patAcc(p),n:(state.pats[p]||{}).n||0}));
  const order={recurring:0,new:1,progress:2,improving:3,mastered:4,none:5};
  pats.sort((x,y)=>order[x.st.k]-order[y.st.k]||((x.a??1)-(y.a??1)));
  const nDue=dueCount();
  const seen=new Set();const mist=state.mistakes.filter(m=>{if(seen.has(m.id)||!EX[m.id])return false;seen.add(m.id);return true}).slice(0,25);
  return`<section class="stack" style="padding-top:18px">
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:6px"><span class="eyebrow">Repaso espaciado</span><h1>Review</h1></div>
  <button class="btn primary" data-act="start-review" ${nDue?"":"disabled"}>Repaso rápido · ${nDue}</button></div>
  <div class="card stack" style="gap:6px"><span class="eyebrow">Patrones de error</span>
  <div class="list">${pats.map(x=>`<div class="li"><div class="grow"><b>${PATS[x.p]}</b><div class="muted mono" style="font-size:.78rem">${x.n} intentos</div></div>
    <div class="hbar"><i style="width:${x.a==null?0:Math.round(x.a*100)}%;background:${x.a==null?"var(--line)":x.a>=.8?"var(--ok)":x.a>=.55?"var(--plate-1)":"var(--bad)"}"></i></div>
    <span class="mono" style="width:44px;text-align:right">${x.a==null?"—":Math.round(x.a*100)+"%"}</span><span class="chip ${x.st.cls}" style="min-width:110px;justify-content:center">${x.st.t}</span></div>`).join("")}</div>
  <p class="muted" style="font-size:.85rem">Precisión de tus últimos 10 intentos por patrón. “Error recurrente” significa 2 o más fallos en los últimos 6 intentos.</p></div>
  <div class="card stack" style="gap:6px"><span class="eyebrow">Cuaderno de errores</span>
  ${mist.length?`<div class="list">${mist.map(m=>{const e=EX[m.id],st=itemStatus(state.items[m.id]),r=state.items[m.id];return`<div class="li"><div class="grow stack" style="gap:3px">
    <span class="muted" style="font-size:.85rem">${esc(e.q)}</span>
    ${e.s&&e.t!=="build"?`<span>${esc(e.s)}</span>`:""}
    ${m.a?`<span style="font-size:.92rem"><span class="muted">Tu respuesta:</span> <s>${esc(m.a)}</s></span>`:""}
    <span style="font-size:.92rem"><span class="muted">Correcta:</span> <b>${esc(correctText(e))}</b></span>
    <span class="muted mono" style="font-size:.75rem">${PATS[e.p]} · fallado ${prettyD(m.d)} · ${r&&r.due?(r.due<=today()?"repaso hoy":"vuelve "+prettyD(r.due)):""}</span></div>
    ${st?`<span class="chip ${st.cls}">${st.t}</span>`:""}</div>`}).join("")}</div>`
  :`<p class="muted">Aún no hay errores guardados. Cuando falles un ejercicio, aparecerá aquí con su explicación y la fecha en que vuelve.</p>`}</div>
  </section>`;
}
const PAT2CAT={sva:"gram",prep:"gram",tense:"gram",order:"arch",literal:"think",colloc:"colloc",vocab:"vocab",struct:"arch",natural:"write",register:"acad"};

/* ---------- writing lab ---------- */
const WRITE_PROMPTS=()=>Object.values(EX).filter(e=>e.t==="write");
function vLab(){
  const ps=WRITE_PROMPTS();const cur=labUI.prompt?EX[labUI.prompt]:null;
  const n=wc(labUI.draft);
  const A=texts.find(t=>t.id===labUI.cmpA),B=texts.find(t=>t.id===labUI.cmpB);
  return`<section class="stack" style="padding-top:18px">
  <div class="stack" style="gap:6px"><span class="eyebrow">Escribe, guarda y compara con el tiempo</span><h1>Writing Lab</h1></div>
  <div class="card stack">
    <label class="eyebrow" for="lab-prompt">Tema</label>
    <select id="lab-prompt">${`<option value="">Elige un tema…</option>`+ps.map(p=>`<option value="${p.id}" ${p.id===labUI.prompt?"selected":""}>${TIERS[p.l].kg} kg · ${esc(p.q.length>80?p.q.slice(0,78)+"…":p.q)}</option>`).join("")}</select>
    ${cur?`<p class="ex-q">${esc(cur.q)}</p><p class="muted">${cur.min}–${cur.max} palabras · ${esc(cur.e)}</p>
    ${wotdChallenge()}${editorHTML("lab",cur,labUI.draft)}
    <div class="row"><button class="btn primary" data-act="lab-save" ${n<10?"disabled":""} id="lab-save-btn">Guardar texto</button></div>`:`<p class="muted">Elige un tema para empezar. Tus textos se guardan con fecha para que puedas comparar cómo escribías antes y ahora.</p>`}
  </div>
  <div class="card stack" style="gap:6px"><span class="eyebrow">Tus textos · ${texts.length}</span>
  ${texts.length?`<div class="list">${texts.map(t=>`<div class="li"><div class="grow stack" style="gap:2px"><b style="font-size:.95rem">${esc(t.prompt.length>90?t.prompt.slice(0,88)+"…":t.prompt)}</b>
    <span class="muted mono" style="font-size:.75rem">${prettyD(t.d)} · ${t.metrics.words} palabras · ${t.metrics.avg} pal/oración · ${t.metrics.conns.length} conectores${t.mode&&t.mode!=="escrito"?" · "+t.mode:""}${t.score?" · nota ≈ "+t.score.lvl+" ("+t.score.avg.toFixed(1)+"/5)":""}${(t.usedWords||[]).length?" · Word Bank: "+esc(t.usedWords.join(", ")):""}</span></div>
    <div class="row" style="gap:6px"><button class="btn sm ${labUI.cmpA===t.id?"primary":""}" data-act="cmp" data-slot="A" data-id="${t.id}">A</button><button class="btn sm ${labUI.cmpB===t.id?"primary":""}" data-act="cmp" data-slot="B" data-id="${t.id}">B</button>
    ${labUI.del===t.id?`<button class="btn sm" data-act="lab-del-yes" data-id="${t.id}" style="color:var(--bad)">Confirmar borrar</button>`:`<button class="btn ghost sm" data-act="lab-del" data-id="${t.id}">Borrar</button>`}</div></div>`).join("")}</div>
    <p class="muted" style="font-size:.85rem">Marca un texto como A y otro como B para compararlos.</p>`
  :`<p class="muted">Todavía no hay textos. El finisher de cada sesión también se guarda aquí.</p>`}
  ${labUI.err?`<p class="muted">${esc(labUI.err)}</p>`:""}</div>
  ${A&&B?vCompare(A,B):""}
  <div class="card stack" style="gap:8px"><span class="eyebrow">Tu perfil de oraciones</span>${profileHTML()}</div>
  <details class="card"><summary style="cursor:pointer"><span class="eyebrow">Tu modelo de errores</span></summary><div style="margin-top:12px">${modelHTML()}</div></details>
  </section>`;
}
function vCompare(A,B){
  const [o,nw]=A.ts<=B.ts?[A,B]:[B,A];
  const rows=[["Palabras","words"],["Oraciones","sents"],["Palabras por oración","avg"],["Variedad léxica (%)","variety"]];
  return`<div class="card stack"><span class="eyebrow">Comparación · ${prettyD(o.d)} → ${prettyD(nw.d)}</span>
  <div class="table-wrap"><table><thead><tr><th>Métrica</th><th>${prettyD(o.d)}</th><th>${prettyD(nw.d)}</th></tr></thead><tbody>
  ${rows.map(([l,k])=>`<tr><td>${l}</td><td class="num">${o.metrics[k]}</td><td class="num">${nw.metrics[k]}</td></tr>`).join("")}
  <tr><td>Conectores</td><td>${esc(o.metrics.conns.join(", ")||"—")}</td><td>${esc(nw.metrics.conns.join(", ")||"—")}</td></tr>
  <tr><td>Palabras genéricas</td><td>${esc(o.metrics.weak.join(", ")||"—")}</td><td>${esc(nw.metrics.weak.join(", ")||"—")}</td></tr>
  ${(()=>{const so=o.score||null,sn=nw.score||null;if(!so&&!sn)return"";const g=(x,k)=>x&&x.c&&x.c[k]!=null?x.c[k]+"/5":"—";
    return`<tr><td><b>Nota estimada</b></td><td class="num">${so?so.lvl+" · "+so.avg.toFixed(1):"—"}</td><td class="num">${sn?sn.lvl+" · "+sn.avg.toFixed(1):"—"}</td></tr>`+Object.keys(CRIT_N).map(k=>`<tr><td>· ${CRIT_N[k]}</td><td class="num">${g(so,k)}</td><td class="num">${g(sn,k)}</td></tr>`).join("")})()}
  <tr><td>Sugerencias del corrector local</td><td class="num">${analyzeText(o.body).issues.length}</td><td class="num">${analyzeText(nw.body).issues.length}</td></tr>
  <tr><td>Palabras del Word Bank usadas</td><td>${esc((o.usedWords||[]).join(", ")||"—")}</td><td>${esc((nw.usedWords||[]).join(", ")||"—")}</td></tr>
  <tr><td>Nivel estimado al escribir</td><td>${cefr(o.skill)}</td><td>${cefr(nw.skill)}</td></tr>
  </tbody></table></div>
  <div class="cmp"><div class="stack" style="gap:6px"><span class="eyebrow">${prettyD(o.d)}</span><div class="textbox">${esc(o.body)}</div></div>
  <div class="stack" style="gap:6px"><span class="eyebrow">${prettyD(nw.d)}</span><div class="textbox">${esc(nw.body)}</div></div></div></div>`;
}

/* ---------- progress ---------- */
function skillChart(){
  const h=state.hist.slice(-40);
  if(h.length<2)return`<p class="muted">La gráfica aparece después de tu segunda sesión.</p>`;
  const W=640,H=220,pl=40,pr=12,pt=12,pb=26,ymin=Math.max(0,Math.floor((Math.min(...h.map(x=>x.s))-8)/10)*10),ymax=Math.min(100,Math.ceil((Math.max(...h.map(x=>x.s))+8)/10)*10);
  const X=i=>pl+(W-pl-pr)*(i/(h.length-1)),Y=v=>pt+(H-pt-pb)*(1-(v-ymin)/(ymax-ymin));
  const bands=BANDS.filter(b=>b[1]&&b[0]>ymin&&b[0]<ymax);
  const pts=h.map((p,i)=>`${X(i).toFixed(1)},${Y(p.s).toFixed(1)}`).join(" ");
  const area=`M${X(0)},${Y(ymin)} L${pts.replace(/ /g," L")} L${X(h.length-1)},${Y(ymin)} Z`;
  return`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Nivel estimado por sesión">
  ${bands.map(b=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(b[0])}" y2="${Y(b[0])}" stroke="var(--line)" stroke-dasharray="4 4"/><text x="${pl-6}" y="${Y(b[0])+4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--muted)">${b[1]}</text>`).join("")}
  <path d="${area}" fill="var(--accent)" fill-opacity="0.1"/>
  <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="${X(h.length-1)}" cy="${Y(h[h.length-1].s)}" r="5" fill="var(--accent)"/>
  <text x="${pl}" y="${H-6}" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--muted)">${prettyD(h[0].d)}</text>
  <text x="${W-pr}" y="${H-6}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--muted)">${prettyD(h[h.length-1].d)}</text>
  </svg></div>`;
}
function vProgress(){
  const S=state.sessions,tot=S.reduce((a,s)=>a+s.n,0),ok=S.reduce((a,s)=>a+s.ok,0),mins=Math.round(Object.values(state.time||{}).reduce((a,b)=>a+b,0)/60);
  const catStats={};Object.entries(state.items).forEach(([id,r])=>{const e=EX[id];if(!e||e.t==="write")return;const c=catStats[e.c]||(catStats[e.c]={n:0,ok:0});c.n+=r.n;c.ok+=r.ok});
  const mastered=Object.keys(PATS).filter(p=>patStatus(p).k==="mastered").length;
  return`<section class="stack" style="padding-top:18px">
  <div class="stack" style="gap:6px"><span class="eyebrow">Mejora medible, no solo XP</span><h1>Progress</h1></div>
  <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
    <div class="card stat"><span class="eyebrow">Sesiones</span><div class="n mono">${S.length}</div></div>
    <div class="card stat"><span class="eyebrow">Días entrenados</span><div class="n mono">${state.days.length}</div></div>
    <div class="card stat"><span class="eyebrow">Precisión total</span><div class="n mono">${tot?Math.round(ok/tot*100):0}%</div></div>
    <div class="card stat"><span class="eyebrow">Minutos de estudio</span><div class="n mono">${mins}</div></div>
    <div class="card stat"><span class="eyebrow">Patrones dominados</span><div class="n mono">${mastered}</div></div>
  </div>
  <div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="eyebrow">Nivel estimado por sesión</span><span class="chip acc">${cefr(state.skill)} · ${Math.round(state.skill)}</span></div>${skillChart()}
  ${state.startLevel?`<p class="muted" style="font-size:.85rem">Punto de partida: ${state.startLevel}.</p>`:""}</div>
  <div class="card stack" style="gap:6px"><span class="eyebrow">Por categoría</span><div class="list">
  ${Object.keys(CATS).map(c=>{const s=catStats[c];const a=s&&s.n?s.ok/s.n:null;return`<div class="li"><div class="grow"><b>${CATS[c].n}</b><div class="muted" style="font-size:.85rem">${CATS[c].g}</div></div><div class="hbar"><i style="width:${a==null?0:Math.round(a*100)}%;background:var(--accent)"></i></div><span class="mono" style="width:44px;text-align:right">${a==null?"—":Math.round(a*100)+"%"}</span></div>`}).join("")}</div></div>
  <div class="card stack" style="gap:10px"><span class="eyebrow">Logros · ${Object.keys(state.ach).length} / ${ACH.length}</span>
  <div class="ach">${ACH.map(a=>`<div class="a ${state.ach[a.id]?"":"locked"}"><b>${esc(a.n)}</b><span class="muted" style="font-size:.85rem">${esc(a.d)}</span>${state.ach[a.id]?`<span class="mono" style="font-size:.72rem;color:var(--ok)">${prettyD(state.ach[a.id])}</span>`:""}</div>`).join("")}</div></div>
  ${S.length?`<div class="card stack" style="gap:6px"><span class="eyebrow">Historial</span><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Ejercicios</th><th>Precisión</th><th>XP</th><th>Nivel</th></tr></thead><tbody>
  ${S.slice(-12).reverse().map(s=>`<tr><td>${prettyD(s.d)}</td><td>${s.review?"Repaso":"Sesión"}</td><td class="num">${s.n}</td><td class="num">${s.n?Math.round(s.ok/s.n*100):0}%</td><td class="num">${s.xp}</td><td>${cefr(s.skill)}</td></tr>`).join("")}</tbody></table></div></div>`:""}
  <div class="card stack" style="gap:10px"><span class="eyebrow">Ajustes</span>
    <label for="lang-set">Idioma de las instrucciones</label>
    <select id="lang-set" style="max-width:360px"><option value="auto" ${state.lang==="auto"?"selected":""}>Automático (más inglés desde C1)</option><option value="es" ${state.lang==="es"?"selected":""}>Español</option><option value="en" ${state.lang==="en"?"selected":""}>English</option></select>
    <p class="muted" style="font-size:.85rem">Las explicaciones siguen en español para que el razonamiento quede claro.</p>
    <span class="eyebrow" style="margin-top:6px">Copia de seguridad</span>
    <p class="muted" style="font-size:.85rem">Tu progreso vive en este navegador. Copia el respaldo para pasarlo a otro dispositivo o guardarlo; pégalo abajo para restaurarlo.</p>
    <div class="row"><button class="btn sm" data-act="backup-copy">Copiar respaldo</button></div>
    <textarea id="bk-out" rows="3" readonly hidden style="font-family:var(--f-mono);font-size:.75rem"></textarea>
    <textarea id="bk-in" rows="2" placeholder="Pega aquí un respaldo para restaurarlo" style="font-family:var(--f-mono);font-size:.75rem"></textarea>
    <div class="row"><button class="btn sm" data-act="backup-import">Restaurar respaldo</button></div>
    <div class="row"><button class="btn sm" data-act="redo-placement">Repetir evaluación inicial</button>
    ${reviewUI.confirmReset?"":`<button class="btn ghost sm" data-act="reset" style="color:var(--bad)">Borrar todo el progreso</button>`}</div>
    ${reviewUI.confirmReset?`<div class="confirm"><b>¿Borrar todo tu progreso?</b><span>Se eliminan nivel, historial, errores y logros. Tus textos del Writing Lab se conservan. No se puede deshacer.</span><div class="row"><button class="btn sm" data-act="reset-yes" style="color:var(--bad);border-color:var(--bad)">Sí, borrar progreso</button><button class="btn sm" data-act="reset-no">Cancelar</button></div></div>`:""}
  </div></section>`;
}

/* ============================== WORD BANK LOGIC ============================== */
function allWords(){return WORDS.concat(state.customWords||[])}
function baseOf(wd){return wd.w.replace(/^to /i,"")}
function wordExercises(){
  const ws=allWords(),out=[];
  const tierOf=c=>c==="ff"||c==="own"?2:3;
  for(const wd of ws){
    const others=ws.filter(x=>x.id!==wd.id);
    const same=others.filter(x=>x.cat===wd.cat);
    const pool=(same.length>=3?same:others);
    const d=shuffle(pool).slice(0,3);
    const mOpts=[wd.short].concat(wd.fals?[wd.fals]:[]).concat(d.map(x=>x.short)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3);
    out.push({id:"wb-"+wd.id+"-m",c:"vocab",t:"mc",l:tierOf(wd.cat),p:wd.cat==="ff"?"literal":"vocab",wb:true,wid:wd.id,
      q:`What does “${wd.w}” mean?`,s:wd.ex,o:mOpts,a:0,ok:"-"+"m".repeat(mOpts.length-1),
      e:`${wd.w}: ${wd.es}.${wd.trap?" "+wd.trap:""}`,x:wd.ex});
    const form=wd.form||baseOf(wd);
    const idx=wd.ex?wd.ex.toLowerCase().indexOf(form.toLowerCase()):-1;
    if(idx>=0){
      const samePos=pool.filter(x=>x.pos===wd.pos&&x.form);const dd=shuffle(samePos.length>=2?samePos:pool.filter(x=>x.form)).slice(0,2);
      const blanked=wd.ex.slice(0,idx)+"___"+wd.ex.slice(idx+form.length);
      const lc=s=>idx===0?s.charAt(0).toUpperCase()+s.slice(1):s;
      const opts=[lc(form)].concat(dd.map(x=>lc(idx===0?x.form:x.form.charAt(0).toLowerCase()+x.form.slice(1))));
      if(opts.length>=2)out.push({id:"wb-"+wd.id+"-c",c:"vocab",t:"mc",l:tierOf(wd.cat),p:wd.cat==="ff"?"literal":"vocab",wb:true,wid:wd.id,
        q:"Choose the word that fits best.",s:blanked,o:opts,a:0,ok:"-"+"m".repeat(opts.length-1),
        e:`${wd.w} = ${wd.es}.${wd.trap?" "+wd.trap:""}`,x:wd.ex});
    }
  }
  return out;
}
function wordRec(id){return state.words[id]||(state.words[id]={n:0,ok:0,box:0,due:null,first:null,lastKind:null,used:0,usedD:null})}
function wordStatus(id){const r=state.words[id];
  if(r&&r.used>0)return{t:"Activa",cls:"ok",k:"active"};
  if(!r||!r.n)return{t:"Nueva",cls:"",k:"new"};
  if(r.box>=3)return{t:"Reconocida",cls:"acc",k:"known"};
  return{t:"Aprendiendo",cls:"warn",k:"learning"}}
function pickWords(n,maxNew,excl){
  const t=today(),ws=allWords().filter(w=>w.id!==excl);
  const due=ws.filter(w=>{const r=state.words[w.id];return r&&r.n&&r.due&&r.due<=t}).sort((a,b)=>state.words[a.id].box-state.words[b.id].box);
  const fresh=ws.filter(w=>!state.words[w.id]||!state.words[w.id].n).sort((a,b)=>(a.cat==="own"?0:1)-(b.cat==="own"?0:1));
  const newToday=Object.values(state.words).filter(r=>r.first===t).length;
  const out=due.slice(0,n);let added=0;
  for(const w of fresh){if(out.length>=n||newToday+added>=maxNew)break;out.push(w);added++}
  return out.map(w=>{const r=state.words[w.id];const hasC=!!EX["wb-"+w.id+"-c"];
    const kind=(!r||!r.n)?"m":(hasC&&(r.lastKind==="m"||Math.random()<.5)?"c":"m");return"wb-"+w.id+"-"+kind});
}
function recordWord(ex,ok){
  const r=wordRec(ex.wid),t=today();r.n++;if(ok){r.ok++;r.box=Math.min(r.box+1,5)}else{r.box=0;r.lastWrong=Date.now()}
  r.due=addDays(t,INTERVALS[r.box]);if(!r.first)r.first=t;r.lastKind=ex.id.slice(-1);
}
function wordRegex(wd){const b=baseOf(wd).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/-/g,"[- ]?");
  return new RegExp("\\b("+b+"(s|es|d|ed|ing|ly)?|"+(wd.form||b).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")\\b","i")}
function markUsedWords(body){const used=[];for(const wd of allWords()){if(wordRegex(wd).test(body)){const r=wordRec(wd.id);r.used++;r.usedD=today();used.push(wd.w)}}return used}

/* ============================== LOCAL WRITING COACH ============================== */
const kc=(orig,rep)=>orig&&orig[0]&&orig[0]!==orig[0].toLowerCase()?rep.charAt(0).toUpperCase()+rep.slice(1):rep;
const lo=s=>String(s).toLowerCase();
const RULE=(id,re,pat,kind,p0,msg,fix,opt={})=>Object.assign({id,re,pat,kind,p0,msg,fix},opt);
const MAPDO={do:"make",does:"makes",did:"made",doing:"making"},MAPMAKE={make:"do",makes:"does",made:"did",making:"doing"},MAPPARTY={make:"have",makes:"has",made:"had",making:"having"};
const UNC={informations:"information",advices:"advice",feedbacks:"feedback",homeworks:"homework",furnitures:"furniture",equipments:"equipment",knowledges:"knowledge",researches:"research"};
const RULES=[
RULE("depend-of",/\b(depend|depends|depended|depending) of\b/gi,"prep","g",.95,"Depend va con on, no con of.",m=>m[1]+" on"),
RULE("interested-on",/\binterested (on|for)\b/gi,"prep","g",.95,"Se dice interested in.",m=>kc(m[0],"interested in")),
RULE("good-in",/\b(good|bad|better|great) in (?=\w+ing\b)/gi,"prep","g",.8,"Para habilidades: good at + -ing.",m=>m[1]+" at "),
RULE("arrive-to",/\barriv(e|es|ed|ing) to\b/gi,"prep","g",.85,"No se usa arrive to: arrive at (lugar concreto) o arrive in (ciudad o país).",m=>"arriv"+m[1]+" at"),
RULE("married-with",/\bmarried with\b/gi,"prep","g",.9,"Se dice married to someone.",()=>"married to"),
RULE("discuss-about",/\bdiscuss(es|ed|ing)? about\b/gi,"prep","g",.9,"Discuss no lleva about.",m=>kc(m[0],"discuss"+(m[1]||""))),
RULE("explain-me",/\bexplain(s|ed)? (me|us|him|her|them)\b/gi,"prep","g",.9,"Explain something to someone: “explain it to me”.",null),
RULE("listen-x",/\blisten(s|ed|ing)? (?!to\b)(music|me|him|her|them|us|the|my|your|this|that|podcasts?)\b/gi,"prep","g",.85,"Listen necesita to antes del objeto.",m=>kc(m[0],"listen"+(m[1]||"")+" to "+m[2])),
RULE("enter-to",/\benter(s|ed)? (to|in|into) (the |my |our |a )?(room|class|classroom|building|office|house|university)\b/gi,"prep","g",.8,"Enter no lleva preposición: enter the room.",m=>kc(m[0],"enter"+(m[1]||"")+" "+(m[3]||"")+m[4])),
RULE("a-uncount",/\ba (research|information|advice|feedback|homework|furniture|equipment|knowledge)\b/gi,"prep","g",.85,"Sustantivo incontable: no lleva a. Usa some, a piece of o nada.",m=>m[1]),
RULE("uncount-pl",/\b(informations|advices|feedbacks|homeworks|furnitures|equipments|knowledges|researches)\b/gi,"prep","g",.9,"Sustantivo incontable: no lleva -s.",m=>kc(m[1],UNC[lo(m[1])])),
RULE("people-is",/\bpeople (is|was|has)\b/gi,"sva","g",.9,"People es plural: people are / were / have.",m=>kc(m[0],"people "+({is:"are",was:"were",has:"have"}[lo(m[1])]))),
RULE("everyone-have",/\b(everyone|everybody|nobody|someone|somebody) (have|are|were|don't|do)\b/gi,"sva","g",.85,"Everyone, nobody, someone… son gramaticalmente singulares.",m=>m[1]+" "+({have:"has",are:"is",were:"was","don't":"doesn't",do:"does"}[lo(m[2])])),
RULE("he-have",/(?<!\b(?:does|did|do|will|would|can|could|should|might|must|may|to|let|make|makes|help|helps|not|that)\s)\b(he|she|it) (have|don't)\b/gi,"sva","g",.8,"Con he / she / it: has, doesn't.",m=>m[1]+" "+({have:"has","don't":"doesn't"}[lo(m[2])])),
RULE("number-of",/\bthe number of (\w+) (have|are|were)\b/gi,"sva","g",.85,"“The number of…” es singular.",m=>kc(m[0],"the number of "+m[1]+" "+({have:"has",are:"is",were:"was"}[lo(m[2])]))),
RULE("age",/\b(I|you|he|she|we|they) (have|has) (\d{1,2}|seventeen|eighteen|nineteen|twenty[- ]?\w*|thirty[- ]?\w*) years\b(?! of\b)(?!\s+(?:studying|working|living|learning|doing))/gi,"literal","g",.9,"La edad se dice con be: I am 25 (years old).",m=>m[1]+" "+({i:"am",you:"are",he:"is",she:"is",we:"are",they:"are"}[lo(m[1])])+" "+m[3]+" years old"),
RULE("years-ing",/\b(I|we|they|you) (have|has) (\d+|two|three|four|five|six|seven|eight|nine|ten|many|several) (years|months|weeks) (studying|working|living|learning|doing|playing)\b/gi,"literal","g",.9,"“Tengo X años estudiando” → have been + -ing + for.",m=>m[1]+" have been "+m[5]+" for "+m[3]+" "+m[4]),
RULE("since-dur",/\bsince (\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several|many) (years?|months?|weeks?|days?|hours?)\b/gi,"tense","g",.9,"Con una cantidad de tiempo se usa for; since va con un punto de inicio (since 2023).",m=>kc(m[0],"for "+m[1]+" "+m[2])),
RULE("present-since",/\b(I am|I'm|we are|we're|they are|they're|she is|she's|he is|he's) (living|studying|working|learning)\b[^.!?]{0,30}?\b(since|for) /gi,"tense","g",.8,"Acción que empezó en el pasado y sigue: present perfect continuous (I have been living… since/for).",null),
RULE("first-time",/\b(first time) (I|we|they|she|he) (visit|go|try|see|eat|come|travel)\b/gi,"tense","g",.75,"Después de “the first time” se usa present perfect: the first time I have visited.",null),
RULE("if-would",/\bif (I|you|we|they|he|she|it) would\b/gi,"tense","g",.65,"Normalmente no se usa would después de if: “If I had…, I would…”.",null),
RULE("agree",/\b(I|we|they|you|he|she)( am|'m| are|'re| is|'s) agree\b/gi,"literal","g",.95,"Agree es verbo: I agree (no “I am agree”).",m=>m[1]+" "+(/^(he|she)$/i.test(m[1])?"agrees":"agree")),
RULE("want-that",/\b(want|wants|wanted) that\b/gi,"literal","g",.9,"Quiero que… → want + persona + to: “I want you to come”.",null),
RULE("assist",/\bassist(s|ed|ing)? (to |at )?(the |a |my |our |this )?(class|classes|conference|meeting|lecture|event|workshop|course|seminar|party|wedding)\b/gi,"literal","m",.9,"Falso amigo: assist = ayudar. Ir a un evento es attend.",m=>kc(m[0],"attend"+(m[1]||"")+" "+(m[3]||"")+m[4])),
RULE("actually",/\bactually,? (I|we|they) (work|study|live|am working|am studying|am living)\b/gi,"literal","m",.6,"¿Querías decir “actualmente”? Eso es currently. Actually = en realidad.",m=>kc(m[0],"currently "+m[1]+" "+m[2])),
RULE("pretend-intend",/\b(I|we|they) (pretend|pretended) to (study|work|apply|travel|finish|start|continue|become|do)\b/gi,"literal","m",.55,"Falso amigo: pretend = fingir. Si quieres decir “tener la intención”, usa intend o plan.",m=>m[1]+" "+(lo(m[2])==="pretend"?"intend":"intended")+" to "+m[3]),
RULE("assume-resp",/\bassum(e|ed|ing) (the |a |my |full )?(responsibility|role|leadership|cost|costs)\b/gi,"literal","m",.6,"Falso amigo: para responsabilidades o roles es más natural take on.",m=>({e:"take on",ed:"took on",ing:"taking on"}[lo(m[1])])+" "+(m[2]||"")+m[3]),
RULE("have-hunger",/\b(have|has|had) (hunger|thirst)\b/gi,"literal","g",.85,"Tener hambre / sed → be hungry / thirsty.",null),
RULE("how-called",/\bhow (is|was) (it )?called\b/gi,"literal","g",.85,"¿Cómo se llama? → What is it called?",null),
RULE("double-neg",/\b(don't|doesn't|didn't|can't|won't|never|wasn't|isn't|aren't) (\w+ )?(nothing|nobody|nowhere)\b/gi,"literal","g",.8,"Doble negación (calco del español): usa anything / anybody / anywhere.",m=>m[1]+" "+(m[2]||"")+({nothing:"anything",nobody:"anybody",nowhere:"anywhere"}[lo(m[3])])),
RULE("make-research",/\b(make|makes|made|making) (a )?research\b/gi,"colloc","g",.9,"Se dice do research (research es incontable).",m=>kc(m[0],MAPMAKE[lo(m[1])]+" research")),
RULE("do-mistake",/\b(do|does|did|doing) (a |an |the |many |some )?(mistakes?|decisions?|effort|progress|noise)\b/gi,"colloc","n",.85,"Con este sustantivo el verbo natural es make.",m=>kc(m[0],MAPDO[lo(m[1])]+" "+(m[2]||"")+m[3])),
RULE("make-party",/\b(make|makes|made|making) a party\b/gi,"colloc","n",.9,"Se dice have o throw a party.",m=>kc(m[0],MAPPARTY[lo(m[1])]+" a party")),
RULE("make-homework",/\b(make|makes|made|making) (my |the |our |your |his |her )?(homework|exercises?)\b/gi,"colloc","n",.85,"Con tareas y ejercicios se usa do.",m=>kc(m[0],MAPMAKE[lo(m[1])]+" "+(m[2]||"")+m[3])),
RULE("take-account",/\btake in account\b/gi,"colloc","g",.9,"La expresión es take into account.",()=>"take into account"),
RULE("reason-because",/\breason (is|was) because\b/gi,"natural","n",.85,"Redundante: “the reason is that…”.",m=>"reason "+m[1]+" that"),
RULE("despite-of",/\bdespite of\b/gi,"struct","g",.95,"Despite no lleva of (in spite of sí).",m=>kc(m[0],"despite")),
RULE("despite-clause",/\bdespite (I|we|they|he|she|it|you) (was|were|am|is|are|had|have|did|didn't|could)\b/gi,"struct","g",.75,"Despite va con sustantivo o -ing. Con una oración completa usa although.",null),
RULE("more-er",/\bmore (better|worse|easier|harder|bigger|smaller|faster|cheaper|happier)\b/gi,"struct","g",.95,"Doble comparativo: sobra more.",m=>m[1]),
RULE("more-good",/\bmore (good|bad)\b/gi,"struct","g",.85,"Comparativo irregular: better / worse.",m=>lo(m[1])==="good"?"better":"worse"),
RULE("other-hand",/\bin the other hand\b/gi,"natural","n",.95,"La expresión es on the other hand.",m=>kc(m[0],"on the other hand")),
RULE("personal-opinion",/\bin my personal opinion,? I think( that)?\b/gi,"natural","n",.85,"Redundante: basta con “In my opinion” o “I think”.",m=>kc(m[0],"in my opinion")),
RULE("due-fact",/\bdue to the fact that\b/gi,"natural","n",.7,"Más conciso: because o since.",m=>kc(m[0],"because")),
RULE("then-than",/\b(more|less|better|worse|rather|bigger|smaller|faster|easier|harder|higher|lower|cheaper|older|younger|larger) then\b/gi,"natural","g",.75,"En comparaciones se usa than (then = luego).",m=>m[1]+" than"),
RULE("your-welcome",/\byour (welcome|right|wrong|going|not)\b/gi,"natural","g",.85,"Aquí va you're (you are).",m=>kc(m[0],"you're "+m[1])),
RULE("their-is",/\btheir (is|are|was|were)\b/gi,"natural","g",.9,"Para “hay” se usa there.",m=>kc(m[0],"there "+m[1])),
RULE("should-of",/\b(should|could|would|must|might) of\b/gi,"natural","g",.95,"Se escribe have (en voz suena parecido a of).",m=>m[1]+" have"),
RULE("its-own",/\bit's (own|color|colour|size|name|goal|purpose)\b/gi,"natural","g",.8,"Posesivo: its, sin apóstrofe.",m=>kc(m[0],"its "+m[1])),
RULE("informal",/\b(wanna|gonna|gotta|kinda|sorta|ain't)\b/gi,"register","r",.75,"Demasiado informal para un texto escrito.",m=>({wanna:"want to",gonna:"going to",gotta:"have to",kinda:"somewhat",sorta:"somewhat","ain't":"is not"}[lo(m[1])])),
RULE("stuff",/\b(stuff|things like that)\b/gi,"register","r",.5,"Vago e informal: nombra la cosa concreta.",null),
RULE("a-lot-formal",/\ba lot of\b/gi,"register","r",.6,"En registro formal: a great deal of, numerous o a considerable number of.",null,{formalOnly:true}),
RULE("start-and",/(^|[.!?]\s+)(And|But|So) /g,"register","r",.5,"En textos formales evita empezar con And, But o So: usa Moreover, However o Therefore.",null,{formalOnly:true}),
RULE("lower-i",/(^|[\s"(])i(?=[\s,.!?;:']|$)/g,"struct","g",.95,"El pronombre I siempre va en mayúscula.",m=>m[1]+"I"),
RULE("a-an",/\b(a) ((?!(?:eu|one|once|uni|use|usu|uti|ura|uro|ure|ubi))[aeiou][a-z]*)/gi,"prep","g",.7,"Antes de sonido vocálico se usa an.",m=>kc(m[1],"an")+" "+m[2]),
RULE("an-a",/\b(an) ((?!(?:hour|honest|honou?r|heir|mba|fbi|mri|x-ray|sms|nba|mvp))[bcdfghjklmnpqrstvwxyz][a-z]*)/gi,"prep","g",.7,"Antes de sonido consonante se usa a.",m=>kc(m[1],"a")+" "+m[2]),
RULE("very-adj",/\b(very|really|so) (important|big|good|bad|tired|happy|sad|interesting|difficult|hard|small|angry|hungry|cold|hot|scared|beautiful)\b/gi,"vocab","v",.5,"Nivel C1: un adjetivo fuerte suena más preciso que very + adjetivo.",m=>({important:"crucial",big:"huge",good:"excellent",bad:"terrible",tired:"exhausted",happy:"delighted",sad:"devastated",interesting:"fascinating",difficult:"challenging",hard:"challenging",small:"tiny",angry:"furious",hungry:"starving",cold:"freezing",hot:"boiling",scared:"terrified",beautiful:"stunning"}[lo(m[2])]))
];
const KIND_UI={o:["Ortografía","bad"],g:["Error gramatical","bad"],n:["Poco natural","warn"],r:["Registro","warn"],m:["Falso amigo","bad"],s:["Estructura","acc"],v:["Vocabulario C1","acc"]};
const SUBORD=/\b(because|although|though|which|who|whom|whose|that|when|while|whereas|if|unless|since|until|so that|even though|whether|albeit|whereby)\b/i;
const TRIG={
  tense:/\b(since|ago|already|yet|ever|never|by the time|wish|last (year|week|month|semester)|yesterday|for \w+ (years?|months?|weeks?))\b/i,
  prep:/\b(depend|interested|arriv|married|rely|focus|consist|listen|explain|discuss|responsib|afraid|similar|different|according|good at|aware)\w*/i,
  sva:/\b(everyone|everybody|nobody|somebody|people|the number of|each|neither|either)\b/i,
  order:/\b(know|tell|wonder|ask|explain)\w* (me |us )?(where|what|how|why|when|who|if|whether)\b|\b(always|never|often|usually|rarely|hardly)\b/i,
  literal:/\b(have|has) \d|\bwant\w* \w+ to\b|\bactually\b|\bassist|\brealiz|\bagree\b|\bpretend|\bassum/i,
  colloc:/\b(make|made|do|did|take|took|have|had|get|got|give|gave) (a |an |the |some )?(decision|mistake|research|effort|progress|party|homework|break|attention|photo|picture|exam|test|risk)/i,
  vocab:/\b(very|good|bad|thing|things|nice|big|a lot|really)\b/i,
  struct:/\b(although|despite|which|whose|unless|whereas|even though|not only)\b/i,
  natural:/\b(in my opinion|the fact that|it is important|nowadays|in conclusion)\b/i,
  register:/\b(I think|really|so|very|a lot|get|got|thing|stuff)\b/i
};
const TIPS={
  tense:"Revisa el tiempo verbal: ¿la acción sigue hasta hoy (present perfect) o terminó en el pasado?",
  prep:"Revisa la preposición: depend on, interested in, good at, arrive at/in.",
  sva:"Revisa la concordancia: everyone/nobody + verbo singular; people + plural.",
  order:"Revisa el orden: preguntas indirectas sin inversión; adverbios de frecuencia antes del verbo principal.",
  literal:"¿Estás traduciendo palabra por palabra? Busca falsos amigos y estructuras del español.",
  colloc:"Revisa la combinación verbo + sustantivo (make/do/take/have).",
  vocab:"¿Hay una palabra más precisa que very, good o thing?",
  struct:"Revisa la estructura: despite + sustantivo, although + oración, comas en cláusulas con which.",
  natural:"¿Se puede decir con menos palabras?",
  register:"¿El tono es lo bastante formal para esta tarea?"
};
const coachIgn={},coachCache={};
function splitSents(text){const out=[];const re=/[^.!?\n]+[.!?]*/g;let m;while((m=re.exec(text))){const raw=m[0];const lead=raw.length-raw.replace(/^\s+/,"").length;const t=raw.trim();if(t)out.push({t,start:m.index+lead,end:m.index+lead+t.length})}return out}
function ruleStat(id){return state.coach[id]||(state.coach[id]={a:0,i:0})}
function ruleConf(r){const s=state.coach[r.id]||{a:0,i:0};return(s.a+4*r.p0)/(s.a+s.i+4)}
function ruleMuted(r){const s=state.coach[r.id];return s&&s.i>=3&&ruleConf(r)<0.3}
function patErrP(p){const s=state.pats[p]||{n:0,ok:0},w=state.wpat[p]||{err:0,texts:0};
  return(s.n-s.ok+Math.min(w.err,w.texts*2)+0.6)/(s.n+w.texts+4)}
function patObs(p){const s=state.pats[p]||{n:0},w=state.wpat[p]||{texts:0};return s.n+w.texts}
function analyzeText(text,{formal=false,ign=null}={}){
  const sents=splitSents(text),issues=[];
  const sentOf=i=>sents.find(s=>i>=s.start&&i<s.end)||sents[sents.length-1]||{t:text,start:0,end:text.length};
  const push=(rule,start,end,fix,msg,kind,pat,conf)=>{const s=sentOf(start);const match=text.slice(start,end);
    const key=rule+"|"+lo(match)+"|"+lo(s.t);if(ign&&ign.has(key))return;
    issues.push({rule,start,end,match,fix,msg,kind,pat,conf,key,sStart:s.start,sEnd:s.end})};
  for(const r of RULES){
    if(r.formalOnly&&!formal)continue;if(ruleMuted(r))continue;
    r.re.lastIndex=0;let m;
    while((m=r.re.exec(text))){
      let start=m.index,end=m.index+m[0].length,fix=r.fix?r.fix(m):null;
      if(r.id==="lower-i"||r.id==="start-and"){start+=m[1].length}
      if(r.id==="lower-i")fix="I";
      if(r.id==="start-and")end=start+m[2].length;
      push(r.id,start,end,fix,r.msg,r.kind,r.pat,ruleConf(r));
      if(m[0].length===0)r.re.lastIndex++;
    }
  }
  for(const sp of spellIssues(text)){push("spell",sp.start,sp.end,sp.sg[0]||null,`“${sp.w}” no está en el diccionario. Corrígela tú: al guardar el texto se agrega a tus reps de ortografía.`,"o","spell",.92)}
  // sentence-level structure
  const sr=(id,p0)=>({id,p0});
  const RS={nosubj:sr("no-subject",.9),long:sr("long-sentence",.55),opener:sr("same-opener",.5),conn:sr("connector-overuse",.55),rep:sr("word-repeat",.45),upg:sr("bank-upgrade",.45)};
  sents.forEach(s=>{
    const m=s.t.match(/^(Is|Was|Are|Were) (very |so |really |quite )?(important|necessary|possible|impossible|difficult|easy|hard|clear|true|good|bad|interesting|better|common|normal)\b/);
    if(m&&!s.t.endsWith("?")&&!ruleMuted(RS.nosubj))push(RS.nosubj.id,s.start,s.start+m[1].length,"It "+lo(m[1]),"Falta el sujeto: en inglés siempre va (It is important…).","g","struct",ruleConf(RS.nosubj));
    const n=s.t.split(/\s+/).length;
    if(n>35&&!ruleMuted(RS.long))push(RS.long.id,s.start,Math.min(s.end,s.start+40),null,`Oración de ${n} palabras: considera dividirla en dos para ganar claridad.`,"s","struct",ruleConf(RS.long));
  });
  for(let i=2;i<sents.length;i++){const f=x=>lo(x.t.split(/\s+/)[0]);if(f(sents[i])===f(sents[i-1])&&f(sents[i])===f(sents[i-2])&&!ruleMuted(RS.opener)){const s=sents[i];push(RS.opener.id,s.start,s.start+s.t.split(/\s+/)[0].length,null,"Tres oraciones seguidas empiezan igual. Varía el inicio (un conector, una cláusula, el objeto).","s","struct",ruleConf(RS.opener))}}
  const conn=[...text.matchAll(/\b(but|however|although)\b/gi)];
  if(conn.length>=3&&!ruleMuted(RS.conn)){const c=conn[2];push(RS.conn.id,c.index,c.index+c[0].length,null,`Usas but/however/although ${conn.length} veces. Prueba whereas, albeit, nonetheless o notwithstanding (Word Bank).`,"v","struct",ruleConf(RS.conn))}
  const STOP=new Set("about after again also because before being could their there these those which while would should where other people think things really every since still being doing having".split(" "));
  const counts={};(lo(text).match(/\b[a-z]{5,}\b/g)||[]).forEach(w=>{if(!STOP.has(w))counts[w]=(counts[w]||0)+1});
  Object.entries(counts).filter(([w,c])=>c>=3).slice(0,2).forEach(([w,c])=>{if(ruleMuted(RS.rep))return;const i=lo(text).indexOf(w,lo(text).indexOf(w)+1);const j=lo(text).indexOf(w,i+1);push(RS.rep.id,j,j+w.length,null,`Repites “${w}” ${c} veces. Busca un sinónimo o un pronombre.`,"v","vocab",ruleConf(RS.rep))});
  if(!ruleMuted(RS.upg))for(const wd of allWords()){for(const b of wd.basic||[]){const i=lo(text).indexOf(lo(b));if(i>=0&&(i===0||/\W/.test(text.charAt(i-1)))&&(i+b.length>=text.length||/\W/.test(text.charAt(i+b.length)))){push(RS.upg.id,i,i+b.length,null,`Nivel C1: prueba “${wd.w}” (${wd.short}). Ej.: ${wd.ex}`,"v","vocab",ruleConf(RS.upg));break}}}
  // dedupe overlaps
  issues.sort((a,b)=>a.start-b.start||b.conf-a.conf);
  const kept=[];for(const it of issues){if(!kept.some(k=>it.start<k.end&&it.end>k.start))kept.push(it)}
  // predictive risk zones: sentences with no detected issue, weighted by this learner's error history
  const risks=[];const enough=Object.keys(PATS).reduce((a,p)=>a+patObs(p),0)>=10;
  if(enough)sents.forEach(s=>{
    if(kept.some(k=>k.start>=s.start&&k.start<s.end))return;
    const hits=Object.keys(TRIG).filter(p=>(p!=="register"||formal)&&TRIG[p].test(s.t)).map(p=>({p,pr:patErrP(p)})).sort((a,b)=>b.pr-a.pr).slice(0,2);
    if(!hits.length||hits[0].pr<0.3)return;
    const risk=1-hits.reduce((acc,h)=>acc*(1-h.pr),1);
    if(risk>=0.4)risks.push({s,risk,hits});
  });
  risks.sort((a,b)=>b.risk-a.risk);
  return{issues:kept,risks:risks.slice(0,3),sents};
}
function snippetHTML(text,it){
  const s=text.slice(it.sStart,it.sEnd),a=it.start-it.sStart,b=it.end-it.sStart;
  let pre=s.slice(0,a),post=s.slice(b);if(pre.length>60)pre="…"+pre.slice(-60);if(post.length>60)post=post.slice(0,60)+"…";
  return esc(pre)+"<mark>"+esc(s.slice(a,b))+"</mark>"+esc(post);
}
function coachHTML(ctx,text,ex){
  const ign=coachIgn[ctx]||(coachIgn[ctx]=new Set());
  const formal=!!(ex&&(ex.p==="register"||/formal|professor|email/i.test(ex.q)));
  if(wc(text)<5){coachCache[ctx]=[];return`<p class="muted" style="font-size:.88rem">El corrector revisa tu texto mientras escribes. Aprende de ti: las sugerencias que ignoras pierden peso y los errores que aceptas entrenan tus sesiones.</p>`}
  const {issues,risks}=analyzeText(text,{formal,ign});coachCache[ctx]=issues;collectSpell(ctx,text,issues);
  const head=`<div class="row" style="justify-content:space-between"><span class="eyebrow">Corrector</span><span class="chip ${issues.length?"warn":"ok"}">${issues.length?issues.length+" sugerencias":"Sin errores detectados"}</span></div>`;
  const list=issues.map((it,i)=>{const k=KIND_UI[it.kind]||["Sugerencia",""];return`<div class="iss">
    <div class="grow stack" style="gap:4px"><span class="snip">${snippetHTML(text,it)}</span><span style="font-size:.92rem">${esc(it.msg)}</span>${it.rule==="spell"?(it.fix?`<details class="hint"><summary>Ver pista</summary><span>Empieza con <b>${esc(it.fix.slice(0,2))}…</b> y tiene ${it.fix.length} letras.</span></details>`:""):it.fix!=null?`<span style="font-size:.92rem">→ <b>${esc(it.fix)}</b></span>`:""}</div>
    <div class="iss-side"><span class="chip ${k[1]}">${k[0]}</span><span class="mono muted" style="font-size:.7rem" title="Confianza aprendida de tus respuestas">${Math.round(it.conf*100)}%</span>
    <div class="row" style="gap:4px">${it.rule==="spell"?"":it.fix!=null?`<button class="btn sm" data-act="coach-apply" data-ctx="${ctx}" data-i="${i}">Aplicar</button>`:`<button class="btn sm" data-act="coach-apply" data-ctx="${ctx}" data-i="${i}" title="Lo corregí yo">Lo corrijo</button>`}<button class="btn ghost sm" data-act="coach-ignore" data-ctx="${ctx}" data-i="${i}">${it.rule==="spell"?"Está bien escrita":"Ignorar"}</button></div></div></div>`}).join("");
  const rk=risks.length?`<div class="stack" style="gap:6px;margin-top:6px"><span class="eyebrow">Zonas de riesgo según tu historial</span>${risks.map(r=>`<div class="iss risk"><div class="grow stack" style="gap:3px"><span class="snip">${esc(r.s.t.length>140?r.s.t.slice(0,138)+"…":r.s.t)}</span><span style="font-size:.9rem">${esc(TIPS[r.hits[0].p])}</span></div><div class="iss-side"><span class="chip warn">${esc(PATS[r.hits[0].p])}</span><span class="mono muted" style="font-size:.7rem">riesgo ${Math.round(r.risk*100)}%</span></div></div>`).join("")}</div>`:"";
  return`<div class="stack" style="gap:8px">${head}${list}${rk}</div>`;
}
function refreshEditor(ctx){
  const ta=document.getElementById("draft-"+ctx);const text=ctx==="lab"?labUI.draft:(sess?sess.draft:"");
  if(ta&&ta.value!==text)ta.value=text;
  const ex=ctx==="lab"?EX[labUI.prompt]:curEx();if(!ex)return;
  const w=$("#wc-"+ctx);if(w)w.textContent=wc(text)+" words";
  const c=$("#coach-"+ctx);if(c)c.innerHTML=coachHTML(ctx,text,ex);
  const sc=$("#score-"+ctx);if(sc)sc.innerHTML=scoreHTML(text,ex);
  const cl=$("#cl-"+ctx);if(cl)cl.innerHTML=writeChecklist(ex,text);
  const sb=$("#lab-save-btn");if(sb&&ctx==="lab")sb.disabled=wc(text)<10;
}
let coachT={};
function scheduleCoach(ctx){clearTimeout(coachT[ctx]);coachT[ctx]=setTimeout(()=>{const ex=ctx==="lab"?EX[labUI.prompt]:curEx();const tx=ctx==="lab"?labUI.draft:sess.draft;const c=$("#coach-"+ctx);if(c&&ex)c.innerHTML=coachHTML(ctx,tx,ex);const sc=$("#score-"+ctx);if(sc&&ex)sc.innerHTML=scoreHTML(tx,ex)},450)}
function setDraft(ctx,v){if(ctx==="lab"){labUI.draft=v;try{sessionStorage.setItem("eg-lab-draft",JSON.stringify({p:labUI.prompt,d:v}))}catch(e){}}else if(sess)sess.draft=v}
function getDraft(ctx){return ctx==="lab"?labUI.draft:(sess?sess.draft:"")}
function coachAct(ctx,i,apply){
  const it=(coachCache[ctx]||[])[i];if(!it)return;
  const st=ruleStat(it.rule);
  if(apply){st.a++;const w=state.wpat[it.pat]||(state.wpat[it.pat]={err:0,texts:0});w.err++;
    if(it.fix!=null){const t=getDraft(ctx);setDraft(ctx,t.slice(0,it.start)+it.fix+t.slice(it.end))}else{(coachIgn[ctx]||(coachIgn[ctx]=new Set())).add(it.key)}}
  else{if(it.rule==="spell"){state.dict=state.dict||[];const w=lo(it.match);if(!state.dict.includes(w))state.dict.push(w);if(spellSeen[ctx])spellSeen[ctx].delete(w)}else st.i++;(coachIgn[ctx]||(coachIgn[ctx]=new Set())).add(it.key)}
  save();refreshEditor(ctx);
}
function sentProfile(list){
  const ss=list.flatMap(t=>splitSents(t.body).map(s=>s.t)).filter(s=>s.split(/\s+/).length>2);
  if(ss.length<4)return null;
  const lens=ss.map(s=>s.split(/\s+/).length),avg=lens.reduce((a,b)=>a+b,0)/lens.length;
  return{n:ss.length,avg,startI:ss.filter(s=>/^I\b/.test(s)).length/ss.length,complex:ss.filter(s=>SUBORD.test(s)).length/ss.length,
    openers:new Set(ss.map(s=>lo(s.split(/\s+/)[0]))).size/ss.length,long:lens.filter(l=>l>30).length/ss.length};
}
function profileHTML(){
  const all=texts.slice().sort((a,b)=>a.ts-b.ts);const p=sentProfile(all);
  if(!p)return`<p class="muted" style="font-size:.9rem">Tu perfil aparece cuando guardes textos con al menos 4 oraciones en total.</p>`;
  const first=all.length>=6?sentProfile(all.slice(0,3)):null,last=all.length>=6?sentProfile(all.slice(-3)):null;
  const rows=[
    ["Palabras por oración",p.avg.toFixed(1),"15–22",p.avg>=15&&p.avg<=22,"avg",1],
    ["Oraciones complejas (con subordinada)",Math.round(p.complex*100)+"%","40–70%",p.complex>=.4&&p.complex<=.7,"complex",100],
    ["Oraciones que empiezan con “I”",Math.round(p.startI*100)+"%","menos de 30%",p.startI<.3,"startI",100],
    ["Variedad de inicios",Math.round(p.openers*100)+"%","más de 60%",p.openers>.6,"openers",100],
    ["Oraciones de más de 30 palabras",Math.round(p.long*100)+"%","menos de 15%",p.long<.15,"long",100]];
  return`<div class="table-wrap"><table><thead><tr><th>Rasgo</th><th>Tú</th><th>Rango C1</th>${first?"<th>Primeros 3 → últimos 3</th>":""}<th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="muted">${r[2]}</td>${first?`<td class="num">${r[5]===1?first[r[4]].toFixed(1):Math.round(first[r[4]]*100)+"%"} → ${r[5]===1?last[r[4]].toFixed(1):Math.round(last[r[4]]*100)+"%"}</td>`:""}<td><span class="chip ${r[3]?"ok":"warn"}">${r[3]?"En rango":"A trabajar"}</span></td></tr>`).join("")}
  </tbody></table></div><p class="muted" style="font-size:.85rem">Basado en ${p.n} oraciones de tus textos guardados.</p>`;
}
function modelHTML(){
  const rows=Object.keys(PATS).map(p=>({p,pr:patErrP(p),n:patObs(p)})).sort((a,b)=>b.pr-a.pr);
  const muted=[...RULES].filter(r=>ruleMuted(r));
  return`<div class="stack" style="gap:6px">${rows.map(r=>`<div class="row" style="flex-wrap:nowrap"><span style="flex:1 1 auto;min-width:0;font-size:.92rem">${PATS[r.p]}</span><div class="hbar" style="max-width:180px"><i style="width:${Math.round(r.pr*100)}%;background:${r.pr>=.4?"var(--bad)":r.pr>=.25?"var(--plate-1)":"var(--ok)"}"></i></div><span class="mono" style="width:44px;text-align:right;font-size:.85rem">${Math.round(r.pr*100)}%</span><span class="mono muted" style="width:46px;text-align:right;font-size:.72rem">n=${r.n}</span></div>`).join("")}
  <p class="muted" style="font-size:.85rem">Probabilidad estimada de que cometas un error de cada tipo, combinando tus ejercicios y los errores que aceptas en tus textos (modelo bayesiano con un supuesto inicial del 15%). Las sesiones diarias priorizan los patrones más altos y las “zonas de riesgo” los usan para señalar oraciones.</p>
  ${muted.length?`<div class="stack" style="gap:6px"><span class="eyebrow">Reglas silenciadas por ti</span>${muted.map(r=>`<div class="row"><span style="flex:1;font-size:.9rem">${esc(r.msg)}</span><button class="btn ghost sm" data-act="unmute" data-r="${r.id}">Reactivar</button></div>`).join("")}</div>`:""}</div>`;
}

/* ============================== DICTATION & VOICE ============================== */
const dictCtl={ns:null,tts:null,state:"idle",ctx:null,partial:"",t0:0,err:"",onFinal:null,onEnd:null};
function hookDictation(d){
  dictCtl.ns=d;
  d.onPartial(({text})=>{dictCtl.partial=text;const el=$("#live-"+dictCtl.ctx);if(el)el.textContent=text});
  d.onFinal(({text})=>{dictCtl.partial="";const el=$("#live-"+dictCtl.ctx);if(el)el.textContent="";if(dictCtl.onFinal)dictCtl.onFinal(text)});
  d.onState(({state:st,reason})=>{const prev=dictCtl.state;dictCtl.state=st;
    if(st==="idle"&&prev!=="idle"){
      if(reason==="not_granted")dictCtl.err="El dictado está desactivado para esta página. Puedes activarlo en el menú de permisos del artefacto.";
      else if(reason==="unavailable"){dictCtl.err="El dictado no está disponible en esta vista.";}
      else if(reason==="rate_limited")dictCtl.err="Demasiados dictados a la vez. Intenta en un momento.";
      else if(reason==="upstream_error")dictCtl.err="Falló el micrófono o el servicio de voz. Intenta de nuevo.";
      const cb=dictCtl.onEnd;dictCtl.onEnd=null;if(cb)cb(reason);
    }
    render()});
}
function startDict(ctx,onFinal,onEnd){
  if(!dictCtl.ns)return;dictCtl.err="";dictCtl.ctx=ctx;dictCtl.partial="";dictCtl.t0=Date.now();dictCtl.onFinal=onFinal;dictCtl.onEnd=onEnd;
  dictCtl.ns.start({language:"en"}).catch(e=>{const c=e&&e.code;
    dictCtl.err=c==="not_granted"?"No diste permiso para el dictado. Puedes seguir escribiendo.":c==="dismissed"?"Cerraste la ventana de permiso. Vuelve a tocar Dictar cuando quieras.":c==="unavailable"?"El dictado no está disponible en esta vista (funciona en Chrome o Edge y en la app de escritorio).":c==="stopped"?"":"No se pudo iniciar el dictado.";
    dictCtl.state="idle";const cb=dictCtl.onEnd;dictCtl.onEnd=null;if(cb)cb("error");render()});
  dictCtl.state="starting";
}
function stopDict(){if(dictCtl.ns)dictCtl.ns.stop().catch(()=>{})}
function dictActive(ctx){return dictCtl.ctx===ctx&&dictCtl.state!=="idle"}
const MIC='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const SPK='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
function dictBtn(ctx){
  if(!dictCtl.ns)return`<span class="muted" style="font-size:.82rem">${cloud.status==="connecting"?"":"Dictado por voz: disponible en Chrome/Edge o en la app de escritorio de Claude."}</span>`;
  if(dictActive(ctx))return`<button class="btn sm rec" data-act="dict-stop">${MIC}<span class="pulse"></span> ${dictCtl.state==="starting"?"Iniciando…":"Detener dictado"}</button>`;
  return`<button class="btn sm" data-act="dict-start" data-ctx="${ctx}" ${dictCtl.state!=="idle"?"disabled":""}>${MIC} Dictar</button>`;
}
function dictAppend(ctx,text){
  const cur=getDraft(ctx);let t=text.trim();if(!t)return;
  if(!cur.trim()||/[.!?]\s*$/.test(cur))t=t.charAt(0).toUpperCase()+t.slice(1);
  setDraft(ctx,cur+(cur&&!/\s$/.test(cur)?" ":"")+t);
  const st=ctx==="lab"?labUI:sess;if(st)st.dictWords=(st.dictWords||0)+wc(t);
  refreshEditor(ctx);
}
function speak(text){if(!dictCtl.tts)return;dictCtl.tts.speak(text,{language:"en"}).catch(e=>{if(e&&e.code==="not_granted")dictCtl.tts=null;render()})}
function editorHTML(ctx,ex,draft){
  loadDict();
  const st=ctx==="lab"?labUI:sess;const live=dictActive(ctx);
  return`<div class="stack" style="gap:8px">
  <div class="row" style="justify-content:space-between"><span class="row" style="gap:8px">${dictBtn(ctx)}</span><span class="wordcount" id="wc-${ctx}">${wc(draft)} words</span></div>
  ${dictCtl.err&&dictCtl.ctx===ctx?`<p class="muted" style="font-size:.85rem">${esc(dictCtl.err)}</p>`:""}
  <textarea id="draft-${ctx}" rows="9" spellcheck="true" lang="en" placeholder="${live?"Habla en inglés; el texto aparece aquí…":"Start writing here… o usa Dictar para practicar speaking"}">${esc(draft)}</textarea>
  <div class="live" id="live-${ctx}" aria-live="polite">${live?esc(dictCtl.partial):""}</div>
  ${st&&st.dictWords?`<p class="muted" style="font-size:.85rem">${st.dictWords} palabras dictadas. Revisa lo que el dictado entendió y corrígelo a mano: el corrector de abajo te ayuda.</p>`:""}
  <div class="card stack" style="gap:8px" id="coach-${ctx}">${coachHTML(ctx,draft,ex)}</div>
  <div class="card stack" style="gap:10px" id="score-${ctx}">${scoreHTML(draft,ex)}</div>
  <div class="card stack" style="gap:8px"><span class="eyebrow">Autoevaluación</span><div id="cl-${ctx}">${writeChecklist(ex,draft)}</div></div></div>`;
}
/* pronunciation drill: say a sentence, compare what the recognizer heard with the target */
let pronUI=null;
const toks=s=>lo(s).replace(/[’']/g,"'").match(/[a-z0-9']+/g)||[];
function alignWords(target,heard){
  const a=toks(target),b=toks(heard),n=a.length,m=b.length,dp=[...Array(n+1)].map(()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const ok=new Array(n).fill(false);let i=0,j=0;while(i<n&&j<m){if(a[i]===b[j]){ok[i]=true;i++;j++}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++}
  return{words:a,ok,score:n?ok.filter(Boolean).length/n:0};
}
function finishPron(){
  if(!pronUI)return;const r=alignWords(pronUI.target,pronUI.heard||"");pronUI.result=r;
  if((pronUI.heard||"").trim()){r.words.forEach((w,i)=>{if(w.length<3)return;const p=state.pron[w]||(state.pron[w]={n:0,miss:0});p.n++;if(!r.ok[i])p.miss++});
    const wr=state.words[pronUI.wid];if(wr||pronUI.wid){const x=wordRec(pronUI.wid);x.spoken=(x.spoken||0)+1;x.bestSay=Math.max(x.bestSay||0,r.score)}
    state.stats.spoken=(state.stats.spoken||0)+1;save()}
}
function hardWords(){return Object.entries(state.pron).filter(([w,p])=>p.n>=2&&p.miss/p.n>=0.5).sort((a,b)=>b[1].miss/b[1].n-a[1].miss/a[1].n).slice(0,10)}
function pronResultHTML(){
  const r=pronUI.result;if(!r)return"";
  return`<div class="stack" style="gap:6px"><span class="eyebrow">Lo que el dictado entendió: ${Math.round(r.score*100)}%</span>
  <div style="line-height:1.9">${r.words.map((w,i)=>`<span class="pw ${r.ok[i]?"ok":"miss"}">${esc(w)}</span>`).join(" ")}</div>
  ${pronUI.heard?`<span class="muted" style="font-size:.85rem">Escuchado: “${esc(pronUI.heard.trim())}”</span>`:`<span class="muted" style="font-size:.85rem">No se escuchó nada. Revisa el micrófono e intenta de nuevo.</span>`}
  <span style="font-size:.88rem">${r.score>=.9?"Muy claro.":r.words.length&&r.score>=.6?"Bien. Repite las palabras en rojo despacio, marcando la sílaba fuerte.":"Escucha la frase y repítela por partes."} El dictado no mide la pronunciación exacta: indica qué tan reconocible fue lo que dijiste.</span></div>`;
}

/* ============================== WORD BANK VIEW ============================== */
let wordsUI={cat:"all",q:"",adding:false,err:""};
function vWords(){
  const ws=allWords(),t=today();
  const counts={new:0,learning:0,known:0,active:0};ws.forEach(w=>counts[wordStatus(w.id).k]++);
  const due=ws.filter(w=>{const r=state.words[w.id];return r&&r.n&&r.due&&r.due<=t}).length;
  const q=lo(wordsUI.q.trim());
  const list=ws.filter(w=>(wordsUI.cat==="all"||w.cat===wordsUI.cat)&&(!q||lo(w.w+" "+w.es).includes(q)));
  const hw=hardWords();
  return`<section class="stack" style="padding-top:18px">
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:6px"><span class="eyebrow">Palabras difíciles para hispanohablantes</span><h1>Word Bank</h1></div>
  <button class="btn primary" data-act="word-drill">Repasar palabras${due?" · "+due:""}</button></div>
  ${(()=>{const p=wbProgress();return`<div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="eyebrow">Reps de palabras en Aprendiendo · hoy</span><button class="btn ${p.done<p.total?"primary":""} sm" data-act="wb-start" ${p.done<p.total?"":"disabled"}>${p.done?"Continuar":"Empezar"} · ${p.done}/${p.total}</button></div>
    <div class="meter"><i style="width:${p.total?Math.round(p.done/p.total*100):0}%;background:var(--plate-w)"></i></div>
    <p style="font-size:.93rem">${p.total?"":"<b>Aún no tienes palabras en Aprendiendo.</b> Pasan a este estado cuando las practicas en tus sesiones y todavía no las dominas. "}Cada día repasas las palabras que estás aprendiendo: lees el significado y escribes la palabra de memoria. Las que fallas vuelven al final; si fue un error de ortografía, también pasa a tus reps de ortografía. Puedes hacerlo por partes: tu avance se guarda.</p></div>`})()}
  ${spellCardHTML()}
  <div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="eyebrow">Palabras nuevas sin fin</span><button class="btn sm" data-act="discover" ${discover.busy?"disabled":""}>${discover.busy?'<span class="spin"></span> Buscando…':"Descubrir 5 palabras"}</button></div>
    <p style="font-size:.93rem">Elige palabras de nivel C1 de un corpus de frecuencia del inglés (rango 6,000–30,000) y trae su definición y un ejemplo del diccionario abierto <a href="https://dictionaryapi.dev" target="_blank" rel="noopener">Free Dictionary API</a>. Cuando te quedan pocas palabras nuevas, agrega 5 automáticamente una vez al día.</p>
    ${discover.msg?`<p class="muted" style="font-size:.88rem">${esc(discover.msg)}</p>`:""}</div>
  <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
    ${[["new","Nuevas","Aún no las practicas"],["learning","Aprendiendo","Vuelven pronto"],["known","Reconocidas","Las identificas bien"],["active","Activas","Ya las usas al escribir"]].map(([k,n,d])=>`<div class="card stat"><span class="eyebrow">${n}</span><div class="n mono">${counts[k]}</div><span class="muted" style="font-size:.82rem">${d}</span></div>`).join("")}
  </div>
  <p class="muted" style="font-size:.9rem;max-width:68ch">Dos palabras del banco entran en cada sesión diaria. Primero las reconoces, luego las eliges en contexto, y cuando aparecen en tus textos del Writing Lab pasan a “Activas”. Esa es la meta: usarlas, no solo reconocerlas.</p>
  <div class="card stack" style="gap:8px"><span class="eyebrow">Speaking</span>
    <p style="font-size:.93rem">Toca <b>Decir la frase</b> en cualquier palabra y lee el ejemplo en voz alta. El dictado compara lo que entendió con la frase original: las palabras que no reconoce son pistas de pronunciación.</p>
    ${!dictCtl.ns?`<p class="muted" style="font-size:.85rem">El dictado funciona en Chrome o Edge y en la app de escritorio de Claude.</p>`:""}
    ${hw.length?`<div><span class="lbl eyebrow">Palabras que el dictado suele no reconocerte</span><div class="row" style="gap:6px;margin-top:6px">${hw.map(([w,p])=>`<span class="chip bad">${esc(w)} · ${p.miss}/${p.n}</span>`).join("")}</div></div>`:`<p class="muted" style="font-size:.85rem">Aquí aparecerán las palabras que más te cuesta que el dictado reconozca.</p>`}
  </div>
  <div class="row" style="gap:6px">${[["all","Todas"]].concat(Object.entries(WCATS).map(([k,v])=>[k,v.n])).map(([k,n])=>`<button class="btn sm ${wordsUI.cat===k?"primary":""}" data-act="wcat" data-c="${k}">${esc(n)}</button>`).join("")}
  <input type="text" id="wsearch" placeholder="Buscar…" value="${esc(wordsUI.q)}" style="flex:1 1 160px;width:auto;min-height:34px;padding:6px 10px;font-size:.92rem"></div>
  ${wordsUI.cat!=="all"?`<p class="muted" style="font-size:.9rem">${esc(WCATS[wordsUI.cat].d)}</p>`:""}
  <div class="wgrid">${list.map(wordCard).join("")||`<p class="muted">No hay palabras con ese filtro.</p>`}</div>
  <div class="card stack" style="gap:10px"><span class="eyebrow">Agregar una palabra</span>
    <p class="muted" style="font-size:.88rem">Anota las palabras que te encuentres en clase, lecturas o series. Entran a tus sesiones como cualquier otra.</p>
    <div class="grid2"><div class="stack" style="gap:4px"><label for="nw-w">Palabra o expresión</label><input type="text" id="nw-w" placeholder="ej. to cope with"></div>
    <div class="stack" style="gap:4px"><label for="nw-es">Significado en español</label><input type="text" id="nw-es" placeholder="ej. lidiar con, sobrellevar"></div></div>
    <div class="stack" style="gap:4px"><label for="nw-ex">Ejemplo en inglés (que incluya la palabra)</label><input type="text" id="nw-ex" placeholder="ej. She coped with the pressure remarkably well."></div>
    <div class="grid2"><div class="stack" style="gap:4px"><label for="nw-cat">Categoría</label><select id="nw-cat">${Object.entries(WCATS).map(([k,v])=>`<option value="${k}" ${k==="own"?"selected":""}>${esc(v.n)}</option>`).join("")}</select></div>
    <div class="stack" style="gap:4px"><label for="nw-trap">No confundir con (opcional)</label><input type="text" id="nw-trap" placeholder="ej. “copiar” es to copy"></div></div>
    ${wordsUI.err?`<p style="color:var(--bad);font-size:.9rem">${esc(wordsUI.err)}</p>`:""}
    <div><button class="btn primary" data-act="word-add">Agregar al Word Bank</button></div>
  </div></section>`;
}
function wordCard(wd,opt={}){
  const st=wordStatus(wd.id),r=state.words[wd.id],active=pronUI&&pronUI.wid===wd.id;
  const listening=active&&dictActive("pron");
  return`<div class="card stack wcard" style="gap:8px">
  <div class="row" style="justify-content:space-between;align-items:flex-start"><div><b class="wword">${esc(wd.w)}</b> <span class="muted mono" style="font-size:.72rem">${esc(wd.pos||"")}</span></div><span class="chip ${st.cls}">${st.t}</span></div>
  <span>${wd.cat==="auto"?'<span class="muted mono" style="font-size:.7rem">DEFINICIÓN EN INGLÉS · </span>':""}${esc(wd.es)}</span>
  ${wd.trap?`<span class="trap">${esc(wd.trap)}</span>`:""}
  ${wd.ex?`<i style="font-size:.95rem">${esc(wd.ex)}</i>`:""}
  <div class="row" style="gap:6px">
    ${dictCtl.tts&&wd.ex?`<button class="btn sm ghost" data-act="say" data-t="${esc(wd.w.replace(/^to /,"")+". "+wd.ex)}">${SPK} Escuchar</button>`:""}
    ${dictCtl.ns&&wd.ex?(listening?`<button class="btn sm rec" data-act="dict-stop">${MIC}<span class="pulse"></span> Terminar</button>`:`<button class="btn sm" data-act="pron-start" data-wid="${wd.id}" ${dictCtl.state!=="idle"?"disabled":""}>${MIC} Decir la frase</button>`):""}
    ${!opt.intro&&(wd.cat==="own"||wd.cat==="auto"||String(wd.id).startsWith("cw-"))?`<button class="btn sm ghost" data-act="word-del" data-wid="${wd.id}">Borrar</button>`:""}
  </div>
  ${active&&listening?`<div class="live" id="live-pron">${esc(dictCtl.partial)}</div>`:""}
  ${active&&!listening&&pronUI.result?pronResultHTML():""}
  ${!opt.intro&&r&&r.n?`<span class="muted mono" style="font-size:.72rem">${r.ok}/${r.n} aciertos${r.due?" · vuelve "+(r.due<=today()?"hoy":prettyD(r.due)):""}${r.used?" · usada "+r.used+"×":""}</span>`:""}
  </div>`;
}
function addWord(){
  const w=($("#nw-w").value||"").trim(),es=($("#nw-es").value||"").trim(),ex=($("#nw-ex").value||"").trim(),cat=$("#nw-cat").value,trap=($("#nw-trap").value||"").trim();
  if(!w||!es){wordsUI.err="Escribe la palabra y su significado.";render();return}
  if(allWords().some(x=>lo(x.w)===lo(w))){wordsUI.err="Esa palabra ya está en tu Word Bank.";render();return}
  let form="";if(ex){const base=w.replace(/^to /i,"");const m=ex.match(new RegExp("\\b("+base.split(/\s+/).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\w*").join("\\s+")+")","i"));if(m)form=m[1];else{wordsUI.err="El ejemplo debe incluir la palabra (o una forma de ella) para poder crear ejercicios de contexto.";render();return}}
  const short=es.split(/[,;]/)[0].trim();
  state.customWords=(state.customWords||[]).concat([{id:"cw-"+Date.now().toString(36),w,cat,pos:/^to /i.test(w)?"verb":"",es,short,trap:trap||"",ex,form,basic:[]}]);
  wordsUI.err="";indexBank();save();toast("Palabra agregada");render();
}

/* ============================== STUDY TIMER ============================== */
const GOAL=1200,IDLE=180000;let lastAct=Date.now(),tickN=0;
["pointerdown","keydown","input","scroll","touchstart","wheel"].forEach(e=>document.addEventListener(e,()=>{lastAct=Date.now()},{passive:true,capture:true}));
function todaySecs(){return(state.time&&state.time[today()])||0}
function studying(){return state.placed&&!place&&document.visibilityState==="visible"&&(Date.now()-lastAct<IDLE||(typeof dictCtl!=="undefined"&&dictCtl.state!=="idle"))}
function mmss(x){x=Math.floor(x);return pad(Math.floor(x/60))+":"+pad(x%60)}
function paintTimer(active){
  const el=$("#tmr");if(!el)return;el.hidden=!state.placed;
  const sec=todaySecs(),f=Math.min(1,sec/GOAL);
  $("#tmr-t").textContent=mmss(sec);$("#tmr-g").textContent=sec>=GOAL?"meta ✓":"/ 20 min";
  $("#tmr-ring").setAttribute("stroke-dashoffset",(62.83*(1-f)).toFixed(2));
  el.classList.toggle("paused",!active);el.classList.toggle("goal",sec>=GOAL);
  el.title=active?"Tiempo de estudio de hoy (contando)":"En pausa: se reanuda cuando vuelves a interactuar";
  const dr=$("#dayring-t");if(dr){dr.textContent=Math.floor(sec/60);const rg=$("#dayring-fg");if(rg)rg.setAttribute("stroke-dashoffset",(276.5*(1-f)).toFixed(1))}
}
setInterval(()=>{
  const on=studying();
  if(on){const d=today();state.time=state.time||{};const before=state.time[d]||0;state.time[d]=before+1;
    if(sess&&!sess.done)sess.secs=(sess.secs||0)+1;
    if(before<GOAL&&before+1>=GOAL){toast("Meta de 20 minutos cumplida");if(view==="home"&&!sess&&!place)render()}
    if(++tickN%15===0){state.updated=Date.now();lsSet(LS_KEY,state)}
    if(tickN%120===0)save()}
  paintTimer(on);
},1000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&state.placed){save()}});

/* ============================== WORD OF THE DAY ============================== */
function wotd(){
  const t=today();
  if(state.wotd&&state.wotd.d===t&&allWords().some(w=>w.id===state.wotd.id))return state.wotd;
  const ws=allWords();const rank=w=>{const k=wordStatus(w.id).k;return(k==="new"?0:k==="learning"?1:k==="known"?2:3)+(w.cat==="own"?-0.5:0)};
  const best=Math.min(...ws.map(rank));const pool=ws.filter(w=>rank(w)===best);
  const idx=Math.floor(new Date(t+"T12:00:00").getTime()/864e5)%pool.length;
  state.wotd={d:t,id:pool[idx].id,done:false};save();return state.wotd;
}
function wotdWord(){const o=wotd();return allWords().find(w=>w.id===o.id)}
function wotdExId(){const wd=wotdWord(),r=state.words[wd.id];return"wb-"+wd.id+"-"+(r&&r.n&&EX["wb-"+wd.id+"-c"]?"c":"m")}

/* ============================== SPELLING REPS ============================== */
const spellSeen={lab:new Map(),session:new Map()};
const REPS_NEEDED=3;
function collectSpell(ctx,text,issues){
  const m=spellSeen[ctx];if(!m)return;
  issues.forEach(it=>{if(it.rule!=="spell"||!it.fix)return;
    const after=text.charAt(it.end);if(it.end>=text.length||/[A-Za-z'’]/.test(after))return; // word still being typed
    m.set(lo(it.match),lo(it.fix))});
}
function addSpellRep(wrong,correct,src){
  correct=lo(correct).trim();if(!correct)return false;
  state.spell=state.spell||{};
  const r=state.spell[correct]||(state.spell[correct]={w:correct,wrong:[],n:0,ok:0,box:0,due:today(),added:today(),src:src||"texto"});
  if(wrong&&!r.wrong.includes(lo(wrong))){r.wrong.push(lo(wrong));if(r.wrong.length>5)r.wrong.shift()}
  r.box=0;r.due=today();return true;
}
function flushSpellSeen(ctx,text){
  const m=spellSeen[ctx];if(!m)return[];const added=[];
  m.forEach((correct,wrong)=>{if((state.dict||[]).includes(wrong))return;if(addSpellRep(wrong,correct,"texto"))added.push(correct)});
  m.clear();return added;
}
function spellDue(){const t=today();return Object.values(state.spell||{}).filter(r=>r.due&&r.due<=t)}
function spellStatus(r){return r.box>=4?{t:"Dominada",cls:"ok"}:r.n?{t:"En reps",cls:"warn"}:{t:"Nueva",cls:"bad"}}
let repsUI=null;
function startReps(){
  const q=spellDue().sort((a,b)=>a.box-b.box).slice(0,8).map(r=>r.w);
  if(!q.length){toast("No hay palabras pendientes de reps");return}
  repsUI={q,i:0,phase:"look",streak:0,typed:"",last:null,done:[],misses:0};render();window.scrollTo({top:0});
}
function charDiff(target,typed){
  const a=target.split(""),b=lo(typed).split(""),n=a.length,m=b.length,dp=[...Array(n+1)].map(()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const ok=new Array(n).fill(false);let i=0,j=0;while(i<n&&j<m){if(a[i]===b[j]){ok[i]=true;i++;j++}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++}
  return a.map((c,k)=>`<span class="${ok[k]?"cok":"cmiss"}">${esc(c)}</span>`).join("");
}
function repsCheck(){
  const R=repsUI,w=R.q[R.i],el=$("#rep-in"),typed=(el?el.value:"").trim();if(!typed)return;
  const r=state.spell[w];r.n++;
  if(lo(typed)===w){r.ok++;R.streak++;R.last={ok:true};
    if(R.streak>=REPS_NEEDED){r.box=Math.min(r.box+1,5);r.due=addDays(today(),INTERVALS[r.box]);R.done.push(w);R.phase="next"}
    else R.phase="write";
  }else{R.misses++;R.streak=0;R.last={ok:false,typed};
    if(!r.wrong.includes(lo(typed))&&r.wrong.length<5)r.wrong.push(lo(typed));
    r.box=0;r.due=today();
    if(!R.q.slice(R.i+1).includes(w))R.q.push(w); // vuelve al final
    R.phase="wrong";}
  save();render();
}
function vReps(){
  const R=repsUI;
  if(R.i>=R.q.length){return`<section class="stack" style="padding-top:16px"><span class="eyebrow">Reps de ortografía completadas</span><h1>Clean reps</h1>
    <p>Escribiste correctamente ${R.done.length} ${R.done.length===1?"palabra":"palabras"} ${REPS_NEEDED} veces seguidas sin verlas. ${R.misses?`Hubo ${R.misses} ${R.misses===1?"fallo":"fallos"}; esas palabras regresaron al final hasta salir bien.`:"Sin fallos."}</p>
    <div class="row" style="gap:6px">${[...new Set(R.done)].map(w=>`<span class="chip ok">${esc(w)}</span>`).join("")}</div>
    <p class="muted" style="font-size:.9rem">Vuelven en 1, 2, 4, 8… días para confirmar que se quedaron.</p>
    <div><button class="btn primary big" data-act="reps-exit" data-autofocus>Listo</button></div></section>`}
  const w=R.q[R.i],r=state.spell[w];
  const dots=[...Array(REPS_NEEDED)].map((_,k)=>`<span class="rdot ${k<R.streak?"on":""}"></span>`).join("");
  let body="";
  if(R.phase==="look")body=`<p class="muted">Mírala con atención: fíjate en las letras que sueles cambiar. Luego se oculta y la escribes ${REPS_NEEDED} veces seguidas.</p>
    <div class="repword">${esc(w)}</div>
    ${r.wrong.length?`<p style="font-size:.92rem">Tú escribiste: ${r.wrong.map(x=>`<s class="muted">${esc(x)}</s>`).join(", ")}</p>`:""}
    <div class="row">${dictCtl.tts?`<button class="btn sm ghost" data-act="say" data-t="${esc(w)}">${SPK} Escuchar</button>`:""}<button class="btn primary" data-act="reps-hide" data-autofocus>Ocultar y escribir</button></div>`;
  else if(R.phase==="write")body=`${R.last&&R.last.ok?`<p class="ok-t">Bien. Otra vez, sin mirar.</p>`:`<p class="muted">Escríbela de memoria.</p>`}
    <form data-form="rep" class="row"><input type="text" id="rep-in" autocomplete="off" autocapitalize="off" spellcheck="false" data-autofocus aria-label="Escribe la palabra" style="flex:1 1 220px;font-size:1.3rem;font-family:var(--f-mono)"><button class="btn primary" type="submit">Comprobar</button></form>
    ${dictCtl.tts?`<div><button class="btn sm ghost" type="button" data-act="say" data-t="${esc(w)}">${SPK} Escuchar de nuevo</button></div>`:""}`;
  else if(R.phase==="wrong")body=`<div class="fb bad"><span class="verdict">No exactamente</span>
    <div><span class="lbl">Escribiste</span><span class="mono">${esc(R.last.typed)}</span></div>
    <div><span class="lbl">Correcta (en rojo, lo que te faltó o cambiaste)</span><span class="mono" style="font-size:1.3rem">${charDiff(w,R.last.typed)}</span></div>
    <span style="font-size:.92rem">El contador vuelve a cero y la palabra regresa al final de las reps.</span>
    <div><button class="btn primary" data-act="reps-next" data-autofocus>Continuar</button></div></div>`;
  else if(R.phase==="next")body=`<div class="fb ok"><span class="verdict">${REPS_NEEDED} de ${REPS_NEEDED}</span><span>Escribiste <b>${esc(w)}</b> bien ${REPS_NEEDED} veces seguidas.</span>
    <div><button class="btn primary" data-act="reps-next" data-autofocus>Siguiente palabra</button></div></div>`;
  return`<section class="stack" style="padding-top:16px">
  <div class="ex-head"><span class="eyebrow">Reps de ortografía · palabra ${Math.min(R.i+1,R.q.length)} de ${R.q.length}</span><span class="row" style="gap:6px">${dots}</span></div>
  ${body}</section>`;
}
function spellCardHTML(){
  const all=Object.values(state.spell||{}).sort((a,b)=>(a.due||"").localeCompare(b.due||""));const due=spellDue().length;
  return`<div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="eyebrow">Reps de ortografía</span><button class="btn ${due?"primary":""} sm" data-act="reps-start" ${due?"":"disabled"}>Hacer reps${due?" · "+due:""}</button></div>
  <p style="font-size:.93rem">Las palabras que escribes mal en el Writing Lab llegan aquí automáticamente. La ves, se oculta y la escribes ${REPS_NEEDED} veces seguidas sin errores. Si fallas, vuelve al final.</p>
  ${all.length?`<div class="row" style="gap:6px">${all.map(r=>{const st=spellStatus(r);return`<span class="chip ${st.cls}" title="${esc(st.t)}${r.wrong.length?" · escribiste: "+r.wrong.join(", "):""}">${esc(r.w)}</span>`}).join("")}</div>`:`<p class="muted" style="font-size:.88rem">Aún no hay palabras. Aparecen cuando el corrector detecta errores de ortografía en tus textos.</p>`}
  <form data-form="spell-add" class="row"><input type="text" id="sp-add" placeholder="Agregar una palabra que te cuesta escribir (ej. necessary)" autocomplete="off" spellcheck="false" style="flex:1 1 220px;width:auto;min-height:38px;padding:6px 10px;font-size:.95rem"><button class="btn sm" type="submit">Agregar</button></form></div>`;
}

/* ============================== ENDLESS WORDS (Free Dictionary API) ============================== */
const DICT_API="https://api.dictionaryapi.dev/api/v2/entries/en/";
const discover={busy:false,msg:"",lastFail:null};
function dictReady(){loadDict();return DICT.p||Promise.reject(new Error("dict"))}
function isLemma(w){
  const r=k=>DICT.rank.has(k);
  if(/ies$/.test(w)&&r(w.slice(0,-3)+"y"))return false;
  if(/s$/.test(w)&&!/ss$/.test(w)&&r(w.slice(0,-1)))return false;
  if(/ed$/.test(w)&&(r(w.slice(0,-2))||r(w.slice(0,-1))))return false;
  if(/ing$/.test(w)&&(r(w.slice(0,-3))||r(w.slice(0,-3)+"e")))return false;
  if(/ly$/.test(w)&&r(w.slice(0,-2)))return false;
  return true;
}
function candidates(n){
  const have=new Set(allWords().map(w=>lo(baseOf(w))));const skip=new Set(state.autoSkip||[]);
  const out=[];let guard=0;
  while(out.length<n&&guard++<4000){
    const rank=6000+Math.floor(Math.random()*24000);const w=DICT.list[rank-1];
    if(!w||!/^[a-z]{5,14}$/.test(w)||have.has(w)||skip.has(w)||out.includes(w)||DICT.names.has(w)||/porn|erot|sex|nud|fuck|shit|bitch|whore|slut|rape|nazi|cunt|dick|penis|vagin|orgasm|fetish/.test(w))continue;
    if(!isLemma(w))continue;
    out.push(w);
  }
  return out;
}
async function fetchDef(w){
  const r=await fetch(DICT_API+encodeURIComponent(w));
  if(r.status===404)return null;if(!r.ok)throw new Error("http "+r.status);
  const j=await r.json();if(!Array.isArray(j))return null;
  let best=null;
  for(const e of j)for(const m of e.meanings||[]){
    if(["abbreviation","proper noun","interjection"].includes(m.partOfSpeech))continue;
    for(const d of m.definitions||[]){
      const def=(d.definition||"").trim();if(!def||def.length>180||/^(alternative|obsolete|plural|simple past|present participle|archaic|misspelling)/i.test(def))continue;
      const ex=(d.example||"").trim();const good=ex&&new RegExp("\\b"+w.slice(0,Math.max(4,w.length-2)),"i").test(ex)&&ex.split(/\s+/).length>=5;
      const cand={pos:m.partOfSpeech,def,ex:good?ex.charAt(0).toUpperCase()+ex.slice(1)+(/[.!?]$/.test(ex)?"":"."):""};
      if(!best||(!best.ex&&cand.ex))best=cand;
      if(best.ex)break;
    }
    if(best&&best.ex)break;
  }
  return best;
}
async function discoverWords(k=5,silent=false){
  if(discover.busy)return 0;discover.busy=true;discover.msg=silent?"":"Buscando palabras…";if(!silent)render();
  let added=0;
  try{
    await dictReady();
    const cands=candidates(k*4);
    for(const w of cands){
      if(added>=k)break;
      let d=null;try{d=await fetchDef(w)}catch(e){if(!added)throw e;break}
      if(!d){state.autoSkip=(state.autoSkip||[]).concat([w]).slice(-500);continue}
      const m=d.ex?d.ex.match(new RegExp("\\b("+w.slice(0,Math.max(4,w.length-2))+"\\w*)","i")):null;
      const short=d.def.replace(/\s*\(.*?\)\s*/g," ").split(/[;:]/)[0].trim().slice(0,70);
      state.customWords=(state.customWords||[]).concat([{id:"aw-"+w,w:d.pos==="verb"?"to "+w:w,cat:"auto",pos:d.pos,es:d.def,short,ex:d.ex,form:m?m[1]:"",basic:[],src:"api",added:today()}]);
      added++;
    }
    discover.msg=added?`${added} palabras nuevas agregadas.`:"No se encontraron definiciones esta vez. Intenta de nuevo.";
    if(added){indexBank();save()}
  }catch(e){
    discover.lastFail=today();
    discover.msg="No se pudo conectar con el diccionario en línea (dictionaryapi.dev). En GitHub Pages funciona; dentro de claude.ai las conexiones externas están bloqueadas.";
  }
  discover.busy=false;render();return added;
}
function autoTopUp(){
  if(!state.placed||state.autoTry===today())return;
  const fresh=allWords().filter(w=>wordStatus(w.id).k==="new").length;
  state.autoTry=today();
  if(fresh<8)discoverWords(5,true);
}

/* ============================== DAILY WORD BANK REPS (all words) ============================== */
let wbUI=null;
function wbDay(){
  const t=today();const ids=allWords().map(w=>w.id).filter(id=>wordStatus(id).k==="learning");
  if(!state.wbDay||state.wbDay.d!==t){
    const rankW=id=>{const r=state.words[id];const rc=state.wbRec&&state.wbRec[id];return(rc?rc.ok/(rc.n||1):0)+(r?r.box*0.1:0)+Math.random()*0.3};
    state.wbDay={d:t,queue:ids.slice().sort((a,b)=>rankW(a)-rankW(b)),done:[],miss:0};save();
  }else{const known=new Set(state.wbDay.queue.concat(state.wbDay.done));ids.forEach(id=>{if(!known.has(id))state.wbDay.queue.push(id)});
    state.wbDay.queue=state.wbDay.queue.filter(id=>ids.includes(id))}
  return state.wbDay;
}
function wbProgress(){const d=wbDay();const total=d.done.length+new Set(d.queue).size;return{done:d.done.length,total}}
function blankEx(wd){
  if(!wd.ex)return"";const f=wd.form||baseOf(wd);const i=lo(wd.ex).indexOf(lo(f));
  if(i<0)return esc(wd.ex);return esc(wd.ex.slice(0,i))+'<span class="blank"></span>'+esc(wd.ex.slice(i+f.length));
}
function startWbReps(){const d=wbDay();if(!d.queue.length){toast(wbProgress().total?"Ya repasaste hoy todas las palabras en Aprendiendo":"Aún no tienes palabras en Aprendiendo");return}wbUI={phase:"ask",last:null};render();window.scrollTo({top:0})}
function wbAccept(wd,typed){
  const t=lo(typed).replace(/[’]/g,"'").replace(/\s+/g," ").trim().replace(/^to /,"");
  const opts=[baseOf(wd),wd.form||""].map(x=>lo(x).replace(/^to /,"").trim()).filter(Boolean);
  return opts.includes(t);
}
function editDist(a,b){const dp=[...Array(a.length+1)].map((_,i)=>[i]);for(let j=1;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length]}
function wbCheck(){
  const d=wbDay(),id=d.queue[0],wd=allWords().find(w=>w.id===id),el=$("#wb-in"),typed=(el?el.value:"").trim();
  if(!wd||!typed)return;
  state.wbRec=state.wbRec||{};const rc=state.wbRec[id]||(state.wbRec[id]={n:0,ok:0});rc.n++;
  if(wbAccept(wd,typed)){rc.ok++;d.queue.shift();if(!d.done.includes(id))d.done.push(id);wbUI.last={ok:true,wd};const r=wordRec(id);if(!r.first)r.first=today();}
  else{d.miss++;d.queue.shift();d.queue.push(id);const target=lo(baseOf(wd));
    const close=editDist(lo(typed).replace(/^to /,""),target)<=2&&!target.includes(" ");
    if(close)addSpellRep(typed,target,"word bank");
    const r=wordRec(id);r.box=0;r.due=today();
    wbUI.last={ok:false,wd,typed,close}}
  wbUI.phase="fb";state.xp+=wbUI.last.ok?2:0;save();render();
}
function vWbReps(){
  const d=wbDay(),p=wbProgress();
  const bar=`<div class="stack" style="gap:6px"><div class="ex-head"><span class="eyebrow">Reps de palabras en Aprendiendo · ${p.done} de ${p.total} hoy</span><span class="mono muted" style="font-size:.8rem">${d.miss} fallos</span></div><div class="meter"><i style="width:${p.total?Math.round(p.done/p.total*100):0}%;background:var(--plate-w)"></i></div></div>`;
  if(wbUI.phase==="fb"){const L2=wbUI.last,wd=L2.wd;
    return`<section class="stack" style="padding-top:16px">${bar}
    <div class="fb ${L2.ok?"ok":"bad"}"><span class="verdict">${L2.ok?"Correcto":"No exactamente"}</span>
    <div><b class="wword">${esc(wd.w)}</b> <span class="muted">${esc(wd.es)}</span></div>
    ${!L2.ok?`<div><span class="lbl">Escribiste</span><span class="mono">${esc(L2.typed)}</span></div><div><span class="lbl">Correcta</span><span class="mono" style="font-size:1.2rem">${charDiff(lo(baseOf(wd)),L2.typed.replace(/^to /i,""))}</span></div>
      <span style="font-size:.9rem;font-weight:600">Vuelve al final de las reps de hoy.${L2.close?" Como fue un error de ortografía, también se agregó a tus reps de ortografía.":""}</span>`:""}
    ${wd.ex?`<i style="font-size:.95rem">${esc(wd.ex)}</i>`:""}
    <div class="row">${dictCtl.tts?`<button class="btn sm ghost" data-act="say" data-t="${esc(baseOf(wd)+". "+(wd.ex||""))}">${SPK} Escuchar</button>`:""}<button class="btn primary" data-act="wb-next" data-autofocus>${d.queue.length?"Siguiente":"Terminar"}</button></div></div></section>`}
  if(!d.queue.length)return`<section class="stack" style="padding-top:16px">${bar}<h1>Word Bank done</h1>
    <p>Escribiste de memoria las ${p.total} palabras que estás aprendiendo${d.miss?`, con ${d.miss} ${d.miss===1?"fallo":"fallos"} que repetiste hasta acertar`:" sin fallos"}.</p>
    <div><button class="btn primary big" data-act="wb-exit" data-autofocus>Listo</button></div></section>`;
  const wd=allWords().find(w=>w.id===d.queue[0]);
  return`<section class="stack" style="padding-top:16px">${bar}
  <p class="ex-q">Write the English word.</p>
  <p class="ins">Lee el significado y escribe la palabra en inglés, sin “to” si es verbo. Si fallas, vuelve al final.</p>
  <div class="card stack" style="gap:8px"><span class="eyebrow">${esc((WCATS[wd.cat]||WCATS.own).n)}${wd.pos?" · "+esc(wd.pos):""}</span><span style="font-size:1.15rem">${esc(wd.es)}</span>
  ${wd.ex?`<div class="ex-s">${blankEx(wd)}</div>`:""}
  ${wd.trap?`<span class="trap">${esc(wd.trap.replace(new RegExp(baseOf(wd),"ig"),"___"))}</span>`:""}
  <span class="muted mono" style="font-size:.8rem">${baseOf(wd).length} letras · empieza con “${esc(baseOf(wd).charAt(0))}”</span></div>
  <form data-form="wb" class="row"><input type="text" id="wb-in" autocomplete="off" autocapitalize="off" spellcheck="false" data-autofocus aria-label="Palabra en inglés" style="flex:1 1 220px;font-size:1.25rem;font-family:var(--f-mono)"><button class="btn primary" type="submit">Comprobar</button></form>
  <div><button class="btn ghost sm" data-act="wb-skip">No la sé</button></div></section>`;
}

/* ============================== STANDALONE FALLBACKS (GitHub Pages) ============================== */
function webDictation(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;
  let rec=null,st="idle",reason=null;const hP=[],hF=[],hS=[];
  const emit=(s,r)=>{st=s;hS.forEach(f=>f({state:s,reason:r}))};
  return{
    start(opts={}){return new Promise((res,rej)=>{
      try{rec=new SR();rec.lang=opts.language==="en"?"en-US":(opts.language||"en-US");rec.continuous=true;rec.interimResults=true;
        rec.onstart=()=>{emit("listening");res()};
        rec.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)hF.forEach(f=>f({text:r[0].transcript}));else interim+=r[0].transcript}hP.forEach(f=>f({text:interim}))};
        rec.onerror=e=>{reason=e.error==="not-allowed"||e.error==="service-not-allowed"?"not_granted":e.error==="no-speech"||e.error==="aborted"?"stopped":"upstream_error";if(st==="starting")rej({code:reason})};
        rec.onend=()=>{emit("idle",reason||"stopped");reason=null};
        emit("starting");rec.start();
      }catch(err){rej({code:"unavailable"})}})},
    stop(){try{rec&&rec.stop()}catch(e){}return Promise.resolve()},
    active(){return st!=="idle"},
    onPartial(f){hP.push(f);return()=>{}},onFinal(f){hF.push(f);return()=>{}},onState(f){hS.push(f);return()=>{}}
  };
}
function webTTS(){
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return null;
  return{speak(text){return new Promise((res,rej)=>{const u=new SpeechSynthesisUtterance(String(text));u.lang="en-US";u.rate=0.95;
      const v=speechSynthesis.getVoices().find(v=>/^en(-|_)US/i.test(v.lang));if(v)u.voice=v;
      u.onend=()=>res();u.onerror=()=>rej({code:"upstream_error"});speechSynthesis.cancel();speechSynthesis.speak(u)})},
    stop(){speechSynthesis.cancel()}};
}

/* ============================== BACKUP ============================== */
function backupJSON(){return JSON.stringify({app:"english-gym",v:1,exported:new Date().toISOString(),state,texts})}
function importBackup(txt){
  let d;try{d=JSON.parse(txt)}catch(e){return"El texto no es un respaldo válido (JSON)."}
  if(!d||d.app!=="english-gym"||!d.state)return"No parece un respaldo de English Gym.";
  state=Object.assign(fresh(),d.state);texts=Array.isArray(d.texts)?d.texts:[];indexBank();saveTexts();save();
  texts.forEach(t=>cloudText(t));return"";
}

/* ============================== EVENTS ============================== */
document.addEventListener("click",async ev=>{
  const b=ev.target.closest("[data-act]");if(!b||b.disabled)return;
  const a=b.dataset.act;
  switch(a){
    case"go":view=b.dataset.v;reviewUI.confirmReset=false;render();window.scrollTo({top:0});break;
    case"start-placement":place={i:0,ans:[],done:false};render();break;
    case"set-level":applyLevel(b.dataset.l);break;
    case"skip-placement":place=null;applyLevel("B2");break;
    case"place-ans":{place.ans[place.i]=+b.dataset.k;place.i++;if(place.i>=PLACEMENT.length){place.done=true;place.level=scorePlacement()}render();break}
    case"finish-placement":{const l=place.level;place=null;applyLevel(l);break}
    case"start-session":startSession(todayPlan());break;
    case"extra-session":startSession(buildPlan());break;
    case"reroll":state.plan=buildPlan();save();render();break;
    case"start-review":{const p=buildPlan({reviewOnly:true});if(!p.items.length){toast("No hay repasos pendientes hoy");break}startSession(p);break}
    case"answer-mc":answerMC(+b.dataset.k);break;
    case"check":checkFree();break;
    case"dontknow":{const ex=curEx();if(ex.t==="mc"||ex.t==="scenario")settle(ex,false,"(no lo sé)",{dk:true,choice:-1});else settle(ex,false,"(no lo sé)",{dk:true});break}
    case"self":{const ex=curEx();const ok=b.dataset.v==="1";settle(ex,ok,sess.fb.ans,{kind:ex.k||"g"});break}
    case"next":nextItem();break;
    case"reps-start":startReps();break;
    case"wb-start":startWbReps();break;
    case"wb-next":wbUI.phase="ask";wbUI.last=null;render();break;
    case"wb-exit":wbUI=null;render();window.scrollTo({top:0});break;
    case"wb-skip":{const d=wbDay(),id=d.queue[0],wd=allWords().find(w=>w.id===id);if(!wd)break;d.miss++;d.queue.shift();d.queue.push(id);const r=wordRec(id);r.box=0;r.due=today();wbUI.last={ok:false,wd,typed:"",close:false};wbUI.phase="fb";save();render();break}
    case"discover":discoverWords(5);break;
    case"backup-copy":{const t=$("#bk-out");if(!t)break;t.value=backupJSON();t.hidden=false;t.select();try{navigator.clipboard.writeText(t.value).then(()=>toast("Respaldo copiado"),()=>toast("Selecciona el texto y cópialo"))}catch(e){toast("Selecciona el texto y cópialo")}break}
    case"backup-import":{const t=$("#bk-in");const err=importBackup(t?t.value:"");if(err)toast(err);else{toast("Respaldo importado");view="home";render()}break}
    case"reps-hide":repsUI.phase="write";repsUI.last=null;render();break;
    case"reps-next":{const R=repsUI;R.i++;R.phase="look";R.streak=0;R.last=null;render();window.scrollTo({top:0});break}
    case"reps-exit":repsUI=null;render();window.scrollTo({top:0});break;
    case"show-choices":sess.choice=true;render();break;
    case"hide-choices":sess.choice=false;render();break;
    case"answer-ch":{const ex=curEx();const k=+b.dataset.k;settle(ex,k===0,ex.ch[k],{assist:true,kind:ex.k||"n"});break}
    case"intro-done":{sess.intro=null;if(state.wotd)state.wotd.seen=true;save();render();window.scrollTo({top:0});break}
    case"tile-pick":{const T=sess.tiles;const k=T.pool.splice(+b.dataset.pos,1)[0];T.ans.push(k);render();break}
    case"tile-back":{const T=sess.tiles;const k=T.ans.splice(+b.dataset.pos,1)[0];T.pool.push(k);render();break}
    case"tile-reset":{const T=sess.tiles;T.pool=T.pool.concat(T.ans);T.ans=[];render();break}
    case"save-write":{const ex=curEx();if(wc(sess.draft)<15){toast("Escribe al menos 15 palabras o salta el finisher");break}
      if(!wordRegex(wotdWord()).test(sess.draft)){toast("Incluye la palabra del día “"+wotdWord().w+"” en tu texto");break}
      if(dictActive("session"))stopDict();const t=saveTextEntry(ex,sess.draft,sess);const spAdd=flushSpellSeen("session");if(spAdd.length)toast("A tus reps de ortografía: "+spAdd.join(", "));sess.textId=t.id;sess.usedWords=t.usedWords;sess.writeSaved=true;const xp=20;state.xp+=xp;sess.xp+=xp;save();render();break}
    case"skip-write":sess.writeDone=true;finishSession();render();window.scrollTo({top:0});break;
    case"finish-write":sess.writeDone=true;finishSession();render();window.scrollTo({top:0});break;
    case"quit-session":{if(sess.results.filter(Boolean).length){finishSession()}else{sess=null}render();break}
    case"end-summary":sess=null;view="home";render();window.scrollTo({top:0});break;
    case"go-after":sess=null;view=b.dataset.v;render();window.scrollTo({top:0});break;
    case"lab-save":{const ex=EX[labUI.prompt];if(!ex)break;if(dictActive("lab"))stopDict();const t=saveTextEntry(ex,labUI.draft,labUI);const spAdd=flushSpellSeen("lab");labUI.draft="";labUI.dictWords=0;coachIgn.lab=new Set();try{sessionStorage.removeItem("eg-lab-draft")}catch(e){}const got=checkAch();save();toast((t.usedWords.length?"Guardado · Word Bank activo: "+t.usedWords.join(", "):"Texto guardado")+(spAdd.length?" · reps de ortografía: "+spAdd.join(", "):"")+(got.length?" · logro nuevo":""));render();break}
    case"dict-start":{const ctx=b.dataset.ctx;startDict(ctx,txt=>dictAppend(ctx,txt),()=>{});render();break}
    case"dict-stop":stopDict();break;
    case"coach-apply":coachAct(b.dataset.ctx,+b.dataset.i,true);break;
    case"coach-ignore":coachAct(b.dataset.ctx,+b.dataset.i,false);break;
    case"unmute":{const st=state.coach[b.dataset.r];if(st){st.i=0}save();render();break}
    case"wcat":wordsUI.cat=b.dataset.c;render();break;
    case"word-drill":{const p=buildPlan({words:true});if(!p.items.length){toast("No hay palabras pendientes hoy");break}startSession(p);break}
    case"word-add":addWord();break;
    case"word-del":{const dw=(state.customWords||[]).find(w=>w.id===b.dataset.wid);if(dw&&dw.cat==="auto")state.autoSkip=(state.autoSkip||[]).concat([lo(baseOf(dw))]);state.customWords=(state.customWords||[]).filter(w=>w.id!==b.dataset.wid);delete state.words[b.dataset.wid];indexBank();save();render();break}
    case"say":speak(b.dataset.t);break;
    case"pron-start":{const wd=allWords().find(w=>w.id===b.dataset.wid);if(!wd)break;pronUI={wid:wd.id,target:wd.ex,heard:"",result:null};
      startDict("pron",txt=>{pronUI.heard=(pronUI.heard+" "+txt).trim()},()=>{finishPron()});render();break}
    case"cmp":labUI["cmp"+b.dataset.slot]=labUI["cmp"+b.dataset.slot]===b.dataset.id?null:b.dataset.id;render();break;
    case"lab-del":labUI.del=b.dataset.id;render();break;
    case"lab-del-yes":{const t=texts.find(x=>x.id===b.dataset.id);texts=texts.filter(x=>x.id!==b.dataset.id);saveTexts();if(t)cloudText(t,true);labUI.del=null;render();break}
    case"redo-placement":place={i:0,ans:[],done:false};render();break;
    case"reset":reviewUI.confirmReset=true;render();break;
    case"reset-no":reviewUI.confirmReset=false;render();break;
    case"reset-yes":{state=fresh();indexBank();reviewUI.confirmReset=false;view="onboard";save();render();break}
  }
});
document.addEventListener("submit",ev=>{ev.preventDefault();const f=ev.target.dataset.form;
  if(f==="fill"&&sess&&!sess.fb)checkFree();
  if(f==="rep"&&repsUI&&repsUI.phase==="write")repsCheck();
  if(f==="wb"&&wbUI&&wbUI.phase==="ask")wbCheck();
  if(f==="spell-add"){const el=$("#sp-add");const w=lo((el&&el.value)||"").trim();if(!/^[a-z][a-z'’-]*$/.test(w)){toast("Escribe una sola palabra en inglés");return}
    if(DICT.st==="ready"&&!known(w)){toast("“"+w+"” no está en el diccionario. Revisa cómo se escribe.");return}
    addSpellRep(null,w,"manual");save();toast("Agregada a tus reps de ortografía");render()}});
document.addEventListener("keydown",ev=>{
  if(ev.key==="Enter"&&!ev.shiftKey&&sess&&!sess.fb&&ev.target.tagName==="TEXTAREA"&&ev.target.id.startsWith("ans-")){ev.preventDefault();checkFree()}
});
document.addEventListener("input",ev=>{
  const t=ev.target;
  if(t.id==="draft-session"||t.id==="draft-lab"){const ctx=t.id.slice(6);if(ctx==="session"&&!sess)return;setDraft(ctx,t.value);
    const ex=ctx==="lab"?EX[labUI.prompt]:curEx();const w=$("#wc-"+ctx);if(w)w.textContent=wc(t.value)+" words";const cl=$("#cl-"+ctx);if(cl&&ex)cl.innerHTML=writeChecklist(ex,t.value);
    const sb=$("#lab-save-btn");if(sb&&ctx==="lab")sb.disabled=wc(t.value)<10;scheduleCoach(ctx)}
  if(t.id==="wsearch"){wordsUI.q=t.value;render();const el=$("#wsearch");if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}}
});
document.addEventListener("change",ev=>{
  const t=ev.target;
  if(t.id==="lab-prompt"){labUI.prompt=t.value||null;coachIgn.lab=new Set();render()}
  if(t.id==="lang-set"){state.lang=t.value;save();render()}
});

function scorePlacement(){
  const lv=["A2","B1","B2","C1","C2"];let level="A1";
  for(const l of lv){const its=PLACEMENT.map((p,k)=>({p,k})).filter(x=>x.p.lv===l);const ok=its.filter(x=>place.ans[x.k]===x.p.a).length;if(ok/its.length>=0.6)level=l;else break}
  return level;
}
function applyLevel(l){
  state.skill=LEVEL_START[l];state.startLevel=l;state.placed=true;setTimeout(autoTopUp,1500);state.hist.push({d:today(),s:state.skill});state.plan=null;view="home";save();render();window.scrollTo({top:0});
}

/* ============================== BOOT ============================== */
try{const d=JSON.parse(sessionStorage.getItem("eg-lab-draft")||"null");if(d&&d.p&&EX[d.p]){labUI.prompt=d.p;labUI.draft=d.d||""}}catch(e){}
function boot(data){
  if(data&&data.state){state=Object.assign(fresh(),data.state);indexBank();sess=data.sess||null;place=data.place||null;view=data.view||view}
  render();initCloud();setTimeout(autoTopUp,4000);
}
try{window.claude?.hot?.snapshot?.(()=>({state,sess,place,view}))}catch(e){}
if(window.claude?.hot?.ready)window.claude.hot.ready(boot);else boot(window.claude?.hot?.data??{});
