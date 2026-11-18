(()=>{
 const canvas = document.getElementById('gardenMasterCanvas');
 const sceneEl = document.getElementById('gardenScene');
 if(!canvas || !sceneEl) return;
 const ctx = canvas.getContext('2d');

 let W = 400, H = 800, DPR = 1;
 let lastMissionRendered = null;

 // Cascading Hills Card-Stack State
 let hillCards = [];
 let activeHillPos = 0;      // Continuous stack index (0 .. N-1)
 let activeHillVel = 0;      // Flick/scroll momentum
 let targetHillIdx = null;   // Snap or jump target index
 let syncedHudIdx = -1;

 let selectedPlantId = null;
 let windGust = 0;
 let windTarget = 0;
 let pointerX = 0.5, pointerY = 0.5;

 // Interactive Zoom & Pan State (Auto-fit framing with user zoom controls)
 let gardenZoomLevel = 1.0;
 let gardenCurrentZoom = 1.0;
 let gardenPanX = 0, gardenPanY = 0;
 let targetPanX = 0, targetPanY = 0;
 let ripples = [];
 let droplets = [];
 let motes = [];
 let petals = [];
 let butterflies = [];
 let birds = [];
 let activeRabbits = [];
 let rabbitSpawnTimer = 45; // 10x rarer: peaceful start, no instant spawn flood
 let deer = [];
 let perchBirds = [];
 let dryLeaves = [];
 let seedPuffs = [];
 let lastTs = 0;

 const WEATHER_MODES = [
  { id: 'auto', icon: '☀', label: 'Auto ambiance' },
  { id: 'morning', icon: '🌤', label: 'Morning mist' },
  { id: 'sunlit', icon: '☀', label: 'Sunlit meadow' },
  { id: 'golden', icon: '🌅', label: 'Golden hour' },
  { id: 'dusk', icon: '🌙', label: 'Starlit fireflies' },
  { id: 'rain', icon: '🌦', label: 'Gentle rain' }
 ];
 let weatherIdx = 0;

 function resolveTheme(){
  const mode = WEATHER_MODES[weatherIdx].id;
  if(mode !== 'auto') return mode;
  const overdueCount = topics.filter(t => !t.done && dueState(t) !== 'fresh').length;
  if(topics.length > 0 && overdueCount / topics.length >= 0.55) return 'rain';
  const hr = new Date().getHours();
  if(hr >= 19 || hr < 6) return 'dusk';
  if(hr >= 16) return 'golden';
  if(hr < 10) return 'morning';
  return 'sunlit';
 }

 const PALETTES = {
  morning: {
   skyTop: '#a4c8c7', skyMid: '#dbe7d2', skyLow: '#eef1e0',
   sunColor: '#fff7dd', sunHalo: 'rgba(255,246,214,0.62)', sunY: 0.14,
   rayColor: 'rgba(255, 250, 224, 0.11)',
   ridgeFar: '#b1c6b3', ridgeMid: '#96b393',
   mist: 'rgba(244,248,238,0.34)', isNight: false, isRain: false, warmGlow: 0.35, tint: null
  },
  sunlit: {
   skyTop: '#98c2c5', skyMid: '#d3e3c9', skyLow: '#e8edd5',
   sunColor: '#fff3c8', sunHalo: 'rgba(255,238,186,0.66)', sunY: 0.13,
   rayColor: 'rgba(255, 246, 204, 0.13)',
   ridgeFar: '#abc2a8', ridgeMid: '#8fae86',
   mist: 'rgba(255,252,238,0.20)', isNight: false, isRain: false, warmGlow: 0.15, tint: null
  },
  golden: {
   skyTop: '#c2a28f', skyMid: '#ebd0ab', skyLow: '#f4e3c2',
   sunColor: '#ffe0a3', sunHalo: 'rgba(255,204,132,0.72)', sunY: 0.18,
   rayColor: 'rgba(255, 218, 150, 0.16)',
   ridgeFar: '#9a9b8a', ridgeMid: '#828f74',
   mist: 'rgba(255,224,178,0.26)', isNight: false, isRain: false, warmGlow: 0.78, tint: 'rgba(255, 198, 122, 0.15)'
  },
  dusk: {
   skyTop: '#26383f', skyMid: '#425b58', skyLow: '#5f7667',
   sunColor: '#f7efd2', sunHalo: 'rgba(235,232,196,0.38)', sunY: 0.14,
   rayColor: 'rgba(220, 232, 214, 0.05)',
   ridgeFar: '#374d49', ridgeMid: '#2e433e',
   mist: 'rgba(168,196,184,0.14)', isNight: true, isRain: false, warmGlow: 1.0, tint: null
  },
  rain: {
   skyTop: '#89a2a5', skyMid: '#b8c8c0', skyLow: '#cfdcd0',
   sunColor: '#e8eee8', sunHalo: 'rgba(232,238,232,0.28)', sunY: 0.14,
   rayColor: 'rgba(232, 240, 238, 0.04)',
   ridgeFar: '#91a89b', ridgeMid: '#7b9585',
   mist: 'rgba(226,236,232,0.38)', isNight: false, isRain: true, warmGlow: 0.68, tint: 'rgba(165, 192, 196, 0.16)'
  }
 };

 function hash(n){
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
 }

 function missionSeed(){
  return stringHash(activeMissionId || 'upsc');
 }

 function speciesForTopic(t, idx, hill){
  const tone = t.tone || '';
  if(tone === 'clay') return { kind: 'poppy', petal: '#d9886c', petalAlt: '#eca891', center: '#3f3028', label: 'Terracotta Poppy' };
  if(tone === 'gold') return { kind: 'marigold', petal: '#dda94b', petalAlt: '#f0cb7a', center: '#7a5220', label: 'Ochre Marigold' };
  if(tone === 'blue') return { kind: 'bluebell', petal: '#7798ad', petalAlt: '#a4bfd0', center: '#ead48c', label: 'Mist Bluebell' };
  if(hill && hill.archetype && hill.archetype.defaultSpecies){
   return hill.archetype.defaultSpecies;
  }
  const varieties = [
   { kind: 'lavender', petal: '#8f9fb8', petalAlt: '#b4c1d4', center: '#e8cf86', label: 'Meadow Lavender' },
   { kind: 'cosmos', petal: '#e0a99b', petalAlt: '#f2cbc0', center: '#e5c46c', label: 'Blush Cosmos' },
   { kind: 'daisy', petal: '#f8f3e6', petalAlt: '#e6dec8', center: '#dfb458', label: 'Sanctuary Daisy' }
  ];
  return varieties[(Math.abs(t.id) + idx) % varieties.length];
 }

 /* Rolling Hill Crest Profile (normalized nx in [0..1], returns y offset from hill's base crest) */
 function hillCrestOffset(hill, nx){
  const peakShift = hill.crestSkew; // -0.22 .. +0.22
  const dome = -Math.cos((nx - (0.5 + peakShift)) * Math.PI * 1.12) * hill.crestArch;
  const baseDome = -Math.cos((-peakShift) * Math.PI * 1.12) * hill.crestArch;
  const ripple = Math.sin(nx * Math.PI * 2.5 + hill.index * 1.9) * 5.5
               + Math.cos(nx * Math.PI * 1.4 - hill.index * 1.1) * 4;
  return (dome - baseDome) + ripple;
 }

 /* Compute visual card-stack transform for hill `i` given continuous `activeHillPos` */
 function getHillCardPose(hill){
  const rel = hill.index - activeHillPos;
  const frontCrestY = H * 0.41;

  // Frame size of hill remains constant
  // Interactive user zoom and pan
  const userScale = typeof gardenCurrentZoom !== 'undefined' ? gardenCurrentZoom : 1.0;
  const isFront = Math.abs(rel) < 0.45;
  const effectiveUserScale = isFront ? userScale : (1 + (userScale - 1) * 0.32);
  const effectivePanX = isFront ? gardenPanX : (gardenPanX * 0.28);
  const effectivePanY = isFront ? gardenPanY : (gardenPanY * 0.28);

  if(rel >= 0){
   // Hills stacked behind the active hill, cascading upward like cards
   const compressedLift = (1 - Math.exp(-rel * 0.46)) * (H * 0.185) + Math.min(rel, 5) * 12;
   const crestY = frontCrestY - compressedLift + effectivePanY;
   const scale = Math.max(0.75, 1 - rel * 0.046) * effectiveUserScale;
   const shiftX = Math.sin(hill.index * 1.85) * Math.min(24, rel * 13) + effectivePanX;
   return {
    rel,
    crestY,
    scale,
    shiftX,
    alpha: 1,
    mistAmount: Math.min(0.46, rel * 0.11)
   };
  }else{
   // Active front hill flipping downward off the stack toward the viewer
   const progress = Math.min(1.25, -rel);
   const crestY = frontCrestY + Math.pow(progress, 1.12) * (H * 0.65) + effectivePanY;
   const scale = (1 + progress * 0.055) * effectiveUserScale;
   const shiftX = effectivePanX;
   const alpha = Math.max(0, 1 - Math.pow(progress, 1.5) * 1.15);
   return {
    rel,
    crestY,
    scale,
    shiftX,
    alpha,
    mistAmount: 0
   };
  }
 }

 /* Local winding garden path x inside a hill card (ly is distance below hill crest) */
 function hillPathLocalX(hill, ly){
  const phase = (hill.crestSeed % 628) / 100;
  const t = Math.max(0, ly / Math.max(180, H * 0.46));
  const startX = W * (0.5 + hill.crestSkew * 0.45);
  return startX + Math.sin(t * Math.PI * 1.15 + phase) * (W * 0.15);
 }

 function getAllHillPlants(){
  const list = [];
  for(const h of hillCards){
   for(const p of h.plants) list.push(p);
  }
  return list;
 }

 function renderHillChipsAndRail(){
  const bar = document.getElementById('gardenBiomeBar');
  const frontIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  if(bar){
   const chipsHtml = hillCards.map((h, i) => `
    <button type="button"
     class="biome-chip ${i === frontIdx ? 'active' : ''}"
     data-hill-idx="${i}"
     onclick="focusHillCard(${i})"
     title="${escapeHtml(h.subject)} · ${escapeHtml(h.archetype.label)}">
     <span class="biome-chip-dot" style="background:${h.archetype.dot}"></span>
     <span>${escapeHtml(h.subject)}</span>
     <span class="biome-chip-count">${h.bloomCount}/${h.totalCount}</span>
    </button>
   `).join('');

   bar.innerHTML = chipsHtml + `
    <button type="button" class="biome-chip add-biome-chip" onclick="openSubjectModal('garden')" title="Add a new hill garden">
     <span>＋ Subject</span>
    </button>
   `;
  }

  const rail = document.getElementById('gardenStackRail');
  if(rail){
   rail.innerHTML = hillCards.map((h, i) => `
    <button type="button"
     class="stack-pip ${i === frontIdx ? 'active' : ''}"
     data-pip-idx="${i}"
     onclick="focusHillCard(${i})"
     title="${escapeHtml(h.subject)}"
     aria-label="Go to ${escapeHtml(h.subject)} hill"></button>
   `).join('');
  }

  updateStackControlsUI(frontIdx);
 }

 function updateStackControlsUI(frontIdx){
  const label = document.getElementById('stackStepLabel');
  if(label) label.textContent = `${frontIdx + 1} / ${Math.max(1, hillCards.length)}`;
  const prevBtn = document.getElementById('prevHillBtn');
  const nextBtn = document.getElementById('nextHillBtn');
  if(prevBtn) prevBtn.disabled = frontIdx <= 0;
  if(nextBtn) nextBtn.disabled = frontIdx >= hillCards.length - 1;
 }

 function syncActiveHillHUD(){
  if(!hillCards.length) return;
  const frontIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  if(frontIdx !== syncedHudIdx){
   syncedHudIdx = frontIdx;
   const bar = document.getElementById('gardenBiomeBar');
   if(bar){
    const chips = bar.querySelectorAll('.biome-chip[data-hill-idx]');
    chips.forEach((chip, idx) => {
     chip.classList.toggle('active', idx === frontIdx);
     if(idx === frontIdx){
      const targetLeft = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) * 0.5;
      bar.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
     }
    });
   }
   const rail = document.getElementById('gardenStackRail');
   if(rail){
    rail.querySelectorAll('.stack-pip').forEach((pip, idx) => {
     pip.classList.toggle('active', idx === frontIdx);
    });
   }
   updateStackControlsUI(frontIdx);
  }
 }

 window.focusHillCard = function(idx){
  if(!hillCards.length) return;
  const clamped = Math.max(0, Math.min(hillCards.length - 1, idx));
  closeSpecimenCard();
  targetHillIdx = clamped;
  activeHillVel = 0;
 };

 window.stepHillCard = function(dir){
  const cur = Math.round(targetHillIdx !== null ? targetHillIdx : activeHillPos);
  const next = Math.max(0, Math.min(hillCards.length - 1, cur + dir));
  window.focusHillCard(next);
 };

 window.focusBiomeBySubject = function(subj){
  const idx = hillCards.findIndex(h => h.subject.toLowerCase() === String(subj || '').toLowerCase());
  if(idx !== -1) window.focusHillCard(idx);
 };

 function updateDuePill(){
  const pill = document.getElementById('gardenDuePill');
  const label = document.getElementById('gardenDuePillLabel');
  if(!pill || !label) return;
  const thirsty = getAllHillPlants().filter(p => !p.topic.done && p.state !== 'fresh');
  if(!thirsty.length || selectedPlantId !== null){
   pill.classList.add('hidden');
   return;
  }
  label.textContent = thirsty.length === 1 ? '1 plant needs care' : `${thirsty.length} plants need care`;
  pill.classList.remove('hidden');
 }

 window.focusNextDuePlant = function(){
  const thirsty = getAllHillPlants().filter(p => !p.topic.done && p.state !== 'fresh');
  if(!thirsty.length) return;
  const curIdx = thirsty.findIndex(p => p.topic.id === selectedPlantId);
  const next = thirsty[(curIdx + 1) % thirsty.length];
  next.perkBoost = 1;
  openSpecimenCard(next, true);
 };

 window.stepSelectedPlant = function(dir){
  const all = getAllHillPlants();
  if(!all.length) return;
  const idx = all.findIndex(p => p.topic.id === selectedPlantId);
  const nextIdx = idx === -1 ? 0 : (idx + dir + all.length) % all.length;
  const target = all[nextIdx];
  target.perkBoost = 1;
  if(target.state !== 'dead'){
   const pos = plantScreenCoords(target);
   spawnPetals(pos.x, pos.y - 26 * target.scale, target.species.petalAlt, 4);
  }
  openSpecimenCard(target, true);
 };

 function buildCascadingHills(){
  const seed = missionSeed();
  const mission = currentMission();

  const bySubject = new Map();
  const orderedSubjectNames = [];
  (mission.subjects || []).forEach(s => {
   const clean = String(s || '').trim();
   if(clean && !bySubject.has(clean)){
    bySubject.set(clean, []);
    orderedSubjectNames.push(clean);
   }
  });
  topics.forEach(t => {
   const clean = String(t.subject || 'Other').trim() || 'Other';
   if(!bySubject.has(clean)){
    bySubject.set(clean, []);
    orderedSubjectNames.push(clean);
   }
   bySubject.get(clean).push(t);
  });

  let activeSubjects = orderedSubjectNames.filter(s => s.toLowerCase() !== 'other' || (bySubject.get(s) || []).length > 0);
  if(!activeSubjects.length){
   activeSubjects = orderedSubjectNames.length ? orderedSubjectNames : ['General'];
  }

  const prevPlantMap = new Map(getAllHillPlants().map(p => [p.topic.id, p]));
  hillCards = [];
  const usedArchetypeIds = new Set();

  const usableMeadowTop = 52;
  const usableMeadowBottom = Math.max(210, H * 0.44);

  activeSubjects.forEach((subj, idx) => {
   const subjTopics = (bySubject.get(subj) || []).slice().sort((a, b) => a.id - b.id);
   const archetype = getArchetypeForSubject(subj, idx, usedArchetypeIds, mission);
   usedArchetypeIds.add(archetype.id);

   const hSeed = seed + idx * 149 + stringHash(subj);
   const skewPattern = [0.06, -0.14, 0.15, -0.07, 0.11, -0.16, 0.04];
   const crestSkew = skewPattern[idx % skewPattern.length];
   const crestArch = 24 + (hSeed % 11);
   const bloomCount = subjTopics.filter(t => (t.level || 0) >= 1 && dueState(t) === 'fresh').length;

   const hill = {
    index: idx,
    subject: subj,
    archetype,
    crestSeed: hSeed,
    crestSkew,
    crestArch,
    topics: subjTopics,
    bloomCount,
    totalCount: subjTopics.length,
    pond: null,
    koi: [],
    dragonfly: null,
    landmark: null,
    cozyNook: null,
    lantern: null,
    trees: [],
    stones: [],
    tufts: [],
    benches: [],
    squirrel: null,
    deer: null,
    crow: null,
    seedPlot: null,
    plants: []
   };

   const midLy = (usableMeadowTop + usableMeadowBottom) * 0.52;
   const pathMidX = hillPathLocalX(hill, midLy);
   const placeLeft = pathMidX >= W * 0.48;

   // 1. Water-rich hill biomes get a reflective hillside pond with koi & lilies
   if(archetype.hasPond){
    const py = midLy + 12;
    const pPathX = hillPathLocalX(hill, py);
    const pLeft = pPathX >= W * 0.48;
    const px = pLeft
     ? Math.max(70, pPathX - 96)
     : Math.min(W - 70, pPathX + 96);
    const rx = 44 + hash(hSeed + 37) * 10;
    const ry = 19 + hash(hSeed + 41) * 4;
    hill.pond = {
     lx: px, ly: py, rx, ry,
     rot: pLeft ? -0.06 : 0.06,
     lilies: [
      { dx: -rx * 0.40, dy: -ry * 0.15, r: 5.8, hasFlower: true, phase: hash(hSeed + 3) * 6 },
      { dx: rx * 0.34, dy: ry * 0.22, r: 4.8, hasFlower: idx % 2 === 0, phase: hash(hSeed + 5) * 6 }
     ],
     reeds: Array.from({ length: 5 }, (_, k) => ({
      angle: (pLeft ? Math.PI * 0.72 : Math.PI * 0.05) + k * 0.14,
      h: 13 + hash(hSeed + 11 + k) * 7,
      phase: hash(hSeed + k * 13) * 6
     }))
    };

    hill.koi = [0, 1].map(kIdx => ({
     angle: hash(hSeed + kIdx * 47) * Math.PI * 2,
     speed: (0.45 + hash(hSeed + kIdx * 53) * 0.35) * (kIdx % 2 === 0 ? 1 : -1),
     orbitRx: 0.52 + hash(hSeed + kIdx * 59) * 0.20,
     orbitRy: 0.44 + hash(hSeed + kIdx * 61) * 0.20,
     color: (idx + kIdx) % 3 === 0 ? '#e38764' : (idx + kIdx) % 3 === 1 ? '#f2c879' : '#f7efe1',
     spotColor: (idx + kIdx) % 3 === 0 ? '#fff6e8' : '#d97654',
     dartBoost: 0,
     phase: kIdx * 1.7
    }));

    hill.dragonfly = {
     phase: hash(hSeed + 97) * Math.PI * 2,
     color: idx % 2 === 0 ? '#7fb4b8' : '#b7c98f'
    };
   }

   // 2. Signature Biome Landmark on the hillside
   const lmLy = usableMeadowTop + 34;
   const lmPathX = hillPathLocalX(hill, lmLy);
   const lmSide = archetype.hasPond ? (placeLeft ? 1 : -1) : (idx % 2 === 0 ? -1 : 1);
   const lmX = Math.max(54, Math.min(W - 54, lmPathX + lmSide * 92));

   if(archetype.landmarkKind === 'tea_nook'){
    hill.cozyNook = { lx: lmX, ly: lmLy + 12 };
   }else{
    hill.landmark = {
     kind: archetype.landmarkKind,
     lx: lmX,
     ly: lmLy,
     subject: subj,
     biomeLabel: archetype.label,
     pulse: 0
    };
   }

   // 3. Stone Lantern along upper hill path
   const lanLy = 44;
   const lanPathX = hillPathLocalX(hill, lanLy);
   hill.lantern = {
    lx: Math.max(36, Math.min(W - 36, lanPathX + (idx % 2 === 0 ? 30 : -30))),
    ly: lanLy,
    boost: 0,
    phase: hash(hSeed + 83) * Math.PI * 2
   };

   // 4. Hill Shoulder & Slope Trees
   hill.trees = [
    {
     lx: 32 + hash(hSeed + 19) * 18,
     ly: 38 + hash(hSeed + 21) * 20,
     scale: 0.78 + hash(hSeed + 29) * 0.16,
     kind: archetype.treeKind,
     shake: 0
    },
    {
     lx: W - 32 - hash(hSeed + 23) * 18,
     ly: 46 + hash(hSeed + 25) * 24,
     scale: 0.80 + hash(hSeed + 31) * 0.16,
     kind: archetype.treeKind,
     shake: 0
    },
    {
     lx: (idx % 2 === 0 ? 28 : W - 28),
     ly: usableMeadowBottom - 26,
     scale: 0.88,
     kind: archetype.treeKind,
     shake: 0
    }
   ];

   // 5. Stones & Grass/Wildflower Tufts
   const stLy = usableMeadowBottom - 34;
   const stPathX = hillPathLocalX(hill, stLy);
   const stX = Math.max(40, Math.min(W - 40, stPathX + (idx % 2 === 0 ? 1 : -1) * 78));
   if(!hill.pond || Math.hypot((stX - hill.pond.lx) / 1.5, stLy - hill.pond.ly) > 64){
    hill.stones.push({ lx: stX, ly: stLy, r: 8 + hash(hSeed + 73) * 4, kind: archetype.id });
   }

   for(let g = 0; g < 11; g++){
    const gx = (0.08 + hash(hSeed + g * 13 + 300) * 0.84) * W;
    const gy = 26 + hash(hSeed + g * 17 + 400) * (usableMeadowBottom - 24);
    if(Math.abs(gx - hillPathLocalX(hill, gy)) < 30) continue;
    if(hill.pond && Math.hypot((gx - hill.pond.lx) / 1.5, gy - hill.pond.ly) < hill.pond.rx + 12) continue;
    hill.tufts.push({
     lx: gx,
     ly: gy,
     seed: g + idx * 31,
     floraKind: archetype.id,
     hasTinyBlossom: g % 4 === 0
    });
   }

   // 5b. Random Hillside Garden Benches
   if(hash(hSeed + 833) > 0.32 && !hill.cozyNook){
    const bLy = usableMeadowTop + 0.44 * (usableMeadowBottom - usableMeadowTop) + (hash(hSeed + 841) - 0.5) * 32;
    const bPathX = hillPathLocalX(hill, bLy);
    const bSide = (idx % 2 === 0 ? 1 : -1) * (hill.pond ? (hill.pond.lx < W * 0.5 ? 1 : -1) : 1);
    const bLx = Math.max(52, Math.min(W - 52, bPathX + bSide * (72 + hash(hSeed + 853) * 30)));
    if(!hill.pond || Math.hypot((bLx - hill.pond.lx) / 1.5, bLy - hill.pond.ly) > hill.pond.rx + 24){
     hill.benches.push({
      lx: bLx,
      ly: bLy,
      rot: (hash(hSeed + 863) - 0.5) * 0.08
     });
    }
   }

   // 5c. Squirrel on hillside — strictly depends on healthy blooming flowers on this hill!
   const overdueInSubj = subjTopics.filter(t => !t.done && dueState(t) !== 'fresh').length;
   const isHillWithering = subjTopics.length > 0 && (overdueInSubj / subjTopics.length >= 0.25);
   const subjHealthy = subjTopics.filter(t => !t.paused && dueState(t) === 'fresh' && (t.level || 0) >= 1).length;
   const subjBuddingOrBlooms = subjTopics.filter(t => !t.paused && dueState(t) === 'fresh' && (t.level || 0) >= 3).length;
   const subjEvergreenBlooms = subjTopics.filter(t => !t.paused && dueState(t) === 'fresh' && (t.level || 0) >= 4).length;

   // 10x more earned: requires 10..12 healthy topics AND at least 3 budding/blooming flowers on this hill
   const squirrelThreshold = 10 + (hSeed % 3);
   if(!isHillWithering && hill.trees.length > 0 && subjHealthy >= squirrelThreshold && subjBuddingOrBlooms >= 3){
    const tr = hill.trees[0];
    const initLx = Math.max(36, Math.min(W - 36, tr.lx + (tr.lx < W * 0.5 ? 24 : -24)));
    hill.squirrel = {
     treeIdx: 0,
     lx: initLx,
     ly: tr.ly + 4,
     dir: tr.lx < W * 0.5 ? 1 : -1,
     state: 'nibble', // 'nibble', 'scamper', 'lookout'
     timer: 2.0 + hash(hSeed + 601) * 2,
     boundsLeft: 0,
     boundTime: 0,
     boundPause: 0,
     phase: hash(hSeed + 607) * Math.PI * 2,
     eventState: 'hidden',
     eventTimer: 20.0 + hash(hSeed + 601) * 40.0, // starts hidden in tree, visits as rare event
     visitDuration: 0,
     alpha: 0
    };
   }

   // 5d. Graceful Deer — MOST EARNED & RARE FOREST GUARDIAN!
   // 10x more earned: requires a deeply mastered hill with >= 24..28 healthy topics AND >= 7..9 fully mature evergreen blooms (Level 4+), with 0 withering/overdue!
   const deerThreshold = 24 + (hSeed % 5);
   const deerBloomThreshold = 7 + (hSeed % 3);
   if(!isHillWithering && overdueInSubj === 0 && subjHealthy >= deerThreshold && subjEvergreenBlooms >= deerBloomThreshold){
    const dLy = usableMeadowTop + 0.36 * (usableMeadowBottom - usableMeadowTop) + (hash(hSeed + 719) - 0.5) * 26;
    const dPathX = hillPathLocalX(hill, dLy);
    const dSide = (idx % 2 === 0 ? -1 : 1);
    const dLx = Math.max(48, Math.min(W - 48, dPathX + dSide * (68 + hash(hSeed + 727) * 34)));
    hill.deer = {
     lx: dLx,
     ly: dLy,
     baseLy: dLy,
     dir: dSide > 0 ? -1 : 1,
     state: 'walk', // 'walk', 'graze', 'lookout', 'trot'
     speed: 22,
     timer: 3.5 + hash(hSeed + 733) * 2.5,
     walkTime: hash(hSeed + 743) * 10,
     neckAngle: 0.05,
     tailWag: 0,
     phase: hash(hSeed + 751) * Math.PI * 2,
     eventState: 'hidden',
     eventTimer: 45.0 + hash(hSeed + 733) * 85.0, // deep cooldown: visits as elusive majestic event
     visitDuration: 0,
     alpha: 0
    };
   }

   // 5e. Withering Crow (perched when hill is struggling/withering)
   if(isHillWithering && hill.trees.length > 0){
    const tr = hill.trees[1] || hill.trees[0];
    hill.crow = {
     lx: tr.lx + (tr.lx < W * 0.5 ? -4 : 4),
     ly: tr.ly - 44 * tr.scale,
     caw: 0,
     lookDir: 1,
     timer: 2 + hash(hSeed + 907) * 3,
     phase: hash(hSeed + 911) * Math.PI * 2
    };
   }

   // 6. Topic Plants (or Tilled Seed Plot if 0 topics yet)
   const count = subjTopics.length;
   if(count === 0){
    const plotLy = midLy + 10;
    const plotPathX = hillPathLocalX(hill, plotLy);
    let plotLx = Math.max(58, Math.min(W - 58, plotPathX + (-lmSide) * 66));
    if(hill.pond && Math.hypot((plotLx - hill.pond.lx) / (hill.pond.rx + 26), (plotLy - hill.pond.ly) / (hill.pond.ry + 22)) < 1){
     plotLx = Math.max(58, Math.min(W - 58, hill.pond.lx + (hill.pond.lx < W * 0.5 ? 1 : -1) * (hill.pond.rx + 28)));
    }
    hill.seedPlot = {
     lx: plotLx,
     ly: plotLy,
     subject: subj,
     biomeLabel: archetype.label,
     dot: archetype.dot,
     phase: hash(hSeed + 91) * Math.PI * 2
    };
   }else{
    const spanY = usableMeadowBottom - usableMeadowTop;
    const proceduralZoom = Math.max(0.64, 0.98 - Math.max(0, count - 3) * 0.016);
    const numBeds = count <= 3 ? count : count <= 6 ? 4 : count <= 12 ? 6 : count <= 18 ? 8 : 10;

    subjTopics.forEach((t, i) => {
     const prev = prevPlantMap.get(t.id);
     const bedIdx = i % numBeds;
     const bedSubIdx = Math.floor(i / numBeds);

     // Procedural space distribution across meadow tiers
     const bedFrac = (bedIdx + 0.5) / numBeds;
     const bedLy = usableMeadowTop + bedFrac * spanY + (hash(hSeed + bedIdx * 37 + 5) - 0.5) * 12;
     const pCenter = hillPathLocalX(hill, bedLy);
     const side = (bedIdx % 2 === 0) ? -1 : 1;
     const bankSpan = side < 0 ? (pCenter - 48) : (W - pCenter - 48);

     // Bed center on bank
     const lateralRatio = 0.30 + 0.54 * hash(hSeed + bedIdx * 43 + 11);
     const bedLx = pCenter + side * Math.max(34, bankSpan * lateralRatio);

     // Companion clustering: shrinks stuff slightly and adds procedural spacing as count increases!
     let lx = bedLx;
     let ly = bedLy;
     if(bedSubIdx > 0){
      const angle = (bedSubIdx * 2.3999 + hash(t.id + 7) * 0.8);
      const radX = (13 + bedSubIdx * 5.0) * proceduralZoom;
      const radY = (8 + bedSubIdx * 3.4) * proceduralZoom;
      lx += Math.cos(angle) * radX;
      ly += Math.sin(angle) * radY;
     } else {
      lx += (hash(t.id + 3) - 0.5) * 8 * proceduralZoom;
      ly += (hash(t.id + 4) - 0.5) * 6 * proceduralZoom;
     }

     if(hill.pond){
      const normDist = Math.hypot((lx - hill.pond.lx) / (hill.pond.rx + 24), (ly - hill.pond.ly) / (hill.pond.ry + 20));
      if(normDist < 1){
       const pushSide = (hill.pond.lx < W * 0.5) ? 1 : -1;
       lx = Math.max(34, Math.min(W - 34, hill.pond.lx + pushSide * (hill.pond.rx + 26)));
      }
     }
     if(hill.landmark && Math.hypot(lx - hill.landmark.lx, ly - hill.landmark.ly) < 34){
      lx = Math.max(34, Math.min(W - 34, lx + (lx >= hill.landmark.lx ? 30 : -30)));
     }
     if(hill.cozyNook && Math.hypot(lx - hill.cozyNook.lx, ly - hill.cozyNook.ly) < 36){
      lx = Math.max(34, Math.min(W - 34, lx + (lx >= hill.cozyNook.lx ? 30 : -30)));
     }

     lx = Math.max(32, Math.min(W - 32, lx));
     ly = Math.max(usableMeadowTop - 10, Math.min(usableMeadowBottom + 12, ly));

     const state = dueState(t);
     const level = t.level || 0;
     const species = speciesForTopic(t, i, hill);
     const fallenPetals = Array.from({ length: 4 }, (_, k) => ({
      dx: (hash(t.id + k * 19) - 0.5) * 20 * proceduralZoom,
      dy: (2 + hash(t.id + k * 23) * 6) * proceduralZoom,
      rot: hash(t.id + k * 29) * Math.PI
     }));

     hill.plants.push({
      topic: t,
      hillIndex: idx,
      biomeLabel: archetype.label,
      lx,
      ly,
      phase: hash(t.id + 7) * Math.PI * 2,
      scale: (0.92 + hash(t.id + 13) * 0.18) * proceduralZoom,
      state,
      level,
      species,
      fallenPetals,
      perkBoost: prev ? prev.perkBoost : 0,
      bendOffset: prev ? (prev.bendOffset || 0) : 0,
      bendVel: prev ? (prev.bendVel || 0) : 0,
      spawnAnim: prev ? prev.spawnAnim : 1,
      spawnDelay: prev ? prev.spawnDelay : 0,
      bloomAnim: prev ? prev.bloomAnim : 0
     });
    });

    hill.plants.sort((a, b) => a.ly - b.ly);
   }

   hillCards.push(hill);
  });

  // Clamp activeHillPos when switching missions or deleting subjects
  const maxIdx = Math.max(0, hillCards.length - 1);
  if(lastMissionRendered !== activeMissionId){
   lastMissionRendered = activeMissionId;
   activeHillPos = 0;
   activeHillVel = 0;
   targetHillIdx = null;
   syncedHudIdx = -1;
  }else{
   activeHillPos = Math.max(0, Math.min(maxIdx, activeHillPos));
   if(targetHillIdx !== null) targetHillIdx = Math.max(0, Math.min(maxIdx, targetHillIdx));
  }

  renderHillChipsAndRail();
  syncActiveHillHUD();

  // Check overall garden withering state
  const overdueAll = topics.filter(t => !t.done && dueState(t) !== 'fresh').length;
  const deadAll = topics.filter(t => !t.done && dueState(t) === 'dead').length;
  const isGardenWithering = topics.length > 0 && (overdueAll / topics.length >= 0.35 || deadAll >= 2);

  // Sync Butterflies (exactly as original: 2 alternating colors, reduced only if severely withering)
  const desiredButterflies = isGardenWithering ? (completed >= 3 ? 1 : 0) : (completed >= 1 ? Math.min(6, 1 + Math.floor(completed / 3)) : 1);
  while(butterflies.length < desiredButterflies){
   butterflies.push({
    x: W * (0.2 + Math.random() * 0.6),
    y: H * (0.44 + Math.random() * 0.34),
    vx: (Math.random() - 0.5) * 32,
    vy: (Math.random() - 0.5) * 20,
    phase: Math.random() * Math.PI * 2,
    tint: butterflies.length % 2 === 0 ? '#e8b698' : '#dfc994',
    targetId: null,
    restTimer: 0
   });
  }
  while(butterflies.length > desiredButterflies) butterflies.pop();

  // Sky birds — reflect biodiversity and withering
  const totalBlooms = hillCards.reduce((s, h) => s + h.bloomCount, 0);
  const desiredBirds = isGardenWithering ? 2 : (totalBlooms >= 2 ? Math.min(6, 1 + Math.floor(totalBlooms / 2)) : (completed >= 1 ? 1 : 0));
  const birdSpecies = isGardenWithering ? ['crow', 'crow'] : ['sparrow', 'swallow', 'finch', 'swallow'];
  while(birds.length < desiredBirds){
   const sp = birdSpecies[birds.length % birdSpecies.length];
   birds.push({
    x: 0.05 + Math.random() * 0.9,
    y: 0.07 + Math.random() * 0.14,
    speed: sp === 'crow' ? 0.014 + Math.random() * 0.008 : 0.022 + Math.random() * 0.018,
    phase: Math.random() * Math.PI * 2,
    species: sp,
    size: sp === 'crow' ? 1.5 : 1.0,
    color: sp === 'crow' ? 'rgba(42,50,46,0.65)' : 'rgba(72,92,74,0.48)'
   });
  }
  while(birds.length > desiredBirds) birds.pop();

// Deer is now spawned per-hill based on that hill's flowers

  // Perched songbirds (only on healthy hills)
  const desiredPerch = (!isGardenWithering && totalBlooms >= 3) ? Math.min(3, Math.floor(totalBlooms / 3)) : 0;
  while(perchBirds.length < desiredPerch){
   perchBirds.push({
    hillIndex: perchBirds.length % Math.max(1, hillCards.length),
    onLantern: perchBirds.length % 2 === 0,
    treeIdx: perchBirds.length % 3,
    phase: Math.random() * Math.PI * 2,
    color: perchBirds.length % 3 === 0 ? '#d4903a' : perchBirds.length % 3 === 1 ? '#7a9476' : '#6a8098',
    chirpTimer: Math.random() * 5,
    singing: false,
    wingFlap: 0
   });
  }
  while(perchBirds.length > desiredPerch) perchBirds.pop();

  if(!seedPuffs.length){
   seedPuffs = Array.from({ length: 14 }, (_, k) => ({
    x: hash(k + 501) * W,
    y: H * 0.38 + hash(k + 509) * (H * 0.48),
    phase: hash(k + 521) * Math.PI * 2,
    speed: 10 + hash(k + 541) * 10
   }));
  }

  const allPlants = getAllHillPlants();
  if(selectedPlantId && !allPlants.some(p => p.topic.id === selectedPlantId)){
   closeSpecimenCard();
  }else if(selectedPlantId){
   const found = allPlants.find(p => p.topic.id === selectedPlantId);
   if(found) openSpecimenCard(found, false);
  }
  updateDuePill();
 }

 function plantScreenCoords(p){
  const hill = hillCards[p.hillIndex] || hillCards[0];
  if(!hill) return { x: p.lx, y: p.ly };
  const pose = getHillCardPose(hill);
  const cx = W * 0.5;
  return {
   x: cx + pose.shiftX + (p.lx - cx) * pose.scale,
   y: pose.crestY + p.ly * pose.scale
  };
 }

 function processPendingGardenArrivals(){
  const mId = activeMissionId;
  const adds = (pendingGardenAdds[mId] || []).slice();
  const blooms = (pendingGardenBlooms[mId] || []).slice();
  const newBiomes = (pendingGardenBiomes[mId] || []).slice();
  if(!adds.length && !blooms.length && !newBiomes.length) return;

  pendingGardenAdds[mId] = [];
  pendingGardenBlooms[mId] = [];
  pendingGardenBiomes[mId] = [];
  saveGardenQueues();

  const allPlants = getAllHillPlants();
  let focusPlant = null;

  adds.forEach((id, idx) => {
   const p = allPlants.find(x => x.topic.id === id);
   if(p){
    p.spawnAnim = 0;
    p.spawnDelay = 0.22 + idx * 0.38;
    p.perkBoost = 1;
    p.bendVel = (idx % 2 === 0 ? 1 : -1) * 2.2;
    if(!focusPlant) focusPlant = p;
   }
  });

  blooms.forEach((id) => {
   const p = allPlants.find(x => x.topic.id === id);
   if(p){
    p.bloomAnim = 1;
    p.perkBoost = 1;
    p.bendVel = 2.6;
    if(!focusPlant) focusPlant = p;
   }
  });

  if(focusPlant){
   targetHillIdx = focusPlant.hillIndex;
   activeHillVel = 0;
   const pos = plantScreenCoords(focusPlant);
   if(blooms.length >= 1){
    spawnWaterDroplets(pos.x, pos.y - 26, 16);
    spawnPetals(pos.x, pos.y - 32, focusPlant.species.petalAlt, 10);
   }
   if(adds.length === 1){
    showWhisper(`Planted "${focusPlant.topic.name}" on ${focusPlant.topic.subject} hill 🌱`);
   }else if(adds.length > 1){
    showWhisper(`${adds.length} new sprouts planted across your hills 🌱`);
   }else if(blooms.length >= 1){
    showWhisper(`"${focusPlant.topic.name}" blooms on ${focusPlant.topic.subject} hill ✿`);
   }
   return;
  }

  if(newBiomes.length){
   const lastSubj = newBiomes[newBiomes.length - 1];
   const hill = hillCards.find(h => h.subject.toLowerCase() === String(lastSubj).toLowerCase());
   if(hill){
    targetHillIdx = hill.index;
    activeHillVel = 0;
    if(hill.landmark) hill.landmark.pulse = 1;
    spawnPetals(W * 0.5, H * 0.44, hill.archetype.particleColor, 14);
    showWhisper(`${hill.archetype.icon} New hill card: ${hill.subject} · ${hill.archetype.label}`);
   }
  }
 }

 function resizeCanvas(){
  const rect = sceneEl.getBoundingClientRect();
  if(!rect.width || !rect.height) return;
  W = rect.width;
  H = rect.height;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  if(!motes.length){
   motes = Array.from({ length: 38 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1.1 + Math.random() * 2.1,
    phase: Math.random() * Math.PI * 2,
    speed: 9 + Math.random() * 14
   }));
  }
 }

 function showWhisper(msg){
  const el = document.getElementById('gardenDiscovery');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showWhisper._t);
  showWhisper._t = setTimeout(() => el.classList.remove('show'), 2800);
 }

 function spawnWaterDroplets(x, y, count = 14){
  for(let i = 0; i < count; i++){
   droplets.push({
    x: x + (Math.random() - 0.5) * 68,
    y: y - 30 - Math.random() * 48,
    vy: 105 + Math.random() * 85,
    life: 1,
    r: 2 + Math.random() * 1.8
   });
  }
 }

 function spawnPetals(x, y, color = '#eab09b', count = 8){
  for(let i = 0; i < count; i++){
   petals.push({
    x: x + (Math.random() - 0.5) * 28,
    y: y + (Math.random() - 0.5) * 18,
    vx: (Math.random() - 0.35) * 38,
    vy: -18 + Math.random() * 24,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 4,
    life: 1,
    color
   });
  }
 }

 function openSpecimenCard(p, shouldSwitchHill = true){
  selectedPlantId = p.topic.id;
  const card = document.getElementById('gardenSpecimenCard');
  if(!card) return;
  document.getElementById('specimenSubject').textContent = `${p.topic.subject} · ${p.biomeLabel}`;
  document.getElementById('specimenName').textContent = p.topic.name;
  document.getElementById('specimenDot').style.background = p.state === 'dead' ? '#9c8b78' : p.species.petal;

  const dotsEl = document.getElementById('specimenGrowthDots');
  if(dotsEl){
   const stageCount = Math.min(4, (p.level || 0) + 1);
   dotsEl.innerHTML = [0, 1, 2, 3].map(idx => `<i class="${idx < stageCount ? 'on' : ''}"></i>`).join('');
  }

  const stageNames = ['Tender Sprout', 'Opening Bud', 'In Full Bloom', 'Thriving Cluster'];
  const stageLabel = stageNames[Math.min(3, p.level)];
  const overdueDays = Math.floor((todayStart() - new Date(p.topic.dueAt).setHours(0,0,0,0)) / DAY);

  let statusText = 'Fresh & steady';
  if(p.topic && p.topic.graduated) statusText = '🎓 Graduated · Permanent Full Bloom';
  else if(p.topic && p.topic.paused) statusText = '⏸ On hold · Resting';
  else if(p.state === 'dead') statusText = `Withered (${overdueDays}d overdue) · Revisit to revive`;
  else if(p.state === 'wilted') statusText = `Thirsty (${overdueDays}d overdue) · Needs care`;
  else if(p.topic.dueAt > Date.now()){
   const daysLeft = Math.max(1, Math.round((p.topic.dueAt - todayStart()) / DAY));
   statusText = `Next visit in ${daysLeft}d`;
  }
  document.getElementById('specimenStage').textContent = `${stageLabel} · ${statusText}`;
  card.classList.add('open');
  document.getElementById('gardenStackControls')?.classList.add('hidden');
  updateDuePill();

  if(shouldSwitchHill){
   targetHillIdx = p.hillIndex;
   activeHillVel = 0;
  }
 }

 function closeSpecimenCard(){
  selectedPlantId = null;
  document.getElementById('gardenSpecimenCard')?.classList.remove('open');
  document.getElementById('gardenStackControls')?.classList.remove('hidden');
  updateDuePill();
 }

 window.mistSelectedPlant = function(){
  const p = getAllHillPlants().find(x => x.topic.id === selectedPlantId);
  if(!p) return;
  p.perkBoost = 1;
  p.bendVel += (Math.random() > 0.5 ? 1 : -1) * 2.2;
  const pos = plantScreenCoords(p);
  spawnWaterDroplets(pos.x, pos.y - 24, 18);
  if(p.state !== 'dead'){
   spawnPetals(pos.x, pos.y - 30, p.species.petalAlt, 6);
   showWhisper(`Cool mist for "${p.topic.name}" 💧`);
  }else{
   showWhisper(`"${p.topic.name}" needs a revision to bloom again 📖`);
  }
 };

 window.revisitSelectedPlant = function(){
  const id = selectedPlantId;
  closeSpecimenCard();
  if(id) openTopic(id);
 };

 window.nurtureGarden = function(){
  windTarget = (Math.random() > 0.5 ? 1 : -1) * 1.25;
  const frontIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  const frontHill = hillCards[frontIdx];
  if(!frontHill) return;

  frontHill.plants.forEach((p, idx) => {
   p.perkBoost = 1;
   p.bendVel += (idx % 2 === 0 ? 1 : -1) * 1.4;
   const pos = plantScreenCoords(p);
   spawnWaterDroplets(pos.x, pos.y - 28, 7);
  });
  if(frontHill.pond){
   const pose = getHillCardPose(frontHill);
   ripples.push({
    x: W * 0.5 + pose.shiftX + (frontHill.pond.lx - W * 0.5) * pose.scale,
    y: pose.crestY + frontHill.pond.ly * pose.scale,
    r: 4, maxR: 48, alpha: 0.72
   });
  }
  if(frontHill.lantern) frontHill.lantern.boost = 1;
  if(frontHill.landmark) frontHill.landmark.pulse = 1;
  showWhisper(`Gentle mist & warm breeze across ${frontHill.subject} hill ✿`);
 };

 window.cycleGardenWeather = function(){
  weatherIdx = (weatherIdx + 1) % WEATHER_MODES.length;
  const mode = WEATHER_MODES[weatherIdx];
  const btn = document.getElementById('gardenWeather');
  if(btn) btn.textContent = mode.icon;
  showWhisper(mode.label);
 };

 /* Card-Stack Drag / Flick / Tap Interactions */
 let downX = 0, downY = 0, lastMoveY = 0, lastMoveX = 0, lastMoveTime = 0;
 let dragging = false, didDrag = false;
 let lastTapTime = 0;

 sceneEl.addEventListener('pointerdown', (e) => {
  if(e.target.closest('button') || e.target.closest('.garden-specimen-card') || e.target.closest('.garden-biome-bar') || e.target.closest('.garden-stack-rail') || e.target.closest('.garden-stack-controls') || e.target.closest('.garden-zoom-bar')) return;
  downX = lastMoveX = e.clientX;
  downY = lastMoveY = e.clientY;
  lastMoveTime = performance.now();
  dragging = true;
  didDrag = false;
  activeHillVel = 0;
  targetHillIdx = null;
 });

 sceneEl.addEventListener('pointermove', (e) => {
  const rect = sceneEl.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) / Math.max(1, rect.width);
  pointerY = (e.clientY - rect.top) / Math.max(1, rect.height);
  if(!dragging) return;

  const now = performance.now();
  const dt = Math.max(1, now - lastMoveTime);
  const dx = e.clientX - lastMoveX;
  const dy = e.clientY - lastMoveY;

  if(Math.hypot(e.clientX - downX, e.clientY - downY) > 6){
   didDrag = true;
  }

  if(didDrag){
   if(gardenCurrentZoom > 1.08){
    // In zoom mode: dragging smoothly pans the view to inspect any area
    const maxPanX = W * 0.44 * (gardenCurrentZoom - 0.7);
    const maxPanY = H * 0.32 * (gardenCurrentZoom - 0.7);
    targetPanX = Math.max(-maxPanX, Math.min(maxPanX, targetPanX + dx));
    targetPanY = Math.max(-maxPanY, Math.min(maxPanY, targetPanY + dy));
   } else if(hillCards.length > 1){
    // In fit mode: dragging flips hill cards in the stack
    const deltaCards = dy / (H * 0.34);
    const maxIdx = hillCards.length - 1;
    activeHillPos = Math.max(-0.22, Math.min(maxIdx + 0.22, activeHillPos + deltaCards));
    activeHillVel = (deltaCards / dt) * 16.6;
   }
  }

  lastMoveX = e.clientX;
  lastMoveY = e.clientY;
  lastMoveTime = now;
 });

 sceneEl.addEventListener('pointerup', (e) => {
  if(!dragging) return;
  dragging = false;
  if(didDrag){
   if(gardenCurrentZoom <= 1.08){
    // Snap to nearest hill card in stack
    const maxIdx = Math.max(0, hillCards.length - 1);
    const projected = activeHillPos + activeHillVel * 6.5;
    targetHillIdx = Math.max(0, Math.min(maxIdx, Math.round(projected)));
   }
   return;
  }

  const now = performance.now();
  if(now - lastTapTime < 290){
   // Double tap detected: toggle zoom!
   if(gardenZoomLevel > 1.15){
    window.resetZoomGarden();
   } else {
    gardenZoomLevel = 1.45;
    updateGardenZoomUI();
   }
   lastTapTime = 0;
   return;
  }
  lastTapTime = now;

  const rect = sceneEl.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const frontIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  const frontHill = hillCards[frontIdx];
  if(!frontHill) return;

  const frontPose = getHillCardPose(frontHill);
  const frontCrestAtX = frontPose.crestY + hillCrestOffset(frontHill, sx / Math.max(1, W)) * frontPose.scale;

  // A. Check if user tapped a peeking background hill card above the front hill crest!
  if(sy < frontCrestAtX - 4){
   // Check from front-most peeking hill (`frontIdx + 1`) backward (`hillCards.length - 1`)
   for(let i = frontIdx + 1; i < hillCards.length; i++){
    const bgHill = hillCards[i];
    const bgPose = getHillCardPose(bgHill);
    const localNx = ((sx - W * 0.5 - bgPose.shiftX) / bgPose.scale + W * 0.5) / Math.max(1, W);
    const clampedNx = Math.max(0, Math.min(1, localNx));
    const bgCrestAtX = bgPose.crestY + hillCrestOffset(bgHill, clampedNx) * bgPose.scale;
    if(sy >= bgCrestAtX - 14){
     window.focusHillCard(i);
     return;
    }
   }
  }

  // Convert screen tap into local coordinates of the active front hill card
  const lx = (sx - W * 0.5 - frontPose.shiftX) / frontPose.scale + W * 0.5;
  const ly = (sy - frontPose.crestY) / frontPose.scale;

  // 1. Hit-test Topic Plants on the front hill card
  let best = null, bestD = 38;
  for(const p of frontHill.plants){
   if(p.spawnAnim < 0.35) continue;
   const stemH = (p.level === 0 ? 19 : p.level === 1 ? 33 : p.level === 2 ? 43 : 48) * p.scale;
   const dBase = Math.hypot(lx - p.lx, ly - (p.ly - stemH * 0.35));
   const dCrown = Math.hypot(lx - p.lx, ly - (p.ly - stemH * 0.88));
   const d = Math.min(dBase, dCrown);
   if(d < bestD){ bestD = d; best = p; }
  }

  if(best){
   best.perkBoost = 1;
   best.bendVel += (lx < best.lx ? 2.4 : -2.4);
   if(best.state !== 'dead'){
    spawnPetals(sx, sy - 16, best.species.petalAlt, 7);
   }
   openSpecimenCard(best, false);
   return;
  }

  closeSpecimenCard();

  // 2. Hit-test Tilled Seed-Bed Plot (when subject has 0 topics yet)
  if(frontHill.seedPlot && Math.hypot(lx - frontHill.seedPlot.lx, ly - (frontHill.seedPlot.ly - 6)) < 38){
   openAddWithSubject(frontHill.seedPlot.subject);
   toast(`Plant a seed on ${frontHill.seedPlot.subject} hill 🌱`);
   return;
  }

  // 3. Hit-test Signature Biome Landmark
  if(frontHill.landmark && Math.hypot(lx - frontHill.landmark.lx, ly - (frontHill.landmark.ly - 12)) < 36){
   const lm = frontHill.landmark;
   lm.pulse = 1;
   const msgs = {
    sundial: `${lm.subject} Sundial · Clarity on the terraced hill ☀️`,
    ruin_arch: `${lm.subject} Ruin Arch · Echoes of history & memory 🏺`,
    cairn: `${lm.subject} Hill Cairn · Steady balance across the knoll 🌾`,
    boulder_cluster: `${lm.subject} Alpine Stones · Crisp mountain air 🏔️`,
    fern_ring: `${lm.subject} Fern Glade · Deep roots & quiet growth 🌿`,
    crystals: `${lm.subject} Quartz Cluster · Resonating crystalline light 💎`
   };
   spawnPetals(sx, sy - 14, '#fff0c2', 7);
   showWhisper(msgs[lm.kind] || `${lm.subject} · ${lm.biomeLabel}`);
   return;
  }

  // 4. Hit-test Stone Lantern
  if(frontHill.lantern && Math.hypot(lx - frontHill.lantern.lx, ly - (frontHill.lantern.ly - 16)) < 28){
   frontHill.lantern.boost = 1;
   spawnPetals(sx, sy - 14, '#ffd782', 5);
   showWhisper('Warm lantern light flickers on the hillside 🕯️');
   return;
  }

  // 5. Hit-test Cozy Reading Bench Nook
  if(frontHill.cozyNook && Math.hypot(lx - frontHill.cozyNook.lx, ly - (frontHill.cozyNook.ly - 8)) < 36){
   spawnPetals(sx, sy - 14, '#f5e1b5', 5);
   showWhisper('A quiet bench & warm cup of tea on Blossom Hill ☕');
   return;
  }

  // 6. Hit-test Pond
  if(frontHill.pond){
   const pd = frontHill.pond;
   if(Math.hypot((lx - pd.lx) / (pd.rx * 1.15), (ly - pd.ly) / (pd.ry * 1.35)) < 1){
    ripples.push({ x: sx, y: sy, r: 3, maxR: 52, alpha: 0.82 });
    frontHill.koi.forEach(k => { k.dartBoost = 1; });
    return;
   }
  }

  // 7. Hit-test Sanctuary Trees
  for(const tr of frontHill.trees){
   if(Math.hypot(lx - tr.lx, ly - (tr.ly - 24 * tr.scale)) < 34){
    tr.shake = 1;
    if(frontHill.squirrel){
     if(frontHill.squirrel.eventState === 'hidden' && Math.random() < 0.35){
      // Shaking tree has a small chance to coax a hidden squirrel out!
      frontHill.squirrel.eventState = 'visiting';
      frontHill.squirrel.visitDuration = 14.0;
      frontHill.squirrel.boundsLeft = 3;
      frontHill.squirrel.boundTime = 0;
      frontHill.squirrel.boundPause = 0;
      frontHill.squirrel.lx = Math.max(36, Math.min(W - 36, tr.lx + (tr.lx < W * 0.5 ? 20 : -20)));
      frontHill.squirrel.dir = tr.lx < W * 0.5 ? 1 : -1;
      frontHill.squirrel.alpha = 0.6;
      showWhisper('A curious squirrel peeks out from the shaken branches! 🐿️');
     } else if(frontHill.squirrel.eventState !== 'hidden'){
      frontHill.squirrel.scamperBoost = 2.5;
      frontHill.squirrel.dir *= -1;
     }
    }
    const leafCol = tr.kind === 'sakura' ? '#f5c2ca' : tr.kind === 'maple' ? '#d98a5f' : tr.kind === 'golden_oak' ? '#f0cf78' : '#9bb88c';
    spawnPetals(sx, sy - 16, leafCol, 8);
    return;
   }
  }

  // 8. Hit-test Rabbits (sprints away startled when tapped!)
  for(const rb of activeRabbits){
   if(Math.hypot(lx - rb.lx, ly - rb.ly) < 32){
    rb.state = 'sprint';
    rb.dir = (lx < rb.lx ? 1 : -1);
    rb.speed = 125;
    rb.stateTimer = 2.4;
    spawnPetals(sx, sy - 10, '#f2e8dc', 5);
    showWhisper('A startled rabbit sprints across the meadow! 🐇💨');
    return;
   }
  }

  // 9. Hit-test Squirrel (natural hopping scamper away!)
  if(frontHill.squirrel && frontHill.squirrel.eventState !== 'hidden' && Math.hypot(lx - frontHill.squirrel.lx, ly - frontHill.squirrel.ly) < 32){
   frontHill.squirrel.state = 'scamper';
   frontHill.squirrel.boundsLeft = 3;
   frontHill.squirrel.boundTime = 0;
   frontHill.squirrel.boundPause = 0;
   frontHill.squirrel.dir = (lx < frontHill.squirrel.lx ? 1 : -1);
   spawnPetals(sx, sy - 10, '#d98b58', 5);
   showWhisper('A playful squirrel bounds across the meadow! 🐿️');
   return;
  }

  // 10. Hit-test Deer (trots away gracefully!)
  if(frontHill.deer && frontHill.deer.eventState !== 'hidden' && Math.hypot(lx - frontHill.deer.lx, ly - frontHill.deer.ly) < 38){
   frontHill.deer.state = 'trot';
   frontHill.deer.speed = 65;
   frontHill.deer.timer = 3.0;
   frontHill.deer.dir = (lx < frontHill.deer.lx ? 1 : -1);
   spawnPetals(sx, sy - 12, '#eed8ae', 6);
   showWhisper('A majestic deer trots gracefully across the meadow! 🦌✨');
   return;
  }

  // 10. Hit-test Garden Bench
  if(frontHill.benches){
   for(const bn of frontHill.benches){
    if(Math.hypot(lx - bn.lx, ly - bn.ly) < 32){
     spawnPetals(sx, sy - 10, '#eedbb5', 4);
     showWhisper('A peaceful garden bench to sit and pause 🪑');
     return;
    }
   }
  }

  // 11. Hit-test Withering Crow
  if(frontHill.crow && Math.hypot(lx - frontHill.crow.lx, ly - frontHill.crow.ly) < 28){
   frontHill.crow.caw = 1;
   showWhisper('A solitary raven watches over the withered garden... revisits will revive the bloom 🪶');
   return;
  }

  // 8. Gentle breeze & biome petals
  windTarget = (sx < W * 0.5 ? 0.82 : -0.82);
  spawnPetals(sx, sy, frontHill.archetype.particleColor, 5);
 });

 let wheelCooldown = 0;
 sceneEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Pinch-to-zoom / Ctrl+Wheel zoom support
  if(e.ctrlKey || e.metaKey || e.altKey){
   const zoomDelta = e.deltaY < 0 ? 0.12 : -0.12;
   gardenZoomLevel = Math.max(0.72, Math.min(2.1, gardenZoomLevel + zoomDelta));
   updateGardenZoomUI();
   return;
  }
  if(hillCards.length <= 1) return;
  const now = performance.now();
  if(now - wheelCooldown < 240) return;
  if(Math.abs(e.deltaY) > 12){
   wheelCooldown = now;
   window.stepHillCard(e.deltaY > 0 ? 1 : -1);
  }
 }, { passive: false });

 // Multi-touch pinch zoom support
 let touchDist0 = null;
 let initialZoom0 = 1.0;

 sceneEl.addEventListener('touchstart', (e) => {
  if(e.touches.length === 2){
   touchDist0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
   initialZoom0 = gardenZoomLevel;
  }
 }, { passive: true });

 sceneEl.addEventListener('touchmove', (e) => {
  if(e.touches.length === 2 && touchDist0){
   const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
   gardenZoomLevel = Math.max(0.72, Math.min(2.1, initialZoom0 * (dist / touchDist0)));
   updateGardenZoomUI();
  }
 }, { passive: true });

 sceneEl.addEventListener('touchend', (e) => {
  if(e.touches.length < 2) touchDist0 = null;
 }, { passive: true });

 window.zoomInGarden = function(){
  gardenZoomLevel = Math.min(2.1, gardenZoomLevel + 0.25);
  updateGardenZoomUI();
 };
 window.zoomOutGarden = function(){
  gardenZoomLevel = Math.max(0.72, gardenZoomLevel - 0.20);
  if(gardenZoomLevel <= 1.05){ targetPanX = 0; targetPanY = 0; }
  updateGardenZoomUI();
 };
 window.resetZoomGarden = function(){
  gardenZoomLevel = 1.0;
  targetPanX = 0;
  targetPanY = 0;
  updateGardenZoomUI();
 };
 function updateGardenZoomUI(){
  const el = document.getElementById('gardenZoomLabel');
  if(el){
   if(Math.abs(gardenZoomLevel - 1.0) < 0.04){
    el.textContent = 'Fit';
   } else {
    el.textContent = Math.round(gardenZoomLevel * 100) + '%';
   }
  }
 }

 function easeOutBack(x){
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
 }

 function drawRoundedRect(x, y, w, h, r){
  if(ctx.roundRect){
   ctx.beginPath();
   ctx.roundRect(x, y, w, h, r);
   return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
 }

 /* Render a single Hill Garden Card in the Cascading Stack */
 function drawHillCard(hill, pal, t, baseWind, dt, idlePanX, idlePanY){
  const pose = getHillCardPose(hill);
  if(pose.alpha <= 0.01) return;

  const arch = hill.archetype;
  const colors = pal.isNight ? arch.groundNight : arch.groundDay;
  const isBackgroundPeek = pose.rel > 0.65;
  const parallaxFactor = Math.max(0.25, 1 - Math.max(0, pose.rel) * 0.16);

  ctx.save();
  ctx.globalAlpha = pose.alpha;

  // Apply card-stack transform around top-center crest
  const cx = W * 0.5;
  ctx.translate(cx + pose.shiftX + idlePanX * parallaxFactor, pose.crestY + idlePanY * parallaxFactor);
  ctx.scale(pose.scale, pose.scale);
  ctx.translate(-cx, 0);

  const padX = 72;
  const hillBottomY = H + 140;

  // Build smooth rolling hill card path
  function traceHillCrest(){
   for(let x = -padX; x <= W + padX; x += 14){
    const nx = Math.max(-0.15, Math.min(1.15, x / Math.max(1, W)));
    const y = hillCrestOffset(hill, nx);
    if(x === -padX) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
   }
  }

  // 1. Card Drop-Shadow behind the hill crest (creates tactile stacked-card depth)
  ctx.save();
  ctx.strokeStyle = pal.isNight ? 'rgba(8, 14, 12, 0.42)' : 'rgba(34, 48, 34, 0.20)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  for(let x = -padX; x <= W + padX; x += 14){
   const nx = Math.max(-0.15, Math.min(1.15, x / Math.max(1, W)));
   const y = hillCrestOffset(hill, nx) - 2.5;
   if(x === -padX) ctx.moveTo(x, y);
   else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // 2. Hill Body Fill (Clipped to the hill card silhouette)
  ctx.save();
  ctx.beginPath();
  traceHillCrest();
  ctx.lineTo(W + padX, hillBottomY);
  ctx.lineTo(-padX, hillBottomY);
  ctx.closePath();
  ctx.clip();

  const hillGrad = ctx.createLinearGradient(0, -34, 0, H * 0.56);
  hillGrad.addColorStop(0, colors[0]);
  hillGrad.addColorStop(1, colors[1]);
  ctx.fillStyle = hillGrad;
  ctx.fillRect(-padX, -48, W + padX * 2, hillBottomY + 48);

  // Subtle rolling contour bands inside the hill slope (reinforcing terraced/rolling hill geometry)
  for(let band = 1; band <= 4; band++){
   const bandShiftY = band * 68;
   ctx.strokeStyle = pal.isNight ? 'rgba(210, 232, 222, 0.05)' : 'rgba(255, 253, 240, 0.12)';
   ctx.lineWidth = 1.4;
   ctx.beginPath();
   for(let x = -padX; x <= W + padX; x += 18){
    const nx = x / Math.max(1, W);
    const y = hillCrestOffset(hill, nx) * 0.72 + bandShiftY;
    if(x === -padX) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
   }
   ctx.stroke();
  }

  // 3. Winding Hill Path
  const pColors = arch.path;
  const pathBaseCol = pal.isNight ? '#5c6660' : pColors.base;
  const pathLightCol = pal.isNight ? '#77827b' : pColors.light;
  const pathStoneCol = pal.isNight ? '#68736c' : pColors.stone;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pathBaseCol;
  ctx.lineWidth = 42;
  ctx.beginPath();
  for(let ly = 8; ly <= H * 0.64; ly += 14){
   const px = hillPathLocalX(hill, ly);
   if(ly === 8) ctx.moveTo(px, ly);
   else ctx.lineTo(px, ly);
  }
  ctx.stroke();

  ctx.strokeStyle = pathLightCol;
  ctx.lineWidth = 25;
  ctx.stroke();

  for(let sy = 26; sy < H * 0.60; sy += 58){
   const sx = hillPathLocalX(hill, sy);
   ctx.fillStyle = 'rgba(80, 76, 64, 0.18)';
   ctx.beginPath();
   ctx.ellipse(sx, sy + 1.6, 9.5, 4.0, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pathStoneCol;
   ctx.beginPath();
   ctx.ellipse(sx, sy, 8.8, 3.6, 0, 0, Math.PI * 2);
   ctx.fill();
  }
  ctx.restore();

  // 4. Reflective Hillside Pond (if biome has water)
  if(hill.pond){
   const pd = hill.pond;
   ctx.save();
   const pondGrad = ctx.createLinearGradient(pd.lx, pd.ly - pd.ry, pd.lx, pd.ly + pd.ry);
   pondGrad.addColorStop(0, pal.isNight ? '#395458' : '#8ebbc0');
   pondGrad.addColorStop(1, pal.isNight ? '#24393e' : '#65969c');
   ctx.fillStyle = pondGrad;
   ctx.beginPath();
   ctx.ellipse(pd.lx, pd.ly, pd.rx, pd.ry, pd.rot, 0, Math.PI * 2);
   ctx.fill();

   ctx.strokeStyle = 'rgba(244, 242, 226, 0.48)';
   ctx.lineWidth = 1.5;
   ctx.stroke();

   ctx.save();
   ctx.beginPath();
   ctx.ellipse(pd.lx, pd.ly, pd.rx - 2, pd.ry - 2, pd.rot, 0, Math.PI * 2);
   ctx.clip();
   for(const k of hill.koi){
    drawKoi(k, pd, t, dt);
   }
   ctx.restore();

   for(const ly of pd.lilies){
    const lx = pd.lx + ly.dx + Math.sin(t * 1.1 + ly.phase) * 1.4;
    const lyy = pd.ly + ly.dy + Math.cos(t * 0.9 + ly.phase) * 0.8;
    ctx.fillStyle = pal.isNight ? '#3d634d' : '#6c9969';
    ctx.beginPath();
    ctx.ellipse(lx, lyy, ly.r, ly.r * 0.48, 0, 0.25, Math.PI * 1.85);
    ctx.lineTo(lx, lyy);
    ctx.closePath();
    ctx.fill();

    if(ly.hasFlower){
     ctx.fillStyle = pal.isNight ? '#e8d8c8' : '#fff8ee';
     ctx.beginPath();
     ctx.ellipse(lx, lyy - 1.5, 3.2, 2.0, 0, 0, Math.PI * 2);
     ctx.fill();
     ctx.fillStyle = '#e7be62';
     ctx.beginPath();
     ctx.arc(lx, lyy - 1.5, 1.0, 0, Math.PI * 2);
     ctx.fill();
    }
   }

   for(const rd of pd.reeds){
    const rx = pd.lx + Math.cos(rd.angle) * (pd.rx - 2);
    const ry = pd.ly + Math.sin(rd.angle) * (pd.ry - 2);
    const reedBend = Math.sin(t * 2 + rd.phase) * 2.5 + baseWind * 6;
    ctx.strokeStyle = pal.isNight ? '#395745' : '#587d56';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + reedBend * 0.5, ry - rd.h * 0.5, rx + reedBend, ry - rd.h);
    ctx.stroke();
   }
   ctx.restore();
  }

  // 5. Stones & Grass/Wildflower Tufts
  for(const st of hill.stones){
   ctx.fillStyle = st.kind === 'autumn_ruins'
    ? (pal.isNight ? '#594e43' : '#c29e80')
    : st.kind === 'crystal_glade'
     ? (pal.isNight ? '#495c63' : '#9eb3ba')
     : (pal.isNight ? '#4c5952' : '#96a192');
   ctx.beginPath();
   ctx.ellipse(st.lx, st.ly, st.r * 1.4, st.r * 0.72, 0.08, 0, Math.PI * 2);
   ctx.fill();
  }

  for(const g of hill.tufts){
   const bend = Math.sin(t * 1.6 + g.seed) * 1.8 + baseWind * 6.5;
   ctx.strokeStyle = pal.isNight ? '#365244' : '#577c52';
   ctx.lineWidth = 1.3;
   ctx.lineCap = 'round';
   ctx.beginPath();
   ctx.moveTo(g.lx - 3, g.ly);
   ctx.quadraticCurveTo(g.lx - 4 + bend * 0.5, g.ly - 5, g.lx - 5 + bend, g.ly - 9);
   ctx.moveTo(g.lx + 1, g.ly);
   ctx.quadraticCurveTo(g.lx + 1 + bend * 0.6, g.ly - 6, g.lx + 2 + bend, g.ly - 11);
   ctx.stroke();

   if(g.hasTinyBlossom && !pal.isNight){
    ctx.fillStyle = g.floraKind === 'crystal_glade'
     ? '#99b8cf'
     : g.floraKind === 'blossom_cloister'
      ? '#f5b8c4'
      : g.floraKind === 'autumn_ruins'
       ? '#e09572'
       : (g.seed % 2 === 0 ? '#f6efd8' : '#e6c57a');
    ctx.beginPath();
    ctx.arc(g.lx + 2 + bend, g.ly - 11.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
   }
  }

  // 6. Signature Landmark, Cozy Nook, Tilled Seed Plot & Hill Crest Sign
  if(hill.landmark) drawBiomeLandmark(hill.landmark, pal, t, dt);
  if(hill.cozyNook) drawCozyNook(hill.cozyNook, pal, t);
  if(hill.seedPlot && !isBackgroundPeek) drawSeedBedPlot(hill.seedPlot, pal, t);

  // 7. Depth-Sorted Trees, Lantern, Benches, Squirrels, Deer & Topic Plants
  const renderables = [
   ...hill.trees.map(tr => ({ kind: 'tree', y: tr.ly, obj: tr })),
   ...(hill.lantern ? [{ kind: 'lantern', y: hill.lantern.ly, obj: hill.lantern }] : []),
   ...(hill.benches || []).map(bn => ({ kind: 'bench', y: bn.ly, obj: bn })),
   ...(hill.squirrel ? [{ kind: 'squirrel', y: hill.squirrel.ly, obj: hill.squirrel }] : []),
   ...(hill.deer ? [{ kind: 'deer', y: hill.deer.ly, obj: hill.deer }] : []),
   ...hill.plants.map(p => ({ kind: 'plant', y: p.ly, obj: p }))
  ];
  renderables.sort((a, b) => a.y - b.y);

  for(const item of renderables){
   if(item.kind === 'tree') drawSanctuaryTree(item.obj, pal, t, baseWind, dt);
   else if(item.kind === 'lantern') drawStoneLantern(item.obj, pal, t);
   else if(item.kind === 'bench') drawGardenBench(item.obj, pal, t);
   else if(item.kind === 'squirrel') drawSquirrel(item.obj, hill, pal, t, dt);
   else if(item.kind === 'deer') drawDeer(item.obj, hill, pal, t, dt);
   else drawBotanicalPlant(item.obj, t, baseWind, dt);
  }

  if(hill.crow && !isBackgroundPeek){
   drawWitheringCrow(hill.crow, pal, t, dt);
  }

  if(hill.dragonfly && hill.pond && !isBackgroundPeek){
   drawDragonfly(hill.dragonfly, hill.pond, t);
  }

  // Rabbits coming and going on the active front hill
  const frontCardIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  if(!isBackgroundPeek && hill.index === frontCardIdx){
   for(const rb of activeRabbits){
    drawRabbit(rb, t, dt, pal);
   }
  }



  // Perched birds on this hill (front card only)
  if(!isBackgroundPeek){
   for(const pb of perchBirds){
    if(pb.hillIndex === hill.index) drawPerchedBird(pb, hill, t, dt, pal);
   }
  }

  // Atmospheric aerial-perspective veil on hills further back in the stack
  if(pose.mistAmount > 0.01){
   ctx.fillStyle = pal.isNight
    ? `rgba(28, 42, 40, ${pose.mistAmount.toFixed(2)})`
    : `rgba(232, 240, 228, ${pose.mistAmount.toFixed(2)})`;
   ctx.fillRect(-padX, -48, W + padX * 2, hillBottomY + 48);
  }

  ctx.restore(); // End hill silhouette clip

  // 8. Card-Stack Rim Highlight along the top crest of the hill (gives crisp stacked-card edge!)
  ctx.save();
  ctx.strokeStyle = pal.isNight ? 'rgba(210, 232, 220, 0.34)' : arch.ridgeEdge;
  ctx.lineWidth = pose.rel <= 0.3 ? 2.6 : 2.0;
  ctx.beginPath();
  traceHillCrest();
  ctx.stroke();
  ctx.restore();

  // 9. Crest Tab / Waypost Sign perched on the hill ridge
  drawHillCrestSign(hill, pose, pal);

  ctx.restore();
 }

 function drawHillCrestSign(hill, pose, pal){
  const isFront = pose.rel <= 0.45;
  const peakNx = Math.max(0.28, Math.min(0.72, 0.5 + hill.crestSkew * 0.8));
  const signX = W * peakNx;
  const signY = hillCrestOffset(hill, peakNx) + (isFront ? 14 : 6);

  const numStr = String(hill.index + 1).padStart(2, '0');
  const titleText = `${numStr} · ${hill.subject.toUpperCase()}`;
  const subText = `${hill.archetype.label} (${hill.bloomCount}/${hill.totalCount})`;

  ctx.save();
  ctx.translate(signX, signY);

  if(!isFront){
   // Compact peeking hill card tab (tappable to bring this hill card forward!)
   ctx.font = '700 9px "DM Sans", sans-serif';
   const tw = ctx.measureText(titleText).width;
   const pillW = tw + 22;
   const pillH = 20;

   ctx.fillStyle = pal.isNight ? 'rgba(32, 46, 42, 0.86)' : 'rgba(255, 253, 246, 0.88)';
   drawRoundedRect(-pillW * 0.5, -pillH * 0.5, pillW, pillH, 10);
   ctx.fill();

   ctx.strokeStyle = pal.isNight ? 'rgba(200, 220, 210, 0.3)' : 'rgba(130, 148, 119, 0.38)';
   ctx.lineWidth = 1;
   ctx.stroke();

   ctx.fillStyle = hill.archetype.dot;
   ctx.beginPath();
   ctx.arc(-pillW * 0.5 + 9, 0, 2.8, 0, Math.PI * 2);
   ctx.fill();

   ctx.fillStyle = pal.isNight ? '#eef2e6' : '#3a4034';
   ctx.textBaseline = 'middle';
   ctx.fillText(titleText, -pillW * 0.5 + 15, 0.5);
   ctx.restore();
   return;
  }

  // Full wooden garden sign on the front hill card
  ctx.font = '700 9.5px "DM Sans", sans-serif';
  const w1 = ctx.measureText(titleText).width;
  ctx.font = '500 8.8px "DM Sans", sans-serif';
  const w2 = ctx.measureText(subText).width;
  const boardW = Math.max(94, Math.max(w1, w2) + 22);
  const boardH = 30;
  const bx = -boardW * 0.5;
  const by = -28;

  ctx.fillStyle = 'rgba(26, 38, 28, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.isNight ? '#463b32' : '#7c5e44';
  ctx.fillRect(-1.8, -26, 3.6, 32);

  ctx.fillStyle = pal.isNight ? 'rgba(34, 46, 42, 0.90)' : 'rgba(255, 252, 244, 0.92)';
  drawRoundedRect(bx, by, boardW, boardH, 8);
  ctx.fill();

  ctx.strokeStyle = pal.isNight ? 'rgba(210, 224, 214, 0.34)' : 'rgba(130, 148, 119, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = hill.archetype.dot;
  ctx.beginPath();
  ctx.arc(bx + 9, by + 10.5, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.isNight ? '#f2efe4' : '#34382f';
  ctx.font = '700 9.5px "DM Sans", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, bx + 16, by + 10.5);

  ctx.fillStyle = pal.isNight ? '#b5c2b8' : '#73786a';
  ctx.font = '500 8.8px "DM Sans", sans-serif';
  ctx.fillText(subText, bx + 9, by + 21.5);

  ctx.restore();
 }

 /* Tilled Seed-Bed Plot for newly added subjects with 0 topics yet */
 function drawSeedBedPlot(sp, pal, t){
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.4 + sp.phase);
  ctx.save();
  ctx.translate(sp.lx, sp.ly);

  ctx.fillStyle = pal.isNight ? 'rgba(34, 30, 26, 0.72)' : 'rgba(110, 88, 66, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 22, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = pal.isNight ? `rgba(235, 244, 224, ${0.35 + pulse * 0.35})` : `rgba(255, 252, 240, ${0.45 + pulse * 0.4})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 2, 25, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = pal.isNight ? '#584a3e' : '#8c6d51';
  ctx.fillRect(-1.4, -15, 2.8, 17);

  ctx.fillStyle = pal.isNight ? 'rgba(36, 48, 44, 0.9)' : 'rgba(255, 253, 246, 0.92)';
  drawRoundedRect(-26, -26, 52, 14, 7);
  ctx.fill();

  ctx.fillStyle = sp.dot;
  ctx.beginPath();
  ctx.arc(-18, -19, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.isNight ? '#eef2e6' : '#434b3c';
  ctx.font = '600 8.5px "DM Sans", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('＋ Plant seed', -12, -19);

  ctx.restore();
 }

 function drawBiomeLandmark(lm, pal, t, dt){
  if(lm.pulse > 0) lm.pulse = Math.max(0, lm.pulse - dt * 1.4);
  ctx.save();
  ctx.translate(lm.lx, lm.ly);

  ctx.fillStyle = 'rgba(28, 42, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if(lm.kind === 'sundial'){
   ctx.fillStyle = pal.isNight ? '#69706a' : '#e6dec8';
   ctx.beginPath();
   ctx.ellipse(0, 4, 13, 4.5, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillRect(-4, -14, 8, 18);
   ctx.fillStyle = pal.isNight ? '#7f8780' : '#f4eedc';
   ctx.beginPath();
   ctx.ellipse(0, -14, 14, 5, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.strokeStyle = '#c89e4c';
   ctx.lineWidth = 1.8;
   ctx.beginPath();
   ctx.moveTo(0, -14);
   ctx.lineTo(5, -21);
   ctx.stroke();
  }else if(lm.kind === 'ruin_arch'){
   const stone = pal.isNight ? '#63584c' : '#cfa886';
   const stoneHi = pal.isNight ? '#786b5d' : '#e3c3a4';
   ctx.fillStyle = stone;
   ctx.fillRect(-16, -24, 6, 29);
   ctx.fillRect(10, -20, 6, 25);
   ctx.fillStyle = stoneHi;
   drawRoundedRect(-19, -29, 38, 7, 3);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#355240' : '#658c5d';
   ctx.beginPath();
   ctx.arc(-12, -21, 5, 0, Math.PI * 2);
   ctx.arc(-7, -23, 4, 0, Math.PI * 2);
   ctx.fill();
  }else if(lm.kind === 'cairn'){
   const stones = [
    { y: 2, rx: 12, ry: 4.5, col: pal.isNight ? '#5d6359' : '#b8b29c' },
    { y: -4, rx: 9, ry: 3.6, col: pal.isNight ? '#6d7368' : '#ccc5ae' },
    { y: -9, rx: 6.5, ry: 2.8, col: pal.isNight ? '#7d8378' : '#ded8c3' },
    { y: -13.5, rx: 4, ry: 2.0, col: pal.isNight ? '#8c9287' : '#ece7d5' }
   ];
   stones.forEach(st => {
    ctx.fillStyle = st.col;
    ctx.beginPath();
    ctx.ellipse(0, st.y, st.rx, st.ry, 0, 0, Math.PI * 2);
    ctx.fill();
   });
   ctx.strokeStyle = '#dfb555';
   ctx.lineWidth = 1.4;
   [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.quadraticCurveTo(12 + dir * 4, -8, 12 + dir * 7, -18);
    ctx.stroke();
   });
  }else if(lm.kind === 'boulder_cluster'){
   ctx.fillStyle = pal.isNight ? '#4f5d5c' : '#9aa6a4';
   ctx.beginPath();
   ctx.ellipse(-6, 0, 14, 9, -0.1, 0, Math.PI * 2);
   ctx.ellipse(9, 2, 10, 7, 0.15, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#395749' : '#6f9674';
   ctx.beginPath();
   ctx.ellipse(-7, -5, 10, 3.5, -0.1, 0, Math.PI * 2);
   ctx.fill();
  }else if(lm.kind === 'fern_ring'){
   ctx.fillStyle = pal.isNight ? '#4a3d33' : '#85684e';
   ctx.beginPath();
   ctx.ellipse(0, 1, 11, 6, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.strokeStyle = pal.isNight ? '#3b664b' : '#589463';
   ctx.lineWidth = 2;
   for(let f = 0; f < 6; f++){
    const ang = (f / 6) * Math.PI * 2 + Math.sin(t + f) * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(Math.cos(ang) * 10, Math.sin(ang) * 5 - 8, Math.cos(ang) * 18, Math.sin(ang) * 8 - 2);
    ctx.stroke();
   }
  }else if(lm.kind === 'crystals'){
   const glowStrength = (pal.isNight ? 0.85 : 0.42) + lm.pulse * 0.55;
   const halo = ctx.createRadialGradient(0, -10, 2, 0, -10, 32 + lm.pulse * 14);
   halo.addColorStop(0, `rgba(176, 242, 252, ${glowStrength})`);
   halo.addColorStop(1, 'rgba(176, 242, 252, 0)');
   ctx.fillStyle = halo;
   ctx.beginPath();
   ctx.arc(0, -10, 32 + lm.pulse * 14, 0, Math.PI * 2);
   ctx.fill();

   const shards = [
    { x: -7, h: 17, w: 4.5, tilt: -0.25, col: '#92cfd9' },
    { x: 0, h: 24, w: 5.5, tilt: 0.04, col: '#bcecf5' },
    { x: 8, h: 15, w: 4.2, tilt: 0.28, col: '#7ebcc7' }
   ];
   shards.forEach(sh => {
    ctx.save();
    ctx.translate(sh.x, 3);
    ctx.rotate(sh.tilt);
    ctx.fillStyle = sh.col;
    ctx.beginPath();
    ctx.moveTo(-sh.w, 0);
    ctx.lineTo(-sh.w * 0.7, -sh.h * 0.75);
    ctx.lineTo(0, -sh.h);
    ctx.lineTo(sh.w * 0.7, -sh.h * 0.75);
    ctx.lineTo(sh.w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
   });
  }

  ctx.restore();
 }

 function drawSanctuaryTree(tr, pal, t, wind, dt){
  if(tr.shake > 0) tr.shake = Math.max(0, tr.shake - dt * 2.2);
  const sway = Math.sin(t * 1.1 + tr.ly * 0.02) * 0.03 + wind * 0.08 + Math.sin(t * 28) * tr.shake * 0.09;

  ctx.save();
  ctx.translate(tr.lx, tr.ly);
  ctx.scale(tr.scale, tr.scale);

  ctx.fillStyle = 'rgba(28, 44, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(2, 18, 22, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(sway);

  ctx.strokeStyle = tr.kind === 'birch'
   ? (pal.isNight ? '#8a9490' : '#e6e2d5')
   : (pal.isNight ? '#28352f' : '#655748');
  ctx.lineWidth = tr.kind === 'cypress' ? 5 : 6.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.quadraticCurveTo(-2, 0, 0, -20);
  ctx.stroke();

  if(tr.kind === 'pine'){
   const c1 = pal.isNight ? '#2c443b' : '#5f8261';
   const c2 = pal.isNight ? '#355046' : '#719570';
   const c3 = pal.isNight ? '#3f5c50' : '#83a77f';
   [
    { y: -12, w: 26, h: 24, col: c1 },
    { y: -26, w: 21, h: 22, col: c2 },
    { y: -39, w: 15, h: 20, col: c3 }
   ].forEach(tier => {
    ctx.fillStyle = tier.col;
    ctx.beginPath();
    ctx.moveTo(0, tier.y - tier.h);
    ctx.quadraticCurveTo(tier.w * 0.55, tier.y - tier.h * 0.35, tier.w, tier.y);
    ctx.quadraticCurveTo(0, tier.y + 4, -tier.w, tier.y);
    ctx.quadraticCurveTo(-tier.w * 0.55, tier.y - tier.h * 0.35, 0, tier.y - tier.h);
    ctx.fill();
   });
  }else if(tr.kind === 'cypress'){
   ctx.fillStyle = pal.isNight ? '#294238' : '#5a7f58';
   ctx.beginPath();
   ctx.ellipse(0, -24, 11, 28, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#365448' : '#72996d';
   ctx.beginPath();
   ctx.ellipse(-2, -26, 7, 22, 0, 0, Math.PI * 2);
   ctx.fill();
  }else if(tr.kind === 'maple'){
   ctx.fillStyle = pal.isNight ? '#4f352b' : '#c4724d';
   ctx.beginPath();
   ctx.arc(-11, -22, 19, 0, Math.PI * 2);
   ctx.arc(13, -19, 17, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#634334' : '#db8d5c';
   ctx.beginPath();
   ctx.arc(1, -31, 20, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#78543d' : '#ebb06c';
   ctx.beginPath();
   ctx.arc(-4, -36, 12, 0, Math.PI * 2);
   ctx.fill();
  }else if(tr.kind === 'golden_oak'){
   ctx.fillStyle = pal.isNight ? '#45432c' : '#b89f4e';
   ctx.beginPath();
   ctx.arc(-11, -22, 20, 0, Math.PI * 2);
   ctx.arc(13, -19, 18, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#575436' : '#cfb65d';
   ctx.beginPath();
   ctx.arc(1, -31, 21, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#696642' : '#e3cc74';
   ctx.beginPath();
   ctx.arc(-4, -36, 13, 0, Math.PI * 2);
   ctx.fill();
  }else if(tr.kind === 'sakura'){
   ctx.fillStyle = pal.isNight ? '#59424b' : '#e6a5b0';
   ctx.beginPath();
   ctx.arc(-11, -22, 20, 0, Math.PI * 2);
   ctx.arc(13, -19, 18, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#6e525d' : '#f2bec7';
   ctx.beginPath();
   ctx.arc(1, -31, 21, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#826370' : '#fad6dc';
   ctx.beginPath();
   ctx.arc(-4, -36, 13, 0, Math.PI * 2);
   ctx.fill();
  }else if(tr.kind === 'birch'){
   ctx.fillStyle = pal.isNight ? '#2b474d' : '#6e9da3';
   ctx.beginPath();
   ctx.arc(-10, -23, 18, 0, Math.PI * 2);
   ctx.arc(12, -20, 16, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#375860' : '#88b6bc';
   ctx.beginPath();
   ctx.arc(1, -32, 19, 0, Math.PI * 2);
   ctx.fill();
  }else{
   ctx.fillStyle = pal.isNight ? '#2f473d' : '#6a8d64';
   ctx.beginPath();
   ctx.arc(-11, -22, 20, 0, Math.PI * 2);
   ctx.arc(13, -19, 18, 0, Math.PI * 2);
   ctx.fill();

   ctx.fillStyle = pal.isNight ? '#395449' : '#7ea074';
   ctx.beginPath();
   ctx.arc(1, -31, 21, 0, Math.PI * 2);
   ctx.fill();

   ctx.fillStyle = pal.isNight ? '#446155' : '#94b587';
   ctx.beginPath();
   ctx.arc(-4, -36, 13, 0, Math.PI * 2);
   ctx.fill();
  }
  ctx.restore();
 }

 function drawStoneLantern(ln, pal, t){
  if(ln.boost > 0) ln.boost = Math.max(0, ln.boost - 0.015);
  const glowStrength = Math.min(1.25, pal.warmGlow + ln.boost * 0.75);
  const flicker = 0.88 + 0.12 * Math.sin(t * 7.5 + ln.phase);

  ctx.save();
  ctx.translate(ln.lx, ln.ly);

  ctx.fillStyle = 'rgba(30, 44, 32, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if(glowStrength > 0.12){
   const r = (34 + ln.boost * 18) * flicker;
   const halo = ctx.createRadialGradient(0, -17, 2, 0, -17, r);
   halo.addColorStop(0, `rgba(255, 218, 132, ${(0.52 * glowStrength * flicker).toFixed(2)})`);
   halo.addColorStop(0.55, `rgba(255, 192, 102, ${(0.22 * glowStrength).toFixed(2)})`);
   halo.addColorStop(1, 'rgba(255, 192, 102, 0)');
   ctx.fillStyle = halo;
   ctx.beginPath();
   ctx.arc(0, -17, r, 0, Math.PI * 2);
   ctx.fill();
  }

  const stoneDark = pal.isNight ? '#58625c' : '#9c9e8d';
  const stoneLight = pal.isNight ? '#6f7972' : '#babba8';

  ctx.fillStyle = stoneDark;
  ctx.beginPath();
  ctx.ellipse(0, 1, 9, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-3, -12, 6, 13);

  ctx.fillStyle = glowStrength > 0.12 ? `rgba(255, 226, 148, ${Math.min(1, 0.55 + glowStrength * 0.5)})` : '#dcd8c6';
  ctx.fillRect(-4.5, -21, 9, 9);

  ctx.strokeStyle = stoneDark;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-4.5, -21, 9, 9);

  ctx.fillStyle = stoneLight;
  ctx.beginPath();
  ctx.moveTo(-10, -21);
  ctx.quadraticCurveTo(0, -29, 10, -21);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -27.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
 }

 function drawCozyNook(nook, pal, t){
  if(!nook) return;
  ctx.save();
  ctx.translate(nook.lx, nook.ly);

  ctx.fillStyle = 'rgba(30, 46, 32, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 28, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const woodDark = pal.isNight ? '#4a3d33' : '#8c6b4f';
  const woodLight = pal.isNight ? '#635244' : '#ab8665';

  ctx.fillStyle = woodDark;
  ctx.fillRect(-19, -11, 3, 18);
  ctx.fillRect(16, -11, 3, 18);

  ctx.fillStyle = woodLight;
  ctx.fillRect(-21, -10, 42, 3.5);
  ctx.fillRect(-21, -5, 42, 3);

  ctx.fillStyle = woodLight;
  ctx.fillRect(-22, 0, 44, 4);

  ctx.fillStyle = '#c88b70';
  ctx.fillRect(7, -3, 10, 3);
  ctx.fillStyle = '#f5efe0';
  ctx.fillRect(8, -5.5, 8, 2.5);

  ctx.fillStyle = '#fffdf7';
  ctx.beginPath();
  ctx.arc(-11, -2.5, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 253, 247, 0.48)';
  ctx.lineWidth = 1.1;
  const steamShift = Math.sin(t * 2.2) * 2;
  ctx.beginPath();
  ctx.moveTo(-11, -6);
  ctx.quadraticCurveTo(-11 + steamShift, -11, -11 - steamShift * 0.6, -16);
  ctx.stroke();

  ctx.restore();
 }

 function drawBotanicalPlant(p, t, wind, dt){
  if(p.spawnDelay > 0){
   p.spawnDelay = Math.max(0, p.spawnDelay - dt);
   if(p.spawnDelay === 0){
    const pos = plantScreenCoords(p);
    spawnWaterDroplets(pos.x, pos.y - 18, 12);
    spawnPetals(pos.x, pos.y - 20, p.species.petalAlt, 6);
   }
   return;
  }
  if(p.spawnAnim < 1){
   p.spawnAnim = Math.min(1, p.spawnAnim + dt * 1.05);
  }
  if(p.bloomAnim > 0){
   p.bloomAnim = Math.max(0, p.bloomAnim - dt * 0.65);
  }

  p.bendOffset = (p.bendOffset || 0) + (p.bendVel || 0) * dt;
  p.bendVel = ((p.bendVel || 0) - p.bendOffset * 28 * dt) * Math.pow(0.08, dt);

  const spawnScale = p.spawnAnim < 1 ? Math.max(0.01, easeOutBack(p.spawnAnim)) : 1;
  const s = p.scale * spawnScale;
  const isSelected = (p.topic.id === selectedPlantId);
  const isDead = (p.state === 'dead');
  const isWilted = (p.state === 'wilted');

  if(p.perkBoost > 0) p.perkBoost = Math.max(0, p.perkBoost - 0.016);

  const wiltBend = isDead ? 0.82 : isWilted ? 0.40 * (1 - p.perkBoost * 0.4) : 0;
  const swayAmp = isDead ? 0.015 : 0.06;
  const sway = Math.sin(t * 1.45 + p.phase) * swayAmp + wind * (isDead ? 0.05 : 0.14 + 0.05 * Math.sin(p.phase)) + p.bendOffset * 0.25;
  const totalBend = sway + wiltBend;

  ctx.save();
  ctx.translate(p.lx, p.ly);

  if(p.spawnAnim < 1){
   const ringR = (1 - p.spawnAnim) * 28 + 10;
   ctx.strokeStyle = `rgba(255, 246, 200, ${(1 - p.spawnAnim) * 0.85})`;
   ctx.lineWidth = 2;
   ctx.beginPath();
   ctx.ellipse(0, 2, ringR, ringR * 0.38, 0, 0, Math.PI * 2);
   ctx.stroke();
  }

  ctx.fillStyle = isDead ? 'rgba(42, 36, 28, 0.26)' : 'rgba(34, 52, 34, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 14 * s, 4.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if(isDead && p.fallenPetals){
   ctx.fillStyle = '#8b7765';
   for(const fp of p.fallenPetals){
    ctx.save();
    ctx.translate(fp.dx * s, fp.dy * s);
    ctx.rotate(fp.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.6 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
   }
  }

  if(isSelected){
   const pulseR = (20 + Math.sin(t * 4) * 1.8) * s;
   ctx.strokeStyle = 'rgba(255, 248, 214, 0.95)';
   ctx.lineWidth = 2.2;
   ctx.beginPath();
   ctx.ellipse(0, 2 * s, pulseR, pulseR * 0.36, 0, 0, Math.PI * 2);
   ctx.stroke();
  }

  const baseStemH = p.level === 0 ? 20 : p.level === 1 ? 34 : p.level === 2 ? 44 : 50;
  const stemH = baseStemH * s * (isDead ? 0.84 : 1);
  const tipX = Math.sin(totalBend) * stemH;
  const tipY = -Math.cos(totalBend) * stemH;
  const ctrlX = tipX * 0.34;
  const ctrlY = tipY * 0.56;

  const stemColor = isDead ? '#6e5c4b' : isWilted ? '#73855d' : '#4b734c';
  ctx.strokeStyle = stemColor;
  ctx.lineWidth = (p.level >= 2 ? 2.6 : 2.1) * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
  ctx.stroke();

  const leafColor = isDead ? '#7c6954' : isWilted ? '#869468' : '#628a5b';
  const leafHighlight = isDead ? '#8e7a64' : '#7ea673';

  function drawLeaf(lx, ly, angle, len, wid){
   ctx.save();
   ctx.translate(lx, ly);
   const deadDroop = isDead ? (angle < -1.5 ? -0.45 : 0.45) : 0;
   ctx.rotate(angle + deadDroop);
   ctx.fillStyle = leafColor;
   ctx.beginPath();
   ctx.moveTo(0, 0);
   ctx.quadraticCurveTo(len * 0.5, -wid * (isDead ? 0.65 : 1), len * (isDead ? 0.82 : 1), isDead ? 3 * s : 0);
   ctx.quadraticCurveTo(len * 0.5, wid * (isDead ? 0.65 : 1), 0, 0);
   ctx.fill();
   if(!isDead){
    ctx.strokeStyle = leafHighlight;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.moveTo(2 * s, 0);
    ctx.lineTo(len * 0.78, 0);
    ctx.stroke();
   }
   ctx.restore();
  }

  drawLeaf(-1 * s, -4 * s, -2.45 + sway * 0.5, 13.5 * s, 4.6 * s);
  drawLeaf(1 * s, -5 * s, -0.65 + sway * 0.5, 13.5 * s, 4.6 * s);

  if(p.level >= 1){
   drawLeaf(ctrlX * 0.85, ctrlY * 0.85, -2.25 + totalBend * 0.7, 14.5 * s, 4.9 * s);
   drawLeaf(ctrlX * 1.05, ctrlY * 1.05, -0.85 + totalBend * 0.7, 14.5 * s, 4.9 * s);
  }

  function drawBlossom(bx, by, bScale, rotOffset){
   ctx.save();
   ctx.translate(bx, by);
   ctx.rotate(totalBend * 0.88 + rotOffset);

   if(isDead){
    ctx.fillStyle = '#6b5847';
    ctx.beginPath();
    ctx.ellipse(0, 2 * s, 4.2 * s * bScale, 6.2 * s * bScale, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#534336';
    ctx.beginPath();
    ctx.arc(0, 4 * s, 2.8 * s * bScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
   }

   const pMain = isWilted ? p.species.petalAlt : p.species.petal;
   const pSub = p.species.petalAlt;
   const r = 9.8 * s * bScale * (1 + p.bloomAnim * 0.24);

   if(p.level === 0){
    ctx.fillStyle = '#85a875';
    ctx.beginPath();
    ctx.ellipse(-2.5 * s, -2 * s, 3.2 * s, 5.2 * s, -0.35, 0, Math.PI * 2);
    ctx.ellipse(2.5 * s, -2 * s, 3.2 * s, 5.2 * s, 0.35, 0, Math.PI * 2);
    ctx.fill();
   }else if(p.level === 1){
    ctx.fillStyle = '#5a8156';
    ctx.beginPath();
    ctx.moveTo(-4.5 * s, 2 * s);
    ctx.lineTo(0, -8 * s);
    ctx.lineTo(4.5 * s, 2 * s);
    ctx.fill();
    ctx.fillStyle = pMain;
    ctx.beginPath();
    ctx.ellipse(0, -5.5 * s, 4.8 * s, 7.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
   }else{
    if((p.level >= 3 || p.bloomAnim > 0) && p.state === 'fresh'){
     const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.4);
     glow.addColorStop(0, `rgba(255, 241, 184, ${0.46 + p.bloomAnim * 0.35})`);
     glow.addColorStop(1, 'rgba(255, 241, 184, 0)');
     ctx.fillStyle = glow;
     ctx.beginPath();
     ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
     ctx.fill();
    }

    const kind = p.species.kind;
    if(kind === 'lavender'){
     for(let k = 0; k < 5; k++){
      const fy = 4 * s - k * 3.8 * s;
      const fw = (5.4 - k * 0.65) * s * bScale;
      ctx.fillStyle = k % 2 === 0 ? pMain : pSub;
      ctx.beginPath();
      ctx.ellipse(-fw * 0.45, fy, fw * 0.55, 2.5 * s, -0.25, 0, Math.PI * 2);
      ctx.ellipse(fw * 0.45, fy, fw * 0.55, 2.5 * s, 0.25, 0, Math.PI * 2);
      ctx.fill();
     }
    }else if(kind === 'bluebell'){
     for(let b = -1; b <= 1; b++){
      ctx.save();
      ctx.translate(b * 4.5 * s, Math.abs(b) * 2.5 * s);
      ctx.rotate(b * 0.35 + 0.15);
      ctx.fillStyle = b === 0 ? pMain : pSub;
      ctx.beginPath();
      ctx.moveTo(-4 * s, -2 * s);
      ctx.quadraticCurveTo(-5 * s, 6 * s, -6.5 * s, 8 * s);
      ctx.lineTo(6.5 * s, 8 * s);
      ctx.quadraticCurveTo(5 * s, 6 * s, 4 * s, -2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
     }
    }else{
     const petalsN = kind === 'poppy' ? 5 : kind === 'marigold' ? 10 : 7;
     for(let k = 0; k < petalsN; k++){
      const ang = (k / petalsN) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = k % 2 === 0 ? pMain : pSub;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.66, r * (petalsN > 7 ? 0.32 : 0.42), r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
     }
     ctx.fillStyle = p.species.center;
     ctx.beginPath();
     ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
     ctx.fill();
    }
   }
   ctx.restore();
  }

  drawBlossom(tipX, tipY, 1, 0);

  if(p.level >= 3 && !isDead){
   const b1x = ctrlX * 0.72 - 10 * s;
   const b1y = ctrlY * 0.72 - 8 * s;
   ctx.strokeStyle = stemColor;
   ctx.lineWidth = 1.6 * s;
   ctx.beginPath();
   ctx.moveTo(ctrlX * 0.78, ctrlY * 0.78);
   ctx.quadraticCurveTo(b1x + 3 * s, b1y + 5 * s, b1x, b1y);
   ctx.stroke();
   drawBlossom(b1x, b1y, 0.72, -0.35);

   const b2x = ctrlX * 0.92 + 11 * s;
   const b2y = ctrlY * 0.92 - 6 * s;
   ctx.beginPath();
   ctx.moveTo(ctrlX * 0.95, ctrlY * 0.95);
   ctx.quadraticCurveTo(b2x - 3 * s, b2y + 5 * s, b2x, b2y);
   ctx.stroke();
   drawBlossom(b2x, b2y, 0.68, 0.38);
  }

  ctx.restore();
 }

 function drawKoi(k, pond, t, dt){
  if(k.dartBoost > 0) k.dartBoost = Math.max(0, k.dartBoost - dt * 0.9);
  const mult = 1 + k.dartBoost * 2.8;
  k.angle += k.speed * mult * dt;

  const rx = pond.rx * k.orbitRx;
  const ry = pond.ry * k.orbitRy;
  const kx = pond.lx + Math.cos(k.angle) * rx;
  const ky = pond.ly + Math.sin(k.angle) * ry;

  const dx = -Math.sin(k.angle) * rx * k.speed;
  const dy = Math.cos(k.angle) * ry * k.speed;
  const heading = Math.atan2(dy, dx);
  const wiggle = Math.sin(t * 7 * mult + k.phase) * 0.16;

  ctx.save();
  ctx.translate(kx, ky);
  ctx.rotate(heading + wiggle);

  ctx.fillStyle = k.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = k.spotColor;
  ctx.beginPath();
  ctx.ellipse(1.5, -0.4, 2.6, 1.4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = k.color;
  ctx.beginPath();
  ctx.moveTo(-6.5, 0);
  ctx.lineTo(-11, -3 + Math.sin(t * 10 * mult + k.phase) * 1.5);
  ctx.lineTo(-11, 3 + Math.sin(t * 10 * mult + k.phase) * 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
 }

 function drawDragonfly(df, pond, t){
  const ang = t * 1.35 + df.phase;
  const dx = pond.lx + Math.cos(ang) * (pond.rx * 0.85) + Math.sin(ang * 2.3) * 12;
  const dy = pond.ly - 14 + Math.sin(ang * 1.7) * 9;
  const flutter = Math.sin(t * 36 + df.phase);

  ctx.save();
  ctx.translate(dx, dy);

  ctx.strokeStyle = df.color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(5, 0);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(1, -2.5 * Math.abs(flutter), 4.2, 1.3, -0.25, 0, Math.PI * 2);
  ctx.ellipse(1, 2.5 * Math.abs(flutter), 4.2, 1.3, 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
 }


 // ── Rabbit (Coming & Going, Sprinting & Grazing) ────────────────────────
 function updateActiveRabbits(dt, t){
  const frontCardIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  const currentHill = hillCards[frontCardIdx];
  if(!currentHill) return;

  // Rabbit spawn depends on flowers of the corresponding hill!
  const hillHealthyFlowers = currentHill.topics.filter(t => !t.paused && (dueState(t) === 'fresh') && (t.level || 0) >= 1).length;
  const hillBuddingOrBlooms = currentHill.topics.filter(t => !t.paused && (dueState(t) === 'fresh') && (t.level || 0) >= 3).length;
  const hillOverdue = currentHill.topics.filter(t => !t.done && dueState(t) !== 'fresh').length;
  const isHillWithering = currentHill.totalCount > 0 && (hillOverdue / currentHill.totalCount >= 0.25);

  // 10x more earned: requires 18..22 healthy topics AND at least 5 blooming flowers on this hill
  const hillRabbitThreshold = 18 + (currentHill.crestSeed % 5);

  const canHaveRabbits = hillHealthyFlowers >= hillRabbitThreshold && hillBuddingOrBlooms >= 5 && !isHillWithering;
  // Solitary rare visitor: strictly 1 rabbit (only in a super-meadow with >= 35 topics can a second rabbit visit)
  const maxRabbits = canHaveRabbits ? (hillHealthyFlowers >= 35 && hillBuddingOrBlooms >= 12 ? 2 : 1) : 0;

  rabbitSpawnTimer -= dt;
  if(canHaveRabbits && activeRabbits.length < maxRabbits && rabbitSpawnTimer <= 0){
   // 10x rarer: 65 to 140 seconds cooldown between rabbit visits (1 to 2.5 minutes)
   rabbitSpawnTimer = 65 + Math.random() * 75;
   const enterFromLeft = Math.random() < 0.5;
   activeRabbits.push({
    lx: enterFromLeft ? -24 : W + 24,
    ly: 62 + Math.random() * 95,
    dir: enterFromLeft ? 1 : -1,
    state: 'enter', // 'enter', 'nibble', 'hop', 'sprint', 'leave'
    stateTimer: 3,
    targetLx: W * (0.25 + Math.random() * 0.5),
    speed: 36,
    hopPhase: 0,
    hopAmp: 0,
    lifetime: 0,
    maxStay: 14 + Math.random() * 12,
    color: ['#c4b496', '#ad9c81', '#d4c8b2', '#9a846c'][Math.floor(Math.random() * 4)],
    earPerk: 1
   });
  }

  for(let i = activeRabbits.length - 1; i >= 0; i--){
   const rb = activeRabbits[i];
   rb.lifetime += dt;

   // If garden withers or time up, rabbit heads off-campus
   if(rb.lifetime > rb.maxStay || !canHaveRabbits){
    if(rb.state !== 'leave'){
     rb.state = 'leave';
     rb.dir = (rb.lx < W * 0.5 ? -1 : 1);
     rb.speed = canHaveRabbits ? 48 : 105; // startled sprint if withering!
    }
   }

   rb.stateTimer -= dt;

   if(rb.state === 'enter'){
    rb.speed = 36;
    rb.lx += rb.dir * rb.speed * dt;
    rb.hopPhase = (rb.hopPhase + dt * 4.2) % 1;
    rb.hopAmp = Math.sin(rb.hopPhase * Math.PI);
    if((rb.dir > 0 && rb.lx >= rb.targetLx) || (rb.dir < 0 && rb.lx <= rb.targetLx)){
     rb.state = 'nibble';
     rb.stateTimer = 1.8 + Math.random() * 2.4;
     rb.hopAmp = 0;
    }
   } else if(rb.state === 'nibble'){
    rb.hopAmp = 0;
    if(rb.stateTimer <= 0){
     const roll = Math.random();
     if(roll < 0.35){
      rb.state = 'hop';
      rb.stateTimer = 1.6 + Math.random() * 2.2;
      rb.dir = Math.random() < 0.5 ? -1 : 1;
      rb.speed = 28 + Math.random() * 16;
     } else if(roll < 0.68){
      // SPRINT! Random energetic sprint burst across the meadow!
      rb.state = 'sprint';
      rb.stateTimer = 1.2 + Math.random() * 1.8;
      rb.dir = (rb.lx < 60 ? 1 : rb.lx > W - 60 ? -1 : (Math.random() < 0.5 ? 1 : -1));
      rb.speed = 98 + Math.random() * 38;
     } else {
      rb.state = 'nibble';
      rb.stateTimer = 1.5 + Math.random() * 2;
     }
    }
   } else if(rb.state === 'hop'){
    rb.lx += rb.dir * rb.speed * dt;
    rb.hopPhase = (rb.hopPhase + dt * 4.0) % 1;
    rb.hopAmp = Math.sin(rb.hopPhase * Math.PI);
    if(rb.lx < 28){ rb.lx = 28; rb.dir = 1; }
    if(rb.lx > W - 28){ rb.lx = W - 28; rb.dir = -1; }
    if(rb.stateTimer <= 0){
     rb.state = 'nibble';
     rb.stateTimer = 2 + Math.random() * 2;
     rb.hopAmp = 0;
    }
   } else if(rb.state === 'sprint'){
    // Rapid bounding sprint!
    rb.lx += rb.dir * rb.speed * dt;
    rb.hopPhase = (rb.hopPhase + dt * 8.6) % 1; // rapid hops!
    rb.hopAmp = Math.sin(rb.hopPhase * Math.PI);
    if(rb.lx < 24){ rb.lx = 24; rb.dir = 1; }
    if(rb.lx > W - 24){ rb.lx = W - 24; rb.dir = -1; }
    if(rb.stateTimer <= 0){
     rb.state = 'nibble';
     rb.stateTimer = 1.8 + Math.random() * 2.2;
     rb.hopAmp = 0;
    }
   } else if(rb.state === 'leave'){
    rb.lx += rb.dir * rb.speed * dt;
    const isFast = rb.speed > 60;
    rb.hopPhase = (rb.hopPhase + dt * (isFast ? 8.2 : 4.4)) % 1;
    rb.hopAmp = Math.sin(rb.hopPhase * Math.PI);
    // Left the campus!
    if(rb.lx < -34 || rb.lx > W + 34){
     activeRabbits.splice(i, 1);
    }
   }
  }
 }

 function drawRabbit(rb, t, dt, pal){
  const isSprinting = rb.state === 'sprint' || (rb.state === 'leave' && rb.speed > 60);
  const isSitting = rb.state === 'nibble';
  const bodyY = -rb.hopAmp * (isSprinting ? 9 : 6);
  const col = rb.color;
  const belly = pal.isNight ? '#7a6e62' : '#e8dcc8';
  const shadow = pal.isNight ? 'rgba(16,28,22,0.28)' : 'rgba(28,46,28,0.18)';

  ctx.save();
  ctx.translate(rb.lx, rb.ly + bodyY);

  // Shadow
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 2, isSprinting ? 12 : 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (stretched when sprinting)
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, isSprinting ? 9 : 7, isSprinting ? 4.5 : 5.5, isSprinting ? -rb.dir * 0.15 : 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(rb.dir * 1.5, 0.5, 4, 3.2, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Fluffy Tail
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.arc(-rb.dir * (isSprinting ? 9 : 7.5), 0.5, 3.0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(rb.dir * (isSprinting ? 7.5 : 6), -4, 4.4, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = pal.isNight ? '#c08080' : '#3c2820';
  ctx.beginPath();
  ctx.arc(rb.dir * (isSprinting ? 9 : 7.5), -5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Ears (laid back when sprinting, upright and twitching when sitting)
  const earLean = isSprinting ? -rb.dir * 0.72 : (isSitting ? rb.dir * 0.08 + Math.sin(t * 8) * 0.06 : rb.dir * 0.25);
  const earLen = isSprinting ? 3.6 : 4.6;

  ctx.fillStyle = col;
  ctx.save();
  ctx.translate(rb.dir * 5, -8);
  ctx.rotate(earLean);
  ctx.beginPath();
  ctx.ellipse(0, -earLen * 0.8, 1.5, earLen, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.isNight ? '#7a5a60' : '#e8aab0';
  ctx.beginPath();
  ctx.ellipse(0, -earLen * 0.75, 0.7, earLen * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Second ear
  ctx.fillStyle = col;
  ctx.save();
  ctx.translate(rb.dir * 6.5, -8);
  ctx.rotate(earLean + rb.dir * 0.16);
  ctx.beginPath();
  ctx.ellipse(0, -earLen * 0.75, 1.3, earLen * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Paws
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(rb.dir * (isSprinting ? 6 : 3.5), 4.2, 2.4, 1.4, isSprinting ? 0.3 : 0, 0, Math.PI * 2);
  ctx.ellipse(rb.dir * (isSprinting ? 9 : 6.5), 4.2, 2.4, 1.4, isSprinting ? 0.3 : 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
 }

 // ── Squirrel (Natural Discrete Bounding & Foraging) ────────────────────
 function drawSquirrel(sq, hill, pal, t, dt){
  // Rare Event Lifecycle: Resting up in tree vs visiting in meadow
  if(!sq.eventState) sq.eventState = 'hidden';
  if(sq.alpha === undefined) sq.alpha = 0;

  const tr = hill.trees[sq.treeIdx % hill.trees.length] || { lx: W * 0.5, ly: 120 };

  if(sq.eventState === 'hidden'){
   sq.eventTimer -= dt;
   if(sq.eventTimer <= 0){
    // Scurry down tree to forage on meadow!
    sq.eventState = 'visiting';
    sq.visitDuration = 14.0 + Math.random() * 12.0;
    sq.boundsLeft = 3;
    sq.boundTime = 0;
    sq.boundPause = 0;
    sq.lx = Math.max(36, Math.min(W - 36, tr.lx + (tr.lx < W * 0.5 ? 20 : -20)));
    sq.dir = tr.lx < W * 0.5 ? 1 : -1;
    sq.alpha = 0;
   } else {
    return; // Resting peacefully in the canopy
   }
  }

  // Active visit handling
  if(sq.eventState === 'visiting'){
   sq.alpha = Math.min(1, sq.alpha + dt * 2.0);
   sq.visitDuration -= dt;
   if(sq.visitDuration <= 0 && sq.boundsLeft <= 0){
    sq.eventState = 'departing';
    sq.boundsLeft = 2;
    sq.boundTime = 0;
    sq.boundPause = 0;
    sq.dir = (sq.lx < tr.lx ? 1 : -1);
   }
  } else if(sq.eventState === 'departing'){
   sq.alpha = Math.max(0, sq.alpha - dt * 1.4);
   if(sq.alpha <= 0 || Math.abs(sq.lx - tr.lx) < 14){
    sq.eventState = 'hidden';
    sq.eventTimer = 55.0 + Math.random() * 75.0; // 55..130s cooldown before next foraging visit
    return;
   }
  }

  // Check tree shake reaction: startle into scampering bounds!
  if(tr && tr.shake > 0.35 && sq.boundsLeft <= 0){
   sq.state = 'scamper';
   sq.boundsLeft = 3;
   sq.boundTime = 0;
   sq.boundPause = 0;
   sq.dir = sq.lx < tr.lx ? -1 : 1;
  }

  let hopY = 0;
  let tilt = 0;
  let tailLag = 0;

  // Active Scampering: series of discrete, smooth, parabolic bounds
  if(sq.boundsLeft > 0){
   if(sq.boundPause > 0){
    // Brief pause between bounds with feet planted on the ground
    sq.boundPause -= dt;
   } else {
    // Progress of single discrete bound (lasts 0.24s)
    const boundDuration = 0.24;
    sq.boundTime += dt;
    const progress = Math.min(1, sq.boundTime / boundDuration);

    // Smooth parabolic bounce arc
    hopY = -Math.sin(progress * Math.PI) * 7.0;
    tilt = Math.sin(progress * Math.PI) * 0.16;
    tailLag = -Math.sin(progress * Math.PI) * 0.22;

    // Advance across ground
    const stepSpeed = 85; // px/sec during the bound
    sq.lx += sq.dir * stepSpeed * dt;
    if(sq.lx < 36){ sq.lx = 36; sq.dir = 1; }
    if(sq.lx > W - 36){ sq.lx = W - 36; sq.dir = -1; }

    // Finished this bound!
    if(progress >= 1){
     sq.boundTime = 0;
     sq.boundsLeft--;
     if(sq.boundsLeft > 0){
      sq.boundPause = 0.08 + Math.random() * 0.08; // natural tiny pause
     } else {
      // Completed all bounds: land and rest/nibble
      sq.state = Math.random() < 0.65 ? 'nibble' : 'lookout';
      sq.timer = 2.0 + Math.random() * 2.8;
     }
    }
   }
  } else {
   // Stationary state: timer counts down to next action
   sq.timer -= dt;
   if(sq.timer <= 0){
    const roll = Math.random();
    if(roll < 0.55){
     // Start a scamper run: 2 to 3 discrete little bounds
     sq.state = 'scamper';
     sq.boundsLeft = 2 + Math.floor(Math.random() * 2);
     sq.boundTime = 0;
     sq.boundPause = 0;
     // Turn around if near edge, else 50/50
     if(sq.lx < 46) sq.dir = 1;
     else if(sq.lx > W - 46) sq.dir = -1;
     else if(Math.random() < 0.4) sq.dir *= -1;
    } else {
     // Switch between nibble and lookout posture
     sq.state = sq.state === 'nibble' ? 'lookout' : 'nibble';
     sq.timer = 1.8 + Math.random() * 2.5;
     if(Math.random() < 0.3) sq.dir *= -1;
    }
   }
  }

  const col = pal.isNight ? '#62412e' : '#b25e32';
  const colDark = pal.isNight ? '#4e3324' : '#8e4620';
  const belly = pal.isNight ? '#e2d6c6' : '#fcf4ea';
  const shadow = pal.isNight ? 'rgba(16,26,20,0.25)' : 'rgba(28,42,28,0.18)';

  ctx.save();
  ctx.translate(sq.lx, sq.ly + hopY);
  ctx.scale(sq.dir, 1);
  if(tilt) ctx.rotate(tilt);
  ctx.globalAlpha = (sq.alpha !== undefined ? sq.alpha : 1);

  // 1. Soft ground shadow
  const shadowScale = Math.max(0.65, 1 - Math.abs(hopY) * 0.07);
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 3 - hopY * 0.3, 10 * shadowScale, 3.2 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Bushy Tail (Smooth, lush, continuous S-curve over back with gentle inertia)
  const isNibbling = sq.state === 'nibble' && sq.boundsLeft <= 0;
  const tailWiggle = Math.sin(t * 5 + sq.phase) * 0.12 + tailLag;
  ctx.save();
  ctx.translate(-4, -1);
  ctx.rotate(tailWiggle);

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-11, -4, -9, -15);
  ctx.quadraticCurveTo(-7, -23, 2, -21);
  ctx.quadraticCurveTo(9, -18, 7, -11);
  ctx.quadraticCurveTo(5, -4, 0, 0);
  ctx.fill();

  // Inner fluffy highlight
  ctx.fillStyle = pal.isNight ? '#7a5440' : '#c9784a';
  ctx.beginPath();
  ctx.ellipse(-2, -13, 3.8, 6.5, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Back Haunch / Thigh
  ctx.fillStyle = colDark;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 4.5, 3.8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 4. Rounded Body & Chest
  const isLookout = sq.state === 'lookout' && sq.boundsLeft <= 0;
  const bodyH = isLookout ? 7.0 : 6.0;
  const bodyY = isLookout ? -4.5 : -3.2;

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(1.5, bodyY, 5.0, bodyH, 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Cream Belly
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(3.0, bodyY + 0.4, 2.6, bodyH * 0.72, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // 5. Head
  const headY = isLookout ? -12.2 : -9.4;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(4.0, headY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.beginPath();
  ctx.ellipse(6.6, headY + 0.5, 2.2, 1.8, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#2c1e18';
  ctx.beginPath();
  ctx.arc(8.4, headY + 0.5, 0.75, 0, Math.PI * 2);
  ctx.fill();

  // Ear with tuft
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(2.8, headY - 3.0);
  ctx.lineTo(4.4, headY - 6.8);
  ctx.lineTo(6.0, headY - 3.0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.isNight ? '#725048' : '#e5a59b';
  ctx.beginPath();
  ctx.moveTo(3.6, headY - 3.2);
  ctx.lineTo(4.4, headY - 5.6);
  ctx.lineTo(5.2, headY - 3.2);
  ctx.closePath();
  ctx.fill();

  // Eye (with white catchlight glint)
  ctx.fillStyle = pal.isNight ? '#c09880' : '#1e140e';
  ctx.beginPath();
  ctx.arc(4.8, headY - 0.5, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(5.1, -0.8 + headY, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 6. Front Paws & Acorn
  const pawTwitch = isNibbling ? Math.sin(t * 16) * 0.5 : 0;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(4.8, headY + 4.8 + pawTwitch, 1.8, 1.3, -0.25, 0, Math.PI * 2);
  ctx.fill();

  if(isNibbling){
   // Acorn with cap held in paws
   ctx.fillStyle = pal.isNight ? '#785b3a' : '#8e5927';
   ctx.beginPath();
   ctx.ellipse(6.8, headY + 4.8 + pawTwitch, 1.7, 2.2, 0.35, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = pal.isNight ? '#553d24' : '#693f18';
   ctx.beginPath();
   ctx.arc(6.2, headY + 3.3 + pawTwitch, 1.4, 0, Math.PI * 2);
   ctx.fill();
  }

  // 7. Feet
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(1.5, 3.4, 3.8, 1.6, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
 }

 // ── Garden Bench ─────────────────────────────────────────────────────────
 function drawGardenBench(bn, pal, t){
  ctx.save();
  ctx.translate(bn.lx, bn.ly);
  ctx.rotate(bn.rot || 0);

  // Shadow
  ctx.fillStyle = pal.isNight ? 'rgba(16,28,22,0.28)' : 'rgba(30,48,32,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 6.5, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const ironCol = pal.isNight ? '#3a3e3b' : '#464a44';
  const woodBack = pal.isNight ? '#4e3f32' : '#8c6544';
  const woodFront = pal.isNight ? '#635141' : '#ad8058';
  const woodHi = pal.isNight ? '#776250' : '#c4966e';

  // Metal / iron side frames & legs
  ctx.strokeStyle = ironCol;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-15, -12);
  ctx.quadraticCurveTo(-17, -4, -16, 6);
  ctx.moveTo(-17, -3);
  ctx.lineTo(-11, -3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(15, -12);
  ctx.quadraticCurveTo(17, -4, 16, 6);
  ctx.moveTo(17, -3);
  ctx.lineTo(11, -3);
  ctx.stroke();

  // Wooden backrest slats
  ctx.fillStyle = woodBack;
  drawRoundedRect(-14.5, -11, 29, 3.2, 1);
  ctx.fill();
  drawRoundedRect(-14.5, -6.5, 29, 3.2, 1);
  ctx.fill();

  // Wooden seat planks
  ctx.fillStyle = woodFront;
  drawRoundedRect(-15.5, -1.5, 31, 3.4, 1.2);
  ctx.fill();
  ctx.fillStyle = woodHi;
  drawRoundedRect(-15.5, 2.5, 31, 3.2, 1.2);
  ctx.fill();

  ctx.restore();
 }

 // ── Withering Crow ───────────────────────────────────────────────────────
 function drawWitheringCrow(crow, pal, t, dt){
  crow.timer -= dt;
  if(crow.caw > 0) crow.caw = Math.max(0, crow.caw - dt * 2);
  if(crow.timer <= 0){
   crow.timer = 2.5 + Math.random() * 4;
   crow.lookDir = Math.random() < 0.5 ? -1 : 1;
  }

  ctx.save();
  ctx.translate(crow.lx, crow.ly);
  ctx.scale(crow.lookDir, 1);

  const featherDark = pal.isNight ? '#1c2220' : '#272d2a';
  const featherHi = pal.isNight ? '#2e3834' : '#3d4742';
  const beakCol = pal.isNight ? '#181b19' : '#1e211f';

  // Shadow
  ctx.fillStyle = 'rgba(12,20,16,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = featherDark;
  ctx.beginPath();
  ctx.moveTo(-3, 2);
  ctx.lineTo(-9, 9);
  ctx.lineTo(-4, 9);
  ctx.lineTo(-1, 4);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = featherDark;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.8, 3.6, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.fillStyle = featherHi;
  ctx.beginPath();
  ctx.ellipse(-1, -0.5, 4.2, 2.5, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = featherDark;
  ctx.beginPath();
  ctx.arc(3.5, -4.5, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = beakCol;
  const openBeak = crow.caw > 0 ? 1.5 : 0;
  ctx.beginPath();
  ctx.moveTo(5.5, -5.2);
  ctx.lineTo(9.5, -4.2 + openBeak * 0.4);
  ctx.lineTo(5.5, -3.4 + openBeak);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#65736c';
  ctx.beginPath();
  ctx.arc(4.2, -5.2, 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
 }

 // ── Deer (Graceful Walking, Grazing & Lookout) ─────────────────────────
 function drawDeer(d, hill, pal, t, dt){
  // Rare Event Lifecycle: Elusive forest wanderer
  if(!d.eventState) d.eventState = 'hidden';
  if(d.alpha === undefined) d.alpha = 0;

  if(d.eventState === 'hidden'){
   d.eventTimer -= dt;
   if(d.eventTimer <= 0){
    // Emerge serenely from the forest edge
    d.eventState = 'visiting';
    d.visitDuration = 28.0 + Math.random() * 22.0; // visits for 28-50 seconds
    d.dir = (d.lx < W * 0.5 ? 1 : -1);
    d.lx = d.dir > 0 ? 36 : W - 36;
    d.state = 'walk';
    d.timer = 4.5 + Math.random() * 3.5;
    d.alpha = 0;
   } else {
    return; // Quietly grazing unseen in the distant forest
   }
  }

  // Active visit handling
  if(d.eventState === 'visiting'){
   d.alpha = Math.min(1, d.alpha + dt * 0.65); // soft 1.5s fade-in
   d.visitDuration -= dt;
   if(d.visitDuration <= 0){
    d.eventState = 'departing';
    d.state = 'walk';
    d.dir = (d.lx < W * 0.5 ? -1 : 1); // heads toward meadow edge
    d.timer = 8.0;
   }
  } else if(d.eventState === 'departing'){
   d.alpha = Math.max(0, d.alpha - dt * 0.4); // soft fade-out as it retreats
   if(d.alpha <= 0 || d.lx < 24 || d.lx > W - 24){
    d.eventState = 'hidden';
    d.eventTimer = 110.0 + Math.random() * 150.0; // 110..260s cooldown (2 to 4.5 minutes!)
    return;
   }
  }

  d.timer -= dt;

  // State machine & active movement
  const isMoving = d.state === 'walk' || d.state === 'trot';
  if(isMoving){
   const moveSpeed = d.state === 'trot' ? 58 : 22;
   d.lx += d.dir * moveSpeed * dt;
   d.walkTime += dt;

   // Turn around at meadow boundaries
   if(d.lx < 44){ d.lx = 44; d.dir = 1; }
   if(d.lx > W - 44){ d.lx = W - 44; d.dir = -1; }

   if(d.timer <= 0){
    // Finished walking: pause to graze or stand on lookout
    d.state = Math.random() < 0.6 ? 'graze' : 'lookout';
    d.timer = 2.5 + Math.random() * 3.5;
    if(Math.random() < 0.35) d.dir *= -1;
   }
  } else {
   // Standing: grazing or on lookout
   if(d.timer <= 0){
    // Resume walking across the meadow!
    d.state = 'walk';
    d.timer = 3.5 + Math.random() * 4.5;
    if(d.lx < 60) d.dir = 1;
    else if(d.lx > W - 60) d.dir = -1;
    else if(Math.random() < 0.35) d.dir *= -1;
   }
  }

  // Smooth neck angle interpolation (no abrupt snapping!)
  const targetNeck = d.state === 'graze' ? 0.70 : (d.state === 'lookout' ? -0.24 : 0.04);
  d.neckAngle = (d.neckAngle || 0) + (targetNeck - (d.neckAngle || 0)) * Math.min(1, dt * 4.2);

  // Soft tail wagging
  d.tailWag = Math.sin(t * (d.state === 'graze' ? 6.5 : 3.5) + d.phase) * (d.state === 'graze' ? 0.35 : 0.15);

  // Cadence & 4-beat walk cycle
  const walkRate = d.state === 'trot' ? 8.8 : 4.8;
  const walkCycle = isMoving ? (d.walkTime * walkRate) : 0;
  const bodyBob = isMoving ? Math.sin(walkCycle * 2) * (d.state === 'trot' ? 1.5 : 0.85) : (Math.sin(t * 2) * 0.3);

  const col = pal.isNight ? '#6e4f35' : '#c4864c';
  const colDark = pal.isNight ? '#523824' : '#9b6232';
  const belly = pal.isNight ? '#ded3c3' : '#f8ede0';
  const shadow = pal.isNight ? 'rgba(14,24,20,0.26)' : 'rgba(28,48,28,0.16)';
  const hoofCol = pal.isNight ? '#2a221b' : '#3c2718';

  ctx.save();
  ctx.translate(d.lx, d.ly + bodyBob);
  ctx.scale(d.dir, 1);
  ctx.globalAlpha = (d.alpha !== undefined ? d.alpha : 1);

  // 1. Ground Shadow
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 18, 19, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Articulated Legs (Natural quadruped walking gait!)
  const fFarSwing = isMoving ? Math.sin(walkCycle + Math.PI) : 0;
  const bFarSwing = isMoving ? Math.sin(walkCycle + Math.PI * 1.5) : 0;
  const fNearSwing = isMoving ? Math.sin(walkCycle) : 0;
  const bNearSwing = isMoving ? Math.sin(walkCycle + Math.PI * 0.5) : 0;

  function drawLeg(hipX, hipY, swing, isFar, isHind){
   ctx.save();
   ctx.strokeStyle = isFar ? colDark : col;
   ctx.lineWidth = 2.4;
   ctx.lineCap = 'round';
   ctx.lineJoin = 'round';

   const kneeAngle = swing * 0.38 + (isMoving ? Math.max(0, -swing) * 0.25 : 0);
   const kneeY = hipY + 8;
   const kneeX = hipX + (isHind ? -2 : 1) + Math.sin(swing * 0.35) * 5;
   const hoofY = hipY + 17;
   const hoofX = kneeX + Math.sin(kneeAngle) * 5;

   ctx.beginPath();
   ctx.moveTo(hipX, hipY);
   ctx.lineTo(kneeX, kneeY);
   ctx.lineTo(hoofX, hoofY);
   ctx.stroke();

   ctx.fillStyle = hoofCol;
   ctx.beginPath();
   ctx.ellipse(hoofX + 0.5, hoofY, 1.8, 1.4, 0.2, 0, Math.PI * 2);
   ctx.fill();

   ctx.restore();
  }

  // Draw Far (back) Legs first
  drawLeg(-7, 4, bFarSwing, true, true);  // Left Hind
  drawLeg(7, 4, fFarSwing, true, false);  // Left Front

  // 3. Body (Flank, haunches, shoulders)
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 8.2, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Cream Underbelly
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(1, 2.5, 10.5, 4.8, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Subtle dapples on flank
  if(!pal.isNight){
   ctx.fillStyle = 'rgba(255, 252, 240, 0.42)';
   const spots = [[-5, -3], [-1, -4], [3, -3], [-3, -1], [2, -1], [6, -2]];
   spots.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
    ctx.fill();
   });
  }

  // White rump patch
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-13.5, -1, 3.8, 5.2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Tail (wags softly)
  ctx.save();
  ctx.translate(-14, -3);
  ctx.rotate(d.tailWag - 0.2);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-2.5, 0, 4.0, 2.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-2.5, 0.6, 3.2, 1.6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Draw Near (front) Legs
  drawLeg(-5, 4, bNearSwing, false, true); // Right Hind
  drawLeg(9, 4, fNearSwing, false, false); // Right Front

  // 5. Neck & Head
  ctx.save();
  ctx.translate(10, -3);
  ctx.rotate(d.neckAngle);

  // Neck
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-3, 4);
  ctx.quadraticCurveTo(-1, -7, 1, -12);
  ctx.lineTo(6, -11);
  ctx.quadraticCurveTo(4, -4, 2, 4);
  ctx.closePath();
  ctx.fill();

  // Throat cream patch
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.quadraticCurveTo(1.5, -4, 3.5, -9);
  ctx.lineTo(5.5, -9);
  ctx.quadraticCurveTo(3, -2, 1.5, 3);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.translate(2.5, -12);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.8, 3.8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Tapered Snout
  ctx.beginPath();
  ctx.ellipse(3.8, 1.2, 3.0, 2.2, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Dark Velvet Muzzle / Nose
  ctx.fillStyle = '#221812';
  ctx.beginPath();
  ctx.ellipse(6.2, 1.2, 1.3, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye (large, dark, glistening)
  ctx.fillStyle = pal.isNight ? '#c09880' : '#1a120c';
  ctx.beginPath();
  ctx.arc(2.0, -1.2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(2.3, -1.5, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  const earTwitch = Math.sin(t * 5 + d.phase) * 0.08;
  ctx.fillStyle = col;
  ctx.save();
  ctx.translate(-2.5, -2.5);
  ctx.rotate(-0.4 + earTwitch);
  ctx.beginPath();
  ctx.ellipse(0, -3.8, 1.8, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.isNight ? '#725048' : '#e6aba0';
  ctx.beginPath();
  ctx.ellipse(0, -3.5, 0.8, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Antlers (Majestic branching antlers swaying with head)
  ctx.save();
  ctx.translate(0, -3.2);
  ctx.strokeStyle = pal.isNight ? '#5a4634' : '#886244';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main beam
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-1, -7, 2, -13);
  ctx.quadraticCurveTo(4, -16, 7, -18);
  ctx.stroke();

  // Brow tine
  ctx.beginPath();
  ctx.moveTo(0.5, -5);
  ctx.lineTo(4.5, -8);
  ctx.stroke();

  // Crown tine
  ctx.beginPath();
  ctx.moveTo(2.5, -12);
  ctx.lineTo(0.5, -17);
  ctx.stroke();

  ctx.restore();

  ctx.restore(); // end head
  ctx.restore(); // end deer
 }

 // ── Perched Bird ─────────────────────────────────────────────────────────
 function drawPerchedBird(pb, hill, t, dt, pal){
  if(!hill) return;
  let px, py;
  if(pb.onLantern && hill.lantern){
   px = hill.lantern.lx; py = hill.lantern.ly - 30;
  }else if(hill.trees.length > 0){
   const tr = hill.trees[pb.treeIdx % hill.trees.length];
   px = tr.lx + (pb.treeIdx % 2 === 0 ? -10 : 10) * tr.scale;
   py = tr.ly - 44 * tr.scale;
  }else{ return; }
  pb.chirpTimer -= dt;
  if(pb.chirpTimer <= 0){
   pb.singing = !pb.singing;
   pb.chirpTimer = pb.singing ? 0.6 + Math.random() * 0.8 : 2 + Math.random() * 4;
   if(pb.singing && Math.random() < 0.3) pb.wingFlap = 0.6;
  }
  if(pb.wingFlap > 0) pb.wingFlap = Math.max(0, pb.wingFlap - dt * 1.8);
  const col = pb.color;
  const belly = pal.isNight ? '#686460' : '#f0ead8';
  const wingOpen = 0.3 + pb.wingFlap * 0.7;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = pal.isNight ? 'rgba(14,24,22,0.22)' : 'rgba(28,46,30,0.14)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 7, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0,2); ctx.lineTo(-5,8); ctx.lineTo(-2,8); ctx.lineTo(0,4); ctx.lineTo(2,8); ctx.lineTo(5,8);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0.5, 0.5, 2.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const wingY = -wingOpen * 3;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-4*wingOpen, wingY, 4*wingOpen, 2.2, -0.3, 0, Math.PI*2);
  ctx.ellipse(4*wingOpen, wingY, 4*wingOpen, 2.2, 0.3, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.isNight ? '#c0a880' : '#1c1410';
  ctx.beginPath();
  ctx.arc(1.4,-4.5,0.9,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(1.7,-4.8,0.3,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle = pal.isNight ? '#a09060' : '#d0a848';
  ctx.beginPath();
  ctx.moveTo(3.5,-4.2); ctx.lineTo(6.5,-3.6); ctx.lineTo(3.5,-3.4);
  ctx.closePath(); ctx.fill();
  if(pb.singing){
   const noteX = 7 + Math.sin(t*8+pb.phase)*2;
   const noteY = -6 + Math.cos(t*6+pb.phase)*2;
   ctx.fillStyle = pal.isNight ? 'rgba(255,236,160,0.7)' : 'rgba(80,100,70,0.6)';
   ctx.font = '7px sans-serif';
   ctx.textBaseline = 'middle';
   ctx.fillText('\u266a', noteX, noteY);
  }
  ctx.strokeStyle = pal.isNight ? '#7a6240' : '#b08040';
  ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  [-2,2].forEach(ox => {
   ctx.beginPath();
   ctx.moveTo(ox,3); ctx.lineTo(ox-2,7);
   ctx.moveTo(ox,3); ctx.lineTo(ox+2,7);
   ctx.moveTo(ox,3); ctx.lineTo(ox,7);
   ctx.stroke();
  });
  ctx.restore();
 }

 function renderFrame(ts){
  if(!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  const gardenView = document.getElementById('garden');
  if(!gardenView || !gardenView.classList.contains('active')){
   requestAnimationFrame(renderFrame);
   return;
  }

  const t = ts * 0.001;
  const theme = resolveTheme();
  const pal = PALETTES[theme] || PALETTES.sunlit;

  // Card-stack spring & momentum physics
  const maxIdx = Math.max(0, hillCards.length - 1);
  if(!dragging){
   if(targetHillIdx !== null){
    const diff = targetHillIdx - activeHillPos;
    if(Math.abs(diff) < 0.003){
     activeHillPos = targetHillIdx;
     targetHillIdx = null;
     activeHillVel = 0;
    }else{
     activeHillPos += diff * Math.min(1, dt * 8.5);
    }
   }else{
    activeHillPos += activeHillVel * (dt * 60);
    activeHillVel *= Math.pow(0.86, dt * 60);
    if(activeHillPos < 0){
     activeHillPos += (0 - activeHillPos) * Math.min(1, dt * 12);
     activeHillVel *= 0.5;
    }else if(activeHillPos > maxIdx){
     activeHillPos += (maxIdx - activeHillPos) * Math.min(1, dt * 12);
     activeHillVel *= 0.5;
    }else if(Math.abs(activeHillVel) < 0.015){
     const nearest = Math.round(activeHillPos);
     activeHillPos += (nearest - activeHillPos) * Math.min(1, dt * 10);
    }
   }
  }

  // Smoothly lerp interactive zoom and pan offsets
  gardenCurrentZoom += (gardenZoomLevel - gardenCurrentZoom) * Math.min(1, dt * 7.5);
  gardenPanX += (targetPanX - gardenPanX) * Math.min(1, dt * 8.5);
  gardenPanY += (targetPanY - gardenPanY) * Math.min(1, dt * 8.5);

  syncActiveHillHUD();
  updateActiveRabbits(dt, t);

  windTarget *= Math.pow(0.95, dt * 60);
  windGust += (windTarget - windGust) * Math.min(1, dt * 4.5);
  const baseWind = Math.sin(t * 0.75) * 0.22 + windGust;

  const idlePanX = Math.sin(t * 0.28) * 4 + (pointerX - 0.5) * -10;
  const idlePanY = Math.cos(t * 0.22) * 2.5 + (pointerY - 0.5) * -6;

  ctx.clearRect(0, 0, W, H);

  // 1. Atmospheric Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  skyGrad.addColorStop(0, pal.skyTop);
  skyGrad.addColorStop(0.58, pal.skyMid);
  skyGrad.addColorStop(1, pal.skyLow);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  if(pal.isNight){
   for(let i = 0; i < 34; i++){
    const sx = ((i * 73) % 100) / 100 * W;
    const sy = ((i * 41) % 30) / 100 * H + 12;
    const twinkle = 0.22 + 0.68 * (0.5 + 0.5 * Math.sin(t * 2.1 + i));
    ctx.fillStyle = `rgba(255, 250, 232, ${twinkle.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, i % 4 === 0 ? 1.5 : 1.0, 0, Math.PI * 2);
    ctx.fill();
   }
  }

  // 2. Luminous Sun / Moon & Soft Sunbeams
  const sunX = W * 0.74 + idlePanX * 0.2;
  const sunY = H * pal.sunY + idlePanY * 0.2;

  if(!pal.isNight){
   ctx.save();
   ctx.fillStyle = pal.rayColor;
   for(let r = 0; r < 3; r++){
    const spread = 0.22 + r * 0.14;
    const angle = 2.08 + r * 0.24 + Math.sin(t * 0.3 + r) * 0.02;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(angle - spread) * H * 1.1, sunY + Math.sin(angle - spread) * H * 1.1);
    ctx.lineTo(sunX + Math.cos(angle + spread) * H * 1.1, sunY + Math.sin(angle + spread) * H * 1.1);
    ctx.closePath();
    ctx.fill();
   }
   ctx.restore();
  }

  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 108);
  halo.addColorStop(0, pal.sunHalo);
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 108, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.sunColor;
  ctx.beginPath();
  ctx.arc(sunX, sunY, pal.isNight ? 18 : 22, 0, Math.PI * 2);
  ctx.fill();

  // 3. Drifting Clouds & Distant Songbirds
  if(!pal.isNight){
   ctx.fillStyle = pal.isRain ? 'rgba(235, 240, 238, 0.35)' : 'rgba(255, 253, 245, 0.44)';
   for(let c = 0; c < 3; c++){
    const cx = ((c * 0.38 + t * (0.008 + c * 0.002)) % 1.3 - 0.15) * W + idlePanX * 0.3;
    const cy = H * (0.11 + c * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy - 4, 22, 0, Math.PI * 2);
    ctx.arc(cx + 34, cy, 16, 0, Math.PI * 2);
    ctx.fill();
   }
  }

  if(!pal.isNight && !pal.isRain){
   for(const b of birds){
    // flock loosely — slight pull towards leader
    if(b.flockLeader >= 0 && b.flockLeader < birds.length){
     const leader = birds[b.flockLeader];
     b.x += (leader.x - b.x) * dt * 0.08;
     b.y += (leader.y - b.y) * dt * 0.06;
    }
    b.x += b.speed * dt;
    if(b.x > 1.14) b.x = -0.14;
    const bx = b.x * W + idlePanX * 0.35;
    const by = b.y * H + Math.sin(t * 2.2 + b.phase) * 4;
    const sz = (b.size || 1.0);
    const wb = b.wingbeat || 7.5;
    const wing = Math.sin(t * wb + b.phase) * 3.5 * sz;
    const spread = 6 * sz;
    ctx.strokeStyle = b.color || 'rgba(72,92,74,0.48)';
    ctx.lineWidth = sz > 1.3 ? 1.9 : 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - spread, by - wing);
    ctx.quadraticCurveTo(bx - spread * 0.5, by - 3 * sz, bx, by);
    ctx.quadraticCurveTo(bx + spread * 0.5, by - 3 * sz, bx + spread, by - wing);
    ctx.stroke();
    // swallows get a small forked tail
    if(b.species === 'swallow'){
     ctx.beginPath();
     ctx.moveTo(bx, by + 1);
     ctx.lineTo(bx - 3, by + 5);
     ctx.moveTo(bx, by + 1);
     ctx.lineTo(bx + 3, by + 5);
     ctx.stroke();
    }
   }
  }

  // 4. Distant Misty Mountain Horizon behind the Cascading Hill Stack
  ctx.fillStyle = pal.ridgeFar;
  ctx.beginPath();
  ctx.moveTo(-20, H * 0.24);
  ctx.quadraticCurveTo(W * 0.24, H * 0.17, W * 0.54, H * 0.22);
  ctx.quadraticCurveTo(W * 0.82, H * 0.16, W + 20, H * 0.23);
  ctx.lineTo(W + 20, H);
  ctx.lineTo(-20, H);
  ctx.closePath();
  ctx.fill();

  // 5. Render All Cascading Hill Garden Cards from Back to Front (Painter's Order!)
  for(let i = hillCards.length - 1; i >= 0; i--){
   drawHillCard(hillCards[i], pal, t, baseWind, dt, idlePanX, idlePanY);
  }

  // 6. Floating Dandelion Seed Puffs & Butterflies across the Foreground Hill
  ctx.fillStyle = pal.isNight ? 'rgba(225, 240, 228, 0.45)' : 'rgba(255, 253, 244, 0.72)';
  for(const sp of seedPuffs){
   sp.x += (sp.speed + baseWind * 24) * dt;
   sp.y += Math.sin(t * 1.4 + sp.phase) * 6 * dt;
   if(sp.x > W + 20) sp.x = -20;
   if(sp.x < -20) sp.x = W + 20;
   ctx.beginPath();
   ctx.arc(sp.x, sp.y, 1.4, 0, Math.PI * 2);
   ctx.fill();
  }

  const frontIdx = Math.max(0, Math.min(hillCards.length - 1, Math.round(activeHillPos)));
  const frontHill = hillCards[frontIdx];
  const bloomingTargets = frontHill ? frontHill.plants.filter(p => p.level >= 2 && p.state === 'fresh') : [];

  if(!pal.isNight && !pal.isRain){
   for(const bf of butterflies){
    if(bf.restTimer > 0 && bf.targetId){
     const host = bloomingTargets.find(p => p.topic.id === bf.targetId);
     if(host){
      bf.restTimer -= dt;
      const pos = plantScreenCoords(host);
      bf.x += (pos.x - bf.x) * Math.min(1, dt * 4);
      bf.y += ((pos.y - 38 * host.scale) - bf.y) * Math.min(1, dt * 4);
     }else{
      bf.restTimer = 0;
      bf.targetId = null;
     }
    }else{
     if(bloomingTargets.length && Math.random() < dt * 0.25){
      const pick = bloomingTargets[Math.floor(Math.random() * bloomingTargets.length)];
      bf.targetId = pick.topic.id;
      bf.restTimer = 2.5 + Math.random() * 2.5;
     }
     bf.vx += (Math.random() - 0.5) * 48 * dt + baseWind * 14 * dt;
     bf.vy += (Math.random() - 0.5) * 32 * dt;
     bf.vx = Math.max(-36, Math.min(36, bf.vx));
     bf.vy = Math.max(-22, Math.min(22, bf.vy));
     bf.x += bf.vx * dt;
     bf.y += bf.vy * dt;
     if(bf.x < 28) bf.vx = Math.abs(bf.vx);
     if(bf.x > W - 28) bf.vx = -Math.abs(bf.vx);
     if(bf.y < H * 0.36) bf.vy = Math.abs(bf.vy);
     if(bf.y > H - 105) bf.vy = -Math.abs(bf.vy);
    }

    const flapSpeed = bf.restTimer > 0 ? 4 : 15;
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * flapSpeed + bf.phase));
    ctx.save();
    ctx.translate(bf.x, bf.y);
    ctx.fillStyle = bf.tint;
    ctx.beginPath();
    ctx.ellipse(-3.5 * flap, -1, 4.4 * flap, 3.1, -0.35, 0, Math.PI * 2);
    ctx.ellipse(3.5 * flap, -1, 4.4 * flap, 3.1, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
   }
  }

  // 7. Pond Ripples, Water Mist Droplets & Floating Petals
  for(let i = ripples.length - 1; i >= 0; i--){
   const rp = ripples[i];
   rp.r += 28 * dt;
   rp.alpha -= 0.45 * dt;
   if(rp.alpha <= 0 || rp.r >= rp.maxR){
    ripples.splice(i, 1);
    continue;
   }
   ctx.strokeStyle = `rgba(255, 253, 245, ${rp.alpha.toFixed(2)})`;
   ctx.lineWidth = 1.4;
   ctx.beginPath();
   ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, Math.PI * 2);
   ctx.stroke();
  }

  for(let i = droplets.length - 1; i >= 0; i--){
   const d = droplets[i];
   d.y += d.vy * dt;
   d.life -= 1.15 * dt;
   if(d.life <= 0){
    droplets.splice(i, 1);
    continue;
   }
   ctx.fillStyle = `rgba(218, 242, 245, ${(d.life * 0.85).toFixed(2)})`;
   ctx.beginPath();
   ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
   ctx.fill();
  }

  for(let i = petals.length - 1; i >= 0; i--){
   const pt = petals[i];
   pt.x += (pt.vx + baseWind * 30) * dt;
   pt.y += (pt.vy + 22) * dt;
   pt.rot += pt.vrot * dt;
   pt.life -= 0.55 * dt;
   if(pt.life <= 0){
    petals.splice(i, 1);
    continue;
   }
   ctx.save();
   ctx.translate(pt.x, pt.y);
   ctx.rotate(pt.rot);
   ctx.globalAlpha = Math.max(0, pt.life);
   ctx.fillStyle = pt.color;
   ctx.beginPath();
   ctx.ellipse(0, 0, 4.2, 2.2, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.restore();
  }


  // Drifting dry leaves when garden is withering
  const overdueForLeaves = topics.filter(t => !t.done && dueState(t) !== 'fresh').length;
  const isLeavesWithering = topics.length > 0 && (overdueForLeaves / topics.length >= 0.35);
  if(isLeavesWithering){
   while(dryLeaves.length < 10){
    dryLeaves.push({
     x: Math.random() * W,
     y: Math.random() * H * 0.7,
     vx: 14 + Math.random() * 22,
     vy: 18 + Math.random() * 24,
     rot: Math.random() * Math.PI * 2,
     vrot: (Math.random() - 0.5) * 2.8,
     color: ['#8e6b48', '#a67d53', '#7a5a3a', '#946f49'][Math.floor(Math.random() * 4)],
     size: 2.8 + Math.random() * 2.0
    });
   }
   for(const dl of dryLeaves){
    dl.x += (dl.vx + baseWind * 26) * dt;
    dl.y += dl.vy * dt;
    dl.rot += dl.vrot * dt;
    if(dl.x > W + 20) dl.x = -20;
    if(dl.x < -20) dl.x = W + 20;
    if(dl.y > H + 20) dl.y = -20;
    ctx.save();
    ctx.translate(dl.x, dl.y);
    ctx.rotate(dl.rot);
    ctx.fillStyle = dl.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, dl.size * 1.5, dl.size * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
   }
  } else {
   dryLeaves.length = 0;
  }

  // 8. Gentle Rain or Golden Pollen / Fireflies
  if(pal.isRain){
   ctx.strokeStyle = 'rgba(232, 242, 242, 0.34)';
   ctx.lineWidth = 1.1;
   for(let i = 0; i < 48; i++){
    const rx = ((i * 47 + t * 95) % (W + 40)) - 20;
    const ry = ((i * 83 + t * 420) % H);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 3, ry + 11);
    ctx.stroke();
   }
  }else{
   for(const m of motes){
    m.y -= (m.speed / H) * dt;
    m.x += Math.sin(t * 0.6 + m.phase) * 0.0004 + baseWind * 0.0012;
    if(m.y < 0.08) m.y = 0.94;
    if(m.x < 0) m.x += 1;
    if(m.x > 1) m.x -= 1;

    const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.4 + m.phase));
    const mx = m.x * W;
    const my = m.y * H;

    if(pal.isNight){
     const glow = ctx.createRadialGradient(mx, my, 0.5, mx, my, m.r * 5);
     glow.addColorStop(0, `rgba(244, 232, 152, ${(pulse * 0.9).toFixed(2)})`);
     glow.addColorStop(1, 'rgba(244, 232, 152, 0)');
     ctx.fillStyle = glow;
     ctx.beginPath();
     ctx.arc(mx, my, m.r * 5, 0, Math.PI * 2);
     ctx.fill();
    }else{
     ctx.fillStyle = `rgba(255, 249, 224, ${(pulse * 0.45).toFixed(2)})`;
     ctx.beginPath();
     ctx.arc(mx, my, m.r, 0, Math.PI * 2);
     ctx.fill();
    }
   }
  }

  if(pal.tint){
   ctx.fillStyle = pal.tint;
   ctx.fillRect(0, 0, W, H);
  }

  requestAnimationFrame(renderFrame);
 }

 window.syncBotanicalGarden = function(){
  buildCascadingHills();
 };

 window.onGardenOpen = function(){
  resizeCanvas();
  buildCascadingHills();
  processPendingGardenArrivals();
 };

 window.addEventListener('resize', () => {
  if(document.getElementById('garden')?.classList.contains('active')){
   resizeCanvas();
   buildCascadingHills();
  }
 });

 resizeCanvas();
 buildCascadingHills();
 requestAnimationFrame(renderFrame);
})();