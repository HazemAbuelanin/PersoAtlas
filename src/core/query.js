
import { M, S } from "./state.js";
import { addDays, esc, ymd } from "./util.js";
export const ordered=()=>Object.entries(S.regions).sort((a,b)=>(a[1].order??0)-(b[1].order??0));
export const allSkills=()=>ordered().flatMap(([rid,r])=>(r.skills||[]).map(s=>({rid,s})));
export function skillIndex(){const m={};ordered().forEach(([rid,r])=>(r.skills||[]).forEach(s=>m[s.id]={rid,r,s}));return m;}
export const findSkill=(rid,sid)=>S.regions[rid]?.skills?.find(s=>s.id===sid);
export function unlinkSkill(id){S.quests.forEach(q=>q.proves=q.proves.filter(x=>x!==id));S.posts.forEach(p=>p.skills=p.skills.filter(x=>x!==id));S.duties.forEach(d=>d.skills=d.skills.filter(x=>x!==id));}
export function refLabel(ref){if(!ref)return "General";const [k,id]=String(ref).split(":");
  if(k==="s"){const x=skillIndex()[id];return x?x.s.name:"(deleted skill)";}
  if(k==="q"){const q=S.quests.find(q=>q.id===id);return q?q.code+" · "+q.name:"(deleted quest)";}return "General";}
export function refOptions(cur){
  return `<option value="">General / other</option>`+(S.quests.length?`<optgroup label="Quests">${S.quests.map(q=>`<option value="q:${esc(q.id)}" ${cur==="q:"+q.id?"selected":""}>${esc(q.code+" · "+q.name)}</option>`).join("")}</optgroup>`:"")+
    ordered().map(([,r])=>(r.skills||[]).length?`<optgroup label="${esc(r.name)}">${r.skills.map(s=>`<option value="s:${esc(s.id)}" ${cur==="s:"+s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</optgroup>`:"").join("");
}
export function loadByMonth(){const L=Array(M+1).fill(0);const add=x=>{for(let m=x.start;m<=(x.cont?M:x.end);m++)L[m]+=+x.hpw||0;};
  allSkills().forEach(({s})=>{if(s.status!=="mastered")add(s);});S.quests.forEach(q=>{if(q.status!=="done")add(q);});return L.map(v=>Math.round(v*4)/4);}
export function coherence(){const idx=skillIndex(),out=[];
  allSkills().forEach(({s})=>(s.prereqs||[]).forEach(pid=>{const p=idx[pid]?.s;if(p&&!s.cont&&!p.cont&&p.start>s.start)out.push({ref:"s:"+s.id,t:`${s.name} (M${s.start}) starts before its prerequisite ${p.name} (M${p.start})`});}));
  S.quests.forEach(q=>q.proves.forEach(pid=>{const p=idx[pid]?.s;if(p&&p.start>q.end)out.push({ref:"q:"+q.id,t:`${q.code} ends (M${q.end}) before ${p.name} starts (M${p.start})`});}));
  return out;}
export const mustStat=s=>[(s.musts||[]).filter(x=>x.done).length,(s.musts||[]).length];
export const minFor=ref=>S.sessions.filter(x=>x.ref===ref).reduce((a,x)=>a+(+x.min||0),0);
export const totalMin=()=>S.sessions.reduce((a,x)=>a+(+x.min||0),0);
export function streak(){const days=new Set(S.sessions.map(x=>x.date));let d=new Date();if(!days.has(ymd(d)))d=addDays(d,-1);let n=0;while(days.has(ymd(d))){n++;d=addDays(d,-1);}return n;}
