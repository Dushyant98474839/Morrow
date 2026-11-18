const DAY=24*60*60*1000;
const todayStart=()=>{let d=new Date();d.setHours(0,0,0,0);return d.getTime()};

const BIOME_ARCHETYPES = [
 {
  id: 'civic_terrace',
  label: 'Terraced Hill',
  icon: '🏛️',
  dot: '#7da372',
  groundDay: ['#8cb280', '#69905f'],
  groundNight: ['#294037', '#1c2e27'],
  ridgeEdge: 'rgba(244, 250, 234, 0.62)',
  path: { base: '#ece3cd', light: '#f9f3e5', stone: '#ddd3ba' },
  treeKind: 'cypress',
  landmarkKind: 'sundial',
  hasPond: false,
  particleColor: '#f5e6b3',
  defaultSpecies: { kind: 'daisy', petal: '#f8f3e6', petalAlt: '#e6dec8', center: '#dfb458', label: 'Sanctuary Daisy' },
  keywords: ['polity', 'law', 'civics', 'politics', 'constitution', 'governance', 'public', 'sociology']
 },
 {
  id: 'autumn_ruins',
  label: 'Heritage Ridge',
  icon: '🏺',
  dot: '#c98862',
  groundDay: ['#a89668', '#83754b'],
  groundNight: ['#38342b', '#26231d'],
  ridgeEdge: 'rgba(250, 232, 206, 0.58)',
  path: { base: '#dcb89a', light: '#edd0b6', stone: '#c49978' },
  treeKind: 'maple',
  landmarkKind: 'ruin_arch',
  hasPond: false,
  particleColor: '#d98a5f',
  defaultSpecies: { kind: 'poppy', petal: '#d9886c', petalAlt: '#eca891', center: '#3f3028', label: 'Terracotta Poppy' },
  keywords: ['history', 'ancient', 'medieval', 'modern', 'culture', 'heritage', 'archaeology', 'anthropology']
 },
 {
  id: 'harvest_gold',
  label: 'Golden Knoll',
  icon: '🌾',
  dot: '#d4a94e',
  groundDay: ['#b5ac6c', '#90884e'],
  groundNight: ['#383a2a', '#26281d'],
  ridgeEdge: 'rgba(255, 245, 204, 0.60)',
  path: { base: '#ebd9b2', light: '#f7ecd1', stone: '#d6c090' },
  treeKind: 'golden_oak',
  landmarkKind: 'cairn',
  hasPond: false,
  particleColor: '#f0cf78',
  defaultSpecies: { kind: 'marigold', petal: '#dda94b', petalAlt: '#f0cb7a', center: '#7a5220', label: 'Ochre Marigold' },
  keywords: ['economy', 'economics', 'finance', 'business', 'commerce', 'accounting', 'trade', 'market']
 },
 {
  id: 'alpine_springs',
  label: 'Alpine Crest',
  icon: '🏔️',
  dot: '#6e9da1',
  groundDay: ['#74a096', '#527c73'],
  groundNight: ['#223939', '#172829'],
  ridgeEdge: 'rgba(226, 246, 244, 0.60)',
  path: { base: '#cad4d3', light: '#e1e9e8', stone: '#aebcbb' },
  treeKind: 'pine',
  landmarkKind: 'boulder_cluster',
  hasPond: true,
  particleColor: '#cde4e6',
  defaultSpecies: { kind: 'bluebell', petal: '#7798ad', petalAlt: '#a4bfd0', center: '#ead48c', label: 'Mist Bluebell' },
  keywords: ['geography', 'earth', 'geology', 'climate', 'ocean', 'astro', 'space', 'physics', 'mechanics']
 },
 {
  id: 'emerald_rainforest',
  label: 'Fern Slope',
  icon: '🌿',
  dot: '#558a63',
  groundDay: ['#61956e', '#42724f'],
  groundNight: ['#1d372b', '#12251c'],
  ridgeEdge: 'rgba(216, 246, 222, 0.56)',
  path: { base: '#c9bfa6', light: '#ded5be', stone: '#b0a58b' },
  treeKind: 'broadleaf',
  landmarkKind: 'fern_ring',
  hasPond: true,
  particleColor: '#a8db9e',
  defaultSpecies: { kind: 'cosmos', petal: '#e0a99b', petalAlt: '#f2cbc0', center: '#e5c46c', label: 'Blush Cosmos' },
  keywords: ['environment', 'ecology', 'biology', 'botany', 'zoology', 'nature', 'forest', 'medicine', 'health', 'anatomy']
 },
 {
  id: 'crystal_glade',
  label: 'Crystal Mound',
  icon: '💎',
  dot: '#6997a8',
  groundDay: ['#6a949f', '#496f7a'],
  groundNight: ['#1e3540', '#13242d'],
  ridgeEdge: 'rgba(222, 246, 252, 0.62)',
  path: { base: '#d2dce0', light: '#e7f0f3', stone: '#b6c5cc' },
  treeKind: 'birch',
  landmarkKind: 'crystals',
  hasPond: false,
  particleColor: '#b8ecf5',
  defaultSpecies: { kind: 'lavender', petal: '#8f9fb8', petalAlt: '#b4c1d4', center: '#e8cf86', label: 'Meadow Lavender' },
  keywords: ['science', 'tech', 'computer', 'algorithm', 'data', 'system', 'database', 'math', 'logic', 'chemistry', 'coding', 'software', 'ai']
 },
 {
  id: 'blossom_cloister',
  label: 'Blossom Hill',
  icon: '🌸',
  dot: '#cf8e96',
  groundDay: ['#849f87', '#627d66'],
  groundNight: ['#2b3837', '#1d2726'],
  ridgeEdge: 'rgba(255, 236, 240, 0.62)',
  path: { base: '#ebe0d5', light: '#f8f0e8', stone: '#d6c6b8' },
  treeKind: 'sakura',
  landmarkKind: 'tea_nook',
  hasPond: false,
  particleColor: '#f5c2ca',
  defaultSpecies: { kind: 'cosmos', petal: '#e0a99b', petalAlt: '#f2cbc0', center: '#e5c46c', label: 'Blush Cosmos' },
  keywords: ['philosophy', 'psychology', 'literature', 'books', 'language', 'art', 'design', 'behavioral', 'ethics']
 }
];

function stringHash(str){
 const s = String(str || '');
 let h = 2166136261;
 for(let i = 0; i < s.length; i++){
  h ^= s.charCodeAt(i);
  h = Math.imul(h, 16777619);
 }
 return (h >>> 0) % 10000;
}

function getArchetypeForSubject(subject, idx = 0, usedIds = null, missionObj = null){
 const m = missionObj || currentMission();
 if(m && m.subjectBiomes && m.subjectBiomes[subject]){
  const explicit = BIOME_ARCHETYPES.find(a => a.id === m.subjectBiomes[subject]);
  if(explicit) return explicit;
 }
 const lower = String(subject || '').toLowerCase();
 for(const arch of BIOME_ARCHETYPES){
  if(arch.keywords.some(kw => lower.includes(kw))){
   return arch;
  }
 }
 const baseIdx = (stringHash(lower) + idx) % BIOME_ARCHETYPES.length;
 if(usedIds){
  for(let offset = 0; offset < BIOME_ARCHETYPES.length; offset++){
   const candidate = BIOME_ARCHETYPES[(baseIdx + offset) % BIOME_ARCHETYPES.length];
   if(!usedIds.has(candidate.id)) return candidate;
  }
 }
 return BIOME_ARCHETYPES[baseIdx];
}

const DEFAULT_MISSIONS=[
 {
  id:'upsc',
  icon:'🏛️',
  name:'UPSC Preparation',
  subjects:['Polity','History','Economy','Geography','Environment','Science','Other'],
  starter:[
   {id:1,name:'Fundamental Rights',subject:'Polity',tone:'',dueAt:todayStart(),done:false,level:0},
   {id:2,name:'Revolt of 1857',subject:'History',tone:'clay',dueAt:todayStart(),done:false,level:0},
   {id:3,name:'Inflation',subject:'Economy',tone:'gold',dueAt:todayStart(),done:false,level:0},
   {id:4,name:'Monsoon',subject:'Geography',tone:'blue',dueAt:todayStart(),done:false,level:0},
   {id:5,name:'Soil',subject:'Geography',tone:'',dueAt:todayStart(),done:false,level:0}
  ]
 },
 {
  id:'college',
  icon:'🎓',
  name:'College Semester',
  subjects:['Computer Science','Mathematics','Physics','Literature','Economics','Other'],
  starter:[
   {id:101,name:'Operating Systems Deadlocks',subject:'Computer Science',tone:'',dueAt:todayStart(),done:false,level:0},
   {id:102,name:'Eigenvalues & Eigenvectors',subject:'Mathematics',tone:'blue',dueAt:todayStart(),done:false,level:0},
   {id:103,name:'Thermodynamics Laws',subject:'Physics',tone:'gold',dueAt:todayStart(),done:false,level:0}
  ]
 },
 {
  id:'interviews',
  icon:'💻',
  name:'Technical Interviews',
  subjects:['Data Structures','Algorithms','System Design','Databases','Behavioral','Other'],
  starter:[
   {id:201,name:'Dynamic Programming Patterns',subject:'Algorithms',tone:'clay',dueAt:todayStart(),done:false,level:0},
   {id:202,name:'Consistent Hashing',subject:'System Design',tone:'blue',dueAt:todayStart(),done:false,level:0},
   {id:203,name:'B-Tree vs LSM-Tree Indexing',subject:'Databases',tone:'gold',dueAt:todayStart(),done:false,level:0}
  ]
 },
 {
  id:'personal',
  icon:'📚',
  name:'Personal Learning',
  subjects:['Books','Philosophy','Psychology','Languages','Art & Design','Other'],
  starter:[
   {id:301,name:'Stoic Dichotomy of Control',subject:'Philosophy',tone:'',dueAt:todayStart(),done:false,level:0},
   {id:302,name:'Cognitive Biases & Heuristics',subject:'Psychology',tone:'gold',dueAt:todayStart(),done:false,level:0}
  ]
 }
];

let missions=JSON.parse(localStorage.getItem('morrowMissions')||'null')||DEFAULT_MISSIONS;
let activeMissionId=localStorage.getItem('morrowActiveMission')||'upsc';
if(!missions.some(m=>m.id===activeMissionId)) activeMissionId=missions[0].id;

function currentMission(){
 return missions.find(m=>m.id===activeMissionId)||missions[0];
}
function missionStorageKey(suffix, mId=activeMissionId){
 return mId==='upsc' ? (suffix==='topics'?'morrowTopics':suffix==='done'?'morrowDone':'morrowGardenWorld') : `morrow_${mId}_${suffix}`;
}

let topics=[];
let completed=0;
let currentId=null;
const expandedSubjects = new Set();
const expandedTopics = new Set();

let pendingGardenAdds=JSON.parse(localStorage.getItem('morrowPendingGardenAdds')||'{}');
let pendingGardenBlooms=JSON.parse(localStorage.getItem('morrowPendingGardenBlooms')||'{}');
let pendingGardenBiomes=JSON.parse(localStorage.getItem('morrowPendingGardenBiomes')||'{}');

function saveGardenQueues(){
 localStorage.setItem('morrowPendingGardenAdds',JSON.stringify(pendingGardenAdds));
 localStorage.setItem('morrowPendingGardenBlooms',JSON.stringify(pendingGardenBlooms));
 localStorage.setItem('morrowPendingGardenBiomes',JSON.stringify(pendingGardenBiomes));
 updateGardenNavBadge();
}

function queueGardenAdd(topicId, mId=activeMissionId){
 if(!pendingGardenAdds[mId]) pendingGardenAdds[mId]=[];
 if(!pendingGardenAdds[mId].includes(topicId)) pendingGardenAdds[mId].push(topicId);
 saveGardenQueues();
}

function queueGardenBloom(topicId, mId=activeMissionId){
 if(!pendingGardenBlooms[mId]) pendingGardenBlooms[mId]=[];
 if(!pendingGardenBlooms[mId].includes(topicId)) pendingGardenBlooms[mId].push(topicId);
 saveGardenQueues();
}

function queueGardenBiome(subjectName, mId=activeMissionId){
 if(!pendingGardenBiomes[mId]) pendingGardenBiomes[mId]=[];
 if(!pendingGardenBiomes[mId].includes(subjectName)) pendingGardenBiomes[mId].push(subjectName);
 saveGardenQueues();
}

function updateGardenNavBadge(){
 const btn=document.getElementById('gardenNavBtn');
 if(!btn) return;
 const adds=(pendingGardenAdds[activeMissionId]||[]).length;
 const blooms=(pendingGardenBlooms[activeMissionId]||[]).length;
 const biomes=(pendingGardenBiomes[activeMissionId]||[]).length;
 btn.classList.toggle('has-pending', (adds + blooms + biomes) > 0);
}

function loadMissionState(mId){
 const m=missions.find(x=>x.id===mId)||missions[0];
 const rawTopics=JSON.parse(localStorage.getItem(missionStorageKey('topics',m.id))||'null');
 const base=rawTopics!==null ? rawTopics : JSON.parse(JSON.stringify(m.starter||[]));
 topics=base.map(t=>({...t,dueAt:t.dueAt||todayStart(),lastReviewed:t.lastReviewed||null,done:!!t.done,graduated:!!t.graduated,paused:!!t.paused,evergreenRevs:Number(t.evergreenRevs)||0,level:t.level||0}));
 completed=Number(localStorage.getItem(missionStorageKey('done',m.id))||0);
 currentId=null;
 expandedSubjects.clear();
 syncMissionUI();
 updateGardenNavBadge();
}

let lastSelectedSubject='';

function syncMissionUI(){
 const m=currentMission();
 const trig=document.getElementById('missionTrigger');
 if(trig){trig.textContent=m.icon||'🏛️';trig.title=`Mission: ${m.name}`}
 const sel=document.getElementById('subjectInput');
 if(sel){
  const prevVal = sel.value && sel.value !== '__new_subject__' ? sel.value : lastSelectedSubject;
  const subjectSet=new Set([...(m.subjects||[]),...topics.map(t=>t.subject).filter(Boolean)]);
  if(!subjectSet.size) subjectSet.add('General');
  if(!subjectSet.has('Other')) subjectSet.add('Other');
  const optionsHtml = Array.from(subjectSet).map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  sel.innerHTML = optionsHtml + `<option value="__new_subject__">＋ New subject…</option>`;
  if(prevVal && subjectSet.has(prevVal)){
   sel.value = prevVal;
  }else{
   sel.selectedIndex = 0;
  }
  lastSelectedSubject = sel.value;
 }
 renderMissionList();
}

function handleSubjectSelectChange(sel){
 if(sel.value === '__new_subject__'){
  sel.value = lastSelectedSubject || sel.options[0]?.value || '';
  openSubjectModal('add');
  return;
 }
 lastSelectedSubject = sel.value;
}

/* Add Subject & Biome Ecosystem Modal */
let subjectModalSource = 'add';
let selectedNewBiomeId = 'auto';

function renderBiomePicker(){
 const grid = document.getElementById('biomePickerGrid');
 if(!grid) return;
 const items = [
  { id: 'auto', icon: '✨', label: 'Auto-match', dot: '#829477' },
  ...BIOME_ARCHETYPES.map(a => ({ id: a.id, icon: a.icon, label: a.label, dot: a.dot }))
 ];
 grid.innerHTML = items.map(item => `
  <button type="button"
   class="biome-opt ${selectedNewBiomeId === item.id ? 'selected' : ''}"
   onclick="selectNewSubjectBiome('${item.id}')">
   <span class="biome-opt-swatch" style="background:${item.dot}"></span>
   <span>${item.icon} ${escapeHtml(item.label)}</span>
  </button>
 `).join('');
}

function selectNewSubjectBiome(id){
 selectedNewBiomeId = id;
 renderBiomePicker();
}

function openSubjectModal(source = 'add'){
 subjectModalSource = source;
 selectedNewBiomeId = 'auto';
 const input = document.getElementById('newSubjectNameInput');
 if(input) input.value = '';
 renderBiomePicker();
 document.getElementById('subjectModalBackdrop')?.classList.add('open');
 document.getElementById('subjectCreateModal')?.classList.add('open');
 setTimeout(() => input?.focus(), 60);
}

function closeSubjectModal(){
 document.getElementById('subjectModalBackdrop')?.classList.remove('open');
 document.getElementById('subjectCreateModal')?.classList.remove('open');
}

function submitNewSubject(e){
 e.preventDefault();
 const input = document.getElementById('newSubjectNameInput');
 const raw = (input?.value || '').trim();
 if(!raw){
  input?.focus();
  toast('Enter a subject name first');
  return;
 }
 const m = currentMission();
 if(!Array.isArray(m.subjects)) m.subjects = [];

 const existing = m.subjects.find(s => s.toLowerCase() === raw.toLowerCase())
  || topics.map(t => t.subject).find(s => s && s.toLowerCase() === raw.toLowerCase());

 if(existing){
  if(selectedNewBiomeId !== 'auto'){
   m.subjectBiomes = m.subjectBiomes || {};
   m.subjectBiomes[existing] = selectedNewBiomeId;
   localStorage.setItem('morrowMissions', JSON.stringify(missions));
  }
  closeSubjectModal();
  syncMissionUI();
  const sel = document.getElementById('subjectInput');
  if(sel){ sel.value = existing; lastSelectedSubject = existing; }
  render();
  if(subjectModalSource === 'garden' && window.focusBiomeBySubject){
   window.focusBiomeBySubject(existing);
  }else{
   toast(`Selected "${existing}"`);
  }
  return;
 }

 const otherIdx = m.subjects.findIndex(s => s.toLowerCase() === 'other');
 if(otherIdx !== -1) m.subjects.splice(otherIdx, 0, raw);
 else m.subjects.push(raw);

 if(selectedNewBiomeId !== 'auto'){
  m.subjectBiomes = m.subjectBiomes || {};
  m.subjectBiomes[raw] = selectedNewBiomeId;
 }

 localStorage.setItem('morrowMissions', JSON.stringify(missions));
 queueGardenBiome(raw, m.id);
 closeSubjectModal();

 lastSelectedSubject = raw;
 syncMissionUI();
 const sel = document.getElementById('subjectInput');
 if(sel) sel.value = raw;

 render();

 const arch = getArchetypeForSubject(raw, m.subjects.indexOf(raw), null, m);
 if(subjectModalSource === 'garden'){
  if(window.onGardenOpen) window.onGardenOpen();
 }else{
  toast(`${arch.icon} Added "${raw}" · ${arch.label}`);
 }
}

function openAddWithSubject(subject){
 showView('add');
 const sel = document.getElementById('subjectInput');
 if(sel && subject){
  lastSelectedSubject = subject;
  syncMissionUI();
  sel.value = subject;
 }
 setTimeout(() => document.getElementById('topicInput')?.focus(), 50);
}

let arcScrollOffset=0;
let arcOpen=false;
let arcVelocity=0;
let arcAnimFrame=null;
const ARC_CENTER_DEG=225;
const ARC_STEP_DEG=26;
const ARC_RADIUS=156;

function syncArcAnchor(){
 const trigger=document.getElementById('missionTrigger');
 const shell=document.getElementById('missionArcShell');
 if(!trigger||!shell)return;
 const r=trigger.getBoundingClientRect();
 shell.style.left=`${r.left + r.width/2}px`;
 shell.style.top=`${r.top + r.height/2}px`;
}

function getArcEntries(){
 return [
  ...missions.map(m=>({type:'mission',id:m.id,icon:m.icon||'🎯',name:m.name,active:m.id===activeMissionId})),
  {type:'create',id:'__create__',icon:'＋',name:'Create a Mission',active:false}
 ];
}

function renderMissionList(){
 const wheel=document.getElementById('missionArcWheel');
 if(!wheel)return;
 const entries=getArcEntries();
 const canDelete = missions.length > 1;
 wheel.innerHTML=entries.map((item,idx)=>`
  <div role="option" tabindex="0"
   aria-selected="${item.active?'true':'false'}"
   class="mission-arc-node ${item.active?'active':''} ${item.type==='create'?'create':''}"
   data-idx="${idx}"
   data-type="${item.type}"
   data-id="${item.id}">
   <span class="m-icon">${escapeHtml(item.icon)}</span>
   <span class="m-name">${escapeHtml(item.name)}</span>
   ${item.active?'<span class="m-check">●</span>':''}
   ${item.type==='mission' && canDelete ? `<span class="m-del" role="button" tabindex="0" title="Delete ${escapeHtml(item.name)}" aria-label="Delete ${escapeHtml(item.name)}" data-del-id="${item.id}"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h11"/><path d="M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/><path d="M4 4.5l.8 9.2A1.5 1.5 0 0 0 6.3 15h3.4a1.5 1.5 0 0 0 1.5-1.3l.8-9.2"/><path d="M6.8 7.5v4.5"/><path d="M9.2 7.5v4.5"/></svg></span>` : ''}
  </div>
 `).join('');

 wheel.querySelectorAll('.mission-arc-node').forEach(node=>{
  node.addEventListener('click',(e)=>{
   if(wheel.dataset.dragged==='1'){
    wheel.dataset.dragged='0';
    return;
   }
   e.stopPropagation();
   const delBtn = e.target.closest('.m-del');
   if(delBtn){
    promptDeleteMission(delBtn.dataset.delId);
    return;
   }
   const type=node.dataset.type;
   const id=node.dataset.id;
   if(type==='create'){
    closeMissionSwitcher();
    toggleCreateMission(true);
   }else{
    switchMission(id);
   }
  });
 });
 positionArcNodes();
}

function getArcBounds(total){
 return {
  min: -Math.max(0, total - 1) * ARC_STEP_DEG,
  max: 0
 };
}

function positionArcNodes(){
 const wheel=document.getElementById('missionArcWheel');
 if(!wheel)return;
 const nodes=Array.from(wheel.querySelectorAll('.mission-arc-node'));
 const total=nodes.length;
 if(!total)return;

 const {min, max}=getArcBounds(total);
 arcScrollOffset=Math.max(min, Math.min(max, arcScrollOffset));

 nodes.forEach((node,i)=>{
  const angleDeg = ARC_CENTER_DEG + i * ARC_STEP_DEG + arcScrollOffset;
  const rad = angleDeg * Math.PI / 180;
  const x = Math.cos(rad) * ARC_RADIUS;
  const y = Math.sin(rad) * ARC_RADIUS;

  const distFromCenter = Math.abs(angleDeg - ARC_CENTER_DEG);
  let alpha = 1;
  if(distFromCenter > 28){
   alpha = Math.max(0, 1 - (distFromCenter - 28) / 24);
  }
  const focusBoost = Math.max(0, 1 - distFromCenter / ARC_STEP_DEG);
  const scale = arcOpen ? (0.88 + 0.14 * focusBoost) : 0.72;
  const finalAlpha = arcOpen ? alpha : 0;

  node.style.opacity = finalAlpha.toFixed(3);
  node.style.pointerEvents = finalAlpha > 0.16 ? 'auto' : 'none';
  node.style.zIndex = String(Math.round(10 + focusBoost * 10));
  node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-76%, -50%) scale(${scale.toFixed(3)})`;
 });

 const hint=document.getElementById('missionArcHint');
 if(hint) hint.style.display = total > 1 ? 'block' : 'none';
}

function stopArcAnimation(){
 if(arcAnimFrame){
  cancelAnimationFrame(arcAnimFrame);
  arcAnimFrame=null;
 }
}

function snapArcToNearest(){
 stopArcAnimation();
 const total=getArcEntries().length;
 if(!total)return;
 const {min, max}=getArcBounds(total);
 const target=Math.max(min, Math.min(max, Math.round(arcScrollOffset / ARC_STEP_DEG) * ARC_STEP_DEG));

 function step(){
  const diff=target - arcScrollOffset;
  if(Math.abs(diff) < 0.15){
   arcScrollOffset=target;
   positionArcNodes();
   arcAnimFrame=null;
   return;
  }
  arcScrollOffset += diff * 0.24;
  positionArcNodes();
  arcAnimFrame=requestAnimationFrame(step);
 }
 arcAnimFrame=requestAnimationFrame(step);
}

function launchArcMomentum(){
 stopArcAnimation();
 const total=getArcEntries().length;
 const {min, max}=getArcBounds(total);

 function tick(){
  if(Math.abs(arcVelocity) < 0.08){
   arcVelocity=0;
   snapArcToNearest();
   return;
  }
  arcScrollOffset += arcVelocity;
  arcVelocity *= 0.9;
  if(arcScrollOffset < min || arcScrollOffset > max){
   arcScrollOffset=Math.max(min, Math.min(max, arcScrollOffset));
   arcVelocity=0;
   snapArcToNearest();
   return;
  }
  positionArcNodes();
  arcAnimFrame=requestAnimationFrame(tick);
 }
 arcAnimFrame=requestAnimationFrame(tick);
}

function toggleMissionSwitcher(){
 if(arcOpen) closeMissionSwitcher();
 else openMissionSwitcher();
}

function openMissionSwitcher(){
 pushModalHistory('arc');
 stopArcAnimation();
 syncArcAnchor();
 const entries=getArcEntries();
 const activeIdx=Math.max(0,entries.findIndex(e=>e.active));
 arcScrollOffset = -activeIdx * ARC_STEP_DEG;
 arcOpen=true;
 renderMissionList();
 document.getElementById('missionTrigger')?.classList.add('active');
 document.getElementById('missionBackdrop').classList.add('open');
 requestAnimationFrame(()=>{
  syncArcAnchor();
  positionArcNodes();
 });
}

function closeMissionSwitcher(){
 stopArcAnimation();
 arcOpen=false;
 document.getElementById('missionTrigger')?.classList.remove('active');
 document.getElementById('missionBackdrop').classList.remove('open');
 positionArcNodes();
}

function toggleCreateMission(show){
 const modal=document.getElementById('missionCreateModal');
 if(!modal)return;
 modal.classList.toggle('open',!!show);
 if(show) setTimeout(()=>document.getElementById('newMissionName')?.focus(),50);
}

let pendingDeleteMissionId=null;

function getMissionStats(mId){
 const m=missions.find(x=>x.id===mId);
 if(!m) return {topicsCount:0,doneCount:0};
 const rawTopics=JSON.parse(localStorage.getItem(missionStorageKey('topics',m.id))||'null');
 const list=rawTopics!==null ? rawTopics : (m.starter||[]);
 const doneCount=Number(localStorage.getItem(missionStorageKey('done',m.id))||0);
 return {topicsCount:list.length,doneCount};
}

function promptDeleteMission(mId){
 if(missions.length<=1){
  toast('At least one mission must remain');
  return;
 }
 const m=missions.find(x=>x.id===mId);
 if(!m)return;
 pendingDeleteMissionId=mId;
 const stats=getMissionStats(mId);

 document.getElementById('deleteMissionTargetName').textContent=`⚠️ Warning: Deleting "${m.icon} ${m.name}" is permanent.`;
 document.getElementById('deleteMissionStats').innerHTML=`<span>📚 ${stats.topicsCount} ${stats.topicsCount===1?'topic':'topics'}</span><span>✿ ${stats.doneCount} ${stats.doneCount===1?'revision':'revisions'}</span>`;
 document.getElementById('deleteMissionPromptName').textContent=m.name;

 const input=document.getElementById('deleteConfirmInput');
 input.value='';
 document.getElementById('confirmDeleteMissionBtn').disabled=true;

 closeMissionSwitcher();
 document.getElementById('missionDeleteModal').classList.add('open');
 setTimeout(()=>input.focus(),60);
}

function validateDeleteConfirm(){
 const m=missions.find(x=>x.id===pendingDeleteMissionId);
 const btn=document.getElementById('confirmDeleteMissionBtn');
 if(!m||!btn)return;
 const typed=document.getElementById('deleteConfirmInput').value.trim();
 btn.disabled = (typed.toLowerCase() !== m.name.trim().toLowerCase());
}

function closeDeleteMissionModal(){
 pendingDeleteMissionId=null;
 document.getElementById('missionDeleteModal')?.classList.remove('open');
}

function executeDeleteMission(){
 if(!pendingDeleteMissionId || missions.length<=1)return;
 const idx=missions.findIndex(x=>x.id===pendingDeleteMissionId);
 if(idx===-1)return;
 const deleted=missions[idx];

 localStorage.removeItem(missionStorageKey('topics',deleted.id));
 localStorage.removeItem(missionStorageKey('done',deleted.id));
 localStorage.removeItem(missionStorageKey('garden',deleted.id));
 delete pendingGardenAdds[deleted.id];
 delete pendingGardenBlooms[deleted.id];
 delete pendingGardenBiomes[deleted.id];
 saveGardenQueues();

 missions.splice(idx,1);
 localStorage.setItem('morrowMissions',JSON.stringify(missions));

 const wasActive=(deleted.id===activeMissionId);
 closeDeleteMissionModal();

 if(wasActive){
  activeMissionId=missions[0].id;
  localStorage.setItem('morrowActiveMission',activeMissionId);
  loadMissionState(activeMissionId);
  render();
  if(document.getElementById('review').classList.contains('active')) showView('today');
 }else{
  renderMissionList();
 }
 toast(`Deleted "${deleted.name}"`);
}

(()=>{
 const backdrop=document.getElementById('missionBackdrop');
 const wheel=document.getElementById('missionArcWheel');
 const trigger=document.getElementById('missionTrigger');
 if(!backdrop||!wheel)return;

 let dragging=false;
 let lastAngle=0;
 let wheelSnapTimer=null;

 function pointerAngleDeg(clientX, clientY){
  const shell=document.getElementById('missionArcShell');
  const rect=shell ? shell.getBoundingClientRect() : {left:window.innerWidth-48, top:window.innerHeight-38};
  const dx=clientX - rect.left;
  const dy=clientY - rect.top;
  let deg=Math.atan2(dy, dx) * 180 / Math.PI;
  if(deg < 0) deg += 360;
  return deg;
 }

 function handleWheelScroll(e){
  e.preventDefault();
  if(!arcOpen) openMissionSwitcher();
  stopArcAnimation();
  const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : -e.deltaX;
  arcScrollOffset -= delta * 0.28;
  positionArcNodes();
  clearTimeout(wheelSnapTimer);
  wheelSnapTimer=setTimeout(snapArcToNearest, 130);
 }

 window.addEventListener('wheel',(e)=>{
  if(!arcOpen)return;
  handleWheelScroll(e);
 },{passive:false});

 trigger?.addEventListener('wheel',(e)=>{
  handleWheelScroll(e);
 },{passive:false});

 backdrop.addEventListener('pointerdown',(e)=>{
  if(!arcOpen)return;
  stopArcAnimation();
  dragging=true;
  lastAngle=pointerAngleDeg(e.clientX, e.clientY);
  arcVelocity=0;
  wheel.dataset.dragged='0';
 });

 window.addEventListener('pointermove',(e)=>{
  if(!dragging||!arcOpen)return;
  const currentAngle=pointerAngleDeg(e.clientX, e.clientY);
  let deltaDeg=currentAngle - lastAngle;
  if(deltaDeg > 180) deltaDeg -= 360;
  if(deltaDeg < -180) deltaDeg += 360;
  if(Math.abs(deltaDeg) > 0.8) wheel.dataset.dragged='1';
  arcScrollOffset += deltaDeg;
  arcVelocity = deltaDeg * 0.65;
  lastAngle = currentAngle;
  positionArcNodes();
 });

 window.addEventListener('pointerup',()=>{
  if(!dragging)return;
  dragging=false;
  if(Math.abs(arcVelocity) > 0.35) launchArcMomentum();
  else snapArcToNearest();
 });

 window.addEventListener('resize',()=>{
  if(arcOpen){
   syncArcAnchor();
   positionArcNodes();
  }
 });

 window.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){
   if(document.getElementById('subjectCreateModal')?.classList.contains('open')){
    e.preventDefault();
    closeSubjectModal();
    return;
   }
   if(document.getElementById('replantModal')?.classList.contains('open')){
    e.preventDefault();
    closeReplantModal();
    return;
   }
   if(document.getElementById('topicDeleteModal')?.classList.contains('open')){
    e.preventDefault();
    closeTopicDeleteModal();
    return;
   }
   if(arcOpen){
    e.preventDefault();
    closeMissionSwitcher();
    return;
   }
  }
  if(!arcOpen)return;
  if(e.key==='ArrowUp' || e.key==='ArrowRight'){
   e.preventDefault();
   arcScrollOffset -= ARC_STEP_DEG;
   snapArcToNearest();
  }else if(e.key==='ArrowDown' || e.key==='ArrowLeft'){
   e.preventDefault();
   arcScrollOffset += ARC_STEP_DEG;
   snapArcToNearest();
  }else if(e.key==='Enter'){
   const entries=getArcEntries();
   const centeredIdx=Math.max(0, Math.min(entries.length-1, Math.round(-arcScrollOffset / ARC_STEP_DEG)));
   const chosen=entries[centeredIdx];
   if(chosen){
    e.preventDefault();
    if(chosen.type==='create'){ closeMissionSwitcher(); toggleCreateMission(true); }
    else switchMission(chosen.id);
   }
  }
 });
})();

function switchMission(id){
 if(id===activeMissionId){closeMissionSwitcher();return}
 activeMissionId=id;
 localStorage.setItem('morrowActiveMission',activeMissionId);
 loadMissionState(activeMissionId);
 render();
 closeMissionSwitcher();
 const m=currentMission();
 if(document.getElementById('review').classList.contains('active')) showView('today');
 toast(`${m.icon} ${m.name}`);
}

function createNewMission(e){
 e.preventDefault();
 const nameEl=document.getElementById('newMissionName');
 const iconEl=document.getElementById('newMissionIcon');
 const subjEl=document.getElementById('newMissionSubjects');
 const name=nameEl.value.trim();
 if(!name){nameEl.focus();toast('Name your mission first');return}
 const icon=(iconEl.value.trim()||'🌱');
 const parsedSubjects=subjEl.value.split(',').map(s=>s.trim()).filter(Boolean);
 const subjects=parsedSubjects.length ? [...new Set([...parsedSubjects,'Other'])] : ['General','Notes','Practice','Other'];
 const id='mission_'+Date.now();
 missions.push({id,icon,name,subjects,starter:[]});
 localStorage.setItem('morrowMissions',JSON.stringify(missions));
 nameEl.value='';subjEl.value='';iconEl.value='🌱';
 toggleCreateMission(false);
 switchMission(id);
}

function save(){
 localStorage.setItem(missionStorageKey('topics'),JSON.stringify(topics));
 localStorage.setItem(missionStorageKey('done'),completed);
}
function dueState(t){
 const days=Math.floor((todayStart()-new Date(t.dueAt).setHours(0,0,0,0))/DAY);
 if(t.done || t.graduated)return 'done';
 if(t.paused)return 'paused';
 if(days>=3)return 'dead';
 if(days>=1)return 'wilted';
 return 'fresh';
}
function render(){
 const due=topics.filter(t=>!t.done && !t.graduated && !t.paused && t.dueAt<=Date.now());
 document.getElementById('dueCount').textContent=due.length;
 document.getElementById('timeEstimate').textContent=due.length?`about ${Math.max(5,due.length*7)} min`:'A gentle little list';
 document.getElementById('topicList').innerHTML=due.length?due.map(t=>row(t)).join(''):'<div class="empty">All caught up.<br>Enjoy the quiet.</div>';
 document.getElementById('allTopics').innerHTML=renderLibrary();
 document.getElementById('totalStat').textContent=topics.length;
 document.getElementById('doneStat').textContent=completed;
 renderGarden();
}

function dateValue(ts){
 if(!ts)return '';
 const d=new Date(ts);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function displayDate(ts){return ts?new Date(ts).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Not revised yet'}
function toggleTopicCard(id, el){
 const card = el ? el.closest('.library-topic') : document.getElementById('topic-card-' + id);
 if(!card) return;
 const isOpen = card.classList.toggle('is-expanded');
 if(isOpen) expandedTopics.add(id);
 else expandedTopics.delete(id);
 const arrow = card.querySelector('.library-topic-arrow');
 if(arrow) arrow.textContent = isOpen ? '▾' : '›';
}

function toggleSubject(key){
 if(expandedSubjects.has(key)) expandedSubjects.delete(key); else expandedSubjects.add(key);
 render();
}
function renderRevisionDots(t){
 if(t.graduated) return `<span class="library-rev-dots" title="Graduated · Mastered" aria-label="Graduated · Mastered" style="background:rgba(218,179,90,.18);color:#967625;padding:2px 7px;font-size:11px;font-weight:700">🎓 Mastered</span>`;
 if(t.paused) return `<span class="library-rev-dots" title="On hold" aria-label="On hold" style="background:rgba(140,140,130,.15);color:#737368;padding:2px 6px;font-size:10px;font-weight:600">On hold</span>`;
 const count=Math.max(0,Number(t.level)||0);
 const maxDots=5;
 const filled=Math.min(maxDots,count);
 let dots='';
 for(let i=0;i<maxDots;i++){
  dots+=`<i class="${i<filled?'on':''}"></i>`;
 }
 const extra=count>maxDots?`<span class="rev-extra">+${count-maxDots}</span>`:'';
 const title=count===0?'Not revised yet':`Revised ${count} ${count===1?'time':'times'}`;
 return `<span class="library-rev-dots" title="${title}" aria-label="${title}">${dots}${extra}</span>`;
}
function renderLibrary(){
 const m=currentMission();
 const groups={};
 (m.subjects||[]).forEach(s=>{
  const clean=(s||'').trim();
  if(clean && clean.toLowerCase()!=='other') groups[clean]=[];
 });
 topics.forEach(t=>{
  const subject=(t.subject||'Uncategorised').trim()||'Uncategorised';
  (groups[subject]??=[]).push(t);
 });
 const entries=Object.entries(groups);
 if(!entries.length)return '<div class="empty">Your library is waiting.</div>';
 return entries.sort(([a],[b])=>a.localeCompare(b)).map(([subject,items],index)=>{
  const key='subject-'+index,expanded=expandedSubjects.has(key);
  const arch=getArchetypeForSubject(subject, index, null, m);
  return `
  <section class="library-subject">
   <button class="library-subject-title" type="button" aria-expanded="${expanded}" onclick="toggleSubject('${key}')">
    <span class="library-subject-biome-dot" style="background:${arch.dot}" title="${escapeHtml(arch.label)}"></span>
    <span>${escapeHtml(subject)}</span>
    <span class="library-empty-subject">${items.length} ${items.length===1?'topic':'topics'}</span>
    ${expanded ? `
     <span class="lib-del-icon-btn lib-del-subject-btn" role="button" tabindex="0" title="Delete subject ${escapeHtml(subject)}" aria-label="Delete subject ${escapeHtml(subject)}" onclick="event.stopPropagation();promptDeleteSubject(this.dataset.subj)" data-subj="${escapeHtml(subject)}"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h11"/><path d="M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/><path d="M4 4.5l.8 9.2A1.5 1.5 0 0 0 6.3 15h3.4a1.5 1.5 0 0 0 1.5-1.3l.8-9.2"/><path d="M6.8 7.5v4.5"/><path d="M9.2 7.5v4.5"/></svg></span>
    ` : ''}
    <span class="library-subject-chevron">›</span>
   </button>
   <div class="library-subject-content" ${expanded?'':'hidden'}>
    ${items.length ? items.sort((a,b)=>a.name.localeCompare(b.name)).map(t=>{
     const isExpanded = expandedTopics.has(t.id);
     return `
     <article class="library-topic ${t.graduated?'is-graduated':''} ${t.paused?'is-paused':''} ${isExpanded?'is-expanded':''}" id="topic-card-${t.id}">
      <div class="library-topic-main" onclick="toggleTopicCard(${t.id}, this)">
       <span class="dot ${t.graduated?'gold':t.paused?'blue':dueState(t)==='dead'?'clay':t.tone||''}"></span>
       <span class="library-topic-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
       ${renderRevisionDots(t)}
       <span class="library-topic-arrow">${isExpanded?'▾':'›'}</span>
      </div>
      <div class="library-topic-details">
       <div class="library-dates">
        <div class="library-date"><label>Last revised</label><span>${displayDate(t.lastReviewed)}</span></div>
        ${!t.graduated ? `
        <div class="library-date"><label>Next revision</label>
         <input aria-label="Next revision date for ${escapeHtml(t.name)}" type="date" min="${dateValue(todayStart())}" value="${dateValue(t.dueAt)}" onchange="changeNextDate(${t.id},this.value)">
        </div>` : ''}
       </div>
       <div class="library-topic-actions">
        <button type="button" class="lib-btn review-btn" onclick="event.stopPropagation();openTopic(${t.id})">Revisit</button>
        <button type="button" class="lib-btn edit-topic-btn" onclick="event.stopPropagation();promptEditTopicName(${t.id})">✏️ Rename</button>
        ${(t.evergreenRevs||0)>=2 && !t.graduated ? `
         <button type="button" class="lib-btn graduate-btn-pill" onclick="event.stopPropagation();graduateTopic(${t.id})">🎓 Graduate topic</button>
        ` : ''}
        <button type="button" class="lib-btn replant-btn" onclick="event.stopPropagation();openReplantModal(${t.id})">🌱 Re-plant</button>
        ${!t.graduated ? `
         <button type="button" class="lib-btn pause-btn" onclick="event.stopPropagation();togglePauseTopic(${t.id})">${t.paused?'Resume':'hold'}</button>
        ` : ''}
         <button type="button" class="lib-del-icon-btn" title="Delete ${escapeHtml(t.name)}" aria-label="Delete ${escapeHtml(t.name)}" onclick="event.stopPropagation();promptDeleteTopic(${t.id})"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h11"/><path d="M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/><path d="M4 4.5l.8 9.2A1.5 1.5 0 0 0 6.3 15h3.4a1.5 1.5 0 0 0 1.5-1.3l.8-9.2"/><path d="M6.8 7.5v4.5"/><path d="M9.2 7.5v4.5"/></svg></button>
       </div>
      </div>
     </article>`;
    }).join('') + `
    <div class="library-subject-footer">
     <button type="button" class="inline-add-btn" onclick="openAddWithSubject(this.dataset.subj)" data-subj="${escapeHtml(subject)}">＋ Add topic</button>
    </div>` : `
    <div class="library-empty-card">
     <span>${arch.icon} ${escapeHtml(arch.label)} ready for its first seed.</span>
     <button type="button" class="inline-add-btn" onclick="openAddWithSubject(this.dataset.subj)" data-subj="${escapeHtml(subject)}">+ Topic</button>
    </div>`}

   </div>
  </section>`;
 }).join('');
}
function changeNextDate(id,value){
 const t=topics.find(x=>x.id===id);if(!t||!value)return;
 const [y,m,d]=value.split('-').map(Number);
 const targetTs=new Date(y,m-1,d).getTime();
 if(targetTs < todayStart()){
  toast('Revision date cannot be in the past ✿');
  render();
  return;
 }
 t.dueAt=targetTs;
 t.done=false;
 save();render();
 toast('Next revision date updated ✿');
}
function renderGarden(){
 const overdue=topics.filter(t=>!t.done && dueState(t)!=='fresh');
 const dead=overdue.filter(t=>dueState(t)==='dead').length;
 const wilted=overdue.length-dead;
 const blooming=topics.filter(t=>(t.level||0)>=1 && dueState(t)==='fresh').length;

 const bloomEl=document.getElementById('bloomCount');
 const topicEl=document.getElementById('gardenTopicStat');
 if(bloomEl) bloomEl.textContent=blooming;
 if(topicEl) topicEl.textContent=topics.length;

 const mLabel=document.getElementById('gardenMissionLabel');
 if(mLabel) mLabel.textContent=`${currentMission().name} · Hill Stack`;

 const mood=document.getElementById('gardenMood');
 const dot=document.getElementById('gardenStatusDot');
 if(mood){
  if(!topics.length){
   mood.textContent='Hills ready for seeds';
   if(dot) dot.style.background='#c8d4be';
  }else if(dead){
   mood.textContent=`${dead} resting deeply`;
   if(dot) dot.style.background='#e6a88a';
  }else if(wilted){
   mood.textContent=`${wilted} waiting for rain`;
   if(dot) dot.style.background='#edd082';
  }else if(completed>=10){
   mood.textContent='In full bloom';
   if(dot) dot.style.background='#a7db93';
  }else if(completed>=2){
   mood.textContent='New life unfurling';
   if(dot) dot.style.background='#b8d8a3';
  }else{
   mood.textContent='Growing gently';
   if(dot) dot.style.background='#b8d8a3';
  }
 }

 if(window.syncBotanicalGarden) window.syncBotanicalGarden();
}

function row(t,all=false){
 const state=dueState(t);
 const suffix=t.graduated?' · graduated':t.paused?' · on hold':t.done?' · revisited':state==='dead'?' · withered':state==='wilted'?' · waiting for you':'';
 return `<button class="topic" onclick="openTopic(${t.id})"><span class="dot ${t.graduated?'gold':t.paused?'blue':state==='dead'?'clay':t.tone||''}"></span><span class="topic-name">${escapeHtml(t.name)}<span class="topic-sub">${escapeHtml(t.subject)}${suffix}</span></span><span class="chev">›</span></button>`
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function currentViewId(){
 return document.querySelector('.view.active')?.id || 'today';
}

function handleReviewBack(){
 if(history.state && history.state.view === 'review'){
  history.back();
 } else {
  showView('today');
 }
}

function handleGardenBack(){
 if(history.state && history.state.view === 'garden'){
  history.back();
 } else {
  showView('today');
 }
}

function showView(id,btn,push=true){
 const prevView=currentViewId();
 if(push && id!==prevView){
  try {
   if(id==='today') history.pushState({view:'today',trap:true},'');
   else history.pushState({view:id},'');
  } catch(e){}
 }
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 const targetView=document.getElementById(id);
 if(targetView) targetView.classList.add('active');
 if(id==='garden' && window.onGardenOpen) requestAnimationFrame(()=>window.onGardenOpen());
 document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
 if(btn)btn.classList.add('active');
 else if(id==='today')document.querySelectorAll('.nav')[0]?.classList.add('active');
 else if(id==='garden')document.getElementById('gardenNavBtn')?.classList.add('active');
 else if(id==='library')document.querySelectorAll('.nav')[2]?.classList.add('active');
 const topEl=document.querySelector('.top');
 if(topEl) topEl.style.display=(id==='today')?'flex':'none';
 const titles={today:'Good morning.',add:'Leave it here.',garden:'Your garden.',library:'All topics.',progress:'Look how far.'};
 if(id==='today')document.getElementById('pageTitle').textContent=titles[id]||'';
}
function openTopic(id,push=true){currentId=id;let t=topics.find(x=>x.id===id);if(!t)return;
 if(push){
  try { history.pushState({view:'review',topicId:id},''); } catch(e){}
 }
 document.getElementById('reviewTitle').textContent=t.name;document.getElementById('reviewSubject').textContent=t.subject.toUpperCase();
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById('review').classList.add('active');
 document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
 const topEl=document.querySelector('.top');
 if(topEl) topEl.style.display='none';

 const isGrad=!!t.graduated;
 const bkmk=document.getElementById('reviewBookmark');
 if(bkmk) bkmk.textContent=isGrad?'🎓':'📖';

 const ratingSec=document.getElementById('reviewRatingSection');
 const masteredSec=document.getElementById('reviewMasteredSection');
 if(ratingSec) ratingSec.style.display=isGrad?'none':'block';
 if(masteredSec) masteredSec.style.display=isGrad?'block':'none';

 const gradBox=document.getElementById('reviewGraduateBox');
 if(gradBox){
  gradBox.style.display=((t.evergreenRevs||0)>=2 && !isGrad)?'block':'none';
 }
}
function startReview(){let t=topics.find(x=>!t.done && !t.graduated && !t.paused && x.dueAt<=Date.now());if(t)openTopic(t.id);else toast('Nothing waiting today ✿')}
function rateTopic(kind){
 let t=topics.find(x=>x.id===currentId);if(!t)return;
 if(t.graduated){
  toast('Topic is already mastered · re-plant to resume revisions ✿');
  return;
 }
 completed++;
 const prevLvl=t.level||0;
 t.level=prevLvl+1;
 t.lastReviewed=todayStart();
 t.done=false;
 const lvl=t.level;

 if(prevLvl>=4 && kind==='remembered'){
  t.evergreenRevs=(t.evergreenRevs||0)+1;
 }

 let interval;
 if(kind==='forgot') interval=1;
 else if(kind==='difficult') interval=2;
 else if(lvl>=4) interval=30;
 else if(lvl===3) interval=15;
 else if(lvl===2) interval=7;
 else if(lvl===1) interval=3;
 else interval=1;
 t.dueAt=todayStart()+interval*DAY;
 t.tone=kind==='forgot'?'clay':kind==='difficult'?'gold':'';
 queueGardenBloom(t.id);
 save();render();showView('today');
 const stageNames=['Seed','Sprout','Sapling','Budding','Evergreen'];
 const stageName=stageNames[Math.min(lvl,4)];

 if((t.evergreenRevs||0)>=2){
  toast(`🎓 2 monthly revisions completed! "${t.name}" is eligible to Graduate ✿`);
 }else if(prevLvl>=4 && kind==='remembered'){
  toast(`🏔 Monthly revision 1/2 completed for "${t.name}" · next in 30 days ✿`);
 }else{
  toast(kind==='remembered'?stageName+' blooming · next in '+interval+' days ✿':kind==='difficult'?'We’ll bring it back soon.':'That’s okay. We’ll return to it.');
 }
}
function graduateTopic(id){
 const t=topics.find(x=>x.id===id);if(!t)return;
 t.graduated=true;
 t.done=true;
 t.paused=false;
 save();render();
 if(document.getElementById('review').classList.contains('active')) showView('today');
 toast(`🎓 "${t.name}" graduated to Full Bloom! Permanent mastery ✿`);
}
let pendingReplantTopicId = null;

function openReplantModal(id){
 const t = topics.find(x => x.id === id);
 if(!t) return;
 pendingReplantTopicId = id;
 const nameEl = document.getElementById('replantTopicPromptName');
 if(nameEl) nameEl.textContent = `"${t.name}"`;
 const sel = document.getElementById('replantLevelSelect');
 if(sel){
  const stageKeys = ['seed', 'sprout', 'sapling', 'budding', 'evergreen'];
  sel.value = stageKeys[Math.min(Math.max(0, t.level || 0), 4)] || 'seed';
 }
 const modal = document.getElementById('replantModal');
 const backdrop = document.getElementById('replantModalBackdrop');
 if(modal) modal.classList.add('open');
 if(backdrop) backdrop.classList.add('open');
 pushModalHistory('modal');
}

function closeReplantModal(){
 pendingReplantTopicId = null;
 document.getElementById('replantModal')?.classList.remove('open');
 document.getElementById('replantModalBackdrop')?.classList.remove('open');
}

function confirmReplantTopic(){
 if(!pendingReplantTopicId) return;
 const id = pendingReplantTopicId;
 const t = topics.find(x => x.id === id);
 if(!t) return;
 const stage = document.getElementById('replantLevelSelect')?.value || 'seed';
 const stageMap = {
  seed: { days: 1, lvl: 0, icon: '🌱', label: 'Seed' },
  sprout: { days: 3, lvl: 1, icon: '🌿', label: 'Sprout' },
  sapling: { days: 7, lvl: 2, icon: '🌳', label: 'Sapling' },
  budding: { days: 15, lvl: 3, icon: '🌸', label: 'Budding' },
  evergreen: { days: 30, lvl: 4, icon: '🏔', label: 'Evergreen' }
 };
 const info = stageMap[stage] || stageMap.seed;
 t.graduated = false;
 t.done = false;
 t.paused = false;
 t.evergreenRevs = 0;
 t.level = info.lvl;
 t.dueAt = todayStart() + info.days * DAY;
 closeReplantModal();
 save();
 render();
 if(currentId === t.id && document.getElementById('review').classList.contains('active')){
  openTopic(t.id);
 }
 toast(`${info.icon} "${t.name}" re-planted as ${info.label} · revisit in ${info.days} day${info.days===1?'':'s'} ✿`);
}

function replantTopic(id){
 openReplantModal(id);
}
function togglePauseTopic(id){
 const t=topics.find(x=>x.id===id);if(!t)return;
 t.paused=!t.paused;
 if(!t.paused && t.dueAt<todayStart()){
  t.dueAt=todayStart();
 }
 save();render();
 toast(t.paused?` "${t.name}" put on hold · resting peacefully`:`"${t.name}" resumed · back in active garden ✿`);
}
let pendingDeleteSubjectName = null;

function promptDeleteSubject(subject){
 if(!subject) return;
 pendingDeleteSubjectName = subject;
 const count = topics.filter(t => (t.subject || '').trim() === subject.trim()).length;
 const msg = document.getElementById('subjectDeleteMessage');
 if(msg){
  msg.innerHTML = count > 0 
   ? `Delete subject <strong>"${escapeHtml(subject)}"</strong> and its <strong>${count} topic${count === 1 ? '' : 's'}</strong>? This cannot be undone.`
   : `Delete empty subject <strong>"${escapeHtml(subject)}"</strong> from your library?`;
 }
 const modal = document.getElementById('subjectDeleteModal');
 const backdrop = document.getElementById('subjectDeleteBackdrop');
 if(modal) modal.classList.add('open');
 if(backdrop) backdrop.classList.add('open');
 pushModalHistory('modal');
}

function closeSubjectDeleteModal(){
 pendingDeleteSubjectName = null;
 document.getElementById('subjectDeleteModal')?.classList.remove('open');
 document.getElementById('subjectDeleteBackdrop')?.classList.remove('open');
}

function confirmDeleteSubject(){
 if(!pendingDeleteSubjectName) return;
 const subj = pendingDeleteSubjectName;
 const m = currentMission();
 
 if(Array.isArray(m.subjects)){
  m.subjects = m.subjects.filter(s => (s || '').trim().toLowerCase() !== subj.trim().toLowerCase());
  localStorage.setItem('morrowMissions', JSON.stringify(missions));
 }
 if(m.subjectBiomes && m.subjectBiomes[subj]){
  delete m.subjectBiomes[subj];
  localStorage.setItem('morrowMissions', JSON.stringify(missions));
 }
 topics = topics.filter(t => (t.subject || '').trim() !== subj.trim());
 expandedSubjects.clear();
 
 closeSubjectDeleteModal();
 save();
 render();
 toast(`Deleted subject "${subj}" ✿`);
}

let pendingDeleteTopicId = null;

function promptDeleteTopic(id){
 const t = topics.find(x => x.id === id);
 if(!t) return;
 pendingDeleteTopicId = id;
 const msg = document.getElementById('topicDeleteMessage');
 if(msg){
  msg.innerHTML = `Permanently delete <strong>"${escapeHtml(t.name)}"</strong>? Its revision history and hill garden plant will be removed.`;
 }
 const modal = document.getElementById('topicDeleteModal');
 const backdrop = document.getElementById('topicDeleteBackdrop');
 if(modal) modal.classList.add('open');
 if(backdrop) backdrop.classList.add('open');
 pushModalHistory('modal');
}

function closeTopicDeleteModal(){
 pendingDeleteTopicId = null;
 document.getElementById('topicDeleteModal')?.classList.remove('open');
 document.getElementById('topicDeleteBackdrop')?.classList.remove('open');
}

function confirmDeleteTopic(){
 if(!pendingDeleteTopicId) return;
 const id = pendingDeleteTopicId;
 const t = topics.find(x => x.id === id);
 if(!t) return;
 topics = topics.filter(x => x.id !== id);
 closeTopicDeleteModal();
 save();
 render();
 toast(`Deleted "${t.name}"`);
}
function addTopic(){
 let name=document.getElementById('topicInput').value.trim(),subject=document.getElementById('subjectInput').value;
 if(!name){document.getElementById('topicInput').focus();toast('Add a topic name first');return}
 if(!subject || subject==='__new_subject__') subject='General';
 const m=currentMission();
 if(!Array.isArray(m.subjects)) m.subjects=[];
 if(!m.subjects.includes(subject)){
  m.subjects.push(subject);
  localStorage.setItem('morrowMissions',JSON.stringify(missions));
 }
 const stage=document.getElementById('levelInput')?.value||'seed';
 const stageMap={seed:{days:1,lvl:0,icon:'🌱',label:'Seed'},sprout:{days:3,lvl:1,icon:'🌿',label:'Sprout'},sapling:{days:7,lvl:2,icon:'🌳',label:'Sapling'},budding:{days:15,lvl:3,icon:'🌸',label:'Budding'},evergreen:{days:30,lvl:4,icon:'🏔',label:'Evergreen'}};
 const info=stageMap[stage]||stageMap.seed;
 const newId=Date.now();
 topics.unshift({id:newId,name,subject,tone:'',done:false,graduated:false,paused:false,evergreenRevs:0,dueAt:todayStart()+info.days*DAY,level:info.lvl});
 queueGardenAdd(newId);
 save();render();
 document.getElementById('topicInput').value='';document.getElementById('levelInput').value='seed';showView('today');toast(`${info.icon} ${info.label} planted · revisit in ${info.days} day${info.days===1?'':'s'}`);
}
function toast(msg){let el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
loadMissionState(activeMissionId);
render();
const now = new Date();
document.getElementById('dateLabel').textContent =
  now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});


/* Mobile Native Back Button Navigation & History Routing */
let backExitAllowed = false;
let backToastTimer = null;

function pushModalHistory(type){
 try {
  history.pushState({ modal: type, view: currentViewId() }, '');
 } catch(e){}
}

function hasAnyModalOpen(){
 return !!(
  document.getElementById('subjectEditModal')?.classList.contains('open') ||
  document.getElementById('topicEditModal')?.classList.contains('open') ||
  document.getElementById('remindersModal')?.classList.contains('open') ||
  document.getElementById('replantModal')?.classList.contains('open') ||
  document.getElementById('topicDeleteModal')?.classList.contains('open') ||
  document.getElementById('subjectDeleteModal')?.classList.contains('open') ||
  document.getElementById('subjectCreateModal')?.classList.contains('open') ||
  document.getElementById('missionCreateModal')?.classList.contains('open') ||
  document.getElementById('missionDeleteModal')?.classList.contains('open') ||
  (typeof arcOpen !== 'undefined' && arcOpen)
 );
}

function closeAllModals(){
 if(typeof closeSubjectEditModal === 'function') closeSubjectEditModal();
 if(typeof closeTopicEditModal === 'function') closeTopicEditModal();
 if(typeof closeRemindersModal === 'function') closeRemindersModal();
 if(typeof closeReplantModal === 'function') closeReplantModal();
 if(typeof closeTopicDeleteModal === 'function') closeTopicDeleteModal();
 if(typeof closeSubjectDeleteModal === 'function') closeSubjectDeleteModal();
 if(typeof closeSubjectModal === 'function') closeSubjectModal();
 if(typeof closeDeleteMissionModal === 'function') closeDeleteMissionModal();
 if(typeof toggleCreateMission === 'function') toggleCreateMission(false);
 if(typeof closeMissionSwitcher === 'function') closeMissionSwitcher();
}

window.addEventListener('popstate', (e) => {
 // 1. If any modal or arc switcher is open, close it first without navigating away
 if(hasAnyModalOpen()){
  closeAllModals();
  return;
 }

 const currentV = currentViewId();

 // 2. If a specific target view/topic was stored in history state
 if(e.state && e.state.view){
  if(e.state.view === 'review' && e.state.topicId){
   openTopic(e.state.topicId, false);
  } else {
   showView(e.state.view, null, false);
  }
  return;
 }

 // 3. Root navigation handling:
 if(currentV !== 'today'){
  showView('today', null, false);
  try {
   history.pushState({ view: 'today', trap: true }, '');
  } catch(err){}
 } else {
  // If user is already on the main 'today' screen:
  if(backExitAllowed){
   window.history.back();
  } else {
   backExitAllowed = true;
   toast('Press back again to exit ✿');
   try {
    history.pushState({ view: 'today', trap: true }, '');
   } catch(err){}
   clearTimeout(backToastTimer);
   backToastTimer = setTimeout(() => {
    backExitAllowed = false;
   }, 2200);
  }
 }
});

try {
 history.replaceState({ view: 'today', root: true }, '');
 history.pushState({ view: 'today', trap: true }, '');
} catch(e){}


/* Daily Notification Reminders (Morning & Night) */
const REMINDERS_KEY = 'morrowReminderSettings';

function getReminderSettings(){
 const fallback = {
  enabled: true,
  morningEnabled: true,
  morningTime: '08:30',
  nightEnabled: true,
  nightTime: '21:30',
  lastMorningDate: null,
  lastNightDate: null
 };
 try {
  const raw = localStorage.getItem(REMINDERS_KEY);
  if(!raw) return fallback;
  return { ...fallback, ...JSON.parse(raw) };
 } catch(e){
  return fallback;
 }
}

function saveReminderSettings(settings){
 try {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(settings));
 } catch(e){}
}

function updateReminderInputsState(){
 const mCheck = document.getElementById('reminderMorningCheck');
 const mTime = document.getElementById('reminderMorningTime');
 if(mCheck && mTime) mTime.disabled = !mCheck.checked;
 
 const nCheck = document.getElementById('reminderNightCheck');
 const nTime = document.getElementById('reminderNightTime');
 if(nCheck && nTime) nTime.disabled = !nCheck.checked;

 const masterBtn = document.getElementById('reminderMasterToggleBtn');
 if(masterBtn){
  const anyOn = (mCheck?.checked || nCheck?.checked);
  masterBtn.textContent = anyOn ? 'Turn off all' : 'Turn on both';
 }
}

function toggleAllReminders(){
 const mCheck = document.getElementById('reminderMorningCheck');
 const nCheck = document.getElementById('reminderNightCheck');
 const anyOn = (mCheck?.checked || nCheck?.checked);
 if(mCheck) mCheck.checked = !anyOn;
 if(nCheck) nCheck.checked = !anyOn;
 updateReminderInputsState();
}

function updateReminderPermBox(){
 const alertBox = document.getElementById('reminderPermAlert');
 const alertText = document.getElementById('reminderPermText');
 if(!alertBox) return;

 if(!('Notification' in window)){
  alertBox.style.display = 'block';
  if(alertText) alertText.textContent = 'Notifications are not supported on this browser';
  alertBox.querySelector('.reminder-perm-btn').style.display = 'none';
  return;
 }

 if(Notification.permission === 'granted'){
  alertBox.style.display = 'none';
 } else if(Notification.permission === 'denied'){
  alertBox.style.display = 'block';
  if(alertText) alertText.textContent = 'Notifications blocked in browser · Allow in site settings';
  alertBox.querySelector('.reminder-perm-btn').style.display = 'none';
 } else {
  alertBox.style.display = 'flex';
  if(alertText) alertText.textContent = 'Allow browser notifications for daily reminders';
  alertBox.querySelector('.reminder-perm-btn').style.display = 'inline-block';
 }
}

function updateReminderUI(){
 const s = getReminderSettings();
 const dot = document.getElementById('reminderStatusDot');
 const isAnyActive = s.enabled && (s.morningEnabled || s.nightEnabled);
 if(dot){
  if(isAnyActive && ('Notification' in window && Notification.permission === 'granted')){
   dot.classList.add('active');
  } else {
   dot.classList.remove('active');
  }
 }
 const summaryEl = document.getElementById('progressReminderSummary');
 if(summaryEl){
  if(!isAnyActive){
   summaryEl.textContent = 'Reminders are paused';
  } else {
   const parts = [];
   if(s.morningEnabled) parts.push(`Morning ${s.morningTime}`);
   if(s.nightEnabled) parts.push(`Night ${s.nightTime}`);
   summaryEl.textContent = parts.join(' · ');
  }
 }
}

function openRemindersModal(){
 const s = getReminderSettings();
 const mCheck = document.getElementById('reminderMorningCheck');
 const mTime = document.getElementById('reminderMorningTime');
 const nCheck = document.getElementById('reminderNightCheck');
 const nTime = document.getElementById('reminderNightTime');
 
 if(mCheck) mCheck.checked = !!s.morningEnabled;
 if(mTime) mTime.value = s.morningTime || '08:30';
 if(nCheck) nCheck.checked = !!s.nightEnabled;
 if(nTime) nTime.value = s.nightTime || '21:30';

 updateReminderInputsState();
 updateReminderPermBox();

 const modal = document.getElementById('remindersModal');
 const backdrop = document.getElementById('remindersModalBackdrop');
 if(modal) modal.classList.add('open');
 if(backdrop) backdrop.classList.add('open');
 pushModalHistory('modal');
}

function closeRemindersModal(){
 document.getElementById('remindersModal')?.classList.remove('open');
 document.getElementById('remindersModalBackdrop')?.classList.remove('open');
}

async function requestReminderPermission(){
 if(!('Notification' in window)){
  toast('Notifications not supported in this browser');
  return false;
 }
 try {
  const perm = await Notification.requestPermission();
  updateReminderPermBox();
  updateReminderUI();
  if(perm === 'granted'){
   toast('Notification permission enabled ✿');
   return true;
  } else {
   toast('Notification permission not granted');
   return false;
  }
 } catch(e){
  return false;
 }
}

async function sendSystemNotification(title, body, tag){
 if(!('Notification' in window)) return false;
 if(Notification.permission !== 'granted') return false;
 
 const notifOptions = {
  body,
  tag: tag || 'morrow-notification',
  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌱</text></svg>',
  badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌱</text></svg>',
  data: {
   url: window.location.href,
   timestamp: Date.now()
  }
 };

 try {
  if('serviceWorker' in navigator){
   const reg = await navigator.serviceWorker.ready;
   if(reg && reg.showNotification){
    await reg.showNotification(title, notifOptions);
    return true;
   }
  }
 } catch(e){}

 try {
  const notif = new Notification(title, notifOptions);
  notif.onclick = function(event){
   try {
    event.preventDefault();
    window.focus();
    if(typeof showView === 'function') showView('today');
   } catch(err){}
   notif.close();
  };
  return true;
 } catch(e){
  return false;
 }
}

async function sendTestNotification(){
 if(!('Notification' in window)){
  toast('Notifications not supported in this browser');
  return;
 }
 if(Notification.permission !== 'granted'){
  const ok = await requestReminderPermission();
  if(!ok) return;
 }
 const dueCount = topics.filter(t => !t.done && !t.graduated && !t.paused && t.dueAt <= Date.now()).length;
 const sent = await sendSystemNotification(
  'Morrow · Test Reminder ☀️',
  `This is how your daily reminders will look! (${dueCount} topic${dueCount === 1 ? '' : 's'} waiting today)`,
  'test-reminder'
 );
 if(sent){
  toast('Test notification sent ✿');
 } else {
  toast('Could not send notification · check site settings');
 }
}

async function saveRemindersSettingsFromModal(){
 const mCheck = document.getElementById('reminderMorningCheck')?.checked;
 const mTime = document.getElementById('reminderMorningTime')?.value || '08:30';
 const nCheck = document.getElementById('reminderNightCheck')?.checked;
 const nTime = document.getElementById('reminderNightTime')?.value || '21:30';
 const enabled = !!(mCheck || nCheck);

 const s = getReminderSettings();
 s.enabled = enabled;
 s.morningEnabled = !!mCheck;
 s.morningTime = mTime;
 s.nightEnabled = !!nCheck;
 s.nightTime = nTime;
 saveReminderSettings(s);
 updateReminderUI();
 closeRemindersModal();

 if(enabled && ('Notification' in window) && Notification.permission !== 'granted'){
  requestReminderPermission();
 } else if(enabled){
  toast('Daily reminders saved ✿');
 } else {
  toast('Reminders paused ✿');
 }
}

function checkScheduledReminders(){
 const s = getReminderSettings();
 if(!s.enabled) return;
 if(!('Notification' in window) || Notification.permission !== 'granted') return;

 const now = new Date();
 const todayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
 const currentHM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

 // Morning check: between morningTime and 13:00
 if(s.morningEnabled && s.lastMorningDate !== todayKey && currentHM >= s.morningTime && currentHM < '13:00'){
  const dueCount = topics.filter(t => !t.done && !t.graduated && !t.paused && t.dueAt <= Date.now()).length;
  const body = dueCount > 0
   ? `Good morning ✿ You have ${dueCount} topic${dueCount === 1 ? '' : 's'} waiting for revision today.`
   : `Good morning ✿ Your garden is all caught up and resting peacefully.`;
  sendSystemNotification('Morrow · Morning Garden ☀️', body, 'morning-reminder');
  s.lastMorningDate = todayKey;
  saveReminderSettings(s);
 }

 // Night check: from nightTime onwards
 if(s.nightEnabled && s.lastNightDate !== todayKey && currentHM >= s.nightTime){
  const dueCount = topics.filter(t => !t.done && !t.graduated && !t.paused && t.dueAt <= Date.now()).length;
  const body = dueCount > 0
   ? `Good evening ✿ Don't forget to mark your ${dueCount} topic${dueCount === 1 ? '' : 's'} done for today.`
   : `Good evening ✿ All topics revised for today! Rest well and enjoy the quiet.`;
  sendSystemNotification('Morrow · Evening Check-in 🌙', body, 'night-reminder');
  s.lastNightDate = todayKey;
  saveReminderSettings(s);
 }
}

// Register service worker and handle notification clicks
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('sw.js').then((reg)=>{
  try { reg.update(); } catch(e){}
 }).catch(()=>{});

 navigator.serviceWorker.addEventListener('message', (event) => {
  if(event.data && event.data.type === 'NOTIFICATION_OPEN_APP'){
   try {
    window.focus();
    if(typeof showView === 'function') showView('today');
   } catch(e){}
  }
 });
}

// Background reminder timer & visibility hook
setInterval(checkScheduledReminders, 30000);
document.addEventListener('visibilitychange', () => {
 if(!document.hidden) checkScheduledReminders();
});
setTimeout(checkScheduledReminders, 2500);


/* Edit Subject (Name & Theme/Biome) and Edit Topic Name */
let editingSubjectOriginalName = null;
let selectedEditBiomeId = 'auto';

function renderEditBiomePicker(){
 const grid = document.getElementById('editBiomePickerGrid');
 if(!grid) return;
 const items = [
  { id: 'auto', icon: '✨', label: 'Auto-match', dot: '#829477' },
  ...BIOME_ARCHETYPES.map(a => ({ id: a.id, icon: a.icon, label: a.label, dot: a.dot }))
 ];
 grid.innerHTML = items.map(item => `
  <button type="button"
   class="biome-opt ${selectedEditBiomeId === item.id ? 'selected' : ''}"
   onclick="selectEditSubjectBiome('${item.id}')">
   <span class="biome-opt-swatch" style="background:${item.dot}"></span>
   <span>${item.icon} ${escapeHtml(item.label)}</span>
  </button>
 `).join('');
}

function selectEditSubjectBiome(id){
 selectedEditBiomeId = id;
 renderEditBiomePicker();
}

function promptEditSubject(subject){
 if(!subject) return;
 editingSubjectOriginalName = subject;
 const m = currentMission();
 const input = document.getElementById('editSubjectNameInput');
 if(input) input.value = subject;
 
 selectedEditBiomeId = (m.subjectBiomes && m.subjectBiomes[subject]) ? m.subjectBiomes[subject] : 'auto';
 renderEditBiomePicker();

 const modal = document.getElementById('subjectEditModal');
 const backdrop = document.getElementById('subjectEditBackdrop');
 if(modal) modal.classList.add('open');
 if(backdrop) backdrop.classList.add('open');
 pushModalHistory('modal');
}

function closeSubjectEditModal(){
 editingSubjectOriginalName = null;
 document.getElementById('subjectEditModal')?.classList.remove('open');
 document.getElementById('subjectEditBackdrop')?.classList.remove('open');
}

function submitEditSubject(e){
 if(e) e.preventDefault();
 if(!editingSubjectOriginalName) return;
 const oldName = editingSubjectOriginalName;
 const input = document.getElementById('editSubjectNameInput');
 const newName = input ? input.value.trim() : '';
 if(!newName){
  toast('Please enter a subject name');
  return;
 }
 
 const m = currentMission();
 if(!Array.isArray(m.subjects)) m.subjects = [];
 
 if(newName.toLowerCase() !== oldName.toLowerCase()){
  const exists = m.subjects.some(s => s.toLowerCase() === newName.toLowerCase());
  if(exists){
   toast(`Subject "${newName}" already exists`);
   return;
  }
  const idx = m.subjects.findIndex(s => s.toLowerCase() === oldName.toLowerCase());
  if(idx !== -1) m.subjects[idx] = newName;
  else m.subjects.push(newName);

  topics.forEach(t => {
   if((t.subject || '').trim().toLowerCase() === oldName.toLowerCase()){
    t.subject = newName;
   }
  });

  m.subjectBiomes = m.subjectBiomes || {};
  if(m.subjectBiomes[oldName]){
   delete m.subjectBiomes[oldName];
  }
  if(lastSelectedSubject === oldName) lastSelectedSubject = newName;
 }

 m.subjectBiomes = m.subjectBiomes || {};
 if(selectedEditBiomeId !== 'auto'){
  m.subjectBiomes[newName] = selectedEditBiomeId;
 } else {
  delete m.subjectBiomes[newName];
 }

 localStorage.setItem('morrowMissions', JSON.stringify(missions));
 closeSubjectEditModal();
 save();
 render();
 syncMissionUI();
 if(window.onGardenOpen) window.onGardenOpen();
 toast(`Subject "${newName}" updated ✿`);
}

let editingTopicId = null;

function promptEditTopicName(id){
 const t = topics.find(x => x.id === id);
 if(!t) return;
 editingTopicId = id;
 const nameInput = document.getElementById('editTopicNameInput');
 if(nameInput) nameInput.value = t.name;

 const sel = document.getElementById('editTopicSubjectSelect');
 if(sel){
  const m = currentMission();
  const subjectSet = new Set([...(m.subjects || []), ...topics.map(x => x.subject).filter(Boolean)]);
  if(!subjectSet.size) subjectSet.add('General');
  sel.innerHTML = Array.from(subjectSet).map(s => `<option value="${escapeHtml(s)}" ${s === t.subject ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
 }

 const modal = document.getElementById('topicEditModal');
 const backdrop = document.getElementById('topicEditBackdrop');
 if(modal) modal.classList.add('open');
 if(backdrop) backdrop.classList.add('open');
 pushModalHistory('modal');
}

function closeTopicEditModal(){
 editingTopicId = null;
 document.getElementById('topicEditModal')?.classList.remove('open');
 document.getElementById('topicEditBackdrop')?.classList.remove('open');
}

function submitEditTopic(e){
 if(e) e.preventDefault();
 if(!editingTopicId) return;
 const t = topics.find(x => x.id === editingTopicId);
 if(!t) return;
 const nameInput = document.getElementById('editTopicNameInput');
 const newName = nameInput ? nameInput.value.trim() : '';
 if(!newName){
  toast('Please enter a topic title');
  return;
 }
 const sel = document.getElementById('editTopicSubjectSelect');
 const newSubject = sel ? sel.value : t.subject;

 t.name = newName;
 t.subject = newSubject || 'General';

 closeTopicEditModal();
 save();
 render();
 if(currentId === t.id && document.getElementById('review').classList.contains('active')){
  openTopic(t.id, false);
 }
 toast(`Updated topic "${newName}" ✿`);
}
