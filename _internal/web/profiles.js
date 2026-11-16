'use strict';
let startupPromptConsidered=false;
$('cameraAuto').checked=saved('compasso.cameraAuto',true);
$('cameraAuto').onchange=()=>localStorage.setItem('compasso.cameraAuto',JSON.stringify($('cameraAuto').checked));
$('startupPromptEnabled').checked=saved('compasso.startupPrompt',false);
$('startupPromptEnabled').onchange=()=>localStorage.setItem('compasso.startupPrompt',JSON.stringify($('startupPromptEnabled').checked));
window.setCompassoGoal=minutes=>{
 const value=minutes===0?'continuous':String(minutes);
 if(![...$('goal').options].some(o=>o.value===value))$('goal').add(new Option(`◷ ${minutes} min`,value));
 $('goal').value=value;$('customGoalField').hidden=value!=='custom';
};
$('goal').onchange=()=>{$('customGoalField').hidden=$('goal').value!=='custom';};
window.onCompassoProjectChanged=()=>{
 const preset=CompassoPresets.find($('project').value);
 const autoOn=$('aiAutopilot')?.checked;
 $('presetSummary').textContent=preset?`${preset.minutes&&!autoOn?preset.minutes+' min sugeridos':'Contínuo (IA)'} · referência opcional`:'Perfil personalizado';
 $('presetMethod').textContent=preset?.method||'A IA adapta o ritmo automaticamente pelo seu uso real do PC.';
 $('presetEvidence').textContent=preset?.evidence||'Observação contínua local adaptada aos seus aplicativos e cadência.';
 $('presetSource').hidden=!preset;
 if(preset){
  $('presetSource').textContent=preset.source.title;
  $('presetSource').href=preset.source.url;
  if(!autoOn&&preset.minutes>0)window.setCompassoGoal(preset.minutes);
  else window.setCompassoGoal(0);
 }
};
$('project').onchange=()=>{
 const preset=CompassoPresets.find($('project').value);
 if(preset&&preset.minutes>0)window.setCompassoGoal(preset.minutes);
 else window.setCompassoGoal(0);
 window.onCompassoProjectChanged();
};
window.onCompassoProjectChanged();
$('startupDuration').onchange=()=>{$('startupCustomField').hidden=$('startupDuration').value!=='custom';};
$('startupProject').onchange=()=>{const p=CompassoPresets.find($('startupProject').value);if(p){$('startupDuration').value=p.minutes===0?'continuous':String(p.minutes);$('startupCustomField').hidden=true;}};
window.renderStartupPrompt=()=>{
 if(startupPromptConsidered||!state)return;startupPromptConsidered=true;
 if(!new URLSearchParams(location.search).has('startup')||!saved('compasso.startupPrompt',false)||state.active)return;
 $('startupProject').replaceChildren(...[...$('project').options].map(o=>new Option(o.textContent,o.value)));
 $('startupCamera').checked=$('cameraAuto').checked;$('showStartupPrompt').checked=false;$('startupDialog').showModal();
};
function storeStartupChoice(){$('startupPromptEnabled').checked=$('showStartupPrompt').checked;localStorage.setItem('compasso.startupPrompt',JSON.stringify($('showStartupPrompt').checked));}
$('startupLater').onclick=safe(async()=>{storeStartupChoice();$('startupDialog').close();await api('minimize');});
$('startupBegin').onclick=safe(async()=>{
 const value=$('startupDuration').value;
 const minutes=value==='continuous'?0:Number(value==='custom'?$('startupCustom').value:value);
 if(!Number.isInteger(minutes)||minutes<0||minutes>1440||(value==='custom'&&minutes<1))throw Error('Informe uma duração válida ou escolha o modo contínuo.');
 $('project').value=$('startupProject').value;window.onCompassoProjectChanged();window.setCompassoGoal(minutes);
 $('cameraAuto').checked=$('startupCamera').checked;localStorage.setItem('compasso.cameraAuto',JSON.stringify($('cameraAuto').checked));
 storeStartupChoice();$('startupDialog').close();$('start').click();
});
