/* LINK prototype — application logic (vanilla JS, no build step).
   State lives in memory and is mirrored to localStorage on this device only. */
(function(){
"use strict";

/* ---------- state ---------- */
const STORE_KEY = "link-proto-v1";
const DEFAULT_STATE = () => ({
  v:1, onboarded:false, lang:guessLang(), brand:"fiesta", theme:"system",
  tab:"explore", city:"paris", mode:"local", cat:"all", when:"all", budget:"any",
  customCities:[], peopleAll:false, actTab:"invites", inviteDir:"in",
  profile:{name:"", bio:"", city:"paris", langs:["fr"], interests:["concerts","rooftops"], music:["House"], trips:[], dating:false, showAge:true, visibility:"public"},
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
    if(raw){ const s = JSON.parse(raw); if(s && s.v===1) return Object.assign(DEFAULT_STATE(), s); }
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
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
};

/* ---------- derived data ---------- */
function allEvents(){
  const member = S.outings.filter(o=>o.type==="public" && o.status==="approved").map(o=>({
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
  if(S.budget==="free") list = list.filter(e=>e.price===0);
  if(S.budget==="30") list = list.filter(e=>e.price!==null && e.price<=30);
  if(S.budget==="60") list = list.filter(e=>e.price!==null && e.price<=60);
  if(S.mode==="personal"){
    list = list.map(e=>({e, sc:scoreEvent(e)})).filter(x=>x.sc.s>0).sort((a,b)=>b.sc.s-a.sc.s).map(x=>Object.assign({}, x.e, {_why:x.sc.reasons}));
  } else {
    list.sort((a,b)=>dayOffset(a)-dayOffset(b));
  }
  return list;
}
function person(id){ return PEOPLE.find(p=>p.id===id); }
function visiblePeople(){
  let list = PEOPLE.filter(p=>!S.blocked.includes(p.id));
  if(!S.peopleAll) list = list.filter(p=>p.city===S.city || p.trips.some(tr=>tr.city===S.city));
  return list.map(p=>({p, shared:p.interests.filter(i=>S.profile.interests.includes(i))})).sort((a,b)=>b.shared.length-a.shared.length);
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
      <div class="logo" aria-label="LINK">LINK<span class="dot" aria-hidden="true"></span><span class="dot b" aria-hidden="true"></span></div>
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
  <div class="chips" role="group" aria-label="${t("f_cat")}">${chip("cat","all",t("cat_all"),S.cat==="all")}${CATEGORIES.map(c=>chip("cat",c,t("cat_"+c),S.cat===c)).join("")}</div>
  <div class="chips" role="group" aria-label="${t("date")}">${["all","today","weekend","week"].map(w=>chip("when",w,t("when_"+w),S.when===w)).join("")}
    <span style="width:1px;background:var(--line);flex:none"></span>
    ${chip("budget","any",t("budget_any"),S.budget==="any")}${chip("budget","free",t("budget_free"),S.budget==="free")}${chip("budget","30",t("budget_30",{p:money(30,cur)}),S.budget==="30")}${chip("budget","60",t("budget_60",{p:money(60,cur)}),S.budget==="60")}</div>
  <div class="list">${list.length? list.map(eventCard).join("") : `
    <div class="empty"><h3>${t("no_results")}</h3><p class="muted">${t("no_results_sub")}</p>
    <div class="row" style="justify-content:center"><button class="btn" data-action="tab" data-v="create">${t("create_first")}</button><button class="btn ghost" data-action="resetFilters">${t("reset_filters")}</button></div></div>`}</div>`;
}

function avatar(p, lg){ return `<div class="avatar${lg?" lg":""}" style="background:linear-gradient(135deg, ${p.color}, ${p.color}aa)" aria-hidden="true">${esc(p.name[0])}</div>`; }
function renderPeople(){
  const list = visiblePeople();
  const city = cityById(S.city);
  return `
  <div class="section-head"><h1>${t("tab_people")}</h1></div>
  <p class="muted">${t("people_sub")}</p>
  <div class="seg" role="group"><button data-action="peopleAll" data-v="0" aria-pressed="${!S.peopleAll}">${esc(t("people_filter_city",{c:city.name}))}</button><button data-action="peopleAll" data-v="1" aria-pressed="${S.peopleAll}">${t("people_all")}</button></div>
  ${verified()?"":lockBanner()}
  <div class="list">${list.length? list.map(({p,shared})=>`
    <article class="card"><button class="event-card person" data-action="person" data-id="${p.id}">
      ${avatar(p)}
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1">
        <div class="row" style="justify-content:space-between"><h3>${esc(p.name)}, ${esc(t("years",{n:p.age}))}</h3>${p.verified?`<span class="status ok" title="${t("verified_badge")}">${I.shield.replace('<svg','<svg width="13" height="13"')}</span>`:""}</div>
        <p class="small muted">${esc(cityById(p.city).name)} · ${p.langs.map(l=>LANG_NAMES[l]||l).join(", ")}</p>
        <p class="small">${esc(loc(p.bio))}</p>
        <div class="tags">${p.interests.map(i=>`<span class="tag${shared.includes(i)?" match":""}">${esc(t("cat_"+i))}</span>`).join("")}</div>
        ${p.trips.filter(tr=>tr.city===S.city && p.city!==S.city).map(tr=>`<p class="small" style="color:var(--accent-3);font-weight:700">${esc(t("p_trip",{x:cityById(tr.city).name}))}</p>`).join("")}
      </div></button></article>`).join("") : `<div class="empty"><h3>${t("no_results")}</h3><button class="btn ghost" data-action="peopleAll" data-v="1">${t("people_all")}</button></div>`}</div>`;
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
  return `<article class="card"><div class="person">${avatar(p)}<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
    <div class="row" style="justify-content:space-between"><h3>${esc(p.name)}</h3><span class="status ${st[0]}">${t(st[1])}</span></div>
    <p class="small"><b>${esc(ev?ev.title:"—")}</b>${ev?` · ${esc(fmtDay(evDate(ev)))} · ${esc(cityById(ev.city).name)}`:""}</p>
    ${inv.note?`<p class="small muted">« ${esc(typeof inv.note==="string"?inv.note:loc(inv.note))} »</p>`:""}
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
      return `<div class="row"><button class="iconbtn" data-action="convoBack" aria-label="${t("back")}">${I.chev.replace('<svg','<svg style="transform:rotate(90deg)"')}</button>${p?avatar(p):""}<div style="flex:1;min-width:0"><h2>${esc(c.title)}</h2>${p?`<p class="small muted">${p.verified?t("verified_badge"):t("not_verified")}</p>`:""}</div></div>
        <div class="banner small">${I.shield.replace('<svg','<svg style="color:var(--ok)"')}<p>${t("msg_safety")}</p></div>
        <div class="msgs" id="msgs">${c.msgs.map(m=>`<div class="bubble${m.me?" me":""}">${esc(m.text)}<time>${esc(m.me?t("you"):(p?p.name:""))} · ${esc(m.at)}</time></div>`).join("")}</div>
        <form class="composer" id="composer"><label class="sr" for="msgInput">${t("msg_placeholder")}</label><input id="msgInput" type="text" maxlength="1000" autocomplete="off" placeholder="${esc(t("msg_placeholder"))}"><button class="btn" type="submit">${t("send")}</button></form>`;
    }
    openConvoId=null;
  }
  return `<div class="section-head"><h1>${t("tab_messages")}</h1></div>
    <div class="list">${S.convos.length?S.convos.filter(c=>!c.with||!S.blocked.includes(c.with)).map(c=>{
      const p=c.with?person(c.with):null; const last=c.msgs[c.msgs.length-1];
      return `<article class="card"><button class="event-card person" data-action="convo" data-id="${c.id}">${p?avatar(p):`<div class="avatar" style="background:var(--accent-3)">${I.users.replace('<svg','<svg width="26" height="26"')}</div>`}
        <div style="flex:1;min-width:0"><h3>${esc(c.title)}</h3><p class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last?esc(last.text):""}</p></div></button></article>`;}).join(""):`<div class="empty"><h3>${t("msg_empty")}</h3><p class="muted">${t("msg_empty_sub")}</p></div>`}</div>`;
}

function toggleRow(id, label, desc, checked){
  return `<div class="toggle"><label for="${id}" style="display:flex;flex-direction:column;gap:2px;flex:1"><b>${label}</b>${desc?`<span class="small muted">${desc}</span>`:""}</label><input class="switch" type="checkbox" id="${id}" data-action="toggle" ${checked?"checked":""}></div>`;
}
function brandOptions(){
  const B = [
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
  const me = {name:P.name||"?", color:"#FF5A4E"};
  const pendingMod = S.outings.filter(o=>o.type==="public"&&o.status==="pending");
  return `
  <div class="row" style="gap:14px">${avatar(me,true)}<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px"><h1>${esc(P.name||t("tab_profile"))}</h1><span class="status ${vs[0]}">${t("verif_status")} : ${t(vs[1])}</span></div></div>
  ${S.verif!=="ok"?`<button class="btn block" data-action="verify">${I.shield.replace('<svg','<svg width="20" height="20"')}${t("verify_now")}</button>`:""}

  <section class="card"><div class="card-body">
    <h2>${t("edit_profile")}</h2>
    <div class="field"><label for="p_name">${t("name")}</label><input id="p_name" type="text" maxlength="40" value="${esc(P.name)}"></div>
    <div class="field"><label for="p_bio">${t("bio")}</label><textarea id="p_bio" maxlength="300">${esc(P.bio)}</textarea></div>
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
    ${S.reports.length?`<p class="small"><b>${t("report")}</b> : ${S.reports.map(r=>esc((person(r.pid)||{}).name)+" — "+esc(t(r.reason))).join(" · ")}</p>`:""}
  </div></section>

  <section class="card"><div class="card-body">
    <h2>${t("privacy")}</h2><p class="small muted">${t("storage_note")}</p>
    ${S.blocked.map(id=>{const p=person(id);return p?`<div class="row" style="justify-content:space-between"><span>${esc(p.name)}</span><button class="btn ghost" data-action="unblock" data-id="${id}">${t("unblock")}</button></div>`:"";}).join("")}
    <div class="row"><button class="btn secondary" data-action="export">${t("export")}</button><button class="btn secondary" data-action="about">${t("about")}</button><button class="btn danger" data-action="resetAsk">${t("reset")}</button></div>
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
  const m = document.getElementById("msgs"); if(m) m.lastElementChild && m.lastElementChild.scrollIntoView({block:"end"});
  if(!S.onboarded) openOnboarding();
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
  const w = document.getElementById("sheetWrap");
  if(w){ w.remove(); document.body.style.overflow=""; }
  if(sheetCleanup){ const c=sheetCleanup; sheetCleanup=null; c(); }
}
function sheetHead(title){ return `<div class="sheet-head"><h2>${esc(title)}</h2><button class="iconbtn" data-action="close" aria-label="${t("close")}">${I.x}</button></div>`; }

function openOnboarding(){
  if(document.getElementById("sheetWrap")) return;
  openSheet(`
    <div class="logo" style="font-size:44px">LINK<span class="dot"></span><span class="dot b"></span></div>
    <h1>${t("ob_title")}</h1><p class="muted">${t("ob_sub")}</p>
    <div class="field"><label for="ob_lang">${t("ob_lang")}</label><select id="ob_lang" data-action="lang">${LANGS.map(l=>`<option value="${l.code}"${S.lang===l.code?" selected":""}>${l.name}</option>`).join("")}</select></div>
    <div class="field"><label for="ob_name">${t("name")}</label><input id="ob_name" type="text" maxlength="40" value="${esc(S.profile.name)}"></div>
    <span class="label">${t("ob_brand")}</span><div class="list">${brandOptions()}</div>
    <label class="toggle" for="ob_age"><b>${t("ob_age")}</b><input class="switch" type="checkbox" id="ob_age"></label>
    <div class="banner test small">${I.flask}<p>${t("demo_banner")}</p></div>
    <button class="btn block" data-action="obStart" id="obStart" disabled>${t("ob_start")}</button>`);
  document.getElementById("ob_age").addEventListener("change", e=>{ document.getElementById("obStart").disabled = !e.target.checked; });
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
    <div class="grid2"><button class="btn secondary" data-action="join" data-id="${ev.id}">${t("join")}</button><button class="btn secondary" data-action="inviteFromEvent" data-id="${ev.id}">${t("invite")}</button></div>`);
}

function openPerson(id){
  const p = person(id); if(!p) return;
  const shared = p.interests.filter(i=>S.profile.interests.includes(i));
  openSheet(`${sheetHead(p.name)}
    <div class="row" style="gap:14px">${avatar(p,true)}<div style="display:flex;flex-direction:column;gap:4px"><h2>${esc(p.name)}, ${esc(t("years",{n:p.age}))}</h2><p class="muted">${esc(cityById(p.city).name)}</p>${p.verified?`<span class="status ok">${t("verified_badge")}</span>`:`<span class="status muted">${t("not_verified")}</span>`}</div></div>
    <p>${esc(loc(p.bio))}</p>
    <div class="field"><span class="label">${t("interests")}</span><div class="tags">${p.interests.map(i=>`<span class="tag${shared.includes(i)?" match":""}">${esc(t("cat_"+i))}</span>`).join("")}</div></div>
    <div class="field"><span class="label">${t("music")}</span><div class="tags">${p.music.map(m=>`<span class="tag">${esc(m)}</span>`).join("")}</div></div>
    <div class="field"><span class="label">${t("languages")}</span><p>${p.langs.map(l=>LANG_NAMES[l]||l).join(", ")}</p></div>
    ${p.trips.length?`<div class="field"><span class="label">${t("trips")}</span><p>${p.trips.map(tr=>esc(cityById(tr.city).name)).join(", ")}</p></div>`:""}
    <button class="btn block" data-action="invitePerson" data-id="${p.id}">${verified()?"":I.lock.replace('<svg','<svg width="18" height="18"')}${esc(t("invite_to",{n:p.name}))}</button>
    <div class="grid2"><button class="btn ghost" data-action="block" data-id="${p.id}">${t("block")}</button><button class="btn danger" data-action="report" data-id="${p.id}">${t("report")}</button></div>`);
}

function requireVerified(){ if(verified()) return true; openVerify(); return false; }
function openInvite(pid, presetEvent){
  if(!requireVerified()) return;
  const p = person(pid);
  const events = allEvents().filter(e=>dayOffset(e)>=0).sort((a,b)=>(a.city===p.city?-1:1)-(b.city===p.city?-1:1));
  const priv = S.outings.filter(o=>o.type==="private");
  openSheet(`${sheetHead(t("invite_to",{n:p.name}))}
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
  openSheet(`${sheetHead(t("invite"))}<p class="muted">${esc(ev.title)}</p><div class="list">${list.map(p=>`<button class="ticket-type" data-action="invitePersonEv" data-id="${p.id}" data-ev="${evId}"><span class="row">${avatar(p)}<span><b>${esc(p.name)}</b><br><span class="small muted">${esc(cityById(p.city).name)}</span></span></span></button>`).join("")}</div>`);
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
  tab(el){ S.tab=el.dataset.v; openConvoId=null; save(); render(); window.scrollTo(0,0); },
  set(el){ S[el.dataset.k]=el.dataset.v; save(); render(true); },
  resetFilters(){ S.cat="all"; S.when="all"; S.budget="any"; S.mode="international"; save(); render(); },
  city(){ openCity(); },
  pickCity(el){ S.city=el.dataset.v; if(S.mode==="international") S.mode="local"; save(); closeSheet(); render(); },
  addCity(el){ const n=el.dataset.v.slice(0,60); if(!S.customCities.includes(n)) S.customCities.push(n); S.city="c:"+n; S.mode="local"; save(); closeSheet(); render(); },
  about(){ openAbout(); },
  event(el){ openEvent(el.dataset.id); },
  person(el){ openPerson(el.dataset.id); },
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
    S.invites.unshift({id:uid("i"), dir:"out", to:pid, event:document.getElementById("inv_ev").value, note:document.getElementById("inv_note").value.trim(), status:"pending", d:3, created:new Date().toISOString()});
    save(); closeSheet(); render(true); toast(t("invite_sent",{n:person(pid).name}));
  },
  inviteAccept(el){
    if(!requireVerified()) return;
    const inv=S.invites.find(i=>i.id===el.dataset.id); inv.status="accepted";
    const p=person(inv.from); const c=ensureConvo(p.id, p.name);
    if(!c.msgs.length) c.msgs.push({me:false, text:loc(inv.note), at:now()});
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
  saveProfile(){ S.profile.name=document.getElementById("p_name").value.trim().slice(0,40); S.profile.bio=document.getElementById("p_bio").value.trim(); S.profile.city=document.getElementById("p_city").value; save(); render(true); toast(t("saved")); },
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
function toggleIn(arr, v){ const i=arr.indexOf(v); if(i>=0) arr.splice(i,1); else arr.push(v); }

document.addEventListener("click", e=>{
  const el = e.target.closest("[data-action]");
  if(!el || el.tagName==="SELECT" || (el.tagName==="INPUT" && el.type==="checkbox")) return;
  const fn = A[el.dataset.action]; if(fn){ e.preventDefault(); fn(el); }
});
document.addEventListener("change", e=>{
  const el = e.target;
  if(el.dataset.action==="lang"){ S.lang=el.value; save(); const ob=!S.onboarded; if(ob){ closeSheet(); } render(true); if(ob) openOnboarding(); return; }
  if(el.dataset.action==="toggle"){
    const map = {tg_age:()=>S.profile.showAge=el.checked, tg_dating:()=>S.profile.dating=el.checked,
      tg_n_invites:()=>S.notif.invites=el.checked, tg_n_messages:()=>S.notif.messages=el.checked, tg_n_events:()=>S.notif.events=el.checked,
      tg_n_tickets:()=>S.notif.tickets=el.checked, tg_n_marketing:()=>S.notif.marketing=el.checked};
    if(map[el.id]){ map[el.id](); save(); }
  }
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
    const c=S.convos.find(c=>c.id===openConvoId); c.msgs.push({me:true, text:txt, at:now()}); save(); render(); document.getElementById("msgInput").focus();
  }
});
window.addEventListener("online", ()=>render(true));
window.addEventListener("offline", ()=>render(true));
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && S.onboarded) closeSheet(); });

render();
})();
