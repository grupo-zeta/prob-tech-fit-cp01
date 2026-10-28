const {createRequire}=require('node:module'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=process.env.COMPASSO_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'../package.json'))('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.COMPASSO_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:510,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.COMPASSO_TEST_URL||'http://127.0.0.1:8766';await page.goto(base);await page.waitForFunction(()=>state?.version==='4.1.0');
  if(await page.locator('#start').isDisabled())await page.locator('#finish').click();
  assert.ok(await page.locator('#project option').count()>=7);assert.equal(await page.locator('#analysisProvider').inputValue(),'local');
  await page.locator('#project').selectOption({label:'Programação · prática guiada'});assert.equal(await page.locator('#goal').inputValue(),'50');
  assert.ok((await page.locator('#presetSource').getAttribute('href')).includes('pubmed.ncbi.nlm.nih.gov'));
  await page.locator('#cameraAuto').uncheck();await page.locator('#goal').selectOption('custom');await page.locator('#customGoal').fill('75');
  await page.locator('#start').click();await page.waitForFunction(()=>state?.active?.goal===75);await page.locator('#finish').click();await page.waitForFunction(()=>state.active===null);
  await page.goto(base+'/?startup=1');await page.waitForSelector('#startupDialog[open]');
  await page.locator('#startupProject').selectOption({label:'Acompanhamento contínuo · 24h'});assert.equal(await page.locator('#startupDuration').inputValue(),'continuous');
  await page.locator('#startupCamera').uncheck();await page.locator('#startupBegin').click();await page.waitForFunction(()=>state?.active?.goal===0);
  assert.ok((await page.locator('#goalLabel').innerText()).includes('contínuo'));assert.equal(await page.locator('#startupDialog').isVisible(),false);
  await page.locator('#finish').click();await page.waitForFunction(()=>state.active===null);
  await page.locator('.context-options summary').click();await page.locator('#startupPromptEnabled').uncheck();
  await page.goto(base+'/?startup=1');await page.waitForFunction(()=>state!==null);assert.equal(await page.locator('#startupDialog').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('Profiles/startup checks passed: presets, references, custom duration, continuous mode and optional startup popup. No physical camera used.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
