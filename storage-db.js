/**
 * Morrow — IndexedDB Local-First Storage Engine (`storage-db.js`)
 * 
 * Responsibilities:
 * 1. Provides fast, transaction-safe persistent storage using native browser IndexedDB.
 * 2. Implements durable change tracking (`outbox`) for incremental cloud sync.
 * 3. Implements durable tombstones (`tombstones`) to permanently prevent deleted records
 *    from being resurrected by stale devices.
 * 4. Safely migrates existing user data from `localStorage` on first boot without deleting backups.
 */

(function() {
  const DB_NAME = 'morrow_db';
  const DB_VERSION = 1;

  let dbInstance = null;
  let initPromise = null;

  // Open & initialize IndexedDB schema
  function openDatabase() {
    if (dbInstance) return Promise.resolve(dbInstance);
    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Topics Store
        if (!db.objectStoreNames.contains('topics')) {
          const topicStore = db.createObjectStore('topics', { keyPath: 'id' });
          topicStore.createIndex('missionId', 'missionId', { unique: false });
          topicStore.createIndex('subject', 'subject', { unique: false });
          topicStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          topicStore.createIndex('deleted', 'deleted', { unique: false });
        }

        // 2. Missions Store
        if (!db.objectStoreNames.contains('missions')) {
          const missionStore = db.createObjectStore('missions', { keyPath: 'id' });
          missionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 3. Settings / App State Store (reminders, stats, active_mission)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // 4. Tombstones Store (durable deletion log for resurrection prevention)
        if (!db.objectStoreNames.contains('tombstones')) {
          const tombstoneStore = db.createObjectStore('tombstones', { keyPath: 'id' });
          tombstoneStore.createIndex('entityType', 'entityType', { unique: false });
          tombstoneStore.createIndex('entityId', 'entityId', { unique: false });
          tombstoneStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        }

        // 5. Outbox Store (durable queue of pending changes for Firestore)
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
          outboxStore.createIndex('status', 'status', { unique: false });
          outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 6. Sync Metadata Store (cursors, deviceId, migration flags)
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('MorrowDB: Failed to open IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });

    return initPromise;
  }

  // Helper for generic transaction execution
  async function runTx(storeNames, mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const stores = Array.isArray(storeNames)
        ? storeNames.map(s => tx.objectStore(s))
        : tx.objectStore(storeNames);

      let result;
      try {
        result = callback(stores, tx);
      } catch (err) {
        return reject(err);
      }

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  // Generate or retrieve persistent device UUID
  function getDeviceId() {
    let id = localStorage.getItem('morrow_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      try { localStorage.setItem('morrow_device_id', id); } catch(e){}
    }
    return id;
  }

  /* ==========================================================================
     TOPICS OPERATIONS
     ========================================================================== */

  async function getTopic(id) {
    const numOrStrId = isNaN(id) ? String(id) : Number(id);
    return runTx('topics', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(numOrStrId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function getAllTopics(missionId = null, includeDeleted = false) {
    return runTx('topics', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        let req;
        if (missionId) {
          const index = store.index('missionId');
          req = index.getAll(missionId);
        } else {
          req = store.getAll();
        }
        req.onsuccess = () => {
          let results = req.result || [];
          if (!includeDeleted) {
            results = results.filter(t => !t.deleted);
          }
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function putTopic(topic, queueOutbox = true) {
    const now = Date.now();
    const normalized = {
      ...topic,
      id: isNaN(topic.id) ? String(topic.id) : Number(topic.id),
      missionId: topic.missionId || 'upsc',
      version: queueOutbox ? ((Number(topic.version) || 0) + 1) : (Number(topic.version) || 1),
      updatedAt: queueOutbox ? now : (topic.updatedAt || now),
      deleted: !!topic.deleted,
      deletedAt: topic.deletedAt || null
    };

    const stores = queueOutbox ? ['topics', 'outbox'] : ['topics'];

    await runTx(stores, 'readwrite', (s) => {
      const topicStore = Array.isArray(s) ? s[0] : s;
      topicStore.put(normalized);

      if (queueOutbox) {
        const outboxStore = s[1];
        outboxStore.add({
          entityType: 'topic',
          entityId: String(normalized.id),
          missionId: normalized.missionId,
          operation: 'upsert',
          payload: normalized,
          version: normalized.version,
          timestamp: now,
          status: 'pending'
        });
      }
    });

    return normalized;
  }

  async function deleteTopic(id, queueOutbox = true) {
    const numOrStrId = isNaN(id) ? String(id) : Number(id);
    const now = Date.now();
    const tombstoneId = 'topic_' + numOrStrId;

    const stores = queueOutbox ? ['topics', 'tombstones', 'outbox'] : ['topics', 'tombstones'];

    await runTx(stores, 'readwrite', (s) => {
      const topicStore = queueOutbox ? s[0] : s[0];
      const tombstoneStore = queueOutbox ? s[1] : s[1];

      // 1. Fetch existing topic if any to increment version cleanly
      const getReq = topicStore.get(numOrStrId);
      getReq.onsuccess = () => {
        const existing = getReq.result || {};
        const newVersion = (Number(existing.version) || 0) + 1;

        const softDeleted = {
          ...existing,
          id: numOrStrId,
          deleted: true,
          deletedAt: now,
          updatedAt: now,
          version: newVersion
        };

        // 2. Mark deleted in topics store (soft-delete preserves record history)
        topicStore.put(softDeleted);

        // 3. Insert durable tombstone record
        tombstoneStore.put({
          id: tombstoneId,
          entityType: 'topic',
          entityId: String(numOrStrId),
          missionId: existing.missionId || 'upsc',
          deletedAt: now,
          version: newVersion
        });

        // 4. Queue outbox deletion operation
        if (queueOutbox) {
          const outboxStore = s[2];
          outboxStore.add({
            entityType: 'topic',
            entityId: String(numOrStrId),
            missionId: existing.missionId || 'upsc',
            operation: 'delete',
            payload: {
              id: String(numOrStrId),
              _deleted: true,
              _deletedAt: now,
              _version: newVersion
            },
            version: newVersion,
            timestamp: now,
            status: 'pending'
          });
        }
      };
    });

    return true;
  }

  /* ==========================================================================
     MISSIONS OPERATIONS
     ========================================================================== */

  async function getMission(id) {
    return runTx('missions', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(String(id));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function getAllMissions(includeDeleted = false) {
    return runTx('missions', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          let results = req.result || [];
          if (!includeDeleted) {
            results = results.filter(m => !m.deleted);
          }
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function putMission(mission, queueOutbox = true) {
    const now = Date.now();
    const normalized = {
      ...mission,
      id: String(mission.id),
      version: queueOutbox ? ((Number(mission.version) || 0) + 1) : (Number(mission.version) || 1),
      updatedAt: queueOutbox ? now : (mission.updatedAt || now),
      deleted: !!mission.deleted,
      deletedAt: mission.deletedAt || null
    };

    const stores = queueOutbox ? ['missions', 'outbox'] : ['missions'];

    await runTx(stores, 'readwrite', (s) => {
      const missionStore = Array.isArray(s) ? s[0] : s;
      missionStore.put(normalized);

      if (queueOutbox) {
        const outboxStore = s[1];
        outboxStore.add({
          entityType: 'mission',
          entityId: normalized.id,
          operation: 'upsert',
          payload: normalized,
          version: normalized.version,
          timestamp: now,
          status: 'pending'
        });
      }
    });

    return normalized;
  }

  async function deleteMission(id, queueOutbox = true) {
    const mId = String(id);
    const now = Date.now();
    const tombstoneId = 'mission_' + mId;

    const stores = queueOutbox ? ['missions', 'tombstones', 'outbox'] : ['missions', 'tombstones'];

    await runTx(stores, 'readwrite', (s) => {
      const missionStore = s[0];
      const tombstoneStore = s[1];

      const getReq = missionStore.get(mId);
      getReq.onsuccess = () => {
        const existing = getReq.result || {};
        const newVersion = (Number(existing.version) || 0) + 1;

        missionStore.put({
          ...existing,
          id: mId,
          deleted: true,
          deletedAt: now,
          updatedAt: now,
          version: newVersion
        });

        tombstoneStore.put({
          id: tombstoneId,
          entityType: 'mission',
          entityId: mId,
          deletedAt: now,
          version: newVersion
        });

        if (queueOutbox) {
          const outboxStore = s[2];
          outboxStore.add({
            entityType: 'mission',
            entityId: mId,
            operation: 'delete',
            payload: {
              id: mId,
              _deleted: true,
              _deletedAt: now,
              _version: newVersion
            },
            version: newVersion,
            timestamp: now,
            status: 'pending'
          });
        }
      };
    });

    return true;
  }

  /* ==========================================================================
     SETTINGS & TOMBSTONES OPERATIONS
     ========================================================================== */

  async function getSetting(id) {
    return runTx('settings', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function putSetting(id, data, queueOutbox = true) {
    const now = Date.now();
    const stores = queueOutbox ? ['settings', 'outbox'] : ['settings'];

    await runTx(stores, 'readwrite', (s) => {
      const settingStore = Array.isArray(s) ? s[0] : s;
      settingStore.put({
        id,
        data,
        updatedAt: now
      });

      if (queueOutbox) {
        const outboxStore = s[1];
        outboxStore.add({
          entityType: 'setting',
          entityId: id,
          operation: 'upsert',
          payload: data,
          timestamp: now,
          status: 'pending'
        });
      }
    });
  }

  async function getTombstone(tombstoneId) {
    return runTx('tombstones', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(tombstoneId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function putTombstone(tombstone) {
    return runTx('tombstones', 'readwrite', (store) => {
      store.put(tombstone);
    });
  }

  /* ==========================================================================
     OUTBOX OPERATIONS (SYNC QUEUE)
     ========================================================================== */

  async function getOutboxBatch(limit = 50) {
    return runTx('outbox', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result || [])
            .filter(i => i.status === 'pending')
            .slice(0, limit);
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function removeOutboxItems(ids) {
    if (!ids || !ids.length) return;
    return runTx('outbox', 'readwrite', (store) => {
      ids.forEach(id => store.delete(id));
    });
  }

  async function getSyncMeta(key) {
    return runTx('sync_meta', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async function setSyncMeta(key, value) {
    return runTx('sync_meta', 'readwrite', (store) => {
      store.put({ key, value, updatedAt: Date.now() });
    });
  }

  /* ==========================================================================
     SAFE LOCALSTORAGE MIGRATION
     ========================================================================== */

  async function migrateFromLocalStorageIfNeeded() {
    const isMigrated = await getSyncMeta('migrated_from_localstorage');
    if (isMigrated) {
      return false; // Already migrated safely
    }

    console.info('MorrowDB: Ingesting existing localStorage data into IndexedDB...');

    try {
      // 1. Ingest Missions
      let rawMissions = null;
      try { rawMissions = JSON.parse(localStorage.getItem('morrowMissions') || 'null'); } catch(e){}
      const defaultStarterMissions = [
        { id: 'upsc', name: 'UPSC CSE', icon: '🏛️', subjects: ['Polity', 'History', 'Economy', 'Geography', 'Environment', 'CSAT', 'Ethics', 'Other'] }
      ];
      const missionsToIngest = (Array.isArray(rawMissions) && rawMissions.length > 0)
        ? rawMissions 
        : ((window.DEFAULT_MISSIONS && window.DEFAULT_MISSIONS.length > 0) ? window.DEFAULT_MISSIONS : defaultStarterMissions);

      const now = Date.now();

      for (const m of missionsToIngest) {
        await putMission({
          ...m,
          id: String(m.id),
          version: 1,
          updatedAt: now,
          deleted: false
        }, false); // Do not queue outbox during local migration

        // 2. Ingest Topics for each mission
        const topKey = m.id === 'upsc' ? 'morrowTopics' : `morrow_${m.id}_topics`;
        let rawTopics = [];
        try { rawTopics = JSON.parse(localStorage.getItem(topKey) || 'null') || []; } catch(e){}

        if (Array.isArray(rawTopics)) {
          for (const t of rawTopics) {
            await putTopic({
              ...t,
              id: isNaN(t.id) ? String(t.id) : Number(t.id),
              missionId: String(m.id),
              version: 1,
              updatedAt: t.lastReviewed || now,
              deleted: false
            }, false);
          }
        }

        // 3. Ingest Done Stats
        const doneKey = m.id === 'upsc' ? 'morrowDone' : `morrow_${m.id}_done`;
        const doneCount = Number(localStorage.getItem(doneKey) || 0);
        await putSetting(`done_${m.id}`, doneCount, false);
      }

      // 4. Ingest Reminders
      let rawReminders = null;
      try { rawReminders = JSON.parse(localStorage.getItem('morrowReminderSettings') || 'null'); } catch(e){}
      if (rawReminders) {
        await putSetting('reminders', rawReminders, false);
      }

      // 5. Ingest Active Mission
      const activeMission = localStorage.getItem('morrowActiveMission') || 'upsc';
      await putSetting('active_mission', activeMission, false);

      // Mark migration complete in sync_meta
      await setSyncMeta('migrated_from_localstorage', {
        timestamp: now,
        deviceId: getDeviceId()
      });

      console.info('MorrowDB: Safe migration from localStorage completed successfully.');
      return true;
    } catch (err) {
      console.error('MorrowDB: Safe migration failed:', err);
      return false;
    }
  }

  // Public Interface
  window.MorrowDB = {
    open: openDatabase,
    getDeviceId,
    getTopic,
    getAllTopics,
    putTopic,
    deleteTopic,
    getMission,
    getAllMissions,
    putMission,
    deleteMission,
    getSetting,
    putSetting,
    getTombstone,
    putTombstone,
    getOutboxBatch,
    removeOutboxItems,
    getSyncMeta,
    setSyncMeta,
    migrateFromLocalStorageIfNeeded
  };
})();
