// Start an isolated server first: COMPASSO_PORT=8766, COMPASSO_DB=<test-only database>.
const {createRequire}=require('node:module');
const path=require('node:path');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const fixture=require('./fixtures.cjs');
const runtime=process.env.COMPASSO_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'../package.json'))('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.COMPASSO_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try{
  const page=await browser.newPage({viewport:{width:460,height:820},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.COMPASSO_TEST_URL||'http://127.0.0.1:8766');
  await page.waitForFunction(()=>document.querySelector('#window').textContent!=='Conectando ao monitor local…');
  if(await page.locator('#start').isDisabled())await page.locator('#finish').click();
  await page.locator('#start').click();
  await page.waitForFunction(()=>!document.querySelector('#pause').disabled);
  await page.waitForFunction(()=>/RASTREAMENTO|PROCURANDO/.test(document.querySelector('#cameraStatus').textContent),{timeout:30000});
  await page.evaluate(async()=>{cameraGeneration++;while(cameraBusy)await new Promise(resolve=>setTimeout(resolve,100));});
  await page.addScriptTag({content:'window.makeTestLandmarks='+fixture.toString()});
  const calibrated=await page.evaluate(async()=>{
   document.querySelector('#hud').width=640;document.querySelector('#hud').height=640;
   document.querySelector('#calibrate').click();
   for(const[x,y]of[[.5,0],[.2,0],[.8,0],[.5,-.2],[.5,.2]]){
    document.querySelector('#captureCalibration').click();calibrationRun.started=performance.now()-1000;
    for(let i=0;i<8;i++)onResults(window.makeTestLandmarks(x,y));
   }
   onResults(window.makeTestLandmarks(.8,0));
   await api('camera',CompassoVision.analyze(window.makeTestLandmarks(.8,0),calibrated,1).metrics);
   return {calibrated:!!calibrated,dialog:document.querySelector('#calibrationDialog').open,
    gaze:document.querySelector('#gaze').textContent,head:document.querySelector('#head').textContent};
  });
  assert.equal(calibrated.calibrated,true);assert.equal(calibrated.dialog,false);
  assert.match(calibrated.gaze,/Direita/);assert.match(calibrated.head,/Centralizada/);
  await page.waitForFunction(()=>state.report.gaze_coverage>0);
  await page.locator('#pause').click();
  await page.waitForFunction(()=>document.querySelector('#pause').textContent.includes('Retomar'));
  const paused=await page.locator('#timer').innerText();
  await page.waitForTimeout(1500);assert.equal(await page.locator('#timer').innerText(),paused);
  await page.locator('#pause').click();await page.locator('#finish').click();
  await page.locator('[data-tab=report]').click();
  await page.waitForSelector('#windowRows button');
  await page.locator('#windowRows button').first().click();
  await page.locator('#classifyValue').selectOption('study');await page.locator('#saveClassify').click();
  const download=page.waitForEvent('download');await page.locator('#pdf').click();
  assert.match((await download).suggestedFilename(),/\.pdf$/);
  const csvDownload=page.waitForEvent('download');await page.locator('#csv').click();
  const csv=await fs.readFile(await(await csvDownload).path(),'utf8');
  for(const column of ['window_title','moves','gaze_direction','head_yaw','trunk_lean','elbow_left','knee_left'])assert.ok(csv.includes(column));
  await page.locator('[data-tab=insights]').click();
  for(const tab of ['focus','report','insights']){
   await page.locator(`[data-tab=${tab}]`).click();
   for(const width of [360,460,780]){
    await page.setViewportSize({width,height:820});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
  }
  assert.equal(await page.evaluate(async()=>(await fetch('/api/start',{method:'POST',body:'{}'})).status),403);
  assert.deepEqual(errors,[]);console.log('Browser checks passed. Camera input was synthetic, not a physical webcam.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
