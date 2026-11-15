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
 const grd = $('guardEnabled')?.checked ?? true;
 const ai = $('aiAuto')?.checked ?? true;
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
 setPill('pillAi', ai, modelName, 'IA manual');
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
 if ($('gadgetModeLabel')) $('gadgetModeLabel').textContent = gadgetHandsUseSession ? 'CRON\u00D4METRO' : 'HORA LOCAL';
 if ($('gadgetTimer') && typeof clock === 'function') $('gadgetTimer').textContent = clock(elapsed);
 if ($('gadgetStatus')) {
  const st = active ? (paused ? 'PAUSADO' : 'EM FOCO') : 'PRONTO';
  const gl = goal ? `${goal}M` : 'LIVRE';
  $('gadgetStatus').textContent = `${st} \u00B7 ${gl}`;
 }
 if ($('gadgetProgressArc')) {
  const circum = 571.77;
  const ratio = goal > 0 ? Math.min(1, elapsed / (goal * 60)) : (active ? ((elapsed % 3600) / 3600) : 0);
  $('gadgetProgressArc').style.strokeDashoffset = (circum * (1 - ratio)).toFixed(2);
 }
 if ($('gadgetToggleRun')) {
  $('gadgetToggleRun').textContent = !active ? 'Iniciar' : (paused ? 'Retomar' : 'Pausar');
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
function toggleWidgetMode() {
 isWidgetMode = !isWidgetMode;
 document.body.classList.toggle('widget-mode', isWidgetMode);
 const lbl = $('widgetToggleLabel');
 if (lbl) lbl.textContent = isWidgetMode ? 'Expandir' : 'Rel\u00F3gio';
 else if ($('widgetToggle')) $('widgetToggle').textContent = isWidgetMode ? 'Expandir' : 'Rel\u00F3gio';
 updateWin7ClockGadget();
 try {
  if (window.screen && screen.availWidth) {
   if (isWidgetMode) {
    const gw = 260, gh = 290;
    window.resizeTo(gw, gh);
    window.moveTo(Math.max(0, screen.availWidth - gw - 24), 24);
    if (!pinned) {
     pinned = true;
     api('pin');
     $('pin').textContent = 'Fixado';
    }
   } else {
    centerCompassoWindow();
   }
  }
 } catch(_) {}
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
 showTutorialStep(0);
 $('tutorialDialog').showModal();
}
if ($('openTutorial')) $('openTutorial').onclick = openTutorial;
if ($('closeTutorial')) $('closeTutorial').onclick = () => $('tutorialDialog').close();
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
 if ($('breatheDialog')) $('breatheDialog').showModal();
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
  b.textContent = `${acc.name || acc.email} (${acc.preset || 50}m)`;
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
 if (user?.preset && typeof window.setCompassoGoal === 'function') {
  window.setCompassoGoal(Number(user.preset) || 50);
 } else if (user?.preset && $('goal')) {
  $('goal').value = String(user.preset);
 }
 document.body.classList.remove('auth-active');
 centerCompassoWindow();
 if (isNewProfile) {
  notify(`Perfil "${displayName}" criado e ativado (${user.preset || 50} min).`);
 }
 if (!localStorage.getItem('compasso.tutorialSeen')) {
  setTimeout(openTutorial, 450);
 }
}
try {
 const savedUserRaw = localStorage.getItem('compasso.authUser');
 if (savedUserRaw) {
  const savedUser = JSON.parse(savedUserRaw);
  if ($('authEmail') && savedUser.email) $('authEmail').value = savedUser.email;
  if ($('authName') && savedUser.name) $('authName').value = savedUser.name;
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
  preset: Number($('authPreset')?.value || 50)
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
 const preset = Number($('authPreset')?.value || 50);
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
 const user = { name, email, pass, preset: authMode === 'register' ? preset : (existing?.preset || 50), remember: !!$('authRemember')?.checked };
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
let state=null, report=null, token='', tab='focus', pinned=false, suggested=25, stream=null, model=null, cameraOn=false, cameraManual=false, videoVisible=true, cameraGeneration=0;
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
function getGoal(strict=false){const mode=$('goal').value;if(mode==='continuous')return 0;const value=Number(mode==='custom'?$('customGoal').value:mode);if(!Number.isInteger(value)||value<1||value>1440){if(strict)throw Error('Escolha de 1 a 1440 minutos, ou o modo contínuo.');return 50;}return value;}
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
 $('status').textContent=active?(state.paused?'Pausado \u00B7 4-4-4':'Fase 2 \u00B7 Execu\u00E7\u00E3o'):'Fase 1 \u00B7 Previs\u00E3o';
 $('start').disabled=active;$('start').textContent=active?'Em andamento':'Iniciar foco';$('start').classList.toggle('running-indicator',active);$('pause').disabled=!active;$('finish').disabled=!active;$('cancelSession').disabled=!active;$('pause').textContent=state.paused?'Retomar':'Pausar';
 $('project').disabled=active;$('goal').disabled=active;
 const goal=active?state.active.goal:getGoal();
 $('goalLabel').textContent=goal?(active?`${state.active.project} · ${goal} min`:`${goal} min`):'Cont\u00EDnuo';
 $('progress').style.width=goal?Math.min(100,state.elapsed/(goal*60)*100)+'%':'0%';document.querySelector('.progress').hidden=!goal;
 $('customGoal').disabled=active;
 if(!active||state.paused){lockedTaskApp=null;downwardGazeSince=0;}
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
 if(cameraOn&&!cameraManual&&(!active||state.paused))stopCamera();
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
 suggested=r.total>=1500&&pct(r.categories.distraction,r.total)<20?50:25;
 const reasons=[];
 if(!r.total)reasons.push('Inicie um bloco para gerar indicadores.');
 if(pred.fatigue&&pred.fatigue>=50)reasons.push(`Fadiga: ${pred.fatigueDesc}`);
 if(pred.dispersion&&pred.dispersion>=50)reasons.push(`Dispersão: ${pred.dispersionDesc}`);
 if(r.total&&r.categories.neutral/r.total>.4)reasons.push(`${pct(r.categories.neutral,r.total)}% neutro — classifique os apps no Relatório.`);
 if(r.total&&r.categories.distraction/r.total>.15)reasons.push(`${duration(r.categories.distraction)} em distração.`);
 if((r.window_switches||r.switches)>10)reasons.push(`${r.window_switches||r.switches} trocas de janela.`);
 if(r.gaze_coverage&&r.gaze_directions.center/r.gaze_coverage<.6)reasons.push(`Olhar fora do centro (${pct(r.gaze_coverage-r.gaze_directions.center,r.gaze_coverage)}%).`);
 if(r.pose_coverage&&r.posture/r.pose_coverage<.6)reasons.push('Desvio postural detectado.');
 if(r.total&&!reasons.length)reasons.push('Ritmo consistente e postura alinhada.');
 const plan=[
  `Próximo bloco ideal: ${pred.optimalRemaining||suggested} min.`,
  `Intervenção: ${pred.breakTime.toLowerCase()}.`,
  `Mantenha apenas a janela principal aberta.`
 ];
 return {index,coverage,reasons,plan,pred};
}
function renderInsights(){
 const r=report,a=insights(r),pred=a.pred;
 $('score').textContent=a.index??'—';
 $('scoreLabel').textContent=a.index===null?'Sem dados':a.index>=70?'Consistente':a.index>=40?'Moderado':'Fragmentado';
 $('analysisFacts').innerHTML=`<div>• Foco / leitura: <span class="focus">${duration(r.categories.focus+r.categories.study)}</span></div><div>• Distração: <span class="distraction">${pct(r.categories.distraction,r.total)}%</span></div><div>• Cobertura visual: ${a.coverage}%</div><div>• Próximo bloco: ${suggested} min</div>`;
 $('bottlenecks').innerHTML=a.reasons.map(t=>`<div>${esc(t)}</div>`).join('');
 $('plan').innerHTML=a.plan.map(t=>`<li>${esc(t)}</li>`).join('');
 $('applyBlock').textContent=`Aplicar bloco (${suggested} min)`;
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
$('applyBlock').onclick=()=>{if(state.active)return notify('Conclua a sessão atual para alterar o bloco.');window.setCompassoGoal?.(suggested);setTab('focus');notify(`Bloco ajustado para ${suggested} minutos. Clique em Iniciar foco quando estiver pronto.`);};
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
 const wasOn=cameraOn;cameraGeneration++;cameraOn=false;cameraManual=false;
 if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
 $('video').srcObject=null;$('video').hidden=true;$('cameraPlaceholder').hidden=false;
 $('cameraToggle').textContent='Ativar câmera';$('cameraStatus').textContent='Câmera desligada';$('points').textContent='';
 const canvas=$('hud');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 for(const id of ['gaze','head','posture','face']){$(id).textContent='Câmera desligada';$(id).title='';}
 $('signalMetrics').textContent='Ative a câmera durante uma sessão para ver os ângulos.';
 cancelCalibration();calibrated=null;lastLandmarks=null;autoCalibrationSamples=[];lastRaw=null;
 if(wasOn&&token)api('camera_off',{},true).catch(()=>{});
}
async function startCamera(manual=false){
 if(manual)cameraManual=true;
 const generation=++cameraGeneration;$('cameraToggle').disabled=true;$('cameraStatus').textContent='Carregando modelos locais…';
 try{
  const acquired=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:360},facingMode:'user'},audio:false});
  if(generation!==cameraGeneration){acquired.getTracks().forEach(t=>t.stop());return;}
  stream=acquired;$('video').srcObject=stream;await $('video').play();
  if(!model){model=new Holistic({locateFile:file=>'/mediapipe/'+file});model.setOptions({modelComplexity:0,smoothLandmarks:true,refineFaceLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});model.onResults(onResults);}
  const settings=stream.getVideoTracks()[0].getSettings?.()||{};
  calibrationKey=CompassoCalibration.key({deviceId:settings.deviceId||'default-camera'},$('video').videoWidth||640,$('video').videoHeight||360,{width:screen.width,height:screen.height,pixelRatio:devicePixelRatio});
  calibrated=CompassoCalibration.load(calibrationStorage(),calibrationKey);calibrationStored=!!calibrated;
  cameraOn=true;calibrationPrompted=!!calibrated;autoCalibrationSamples=[];lastRaw=null;blinkCount=0;totalBlinks=0;blinkClosed=false;lastCameraSend=0;showCalibrationSaved();
  $('hud').width=$('video').videoWidth;$('hud').height=$('video').videoHeight;
  $('cameraPlaceholder').hidden=true;$('video').hidden=!videoVisible;$('cameraToggle').textContent='Desligar câmera';
  stream.getVideoTracks()[0].addEventListener('ended',()=>{stopCamera();notify('A câmera foi desconectada. Você pode continuar sem ela.');});
  frame(generation);
 }catch(e){stopCamera();notify('Não foi possível abrir a câmera: '+e.message);}finally{$('cameraToggle').disabled=false;}
}
async function frame(generation){if(!cameraOn||generation!==cameraGeneration)return;if(!cameraBusy){cameraBusy=true;try{await model.send({image:$('video')});}catch(e){if(generation===cameraGeneration){stopCamera();notify('Falha no modelo de câmera: '+e.message);}}finally{cameraBusy=false;}}if(cameraOn&&generation===cameraGeneration)setTimeout(()=>frame(generation),100);}
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
 if(state?.active&&!state?.paused&&$('smartphoneAlertEnabled')?.checked){
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
let currentHabitLessonIdx = 0;
let manualLessonOverride = false;
let ambientIdleTicks = 0;
const CompassoHabitLessons = [
 {
  realCycle: '34 min',
  realCycleSub: 'Queda recorrente aos ~34m (vs. 50m tentados)',
  trigger: 'Inércia > 90s',
  triggerSub: 'Parada em leitura densa antecede 80% das trocas',
  risk: 78,
  riskColor: '#fb923c',
  predSub: 'Fadiga cervical/motora prevista em ~4 min',
  concept: 'Sobrecarga da Memória de Trabalho (Sweller, 1988)',
  lesson: 'A IA aprendeu no seu cotidiano que você não abre abas distrativas por acaso, mas após ficar >90s parado em um trecho complexo. Quando a memória operacional excede ~4 blocos, o cérebro busca alívio dopaminérgico trocando de janela.',
  evidence: 'Sinal preditivo: queda de 42% na cadência + inclinação cervical de 6° após 30 min.',
  actionLabel: 'Ajustar ritmo para 35 min (1 clique)',
  actionType: 'set_35'
 },
 {
  realCycle: '28 min',
  realCycleSub: 'Fragmentação detectada após 3+ trocas de janela',
  trigger: 'Alternância Rápida',
  triggerSub: 'IDE ↔ Mensagens a cada 6 min reduz retenção',
  risk: 84,
  riskColor: '#ef4444',
  predSub: 'Risco alto de perda de contexto nos próximos 3 min',
  concept: 'Efeito do Resíduo de Atenção (Sophie Leroy, 2009)',
  lesson: 'A IA identificou que suas micro-trocas rápidas de janela deixam ~22% da sua atenção presa na janela anterior por até 12 minutos. Mesmo voltando rápido ao estudo, seu cérebro opera com capacidade reduzida.',
  evidence: 'Sinal preditivo: múltiplas alternâncias de janela registradas no bloco atual.',
  actionLabel: 'Ativar Blindagem Janela Única + 25m (1 clique)',
  actionType: 'lock_single_window'
 },
 {
  realCycle: '36 min',
  realCycleSub: 'Pico de eficiência entre o min 8 e o min 34',
  trigger: 'Exaustão Ultradiana',
  triggerSub: 'Insistir após o min 36 dobra erros e releituras',
  risk: 68,
  riskColor: '#fb923c',
  predSub: 'Início da curva de retorno decrescente em ~5 min',
  concept: 'Ciclo Ultradiano & Lei de Yerkes-Dodson (1908)',
  lesson: 'Seu histórico mostra que forçar 50 ou 60 minutos contínuos gera "falso estudo" nos 15 minutos finais: você permanece sentado, mas a consolidação sináptica despenca por fadiga autonômica.',
  evidence: 'Sinal preditivo: desaceleração motora progressiva detectada após o minuto 32.',
  actionLabel: 'Iniciar Micropausa 4-4-4 Agora (1 clique)',
  actionType: 'open_breathe'
 },
 {
  realCycle: '40 min',
  realCycleSub: 'Estabilidade visual alta nas primeiras 35 min',
  trigger: 'Fadiga Ocular Precoce',
  triggerSub: 'Queda de piscadas + projeção cervical > 7°',
  risk: 24,
  riskColor: '#10b981',
  predSub: 'Fluxo cognitivo estável pelos próximos 12 min',
  concept: 'Marcadores Somáticos de Fadiga Precoce (Ergonomia Cognitiva)',
  lesson: 'Antes de você sentir cansaço consciente, seu corpo dá dois avisos 6 minutos antes: redução de piscadas (olho seco fixo no monitor) e inclinação involuntária do tronco/cabeça para frente.',
  evidence: 'Sinal preditivo: postura e olhar alinhados; auto-piloto monitorando silenciosamente.',
  actionLabel: 'Calibrar Alerta Precoce Postural (1 clique)',
  actionType: 'enable_posture_guard'
 }
];
function renderHabitLesson(idx) {
 const item = CompassoHabitLessons[idx % CompassoHabitLessons.length];
 if (!$('cognitiveTwinCard')) return;
 $('twinRealCycle').textContent = item.realCycle;
 $('twinRealCycleSub').textContent = item.realCycleSub;
 $('twinTriggerPattern').textContent = item.trigger;
 $('twinTriggerSub').textContent = item.triggerSub;
 $('twinPredictionRisk').textContent = `Risco ${item.risk}%`;
 $('twinPredictionRisk').style.color = item.riskColor;
 $('twinPredictionBar').style.width = `${item.risk}%`;
 $('twinPredictionBar').style.background = item.riskColor;
 $('twinPredictionSub').textContent = item.predSub;
 $('twinConceptTitle').textContent = item.concept;
 $('twinLessonText').textContent = item.lesson;
 $('twinHabitEvidence').textContent = item.evidence;
 $('twinApplyActionBtn').textContent = item.actionLabel;
 $('twinApplyActionBtn').dataset.actionType = item.actionType;
}
function updateCognitiveTwinMentor() {
 if (!$('cognitiveTwinCard')) return;
 const autoOn = $('aiAutopilot')?.checked;
 if ($('twinConfidenceBadge')) {
  $('twinConfidenceBadge').textContent = autoOn ? 'Auto-Piloto IA · 88% conf.' : 'Modo Manual · IA Passiva';
 }
 if (!manualLessonOverride && state) {
  const mins = (state.elapsed || 0) / 60;
  const switches = state.report?.window_switches || 0;
  if (switches >= 6) currentHabitLessonIdx = 1;
  else if (mins >= 30) currentHabitLessonIdx = 2;
  else if (state.active) currentHabitLessonIdx = 0;
  renderHabitLesson(currentHabitLessonIdx);
 }
 if (autoOn && state && !state.active && state.live?.hooks && state.category !== 'distraction') {
  ambientIdleTicks++;
  if (ambientIdleTicks === 15) {
   notify('Auto-Piloto IA: fluxo de estudo detectado no seu cotidiano. Aprendendo seus padrões silenciosamente.');
  }
 } else {
  ambientIdleTicks = 0;
 }
}
if ($('cycleHabitLessonBtn')) $('cycleHabitLessonBtn').onclick = () => {
 manualLessonOverride = true;
 currentHabitLessonIdx = (currentHabitLessonIdx + 1) % CompassoHabitLessons.length;
 renderHabitLesson(currentHabitLessonIdx);
};
if ($('twinApplyActionBtn')) $('twinApplyActionBtn').onclick = () => {
 const act = $('twinApplyActionBtn').dataset.actionType || 'set_35';
 if (act === 'set_35') {
  if ($('goal')) { $('goal').value = 'custom'; }
  if ($('customGoalField')) $('customGoalField').hidden = false;
  if ($('customGoal')) $('customGoal').value = 35;
  if ($('goalLabel')) $('goalLabel').textContent = 'Ciclo Aprendido IA · 35 min';
  notify('IA Preditiva: Seu bloco foi ajustado automaticamente para 35 min (seu limiar biológico real).');
 } else if (act === 'lock_single_window') {
  if ($('singleWindowEnabled')) $('singleWindowEnabled').checked = true;
  if ($('goal')) $('goal').value = '25';
  syncActiveFeaturePills();
  notify('IA Preditiva: Modo Janela Única blindado e sprint de 25 min configurado para eliminar Resíduo de Atenção.');
 } else if (act === 'open_breathe') {
  openBreatheDialog();
 } else if (act === 'enable_posture_guard') {
  if ($('smartphoneAlertEnabled')) $('smartphoneAlertEnabled').checked = true;
  syncActiveFeaturePills();
  if (!cameraOn) startCamera(true);
  notify('IA Preditiva: Monitoramento de marcadores somáticos precoces (olhar/cervical) ativado.');
 }
};
renderHabitLesson(0);
window.addEventListener('pagehide',stopCamera);
let refreshing=false;setInterval(async()=>{if(refreshing)return;refreshing=true;try{await refresh();}catch(e){notify('Conexão local interrompida. Reabra o Compasso para continuar.');}finally{refreshing=false;}},1000);
refresh().catch(e=>notify(e.message));
