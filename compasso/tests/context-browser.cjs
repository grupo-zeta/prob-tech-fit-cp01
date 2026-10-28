// Uses a test database and a logo image; intercepts AI submission so no API call is made.
const {createRequire}=require('node:module'),path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const runtime=process.env.COMPASSO_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'../package.json'))('playwright');
(async()=>{
 const dbPath=process.env.COMPASSO_TEST_DB;if(!dbPath||!dbPath.includes('work'))throw Error('Set COMPASSO_TEST_DB to a dedicated database under work/.');
 const base=process.env.COMPASSO_TEST_URL||'http://127.0.0.1:8766';
 const browser=await chromium.launch({executablePath:process.env.COMPASSO_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:510,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>state?.context);
  if(await page.locator('#start').isDisabled())await page.locator('#finish').click();
  await page.locator('#cameraAuto').uncheck();
  assert.equal(await page.locator('#captureEnabled').isChecked(),false);assert.equal(await page.locator('#aiAuto').isChecked(),false);
  await page.locator('.context-options summary').click();await page.locator('#objective').fill('Review a synthetic study screen');
  await page.locator('#captureEnabled').check();await page.locator('#captureInterval').selectOption('120');
  await page.locator('#start').click();await page.waitForFunction(()=>state.active!==null);
  assert.equal(await page.locator('#captureNow').isDisabled(),false);
  await page.locator('#pause').click();await page.waitForFunction(()=>state.paused);
  assert.equal(await page.locator('#captureNow').isDisabled(),true);
  await page.locator('#pause').click();await page.locator('#stopCaptures').click();await page.waitForFunction(()=>!state.context.options.capture_enabled);
  const sessionId=await page.evaluate(()=>state.active.id);await page.locator('#finish').click();await page.waitForFunction(()=>state.active===null);
  assert.equal(await page.locator('#captureEnabled').isChecked(),false);assert.equal(await page.locator('#aiAuto').isChecked(),false);
  const id=crypto.randomBytes(16).toString('hex'),filename=id+'.png',images=path.join(path.dirname(dbPath),'captures');await fs.mkdir(images,{recursive:true});
  await fs.copyFile(path.join(__dirname,'../web/brand.png'),path.join(images,filename));
  const db=new DatabaseSync(dbPath);db.prepare('INSERT INTO captures VALUES(?,?,?,?,?,?,?,NULL)').run(id,sessionId,new Date().toISOString(),'Compasso test','Synthetic logo screen',filename,'ready');db.close();
  await page.locator('[data-tab=report]').click();await page.locator('.capture-gallery summary').click();await page.waitForSelector('#captureGallery input');
  await page.locator('#captureGallery input').check();await page.locator('[data-tab=insights]').click();
  await page.locator('#reviewProvider').selectOption('openai');
  let requests=0;await page.route('**/api/analyze_captures',route=>{requests++;return route.fulfill({contentType:'application/json',body:'{"ok":true}'});});
  await page.locator('#analyzeCaptures').click();assert.equal(requests,0);
  await page.locator('#approveUpload').check();await page.locator('#analyzeCaptures').click();await page.waitForFunction(()=>!document.querySelector('#approveUpload').checked);assert.equal(requests,1);
  await page.locator('[data-tab=report]').click();await page.locator('#captureGallery button').filter({hasText:'Apagar imagem'}).click();
  await page.waitForFunction(()=>state.context.captures.every(c=>c.status!=='ready'));assert.equal(await fs.access(path.join(images,filename)).then(()=>true,()=>false),false);
  assert.deepEqual(errors,[]);console.log('Context UI checks passed: defaults, per-session consent, pause, stop, gallery selection, explicit upload and deletion. No external AI call.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
