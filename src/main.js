/* PersoAtlas entry point: pick (or create) a profile, load its state, wire the page, render. */
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./styles.css";

import { activeProfile } from "./core/profiles.js";
import { KEY, S, bootNote, useProfile } from "./core/state.js";
import { $, $$, toast } from "./core/util.js";
import { importJSON } from "./storage/backup.js";
import { initFolder } from "./storage/folder.js";
import { flushNow, persist, probeStorage, renderSaveChip } from "./storage/save.js";
import { addFiles, initLightbox, lastZone, pickTarget, renderAvatar, setAvatar } from "./ui/attachments.js";
import { applyLabels, applyPrefs, remeasureTabs, renderHud, setView } from "./ui/nav.js";
import { LOGO } from "./ui/icons.js";
import { openOnboarding } from "./ui/onboarding.js";
import { showSplash } from "./ui/splash.js";
import { toggleSettings, updateFromPackFile } from "./ui/settings.js";
import { tick } from "./ui/timer.js";
import { initAtlas } from "./views/atlas.js";
import { addPost } from "./views/blog.js";
import { addDuty } from "./views/duties.js";
import { initInventory } from "./views/inventory.js";
import { addQuest } from "./views/quests.js";

function wire() {
  $("#logo").insertAdjacentHTML("afterbegin", LOGO);
  $$(".tab").forEach(t => (t.onclick = () => setView(t.dataset.view)));
  $("#addPost").onclick = () => addPost(); $("#addDuty").onclick = addDuty; $("#addQuest").onclick = addQuest;
  initInventory(); initAtlas(); initLightbox();
  $("#importFile").onchange = e => { const f = e.target.files[0]; if (f) importJSON(f); e.target.value = ""; };
  $("#packFile").onchange = e => { const f = e.target.files[0]; if (f) updateFromPackFile(f); e.target.value = ""; };
  $("#sysBtn").onclick = e => { e.stopPropagation(); toggleSettings(); };
  $("#saveState").onclick = e => { e.stopPropagation(); toggleSettings(true); };
  $("#timerChip").onclick = () => setView("now");
  document.addEventListener("click", e => { const s = $("#settings"); if (s.hidden || !e.target.isConnected) return; if (!s.contains(e.target) && e.target !== $("#sysBtn")) toggleSettings(false); });
  $("#hero").onclick = () => setView("bio");
  $("#attFile").onchange = async e => { const fs = [...e.target.files]; e.target.value = ""; if (pickTarget && fs.length) { await addFiles(pickTarget.owner, fs); pickTarget.done && pickTarget.done(); } };
  $("#avaFile").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) setAvatar(f); };
  window.addEventListener("keydown", e => {
    if (!$("#lb").hidden) { if (e.key === "Escape") $("#lbClose").click(); if (e.key === "ArrowRight") $("#lbNext").click(); if (e.key === "ArrowLeft") $("#lbPrev").click(); return; }
    if (e.key === "Escape" && !$("#settings").hidden) return toggleSettings(false);
    const t = document.activeElement.tagName;
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t)) { e.preventDefault(); setView("inv"); $("#q").focus(); }
  });
  document.addEventListener("paste", async e => {
    const fs = [...(e.clipboardData?.files || [])]; if (!fs.length) return;
    const t = document.activeElement; if (t && /INPUT|TEXTAREA/.test(t.tagName) && t.id !== "") return;
    if (!lastZone || !lastZone.el.isConnected) return toast("Open an item first, then paste files into it");
    e.preventDefault(); await addFiles(lastZone.owner, fs); lastZone.after();
  });
  window.addEventListener("dragover", e => { if ([...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
  window.addEventListener("drop", e => { if (e.dataTransfer.files.length) e.preventDefault(); });
  window.addEventListener("resize", remeasureTabs);
  document.fonts?.ready.then(remeasureTabs);
  window.addEventListener("beforeunload", flushNow);
}

function start(profile, restoreFile, avatar) {
  useProfile(profile);
  applyPrefs(); applyLabels();
  try { if (!localStorage.getItem(KEY)) persist(); } catch (e) {}
  wire();
  navigator.storage?.persist?.().catch(() => {});
  renderHud(); renderAvatar(); tick(); setInterval(tick, 1000);
  let startView = "now"; try { startView = sessionStorage.getItem("persoatlas.view") || "now"; } catch (e) {}
  setView(S.meta.updated && !restoreFile ? startView : "now");
  renderSaveChip();
  if (bootNote) { persist(); setTimeout(() => toast(bootNote), 400); }
  probeStorage();
  initFolder();
  if (restoreFile) importJSON(restoreFile);
  if (avatar) setAvatar(avatar);
}

const current = activeProfile();
let wantsNew = false;
try { wantsNew = sessionStorage.getItem("persoatlas.onboard") === "1"; sessionStorage.removeItem("persoatlas.onboard"); } catch (e) {}
(async () => {
  if (wantsNew) return openOnboarding({ canCancel: true, onDone: start, onCancel: () => start(current) });
  const splash = showSplash(current);
  if (current) start(current);
  await splash.ready;
  splash.hide();
  if (!current) openOnboarding({ canCancel: false, onDone: start });
})();
