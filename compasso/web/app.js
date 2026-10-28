'use strict';
const $ = id => document.getElementById(id);
const colors={focus:'#37d0a0',study:'#6378ff',neutral:'#a37be4',distraction:'#f56978',mixed:'#b6a8d0'};
const labels={focus:'Foco',study:'Leitura',neutral:'Neutro',distraction:'Distração',mixed:'Misto'};
let state=null, report=null, token='', tab='focus', pinned=false, suggested=25, stream=null, model=null, cameraOn=false, videoVisible=true, cameraGeneration=0;
let calibrated=null, lastCameraSend=0, blinkClosed=false, blinkCount=0, totalBlinks=0, lastLandmarks=null, cameraBusy=false;
let calibrationRun=null, classificationContext=null, liveClassificationTarget=null, blinkStarted=0;
let calibrationPrompted=false;
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
 $('start').disabled=active;$('pause').disabled=!active;$('finish').disabled=!active;$('pause').textContent=state.paused?'▶ Retomar':'Ⅱ Pausar';
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
$('recalculate').onclick=safe(loadReport);
function categorySegments(values,total){return Object.entries(values).map(([k,v])=>v?`<i style="width:${100*v/Math.max(1,total)}%;background:${colors[k]}" title="${labels[k]}: ${esc(duration(v))}">${pct(v,total)>=12?pct(v,total)+'%':''}</i>`:'').join('');}
function renderReport(){
 if(!report)return;const r=report,goal=Number($('dailyGoal').value)*60;
 $('summary').textContent=`RESUMO DO DIA · ${Math.floor(r.total/60)} MIN / META: ${Math.round(goal/60)} MIN`;
 $('reportText').textContent=r.total?`Você registrou ${duration(r.total)}. ${r.apps[0]?.app} foi o aplicativo mais usado (${pct(r.apps[0]?.seconds,r.total)}%).`:'Ainda não há registros neste dia. Inicie o foco para acompanhar sua atividade.';
 $('dailyProgress').style.width=Math.min(100,100*r.total/goal)+'%';
 $('appRows').innerHTML=r.apps.length?'':'<div class="empty">O seu próximo bloco começa uma nova história.</div>';
 r.apps.forEach((app,i)=>{const row=document.createElement('button');row.className='app-row';row.innerHTML=`<strong>${i+1}. ${esc(app.app)}</strong><span class="bar">${categorySegments(app.categories,Math.max(1,r.total))}</span><span style="color:${colors[app.category]}">${pct(app.seconds,r.total)}% (${duration(app.seconds)})</span>`;row.onclick=()=>openClassification({scope:'app',app:app.app},app.category);$('appRows').append(row);});
 $('windowRows').replaceChildren();
 (r.windows||[]).forEach((w,i)=>{const row=document.createElement('button');row.className='app-row window-row';row.title=`${w.title||'Sem título'} · ${w.app} · ID ${w.id}`;row.innerHTML=`<strong>${i+1}. ${esc(w.title||'Sem título')}<small>${esc(w.app)} · ${esc(w.id)}</small></strong><span class="bar ${w.category}"><i style="width:${100*w.seconds/Math.max(1,r.total)}%"></i></span><span class="${w.category}">${pct(w.seconds,r.total)}% (${duration(w.seconds)})</span>`;row.onclick=()=>openClassification({scope:'window',app:w.app,title:w.title},w.category);$('windowRows').append(row);});
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
function insights(r){
 const focused=r.categories.focus+r.categories.study,coverage=pct(r.face,r.total),index=r.total>=60?pct(focused,r.total):null;
 suggested=r.total>=1500&&pct(r.categories.distraction,r.total)<20?50:25;
 const reasons=[];
 if(!r.total)reasons.push('Inicie uma sessão e classifique seus aplicativos. As análises aparecem com dados reais.');
 if(r.total&&r.categories.neutral/r.total>.4)reasons.push(`${pct(r.categories.neutral,r.total)}% do tempo está neutro. Classifique os aplicativos no relatório para tornar o índice útil.`);
 if(r.total&&r.categories.distraction/r.total>.15)reasons.push(`${duration(r.categories.distraction)} em aplicativos classificados como distração. Feche ou silencie os que não ajudam sua tarefa.`);
 if((r.window_switches||r.switches)>10)reasons.push(`${r.window_switches||r.switches} trocas de janela ou contexto registradas. Agrupar consultas pode reduzir interrupções; alternar também pode fazer parte da tarefa.`);
 if(r.gaze_coverage&&r.gaze_directions.center/r.gaze_coverage<.6)reasons.push(`Olhar estimado fora do centro em ${pct(r.gaze_coverage-r.gaze_directions.center,r.gaze_coverage)}% das amostras válidas. Confira os alvos de calibração antes de interpretar o resultado.`);
 if(r.pose_coverage&&r.posture/r.pose_coverage<.6)reasons.push('Há desvios de alinhamento nos ombros ou tronco. Confira o enquadramento de quadris e ombros e ajuste sua posição, se necessário.');
 if(r.face&&r.centered/r.face<.65)reasons.push(`Cabeça fora do centro em ${pct(r.face-r.centered,r.face)}% do tempo com rosto visível. Confira a posição da câmera e recalibre; isso não comprova desatenção.`);
 if(r.total&&!r.face)reasons.push('Sem amostras de câmera. O relatório de uso funciona normalmente com a câmera desligada.');
 if(r.total&&!reasons.length)reasons.push('Há poucos desvios nas regras atuais. Compare com a tarefa que você realmente realizou.');
 return {index,coverage,reasons,plan:[`Escolha uma tarefa concreta e experimente um bloco de ${suggested} minutos. A sugestão é uma regra ajustável, não uma previsão de fadiga.`,`Mantenha os aplicativos necessários abertos e classifique o uso de acordo com sua atividade.`,`Ao concluir, faça uma pausa de 3 a 5 minutos e avalie se o ritmo funcionou para você.`]};
}
function renderInsights(){const r=report,a=insights(r);$('score').textContent=a.index??'—';$('scoreLabel').textContent=a.index===null?'Aguardando ≥1 min':a.index>=70?'Foco classificado':a.index>=40?'Uso diversificado':'Revise as categorias';$('analysisFacts').innerHTML=`<div>• Foco / leitura: <span class="focus">${duration(r.categories.focus+r.categories.study)}</span></div><div>• Distração classificada: <span class="distraction">${pct(r.categories.distraction,r.total)}%</span></div><div>• Câmera com rosto: ${a.coverage}% do registro</div><div>• Fadiga / horário de pico: dados insuficientes</div><div>• Próximo bloco sugerido: ${suggested} min</div>`;$('bottlenecks').innerHTML=a.reasons.map(t=>`<div>${esc(t)}</div>`).join('');$('plan').innerHTML=a.plan.map(t=>`<li>${esc(t)}</li>`).join('');$('applyBlock').textContent=`ϟ Aplicar bloco (${suggested} min)`;}
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
 cancelCalibration();calibrated=null;lastLandmarks=null;
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
  cameraOn=true;calibrated=null;calibrationPrompted=false;blinkCount=0;totalBlinks=0;blinkClosed=false;lastCameraSend=0;
  $('hud').width=$('video').videoWidth;$('hud').height=$('video').videoHeight;
  $('cameraPlaceholder').hidden=true;$('video').hidden=!videoVisible;$('cameraToggle').textContent='◉ Desligar câmera';
  stream.getVideoTracks()[0].addEventListener('ended',()=>{stopCamera();notify('A câmera foi desconectada. Você pode continuar sem ela.');});
  frame(generation);
 }catch(e){stopCamera();notify('Não foi possível abrir a câmera: '+e.message);}finally{$('cameraToggle').disabled=false;}
}
async function frame(generation){if(!cameraOn||generation!==cameraGeneration)return;if(!cameraBusy){cameraBusy=true;try{await model.send({image:$('video')});}catch(e){if(generation===cameraGeneration){stopCamera();notify('Falha no modelo de câmera: '+e.message);}}finally{cameraBusy=false;}}if(cameraOn&&generation===cameraGeneration)setTimeout(()=>frame(generation),100);}
function onResults(results){
 if(!cameraOn)return;lastLandmarks=results;
 const canvas=$('hud'),w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d');
 const {metrics:data,raw}=CompassoVision.analyze(results,calibrationRun?null:calibrated,h/w);
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
  if(raw.iris?.open&&!calibrated&&!calibrationRun&&!calibrationPrompted){calibrationPrompted=true;$('calibrate').click();}
 }
 const p=results.poseLandmarks;if(p){for(const [a,b]of CompassoVision.POSE_CONNECTIONS)if(p[a]?.visibility>=.55&&p[b]?.visibility>=.55)segment(p[a],p[b],data.posture===false?'#ffbd64':'#a37be4');for(const joint of p)if(joint.visibility>=.55)point(joint,'#00d1e7',2.5);}
 $('points').textContent=results.faceLandmarks?`(${results.faceLandmarks.length} PTS)`:'';$('cameraStatus').textContent=data.face?'● RASTREAMENTO LOCAL ATIVO':'○ PROCURANDO ROSTO';
 $('gaze').textContent=!data.face?'Rosto não detectado':!raw.iris?'Íris indisponíveis':!calibrated?'Calibre o olhar (5 pontos)':data.gaze_direction?`${gazeLabels[data.gaze_direction]} · pelas íris`:'Sem leitura ocular confiável';
 $('gaze').title=data.gaze_direction?`Olhar relativo calibrado: x ${data.gaze_x.toFixed(2)}, y ${data.gaze_y.toFixed(2)}. Não é uma coordenada exata na tela.`:'Use Recalibrar centro para capturar cinco alvos, mantendo a cabeça parada.';
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
const calibrationTargets=[['center','Centro',50,50],['left','Esquerda',10,50],['right','Direita',90,50],['up','Acima',50,22],['down','Abaixo',50,75]];
function cancelCalibration(){if(calibrationRun?.timeout)clearTimeout(calibrationRun.timeout);calibrationRun=null;if($('calibrationDialog').open)$('calibrationDialog').close();$('captureCalibration').disabled=false;}
function displayCalibrationTarget(){
 const [name,label,x,y]=calibrationTargets[calibrationRun.index];
 $('calibrationTarget').style.left=x+'%';$('calibrationTarget').style.top=y+'%';
 $('calibrationStep').textContent=`${calibrationRun.index+1} / 5 · ${label}`;
 $('calibrationHint').textContent='Olhe para o alvo sem girar a cabeça. Clique em Capturar ponto e continue olhando por cerca de um segundo.';
 $('captureCalibration').disabled=false;
}
$('calibrate').onclick=()=>{
 if(!cameraOn)return notify('Ative a câmera para calibrar o olhar.');
 calibrationRun={index:0,samples:{},capturing:false};displayCalibrationTarget();$('calibrationDialog').showModal();
};
$('cancelCalibration').onclick=cancelCalibration;
$('calibrationDialog').addEventListener('cancel',cancelCalibration);
$('captureCalibration').onclick=()=>{
 if(!calibrationRun)return;calibrationRun.capturing=true;calibrationRun.current=[];calibrationRun.started=performance.now();
 $('captureCalibration').disabled=true;$('calibrationHint').textContent='Capturando… mantenha os olhos abertos e a cabeça parada.';
 calibrationRun.timeout=setTimeout(()=>{if(calibrationRun){calibrationRun.capturing=false;$('captureCalibration').disabled=false;$('calibrationHint').textContent='Não houve amostras válidas suficientes. Confira iluminação, rosto e íris, e tente capturar novamente.';}},12000);
};
function captureCalibrationSample(raw){
 const run=calibrationRun;if(!run?.capturing||!raw.head||!raw.iris?.open||!raw.iris.consistent)return;
 if(performance.now()-run.started<250)return;
 const base=run.samples.center?.[0]?.head;
 if(base&&(Math.abs(raw.head.yaw-base.yaw)>15||Math.abs(raw.head.pitch-base.pitch)>15||Math.abs(raw.head.roll-base.roll)>12))return;
 run.current.push(raw);$('calibrationStep').textContent=`${run.index+1} / 5 · ${Math.min(8,run.current.length)} de 8 amostras`;
 if(run.current.length<8)return;
 clearTimeout(run.timeout);run.capturing=false;run.samples[calibrationTargets[run.index][0]]=run.current;
 run.index++;
 if(run.index<calibrationTargets.length){displayCalibrationTarget();return;}
 try{const result=CompassoVision.calibrate(run.samples);calibrated=result;cancelCalibration();notify('Olhar calibrado pelas íris; a direção da cabeça é medida separadamente.');}
 catch(e){run.index=0;run.samples={};displayCalibrationTarget();$('calibrationHint').textContent=e.message;}
}
window.addEventListener('pagehide',stopCamera);
let refreshing=false;setInterval(async()=>{if(refreshing)return;refreshing=true;try{await refresh();}catch(e){notify('Conexão local interrompida. Reabra o Compasso para continuar.');}finally{refreshing=false;}},1000);
refresh().catch(e=>notify(e.message));
