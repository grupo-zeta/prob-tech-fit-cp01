async function refresh(){const {port}=await chrome.storage.local.get({port:8765});document.querySelector('#port').value=port;const r=await chrome.runtime.sendMessage({type:'compasso-sync'});const online=Date.now()-(r.lastSuccess||0)<20000;document.querySelector('#status').textContent=!online?'Compasso desconectado. Sites liberados.':r.policy.enabled?'Foco protegido. A lista da sessão está ativa.':'Conectado. Nenhuma restrição ativa.';}
document.querySelector('#sync').onclick=refresh;
document.querySelector('#port').onchange=async event=>{const port=Number(event.target.value);if(Number.isInteger(port)&&port>=1024&&port<=65535){await chrome.storage.local.set({port});refresh();}};
refresh();
