import { FALLBACK_CHECKLIST, QSTAT, TIERS } from "../core/config.js";
import { L, l } from "../core/labels.js";

import { clampM, curM, qSched, winDates, winLabel } from "../core/plan.js";
import { minFor } from "../core/query.js";
import { M, S } from "../core/state.js";
import { $, $$, defer, esc, fmtMin, pad, toast, uid } from "../core/util.js";
import { save } from "../storage/save.js";
import { mountAtt, purge } from "../ui/attachments.js";
import { skillPicker } from "../ui/links.js";
import { renderHud, setView, view } from "../ui/nav.js";
import { startTimer } from "../ui/timer.js";
import { addPost, goPost } from "./blog.js";
export let questSel=null, questFilter="all", questConfirm=false, questFresh=true;
export function renderQuests(){
  const list=[...S.quests].sort((a,b)=>a.start-b.start||String(a.code).localeCompare(String(b.code)));
  $("#questFilters").innerHTML=["all",...QSTAT].map(t=>`<button class="chip ${questFilter===t?"on":""}" data-f="${t}">${t==="all"?"All":t}</button>`).join("");
  $$("#questFilters .chip").forEach(b=>b.onclick=()=>{questFilter=b.dataset.f;renderQuests();});
  const vis=list.filter(q=>questFilter==="all"||q.status===questFilter);
  if(!questSel||!S.quests.find(q=>q.id===questSel))questSel=vis[0]?.id||null;
  $("#questList").innerHTML=vis.map(q=>{const sc=qSched(q);return `<button class="litem ${q.id===questSel?"on":""}" data-id="${esc(q.id)}">
    <span class="ltitle">${esc(q.code)} · ${esc(q.name)}</span>
    <span class="lmeta"><span class="st ${esc(q.status)}">${esc(q.status)}</span>${sc.k!=="later"&&sc.k!=="done"?`<span class="flag ${sc.k}">${esc(sc.t)}</span>`:""}<span>${winLabel(q)}</span><span>${q.progress||0}%</span></span>
    <span class="pbar" style="display:block"><i style="width:${q.progress||0}%;background:var(--cyan)"></i></span></button>`;}).join("")
    ||`<div class="empty"><h3>No ${esc(l("quests"))} here</h3><p>${esc(L("quests"))} are the projects that prove your ${esc(l("skill"))}s.</p></div>`;
  $$("#questList .litem").forEach(b=>b.onclick=()=>{if(questSel!==b.dataset.id)questFresh=true;questSel=b.dataset.id;questConfirm=false;renderQuests();});
  renderQuestEd();
}
export function renderQuestEd(){
  const box=$("#questEd"), q=S.quests.find(x=>x.id===questSel);
  if(!q){box.innerHTML=`<div class="empty"><h3>${esc(L("quests"))}</h3><p>Each ${esc(l("quest"))} is a project with a time window, a “done when” bar and the ${esc(l("skill"))}s it proves.</p><button class="btn primary" id="emptyQuest">+ ${esc(L("quest"))}</button></div>`;$("#emptyQuest").onclick=addQuest;return;}
  const sc=qSched(q), ref="q:"+q.id, posts=S.posts.filter(p=>p.quest===q.id), fresh=questFresh;questFresh=false;
  const cd=q.checklist.filter(c=>c.done).length, keep=box.scrollTop;
  box.innerHTML=`<div class="insp ${fresh?"enter":""}">
    <div class="edhead"><input class="in" id="qCode" value="${esc(q.code)}" aria-label="Quest code" style="width:74px;font-family:var(--mono);text-align:center"><input class="in title" id="qName" value="${esc(q.name)}" aria-label="Quest name" style="flex:1;min-width:200px"></div>
    <div class="row3">
      <div class="field"><label for="qTier">Tier</label><select class="sel" id="qTier">${TIERS.map(t=>`<option ${q.tier===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label for="qStatus">Status</label><select class="sel" id="qStatus">${QSTAT.map(t=>`<option ${q.status===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><span class="lbl">Schedule</span><span class="flag ${sc.k}" style="align-self:flex-start;margin-top:8px">${esc(sc.t)}</span></div></div>
    <div class="row3">
      <div class="field"><label for="qStart">Start month</label><input type="number" class="in" id="qStart" min="1" max="${M}" value="${q.start}"></div>
      <div class="field"><label for="qEnd">End month</label><input type="number" class="in" id="qEnd" min="1" max="${M}" value="${q.end}"></div>
      <div class="field"><label for="qHpw">Hours / week</label><input type="number" class="in" id="qHpw" min="0" max="40" step="0.25" value="${esc(q.hpw??"")}"></div></div>
    <div class="note">${winDates(q)}</div>
    <div class="field"><label for="qProg">Progress <span class="pv" id="qpv">${q.progress||0}%</span></label>
      <input type="range" class="range" id="qProg" min="0" max="100" step="5" value="${q.progress||0}">
      <button class="btn ghost" id="qFromChk" style="align-self:flex-start">Set from deliverables</button></div>
    <div class="field"><label for="qDone">Done when</label><input class="in" id="qDone" value="${esc(q.doneWhen)}" placeholder="The measurable bar that ends this ${esc(l("quest"))}"></div>
    <div class="field"><span class="lbl">Deliverables · ${cd}/${q.checklist.length}</span>
      <div class="srcs" id="qChk">${q.checklist.map(c=>`<div class="src ${c.done?"done":""}" data-id="${esc(c.id)}" style="grid-template-columns:auto 1fr auto"><input type="checkbox" class="chk" ${c.done?"checked":""} aria-label="Done: ${esc(c.text)}"><span class="stitle">${esc(c.text)}</span><button class="x" aria-label="Remove ${esc(c.text)}">✕</button></div>`).join("")}</div>
      <form class="inline" id="qChkForm"><input class="in" id="qChkText" placeholder="Add a deliverable" required aria-label="New deliverable"><button class="btn" type="submit">+ Add</button></form></div>
    <div class="field"><label for="qRepo">Repo or demo link</label><div class="inline"><input class="in" id="qRepo" value="${esc(q.repo)}" placeholder="https://github.com/…">${q.repo?`<a class="btn" href="${esc(q.repo)}" target="_blank" rel="noopener">Open ↗</a>`:""}</div></div>
    <div class="field"><span class="lbl">Proves ${esc(l("skill"))}s</span><div id="qProves"></div></div>
    <div class="field"><span class="lbl">${esc(L("blog"))} · ${posts.length}</span><div class="chips">${posts.map(p=>`<span class="lchip"><button class="lgo" data-p="${esc(p.id)}">${esc(p.title||"Untitled")}</button></span>`).join("")}<button class="btn ghost" id="qWrite">+ Write ${esc(l("post"))}</button></div></div>
    <div class="field"><div class="kv"><span>Time logged</span><span>${fmtMin(minFor(ref))}</span></div><button class="btn" id="qFocus" style="align-self:flex-start" ${S.timer?"disabled":""}>${S.timer?"Focus running…":`Start focus on this ${l("quest")}`}</button></div>
    <div class="field"><label for="qNotes">Notes</label><textarea class="ta" id="qNotes" placeholder="Design decisions, results, what failed">${esc(q.notes)}</textarea></div>
    <div class="att" id="qAtt"></div>
    ${questConfirm?`<div class="confirm"><span>Delete this ${esc(l("quest"))}?</span><button class="btn danger" id="qDelYes">Delete</button><button class="btn" id="qDelNo">Keep</button></div>`:`<button class="btn danger" id="qDel" style="align-self:flex-start">Delete ${esc(l("quest"))}</button>`}
  </div>`;
  box.scrollTop=fresh?0:keep;
  const bind=(id,k,re)=>{const el=$("#"+id);el.oninput=()=>{q[k]=el.value;save();};el.onchange=()=>{if(re)defer(renderQuests);};};
  bind("qCode","code",1);bind("qName","name",1);bind("qDone","doneWhen");bind("qNotes","notes");bind("qRepo","repo",1);
  $("#qTier").onchange=e=>{q.tier=e.target.value;save();renderHud();};
  $("#qStatus").onchange=e=>{q.status=e.target.value;if(q.status==="done")q.progress=100;save();renderQuests();renderHud();};
  const setWin=()=>{const a=clampM($("#qStart").value),b=Math.max(a,clampM($("#qEnd").value));q.start=a;q.end=b;save();defer(renderQuests);};
  $("#qStart").onchange=setWin;$("#qEnd").onchange=setWin;$("#qHpw").onchange=e=>{q.hpw=Math.max(0,+e.target.value||0);save();};
  $("#qProg").oninput=e=>{q.progress=+e.target.value;$("#qpv").textContent=q.progress+"%";
    if(q.progress>0&&q.status==="locked")q.status="active";if(q.progress===100)q.status="done";else if(q.status==="done")q.status="active";$("#qStatus").value=q.status;save();renderHud();};
  $("#qProg").onchange=()=>renderQuests();
  $("#qFromChk").onclick=()=>{const n=q.checklist.length;if(!n)return toast("Add deliverables first");q.progress=Math.round(q.checklist.filter(c=>c.done).length/n*100/5)*5;
    if(q.progress>0&&q.status==="locked")q.status="active";if(q.progress===100)q.status="done";save();renderQuests();renderHud();};
  $$("#qChk .src").forEach(row=>{const id=row.dataset.id,c=q.checklist.find(x=>x.id===id);
    row.querySelector(".chk").onchange=e=>{c.done=e.target.checked;save();renderQuestEd();};
    row.querySelector(".x").onclick=()=>{q.checklist=q.checklist.filter(x=>x.id!==id);save();renderQuestEd();};});
  $("#qChkForm").onsubmit=e=>{e.preventDefault();const t=$("#qChkText").value.trim();if(!t)return;q.checklist.push({id:uid("c"),text:t,done:false});save();renderQuestEd();setTimeout(()=>$("#qChkText")?.focus(),0);};
  skillPicker($("#qProves"),q.proves);
  $$("[data-p]",box).forEach(b=>b.onclick=()=>goPost(b.dataset.p));
  $("#qWrite").onclick=()=>addPost({quest:q.id,skills:[...q.proves],title:`${q.code}: what I built and what failed`,body:"## Problem\n\n## What I built\n\n## Results (measured)\n\n## What failed and why\n\n## Next\n"});
  $("#qFocus").onclick=()=>startTimer(ref);
  mountAtt($("#qAtt"),q,{hint:`Results, demos, papers and documents for this ${l("quest")}.`,onChange:renderQuests});
  if($("#qDel"))$("#qDel").onclick=()=>{questConfirm=true;renderQuestEd();};
  if($("#qDelNo"))$("#qDelNo").onclick=()=>{questConfirm=false;renderQuestEd();};
  if($("#qDelYes"))$("#qDelYes").onclick=()=>{purge(q);S.posts.forEach(p=>{if(p.quest===q.id)p.quest="";});S.quests=S.quests.filter(x=>x.id!==q.id);questSel=null;questConfirm=false;save();toast(L("quest")+" deleted");renderQuests();renderHud();};
}
export function addQuest(){
  const nums=S.quests.map(q=>+(String(q.code).match(/\d+/)||[0])[0]), m=Math.max(1,Math.min(M,curM()));
  const q={id:uid("q"),code:"Q"+pad((nums.length?Math.max(...nums):0)+1),name:"New "+l("quest"),tier:"core",start:m,end:Math.min(M,m+2),status:"locked",progress:0,doneWhen:"",notes:"",repo:"",
    checklist:(S.pack.defaults?.checklist||FALLBACK_CHECKLIST).map(t=>({id:uid("c"),text:t,done:false})),proves:[],sources:[],files:[]};
  S.quests.push(q);questSel=q.id;questFilter="all";questFresh=true;save();
  if(view!=="quests")setView("quests");else renderQuests();renderHud();
  setTimeout(()=>{const el=$("#qName");el&&(el.focus(),el.select());},30);
}
export function goQuest(id){questSel=id;questFresh=true;questFilter="all";setView("quests");}
export function resetQuests(){questSel=null;}
