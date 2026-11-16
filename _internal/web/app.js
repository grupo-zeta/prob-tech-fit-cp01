'use strict';
const $ = id => document.getElementById(id);
let isWidgetMode = false;
function centerCompassoWindow(){
 try {
  if (isWidgetMode) return;
  if (window.screen && screen.availWidth) {
   const mode = document.body.dataset.layout || 'split';
   const desiredW = mode === 'stack' ? 780 : 980;
   const targetW = Math.min(desiredW, screen.availWidth - 40);
   const targetH = Math.min(820, screen.availHeight - 60);
   const left = Math.max(0, Math.round((screen.availWidth - targetW) / 2));
   const top = Math.max(0, Math.round((screen.availHeight - targetH) / 2));
   window.resizeTo(targetW, targetH);
   window.moveTo(left, top);
  }
 } catch(_) {}
}
function applyLayoutMode(mode, shouldResize = false) {
 const valid = ['split', 'hero', 'stack'].includes(mode) ? mode : 'split';
 document.body.dataset.layout = valid;
 try { localStorage.setItem('compasso.layoutMode', valid); } catch(_) {}
 document.querySelectorAll('.layout-btn').forEach(b => {
  b.classList.toggle('active', b.dataset.layoutMode === valid);
 });
 if (shouldResize) centerCompassoWindow();
}
function syncActiveFeaturePills() {
 const cam = $('cameraAuto')?.checked ?? true;
 const smt = $('smartphoneAlertEnabled')?.checked ?? true;
 const sng = $('singleWindowEnabled')?.checked ?? true;
 const cap = $('captureEnabled')?.checked ?? true;
 const grd = Boolean($('guardEnabled')?.checked && state?.context?.extension_connected);
 const prov = $('analysisProvider')?.value || 'local';
 const ai = prov !== 'local' && ($('aiAuto')?.checked ?? false);
 const modelName = ($('localModel')?.value || 'llama3:8b').trim() || 'llama3:8b';
 const intervalVal = $('captureInterval')?.value || '60';
 const intervalLabel = intervalVal === '30' ? '30s' : intervalVal === '120' ? '2m' : '1m';
 const setPill = (id, on, textOn, textOff) => {
  const el = $(id);
  if (!el) return;
  el.className = on ? 'pill-on' : 'pill-off';
  el.textContent = on ? textOn : textOff;
 };
 setPill('pillCamera', cam, 'C\u00E2mera', 'Sem c\u00E2mera');
 setPill('pillSmartphone', smt, 'Anti-smartphone', 'Sem alerta olhar');
 setPill('pillSingleWin', sng, 'Janela \u00FAnica', 'Multijanela');
 setPill('pillCapture', cap, 'Capturas (' + intervalLabel + ')', 'Sem capturas');
 setPill('pillGuard', grd, 'Bloqueio web', 'Sem bloqueio');
 setPill('pillAi', prov === 'local' || ai, prov === 'local' ? 'Local' : modelName, 'IA manual');
}
try {
 applyLayoutMode(localStorage.getItem('compasso.layoutMode') || 'split', false);
} catch(_) {
 applyLayoutMode('split', false);
}
document.querySelectorAll('.layout-btn').forEach(btn => {
 btn.onclick = () => applyLayoutMode(btn.dataset.layoutMode, true);
});
for (const id of ['cameraAuto', 'smartphoneAlertEnabled', 'singleWindowEnabled', 'captureEnabled', 'guardEnabled', 'aiAuto', 'captureInterval', 'localModel']) {
 $(id)?.addEventListener('change', syncActiveFeaturePills);
 $(id)?.addEventListener('input', syncActiveFeaturePills);
}
syncActiveFeaturePills();
centerCompassoWindow();
window.addEventListener('load', () => { syncActiveFeaturePills(); centerCompassoWindow(); });
setTimeout(centerCompassoWindow, 250);
setTimeout(centerCompassoWindow, 750);
document.addEventListener('click', e => {
 if (e.target.tagName === 'DIALOG' && e.target.open) {
  const rect = e.target.getBoundingClientRect();
  const inDialog = (rect.top <= e.clientY && e.clientY <= rect.bottom && rect.left <= e.clientX && e.clientX <= rect.right);
  if (!inDialog) e.target.close();
 }
});
let gadgetHandsUseSession = false;
function initWin7ClockTicks() {
 const g = $('gadgetTicks');
 if (!g || g.childNodes.length) return;
 const ns = 'http://www.w3.org/2000/svg';
 for (let i = 0; i < 60; i++) {
  if (i % 15 === 0) continue; // 12, 3, 6, 9 have numbers
  const isHour = i % 5 === 0;
  const angle = (i * 6 - 90) * (Math.PI / 180);
  const rOuter = 86;
  const rInner = isHour ? 77 : 82;
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', (110 + rInner * Math.cos(angle)).toFixed(2));
  line.setAttribute('y1', (110 + rInner * Math.sin(angle)).toFixed(2));
  line.setAttribute('x2', (110 + rOuter * Math.cos(angle)).toFixed(2));
  line.setAttribute('y2', (110 + rOuter * Math.sin(angle)).toFixed(2));
  line.setAttribute('stroke', isHour ? '#d1d5db' : '#4b5563');
  line.setAttribute('stroke-width', isHour ? '2' : '1');
  g.appendChild(line);
 }
}
function updateWin7ClockGadget() {
 initWin7ClockTicks();
 const now = new Date();
 const elapsed = Math.max(0, Number(state?.elapsed || 0));
 const active = !!state?.active;
 const paused = !!state?.paused;
 const goal = active ? (state.active.goal || 0) : (typeof getGoal === 'function' ? getGoal() : 50);

 let hDeg = 0, mDeg = 0, sDeg = 0;
 if (gadgetHandsUseSession) {
  const s = elapsed % 60;
  const m = (elapsed / 60) % 60;
  const h = (elapsed / 3600) % 12;
  sDeg = s * 6;
  mDeg = m * 6;
  hDeg = h * 30;
 } else {
  const s = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  sDeg = s * 6;
  mDeg = m * 6;
  hDeg = h * 30;
 }
 if ($('gadgetHourHand')) $('gadgetHourHand').setAttribute('transform', `rotate(${hDeg.toFixed(2)} 110 110)`);
 if ($('gadgetMinHand')) $('gadgetMinHand').setAttribute('transform', `rotate(${mDeg.toFixed(2)} 110 110)`);
 if ($('gadgetSecHand')) $('gadgetSecHand').setAttribute('transform', `rotate(${sDeg.toFixed(2)} 110 110)`);
 if ($('gadgetModeLabel')) $('gadgetModeLabel').textContent = gadgetHandsUseSession ? 'DURAÇÃO' : 'HORA LOCAL';
 if ($('gadgetTimer')) {
  $('gadgetTimer').textContent = gadgetHandsUseSession && typeof clock === 'function'
   ? clock(elapsed)
   : now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
 }
 if ($('gadgetStatus')) {
  const isHobby = typeof auto !== 'undefined' && auto.kind === 'hobby';
  const st = !active ? 'AGUARDANDO' : (paused ? 'PAUSADA' : (isHobby ? 'HOBBY · SILENC.' : 'IA ATIVA'));
  $('gadgetStatus').textContent = st;
 }
 if ($('gadgetProgressArc')) {
  const circum = 571.77;
  const riskVal = typeof auto !== 'undefined' && typeof predictRisk === 'function' && active ? (predictRisk(Date.now()).risk / 100) : 0;
  const ratio = goal > 0 ? Math.min(1, elapsed / (goal * 60)) : (active ? Math.max(0.12, riskVal) : 0);
  $('gadgetProgressArc').style.strokeDashoffset = (circum * (1 - ratio)).toFixed(2);
 }
 if ($('gadgetToggleRun')) {
  $('gadgetToggleRun').textContent = !active ? 'Ativar' : (paused ? 'Retomar' : 'Pausar');
 }
 if ($('gadgetFinish')) {
  $('gadgetFinish').disabled = !active;
 }
 if ($('gadgetCancel')) {
  $('gadgetCancel').disabled = !active;
 }
}
function toggleGadgetHandsMode() {
 gadgetHandsUseSession = !gadgetHandsUseSession;
 updateWin7ClockGadget();
}
function setWidgetMode(enable) {
 isWidgetMode = Boolean(enable);
 document.body.classList.toggle('widget-mode', isWidgetMode);
 const lbl = $('widgetToggleLabel');
 if (lbl) lbl.textContent = isWidgetMode ? 'Expandir' : 'Rel\u00F3gio';
 else if ($('widgetToggle')) $('widgetToggle').textContent = isWidgetMode ? 'Expandir' : 'Rel\u00F3gio';
 updateWin7ClockGadget();
 try {
  if (window.screen && screen.availWidth) {
   if (isWidgetMode) {
    const gw = 286, gh = 368;
    window.resizeTo(gw, gh);
    window.moveTo(Math.max(0, screen.availWidth - gw - 20), 20);
    if (!pinned && token) {
     pinned = true;
     api('pin').catch(() => {});
     if ($('pin')) $('pin').textContent = 'Fixado';
    }
   } else {
    centerCompassoWindow();
   }
  }
 } catch(_) {}
}
function toggleWidgetMode() {
 setWidgetMode(!isWidgetMode);
}
if ($('widgetToggle')) $('widgetToggle').onclick = toggleWidgetMode;
if ($('gadgetExpand')) $('gadgetExpand').onclick = toggleWidgetMode;
if ($('gadgetRestoreBtn')) $('gadgetRestoreBtn').onclick = toggleWidgetMode;
if ($('gadgetHandsMode')) $('gadgetHandsMode').onclick = toggleGadgetHandsMode;
if ($('gadgetDialClick')) $('gadgetDialClick').onclick = toggleGadgetHandsMode;
setInterval(updateWin7ClockGadget, 250);

let tutorialStep = 0;
const totalTutorialSteps = 4;
function showTutorialStep(idx) {
 tutorialStep = Math.max(0, Math.min(totalTutorialSteps - 1, idx));
 document.querySelectorAll('.tutorial-slide').forEach((s, i) => s.classList.toggle('active', i === tutorialStep));
 document.querySelectorAll('.tutorial-dot').forEach((d, i) => d.classList.toggle('active', i === tutorialStep));
 if ($('tutorialPrev')) $('tutorialPrev').disabled = (tutorialStep === 0);
 if ($('tutorialNext')) {
  $('tutorialNext').textContent = (tutorialStep === totalTutorialSteps - 1) ? 'Concluir' : 'Pr\u00F3ximo';
 }
}
function openTutorial() {
 document.querySelectorAll('dialog[open]').forEach(d => {
  if (d.id !== 'tutorialDialog') d.close();
 });
 showTutorialStep(0);
 const dlg = $('tutorialDialog');
 if (!dlg) return;
 if (!dlg.open) dlg.showModal();
}
if ($('openTutorial')) {
 $('openTutorial').type = 'button';
 $('openTutorial').onclick = openTutorial;
}
if ($('closeTutorial')) $('closeTutorial').onclick = () => $('tutorialDialog')?.close();
if ($('tutorialPrev')) $('tutorialPrev').onclick = () => showTutorialStep(tutorialStep - 1);
if ($('tutorialNext')) $('tutorialNext').onclick = () => {
 if (tutorialStep >= totalTutorialSteps - 1) {
  localStorage.setItem('compasso.tutorialSeen', 'true');
  $('tutorialDialog').close();
 } else {
  showTutorialStep(tutorialStep + 1);
 }
};

let breatheTimer = null, breatheSec = 4, breathePhaseIdx = 0;
const breathePhases = [
 { label: 'Inspirar', cls: 'inhale' },
 { label: 'Segurar', cls: 'hold' },
 { label: 'Expirar', cls: 'exhale' }
];
function stopBreatheCycle() {
 if (breatheTimer) { clearInterval(breatheTimer); breatheTimer = null; }
 const circle = $('breatheCircle');
 if (circle) circle.className = 'breathe-circle';
 if ($('breathePhase')) $('breathePhase').textContent = 'Inspirar';
 if ($('breatheCount')) $('breatheCount').textContent = '4s';
 if ($('toggleBreatheRun')) $('toggleBreatheRun').textContent = 'Iniciar ciclo';
}
function tickBreatheDisplay() {
 const phase = breathePhases[breathePhaseIdx];
 const circle = $('breatheCircle');
 if (circle) circle.className = 'breathe-circle ' + phase.cls;
 if ($('breathePhase')) $('breathePhase').textContent = phase.label;
 if ($('breatheCount')) $('breatheCount').textContent = breatheSec + 's';
}
function toggleBreatheCycle() {
 if (breatheTimer) {
  stopBreatheCycle();
  return;
 }
 breathePhaseIdx = 0;
 breatheSec = 4;
 if ($('toggleBreatheRun')) $('toggleBreatheRun').textContent = 'Pausar';
 tickBreatheDisplay();
 breatheTimer = setInterval(() => {
  breatheSec--;
  if (breatheSec <= 0) {
   breathePhaseIdx = (breathePhaseIdx + 1) % breathePhases.length;
   breatheSec = 4;
  }
  tickBreatheDisplay();
 }, 1000);
}
function openBreatheDialog() {
 stopBreatheCycle();
 if ($('breatheDialog') && !$('breatheDialog').open && !document.querySelector('dialog[open]')) {
  $('breatheDialog').showModal();
 }
 toggleBreatheCycle();
}
if ($('breatheToggle')) $('breatheToggle').onclick = openBreatheDialog;
if ($('gadgetBreathe')) $('gadgetBreathe').onclick = openBreatheDialog;
if ($('openBreatheFromInsights')) $('openBreatheFromInsights').onclick = openBreatheDialog;
if ($('toggleBreatheRun')) $('toggleBreatheRun').onclick = toggleBreatheCycle;
for (const id of ['closeBreathe', 'doneBreathe']) {
 if ($(id)) $(id).onclick = () => { stopBreatheCycle(); $('breatheDialog')?.close(); };
}
if ($('breatheDialog')) $('breatheDialog').addEventListener('close', stopBreatheCycle);

let authMode = 'login';
function getSavedAccounts() {
 try {
  const raw = localStorage.getItem('compasso.accounts');
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
 } catch(_) { return []; }
}
function saveAccountToStorage(acc) {
 try {
  const list = getSavedAccounts().filter(x => x.email?.toLowerCase() !== acc.email?.toLowerCase());
  list.unshift(acc);
  localStorage.setItem('compasso.accounts', JSON.stringify(list.slice(0, 8)));
 } catch(_) {}
}
function renderSavedAccountChips() {
 const box = $('authSavedProfiles');
 if (!box) return;
 const list = getSavedAccounts();
 if (!list.length || authMode !== 'login') {
  box.hidden = true;
  box.replaceChildren();
  return;
 }
 box.hidden = false;
 box.replaceChildren(...list.map(acc => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'auth-profile-chip';
  b.textContent = `${acc.name || acc.email} · IA contínua`;
  b.onclick = () => {
   if ($('authEmail')) $('authEmail').value = acc.email || '';
   if ($('authName')) $('authName').value = acc.name || '';
   if ($('authPassword')) $('authPassword').value = acc.pass || 'compasso42';
   enterCompassoApp(acc);
  };
  return b;
 }));
}
function setAuthTab(mode) {
 authMode = mode === 'register' ? 'register' : 'login';
 document.querySelectorAll('.auth-tab').forEach(t => {
  t.classList.toggle('active', t.dataset.authTab === authMode);
 });
 const isReg = (authMode === 'register');
 if ($('authNameWrap')) $('authNameWrap').hidden = !isReg;
 if ($('authPresetWrap')) $('authPresetWrap').hidden = !isReg;
 if ($('authSubmit')) {
  $('authSubmit').textContent = isReg ? 'Criar perfil e entrar' : 'Entrar';
 }
 if ($('authError')) $('authError').hidden = true;
 if ($('authSuccess')) $('authSuccess').hidden = true;
 renderSavedAccountChips();
 if (isReg && $('authName')) setTimeout(() => $('authName')?.focus(), 40);
}
document.querySelectorAll('.auth-tab').forEach(btn => {
 btn.onclick = () => setAuthTab(btn.dataset.authTab);
});
function enterCompassoApp(user, isNewProfile = false) {
 const displayName = (user?.name || user?.email?.split('@')[0] || 'Voc\u00EA').trim();
 const shortName = displayName.split(/\s+/)[0] || 'Perfil';
 if ($('userBadgeName')) $('userBadgeName').textContent = shortName;
 if ($('logoutBtn')) $('logoutBtn').title = `Conectado como ${displayName}. Clique para trocar ou criar perfil`;
 if ($('aiAutopilot')?.checked) {
  if (typeof window.setCompassoGoal === 'function') window.setCompassoGoal(0);
 } else if (user?.preset && typeof window.setCompassoGoal === 'function') {
  window.setCompassoGoal(Number(user.preset) || 0);
 } else if (user?.preset && $('goal')) {
  $('goal').value = String(user.preset);
 }
 document.body.classList.remove('auth-active');
 const qParams = new URLSearchParams(location.search);
 const openAsWidget = !qParams.has('panel') && (qParams.has('startup') || saved('compasso.widgetOnStartup', true));
 if (openAsWidget) setWidgetMode(true);
 else centerCompassoWindow();
 if (isNewProfile) {
  notify(`Perfil "${displayName}" criado e ativado. A partir de agora o Compasso inicia sozinho com o Windows.`);
 }
 if (state) updateCognitiveTwinMentor();
}
try {
 if ($('widgetOnStartup')) {
  $('widgetOnStartup').checked = saved('compasso.widgetOnStartup', true);
  $('widgetOnStartup').onchange = () => localStorage.setItem('compasso.widgetOnStartup', JSON.stringify($('widgetOnStartup').checked));
 }
 if ($('aiAutopilot')) {
  $('aiAutopilot').checked = saved('compasso.aiAutopilot', true);
  $('aiAutopilot').onchange = () => {
   localStorage.setItem('compasso.aiAutopilot', JSON.stringify($('aiAutopilot').checked));
   if ($('aiAutopilot').checked) { jarvisBooted = false; auto.greeted = false; updateCognitiveTwinMentor(); }
   else if ($('twinConfidenceBadge')) $('twinConfidenceBadge').textContent = 'Copiloto pausado';
  };
 }
 if ($('jarvisVoiceEnabled')) {
  $('jarvisVoiceEnabled').checked = saved('compasso.jarvisVoice', true);
  $('jarvisVoiceEnabled').onchange = () => localStorage.setItem('compasso.jarvisVoice', JSON.stringify($('jarvisVoiceEnabled').checked));
 }
 const savedUserRaw = localStorage.getItem('compasso.authUser');
 if (savedUserRaw) {
  const savedUser = JSON.parse(savedUserRaw);
  if ($('authEmail') && savedUser.email) $('authEmail').value = savedUser.email;
  if ($('authName') && savedUser.name) $('authName').value = savedUser.name;
  if (savedUser.remember !== false) setTimeout(() => enterCompassoApp(savedUser), 0);
 } else if (new URLSearchParams(location.search).has('startup')) {
  setTimeout(() => enterCompassoApp({ name: 'Usuário', email: 'local@compasso', preset: 0, remember: true }), 0);
 }
 renderSavedAccountChips();
} catch(_) {}
if ($('authDemoFill')) $('authDemoFill').onclick = () => {
 if ($('authName')) $('authName').value = 'Igor Santos';
 if ($('authEmail')) $('authEmail').value = 'igor@ufrpe.br';
 if ($('authPassword')) $('authPassword').value = 'compasso42';
 if ($('authError')) $('authError').hidden = true;
};
if ($('authQuick')) $('authQuick').onclick = () => {
 const user = {
  name: $('authName')?.value?.trim() || 'Igor Santos',
  email: $('authEmail')?.value?.trim() || 'local@ufrpe.br',
  preset: 0
 };
 try { localStorage.setItem('compasso.authUser', JSON.stringify(user)); } catch(_) {}
 saveAccountToStorage(user);
 enterCompassoApp(user, authMode === 'register');
};
if ($('authForm')) $('authForm').onsubmit = e => {
 e.preventDefault();
 const email = $('authEmail')?.value?.trim() || '';
 const pass = $('authPassword')?.value || '';
 const rawName = $('authName')?.value?.trim() || '';
 if ($('authError')) $('authError').hidden = true;
 if ($('authSuccess')) $('authSuccess').hidden = true;
 if (authMode === 'register' && !rawName) {
  if ($('authError')) {
   $('authError').textContent = 'Informe seu nome para criar o perfil.';
   $('authError').hidden = false;
  }
  return;
 }
 if (!email || pass.length < 3) {
  if ($('authError')) {
   $('authError').textContent = 'Informe seu e-mail ou identificador e uma senha de pelo menos 3 caracteres.';
   $('authError').hidden = false;
  }
  return;
 }
 const existing = getSavedAccounts().find(x => x.email?.toLowerCase() === email.toLowerCase());
 const name = rawName || existing?.name || email.split('@')[0] || 'Usu\u00E1rio';
 const user = { name, email, pass, preset: 0, remember: !!$('authRemember')?.checked };
 saveAccountToStorage(user);
 try {
  if (user.remember) localStorage.setItem('compasso.authUser', JSON.stringify(user));
  else localStorage.removeItem('compasso.authUser');
 } catch(_) {}
 renderSavedAccountChips();
 enterCompassoApp(user, authMode === 'register');
};
if ($('logoutBtn')) $('logoutBtn').onclick = () => {
 if (isWidgetMode) toggleWidgetMode();
 renderSavedAccountChips();
 document.body.classList.add('auth-active');
};
const colors={focus:'#2fb380',study:'#4c7ef3',neutral:'#8b909a',distraction:'#e55353',mixed:'#8b909a'};
const labels={focus:'Foco',study:'Leitura',neutral:'Neutro',distraction:'Distração',mixed:'Misto'};
let state=null, report=null, token='', tab='focus', pinned=false, suggested=25, stream=null, model=null, cameraOn=false, cameraManual=false, cameraStarting=false, cameraFrameErrors=0, videoVisible=true, cameraGeneration=0;
let calibrated=null, lastCameraSend=0, blinkClosed=false, blinkCount=0, totalBlinks=0, lastLandmarks=null, cameraBusy=false;
let calibrationRun=null, classificationContext=null, liveClassificationTarget=null, blinkStarted=0;
let calibrationPrompted=false;
let calibrationKey=null,calibrationStored=false,autoCalibrationSamples=[],lastRaw=null;
const medianValue=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
function calibrationStorage(){try{return window.localStorage;}catch{return null;}}
function showCalibrationSaved(){
 $('calibrationSaved').hidden=!calibrationStored;
 $('calibrate').textContent=calibrated?'Recalibrar':'Calibrar';
}
let expandedApps=false,expandedWindows=false,listDay=null;
const gazeLabels={center:'Centro',left:'Esquerda',right:'Direita',up:'Acima',down:'Abaixo'};
const degrees=value=>value==null?'sem leitura':`${Math.round(value)}°`;
const duration = value => {const s=Math.max(0,Math.floor(value||0));return s>=60?`${Math.floor(s/60)}m ${s%60}s`:`${s}s`;};
const clock = value => {const s=Math.floor(value||0);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');};
const pct = (a,b) => b?Math.round(100*a/b):0;
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(text){$('notice').textContent=text;$('notice').hidden=false;}
async function api(action,data={},keepalive=false){
 const r=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Compasso-Token':token},body:JSON.stringify(data),keepalive});
 const result=await r.json();if(!r.ok)throw Error(result.error||'Falha no servidor');return result;
}
function safe(fn){return async()=>{try{await fn();}catch(e){notify(e.message);}};}
function setTab(name){tab=name;document.querySelectorAll('.page').forEach(e=>e.hidden=e.id!==name);document.querySelectorAll('nav button').forEach(e=>e.classList.toggle('selected',e.dataset.tab===name));if(name!=='focus')loadReport().catch(e=>notify(e.message));}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function saved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function projects(){const names=[...new Set([...CompassoPresets.items.map(p=>p.name),...saved('compasso.projects',[])])];$('project').replaceChildren(...names.map(n=>new Option(n,n)));}
projects();$('dailyGoal').value=saved('compasso.dailyGoal',120);
$('dailyGoal').onchange=()=>{const v=Math.min(1440,Math.max(1,Number($('dailyGoal').value)||120));$('dailyGoal').value=v;localStorage.setItem('compasso.dailyGoal',JSON.stringify(v));renderReport();};
$('addProject').onclick=()=>{$('projectName').value='';$('projectDialog').showModal();};
$('projectDialog').addEventListener('close',()=>{if($('projectDialog').returnValue!=='save')return;const name=$('projectName').value.trim();if(!name)return;const list=saved('compasso.projects',['Foco Geral']);if(!list.includes(name))list.push(name);localStorage.setItem('compasso.projects',JSON.stringify(list));projects();$('project').value=name;window.onCompassoProjectChanged?.();});
function getGoal(strict=false){const mode=$('goal').value;if(mode==='continuous')return 0;const value=Number(mode==='custom'?$('customGoal').value:mode);if(!Number.isInteger(value)||value<1||value>1440){if(strict)throw Error('Escolha de 1 a 1440 minutos, ou o modo contínuo.');return 0;}return value;}
$('start').onclick=safe(async()=>{await api('start',{project:$('project').value,goal:getGoal(true),...(window.contextStartOptions?.()||{})});await refresh();if($('cameraAuto').checked)await startCamera();});
$('pause').onclick=safe(async()=>{await api('pause');if(stream)stopCamera();await refresh();if(!state.paused&&$('cameraAuto').checked)await startCamera();});
$('finish').onclick=safe(async()=>{await api('finish');stopCamera();await refresh();notify('Sessão concluída. O histórico foi salvo no PC.');});
if($('gadgetToggleRun'))$('gadgetToggleRun').onclick=()=>{if(!state?.active)$('start').click();else $('pause').click();};
if($('gadgetFinish'))$('gadgetFinish').onclick=()=>$('finish').click();
if($('gadgetCancel'))$('gadgetCancel').onclick=()=>$('cancelSession').click();
$('cancelSession').onclick=safe(async()=>{if(!confirm('Cancelar esta sessão? O tempo, as capturas e os registros desta sessão serão descartados.'))return;await api('cancel');if(!cameraManual)stopCamera();await refresh();notify('Sessão cancelada. Você pode começar outra quando quiser.');});
$('category').onpointerdown=()=>{liveClassificationTarget={...state.live};};
$('category').onfocus=()=>{liveClassificationTarget={...state.live};};
$('category').onchange=safe(async()=>{const target=liveClassificationTarget||state.live;await api('classify',{scope:'window',app:target.app,title:target.window_title,category:$('category').value});liveClassificationTarget=null;await refresh();});
$('startup').onchange=safe(async()=>{try{await api('startup',{enabled:$('startup').checked});}catch(e){$('startup').checked=!$('startup').checked;throw e;}});
$('pin').onclick=safe(async()=>{pinned=!pinned;await api(pinned?'pin':'unpin');$('pin').textContent=pinned?'Fixado':'Fixar';$('pin').setAttribute('aria-pressed',pinned);});
$('web').onclick=()=>window.open(location.origin,'_blank','noopener');
for(const id of ['minimize','tray'])$(id).onclick=safe(async()=>{stopCamera();await api('minimize');});
let goalNotified=null, downwardGazeSince=0, lockedTaskApp=null;
function showSmartphoneOrWindowAlert(msg){
 if(!$('smartphoneAlertBanner'))return;
 $('smartphoneAlertText').textContent=msg;
 $('smartphoneAlertBanner').hidden=false;
}
if($('dismissSmartphoneAlert'))$('dismissSmartphoneAlert').onclick=()=>{if($('smartphoneAlertBanner'))$('smartphoneAlertBanner').hidden=true;};
async function refresh(){
 const r=await fetch('/api/state');if(!r.ok)throw Error('Monitor local indisponível');state=await r.json();token=state.token;
 $('timer').textContent=clock(state.elapsed);const active=!!state.active;
 if($('autoStatusHeadline')){
  const isHobby=typeof auto!=='undefined'&&auto.kind==='hobby';
  $('autoStatusHeadline').textContent=!active?'Aguardando início do monitoramento':state.paused?'Monitoramento pausado':isHobby?'Hobby reconhecido · alertas silenciados':'Monitorando em segundo plano';
 }
 $('status').textContent=active?(state.paused?'Pausado \u00B7 4-4-4':'Em segundo plano'):'Fase 1 \u00B7 Aguardando';
 $('start').disabled=active;$('start').textContent=active?'Em andamento':'Iniciar monitoramento';$('start').classList.toggle('running-indicator',active);$('pause').disabled=!active;$('finish').disabled=!active;$('cancelSession').disabled=!active;$('pause').textContent=state.paused?'Retomar':'Pausar';
 $('project').disabled=active;$('goal').disabled=active;
 const goal=active?state.active.goal:getGoal();
 const adaptiveThr=typeof learnedThreshold==='function'?learnedThreshold():34;
 $('goalLabel').textContent=goal?(active?`${state.active.project} · ${goal} min`:`${goal} min`):`Sem cronômetro · ciclo ~${adaptiveThr} min`;
 $('progress').style.width=goal?Math.min(100,state.elapsed/(goal*60)*100)+'%':'0%';document.querySelector('.progress').hidden=!goal;
 $('customGoal').disabled=active;
 if(!active||state.paused||window.compassoSuppressAlerts){
  lockedTaskApp=null;downwardGazeSince=0;
  if(window.compassoSuppressAlerts&&$('smartphoneAlertBanner')&&!$('smartphoneAlertBanner').hidden)$('smartphoneAlertBanner').hidden=true;
 }
 else if($('singleWindowEnabled')?.checked&&state.live?.app&&!/compasso/i.test(state.live.app)){
  if(!lockedTaskApp)lockedTaskApp=state.live.app;
  else if(state.live.app!==lockedTaskApp){
   showSmartphoneOrWindowAlert(`Modo Janela \u00DAnica: altern\u00E2ncia detectada de "${lockedTaskApp}" para "${state.live.app}".`);
  }
 }
 if(active && goal>0 && state.elapsed>=goal*60 && goalNotified!==state.active.id){goalNotified=state.active.id;await api('finish');if(!cameraManual)stopCamera();await refresh();notify(`Bloco de ${goal} min concluído! Sessão encerrada e salva automaticamente.`);return;}
 $('window').textContent=state.live.window_title||state.live.app;$('window').title=`${state.live.app} · ${state.live.window_title||'Sem título'} · ID ${state.live.window_id||'indisponível'}`;
 if(document.activeElement!==$('category'))$('category').value=state.category;$('startup').checked=state.startup;
 $('input').textContent=state.live.hooks?(active?`${state.report.keys} teclas · ${state.report.clicks} cliques`:'Pronto'):'Indisponível';
 $('input').title=`${state.report.scroll} eventos de rolagem · ${Math.round(state.report.mouse_distance||0)} px de deslocamento (dia)`;
 $('mouseMetrics').textContent=`Mouse: x ${state.live.mouse_x??'—'}, y ${state.live.mouse_y??'—'} · ${state.report.moves||0} movimentos · ${Math.round(state.report.mouse_distance||0)} px · ${state.report.scroll} rolagens (dia).`;
 $('windowMetrics').textContent=$('window').title;
 if(cameraOn&&!cameraManual&&!cameraStarting&&(!active||state.paused))stopCamera();
 if(!$('reportDay').value)$('reportDay').value=state.report.day;
 if($('reportDay').value===state.report.day){report=state.report;if(tab!=='focus')renderReport();}
 window.renderCompassoContext?.();
 window.renderStartupPrompt?.();
 updateWin7ClockGadget();
 updateCognitiveTwinMentor();
}
async function loadReport(){const r=await fetch('/api/report?day='+encodeURIComponent($('reportDay').value));report=await r.json();if(!r.ok)throw Error(report.error);renderReport();}
$('reportDay').onchange=safe(loadReport);
$('toggleApps').onclick=()=>{expandedApps=!expandedApps;renderReport();};
$('toggleWindows').onclick=()=>{expandedWindows=!expandedWindows;renderReport();};
$('recalculate').onclick=safe(loadReport);
function categorySegments(values,total){return Object.entries(values).map(([k,v])=>v?`<i style="width:${100*v/Math.max(1,total)}%;background:${colors[k]}" title="${labels[k]}: ${esc(duration(v))}">${pct(v,total)>=12?pct(v,total)+'%':''}</i>`:'').join('');}
function renderReport(){
 if(!report)return;const r=report,goal=Number($('dailyGoal').value)*60;
 if(listDay!==r.day){expandedApps=false;expandedWindows=false;listDay=r.day;}
 const apps=expandedApps?r.apps:r.apps.slice(0,3),windows=expandedWindows?(r.windows||[]):(r.windows||[]).slice(0,3);
 $('toggleApps').hidden=r.apps.length<=3;$('toggleApps').textContent=expandedApps?'Mostrar só três':`Ver todos (${r.apps.length})`;$('toggleApps').setAttribute('aria-expanded',String(expandedApps));
 $('toggleWindows').hidden=(r.windows?.length||0)<=3;$('toggleWindows').textContent=expandedWindows?'Mostrar só três':`Ver todos (${r.windows.length})`;$('toggleWindows').setAttribute('aria-expanded',String(expandedWindows));
 $('summary').textContent=`RESUMO DO DIA · ${Math.floor(r.total/60)} MIN / META: ${Math.round(goal/60)} MIN`;
 $('reportText').textContent=r.total?`Você registrou ${duration(r.total)}. ${r.apps[0]?.app} foi o aplicativo mais usado (${pct(r.apps[0]?.seconds,r.total)}%).`:'Ainda não há registros neste dia. Inicie o foco para acompanhar sua atividade.';
 $('dailyProgress').style.width=Math.min(100,100*r.total/goal)+'%';
 $('appRows').innerHTML=r.apps.length?'':'<div class="empty">O seu próximo bloco começa uma nova história.</div>';
 apps.forEach((app,i)=>{const row=document.createElement('button');row.className='app-row';row.innerHTML=`<strong>${i+1}. ${esc(app.app)}</strong><span class="bar">${categorySegments(app.categories,Math.max(1,r.total))}</span><span style="color:${colors[app.category]}">${pct(app.seconds,r.total)}% (${duration(app.seconds)})</span>`;row.onclick=()=>openClassification({scope:'app',app:app.app},app.category);$('appRows').append(row);});
 $('windowRows').replaceChildren();
 windows.forEach((w,i)=>{const row=document.createElement('button');row.className='app-row window-row';row.title=`${w.title||'Sem título'} · ${w.app}`;row.innerHTML=`<strong>${i+1}. ${esc(w.title||'Sem título')}<small>${esc(w.app)}</small></strong><span class="bar ${w.category}"><i style="width:${100*w.seconds/Math.max(1,r.total)}%"></i></span><span class="${w.category}">${pct(w.seconds,r.total)}% (${duration(w.seconds)})</span>`;row.onclick=()=>openClassification({scope:'window',app:w.app,title:w.title},w.category);$('windowRows').append(row);});
 if(!r.windows?.length)$('windowRows').innerHTML='<p class="empty">Sem registros de janela neste dia. Registros da versão 3.0 preservam somente o aplicativo.</p>';
 const signalBar=(name,good,coverage)=>`<div class="activity"><span>${name}</span><div class="bar">${categorySegments({focus:good,distraction:Math.max(0,coverage-good),neutral:Math.max(0,r.total-coverage)},r.total)}</div><span>${duration(coverage)} válidos</span></div>`;
 $('activityBars').innerHTML=`<div class="activity"><span>Aplicativos</span><div class="bar">${categorySegments(r.categories,r.total)}</div><span>${duration(r.total)}</span></div>`+signalBar('Olhar / íris',r.gaze_directions?.center||0,r.gaze_coverage||0)+signalBar('Cabeça',r.centered,r.face)+signalBar('Postura / tronco',r.posture,r.pose_coverage||0)+`<p class="tiny muted">Visão: verde = centro / alinhamento; vermelho = desvio estimado; lilás = sem medida válida. Os sinais de olhar e cabeça são calculados separadamente.</p>`;
 $('reportStats').innerHTML=`<div><b>${r.window_switches||0}</b><small>Trocas de janela / título</small></div><div><b>${r.moves||0}</b><small>Movimentos do mouse</small></div><div><b>${Math.round(r.mouse_distance||0)} px</b><small>Deslocamento do mouse</small></div><div><b>${r.switches}</b><small>Trocas de aplicativo</small></div><div><b>${pct(r.gaze_coverage||0,r.total)}%</b><small>Cobertura do olhar</small></div><div><b>${pct(r.pose_coverage||0,r.total)}%</b><small>Cobertura de postura</small></div>`;
 const rows=[['Janela / categoria',b=>colors[b.category]],['Olhar ao centro',b=>b.gaze?'#37d0a0':b.gaze_valid?'#f56978':null],['Cabeça ao centro',b=>b.centered?'#00d1e7':null],['Tronco / postura',b=>b.posture?'#a37be4':b.pose_valid?'#f56978':null],['Movimento do mouse',b=>b.mouse?'#f5bb64':null],['Teclado / mouse',b=>b.input?'#f5bb64':null]];
 $('timeline').innerHTML=rows.map(([name,color])=>`<div class="timeline-row"><span>${name}</span><div class="cells">${r.timeline.map(b=>`<i style="background:${color(b)||'#231b35'}" title="${esc(b.ts)} · ${esc(b.app)} · ${esc(b.window||'sem título')}"></i>`).join('')}</div></div>`).join('');
 $('sessions').innerHTML=r.sessions.length?r.sessions.map(s=>`<div class="session"><span><b>${esc(s.project)}</b><br><small>${new Date(s.started).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${s.status==='completed'?'Concluída':s.status==='interrupted'?'Interrompida':'Em andamento'}</small></span><span>${duration(s.seconds)} / ${s.goal?s.goal+' min':'contínuo'}</span></div>`).join(''):'<p class="empty">Nenhuma sessão neste dia.</p>';
 renderInsights();
}
function openClassification(context,category){classificationContext=context;$('classifyName').textContent=context.scope==='window'?`${context.title||'Sem título'} · ${context.app}`:context.app;$('classifyValue').value=category==='mixed'?'neutral':category;$('classifyDialog').showModal();}
$('classifyDialog').addEventListener('close',safe(async()=>{if($('classifyDialog').returnValue!=='save')return;await api('classify',{...classificationContext,category:$('classifyValue').value});await loadReport();}));
function computePredictiveMetrics(r){
 if(!r||!r.total||r.total<30){
  return {fatigue:null,dispersion:null,optimalRemaining:null,breakTime:'Pausa 4-4-4',fatigueLevel:'Normal',dispersionLevel:'Baixa',fatigueDesc:'Estável',dispersionDesc:'Sem desvios',fatigueColor:'var(--muted)',dispersionColor:'var(--muted)'};
 }
 const mins=r.total/60;
 let fatigue=10;
 if(mins<=20)fatigue+=mins*0.8;
 else if(mins<=45)fatigue+=16+(mins-20)*1.5;
 else fatigue+=53+Math.min(42,(mins-45)*1.2);
 if(r.pose_coverage>20&&(r.posture/r.pose_coverage)<0.6)fatigue+=12;
 if(r.face>20&&(r.centered/r.face)<0.6)fatigue+=8;
 const inputRate=(r.keys+r.clicks)/Math.max(1,mins);
 if(mins>30&&inputRate<3)fatigue+=10;
 fatigue=Math.min(98,Math.max(8,Math.round(fatigue)));

 let dispersion=10;
 const switches=r.window_switches||r.switches||0;
 const switchRate=switches/Math.max(1,mins);
 if(switchRate>4)dispersion+=45;
 else if(switchRate>2)dispersion+=28;
 else if(switchRate>1)dispersion+=14;
 const distRatio=(r.categories?.distraction||0)/r.total;
 dispersion+=Math.round(distRatio*40);
 if(r.gaze_coverage>20&&r.gaze_directions?.center){
  const centerRatio=r.gaze_directions.center/r.gaze_coverage;
  if(centerRatio<0.55)dispersion+=12;
 }
 dispersion=Math.min(98,Math.max(8,Math.round(dispersion)));

 const remainingFactor=Math.max(0,1-(fatigue/100));
 const optimalMins=Math.max(0,Math.round(45*remainingFactor));
 let breakTime='Respiração 4-4-4 (3 min)';
 if(fatigue>=70||mins>=60)breakTime='Pausa de 15 min';
 else if(fatigue>=45||mins>=35)breakTime='Pausa 4-4-4 (5 min)';

 const fatigueLevel=fatigue<35?'Baixa':fatigue<65?'Moderada':'Elevada';
 const dispersionLevel=dispersion<35?'Estável':dispersion<65?'Alerta':'Alta';
 const fatigueColor=fatigue<35?'var(--focus)':fatigue<65?'#ffb84d':'var(--distraction)';
 const dispersionColor=dispersion<35?'var(--focus)':dispersion<65?'#ffb84d':'var(--distraction)';
 const fatigueDesc=fatigue<35?'Ritmo estável':fatigue<65?'Desaceleração motora':'Recomenda-se pausar';
 const dispersionDesc=dispersion<35?`${switches} trocas de janela`:dispersion<65?`${switchRate.toFixed(1)} trocas/min`:`Feche abas secundárias`;

 return {fatigue,dispersion,optimalRemaining:optimalMins,breakTime,fatigueLevel,dispersionLevel,fatigueDesc,dispersionDesc,fatigueColor,dispersionColor};
}
function insights(r){
 const focused=r.categories.focus+r.categories.study,coverage=pct(r.face,r.total),index=r.total>=60?pct(focused,r.total):null;
 const pred=computePredictiveMetrics(r);
 const learned=typeof learnedThreshold==='function'?learnedThreshold():34;
 suggested=typeof learnedRuns==='function'&&learnedRuns()>=1?learned:(r.total>=1500&&pct(r.categories.distraction,r.total)<20?40:30);
 const reasons=[];
 if(!r.total)reasons.push('Aguardando primeiros minutos de uso do PC para aprender seu padrão.');
 if(pred.fatigue&&pred.fatigue>=50)reasons.push(`Fadiga: ${pred.fatigueDesc}`);
 if(pred.dispersion&&pred.dispersion>=50)reasons.push(`Dispersão: ${pred.dispersionDesc}`);
 if(typeof topTriggerSummary==='function'){const trig=topTriggerSummary();if(trig)reasons.push(trig);}
 if(r.total&&r.categories.neutral/r.total>.4)reasons.push(`${pct(r.categories.neutral,r.total)}% neutro — a IA continua diferenciando estudo, hobbies e pausas.`);
 if(r.total&&r.categories.distraction/r.total>.15)reasons.push(`${duration(r.categories.distraction)} em distração.`);
 if((r.window_switches||r.switches)>10)reasons.push(`${r.window_switches||r.switches} trocas de janela.`);
 if(r.gaze_coverage&&r.gaze_directions.center/r.gaze_coverage<.6)reasons.push(`Olhar fora do centro (${pct(r.gaze_coverage-r.gaze_directions.center,r.gaze_coverage)}%).`);
 if(r.pose_coverage&&r.posture/r.pose_coverage<.6)reasons.push('Desvio postural detectado.');
 if(r.total&&!reasons.length)reasons.push('Ritmo consistente e postura alinhada.');
 const tipObj=typeof buildLearnedCoaching==='function'?buildLearnedCoaching():null;
 const plan=[
  `Ritmo natural aprendido pela IA: ciclos de ~${suggested} min (sem modelo fixo).`,
  tipObj?tipObj.lesson:`Intervenção sugerida agora: ${pred.breakTime.toLowerCase()}.`,
  typeof peakHour==='function'&&peakHour()!==null?`Seu horário de maior foco observado até aqui é por volta das ${peakHour()}h.`:`Mantenha a janela principal em foco para reduzir resíduo de atenção.`
 ];
 return {index,coverage,reasons,plan,pred};
}
function renderInsights(){
 const r=report,a=insights(r),pred=a.pred;
 $('score').textContent=a.index??'—';
 $('scoreLabel').textContent=a.index===null?'Sem dados':a.index>=70?'Consistente':a.index>=40?'Moderado':'Fragmentado';
 $('analysisFacts').innerHTML=`<div>• Foco / leitura: <span class="focus">${duration(r.categories.focus+r.categories.study)}</span></div><div>• Distração: <span class="distraction">${pct(r.categories.distraction,r.total)}%</span></div><div>• Cobertura visual: ${a.coverage}%</div><div>• Ciclo aprendido: ~${suggested} min</div>`;
 $('bottlenecks').innerHTML=a.reasons.map(t=>`<div>${esc(t)}</div>`).join('');
 $('plan').innerHTML=a.plan.map(t=>`<li>${esc(t)}</li>`).join('');
 $('applyBlock').textContent=`Aplicar ritmo aprendido (${suggested} min)`;
 if($('predFatigueVal')){
  $('predFatigueVal').textContent=pred.fatigue!==null?`${pred.fatigue}%`:'0%';
  $('predFatigueVal').style.color=pred.fatigueColor;
  $('predFatigueBadge').textContent=pred.fatigueLevel;
  $('predFatigueBadge').style.borderColor=pred.fatigueColor;
  $('predFatigueBadge').style.color=pred.fatigueColor;
  $('predFatigueBar').style.width=(pred.fatigue||0)+'%';
  $('predFatigueBar').style.background=pred.fatigueColor;
  $('predFatigueDesc').textContent=pred.fatigueDesc;

  $('predDispersionVal').textContent=pred.dispersion!==null?`${pred.dispersion}%`:'0%';
  $('predDispersionVal').style.color=pred.dispersionColor;
  $('predDispersionBadge').textContent=pred.dispersionLevel;
  $('predDispersionBadge').style.borderColor=pred.dispersionColor;
  $('predDispersionBadge').style.color=pred.dispersionColor;
  $('predDispersionBar').style.width=(pred.dispersion||0)+'%';
  $('predDispersionBar').style.background=pred.dispersionColor;
  $('predDispersionDesc').textContent=pred.dispersionDesc;

  $('predOptimalWindow').textContent=pred.optimalRemaining!==null?`Cerca de ${pred.optimalRemaining} min restantes`:'Aguardando dados';
  $('predBreakRecommendation').textContent=pred.breakTime;
  $('predictiveStatus').textContent=pred.fatigue!==null?'Leitura ativa':'Aguardando sessão';
 }
}
$('applyBlock').onclick=()=>{if(state?.active)return notify(`Ritmo aprendido pela IA está em ~${suggested} min no monitoramento contínuo atual.`);window.setCompassoGoal?.(suggested);setTab('focus');notify(`Ciclo de referência ajustado para ~${suggested} minutos com base no seu uso.`);};
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('export').onclick=safe(async()=>{const r=await fetch('/api/backup');if(!r.ok)throw Error('Falha ao exportar backup');download('compasso-backup.json',JSON.stringify(await r.json(),null,2),'application/json');});
$('csv').onclick=safe(async()=>{
 if(!report)return;const response=await fetch('/api/samples?day='+encodeURIComponent(report.day));if(!response.ok)throw Error('Não foi possível exportar as amostras.');
 const samples=await response.json(),columns=['ts','session_id','seconds','app','window_id','window_title','keys','clicks','scroll','moves','mouse_distance','mouse_x','mouse_y','face','blinks','gaze_direction','gaze_x','gaze_y','centered','head_yaw','head_pitch','head_roll','posture','pose_points','shoulder_tilt','trunk_lean','hip_tilt','elbow_left','elbow_right','knee_left','knee_right'];
 const quote=value=>{let text=value==null?'':String(value);if(typeof value==='string'&&/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const rows=[columns,...samples.map(s=>columns.map(c=>s[c]))];download(`compasso-${report.day}.csv`,'\ufeff'+rows.map(row=>row.map(quote).join(';')).join('\r\n'),'text/csv;charset=utf-8');
});
function pdf(analysisOnly=false){
 if(!report)return;const r=report,a=insights(r),doc=new window.jspdf.jsPDF();let y=24;
 function text(value,size=11){doc.setFontSize(size);const lines=doc.splitTextToSize(String(value),172);for(const line of lines){if(y>278){doc.addPage();y=22;}doc.text(line,19,y);y+=6;}y+=3;}
 doc.setTextColor(35,25,60);text('compasso. | Relatorio de foco',22);text(`${r.day} | ${duration(r.total)} registrados`,11);
 if(!analysisOnly){text('Aplicativos e categorias',14);r.apps.forEach(app=>text(`${app.app} - ${labels[app.category]}: ${duration(app.seconds)} (${pct(app.seconds,r.total)}%)`));
  text('Janelas em foco',14);(r.windows||[]).forEach(w=>text(`${w.title||'Sem titulo'} | ${w.app} | ${w.id}: ${duration(w.seconds)} - ${labels[w.category]}`));
  text(`Trocas de janela/titulo: ${r.window_switches||0} | Aplicativo: ${r.switches}`);
  text(`Teclas: ${r.keys} | Cliques: ${r.clicks} | Rolagens: ${r.scroll} | Movimentos: ${r.moves||0} | Deslocamento: ${Math.round(r.mouse_distance||0)} px`);
  text(`Rosto: ${duration(r.face)} | Piscadas estimadas: ${r.blinks||0} | Cabeca ao centro: ${duration(r.centered)}`);
  text(`Olhar pelas iris: ${duration(r.gaze_coverage||0)} de cobertura valida. Direcoes: ${Object.entries(r.gaze_directions||{}).map(([k,v])=>`${gazeLabels[k]} ${duration(v)}`).join(', ')}`);
  text(`Postura com ombros/quadris visiveis: ${duration(r.pose_coverage||0)} | Alinhamento estimado: ${duration(r.posture)}`);
  text('Sessoes',14);r.sessions.forEach(s=>text(`${s.project}: ${duration(s.seconds)} / meta ${s.goal} min - ${s.status}`));}
 text('Analise local explicavel',14);text(`Indice de foco: ${a.index??'dados insuficientes'}. Formula: foco + leitura / tempo registrado.`);a.reasons.forEach(t=>text(t));text('Proximo bloco',14);a.plan.forEach(t=>text(t));
 const contextual=window.contextPdfLines?.()||[];if(contextual.length){text('Revisao das capturas com IA',14);contextual.forEach(line=>text(line));}
 text('Estimativas de orientacao facial nao comprovam atencao ou fadiga. Sem gravacao de video.');doc.save(`compasso-${analysisOnly?'analise':'relatorio'}-${r.day}.pdf`);
}
$('pdf').onclick=safe(()=>pdf(false));$('aiPdf').onclick=safe(()=>pdf(true));
function stopCamera(){
 const wasOn=cameraOn;cameraGeneration++;cameraOn=false;cameraManual=false;cameraStarting=false;cameraFrameErrors=0;
 if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
 $('video').srcObject=null;$('video').hidden=true;$('cameraPlaceholder').hidden=false;
 $('cameraToggle').textContent='Ativar câmera';$('cameraStatus').textContent='Câmera desligada';$('points').textContent='';
 const canvas=$('hud');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 for(const id of ['gaze','head','posture','face']){$(id).textContent='Câmera desligada';$(id).title='';}
 $('signalMetrics').textContent='Ative a câmera para acompanhar olhar, cabeça e postura localmente.';
 cancelCalibration();calibrated=null;lastLandmarks=null;autoCalibrationSamples=[];lastRaw=null;window.compassoVision=null;
 if(wasOn&&token)api('camera_off',{},true).catch(()=>{});
}
function friendlyCameraError(e){
 const name=e?.name||'', msg=String(e?.message||e||'');
 if(/mediaDevices/i.test(msg))return 'Câmera indisponível neste endereço; abra pelo Compasso local (127.0.0.1).';
 if(name==='NotReadableError'||name==='TrackStartError')return 'Webcam em uso por outro app ou outra aba no Windows. Feche a outra janela e tente de novo.';
 if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'Permissão da câmera bloqueada no Windows ou no navegador. Libere o acesso e tente novamente.';
 if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'Nenhuma webcam encontrada neste computador.';
 if(/webgl/i.test(msg))return 'WebGL indisponível para o MediaPipe no navegador. Verifique a aceleração gráfica.';
 return msg||'Erro desconhecido na câmera local.';
}
async function waitForVideoReady(video){
 if(video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0)return;
 await new Promise((resolve,reject)=>{
  let done=false;
  const cleanup=()=>{video.removeEventListener('loadeddata',check);video.removeEventListener('canplay',check);clearInterval(iv);clearTimeout(to);};
  const check=()=>{if(done)return;if(video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0){done=true;cleanup();resolve();}};
  const iv=setInterval(check,50);
  const to=setTimeout(()=>{if(done)return;done=true;cleanup();if(video.videoWidth>0)resolve();else reject(Error('A webcam abriu, mas não enviou imagem a tempo.'));},4000);
  video.addEventListener('loadeddata',check);video.addEventListener('canplay',check);check();
 });
}
async function acquireCameraStream(){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('navigator.mediaDevices indisponível.');
 try{
  return await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:360},facingMode:'user'},audio:false});
 }catch(e){
  if(e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError'||e?.name==='NotReadableError')throw e;
  return await navigator.mediaDevices.getUserMedia({video:true,audio:false});
 }
}
async function startCamera(manual=false){
 if(cameraOn){if(manual)cameraManual=true;return;}
 if(cameraStarting&&!manual)return;
 if(manual)cameraManual=true;
 cameraStarting=true;cameraFrameErrors=0;
 const generation=++cameraGeneration;$('cameraToggle').disabled=true;$('cameraStatus').textContent='Solicitando câmera…';
 try{
  const acquired=await acquireCameraStream();
  if(generation!==cameraGeneration){acquired.getTracks().forEach(t=>t.stop());return;}
  stream=acquired;const video=$('video');video.srcObject=stream;await video.play();
  await waitForVideoReady(video);
  if(generation!==cameraGeneration)return;
  $('cameraStatus').textContent='Carregando MediaPipe local…';
  if(!model){
   if(typeof Holistic!=='function')throw Error('Biblioteca local Holistic não carregada.');
   model=new Holistic({locateFile:file=>'/mediapipe/'+file});
   model.setOptions({modelComplexity:0,smoothLandmarks:true,refineFaceLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});
   model.onResults(onResults);
  }
  if(typeof model.initialize==='function')await model.initialize();
  if(generation!==cameraGeneration)return;
  const settings=stream.getVideoTracks()[0].getSettings?.()||{};
  const vw=video.videoWidth||640, vh=video.videoHeight||360;
  calibrationKey=CompassoCalibration.key({deviceId:settings.deviceId||'default-camera'},vw,vh,{width:screen.width,height:screen.height,pixelRatio:devicePixelRatio});
  calibrated=CompassoCalibration.load(calibrationStorage(),calibrationKey);calibrationStored=!!calibrated;
  cameraOn=true;calibrationPrompted=!!calibrated;autoCalibrationSamples=[];lastRaw=null;blinkCount=0;totalBlinks=0;blinkClosed=false;lastCameraSend=0;showCalibrationSaved();
  $('hud').width=vw;$('hud').height=vh;
  $('cameraPlaceholder').hidden=true;video.hidden=!videoVisible;$('cameraToggle').textContent='Desligar câmera';
  stream.getVideoTracks()[0].addEventListener('ended',()=>{stopCamera();notify('A câmera foi desconectada. Você pode continuar sem ela.');});
  frame(generation);
 }catch(e){
  if(generation===cameraGeneration){stopCamera();notify('Não foi possível ativar a câmera: '+friendlyCameraError(e));}
 }finally{
  if(generation===cameraGeneration)cameraStarting=false;
  $('cameraToggle').disabled=false;
 }
}
async function frame(generation){
 if(!cameraOn||generation!==cameraGeneration)return;
 const video=$('video');
 if(!cameraBusy&&video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0){
  cameraBusy=true;
  try{
   await model.send({image:video});
   cameraFrameErrors=0;
  }catch(e){
   cameraFrameErrors++;
   if(generation===cameraGeneration&&cameraFrameErrors>=3){
    stopCamera();
    notify('Falha no modelo local da câmera: '+friendlyCameraError(e));
    return;
   }
  }finally{cameraBusy=false;}
 }
 if(cameraOn&&generation===cameraGeneration)setTimeout(()=>frame(generation),110);
}
function applyCalibration(result,message){
 calibrated=result;
 calibrationStored=CompassoCalibration.save(calibrationStorage(),calibrationKey,result);
 cancelCalibration();showCalibrationSaved();
 if(message)notify(message);
}
function onResults(results){
 if(!cameraOn)return;lastLandmarks=results;
 const canvas=$('hud'),w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d');
 let {metrics:data,raw}=CompassoVision.analyze(results,calibrationRun?null:calibrated,h/w);
 if(raw.head&&raw.iris)lastRaw=raw;
 if(raw.head&&raw.iris?.open&&!calibrationRun&&!calibrationPrompted){
  autoCalibrationSamples.push(raw);
  calibrated=CompassoVision.defaultCalibration({
   iris:{x:medianValue(autoCalibrationSamples.map(r=>r.iris.x)),y:medianValue(autoCalibrationSamples.map(r=>r.iris.y))},
   head:{yaw:medianValue(autoCalibrationSamples.map(r=>r.head.yaw)),pitch:medianValue(autoCalibrationSamples.map(r=>r.head.pitch)),roll:medianValue(autoCalibrationSamples.map(r=>r.head.roll))}
  });
  if(autoCalibrationSamples.length>=5){
   calibrationPrompted=true;
   calibrationStored=CompassoCalibration.save(calibrationStorage(),calibrationKey,calibrated);
   showCalibrationSaved();
  }
  ({metrics:data,raw}=CompassoVision.analyze(results,calibrated,h/w));
 }
 captureCalibrationSample(raw);
 if(raw.iris){if(!raw.iris.open&&!blinkClosed){blinkClosed=true;blinkStarted=performance.now();}
  else if(raw.iris.open&&blinkClosed){const elapsed=performance.now()-blinkStarted;if(elapsed>=50&&elapsed<=800){blinkCount++;totalBlinks++;}blinkClosed=false;}}
 else blinkClosed=false;
 ctx.clearRect(0,0,w,h);
 function segment(a,b,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}
 function point(p,color,radius=1){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x*w,p.y*h,radius,0,Math.PI*2);ctx.fill();}
 if(results.faceLandmarks){ctx.globalAlpha=.65;for(const p of results.faceLandmarks)point(p,'#f09256',.75);ctx.globalAlpha=1;
  for(const vector of CompassoVision.hudVectors(results.faceLandmarks,data)){
   segment(vector.start,vector.end,vector.color,3.5);point(vector.start,vector.color,3.5);
   const end={x:vector.end.x*w,y:vector.end.y*h},angle=Math.atan2((vector.end.y-vector.start.y)*h,(vector.end.x-vector.start.x)*w);
   ctx.fillStyle=vector.color;ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-11*Math.cos(angle-.45),end.y-11*Math.sin(angle-.45));ctx.lineTo(end.x-11*Math.cos(angle+.45),end.y-11*Math.sin(angle+.45));ctx.closePath();ctx.fill();
  }
 }
 const p=results.poseLandmarks;if(p){for(const [a,b]of CompassoVision.POSE_CONNECTIONS)if(p[a]?.visibility>=.55&&p[b]?.visibility>=.55)segment(p[a],p[b],data.posture===false?'#ffbd64':'#2fb380');for(const joint of p)if(joint.visibility>=.55)point(joint,'#f09256',2.5);}
 $('points').textContent=results.faceLandmarks?`(${results.faceLandmarks.length} pts)`:'';$('cameraStatus').textContent=data.face?'Rastreamento ativo':'Procurando rosto';
 $('gaze').textContent=!data.face?'Rosto não detectado':!raw.iris?'Íris indisponíveis':!calibrated?'Calibrando automaticamente…':data.gaze_direction?`${gazeLabels[data.gaze_direction]}, pelas íris`:'Sem leitura ocular confiável';
 $('gaze').title=data.gaze_direction?`Olhar relativo calibrado: x ${data.gaze_x.toFixed(2)}, y ${data.gaze_y.toFixed(2)}. Não é uma coordenada exata na tela.`:'O olhar é calibrado automaticamente ao detectar o rosto, ou pelo botão Recalibrar.';
 $('head').textContent=data.head_yaw===null?'Cabeça sem leitura':`${data.centered?'Centralizada':'Desvio estimado'}, ${degrees(data.head_yaw)}`;
 $('head').title=`Rotação horizontal ${degrees(data.head_yaw)}, vertical ${degrees(data.head_pitch)}, inclinação ${degrees(data.head_roll)}`;
 $('posture').textContent=data.trunk_lean===null?`${data.pose_points} pontos, quadris fora de quadro`:`Tronco ${degrees(data.trunk_lean)}, ${data.posture?'alinhado':'desvio estimado'}`;
 $('posture').title=`Ombros ${degrees(data.shoulder_tilt)}, tronco ${degrees(data.trunk_lean)}, quadris ${degrees(data.hip_tilt)}`;
 $('face').textContent=data.face?`${results.faceLandmarks.length} pontos, ${totalBlinks} piscadas`:'Rosto não detectado';
 window.compassoVision={ts:performance.now(),gaze:data.gaze_direction,posture:data.posture,centered:data.centered,face:data.face};
 if(state?.active&&!state?.paused&&$('smartphoneAlertEnabled')?.checked&&!window.compassoSuppressAlerts){
  const lookingDown=(data.gaze_direction==='down')||(data.head_pitch!==null&&data.head_pitch>15);
  if(lookingDown){
   if(!downwardGazeSince)downwardGazeSince=performance.now();
   else if(performance.now()-downwardGazeSince>=5000){
    showSmartphoneOrWindowAlert('Alerta de Smartphone: desvio ocular/cervical inferior (>5s) fora do monitor.');
    downwardGazeSince=performance.now();
   }
  }else{downwardGazeSince=0;}
 }
 $('signalMetrics').innerHTML=[['Olhar',data.gaze_direction?gazeLabels[data.gaze_direction]:'sem leitura calibrada'],['Cabeça H / V / inclinação',`${degrees(data.head_yaw)} / ${degrees(data.head_pitch)} / ${degrees(data.head_roll)}`],['Ombros / tronco',`${degrees(data.shoulder_tilt)} / ${degrees(data.trunk_lean)}`],['Quadris / pontos visíveis',`${degrees(data.hip_tilt)} / ${data.pose_points}`],['Cotovelos E / D',`${degrees(data.elbow_left)} / ${degrees(data.elbow_right)}`],['Joelhos E / D',`${degrees(data.knee_left)} / ${degrees(data.knee_right)}`]].map(([k,v])=>`<span data-reading><b>${k}</b><br>${esc(v)}</span>`).join('');
 if(state?.active&&!state?.paused&&token&&performance.now()-lastCameraSend>1000){lastCameraSend=performance.now();api('camera',{...data,blinks:blinkCount}).catch(e=>notify('Falha ao registrar câmera: '+e.message));blinkCount=0;}
}
$('cameraToggle').onclick=()=>cameraOn?stopCamera():startCamera(true);
$('videoMode').onclick=()=>{videoVisible=!videoVisible;$('video').hidden=!videoVisible||!cameraOn;$('videoMode').textContent=videoVisible?'Vídeo e malha':'Somente malha';};
$('forgetCalibration').onclick=()=>{
 if(!CompassoCalibration.forget(calibrationStorage(),calibrationKey))return notify('Ative a câmera correspondente para esquecer a calibração.');
 cancelCalibration();calibrated=null;calibrationStored=false;calibrationPrompted=true;autoCalibrationSamples=[];showCalibrationSaved();
 notify('Calibração esquecida neste PC. Use Calibrar olhar e cabeça quando quiser salvar outra.');
};
const calibrationTargets=[['center','Centro',50,50],['left','Esquerda',8,50],['right','Direita',92,50],['up','Acima',50,18],['down','Abaixo',50,79]];
function cancelCalibration(){if(calibrationRun?.timeout)clearTimeout(calibrationRun.timeout);if(calibrationRun?.advance)clearTimeout(calibrationRun.advance);const exit=calibrationRun?.ownsFullscreen;calibrationRun=null;if($('calibrationDialog').open)$('calibrationDialog').close();$('captureCalibration').disabled=false;if(exit&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}
function displayCalibrationTarget(){
 const [name,label,x,y]=calibrationTargets[calibrationRun.index];
 $('calibrationTarget').style.left=x+'%';$('calibrationTarget').style.top=y+'%';
 $('calibrationStep').textContent=`${calibrationRun.index+1} / 5 · ${label}`;
 $('calibrationHint').textContent=calibrationRun.automatic?'Acompanhe o alvo amarelo. Os pontos avançam sozinhos.':'Use "Centralizar rápido" para calibrar em 1 clique olhando para a tela, ou "Começar 5 pontos".';
 $('captureCalibration').textContent=calibrationRun.automatic?'Capturando automaticamente…':'Começar 5 pontos';
 $('captureCalibration').disabled=false;
 if(calibrationRun.automatic){$('captureCalibration').disabled=true;calibrationRun.advance=setTimeout(beginCalibrationCapture,250);}
}
$('calibrate').onclick=()=>{
 if(!cameraOn)return notify('Ative a câmera para calibrar o olhar.');
 cancelCalibration();calibrationPrompted=true;
 calibrationRun={index:0,samples:{},capturing:false};displayCalibrationTarget();$('calibrationDialog').showModal();
};
$('cancelCalibration').onclick=cancelCalibration;
$('calibrationDialog').addEventListener('cancel',cancelCalibration);
if($('quickCalibration'))$('quickCalibration').onclick=()=>{
 applyCalibration(CompassoVision.defaultCalibration(lastRaw),'Olhar e cabeça centralizados rapidamente e salvos neste PC.');
};
$('captureCalibration').onclick=()=>{
 if(!calibrationRun)return;
 calibrationRun.automatic=true;
 if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
  const run=calibrationRun;document.documentElement.requestFullscreen().then(()=>{if(calibrationRun===run)run.ownsFullscreen=true;else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}).catch(()=>{});
 }
 beginCalibrationCapture();
};
function beginCalibrationCapture(){
 if(!calibrationRun)return;calibrationRun.capturing=true;calibrationRun.current=[];calibrationRun.started=performance.now();
 calibrationRun.lastSample=0;calibrationRun.firstSample=0;calibrationRun.reason='Aguardando rosto e olhos visíveis.';
 $('captureCalibration').disabled=true;$('captureCalibration').textContent='Acompanhe o alvo…';$('calibrationHint').textContent='Ajustando… olhe para o alvo amarelo. A captura começa em um segundo.';
 calibrationRun.timeout=setTimeout(()=>{
  if(!calibrationRun)return;
  const result=CompassoVision.calibrateAdaptive(calibrationRun.samples,lastRaw);
  applyCalibration(result,'Calibração ajustada automaticamente com as leituras disponíveis.');
 },8000);
}
function captureCalibrationSample(raw){
 const run=calibrationRun;if(!run?.capturing)return;
 const reject=message=>{run.reason=message;if(performance.now()-run.started>=1000)$('calibrationHint').textContent=message;};
 if(!raw.head)return reject('O rosto saiu do enquadramento. Posicione a câmera de frente.');
 if(!raw.iris||raw.iris.openness<=.03)return reject('As íris não estão visíveis. Olhe naturalmente para o alvo.');
 const now=performance.now();if(now-run.started<1000||now-run.lastSample<80)return;
 const center=run.samples.center;
 const base=center?Object.fromEntries(['yaw','pitch','roll'].map(key=>[key,medianValue(center.map(row=>row.head[key]))])):null;
 if(base&&(Math.abs(raw.head.yaw-base.yaw)>45||Math.abs(raw.head.pitch-base.pitch)>45||Math.abs(raw.head.roll-base.roll)>30))return reject('Mantenha o rosto voltado para a tela enquanto acompanha o alvo.');
 if(!run.firstSample)run.firstSample=now;run.lastSample=now;run.current.push(raw);
 $('calibrationHint').textContent='Capturando… continue olhando para o alvo amarelo.';$('calibrationStep').textContent=`${run.index+1} / 5 · ${Math.min(8,run.current.length)} de 8 amostras`;
 if(run.current.length<8||now-run.firstSample<750)return;
 clearTimeout(run.timeout);run.capturing=false;run.samples[calibrationTargets[run.index][0]]=run.current;
 run.index++;
 while(run.index<calibrationTargets.length&&run.samples[calibrationTargets[run.index][0]])run.index++;
 if(run.index<calibrationTargets.length){displayCalibrationTarget();return;}
 const result=CompassoVision.calibrateAdaptive(run.samples,lastRaw);
 applyCalibration(result,calibrationStored?'Calibração salva neste PC. Não será preciso repetir ao iniciar outra sessão com a mesma câmera.':'Calibração concluída e salva neste PC.');
}
// =====================================================================
// COPILOTO AUTÔNOMO (ZERO-CLIQUE)
// Aprende com o uso real (janela ativa, cadência, câmera) e intervém
// sozinho no momento certo (JITAI), sem exigir nenhuma ação do usuário.
// =====================================================================
const AUTO_KEY = 'compasso.autopilot.v1';
function loadAutoProfile() { try { return JSON.parse(localStorage.getItem(AUTO_KEY)) || {}; } catch (_) { return {}; } }
const autoProfile = Object.assign({
 focusRuns: [], hourly: {}, appStats: {}, triggers: {}, recovery: { afterBreakSamples: 0, afterBreakCadence: 0, steadySamples: 0, steadyCadence: 0 },
 day: '', dayKinds: {}, dayApps: {}, wrapDay: '', greetDay: '', lastTipKey: ''
}, loadAutoProfile());
function saveAutoProfile() { try { localStorage.setItem(AUTO_KEY, JSON.stringify(autoProfile)); } catch (_) {} }

const KIND_LABEL = { study: 'Estudo/Trabalho', hobby: 'Hobby/Lazer', comm: 'Comunicação', distraction: 'Distração', neutral: 'Neutro', idle: 'Ausente' };
const KIND_RULES = [
 ['hobby', /steam|epic games|riot|league of legends|valorant|minecraft|roblox|fortnite|spotify|netflix|prime video|disney\+|max|twitch|crunchyroll|deezer|jogo|game/i],
 ['distraction', /tiktok|reels|facebook|twitter|x\.com|shorts|9gag|kwai/i],
 ['comm', /whatsapp|telegram|discord|teams|slack|outlook|gmail|instagram|messenger|zoom/i],
 ['study', /code|visual studio|pycharm|intellij|eclipse|android studio|terminal|powershell|cmd\.exe|notion|obsidian|word|excel|powerpoint|docs|sheets|slides|acrobat|pdf|moodle|sigaa|classroom|overleaf|jupyter|colab|figma|github|stack ?overflow|anki/i]
];
function classifyActivity(live, category) {
 if (category === 'distraction') return 'distraction';
 if (category === 'focus' || category === 'study') return 'study';
 const text = `${live?.app || ''} ${live?.window_title || ''}`;
 if (/youtube/i.test(text)) return /aula|curso|tutorial|lecture|class|explica|resumo|revis/i.test(text) ? 'study' : 'hobby';
 for (const [kind, re] of KIND_RULES) if (re.test(text)) return kind;
 return 'neutral';
}
const auto = {
 kind: 'neutral', kindSince: Date.now(), prevKind: 'neutral', prevKindDur: 0, transition: null,
 window: '', windowSince: Date.now(), streakStart: null, streakBreakAt: null, postBreakUntil: 0,
 lastInput: null, lastInputAt: Date.now(), inputs: [], switches: [], lastApp: '',
 fired: {}, lastAny: 0, feed: [], lastSave: 0, lastTick: 0, bootAt: Date.now(),
 lastBriefing: Date.now(), lastTipAt: 0, stuck: false, lesson: null, narrative: '', greeted: false
};
const medianOf = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtMinutes = s => `${Math.max(1, Math.round(s / 60))} min`;
function learnedThreshold() { const runs = autoProfile.focusRuns.filter(m => m >= 5); return runs.length >= 3 ? Math.round(medianOf(runs)) : 34; }
function learnedRuns() { return autoProfile.focusRuns.filter(m => m >= 5).length; }
function getJarvisGreetingPrefix() { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'; }
function getJarvisUserName() { const n = $('userBadgeName')?.textContent?.trim(); return n && n !== 'Perfil' ? n : 'você'; }
function topApps(n = 3) {
 return Object.entries(autoProfile.dayApps || {}).filter(([k]) => !/compasso/i.test(k)).sort((a, b) => b[1].s - a[1].s).slice(0, n);
}
function appsSentence() {
 const t = topApps();
 if (!t.length) return 'ainda estou nos primeiros minutos de observação';
 return t.map(([name, v]) => `${name} (${fmtMinutes(v.s)}, ${KIND_LABEL[v.k] || 'Neutro'})`).join(', ');
}
function dayShares() {
 const k = autoProfile.dayKinds || {};
 const total = Object.entries(k).filter(([n]) => n !== 'idle').reduce((a, [, v]) => a + v, 0) || 1;
 return { total, study: (k.study || 0) / total, hobby: (k.hobby || 0) / total, comm: (k.comm || 0) / total, distraction: (k.distraction || 0) / total };
}
function bestFlowApp() {
 let best = null, score = 0;
 for (const [app, st] of Object.entries(autoProfile.appStats || {})) {
  if (st.sec < 120 || st.kind !== 'study' || !st.samples) continue;
  const cad = st.cadenceSum / st.samples;
  if (cad > score) { score = cad; best = { app, cad: Math.round(cad), mins: Math.round(st.sec / 60) }; }
 }
 return best;
}
function worstSwitchingApp() {
 let worst = null, rate = 0;
 for (const [app, st] of Object.entries(autoProfile.appStats || {})) {
  if (st.sec < 120 || st.switches < 3) continue;
  const perMin = (st.switches / st.sec) * 60;
  if (perMin > rate) { rate = perMin; worst = { app, perMin: perMin.toFixed(1), switches: st.switches }; }
 }
 return worst;
}
function breakGainPct() {
 const r = autoProfile.recovery || {};
 if (r.afterBreakSamples < 6 || r.steadySamples < 6) return null;
 const a = r.afterBreakCadence / r.afterBreakSamples, b = r.steadyCadence / r.steadySamples;
 if (b <= 1) return null;
 return Math.round(((a - b) / b) * 100);
}
function peakHour() { let best = null, v = 0; for (const [h, b] of Object.entries(autoProfile.hourly)) if ((b.study || 0) > v) { v = b.study; best = +h; } return v > 900 ? best : null; }
function weakHour() { let worst = null, v = 0; for (const [h, b] of Object.entries(autoProfile.hourly)) { const d = (b.distraction || 0) + (b.comm || 0); if (d > v && d > (b.study || 0)) { v = d; worst = +h; } } return v > 600 ? worst : null; }
function topTriggerSummary() {
 const tr = autoProfile.triggers || {};
 const top = Object.entries(tr).filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1])[0];
 if (!top) return '';
 const map = {
  stuck: `Principal padrão observado: pausas longas antes de abrir outra aba (${top[1]}x).`,
  fragmented: `Principal padrão observado: alternância rápida entre janelas (${top[1]}x).`,
  fatigue: `Principal padrão observado: queda motora após ~${learnedThreshold()} min contínuos (${top[1]}x).`,
  distraction: `Principal padrão observado: permanência prolongada em redes/distração (${top[1]}x).`
 };
 return map[top[0]] || '';
}
function buildLearnedCoaching() {
 const flow = bestFlowApp(), sw = worstSwitchingApp(), gain = breakGainPct();
 const peak = peakHour(), weak = weakHour(), thr = learnedThreshold(), tr = autoProfile.triggers || {};
 const candidates = [];
 if (flow && sw && flow.app !== sw.app) {
  candidates.push({
   key: 'app_contrast',
   tag: 'PADRÃO POR APLICATIVO',
   concept: `Fluidez alta em ${flow.app} vs. trocas em ${sw.app}`,
   lesson: `No seu PC, você sustenta ~${flow.cad} ações/min em ${flow.app}, enquanto em ${sw.app} troca de janela ~${sw.perMin}x/min. Deixar pesquisas de ${sw.app} em janela única reduz o Resíduo de Atenção (Leroy, 2009).`,
   evidence: `Aprendido com ${flow.mins} min de uso observado em ${flow.app} e ${sw.switches} alternâncias em ${sw.app}.`
  });
 }
 if (gain !== null && gain >= 10) {
  candidates.push({
   key: 'break_gain',
   tag: 'EFEITO REAL DAS PAUSAS',
   concept: 'Restauração da Atenção comprovada no seu uso (Kaplan, 1995)',
   lesson: `Depois de pausas ou momentos de hobby, sua cadência no retorno sobe ${gain}% comparada a insistir direto. Respeitar micropausas antes dos ${thr} min aumenta seu rendimento real.`,
   evidence: 'Calculado automaticamente comparando sua velocidade pós-pausa vs. sequências contínuas.'
  });
 }
 if ((tr.stuck || 0) >= 2 && (tr.stuck >= (tr.fragmented || 0))) {
  candidates.push({
   key: 'stuck_pattern',
   tag: 'GATILHO APRENDIDO',
   concept: 'Troca de aba por sobrecarga cognitiva (Sweller, 1988)',
   lesson: `Aprendi que você raramente se distrai à toa: geralmente alterna de tela após travar sem digitar em algo denso. Quando notar o bloqueio, dividir em 1 micro-passo destrava sem perder 15 min.`,
   evidence: `Detectado em ${tr.stuck} episódios reais no seu histórico de digitação + olhar.`
  });
 }
 if (peak !== null) {
  candidates.push({
   key: 'chronotype',
   tag: 'HORÁRIO DE OURO',
   concept: 'Mapeamento diário da sua janela cognitiva',
   lesson: `Pelos seus dados, seu pico de concentração acontece às ${peak}h${weak !== null ? `, enquanto às ${weak}h sua atenção dispersa mais` : ''}. Reserve tarefas exigentes para perto das ${peak}h.`,
   evidence: `Inferido automaticamente pelos seus blocos acumulados por faixa de horário.`
  });
 }
 if (candidates.length) {
  const idx = candidates.findIndex(c => c.key === autoProfile.lastTipKey);
  return candidates[(idx + 1) % candidates.length];
 }
 const m = methodologyForDay();
 return {
  key: 'fallback_day',
  tag: 'APRENDENDO SEU USO DO PC',
  concept: m.name,
  lesson: dayShares().total > 300 ? `${m.tip.charAt(0).toUpperCase() + m.tip.slice(1)}. Continuo calibrando suas dicas sem você precisar escolher nenhum método fixo.` : 'Use seu computador normalmente: a IA mapeia seus aplicativos, fluidez e pausas para sugerir melhorias sob medida.',
  evidence: dayShares().total > 300 ? `Baseado no uso de hoje: ${appsSentence()}.` : 'Calibrando nos primeiros minutos sem pedir configurações.'
 };
}
function methodologyForDay() {
 const s = dayShares();
 if (s.distraction > 0.2) return { name: 'Intenções de Implementação (Gollwitzer, 1999)', tip: 'combine consigo mesmo: "se eu abrir rede social, então fecho e anoto o que eu ia fazer"' };
 if (s.comm > 0.25) return { name: 'Agrupamento de mensagens e Resíduo de Atenção (Leroy, 2009)', tip: 'responda mensagens em 2 ou 3 horários fixos em vez de checar o tempo todo' };
 if (s.study > 0.5) return { name: 'Prática Distribuída com Autoexplicação (Dunlosky et al., 2013)', tip: `estude em ciclos de ${learnedThreshold()} min e, no fim de cada um, explique em voz alta o que aprendeu` };
 if (s.hobby > 0.4) return { name: 'Restauração da Atenção (Kaplan, 1995)', tip: 'o lazer de hoje recarregou sua atenção; aproveite e reserve um bloco para a tarefa principal no seu horário de pico' };
 return { name: 'Recuperação Ativa (Roediger e Karpicke, 2006)', tip: 'ao retomar um assunto no PC, tente lembrar em 1 minuto onde parou antes de reler tudo' };
}
function speakJarvisText(text) {
 try {
  if (!$('jarvisVoiceEnabled')?.checked || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text || '').replace(/["“”]/g, ''));
  u.lang = 'pt-BR'; u.rate = 1.03;
  window.speechSynthesis.speak(u);
 } catch (_) {}
}
let autoNoticeTimer = null;
function autoNotice(text) {
 notify(text);
 clearTimeout(autoNoticeTimer);
 autoNoticeTimer = setTimeout(() => { if ($('notice')?.textContent === text) $('notice').hidden = true; }, 14000);
}
function cadence(now) {
 const last60 = auto.inputs.filter(([t]) => now - t <= 60000).reduce((a, [, d]) => a + d, 0);
 const active = auto.inputs.filter(([, d]) => d > 0);
 const span = Math.max(1, (now - (auto.inputs[0]?.[0] || now)) / 60000);
 const baseline = active.reduce((a, [, d]) => a + d, 0) / span;
 return { last60, baseline };
}
function predictRisk(now) {
 const thr = learnedThreshold();
 const streakMin = auto.streakStart ? (now - auto.streakStart) / 60000 : 0;
 let risk = 8 + Math.min(57, (streakMin / thr) * 57) + Math.min(18, auto.switches.length * 3);
 if (auto.stuck) risk += 12;
 const v = window.compassoVision;
 if (v && performance.now() - v.ts < 5000 && v.posture === false) risk += 8;
 if (auto.kind === 'hobby' || auto.kind === 'idle') risk = Math.min(risk, 12);
 return { risk: Math.round(Math.min(97, risk)), streakMin, thr, eta: Math.max(0, Math.round(thr - streakMin)) };
}
function endStreak(now) {
 const mins = ((auto.streakBreakAt || now) - auto.streakStart) / 60000;
 if (mins >= 5) { autoProfile.focusRuns.push(Math.round(mins)); autoProfile.focusRuns = autoProfile.focusRuns.slice(-30); saveAutoProfile(); }
 auto.lastStreakMins = mins; auto.streakStart = null; auto.streakBreakAt = null;
}
function fire(type, p, cooldownMin = 20) {
 const now = Date.now();
 if (auto.fired[type] && now - auto.fired[type] < cooldownMin * 60000) return false;
 if (type !== 'boot' && now - auto.lastAny < 4 * 60000) return false;
 auto.fired[type] = now; auto.lastAny = now; auto.lesson = p;
 if (['stuck', 'fragmented', 'fatigue', 'distraction'].includes(type)) {
  autoProfile.triggers[type] = (autoProfile.triggers[type] || 0) + 1;
 }
 if (p.apply) { try { p.apply(); } catch (_) {} }
 if (p.narrative) auto.narrative = p.narrative;
 auto.feed.unshift({ t: new Date(), text: p.feed || p.concept });
 auto.feed = auto.feed.slice(0, 5);
 if (p.notice !== false && p.narrative) autoNotice(p.narrative);
 if (p.speak !== false) speakJarvisText(p.narrative);
 return true;
}
function evaluateInterventions(now, idleSec) {
 if (!$('aiAutopilot')?.checked || document.body.classList.contains('auth-active')) return;
 const user = getJarvisUserName(), greet = getJarvisGreetingPrefix();
 const p = predictRisk(now);
 // 1. Saudação automática ao iniciar com o Windows
 if (!auto.greeted) {
  auto.greeted = true;
  const peak = peakHour();
  const firstToday = autoProfile.greetDay !== localDay();
  autoProfile.greetDay = localDay(); saveAutoProfile();
  const hasTodayData = dayShares().total >= 600;
  const coaching = buildLearnedCoaching();
  fire('boot', {
   tag: 'BOAS-VINDAS', concept: hasTodayData ? coaching.concept : 'Aprendendo seu uso do PC automaticamente',
   lesson: hasTodayData
    ? coaching.lesson
    : 'Você não precisa selecionar Pomodoro ou modelos de estudo: estou observando seus aplicativos, fluidez de digitação e postura em segundo plano.',
   narrative: hasTodayData
    ? `${greet}, ${user}. Retomei o aprendizado contínuo. Hoje seu uso principal foi em ${appsSentence()}. ${coaching.lesson}`
    : `${greet}, ${user}. ${firstToday ? 'Iniciei com o Windows e já estou aprendendo sua rotina.' : 'Estou de volta observando seu uso do PC.'} ${peak !== null ? `Pelos seus dados, seu pico de foco costuma ser às ${peak}h.` : 'Use o computador normalmente — conforme eu aprender seu ritmo, vou ajustando suas dicas.'}`,
   evidence: 'Ação automática: sensores e sessão contínua iniciados sem cliques ou modelos fixos.',
   feed: 'Saudação automática · aprendizado contínuo de uso iniciado'
  });
  return;
 }
 // 2. Transições detectadas pelo próprio uso
 const tr = auto.transition; auto.transition = null;
 if (tr) {
  if ((tr.kind === 'study') && (tr.prev === 'hobby' || tr.prev === 'idle') && tr.dur >= 120) {
   auto.postBreakUntil = now + 5 * 60000;
  }
  if (tr.kind === 'hobby' && tr.prev === 'study' && tr.dur >= 300) {
   if (fire('hobby', {
    tag: 'PAUSA RECONHECIDA', concept: 'Restauração da Atenção (Kaplan, 1995)',
    lesson: 'Percebi que você saiu do estudo para algo que gosta. Lazer escolhido recarrega a atenção direcionada — silenciei os alertas enquanto você descansa.',
    narrative: `${user}, vi que você trocou para lazer depois de ${fmtMinutes(tr.dur)}. Aproveite sem culpa: silenciei os alertas e retomo quando você voltar.`,
    evidence: 'Ação automática: alertas de smartphone e janela única silenciados durante o hobby.',
    feed: `Lazer detectado após ${fmtMinutes(tr.dur)} · alertas silenciados`
   }, 30)) return;
  }
  if (tr.kind === 'study' && ['hobby', 'idle', 'comm'].includes(tr.prev) && tr.dur >= 300) {
   if (fire('return', {
    tag: 'RETORNO AO FOCO', concept: 'Recuperação Ativa (Roediger e Karpicke, 2006)',
    lesson: 'Ao retomar um trabalho no PC, tentar lembrar em 1 minuto onde parou antes de sair lendo fortalece a memória e retoma seu contexto rápido.',
    narrative: `Bem-vindo de volta, ${user}. Seu ciclo natural aprendido até aqui é de ~${learnedThreshold()} min.`,
    evidence: `Ação automática: retomada medida sem exigir clique ou novo cronômetro.`,
    feed: `Retorno ao estudo · ciclo natural ~${learnedThreshold()} min`
   }, 25)) return;
  }
 }
 // 3. Travamento: mesma janela, quase sem digitação, olhar fora do centro
 if (auto.stuck) {
  if (fire('stuck', {
   tag: 'TRAVAMENTO PROVÁVEL', concept: 'Sobrecarga da Memória de Trabalho (Sweller, 1988)',
   lesson: 'Quando uma tarefa ultrapassa o limite da memória de trabalho, a digitação congela antes de a pessoa fugir para abas distrativas. Dividir em 1 micro-passo destrava.',
   narrative: `${user}, notei uma pausa longa sem avançar neste trecho. Quebre em uma única dúvida ou etapa menor agora.`,
   evidence: 'Sinais: mesma janela >2 min, digitação quase parada e olhar desviado.',
   feed: 'Travamento detectado no uso real · micro-passo sugerido'
  })) return;
 }
 // 4. Fragmentação: muitas trocas de janela durante estudo
 if (auto.kind === 'study' && auto.switches.length >= 6) {
  if (fire('fragmented', {
   tag: 'ATENÇÃO FRAGMENTADA', concept: 'Resíduo de Atenção (Leroy, 2009)',
   lesson: 'Trocar rápido entre apps e mensagens deixa parte da atenção presa na tela anterior por vários minutos, reduzindo sua velocidade na tarefa principal.',
   narrative: `${user}, você alternou de janela ${auto.switches.length} vezes nos últimos 10 minutos. Ativei a proteção de janela única automaticamente.`,
   evidence: 'Ação automática: janela única ativada após excesso de alternâncias.',
   apply: () => { if ($('singleWindowEnabled')) $('singleWindowEnabled').checked = true; syncActiveFeaturePills(); },
   feed: `${auto.switches.length} trocas em 10 min · janela única ativada`
  })) return;
 }
 // 5. Fadiga prevista: passou do limiar pessoal aprendido
 if (auto.kind === 'study' && p.streakMin >= p.thr) {
  if (fire('fatigue', {
   tag: 'LIMIAR ATINGIDO', concept: 'Ciclo Ultradiano e Lei de Yerkes-Dodson',
   lesson: `Pelo que aprendi com seu uso, depois de ${p.thr} min seguidos sua fluidez e postura caem. Uma pausa rápida agora preserva seu desempenho.`,
   narrative: `${user}, você completou ${Math.round(p.streakMin)} min contínuos (seu limiar aprendido). Abri uma pausa 4-4-4 de 45s.`,
   evidence: 'Ação automática: micropausa 4-4-4 aberta e fechada sozinha.',
   apply: () => { openBreatheDialog(); setTimeout(() => { if ($('breatheDialog')?.open) $('breatheDialog').close(); }, 45000); },
   feed: `${Math.round(p.streakMin)} min contínuos · pausa 4-4-4 automática`
  }, 30)) return;
 }
 // 6. Distração prolongada
 if (auto.kind === 'distraction' && (now - auto.kindSince) > 6 * 60000) {
  if (fire('distraction', {
   tag: 'DISTRAÇÃO PROLONGADA', concept: 'Intenções de Implementação (Gollwitzer, 1999)',
   lesson: 'Combinar uma regra simples do tipo "se abrir rede social fora da pausa, volto ao projeto por 10 min" reduz recaídas automáticas.',
   narrative: `${user}, já se passaram ${fmtMinutes((now - auto.kindSince) / 1000)} em apps de distração. Volte por apenas 5 minutos para destravar o ritmo.`,
   evidence: 'Sinal: janela classificada como distração por >6 min seguidos.',
   feed: 'Distração longa detectada · plano se-então sugerido'
  }, 30)) return;
 }
 // 7. Comunicação contínua
 if (auto.kind === 'comm' && (now - auto.kindSince) > 15 * 60000) {
  if (fire('comm', {
   tag: 'MENSAGENS EM EXCESSO', concept: 'Agrupamento de comunicação',
   lesson: 'Responder mensagens o dia inteiro interrompe seu fluxo principal. Agrupar conversas em janelas curtas preserva seus blocos produtivos.',
   narrative: `${user}, você está há ${fmtMinutes((now - auto.kindSince) / 1000)} em apps de comunicação. Vale fechar depois deste bloco de respostas.`,
   evidence: 'Sinal: aplicativo de comunicação ativo continuamente >15 min.',
   feed: 'Comunicação longa · agrupamento sugerido'
  }, 40)) return;
 }
 // 8. Evolução do aprendizado: entrega dicas personalizadas conforme aprende mais sobre o PC
 if (now - auto.lastTipAt > 18 * 60000 && dayShares().total > 3 * 60) {
  const tip = buildLearnedCoaching();
  if (tip && tip.key !== autoProfile.lastTipKey) {
   if (fire('learning_tip', {
    tag: tip.tag, concept: tip.concept, lesson: tip.lesson,
    narrative: `${user}, observando como você usa o PC: ${tip.lesson}`,
    evidence: tip.evidence,
    feed: `Novo insight aprendido: ${tip.concept}`,
    speak: false, notice: false
   }, 15)) {
    auto.lastTipAt = now;
    autoProfile.lastTipKey = tip.key;
    saveAutoProfile();
    return;
   }
  }
 }
 // 9. Resumo automático do cotidiano a cada hora de uso
 if (now - auto.lastBriefing > 60 * 60000 && dayShares().total > 20 * 60) {
  auto.lastBriefing = now;
  const coaching = buildLearnedCoaching();
  if (fire('briefing', {
   tag: 'RESUMO DO SEU USO', concept: coaching.concept,
   lesson: coaching.lesson,
   narrative: `Olá ${user}, seu dia até agora concentrou-se em ${appsSentence()}. ${coaching.lesson}`,
   evidence: coaching.evidence,
   feed: 'Resumo horário gerado a partir do seu uso real'
  }, 55)) return;
 }
 // 10. Fechamento do dia (após 21h, uma vez por dia)
 if (new Date().getHours() >= 21 && autoProfile.wrapDay !== localDay() && dayShares().total > 30 * 60) {
  autoProfile.wrapDay = localDay(); saveAutoProfile();
  const coaching = buildLearnedCoaching(), peak = peakHour();
  fire('wrap', {
   tag: 'FECHAMENTO DO DIA', concept: coaching.concept,
   lesson: `${coaching.lesson}${peak !== null ? ` Seu pico hoje foi às ${peak}h.` : ''}`,
   narrative: `${user}, hoje você usou principalmente ${appsSentence()}. ${coaching.lesson}`,
   evidence: 'Fonte: histórico real aprendido no seu computador, zero cliques.',
   feed: 'Fechamento do dia e aprendizado salvo'
  }, 600);
 }
}
function renderAutopilot(now) {
 if (!$('cognitiveTwinCard')) return;
 const user = getJarvisUserName(), greet = getJarvisGreetingPrefix(), p = predictRisk(now), runs = learnedRuns();
 const boot = new Date(auto.bootAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
 $('jarvisGreetingTitle').textContent = `${greet}, ${user} · aprendendo desde ${boot}`;
 const learnedApps = Object.keys(autoProfile.appStats || {}).length;
 $('twinConfidenceBadge').textContent = $('aiAutopilot')?.checked
  ? `Aprendendo · ${learnedApps} apps · ${Math.min(96, 38 + runs * 5 + learnedApps * 2)}% conf.`
  : 'Copiloto pausado';
 $('jarvisDailyNarrative').textContent = auto.narrative || `Observando seu uso do PC em segundo plano. Até agora: ${appsSentence()}.`;
 const app = state?.live?.app || '—';
 $('jarvisNowLine').textContent = `Agora: ${app} · ${KIND_LABEL[auto.kind]} há ${fmtMinutes((now - auto.kindSince) / 1000)}${auto.streakStart ? ` · foco contínuo ${Math.round(p.streakMin)} min` : ''}${auto.stuck ? ' · possível travamento' : ''}`;
 $('twinRealCycle').textContent = `${p.thr} min`;
 $('twinRealCycleSub').textContent = runs >= 3 ? `Mediana de ${runs} ciclos reais seus` : `Calibrando · ${runs}/3 ciclos observados`;
 const s = dayShares(), top = topApps(1)[0], gain = breakGainPct();
 $('twinTriggerPattern').textContent = top ? `${top[0]} (${Math.round((s.study || 0) * 100)}% foco)` : 'Observando uso';
 $('twinTriggerSub').textContent = gain !== null
  ? `Lazer ${Math.round(s.hobby * 100)}% · Distração ${Math.round(s.distraction * 100)}% · Pausas elevam fluidez em ${gain > 0 ? '+' : ''}${gain}%`
  : `Estudo ${Math.round(s.study * 100)}% · Lazer ${Math.round(s.hobby * 100)}% · Mensagens ${Math.round(s.comm * 100)}% · Distração ${Math.round(s.distraction * 100)}%`;
 const color = p.risk >= 70 ? '#ef4444' : p.risk >= 45 ? '#fb923c' : '#10b981';
 $('twinPredictionRisk').textContent = `Risco ${p.risk}%`;
 $('twinPredictionRisk').style.color = color;
 $('twinPredictionBar').style.width = `${p.risk}%`;
 $('twinPredictionBar').style.background = color;
 $('twinPredictionSub').textContent = auto.kind === 'hobby' ? 'Hobby reconhecido · alertas silenciados'
  : auto.kind === 'idle' ? 'Você está longe do computador'
  : auto.streakStart ? (p.eta > 0 ? `Queda de atenção prevista em ~${p.eta} min` : 'Passou do seu limite habitual')
  : 'Mapeando fluidez entre aplicativos';
 const l = auto.lesson || (dayShares().total > 90 ? buildLearnedCoaching() : null);
 $('twinLessonTag').textContent = l?.tag || 'APRENDENDO SEU USO';
 $('twinConceptTitle').textContent = l?.concept || 'Mapeamento silencioso do seu cotidiano';
 $('twinLessonText').textContent = l?.lesson || 'Você não precisa selecionar nenhum modelo pronto: a IA aprende como você trabalha, estuda e descansa para melhorar seu ritmo automaticamente.';
 $('twinHabitEvidence').textContent = l?.evidence || 'Ação automática: coletando fluidez e transições de janela.';
 const feedSig = auto.feed.map(f => f.t.getTime()).join(',');
 if ($('jarvisFeed').dataset.sig !== feedSig) {
  $('jarvisFeed').dataset.sig = feedSig;
  $('jarvisFeed').innerHTML = auto.feed.map(f => `<li><time>${f.t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><span>${esc(f.text)}</span></li>`).join('');
 }
 if ($('gadgetAiNow')) {
  $('gadgetAiNow').textContent = auto.kind === 'hobby' ? `${app} · Hobby (silencioso)` : `${app} · ${KIND_LABEL[auto.kind]} · Risco ${p.risk}%`;
 }
 if ($('gadgetAiTip')) {
  $('gadgetAiTip').textContent = l?.concept || `Ritmo natural ~${p.thr} min · aprendendo seu uso`;
 }
}
function syncReportAppsIntoProfile() {
 const apps = state?.report?.apps;
 if (!Array.isArray(apps)) return;
 const day = localDay();
 if (autoProfile.day !== day) { autoProfile.day = day; autoProfile.dayKinds = {}; autoProfile.dayApps = {}; }
 for (const a of apps) {
  if (!a?.app || /compasso/i.test(a.app)) continue;
  const k = classifyActivity({ app: a.app, window_title: '' }, a.category);
  const cur = autoProfile.dayApps[a.app];
  const sec = Math.max(0, Number(a.seconds) || 0);
  if (!cur || sec > cur.s + 5) {
   const diff = sec - (cur?.s || 0);
   autoProfile.dayApps[a.app] = { s: sec, k };
   if (diff > 5) autoProfile.dayKinds[k] = (autoProfile.dayKinds[k] || 0) + diff;
  }
  const st = autoProfile.appStats[a.app] || (autoProfile.appStats[a.app] = { sec: 0, kind: k, samples: 0, cadenceSum: 0, switches: 0 });
  if (sec > st.sec) st.sec = sec;
  st.kind = k;
 }
}
function autopilotTick() {
 if (!state) return;
 syncReportAppsIntoProfile();
 const now = Date.now(), dt = auto.lastTick ? Math.min(5, (now - auto.lastTick) / 1000) : 0; auto.lastTick = now;
 const live = state.live || {};
 const inputTotal = (state.report?.keys || 0) + (state.report?.clicks || 0) + (state.report?.scroll || 0);
 const delta = auto.lastInput === null ? 0 : Math.max(0, inputTotal - auto.lastInput);
 const app = live.app || '';
 const win = `${app}|${live.window_title || ''}`;
 if (win !== auto.window) { auto.window = win; auto.windowSince = now; auto.lastInputAt = now; }
 if (delta > 0 || (auto.lastMouse !== undefined && auto.lastMouse !== `${live.mouse_x},${live.mouse_y}`)) auto.lastInputAt = now;
 auto.lastMouse = `${live.mouse_x},${live.mouse_y}`;
 auto.lastInput = inputTotal;
 auto.inputs.push([now, delta]); auto.inputs = auto.inputs.filter(([t]) => now - t <= 600000);
 let kind = classifyActivity(live, state.category);
 const idleSec = (now - auto.lastInputAt) / 1000;
 if (idleSec > 150 && kind !== 'hobby' && live.hooks !== false) kind = 'idle';
 const switchedApp = Boolean(app && auto.lastApp && app !== auto.lastApp && !/compasso/i.test(app));
 if (app && app !== auto.lastApp) { if (switchedApp) auto.switches.push(now); auto.lastApp = app; }
 auto.switches = auto.switches.filter(t => now - t <= 600000);
 const day = localDay();
 if (autoProfile.day !== day) { autoProfile.day = day; autoProfile.dayKinds = {}; autoProfile.dayApps = {}; }
 autoProfile.dayKinds[kind] = (autoProfile.dayKinds[kind] || 0) + dt;
 if (app && kind !== 'idle' && !/compasso/i.test(app)) {
  const a = autoProfile.dayApps[app] || (autoProfile.dayApps[app] = { s: 0, k: kind }); a.s += dt; a.k = kind;
  const st = autoProfile.appStats[app] || (autoProfile.appStats[app] = { sec: 0, kind, samples: 0, cadenceSum: 0, switches: 0 });
  st.sec += dt; st.kind = kind;
  if (switchedApp) st.switches += 1;
 }
 const hb = autoProfile.hourly[new Date().getHours()] || (autoProfile.hourly[new Date().getHours()] = {}); hb[kind] = (hb[kind] || 0) + dt;
 if (kind === 'study') { if (!auto.streakStart) auto.streakStart = now; auto.streakBreakAt = null; }
 else if (auto.streakStart) {
  if (kind === 'neutral') { if (!auto.streakBreakAt) auto.streakBreakAt = now; if (now - auto.streakBreakAt > 60000) endStreak(now); }
  else { auto.streakBreakAt = auto.streakBreakAt || now; endStreak(now); }
 }
 const c = cadence(now), v = window.compassoVision;
 if (app && kind === 'study' && c.last60 > 0 && dt >= 0.8 && !/compasso/i.test(app)) {
  const st = autoProfile.appStats[app];
  if (st) { st.cadenceSum += c.last60; st.samples += 1; }
  const rec = autoProfile.recovery;
  if (now < auto.postBreakUntil) { rec.afterBreakCadence += c.last60; rec.afterBreakSamples += 1; }
  else { rec.steadyCadence += c.last60; rec.steadySamples += 1; }
 }
 const visionFresh = v && performance.now() - v.ts < 5000;
 const gazeAway = visionFresh ? (v.gaze && v.gaze !== 'center') : (c.baseline >= 25 && idleSec < 90);
 auto.stuck = live.hooks !== false && kind === 'study' && now - auto.windowSince > 120000 && c.last60 <= 2 && c.baseline >= 15 && gazeAway && idleSec < 150;
 if (kind !== auto.kind) { auto.transition = { kind, prev: auto.kind, dur: (now - auto.kindSince) / 1000 }; auto.prevKind = auto.kind; auto.kind = kind; auto.kindSince = now; }
 window.compassoSuppressAlerts = kind === 'hobby' || kind === 'idle';
 if (now - auto.lastSave > 30000) { auto.lastSave = now; saveAutoProfile(); }
 evaluateInterventions(now, idleSec);
 renderAutopilot(now);
}
let jarvisBooted = false, jarvisBootTries = 0;
async function tryJarvisAutonomousBoot() {
 if (jarvisBooted || !state || document.body.classList.contains('auth-active')) return;
 jarvisBooted = true;
 if (!$('aiAutopilot')?.checked) return;
 try {
  if (!state.startup) api('startup', { enabled: true }).catch(() => {});
  if (!state.active) {
   const proj = $('project')?.value || 'Uso Contínuo (IA · Automático)';
   try {
    await api('start', { project: proj, goal: 0, ...(window.contextStartOptions?.() || {}) });
   } catch (_) {
    await api('start', { project: proj, goal: 0 });
   }
   const r = await fetch('/api/state');
   if (r.ok) state = await r.json();
   if (state?.active?.goal === 0 && $('goal')) { $('goal').value = 'continuous'; if ($('customGoalField')) $('customGoalField').hidden = true; }
  }
  if (!cameraOn && !cameraStarting && $('cameraAuto')?.checked) startCamera(false).catch(() => {});
 } catch (_) {
  if (++jarvisBootTries < 3) setTimeout(() => { jarvisBooted = false; }, 3000);
 }
}
function updateCognitiveTwinMentor() {
 tryJarvisAutonomousBoot();
 autopilotTick();
}
window.addEventListener('pagehide', saveAutoProfile);

window.addEventListener('pagehide',stopCamera);
let refreshing=false;setInterval(async()=>{if(refreshing)return;refreshing=true;try{await refresh();}catch(e){notify('Conexão local interrompida. Reabra o Compasso para continuar.');}finally{refreshing=false;}},1000);
refresh().catch(e=>notify(e.message));
