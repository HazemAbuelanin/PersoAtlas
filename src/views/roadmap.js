import { L, l } from "../core/labels.js";
import { monLabel, nowF, qSched, sSched, winDates, winLabel } from "../core/plan.js";
import { coherence, loadByMonth, ordered } from "../core/query.js";
import { M, PHASES, S } from "../core/state.js";
import { $, $$, esc } from "../core/util.js";
import { goRef } from "../ui/links.js";
export let mapHideDone=false;
export function renderMap(){
  const box=$("#mapBody"), f=nowF(), m=Math.floor(f)+1, now=Math.max(0,Math.min(1,f/M));
  const step=monthStep(M), pos=(a,b)=>`left:${(a-1)/M*100}%;width:${(b-a+1)/M*100}%`;
  const bar=(kind,x,name,done)=>{const sc=kind==="s"?sSched(x):qSched(x);const a=x.start,b=x.cont?M:x.end;
    return `<button class="bar ${sc.k} ${x.cont?"cont":""}" data-tier="${esc(x.tier)}" style="${pos(a,b)}" data-go="${kind}:${esc(x.id)}" title="${esc(name)} · ${winLabel(x)} · ${winDates(x)} · ${x.progress||0}% · ${esc(sc.t)}" aria-label="${esc(name)}"><i style="width:${x.progress||0}%"></i></button>`;};
  const row=(kind,x,name,done)=>`<div class="rmrow"><button class="rmlab" data-go="${kind}:${esc(x.id)}" title="${esc(name)}">${esc(name)}</button><div class="track">${bar(kind,x,name,done)}</div></div>`;
  const quests=[...S.quests].filter(q=>!(mapHideDone&&q.status==="done")).sort((a,b)=>a.start-b.start);
  const load=loadByMonth(), goal=+S.prefs.weeklyHours||0, mx=Math.max(goal,...load.slice(1),1), iss=coherence();
  const over=load.slice(1).filter(v=>goal&&v>goal*1.2).length;
  let html=`<div style="padding:10px 16px 0;display:flex;flex-direction:column;gap:6px">
    <div class="${iss.length?"warnbox":"okbox"}">${iss.length?`${iss.length} scheduling conflict${iss.length>1?"s":""}. Click one to fix it:`:`Coherent: every ${l("skill")} starts after its prerequisites, and every ${l("quest")} overlaps the ${l("skill")}s it proves.`}</div>
    ${iss.length?`<div class="rows">${iss.map(i=>`<button class="row" data-go="${esc(i.ref)}" style="grid-template-columns:1fr"><span class="rt" style="white-space:normal">${esc(i.t)}</span></button>`).join("")}</div>`:""}
    <div class="note">Planned load averages ${(load.slice(1).reduce((a,b)=>a+b,0)/M).toFixed(1)} h/week against your ${goal} h goal${over?`; ${over} month${over>1?"s are":" is"} more than 20% over it (amber)`:""}. Each item's hours/week is editable in its inspector.</div></div>
  <div class="filters" style="padding:10px 16px 0"><button class="chip ${mapHideDone?"on":""}" id="mapHide">Hide done</button><span class="note" style="align-self:center">Click a bar to open it. The cyan line is today.</span></div>
  <div class="rm" style="--now:${now};--q:${M/step}">
    <div class="rmhead"><div class="rmrow"><span class="rmlab"></span><div class="track" style="background:none">${[...Array(Math.ceil(M/step))].map((_,i)=>{const n=i*step+1;return `<span class="mlab ${m>=n&&m<n+step?"now":""}" style="left:${(n-1)/M*100}%">M${n} · ${monLabel(n,true)}</span>`;}).join("")}</div></div>
    <div class="rmrow"><span class="rmlab"></span><div class="track" style="height:26px">${PHASES.map(p=>`<span class="phase ${m>=p[1]&&m<=p[2]?"cur":""}" style="${pos(p[1],p[2])}">${esc(p[0])}</span>`).join("")}</div></div>
    <div class="rmrow"><span class="rmlab" style="cursor:default;color:var(--dim)">Planned h/week</span><div class="track loadtrack">${load.slice(1).map((v,i)=>`<span class="lbar ${goal&&v>goal*1.2?"over":""}" style="left:${i/M*100}%;width:${100/M}%;height:${v/mx*100}%" title="M${i+1} · ${monLabel(i+1)} · ${v} h/week planned"></span>`).join("")}${goal?`<span class="goalline" style="bottom:${goal/mx*100}%" title="Weekly goal ${goal} h"></span>`:""}</div></div></div>`;
  if(quests.length)html+=`<div class="rmrow rmreg"><span class="rmlab" style="color:var(--cyan)">${esc(L("quests"))}</span><div></div></div>`+quests.map(q=>row("q",q,`${q.code} · ${q.name}`,q.status==="done")).join("");
  ordered().forEach(([,r])=>{const sk=(r.skills||[]).filter(s=>!(mapHideDone&&s.status==="mastered")).sort((a,b)=>(a.cont?99:a.start)-(b.cont?99:b.start));if(!sk.length)return;
    html+=`<div class="rmrow rmreg"><span class="rmlab" style="color:${esc(r.color||"var(--cyan)")}">${esc(r.code||"")} · ${esc(r.name)}</span><div></div></div>`+sk.map(s=>row("s",s,s.name,s.status==="mastered")).join("");});
  box.innerHTML=html+`</div>`;
  $("#mapLegend").innerHTML=`<span><i style="border-color:var(--t-foundation)"></i>foundation</span><span><i style="border-color:var(--t-core)"></i>core</span><span><i style="border-color:var(--t-specialist)"></i>specialist</span><span><i style="border-color:var(--t-mastery)"></i>mastery</span><span><i style="border-color:var(--danger)"></i>overdue</span><span><i style="border-color:#ffb547"></i>behind</span>`;
  $$("[data-go]",box).forEach(b=>b.onclick=()=>goRef(b.dataset.go));
  $("#mapHide").onclick=()=>{mapHideDone=!mapHideDone;renderMap();};
}
/** Spacing of month labels on the timeline: monthly for short plans, yearly for very long ones. */
export const monthStep=m=>m<=12?1:m<=36?3:m<=72?6:12;
