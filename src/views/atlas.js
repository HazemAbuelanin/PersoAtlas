/* ATLAS: an index of the key ideas, works, methods or tools of a field, each marked at one of three levels.
   Entries come from the pack, and the user can add, edit and remove their own. */
import { l } from "../core/labels.js";
import { allSkills, skillIndex } from "../core/query.js";
import { S } from "../core/state.js";
import { $, $$, esc, toast, uid } from "../core/util.js";
import { save } from "../storage/save.js";
import { goRef } from "../ui/links.js";
import { renderHud } from "../ui/nav.js";

let atlasCat = "all", atlasState = "all", atlasQ = "", atlasEdit = false, form = null;
export const AGLYPH = ["○", "◐", "✓"];
const states = () => S.pack.atlas.states;

/** The item's own link, or a search built from the pack's link template. */
export function atlasLink(a) {
  if (a.url) return a.url;
  const name = String(a.name).replace(/\s*\(.*?\)\s*/g, " ").trim();
  return S.pack.atlas.link.template.replace("{name}", encodeURIComponent(name)).replace("{year}", encodeURIComponent(a.year || ""));
}
export function atlasRow(a, compact) {
  const st = S.atlas[a.id] || 0, sk = skillIndex()[a.skill]?.s, ST = states();
  return `<div class="atl" data-aid="${esc(a.id)}"><button class="astate" data-s="${st}" title="${esc(ST[st])}: click to change" aria-label="${esc(a.name)}: ${esc(ST[st])}">${AGLYPH[st]}</button>
    <span class="an">${esc(a.name)}${a.year ? `<small>${esc(a.year)}</small>` : ""}</span>
    <span class="aa">${!compact && sk ? `<button class="lgo3" data-go="s:${esc(a.skill)}">${esc(sk.name)}</button>` : ""}<a class="alink" href="${esc(atlasLink(a))}" target="_blank" rel="noopener">${esc(a.url ? "link" : S.pack.atlas.link.label)} ↗</a>
      ${!compact && atlasEdit ? `<button class="x" data-edit title="Edit" aria-label="Edit ${esc(a.name)}">✎</button><button class="x" data-del title="Delete" aria-label="Delete ${esc(a.name)}">✕</button>` : ""}</span>
    ${a.idea ? `<span class="ai">${esc(a.idea)}</span>` : ""}</div>`;
}
export function bindAtlas(root, after) {
  $$(".atl .astate", root).forEach(b => (b.onclick = () => {
    const id = b.closest(".atl").dataset.aid, v = ((S.atlas[id] || 0) + 1) % 3;
    if (v) S.atlas[id] = v; else delete S.atlas[id];
    save(); after();
  }));
  $$(".atl [data-go]", root).forEach(b => (b.onclick = () => goRef(b.dataset.go)));
}

function formHTML() {
  const f = form, cats = S.atlasDef.cats;
  const skills = allSkills().map(({ s }) => `<option value="${esc(s.id)}" ${f.skill === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("");
  return `<form class="box atlform" id="atlForm"><div class="bd">
    <span class="lbl">${f.id ? "Edit entry" : "New entry"}</span>
    <div class="row2"><div class="field"><label for="afName">Name</label><input class="in" id="afName" required value="${esc(f.name || "")}" placeholder="e.g. Spaced repetition, Transformer, Kant's Critique"></div>
      <div class="field"><label for="afYear">Year (optional)</label><input class="in" id="afYear" value="${esc(f.year || "")}" placeholder="e.g. 2017"></div></div>
    <div class="row2"><div class="field"><label for="afCat">Category</label><select class="sel" id="afCat">${cats.map(c => `<option value="${esc(c.id)}" ${f.cat === c.id ? "selected" : ""}>${esc(c.label)}</option>`).join("")}<option value="__new" ${!cats.length ? "selected" : ""}>＋ New category…</option></select></div>
      <div class="field" id="afNewWrap" ${cats.length ? "hidden" : ""}><label for="afNew">New category name</label><input class="in" id="afNew" placeholder="e.g. Methods"></div></div>
    <div class="field"><label for="afIdea">The idea in one or two sentences</label><textarea class="ta" id="afIdea" style="min-height:60px">${esc(f.idea || "")}</textarea></div>
    <div class="row2"><div class="field"><label for="afUrl">Link (optional)</label><input class="in" id="afUrl" value="${esc(f.url || "")}" placeholder="https://"></div>
      <div class="field"><label for="afSkill">Linked ${esc(l("skill"))} (optional)</label><select class="sel" id="afSkill"><option value="">None</option>${skills}</select></div></div>
    <div class="btns"><button class="btn primary" type="submit">${f.id ? "Save" : "+ Add entry"}</button><button class="btn ghost" type="button" id="afCancel">Cancel</button></div>
  </div></form>`;
}

export function renderAtlas() {
  const box = $("#atlasBody"), q = atlasQ.trim().toLowerCase(), keep = box.scrollTop, A = S.atlasDef, ST = states();
  const items = A.items.filter(a => (atlasCat === "all" || a.cat === atlasCat) && (atlasState === "all" || String(S.atlas[a.id] || 0) === atlasState)
    && (!q || `${a.name} ${a.idea || ""} ${a.year || ""}`.toLowerCase().includes(q)));
  const cnt = c => { const all = A.items.filter(a => c === "all" || a.cat === c); return [all.filter(a => (S.atlas[a.id] || 0) > 0).length, all.length]; };
  const [k, n] = cnt("all"), top = A.items.filter(a => S.atlas[a.id] === 2).length;
  const sortFn = S.pack.atlas.sortByYear ? (x, y) => (+x.year || 9999) - (+y.year || 9999) : () => 0;
  const intro = S.pack.atlas.intro || `Your index of the key ideas, works, methods or tools of your field. Mark each one ◐ ${ST[1].toLowerCase()} or ✓ ${ST[2].toLowerCase()}.`;
  const cats = A.cats.filter(c => atlasEdit || cnt(c.id)[1]);
  box.innerHTML = `<div class="atlhead">
    <div class="note">${esc(intro)} ${n ? `${k}/${n} marked · ${top} ${esc(ST[2].toLowerCase())}.` : ""}</div>
    <div class="filters" style="padding:0"><button class="chip ${atlasEdit ? "on" : ""}" id="aEdit">${atlasEdit ? "Done editing" : "Edit entries"}</button><button class="chip" id="aAdd">+ Entry</button>
      <span style="width:10px"></span>${[["all", "All states"], ["0", ST[0]], ["1", ST[1]], ["2", ST[2]]].map(([v, t]) => `<button class="chip ${atlasState === v ? "on" : ""}" data-st="${v}">${esc(t)}</button>`).join("")}</div>
    ${cats.length ? `<div class="filters" style="padding:0">${[{ id: "all", label: "All" }, ...cats].map(c => { const [a, b] = cnt(c.id); return `<button class="chip ${atlasCat === c.id ? "on" : ""}" data-cat="${esc(c.id)}">${esc(c.label)} ${a}/${b}</button>`; }).join("")}</div>` : ""}
    ${form ? formHTML() : ""}</div>
    <div class="atlbody">${!A.items.length && !form ? `<div class="empty"><h3>Your ${esc(l("atlas"))} is empty</h3><p>Add the key ideas, methods, works or tools of your field, then mark them as you learn them.</p><button class="btn primary" id="aAdd2">+ Add the first entry</button></div>`
      : cats.map(c => {
        const its = items.filter(a => a.cat === c.id).sort(sortFn);
        if (!its.length && !atlasEdit) return "";
        const [a, b] = cnt(c.id);
        const head = atlasEdit ? `<div class="acat"><input class="in" data-catlabel="${esc(c.id)}" value="${esc(c.label)}" aria-label="Category name" style="max-width:280px;padding:4px 8px">${b ? `<span>${b} entr${b > 1 ? "ies" : "y"}</span>` : `<button class="x" data-catdel="${esc(c.id)}" aria-label="Delete empty category">✕</button>`}</div>`
          : `<div class="acat">${esc(c.label)}<span>${a}/${b} marked</span></div>`;
        return head + its.map(x => atlasRow(x, false)).join("");
      }).join("") || `<div class="empty"><h3>Nothing matches</h3><p>Try another word or clear the filters.</p></div>`}</div>`;
  box.scrollTop = keep;
  $$("[data-st]", box).forEach(b => (b.onclick = () => { atlasState = b.dataset.st; renderAtlas(); }));
  $$("[data-cat]", box).forEach(b => (b.onclick = () => { atlasCat = b.dataset.cat; box.scrollTop = 0; renderAtlas(); }));
  $("#aEdit").onclick = () => { atlasEdit = !atlasEdit; if (!atlasEdit) form = null; renderAtlas(); };
  const add = () => { form = { cat: atlasCat !== "all" ? atlasCat : A.cats[0]?.id || "" }; renderAtlas(); setTimeout(() => $("#afName")?.focus(), 0); };
  $("#aAdd").onclick = add; if ($("#aAdd2")) $("#aAdd2").onclick = add;
  bindAtlas(box, () => { renderAtlas(); renderHud(); });
  $$(".atl [data-edit]", box).forEach(b => (b.onclick = () => { form = { ...A.items.find(a => a.id === b.closest(".atl").dataset.aid) }; renderAtlas(); box.scrollTo?.({ top: 0 }); }));
  $$(".atl [data-del]", box).forEach(b => (b.onclick = () => {
    if (!b.classList.contains("arm")) { b.classList.add("arm"); b.textContent = "Delete?"; return; }
    const id = b.closest(".atl").dataset.aid; A.items = A.items.filter(a => a.id !== id); delete S.atlas[id]; save(); renderAtlas(); renderHud(); toast("Entry deleted");
  }));
  $$("[data-catlabel]", box).forEach(el => (el.onchange = () => { const c = A.cats.find(c => c.id === el.dataset.catlabel); if (c && el.value.trim()) { c.label = el.value.trim(); save(); renderAtlas(); } }));
  $$("[data-catdel]", box).forEach(b => (b.onclick = () => { A.cats = A.cats.filter(c => c.id !== b.dataset.catdel); if (atlasCat === b.dataset.catdel) atlasCat = "all"; save(); renderAtlas(); }));
  if (form) {
    $("#afCat").onchange = e => { $("#afNewWrap").hidden = e.target.value !== "__new"; };
    $("#afCancel").onclick = () => { form = null; renderAtlas(); };
    $("#atlForm").onsubmit = e => {
      e.preventDefault();
      const name = $("#afName").value.trim(); if (!name) return;
      let cat = $("#afCat").value;
      if (cat === "__new") { const label = $("#afNew").value.trim(); if (!label) return toast("Name the new category"); cat = uid("k"); A.cats.push({ id: cat, label }); }
      const rec = { name, cat, year: $("#afYear").value.trim(), idea: $("#afIdea").value.trim(), url: $("#afUrl").value.trim(), skill: $("#afSkill").value };
      if (form.id) Object.assign(A.items.find(a => a.id === form.id) || {}, rec);
      else A.items.push({ id: uid("u"), ...rec });
      toast(form.id ? "Entry saved" : `Added to your ${l("atlas")}`);
      form = form.id ? null : { cat }; save(); renderAtlas(); renderHud();
      if (form) setTimeout(() => $("#afName")?.focus(), 0);
    };
  }
}
export function initAtlas() {
  let aT = 0;
  $("#aq").oninput = e => { clearTimeout(aT); aT = setTimeout(() => { atlasQ = e.target.value; renderAtlas(); }, 140); };
}
