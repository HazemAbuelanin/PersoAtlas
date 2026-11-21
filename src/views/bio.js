/* PROFILE: customise your character (picture, emblem, banner, theme), your story, and the trophy room. */
import { BANNERS, THEMES, rankOf } from "../core/config.js";
import { L } from "../core/labels.js";
import { allSkills } from "../core/query.js";
import { S } from "../core/state.js";
import { $, $$, defer, esc, toast } from "../core/util.js";
import { copy } from "../storage/backup.js";
import { save } from "../storage/save.js";
import { avatarHTML, forget, initials, mountAtt, renderAvatar, setAvatar } from "../ui/attachments.js";
import { setSnapAvatar, trophies } from "../ui/game.js";
import { EMBLEMS, icon } from "../ui/icons.js";
import { md } from "../ui/md.js";
import { applyPrefs, gamified, levelOf, renderHud, xpCalc } from "../ui/nav.js";

export function renderBio() {
  const b = S.bio, v = $("#v-bio"), ini = initials();
  const focus = (b.focus || "").split(",").map(x => x.trim()).filter(Boolean);
  const done = allSkills().filter(({ s }) => s.status === "mastered").length;
  const lvl = levelOf(xpCalc().xp), tr = trophies(lvl), got = tr.filter(t => t.done).length;
  const keep = $("#v-bio .scroll")?.scrollTop || 0;
  v.innerHTML = `<div class="bio">
    <section class="panel"><div class="ph"><span>Customise · ${esc(L("bio"))}</span></div><div class="scroll"><div class="insp">
      <div class="field"><span class="lbl">Picture</span>
        <div class="avedit" id="avDrop"><div class="avatar" id="edAva" role="button" tabindex="0" title="Change picture">${esc(ini)}</div>
          <div class="btns"><button class="btn primary" id="avUp">${b.avatar ? "Change picture" : "Upload picture"}</button>${b.avatar ? `<button class="btn danger" id="avDel">Remove</button>` : ""}</div>
          <span class="note">Drop an image here. It's cropped to a circle and stays on this computer.</span></div></div>
      <div class="field"><span class="lbl">Emblem</span><div class="pickrow">${EMBLEMS.map(e => `<button class="emb-opt ${b.emblem === e ? "on" : ""}" data-emb="${e}" title="${e}" aria-label="Emblem ${e}" aria-pressed="${b.emblem === e}">${icon(e)}</button>`).join("")}</div></div>
      <div class="field"><span class="lbl">Banner</span><div class="pickrow">${Object.entries(BANNERS).map(([k, g]) => `<button class="ban-opt ${(b.banner || "theme") === k ? "on" : ""}" data-ban="${k}" style="--b:${g}" title="${k}" aria-label="Banner ${k}"></button>`).join("")}</div></div>
      <div class="field"><span class="lbl">Theme</span><div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button class="theme-opt ${S.prefs.theme === k ? "on" : ""}" data-theme-pick="${k}"><i style="--sw:${t.sw}"></i>${esc(t.name)}</button>`).join("")}</div></div>
      <div class="row2"><div class="field"><label for="bName">Name</label><input class="in" id="bName" value="${esc(b.name)}"></div>
        <div class="field"><label for="bTitle">What you're becoming</label><input class="in" id="bTitle" value="${esc(b.title)}"></div></div>
      <div class="row2"><div class="field"><label for="bSpec">Focus / specialization</label><input class="in" id="bSpec" value="${esc(b.specialization)}"></div>
        <div class="field"><label for="bLoc">Location</label><input class="in" id="bLoc" value="${esc(b.location)}" placeholder="City, Country"></div></div>
      <div class="field"><label for="bEmail">Email</label><input class="in" id="bEmail" value="${esc(b.email)}" placeholder="you@example.com"></div>
      <div class="field"><label for="bStatement">Motto</label><textarea class="ta" id="bStatement" style="min-height:60px" placeholder="One sentence about why you're on this journey">${esc(b.statement)}</textarea></div>
      <div class="field"><label for="bAbout">About · Markdown</label><textarea class="ta" id="bAbout" style="min-height:140px">${esc(b.about)}</textarea></div>
      <div class="field"><label for="bFocus">Interests (comma separated)</label><input class="in" id="bFocus" value="${esc(b.focus)}"></div>
      <div class="field"><span class="lbl">Links</span><div class="links" id="bLinks">${(b.links || []).map((lk, i) => `<div class="lrow">
        <input class="in" data-i="${i}" data-k="label" value="${esc(lk.label)}" placeholder="Label" aria-label="Link label">
        <input class="in" data-i="${i}" data-k="url" value="${esc(lk.url)}" placeholder="https://" aria-label="Link URL">
        <button class="x" data-del="${i}" aria-label="Remove link">✕</button></div>`).join("")}</div>
        <button class="btn ghost" id="bAddLink" style="align-self:flex-start">+ Link</button></div>
      <div class="att" id="bAtt"></div>
    </div></div></section>
    <section class="panel"><div class="ph"><span>${gamified() ? "Player card" : "Profile card"}</span><button class="btn ghost" id="bCopy">Copy as text</button></div><div class="scroll" style="padding:14px;display:flex;flex-direction:column;gap:14px">
      <div class="card" style="--banner:${BANNERS[b.banner] || BANNERS.theme}"><div class="banner"></div><div class="cbody">
        <div class="toprow"><div class="avatar" id="cardAva">${esc(ini)}</div>${gamified() ? `<span class="crank">${icon("crown", "")}${esc(rankOf(lvl))} · LV ${lvl}</span>` : ""}</div>
        <div><div class="cname">${icon(b.emblem || "compass", "emb")}${esc(b.name || "Your name")}</div><div class="ctitle">${esc(b.title || "")}</div>
          <div class="note">${esc([b.specialization, b.location].filter(Boolean).join(" · "))}</div></div>
        ${b.statement ? `<div class="cstate">${esc(b.statement)}</div>` : ""}
        ${b.about ? `<div class="prose" style="font-size:14px">${md(b.about)}</div>` : ""}
        ${focus.length ? `<div class="pills">${focus.map(f => `<span class="pill">${esc(f)}</span>`).join("")}</div>` : ""}
        <div class="row2" style="grid-template-columns:repeat(auto-fit,minmax(78px,1fr))">
          <div class="tile gameonly"><div class="v">${got}</div><div class="k">Trophies</div></div>
          <div class="tile"><div class="v">${done}</div><div class="k">Mastered</div></div>
          <div class="tile"><div class="v">${S.quests.filter(q => q.status === "done").length}</div><div class="k">${esc(L("quests"))}</div></div>
          <div class="tile"><div class="v">${S.posts.filter(p => p.status === "published").length}</div><div class="k">Published</div></div></div>
        ${(b.links || []).filter(lk => lk.url).length ? `<div class="links">${b.links.filter(lk => lk.url).map(lk => `<a class="link" href="${esc(lk.url)}" target="_blank" rel="noopener">${esc(lk.label || lk.url)} ↗</a>`).join("")}</div>` : ""}
        ${b.email ? `<div class="note">${esc(b.email)}</div>` : ""}
      </div></div>
      <div class="box gameonly"><div class="ph"><span>Trophy room · ${got}/${tr.length}</span></div><div class="bd">
        <div class="trophies">${tr.map(t => `<div class="trophy ${t.done ? "got" : ""} ${t.tier}" title="${esc(t.desc)}${t.done ? "" : ` · ${t.cur}/${t.goal}`}"><div class="tb">${icon(t.done ? t.icon : "lock")}</div><div class="tn">${esc(t.name)}</div><div class="td">${esc(t.desc)}${t.done || t.goal < 2 ? "" : ` · ${t.cur}/${t.goal}`}</div></div>`).join("")}</div>
      </div></div>
    </div></section></div>`;
  $("#v-bio .scroll").scrollTop = keep;
  avatarHTML().then(h => { ["#edAva", "#cardAva"].forEach(s => { const el = $(s); if (el) el.innerHTML = h; }); });
  $("#avUp").onclick = $("#edAva").onclick = () => $("#avaFile").click();
  $("#edAva").onkeydown = e => { if (e.key === "Enter") $("#avaFile").click(); };
  if ($("#avDel")) $("#avDel").onclick = () => { forget(b.avatar); b.avatar = ""; setSnapAvatar(""); save(); renderAvatar(); renderBio(); toast("Profile picture removed"); };
  const dz = $("#avDrop");
  dz.ondragover = e => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); dz.style.outline = "1px solid var(--cyan)"; } };
  dz.ondragleave = () => (dz.style.outline = "");
  dz.ondrop = e => { e.preventDefault(); dz.style.outline = ""; setAvatar(e.dataTransfer.files[0]); };
  $$("[data-emb]", v).forEach(btn => (btn.onclick = () => { b.emblem = btn.dataset.emb; save(); renderHud(); renderBio(); }));
  $$("[data-ban]", v).forEach(btn => (btn.onclick = () => { b.banner = btn.dataset.ban; save(); renderBio(); }));
  $$("[data-theme-pick]", v).forEach(btn => (btn.onclick = () => { S.prefs.theme = btn.dataset.themePick; applyPrefs(); save(); renderHud(); renderBio(); }));
  mountAtt($("#bAtt"), b, { hint: "Your CV, certificates, transcripts, portfolio images. Drop them here or use Add files." });
  const map = { bName: "name", bTitle: "title", bSpec: "specialization", bLoc: "location", bEmail: "email", bStatement: "statement", bAbout: "about", bFocus: "focus" };
  Object.entries(map).forEach(([id, k]) => {
    $("#" + id).onchange = e => { b[k] = e.target.value; save(); renderHud(); if (k === "name") renderAvatar(); defer(renderBio); };
    $("#" + id).oninput = e => { b[k] = e.target.value; save(); };
  });
  $$("#bLinks input").forEach(el => { el.oninput = () => { b.links[+el.dataset.i][el.dataset.k] = el.value; save(); }; el.onchange = () => defer(renderBio); });
  $$("#bLinks [data-del]").forEach(el => (el.onclick = () => { b.links.splice(+el.dataset.del, 1); save(); renderBio(); }));
  $("#bAddLink").onclick = () => { (b.links ||= []).push({ label: "", url: "" }); save(); renderBio(); };
  $("#bCopy").onclick = () => {
    const t = [b.name, b.title, [b.specialization, b.location].filter(Boolean).join(" · "), "", b.statement, "", b.about, "", focus.length ? "Interests: " + focus.join(", ") : "",
      ...(b.links || []).filter(lk => lk.url).map(lk => `${lk.label}: ${lk.url}`), b.email].filter(x => x !== undefined).join("\n");
    copy(t, "Profile copied");
  };
}
