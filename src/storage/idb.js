import { DB_NAME } from "../core/state.js";
export const IDB={_db:null,
  open(){if(this._db)return Promise.resolve(this._db);return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,2);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("kv"))d.createObjectStore("kv");if(!d.objectStoreNames.contains("files"))d.createObjectStore("files");};
    r.onsuccess=()=>{this._db=r.result;res(r.result);};r.onerror=()=>rej(r.error);});},
  async get(k,store="kv"){const db=await this.open();return new Promise(res=>{const q=db.transaction(store).objectStore(store).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(null);});},
  async set(k,v,store="kv"){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});},
  async del(k,store="kv"){const db=await this.open();return new Promise(res=>{const t=db.transaction(store,"readwrite");t.objectStore(store).delete(k);t.oncomplete=()=>res();t.onerror=()=>res();});}};
