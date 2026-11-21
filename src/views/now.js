import { DOW } from "../core/config.js";
import { L, l } from "../core/labels.js";
import { monLabel, nowF, qSched, sSched, weekKey, winLabel } from "../core/plan.js";
import { allSkills, loadByMonth, refLabel, refOptions, streak, totalMin } from "../core/query.js";
import { M, PHASES, S } from "../core/state.js";
import { $, $$, addDays, daysSince, esc, fmtClock, fmtDay, fmtMin, hhmm, pd, toast, today, uid, ymd } from "../core/util.js";
import { exportJSON } from "../storage/backup.js";
import { dirName, folderState, lastSync } from "../storage/folder.js";
import { save } from "../storage/save.js";
import { goRef } from "../ui/links.js";
import { renderHud, setView, xpCalc } from "../ui/nav.js";
import { addRegion } from "./inventory.js";
import { addQuest } from "./quests.js";
import { toggleSettings } from "../ui/settings.js";
import { setTimerRef, startTimer, stopTimer, tick, timerRef } from "../ui/timer.js";
export let weekView=null;
export function backupSummary(){
  const age=daysSince(S.meta.lastExport), exp=age===null?"You haven't exported a backup yet.":`Last export ${age===0?"today":age+" days ago"}.`;
  if(folderState==="linked")return `<div class="okbox">Every change syncs to the folder “${esc(dirName())}”${lastSync?` · last sync ${hhmm(lastSync)}`:""}.</div>`;
  if(folderState==="needs-permission")return `<div class="warnbox">Your backup folder needs permission again. Open Data settings and click Reconnect. ${exp}</div>`;
  if(folderState==="error")return `<div class="warnbox">The last folder sync failed. Reconnect it in Data settings. ${exp}</div>`;
  return `<div class="${age===null||age>7?"warnbox":"note"}">Your data lives only in this browser. ${exp} ${folderState==="unsupported"?"This browser can't link a folder, so export regularly.":"Link a backup folder to make it permanent."}</div>`;
}
export function renderNow(){
  const box=$("#nowBody"), f=nowF(), m=Math.floor(f)+1, {mapPct}=xpCalc();
  const timePct=Math.max(0,Math.min(100,f/M*100)), ph=PHASES.find(p=>m>=p[1]&&m<=p[2]);
  const pace=m<1?["later","Not started"]:mapPct+5>=timePct?["done","On pace"]:mapPct+15>=timePct?["behind","Slightly behind"]:["overdue","Behind plan"];
  const curKey=weekKey(new Date());if(!weekView)weekView=curKey;
  const wk=S.weeks[weekView]||{goals:[],review:""};
  const ws=pd(weekView), days=[...Array(7)].map((_,i)=>ymd(addDays(ws,i))), tdy=today();
  const wsess=S.sessions.filter(x=>days.includes(x.date)).sort((a,b)=>b.date.localeCompare(a.date)||(b.t||0)-(a.t||0));
  const wmin=wsess.reduce((a,x)=>a+(+x.min||0),0), target=(+S.prefs.weeklyHours||0)*60;
  const perDay=days.map(d=>wsess.filter(x=>x.date===d).reduce((a,x)=>a+(+x.min||0),0)), maxDay=Math.max(60,...perDay);
  const prevKey=ymd(addDays(ws,-7)), carry=weekView===curKey?(S.weeks[prevKey]?.goals||[]).filter(g=>!g.done&&!g.carried):[];
  const items=[...allSkills().filter(({s})=>!s.cont).map(({rid,s})=>({ref:"s:"+s.id,name:s.name,code:S.regions[rid].code||"",x:s,sc:sSched(s)})),
    ...S.quests.map(q=>({ref:"q:"+q.id,name:q.code+" · "+q.name,code:L("quest"),x:q,sc:qSched(q)}))];
  const rank={overdue:0,behind:1,now:2};
  const nowIt=items.filter(i=>i.sc.k in rank).sort((a,b)=>rank[a.sc.k]-rank[b.sc.k]||a.x.end-b.x.end);
  const soon=items.filter(i=>i.sc.k==="soon").sort((a,b)=>a.x.start-b.x.start);
  const itemRow=i=>`<button class="row" data-go="${esc(i.ref)}"><span class="flag ${i.sc.k}">${esc(i.sc.t)}</span><span class="rt">${esc(i.name)}</span><span class="rs">${esc(i.code)} · ${winLabel(i.x)} · ${i.x.progress||0}%</span></button>`;
  const gd=wk.goals.filter(g=>g.done).length;
  box.innerHTML=`<div class="nowgrid">
  <div class="col">${starterHTML()}
    <div class="box"><div class="bd">
      <div class="kv"><span>${ph?esc(ph[0]):m<1?"Before the plan starts":"Plan complete"}</span><span>${monLabel(1)} → ${monLabel(M)}</span></div>
      <div class="big">${m<1?`Starts ${monLabel(1)}`:m>M?`Month ${M} / ${M} · complete`:`Month ${m} <span style="color:var(--dim);font-size:18px">/ ${M}</span>`}</div>
      <div class="field"><div class="kv"><span>Time elapsed</span><span>${Math.round(timePct)}%</span></div><div class="meter"><i style="width:${timePct}%"></i></div></div>
      <div class="field"><div class="kv"><span>Map progress (${esc(l("skill"))}s + ${esc(l("quests"))})</span><span><span class="flag ${pace[0]}">${pace[1]}</span> ${mapPct}%</span></div>
        <div class="meter"><i style="width:${mapPct}%"></i><b style="left:${timePct}%" title="Where the calendar says you should be"></b></div></div>
      ${(()=>{const load=loadByMonth(),mm=Math.max(1,Math.min(M,m)),v=load[mm],g=+S.prefs.weeklyHours||0;return `<div class="kv"><span>Planned load this month</span><span>${g&&v>g*1.2?`<span class="flag behind">over goal</span> `:""}${v} h/week · goal ${g} h</span></div>`;})()}
      <div class="row3"><div class="tile"><div class="v">${streak()}</div><div class="k">Day streak</div></div><div class="tile"><div class="v">${Math.round(totalMin()/60)}</div><div class="k">Hours total</div></div><div class="tile"><div class="v">${S.quests.filter(q=>q.status==="done").length}/${S.quests.length}</div><div class="k">${esc(L("quests"))} done</div></div></div>
    </div></div>

    <div class="box"><div class="ph"><button class="btn ghost" id="wPrev" aria-label="Previous week">◀</button><span>${weekView===curKey?"This week":"Week"} · ${fmtDay(days[0])} – ${fmtDay(days[6])}</span><span class="btns">${weekView!==curKey?`<button class="btn ghost" id="wNow">This week</button>`:""}<button class="btn ghost" id="wNext" aria-label="Next week">▶</button></span></div>
    <div class="bd">
      <div class="field"><div class="kv"><span>${fmtMin(wmin)} of ${S.prefs.weeklyHours||0}h weekly goal</span><span>${target?Math.round(wmin/target*100):0}%</span></div><div class="meter"><i style="width:${target?Math.min(100,wmin/target*100):0}%"></i></div></div>
      <div class="days">${days.map((d,i)=>`<div class="day ${d===tdy?"today":""}" title="${fmtDay(d)} · ${fmtMin(perDay[i])}"><i style="height:${perDay[i]/maxDay*100}%"></i><span>${DOW[pd(d).getDay()].slice(0,2)} ${pd(d).getDate()}</span></div>`).join("")}</div>
      <div class="field"><span class="lbl">Goals · ${gd}/${wk.goals.length} done</span>
        <div class="rows" id="goals">${wk.goals.map(g=>`<div class="goal ${g.done?"done":""}" data-id="${esc(g.id)}"><input type="checkbox" class="chk" ${g.done?"checked":""} aria-label="Done: ${esc(g.text)}"><span class="gt">${esc(g.text)}</span>${g.ref?`<button class="lgo3" data-go="${esc(g.ref)}">${esc(refLabel(g.ref))}</button>`:"<span></span>"}<button class="x" aria-label="Remove goal">✕</button></div>`).join("")||`<div class="note">No goals for this week yet. Pick 3 to 5 outcomes you can check off, not activities.</div>`}</div>
        ${carry.length?`<button class="btn ghost" id="carry" style="align-self:flex-start">Carry ${carry.length} unfinished from last week</button>`:""}
        <form class="inline" id="goalForm"><input class="in" id="gText" placeholder="e.g. Finish chapter 3 and its exercises" required aria-label="New goal"><select class="sel" id="gRef" aria-label="Linked to">${refOptions("")}</select><button class="btn primary" type="submit">+ Goal</button></form></div>
      <div class="field"><label for="wReview">Weekly review · what moved, what blocked, what's next</label><textarea class="ta" id="wReview">${esc(wk.review||"")}</textarea></div>
    </div></div>

    <div class="box"><div class="ph"><span>Sessions · ${wsess.length} this week</span></div><div class="bd"><div class="rows" id="sessList">${wsess.map(x=>`<div class="goal" data-sid="${esc(x.id)}"><span class="rs">${fmtDay(x.date)}</span><span class="gt"><strong>${fmtMin(x.min)}</strong> · ${x.ref?`<button class="lgo3" data-go="${esc(x.ref)}">${esc(refLabel(x.ref))}</button>`:"General"}${x.note?` <span class="note">· ${esc(x.note)}</span>`:""}</span><span></span><button class="x" aria-label="Delete session">✕</button></div>`).join("")||`<div class="note">No time logged this week. Start the focus timer or log a session by hand.</div>`}</div></div></div>
  </div>

  <div class="col">
    <div class="box"><div class="ph"><span>Focus</span></div><div class="bd">
      ${S.timer?`<div class="clock" id="clock">${fmtClock(Date.now()-S.timer.start)}</div><div class="note">On <strong>${esc(refLabel(S.timer.ref))}</strong> · started ${hhmm(S.timer.start)}</div>
        <div class="btns"><button class="btn primary" id="tStop">Stop &amp; log</button><button class="btn ghost" id="tCancel">Discard</button></div>`
      :`<div class="note">Pick what you're working on and start the clock. Stopping it logs the session.</div><div class="inline"><select class="sel" id="tRef" aria-label="Focus on">${refOptions(timerRef)}</select><button class="btn primary" id="tStart">Start focus</button></div>`}
      <details><summary class="lbl" style="cursor:pointer">Log time by hand</summary>
        <form id="logForm" style="display:flex;flex-direction:column;gap:8px;padding-top:10px">
          <div class="row3"><div class="field"><label for="lDate">Date</label><input type="date" class="in" id="lDate" value="${tdy}"></div><div class="field"><label for="lMin">Minutes</label><input type="number" min="1" class="in" id="lMin" value="60"></div><div class="field"><label for="lRef">On</label><select class="sel" id="lRef">${refOptions(timerRef)}</select></div></div>
          <input class="in" id="lNote" placeholder="What did you do? (optional)" aria-label="Session note"><button class="btn primary" type="submit" style="align-self:flex-start">+ Log session</button></form></details>
    </div></div>
    <div class="box"><div class="ph"><span>In window now · ${nowIt.length}</span><span class="note" style="text-transform:none;letter-spacing:0">month ${Math.max(1,Math.min(M,m))}</span></div><div class="bd"><div class="rows">${nowIt.map(itemRow).join("")||`<div class="note">Nothing is scheduled for this month.</div>`}</div></div></div>
    ${soon.length?`<div class="box"><div class="ph"><span>Starting next month · ${soon.length}</span></div><div class="bd"><div class="rows">${soon.map(itemRow).join("")}</div></div></div>`:""}
    <div class="box"><div class="ph"><span>Backup</span></div><div class="bd">${backupSummary()}<div class="btns"><button class="btn" id="nExport">Export now</button><button class="btn ghost" id="nData">Data settings</button></div></div></div>
  </div></div>`;

  $$("[data-go]",box).forEach(b=>b.onclick=()=>goRef(b.dataset.go));
  $("#wPrev").onclick=()=>{weekView=ymd(addDays(pd(weekView),-7));renderNow();};
  $("#wNext").onclick=()=>{weekView=ymd(addDays(pd(weekView),7));renderNow();};
  if($("#wNow"))$("#wNow").onclick=()=>{weekView=curKey;renderNow();};
  const W=()=>S.weeks[weekView] ||= {goals:[],review:""};
  $$("#goals .goal").forEach(row=>{const id=row.dataset.id;
    row.querySelector(".chk").onchange=e=>{const g=W().goals.find(g=>g.id===id);if(g)g.done=e.target.checked;save();renderNow();};
    row.querySelector(".x").onclick=()=>{W().goals=W().goals.filter(g=>g.id!==id);save();renderNow();};});
  $("#goalForm").onsubmit=e=>{e.preventDefault();const t=$("#gText").value.trim();if(!t)return;W().goals.push({id:uid("g"),text:t,ref:$("#gRef").value,done:false});save();renderNow();setTimeout(()=>$("#gText")?.focus(),0);};
  if($("#carry"))$("#carry").onclick=()=>{carry.forEach(g=>{g.carried=true;W().goals.push({id:uid("g"),text:g.text,ref:g.ref||"",done:false});});save();renderNow();toast(`Carried ${carry.length} goal${carry.length>1?"s":""} into this week`);};
  $("#wReview").oninput=e=>{W().review=e.target.value;save();};
  $$("#sessList [data-sid] .x").forEach(b=>b.onclick=()=>{const id=b.closest("[data-sid]").dataset.sid;S.sessions=S.sessions.filter(x=>x.id!==id);save();renderNow();renderHud();toast("Session deleted");});
  if($("#tStart"))$("#tStart").onclick=()=>startTimer($("#tRef").value);
  if($("#tRef"))$("#tRef").onchange=e=>setTimerRef(e.target.value);
  if($("#tStop"))$("#tStop").onclick=stopTimer;
  if($("#tCancel")){const b=$("#tCancel");b.onclick=()=>{if(!b.classList.contains("arm")){b.classList.add("arm");b.textContent="Discard this session?";return;}S.timer=null;save();tick();renderNow();toast("Session discarded");};}
  $("#logForm").onsubmit=e=>{e.preventDefault();const min=Math.round(+$("#lMin").value);if(!(min>0))return toast("Enter the minutes you worked");
    S.sessions.push({id:uid("t"),date:$("#lDate").value||tdy,min,ref:$("#lRef").value,note:$("#lNote").value.trim(),t:Date.now()});save();renderNow();renderHud();toast(`Logged ${fmtMin(min)}`);};
  $("#nExport").onclick=exportJSON;$("#nData").onclick=e=>{e.stopPropagation();toggleSettings(true);};
  $$("[data-sgo]",box).forEach(b=>b.onclick=()=>{const [v,act]=b.dataset.sgo.split(":");if(act==="export")return exportJSON();setView(v);
    if(act==="region")addRegion();else if(act==="quest")addQuest();});
  if($("#starterDone"))$("#starterDone").onclick=()=>{S.prefs.starter=false;save();renderNow();};
}
export function resetWeek(){weekView=null;}

/* ---------- starter quests: a built-in tutorial that completes itself as you use the app ---------- */
export function starterSteps(){
  const skills=allSkills().map(x=>x.s), wk=S.weeks[weekKey(new Date())]||{goals:[]};
  return [
    {t:"Name your character",done:!!S.bio.name,go:"bio"},
    {t:`Create your first ${l("region")}`,done:Object.keys(S.regions).length>0,go:"inv:region"},
    {t:`Add a ${l("skill")} with at least one must-know`,done:skills.some(s=>(s.musts||[]).length),go:"inv"},
    {t:"Run a focus session (or log time by hand)",done:S.sessions.length>0,go:"now"},
    {t:"Set three goals for this week",done:(wk.goals||[]).length>=3,go:"now"},
    {t:`Plan a ${l("quest")} that proves a ${l("skill")}`,done:S.quests.length>0,go:"quests:quest"},
    {t:`Add an entry to your ${l("atlas")}`,done:S.atlasDef.items.length>0,go:"atlas"},
    {t:"Export your first backup",done:!!S.meta.lastExport,go:"now:export"},
  ];
}
function starterHTML(){
  if(S.prefs.starter===false)return "";
  const st=starterSteps(), n=st.filter(x=>x.done).length;
  return `<div class="box starter"><div class="ph"><span>Starter quests · ${n}/${st.length}</span><button class="btn ghost" id="starterDone">${n===st.length?"Done, hide":"Hide"}</button></div><div class="bd">
    ${n===st.length?`<div class="okbox">Every starter quest complete. The map is yours now.</div>`:`<div class="meter"><i style="width:${n/st.length*100}%"></i></div>`}
    <div class="rows">${st.map((x,i)=>`<div class="sq ${x.done?"done":""}"><span class="ic">${x.done?"✓":i+1}</span><span class="t">${esc(x.t)}</span>${x.done?"<span></span>":`<button class="lgo3 go" data-sgo="${x.go}">Go →</button>`}</div>`).join("")}</div></div></div>`;
}
