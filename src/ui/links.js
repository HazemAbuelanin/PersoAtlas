import { ordered, skillIndex } from "../core/query.js";
import { $$, esc } from "../core/util.js";
import { save } from "../storage/save.js";
import { goSkill } from "../views/inventory.js";
import { goQuest } from "../views/quests.js";
export function skillPicker(el,arr,onChange,opts={}){
  const draw=()=>{const idx=skillIndex();
    el.innerHTML=`<div class="chips">${arr.filter(id=>idx[id]).map(id=>`<span class="lchip"><button type="button" class="lgo" data-go="${esc(id)}">${esc(idx[id].s.name)}${opts.badge?opts.badge(idx[id].s):""}</button><button type="button" class="x" data-rm="${esc(id)}" aria-label="Unlink ${esc(idx[id].s.name)}">✕</button></span>`).join("")}
      <select class="sel mini" aria-label="Link a skill"><option value="">+ Link skill…</option>${ordered().map(([,r])=>{const ops=(r.skills||[]).filter(s=>!arr.includes(s.id)&&s.id!==opts.exclude);return ops.length?`<optgroup label="${esc(r.name)}">${ops.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</optgroup>`:"";}).join("")}</select></div>`;
    $$("[data-go]",el).forEach(b=>b.onclick=()=>goSkill(b.dataset.go));
    $$("[data-rm]",el).forEach(b=>b.onclick=()=>{arr.splice(arr.indexOf(b.dataset.rm),1);save();draw();onChange&&onChange();});
    el.querySelector("select").onchange=e=>{if(e.target.value){arr.push(e.target.value);save();draw();onChange&&onChange();}};
  };
  draw();
}
export function goRef(ref){const [k,id]=String(ref).split(":");if(k==="s")goSkill(id);else if(k==="q")goQuest(id);}
