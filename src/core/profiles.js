/* Profiles: one browser can hold several independent atlases (e.g. a degree, a side project, a career change).
   Each has its own state key in localStorage and its own IndexedDB database for attachments. */
const REG = "persoatlas.profiles";
export const stateKey = id => `persoatlas.p.${id}`;
export const preUpgradeKey = id => `persoatlas.p.${id}.preUpgrade`;
export const dbName = id => `persoatlas-${id}`;

export function readProfiles() {
  try { const r = JSON.parse(localStorage.getItem(REG)); if (r && Array.isArray(r.list)) return r; } catch (e) {}
  return { active: null, list: [] };
}
export function writeProfiles(r) { localStorage.setItem(REG, JSON.stringify(r)); }
export function activeProfile() {
  const r = readProfiles();
  return r.list.find(p => p.id === r.active) || r.list[0] || null;
}
export function createProfile({ name, packId }) {
  const r = readProfiles();
  const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  r.list.push({ id, name: name || "My atlas", packId, created: new Date().toISOString() });
  r.active = id; writeProfiles(r);
  return id;
}
export function updateProfile(id, patch) {
  const r = readProfiles(), p = r.list.find(x => x.id === id);
  if (p) { Object.assign(p, patch); writeProfiles(r); }
}
export function setActive(id) { const r = readProfiles(); r.active = id; writeProfiles(r); }
export async function deleteProfile(id) {
  const r = readProfiles();
  r.list = r.list.filter(p => p.id !== id);
  if (r.active === id) r.active = r.list[0]?.id || null;
  writeProfiles(r);
  try { localStorage.removeItem(stateKey(id)); localStorage.removeItem(preUpgradeKey(id)); } catch (e) {}
  await new Promise(res => { try { const q = indexedDB.deleteDatabase(dbName(id)); q.onsuccess = q.onerror = q.onblocked = () => res(); } catch (e) { res(); } });
}
