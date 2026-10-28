'use strict';
let startupPromptConsidered=false;
$('cameraAuto').checked=saved('compasso.cameraAuto',true);
$('cameraAuto').onchange=()=>localStorage.setItem('compasso.cameraAuto',JSON.stringify($('cameraAuto').checked));
$('startupPromptEnabled').checked=saved('compasso.startupPrompt',true);
$('startupPromptEnabled').onchange=()=>localStorage.setItem('compasso.startupPrompt',JSON.stringify($('startupPromptEnabled').checked));
window.setCompassoGoal=minutes=>{
 const value=minutes===0?'continuous':String(minutes);
 if(![...$('goal').options].some(o=>o.value===value))$('goal').add(new Option(`◷ ${minutes} min`,value));
 $('goal').value=value;$('customGoalField').hidden=value!=='custom';
};
$('goal').onchange=()=>{$('customGoalField').hidden=$('goal').value!=='custom';};
window.onCompassoProjectChanged=()=>{
 const preset=CompassoPresets.find($('project').value);
 $('presetSummary').textContent=preset?`${preset.minutes?preset.minutes+' min sugeridos':'Contínuo'} · método e referência`:'Perfil personalizado';
 $('presetMethod').textContent=preset?.method||'Defina seu objetivo e ajuste a duração para a atividade.';
 $('presetEvidence').textContent=preset?.evidence||'Um projeto personalizado não tem uma evidência específica associada automaticamente.';
 $('presetSource').hidden=!preset;if(preset){$('presetSource').textContent=preset.source.title;$('presetSource').href=preset.source.url;window.setCompassoGoal(preset.minutes);}
};
$('project').onchange=window.onCompassoProjectChanged;
window.onCompassoProjectChanged();
$('startupDuration').onchange=()=>{$('startupCustomField').hidden=$('startupDuration').value!=='custom';};
$('startupProject').onchange=()=>{const p=CompassoPresets.find($('startupProject').value);if(p){$('startupDuration').value=p.minutes===0?'continuous':String(p.minutes);$('startupCustomField').hidden=true;}};
window.renderStartupPrompt=()=>{
 if(startupPromptConsidered||!state)return;startupPromptConsidered=true;
 if(!new URLSearchParams(location.search).has('startup')||!saved('compasso.startupPrompt',true)||state.active)return;
 $('startupProject').replaceChildren(...[...$('project').options].map(o=>new Option(o.textContent,o.value)));
 $('startupCamera').checked=$('cameraAuto').checked;$('showStartupPrompt').checked=true;$('startupDialog').showModal();
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
