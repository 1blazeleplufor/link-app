/* LINK prototype — application logic (vanilla JS, no build step).
   State lives in memory and is mirrored to localStorage on this device only. */
(function(){
"use strict";

/* ---------- state ---------- */
const STORE_KEY = "link-proto-v1";
const DEFAULT_STATE = () => ({
  v:1, onboarded:false, lang:guessLang(), brand:"afterglow", afterglowSeen:true, noeSeeded:true, theme:"system",
  tab:"explore", city:"paris", mode:"local", cat:"all", when:"all", budget:"any", etype:"all", day:"",
  adv:{min:0, max:150, unknown:true, free:false, verified:false, access:false, age21:false, sort:"date"},
  customCities:[], peopleAll:false, peopleView:"discover", friends:[], actTab:"invites", inviteDir:"in",
  profile:{name:"", bio:"", city:"paris", langs:["fr"], interests:["concerts","rooftops"], music:["House"], trips:[], dating:false, showAge:true, visibility:"public",
    photos:[], job:"", lookingFor:["friends","outings"], availability:"weekends",
    prompts:[{q:"pr_ideal_night",a:""},{q:"pr_never_no",a:""},{q:"pr_hidden_spot",a:""}], voice:null},
  verif:"none", outings:[], invites:SEED_INVITES.map(i=>({...i})), convos:[], tickets:[], blocked:[], reports:[], joined:[],
  notif:{invites:true, messages:true, events:true, tickets:true, marketing:false, quietFrom:"23:00", quietTo:"08:00"}
});
function guessLang(){
  try{ const l=(navigator.language||"fr").slice(0,2); return I18N[l]?l:"fr"; }catch(e){ return "fr"; }
}
let S = load();
function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      if(s && s.v===1){
        const d = DEFAULT_STATE(); const m = Object.assign(d, s);
        m.profile = Object.assign(DEFAULT_STATE().profile, s.profile||{});
        m.adv = Object.assign(DEFAULT_STATE().adv, s.adv||{});
        if(!s.afterglowSeen){ m.brand = "afterglow"; m.afterglowSeen = true; }   // new default look after Indira's feedback
        if(!s.noeSeeded){ m.invites = SEED_INVITES.filter(i=>i.id==="i0").map(i=>({...i})).concat(m.invites||[]); m.noeSeeded = true; }
        return m;
      }
    }
  }catch(e){}
  return DEFAULT_STATE();
}
function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){} }

/* ---------- i18n & formatting ---------- */
function t(key, vars){
  let s = (I18N[S.lang] && I18N[S.lang][key]) ?? I18N.en[key] ?? key;
  if(vars) for(const k in vars) s = s.split("{"+k+"}").join(vars[k]);
  return s;
}
function loc(obj){ return obj ? (obj[S.lang] || obj.en || obj.fr || "") : ""; }
const LOCALE = {fr:"fr-FR", en:"en-GB", es:"es-ES", de:"de-DE", pt:"pt-PT", it:"it-IT"};
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function money(n, cur){
  try{ return new Intl.NumberFormat(LOCALE[S.lang], {style:"currency", currency:cur||"EUR", maximumFractionDigits: n%1?2:0}).format(n); }
  catch(e){ return n+" "+cur; }
}
function cityById(id){
  const c = CITIES.find(c=>c.id===id);
  if(c) return c;
  if(id && id.startsWith("c:")) return {id, name:id.slice(2), cur:"EUR", custom:true};
  return {id, name:id||"?", cur:"EUR"};
}
function today0(){ const d=new Date(); d.setHours(12,0,0,0); return d; }
function evDate(ev){ if(ev.date) return new Date(ev.date+"T12:00:00"); const d=today0(); d.setDate(d.getDate()+(ev.d||0)); return d; }
function dayOffset(ev){ return Math.round((evDate(ev)-today0())/864e5); }
function fmtDay(date){
  const off = Math.round((date-today0())/864e5);
  if(off===0) return t("today");
  if(off===1) return t("tomorrow");
  return new Intl.DateTimeFormat(LOCALE[S.lang], {weekday:"short", day:"numeric", month:"short"}).format(date);
}
function dateTag(date){
  const f = new Intl.DateTimeFormat(LOCALE[S.lang], {month:"short"}).format(date).replace(".","");
  return `<div class="date-tag" aria-hidden="true">${date.getDate()}<small>${esc(f)}</small></div>`;
}
function priceLabel(ev){
  const cur = cityById(ev.city).cur;
  if(ev.price===null || ev.price===undefined) return t("price_unknown");
  if(ev.price===0) return t("free");
  return t("from",{p:money(ev.price,cur)});
}
function availStatus(ev){
  if(ev.member) return `<span class="status muted">${t("avail_community")}</span>`;
  if(ev.avail==="verified") return `<span class="status ok">${t("avail_verified")}</span>`;
  if(ev.avail==="soldout") return `<span class="status bad">${t("avail_soldout")}</span>`;
  return `<span class="status muted">${t("avail_unknown")}</span>`;
}
function now(){ return new Intl.DateTimeFormat(LOCALE[S.lang],{hour:"2-digit",minute:"2-digit"}).format(new Date()); }
function uid(p){ const a=new Uint32Array(2); crypto.getRandomValues(a); return p+a[0].toString(36)+a[1].toString(36); }
function token(){ const a=new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b=>b.toString(16).padStart(2,"0")).join(""); }

/* ---------- icons ---------- */
const I = {
  explore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.4 0 4 1.6 4.5 4"/></svg>',
  create:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2.5 2.5 0 0 0 0 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2.5 2.5 0 0 0 0-5z"/><path d="M14 5v14" stroke-dasharray="2 2.5"/></svg>',
  messages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  flask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7.5 14h9"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/></svg>',
  mic:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  plus:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  image:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  gif:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10 10H8.2a1.2 1.2 0 0 0-1.2 1.2v1.6A1.2 1.2 0 0 0 8.2 14H10v-2H9M13 10v4M16 14v-4h2.5M16 12h2"/></svg>',
  cal:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  send:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 20 4l-6 16-3-7z"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
};

/* ---------- derived data ---------- */
function allEvents(){
  const member = S.outings.filter(o=>(o.type==="public" && o.status==="approved") || o.type==="private").map(o=>({ private:o.type==="private",
    id:o.id, city:o.city, cat:o.cat, title:o.title, venue:o.place||"—", area:"", date:o.date, t:o.time, price:0, avail:"unknown", tk:"D",
    age:18, acc:null, going:1, org:S.profile.name||t("you"), member:true, desc:{en:o.desc, fr:o.desc}
  }));
  return EVENTS.concat(member);
}
function scoreEvent(ev){
  const reasons=[]; let s=0;
  if(S.profile.interests.includes(ev.cat)){ s+=3; reasons.push(t("why_interest",{x:t("cat_"+ev.cat).toLowerCase()})); }
  const trip = S.profile.trips.find(tr=>tr.city===ev.city);
  if(trip){ s+=3; reasons.push(t("why_trip",{x:cityById(ev.city).name})); }
  if(ev.city===S.profile.city){ s+=2; reasons.push(t("why_city")); }
  if(ev.going>20) s+=0.5;
  return {s, reasons};
}
const PRICE_MAX = 150;
function etypeOf(ev){
  if(ev.member) return ev.private ? "private" : "public";
  if(ev.cat==="private") return "private";
  return /community|communaut/i.test(ev.org||"") ? "public" : "org";
}
function budgetKey(){
  const A=S.adv, d=DEFAULT_STATE().adv;
  if(A.free) return "free";
  if(A.min===0 && A.max===30) return "30";
  if(A.min===0 && A.max===60) return "60";
  if(A.min===d.min && A.max===d.max) return "any";
  return "";
}
function advCount(){
  const a=S.adv, d=DEFAULT_STATE().adv; let n=0;
  if(a.min!==d.min || a.max!==d.max) n++;
  ["unknown","free","verified","access","age21"].forEach(k=>{ if(a[k]!==d[k]) n++; });
  if(a.sort!==d.sort) n++;
  if(S.when!=="all" || S.day) n++;
  if(S.etype!=="all") n++;
  return n;
}
function filteredEvents(){
  let list = allEvents();
  if(S.mode==="local") list = list.filter(e=>e.city===S.city);
  if(S.cat!=="all") list = list.filter(e=>e.cat===S.cat);
  if(S.when!=="all") list = list.filter(e=>{
    const off=dayOffset(e); if(off<0) return false;
    if(S.when==="today") return off===0;
    if(S.when==="week") return off<=7;
    if(S.when==="weekend"){ const wd=evDate(e).getDay(); return off<=7 && (wd===0||wd===6||(wd===5)); }
    return true;
  });
  if(S.etype!=="all") list = list.filter(e=>etypeOf(e)===S.etype);
  if(S.day) list = list.filter(e=>{ const d=evDate(e); const x=new Date(S.day+"T12:00:00"); return d.toDateString()===x.toDateString(); });
  const A=S.adv;
  list = list.filter(e=>{
    if(e.price===null || e.price===undefined) return A.unknown && !A.free;
    if(A.free && e.price!==0) return false;
    return e.price>=A.min && (A.max>=PRICE_MAX || e.price<=A.max);
  });
  if(A.verified) list = list.filter(e=>e.avail==="verified");
  if(A.access) list = list.filter(e=>e.acc===true);
  if(A.age21) list = list.filter(e=>e.age>=21);
  if(S.mode==="personal"){
    list = list.map(e=>({e, sc:scoreEvent(e)})).filter(x=>x.sc.s>0).sort((a,b)=>b.sc.s-a.sc.s).map(x=>Object.assign({}, x.e, {_why:x.sc.reasons}));
  } else {
    list.sort((a,b)=>dayOffset(a)-dayOffset(b));
  }
  if(A.sort==="pop") list.sort((a,b)=>b.going-a.going);
  if(A.sort==="price") list.sort((a,b)=>(a.price??1e9)-(b.price??1e9));
  return list;
}
function person(id){ return PEOPLE.find(p=>p.id===id); }
function visiblePeople(){
  let list = PEOPLE.filter(p=>!S.blocked.includes(p.id));
  if(!S.peopleAll) list = list.filter(p=>p.city===S.city || p.trips.some(tr=>tr.city===S.city));
  return list.map(p=>({p, shared:p.interests.filter(i=>S.profile.interests.includes(i))})).sort((a,b)=>(b.p.id==="p0")-(a.p.id==="p0") || b.shared.length-a.shared.length);
}
const verified = () => S.verif==="ok";

/* ---------- rendering ---------- */
const $ = sel => document.querySelector(sel);
function applyLook(){
  const r = document.documentElement;
  r.dataset.brand = S.brand;
  if(S.theme==="system") delete r.dataset.theme; else r.dataset.theme = S.theme;
  r.lang = S.lang;
}
function visual(ev, big){
  const [a,b,word] = CAT_ART[ev.cat] || CAT_ART.activities;
  const seed = [...ev.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const x = 20+(seed*37)%60, y = 10+(seed*53)%60;
  return `<div class="visual" style="background:radial-gradient(circle at ${x}% ${y}%, ${b} 0 18%, transparent 46%), linear-gradient(135deg, ${a}, ${b})">
    ${dateTag(evDate(ev))}<span class="big">${word}</span><span class="cat">${esc(t("cat_"+ev.cat))}</span></div>`;
}
function eventCard(ev){
  const city = cityById(ev.city);
  const why = ev._why && ev._why.length ? `<div class="why"><span>${t("why")} :</span>${ev._why.map(r=>`<b>${esc(r)}</b>`).join(" · ")}</div>` : "";
  return `<article class="card"><button class="event-card" data-action="event" data-id="${ev.id}" aria-label="${esc(ev.title)}">
    ${visual(ev)}
    <div class="card-body">
      <h3>${esc(ev.title)}</h3>
      <div class="meta"><span>${I.clock}${esc(fmtDay(evDate(ev)))} · ${esc(ev.t)}</span><span>${I.pin}${esc(ev.venue)}${S.mode!=="local"?", "+esc(city.name):""}</span></div>
      <div class="row" style="justify-content:space-between"><span class="price">${esc(priceLabel(ev))}</span>${availStatus(ev)}</div>
      <div class="meta"><span>${I.users}${t("going",{n:ev.going})}</span><span>${esc(ev.member?t("organizer")+" : "+ev.org:ev.org)}</span></div>
      ${why}
    </div></button></article>`;
}
function chip(group, val, label, pressed){ return `<button class="chip" data-action="set" data-k="${group}" data-v="${val}" aria-pressed="${pressed}">${esc(label)}</button>`; }

function renderTop(){
  const city = cityById(S.city);
  const modeDesc = S.mode==="local" ? t("mode_local_d",{c:city.name}) : S.mode==="international" ? t("mode_international_d") : t("mode_personal_d");
  const showFilters = S.tab==="explore";
  $("#top").innerHTML = `
    <div class="topbar-row">
      <button class="logo-btn" data-action="home" aria-label="${esc(t("go_home"))}"><span class="logo" aria-hidden="true">LINK<span class="dot"></span><span class="dot b"></span></span><span class="spark" aria-hidden="true"></span></button>
      <div class="row" style="gap:8px">
        <button class="chip" data-action="city" aria-label="${esc(city.name)}" style="display:flex;align-items:center;gap:4px">${I.pin.replace('<svg','<svg width="15" height="15"')}${esc(city.name)}${I.chev.replace('<svg','<svg width="14" height="14"')}</button>
        <button class="demo-pill" data-action="about">${t("demo")}</button>
      </div>
    </div>
    ${showFilters?`<div class="seg" role="group" aria-label="mode">
      ${["local","international","personal"].map(m=>`<button data-action="set" data-k="mode" data-v="${m}" aria-pressed="${S.mode===m}">${t("mode_"+m)}</button>`).join("")}
    </div><p class="small muted">${esc(modeDesc)}</p>`:""}
    ${navigator.onLine===false?`<div class="offline">${t("offline")}</div>`:""}`;
}

function renderExplore(){
  const cur = cityById(S.city).cur;
  const list = filteredEvents();
  const greeting = S.profile.name ? `<p class="muted">${esc(t("welcome_back",{n:S.profile.name}))}</p>` : "";
  return `
  <div class="hero">${greeting}<h1>${esc(t("tagline"))}</h1></div>
  <div class="chips" role="group" aria-label="${t("f_cat")}">
    <button class="chip filters-btn" data-action="filters" aria-haspopup="dialog">${I.sliders}${t("filters")}${advCount()?` <span class="fcount">${advCount()}</span>`:""}</button>
    ${chip("cat","all",t("cat_all"),S.cat==="all")}${CATEGORIES.map(c=>chip("cat",c,t("cat_"+c),S.cat===c)).join("")}</div>
  <div class="chips" role="group" aria-label="${t("date")}">${["all","today","weekend","week"].map(w=>chip("when",w,t("when_"+w),S.when===w&&!S.day)).join("")}
    <span style="width:1px;background:var(--line);flex:none"></span>
    ${["any","free","30","60"].map(k=>`<button class="chip" data-action="budget" data-v="${k}" aria-pressed="${budgetKey()===k}">${k==="any"?t("budget_any"):k==="free"?t("budget_free"):t("budget_30",{p:money(+k,cur)})}</button>`).join("")}</div>
  <div class="list">${list.length? list.map(eventCard).join("") : `
    <div class="empty"><h3>${t("no_results")}</h3><p class="muted">${t("no_results_sub")}</p>
    <div class="row" style="justify-content:center"><button class="btn" data-action="tab" data-v="create">${t("create_first")}</button><button class="btn ghost" data-action="resetFilters">${t("reset_filters")}</button></div></div>`}</div>`;
}

function photo(url, color, initial, cls, alt){
  return `<div class="ph ${cls||""}" style="background:linear-gradient(135deg, ${color}, ${color}99)"><span aria-hidden="true">${esc(initial)}</span>${url?`<img src="${esc(url)}" alt="${esc(alt||"")}" loading="lazy" referrerpolicy="no-referrer">`:""}</div>`;
}
function avatar(p, lg){ return photo(p.photos&&p.photos[0], p.color||"#FF4D7E", (p.name||"?")[0], "avatar"+(lg?" lg":""), ""); }
function meAsPerson(){
  const P = S.profile;
  return {id:"me", name:P.name||t("you"), age:null, city:P.city, langs:P.langs, interests:P.interests, music:P.music, verified:verified(), color:"#FF4D7E",
    bio:{en:P.bio, fr:P.bio}, trips:P.trips.map(tr=>({city:tr.city})), photos:P.photos, job:P.job?{en:P.job}:null, lookingFor:P.lookingFor,
    availability:P.availability, prompts:P.prompts.filter(x=>x.a&&x.a.trim()).map(x=>({q:x.q, a:{en:x.a}}))};
}
const faceBtn = (p, inner)=> `<button class="face-btn" data-action="person" data-id="${p.id}" aria-label="${esc(t("view_profile",{n:p.name}))}">${inner||avatar(p)}</button>`;
const nameBtn = (p, inner)=> `<button class="name-btn" data-action="person" data-id="${p.id}">${inner||esc(p.name)}</button>`;
const LIKE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>';
const VI = {
  job:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/></svg>',
  lf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  av:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  music:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>'
};
function renderPeople(){
  const list = visiblePeople();
  const city = cityById(S.city);
  const nf = S.friends.filter(f=>f.status==="friend").length;
  const viewSeg = `<div class="seg people-view" role="group"><button data-action="peopleView" data-v="discover" aria-pressed="${S.peopleView!=="friends"}">${t("ppl_discover")}</button><button data-action="peopleView" data-v="friends" aria-pressed="${S.peopleView==="friends"}">${t("friends")}${nf?` (${nf})`:""}</button></div>`;
  if(S.peopleView==="friends") return `<div class="section-head"><h1>${t("tab_people")}</h1></div>${viewSeg}${renderFriends()}`;
  return `
  <div class="section-head"><h1>${t("tab_people")}</h1></div>
  ${viewSeg}
  <p class="muted">${t("people_sub")}</p>
  <div class="seg" role="group"><button data-action="peopleAll" data-v="0" aria-pressed="${!S.peopleAll}">${esc(t("people_filter_city",{c:city.name}))}</button><button data-action="peopleAll" data-v="1" aria-pressed="${S.peopleAll}">${t("people_all")}</button></div>
  ${verified()?"":lockBanner()}
  <div class="list">${list.length? list.map(({p,shared})=>`
    <article class="card"><button class="event-card" data-action="person" data-id="${p.id}" aria-label="${esc(p.name)}">
      <div class="pcard-photo">${photo(p.photos&&p.photos[0], p.color, p.name[0], "", "")}
        ${p.verified?`<span class="vbadge">${I.shield}${t("verified_badge").replace(/\s*\(.*\)/,"")}</span>`:""}
        <div class="overlay"><h3>${esc(p.name)}, ${esc(t("years",{n:p.age}))}</h3><span class="small">${esc(cityById(p.city).name)}${p.job?" · "+esc(loc(p.job)):""}</span></div>
      </div>
      <div class="card-body">
        ${p.prompts&&p.prompts[0]?`<p class="small muted" style="font-weight:700">${esc(t(p.prompts[0].q))}</p><p style="font-family:var(--font-display);font-weight:700;font-size:17px;line-height:1.3">${esc(loc(p.prompts[0].a))}</p>`:`<p class="small">${esc(loc(p.bio))}</p>`}
        <div class="tags">${p.interests.map(i=>`<span class="tag${shared.includes(i)?" match":""}">${esc(t("cat_"+i))}</span>`).join("")}</div>
        ${p.trips.filter(tr=>tr.city===S.city && p.city!==S.city).map(tr=>`<p class="small" style="color:var(--accent-3);font-weight:700">${esc(t("p_trip",{x:cityById(tr.city).name}))}</p>`).join("")}
      </div></button></article>`).join("") : `<div class="empty"><h3>${t("no_results")}</h3><button class="btn ghost" data-action="peopleAll" data-v="1">${t("people_all")}</button></div>`}</div>`;
}
function friendState(pid){ const f=S.friends.find(x=>x.id===pid); return f?f.status:"none"; }
function isMatch(p){ const f=S.friends.find(x=>x.id===p.id); return !!(f && (f.match || p.interests.filter(i=>S.profile.interests.includes(i)).length>=2)); }
function renderFriends(){
  const friends = S.friends.filter(f=>f.status==="friend" && !S.blocked.includes(f.id)).map(f=>person(f.id)).filter(Boolean);
  const pending = S.friends.filter(f=>f.status==="pending").map(f=>person(f.id)).filter(Boolean);
  friends.sort((a,b)=>isMatch(b)-isMatch(a));
  const card = p => `<article class="card"><div class="person">${faceBtn(p)}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div class="row" style="justify-content:space-between">${nameBtn(p,`<h3>${esc(p.name)}</h3>`)}${isMatch(p)?`<span class="match-pill">${t("match")}</span>`:""}</div>
        <p class="small muted">${esc(cityById(p.city).name)}${p.job?" · "+esc(loc(p.job)):""}</p>
        <div class="row"><button class="btn" data-action="friendMsg" data-id="${p.id}">${t("message_btn")}</button><button class="btn secondary" data-action="invitePerson" data-id="${p.id}"><span class="link-word">Link</span></button></div>
      </div></div></article>`;
  return `<p class="muted">${t("friends_sub")}</p>
    ${verified()?"":lockBanner()}
    <div class="list">${friends.length?friends.map(card).join(""):`<div class="empty"><h3>${t("friends_empty")}</h3><p class="muted">${t("friends_empty_sub")}</p><button class="btn ghost" data-action="peopleView" data-v="discover">${t("ppl_discover")}</button></div>`}</div>
    ${pending.length?`<span class="label">${t("requests_sent")}</span><div class="list">${pending.map(p=>`<article class="card"><div class="person">${faceBtn(p)}<div style="flex:1">${nameBtn(p,`<h3>${esc(p.name)}</h3>`)}<p class="small muted">${t("friend_pending")}</p></div></div></article>`).join("")}</div>`:""}`;
}
function lockBanner(){
  return `<div class="banner">${I.lock.replace('<svg','<svg style="color:var(--accent)"')}<div style="display:flex;flex-direction:column;gap:8px"><b>${t("lock_title")}</b><p class="small muted">${t("lock_sub")}</p><button class="btn" data-action="verify" style="align-self:flex-start">${t("verify_now")}</button></div></div>`;
}

let createType = "public";
function cityOptions(sel){
  const opts = CITIES.map(c=>`<option value="${c.id}"${c.id===sel?" selected":""}>${esc(c.name)}</option>`).join("")
    + S.customCities.map(n=>`<option value="c:${esc(n)}"${("c:"+n)===sel?" selected":""}>${esc(n)}</option>`).join("");
  return opts;
}
function renderCreate(){
  const d = new Date(); d.setDate(d.getDate()+3);
  const iso = d.toISOString().slice(0,10);
  return `
  <div class="hero"><h1>${t("create_title")}</h1><p class="muted">${t("create_sub")}</p></div>
  <div class="seg" role="group">${["public","private","org"].map(k=>`<button data-action="ctype" data-v="${k}" aria-pressed="${createType===k}">${t("type_"+k)}</button>`).join("")}</div>
  <p class="small muted">${t("type_"+createType+"_d")}</p>
  ${createType==="org" ? `<div class="banner">${I.lock}<p>${t("org_locked")}</p></div>` : `
  <form id="createForm" class="list" novalidate>
    <div class="field"><label for="c_title">${t("f_title")}</label><input id="c_title" type="text" maxlength="80" placeholder="${esc(t("f_title_ph"))}"></div>
    <div class="grid2">
      <div class="field"><label for="c_cat">${t("f_cat")}</label><select id="c_cat">${CATEGORIES.map(c=>`<option value="${c}">${esc(t("cat_"+c))}</option>`).join("")}</select></div>
      <div class="field"><label for="c_city">${t("f_city")}</label><select id="c_city">${cityOptions(S.city)}</select></div>
      <div class="field"><label for="c_date">${t("f_date")}</label><input id="c_date" type="date" value="${iso}"></div>
      <div class="field"><label for="c_time">${t("f_time")}</label><input id="c_time" type="time" value="19:00"></div>
    </div>
    <div class="field"><label for="c_place">${t("f_place")}</label><input id="c_place" type="text" maxlength="100" placeholder="${esc(t("f_place_ph"))}"></div>
    <div class="field"><label for="c_cap">${t("f_capacity")}</label><input id="c_cap" type="number" min="2" max="200" value="6"></div>
    <div class="field"><label for="c_desc">${t("f_desc")}</label><textarea id="c_desc" maxlength="600" placeholder="${esc(t("f_desc_ph"))}"></textarea></div>
    <div class="field"><label for="c_rules">${t("f_rules")}</label><input id="c_rules" type="text" maxlength="160" placeholder="${esc(t("f_rules_ph"))}"></div>
    <button class="btn block" type="submit">${createType==="public"?t("publish"):t("save_private")}</button>
  </form>`}`;
}

function inviteRow(inv){
  const p = person(inv.dir==="in"?inv.from:inv.to);
  const ev = allEvents().find(e=>e.id===inv.event) || S.outings.find(o=>o.id===inv.event);
  if(!p) return "";
  const st = {pending:["warn","pending"],accepted:["ok","accepted"],declined:["bad","declined"],cancelled:["muted","cancelled"]}[inv.status]||["muted",inv.status];
  const exp = new Date(); exp.setDate(exp.getDate()+(inv.d||3));
  return `<article class="card"><div class="person"><button class="face-btn" data-action="person" data-id="${p.id}" aria-label="${esc(t("view_profile",{n:p.name}))}">${avatar(p)}</button><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
    <div class="row" style="justify-content:space-between"><button class="name-btn" data-action="person" data-id="${p.id}"><h3>${esc(p.name)}</h3></button><span class="status ${st[0]}">${t(st[1])}</span></div>
    <button class="invite-open" data-action="inviteOpen" data-id="${inv.id}" aria-label="${esc(t("open_convo",{n:p.name}))}">
    <p class="small"><b>${esc(ev?ev.title:"—")}</b>${ev?` · ${esc(fmtDay(evDate(ev)))} · ${esc(cityById(ev.city).name)}`:""}</p>
    ${inv.note?`<p class="small muted">« ${esc(typeof inv.note==="string"?inv.note:loc(inv.note))} »</p>`:""}
    <span class="small open-hint">${esc(t("open_convo",{n:p.name}))} ›</span></button>
    ${inv.status==="pending"?`<p class="small muted">${t("expires",{d:fmtDay(exp)})}</p>`:""}
    ${inv.status==="pending" && inv.dir==="in" ? `<div class="row"><button class="btn" data-action="inviteAccept" data-id="${inv.id}">${t("accept")}</button><button class="btn ghost" data-action="inviteDecline" data-id="${inv.id}">${t("decline")}</button></div>`:""}
    ${inv.status==="pending" && inv.dir==="out" ? `<div class="row"><button class="btn ghost" data-action="inviteCancel" data-id="${inv.id}">${t("cancel_invite")}</button></div>`:""}
  </div></div></article>`;
}
function renderActivity(){
  const pendingIn = S.invites.filter(i=>i.dir==="in"&&i.status==="pending").length;
  let body="";
  if(S.actTab==="invites"){
    const list = S.invites.filter(i=>i.dir===S.inviteDir && !S.blocked.includes(i.from||i.to));
    body = `<div class="seg" role="group"><button data-action="invDir" data-v="in" aria-pressed="${S.inviteDir==="in"}">${t("received")}${pendingIn?` (${pendingIn})`:""}</button><button data-action="invDir" data-v="out" aria-pressed="${S.inviteDir==="out"}">${t("sent")}</button></div>
      ${!verified() && S.inviteDir==="in" && pendingIn ? lockBanner() : ""}
      <div class="list">${list.length?list.map(inviteRow).join(""):`<div class="empty"><p class="muted">${t("no_invites")}</p></div>`}</div>`;
  } else if(S.actTab==="outings"){
    body = `<div class="list">${S.outings.length?S.outings.map(o=>{
      const st = o.type==="private"?["muted","private_label"]:o.status==="approved"?["ok","approved"]:o.status==="rejected"?["bad","rejected"]:["warn","pending_mod"];
      return `<article class="card"><div class="card-body">
        <div class="row" style="justify-content:space-between"><h3>${esc(o.title)}</h3><span class="status ${st[0]}">${t(st[1])}</span></div>
        <div class="meta"><span>${I.clock}${esc(fmtDay(evDate(o)))} · ${esc(o.time)}</span><span>${I.pin}${esc(o.place||"—")}, ${esc(cityById(o.city).name)}</span><span>${I.users}${t("members",{n:1,m:o.cap})}</span></div>
        ${o.desc?`<p class="small">${esc(o.desc)}</p>`:""}
        <div class="row"><button class="btn danger" data-action="outingDelete" data-id="${o.id}">${t("delete")}</button></div>
      </div></article>`;}).join(""):`<div class="empty"><p class="muted">${t("no_outings")}</p><button class="btn" data-action="tab" data-v="create">${t("create_first")}</button></div>`}</div>`;
  } else {
    body = `<div class="list">${S.tickets.length?S.tickets.map(tk=>{
      const ev = allEvents().find(e=>e.id===tk.eventId);
      const st = tk.status==="valid"?["test","ticket_test"]:tk.status==="scanned"?["muted","already"]:["bad","revoked"];
      return `<article class="card"><button class="event-card card-body" data-action="ticket" data-id="${tk.id}">
        <div class="row" style="justify-content:space-between"><h3>${esc(ev?ev.title:"—")}</h3><span class="status ${st[0]}">${tk.status==="scanned"?esc(t("already",{t:tk.scannedAt})).split(".")[0]:t(st[1]).split("—")[0]}</span></div>
        <div class="meta"><span>${I.clock}${ev?esc(fmtDay(evDate(ev)))+" · "+esc(ev.t):""}</span><span>${esc(t(tk.type))} · ${esc(t("ticket_n",{i:tk.idx,n:tk.n}))}</span><span>${t("order")} ${esc(tk.orderId)}</span></div>
      </button></article>`;}).join(""):`<div class="empty"><p class="muted">${t("no_tickets")}</p></div>`}</div>`;
  }
  return `<div class="section-head"><h1>${t("tab_activity")}</h1></div>
    <div class="chips" role="group">${["invites","outings","tickets"].map(k=>`<button class="chip" data-action="actTab" data-v="${k}" aria-pressed="${S.actTab===k}">${t("act_"+k)}</button>`).join("")}</div>${body}`;
}

let openConvoId = null;
function renderMessages(){
  if(!verified()) return `<div class="section-head"><h1>${t("tab_messages")}</h1></div><div class="lock card">${I.lock}<h2>${t("lock_title")}</h2><p class="muted">${t("lock_sub")}</p><button class="btn" data-action="verify">${t("verify_now")}</button></div>`;
  if(openConvoId){
    const c = S.convos.find(c=>c.id===openConvoId);
    if(c){
      const p = c.with?person(c.with):null;
      return `<div class="row"><button class="iconbtn" data-action="convoBack" aria-label="${t("back")}">${I.chev.replace('<svg','<svg style="transform:rotate(90deg)"')}</button>${p?`<button class="face-btn" data-action="person" data-id="${p.id}" aria-label="${esc(t("view_profile",{n:p.name}))}">${avatar(p)}</button>`:""}<div style="flex:1;min-width:0">${p?`<button class="name-btn" data-action="person" data-id="${p.id}"><h2>${esc(c.title)}</h2></button>`:`<h2>${esc(c.title)}</h2>`}${p?`<p class="small muted">${p.verified?t("verified_badge"):t("not_verified")}</p>`:""}${c.members?`<div class="member-row">${c.members.map(id=>person(id)).filter(Boolean).map(m=>faceBtn(m)).join("")}<span class="small muted">${t("members_n",{n:c.members.length+1})}</span></div>`:""}</div></div>
        ${(()=>{ const pin = p && S.invites.find(i=>i.status==="pending" && (i.dir==="in"?i.from:i.to)===p.id);
          if(!pin) return "";
          return pin.dir==="in"
            ? `<div class="banner small"><div style="display:flex;flex-direction:column;gap:8px;flex:1"><b>${esc(t("request_pending",{n:p.name}))}</b><div class="row"><button class="btn" data-action="inviteAccept" data-id="${pin.id}">${t("accept")}</button><button class="btn ghost" data-action="inviteDecline" data-id="${pin.id}">${t("decline")}</button></div></div></div>`
            : `<div class="banner small"><p>${esc(t("waiting_reply",{n:p.name}))}</p></div>`; })()}
        <div class="banner small">${I.shield.replace('<svg','<svg style="color:var(--ok)"')}<p>${t("msg_safety")}</p></div>
        <div class="msgs" id="msgs">${c.msgs.map((m,i)=>{ const who = m.me?esc(t("you")):(m.from&&person(m.from)?nameBtn(person(m.from)):(p?nameBtn(p):""));
          return `<div class="bubble${m.me?" me":""}${m.voice?" voice":""}${(m.media||m.gif)?" media":""}${m.ev?" evmsg":""}" data-i="${i}">${msgBody(m)}<time>${who} · ${esc(m.at)}</time><button type="button" class="react-open sr-focus" data-action="reactOpen" data-i="${i}" aria-label="${esc(t("react"))}" aria-haspopup="true">☺</button>${reactsRow(m,i)}</div>`; }).join("")}</div>
        <form class="composer" id="composer"><button type="button" class="iconbtn attach" data-action="attach" aria-label="${esc(t("attach"))}" aria-haspopup="dialog">${I.plus}</button><label class="sr" for="msgInput">${t("msg_placeholder")}</label><input id="msgInput" type="text" maxlength="1000" autocomplete="off" placeholder="${esc(t("msg_placeholder"))}"><button type="button" class="iconbtn mic" data-action="recChat" aria-label="${esc(t("rec_start"))}">${I.mic}</button><button class="btn send-btn" type="submit" aria-label="${esc(t("send"))}">${I.send}</button></form>`;
    }
    openConvoId=null;
  }
  return `<div class="section-head"><h1>${t("tab_messages")}</h1><button class="btn secondary" data-action="newGroup">+ ${t("new_group")}</button></div>
    <div class="list">${S.convos.length?S.convos.filter(c=>!c.with||!S.blocked.includes(c.with)).map(c=>{
      const p=c.with?person(c.with):null; const last=c.msgs[c.msgs.length-1];
      return `<article class="card"><div class="person">${p?faceBtn(p):c.members?groupFaces(c):`<div class="avatar" style="background:var(--accent-3)">${I.users.replace('<svg','<svg width="26" height="26"')}</div>`}
        <button class="event-card" data-action="convo" data-id="${c.id}" style="flex:1;min-width:0;align-self:stretch"><h3>${esc(c.title)}</h3><p class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last?esc(msgPreview(last)):""}</p></button></div></article>`;}).join(""):`<div class="empty"><h3>${t("msg_empty")}</h3><p class="muted">${t("msg_empty_sub")}</p></div>`}</div>`;
}

function toggleRow(id, label, desc, checked){
  return `<div class="toggle"><label for="${id}" style="display:flex;flex-direction:column;gap:2px;flex:1"><b>${label}</b>${desc?`<span class="small muted">${desc}</span>`:""}</label><input class="switch" type="checkbox" id="${id}" data-action="toggle" ${checked?"checked":""}></div>`;
}
function brandOptions(){
  const B = [
    ["afterglow","Afterglow","#FF6A4D","#F0367F","#9B2FD6","Unbounded"],
    ["fiesta","Fiesta","#FF5A4E","#FFC233","#0E9F9A","Bricolage Grotesque"],
    ["midnight","Midnight Club","#140F2E","#FF3DA0","#3FDFFF","Unbounded"],
    ["riviera","Riviera","#1559D6","#F2D635","#19B58C","Syne"]
  ];
  return B.map(([id,name,a,b,c,font])=>`<button class="brand-opt" data-action="brand" data-v="${id}" aria-pressed="${S.brand===id}">
    <span class="swatches" aria-hidden="true"><i style="background:${a}"></i><i style="background:${b}"></i><i style="background:${c}"></i></span>
    <span style="display:flex;flex-direction:column;gap:2px"><b style="font-family:'${font}',sans-serif;font-size:18px">${name}</b><span class="small muted">${font}</span></span></button>`).join("");
}
function renderProfile(){
  const P = S.profile;
  const vs = {none:["muted","verif_none"],pending:["warn","verif_pending"],ok:["ok","verif_ok"],failed:["bad","verif_failed"],manual:["warn","v_manual"]}[S.verif];
  const me = {name:P.name||"?", color:"#FF4D7E", photos:P.photos};
  const pendingMod = S.outings.filter(o=>o.type==="public"&&o.status==="pending");
  return `
  <div class="row" style="gap:14px"><button class="face-btn" data-action="preview" aria-label="${esc(t("preview"))}">${avatar(me,true)}</button><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px"><h1>${esc(P.name||t("tab_profile"))}</h1><span class="status ${vs[0]}">${t("verif_status")} : ${t(vs[1])}</span></div></div>
  ${S.verif!=="ok"?`<button class="btn block" data-action="verify">${I.shield.replace('<svg','<svg width="20" height="20"')}${t("verify_now")}</button>`:""}

  <button class="btn block secondary" data-action="preview">${t("preview")}</button>

  <section class="card"><div class="card-body">
    <h2>${t("photos")}</h2><p class="small muted">${t("my_photo_hint")}</p>
    <div class="photo-grid">
      ${P.photos.map((src,i)=>`<div class="slot"><img src="${esc(src)}" alt="${esc(t("photos"))} ${i+1}"><button class="rm" data-action="photoDel" data-v="${i}" aria-label="${t("remove")}">${I.x}</button></div>`).join("")}
      ${P.photos.length<6?`<label class="slot" for="photoInput" aria-label="${t("add_photo")}">+<input id="photoInput" type="file" accept="image/*" class="sr"></label>`:""}
    </div>
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("voice_prompt")}</h2><p class="small muted">${t("voice_prompt_d")}</p>
    <div class="field"><label for="vq">${t("prompt_pick")}</label><select id="vq">${PROMPT_KEYS.map(k=>`<option value="${k}"${(P.voice?P.voice.q:"pr_ideal_night")===k?" selected":""}>${esc(t(k))}</option>`).join("")}</select></div>
    ${P.voice?`<div class="voice-card mine"><span class="q">${esc(t(P.voice.q))}</span>${voicePlayer(P.voice.id, P.voice.dur, P.voice.wave)}</div>
      <div class="row"><button class="btn secondary" data-action="recProfile">${I.mic}${t("voice_redo")}</button><button class="btn ghost" data-action="voiceDel">${t("voice_delete")}</button></div>`
    :`<button class="btn secondary" data-action="recProfile">${I.mic}${t("voice_record")}</button>`}
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("prompts")}</h2>
    ${P.prompts.map((pr,i)=>`<div class="field"><label for="pq_${i}">${t("prompt_pick")} ${i+1}</label>
      <select id="pq_${i}">${PROMPT_KEYS.map(k=>`<option value="${k}"${pr.q===k?" selected":""}>${esc(t(k))}</option>`).join("")}</select>
      <label class="sr" for="pa_${i}">${t("prompt_answer")}</label><textarea id="pa_${i}" maxlength="150" placeholder="${esc(t("prompt_answer"))}">${esc(pr.a)}</textarea></div>`).join("")}
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("edit_profile")}</h2>
    <div class="field"><label for="p_name">${t("name")}</label><input id="p_name" type="text" maxlength="40" value="${esc(P.name)}"></div>
    <div class="field"><label for="p_job">${t("job")}</label><input id="p_job" type="text" maxlength="60" value="${esc(P.job)}"></div>
    <div class="field"><label for="p_bio">${t("bio")}</label><textarea id="p_bio" maxlength="300">${esc(P.bio)}</textarea></div>
    <div class="field"><span class="label">${t("looking_for")}</span><div class="tags">${["friends","outings","travel"].concat(P.dating?["dating"]:[]).map(k=>`<button class="chip" data-action="pLf" data-v="${k}" aria-pressed="${P.lookingFor.includes(k)}">${t("lf_"+k)}</button>`).join("")}</div></div>
    <div class="field"><span class="label">${t("availability")}</span><div class="seg">${["weekends","weeknights","flexible"].map(k=>`<button data-action="pAv" data-v="${k}" aria-pressed="${P.availability===k}">${t("av_"+k)}</button>`).join("")}</div></div>
    <div class="field"><label for="p_city">${t("city_home")}</label><select id="p_city">${cityOptions(P.city)}</select></div>
    <div class="field"><span class="label">${t("languages")}</span><div class="tags">${Object.keys(LANG_NAMES).map(l=>`<button class="chip" data-action="pLang" data-v="${l}" aria-pressed="${P.langs.includes(l)}">${LANG_NAMES[l]}</button>`).join("")}</div></div>
    <div class="field"><span class="label">${t("interests")}</span><div class="tags">${INTERESTS.map(i=>`<button class="chip" data-action="pInt" data-v="${i}" aria-pressed="${P.interests.includes(i)}">${esc(t("cat_"+i))}</button>`).join("")}</div></div>
    <div class="field"><span class="label">${t("music")}</span><div class="tags">${MUSIC.map(m=>`<button class="chip" data-action="pMusic" data-v="${m}" aria-pressed="${P.music.includes(m)}">${m}</button>`).join("")}</div></div>
    <button class="btn" data-action="saveProfile" style="align-self:flex-start">${t("save")}</button>
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("trips")}</h2><p class="small muted">${t("trip_visible")}</p>
    ${P.trips.map((tr,i)=>`<div class="row" style="justify-content:space-between"><span><b>${esc(cityById(tr.city).name)}</b> <span class="muted small">${esc(tr.from||"")} → ${esc(tr.to||"")}</span></span><button class="iconbtn" data-action="tripDel" data-v="${i}" aria-label="${t("delete")}">${I.x}</button></div>`).join("")}
    <div class="grid2"><div class="field"><label for="tr_city">${t("trip_city")}</label><select id="tr_city">${cityOptions("lisbon")}</select></div>
    <div class="field"><label for="tr_from">${t("trip_from")}</label><input id="tr_from" type="date"></div></div>
    <div class="grid2"><div class="field"><label for="tr_to">${t("trip_to")}</label><input id="tr_to" type="date"></div><button class="btn secondary" data-action="tripAdd" style="align-self:flex-end">${t("add_trip")}</button></div>
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("visibility")}</h2>
    <div class="seg">${["public","verified","hidden"].map(v=>`<button data-action="vis" data-v="${v}" aria-pressed="${P.visibility===v}">${t("vis_"+v)}</button>`).join("")}</div>
    ${toggleRow("tg_age", t("show_age"), t("show_age_d"), P.showAge)}
    ${toggleRow("tg_dating", t("dating"), t("dating_d"), P.dating)}
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("brand")}</h2><p class="small muted">${t("brand_d")}</p>
    <div class="list">${brandOptions()}</div>
    <span class="label">${t("theme")}</span>
    <div class="seg">${["system","light","dark"].map(v=>`<button data-action="theme" data-v="${v}" aria-pressed="${S.theme===v}">${t("theme_"+v)}</button>`).join("")}</div>
    <div class="field"><label for="p_lang">${t("app_lang")}</label><select id="p_lang" data-action="lang">${LANGS.map(l=>`<option value="${l.code}"${S.lang===l.code?" selected":""}>${l.name}</option>`).join("")}</select></div>
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("notif")}</h2>
    ${toggleRow("tg_n_invites", t("n_invites"), "", S.notif.invites)}
    ${toggleRow("tg_n_messages", t("n_messages"), "", S.notif.messages)}
    ${toggleRow("tg_n_events", t("n_events"), "", S.notif.events)}
    ${toggleRow("tg_n_tickets", t("n_tickets"), "", S.notif.tickets)}
    ${toggleRow("tg_n_marketing", t("n_marketing"), "", S.notif.marketing)}
    <div class="grid2"><div class="field"><label for="q_from">${t("quiet")}</label><input id="q_from" type="time" value="${esc(S.notif.quietFrom)}"></div><div class="field"><label for="q_to">&nbsp;</label><input id="q_to" type="time" value="${esc(S.notif.quietTo)}"></div></div>
    <p class="small muted">${t("quiet_d",{a:S.notif.quietFrom,b:S.notif.quietTo})}</p>
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("admin")}</h2><p class="small muted">${t("admin_d")}</p>
    ${pendingMod.length?pendingMod.map(o=>`<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:10px"><span style="min-width:0"><b>${esc(o.title)}</b><br><span class="small muted">${esc(cityById(o.city).name)} · ${esc(t("cat_"+o.cat))}</span></span><span class="row"><button class="btn" data-action="modApprove" data-id="${o.id}">${t("approve")}</button><button class="btn ghost" data-action="modReject" data-id="${o.id}">${t("reject")}</button></span></div>`).join(""):`<p class="small muted">${t("queue_empty")}</p>`}
    ${S.reports.length?`<p class="small"><b>${t("report")}</b> : ${S.reports.map(r=>{const rp=person(r.pid); return (rp?nameBtn(rp,`<b>${esc(rp.name)}</b>`):"?")+" — "+esc(t(r.reason));}).join(" · ")}</p>`:""}
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("privacy")}</h2><p class="small muted">${t("storage_note")}</p>
    ${S.blocked.map(id=>{const p=person(id);return p?`<div class="row" style="justify-content:space-between"><span class="row">${faceBtn(p)}${nameBtn(p)}</span><button class="btn ghost" data-action="unblock" data-id="${id}">${t("unblock")}</button></div>`:"";}).join("")}
    <div class="row"><button class="btn secondary" data-action="export">${t("export")}</button><button class="btn secondary" data-action="about">${t("about")}</button><button class="btn danger" data-action="resetAsk">${t("reset")}</button></div>
    <button class="btn block ghost" data-action="signOut">${t("sign_out")}</button>
  </div></section>`;
}

function renderTabs(){
  const pendingIn = S.invites.filter(i=>i.dir==="in"&&i.status==="pending").length;
  $("#tabs").innerHTML = `<div class="tabbar-inner" role="tablist">${["explore","people","create","activity","messages","profile"].map(k=>
    `<button class="tab${k==="create"?" create":""}" role="tab" data-action="tab" data-v="${k}" ${S.tab===k?'aria-current="page" aria-selected="true"':'aria-selected="false"'}>${I[k]}<span>${t("tab_"+k)}</span>${k==="activity"&&pendingIn?`<span class="badge">${pendingIn}</span>`:""}</button>`).join("")}</div>`;
}
function render(keepScroll){
  applyLook();
  renderTop(); renderTabs();
  const fn = {explore:renderExplore, people:renderPeople, create:renderCreate, activity:renderActivity, messages:renderMessages, profile:renderProfile}[S.tab];
  const y = window.scrollY;
  $("#main").innerHTML = `<div class="banner test small">${I.flask}<p>${t("demo_banner")}</p></div>` + fn();
  if(keepScroll) window.scrollTo(0,y);
  const m = document.getElementById("msgs"); if(m){ m.lastElementChild && m.lastElementChild.scrollIntoView({block:"end"}); hydrateMedia();
    if(!S.reactHint && m.children.length){ S.reactHint=true; save(); setTimeout(()=>toast(t("react_hint")), 900); } }
  if(!S.onboarded) openOnboarding();
  else if(!S.noeToast && S.invites.some(i=>i.id==="i0" && i.status==="pending")){ S.noeToast=true; save(); setTimeout(()=>toast(t("invite_from",{n:"Noë"})), 600); }
}

/* ---------- sheets ---------- */
let sheetCleanup = null;
function openSheet(html, onClose){
  closeSheet();
  const wrap = document.createElement("div");
  wrap.className = "sheet-backdrop"; wrap.id="sheetWrap";
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div>${html}</div>`;
  wrap.addEventListener("click", e=>{ if(e.target===wrap && S.onboarded) closeSheet(); });
  document.body.appendChild(wrap);
  document.body.style.overflow="hidden";
  sheetCleanup = onClose||null;
  const f = wrap.querySelector("button, input, select"); if(f) f.focus({preventScroll:true});
}
function closeSheet(){
  closeReactBar();
  stopPlaying();
  const w = document.getElementById("sheetWrap");
  if(w){ w.remove(); document.body.style.overflow=""; }
  if(sheetCleanup){ const c=sheetCleanup; sheetCleanup=null; c(); }
}
function sheetHead(title){ return `<div class="sheet-head"><h2>${esc(title)}</h2><button class="iconbtn" data-action="close" aria-label="${t("close")}">${I.x}</button></div>`; }

function openOnboarding(){
  if(document.getElementById("sheetWrap")) return;
  openSheet(`
    <div class="logo-btn" style="cursor:default"><span class="logo" style="font-size:44px" aria-label="LINK">LINK<span class="dot"></span><span class="dot b"></span></span><span class="spark big" aria-hidden="true"></span></div>
    <h1>${t("ob_title")}</h1><p class="muted">${t("ob_sub")}</p>
    <div class="field"><label for="ob_lang">${t("ob_lang")}</label><select id="ob_lang" data-action="lang">${LANGS.map(l=>`<option value="${l.code}"${S.lang===l.code?" selected":""}>${l.name}</option>`).join("")}</select></div>
    <div class="field"><label for="ob_name">${t("name")}</label><input id="ob_name" type="text" maxlength="40" value="${esc(S.profile.name)}"></div>
    <span class="label">${t("ob_brand")}</span><div class="list">${brandOptions()}</div>
    <label class="toggle" for="ob_age"><b>${t("ob_age")}</b><input class="switch" type="checkbox" id="ob_age"></label>
    <div class="banner test small">${I.flask}<p>${t("demo_banner")}</p></div>
    <button class="btn block" data-action="obStart" id="obStart" disabled>${t("ob_start")}</button>`);
  document.getElementById("ob_age").addEventListener("change", e=>{ document.getElementById("obStart").disabled = !e.target.checked; });
}

function openFilters(){
  const A=S.adv, cur=cityById(S.city).cur;
  const fmt=v=> v>=PRICE_MAX ? money(PRICE_MAX,cur)+"+" : money(v,cur);
  const tg=(id,k,label)=>`<div class="toggle"><label for="${id}"><b>${label}</b></label><input class="switch" type="checkbox" id="${id}" data-adv="${k}" ${A[k]?"checked":""}></div>`;
  openSheet(`${sheetHead(t("filters_title"))}
    <section class="fsec"><span class="label">${t("etype")}</span>
      <div class="chips wrap">${["all","public","private","org"].map(k=>`<button class="chip" data-action="advType" data-v="${k}" aria-pressed="${S.etype===k}">${t("etype_"+k)}</button>`).join("")}</div>
    </section>
    <section class="fsec"><span class="label">${t("price_range")}</span>
      <div class="price-readout" id="priceReadout" aria-live="polite">${fmt(A.min)} – ${fmt(A.max)}</div>
      <div class="baro" id="baro">
        <div class="baro-track"><div class="baro-fill" id="baroFill"></div></div>
        <label class="sr" for="pmin">${t("price_min")}</label><input type="range" id="pmin" min="0" max="${PRICE_MAX}" step="5" value="${A.min}">
        <label class="sr" for="pmax">${t("price_max")}</label><input type="range" id="pmax" min="0" max="${PRICE_MAX}" step="5" value="${A.max}">
      </div>
      <div class="baro-scale small muted"><span>${money(0,cur)}</span><span>${money(50,cur)}</span><span>${money(100,cur)}</span><span>${money(PRICE_MAX,cur)}+</span></div>
      ${tg("adv_free","free",t("free_only"))}
      ${tg("adv_unknown","unknown",t("price_unknown_incl"))}
    </section>
    <section class="fsec"><span class="label">${t("date")}</span>
      <div class="chips wrap">${["all","today","weekend","week"].map(w=>`<button class="chip" data-action="advWhen" data-v="${w}" aria-pressed="${S.when===w&&!S.day}">${t("when_"+w)}</button>`).join("")}</div>
      <div class="field"><label for="adv_day">${t("day_pick")}</label><input type="date" id="adv_day" value="${esc(S.day)}"></div>
    </section>
    <section class="fsec"><span class="label">${t("more_filters")}</span>
      ${tg("adv_verified","verified",t("verified_only"))}
      ${tg("adv_access","access",t("step_free"))}
      ${tg("adv_age21","age21",t("age21_only"))}
    </section>
    <section class="fsec"><span class="label">${t("sort_by")}</span>
      <div class="seg">${["date","pop","price"].map(k=>`<button data-action="advSort" data-v="${k}" aria-pressed="${A.sort===k}">${t("sort_"+k)}</button>`).join("")}</div>
    </section>
    <div class="grid2"><button class="btn ghost" data-action="advReset">${t("reset_filters")}</button><button class="btn" data-action="advApply" id="advApply">${t("show_n",{n:filteredEvents().length})}</button></div>`);
  const pmin=document.getElementById("pmin"), pmax=document.getElementById("pmax");
  const sync=(moved)=>{
    let a=+pmin.value, b=+pmax.value;
    if(a>b){ if(moved===pmin){ b=a; pmax.value=b; } else { a=b; pmin.value=a; } }
    S.adv.min=a; S.adv.max=b;
    const f=document.getElementById("baroFill"); f.style.left=(a/PRICE_MAX*100)+"%"; f.style.right=(100-b/PRICE_MAX*100)+"%";
    document.getElementById("priceReadout").textContent=`${fmt(a)} – ${fmt(b)}`;
    refreshCount();
  };
  pmin.addEventListener("input",()=>sync(pmin)); pmax.addEventListener("input",()=>sync(pmax)); sync(null);
  document.getElementById("adv_day").addEventListener("change", e=>{ S.day=e.target.value; if(S.day) S.when="all"; refreshCount(); document.querySelectorAll('[data-action="advWhen"]').forEach(b=>b.setAttribute("aria-pressed", String(!S.day && b.dataset.v===S.when))); });
}
function refreshCount(){ const b=document.getElementById("advApply"); if(b) b.textContent=t("show_n",{n:filteredEvents().length}); }

function groupFaces(c){
  const ms = c.members.map(id=>person(id)).filter(Boolean).slice(0,3);
  return `<button class="face-btn group-faces" data-action="convo" data-id="${c.id}" aria-label="${esc(c.title)}">${ms.map(m=>avatar(m)).join("")}</button>`;
}
function openNewGroup(){
  if(!requireVerified()) return;
  const friends = S.friends.filter(f=>f.status==="friend" && !S.blocked.includes(f.id)).map(f=>person(f.id)).filter(Boolean);
  openSheet(`${sheetHead(t("new_group"))}
    ${friends.length<2?`<div class="empty"><p>${t("group_need_friends")}</p><button class="btn" data-action="goFriends">${t("ppl_discover")}</button></div>`:`
    <div class="field"><label for="g_name">${t("group_name")}</label><input id="g_name" type="text" maxlength="40" placeholder="${esc(t("group_name_ph"))}"></div>
    <span class="label">${t("group_pick")}</span>
    <div class="list">${friends.map(p=>`<label class="ticket-type" for="gm_${p.id}"><span class="row">${avatar(p)}<b>${esc(p.name)}</b></span><input type="checkbox" class="switch" id="gm_${p.id}" data-gm="${p.id}"></label>`).join("")}</div>
    <button class="btn block" data-action="createGroup">${t("group_create")}</button>`}`);
}

/* ---------- rich messages: photos, videos, GIFs and events ---------- */
const MEDIA_MAX = 40*1024*1024;
function msgPreview(m){
  if(m.voice) return "🎙 "+t("voice_msg");
  if(m.ev){ const ev=allEvents().find(e=>e.id===m.ev); return "📅 "+(ev?ev.title:t("event_msg")); }
  if(m.gif) return "GIF";
  if(m.media) return m.mtype==="video" ? "🎬 "+t("video_msg") : m.mtype==="gif" ? "GIF" : "📷 "+t("photo_msg");
  return m.text||"";
}
function msgBody(m){
  if(m.voice) return voicePlayer(m.voice, m.dur, m.wave);
  if(m.gif){ const g=GIFS.find(x=>x.id===m.gif); return g?`<button class="media-btn" data-action="viewMedia" data-gif="${g.id}" aria-label="GIF ${esc(g.label)}"><img class="msg-media" src="${g.src}" alt="GIF ${esc(g.label)}" width="240" height="180"></button>`:"GIF"; }
  if(m.media){
    const ar = m.w&&m.h ? `style="aspect-ratio:${m.w}/${m.h}"` : "";
    return m.mtype==="video"
      ? `<video class="msg-media" data-mid="${esc(m.media)}" ${ar} controls playsinline preload="metadata" aria-label="${esc(t("video_msg"))}"></video>`
      : `<button class="media-btn" data-action="viewMedia" data-id="${esc(m.media)}" aria-label="${esc(t("photo_msg"))}"><img class="msg-media" data-mid="${esc(m.media)}" ${ar} alt="${esc(m.mtype==="gif"?"GIF":t("photo_msg"))}"></button>`;
  }
  if(m.ev) return eventMsgCard(m.ev) + (m.text?`<p class="evnote">${esc(m.text)}</p>`:"");
  return esc(m.text);
}
function eventMsgCard(id){
  const ev = allEvents().find(e=>e.id===id);
  if(!ev) return `<p class="small">${esc(t("event_gone"))}</p>`;
  const city = cityById(ev.city);
  return `<button class="ev-share" data-action="event" data-id="${ev.id}" aria-label="${esc(ev.title)}">${visual(ev)}
    <span class="ev-share-body"><b>${esc(ev.title)}</b>
    <span class="small">${I.clock}${esc(fmtDay(evDate(ev)))} · ${esc(ev.t)}</span>
    <span class="small">${I.pin}${esc(ev.venue)}, ${esc(city.name)}</span>
    <span class="row" style="justify-content:space-between"><span class="price">${esc(priceLabel(ev))}</span><span class="ev-open">${t("see_event")} →</span></span></span></button>`;
}
const MEDIA_URLS = new Map();
async function hydrateMedia(){
  for(const el of document.querySelectorAll("[data-mid]:not([src])")){
    const id = el.dataset.mid; let url = MEDIA_URLS.get(id);
    if(!url){ const blob = await VDB.get(id); if(!blob){ el.replaceWith(Object.assign(document.createElement("p"),{className:"small",textContent:t("media_missing")})); continue; } url = URL.createObjectURL(blob); MEDIA_URLS.set(id, url); }
    el.src = url;
  }
}
function curConvo(){ return S.convos.find(c=>c.id===openConvoId); }
function pushMsg(c, m){
  c.msgs.push(Object.assign({me:true, at:now()}, m));
  // move the conversation to the top of the list
  S.convos = [c].concat(S.convos.filter(x=>x!==c)); save();
  demoReply(c, m);
}
const DEMO_EV_REPLY = {fr:"Oh trop bien, j'en suis ! On se retrouve là-bas ?", en:"Oh nice, I'm in! Meet you there?", es:"¡Qué bien, me apunto! ¿Nos vemos allí?", de:"Wie cool, ich bin dabei! Treffen wir uns dort?", pt:"Que fixe, alinho! Encontramo-nos lá?", it:"Che bello, ci sto! Ci vediamo lì?"};
const DEMO_MEDIA_REPLY = {fr:"Haha j'adore 😂", en:"Haha love it 😂", es:"Jaja me encanta 😂", de:"Haha, ich liebe es 😂", pt:"Haha adoro 😂", it:"Haha lo adoro 😂"};
const DEMO_LAST = new Map();
function demoReply(c, m){
  // Demo only: fictional members answer an event or a GIF so the flow can be felt end to end.
  if(!(m.ev||m.gif||m.media)) return;
  const from = c.with || (c.members&&c.members[0]); if(!from || S.blocked.includes(from)) return;
  if(!m.ev && Date.now()-(DEMO_LAST.get(c.id)||0) < 15000) return; DEMO_LAST.set(c.id, Date.now());
  setTimeout(()=>{
    const sent = c.msgs.slice().reverse().find(x=>x.me && (x.ev||x.gif||x.media)); if(sent){ sent.react = sent.react||{me:[],them:[]}; sent.react.them = m.ev?["🔥","😍"]:["😂"]; }
    c.msgs.push({me:false, from: c.members?from:undefined, text: (m.ev?DEMO_EV_REPLY:DEMO_MEDIA_REPLY)[S.lang]||DEMO_EV_REPLY.en, at:now()}); save();
    if(S.tab==="messages" && openConvoId===c.id) render(true);
  }, 1800);
}
function openAttach(){
  const opt=(act, icon, title, desc)=>`<button class="attach-opt" data-action="${act}">${icon}<span><b>${t(title)}</b><span class="small muted">${t(desc)}</span></span></button>`;
  openSheet(`${sheetHead(t("attach"))}<div class="list">
    ${opt("attachMedia", I.image, "att_media", "att_media_d")}
    ${opt("attachGif", I.gif, "att_gif", "att_gif_d")}
    ${opt("attachEvent", I.cal, "att_event", "att_event_d")}</div>`);
}
function pickFile(accept){
  return new Promise(res=>{
    const inp=document.createElement("input"); inp.type="file"; inp.accept=accept; inp.style.display="none";
    inp.addEventListener("change", ()=>{ res(inp.files&&inp.files[0]||null); inp.remove(); });
    document.body.appendChild(inp); inp.click();
  });
}
function mediaSize(file){
  return new Promise(res=>{
    const url=URL.createObjectURL(file); const done=(w,h)=>{ URL.revokeObjectURL(url); res({w,h}); };
    if(file.type.startsWith("video/")){ const v=document.createElement("video"); v.preload="metadata"; v.onloadedmetadata=()=>done(v.videoWidth,v.videoHeight); v.onerror=()=>done(0,0); v.src=url; }
    else { const i=new Image(); i.onload=()=>done(i.naturalWidth,i.naturalHeight); i.onerror=()=>done(0,0); i.src=url; }
  });
}
async function sendFile(accept){
  const c=curConvo(); if(!c) return;
  const file = await pickFile(accept); if(!file) return;
  if(!/^(image|video)\//.test(file.type)){ toast(t("media_fail")); return; }
  if(file.size>MEDIA_MAX){ toast(t("media_too_big")); return; }
  const {w,h} = await mediaSize(file);
  if(!w && !file.type.startsWith("video/")){ toast(t("media_fail")); return; }
  const id=uid("m"); await VDB.put(id, file);
  const mtype = file.type.startsWith("video/") ? "video" : file.type==="image/gif" ? "gif" : "image";
  closeSheet(); pushMsg(c, {media:id, mtype, w, h}); render();
}
function openGifPicker(){
  openSheet(`${sheetHead(t("att_gif"))}
    <div class="gif-grid">${GIFS.map(g=>`<button class="gif-pick" data-action="sendGif" data-id="${g.id}" aria-label="GIF ${esc(g.label)}"><img src="${g.src}" alt="" width="240" height="180" loading="lazy"></button>`).join("")}</div>
    <button class="btn ghost block" data-action="gifDevice">${I.image} ${t("gif_device")}</button>
    <p class="small muted">${t("gif_note")}</p>`);
}
function eventPickList(q){
  const qq=(q||"").trim().toLowerCase();
  const evs = allEvents().filter(e=>!qq || [e.title,e.venue,cityById(e.city).name,t("cat_"+e.cat)].join(" ").toLowerCase().includes(qq))
    .sort((a,b)=> (b.city===S.city)-(a.city===S.city) || (evDate(a)-evDate(b))).slice(0,30);
  return evs.length ? evs.map(ev=>`<button class="ev-pick" data-action="sendEvent" data-id="${ev.id}">${visual(ev)}<span><b>${esc(ev.title)}</b><span class="small muted">${esc(fmtDay(evDate(ev)))} · ${esc(ev.t)} · ${esc(cityById(ev.city).name)}</span><span class="small price">${esc(priceLabel(ev))}</span></span></button>`).join("")
    : `<p class="muted">${t("no_results")}</p>`;
}
function openEventPicker(){
  openSheet(`${sheetHead(t("att_event"))}
    <div class="field"><label class="sr" for="evSearch">${t("ev_search")}</label><input id="evSearch" type="search" autocomplete="off" placeholder="${esc(t("ev_search"))}"></div>
    <div class="list" id="evPickList">${eventPickList("")}</div>`);
  document.getElementById("evSearch").addEventListener("input", e=>{ document.getElementById("evPickList").innerHTML = eventPickList(e.target.value); });
}
function openShareEvent(evId){
  if(!requireVerified()) return;
  const convos = S.convos.filter(c=>!c.with||!S.blocked.includes(c.with));
  const friends = S.friends.filter(f=>f.status==="friend" && !S.blocked.includes(f.id) && !convos.some(c=>c.with===f.id)).map(f=>person(f.id)).filter(Boolean);
  const ev = allEvents().find(e=>e.id===evId);
  openSheet(`${sheetHead(t("send_in_msg"))}
    ${ev?`<p class="muted">${esc(ev.title)}</p>`:""}
    <div class="field"><label for="shareNote">${t("share_note")}</label><input id="shareNote" type="text" maxlength="300" placeholder="${esc(t("share_note_ph"))}"></div>
    <div class="list">${convos.map(c=>{ const p=c.with?person(c.with):null;
      return `<button class="attach-opt" data-action="shareTo" data-id="${c.id}" data-ev="${evId}">${p?avatar(p):c.members?`<span class="group-faces">${c.members.map(id=>person(id)).filter(Boolean).slice(0,3).map(m=>avatar(m)).join("")}</span>`:`<span class="avatar">${I.users}</span>`}<span><b>${esc(c.title)}</b></span><span class="ev-open">${t("send")}</span></button>`; }).join("")}
    ${friends.map(p=>`<button class="attach-opt" data-action="shareToPerson" data-id="${p.id}" data-ev="${evId}">${avatar(p)}<span><b>${esc(p.name)}</b><span class="small muted">${t("friends")}</span></span><span class="ev-open">${t("send")}</span></button>`).join("")}
    ${!convos.length&&!friends.length?`<p class="muted">${t("no_convos")}</p><button class="btn block" data-action="inviteFromEvent" data-id="${evId}">${t("invite")}</button>`:""}</div>`);
}
function shareEventTo(c, evId){
  const note=((document.getElementById("shareNote")||{}).value||"").trim().slice(0,300);
  closeSheet(); pushMsg(c, {ev:evId, text:note||undefined});
  S.tab="messages"; openConvoId=c.id; save(); render(); window.scrollTo(0,0); toast(t("sent_to",{n:c.title}));
}
function viewMedia(src, alt){
  openSheet(`${sheetHead(alt)}<img class="media-full" src="${src}" alt="${esc(alt)}">`);
}

/* ---------- emoji reactions (several per person, like Snapchat) ---------- */
const QUICK_REACTS = ["❤️","😂","🔥","😍","😮","😢","👍","🎉"];
const ALL_REACTS = ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😮","😱","😢","😭","😡","🤯","🤔","🙄","😴","🤤","😏","👍","👎","👏","🙌","🙏","💪","👀","✨","🔥","💯","🎉","🎶","🍾","🥂","🍕","🌅","🌈","⚡","💀","🫶"];
const REACT_MAX = 8;
function reactsRow(m, i){
  const r = m.react; if(!r) return "";
  const counts = new Map();
  for(const e of (r.me||[])) counts.set(e, {n:(counts.get(e)||{n:0}).n+1, mine:true});
  for(const e of (r.them||[])){ const c=counts.get(e)||{n:0, mine:false}; counts.set(e, {n:c.n+1, mine:c.mine}); }
  if(!counts.size) return "";
  return `<div class="reacts">${[...counts].map(([e,c])=>`<button type="button" class="react-pill" data-action="reactToggle" data-i="${i}" data-e="${e}" aria-pressed="${c.mine}" aria-label="${esc(t("react_pill",{e, n:c.n}))}">${e}${c.n>1?`<span>${c.n}</span>`:""}</button>`).join("")}<button type="button" class="react-pill add" data-action="reactOpen" data-i="${i}" aria-label="${esc(t("react"))}">+</button></div>`;
}
function toggleReact(i, e){
  const c=curConvo(); if(!c||!c.msgs[i]) return;
  const m=c.msgs[i]; m.react = m.react || {me:[], them:[]}; m.react.me = m.react.me || [];
  const k=m.react.me.indexOf(e);
  if(k>=0) m.react.me.splice(k,1);
  else { if(m.react.me.length>=REACT_MAX){ toast(t("react_max",{n:REACT_MAX})); return; } m.react.me.push(e); }
  save(); closeReactBar(); render(true);
  const b=document.querySelector(`#msgs .bubble[data-i="${i}"]`); if(b){ b.classList.add("react-pop"); }
}
function closeReactBar(){ const b=document.getElementById("reactbar"); if(b) b.remove(); document.querySelectorAll(".bubble.reacting").forEach(x=>x.classList.remove("reacting")); }
function openReactBar(i){
  closeReactBar();
  const bubble=document.querySelector(`#msgs .bubble[data-i="${i}"]`); if(!bubble) return;
  const c=curConvo(); const mine=new Set(((c.msgs[i].react||{}).me)||[]);
  const bar=document.createElement("div"); bar.id="reactbar"; bar.setAttribute("role","toolbar"); bar.setAttribute("aria-label", t("react"));
  bar.innerHTML = QUICK_REACTS.map(e=>`<button type="button" data-action="reactToggle" data-i="${i}" data-e="${e}" aria-pressed="${mine.has(e)}" aria-label="${e}">${e}</button>`).join("")
    + `<button type="button" class="more" data-action="reactMore" data-i="${i}" aria-label="${esc(t("react_more"))}">+</button>`;
  document.body.appendChild(bar);
  bubble.classList.add("reacting");
  const r=bubble.getBoundingClientRect(), bw=bar.offsetWidth, bh=bar.offsetHeight;
  let x = bubble.classList.contains("me") ? r.right-bw : r.left; x=Math.max(8, Math.min(x, innerWidth-bw-8));
  let y = r.top-bh-8; if(y<70) y=r.bottom+8;
  bar.style.left=x+"px"; bar.style.top=y+"px";
  bar.querySelector("button").focus({preventScroll:true});
  if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
}
function openReactSheet(i){
  closeReactBar();
  const c=curConvo(); const mine=new Set(((c.msgs[i].react||{}).me)||[]);
  openSheet(`${sheetHead(t("react_more"))}<p class="small muted">${t("react_sheet_d",{n:REACT_MAX})}</p>
    <div class="emoji-grid">${ALL_REACTS.map(e=>`<button type="button" data-action="reactPick" data-i="${i}" data-e="${e}" aria-pressed="${mine.has(e)}" aria-label="${e}">${e}</button>`).join("")}</div>
    <button class="btn block" data-action="close">${t("done")}</button>`);
}
// long-press, double-tap or right-click on a bubble opens the reaction bar
(function(){
  let timer=null, sx=0, sy=0;
  const target = e => { const b=e.target.closest && e.target.closest("#msgs .bubble"); if(!b || e.target.closest("button, a, video, input, .vplayer")) return null; return b; };
  document.addEventListener("pointerdown", e=>{
    if(!e.target.closest("#reactbar") && document.getElementById("reactbar")) closeReactBar();
    const b=target(e); if(!b) return; sx=e.clientX; sy=e.clientY;
    clearTimeout(timer); timer=setTimeout(()=>{ timer=null; openReactBar(+b.dataset.i); }, 430);
  });
  const cancel=()=>{ clearTimeout(timer); timer=null; };
  document.addEventListener("pointerup", cancel); document.addEventListener("pointercancel", cancel);
  document.addEventListener("pointermove", e=>{ if(timer && Math.hypot(e.clientX-sx, e.clientY-sy)>10) cancel(); });
  document.addEventListener("dblclick", e=>{ const b=target(e); if(b){ e.preventDefault(); openReactBar(+b.dataset.i); } });
  document.addEventListener("contextmenu", e=>{ const b=target(e); if(b){ e.preventDefault(); openReactBar(+b.dataset.i); } });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeReactBar(); });
  window.addEventListener("scroll", ()=>closeReactBar(), {passive:true});
})();

/* ---------- voice (messages + Hinge-style voice prompt) ---------- */
const VOICE_MEM = new Map();
const VDB = {
  db:null,
  open(){ if(this.db) return Promise.resolve(this.db); return new Promise(res=>{ try{ const q=indexedDB.open("link-voice",1); q.onupgradeneeded=()=>q.result.createObjectStore("v"); q.onsuccess=()=>{ this.db=q.result; res(this.db); }; q.onerror=()=>res(null); }catch(e){ res(null); } }); },
  async put(id, blob){ VOICE_MEM.set(id, blob); const db=await this.open(); if(!db) return; try{ db.transaction("v","readwrite").objectStore("v").put(blob, id); }catch(e){} },
  async get(id){ if(VOICE_MEM.has(id)) return VOICE_MEM.get(id); const db=await this.open(); if(!db) return null;
    return new Promise(res=>{ try{ const r=db.transaction("v").objectStore("v").get(id); r.onsuccess=()=>{ if(r.result) VOICE_MEM.set(id, r.result); res(r.result||null); }; r.onerror=()=>res(null); }catch(e){ res(null); } }); },
  del(id){ VOICE_MEM.delete(id); this.open().then(db=>{ try{ db && db.transaction("v","readwrite").objectStore("v").delete(id); }catch(e){} }); }
};
const fmtDur = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,"0")}`;
function waveBars(wave, n=28){ const w = (wave&&wave.length?wave:Array.from({length:n},(_,i)=>.35+.5*Math.abs(Math.sin(i*1.7)))); return w.map(v=>`<i style="height:${Math.round(18+v*82)}%"></i>`).join(""); }
function voicePlayer(id, dur, wave){ return `<span class="vplayer" data-vid="${esc(id)}"><button type="button" class="vplay" data-action="vplay" data-id="${esc(id)}" aria-label="${esc(t("play"))}">${I.play}</button><span class="wave" aria-hidden="true">${waveBars(wave)}</span><span class="vdur">${fmtDur(dur||0)}</span></span>`; }
function ttsPlayer(pid, text){ return `<span class="vplayer" data-vid="tts-${pid}"><button type="button" class="vplay" data-action="ttsPlay" data-id="${pid}" aria-label="${esc(t("play"))}">${I.play}</button><span class="wave" aria-hidden="true">${waveBars(null)}</span><span class="vdur">${fmtDur(Math.max(3, text.split(/\s+/).length*0.42))}</span></span>`; }

let PLAYING = null; // {id, audio|utter, el}
function stopPlaying(){
  if(!PLAYING) return;
  try{ if(PLAYING.audio){ PLAYING.audio.pause(); URL.revokeObjectURL(PLAYING.audio.src); } if(PLAYING.utter) speechSynthesis.cancel(); }catch(e){}
  document.querySelectorAll(`[data-vid="${PLAYING.id}"]`).forEach(el=>{ el.classList.remove("on"); el.querySelector(".vplay").innerHTML=I.play; el.style.setProperty("--p","0%"); });
  PLAYING = null;
}
function markPlaying(id, on){ document.querySelectorAll(`[data-vid="${id}"]`).forEach(el=>{ el.classList.toggle("on", on); el.querySelector(".vplay").innerHTML = on?I.pause:I.play; }); }
async function playVoice(id){
  if(PLAYING && PLAYING.id===id){ stopPlaying(); return; }
  stopPlaying();
  const blob = await VDB.get(id); if(!blob){ toast(t("voice_missing")); return; }
  const audio = new Audio(URL.createObjectURL(blob)); PLAYING = {id, audio}; markPlaying(id, true);
  audio.ontimeupdate = ()=>{ const d=audio.duration; if(isFinite(d)&&d>0) document.querySelectorAll(`[data-vid="${id}"]`).forEach(el=>el.style.setProperty("--p",(audio.currentTime/d*100)+"%")); };
  audio.onended = ()=>stopPlaying();
  audio.play().catch(()=>{ stopPlaying(); toast(t("voice_missing")); });
}
function playTTS(pid){
  const id="tts-"+pid; if(PLAYING && PLAYING.id===id){ stopPlaying(); return; }
  stopPlaying();
  const p=person(pid); if(!p||!p.voiceDemo||!("speechSynthesis" in window)){ toast(t("voice_missing")); return; }
  const u = new SpeechSynthesisUtterance(loc(p.voiceDemo.text)); u.lang = LOCALE[S.lang]; u.rate = 1.02;
  PLAYING = {id, utter:u}; markPlaying(id, true);
  u.onend = u.onerror = ()=>stopPlaying();
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

let REC = null; // {target, mr, chunks, stream, start, levels, timer, analyser}
async function startRecording(target){
  stopPlaying();
  if(!navigator.mediaDevices || !window.MediaRecorder){ toast(t("mic_denied")); return; }
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:true}); }catch(e){ toast(t("mic_denied")); return; }
  const type = ["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(x=>{ try{ return MediaRecorder.isTypeSupported(x); }catch(e){ return false; } });
  const mr = new MediaRecorder(stream, type?{mimeType:type}:undefined);
  const chunks=[]; mr.ondataavailable = e=>{ if(e.data && e.data.size) chunks.push(e.data); };
  let analyser=null, buf=null; const levels=[];
  try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const src=ac.createMediaStreamSource(stream); analyser=ac.createAnalyser(); analyser.fftSize=512; src.connect(analyser); buf=new Uint8Array(analyser.fftSize); REC_AC=ac; }catch(e){}
  REC = {target, mr, chunks, stream, start:Date.now(), levels, max: target==="profile"?30:60};
  mr.start(250);
  showRecBar();
  REC.timer = setInterval(()=>{
    if(!REC) return;
    if(analyser){ analyser.getByteTimeDomainData(buf); let pk=0; for(const v of buf) pk=Math.max(pk, Math.abs(v-128)); levels.push(Math.min(1, pk/60)); }
    const el=document.getElementById("recTime"); const secs=(Date.now()-REC.start)/1000;
    if(el) el.textContent = fmtDur(secs)+" / "+fmtDur(REC.max);
    const lv=document.getElementById("recLevel"); if(lv && levels.length) lv.style.transform=`scaleX(${.2+levels[levels.length-1]*.8})`;
    if(secs>=REC.max) finishRecording(true);
  }, 100);
}
let REC_AC = null;
function showRecBar(){
  let bar=document.getElementById("recbar");
  if(!bar){ bar=document.createElement("div"); bar.id="recbar"; bar.setAttribute("role","dialog"); bar.setAttribute("aria-label", t("recording")); document.body.appendChild(bar); }
  bar.innerHTML = `<span class="rec-dot" aria-hidden="true"></span><span class="rec-label">${t("recording")}</span><span id="recTime" class="rec-time">0:00</span><span class="rec-level"><i id="recLevel"></i></span>
    <button class="btn ghost" data-action="recCancel">${t("rec_cancel")}</button><button class="btn" data-action="recDone">${REC.target==="profile"?t("rec_save"):t("rec_send")}</button>`;
}
function hideRecBar(){ const b=document.getElementById("recbar"); if(b) b.remove(); }
function finishRecording(keep){
  if(!REC) return; const r=REC; REC=null; clearInterval(r.timer); hideRecBar();
  const dur=(Date.now()-r.start)/1000;
  r.mr.onstop = async ()=>{
    r.stream.getTracks().forEach(tr=>tr.stop()); try{ REC_AC && REC_AC.close(); }catch(e){} REC_AC=null;
    if(!keep || dur<0.6 || !r.chunks.length) return;
    const blob = new Blob(r.chunks, {type: r.mr.mimeType || "audio/webm"});
    const id = uid("v"); await VDB.put(id, blob);
    const n=28, L=r.levels; const wave = Array.from({length:n},(_,i)=>{ const a=Math.floor(i*L.length/n), b=Math.max(a+1, Math.floor((i+1)*L.length/n)); return L.length? Math.max(...L.slice(a,b)) : .4; });
    if(r.target==="profile"){
      if(S.profile.voice) VDB.del(S.profile.voice.id);
      const q = (document.getElementById("vq")||{}).value || "pr_ideal_night";
      S.profile.voice = {q, id, dur:Math.round(dur*10)/10, wave}; save(); render(true); toast(t("saved"));
    } else {
      const c=S.convos.find(c=>c.id===openConvoId); if(!c) return;
      c.msgs.push({me:true, voice:id, dur:Math.round(dur*10)/10, wave, at:now()}); save(); render();
    }
  };
  try{ r.mr.stop(); }catch(e){}
}

function openCity(){
  openSheet(`${sheetHead(t("f_city"))}
    <div class="field"><label class="sr" for="citySearch">${t("search_city")}</label><input id="citySearch" type="search" placeholder="${esc(t("search_city"))}" autocomplete="off"></div>
    <div class="list" id="cityList"></div>`);
  const inp = document.getElementById("citySearch");
  const draw = ()=>{
    const q = inp.value.trim().toLowerCase();
    const base = CITIES.map(c=>({id:c.id,name:c.name,sub:c.country})).concat(S.customCities.map(n=>({id:"c:"+n,name:n,sub:t("other_cities")})));
    const list = base.filter(c=>!q||c.name.toLowerCase().includes(q));
    const exact = base.some(c=>c.name.toLowerCase()===q);
    document.getElementById("cityList").innerHTML = list.map(c=>`<button class="ticket-type" data-action="pickCity" data-v="${esc(c.id)}" aria-pressed="${S.city===c.id}"><b>${esc(c.name)}</b><span class="small muted">${esc(c.sub)}</span></button>`).join("")
      + (q && !exact ? `<button class="btn secondary" data-action="addCity" data-v="${esc(inp.value.trim())}">${esc(t("add_city",{x:inp.value.trim()}))}</button>`:"");
  };
  inp.addEventListener("input", draw); draw();
}

function openEvent(id){
  const ev = allEvents().find(e=>e.id===id); if(!ev) return;
  const city = cityById(ev.city);
  const canBuy = ev.tk!=="D" && ev.avail!=="soldout";
  openSheet(`${sheetHead(ev.title)}${visual(ev)}
    <div class="row">${availStatus(ev)}<span class="status test">${esc(t("ticketing_"+ev.tk))}</span></div>
    <p>${esc(loc(ev.desc))}</p>
    <dl class="kv">
      <dt>${t("date")}</dt><dd>${esc(fmtDay(evDate(ev)))} · ${esc(ev.t)} (${esc(city.name)})</dd>
      <dt>${t("venue")}</dt><dd>${esc(ev.venue)}${ev.area?", "+esc(ev.area):""}</dd>
      <dt>${t("f_cat")}</dt><dd>${esc(t("cat_"+ev.cat))}</dd>
      <dt>${t("from").replace("{p}","").trim()||"€"}</dt><dd class="price">${esc(priceLabel(ev))}</dd>
      <dt>${t("age_min")}</dt><dd>${ev.age}+</dd>
      <dt>${t("access")}</dt><dd>${ev.acc===true?t("access_yes"):t("access_unknown")}</dd>
      <dt>${t("organizer")}</dt><dd>${esc(ev.org)}</dd>
      <dt>${t("source")}</dt><dd>${ev.member?esc(t("type_public")):t("source_demo")}</dd>
    </dl>
    <p class="small muted">${t("going",{n:ev.going})}</p>
    ${canBuy?`<button class="btn block" data-action="buy" data-id="${ev.id}">${t("buy")} · ${esc(priceLabel(ev))}</button>`:ev.tk==="D"?`<p class="small muted">${t("no_ticketing")}</p>`:""}
    <div class="grid2"><button class="btn secondary" data-action="join" data-id="${ev.id}">${t("join")}</button><button class="btn secondary" data-action="inviteFromEvent" data-id="${ev.id}">${t("invite")}</button></div>
    <button class="btn ghost block" data-action="shareEvent" data-id="${ev.id}">${I.send} ${t("send_in_msg")}</button>`);
}

/* Hinge-style profile: photos and prompts interleaved, a vitals card, and a like button on each item
   that opens an invitation quoting what was liked. Also used to preview your own profile (id "me"). */
function openPerson(id){
  const p = id==="me" ? meAsPerson() : person(id); if(!p) return;
  const self = id==="me";
  const shared = p.interests.filter(i=>S.profile.interests.includes(i));
  const photos = p.photos||[]; const prompts = p.prompts||[];
  const likeBtn = (label)=> self ? "" : `<button class="like" data-action="like" data-id="${p.id}" data-v="${esc(label)}" aria-label="${esc(t("like_invite"))}">${LIKE_ICON}</button>`;
  const hPhoto = (i)=> photos[i] ? `<div class="h-photo${i>0?" sq":""}">${photo(photos[i], p.color, p.name[0], "", p.name)}${likeBtn(t("photos")+" "+(i+1))}</div>` : "";
  const vsrc = id==="me" ? (S.profile.voice ? {q:S.profile.voice.q, id:S.profile.voice.id, dur:S.profile.voice.dur, wave:S.profile.voice.wave} : null)
             : (p.voiceDemo ? {q:p.voiceDemo.q, tts:loc(p.voiceDemo.text)} : null);
  const hVoice = vsrc ? `<div class="voice-card"><span class="q">${I.mic.replace('<svg','<svg width="14" height="14"')} ${esc(t(vsrc.q))}</span>${vsrc.tts?ttsPlayer(p.id, vsrc.tts):voicePlayer(vsrc.id, vsrc.dur, vsrc.wave)}${vsrc.tts?`<span class="small muted">${t("tts_demo")}</span>`:""}${likeBtn(t("voice_prompt")+" — "+t(vsrc.q))}</div>` : "";
  const hPrompt = (i)=> prompts[i] ? `<div class="prompt-card"><span class="q">${esc(t(prompts[i].q))}</span><span class="a">${esc(loc(prompts[i].a))}</span>${likeBtn(t(prompts[i].q)+" — "+loc(prompts[i].a))}</div>` : "";
  const lf = (p.lookingFor||[]).map(k=>t("lf_"+k)).join(", ");
  const vitals = `<div class="vitals">
    <div class="vscroll">${p.age&&(!self)?`<span>${esc(t("years",{n:p.age}))}</span>`:""}<span>${I.pin.replace('<svg','<svg width="16" height="16"')}${esc(cityById(p.city).name)}</span><span>${esc(p.langs.map(l=>LANG_NAMES[l]||l).join(" · "))}</span></div>
    ${p.job?`<div class="vrow">${VI.job}<span>${esc(loc(p.job))}</span></div>`:""}
    ${lf?`<div class="vrow">${VI.lf}<span><b>${t("looking_for")}</b> · ${esc(lf)}</span></div>`:""}
    ${p.availability?`<div class="vrow">${VI.av}<span><b>${t("availability")}</b> · ${esc(t("av_"+p.availability))}</span></div>`:""}
    ${p.music&&p.music.length?`<div class="vrow">${VI.music}<span>${esc(p.music.join(", "))}</span></div>`:""}
    <div class="vrow">${I.shield}<span>${p.verified?t("verified_badge"):t("not_verified")}</span></div>
  </div>`;
  openSheet(`${sheetHead(p.name)}
    <div class="hinge">
      ${hPhoto(0)}${hPrompt(0)}${hVoice}${vitals}${hPhoto(1)}${hPrompt(1)}
      <div class="card"><div class="card-body"><span class="label">${t("interests")}</span><div class="tags">${p.interests.map(i=>`<span class="tag${shared.includes(i)&&!self?" match":""}">${esc(t("cat_"+i))}</span>`).join("")}</div>
        ${loc(p.bio)?`<p>${esc(loc(p.bio))}</p>`:""}
        ${p.trips.length?`<p class="small" style="color:var(--accent-3);font-weight:700">${p.trips.map(tr=>esc(t("p_trip",{x:cityById(tr.city).name}))).join(" · ")}</p>`:""}</div></div>
      ${hPhoto(2)}${hPrompt(2)}
      ${photos.slice(3).map((_,j)=>hPhoto(3+j)).join("")}
      ${!self && photos.length && photos[0].includes("unsplash")?`<p class="small muted">${t("photo_note")}</p>`:""}
    </div>
    ${self?`<button class="btn block secondary" data-action="close">${t("close")}</button>`:`
    <button class="btn block" data-action="invitePerson" data-id="${p.id}">${verified()?"":I.lock.replace('<svg','<svg width="18" height="18"')}<span class="link-word">Link</span></button>
    ${(()=>{ const st=friendState(p.id); return st==="friend" ? `<button class="btn block ghost" data-action="friendMsg" data-id="${p.id}">✓ ${t("friends_yes")} · ${t("message_btn")}</button>` : st==="pending" ? `<button class="btn block ghost" disabled>${t("friend_pending")}</button>` : `<button class="btn block secondary" data-action="addFriend" data-id="${p.id}">${t("add_friend")}</button>`; })()}
    <div class="grid2"><button class="btn ghost" data-action="block" data-id="${p.id}">${t("block")}</button><button class="btn danger" data-action="report" data-id="${p.id}">${t("report")}</button></div>`}`);
}

function requireVerified(){ if(verified()) return true; openVerify(); return false; }
let likedNote = "";
function openInvite(pid, presetEvent, liked){
  if(!requireVerified()) return;
  const p = person(pid);
  likedNote = liked || "";
  const events = allEvents().filter(e=>dayOffset(e)>=0).sort((a,b)=>(a.city===p.city?-1:1)-(b.city===p.city?-1:1));
  const priv = S.outings.filter(o=>o.type==="private");
  openSheet(`${sheetHead(t("invite_to",{n:p.name}))}
    ${likedNote?`<div class="liked-box"><b>${t("liked")}</b> : ${esc(likedNote)}</div>`:""}
    <div class="field"><label for="inv_ev">${t("invite_pick")}</label><select id="inv_ev">
      ${priv.map(o=>`<option value="${o.id}">🔒 ${esc(o.title)} · ${esc(cityById(o.city).name)}</option>`).join("")}
      ${events.map(e=>`<option value="${e.id}"${e.id===presetEvent?" selected":""}>${esc(e.title)} · ${esc(cityById(e.city).name)} · ${esc(fmtDay(evDate(e)))}</option>`).join("")}</select></div>
    <div class="field"><label for="inv_note">${t("invite_note")}</label><textarea id="inv_note" maxlength="200"></textarea></div>
    <button class="btn block" data-action="sendInvite" data-id="${pid}">${t("send_invite")}</button>`);
}
function openPickPerson(evId){
  if(!requireVerified()) return;
  const ev = allEvents().find(e=>e.id===evId);
  const list = PEOPLE.filter(p=>!S.blocked.includes(p.id)).sort((a,b)=>(a.city===ev.city?-1:1)-(b.city===ev.city?-1:1));
  openSheet(`${sheetHead(t("invite"))}<p class="muted">${esc(ev.title)}</p><div class="list">${list.map(p=>`<div class="ticket-type">${faceBtn(p)}<button class="event-card" data-action="invitePersonEv" data-id="${p.id}" data-ev="${evId}" style="flex:1;min-width:0;padding-left:10px"><b>${esc(p.name)}</b><br><span class="small muted">${esc(cityById(p.city).name)}</span></button></div>`).join("")}</div>`);
}

function openReport(pid){
  const p = person(pid);
  openSheet(`${sheetHead(t("report_title",{n:p.name}))}<div class="list">${["report_r1","report_r2","report_r3","report_r4","report_r5"].map(r=>`<button class="ticket-type" data-action="reportSend" data-id="${pid}" data-v="${r}">${t(r)}</button>`).join("")}</div>`);
}

function openVerify(){
  const step = S.verif;
  let body;
  if(step==="pending") body = `<div class="lock">${I.shield}<h3>${t("v_pending")}</h3></div>`;
  else if(step==="ok") body = `<div class="lock">${I.shield.replace('<svg','<svg style="color:var(--ok)"')}<h3>${t("v_ok")}</h3><button class="btn" data-action="close">${t("close")}</button></div>`;
  else if(step==="failed") body = `<div class="banner">${I.x.replace('<svg','<svg style="color:var(--bad)"')}<p>${t("v_failed")}</p></div><button class="btn block test" data-action="vSim">${t("v_sim")}</button><button class="btn block ghost" data-action="vManual">${t("v_manual")}</button>`;
  else if(step==="manual") body = `<div class="banner">${I.clock}<p>${t("v_manual_sent")}</p></div><button class="btn block test" data-action="vSim">${t("v_sim")}</button>`;
  else body = `<button class="btn block test" data-action="vSim">${I.flask.replace('<svg','<svg width="18" height="18"')}${t("v_sim")}</button><button class="btn block ghost" data-action="vFail">${t("v_fail")}</button>`;
  openSheet(`${sheetHead(t("v_title"))}<p>${t("v_1")}</p><p class="small muted">${t("v_2")}</p>${body}`);
}

/* Ticketing: select → hold & pay (test) → confirmed / declined. */
let TK = null, tkTimer = null;
function ticketTypes(ev){
  const types = [{k:"standard", p:ev.price}];
  if(ev.avail==="verified") types.unshift({k:"early", p:Math.round(ev.price*0.8)});
  if(ev.price>=20) types.push({k:"vip", p:Math.round(ev.price*2.2)});
  return types;
}
function openTicketing(evId){
  const ev = allEvents().find(e=>e.id===evId);
  TK = {evId, type:ticketTypes(ev)[0].k, qty:1, step:"select", holdUntil:0};
  drawTicketing();
}
function drawTicketing(){
  const ev = allEvents().find(e=>e.id===TK.evId); const cur = cityById(ev.city).cur;
  const types = ticketTypes(ev); const tt = types.find(x=>x.k===TK.type);
  const sub = tt.p*TK.qty;
  let body="";
  if(TK.step==="select"){
    body = `<span class="label">${t("choose_ticket")}</span>
      <div class="list">${types.map(x=>`<button class="ticket-type" data-action="tkType" data-v="${x.k}" aria-pressed="${TK.type===x.k}"><b>${t(x.k)}</b><span class="price">${money(x.p,cur)}</span></button>`).join("")}</div>
      <div class="row" style="justify-content:space-between"><span class="label">${t("qty")}</span><div class="stepper"><button data-action="tkQty" data-v="-1" aria-label="-">−</button><b aria-live="polite">${TK.qty}</b><button data-action="tkQty" data-v="1" aria-label="+">+</button></div></div>`;
  }
  const summary = `<dl class="kv"><dt>${t("subtotal")}</dt><dd>${money(sub,cur)}</dd><dt>${t("fees")}</dt><dd>${esc(t("fees_free",{p:money(0,cur)}))}</dd><dt>${t("taxes")}</dt><dd>${t("taxes_incl")}</dd><dt><b>${t("total")}</b></dt><dd class="price">${money(sub,cur)}</dd></dl>`;
  if(TK.step==="select") body += summary + `<button class="btn block" data-action="tkNext">${t("buy")} · ${money(sub,cur)}</button>`;
  if(TK.step==="pay") body = `<p><b>${TK.qty} × ${t(TK.type)}</b></p>${summary}<p class="status warn" id="holdLabel">${t("hold",{t:"10:00"})}</p>
      <div class="banner test small">${I.flask}<p>${t("sandbox_note")}</p></div>
      <button class="btn block test" data-action="tkPay">${t("pay_test")}</button><button class="btn block ghost" data-action="tkDecline">${t("pay_fail")}</button>`;
  if(TK.step==="declined") body = `<div class="banner">${I.x.replace('<svg','<svg style="color:var(--bad)"')}<p>${t("declined_pay")}</p></div><button class="btn block" data-action="tkRetry">${t("back")}</button>`;
  if(TK.step==="expired") body = `<div class="banner">${I.clock}<p>${t("hold_over")}</p></div><button class="btn block" data-action="tkRetry">${t("back")}</button>`;
  if(TK.step==="done") body = `<div class="lock">${I.shield.replace('<svg','<svg style="color:var(--ok)"')}<h3>${t("paid")}</h3><p class="small muted">${t("order")} ${esc(TK.orderId)}</p></div><button class="btn block" data-action="tkWallet">${t("act_tickets")}</button>`;
  openSheet(`${sheetHead(ev.title)}${body}`, ()=>{ clearInterval(tkTimer); tkTimer=null; });
}
function startHold(){
  TK.holdUntil = Date.now()+10*60*1000;
  clearInterval(tkTimer);
  tkTimer = setInterval(()=>{
    const left = TK.holdUntil-Date.now();
    const el = document.getElementById("holdLabel");
    if(left<=0){ clearInterval(tkTimer); TK.step="expired"; drawTicketing(); return; }
    if(el){ const m=Math.floor(left/60000), s=Math.floor(left/1000)%60; el.textContent = t("hold",{t:`${m}:${String(s).padStart(2,"0")}`}); }
  }, 1000);
}
function openTicket(id){
  const tk = S.tickets.find(x=>x.id===id); if(!tk) return;
  const ev = allEvents().find(e=>e.id===tk.eventId);
  const status = tk.status==="refunded" ? `<span class="status bad">${t("refunded")}</span>` : tk.status==="scanned" ? `<span class="status muted">${esc(t("already",{t:tk.scannedAt}))}</span>` : `<span class="status test">${t("ticket_test")}</span>`;
  openSheet(`${sheetHead(ev?ev.title:"")}
    <div class="ticket"><span class="watermark" aria-hidden="true">TEST</span>
      <b>${esc(t("ticket_n",{i:tk.idx,n:tk.n}))} · ${esc(t(tk.type))}</b>
      <div class="qr${tk.status==="refunded"?" revoked":""}" id="qrBox" aria-label="QR"></div>
      <code class="small" style="overflow-wrap:anywhere">${esc(tk.token.slice(0,8))}…${esc(tk.token.slice(-4))}</code>
      ${status}
      <p class="small muted">${ev?esc(fmtDay(evDate(ev)))+" · "+esc(ev.t)+" · "+esc(ev.venue):""}</p>
      <p class="small muted">${t("order")} ${esc(tk.orderId)}</p>
    </div>
    <p id="scanResult" class="small" aria-live="polite"></p>
    ${tk.status!=="refunded"?`<button class="btn block test" data-action="scan" data-id="${tk.id}">${t("scan")}</button>`:""}
    ${tk.status==="valid"?`<button class="btn block danger" data-action="refund" data-id="${tk.id}">${t("refund")}</button>`:""}`);
  const box = document.getElementById("qrBox");
  try{ if(window.QRCode){ new QRCode(box,{text:"LINK-TEST:"+tk.token, width:160, height:160, correctLevel:QRCode.CorrectLevel.M}); } else box.textContent="QR"; }catch(e){ box.textContent="QR"; }
}

function openAbout(){
  const rows = ABOUT[S.lang] || ABOUT.en;
  const cls = {ok:"ok", test:"test", bad:"bad"};
  openSheet(`${sheetHead(t("about"))}<table class="matrix"><tbody>${rows.map(([k,txt])=>`<tr><td><span class="status ${cls[k]}"></span></td><td>${esc(txt)}</td></tr>`).join("")}</tbody></table><p class="small muted">${t("storage_note")}</p>`);
}
function openExport(){
  const data = JSON.stringify({profile:S.profile, verification_status:S.verif, outings:S.outings, invitations:S.invites, conversations:S.convos, tickets:S.tickets.map(x=>({...x, token:"(hidden)"})), blocked:S.blocked, reports:S.reports, notifications:S.notif, exported_at:new Date().toISOString()}, null, 2);
  openSheet(`${sheetHead(t("export"))}<p class="small muted">${t("export_d")}</p><label class="sr" for="exportBox">JSON</label><textarea id="exportBox" readonly style="min-height:260px;font-family:ui-monospace,monospace;font-size:12px">${esc(data)}</textarea><button class="btn block" data-action="copyExport">Copy</button>`);
}
function openResetConfirm(){
  openSheet(`${sheetHead(t("reset"))}<p>${t("storage_note")}</p><div class="grid2"><button class="btn danger" data-action="resetDo">${t("reset")}</button><button class="btn ghost" data-action="close">${t("cancel")}</button></div>`);
}

/* ---------- toast ---------- */
let toastT=null;
function toast(msg){
  let el = document.getElementById("toast");
  if(!el){ el=document.createElement("div"); el.id="toast"; el.className="toast"; el.setAttribute("role","status"); document.body.appendChild(el); }
  el.textContent = msg; el.hidden=false;
  clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; }, 3200);
}

/* ---------- actions ---------- */
function ensureConvo(pid, title, eventId){
  let c = S.convos.find(c=>pid ? c.with===pid : c.eventId===eventId);
  if(!c){ c = {id:uid("c"), with:pid||null, title, eventId:eventId||null, msgs:[]}; S.convos.unshift(c); }
  return c;
}
const A = {
  home(){ closeSheet(); openConvoId=null; S.tab="explore"; save(); render(); window.scrollTo({top:0, behavior:"smooth"}); },
  tab(el){ S.tab=el.dataset.v; openConvoId=null; save(); render(); window.scrollTo(0,0); },
  set(el){ const k=el.dataset.k; let v=el.dataset.v;
    // Re-clicking an active filter chip un-selects it (back to "all"); the mode segmented control stays a radio.
    if(k!=="mode" && v!=="all" && S[k]===v && !(k==="when" && S.day)) v="all";
    S[k]=v; if(k==="when") S.day=""; save(); render(true); },
  resetFilters(){ S.cat="all"; S.when="all"; S.budget="any"; S.etype="all"; S.day=""; S.adv=DEFAULT_STATE().adv; S.mode="international"; save(); render(); },
  filters(){ openFilters(); },
  budget(el){ let k=el.dataset.v; if(k!=="any" && budgetKey()===k) k="any"; S.adv.free = k==="free"; S.adv.min=0; S.adv.max = k==="30"?30 : k==="60"?60 : PRICE_MAX; save(); render(true); },
  advType(el){ S.etype = (el.dataset.v!=="all" && S.etype===el.dataset.v) ? "all" : el.dataset.v; document.querySelectorAll('[data-action="advType"]').forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.v===S.etype))); refreshCount(); },
  advWhen(el){ S.when = (el.dataset.v!=="all" && S.when===el.dataset.v && !S.day) ? "all" : el.dataset.v; S.day=""; const d=document.getElementById("adv_day"); if(d) d.value=""; document.querySelectorAll('[data-action="advWhen"]').forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.v===S.when))); refreshCount(); },
  advSort(el){ S.adv.sort = (el.dataset.v!=="date" && S.adv.sort===el.dataset.v) ? "date" : el.dataset.v; document.querySelectorAll('[data-action="advSort"]').forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.v===S.adv.sort))); refreshCount(); },
  advReset(){ S.adv=DEFAULT_STATE().adv; S.when="all"; S.day=""; S.etype="all"; save(); openFilters(); },
  advApply(){ save(); closeSheet(); render(true); },
  city(){ openCity(); },
  pickCity(el){ S.city=el.dataset.v; if(S.mode==="international") S.mode="local"; save(); closeSheet(); render(); },
  addCity(el){ const n=el.dataset.v.slice(0,60); if(!S.customCities.includes(n)) S.customCities.push(n); S.city="c:"+n; S.mode="local"; save(); closeSheet(); render(); },
  about(){ openAbout(); },
  event(el){ openEvent(el.dataset.id); },
  person(el){ openPerson(el.dataset.id); },
  recChat(){ if(!requireVerified()) return; startRecording("chat"); },
  attach(){ if(!requireVerified()) return; openAttach(); },
  reactOpen(el){ openReactBar(+el.dataset.i); },
  reactToggle(el){ toggleReact(+el.dataset.i, el.dataset.e); },
  reactMore(el){ openReactSheet(+el.dataset.i); },
  reactPick(el){ const i=+el.dataset.i, e=el.dataset.e; const c=curConvo(); if(!c) return; const m=c.msgs[i]; m.react=m.react||{me:[],them:[]}; m.react.me=m.react.me||[];
    const k=m.react.me.indexOf(e); if(k>=0) m.react.me.splice(k,1); else { if(m.react.me.length>=REACT_MAX){ toast(t("react_max",{n:REACT_MAX})); return; } m.react.me.push(e); }
    el.setAttribute("aria-pressed", String(k<0)); save(); },
  attachMedia(){ sendFile("image/*,video/*"); },
  attachGif(){ openGifPicker(); },
  gifDevice(){ sendFile("image/gif"); },
  attachEvent(){ openEventPicker(); },
  sendGif(el){ const c=curConvo(); if(!c) return; closeSheet(); pushMsg(c, {gif:el.dataset.id}); render(); },
  sendEvent(el){ const c=curConvo(); if(!c) return; closeSheet(); pushMsg(c, {ev:el.dataset.id}); render(); },
  shareEvent(el){ openShareEvent(el.dataset.id); },
  shareTo(el){ const c=S.convos.find(x=>x.id===el.dataset.id); if(c) shareEventTo(c, el.dataset.ev); },
  shareToPerson(el){ const p=person(el.dataset.id); if(p) shareEventTo(ensureConvo(p.id, p.name), el.dataset.ev); },
  viewMedia(el){ if(el.dataset.gif){ const g=GIFS.find(x=>x.id===el.dataset.gif); if(g) viewMedia(g.src, "GIF "+g.label); return; } const img=el.querySelector("img"); if(img&&img.src) viewMedia(img.src, t("photo_msg")); },
  recProfile(){ startRecording("profile"); },
  recDone(){ finishRecording(true); },
  recCancel(){ finishRecording(false); },
  vplay(el){ playVoice(el.dataset.id); },
  ttsPlay(el){ playTTS(el.dataset.id); },
  voiceDel(){ if(S.profile.voice){ VDB.del(S.profile.voice.id); S.profile.voice=null; save(); render(true); } },
  peopleView(el){ S.peopleView=el.dataset.v; save(); render(); },
  goFriends(){ closeSheet(); S.tab="people"; S.peopleView="discover"; save(); render(); },
  addFriend(el){
    if(!requireVerified()) return;
    const id=el.dataset.id, p=person(id);
    if(!S.friends.some(f=>f.id===id)) S.friends.push({id, status:"pending", since:new Date().toISOString()});
    save(); openPerson(id); toast(t("friend_pending"));
    // Demo: fictional members accept after a moment (clearly a simulation)
    setTimeout(()=>{ const f=S.friends.find(x=>x.id===id); if(f && f.status==="pending"){ f.status="friend"; save(); render(true); toast(t("friend_accepted",{n:p.name})); } }, 1600);
  },
  friendMsg(el){
    if(!requireVerified()) return;
    const p=person(el.dataset.id); const c=ensureConvo(p.id, p.name);
    closeSheet(); S.tab="messages"; openConvoId=c.id; save(); render(); window.scrollTo(0,0);
  },
  newGroup(){ openNewGroup(); },
  createGroup(){
    const ids=[...document.querySelectorAll('[data-gm]')].filter(x=>x.checked).map(x=>x.dataset.gm);
    if(ids.length<2){ toast(t("group_pick")); return; }
    const name=(document.getElementById("g_name").value.trim()) || ids.map(id=>person(id).name).join(", ");
    const c={id:uid("g"), with:null, title:name.slice(0,40), eventId:null, members:ids, msgs:[]};
    S.convos.unshift(c); closeSheet(); S.tab="messages"; openConvoId=c.id; save(); render(); toast(t("group_created"));
  },
  peopleAll(el){ S.peopleAll = el.dataset.v==="1"; save(); render(true); },
  close(){ closeSheet(); render(true); },
  verify(){ openVerify(); },
  vSim(){ S.verif="pending"; save(); openVerify(); setTimeout(()=>{ S.verif="ok"; save(); openVerify(); render(true); toast(t("v_ok")); }, 1800); },
  vFail(){ S.verif="pending"; save(); openVerify(); setTimeout(()=>{ S.verif="failed"; save(); openVerify(); render(true); }, 1500); },
  vManual(){ S.verif="manual"; save(); openVerify(); render(true); },
  buy(el){ openTicketing(el.dataset.id); },
  tkType(el){ TK.type=el.dataset.v; drawTicketing(); },
  tkQty(el){ TK.qty=Math.max(1,Math.min(8,TK.qty+Number(el.dataset.v))); drawTicketing(); },
  tkNext(){ TK.step="pay"; drawTicketing(); startHold(); },
  tkDecline(){ clearInterval(tkTimer); TK.step="declined"; drawTicketing(); },
  tkRetry(){ TK.step="select"; drawTicketing(); },
  tkPay(){
    clearInterval(tkTimer);
    const ev = allEvents().find(e=>e.id===TK.evId); const tt = ticketTypes(ev).find(x=>x.k===TK.type);
    const orderId = "LNK-TEST-"+token().slice(0,6).toUpperCase();
    for(let i=1;i<=TK.qty;i++) S.tickets.unshift({id:uid("t"), orderId, eventId:ev.id, type:TK.type, idx:i, n:TK.qty, token:token(), status:"valid", scannedAt:null, price:tt.p, cur:cityById(ev.city).cur, created:new Date().toISOString()});
    TK.step="done"; TK.orderId=orderId; save(); drawTicketing();
  },
  tkWallet(){ closeSheet(); S.tab="activity"; S.actTab="tickets"; save(); render(); },
  ticket(el){ openTicket(el.dataset.id); },
  scan(el){
    const tk=S.tickets.find(x=>x.id===el.dataset.id); const out=document.getElementById("scanResult");
    if(tk.status==="valid"){ tk.status="scanned"; tk.scannedAt=now(); save(); openTicket(tk.id); document.getElementById("scanResult").innerHTML=`<span class="status ok">${esc(t("scanned_ok",{t:tk.scannedAt}))}</span>`; }
    else if(out){ out.innerHTML=`<span class="status bad">${esc(t("already",{t:tk.scannedAt}))}</span>`; }
    render(true);
  },
  refund(el){ const tk=S.tickets.find(x=>x.id===el.dataset.id); tk.status="refunded"; save(); openTicket(tk.id); render(true); toast(t("refunded")); },
  join(el){
    if(!requireVerified()) return;
    const ev = allEvents().find(e=>e.id===el.dataset.id);
    if(!S.joined.includes(ev.id)) S.joined.push(ev.id);
    ensureConvo(null, t("msg_group",{t:ev.title}), ev.id);
    save(); closeSheet(); S.tab="messages"; openConvoId = S.convos.find(c=>c.eventId===ev.id).id; render();
  },
  inviteFromEvent(el){ openPickPerson(el.dataset.id); },
  invitePersonEv(el){ openInvite(el.dataset.id, el.dataset.ev); },
  invitePerson(el){ openInvite(el.dataset.id); },
  sendInvite(el){
    const today = new Date().toDateString();
    const sentToday = S.invites.filter(i=>i.dir==="out" && new Date(i.created).toDateString()===today).length;
    if(sentToday>=10){ toast(t("invite_limit")); return; }
    const pid=el.dataset.id;
    const typed = document.getElementById("inv_note").value.trim();
    const note = likedNote ? `${t("liked")} « ${likedNote} »${typed?" — "+typed:""}` : typed;
    S.invites.unshift({id:uid("i"), dir:"out", to:pid, event:document.getElementById("inv_ev").value, note, status:"pending", d:3, created:new Date().toISOString()});
    likedNote = "";
    save(); closeSheet(); render(true); toast(t("invite_sent",{n:person(pid).name}));
  },
  inviteAccept(el){
    if(!requireVerified()) return;
    const inv=S.invites.find(i=>i.id===el.dataset.id); inv.status="accepted";
    const p=person(inv.from); const c=ensureConvo(p.id, p.name);
    if(!c.msgs.length) c.msgs.push({me:false, text:loc(inv.note), at:now()});
    const fr=S.friends.find(f=>f.id===p.id); if(fr){ fr.status="friend"; fr.match=true; } else S.friends.push({id:p.id, status:"friend", match:true, since:new Date().toISOString()});
    save(); render(true); toast(t("accepted"));
  },
  inviteDecline(el){ S.invites.find(i=>i.id===el.dataset.id).status="declined"; save(); render(true); },
  inviteCancel(el){ S.invites.find(i=>i.id===el.dataset.id).status="cancelled"; save(); render(true); },
  invDir(el){ S.inviteDir=el.dataset.v; save(); render(true); },
  actTab(el){ S.actTab=el.dataset.v; save(); render(true); },
  convo(el){ openConvoId=el.dataset.id; render(); },
  convoBack(){ openConvoId=null; render(); },
  block(el){ const p=person(el.dataset.id); if(!S.blocked.includes(p.id)) S.blocked.push(p.id); save(); closeSheet(); render(true); toast(t("blocked",{n:p.name})); },
  unblock(el){ S.blocked=S.blocked.filter(x=>x!==el.dataset.id); save(); render(true); },
  report(el){ openReport(el.dataset.id); },
  reportSend(el){ S.reports.push({pid:el.dataset.id, reason:el.dataset.v, at:new Date().toISOString()}); save(); closeSheet(); render(true); toast(t("report_sent")); },
  ctype(el){ createType=el.dataset.v; render(true); },
  outingDelete(el){ S.outings=S.outings.filter(o=>o.id!==el.dataset.id); save(); render(true); },
  modApprove(el){ S.outings.find(o=>o.id===el.dataset.id).status="approved"; save(); render(true); toast(t("approved")); },
  modReject(el){ S.outings.find(o=>o.id===el.dataset.id).status="rejected"; save(); render(true); },
  pLang(el){ toggleIn(S.profile.langs, el.dataset.v); save(); render(true); },
  pInt(el){ toggleIn(S.profile.interests, el.dataset.v); save(); render(true); },
  pMusic(el){ toggleIn(S.profile.music, el.dataset.v); save(); render(true); },
  saveProfile(){
    const g = id=>document.getElementById(id);
    S.profile.name=g("p_name").value.trim().slice(0,40); S.profile.bio=g("p_bio").value.trim(); S.profile.city=g("p_city").value;
    S.profile.job=g("p_job").value.trim().slice(0,60);
    S.profile.prompts = S.profile.prompts.map((_,i)=>({q:g("pq_"+i).value, a:g("pa_"+i).value.trim().slice(0,150)}));
    save(); render(true); toast(t("saved"));
  },
  preview(){ A.saveProfile(); openPerson("me"); },
  inviteOpen(el){
    const inv = S.invites.find(i=>i.id===el.dataset.id); if(!inv) return;
    if(!requireVerified()) return;
    const p = person(inv.dir==="in"?inv.from:inv.to); if(!p) return;
    const c = ensureConvo(p.id, p.name);
    const note = typeof inv.note==="string" ? inv.note : loc(inv.note);
    if(!c.msgs.length && note) c.msgs.push({me: inv.dir==="out", text: note, at: now()});
    closeSheet(); S.tab="messages"; openConvoId=c.id; save(); render(); window.scrollTo(0,0);
  },
  signOut(){ S.onboarded=false; save(); closeSheet(); S.tab="explore"; openConvoId=null; render(); window.scrollTo(0,0); },
  like(el){ openInvite(el.dataset.id, null, el.dataset.v); },
  pLf(el){ toggleIn(S.profile.lookingFor, el.dataset.v); save(); render(true); },
  pAv(el){ S.profile.availability=el.dataset.v; save(); render(true); },
  photoDel(el){ S.profile.photos.splice(Number(el.dataset.v),1); save(); render(true); },
  tripAdd(){ S.profile.trips.push({city:document.getElementById("tr_city").value, from:document.getElementById("tr_from").value, to:document.getElementById("tr_to").value}); save(); render(true); toast(t("saved")); },
  tripDel(el){ S.profile.trips.splice(Number(el.dataset.v),1); save(); render(true); },
  vis(el){ S.profile.visibility=el.dataset.v; save(); render(true); },
  brand(el){ S.brand=el.dataset.v; save(); applyLook(); document.querySelectorAll('[data-action="brand"]').forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===S.brand)); if(S.onboarded) render(true); },
  theme(el){ S.theme=el.dataset.v; save(); render(true); },
  export(){ openExport(); },
  copyExport(){ const ta=document.getElementById("exportBox"); navigator.clipboard.writeText(ta.value).then(()=>toast("✓")).catch(()=>{ ta.select(); }); },
  resetAsk(){ openResetConfirm(); },
  resetDo(){ const keep={lang:S.lang, brand:S.brand}; S=Object.assign(DEFAULT_STATE(), keep, {onboarded:true}); save(); closeSheet(); render(); toast(t("reset_done")); },
  obStart(){ S.profile.name=document.getElementById("ob_name").value.trim().slice(0,40); S.onboarded=true; save(); closeSheet(); render(); }
};
/* Resize to max 900 px JPEG before keeping it on this device (localStorage space is small). */
function addPhoto(file){
  if(!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{
      const k = Math.min(1, 900/Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      const url = c.toDataURL("image/jpeg", 0.78);
      S.profile.photos.push(url);
      try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){ S.profile.photos.pop(); toast("Storage full"); return; }
      render(true);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function toggleIn(arr, v){ const i=arr.indexOf(v); if(i>=0) arr.splice(i,1); else arr.push(v); }

document.addEventListener("click", e=>{
  const el = e.target.closest("[data-action]");
  if(!el || el.tagName==="SELECT" || (el.tagName==="INPUT" && el.type==="checkbox")) return;
  const fn = A[el.dataset.action]; if(fn){ e.preventDefault(); fn(el); }
});
document.addEventListener("change", e=>{
  const el = e.target;
  if(el.dataset.action==="lang"){ S.lang=el.value; save(); const ob=!S.onboarded; if(ob){ closeSheet(); } render(true); if(ob) openOnboarding(); return; }
  if(el.dataset.adv){ S.adv[el.dataset.adv]=el.checked; refreshCount(); return; }
  if(el.dataset.action==="toggle"){
    const map = {tg_age:()=>S.profile.showAge=el.checked, tg_dating:()=>S.profile.dating=el.checked,
      tg_n_invites:()=>S.notif.invites=el.checked, tg_n_messages:()=>S.notif.messages=el.checked, tg_n_events:()=>S.notif.events=el.checked,
      tg_n_tickets:()=>S.notif.tickets=el.checked, tg_n_marketing:()=>S.notif.marketing=el.checked};
    if(map[el.id]){ map[el.id](); save(); }
  }
  if(el.id==="photoInput" && el.files && el.files[0]) addPhoto(el.files[0]);
  if(el.id==="vq" && S.profile.voice){ S.profile.voice.q=el.value; save(); }
  if(el.id==="q_from"||el.id==="q_to"){ S.notif[el.id==="q_from"?"quietFrom":"quietTo"]=el.value; save(); render(true); }
});
document.addEventListener("submit", e=>{
  e.preventDefault();
  if(e.target.id==="createForm"){
    const g = id=>document.getElementById(id).value.trim();
    const o = {id:uid("o"), type:createType, title:g("c_title"), cat:g("c_cat"), city:g("c_city"), date:g("c_date"), time:g("c_time"), place:g("c_place"), cap:Math.max(2,Number(g("c_cap"))||6), desc:g("c_desc"), rules:g("c_rules"), status:createType==="public"?"pending":"private", created:new Date().toISOString()};
    if(!o.title||!o.city||!o.date||!o.time){ toast(t("form_missing")); return; }
    S.outings.unshift(o); save(); S.tab="activity"; S.actTab="outings"; render(); window.scrollTo(0,0);
    toast(createType==="public"?t("created_public"):t("created_private"));
  }
  if(e.target.id==="composer"){
    const inp=document.getElementById("msgInput"); const txt=inp.value.trim(); if(!txt) return;
    const c=S.convos.find(c=>c.id===openConvoId); pushMsg(c, {text:txt}); render(); document.getElementById("msgInput").focus();
  }
});
// A photo that cannot load (offline, blocked host) is removed so the coloured tile with the initial shows.
document.addEventListener("error", e=>{ if(e.target && e.target.tagName==="IMG" && e.target.parentElement && e.target.parentElement.classList.contains("ph")) e.target.remove(); }, true);
window.addEventListener("online", ()=>render(true));
window.addEventListener("offline", ()=>render(true));
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && S.onboarded) closeSheet(); });

render();
})();
