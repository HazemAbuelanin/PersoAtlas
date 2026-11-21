import { POST_STATUS } from "../core/config.js";
import { L, l } from "../core/labels.js";

import { S } from "../core/state.js";
import { $, $$, defer, esc, toast, today, uid } from "../core/util.js";
import { copy } from "../storage/backup.js";
import { save } from "../storage/save.js";
import { addFiles, hydrateImgs, isImg, mountAtt, purge } from "../ui/attachments.js";
import { skillPicker } from "../ui/links.js";
import { md } from "../ui/md.js";
import { renderHud, setView, view } from "../ui/nav.js";
export let postSel=null, postFilter="all", postMode="write", postConfirm=false, postFresh=true;
export const wc=t=>(String(t||"").trim().match(/\S+/g)||[]).length;
export function renderBlog(){
  const posts=[...S.posts].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("#blogFilters").innerHTML=["all",...POST_STATUS].map(t=>`<button class="chip ${postFilter===t?"on":""}" data-f="${t}">${t==="all"?"All":t}</button>`).join("");
  $$("#blogFilters .chip").forEach(b=>b.onclick=()=>{postFilter=b.dataset.f;renderBlog();});
  const vis=posts.filter(p=>postFilter==="all"||p.status===postFilter);
  if(!postSel||!S.posts.find(p=>p.id===postSel))postSel=vis[0]?.id||null;
  $("#postList").innerHTML=vis.map(p=>{const q=S.quests.find(x=>x.id===p.quest);return `<button class="litem ${p.id===postSel?"on":""}" data-id="${esc(p.id)}">
    <span class="ltitle">${esc(p.title||"Untitled")}</span>
    <span class="lmeta"><span class="st ${esc(p.status)}">${esc(p.status)}</span><span>${esc(p.date||"")}</span><span>${wc(p.body)} words</span>${q?`<span class="stype">${esc(q.code)}</span>`:""}${p.skills.length?`<span>${p.skills.length} skill${p.skills.length>1?"s":""}</span>`:""}${(p.files||[]).length?`<span class="fcount">${p.files.length} files</span>`:""}</span></button>`;}).join("")
    ||`<div class="empty"><h3>No ${esc(l("post"))}s here</h3><p>Write up each finished topic or project. Start with an idea and grow it into a draft.</p></div>`;
  $$("#postList .litem").forEach(b=>b.onclick=()=>{if(postSel!==b.dataset.id)postFresh=true;postSel=b.dataset.id;postConfirm=false;renderBlog();});
  renderPostEd();
}
export function renderPostEd(){
  const box=$("#postEd"), p=S.posts.find(x=>x.id===postSel);
  if(!p){box.innerHTML=`<div class="empty"><h3>${esc(L("blog"))}</h3><p>Write up each finished topic or project: what you learned, what you made, what failed. Create one to start writing.</p><button class="btn primary" id="emptyPost">+ ${esc(L("post"))}</button></div>`;$("#emptyPost").onclick=()=>addPost();return;}
  const fresh=postFresh;postFresh=false;
  box.innerHTML=`<div class="insp ${fresh?"enter":""}">
    <div class="edhead"><input class="in title" id="pTitle" value="${esc(p.title)}" aria-label="Post title" style="flex:1;min-width:200px">
      <div class="seg"><button data-m="write" class="${postMode==="write"?"on":""}">Write</button><button data-m="preview" class="${postMode==="preview"?"on":""}">Preview</button></div></div>
    <div class="row3">
      <div class="field"><label for="pDate">Date</label><input type="date" class="in" id="pDate" value="${esc(p.date||"")}"></div>
      <div class="field"><label for="pStatus">Status</label><select class="sel" id="pStatus">${POST_STATUS.map(s=>`<option ${p.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label for="pQuest">Quest</label><select class="sel" id="pQuest"><option value="">None</option>${S.quests.map(q=>`<option value="${esc(q.id)}" ${p.quest===q.id?"selected":""}>${esc(q.code+" · "+q.name)}</option>`).join("")}</select></div>
    </div>
    <div class="field"><span class="lbl">${esc(L("skill"))}s this ${esc(l("post"))} covers</span><div id="pSkills"></div></div>
    <div class="row2">
      <div class="field"><label for="pTags">Tags</label><input class="in" id="pTags" value="${esc(p.tags||"")}" placeholder="e.g. notes, results"></div>
      <div class="field"><label for="pUrl">Published link</label><input class="in" id="pUrl" value="${esc(p.url||"")}" placeholder="https://yourblog.com/post"></div>
    </div>
    ${postMode==="write"?`<div class="field"><label for="pBody">Body · Markdown · <span id="pWc">${wc(p.body)}</span> words</label><textarea class="ta tall" id="pBody" placeholder="## Problem&#10;&#10;## What I built&#10;&#10;## Results&#10;&#10;## What failed and why">${esc(p.body||"")}</textarea></div>`
      :`<article class="prose"><h1>${esc(p.title)}</h1><p class="note">${esc(p.date||"")}${p.tags?" · "+esc(p.tags):""}</p>${md(p.body)}</article>`}
    <div class="att" id="pAtt"></div>
    <div class="btns"><button class="btn" id="pCopy">Copy Markdown</button>${p.url?`<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">Open published ↗</a>`:""}
      ${postConfirm?`<span class="confirm"><span>Delete this ${esc(l("post"))}?</span><button class="btn danger" id="pDelYes">Delete</button><button class="btn" id="pDelNo">Keep</button></span>`:`<button class="btn danger" id="pDel">Delete</button>`}</div>
  </div>`;
  $$(".seg button",box).forEach(b=>b.onclick=()=>{postMode=b.dataset.m;renderPostEd();});
  const bind=(id,k,live)=>{const el=$("#"+id);if(!el)return;el.oninput=()=>{p[k]=el.value;save();if(k==="body")$("#pWc").textContent=wc(p.body);};el.onchange=()=>{if(live)defer(renderBlog);renderHud();};};
  bind("pTitle","title",true);bind("pDate","date",true);bind("pTags","tags");bind("pUrl","url",true);bind("pBody","body",false);
  $("#pStatus").onchange=e=>{p.status=e.target.value;if(p.status==="published"&&!p.date)p.date=today();save();renderBlog();renderHud();};
  $("#pQuest").onchange=e=>{p.quest=e.target.value;save();renderBlog();};
  skillPicker($("#pSkills"),p.skills,()=>renderBlog());
  hydrateImgs(box);
  const insertImg=f=>{if(!f)return;const snip=`\n![${f.name.replace(/[\[\]]/g,"")}](att:${f.id})\n`;const ta=$("#pBody");
    if(ta){const a=ta.selectionStart??ta.value.length;p.body=ta.value.slice(0,a)+snip+ta.value.slice(ta.selectionEnd??a);ta.value=p.body;ta.selectionStart=ta.selectionEnd=a+snip.length;ta.focus();}
    else p.body=(p.body||"")+snip;
    save();if(!ta)renderPostEd();toast(`Image inserted into the ${l("post")}`);};
  mountAtt($("#pAtt"),p,{insert:insertImg,hint:`Figures, results, PDFs for this ${l("post")}. Drop or paste images; use Insert to place an image in the text.`,onChange:()=>renderBlog()});
  const ta=$("#pBody");
  if(ta)ta.onpaste=async e=>{const fs=[...(e.clipboardData?.files||[])].filter(f=>isImg(f.type));if(!fs.length)return;e.preventDefault();const added=await addFiles(p,fs);added.forEach(insertImg);};
  $("#pCopy").onclick=()=>copy(`# ${p.title}\n\n${p.body||""}`,"Markdown copied");
  if($("#pDel"))$("#pDel").onclick=()=>{postConfirm=true;renderPostEd();};
  if($("#pDelNo"))$("#pDelNo").onclick=()=>{postConfirm=false;renderPostEd();};
  if($("#pDelYes"))$("#pDelYes").onclick=()=>{purge(p);S.posts=S.posts.filter(x=>x.id!==p.id);postSel=null;postConfirm=false;save();toast(L("post")+" deleted");renderBlog();renderHud();};
}
export function addPost(extra={}){
  const p={id:uid("p"),title:"Untitled "+l("post"),date:today(),status:"idea",tags:"",url:"",body:"",skills:[],quest:"",files:[],...extra};
  S.posts.push(p);postSel=p.id;postMode="write";postFilter="all";postFresh=true;save();
  if(view!=="blog")setView("blog");else renderBlog();renderHud();
  setTimeout(()=>{const el=$("#pTitle");el&&(el.focus(),el.select());},30);
}
export function goPost(id){postSel=id;postFresh=true;postFilter="all";setView("blog");}
export function resetBlog(){postSel=null;}
