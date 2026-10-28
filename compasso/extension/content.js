(()=>{
 let overlay=null,lastPolicy={enabled:false},lastReply=0;
 function pauseBlockedMedia(){if(CompassoPolicy.blocked(location.href,lastPolicy))for(const media of document.querySelectorAll('video,audio'))if(!media.paused)media.pause();}
 function clear(){if(overlay){overlay.remove();overlay=null;}}
 function render(policy){
  lastPolicy=policy;
  if(!CompassoPolicy.blocked(location.href,policy)){clear();return;}
  if(overlay?.isConnected)return;
  overlay=document.createElement('div');overlay.setAttribute('data-compasso-focus','');
  overlay.style.cssText='all:initial;position:fixed;inset:0;z-index:2147483647;display:block;';
  const shadow=overlay.attachShadow({mode:'closed'});
  shadow.innerHTML='<style>:host{color-scheme:dark}*{box-sizing:border-box}.wall{position:fixed;inset:0;background:rgba(13,11,23,.98);color:#f3effb;display:grid;place-items:center;font:16px Segoe UI,sans-serif;text-align:center;padding:28px}.card{max-width:480px}.mark{font-size:56px;color:#ff9c60}h1{font-size:30px;letter-spacing:-1px}p{color:#b4a9cb;line-height:1.6}a{display:inline-block;background:#00ccdf;color:#071c25;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700}.small{font-size:12px;margin-top:24px}</style><div class="wall"><div class="card"><div class="mark">◔</div><h1>Volte ao seu compasso.</h1><p>Esta página está fora da lista definida para o bloco atual. Seu conteúdo continua aberto por trás desta proteção.</p><a href="http://127.0.0.1:8765/" target="_blank" rel="noopener">Abrir Compasso</a><p class="small">Pause ou conclua a sessão no Compasso para liberar. Não bloqueia atalhos do navegador ou outros aplicativos.</p></div></div>';
  (document.documentElement||document).append(overlay);
  pauseBlockedMedia();
 }
 document.addEventListener('play',pauseBlockedMedia,true);
 chrome.runtime.onMessage.addListener(message=>{if(message?.type==='compasso-policy'){lastReply=Date.now();render(message.policy);}});
 function poll(){try{chrome.runtime.sendMessage({type:'compasso-policy'},response=>{if(chrome.runtime.lastError){clear();return;}if(response?.policy){lastReply=Date.now();const fresh=Date.now()-(response.lastSuccess||0)<20000;render(fresh?response.policy:{enabled:false});}});}catch{clear();}}
 if(document.documentElement)poll();else addEventListener('DOMContentLoaded',poll,{once:true});
 setInterval(()=>{if(Date.now()-lastReply>20000)clear();poll();},5000);
})();
