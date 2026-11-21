/**
 * Morrow — Direct Firestore Cloud Engine
 * 
 * CORE PRINCIPLES:
 * 1. FIRESTORE IS THE SINGLE SOURCE OF TRUTH:
 *    - No app-managed localStorage copies of topics, missions, or revision records.
 *    - In-memory state is populated directly from Firestore upon authentication.
 * 2. DIRECT MUTATIONS:
 *    - Every create, edit, rating, and delete operation writes directly to Firestore.
 * 3. REALTIME SYNC:
 *    - Uses Firestore onSnapshot listeners to automatically update the UI when another device makes changes.
 * 4. CLEAR INDICATORS:
 *    - Loading indicator while fetching initial workspace.
 *    - Saving indicator ("Saving..." -> "Saved to Firestore ✓") during writes.
 * 5. OFFLINE GUARD:
 *    - If offline, displays a clear connection message and disables/blocks mutations rather than pretending changes were saved.
 */

(function() {
  let authInstance = null;
  let dbInstance = null;
  let currentUser = null;
  let unsubscribeSnapshot = null;
  let isInitialLoadDone = false;

  // Local in-memory cache reflecting Firestore only (no localStorage)
  let cloudWorkspace = {
    missions: [],
    activeMissionId: 'upsc',
    topicsByMission: {},
    doneByMission: {},
    reminders: null
  };

  function isConfigValid(cfg) {
    return !!(cfg && cfg.apiKey && !cfg.apiKey.includes('YOUR_') && cfg.projectId && !cfg.projectId.includes('YOUR_'));
  }

  function initFirebase() {
    const cfg = window.MORROW_FIREBASE_CONFIG;
    if (!window.firebase) {
      console.error('Firebase SDK not loaded.');
      showOfflineBanner(true, 'Firebase SDK missing. Please check internet connection.');
      return false;
    }

    if (!isConfigValid(cfg)) {
      console.warn('Firebase config missing or incomplete.');
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      authInstance = firebase.auth();
      dbInstance = firebase.firestore();

      authInstance.onAuthStateChanged(handleAuthStateChanged);
      setupNetworkListeners();
      return true;
    } catch (e) {
      console.error('Failed to initialize Firebase:', e);
      return false;
    }
  }

  // --- Network State & Offline Guard ---

  function isOnline() {
    return navigator.onLine;
  }

  function setupNetworkListeners() {
    window.addEventListener('online', () => {
      showOfflineBanner(false);
      setSavingStatus('online');
      updateMutationsState(true);
      toast('Back online · Connected to Firestore ✿');
    });

    window.addEventListener('offline', () => {
      showOfflineBanner(true, 'Offline · Disconnected from cloud. Changes disabled until reconnected.');
      setSavingStatus('offline');
      updateMutationsState(false);
      toast('Offline · Disconnected from cloud');
    });

    // Initial check
    if (!navigator.onLine) {
      showOfflineBanner(true, 'Offline · Disconnected from cloud. Changes disabled until reconnected.');
      updateMutationsState(false);
    }
  }

  function showOfflineBanner(show, msg) {
    const banner = document.getElementById('offlineBanner');
    if (!banner) return;
    if (show) {
      banner.style.display = 'block';
      if (msg) banner.textContent = `⚡ ${msg}`;
    } else {
      banner.style.display = 'none';
    }
  }

  function updateMutationsState(enabled) {
    const addBtn = document.getElementById('addTopicSubmitBtn') || document.querySelector('#add .primary');
    if (addBtn) {
      addBtn.disabled = !enabled;
      addBtn.style.opacity = enabled ? '1' : '0.45';
      addBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
    const rateBtns = document.querySelectorAll('.ratings .rate');
    rateBtns.forEach(b => {
      b.disabled = !enabled;
      b.style.opacity = enabled ? '1' : '0.45';
      b.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
  }

  // --- Saving & Loading Indicators ---

  function showLoading(show, message) {
    const overlay = document.getElementById('cloudLoadingOverlay');
    const label = document.getElementById('cloudLoadingText');
    if (!overlay) return;
    if (show) {
      if (label && message) label.textContent = message;
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  let saveFadeTimer = null;
  function setSavingStatus(status) {
    const pill = document.getElementById('cloudStatusPill');
    const dot = document.getElementById('cloudStatusDot');
    const text = document.getElementById('cloudStatusText');
    const headerDot = document.getElementById('syncStatusDot');
    const modalDot = document.getElementById('modalSyncStatusDot');
    const modalLabel = document.getElementById('syncStatusLabel');
    const modalBadge = document.getElementById('authModalSyncBadge');

    if (saveFadeTimer) {
      clearTimeout(saveFadeTimer);
      saveFadeTimer = null;
    }

    if (!pill || !dot || !text) return;

    if (status === 'saving') {
      pill.style.display = 'inline-flex';
      dot.style.background = '#d4a94e'; // amber
      dot.classList.add('pulsing');
      text.textContent = 'Saving...';
      if (headerDot) {
        headerDot.style.backgroundColor = '#d4a94e';
        headerDot.classList.add('pulsing');
      }
      if (modalDot) {
        modalDot.style.backgroundColor = '#d4a94e';
        modalDot.classList.add('pulsing');
      }
      if (modalLabel) modalLabel.textContent = 'Saving to Firestore...';
      if (modalBadge) modalBadge.textContent = 'Writing';
    } else if (status === 'saved') {
      pill.style.display = 'inline-flex';
      dot.style.background = '#7da372'; // green
      dot.classList.remove('pulsing');
      text.textContent = 'Saved to Firestore ✓';
      if (headerDot) {
        headerDot.style.backgroundColor = '#7da372';
        headerDot.classList.remove('pulsing');
      }
      if (modalDot) {
        modalDot.style.backgroundColor = '#7da372';
        modalDot.classList.remove('pulsing');
      }
      if (modalLabel) modalLabel.textContent = 'Synced with Firestore ✓';
      if (modalBadge) modalBadge.textContent = 'Cloud connected';
      saveFadeTimer = setTimeout(() => {
        pill.style.display = 'none';
      }, 2400);
    } else if (status === 'offline') {
      pill.style.display = 'inline-flex';
      dot.style.background = '#b45c43'; // warm red
      dot.classList.remove('pulsing');
      text.textContent = 'Offline · Read only';
      if (headerDot) {
        headerDot.style.backgroundColor = '#b45c43';
        headerDot.classList.remove('pulsing');
      }
      if (modalDot) {
        modalDot.style.backgroundColor = '#b45c43';
        modalDot.classList.remove('pulsing');
      }
      if (modalLabel) modalLabel.textContent = 'Offline · Read only';
      if (modalBadge) modalBadge.textContent = 'Offline';
    } else if (status === 'error') {
      pill.style.display = 'inline-flex';
      dot.style.background = '#b45c43';
      dot.classList.remove('pulsing');
      text.textContent = 'Save failed';
      if (headerDot) {
        headerDot.style.backgroundColor = '#b45c43';
        headerDot.classList.remove('pulsing');
      }
      if (modalDot) {
        modalDot.style.backgroundColor = '#b45c43';
        modalDot.classList.remove('pulsing');
      }
      if (modalLabel) modalLabel.textContent = 'Connection error';
      if (modalBadge) modalBadge.textContent = 'Error';
    }
  }

  // --- Auth & Realtime Subscription ---

  function handleAuthStateChanged(user) {
    currentUser = user;
    updateAuthUI(user);

    if (user) {
      showLoading(true, 'Connecting to your sanctuary...');
      subscribeToUserFirestore(user.uid);
    } else {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      isInitialLoadDone = false;
      showLoading(false);
      // Clear in-memory state on sign out
      cloudWorkspace = {
        missions: [],
        activeMissionId: 'upsc',
        topicsByMission: {},
        doneByMission: {},
        reminders: null
      };
      if (typeof window.onFirestoreSignOut === 'function') {
        window.onFirestoreSignOut();
      }
    }
  }

  function getWorkspaceDocRef(uid) {
    return dbInstance.collection('users').doc(uid).collection('data').doc('workspace');
  }

  function subscribeToUserFirestore(uid) {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    const docRef = getWorkspaceDocRef(uid);

    unsubscribeSnapshot = docRef.onSnapshot(async (doc) => {
      if (!doc.exists) {
        // First-time user: initialize their Firestore workspace with default template
        console.log('Initializing new Firestore workspace for user:', uid);
        const initial = createInitialFirestoreData();
        try {
          await docRef.set(initial);
          // Snapshot listener will fire again with the created data
        } catch (err) {
          console.error('Failed to create initial Firestore workspace:', err);
          showLoading(false);
          toast('Error initializing cloud workspace');
        }
        return;
      }

      // Existing user: receive data directly from Firestore
      const data = doc.data();
      cloudWorkspace = {
        missions: data.missions || [],
        activeMissionId: data.activeMissionId || 'upsc',
        topicsByMission: data.topicsByMission || {},
        doneByMission: data.doneByMission || {},
        reminders: data.reminders || null
      };

      showLoading(false);
      isInitialLoadDone = true;
      setSavingStatus('saved');

      // Notify app to re-render using this fresh Firestore data
      if (typeof window.onFirestoreDataUpdated === 'function') {
        window.onFirestoreDataUpdated(cloudWorkspace);
      }
    }, (err) => {
      console.error('Firestore realtime listener error:', err);
      showLoading(false);
      if (!navigator.onLine) {
        showOfflineBanner(true, 'Offline · Disconnected from Firestore.');
        setSavingStatus('offline');
      } else {
        toast('Connection error with Firestore');
      }
    });
  }

  function createInitialFirestoreData() {
    const starterMissions = window.DEFAULT_MISSIONS || [
      {
        id: 'upsc',
        icon: '🏛️',
        name: 'Civil Services',
        subjects: ['Polity', 'History', 'Economy', 'Geography', 'Environment'],
        subjectBiomes: {}
      }
    ];

    const todayTs = (function() {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();

    const initialTopics = [
      { id: 1, name: 'Fundamental Rights', subject: 'Polity', tone: '', dueAt: todayTs, done: false, level: 0, graduated: false, paused: false, evergreenRevs: 0 },
      { id: 2, name: 'Revolt of 1857', subject: 'History', tone: 'clay', dueAt: todayTs, done: false, level: 0, graduated: false, paused: false, evergreenRevs: 0 },
      { id: 3, name: 'Inflation & Monetary Policy', subject: 'Economy', tone: 'gold', dueAt: todayTs, done: false, level: 0, graduated: false, paused: false, evergreenRevs: 0 }
    ];

    return {
      activeMissionId: 'upsc',
      missions: starterMissions,
      topicsByMission: {
        'upsc': initialTopics
      },
      doneByMission: {
        'upsc': 0
      },
      reminders: {
        enabled: true,
        morningEnabled: true,
        morningTime: '08:30',
        nightEnabled: true,
        nightTime: '21:30'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  // --- Direct Firestore Mutations ---

  async function directFirestoreUpdate(updatePayload) {
    if (!navigator.onLine) {
      toast('Cannot save: You are offline ⚡');
      throw new Error('Offline: Mutations disabled');
    }
    if (!currentUser || !dbInstance) {
      toast('Cannot save: Not signed in');
      throw new Error('Unauthenticated');
    }

    setSavingStatus('saving');
    try {
      const docRef = getWorkspaceDocRef(currentUser.uid);
      await docRef.set({
        ...updatePayload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      setSavingStatus('saved');
    } catch (err) {
      console.error('Firestore write failed:', err);
      setSavingStatus('error');
      toast('Cloud save failed. Please check connection.');
      throw err;
    }
  }

  // UI updates for authentication modal
  function updateAuthUI(user) {
    const modalCloseBtn = document.getElementById('settingsModalCloseBtn');
    const modalTitle = document.getElementById('settingsModalTitle');
    const modalEyebrow = document.getElementById('settingsModalEyebrow');
    const tabsNav = document.querySelector('.settings-tabs-nav');
    const authLoggedInView = document.getElementById('authLoggedInView');
    const authLoggedOutView = document.getElementById('authLoggedOutView');
    const profileName = document.getElementById('authProfileName');
    const profileEmail = document.getElementById('authProfileEmail');
    const avatarChar = document.getElementById('accountAvatarChar');
    const largeAvatar = document.getElementById('authProfileAvatar');
    const profileCardTitle = document.getElementById('profileCardTitle');

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

      // Auto close the auth gate on successful login
      if (typeof closeSettingsModal === 'function') {
        closeSettingsModal(true);
      }
    } else {
      if (avatarChar) avatarChar.textContent = '👤';
      if (largeAvatar) largeAvatar.textContent = '🌿';
      if (profileCardTitle) profileCardTitle.textContent = 'Sign In / Register';

      if (modalTitle) modalTitle.textContent = 'Welcome to Morrow';
      if (modalEyebrow) modalEyebrow.textContent = 'Gentle revision sanctuary';
      if (modalCloseBtn) modalCloseBtn.style.display = 'none'; // Gate: Cannot dismiss without account
      if (tabsNav) tabsNav.style.display = 'none'; // Must log in first

      if (authLoggedInView) authLoggedInView.style.display = 'none';
      if (authLoggedOutView) authLoggedOutView.style.display = 'block';

      // Auto open modal on startup if unauthenticated
      if (typeof openSettingsModal === 'function') {
        openSettingsModal('account');
      }
    }
  }

  // --- Public Interface ---

  window.FirebaseCloud = {
    get user() { return currentUser; },
    get workspace() { return cloudWorkspace; },
    isOnline,

    // Authentication methods
    signInWithGoogle: async () => {
      if (!authInstance) throw new Error('Firebase Auth unavailable');
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

    signInWithEmail: async (email, password) => {
      if (!authInstance) throw new Error('Firebase Auth unavailable');
      const cred = await authInstance.signInWithEmailAndPassword(email.trim(), password);
      return cred.user;
    },

    signUpWithEmail: async (email, password, displayName) => {
      if (!authInstance) throw new Error('Firebase Auth unavailable');
      const cred = await authInstance.createUserWithEmailAndPassword(email.trim(), password);
      if (displayName && displayName.trim() && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
        updateAuthUI(authInstance.currentUser);
      }
      return cred.user;
    },

    sendPasswordReset: async (email) => {
      if (!authInstance) throw new Error('Firebase Auth unavailable');
      await authInstance.sendPasswordResetEmail(email.trim());
    },

    signOut: async () => {
      if (authInstance) {
        await authInstance.signOut();
      }
      currentUser = null;
      updateAuthUI(null);
    },

    // Direct Firestore operations
    addTopic: async (missionId, topic) => {
      const topicsList = [...(cloudWorkspace.topicsByMission[missionId] || [])];
      topicsList.unshift(topic);
      const updatedTopics = { ...cloudWorkspace.topicsByMission, [missionId]: topicsList };
      
      let missionsList = cloudWorkspace.missions;
      const m = missionsList.find(x => x.id === missionId);
      if (m && Array.isArray(m.subjects) && topic.subject && !m.subjects.includes(topic.subject)) {
        missionsList = missionsList.map(item => {
          if (item.id === missionId) {
            return { ...item, subjects: [...item.subjects, topic.subject] };
          }
          return item;
        });
      }
      await directFirestoreUpdate({
        topicsByMission: updatedTopics,
        missions: missionsList
      });
    },

    updateTopic: async (missionId, topicId, updateFn) => {
      const topicsList = (cloudWorkspace.topicsByMission[missionId] || []).map(t => {
        if (t.id === topicId) {
          return updateFn(t);
        }
        return t;
      });
      const updatedTopics = { ...cloudWorkspace.topicsByMission, [missionId]: topicsList };
      await directFirestoreUpdate({ topicsByMission: updatedTopics });
    },

    deleteTopic: async (missionId, topicId) => {
      const topicsList = (cloudWorkspace.topicsByMission[missionId] || []).filter(t => t.id !== topicId);
      const updatedTopics = { ...cloudWorkspace.topicsByMission, [missionId]: topicsList };
      await directFirestoreUpdate({ topicsByMission: updatedTopics });
    },

    rateTopic: async (missionId, topicId, updatedTopicProps) => {
      const currentDone = Number(cloudWorkspace.doneByMission[missionId] || 0) + 1;
      const topicsList = (cloudWorkspace.topicsByMission[missionId] || []).map(t => {
        if (t.id === topicId) {
          return { ...t, ...updatedTopicProps };
        }
        return t;
      });
      const updatedTopics = { ...cloudWorkspace.topicsByMission, [missionId]: topicsList };
      const updatedDone = { ...cloudWorkspace.doneByMission, [missionId]: currentDone };
      await directFirestoreUpdate({
        topicsByMission: updatedTopics,
        doneByMission: updatedDone
      });
    },

    createMission: async (newMission) => {
      const missionsList = [...cloudWorkspace.missions, newMission];
      const updatedTopics = { ...cloudWorkspace.topicsByMission, [newMission.id]: [] };
      const updatedDone = { ...cloudWorkspace.doneByMission, [newMission.id]: 0 };
      await directFirestoreUpdate({
        missions: missionsList,
        activeMissionId: newMission.id,
        topicsByMission: updatedTopics,
        doneByMission: updatedDone
      });
    },

    deleteMission: async (deletedMissionId, nextMissionId) => {
      const missionsList = cloudWorkspace.missions.filter(m => m.id !== deletedMissionId);
      const updatedTopics = { ...cloudWorkspace.topicsByMission };
      delete updatedTopics[deletedMissionId];
      const updatedDone = { ...cloudWorkspace.doneByMission };
      delete updatedDone[deletedMissionId];

      await directFirestoreUpdate({
        missions: missionsList,
        activeMissionId: nextMissionId,
        topicsByMission: updatedTopics,
        doneByMission: updatedDone
      });
    },

    switchMission: async (missionId) => {
      await directFirestoreUpdate({ activeMissionId: missionId });
    },

    addSubject: async (missionId, subject, biomeId) => {
      const missionsList = cloudWorkspace.missions.map(m => {
        if (m.id === missionId) {
          const subjects = [...(m.subjects || [])];
          if (!subjects.includes(subject)) {
            const otherIdx = subjects.findIndex(s => s.toLowerCase() === 'other');
            if (otherIdx !== -1) subjects.splice(otherIdx, 0, subject);
            else subjects.push(subject);
          }
          const subjectBiomes = { ...(m.subjectBiomes || {}) };
          if (biomeId && biomeId !== 'auto') {
            subjectBiomes[subject] = biomeId;
          }
          return { ...m, subjects, subjectBiomes };
        }
        return m;
      });
      await directFirestoreUpdate({ missions: missionsList });
    },

    deleteSubject: async (missionId, subject) => {
      const missionsList = cloudWorkspace.missions.map(m => {
        if (m.id === missionId) {
          const subjects = (m.subjects || []).filter(s => (s || '').trim().toLowerCase() !== subject.trim().toLowerCase());
          const subjectBiomes = { ...(m.subjectBiomes || {}) };
          delete subjectBiomes[subject];
          return { ...m, subjects, subjectBiomes };
        }
        return m;
      });
      const topicsList = (cloudWorkspace.topicsByMission[missionId] || []).filter(t => (t.subject || '').trim().toLowerCase() !== subject.trim().toLowerCase());
      const updatedTopics = { ...cloudWorkspace.topicsByMission, [missionId]: topicsList };
      await directFirestoreUpdate({
        missions: missionsList,
        topicsByMission: updatedTopics
      });
    },

    updateSubject: async (missionId, oldSubject, newSubject, biomeId) => {
      const missionsList = cloudWorkspace.missions.map(m => {
        if (m.id === missionId) {
          const subjects = (m.subjects || []).map(s => s.toLowerCase() === oldSubject.toLowerCase() ? newSubject : s);
          const subjectBiomes = { ...(m.subjectBiomes || {}) };
          if (oldSubject && subjectBiomes[oldSubject]) {
            delete subjectBiomes[oldSubject];
          }
          if (biomeId && biomeId !== 'auto') {
            subjectBiomes[newSubject] = biomeId;
          }
          return { ...m, subjects, subjectBiomes };
        }
        return m;
      });

      const topicsList = (cloudWorkspace.topicsByMission[missionId] || []).map(t => {
        if ((t.subject || '').trim().toLowerCase() === oldSubject.toLowerCase()) {
          return { ...t, subject: newSubject };
        }
        return t;
      });

      const updatedTopics = { ...cloudWorkspace.topicsByMission, [missionId]: topicsList };
      await directFirestoreUpdate({
        missions: missionsList,
        topicsByMission: updatedTopics
      });
    },

    saveReminders: async (remindersSettings) => {
      await directFirestoreUpdate({ reminders: remindersSettings });
    },

    exportData: () => {
      const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cloudWorkspace, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", str);
      downloadAnchor.setAttribute("download", `morrow-firestore-backup-${dateStr}.json`);
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
            if (!parsed.missions || !parsed.topicsByMission) {
              throw new Error('Invalid backup file format');
            }
            await directFirestoreUpdate({
              missions: parsed.missions,
              activeMissionId: parsed.activeMissionId || 'upsc',
              topicsByMission: parsed.topicsByMission,
              doneByMission: parsed.doneByMission || {},
              reminders: parsed.reminders || null
            });
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

  // Backwards compatibility pointer
  window.MorrowSync = {
    get user() { return currentUser; },
    get isOnline() { return isOnline(); },
    scheduleCloudSync: () => setSavingStatus('saved'),
    exportData: window.FirebaseCloud.exportData,
    importData: window.FirebaseCloud.importData,
    signOut: window.FirebaseCloud.signOut,
    signInWithGoogle: window.FirebaseCloud.signInWithGoogle,
    signInWithEmail: window.FirebaseCloud.signInWithEmail,
    signUpWithEmail: window.FirebaseCloud.signUpWithEmail,
    sendPasswordReset: window.FirebaseCloud.sendPasswordReset
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
  } else {
    initFirebase();
  }
})();
