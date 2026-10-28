/* Geometric estimates on MediaPipe landmarks; no claim of clinical accuracy. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CompassoVision=api;})(globalThis,function(){
 'use strict';
 const rad=180/Math.PI;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z??0);
 const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)});
 const dot=(a,b)=>a.x*b.x+a.y*b.y+(a.z||0)*(b.z||0);
 const length=a=>Math.hypot(a.x,a.y,a.z||0);
 const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:((a.z||0)+(b.z||0))/2});
 const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const delta=(a,b)=>((a-b+540)%360)-180;
 const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
 const POSE_CONNECTIONS=[[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32],[27,31],[28,32]];

 function head(face,aspect){
  if(![33,263,10,152].every(i=>finite(face?.[i])))return null;
  const point=i=>({x:face[i].x,y:face[i].y*aspect,z:face[i].z||0});
  const horizontal=sub(point(263),point(33)),vertical=sub(point(152),point(10));
  if(length(horizontal)<.035||length(vertical)<.06)return null;
  const normal=cross(horizontal,vertical);
  if(length(normal)<.0001||normal.z<=0)return null;
  return {yaw:Math.atan2(normal.x,normal.z)*rad,pitch:Math.atan2(-normal.y,Math.hypot(normal.x,normal.z))*rad,
   roll:Math.atan2(horizontal.y,horizontal.x)*rad};
 }
 function eye(face,a,b,top,bottom,iris,aspect){
  if(![a,b,top,bottom,iris].every(i=>finite(face?.[i])))return null;
  const p=i=>({x:face[i].x,y:face[i].y*aspect,z:0});
  const axis=sub(p(b),p(a)),size=length(axis);
  if(size<.008)return null;
  const relative=sub(p(iris),p(a));
  const x=dot(relative,axis)/(size*size);
  const y=(relative.y*axis.x-relative.x*axis.y)/(size*size);
  const open=length(sub(p(top),p(bottom)))/size;
  if(x<-.1||x>1.1||Math.abs(y)>.65)return null;
  return {x,y,open};
 }
 function iris(face,aspect){
  const right=eye(face,33,133,159,145,468,aspect),left=eye(face,362,263,386,374,473,aspect);
  if(!right||!left)return null;
  const open=right.open>.16&&left.open>.16;
  const consistent=Math.abs(right.x-left.x)<.3&&Math.abs(right.y-left.y)<.25;
  return {x:(right.x+left.x)/2,y:(right.y+left.y)/2,open,consistent};
 }
 function angle(a,b,c){const u=sub(a,b),v=sub(c,b),denom=length(u)*length(v);return denom>1e-6?Math.acos(clamp(dot(u,v)/denom,-1,1))*rad:null;}
 function pose(landmarks,world,aspect){
  const visible=i=>finite(landmarks?.[i])&&(landmarks[i].visibility??0)>=.55;
  const point=i=>world&&finite(world[i])?world[i]:{x:landmarks[i].x,y:landmarks[i].y*aspect,z:0};
  const projected=i=>({x:landmarks[i].x,y:landmarks[i].y*aspect});
  const visiblePoints=Array.isArray(landmarks)?landmarks.filter((_,i)=>visible(i)).length:0;
  const metrics={pose_points:visiblePoints,shoulder_tilt:null,trunk_lean:null,hip_tilt:null,
   elbow_left:null,elbow_right:null,knee_left:null,knee_right:null,posture:null};
  for(const [name,a,b,c] of [['elbow_left',11,13,15],['elbow_right',12,14,16],['knee_left',23,25,27],['knee_right',24,26,28]]){
   if([a,b,c].every(visible))metrics[name]=angle(point(a),point(b),point(c));
  }
  const tilt=(a,b)=>{const d=sub(projected(b),projected(a));return Math.atan2(d.y,Math.abs(d.x))*rad;};
  if([11,12].every(visible))metrics.shoulder_tilt=tilt(11,12);
  if([23,24].every(visible))metrics.hip_tilt=tilt(23,24);
  if([11,12,23,24].every(visible)){
   const shoulders=midpoint(projected(11),projected(12)),hips=midpoint(projected(23),projected(24));
   const torso=sub(hips,shoulders);
   if(torso.y>.025){metrics.trunk_lean=Math.atan2(torso.x,torso.y)*rad;
    metrics.posture=Math.abs(metrics.shoulder_tilt)<12&&Math.abs(metrics.trunk_lean)<15&&Math.abs(metrics.hip_tilt)<15;}
  }
  return metrics;
 }
 function calibrate(samples){
  const names=['center','left','right','up','down'];
  const result={};
  for(const name of names){
   const rows=samples[name];
   if(!rows||rows.length<8)throw Error('Mantenha o rosto visível e capture pelo menos 8 amostras por ponto.');
   result[name]={x:median(rows.map(r=>r.iris.x)),y:median(rows.map(r=>r.iris.y))};
   if(median(rows.map(r=>Math.abs(r.iris.x-result[name].x)))>.08||median(rows.map(r=>Math.abs(r.iris.y-result[name].y)))>.06)
    throw Error('O olhar variou muito durante a captura. Repita mantendo os olhos no alvo.');
   if(name==='center')result.head={yaw:median(rows.map(r=>r.head.yaw)),pitch:median(rows.map(r=>r.head.pitch)),roll:median(rows.map(r=>r.head.roll))};
  }
  for(const [axis,negative,positive,min] of [['x','left','right',.025],['y','up','down',.015]]){
   const c=result.center[axis],a=result[negative][axis]-c,b=result[positive][axis]-c;
   if(Math.abs(a)<min||Math.abs(b)<min||a*b>=0)throw Error('Os pontos do olhar ficaram próximos ou inconsistentes. Repita olhando para cada alvo sem girar a cabeça.');
  }
  return result;
 }
 function normalizeAxis(v,center,negative,positive){const d=v-center;return clamp(d*(positive-center)>=0?d/(positive-center):-d/(negative-center),-2,2);}
 function analyze(results,calibration=null,aspect=9/16){
  const face=results.faceLandmarks,headPose=head(face,aspect),eyes=iris(face,aspect);
  const body=pose(results.poseLandmarks,results.poseWorldLandmarks,aspect);
  const out={face:!!face?.length,centered:null,gaze_direction:null,gaze_x:null,gaze_y:null,
   head_yaw:null,head_pitch:null,head_roll:null,...body};
  const raw={head:headPose,iris:eyes};
  if(headPose){
   const base=calibration?.head||{yaw:0,pitch:0,roll:0};
   out.head_yaw=delta(headPose.yaw,base.yaw);out.head_pitch=delta(headPose.pitch,base.pitch);out.head_roll=delta(headPose.roll,base.roll);
   out.centered=Math.abs(out.head_yaw)<15&&Math.abs(out.head_pitch)<15&&Math.abs(out.head_roll)<12;
   if(calibration&&eyes?.open&&eyes.consistent&&Math.abs(out.head_yaw)<25&&Math.abs(out.head_pitch)<25&&Math.abs(out.head_roll)<20){
    out.gaze_x=normalizeAxis(eyes.x,calibration.center.x,calibration.left.x,calibration.right.x);
    out.gaze_y=normalizeAxis(eyes.y,calibration.center.y,calibration.up.y,calibration.down.y);
    out.gaze_direction=Math.abs(out.gaze_x)<=.5&&Math.abs(out.gaze_y)<=.5?'center':
     Math.abs(out.gaze_x)>Math.abs(out.gaze_y)?(out.gaze_x<0?'left':'right'):(out.gaze_y<0?'up':'down');
   }
  }
  return {metrics:out,raw};
 }
 function hudVectors(face,metrics){
  const vectors=[];
  if(finite(face?.[1])&&metrics.head_yaw!==null){const start=face[1];let x=-Math.sin(metrics.head_yaw/rad)*.2,y=Math.sin(metrics.head_pitch/rad)*.2;
   if(Math.hypot(x,y)<.025)y=-.075;
   vectors.push({kind:'head',color:'#ff5e57',start,end:{x:start.x+x,y:start.y+y}});}
  if(metrics.gaze_direction&&finite(face?.[468])&&finite(face?.[473])){const start=midpoint(face[468],face[473]);let x=-metrics.gaze_x*.12,y=metrics.gaze_y*.12;
   if(Math.hypot(x,y)<.025)y=-.09;
   vectors.push({kind:'gaze',color:'#ffdc4c',start,end:{x:start.x+x,y:start.y+y}});}
  return vectors;
 }
 return {analyze,calibrate,hudVectors,POSE_CONNECTIONS};
});
