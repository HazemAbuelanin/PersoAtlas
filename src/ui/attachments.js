import { S } from "../core/state.js";
import { $, $$, esc, toast, today, uid } from "../core/util.js";
import { IDB } from "../storage/idb.js";
import { save } from "../storage/save.js";
import { renderHud, view } from "./nav.js";
import { setSnapAvatar } from "./game.js";
import { renderBio } from "../views/bio.js";
export const urlCache={};
export const isImg=t=>/^image\//.test(t||"");
export const extOf=n=>{const p=(n||"").split(".");return (p.length>1?p.pop():"FILE").slice(0,4).toUpperCase();};
export const fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round((b||0)/1024))+" KB";
export async function fileURL(id){if(urlCache[id])return urlCache[id];const rec=await IDB.get(id,"files").catch(()=>null);if(!rec)return null;return urlCache[id]=URL.createObjectURL(rec.blob);}
export function forget(id){IDB.del(id,"files").catch(()=>{});if(urlCache[id]){URL.revokeObjectURL(urlCache[id]);delete urlCache[id];}}
export async function addFiles(owner,list){
  const added=[];
  for(const f of list){
    if(f.size>250*1024*1024){toast(`${f.name} is larger than 250 MB, so it was skipped`);continue;}
    const id=uid("f"), name=f.name||`pasted-${Date.now()}.png`;
    try{await IDB.set(id,{blob:f,name,type:f.type||""},"files");}catch(e){toast(`Couldn't store ${name}: this browser's storage is full`);continue;}
    const ref={id,name,type:f.type||"",size:f.size,added:today()};(owner.files ||= []).push(ref);added.push(ref);
  }
  if(added.length){save();toast(added.length===1?`Attached ${added[0].name}`:`Attached ${added.length} files`);}
  return added;
}
export async function removeFile(owner,id){owner.files=(owner.files||[]).filter(f=>f.id!==id);forget(id);save();}
export function collectRefs(o,acc=[]){
  if(!o||typeof o!=="object")return acc;
  if(Array.isArray(o)){o.forEach(x=>collectRefs(x,acc));return acc;}
  if(Array.isArray(o.files))o.files.forEach(f=>f&&f.id&&acc.push(f));
  if(typeof o.avatar==="string"&&o.avatar)acc.push({id:o.avatar,name:"profile.jpg",type:"image/jpeg"});
  for(const k in o){if(k!=="files"&&o[k]&&typeof o[k]==="object")collectRefs(o[k],acc);}
  return acc;
}
export const collectFiles=o=>collectRefs(o).map(r=>r.id);
export const purge=o=>collectFiles(o).forEach(forget);
export async function downloadFile(id){const rec=await IDB.get(id,"files");if(!rec)return toast("That file is missing from this browser");
  const a=document.createElement("a");a.href=await fileURL(id);a.download=rec.name||"file";document.body.appendChild(a);a.click();a.remove();}
export let pickTarget=null, lastZone=null;
export function pickFiles(owner,done){pickTarget={owner,done};$("#attFile").click();}
export function mountAtt(el,owner,opts={}){
  if(!el)return;
  const draw=()=>{
    const fs=owner.files||[];
    el.innerHTML=`<div class="atthead"><span class="lbl">Attachments · <span class="fcount">${fs.length}</span></span><button class="btn ghost" type="button" data-add>+ Add files</button></div>
      ${fs.length?`<div class="attgrid">${fs.map(f=>`<div class="atile" tabindex="0" data-id="${esc(f.id)}" title="${esc(f.name)} · ${fmtSize(f.size)}">
        ${isImg(f.type)?`<img alt="${esc(f.name)}" data-src="${esc(f.id)}">`:`<span class="ext">${esc(extOf(f.name))}</span>`}<span class="an">${esc(f.name)}</span>
        <span class="acts">${opts.insert&&isImg(f.type)?`<button type="button" data-ins title="Insert into the post">Insert</button>`:""}<button type="button" data-dl title="Download" aria-label="Download ${esc(f.name)}">↓</button><button type="button" class="del" data-del title="Remove" aria-label="Remove ${esc(f.name)}">✕</button></span></div>`).join("")}</div>`:""}
      <div class="atthint">${opts.hint||"Drop files here, paste an image, or use Add files."}</div>`;
    $$("img[data-src]",el).forEach(async img=>{const u=await fileURL(img.dataset.src);if(u)img.src=u;});
    el.querySelector("[data-add]").onclick=()=>pickFiles(owner,after);
    $$(".atile",el).forEach(t=>{const id=t.dataset.id;
      t.onclick=e=>{if(!e.target.closest(".acts"))openViewer(owner.files,id);};
      t.onkeydown=e=>{if(e.key==="Enter"&&e.target===t)openViewer(owner.files,id);};
      t.querySelector("[data-dl]").onclick=()=>downloadFile(id);
      const ins=t.querySelector("[data-ins]");if(ins)ins.onclick=()=>opts.insert(owner.files.find(f=>f.id===id));
      const del=t.querySelector("[data-del]");
      del.onclick=async()=>{if(!del.classList.contains("arm")){del.classList.add("arm");del.textContent="Remove?";setTimeout(()=>{if(del.isConnected){del.classList.remove("arm");del.textContent="✕";}},3000);return;}
        await removeFile(owner,id);toast("File removed");after();};
    });
  };
  const after=()=>{draw();opts.onChange&&opts.onChange();renderHud();};
  el.tabIndex=0;
  el.ondragover=e=>{if([...e.dataTransfer.types].includes("Files")){e.preventDefault();el.classList.add("over");}};
  el.ondragleave=e=>{if(!el.contains(e.relatedTarget))el.classList.remove("over");};
  el.ondrop=async e=>{if(!e.dataTransfer.files.length)return;e.preventDefault();e.stopPropagation();el.classList.remove("over");await addFiles(owner,e.dataTransfer.files);after();};
  lastZone={el,owner,after,opts};
  draw();
}
export let lbList=[],lbIdx=0;
export async function openViewer(list,id){lbList=list||[];lbIdx=Math.max(0,lbList.findIndex(f=>f.id===id));$("#lb").hidden=false;await showLb();$("#lbClose").focus();}
export async function showLb(){
  const f=lbList[lbIdx];if(!f)return closeLb();
  $("#lbName").textContent=`${f.name} · ${fmtSize(f.size)}`;$("#lbPos").textContent=lbList.length>1?`${lbIdx+1} / ${lbList.length}`:"";
  $("#lbPrev").hidden=$("#lbNext").hidden=lbList.length<2;
  const body=$("#lbBody");const u=await fileURL(f.id);
  if(!u){body.innerHTML=`<div class="empty"><h3>File missing</h3><p>This file isn't stored in this browser. Load your backup folder or import a backup that contains it.</p></div>`;return;}
  const t=f.type||"", n=(f.name||"").toLowerCase();
  if(isImg(t))body.innerHTML=`<img alt="${esc(f.name)}" src="${u}">`;
  else if(t==="application/pdf"||n.endsWith(".pdf"))body.innerHTML=`<iframe title="${esc(f.name)}" src="${u}"></iframe>`;
  else if(/^video\//.test(t))body.innerHTML=`<video controls src="${u}"></video>`;
  else if(/^audio\//.test(t))body.innerHTML=`<audio controls src="${u}"></audio>`;
  else if(/^text\//.test(t)||/\.(md|txt|json|csv|py|cpp|cc|h|hpp|c|js|ts|yaml|yml|toml|xml|sh|launch|urdf|xacro|tex|bib|log)$/.test(n)){
    const rec=await IDB.get(f.id,"files");const txt=await rec.blob.text();body.innerHTML=`<pre></pre>`;body.firstChild.textContent=txt.length>400000?txt.slice(0,400000)+"\n… (truncated preview)":txt;}
  else body.innerHTML=`<div class="empty"><h3>${esc(extOf(f.name))} file</h3><p>There's no in-browser preview for this type. Download it to open it in its own app.</p><button class="btn primary" id="lbDl2">Download</button></div>`;
  const d2=$("#lbDl2");if(d2)d2.onclick=()=>downloadFile(f.id);
}
export function closeLb(){$("#lb").hidden=true;$("#lbBody").innerHTML="";}
export async function setAvatar(file){
  if(!file||!isImg(file.type))return toast("Choose an image file for your profile picture");
  let blob=file;
  try{const bmp=await createImageBitmap(file);const s=Math.min(bmp.width,bmp.height),c=document.createElement("canvas");c.width=c.height=512;
    c.getContext("2d").drawImage(bmp,(bmp.width-s)/2,(bmp.height-s)/2,s,s,0,0,512,512);blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.9))||file;
    const t=document.createElement("canvas");t.width=t.height=128;t.getContext("2d").drawImage(c,0,0,128,128);setSnapAvatar(t.toDataURL("image/jpeg",.82));}catch(e){}
  const id=uid("a");
  try{await IDB.set(id,{blob,name:"profile.jpg",type:"image/jpeg"},"files");}catch(e){return toast("Couldn't save the picture: storage is full");}
  if(S.bio.avatar)forget(S.bio.avatar);
  S.bio.avatar=id;save();renderAvatar();if(view==="bio")renderBio();toast("Profile picture updated");
}
export const initials=()=>(S.bio.name||"?").split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
export async function avatarHTML(){const u=S.bio.avatar?await fileURL(S.bio.avatar):null;return u?`<img alt="${esc(S.bio.name)}" src="${u}">`:esc(initials());}
export async function renderAvatar(){$("#hudAva").innerHTML=await avatarHTML();}
export function hydrateImgs(root){$$("img[data-src]",root).forEach(async img=>{const u=await fileURL(img.dataset.src);if(u)img.src=u;else img.alt="(missing image: "+img.alt+")";});}
export function initLightbox(){
  $("#lbClose").onclick=closeLb;$("#lbDl").onclick=()=>lbList[lbIdx]&&downloadFile(lbList[lbIdx].id);
  $("#lbPrev").onclick=()=>{lbIdx=(lbIdx-1+lbList.length)%lbList.length;showLb();};
  $("#lbNext").onclick=()=>{lbIdx=(lbIdx+1)%lbList.length;showLb();};
  $("#lb").onclick=e=>{if(e.target.id==="lb"||e.target.id==="lbBody")closeLb();};
}
