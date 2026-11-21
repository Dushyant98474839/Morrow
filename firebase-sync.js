/**
 * Morrow — Zero-Buffer-Time Local-First Firebase Sync & Authentication
 * 
 * Philosophy:
 * 1. ZERO BUFFER TIME: All user actions read and write to local storage synchronously (0ms latency).
 *    The UI never blocks or shows spinners waiting for network requests.
 * 2. SEAMLESS CLOUD BACKUP: Local mutations are automatically debounced and synced to Cloud Firestore in the background.
 * 3. GRACEFUL OFFLINE: If offline or Firebase is not yet configured, the app runs 100% locally with full functionality.
 * 4. EFFORTLESS AUTH: Supports Email/Password, Google Sign-in, Guest Mode, and Password Reset.
 */

(function() {
  const SYNC_DEBOUNCE_MS = 600;

  // Sync state representation
  const SyncState = {
    UNCONFIGURED: 'unconfigured', // Firebase credentials not set
    OFFLINE: 'offline',           // Device has no internet
    LOCAL: 'local',               // Working locally (not logged in)
    SYNCING: 'syncing',           // Sending updates to cloud
    SYNCED: 'synced',             // All local changes are synced to cloud
    ERROR: 'error'                // Error syncing
  };

  let currentSyncState = SyncState.LOCAL;
  let lastSyncedTimestamp = null;
  let syncTimer = null;
  let unsubscribeSnapshot = null;
  let currentUser = null;
  let isFirebaseInitialized = false;
  let authInstance = null;
  let dbInstance = null;
  let localMutationVersion = Date.now();

  // Helper to check if configuration looks valid
  function isConfigured(cfg) {
    return !!(cfg && cfg.apiKey && !cfg.apiKey.includes('YOUR_') && cfg.projectId && !cfg.projectId.includes('YOUR_'));
  }

  // Initialize Firebase app & services
  function initFirebase() {
    const cfg = window.MORROW_FIREBASE_CONFIG;
    if (!window.firebase) {
      console.warn('Morrow: Firebase SDK scripts not loaded. Running in local mode.');
      setSyncStatus(SyncState.LOCAL, 'Running locally (offline)');
      return false;
    }

    if (!isConfigured(cfg)) {
      console.info('Morrow: Firebase not configured yet. Running in local mode. Open Account -> Firebase Setup to connect.');
      setSyncStatus(SyncState.UNCONFIGURED, 'Saved locally · Connect Firebase');
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      authInstance = firebase.auth();
      dbInstance = firebase.firestore();

      // Enable offline persistence in Firestore for double-layer offline safety
      dbInstance.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not supported by browser');
        }
      });

      // Listen for auth state changes
      authInstance.onAuthStateChanged(handleAuthStateChanged);

      isFirebaseInitialized = true;
      return true;
    } catch (e) {
      console.error('Morrow: Failed to initialize Firebase:', e);
      setSyncStatus(SyncState.ERROR, 'Firebase initialization error');
      return false;
    }
  }

  // Update sync status indicator in UI
  function setSyncStatus(state, message) {
    currentSyncState = state;
    const dot = document.getElementById('syncStatusDot');
    const modalDot = document.getElementById('modalSyncStatusDot');
    const label = document.getElementById('syncStatusLabel');
    const profileSub = document.getElementById('profileCardSub');
    const modalBadge = document.getElementById('authModalSyncBadge');

    let dotColor = '#7da372'; // green
    let defaultMsg = 'Synced to cloud';

    switch (state) {
      case SyncState.SYNCED:
        dotColor = '#7da372'; // green
        defaultMsg = lastSyncedTimestamp 
          ? `Synced ${formatTimeAgo(lastSyncedTimestamp)}` 
          : 'Synced to cloud';
        break;
      case SyncState.SYNCING:
        dotColor = '#d4a94e'; // amber
        defaultMsg = 'Syncing gently...';
        break;
      case SyncState.LOCAL:
        dotColor = '#829477'; // sage
        defaultMsg = 'Saved locally';
        break;
      case SyncState.OFFLINE:
        dotColor = '#c58e72'; // clay/orange
        defaultMsg = 'Offline · Saved locally';
        break;
      case SyncState.UNCONFIGURED:
        dotColor = '#9daeb0'; // muted blue-gray
        defaultMsg = 'Local mode · Setup Firebase';
        break;
      case SyncState.ERROR:
        dotColor = '#b45c43'; // warm red
        defaultMsg = 'Sync paused · Saved locally';
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

  // Extract all local Morrow data cleanly for cloud sync or export
  function collectLocalState() {
    let missions = [];
    try {
      missions = JSON.parse(localStorage.getItem('morrowMissions') || 'null') || [];
    } catch(e){}

    const activeMissionId = localStorage.getItem('morrowActiveMission') || 'upsc';

    // Collect topics and done counts for every mission in local storage
    const topicsByMission = {};
    const doneByMission = {};

    missions.forEach(m => {
      const topKey = m.id === 'upsc' ? 'morrowTopics' : `morrow_${m.id}_topics`;
      const doneKey = m.id === 'upsc' ? 'morrowDone' : `morrow_${m.id}_done`;
      try {
        topicsByMission[m.id] = JSON.parse(localStorage.getItem(topKey) || 'null') || [];
      } catch(e) {
        topicsByMission[m.id] = [];
      }
      topicsByMission[m.id] = topicsByMission[m.id] || [];
      doneByMission[m.id] = Number(localStorage.getItem(doneKey) || 0);
    });

    // Garden queues
    let gardenAdds = {}, gardenBlooms = {}, gardenBiomes = {};
    try { gardenAdds = JSON.parse(localStorage.getItem('morrowPendingGardenAdds') || '{}'); } catch(e){}
    try { gardenBlooms = JSON.parse(localStorage.getItem('morrowPendingGardenBlooms') || '{}'); } catch(e){}
    try { gardenBiomes = JSON.parse(localStorage.getItem('morrowPendingGardenBiomes') || '{}'); } catch(e){}

    // Reminders settings
    let reminders = null;
    try { reminders = JSON.parse(localStorage.getItem('morrowReminderSettings') || 'null'); } catch(e){}

    return {
      version: 1,
      updatedAt: localMutationVersion,
      activeMissionId,
      missions,
      topicsByMission,
      doneByMission,
      gardenQueues: {
        adds: gardenAdds,
        blooms: gardenBlooms,
        biomes: gardenBiomes
      },
      reminders
    };
  }

  // Merge remote cloud state into local storage safely without losing unsaved changes
  function applyStateToLocal(remoteState) {
    if (!remoteState) return;

    try {
      // 1. Merge Missions
      if (Array.isArray(remoteState.missions) && remoteState.missions.length > 0) {
        let localMissions = [];
        try { localMissions = JSON.parse(localStorage.getItem('morrowMissions') || 'null') || []; } catch(e){}
        
        // Merge mission lists by ID
        const mergedMissionsMap = new Map();
        localMissions.forEach(m => mergedMissionsMap.set(m.id, m));
        remoteState.missions.forEach(m => {
          if (!mergedMissionsMap.has(m.id)) {
            mergedMissionsMap.set(m.id, m);
          } else {
            // Merge subject lists and biomes
            const existing = mergedMissionsMap.get(m.id);
            const subjects = Array.from(new Set([...(existing.subjects || []), ...(m.subjects || [])]));
            const subjectBiomes = Object.assign({}, existing.subjectBiomes || {}, m.subjectBiomes || {});
            mergedMissionsMap.set(m.id, {
              ...existing,
              ...m,
              subjects,
              subjectBiomes
            });
          }
        });

        const mergedMissions = Array.from(mergedMissionsMap.values());
        localStorage.setItem('morrowMissions', JSON.stringify(mergedMissions));
      }

      // 2. Merge Topics per Mission
      if (remoteState.topicsByMission && typeof remoteState.topicsByMission === 'object') {
        Object.keys(remoteState.topicsByMission).forEach(mId => {
          const remoteTopics = remoteState.topicsByMission[mId] || [];
          const topKey = mId === 'upsc' ? 'morrowTopics' : `morrow_${mId}_topics`;
          
          let localTopics = [];
          try { localTopics = JSON.parse(localStorage.getItem(topKey) || 'null') || []; } catch(e){}

          // Merge topics by topic ID
          const topicsMap = new Map();
          localTopics.forEach(t => topicsMap.set(t.id, t));
          remoteTopics.forEach(rt => {
            if (!topicsMap.has(rt.id)) {
              topicsMap.set(rt.id, rt);
            } else {
              // If both exist, take the one with the latest lastReviewed or higher level/evergreenRevs
              const lt = topicsMap.get(rt.id);
              const rtRev = rt.lastReviewed || 0;
              const ltRev = lt.lastReviewed || 0;
              if (rtRev > ltRev || (rt.done && !lt.done) || (rt.level || 0) > (lt.level || 0)) {
                topicsMap.set(rt.id, { ...lt, ...rt });
              }
            }
          });

          localStorage.setItem(topKey, JSON.stringify(Array.from(topicsMap.values())));
        });
      }

      // 3. Done Counts
      if (remoteState.doneByMission) {
        Object.keys(remoteState.doneByMission).forEach(mId => {
          const doneKey = mId === 'upsc' ? 'morrowDone' : `morrow_${mId}_done`;
          const localDone = Number(localStorage.getItem(doneKey) || 0);
          const remoteDone = Number(remoteState.doneByMission[mId] || 0);
          localStorage.setItem(doneKey, Math.max(localDone, remoteDone));
        });
      }

      // 4. Reminders
      if (remoteState.reminders) {
        localStorage.setItem('morrowReminderSettings', JSON.stringify(remoteState.reminders));
      }

      // 5. Active Mission
      if (remoteState.activeMissionId && !localStorage.getItem('morrowActiveMission')) {
        localStorage.setItem('morrowActiveMission', remoteState.activeMissionId);
      }

      // Notify the active application to reload from storage
      if (typeof window.reloadAllStateFromStorage === 'function') {
        window.reloadAllStateFromStorage();
      }
    } catch(err) {
      console.error('Error applying remote state to local storage:', err);
    }
  }

  // Push local state to Firestore asynchronously (debounced)
  function scheduleCloudSync(immediate = false) {
    localMutationVersion = Date.now();

    if (!navigator.onLine) {
      setSyncStatus(SyncState.OFFLINE);
      return;
    }

    if (!isFirebaseInitialized || !currentUser || !dbInstance) {
      setSyncStatus(isConfigured(window.MORROW_FIREBASE_CONFIG) ? SyncState.LOCAL : SyncState.UNCONFIGURED);
      return;
    }

    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }

    setSyncStatus(SyncState.SYNCING);

    const performSync = async () => {
      try {
        const state = collectLocalState();
        const userDocRef = dbInstance.collection('users').doc(currentUser.uid).collection('morrow').doc('state');
        
        await userDocRef.set({
          ...state,
          lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp(),
          clientUpdatedAt: state.updatedAt,
          userId: currentUser.uid,
          userEmail: currentUser.email || null
        }, { merge: true });

        lastSyncedTimestamp = Date.now();
        setSyncStatus(SyncState.SYNCED);
      } catch (err) {
        console.error('Morrow Cloud Sync failed:', err);
        setSyncStatus(SyncState.ERROR, 'Sync error · Local copy safe');
      }
    };

    if (immediate) {
      performSync();
    } else {
      syncTimer = setTimeout(performSync, SYNC_DEBOUNCE_MS);
    }
  }

  // Start watching Firestore document for real-time cloud updates
  function startCloudListener(uid) {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    if (!dbInstance) return;

    try {
      const docRef = dbInstance.collection('users').doc(uid).collection('morrow').doc('state');
      unsubscribeSnapshot = docRef.onSnapshot(doc => {
        if (!doc.exists) {
          // Cloud has no data yet: immediately push local data to cloud
          scheduleCloudSync(true);
          return;
        }

        const data = doc.data();
        if (!data) return;

        // If cloud data is newer than our local mutation version, apply it
        const remoteTime = data.clientUpdatedAt || 0;
        if (remoteTime > localMutationVersion) {
          applyStateToLocal(data);
          localMutationVersion = remoteTime;
          lastSyncedTimestamp = Date.now();
          setSyncStatus(SyncState.SYNCED, 'Synced from cloud ✓');
        } else {
          lastSyncedTimestamp = Date.now();
          setSyncStatus(SyncState.SYNCED);
        }
      }, err => {
        console.warn('Morrow: Cloud listener notice:', err);
      });
    } catch (e) {
      console.error('Failed to attach cloud listener:', e);
    }
  }

  // Handle Firebase Auth state changes
  function handleAuthStateChanged(user) {
    currentUser = user;
    updateUserUI(user);

    if (user) {
      setSyncStatus(SyncState.SYNCING, 'Connecting to cloud...');
      startCloudListener(user.uid);
      // Fetch initial data or sync existing local
      scheduleCloudSync(false);
    } else {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      setSyncStatus(isConfigured(window.MORROW_FIREBASE_CONFIG) ? SyncState.LOCAL : SyncState.UNCONFIGURED);
    }
  }

  // Update UI avatar, buttons, and user information
  function updateUserUI(user) {
    const avatarChar = document.getElementById('accountAvatarChar');
    const profileEmail = document.getElementById('authProfileEmail');
    const profileName = document.getElementById('authProfileName');
    const authLoggedInView = document.getElementById('authLoggedInView');
    const authLoggedOutView = document.getElementById('authLoggedOutView');
    const profileCardTitle = document.getElementById('profileCardTitle');

    if (user) {
      const displayName = user.displayName || user.email?.split('@')[0] || (user.isAnonymous ? 'Guest Wanderer' : 'Reviser');
      const email = user.isAnonymous ? 'Guest / Anonymous session' : (user.email || '');
      const initial = (displayName.trim()[0] || '🌿').toUpperCase();

      const largeAvatar = document.getElementById('authProfileAvatar');

      if (avatarChar) {
        if (user.photoURL) {
          avatarChar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" class="account-avatar-img" />`;
        } else {
          avatarChar.textContent = initial;
        }
      }
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

      if (authLoggedInView) authLoggedInView.style.display = 'block';
      if (authLoggedOutView) authLoggedOutView.style.display = 'none';
    } else {
      if (avatarChar) avatarChar.textContent = '👤';
      const largeAvatar = document.getElementById('authProfileAvatar');
      if (largeAvatar) largeAvatar.textContent = '🌿';
      if (profileCardTitle) profileCardTitle.textContent = 'Cloud Sync & Account';
      if (authLoggedInView) authLoggedInView.style.display = 'none';
      if (authLoggedOutView) authLoggedOutView.style.display = 'block';
    }
  }

  // Network online/offline event listeners
  window.addEventListener('online', () => {
    if (currentUser) {
      setSyncStatus(SyncState.SYNCING, 'Back online · Syncing...');
      scheduleCloudSync(true);
    } else {
      setSyncStatus(SyncState.LOCAL, 'Saved locally');
    }
  });

  window.addEventListener('offline', () => {
    setSyncStatus(SyncState.OFFLINE, 'Offline · Changes saved locally');
  });

  // Public Auth API
  const MorrowSync = {
    get state() { return currentSyncState; },
    get user() { return currentUser; },
    isConfigured: () => isConfigured(window.MORROW_FIREBASE_CONFIG),

    // Schedule background sync
    scheduleCloudSync,

    // Reinitialize with new config
    reconfigure: (configObj) => {
      try {
        localStorage.setItem('morrow_firebase_config', JSON.stringify(configObj));
        window.MORROW_FIREBASE_CONFIG = configObj;
        if (firebase && firebase.apps.length) {
          firebase.app().delete().then(() => {
            initFirebase();
            if (currentUser) scheduleCloudSync(true);
          });
        } else {
          initFirebase();
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Email/Password sign up
    signUpWithEmail: async (email, password, displayName) => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const cred = await authInstance.createUserWithEmailAndPassword(email.trim(), password);
      if (displayName && displayName.trim() && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
        updateUserUI(authInstance.currentUser);
      }
      // Backup any current local data into cloud account
      scheduleCloudSync(true);
      return cred.user;
    },

    // Email/Password sign in
    signInWithEmail: async (email, password) => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const cred = await authInstance.signInWithEmailAndPassword(email.trim(), password);
      return cred.user;
    },

    // Google sign in
    signInWithGoogle: async () => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      try {
        const result = await authInstance.signInWithPopup(provider);
        return result.user;
      } catch (popupErr) {
        // Fallback to redirect if popup is blocked
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          return authInstance.signInWithRedirect(provider);
        }
        throw popupErr;
      }
    },

    // Anonymous sign in
    signInAnonymously: async () => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      const cred = await authInstance.signInAnonymously();
      return cred.user;
    },

    // Reset password
    sendPasswordReset: async (email) => {
      if (!authInstance) throw new Error('Firebase Auth not available. Please check Firebase config.');
      await authInstance.sendPasswordResetEmail(email.trim());
    },

    // Sign out
    signOut: async () => {
      if (authInstance) {
        await authInstance.signOut();
      }
      currentUser = null;
      updateUserUI(null);
      setSyncStatus(SyncState.LOCAL, 'Saved locally');
    },

    // Export local data to downloadable JSON
    exportData: () => {
      const data = collectLocalState();
      const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", str);
      downloadAnchor.setAttribute("download", `morrow-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },

    // Import data from JSON file
    importData: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            applyStateToLocal(parsed);
            scheduleCloudSync(true);
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

  // Boot Firebase on DOM ready or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
  } else {
    initFirebase();
  }
})();
