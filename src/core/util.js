import { DOW, MON } from "./config.js";
export const $=s=>document.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const uid=p=>p+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
export const pad=n=>String(n).padStart(2,"0");
export const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const today=()=>ymd(new Date());
export const pd=s=>{const [y,m,d]=String(s||today()).split("-").map(Number);return new Date(y,(m||1)-1,d||1);};
export const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
export const defer=fn=>setTimeout(fn,0);
export const fmtMin=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return h?`${h}h${r?" "+r+"m":""}`:`${r}m`;};
export const fmtDay=s=>{const d=pd(s);return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;};
export const fmtClock=ms=>{const t=Math.max(0,Math.floor(ms/1000));return `${pad(Math.floor(t/3600))}:${pad(Math.floor(t%3600/60))}:${pad(t%60)}`;};
export const daysSince=iso=>iso?Math.floor((Date.now()-new Date(iso).getTime())/864e5):null;
export const hhmm=d=>new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
export const glyph=n=>{const w=String(n).replace(/^Q\d+\s*·\s*/,"").split(/[\s&\/\-·+]+/).filter(x=>/[A-Za-z0-9]/.test(x));return ((w[0]||"?")[0]+((w[1]||w[0]||"")[w[1]?0:1]||"")).toUpperCase();};
export function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove("show"),2800);}
export const motionOn=()=>document.documentElement.dataset.motion==="full";
export function flip(selector,key,mutate){
  if(!motionOn()||!Element.prototype.animate)return mutate();
  const before={};$$(selector).forEach(el=>before[el.dataset[key]]=el.getBoundingClientRect());
  mutate();
  $$(selector).forEach(el=>{const b=before[el.dataset[key]];if(!b)return;const a=el.getBoundingClientRect();
    const dx=b.left-a.left,dy=b.top-a.top;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
    el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:340,easing:"cubic-bezier(.2,.8,.2,1)"});});
}
