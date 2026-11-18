'use strict';
let selectedCaptures=new Set(),captureSignature='',reviewSignature='';
let previousContextSession=null;
const guardSaved=saved('compasso.guard',{mode:'blocklist',domains:['youtube.com','instagram.com','tiktok.com','facebook.com','web.whatsapp.com','discord.com']});
$('guardMode').value=guardSaved.mode;$('guardDomains').value=guardSaved.domains.join(', ');
$('guardEnabled').checked=false;$('captureEnabled').checked=true;$('aiAuto').checked=false;$('approveUpload').checked=false;
const preferredProvider=saved('compasso.analysisProvider','local');
$('analysisProvider').value=['local','ollama','openai'].includes(preferredProvider)?preferredProvider:'local';$('reviewProvider').value=$('analysisProvider').value;
function updateProvider(value,refresh=true){
 $('analysisProvider').value=value;$('reviewProvider').value=value;localStorage.setItem('compasso.analysisProvider',JSON.stringify(value));
 const isLocal=(value==='local');
 $('aiAuto').disabled=isLocal||!$('captureEnabled').checked;
 if(isLocal){$('aiAuto').checked=false;$('approveUpload').checked=false;}
 $('localModelField').hidden=value!=='ollama';
 $('uploadConsentText').textContent=value==='openai'?'Autorizar envio à OpenAI':'Autorizar análise local';
 $('autoAnalysisLabel').textContent=value==='openai'?'Análise automática (OpenAI)':'Análise automática local';
 $('autoAnalysisHint').textContent=isLocal?'Desativada no modo métricas locais (sem envio de imagens).':'Até 8 por sessão.';
 $('providerHint').textContent=value==='local'?'100% offline.':value==='ollama'?'Modelo visual local no Ollama (ex.: gemma3:4b).':'Requer chave OpenAI.';
 document.querySelector('.billing-link').hidden=value!=='openai';
 if(state&&refresh)window.renderCompassoContext?.();
}
$('analysisProvider').onchange=() => updateProvider($('analysisProvider').value);
$('reviewProvider').onchange=() => updateProvider($('reviewProvider').value);
updateProvider($('analysisProvider').value);
window.contextStartOptions=()=>{
 const domains=$('guardDomains').value.split(/[\s,;]+/).filter(Boolean);
 localStorage.setItem('compasso.guard',JSON.stringify({mode:$('guardMode').value,domains}));
 const provider=$('analysisProvider').value;
 const captureOn=$('captureEnabled').checked;
 const guardOk=Boolean($('guardEnabled').checked&&state?.context?.extension_connected);
 const allowUpload=(provider!=='local')&&captureOn&&$('aiAuto').checked;
 return {objective:$('objective').value,capture_enabled:captureOn,allow_ai_upload:allowUpload,
  capture_interval:Number($('captureInterval').value),guard_enabled:guardOk,guard_mode:$('guardMode').value,domains,
  analysis_provider:provider,local_model:$('localModel').value};
};
$('captureEnabled').onchange=()=>{const isLocal=$('analysisProvider').value==='local';$('aiAuto').disabled=isLocal||!$('captureEnabled').checked;if(!$('captureEnabled').checked||isLocal)$('aiAuto').checked=false;};
$('captureNow').onclick=safe(async()=>{await api('capture_now');notify('Troque para a janela desejada. A captura autorizada será feita em 5 segundos.');});
$('stopCaptures').onclick=safe(async()=>{await api('context_stop');await refresh();});
$('extensionGuide').onclick=()=>$('extensionDialog').showModal();
$('closeExtensionGuide').onclick=()=>$('extensionDialog').close();
$('showExtensionFolder').onclick=safe(()=>api('extension_folder'));
$('closeCapturePreview').onclick=()=>{$('capturePreview').close();$('capturePreviewImage').removeAttribute('src');};
function updateSelection(){
 $('selectionCount').textContent=selectedCaptures.size?`${selectedCaptures.size} captura(s) selecionada(s).`:'Selecione imagens na aba Relatório.';
 $('approveUpload').checked=false;
}
window.renderCompassoContext=()=>{
 const c=state?.context;if(!c)return;
 const active=!!state.active;
 if(active&&$('analysisProvider').value!==c.options.analysis_provider)updateProvider(c.options.analysis_provider,false);
 $('reviewProvider').disabled=active;
 if(previousContextSession&&!active){const isLocal=$('analysisProvider').value==='local';$('captureEnabled').checked=true;$('aiAuto').checked=!isLocal;$('guardEnabled').checked=Boolean(c.extension_connected);$('approveUpload').checked=false;}
 previousContextSession=state.active?.id||null;
 document.body.classList.toggle('captures-active',active&&c.options.capture_enabled);
 for(const id of ['objective','guardEnabled','guardMode','guardDomains','captureEnabled','captureInterval','analysisProvider','localModel'])$(id).disabled=active;
 $('aiAuto').disabled=active||!$('captureEnabled').checked||$('analysisProvider').value==='local';
 if(active){$('captureEnabled').checked=c.options.capture_enabled;$('aiAuto').checked=c.options.allow_ai_upload;}
 $('captureNow').disabled=!active||state.paused||!c.options.capture_enabled||c.capture_busy;
 $('stopCaptures').disabled=!active||!c.options.capture_enabled;
 $('contextStatus').textContent=c.message;
 document.querySelector('.privacy-dot').classList.toggle('recording',active&&!state.paused&&c.options.capture_enabled);
 $('extensionStatus').textContent=c.extension_connected?'● Extensão ativa':'○ Extensão desconectada';
 $('extensionStatus').style.color=c.extension_connected?'var(--focus)':'var(--muted)';
 $('guardWarning').hidden=!(active&&c.options.guard_enabled&&!c.extension_connected);
 const provider=$('reviewProvider').value;
 $('aiConnection').textContent=provider==='local'?'Local':provider==='ollama'?'Ollama':c.key_configured?'OpenAI ativa':'Sem chave';
 $('analyzeCaptures').disabled=c.analysis_busy||provider==='local'||(provider==='openai'&&!c.key_configured);
 $('approveUpload').disabled=provider==='local';
 $('analysisStatus').textContent=provider==='local'?'':c.analysis_busy?'Analisando…':c.message;
 const signature=JSON.stringify(c.captures.map(x=>[x.id,x.status]));
 if(signature!==captureSignature){
  captureSignature=signature;
  const available=new Set(c.captures.filter(x=>x.available).map(x=>x.id));
  selectedCaptures=new Set([...selectedCaptures].filter(id=>available.has(id)));
  $('approveUpload').checked=false;
  $('captureCount').textContent=c.captures.filter(x=>x.available).length;
  $('captureGallery').replaceChildren();
  if(!c.captures.length)$('captureGallery').innerHTML='<p class="empty">Nenhuma captura. O registro de telas vem desligado.</p>';
  for(const capture of c.captures){
   const card=document.createElement('div');card.className='capture-card';
   const status={ready:'Local · disponível',analyzing:'Análise em andamento',analyzed:'Analisada · imagem apagada',deleted:'Imagem apagada',expired:'Imagem expirada'}[capture.status]||capture.status;
   const time=new Date(capture.created).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
   card.innerHTML=`<div class="capture-heading"><span>${esc(time)} · ${esc(capture.app)} · sessão ${capture.session_id}</span><small>${esc(status)}</small></div><p class="tiny muted">${esc(capture.title)}</p>`;
   if(capture.available){
    const preview=document.createElement('button');preview.className='capture-thumbnail';preview.title='Ampliar captura local';
    const image=document.createElement('img');image.src='/api/capture/'+capture.id;image.alt='Captura autorizada da janela';image.loading='lazy';preview.append(image);
    preview.onclick=()=>{$('capturePreviewImage').src=image.src;$('capturePreview').showModal();};card.append(preview);
    if(capture.status==='ready'){
     const controls=document.createElement('div');controls.className='capture-controls';
     const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=selectedCaptures.has(capture.id);
     check.onchange=()=>{if(check.checked){if(selectedCaptures.size>=4){check.checked=false;notify('Selecione no máximo quatro capturas.');return;}selectedCaptures.add(capture.id);}else selectedCaptures.delete(capture.id);updateSelection();};
     label.append(check,document.createTextNode('Usar nesta análise'));
     const remove=document.createElement('button');remove.textContent='Apagar imagem';remove.onclick=safe(async()=>{await api('capture_delete',{id:capture.id});selectedCaptures.delete(capture.id);updateSelection();await refresh();});
     controls.append(label,remove);card.append(controls);
    }
   }
   $('captureGallery').append(card);
  }
  $('selectionCount').textContent=selectedCaptures.size?`${selectedCaptures.size} captura(s) selecionada(s).`:'Selecione imagens na aba Relatório.';
 }
 const reviews=(c.analyses||[]).filter(r=>!report||r.created.startsWith(report.day));
 const nextReviewSignature=JSON.stringify(reviews.map(r=>r.id));
 if(nextReviewSignature!==reviewSignature){
  reviewSignature=nextReviewSignature;
  $('aiReviews').innerHTML=reviews.length?reviews.map(r=>{const a=r.review;const label={aligned:'Compatível com o objetivo',off_task:'Possível desvio de contexto',unclear:'Contexto insuficiente'}[a.alignment];return `<div class="ai-review"><span class="review-label ${a.alignment==='aligned'?'focus':a.alignment==='off_task'?'distraction':'neutral'}">${label}</span><h3>${esc(r.objective)}</h3><p>${esc(a.summary)}</p><ul>${a.evidence.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><h4>Para o próximo bloco</h4><ol>${a.suggestions.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><small class="muted tiny">${r.source_count} captura(s) · ${esc(new Date(r.created).toLocaleString('pt-BR'))} · revisão por IA, sujeita a erros</small></div>`;}).join(''):'<p class="empty">As revisões aparecerão aqui após uma análise autorizada.</p>';
 }
};
$('analyzeCaptures').onclick=safe(async()=>{
 if(!selectedCaptures.size)throw Error('Selecione de uma a quatro capturas na aba Relatório.');
 if(!$('approveUpload').checked)throw Error('Marque a autorização para o provedor escolhido antes de analisar.');
 await api('analyze_captures',{ids:[...selectedCaptures],consent:true,provider:$('reviewProvider').value,local_model:$('localModel').value});$('approveUpload').checked=false;await refresh();
});
window.contextPdfLines=()=>{const reviews=(state?.context?.analyses||[]).filter(r=>!report||r.created.startsWith(report.day));return reviews.flatMap(r=>[r.objective,r.review.summary,...r.review.evidence,...r.review.suggestions]);};
