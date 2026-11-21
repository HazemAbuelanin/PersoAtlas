import { MON } from "./config.js";
import { M, S } from "./state.js";
import { pd, ymd } from "./util.js";
export const clampM=n=>Math.max(1,Math.min(M,Math.round(+n)||1));
export function monthDate(n){const s=pd(S.plan.start);return new Date(s.getFullYear(),s.getMonth()+n-1,1);}
export const monLabel=(n,short)=>{const d=monthDate(n);return MON[d.getMonth()]+" "+(short?"'"+String(d.getFullYear()).slice(2):d.getFullYear());};
export function nowF(){const s=pd(S.plan.start),n=new Date(),dim=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();
  return (n.getFullYear()-s.getFullYear())*12+(n.getMonth()-s.getMonth())+(n.getDate()-1)/dim;}
export const curM=()=>Math.floor(nowF())+1;
export const winLabel=x=>x.cont?`M${x.start}+ · ongoing`:`M${x.start}${x.end!==x.start?"–"+x.end:""}`;
export const winDates=x=>x.cont?`From ${monLabel(x.start)}, ongoing`:(x.start===x.end?monLabel(x.start):`${monLabel(x.start)} – ${monLabel(x.end)}`);
/* where an item stands against the calendar */
export function sched(x,done){
  if(done)return {k:"done",t:"Done"};
  const f=nowF(), m=Math.floor(f)+1;
  if(x.cont){if(m<x.start)return x.start-m<=1?{k:"soon",t:"Starts soon"}:{k:"later",t:"Upcoming"};return {k:"now",t:x.status==="active"?"Ongoing":"In window"};}
  if(m<x.start)return x.start-m<=1?{k:"soon",t:"Starts soon"}:{k:"later",t:"Upcoming"};
  if(m>x.end)return {k:"overdue",t:"Overdue"};
  const exp=Math.min(100,Math.max(0,(f-(x.start-1))/(x.end-x.start+1)*100));
  return (x.progress||0)+25<exp?{k:"behind",t:"Behind",exp}:{k:"now",t:"In window",exp};
}
export const sSched=s=>sched(s,s.status==="mastered");
export const qSched=q=>sched(q,q.status==="done");
export function weekStartOf(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const diff=(x.getDay()-(+S.prefs.weekStart||0)+7)%7;x.setDate(x.getDate()-diff);return x;}
export const weekKey=d=>ymd(weekStartOf(d));
