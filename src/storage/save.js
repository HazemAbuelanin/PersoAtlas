import { KEY, S } from "../core/state.js";
import { $, daysSince, hhmm } from "../core/util.js";
import { dirHandle, folderState, lastSync, syncFolder } from "./folder.js";
export let dirty=false, storageOK=true, saveTimer=null, syncTimer=null;
export function save(){dirty=true;clearTimeout(saveTimer);$("#saveState").textContent="Saving…";saveTimer=setTimeout(persist,350);}
export function persist(){
  dirty=false;S.meta.updated=new Date().toISOString();
  try{localStorage.setItem(KEY,JSON.stringify(S));storageOK=true;}catch(e){storageOK=false;}
  if(dirHandle){clearTimeout(syncTimer);syncTimer=setTimeout(syncFolder,900);}
  renderSaveChip();
}
export function renderSaveChip(){
  const el=$("#saveState");let t,w=false;const age=daysSince(S.meta.lastExport);
  let tip;
  if(!storageOK){t="⚠ Storage blocked";tip="This browser blocks storage. Link a backup folder or export regularly.";w=true;}
  else if(folderState==="linked"){t=`● Synced${lastSync?" "+hhmm(lastSync):""}`;tip="Every change is saved in this browser and synced to your backup folder.";}
  else if(folderState==="error"){t="⚠ Sync failed";tip="Saved in this browser, but the last folder sync failed. Open Data settings.";w=true;}
  else if(folderState==="needs-permission"){t="⚠ Reconnect folder";tip="Saved in this browser. The backup folder needs permission again.";w=true;}
  else{t=age===null?"● No backup yet":`● Backed up ${age?age+"d ago":"today"}`;tip=`Saved in this browser.${age===null?" You haven't exported a backup yet.":""} Click for data & backup settings.`;w=age===null||age>7;}
  el.textContent=t;el.title=tip;el.classList.toggle("warn",w);
}
/** Write immediately (page is closing). */
export function flushNow(){clearTimeout(saveTimer);try{if(dirty)S.meta.updated=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
export function probeStorage(){try{localStorage.setItem(KEY+".probe","1");localStorage.removeItem(KEY+".probe");}catch(e){storageOK=false;renderSaveChip();}}
