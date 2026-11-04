'use strict';
const $ = id => document.getElementById(id);
let isWidgetMode = false;
function centerCompassoWindow(){
 try {
  if (isWidgetMode) return;
  if (window.screen && screen.availWidth) {
   const targetW = Math.min(880, screen.availWidth - 40);
   const targetH = Math.min(840, screen.availHeight - 60);
   const left = Math.max(0, Math.round((screen.availWidth - targetW) / 2));
   const top = Math.max(0, Math.round((screen.availHeight - targetH) / 2));
   window.resizeTo(targetW, targetH);
   window.moveTo(left, top);
  }
 } catch(_) {}
}
centerCompassoWindow();
window.addEventListener('load', centerCompassoWindow);
setTimeout(centerCompassoWindow, 250);
setTimeout(centerCompassoWindow, 750);
document.addEventListener('click', e => {
 if (e.target.tagName === 'DIALOG' && e.target.open) {
  const rect = e.target.getBoundingClientRect();
  const inDialog = (rect.top <= e.clientY && e.clientY <= rect.bottom && rect.left <= e.clientX && e.clientX <= rect.right);
  if (!inDialog) e.target.close();
 }
});
function toggleWidgetMode() {
 isWidgetMode = !isWidgetMode;
 document.body.classList.toggle('widget-mode', isWidgetMode);
 const btn = $('widgetToggle');
 if (btn) btn.textContent = isWidgetMode ? '\u2922 Expandir' : '\u23F1 Rel\u00F3gio';
 try {
  if (window.screen && screen.availWidth) {
   if (isWidgetMode) {
    window.resizeTo(360, 240);
    if (!pinned) {
     pinned = true;
     api('pin');
     $('pin').textContent = '\u2663 Fixado';
    }
   } else {
    centerCompassoWindow();
   }
  }
 } catch(_) {}
}
if ($('widgetToggle')) $('widgetToggle').onclick = toggleWidgetMode;

let tutorialStep = 0;
const totalTutorialSteps = 4;
function showTutorialStep(idx) {
 tutorialStep = Math.max(0, Math.min(totalTutorialSteps - 1, idx));
 document.querySelectorAll('.tutorial-slide').forEach((s, i) => s.classList.toggle('active', i === tutorialStep));
 document.querySelectorAll('.tutorial-dot').forEach((d, i) => d.classList.toggle('active', i === tutorialStep));
 if ($('tutorialPrev')) $('tutorialPrev').disabled = (tutorialStep === 0);
 if ($('tutorialNext')) {
  $('tutorialNext').textContent = (tutorialStep === totalTutorialSteps - 1) ? '\u2713 Concluir' : 'Pr\u00F3ximo \u27E9';
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
if (!localStorage.getItem('compasso.tutorialSeen')) {
 setTimeout(openTutorial, 600);
}
const colors={focus:'#37d0a0',study:'#6378ff',neutral:'#a37be4',distraction:'#f56978',mixed:'#b6a8d0'};
const labels={focus:'Foco',study:'Leitura',neutral:'Neutro',distraction:'Distração',mixed:'Misto'};
let state=null, report=null, token='', tab='focus', pinned=false, suggested=25, stream=null, model=null, cameraOn=false, videoVisible=true, cameraGeneration=0;
let calibrated=null, lastCameraSend=0, blinkClosed=false, blinkCount=0, totalBlinks=0, lastLandmarks=null, cameraBusy=false;
let calibrationRun=null, classificationContext=null, liveClassificationTarget=null, blinkStarted=0;
let calibrationPrompted=false;
let calibrationKey=null,calibrationStored=false,autoCalibrationSamples=[],lastRaw=null;
const medianValue=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
function calibrationStorage(){try{return window.localStorage;}catch{return null;}}
function showCalibrationSaved(){
 $('calibrationSaved').hidden=!calibrationStored;
 $('calibrate').textContent=calibrated?'▪ Recalibrar olhar e cabeça':'▪ Calibrar olhar e cabeça';
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
$('cancelSession').onclick=safe(async()=>{if(!confirm('Cancelar esta sessão? O tempo, as capturas e os registros desta sessão serão descartados.'))return;await api('cancel');stopCamera();await refresh();notify('Sessão cancelada. Você pode começar outra quando quiser.');});
$('category').onpointerdown=()=>{liveClassificationTarget={...state.live};};
$('category').onfocus=()=>{liveClassificationTarget={...state.live};};
$('category').onchange=safe(async()=>{const target=liveClassificationTarget||state.live;await api('classify',{scope:'window',app:target.app,title:target.window_title,category:$('category').value});liveClassificationTarget=null;await refresh();});
$('startup').onchange=safe(async()=>{try{await api('startup',{enabled:$('startup').checked});}catch(e){$('startup').checked=!$('startup').checked;throw e;}});
$('pin').onclick=safe(async()=>{pinned=!pinned;await api(pinned?'pin':'unpin');$('pin').textContent=pinned?'♧ Fixado':'♧ Fixo';$('pin').setAttribute('aria-pressed',pinned);});
$('web').onclick=()=>window.open(location.origin,'_blank','noopener');
for(const id of ['minimize','tray'])$(id).onclick=safe(async()=>{stopCamera();await api('minimize');});
let goalNotified=null;
async function refresh(){
 const r=await fetch('/api/state');if(!r.ok)throw Error('Monitor local indisponível');state=await r.json();token=state.token;
 $('timer').textContent=clock(state.elapsed);const active=!!state.active;
 $('status').textContent=active?(state.paused?'Ⅱ SESSÃO PAUSADA':'● FOCO EM ANDAMENTO'):'○ PRONTO PARA INICIAR';
 $('start').disabled=active;$('pause').disabled=!active;$('finish').disabled=!active;$('cancelSession').disabled=!active;$('pause').textContent=state.paused?'▶ Retomar':'Ⅱ Pausar';
 $('project').disabled=active;$('goal').disabled=active;
 const goal=active?state.active.goal:getGoal();
 $('goalLabel').textContent=goal?(active?`${state.active.project} · bloco de ${goal} min`:`Bloco de ${goal} min · no seu ritmo`):'Acompanhamento contínuo · disponível 24h';
 $('progress').style.width=goal?Math.min(100,state.elapsed/(goal*60)*100)+'%':'0%';document.querySelector('.progress').hidden=!goal;
 $('customGoal').disabled=active;
 if(active && goal>0 && state.elapsed>=goal*60 && goalNotified!==state.active.id){goalNotified=state.active.id;notify('Bloco concluído! Considere uma pausa. Você pode continuar ou concluir a sessão.');}
 $('window').textContent=state.live.window_title||state.live.app;$('window').title=`${state.live.app} · ${state.live.window_title||'Sem título'} · ID ${state.live.window_id||'indisponível'}`;
 if(document.activeElement!==$('category'))$('category').value=state.category;$('startup').checked=state.startup;
 $('input').textContent=state.live.hooks?(active?`${state.report.keys} teclas · ${state.report.clicks} cliques · ${state.report.moves||0} movimentos`:'Monitor pronto · sem registrar'):'Contagem de entrada indisponível';
 $('input').title=`${state.report.scroll} eventos de rolagem · ${Math.round(state.report.mouse_distance||0)} px de deslocamento (dia)`;
 $('mouseMetrics').textContent=`Mouse: x ${state.live.mouse_x??'—'}, y ${state.live.mouse_y??'—'} · ${state.report.moves||0} movimentos · ${Math.round(state.report.mouse_distance||0)} px · ${state.report.scroll} rolagens (dia).`;
 $('windowMetrics').textContent=$('window').title;
 if(cameraOn&&(!active||state.paused))stopCamera();
 if(!$('reportDay').value)$('reportDay').value=state.report.day;
 if($('reportDay').value===state.report.day){report=state.report;if(tab!=='focus')renderReport();}
 window.renderCompassoContext?.();
 window.renderStartupPrompt?.();
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
  return {fatigue:null,dispersion:null,optimalRemaining:null,breakTime:'—',fatigueLevel:'Aguardando dados',dispersionLevel:'Aguardando dados',fatigueDesc:'Inicie uma sessão de estudo para o motor preditivo calcular a curva.',dispersionDesc:'Monitorando alternância de janelas e contexto...',fatigueColor:'var(--muted)',dispersionColor:'var(--muted)'};
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
 let breakTime='Micropausa de 3 min';
 if(fatigue>=70||mins>=60)breakTime='Pausa restauradora de 15 min';
 else if(fatigue>=45||mins>=35)breakTime='Pausa adaptativa de 5 a 8 min';

 const fatigueLevel=fatigue<35?'Baixa':fatigue<65?'Moderada':'Elevada';
 const dispersionLevel=dispersion<35?'Estável':dispersion<65?'Alerta':'Alto Risco';
 const fatigueColor=fatigue<35?'var(--focus)':fatigue<65?'#ffb84d':'var(--distraction)';
 const dispersionColor=dispersion<35?'var(--focus)':dispersion<65?'#ffb84d':'var(--distraction)';
 const fatigueDesc=fatigue<35?'Ritmo estável. Boa sustentação da atenção e postura alinhada.':fatigue<65?'Sinais de desaceleração motora e tempo de bloco se acumulando.':'Curva de esgotamento detectada. Recomenda-se pausar antes de iniciar novo bloco.';
 const dispersionDesc=dispersion<35?`${switches} trocas de contexto. Fluxo de trabalho linear e focado.`:dispersion<65?`Média de ${switchRate.toFixed(1)} trocas de janela/minuto. Risco de fragmentação.`:`Trocas excessivas e tempo em distrações. Feche abas secundárias.`;

 return {fatigue,dispersion,optimalRemaining:optimalMins,breakTime,fatigueLevel,dispersionLevel,fatigueDesc,dispersionDesc,fatigueColor,dispersionColor};
}
function insights(r){
 const focused=r.categories.focus+r.categories.study,coverage=pct(r.face,r.total),index=r.total>=60?pct(focused,r.total):null;
 const pred=computePredictiveMetrics(r);
 suggested=r.total>=1500&&pct(r.categories.distraction,r.total)<20?50:25;
 const reasons=[];
 if(!r.total)reasons.push('Inicie uma sessão e classifique seus aplicativos. As análises aparecem com dados reais.');
 if(pred.fatigue&&pred.fatigue>=50)reasons.push(`Alerta Preditivo: ${pred.fatigueDesc}`);
 if(pred.dispersion&&pred.dispersion>=50)reasons.push(`Alerta de Dispersão: ${pred.dispersionDesc}`);
 if(r.total&&r.categories.neutral/r.total>.4)reasons.push(`${pct(r.categories.neutral,r.total)}% do tempo está neutro. Classifique os aplicativos no relatório para tornar o índice útil.`);
 if(r.total&&r.categories.distraction/r.total>.15)reasons.push(`${duration(r.categories.distraction)} em aplicativos classificados como distração. Feche ou silencie os que não ajudam sua tarefa.`);
 if((r.window_switches||r.switches)>10)reasons.push(`${r.window_switches||r.switches} trocas de janela ou contexto registradas. Agrupar consultas pode reduzir interrupções.`);
 if(r.gaze_coverage&&r.gaze_directions.center/r.gaze_coverage<.6)reasons.push(`Olhar estimado fora do centro em ${pct(r.gaze_coverage-r.gaze_directions.center,r.gaze_coverage)}% das amostras válidas.`);
 if(r.pose_coverage&&r.posture/r.pose_coverage<.6)reasons.push('Há desvios de alinhamento nos ombros ou tronco. Confira sua ergonomia e postura.');
 if(r.face&&r.centered/r.face<.65)reasons.push(`Cabeça fora do centro em ${pct(r.face-r.centered,r.face)}% do tempo com rosto visível.`);
 if(r.total&&!reasons.length)reasons.push('Padrão motor e postural consistente com baixo risco de fadiga iminente.');
 const plan=[
  `Janela de foco ideal: experimente um bloco de ${pred.optimalRemaining||suggested} minutos antes da próxima quebra de ritmo.`,
  `Adote ${pred.breakTime.toLowerCase()} para restabelecer a capacidade de processamento cognitivo (Albulescu et al., 2022).`,
  `Mantenha abertas somente as ferramentas essenciais para reduzir o custo cognitivo de alternância de contexto.`
 ];
 return {index,coverage,reasons,plan,pred};
}
function renderInsights(){
 const r=report,a=insights(r),pred=a.pred;
 $('score').textContent=a.index??'—';
 $('scoreLabel').textContent=a.index===null?'Aguardando ≥1 min':a.index>=70?'Foco consistente':a.index>=40?'Uso balanceado':'Atenção fragmentada';
 $('analysisFacts').innerHTML=`<div>• Foco / leitura: <span class="focus">${duration(r.categories.focus+r.categories.study)}</span></div><div>• Distração: <span class="distraction">${pct(r.categories.distraction,r.total)}%</span></div><div>• Cobertura visual: ${a.coverage}% do tempo</div><div>• Curva de fadiga preditiva: ${pred.fatigue!==null?pred.fatigue+'% ('+pred.fatigueLevel+')':'calculando...'}</div><div>• Próximo bloco sugerido: ${suggested} min</div>`;
 $('bottlenecks').innerHTML=a.reasons.map(t=>`<div>${esc(t)}</div>`).join('');
 $('plan').innerHTML=a.plan.map(t=>`<li>${esc(t)}</li>`).join('');
 $('applyBlock').textContent=`ϟ Aplicar bloco (${suggested} min)`;
 if($('predFatigueVal')){
  $('predFatigueVal').textContent=pred.fatigue!==null?`${pred.fatigue}%`:'—';
  $('predFatigueVal').style.color=pred.fatigueColor;
  $('predFatigueBadge').textContent=pred.fatigueLevel;
  $('predFatigueBadge').style.borderColor=pred.fatigueColor;
  $('predFatigueBadge').style.color=pred.fatigueColor;
  $('predFatigueBar').style.width=(pred.fatigue||0)+'%';
  $('predFatigueBar').style.background=pred.fatigueColor;
  $('predFatigueDesc').textContent=pred.fatigueDesc;

  $('predDispersionVal').textContent=pred.dispersion!==null?`${pred.dispersion}%`:'—';
  $('predDispersionVal').style.color=pred.dispersionColor;
  $('predDispersionBadge').textContent=pred.dispersionLevel;
  $('predDispersionBadge').style.borderColor=pred.dispersionColor;
  $('predDispersionBadge').style.color=pred.dispersionColor;
  $('predDispersionBar').style.width=(pred.dispersion||0)+'%';
  $('predDispersionBar').style.background=pred.dispersionColor;
  $('predDispersionDesc').textContent=pred.dispersionDesc;

  $('predOptimalWindow').textContent=pred.optimalRemaining!==null?`~${pred.optimalRemaining} min restantes`:'Calculando...';
  $('predBreakRecommendation').textContent=pred.breakTime;
  $('predictiveStatus').textContent=pred.fatigue!==null?'● MODELO ATIVO':'○ AGUARDANDO SESSÃO';
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
 const wasOn=cameraOn;cameraGeneration++;cameraOn=false;
 if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
 $('video').srcObject=null;$('video').hidden=true;$('cameraPlaceholder').hidden=false;
 $('cameraToggle').textContent='◉ Ativar câmera';$('cameraStatus').textContent='○ CÂMERA DESLIGADA · OPCIONAL';$('points').textContent='';
 const canvas=$('hud');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 for(const id of ['gaze','head','posture','face']){$(id).textContent='Câmera desligada';$(id).title='';}
 $('signalMetrics').textContent='Ative a câmera durante uma sessão para ver as medidas.';
 cancelCalibration();calibrated=null;lastLandmarks=null;autoCalibrationSamples=[];lastRaw=null;
 if(wasOn&&token)api('camera_off',{},true).catch(()=>{});
}
async function startCamera(){
 if(!state?.active||state.paused)return notify('Inicie ou retome o foco antes de ativar a câmera.');
 const generation=++cameraGeneration;$('cameraToggle').disabled=true;$('cameraStatus').textContent='○ CARREGANDO MODELOS LOCAIS…';
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
  $('cameraPlaceholder').hidden=true;$('video').hidden=!videoVisible;$('cameraToggle').textContent='◉ Desligar câmera';
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
 if(results.faceLandmarks){ctx.globalAlpha=.65;for(const p of results.faceLandmarks)point(p,'#00d1e7',.75);ctx.globalAlpha=1;
  for(const vector of CompassoVision.hudVectors(results.faceLandmarks,data)){
   segment(vector.start,vector.end,vector.color,3.5);point(vector.start,vector.color,3.5);
   const end={x:vector.end.x*w,y:vector.end.y*h},angle=Math.atan2((vector.end.y-vector.start.y)*h,(vector.end.x-vector.start.x)*w);
   ctx.fillStyle=vector.color;ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-11*Math.cos(angle-.45),end.y-11*Math.sin(angle-.45));ctx.lineTo(end.x-11*Math.cos(angle+.45),end.y-11*Math.sin(angle+.45));ctx.closePath();ctx.fill();
  }
 }
 const p=results.poseLandmarks;if(p){for(const [a,b]of CompassoVision.POSE_CONNECTIONS)if(p[a]?.visibility>=.55&&p[b]?.visibility>=.55)segment(p[a],p[b],data.posture===false?'#ffbd64':'#a37be4');for(const joint of p)if(joint.visibility>=.55)point(joint,'#00d1e7',2.5);}
 $('points').textContent=results.faceLandmarks?`(${results.faceLandmarks.length} PTS)`:'';$('cameraStatus').textContent=data.face?'● RASTREAMENTO LOCAL ATIVO':'○ PROCURANDO ROSTO';
 $('gaze').textContent=!data.face?'Rosto não detectado':!raw.iris?'Íris indisponíveis':!calibrated?'Calibrando automaticamente…':data.gaze_direction?`${gazeLabels[data.gaze_direction]} · pelas íris`:'Sem leitura ocular confiável';
 $('gaze').title=data.gaze_direction?`Olhar relativo calibrado: x ${data.gaze_x.toFixed(2)}, y ${data.gaze_y.toFixed(2)}. Não é uma coordenada exata na tela.`:'O olhar é calibrado automaticamente ao detectar o rosto, ou pelo botão Recalibrar.';
 $('head').textContent=data.head_yaw===null?'Cabeça sem leitura':`${data.centered?'Centralizada':'Desvio estimado'} · ${degrees(data.head_yaw)}`;
 $('head').title=`Rotação horizontal ${degrees(data.head_yaw)} · vertical ${degrees(data.head_pitch)} · inclinação ${degrees(data.head_roll)}`;
 $('posture').textContent=data.trunk_lean===null?`${data.pose_points} pontos · quadris fora de quadro`:`Tronco ${degrees(data.trunk_lean)} · ${data.posture?'alinhado':'desvio estimado'}`;
 $('posture').title=`Ombros ${degrees(data.shoulder_tilt)} · tronco ${degrees(data.trunk_lean)} · quadris ${degrees(data.hip_tilt)}`;
 $('face').textContent=data.face?`${results.faceLandmarks.length} pontos · ${totalBlinks} piscadas`:'Rosto não detectado';
 $('signalMetrics').innerHTML=[['Olhar',data.gaze_direction?gazeLabels[data.gaze_direction]:'sem leitura calibrada'],['Cabeça H / V / inclinação',`${degrees(data.head_yaw)} / ${degrees(data.head_pitch)} / ${degrees(data.head_roll)}`],['Ombros / tronco',`${degrees(data.shoulder_tilt)} / ${degrees(data.trunk_lean)}`],['Quadris / pontos visíveis',`${degrees(data.hip_tilt)} / ${data.pose_points}`],['Cotovelos E / D',`${degrees(data.elbow_left)} / ${degrees(data.elbow_right)}`],['Joelhos E / D',`${degrees(data.knee_left)} / ${degrees(data.knee_right)}`]].map(([k,v])=>`<span data-reading><b>${k}</b><br>${esc(v)}</span>`).join('');
 if(performance.now()-lastCameraSend>1000){lastCameraSend=performance.now();api('camera',{...data,blinks:blinkCount}).catch(e=>notify('Falha ao registrar câmera: '+e.message));blinkCount=0;}
}
$('cameraToggle').onclick=()=>cameraOn?stopCamera():startCamera();
$('videoMode').onclick=()=>{videoVisible=!videoVisible;$('video').hidden=!videoVisible||!cameraOn;$('videoMode').textContent=videoVisible?'▣ Vídeo + HUD':'◎ Somente HUD';};
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
window.addEventListener('pagehide',stopCamera);
let refreshing=false;setInterval(async()=>{if(refreshing)return;refreshing=true;try{await refresh();}catch(e){notify('Conexão local interrompida. Reabra o Compasso para continuar.');}finally{refreshing=false;}},1000);
refresh().catch(e=>notify(e.message));
