// Isolated browser profile. Never installs into the user's normal browser profile.
const {createRequire}=require('node:module');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=process.env.COMPASSO_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'../package.json'))('playwright');
(async()=>{
 const work=process.env.COMPASSO_TEST_WORK||path.join(__dirname,'..','work');await fs.mkdir(work,{recursive:true});
 const profile=await fs.mkdtemp(path.join(work,'extension-test-'));
 const extension=path.resolve(__dirname,'../extension'),base=process.env.COMPASSO_TEST_URL||'http://127.0.0.1:8766';
 const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.COMPASSO_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 let headers;
 try{
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
  const state=await(await context.request.get(base+'/api/state')).json();headers={'X-Compasso-Token':state.token};
  const post=async(action,data={})=>{const r=await context.request.post(base+'/api/'+action,{headers,data});assert.ok(r.ok(),await r.text());};
  if(state.active)await post('finish');
  await worker.evaluate(async port=>{await chrome.storage.local.set({port});while(syncing)await new Promise(r=>setTimeout(r,50));await sync();},Number(new URL(base).port));
  assert.equal(await worker.evaluate(()=>Date.now()-lastSuccess<10000),true);
  for(const domain of ['example.com','example.org'])await context.route(`https://${domain}/**`,r=>r.fulfill({contentType:'text/html',body:'<html><title>Compasso synthetic test</title><input id="draft" value="preserve this draft"><h1>Test page</h1></html>'}));
  const existing=await context.newPage();await existing.goto('https://example.com/');
  await post('start',{guard_enabled:true,domains:['example.com'],guard_mode:'blocklist'});
  await worker.evaluate(async()=>{while(syncing)await new Promise(r=>setTimeout(r,50));await sync();});
  await existing.waitForSelector('[data-compasso-focus]');
  assert.equal(await existing.locator('#draft').inputValue(),'preserve this draft');
  const blocked=await context.newPage();await blocked.goto('https://example.com/').catch(()=>{});assert.ok(blocked.url().includes('blocked.html'));
  const allowed=await context.newPage();await allowed.goto('https://example.org/');assert.equal(await allowed.locator('h1').innerText(),'Test page');
  await post('pause');await worker.evaluate(async()=>{while(syncing)await new Promise(r=>setTimeout(r,50));await sync();});
  await existing.waitForSelector('[data-compasso-focus]',{state:'detached'});assert.equal(await existing.locator('#draft').inputValue(),'preserve this draft');
  assert.deepEqual(await worker.evaluate(async()=>await chrome.declarativeNetRequest.getSessionRules()),[]);
  await post('finish');await post('start',{guard_enabled:true,domains:['example.org'],guard_mode:'allowlist'});
  await worker.evaluate(async()=>{while(syncing)await new Promise(r=>setTimeout(r,50));await sync();});
  const denied=await context.newPage();await denied.goto('https://example.com/').catch(()=>{});assert.ok(denied.url().includes('blocked.html'));
  await allowed.reload();assert.equal(await allowed.locator('h1').innerText(),'Test page');
  await worker.evaluate(async()=>{await chrome.storage.local.set({port:65534});while(syncing)await new Promise(r=>setTimeout(r,50));await sync();});
  assert.deepEqual(await worker.evaluate(async()=>await chrome.declarativeNetRequest.getSessionRules()),[]);
  await post('finish');console.log('Real extension checks passed: network redirect, existing-page overlay, preserved draft, allowlist, pause and disconnect.');
 }finally{
  if(headers)await context.request.post(base+'/api/finish',{headers,data:{}}).catch(()=>{});
  await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
