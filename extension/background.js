importScripts('policy.js');
let policy={enabled:false,domains:[],mode:'blocklist'},lastSuccess=0,syncing=false,timer=null;
async function apply(next){
 const previous=await chrome.declarativeNetRequest.getSessionRules();
 await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:previous.map(r=>r.id),addRules:CompassoPolicy.rules(next,chrome.runtime.getURL('blocked.html'))});
 policy=next;
 await chrome.storage.session.set({policy,lastSuccess});
 for(const tab of await chrome.tabs.query({})){if(tab.id&&/^https?:/.test(tab.url||''))chrome.tabs.sendMessage(tab.id,{type:'compasso-policy',policy}).catch(()=>{});}
 await chrome.action.setBadgeText({text:policy.enabled?'FOCO':''});
 await chrome.action.setBadgeBackgroundColor({color:'#00bdd4'});
}
async function sync(){
 if(syncing)return;syncing=true;
 try{
  const settings=await chrome.storage.local.get({port:8765});const port=Number(settings.port);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Porta inválida');
  const response=await fetch(`http://127.0.0.1:${port}/api/extension/policy`,{cache:'no-store',headers:{'X-Compasso-Extension':chrome.runtime.id},signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw Error('Servidor indisponível');
  const next=await response.json();
  if(!['allowlist','blocklist'].includes(next.mode)||!Array.isArray(next.domains))throw Error('Política inválida');
  lastSuccess=Date.now();await apply(next);
 }catch{lastSuccess=0;await apply({enabled:false,domains:[],mode:'blocklist'});}
 finally{syncing=false;clearTimeout(timer);timer=setTimeout(sync,5000);}
}
chrome.runtime.onInstalled.addListener(()=>{chrome.alarms.create('compasso-sync',{periodInMinutes:.5});sync();});
chrome.runtime.onStartup.addListener(()=>sync());
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='compasso-sync')sync();});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type==='compasso-policy'){reply({policy,lastSuccess});return;}
 if(message?.type==='compasso-sync'&&!sender.tab){sync().then(()=>reply({policy,lastSuccess}));return true;}
});
// Session-scoped network rules and overlays are removed when the local app is unavailable.
sync();
