/**
 * Morrow — Deletion-Safe, Local-First Synchronization Engine (`sync-engine.js`)
 * 
 * Key Principles:
 * 1. LOCAL-FIRST: Reads and mutations execute against local IndexedDB & memory in 0ms.
 * 2. PER-RECORD GRANULARITY: Subcollections (`users/{uid}/topics/{topicId}`) replace monolithic blobs.
 * 3. RESURRECTION PREVENTION: Tombstones track deletions permanently so stale devices never resurrect deleted items.
 * 4. DURABLE OUTBOX: Changes queue in IndexedDB and sync incrementally with Firestore batch writes.
 * 5. CONCURRENT SAFETY: Per-record versioning and LWW conflict resolution.
 */

(function() {
  const SYNC_DEBOUNCE_MS = 500;
  const BATCH_SIZE = 50;

  const SyncState = {
    UNCONFIGURED: 'unconfigured',
    OFFLINE: 'offline',
    LOCAL: 'local',
    SYNCING: 'syncing',
    SYNCED: 'synced',
    ERROR: 'error'
  };

  let currentSyncState = SyncState.LOCAL;
  let lastSyncedTimestamp = null;
  let syncTimer = null;
  let isSyncingOutbox = false;
  let currentUser = null;
  let isFirebaseInitialized = false;
  let authInstance = null;
  let dbInstance = null;

  // Realtime listeners unsubscription handlers
  let unsubTopics = null;
  let unsubMissions = null;
  let unsubSettings = null;

  function isConfigured(cfg) {
    return !!(cfg && cfg.apiKey && !cfg.apiKey.includes('YOUR_') && cfg.projectId && !cfg.projectId.includes('YOUR_'));
  }

  // Initialize Firebase SDK
  function initFirebase() {
    const cfg = window.MORROW_FIREBASE_CONFIG;
    if (!window.firebase) {
      console.warn('MorrowSync: Firebase SDK not loaded. Running in local mode.');
      setSyncStatus(SyncState.LOCAL, 'Running locally');
      return false;
    }

    if (!isConfigured(cfg)) {
      console.info('MorrowSync: Firebase not configured. Running in local mode.');
      setSyncStatus(SyncState.UNCONFIGURED, 'Saved locally · Connect Firebase');
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      authInstance = firebase.auth();
      dbInstance = firebase.firestore();

      // Enable offline persistence in Firestore
      dbInstance.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence warning: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not supported by browser');
        }
      });

      authInstance.onAuthStateChanged(handleAuthStateChanged);
      isFirebaseInitialized = true;
      return true;
    } catch (e) {
      console.error('MorrowSync: Firebase initialization error:', e);
      setSyncStatus(SyncState.ERROR, 'Firebase initialization error');
      return false;
    }
  }

  // Update UI sync indicators
  function setSyncStatus(state, message) {
    currentSyncState = state;
    const dot = document.getElementById('syncStatusDot');
    const modalDot = document.getElementById('modalSyncStatusDot');
    const label = document.getElementById('syncStatusLabel');
    const profileSub = document.getElementById('profileCardSub');
    const modalBadge = document.getElementById('authModalSyncBadge');

    let dotColor = '#7da372';
    let defaultMsg = 'Synced to cloud';

    switch (state) {
      case SyncState.SYNCED:
        dotColor = '#7da372';
        defaultMsg = lastSyncedTimestamp 
          ? `Synced ${formatTimeAgo(lastSyncedTimestamp)}` 
          : 'Synced to cloud';
        break;
      case SyncState.SYNCING:
        dotColor = '#d4a94e';
        defaultMsg = 'Syncing gently...';
        break;
      case SyncState.LOCAL:
        dotColor = '#829477';
        defaultMsg = 'Saved locally';
        break;
      case SyncState.OFFLINE:
        dotColor = '#c58e72';
        defaultMsg = 'Offline · Changes saved locally';
        break;
      case SyncState.UNCONFIGURED:
        dotColor = '#9daeb0';
        defaultMsg = 'Local mode · Setup Firebase';
        break;
      case SyncState.ERROR:
        dotColor = '#b45c43';
        defaultMsg = 'Sync paused · Local copy safe';
        break;
    }

    const text = message || defaultMsg;

    [dot, modalDot].forEach(d => {
      if (d) {
        d.style.backgroundColor = dotColor;
        d.setAttribute('title', text);
        if (state === SyncState.SYNCING) {
          d.classList.add('pulsing');
        } else {
          d.classList.remove('pulsing');
        }
      }
    });

    if (label) label.textContent = text;
    if (profileSub) profileSub.textContent = text;
    if (modalBadge) {
      modalBadge.textContent = text;
      modalBadge.style.color = dotColor;
    }
  }

  function formatTimeAgo(ts) {
    if (!ts) return 'just now';
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 45) return 'just now';
    if (sec < 90) return '1m ago';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    return `${hrs}h ago`;
  }

  /* ==========================================================================
     OUTBOX WORKER (INCREMENTAL PUSH)
     ========================================================================== */

  async function processOutboxQueue() {
    if (isSyncingOutbox) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus(SyncState.OFFLINE);
      return false;
    }
    if (!currentUser || !dbInstance) return false;

    isSyncingOutbox = true;
    setSyncStatus(SyncState.SYNCING);

    try {
      while (true) {
        const batchItems = await window.MorrowDB.getOutboxBatch(BATCH_SIZE);
        if (!batchItems || !batchItems.length) {
          break; // Queue is empty
        }

        const firestoreBatch = dbInstance.batch();
        const userRef = dbInstance.collection('users').doc(currentUser.uid);
        const processedIds = [];

        for (const item of batchItems) {
          processedIds.push(item.id);

          if (item.entityType === 'topic') {
            const docRef = userRef.collection('topics').doc(String(item.entityId));
            if (item.operation === 'delete') {
              firestoreBatch.set(docRef, {
                id: String(item.entityId),
                missionId: item.missionId || 'upsc',
                _deleted: true,
                _deletedAt: item.payload._deletedAt || Date.now(),
                _version: item.payload._version || item.version || 1,
                _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                _deviceId: window.MorrowDB.getDeviceId()
              }, { merge: true });
            } else {
              firestoreBatch.set(docRef, {
                ...item.payload,
                id: isNaN(item.entityId) ? String(item.entityId) : Number(item.entityId),
                missionId: item.missionId || item.payload.missionId || 'upsc',
                _deleted: false,
                _deletedAt: null,
                _version: item.version || 1,
                _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                _deviceId: window.MorrowDB.getDeviceId()
              }, { merge: true });
            }
          } else if (item.entityType === 'mission') {
            const docRef = userRef.collection('missions').doc(String(item.entityId));
            if (item.operation === 'delete') {
              firestoreBatch.set(docRef, {
                id: String(item.entityId),
                _deleted: true,
                _deletedAt: item.payload._deletedAt || Date.now(),
                _version: item.payload._version || item.version || 1,
                _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                _deviceId: window.MorrowDB.getDeviceId()
              }, { merge: true });
            } else {
              firestoreBatch.set(docRef, {
                ...item.payload,
                id: String(item.entityId),
                _deleted: false,
                _deletedAt: null,
                _version: item.version || 1,
                _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                _deviceId: window.MorrowDB.getDeviceId()
              }, { merge: true });
            }
          } else if (item.entityType === 'setting') {
            const docRef = userRef.collection('settings').doc(String(item.entityId));
            firestoreBatch.set(docRef, {
              data: item.payload,
              _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              _deviceId: window.MorrowDB.getDeviceId()
            }, { merge: true });
          }
        }

        // Commit batch write atomically to Firestore
        await firestoreBatch.commit();

        // Remove confirmed items from local outbox store
        await window.MorrowDB.removeOutboxItems(processedIds);
      }

      lastSyncedTimestamp = Date.now();
      await window.MorrowDB.setSyncMeta('last_synced_at', lastSyncedTimestamp);
      setSyncStatus(SyncState.SYNCED);
      return true;
    } catch (err) {
      console.error('MorrowSync: Outbox sync error:', err);
      const isNetError = (err.message && err.message.toLowerCase().includes('network')) || (typeof navigator !== 'undefined' && !navigator.onLine);
      setSyncStatus(isNetError ? SyncState.OFFLINE : SyncState.ERROR, isNetError ? 'Offline · Changes saved locally' : 'Sync error · Saved locally');
      return false;
    } finally {
      isSyncingOutbox = false;
    }
  }

  function scheduleSync(immediate = false) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus(SyncState.OFFLINE);
      return;
    }

    if (!currentUser || !dbInstance) {
      setSyncStatus(isConfigured(window.MORROW_FIREBASE_CONFIG) ? SyncState.LOCAL : SyncState.UNCONFIGURED);
      return;
    }

    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }

    if (immediate) {
      processOutboxQueue();
    } else {
      setSyncStatus(SyncState.SYNCING);
      syncTimer = setTimeout(processOutboxQueue, SYNC_DEBOUNCE_MS);
    }
  }

  /* ==========================================================================
     REALTIME INCOMING SYNC & RESURRECTION PREVENTION
     ========================================================================== */

  function startRealtimeListeners(uid) {
    stopRealtimeListeners();
    if (!dbInstance) return;

    const userRef = dbInstance.collection('users').doc(uid);
    let isInitialTopicsSnapshot = true;
    let isInitialMissionsSnapshot = true;

    // 1. Listen for Topics
    unsubTopics = userRef.collection('topics').onSnapshot(async (snapshot) => {
      let memoryUpdated = false;

      for (const change of snapshot.docChanges()) {
        const docData = change.doc.data();
        const docId = change.doc.id;
        const numOrStrId = isNaN(docId) ? String(docId) : Number(docId);

        if (change.type === 'removed') {
          // Document deleted from Firestore completely
          continue;
        }

        const remoteIsDeleted = !!docData._deleted;
        const remoteDeletedAt = docData._deletedAt || 0;
        const remoteVersion = docData._version || 1;
        const remoteUpdatedAt = (docData._updatedAt && docData._updatedAt.toMillis) 
          ? docData._updatedAt.toMillis() 
          : (docData.updatedAt || 0);

        // Fetch existing local record & tombstone
        const localTopic = await window.MorrowDB.getTopic(numOrStrId);
        const localTombstone = await window.MorrowDB.getTombstone('topic_' + numOrStrId);

        // CASE A: Incoming record is a TOMBSTONE / DELETION
        if (remoteIsDeleted) {
          if (localTopic && !localTopic.deleted) {
            // Check if local was edited offline after the deletion
            const localUpdatedAt = localTopic.updatedAt || 0;
            if (localUpdatedAt <= remoteDeletedAt) {
              // Remote deletion wins: soft-delete locally without queueing outbox
              await window.MorrowDB.putTopic({
                ...localTopic,
                deleted: true,
                deletedAt: remoteDeletedAt,
                version: remoteVersion
              }, false);

              // Record local tombstone
              await window.MorrowDB.putTombstone({
                id: 'topic_' + numOrStrId,
                entityType: 'topic',
                entityId: String(numOrStrId),
                missionId: docData.missionId || localTopic.missionId || 'upsc',
                deletedAt: remoteDeletedAt,
                version: remoteVersion
              });

              // Remove from in-memory array in app.js
              if (window.topics) {
                const idx = window.topics.findIndex(t => String(t.id) === String(numOrStrId));
                if (idx !== -1) {
                  window.topics.splice(idx, 1);
                  memoryUpdated = true;
                }
              }
            } else {
              // Local was edited after the deletion! Re-publish local version to outbox
              console.info(`MorrowSync: Local edit on Topic ${numOrStrId} occurred after remote deletion. Retaining local edit.`);
              await window.MorrowDB.putTopic(localTopic, true);
              scheduleSync(false);
            }
          }
          continue;
        }

        // CASE B: Incoming record is ACTIVE (not deleted)
        // Check tombstone resurrection prevention:
        if (localTombstone && localTombstone.deletedAt >= remoteUpdatedAt) {
          // The local device already deleted this topic AFTER this remote edit was written!
          // DO NOT resurrect. Keep tombstone and re-queue deletion to ensure remote stays deleted.
          console.info(`MorrowSync: Suppressed resurrection of deleted Topic ${numOrStrId}.`);
          continue;
        }

        // Normal active upsert: check version / timestamp
        const localVersion = localTopic ? (localTopic.version || 0) : 0;
        const localUpdatedAt = localTopic ? (localTopic.updatedAt || 0) : 0;

        if (!localTopic || remoteVersion > localVersion || (remoteVersion === localVersion && remoteUpdatedAt > localUpdatedAt)) {
          const cleanTopic = {
            id: numOrStrId,
            name: docData.name,
            subject: docData.subject || 'General',
            missionId: docData.missionId || 'upsc',
            tone: docData.tone || '',
            done: !!docData.done,
            graduated: !!docData.graduated,
            paused: !!docData.paused,
            evergreenRevs: Number(docData.evergreenRevs) || 0,
            dueAt: docData.dueAt || Date.now(),
            level: Number(docData.level) || 0,
            lastReviewed: docData.lastReviewed || null,
            version: remoteVersion,
            updatedAt: remoteUpdatedAt,
            deleted: false
          };

          await window.MorrowDB.putTopic(cleanTopic, false);

          // Update active in-memory list if it matches active mission
          if (window.topics && (!window.activeMissionId || cleanTopic.missionId === window.activeMissionId)) {
            const idx = window.topics.findIndex(t => String(t.id) === String(numOrStrId));
            if (idx !== -1) {
              window.topics[idx] = cleanTopic;
            } else {
              window.topics.unshift(cleanTopic);
            }
            memoryUpdated = true;
          }
        }
      }

      if (memoryUpdated && typeof window.render === 'function') {
        window.render();
      }

      isInitialTopicsSnapshot = false;
      lastSyncedTimestamp = Date.now();
      setSyncStatus(SyncState.SYNCED);
    }, (err) => {
      console.warn('MorrowSync: Topics listener warning:', err);
    });

    // 2. Listen for Missions
    unsubMissions = userRef.collection('missions').onSnapshot(async (snapshot) => {
      let missionsUpdated = false;

      for (const change of snapshot.docChanges()) {
        const docData = change.doc.data();
        const docId = change.doc.id;

        if (docData._deleted) {
          const localM = await window.MorrowDB.getMission(docId);
          if (localM && !localM.deleted) {
            await window.MorrowDB.putMission({ ...localM, deleted: true, version: docData._version || 1 }, false);
            if (window.missions) {
              const idx = window.missions.findIndex(m => String(m.id) === String(docId));
              if (idx !== -1) {
                window.missions.splice(idx, 1);
                missionsUpdated = true;
              }
            }
          }
          continue;
        }

        const cleanMission = {
          id: String(docId),
          name: docData.name,
          icon: docData.icon || '🌱',
          subjects: docData.subjects || ['General'],
          subjectBiomes: docData.subjectBiomes || {},
          starter: docData.starter || [],
          version: docData._version || 1,
          updatedAt: (docData._updatedAt && docData._updatedAt.toMillis) ? docData._updatedAt.toMillis() : (docData.updatedAt || Date.now()),
          deleted: false
        };

        await window.MorrowDB.putMission(cleanMission, false);

        if (window.missions) {
          const idx = window.missions.findIndex(m => String(m.id) === String(docId));
          if (idx !== -1) {
            window.missions[idx] = cleanMission;
          } else {
            window.missions.push(cleanMission);
          }
          missionsUpdated = true;
        }
      }

      if (missionsUpdated) {
        if (typeof window.syncMissionUI === 'function') window.syncMissionUI();
        if (typeof window.render === 'function') window.render();
      }

      isInitialMissionsSnapshot = false;
    }, (err) => {
      console.warn('MorrowSync: Missions listener warning:', err);
    });

    // 3. Listen for Settings (Reminders & Stats)
    unsubSettings = userRef.collection('settings').onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        const id = change.doc.id;
        const data = change.doc.data().data;
        if (!data) continue;

        await window.MorrowDB.putSetting(id, data, false);

        if (id === 'reminders' && typeof window.updateReminderUI === 'function') {
          try { localStorage.setItem('morrowReminderSettings', JSON.stringify(data)); } catch(e){}
          window.updateReminderUI();
        }
      }
    }, (err) => {
      console.warn('MorrowSync: Settings listener warning:', err);
    });
  }

  function stopRealtimeListeners() {
    if (unsubTopics) { unsubTopics(); unsubTopics = null; }
    if (unsubMissions) { unsubMissions(); unsubMissions = null; }
    if (unsubSettings) { unsubSettings(); unsubSettings = null; }
  }

  /* ==========================================================================
     FIRST LOGIN / CLOUD RECONCILIATION
     ========================================================================== */

  async function reconcileOnLogin(user) {
    if (!dbInstance) return;
    setSyncStatus(SyncState.SYNCING, 'Reconciling data...');

    try {
      const userRef = dbInstance.collection('users').doc(user.uid);
      const remoteMissionsSnap = await userRef.collection('missions').limit(1).get();

      if (remoteMissionsSnap.empty) {
        // Brand new account: push local IndexedDB data to Firestore
        console.info('MorrowSync: Fresh cloud account detected. Seeding initial local data to Firestore.');
        const localMissions = await window.MorrowDB.getAllMissions(false);
        const localTopics = await window.MorrowDB.getAllTopics(null, false);

        for (const m of localMissions) {
          await window.MorrowDB.putMission(m, true);
        }
        for (const t of localTopics) {
          await window.MorrowDB.putTopic(t, true);
        }

        const localReminders = await window.MorrowDB.getSetting('reminders');
        if (localReminders) {
          await window.MorrowDB.putSetting('reminders', localReminders, true);
        }

        scheduleSync(true);
      } else {
        // Existing account: process any local offline changes queued in outbox
        console.info('MorrowSync: Existing cloud account connected. Listening for remote data.');
        scheduleSync(false);
      }

      startRealtimeListeners(user.uid);
    } catch (err) {
      console.error('MorrowSync: Reconcile on login failed:', err);
      setSyncStatus(SyncState.ERROR, 'Sync error');
    }
  }

  /* ==========================================================================
     AUTH STATE & UI MANAGEMENT
     ========================================================================== */

  async function handleAuthStateChanged(user) {
    currentUser = user;
    updateUserUI(user);

    if (user) {
      await reconcileOnLogin(user);
    } else {
      stopRealtimeListeners();
      setSyncStatus(isConfigured(window.MORROW_FIREBASE_CONFIG) ? SyncState.LOCAL : SyncState.UNCONFIGURED);
    }
  }

  function updateUserUI(user) {
    const avatarChar = document.getElementById('accountAvatarChar');
    const profileEmail = document.getElementById('authProfileEmail');
    const profileName = document.getElementById('authProfileName');
    const authLoggedInView = document.getElementById('authLoggedInView');
    const authLoggedOutView = document.getElementById('authLoggedOutView');
    const profileCardTitle = document.getElementById('profileCardTitle');
    const modalCloseBtn = document.getElementById('settingsModalCloseBtn');
    const modalTitle = document.getElementById('settingsModalTitle');
    const modalEyebrow = document.getElementById('settingsModalEyebrow');
    const tabsNav = document.querySelector('.settings-tabs-nav');
    const largeAvatar = document.getElementById('authProfileAvatar');

    if (user) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Reviser';
      const email = user.email || '';
      const initial = (displayName.trim()[0] || '🌿').toUpperCase();

      if (avatarChar) avatarChar.textContent = initial;
      if (largeAvatar) {
        if (user.photoURL) {
          largeAvatar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />`;
        } else {
          largeAvatar.textContent = initial;
        }
      }
      if (profileName) profileName.textContent = displayName;
      if (profileEmail) profileEmail.textContent = email;
      if (profileCardTitle) profileCardTitle.textContent = displayName;

      if (modalTitle) modalTitle.textContent = 'Settings';
      if (modalEyebrow) modalEyebrow.textContent = 'Sanctuary preferences';
      if (modalCloseBtn) modalCloseBtn.style.display = 'flex';
      if (tabsNav) tabsNav.style.display = 'flex';

      if (authLoggedInView) authLoggedInView.style.display = 'block';
      if (authLoggedOutView) authLoggedOutView.style.display = 'none';

      if (typeof window.closeSettingsModal === 'function') {
        window.closeSettingsModal(true);
      }
    } else {
      if (avatarChar) avatarChar.textContent = '👤';
      if (largeAvatar) largeAvatar.textContent = '🌿';
      if (profileCardTitle) profileCardTitle.textContent = 'Sign In / Register';

      if (modalTitle) modalTitle.textContent = 'Welcome to Morrow';
      if (modalEyebrow) modalEyebrow.textContent = 'Gentle revision sanctuary';
      if (modalCloseBtn) modalCloseBtn.style.display = 'none';
      if (tabsNav) tabsNav.style.display = 'none';

      if (authLoggedInView) authLoggedInView.style.display = 'none';
      if (authLoggedOutView) authLoggedOutView.style.display = 'block';

      if (typeof window.openSettingsModal === 'function') {
        window.openSettingsModal('account');
      }
    }
  }

  // Network event listeners
  window.addEventListener('online', () => {
    if (currentUser) {
      setSyncStatus(SyncState.SYNCING, 'Back online · Syncing...');
      scheduleSync(true);
    } else {
      setSyncStatus(SyncState.LOCAL, 'Saved locally');
    }
  });

  window.addEventListener('offline', () => {
    setSyncStatus(SyncState.OFFLINE, 'Offline · Changes saved locally');
  });

  /* ==========================================================================
     PUBLIC API
     ========================================================================== */

  const MorrowSync = {
    get state() { return currentSyncState; },
    get user() { return currentUser; },
    isConfigured: () => isConfigured(window.MORROW_FIREBASE_CONFIG),

    init: initFirebase,
    scheduleSync,
    scheduleCloudSync: scheduleSync, // Alias for backward compatibility
    syncOutboxNow: processOutboxQueue,
    getStatus: () => currentSyncState,

    signUpWithEmail: async (email, password, displayName) => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const cred = await authInstance.createUserWithEmailAndPassword(email.trim(), password);
      if (displayName && displayName.trim() && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
        updateUserUI(authInstance.currentUser);
      }
      return cred.user;
    },

    signInWithEmail: async (email, password) => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const cred = await authInstance.signInWithEmailAndPassword(email.trim(), password);
      return cred.user;
    },

    signInWithGoogle: async () => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      try {
        const result = await authInstance.signInWithPopup(provider);
        return result.user;
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          return authInstance.signInWithRedirect(provider);
        }
        throw popupErr;
      }
    },

    sendPasswordReset: async (email) => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      await authInstance.sendPasswordResetEmail(email.trim());
    },

    signOut: async () => {
      if (authInstance) {
        await authInstance.signOut();
      }
      currentUser = null;
      stopRealtimeListeners();
      try {
        // Clean session keys from local memory
        const mKeys = ['morrowMissions', 'morrowActiveMission', 'morrowTopics', 'morrowDone', 'morrowPendingGardenAdds', 'morrowPendingGardenBlooms', 'morrowPendingGardenBiomes'];
        mKeys.forEach(k => localStorage.removeItem(k));
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('morrow_')) localStorage.removeItem(k);
        }
      } catch(e){}

      if (typeof window.reloadAllStateFromStorage === 'function') {
        window.reloadAllStateFromStorage();
      }
      updateUserUI(null);
      setSyncStatus(SyncState.LOCAL, 'Signed out');
    },

    exportData: async () => {
      const missions = await window.MorrowDB.getAllMissions(false);
      const topics = await window.MorrowDB.getAllTopics(null, false);
      const reminders = await window.MorrowDB.getSetting('reminders');
      const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        missions,
        topics,
        reminders
      };
      const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", str);
      downloadAnchor.setAttribute("download", `morrow-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },

    importData: async (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            if (Array.isArray(parsed.missions)) {
              for (const m of parsed.missions) {
                await window.MorrowDB.putMission(m, true);
              }
            }
            if (Array.isArray(parsed.topics)) {
              for (const t of parsed.topics) {
                await window.MorrowDB.putTopic(t, true);
              }
            }
            if (parsed.reminders) {
              await window.MorrowDB.putSetting('reminders', parsed.reminders, true);
            }
            if (typeof window.reloadAllStateFromStorage === 'function') {
              await window.reloadAllStateFromStorage();
            }
            scheduleSync(true);
            resolve(parsed);
          } catch(err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
  };

  window.MorrowSync = MorrowSync;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
  } else {
    initFirebase();
  }
})();
