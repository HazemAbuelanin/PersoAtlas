import { APP_NAME } from "../core/config.js";
import { migrate } from "../core/model.js";
import { PACK, S, setState } from "../core/state.js";
import { toast } from "../core/util.js";
import { IDB } from "./idb.js";
import { persist, renderSaveChip } from "./save.js";
import { collectRefs } from "../ui/attachments.js";
import { resetUI, view } from "../ui/nav.js";
import { renderSettings, toggleSettings } from "../ui/settings.js";
import { renderNow } from "../views/now.js";
export let lastSync=0;
export let dirHandle=null, pendingDir=null, folderState="none", folderPrompt=null, syncing=false, syncAgain=false;
export const setFolderPrompt=v=>{folderPrompt=v;};
export const dirName=()=>(dirHandle||pendingDir)?.name||"folder";
export const safeName=n=>String(n).replace(/[\\/:*?"<>|\u0000-\u001f]/g,"_").slice(0,80);
export async function readFolderData(h){try{const fh=await h.getFileHandle("persoatlas-data.json");return JSON.parse(await (await fh.getFile()).text());}catch(e){return null;}}
export async function syncFolder(){
  if(!dirHandle||folderPrompt)return; if(syncing){syncAgain=true;return;} syncing=true;
  try{
    const fh=await dirHandle.getFileHandle("persoatlas-data.json",{create:true});const w=await fh.createWritable();
    await w.write(JSON.stringify({app:APP_NAME,saved:new Date().toISOString(),...S},null,1));await w.close();
    const fd=await dirHandle.getDirectoryHandle("files",{create:true});
    const want=new Map(collectRefs(S).map(r=>[r.id,r])), have=new Map();
    for await (const [name,e] of fd.entries()){if(e.kind==="file")have.set(name.split("__")[0],name);}
    for(const [id,r] of want){if(have.has(id))continue;const rec=await IDB.get(id,"files").catch(()=>null);if(!rec)continue;
      const nf=await fd.getFileHandle(`${id}__${safeName(r.name||rec.name||"file")}`,{create:true});const w2=await nf.createWritable();await w2.write(rec.blob);await w2.close();}
    for(const [id,name] of have){if(!want.has(id))await fd.removeEntry(name).catch(()=>{});}
    lastSync=Date.now();folderState="linked";
  }catch(e){if(e?.name==="NotAllowedError"){pendingDir=dirHandle;dirHandle=null;folderState="needs-permission";}else folderState="error";}
  syncing=false;renderSaveChip();if(syncAgain){syncAgain=false;syncFolder();}
}
export async function checkFolder(auto){
  const obj=await readFolderData(dirHandle);
  if(obj&&obj.regions){
    const fu=obj.meta?.updated||"", lu=S.meta.updated||"";
    if(fu===lu){await syncFolder();return;}
    const newer=fu>lu;
    if(auto&&!newer){await syncFolder();return;}
    folderPrompt={obj,newer,auto,reload:false};toggleSettings(true);return;
  }
  await syncFolder();if(!auto)toast("Folder linked. Every change now syncs to it.");
}
export async function initFolder(){
  if(!("showDirectoryPicker" in window)){folderState="unsupported";return renderSaveChip();}
  const h=await IDB.get("dir").catch(()=>null);if(!h)return renderSaveChip();
  let p="prompt";try{p=await h.queryPermission({mode:"readwrite"});}catch(e){}
  if(p==="granted"){dirHandle=h;folderState="linked";await checkFolder(true);}else{pendingDir=h;folderState="needs-permission";}
  renderSaveChip();if(view==="now")renderNow();
}
export async function linkFolder(){
  if(!("showDirectoryPicker" in window))return toast("Folder sync needs Chrome or Edge. Use Export for backups.");
  try{let h=null;
    if(pendingDir){const p=await pendingDir.requestPermission({mode:"readwrite"});if(p==="granted")h=pendingDir;}
    if(!h){h=await window.showDirectoryPicker({id:"persoatlas",mode:"readwrite"});await IDB.set("dir",h).catch(()=>{});}
    pendingDir=null;dirHandle=h;folderState="linked";await checkFolder(false);
  }catch(e){if(e?.name!=="AbortError")toast("Couldn't link the folder: "+(e?.message||e));}
  renderSettings();renderSaveChip();if(view==="now")renderNow();
}
export async function unlinkFolder(){await IDB.del("dir");dirHandle=null;pendingDir=null;folderPrompt=null;folderState=("showDirectoryPicker" in window)?"none":"unsupported";renderSettings();renderSaveChip();if(view==="now")renderNow();toast("Folder unlinked. Data stays in this browser.");}
export async function loadFromFolder(obj){
  const h=dirHandle;folderPrompt=null;
  const st=migrate(obj,PACK), byId={};collectRefs(st).forEach(r=>byId[r.id]=r);let n=0;
  try{const fd=await h.getDirectoryHandle("files");for await (const [name,e] of fd.entries()){if(e.kind!=="file")continue;const id=name.split("__")[0];if(!byId[id])continue;
    const f=await e.getFile();await IDB.set(id,{blob:f,name:byId[id].name||f.name,type:byId[id].type||f.type},"files");n++;}}catch(e){}
  setState(st);resetUI();persist();toast(`Loaded from folder${n?` with ${n} files`:""}`);
}
