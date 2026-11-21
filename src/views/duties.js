import { DUTY_STATUS, DUTY_TYPES, MON } from "../core/config.js";
import { L, l } from "../core/labels.js";

import { skillIndex } from "../core/query.js";
import { S } from "../core/state.js";
import { $, $$, defer, esc, toast, today, uid } from "../core/util.js";
import { copy } from "../storage/backup.js";
import { save } from "../storage/save.js";
import { mountAtt, purge } from "../ui/attachments.js";
import { skillPicker } from "../ui/links.js";
import { renderHud, setView } from "../ui/nav.js";
export let dutySel=null, dutyFilter="all", dutyConfirm=false, dutyFresh=true;
export const dSort=(a,b)=>((b.ongoing?"9999":b.end||b.start||"")+(b.start||"")).localeCompare((a.ongoing?"9999":a.end||a.start||"")+(a.start||""));
export function fmtRange(d){const f=x=>x?(()=>{const [y,m]=x.split("-");return MON[(+m||1)-1]+" "+y;})():"";return `${f(d.start)||"?"} – ${d.ongoing?"Present":f(d.end)||"?"}`;}
export function renderDuties(){
  const by={};S.duties.forEach(d=>by[d.type]=(by[d.type]||0)+1);
  const hours=S.duties.reduce((a,d)=>a+(+d.hours||0),0);
  $("#dutySum").innerHTML=`<div class="tile"><div class="v">${S.duties.filter(d=>d.status==="ongoing").length}</div><div class="k">Ongoing</div></div>
    <div class="tile"><div class="v">${S.duties.filter(d=>d.status==="completed").length}</div><div class="k">Completed</div></div>
    <div class="tile"><div class="v">${hours}</div><div class="k">Hours logged</div></div>`;
  $("#dutyFilters").innerHTML=["all",...DUTY_TYPES].map(t=>`<button class="chip ${dutyFilter===t?"on":""}" data-f="${t}">${t==="all"?"All":t}${t!=="all"&&by[t]?" "+by[t]:""}</button>`).join("");
  $$("#dutyFilters .chip").forEach(b=>b.onclick=()=>{dutyFilter=b.dataset.f;renderDuties();});
  const vis=[...S.duties].sort(dSort).filter(d=>dutyFilter==="all"||d.type===dutyFilter);
  if(!dutySel||!S.duties.find(d=>d.id===dutySel))dutySel=vis[0]?.id||null;
  $("#dutyList").innerHTML=vis.map(d=>`<button class="litem ${d.id===dutySel?"on":""}" data-id="${esc(d.id)}">
    <span class="ltitle">${esc(d.title||"Untitled")}</span>
    <span class="lmeta"><span class="stype">${esc(d.type)}</span><span>${esc(d.org||"")}</span></span>
    <span class="lmeta"><span class="st ${esc(d.status)}">${esc(d.status)}</span><span>${esc(fmtRange(d))}</span>${(d.files||[]).length?`<span class="fcount">${d.files.length} files</span>`:""}</span></button>`).join("")
    ||`<div class="empty"><h3>Nothing logged yet</h3><p>Log the work you do: a job, a research project, teaching, freelancing, volunteering or open source. Each entry keeps the role, dates, outcomes and the ${esc(l("skill"))}s it exercised.</p></div>`;
  $$("#dutyList .litem").forEach(b=>b.onclick=()=>{if(dutySel!==b.dataset.id)dutyFresh=true;dutySel=b.dataset.id;dutyConfirm=false;renderDuties();});
  renderDutyEd();
}
export function renderDutyEd(){
  const box=$("#dutyEd"), d=S.duties.find(x=>x.id===dutySel);
  if(!d){box.innerHTML=`<div class="empty"><h3>${esc(L("duties"))}</h3><p>Add a role, a research project, a course you teach or a contract. Outcomes you write here become your CV bullets later.</p><button class="btn primary" id="emptyDuty">+ ${esc(L("duty"))}</button></div>`;$("#emptyDuty").onclick=addDuty;return;}
  const fresh=dutyFresh;dutyFresh=false;
  box.innerHTML=`<div class="insp ${fresh?"enter":""}">
    <input class="in title" id="dTitle" value="${esc(d.title)}" placeholder="What you did, e.g. Research assistant" aria-label="Duty title">
    <div class="row3">
      <div class="field"><label for="dType">Type</label><select class="sel" id="dType">${DUTY_TYPES.map(t=>`<option ${d.type===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label for="dOrg">Organization / client</label><input class="in" id="dOrg" value="${esc(d.org||"")}"></div>
      <div class="field"><label for="dRole">Role</label><input class="in" id="dRole" value="${esc(d.role||"")}"></div>
    </div>
    <div class="row3">
      <div class="field"><label for="dStart">Start</label><input type="month" class="in" id="dStart" value="${esc(d.start||"")}"></div>
      <div class="field"><label for="dEnd">End</label><input type="month" class="in" id="dEnd" value="${esc(d.end||"")}" ${d.ongoing?"disabled":""}></div>
      <div class="field"><label for="dStatus">Status</label><select class="sel" id="dStatus">${DUTY_STATUS.map(s=>`<option ${d.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label for="dHours">Hours logged</label><input type="number" min="0" class="in" id="dHours" value="${esc(d.hours||"")}"></div>
      <div class="field"><label for="dLink">Link</label><input class="in" id="dLink" value="${esc(d.link||"")}" placeholder="Repo, paper, product, contract"></div>
    </div>
    <div class="field"><label for="dDesc">What the work is</label><textarea class="ta" id="dDesc" placeholder="Context, scope, team, the problem">${esc(d.desc||"")}</textarea></div>
    <div class="field"><label for="dOut">Outcomes and impact (one per line)</label><textarea class="ta" id="dOut" placeholder="Cut report turnaround from 5 days to 1&#10;Co-authored a paper accepted at a peer-reviewed venue">${esc(d.outcomes||"")}</textarea></div>
    <div class="field"><span class="lbl">${esc(L("skill"))}s exercised</span><div id="dSkills"></div></div>
    <div class="field"><label for="dTech">Tech and tools</label><input class="in" id="dTech" value="${esc(d.tech||"")}" placeholder="e.g. Python, Excel, R, Figma"></div>
    <div class="att" id="dAtt"></div>
    <div class="btns"><button class="btn" id="dCopy">Copy as CV entry</button>
      ${dutyConfirm?`<span class="confirm"><span>Delete this entry?</span><button class="btn danger" id="dDelYes">Delete</button><button class="btn" id="dDelNo">Keep</button></span>`:`<button class="btn danger" id="dDel">Delete</button>`}</div>
  </div>`;
  const bind=(id,k,re)=>{const el=$("#"+id);el.oninput=()=>{d[k]=el.value;save();};el.onchange=()=>{d[k]=el.value;save();if(re){defer(renderDuties);renderHud();}};};
  bind("dTitle","title",1);bind("dOrg","org",1);bind("dRole","role");bind("dStart","start",1);bind("dEnd","end",1);bind("dHours","hours",1);bind("dLink","link");bind("dDesc","desc");bind("dOut","outcomes");bind("dTech","tech");
  $("#dType").onchange=e=>{d.type=e.target.value;save();renderDuties();};
  skillPicker($("#dSkills"),d.skills);
  mountAtt($("#dAtt"),d,{hint:"Contracts, reports, papers, screenshots, deliverables for this work.",onChange:()=>{const y=$("#dutyEd").scrollTop;renderDuties();$("#dutyEd").scrollTop=y;}});
  $("#dStatus").onchange=e=>{d.status=e.target.value;d.ongoing=d.status==="ongoing";if(!d.ongoing&&!d.end)d.end=today().slice(0,7);save();renderDuties();renderHud();};
  $("#dCopy").onclick=()=>{const idx=skillIndex(),sk=d.skills.map(i=>idx[i]?.s.name).filter(Boolean);
    copy(`${d.title}${d.role?" — "+d.role:""}\n${d.org||""} · ${d.type} · ${fmtRange(d)}\n${(d.outcomes||"").split("\n").filter(Boolean).map(x=>"• "+x).join("\n")}${d.tech?"\nTech: "+d.tech:""}${sk.length?"\nSkills: "+sk.join(", "):""}`,"CV entry copied");};
  if($("#dDel"))$("#dDel").onclick=()=>{dutyConfirm=true;renderDutyEd();};
  if($("#dDelNo"))$("#dDelNo").onclick=()=>{dutyConfirm=false;renderDutyEd();};
  if($("#dDelYes"))$("#dDelYes").onclick=()=>{purge(d);S.duties=S.duties.filter(x=>x.id!==d.id);dutySel=null;dutyConfirm=false;save();toast("Entry deleted");renderDuties();renderHud();};
}
export function addDuty(){const d={id:uid("d"),title:"",type:"company",org:"",role:"",start:today().slice(0,7),end:"",ongoing:true,status:"ongoing",hours:"",link:"",desc:"",outcomes:"",tech:"",skills:[],files:[]};
  S.duties.push(d);dutySel=d.id;dutyFilter="all";dutyFresh=true;save();renderDuties();renderHud();setTimeout(()=>$("#dTitle")?.focus(),30);}
export function goDuty(id){dutySel=id;dutyFresh=true;dutyFilter="all";setView("duties");}
export function resetDuties(){dutySel=null;}
