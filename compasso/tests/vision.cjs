const assert=require('node:assert/strict');
const V=require('../web/vision.js');
const fixture=require('./fixtures.cjs');
const raw=(x,y)=>V.analyze(fixture(x,y),null,1).raw;
const samples={};for(const [name,x,y] of [['center',.5,0],['left',.2,0],['right',.8,0],['up',.5,-.2],['down',.5,.2]])samples[name]=Array.from({length:8},()=>raw(x,y));
const cal=V.calibrate(samples);
for(const [name,x,y] of [['center',.5,0],['left',.2,0],['right',.8,0],['up',.5,-.2],['down',.5,.2]]){
 const m=V.analyze(fixture(x,y),cal,1).metrics;
 assert.equal(m.gaze_direction,name);assert.equal(m.centered,true);
 assert.equal(m.posture,true);assert.ok(m.elbow_left>90);assert.ok(m.knee_left>170);
}
// Eye movement alone changes gaze while head angles remain equal.
assert.equal(V.analyze(fixture(.8,0),cal,1).metrics.head_yaw,V.analyze(fixture(.2,0),cal,1).metrics.head_yaw);
// Missing iris landmarks, closed eyes, and large head rotations produce unknown gaze.
let f=fixture();f.faceLandmarks=f.faceLandmarks.slice(0,468);
assert.equal(V.analyze(f,cal,1).metrics.gaze_direction,null);
f=fixture();for(const i of [159,145,386,374])f.faceLandmarks[i].y=.4;
assert.equal(V.analyze(f,cal,1).metrics.gaze_direction,null);
f=fixture();f.faceLandmarks[263].z=-.4*Math.tan(Math.PI/6);
assert.ok(V.analyze(f,cal,1).metrics.head_yaw>25);
assert.equal(V.analyze(f,cal,1).metrics.gaze_direction,null);
f=fixture();f.poseLandmarks[23].visibility=0;
assert.equal(V.analyze(f,cal,1).metrics.posture,null);
assert.notEqual(V.analyze(f,cal,1).metrics.shoulder_tilt,null);
// Body tracking continues without a face, and forward/side tilt is not called aligned.
f=fixture();delete f.faceLandmarks;
assert.equal(V.analyze(f,cal,1).metrics.posture,true);
f=fixture();f.poseLandmarks[11].x+=.2;f.poseLandmarks[12].x+=.2;
assert.equal(V.analyze(f,cal,1).metrics.posture,false);
assert.equal(V.analyze({},cal,1).metrics.gaze_direction,null);
assert.equal(V.analyze(fixture(),null,1).metrics.gaze_direction,null);
assert.throws(()=>V.calibrate({center:samples.center}),/amostras/);
assert.throws(()=>V.calibrate(Object.fromEntries(Object.keys(samples).map(k=>[k,samples.center]))),/inconsistentes/);
const unstable={...samples,center:Array.from({length:8},(_,i)=>({...samples.center[0],iris:{...samples.center[0].iris,x:i%2?.7:.3}}))};
assert.throws(()=>V.calibrate(unstable),/variou/);
const f0=fixture(),m0=V.analyze(f0,cal,1).metrics,vectors=V.hudVectors(f0.faceLandmarks,m0);
assert.equal(vectors.length,2);assert.deepEqual(vectors.map(v=>v.color),['#ff5e57','#ffdc4c']);
assert.ok(vectors[0].start.y>vectors[1].start.y);
for(const v of vectors)assert.ok(Math.hypot(v.start.x-v.end.x,v.start.y-v.end.y)>.05);
assert.equal(V.hudVectors(f0.faceLandmarks,V.analyze(f0,null,1).metrics).length,1);
const downVectors=V.hudVectors(fixture(.5,.2).faceLandmarks,V.analyze(fixture(.5,.2),cal,1).metrics);
assert.ok(downVectors[1].end.y>downVectors[1].start.y);
console.log('Vision checks passed: five gaze zones, independent head angles, joints, visibility, and invalid calibration. Synthetic landmarks only.');
