/* Device-local libraries; verified account namespaces are selected by product.js. */
(() => {
  let database,
    namespace = 'guest',
    revision = 0,
    queue = Promise.resolve();
  const open = () =>
    (database ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(
        namespace === 'guest'
          ? 'omnilearn-library'
          : `omnilearn-library:${namespace}`,
        1
      );
      request.onupgradeneeded = () => {
        request.result.createObjectStore('state');
        request.result.createObjectStore('files');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        db.onclose = () => { database = undefined; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new Error('Tutup tab OmniLearn lain untuk membuka penyimpanan.')
        );
    }));
  async function read(store, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function enqueue(operation) {
    const next = queue.catch(() => {}).then(operation);
    queue = next;
    return next;
  }
  window.OmniLocalLibrary = {
    async setNamespace(owner = 'guest') {
      if (!/^[\w-]{1,128}$/.test(owner))
        throw new Error('Identitas pustaka tidak valid.');
      return enqueue(async () => {
      if (owner === namespace) return;
      if (database) {
        try {
          (await database).close();
        } catch {}
      }
      database = undefined;
      revision = 0;
      namespace = owner;
      });
    },
    load() { return enqueue(async () => {
      const saved = await read('state', 'library');
      revision = saved?.revision || 0;
      return saved?.value || null;
    }); },
    save(value) {
      const copy = structuredClone(value);
      return enqueue(async () => {
        const db = await open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('state', 'readwrite');
          const store = tx.objectStore('state');
          let conflict = false;
          const request = store.get('library');
          request.onsuccess = () => {
            if ((request.result?.revision || 0) !== revision) {
              conflict = true;
              tx.abort();
              return;
            }
            store.put({ revision: revision + 1, value: copy }, 'library');
          };
          tx.oncomplete = () => {
            revision++;
            resolve();
          };
          tx.onabort = () =>
            reject(
              new Error(
                conflict
                  ? 'Data berubah di tab lain. Ekspor perubahanmu lalu muat ulang agar tidak menimpa data.'
                  : 'Penyimpanan perangkat gagal. Ekspor cadangan.'
              )
            );
          tx.onerror = () => {};
        });
      });
    },
    importData(value, files = []) {
      const copy = structuredClone(value);
      return enqueue(async () => {
        const db = await open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['state', 'files'], 'readwrite'),
            state = tx.objectStore('state'),
            request = state.get('library');
          let conflict = false;
          request.onsuccess = () => {
            if ((request.result?.revision || 0) !== revision) {
              conflict = true;
              tx.abort();
              return;
            }
            if (request.result)
              state.put(request.result.value, 'before-import');
            state.put({ revision: revision + 1, value: copy }, 'library');
            for (const file of files)
              tx.objectStore('files').put(
                file.file,
                `${file.sourceId}:${file.version}`
              );
          };
          tx.oncomplete = () => {
            revision++;
            resolve();
          };
          tx.onabort = () =>
            reject(
              new Error(
                conflict
                  ? 'Data berubah di tab lain. Muat ulang sebelum impor.'
                  : 'Impor dibatalkan; data lama tetap utuh.'
              )
            );
          tx.onerror = () => {};
        });
      });
    },
    saveFile(sourceId, version, file) {
      return enqueue(async () => {
        const db = await open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('files', 'readwrite');
          tx.objectStore('files').put(file, `${sourceId}:${version}`);
          tx.oncomplete = resolve;
          tx.onabort = () =>
            reject(tx.error || new Error('File asli belum tersimpan.'));
        });
      });
    },
    readFile: (sourceId, version = 1) =>
      enqueue(() => read('files', `${sourceId}:${version}`)),
    readRollback: () => enqueue(() => read('state', 'before-import')),
    deleteSourceFiles(sourceId) {
      return enqueue(async () => {
        const db = await open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('files', 'readwrite');
          const cursor = tx.objectStore('files').openCursor();
          cursor.onsuccess = () => {
            const item = cursor.result;
            if (item) {
              if (String(item.key).startsWith(sourceId + ':')) item.delete();
              item.continue();
            }
          };
          tx.oncomplete = resolve;
          tx.onabort = () => reject(tx.error);
        });
      });
    },
    clear() {
      return enqueue(async () => {
        const db = await open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['state', 'files'], 'readwrite');
          const state = tx.objectStore('state');
          const current = state.get('library');
          let nextRevision;
          current.onsuccess = () => {
            state.delete('before-import');
            nextRevision = (current.result?.revision || 0) + 1;
            // Keep an empty tombstone so another tab cannot reimport an old
            // sessionStorage snapshot after this deliberate device-wide erase.
            state.put(
              {
                revision: nextRevision,
                value: {
                  schemaVersion: 1,
                  clearedAt: Date.now(),
                  sources: [],
                  profile: {},
                  activity: { events: [] },
                  stickyNotes: [],
                  freeChat: [],
                  freeNote: '',
                },
              },
              'library'
            );
          };
          tx.objectStore('files').clear();
          tx.oncomplete = () => {
            revision = nextRevision;
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        });
      });
    },
    flush: () => queue,
  };
})();
