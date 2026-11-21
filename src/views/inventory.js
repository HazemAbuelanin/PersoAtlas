import { STATUSES, TIERS, TYPES } from "../core/config.js";
import { L, l } from "../core/labels.js";

import { clampM, curM, sSched, winDates, winLabel } from "../core/plan.js";
import { allSkills, findSkill, minFor, mustStat, ordered, skillIndex, unlinkSkill } from "../core/query.js";
import { M, S } from "../core/state.js";
import { $, $$, defer, esc, flip, fmtMin, glyph, motionOn, toast, uid } from "../core/util.js";
import { save } from "../storage/save.js";
import { mountAtt, purge } from "../ui/attachments.js";
import { skillPicker } from "../ui/links.js";

import { renderHud, setView } from "../ui/nav.js";
import { startTimer } from "../ui/timer.js";
import { atlasRow, bindAtlas } from "./atlas.js";
import { addPost, goPost } from "./blog.js";
import { goDuty } from "./duties.js";
import { goQuest } from "./quests.js";
export let sel={region:null,skill:null}, filter={tier:"all",status:"all",when:"all",q:""}, confirmKey=null, animGrid=true, lastInsp=null;
export function regionProgress(r){const sk=r.skills||[];if(!sk.length)return 0;return Math.round(sk.reduce((a,s)=>a+(s.progress||0),0)/sk.length);}
export function renderInv(){if(!sel.region||!S.regions[sel.region])sel.region=ordered()[0]?.[0]||null;renderRail();renderCenter();renderInsp();renderHud();}
export function renderRail(){
  const ul=$("#rail");
  let lastSec=null;
  ul.innerHTML=ordered().map(([id,r])=>{const sec=r.section||"My "+l("regions"),hd=sec!==lastSec?`<li class="rsec" aria-hidden="true">${esc(sec)}</li>`:"";lastSec=sec;return hd+`<li class="ritem ${sel.region===id&&!filter.q?"on":""}" draggable="true" data-rid="${esc(id)}" tabindex="0">
    <span class="rcode" style="color:${esc(r.color||"#2f7bff")}">${esc(r.code||"??")}</span>
    <span class="rname">${esc(r.name)}</span><span class="rcount">${(r.skills||[]).length}</span>
    <span class="rbar"><i style="width:${regionProgress(r)}%"></i></span></li>`;}).join("");
  $$(".ritem",ul).forEach(li=>{
    const rid=li.dataset.rid;
    li.onclick=()=>{if(sel.region!==rid)animGrid=true;sel.region=rid;sel.skill=null;filter.q="";$("#q").value="";confirmKey=null;renderInv();$("#center").scrollTo?.({top:0,behavior:motionOn()?"smooth":"auto"});};
    li.onkeydown=e=>{if(e.key==="Enter")li.click();};
    li.ondragstart=e=>{e.dataTransfer.setData("text/plain","region:"+rid);li.classList.add("dragging");};
    li.ondragend=()=>li.classList.remove("dragging");
    li.ondragover=e=>{e.preventDefault();li.classList.add("drop");};
    li.ondragleave=()=>li.classList.remove("drop");
    li.ondrop=e=>{e.preventDefault();li.classList.remove("drop");const d=e.dataTransfer.getData("text/plain");
      if(d.startsWith("region:"))moveRegion(d.slice(7),rid);
      else if(d.startsWith("skill:")){const [from,sid]=d.slice(6).split("|");moveSkillToRegion(from,sid,rid);}};
  });
}
export function moveRegion(fromId,toId){
  if(fromId===toId)return;const ids=ordered().map(x=>x[0]);
  ids.splice(ids.indexOf(fromId),1);ids.splice(ids.indexOf(toId),0,fromId);
  flip("#rail .ritem","rid",()=>{ids.forEach((id,i)=>S.regions[id].order=i);renderRail();});save();
}
export function moveSkillToRegion(from,sid,to){
  if(from===to||!S.regions[from]||!S.regions[to])return;
  const i=S.regions[from].skills.findIndex(s=>s.id===sid);if(i<0)return;
  const [s]=S.regions[from].skills.splice(i,1);(S.regions[to].skills ||= []).push(s);
  if(sel.skill===sid)sel.region=to;save();toast(`Moved to ${S.regions[to].name}`);renderInv();
}
export function visibleSkills(){
  const q=filter.q.trim().toLowerCase();
  let list=q?allSkills():(S.regions[sel.region]?.skills||[]).map(s=>({rid:sel.region,s}));
  if(q)list=list.filter(({s})=>(s.name+" "+(s.why||"")+" "+(s.notes||"")+" "+(s.build||"")+" "+(s.sources||[]).map(x=>x.title).join(" ")+" "+(s.musts||[]).map(x=>x.text).join(" ")).toLowerCase().includes(q));
  if(filter.tier!=="all")list=list.filter(({s})=>s.tier===filter.tier);
  if(filter.status!=="all")list=list.filter(({s})=>s.status===filter.status);
  if(filter.when!=="all")list=list.filter(({s})=>{const k=sSched(s).k;return filter.when==="now"?["now","behind","overdue"].includes(k):["behind","overdue"].includes(k);});
  return list;
}
export function renderCenter(){
  const c=$("#center");
  if(!Object.keys(S.regions).length){c.innerHTML=`<div class="empty"><h3>Your map is empty</h3><p>Create your first ${esc(l("region"))}, then add ${esc(l("skill"))}s and sources to it. To start from a ready-made map instead, open System → Profiles.</p><button class="btn primary" id="emptyAdd">+ ${esc(L("region"))}</button></div>`;$("#emptyAdd").onclick=addRegion;return;}
  const r=S.regions[sel.region], q=filter.q.trim(), confirmR=confirmKey==="region:"+sel.region;
  const head=q?`<div class="ghead"><div><div class="gtitle">Search: “${esc(q)}”</div><div class="gdesc">Matches across every region</div></div></div>`
   :`<div class="ghead"><div style="min-width:0;flex:1"><input class="in title" id="rName" value="${esc(r.name)}" aria-label="Region name">
      <input class="in" id="rDesc" value="${esc(r.desc||"")}" placeholder="${esc(L("region"))} description" aria-label="${esc(L("region"))} description" style="border-color:transparent;background:transparent;padding-inline:0;color:var(--dim)"></div>
      <div class="btns"><input type="color" id="rColor" value="${esc(r.color||"#2f7bff")}" title="Region color" aria-label="Region color" style="width:34px;height:32px;border:1px solid var(--line2);background:var(--void);padding:2px">
      <input class="in" id="rCode" value="${esc(r.code||"")}" maxlength="3" title="Region code" aria-label="Region code" style="width:58px;text-align:center;font-family:var(--mono)">
      ${confirmR?`<span class="confirm"><span>Delete this ${esc(l("region"))} and its ${(r.skills||[]).length} ${esc(l("skill"))}s?</span><button class="btn danger" id="rDelYes">Delete</button><button class="btn" id="rDelNo">Keep</button></span>`:`<button class="btn danger" id="rDel">Delete ${esc(l("region"))}</button>`}</div></div>`;
  const chips=`<div class="filters">${["all",...TIERS].map(t=>`<button class="chip ${filter.tier===t?"on":""}" data-tier="${t}">${t==="all"?"All tiers":t}</button>`).join("")}
    <span style="width:10px"></span>${["all",...STATUSES].map(t=>`<button class="chip ${filter.status===t?"on":""}" data-status="${t}">${t==="all"?"Any status":t}</button>`).join("")}
    <span style="width:10px"></span>${[["all","Any time"],["now","In window"],["late","Behind / overdue"]].map(([k,l])=>`<button class="chip ${filter.when===k?"on":""}" data-when="${k}">${l}</button>`).join("")}</div>`;
  const list=visibleSkills();
  const rm=q?[0,0]:(r.skills||[]).reduce((a,s)=>{const [d,n]=mustStat(s);return [a[0]+d,a[1]+n];},[0,0]);
  const never=(!q&&((r.never||[]).length||r.exit))?`<details class="never" id="never" ${S.prefs.neverClosed?"":"open"}><summary>Never miss · ${esc(r.code||"")}<span>${rm[0]}/${rm[1]} must-knows checked across ${(r.skills||[]).length} ${esc(l("skill"))}s</span></summary>
    ${(r.never||[]).length?`<ul>${r.never.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${r.exit?`<div class="exit"><span class="lbl">Exit outcome · </span>${esc(r.exit)}</div>`:""}</details>`:"";
  let lastG=null;
  const gstat=k=>{const sk=list.filter(({rid,s})=>(q?rid:(s.group||"Other"))===k).map(x=>x.s);const [d,n]=sk.reduce((a,s)=>{const [x,y]=mustStat(s);return [a[0]+x,a[1]+y];},[0,0]);return `${sk.length} ${esc(l("skill"))}${sk.length>1?"s":""} · ✓${d}/${n}`;};
  const slots=list.map(({rid,s},i)=>{const [d,n]=mustStat(s),fc=(s.files||[]).length,sc=sSched(s);
    const gk=q?rid:(s.group||"Other"), hd=gk!==lastG?`<div class="ghd">${esc(q?(S.regions[rid].name):gk)}<span>${gstat(gk)}</span></div>`:"";lastG=gk;
    return hd+`<div class="slot ${esc(s.status||"locked")} ${sel.skill===s.id?"sel":""} ${animGrid&&i<12?"stagger":""}" style="--i:${i}" data-tier="${esc(s.tier)}" data-rid="${esc(rid)}" data-sid="${esc(s.id)}" draggable="true" tabindex="0" role="button" aria-label="${esc(s.name)}" title="${esc(s.why||"")}">
      <div class="srow"><span class="tier">${esc(s.tier)}</span><span class="st ${esc(s.status)}">${esc(s.status||"locked")}</span></div>
      <div class="srow" style="justify-content:flex-start;gap:10px"><div class="glyph">${esc(glyph(s.name))}</div><div class="sname">${esc(s.name)}</div></div>
      <div class="sfoot"><span class="sflag">${["behind","overdue","soon"].includes(sc.k)?`<span class="flag ${sc.k}">${sc.t}</span>`:""}</span><div class="pbar"><i style="width:${s.progress||0}%"></i></div>
      <div class="smeta"><span class="sphase">${winLabel(s)}</span><span>${fc?`<span class="fcount">${fc} file${fc>1?"s":""}</span> · `:""}✓${d}/${n} · <span class="spct">${s.progress||0}%</span></span></div></div></div>`;}).join("");
  animGrid=false;
  const keep=c.scrollTop;
  c.innerHTML=head+never+chips+`<div class="grid" id="grid">${slots}${q?"":`<button class="addslot" id="addSkill">+ Add ${esc(l("skill"))}</button>`}</div>`+(q?"":`<div style="padding:0 16px 20px"><div class="att" id="rAtt"></div></div>`);
  c.scrollTop=keep;
  if(!q)mountAtt($("#rAtt"),r,{hint:`${esc(L("region"))} files: syllabi, cheat sheets, diagrams for ${esc(r.name)}. Drop them here or use Add files.`,onChange:renderRail});
  if(!list.length){const pristine=!q&&filter.tier==="all"&&filter.status==="all"&&filter.when==="all";$("#grid").insertAdjacentHTML("afterbegin",`<div class="note" style="grid-column:1/-1">${pristine?`This ${esc(l("region"))} is empty. Add your first ${esc(l("skill"))}: something you want to be able to do, with the must-knows that prove it.`:"Nothing matches. Try another word or clear the filters."}</div>`);}
  $$(".chip[data-tier]",c).forEach(b=>b.onclick=()=>{filter.tier=b.dataset.tier;renderCenter();});
  $$(".chip[data-status]",c).forEach(b=>b.onclick=()=>{filter.status=b.dataset.status;renderCenter();});
  $$(".chip[data-when]",c).forEach(b=>b.onclick=()=>{filter.when=b.dataset.when;renderCenter();});
  if($("#never"))$("#never").ontoggle=e=>{const c=!e.target.open;if(!!S.prefs.neverClosed!==c){S.prefs.neverClosed=c;save();}};
  if(!q){
    const bind=(id,key,tr=x=>x)=>{const el=$("#"+id);el.oninput=()=>{r[key]=tr(el.value);save();renderRail();};};
    bind("rName","name");bind("rDesc","desc");bind("rCode","code",v=>v.toUpperCase());bind("rColor","color");
    $("#addSkill").onclick=addSkill;
    if($("#rDel"))$("#rDel").onclick=()=>{confirmKey="region:"+sel.region;renderCenter();};
    if($("#rDelYes"))$("#rDelYes").onclick=()=>{const reg=S.regions[sel.region];(reg.skills||[]).forEach(s=>unlinkSkill(s.id));purge(reg);delete S.regions[sel.region];animGrid=true;confirmKey=null;sel.region=ordered()[0]?.[0]||null;sel.skill=null;save();toast(L("region")+" deleted");renderInv();};
    if($("#rDelNo"))$("#rDelNo").onclick=()=>{confirmKey=null;renderCenter();};
  }
  $$(".slot",c).forEach(el=>{
    const {rid,sid}=el.dataset;
    el.onclick=()=>{if(sel.skill===sid&&sel.region===rid)return;
      $$(".slot.sel").forEach(x=>x.classList.remove("sel"));el.classList.add("sel");
      sel.skill=sid;sel.region=rid;confirmKey=null;$("#inspWrap").hidden=false;requestAnimationFrame(renderInsp);};
    el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();el.click();}};
    el.ondragstart=e=>{e.dataTransfer.setData("text/plain","skill:"+rid+"|"+sid);el.classList.add("dragging");};
    el.ondragend=()=>el.classList.remove("dragging");
    el.ondragover=e=>{e.preventDefault();el.classList.add("dropbefore");};
    el.ondragleave=()=>el.classList.remove("dropbefore");
    el.ondrop=e=>{e.preventDefault();el.classList.remove("dropbefore");const d=e.dataTransfer.getData("text/plain");
      if(!d.startsWith("skill:"))return;const [from,fsid]=d.slice(6).split("|");if(fsid===sid)return;
      const fr=S.regions[from],tr=S.regions[rid];if(!fr||!tr)return;
      flip("#grid .slot","sid",()=>{const i=fr.skills.findIndex(s=>s.id===fsid);const [s]=fr.skills.splice(i,1);
        tr.skills.splice(tr.skills.findIndex(x=>x.id===sid),0,s);renderInv();});save();};
  });
}
export function renderInsp(){
  const box=$("#insp"), s=findSkill(sel.region,sel.skill);
  $("#inspWrap").hidden=matchMedia("(max-width:1100px)").matches?!s:false;
  if(!s){box.innerHTML=`<div class="empty"><h3>Select a ${esc(l("skill"))}</h3><p>Pick any slot to see its schedule, sources and what it links to. Drag slots to reorder them, or drop one on a ${esc(l("region"))} in the list to move it.</p></div>`;return;}
  const sc=sSched(s), ref="s:"+s.id, idx=skillIndex(), [md,mn]=mustStat(s);
  const unready=(s.prereqs||[]).map(i=>idx[i]?.s).filter(p=>p&&p.status!=="mastered"&&(p.progress||0)<50);
  const unlocks=allSkills().map(x=>x.s).filter(x=>(x.prereqs||[]).includes(s.id));
  const provers=S.quests.filter(q=>q.proves.includes(s.id)), posts=S.posts.filter(p=>p.skills.includes(s.id)), duties=S.duties.filter(d=>d.skills.includes(s.id));
  const others=ordered().map(([id,r])=>`<option value="${esc(id)}" ${id===sel.region?"selected":""}>${esc(r.name)}</option>`).join("");
  const ck=confirmKey==="skill:"+s.id, fresh=lastInsp!==s.id;lastInsp=s.id;
  const keep=box.scrollTop;
  box.innerHTML=`<div class="insp ${fresh?"enter":""}">
    <input class="in title" id="sName" value="${esc(s.name)}" aria-label="Skill name">
    ${s.why?`<div class="why">${esc(s.why)}</div>`:""}
    <div class="row2">
      <div class="field"><label for="sTier">Tier</label><select class="sel" id="sTier">${TIERS.map(t=>`<option ${s.tier===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label for="sStatus">Status</label><select class="sel" id="sStatus">${STATUSES.map(t=>`<option ${s.status===t?"selected":""}>${t}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label for="sProg">Progress <span class="pv" id="pv">${s.progress||0}%</span></label>
      <input type="range" class="range" id="sProg" min="0" max="100" step="5" value="${s.progress||0}">
      <span class="note">Checking must-knows sets progress automatically; drag to override.</span></div>
    <div class="field"><span class="lbl">Must know · ${md}/${mn}</span>
      <div class="srcs" id="musts">${(s.musts||[]).map(x=>`<div class="src ${x.done?"done":""}" data-id="${esc(x.id)}" style="grid-template-columns:auto 1fr auto"><input type="checkbox" class="chk" ${x.done?"checked":""} aria-label="I know: ${esc(x.text)}"><span class="stitle">${esc(x.text)}</span><button class="x" aria-label="Remove ${esc(x.text)}">✕</button></div>`).join("")||`<div class="note">No must-knows yet. List the concepts that define mastery of this skill.</div>`}</div>
      <form class="inline" id="addMust"><input class="in" id="mText" placeholder="Add a concept you must know" required aria-label="New must-know"><button class="btn" type="submit">+ Add</button></form></div>
    <div class="field"><span class="lbl">Prerequisites${unready.length?` · <span class="flag behind">${unready.length} not ready</span>`:""}</span><div id="sPre"></div>
      ${unlocks.length?`<span class="note">Unlocks</span><div class="chips">${unlocks.map(u=>`<span class="lchip"><button class="lgo" data-s="${esc(u.id)}">${esc(u.name)}</button></span>`).join("")}</div>`:""}</div>
    <div class="field"><span class="lbl">When · <span class="flag ${sc.k}">${esc(sc.t)}</span></span>
      <div class="row2">
        <div class="field"><label for="sStart">Start month</label><input type="number" class="in" id="sStart" min="1" max="${M}" value="${s.start}"></div>
        <div class="field"><label for="sEnd">End month</label><input type="number" class="in" id="sEnd" min="1" max="${M}" value="${s.cont?M:s.end}" ${s.cont?"disabled":""}></div></div>
      <div class="row2">
        <div class="field"><label for="sHpw">Hours / week planned</label><input type="number" class="in" id="sHpw" min="0" max="40" step="0.25" value="${esc(s.hpw??"")}"></div>
        <div class="field"><label for="sMove">Region</label><select class="sel" id="sMove">${others}</select></div></div>
      <div class="field"><label for="sGroup">Group within the region</label><input class="in" id="sGroup" list="sGroups" value="${esc(s.group||"")}" placeholder="e.g. Basics"><datalist id="sGroups">${[...new Set((S.regions[sel.region].skills||[]).map(x=>x.group).filter(Boolean))].map(g=>`<option value="${esc(g)}">`).join("")}</datalist></div>
      <label class="note" style="display:flex;gap:8px;align-items:center;font:12px var(--body);letter-spacing:0;text-transform:none;color:var(--dim)"><input type="checkbox" class="chk" id="sCont" ${s.cont?"checked":""}>Ongoing: runs from the start month to the end of the plan and is never overdue</label>
      <div class="note">${winDates(s)}${sc.exp!=null?` · by now you'd expect about ${Math.round(sc.exp)}%`:""}</div></div>
    <div class="field"><span class="lbl">Connections</span><div class="linked">
      <div class="kv"><span>Time logged</span><span>${fmtMin(minFor(ref))}</span></div>
      <div class="field"><span class="note">Proven by ${esc(l("quests"))}</span><div class="chips">${provers.map(q=>`<span class="lchip"><button class="lgo" data-q="${esc(q.id)}">${esc(q.code)} · ${esc(q.name)}</button></span>`).join("")}
        <select class="sel mini" id="sQuest" aria-label="Link to a ${esc(l("quest"))}"><option value="">+ Link ${esc(l("quest"))}…</option>${S.quests.filter(q=>!q.proves.includes(s.id)).map(q=>`<option value="${esc(q.id)}">${esc(q.code+" · "+q.name)}</option>`).join("")}</select></div></div>
      ${posts.length?`<div class="field"><span class="note">${esc(L("blog"))}</span><div class="chips">${posts.map(p=>`<span class="lchip"><button class="lgo" data-p="${esc(p.id)}">${esc(p.title||"Untitled")}</button></span>`).join("")}</div></div>`:""}
      ${duties.length?`<div class="field"><span class="note">Used in ${esc(l("duties"))}</span><div class="chips">${duties.map(d=>`<span class="lchip"><button class="lgo" data-d="${esc(d.id)}">${esc(d.title||"Untitled duty")}</button></span>`).join("")}</div></div>`:""}
      <div class="btns"><button class="btn" id="sFocus" ${S.timer?"disabled":""}>${S.timer?"Focus running…":"Start focus"}</button><button class="btn" id="sWrite">Write a ${esc(l("post"))}</button></div>
    </div></div>
    ${(()=>{const al=S.atlasDef.items.filter(a=>a.skill===s.id);if(!al.length)return "";const k=al.filter(a=>(S.atlas[a.id]||0)>0).length;
      return `<div class="field"><span class="lbl">${esc(L("atlas"))} · ${k}/${al.length} known</span><div class="rows">${al.map(a=>atlasRow(a,true)).join("")}</div></div>`;})()}
    <div class="field"><label for="sBuild">Build to prove it</label><textarea class="ta" id="sBuild" style="min-height:60px">${esc(s.build||"")}</textarea></div>
    <div class="field"><span class="lbl">Sources · ${(s.sources||[]).filter(x=>x.done).length}/${(s.sources||[]).length} done · drag to reorder</span>
      <div class="srcs" id="srcs">${(s.sources||[]).map(x=>`<div class="src ${x.done?"done":""}" draggable="true" data-id="${esc(x.id)}">
        <span class="handle" aria-hidden="true">⋮⋮</span><input type="checkbox" class="chk" ${x.done?"checked":""} aria-label="Done: ${esc(x.title)}">
        <span class="stitle"><span class="stype">${esc(x.type)}</span> ${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`:esc(x.title)}</span>
        <button class="x" title="Remove source" aria-label="Remove ${esc(x.title)}">✕</button></div>`).join("")||`<div class="note">No sources yet. Add the first one below.</div>`}</div></div>
    <form class="addsrc" id="addSrc">
      <select class="sel" id="nType" aria-label="Source type">${TYPES.map(t=>`<option>${t}</option>`).join("")}</select>
      <input class="in" id="nTitle" placeholder="Title (book, course, paper…)" required aria-label="Source title">
      <input class="in full" id="nUrl" placeholder="Link (optional)" aria-label="Source link">
      <button class="btn primary full" type="submit">+ Add source</button>
    </form>
    <div class="field"><label for="sNotes">Notes</label><textarea class="ta" id="sNotes" placeholder="What clicked, what broke, what to revisit">${esc(s.notes||"")}</textarea></div>
    <div class="att" id="sAtt"></div>
    ${ck?`<div class="confirm"><span>Delete this ${esc(l("skill"))} and its sources?</span><button class="btn danger" id="sDelYes">Delete</button><button class="btn" id="sDelNo">Keep</button></div>`:`<button class="btn danger" id="sDel" style="align-self:flex-start">Delete ${esc(l("skill"))}</button>`}
  </div>`;
  box.scrollTop=fresh?0:keep;
  const slotEl=()=>document.querySelector(`.slot[data-sid="${CSS.escape(s.id)}"]`);
  const bindIn=(id,key,after)=>{$("#"+id).oninput=e=>{s[key]=e.target.value;save();after&&after();};};
  bindIn("sName","name",()=>{const el=slotEl();if(el){el.querySelector(".sname").textContent=s.name;el.querySelector(".glyph").textContent=glyph(s.name);}});
  bindIn("sBuild","build");bindIn("sNotes","notes");
  mountAtt($("#sAtt"),s,{hint:"Notes, screenshots, PDFs, result plots, code for this skill. Drop, paste or Add files.",onChange:renderCenter});
  $("#sTier").onchange=e=>{s.tier=e.target.value;save();renderCenter();renderHud();};
  $("#sStatus").onchange=e=>{s.status=e.target.value;if(s.status==="mastered")s.progress=100;save();renderInv();};
  let rafP=0;
  $("#sProg").oninput=e=>{s.progress=+e.target.value;$("#pv").textContent=s.progress+"%";
    if(s.progress>0&&s.status==="locked")s.status="active";if(s.progress===100)s.status="mastered";else if(s.status==="mastered")s.status="active";
    $("#sStatus").value=s.status;save();
    cancelAnimationFrame(rafP);rafP=requestAnimationFrame(()=>{const el=slotEl();if(el){
      el.querySelector(".pbar i").style.width=s.progress+"%";
      el.classList.remove("locked","active","mastered");el.classList.add(s.status);
      const st=el.querySelector(".st");st.className="st "+s.status;st.textContent=s.status;el.querySelector(".spct").textContent=s.progress+"%";}
      renderHud();});};
  $("#sProg").onchange=()=>{renderRail();renderCenter();renderInsp();};
  const syncMusts=()=>{const [d,n]=mustStat(s);if(!n)return;s.progress=Math.round(d/n*100/5)*5;
    if(s.progress>0&&s.status==="locked")s.status="active";if(s.progress===100)s.status="mastered";else if(s.status==="mastered")s.status="active";};
  $$("#musts .src").forEach(row=>{const id=row.dataset.id,m=s.musts.find(x=>x.id===id);
    row.querySelector(".chk").onchange=e=>{m.done=e.target.checked;syncMusts();save();renderRail();renderCenter();renderInsp();renderHud();};
    row.querySelector(".x").onclick=()=>{s.musts=s.musts.filter(x=>x.id!==id);syncMusts();save();renderCenter();renderInsp();renderHud();};});
  $("#addMust").onsubmit=e=>{e.preventDefault();const v=$("#mText").value.trim();if(!v)return;s.musts.push({id:uid("mu"),text:v,done:false});syncMusts();save();renderCenter();renderInsp();renderHud();setTimeout(()=>$("#mText")?.focus(),0);};
  skillPicker($("#sPre"),s.prereqs,()=>defer(()=>{renderInsp();}),{exclude:s.id,badge:p=>`<span class="mbadge ${p.status!=="mastered"&&(p.progress||0)<50?"lo":""}"> · ${p.progress||0}%</span>`});
  $$("[data-s]",box).forEach(b=>b.onclick=()=>goSkill(b.dataset.s));
  $("#sHpw").onchange=e=>{s.hpw=Math.max(0,+e.target.value||0);save();};
  const setWin=()=>{const a=clampM($("#sStart").value),b=s.cont?M:Math.max(a,clampM($("#sEnd").value));s.start=a;s.end=b;save();defer(()=>{renderCenter();renderInsp();});};
  $("#sStart").onchange=setWin;$("#sEnd").onchange=setWin;
  $("#sCont").onchange=e=>{s.cont=e.target.checked;if(s.cont)s.end=M;save();defer(()=>{renderCenter();renderInsp();});};
  $("#sMove").onchange=e=>moveSkillToRegion(sel.region,s.id,e.target.value);
  $("#sGroup").onchange=e=>{s.group=e.target.value.trim();save();defer(()=>{renderCenter();renderInsp();});};
  bindAtlas(box,()=>{renderInsp();renderHud();});
  $$("[data-q]",box).forEach(b=>b.onclick=()=>goQuest(b.dataset.q));
  $$("[data-p]",box).forEach(b=>b.onclick=()=>goPost(b.dataset.p));
  $$("[data-d]",box).forEach(b=>b.onclick=()=>goDuty(b.dataset.d));
  $("#sQuest").onchange=e=>{const q=S.quests.find(q=>q.id===e.target.value);if(q){q.proves.push(s.id);save();renderInsp();toast(`Linked to ${q.code}`);}};
  $("#sFocus").onclick=()=>startTimer(ref);
  $("#sWrite").onclick=()=>addPost({skills:[s.id],title:"Notes on "+s.name});
  $("#addSrc").onsubmit=e=>{e.preventDefault();const t=$("#nTitle").value.trim();if(!t)return;
    (s.sources ||= []).push({id:uid("s"),type:$("#nType").value,title:t,url:$("#nUrl").value.trim(),done:false});
    save();renderInsp();renderCenter();renderHud();$("#nTitle").focus();toast("Source added");};
  $$("#srcs .src").forEach(row=>{
    const id=row.dataset.id, src=s.sources.find(x=>x.id===id);
    row.querySelector(".chk").onchange=e=>{src.done=e.target.checked;save();row.classList.toggle("done",src.done);renderCenter();renderHud();};
    row.querySelector(".x").onclick=()=>{s.sources=s.sources.filter(x=>x.id!==id);save();renderInsp();renderCenter();renderHud();};
    row.ondragstart=e=>{e.dataTransfer.setData("text/plain","src:"+id);row.classList.add("dragging");};
    row.ondragend=()=>row.classList.remove("dragging");
    row.ondragover=e=>{e.preventDefault();row.classList.add("dropbefore");};
    row.ondragleave=()=>row.classList.remove("dropbefore");
    row.ondrop=e=>{e.preventDefault();row.classList.remove("dropbefore");const d=e.dataTransfer.getData("text/plain");if(!d.startsWith("src:"))return;
      const fid=d.slice(4);if(fid===id)return;
      flip("#srcs .src","id",()=>{const i=s.sources.findIndex(x=>x.id===fid);const [m]=s.sources.splice(i,1);
        s.sources.splice(s.sources.findIndex(x=>x.id===id),0,m);renderInsp();});save();};
  });
  if($("#sDel"))$("#sDel").onclick=()=>{confirmKey="skill:"+s.id;renderInsp();};
  if($("#sDelNo"))$("#sDelNo").onclick=()=>{confirmKey=null;renderInsp();};
  if($("#sDelYes"))$("#sDelYes").onclick=()=>{const r=S.regions[sel.region];purge(s);unlinkSkill(s.id);r.skills=r.skills.filter(x=>x.id!==s.id);sel.skill=null;confirmKey=null;save();toast(L("skill")+" deleted");renderInv();};
}
export function addRegion(){
  const id=uid("r");
  S.regions[id]={name:"New "+L("region"),code:"NEW",color:"#38d4ff",desc:"",order:Object.keys(S.regions).length,skills:[],files:[]};
  sel.region=id;sel.skill=null;filter.q="";$("#q").value="";save();setView("inv");
  setTimeout(()=>{const el=$("#rName");el&&(el.focus(),el.select());},30);
}
export function addSkill(){
  const r=S.regions[sel.region];if(!r)return;const m=Math.max(1,Math.min(M,curM()));
  const s={id:uid("k"),name:"New "+L("skill"),group:"",tier:"foundation",start:m,end:Math.min(M,m+2),hpw:2,why:"",musts:[],prereqs:[],status:"locked",progress:0,notes:"",build:S.pack.defaults?.build||"",sources:[],files:[]};
  (r.skills ||= []).push(s);sel.skill=s.id;save();renderInv();
  setTimeout(()=>{const el=$("#sName");el&&(el.focus(),el.select());},30);
}
export function goSkill(id){const x=skillIndex()[id];if(!x)return toast(`That ${l("skill")} no longer exists`);
  sel.region=x.rid;sel.skill=id;filter={tier:"all",status:"all",when:"all",q:""};$("#q").value="";animGrid=true;setView("inv");
  requestAnimationFrame(()=>document.querySelector(`.slot[data-sid="${CSS.escape(id)}"]`)?.scrollIntoView({block:"center",behavior:motionOn()?"smooth":"auto"}));}
export function resetInv(){sel={region:null,skill:null};}
export function initInventory(){
  let qT=0;$("#q").oninput=e=>{clearTimeout(qT);qT=setTimeout(()=>{filter.q=e.target.value;animGrid=true;renderRail();renderCenter();},140);};
  $("#closeInsp").onclick=()=>{sel.skill=null;renderInsp();renderCenter();};
  $("#addRegion").onclick=addRegion;
}
