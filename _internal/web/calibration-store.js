/* Local, camera-specific calibration parameters only; never stores images or landmarks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CompassoCalibration=api;})(globalThis,function(){
 'use strict';
 const prefix='compasso.calibration.v1.';
 function key(settings,width,height,display={}){
  if(typeof settings?.deviceId!=='string'||!settings.deviceId||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
  const text=JSON.stringify([settings.deviceId,width,height,display.width||0,display.height||0,display.pixelRatio||1]);
  let hash=14695981039346656037n;for(const char of text){hash^=BigInt(char.codePointAt(0));hash=BigInt.asUintN(64,hash*1099511628211n);}
  return prefix+hash.toString(16);
 }
 function valid(value){
  if(!value||typeof value!=='object')return false;
  for(const name of ['center','left','right','up','down']){const p=value[name];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<-.1||p.x>1.1||Math.abs(p.y)>.65)return false;}
  if(!value.head||!['yaw','pitch','roll'].every(k=>Number.isFinite(value.head[k])&&Math.abs(value.head[k])<=180))return false;
  return [['x','left','right',.012],['y','up','down',.008]].every(([axis,a,b,min])=>{const x=value[a][axis]-value.center[axis],y=value[b][axis]-value.center[axis];return Math.abs(x)>=min&&Math.abs(y)>=min&&x*y<0;});
 }
 function clean(value){const result={};for(const name of ['center','left','right','up','down'])result[name]={x:value[name].x,y:value[name].y};result.head={yaw:value.head.yaw,pitch:value.head.pitch,roll:value.head.roll};return result;}
 function load(storage,id){try{if(!id)return null;const entry=JSON.parse(storage.getItem(id)||'null');return entry?.version===1&&valid(entry.calibration)?clean(entry.calibration):null;}catch{return null;}}
 function save(storage,id,value){try{if(!id||!valid(value))return false;storage.setItem(id,JSON.stringify({version:1,calibration:clean(value),savedAt:new Date().toISOString()}));return true;}catch{return false;}}
 function forget(storage,id){try{if(!id)return false;storage.removeItem(id);return true;}catch{return false;}}
 return {key,valid,load,save,forget};
});
