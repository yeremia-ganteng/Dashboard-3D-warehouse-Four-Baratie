// Wrapper IndexedDB kecil (tanpa dependensi): snapshot state + antrean sinkronisasi
let dbp;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('baratie-demo', 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('kv');
        r.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}
const tx = (store, mode, fn) =>
  db().then((d) => new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && req.result);
    t.onerror = t.onabort = () => rej(t.error);
  }));

export const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
export const kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
export const queueAdd = (op) => tx('queue', 'readwrite', (s) => s.add(op));
export const queueAll = () => tx('queue', 'readonly', (s) => s.getAll());
export const queueDelete = (id) => tx('queue', 'readwrite', (s) => s.delete(id));
export const queueCount = () => tx('queue', 'readonly', (s) => s.count());