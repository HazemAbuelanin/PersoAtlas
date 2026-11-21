import { refLabel } from "../core/query.js";
import { S } from "../core/state.js";
import { $, esc, fmtClock, fmtMin, toast, uid, ymd } from "../core/util.js";
import { save } from "../storage/save.js";
import { renderHud, view } from "./nav.js";
import { renderInsp } from "../views/inventory.js";
import { renderNow } from "../views/now.js";
import { renderQuestEd } from "../views/quests.js";
export let timerRef="";
export const setTimerRef=v=>{timerRef=v;};
export function startTimer(ref){if(S.timer)return toast("A focus session is already running. Stop it first.");
  S.timer={start:Date.now(),ref:ref||""};timerRef=ref||"";save();tick();rerenderLight();toast(`Focus started: ${refLabel(ref)}`);}
export function stopTimer(){if(!S.timer)return;const ms=Date.now()-S.timer.start,min=Math.round(ms/60000),ref=S.timer.ref;
  if(min>=1){S.sessions.push({id:uid("t"),date:ymd(new Date(S.timer.start)),min,ref,note:"",t:Date.now()});toast(`Logged ${fmtMin(min)} on ${refLabel(ref)}`);}
  else toast("Under a minute, so nothing was logged");
  S.timer=null;save();tick();renderHud();rerenderLight();}
export function tick(){const c=$("#timerChip");if(!S.timer){c.hidden=true;return;}c.hidden=false;const t=fmtClock(Date.now()-S.timer.start);
  c.innerHTML=`<i></i>${t} · ${esc(refLabel(S.timer.ref))}`;const k=$("#clock");if(k)k.textContent=t;}
export function rerenderLight(){if(view==="now")renderNow();else if(view==="inv")renderInsp();else if(view==="quests")renderQuestEd();}
