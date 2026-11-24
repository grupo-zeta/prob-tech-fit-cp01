'use strict';
const $ = id => document.getElementById(id);
let isWidgetMode = false;
let widgetSignalSeq = 0, widgetSignalTimer = null;
let pendingBlockDomainParam = null;
let isSilentBgRespawn = false;
function emitWidgetDesktopSignal(signal) {
 if (!isWidgetMode || !signal) return;
 widgetSignalSeq += 1;
 document.title = `Compasso • Widget | ${signal}#${widgetSignalSeq}`;
 clearTimeout(widgetSignalTimer);
 widgetSignalTimer = setTimeout(() => {
  if (isWidgetMode) document.title = 'Compasso • Widget';
 }, 9500);
}
function emitPartnerTipToast(tag, text) {
 if (!isWidgetMode || !$('partnerTipsToastEnabled')?.checked) return;
 const cleanTag = String(tag || 'Parceiro IA').replace(/[|#\r\n]+/g, ' ').trim().slice(0, 32);
 const cleanMsg = String(text || '').replace(/[|#\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
 if (!cleanMsg) return;
 emitWidgetDesktopSignal(`TIP:${cleanTag}|${cleanMsg}`);
}
const hudTabId = Math.random().toString(36).slice(2);
const hudBc = typeof BroadcastChannel === 'function' ? new BroadcastChannel('compasso-hud') : null;
if (hudBc) {
 hudBc.onmessage = ev => {
  if (ev?.data?.type === 'panel-active' && ev.data.sender !== hudTabId && isWidgetMode) {
   try { if (typeof stopCamera === 'function' && cameraOn) stopCamera(); } catch(_) {}
   try { window.close(); } catch(_) {}
  }
 };
}
try {
 const bootParams = new URLSearchParams(location.search);
 if (bootParams.get('block')) pendingBlockDomainParam = bootParams.get('block').trim().toLowerCase();
 isSilentBgRespawn = bootParams.get('bg') === '1';
 const hasAuth = Boolean(localStorage.getItem('compasso.authUser'));
 const wantWidget = !bootParams.has('panel') && (bootParams.has('startup') || (hasAuth && JSON.parse(localStorage.getItem('compasso.widgetOnStartup') ?? 'true')));
 document.title = bootParams.has('panel') ? 'Compasso • Painel' : (wantWidget ? 'Compasso • Widget' : 'Compasso • Login');
} catch(_) {}
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
 const meshOnly = $('meshOnlyEnabled')?.checked ?? false;
 const tipsOn = $('partnerTipsToastEnabled')?.checked ?? true;
 const sng = $('singleWindowEnabled')?.checked ?? true;
 const cap = $('captureEnabled')?.checked ?? true;
 const grd = Boolean($('guardEnabled')?.checked && state?.context?.extension_connected);
 const prov = $('analysisProvider')?.value || 'local';
 const ai = prov !== 'local' && ($('aiAuto')?.checked ?? false);
 const modelName = ($('localModel')?.value || 'gemma3:4b').trim() || 'gemma3:4b';
 const intervalVal = $('captureInterval')?.value || '60';
 const intervalLabel = intervalVal === '30' ? '30s' : intervalVal === '120' ? '2m' : '1m';
 const setPill = (id, on, textOn, textOff) => {
  const el = $(id);
  if (!el) return;
  el.className = on ? 'pill-on' : 'pill-off';
  el.textContent = on ? textOn : textOff;
 };
 setPill('pillCamera', cam, 'C\u00E2mera ativa', 'C\u00E2mera off');
 setPill('pillSmartphone', smt, 'Anti-celular', 'Anti-celular off');
 if ($('pillPrivacy')) {
  $('pillPrivacy').hidden = !meshOnly;
  setPill('pillPrivacy', meshOnly, 'Somente pontos', 'V\u00EDdeo + pontos');
 }
 setPill('pillTips', tipsOn, 'Dicas discretas', 'Dicas s\u00F3 no painel');
 setPill('pillSingleWin', sng, 'Janela \u00FAnica', 'Multijanela');
 setPill('pillCapture', cap, 'Capturas (' + intervalLabel + ')', 'Sem capturas');
 setPill('pillGuard', grd, 'Bloqueio ativo', 'Bloqueio de abas');
 setPill('pillAi', prov === 'local' || ai, prov === 'local' ? 'Local' : modelName, 'IA local');
}
try {
 applyLayoutMode(localStorage.getItem('compasso.layoutMode') || 'split', false);
} catch(_) {
 applyLayoutMode('split', false);
}
document.querySelectorAll('.layout-btn').forEach(btn => {
 btn.onclick = () => applyLayoutMode(btn.dataset.layoutMode, true);
});
for (const id of ['cameraAuto', 'smartphoneAlertEnabled', 'meshOnlyEnabled', 'partnerTipsToastEnabled', 'singleWindowEnabled', 'captureEnabled', 'guardEnabled', 'aiAuto', 'captureInterval', 'localModel']) {
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
 document.title = isWidgetMode ? 'Compasso • Widget' : 'Compasso • Painel';
 if (!isWidgetMode && hudBc) {
  try { hudBc.postMessage({ type: 'panel-active', sender: hudTabId }); } catch(_) {}
 }
 const lbl = $('widgetToggleLabel');
 if (lbl) lbl.textContent = isWidgetMode ? 'Expandir' : 'Rel\u00F3gio';
 else if ($('widgetToggle')) $('widgetToggle').textContent = isWidgetMode ? 'Expandir' : 'Rel\u00F3gio';
 updateWin7ClockGadget();
 try {
  if (window.screen && screen.availWidth) {
   if (isWidgetMode) {
    const gw = 296, gh = 338;
    window.resizeTo(gw, gh);
    window.moveTo(Math.max(0, screen.availWidth - gw - 20), 20);
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
 else {
  document.title = 'Compasso • Painel';
  if (hudBc) { try { hudBc.postMessage({ type: 'panel-active', sender: hudTabId }); } catch(_) {} }
  centerCompassoWindow();
 }
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
 if ($('partnerTipsToastEnabled')) {
  $('partnerTipsToastEnabled').checked = saved('compasso.partnerTipsToast', true);
  $('partnerTipsToastEnabled').onchange = () => {
   localStorage.setItem('compasso.partnerTipsToast', JSON.stringify($('partnerTipsToastEnabled').checked));
   syncActiveFeaturePills();
  };
 }
 if ($('jarvisVoiceEnabled')) {
  $('jarvisVoiceEnabled').checked = saved('compasso.jarvisVoice', false);
  $('jarvisVoiceEnabled').onchange = () => localStorage.setItem('compasso.jarvisVoice', JSON.stringify($('jarvisVoiceEnabled').checked));
 }
 if ($('smartphoneAlertEnabled')) {
  $('smartphoneAlertEnabled').checked = saved('compasso.smartphoneAlert', true);
  $('smartphoneAlertEnabled').onchange = () => {
   localStorage.setItem('compasso.smartphoneAlert', JSON.stringify($('smartphoneAlertEnabled').checked));
   syncActiveFeaturePills();
   if (typeof updatePhoneGuardUi === 'function') updatePhoneGuardUi();
  };
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
 document.title = 'Compasso • Login';
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
for(const id of ['minimize','tray'])$(id).onclick=()=>setWidgetMode(true);
let goalNotified=null, downwardGazeSince=0, lockedTaskApp=null;
let lastKeysCount=null, lastPointerCount=null, lastMousePosKey=null;
let lastKeyboardAt=0, lastPointerAt=0;
window.addEventListener('keydown',()=>{lastKeyboardAt=Date.now();downwardGazeSince=0;},true);
let alertBannerTimer=null;
function updatePhoneGuardUi(){
 if(!$('phoneGuardState'))return;
 if(!$('smartphoneAlertEnabled')?.checked){$('phoneGuardState').textContent='Desativado';return;}
 if(window.compassoSuppressAlerts){$('phoneGuardState').textContent='Silencioso (lazer)';return;}
 const nowMs=Date.now();
 if(cameraOn&&(nowMs-lastKeyboardAt)<6500){$('phoneGuardState').textContent='Digitando (teclado ignorado)';return;}
 if(cameraOn&&(nowMs-lastPointerAt)<4000){$('phoneGuardState').textContent='Usando mouse (pausado)';return;}
 $('phoneGuardState').textContent=cameraOn?'Monitorando (>7s sem digitar)':'Ativo · aguardando câmera';
}
function showSmartphoneOrWindowAlert(msg){
 if(!$('smartphoneAlertBanner'))return;
 $('smartphoneAlertText').textContent=msg;
 $('smartphoneAlertBanner').hidden=false;
 clearTimeout(alertBannerTimer);
 alertBannerTimer=setTimeout(()=>{if($('smartphoneAlertBanner'))$('smartphoneAlertBanner').hidden=true;},10000);
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
 const curKeys=Number(state.report?.keys||0);
 const curPtr=Number(state.report?.clicks||0)+Number(state.report?.scroll||0);
 const curMousePos=`${state.live?.mouse_x??''},${state.live?.mouse_y??''}`;
 if(lastKeysCount!==null&&curKeys>lastKeysCount){lastKeyboardAt=Date.now();downwardGazeSince=0;}
 if((lastPointerCount!==null&&curPtr>lastPointerCount)||(lastMousePosKey!==null&&curMousePos!==lastMousePosKey&&state.live?.mouse_x!=null)){lastPointerAt=Date.now();}
 lastKeysCount=curKeys;lastPointerCount=curPtr;lastMousePosKey=curMousePos;
 if(!active||state.paused||window.compassoSuppressAlerts){
  lockedTaskApp=null;
  if(state.paused||window.compassoSuppressAlerts)downwardGazeSince=0;
  if(window.compassoSuppressAlerts&&$('smartphoneAlertBanner')&&!$('smartphoneAlertBanner').hidden)$('smartphoneAlertBanner').hidden=true;
 }
 else if($('singleWindowEnabled')?.checked&&state.live?.app&&!/compasso/i.test(state.live.app)){
  if(!lockedTaskApp)lockedTaskApp=state.live.app;
  else if(state.live.app!==lockedTaskApp){
   showSmartphoneOrWindowAlert(`Modo Janela \u00DAnica: altern\u00E2ncia detectada de "${lockedTaskApp}" para "${state.live.app}".`);
  }
 }
 updatePhoneGuardUi();
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
  $('cameraPlaceholder').hidden=true;video.hidden=false;applyMeshOnlyMode(!videoVisible,false);$('cameraToggle').textContent='Desligar câmera';
  stream.getVideoTracks()[0].addEventListener('ended',()=>{stopCamera();notify('A câmera foi desconectada. Você pode continuar sem ela.');});
  frame(generation);
 }catch(e){
  if(generation===cameraGeneration){
   stopCamera();
   if(manual)notify('Não foi possível ativar a câmera: '+friendlyCameraError(e));
   else $('cameraStatus').textContent='Câmera indisponível no momento';
  }
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
const MOOD_LABELS = { calm: 'Calmo / Focado', happy: 'Feliz / Animado', sad: 'Abatido / Triste', tense: 'Tenso / Frustrado', tired: 'Cansado / Sonolento' };
let moodBaseline = null, moodBaselineSamples = [], moodEma = { calm: 1, happy: 0, sad: 0, tense: 0, tired: 0 };
let moodState = { state: 'calm', label: MOOD_LABELS.calm, confidence: 0.7, scores: { ...moodEma }, since: Date.now() };
let lastPhoneAlertAt = 0;
function updateMoodTracker(expr) {
 if (!expr || !expr.scores) return moodState;
 const f = expr.features;
 if (!moodBaseline && f && f.mouthOpen < 0.05 && Math.abs(f.smileLift) < 0.04) {
  moodBaselineSamples.push(f);
  if (moodBaselineSamples.length >= 16) {
   moodBaseline = {
    mouthWidth: medianValue(moodBaselineSamples.map(x => x.mouthWidth)),
    smileLift: medianValue(moodBaselineSamples.map(x => x.smileLift)),
    browDist: medianValue(moodBaselineSamples.map(x => x.browDist)),
    browEyeGap: medianValue(moodBaselineSamples.map(x => x.browEyeGap)),
    eyeOpen: medianValue(moodBaselineSamples.map(x => x.eyeOpen))
   };
  }
 }
 const alpha = 0.16;
 for (const k of ['calm', 'happy', 'sad', 'tense', 'tired']) {
  moodEma[k] = moodEma[k] * (1 - alpha) + (expr.scores[k] || 0) * alpha;
 }
 let dom = 'calm', best = moodEma.calm;
 for (const k of ['happy', 'sad', 'tense', 'tired']) {
  if (moodEma[k] >= 0.38 && moodEma[k] > best) { best = moodEma[k]; dom = k; }
 }
 const now = Date.now();
 if (dom !== moodState.state) moodState = { state: dom, label: MOOD_LABELS[dom], confidence: best, scores: { ...moodEma }, since: now };
 else { moodState.confidence = best; moodState.scores = { ...moodEma }; }
 return moodState;
}
function onResults(results){
 if(!cameraOn)return;lastLandmarks=results;
 const canvas=$('hud'),w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d');
 let {metrics:data,raw}=CompassoVision.analyze(results,calibrationRun?null:calibrated,h/w,moodBaseline);
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
  ({metrics:data,raw}=CompassoVision.analyze(results,calibrated,h/w,moodBaseline));
 }
 captureCalibrationSample(raw);
 if(raw.iris){if(!raw.iris.open&&!blinkClosed){blinkClosed=true;blinkStarted=performance.now();}
  else if(raw.iris.open&&blinkClosed){const elapsed=performance.now()-blinkStarted;if(elapsed>=50&&elapsed<=800){blinkCount++;totalBlinks++;}blinkClosed=false;}}
 else blinkClosed=false;
 const curMood = raw.expression ? updateMoodTracker(raw.expression) : moodState;
 ctx.clearRect(0,0,w,h);
 if(!videoVisible){
  ctx.fillStyle='#0b0f16';
  ctx.fillRect(0,0,w,h);
 }
 function segment(a,b,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}
 function point(p,color,radius=1){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x*w,p.y*h,radius,0,Math.PI*2);ctx.fill();}
 if(results.faceLandmarks){ctx.globalAlpha=videoVisible?.65:.9;const ptColor=videoVisible?'#f09256':'#fb923c',ptRadius=videoVisible?.75:1.05;for(const p of results.faceLandmarks)point(p,ptColor,ptRadius);ctx.globalAlpha=1;
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
 if($('emotion')){
  $('emotion').textContent=data.face&&raw.expression?curMood.label:'Rosto não detectado';
  $('emotion').title='Expressão facial estimada localmente via 468 pontos geométricos (FACS) — sem diagnóstico clínico.';
 }
 const nowMs=Date.now();
 const typingNow=(nowMs-lastKeyboardAt)<6500;
 const usingPointerNow=(nowMs-lastPointerAt)<4000;
 const activePcInput=typingNow||usingPointerNow;
 if($('phoneGuardState')&&$('smartphoneAlertEnabled')?.checked&&!window.compassoSuppressAlerts){
  $('phoneGuardState').textContent=!data.face?'Aguardando rosto':typingNow?'Digitando (teclado ignorado)':usingPointerNow?'Usando mouse (pausado)':'Monitorando (>7s sem digitar)';
 }
 window.compassoVision={ts:performance.now(),gaze:data.gaze_direction,posture:data.posture,centered:data.centered,face:data.face,mood:curMood,headPitch:data.head_pitch};
 if(!state?.paused&&$('smartphoneAlertEnabled')?.checked&&!window.compassoSuppressAlerts){
  const steepHeadDown=data.head_pitch!==null&&data.head_pitch>21;
  const deepGazeDown=data.gaze_direction==='down'&&data.gaze_y!==null&&data.gaze_y>0.85&&(data.head_pitch===null||data.head_pitch>14);
  const lookingAtPhone=!activePcInput&&(steepHeadDown||deepGazeDown);
  if(lookingAtPhone){
   if(!downwardGazeSince)downwardGazeSince=performance.now();
   else if(performance.now()-downwardGazeSince>=7000&&nowMs-lastPhoneAlertAt>=45000){
    lastPhoneAlertAt=nowMs;
    downwardGazeSince=performance.now();
    if(typeof recordSmartphoneGlance==='function')recordSmartphoneGlance();
    showSmartphoneOrWindowAlert('Anti-smartphone: olhar abaixo da tela (>7s sem digitar). Retome o foco na tela.');
    emitWidgetDesktopSignal('PHONE');
   }
  }else{downwardGazeSince=0;}
 }
 $('signalMetrics').innerHTML=[['Olhar',data.gaze_direction?gazeLabels[data.gaze_direction]:'sem leitura calibrada'],['Cabeça H / V / inclinação',`${degrees(data.head_yaw)} / ${degrees(data.head_pitch)} / ${degrees(data.head_roll)}`],['Expressão (FACS local)',data.face&&raw.expression?`${curMood.label} (${Math.round(curMood.confidence*100)}%)`:'sem leitura'],['Ombros / tronco',`${degrees(data.shoulder_tilt)} / ${degrees(data.trunk_lean)}`],['Quadris / pontos visíveis',`${degrees(data.hip_tilt)} / ${data.pose_points}`],['Cotovelos E / D',`${degrees(data.elbow_left)} / ${degrees(data.elbow_right)}`],['Joelhos E / D',`${degrees(data.knee_left)} / ${degrees(data.knee_right)}`]].map(([k,v])=>`<span data-reading><b>${k}</b><br>${esc(v)}</span>`).join('');
 if(state?.active&&!state?.paused&&token&&performance.now()-lastCameraSend>1000){lastCameraSend=performance.now();api('camera',{...data,blinks:blinkCount}).catch(e=>notify('Falha ao registrar câmera: '+e.message));blinkCount=0;}
}
function applyMeshOnlyMode(meshOnly,persist=true){
 videoVisible=!Boolean(meshOnly);
 if(persist){try{localStorage.setItem('compasso.meshOnly',JSON.stringify(!videoVisible));}catch(_){}}
 if($('meshOnlyEnabled'))$('meshOnlyEnabled').checked=!videoVisible;
 if($('video'))$('video').hidden=!cameraOn;
 document.querySelector('.camera')?.classList.toggle('mesh-only',!videoVisible);
 if($('privacyMeshBadge'))$('privacyMeshBadge').hidden=videoVisible;
 if($('videoMode'))$('videoMode').textContent=videoVisible?'Somente pontos':'Mostrar vídeo';
 if(cameraOn&&$('hud')){
  const c=$('hud'),cx=c.getContext('2d');
  if(!videoVisible){cx.fillStyle='#0b0f16';cx.fillRect(0,0,c.width,c.height);}
  else{cx.clearRect(0,0,c.width,c.height);}
 }
 syncActiveFeaturePills();
}
$('cameraToggle').onclick=()=>cameraOn?stopCamera():startCamera(true);
$('videoMode').onclick=()=>applyMeshOnlyMode(videoVisible,true);
if($('meshOnlyEnabled'))$('meshOnlyEnabled').onchange=()=>applyMeshOnlyMode($('meshOnlyEnabled').checked,true);
applyMeshOnlyMode(saved('compasso.meshOnly',false),false);
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
 moodStats: { calm: 0, happy: 0, sad: 0, tense: 0, tired: 0 },
 appMood: {}, hourMood: {}, transitions: {}, siteDistractions: {},
 blockedDomains: [], ignoredBlockDomains: [],
 microHabits: { smartphoneAlerts: 0, smartphoneHours: {}, postureAlerts: 0, peakCadence: 0, longestStreak: 0 },
 day: '', dayKinds: {}, dayApps: {}, wrapDay: '', greetDay: '', lastTipKey: ''
}, loadAutoProfile());
if (!autoProfile.moodStats) autoProfile.moodStats = { calm: 0, happy: 0, sad: 0, tense: 0, tired: 0 };
if (!autoProfile.appMood) autoProfile.appMood = {};
if (!autoProfile.hourMood) autoProfile.hourMood = {};
if (!autoProfile.transitions) autoProfile.transitions = {};
if (!autoProfile.siteDistractions) autoProfile.siteDistractions = {};
if (!Array.isArray(autoProfile.blockedDomains)) autoProfile.blockedDomains = [];
if (!Array.isArray(autoProfile.ignoredBlockDomains)) autoProfile.ignoredBlockDomains = [];
if (!autoProfile.microHabits) autoProfile.microHabits = { smartphoneAlerts: 0, smartphoneHours: {}, postureAlerts: 0, peakCadence: 0, longestStreak: 0 };
if (!autoProfile.microHabits.smartphoneHours) autoProfile.microHabits.smartphoneHours = {};
function saveAutoProfile() { try { localStorage.setItem(AUTO_KEY, JSON.stringify(autoProfile)); } catch (_) {} }
function recordSmartphoneGlance() {
 const h = String(new Date().getHours());
 autoProfile.microHabits.smartphoneAlerts = (autoProfile.microHabits.smartphoneAlerts || 0) + 1;
 autoProfile.microHabits.smartphoneHours[h] = (autoProfile.microHabits.smartphoneHours[h] || 0) + 1;
 auto.feed.unshift({ t: new Date(), text: 'Anti-celular: olhar abaixo da tela (>7s sem digitar)' });
 auto.feed = auto.feed.slice(0, 6);
 saveAutoProfile();
}
const DISTRACTING_DOMAIN_RULES = [
 ['youtube.com', /youtube/i, /aula|curso|tutorial|lecture|class|explica|resumo|revis|document[aá]rio|palestra/i],
 ['instagram.com', /instagram/i, null],
 ['tiktok.com', /tiktok/i, null],
 ['facebook.com', /facebook/i, null],
 ['x.com', /twitter|\bx\.com\b|\s\/\s*x\b/i, null],
 ['reddit.com', /reddit/i, /programming|learn|study|askscience|explainlikeimfive/i],
 ['twitch.tv', /twitch/i, null],
 ['netflix.com', /netflix/i, null],
 ['web.whatsapp.com', /whatsapp/i, null],
 ['discord.com', /discord/i, null],
 ['9gag.com', /9gag/i, null],
 ['kwai.com', /kwai/i, null]
];
function extractDistractingDomain(live) {
 const app = String(live?.app || ''), title = String(live?.window_title || '');
 const text = `${app} ${title}`;
 if (!text.trim() || /compasso/i.test(text)) return null;
 for (const [domain, re, allowRe] of DISTRACTING_DOMAIN_RULES) {
  if (re.test(text) && !(allowRe && allowRe.test(text))) return domain;
 }
 return null;
}
let pendingBlockOffer = null;
const blockSnoozedUntil = {};
function hideTabBlockPrompt() {
 pendingBlockOffer = null;
 if ($('tabBlockPrompt')) $('tabBlockPrompt').hidden = true;
}
function offerTabBlock(domain, visits, mins) {
 if (!domain || autoProfile.ignoredBlockDomains.includes(domain)) return false;
 const now = Date.now();
 if (blockSnoozedUntil[domain] && now < blockSnoozedUntil[domain]) return false;
 const curDomains = ($('guardDomains')?.value || '').split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
 if (state?.context?.options?.guard_enabled && curDomains.includes(domain)) return false;
 pendingBlockOffer = { domain, visits, mins, at: now };
 if ($('tabBlockPrompt')) {
  $('tabBlockDomainPill').textContent = domain;
  const reason = visits >= 2 ? `interrompeu seu ritmo ${visits}x agora` : `consumiu ~${Math.max(1, Math.round(mins))} min durante seu foco`;
  $('tabBlockPromptText').textContent = `Percebi que ${domain} ${reason}. Deseja bloquear esta aba enquanto estiver concentrado?`;
  if ($('tabBlockExtBtn')) $('tabBlockExtBtn').hidden = Boolean(state?.context?.extension_connected);
  $('tabBlockPrompt').hidden = false;
 }
 auto.feed.unshift({ t: new Date(), text: `Pergunta enviada: bloquear ${domain}?` });
 auto.feed = auto.feed.slice(0, 6);
 if (isWidgetMode) emitWidgetDesktopSignal(`BLOCK:${domain}`);
 return true;
}
async function applyTabBlock(domain) {
 const clean = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
 if (!clean) return;
 const list = ($('guardDomains')?.value || '').split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
 if (!list.includes(clean)) list.push(clean);
 if ($('guardDomains')) $('guardDomains').value = list.join(', ');
 if ($('guardMode')) $('guardMode').value = 'blocklist';
 try { localStorage.setItem('compasso.guard', JSON.stringify({ mode: 'blocklist', domains: list })); } catch(_) {}
 if (!autoProfile.blockedDomains.includes(clean)) autoProfile.blockedDomains.push(clean);
 autoProfile.ignoredBlockDomains = autoProfile.ignoredBlockDomains.filter(d => d !== clean);
 saveAutoProfile();
 const extOk = Boolean(state?.context?.extension_connected);
 if (extOk) {
  if ($('guardEnabled')) $('guardEnabled').checked = true;
  syncActiveFeaturePills();
  try {
   if (state?.active) await api('finish');
   const proj = state?.active?.project || $('project')?.value || 'Uso Contínuo (IA · Automático)';
   const goal = state?.active?.goal ?? 0;
   await api('start', { project: proj, goal, ...(window.contextStartOptions?.() || {}), guard_enabled: true, guard_mode: 'blocklist', domains: list });
   await refresh();
   hideTabBlockPrompt();
   autoNotice(`Bloqueio ativado para ${clean}. A extensão aplicará a regra na aba em até 5s.`);
   auto.feed.unshift({ t: new Date(), text: `Bloqueio de aba ativado para ${clean}` });
   auto.feed = auto.feed.slice(0, 6);
  } catch (e) {
   autoNotice(`Domínio ${clean} salvo na lista. ${e.message || ''}`);
  }
 } else {
  if ($('tabBlockExtBtn')) $('tabBlockExtBtn').hidden = false;
  autoNotice(`${clean} adicionado à lista de bloqueio! Conecte a extensão do navegador (botão "Conectar extensão") para bloquear a aba automaticamente.`);
  auto.feed.unshift({ t: new Date(), text: `${clean} adicionado à lista (aguardando extensão)` });
  auto.feed = auto.feed.slice(0, 6);
 }
}
if ($('tabBlockConfirm')) $('tabBlockConfirm').onclick = () => { if (pendingBlockOffer?.domain) applyTabBlock(pendingBlockOffer.domain); };
if ($('tabBlockSnooze')) $('tabBlockSnooze').onclick = () => {
 if (pendingBlockOffer?.domain) blockSnoozedUntil[pendingBlockOffer.domain] = Date.now() + 25 * 60000;
 hideTabBlockPrompt();
};
if ($('tabBlockIgnore')) $('tabBlockIgnore').onclick = () => {
 if (pendingBlockOffer?.domain && !autoProfile.ignoredBlockDomains.includes(pendingBlockOffer.domain)) {
  autoProfile.ignoredBlockDomains.push(pendingBlockOffer.domain);
  saveAutoProfile();
 }
 hideTabBlockPrompt();
};
if ($('tabBlockExtBtn')) $('tabBlockExtBtn').onclick = () => $('extensionDialog')?.showModal();

const KIND_LABEL = { study: 'Estudo/Trabalho', hobby: 'Hobby/Lazer', comm: 'Comunicação', distraction: 'Distração', neutral: 'Neutro', idle: 'Ausente' };
const GAME_RE = /steam|epic games|riot|league of legends|valorant|minecraft|roblox|fortnite|cs2|counter-strike|dota|elden ring|hollow knight|overwatch|apex|genshin|eafc|fifa|gta|jogo|game/i;
const MEDIA_RE = /spotify|netflix|prime video|disney\+|max|twitch|crunchyroll|deezer|youtube/i;
const KIND_RULES = [
 ['hobby', /steam|epic games|riot|league of legends|valorant|minecraft|roblox|fortnite|cs2|counter-strike|dota|elden ring|hollow knight|overwatch|apex|genshin|eafc|fifa|gta|spotify|netflix|prime video|disney\+|max|twitch|crunchyroll|deezer|jogo|game/i],
 ['distraction', /tiktok|reels|facebook|twitter|x\.com|shorts|9gag|kwai/i],
 ['comm', /whatsapp|telegram|discord|teams|slack|outlook|gmail|instagram|messenger|zoom/i],
 ['study', /code|visual studio|pycharm|intellij|eclipse|android studio|terminal|powershell|cmd\.exe|notion|obsidian|word|excel|powerpoint|docs|sheets|slides|acrobat|pdf|moodle|sigaa|classroom|overleaf|jupyter|colab|figma|github|stack ?overflow|anki/i]
];
function hobbySubtype(live) {
 const text = `${live?.app || ''} ${live?.window_title || ''}`;
 if (GAME_RE.test(text)) return 'game';
 if (MEDIA_RE.test(text)) return 'media';
 return 'hobby';
}
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
 lastBriefing: Date.now(), lastTipAt: 0, stuck: false, lesson: null, narrative: '', greeted: isSilentBgRespawn
};
const medianOf = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtMinutes = s => `${Math.max(1, Math.round(s / 60))} min`;
function learnedThreshold() { const runs = autoProfile.focusRuns.filter(m => m >= 5); return runs.length >= 3 ? Math.round(medianOf(runs)) : 34; }
function learnedRuns() { return autoProfile.focusRuns.filter(m => m >= 5).length; }
function getJarvisGreetingPrefix() { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'; }
function getJarvisUserName() { const n = $('userBadgeName')?.textContent?.trim(); return n && n !== 'Perfil' ? n : 'você'; }
function topApps(n = 3) {
 return Object.entries(autoProfile.dayApps || {}).filter(([k]) => !/compasso|windows \/ protegido/i.test(k)).sort((a, b) => b[1].s - a[1].s).slice(0, n);
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
function dominantMoodFrom(obj) {
 if (!obj) return null;
 const entries = Object.entries(obj).filter(([k, v]) => k !== 'calm' && v >= 20).sort((a, b) => b[1] - a[1]);
 if (entries.length) return { state: entries[0][0], label: MOOD_LABELS[entries[0][0]] || entries[0][0], sec: entries[0][1] };
 if ((obj.calm || 0) >= 20) return { state: 'calm', label: MOOD_LABELS.calm, sec: obj.calm };
 return null;
}
function topEscapeChain() {
 const entries = Object.entries(autoProfile.transitions || {}).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
 return entries.length ? { pair: entries[0][0], count: entries[0][1] } : null;
}
function stressfulOrHappyApp() {
 let tenseApp = null, tenseSec = 0, happyApp = null, happySec = 0;
 for (const [app, m] of Object.entries(autoProfile.appMood || {})) {
  if ((m.tense || 0) + (m.sad || 0) > tenseSec && (m.tense || 0) + (m.sad || 0) >= 35) {
   tenseSec = (m.tense || 0) + (m.sad || 0); tenseApp = { app, sec: tenseSec };
  }
  if ((m.happy || 0) > happySec && (m.happy || 0) >= 30) {
   happySec = m.happy; happyApp = { app, sec: happySec };
  }
 }
 return { tenseApp, happyApp };
}
function peakPhoneHour() {
 const entries = Object.entries(autoProfile.microHabits?.smartphoneHours || {}).sort((a, b) => b[1] - a[1]);
 return entries.length && entries[0][1] >= 2 ? { hour: Number(entries[0][0]), count: entries[0][1] } : null;
}
function buildLearnedCoaching() {
 const flow = bestFlowApp(), sw = worstSwitchingApp(), gain = breakGainPct();
 const peak = peakHour(), weak = weakHour(), thr = learnedThreshold(), tr = autoProfile.triggers || {};
 const chain = topEscapeChain(), moodApps = stressfulOrHappyApp(), phonePeak = peakPhoneHour();
 const candidates = [];
 if (moodApps.tenseApp) {
  candidates.push({
   key: 'mood_tense_app',
   tag: 'BEM-ESTAR & EMOÇÃO',
   concept: `Carga emocional mais alta em ${moodApps.tenseApp.app}`,
   lesson: `Notei pelos seus sinais faciais que ${moodApps.tenseApp.app} tende a gerar mais tensão/esforço. Fazer 30s de respiração 4-4-4 e relaxar ombros antes de blocos nele deixa seu ritmo bem mais leve.`,
   evidence: `Observado em ${fmtMinutes(moodApps.tenseApp.sec)} de sinais faciais locais associados a ${moodApps.tenseApp.app}.`
  });
 }
 if (moodApps.happyApp) {
  candidates.push({
   key: 'mood_happy_app',
   tag: 'ENERGIA POSITIVA',
   concept: `Clima mais leve e animado em ${moodApps.happyApp.app}`,
   lesson: `Nos momentos em ${moodApps.happyApp.app}, sua expressão ficou mais animada e relaxada. Usar esse tipo de atividade como recompensa após tarefas difíceis sustenta sua motivação sem desgaste.`,
   evidence: `Mapeado automaticamente na sua memória cotidiana (${fmtMinutes(moodApps.happyApp.sec)} positivos).`
  });
 }
 if (chain) {
  candidates.push({
   key: 'escape_chain',
   tag: 'HÁBITO MINUCIOSO',
   concept: `Transição recorrente: ${chain.pair} (${chain.count}x)`,
   lesson: `Aprendi um detalhe sutil da sua rotina: você costuma migrar na sequência "${chain.pair}". Se perceber esse impulso no meio de uma tarefa, anote o próximo micro-passo antes de trocar de aba.`,
   evidence: `Padrão de transição detectado ${chain.count} vezes nas trocas reais de janela.`
  });
 }
 if (phonePeak) {
  candidates.push({
   key: 'phone_habit',
   tag: 'ANTI-SMARTPHONE',
   concept: `Horário com mais desvios para o celular (${phonePeak.hour}h)`,
   lesson: `Pelos alertas do anti-smartphone, perto das ${phonePeak.hour}h você olha mais vezes para baixo (${phonePeak.count}x). Virar o celular com a tela para baixo nesse horário corta grande parte das quebras de atenção.`,
   evidence: `Registrado automaticamente pelo detector facial/ocular desde a inicialização.`
  });
 }
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
 autoNoticeTimer = setTimeout(() => { if ($('notice')?.textContent === text) $('notice').hidden = true; }, 10000);
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
 if (p.toast !== false && (p.toastText || p.narrative || p.lesson)) {
  emitPartnerTipToast(p.tag || 'Parceiro IA', p.toastText || p.narrative || p.lesson);
 }
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
   evidence: 'Ação silenciosa: sensores e aprendizado contínuo iniciados em Widget sem pop-up.',
   feed: 'Saudação automática · aprendizado contínuo de uso iniciado',
   notice: false,
   toast: false
  });
  return;
 }
 // 2. Transições detectadas pelo próprio uso (estudos, jogos, hobbies e pausas)
 const tr = auto.transition; auto.transition = null;
 if (tr) {
  if ((tr.kind === 'study') && (tr.prev === 'hobby' || tr.prev === 'idle') && tr.dur >= 120) {
   auto.postBreakUntil = now + 5 * 60000;
  }
  if (tr.kind === 'hobby' && (tr.dur >= 120 || tr.prev === 'study')) {
   const sub = hobbySubtype(state?.live);
   if (sub === 'game') {
    if (fire('hobby', {
     tag: 'JOGO & ERGONOMIA', concept: 'Bom jogo · ergonomia visual em segundo plano',
     lesson: 'Silenciei alertas de estudo durante sua jogatina. Se passar de ~45 min seguidos, mando apenas um lembrete discreto entre partidas para descansar os olhos (20s).',
     narrative: `${user}, bom jogo em ${state?.live?.app || 'sua partida'}. Alertas de tarefa silenciados; acompanho só o conforto visual sem interromper.`,
     evidence: 'Feedback passivo no Widget/painel · zero pop-up na tela do jogo.',
     feed: `Jogo detectado (${state?.live?.app || 'lazer'}) · modo silencioso ativo`,
     notice: false
    }, 30)) return;
   } else if (tr.prev === 'study' && tr.dur >= 300) {
    if (fire('hobby', {
     tag: 'PAUSA RECONHECIDA', concept: 'Restauração da Atenção (Kaplan, 1995)',
     lesson: 'Pausas voluntárias em hobbies, música ou leitura leve recarregam a atenção direcionada. Silenciei alertas enquanto você aproveita — e meço depois como isso melhora seu retorno.',
     narrative: `${user}, pausa para hobby/lazer após ${fmtMinutes(tr.dur)} de foco. Aproveite tranquilo: alertas silenciados.`,
     evidence: 'Ação silenciosa: alertas pausados durante o hobby.',
     feed: `Hobby/lazer após ${fmtMinutes(tr.dur)} · alertas silenciados`,
     notice: false
    }, 30)) return;
   }
  }
  if (tr.kind === 'study' && ['hobby', 'idle', 'comm'].includes(tr.prev) && tr.dur >= 300) {
   const longHobby = tr.prev === 'hobby' && tr.dur >= 1200;
   if (fire('return', {
    tag: 'RETORNO AO FOCO', concept: longHobby ? 'Aquecimento suave pós-jogo/lazer' : 'Recuperação Ativa (Roediger e Karpicke, 2006)',
    lesson: longHobby
     ? 'Na transição de um bloco longo de jogo ou vídeo para estudo/trabalho, começar por 3 min numa etapa mecânica simples reduz a inércia antes da tarefa mais pesada.'
     : 'Ao retomar o trabalho no PC, tentar lembrar em 1 minuto onde parou antes de sair lendo fortalece a retenção sem esforço extra.',
    narrative: `De volta ao ritmo, ${user}. Seu ciclo natural observado está em ~${learnedThreshold()} min.`,
    evidence: 'Retomada detectada automaticamente pelo uso real.',
    feed: `Retorno mapeado · ciclo natural ~${learnedThreshold()} min`,
    notice: false
   }, 25)) return;
  }
 }
 // 2b. Ergonomia preditiva discreta em jogos/mídia longos (>45 min)
 if (auto.kind === 'hobby' && (now - auto.kindSince) > 45 * 60000) {
  const sub = hobbySubtype(state?.live);
  if (fire('hobby_ergo', {
   tag: sub === 'game' ? 'DICA EM JOGOS' : 'PAUSA VISUAL',
   concept: sub === 'game' ? 'Regra 20-20-20 entre partidas' : 'Descanso ocular em mídia contínua',
   lesson: sub === 'game'
    ? 'Perto de 45 min jogando, a taxa de piscadas cai bastante. Entre uma partida e outra, olhar à distância por 20s e soltar os ombros preserva seus reflexos e evita fadiga nos olhos.'
    : 'Depois de ~45 min em vídeo ou música na tela, vale levantar 1 minuto ou hidratar antes do próximo bloco.',
   narrative: `${user}, dica rápida sem cobrança: ~${fmtMinutes((now - auto.kindSince) / 1000)} seguidos em ${state?.live?.app || 'lazer'} — aproveite o próximo intervalo para piscar e olhar longe por 20s.`,
   evidence: 'Sugestão discreta (sem pop-up) após uso prolongado contínuo.',
   feed: `Ergonomia em ${sub === 'game' ? 'jogo' : 'hobby'}: descanso ocular de 20s sugerido`,
   notice: false
  }, 45)) return;
 }
 // 2c. Acompanhamento emocional e bem-estar (parceiro cotidiano via FACS 468 pontos)
 const vNow = window.compassoVision;
 const vFresh = vNow && performance.now() - vNow.ts < 5000 && vNow.face && vNow.mood;
 if (vFresh) {
  const m = vNow.mood;
  const heldSec = (now - (m.since || now)) / 1000;
  const curApp = state?.live?.app || 'seu computador';
  if (m.state === 'sad' && heldSec >= 18) {
   if (fire('mood_sad', {
    tag: 'BEM-ESTAR EMOCIONAL', concept: 'Expressão abatida percebida — cuidado sem cobrança',
    lesson: 'Percebi pelos pontos faciais que você parece um pouco mais abatido agora. Tudo bem reduzir o ritmo: tome um copo d’água, coloque uma música que você gosta ou divida a tarefa atual em um passo bem pequeno de 5 min.',
    narrative: `${user}, notei sua expressão um pouco mais abatida agora. Tudo bem ir com calma — uma pausa leve, água ou uma música boa costumam ajudar.`,
    evidence: 'Leitura geométrica local (468 pontos FACS) · 100% privada, sem diagnóstico clínico.',
    feed: 'Cuidado emocional: expressão abatida percebida · pausa leve sugerida',
    notice: false
   }, 35)) return;
  }
  if (m.state === 'tense' && heldSec >= 18) {
   if (fire('mood_tense', {
    tag: 'ALÍVIO DE TENSÃO', concept: 'Tensão facial acumulada — solte ombros e maxilar',
    lesson: `Percebi testa franzida e tensão sustentada enquanto usa ${curApp}. Descruze a testa, solte o maxilar e faça 3 respirações lentas (4-4-4) antes de insistir no mesmo problema.`,
    narrative: `${user}, percebi um pouco de tensão facial em ${curApp}. Solte os ombros e respire fundo por 20s para destravar mais leve.`,
    evidence: 'Sinais geométricos locais de sobrancelha/lábios (FACS) · 100% no seu PC.',
    feed: `Tensão facial percebida em ${curApp} · relaxamento rápido sugerido`,
    notice: false
   }, 30)) return;
  }
  if (m.state === 'tired' && heldSec >= 15) {
   if (fire('mood_tired', {
    tag: 'SAÚDE & ENERGIA', concept: 'Sinais de cansaço ou sonolência detectados',
    lesson: 'Notei pálpebras mais pesadas ou bocejo contínuo. Levantar por 2 minutos, olhar para longe por 20s (regra 20-20-20) e hidratar recupera muito mais energia do que forçar a vista.',
    narrative: `${user}, percebi sinais de cansaço visual agora. Uma pausa rápida de 2 min longe da tela ajuda a recarregar.`,
    evidence: 'Abertura ocular / bocejo estimados localmente pela câmera.',
    feed: 'Sinais de cansaço facial · hidratação e pausa visual sugeridas',
    notice: false
   }, 30)) return;
  }
  if (m.state === 'happy' && heldSec >= 14) {
   if (fire('mood_happy', {
    tag: 'FLUXO POSITIVO', concept: `Bom astral percebido em ${curApp}`,
    lesson: `Que bom ver você animado em ${curApp}! Salvei esse horário e contexto na sua memória cotidiana para ajudar você a repetir as condições em que seu dia rende mais leve.`,
    narrative: `${user}, ótimo ver você em um clima positivo em ${curApp}! Registrei esse padrão de energia boa no seu perfil.`,
    evidence: 'Sorriso / expressão positiva mapeada na memória cotidiana local.',
    feed: `Momento positivo salvo na memória cotidiana (${curApp})`,
    speak: false, notice: false
   }, 60)) return;
  }
 }
 // 3. Previsão antecipada (silenciosa): avisa no painel/widget alguns minutos ANTES da queda prevista
 if (auto.kind === 'study' && p.risk >= 68 && p.streakMin >= p.thr * 0.78 && p.eta >= 2 && p.eta <= 8) {
  if (fire('pre_fatigue', {
   tag: 'IA PREDITIVA', concept: `Queda prevista nos próximos ~${p.eta} min`,
   lesson: `Pelos seus ciclos anteriores, sua fluidez costuma desacelerar em ~${p.eta} min. Concluir o raciocínio atual agora evita parar no meio de uma ideia.`,
   narrative: `${user}, previsão tranquila: seu ritmo entra na zona de cansaço em ~${p.eta} min.`,
   evidence: 'Projeção preditiva silenciosa (apenas no card e Widget).',
   feed: `Previsão antecipada: queda de fluidez em ~${p.eta} min`,
   notice: false
  }, 30)) return;
 }
 // 4. Travamento: mesma janela, quase sem digitação, olhar fora do centro
 if (auto.stuck) {
  if (fire('stuck', {
   tag: 'TRAVAMENTO PROVÁVEL', concept: 'Sobrecarga da Memória de Trabalho (Sweller, 1988)',
   lesson: 'Quando uma tarefa ultrapassa o limite da memória de trabalho, a digitação congela antes de a pessoa fugir para abas distrativas. Dividir em 1 micro-passo destrava.',
   narrative: `${user}, notei uma pausa longa sem avançar neste trecho — quebrar em uma micro-etapa costuma destravar.`,
   evidence: 'Sinais discretos: mesma janela >2 min, baixa digitação e olhar desviado.',
   feed: 'Travamento observado · micro-passo sugerido'
  })) return;
 }
 // 5. Fragmentação: muitas trocas de janela durante estudo
 if (auto.kind === 'study' && auto.switches.length >= 6) {
  if (fire('fragmented', {
   tag: 'ATENÇÃO FRAGMENTADA', concept: 'Resíduo de Atenção (Leroy, 2009)',
   lesson: 'Trocar rápido entre apps e mensagens deixa parte da atenção presa na tela anterior por vários minutos, reduzindo sua velocidade na tarefa principal.',
   narrative: `${user}, notei ${auto.switches.length} trocas de janela nos últimos 10 min; manter só a aba atual ajuda a recuperar a fluidez.`,
   evidence: 'Ajuste silencioso: monitoramento de janela única priorizado.',
   apply: () => { if ($('singleWindowEnabled')) $('singleWindowEnabled').checked = true; syncActiveFeaturePills(); },
   feed: `${auto.switches.length} alternâncias em 10 min · dica anti-resíduo`
  })) return;
 }
 // 6. Fadiga prevista: passou do limiar pessoal aprendido (SEM modal pop-up forçado)
 if (auto.kind === 'study' && p.streakMin >= p.thr) {
  if (fire('fatigue', {
   tag: 'LIMIAR ATINGIDO', concept: 'Ciclo Ultradiano e Lei de Yerkes-Dodson',
   lesson: `Pelo que aprendi com seu uso, depois de ${p.thr} min seguidos sua fluidez e postura caem. Se puder fechar este bloco e fazer a respiração ◎ 4-4-4 no Widget por 45s, seu próximo retorno rende mais.`,
   narrative: `${user}, você passou de ${Math.round(p.streakMin)} min contínuos (seu limiar aprendido). Pausa leve ◎ 4-4-4 sugerida quando fechar o raciocínio.`,
   evidence: 'Sugestão não-intrusiva (sem abrir pop-up sobre sua janela).',
   feed: `${Math.round(p.streakMin)} min contínuos · pausa leve sugerida`
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
 if ($('twinMemoryChips')) {
  const chips = [];
  const vMem = window.compassoVision;
  const liveMood = vMem && performance.now() - vMem.ts < 8000 && vMem.face && vMem.mood ? vMem.mood : null;
  const domMood = dominantMoodFrom(autoProfile.moodStats);
  if (liveMood) chips.push({ cls: `mood-${liveMood.state}`, txt: `Agora: ${liveMood.label}` });
  else if (domMood) chips.push({ cls: `mood-${domMood.state}`, txt: `Humor predominante: ${domMood.label}` });
  else chips.push({ cls: '', txt: 'Expressão: aguardando rosto' });
  chips.push({ cls: '', txt: $('smartphoneAlertEnabled')?.checked ? `Anti-celular: ativo (${autoProfile.microHabits.smartphoneAlerts || 0} desvios)` : 'Anti-celular: pausado' });
  const pk = peakHour();
  if (pk !== null) chips.push({ cls: '', txt: `Pico cognitivo: ${pk}h` });
  const ch = topEscapeChain();
  if (ch) chips.push({ cls: '', txt: `Cadeia frequente: ${ch.pair} (${ch.count}x)` });
  if (autoProfile.microHabits.peakCadence > 0) chips.push({ cls: '', txt: `Ritmo pico: ${Math.round(autoProfile.microHabits.peakCadence)} ações/min` });
  if (autoProfile.blockedDomains.length) chips.push({ cls: '', txt: `Protegidos: ${autoProfile.blockedDomains.slice(-2).join(', ')}` });
  const memSig = chips.map(c => c.txt).join('|');
  if ($('twinMemoryChips').dataset.sig !== memSig) {
   $('twinMemoryChips').dataset.sig = memSig;
   $('twinMemoryChips').innerHTML = chips.slice(0, 6).map(c => `<span class="twin-chip ${c.cls}">${esc(c.txt)}</span>`).join('');
  }
 }
 const feedSig = auto.feed.map(f => f.t.getTime()).join(',');
 if ($('jarvisFeed').dataset.sig !== feedSig) {
  $('jarvisFeed').dataset.sig = feedSig;
  $('jarvisFeed').innerHTML = auto.feed.map(f => `<li><time>${f.t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><span>${esc(f.text)}</span></li>`).join('');
 }
 if ($('gadgetAiNow') && $('gadgetAiTip')) {
  const isSelfOrLocked = !app || app === '—' || /^(msedge|chrome|brave|compasso|windows \/ protegido)$/i.test(app) || /compasso/i.test(state?.live?.window_title || '');
  if (auto.kind === 'hobby') {
   const isGame = hobbySubtype(state?.live) === 'game';
   $('gadgetAiNow').textContent = isGame ? `Bom jogo · ${app}` : `Pausa em ${app}`;
   $('gadgetAiTip').textContent = isGame ? 'Alertas silenciados · ergonomia 20-20-20 ativa' : 'Momento de lazer · tudo tranquilo';
  } else if (auto.kind === 'idle') {
   $('gadgetAiNow').textContent = 'Ausente do computador';
   $('gadgetAiTip').textContent = 'Coleta pausada até você retornar';
  } else if (auto.kind === 'distraction') {
   $('gadgetAiNow').textContent = isSelfOrLocked ? 'Navegação leve' : `Em ${app}`;
   $('gadgetAiTip').textContent = 'Sugestão: retomar 5 min da tarefa quando puder';
  } else if (auto.kind === 'comm') {
   $('gadgetAiNow').textContent = `Mensagens · ${app}`;
   $('gadgetAiTip').textContent = 'Responder em blocos reduz trocas de contexto';
  } else if (isSelfOrLocked) {
   $('gadgetAiNow').textContent = 'Observação silenciosa';
   $('gadgetAiTip').textContent = l?.concept && !/Aprendendo seu uso/.test(l.concept) ? l.concept : 'Acompanhando em segundo plano · passe o mouse';
  } else if (p.risk >= 68 && p.eta > 0) {
   $('gadgetAiNow').textContent = `${app} · queda prevista em ~${p.eta} min`;
   $('gadgetAiTip').textContent = 'Bom fechar o trecho atual antes de pausar';
  } else {
   $('gadgetAiNow').textContent = `Em ritmo · ${app}`;
   $('gadgetAiTip').textContent = `Ciclo observado ~${p.thr} min · tudo estável`;
  }
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
 const prevAppName = auto.lastApp;
 if (app && app !== auto.lastApp) {
  if (switchedApp) {
   auto.switches.push(now);
   if (prevAppName && !/compasso/i.test(prevAppName)) {
    const pairKey = `${prevAppName} → ${app}`;
    autoProfile.transitions[pairKey] = (autoProfile.transitions[pairKey] || 0) + 1;
   }
  }
  auto.lastApp = app;
 }
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
 const curHour = new Date().getHours();
 const hb = autoProfile.hourly[curHour] || (autoProfile.hourly[curHour] = {}); hb[kind] = (hb[kind] || 0) + dt;
 if (kind === 'study') {
  if (!auto.streakStart) auto.streakStart = now;
  auto.streakBreakAt = null;
  const streakMins = (now - auto.streakStart) / 60000;
  if (streakMins > (autoProfile.microHabits.longestStreak || 0)) autoProfile.microHabits.longestStreak = Math.round(streakMins);
 }
 else if (auto.streakStart) {
  if (kind === 'neutral') { if (!auto.streakBreakAt) auto.streakBreakAt = now; if (now - auto.streakBreakAt > 60000) endStreak(now); }
  else { auto.streakBreakAt = auto.streakBreakAt || now; endStreak(now); }
 }
 const c = cadence(now), v = window.compassoVision;
 if (app && kind === 'study' && c.last60 > 0 && dt >= 0.8 && !/compasso/i.test(app)) {
  const st = autoProfile.appStats[app];
  if (st) { st.cadenceSum += c.last60; st.samples += 1; }
  if (c.last60 > (autoProfile.microHabits.peakCadence || 0)) autoProfile.microHabits.peakCadence = c.last60;
  const rec = autoProfile.recovery;
  if (now < auto.postBreakUntil) { rec.afterBreakCadence += c.last60; rec.afterBreakSamples += 1; }
  else { rec.steadyCadence += c.last60; rec.steadySamples += 1; }
 }
 const visionFresh = v && performance.now() - v.ts < 5000;
 if (visionFresh && v.face && v.mood && dt > 0) {
  const mk = v.mood.state || 'calm';
  autoProfile.moodStats[mk] = (autoProfile.moodStats[mk] || 0) + dt;
  const hm = autoProfile.hourMood[curHour] || (autoProfile.hourMood[curHour] = {});
  hm[mk] = (hm[mk] || 0) + dt;
  if (app && !/compasso/i.test(app)) {
   const am = autoProfile.appMood[app] || (autoProfile.appMood[app] = {});
   am[mk] = (am[mk] || 0) + dt;
  }
  if (v.posture === false && (!auto.lastPostureAt || now - auto.lastPostureAt > 60000)) {
   auto.lastPostureAt = now;
   autoProfile.microHabits.postureAlerts = (autoProfile.microHabits.postureAlerts || 0) + 1;
  }
 }
 // Detecção inteligente de abas distrativas durante trabalho/estudo (pergunta antes de bloquear)
 const distDomain = extractDistractingDomain(live);
 if (distDomain && hobbySubtype(live) !== 'game' && $('aiAutopilot')?.checked) {
  const dStat = autoProfile.siteDistractions[distDomain] || (autoProfile.siteDistractions[distDomain] = { sec: 0, visits: 0, lastAt: 0 });
  if (now - dStat.lastAt > 45000) dStat.visits += 1;
  dStat.sec += dt;
  dStat.lastAt = now;
  const cameFromFocus = auto.prevKind === 'study' || Boolean(auto.streakStart) || (autoProfile.dayKinds.study || 0) >= 120;
  if (cameFromFocus && (dStat.visits >= 2 || dStat.sec >= 90) && pendingBlockOffer?.domain !== distDomain) {
   offerTabBlock(distDomain, dStat.visits, dStat.sec / 60);
  }
 }
 const gazeAway = visionFresh ? (v.gaze && v.gaze !== 'center') : (c.baseline >= 25 && idleSec < 90);
 auto.stuck = live.hooks !== false && kind === 'study' && now - auto.windowSince > 120000 && c.last60 <= 2 && c.baseline >= 15 && gazeAway && idleSec < 150;
 if (kind !== auto.kind) { auto.transition = { kind, prev: auto.kind, dur: (now - auto.kindSince) / 1000 }; auto.prevKind = auto.kind; auto.kind = kind; auto.kindSince = now; }
 window.compassoSuppressAlerts = kind === 'hobby' || kind === 'idle';
 if (now - auto.lastSave > 30000) { auto.lastSave = now; saveAutoProfile(); }
 evaluateInterventions(now, idleSec);
 renderAutopilot(now);
}
let jarvisBooted = false, jarvisBootTries = 0, bootCamRetries = 0;
async function tryJarvisAutonomousBoot() {
 if (!state || document.body.classList.contains('auth-active')) return;
 if (pendingBlockDomainParam) {
  const dom = pendingBlockDomainParam;
  pendingBlockDomainParam = null;
  try {
   const u = new URL(location.href);
   u.searchParams.delete('block');
   history.replaceState({}, '', u.toString());
  } catch(_) {}
  setTimeout(() => applyTabBlock(dom), 350);
 }
 if (jarvisBooted) return;
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
   if (r.ok) {
    state = await r.json();
    await refresh();
   }
   if (state?.active?.goal === 0 && $('goal')) { $('goal').value = 'continuous'; if ($('customGoalField')) $('customGoalField').hidden = true; }
  }
  if (!cameraOn && !cameraStarting && $('cameraAuto')?.checked) {
   startCamera(false).then(() => {
    if (!cameraOn && !cameraManual && bootCamRetries < 3) {
     bootCamRetries++;
     const retryDelay = bootCamRetries === 1 ? 1500 : bootCamRetries === 2 ? 4000 : 9000;
     setTimeout(() => { if (!cameraOn && !cameraStarting && $('cameraAuto')?.checked) startCamera(false).catch(() => {}); }, retryDelay);
    }
   }).catch(() => {});
  }
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
