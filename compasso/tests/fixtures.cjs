// Synthetic landmark geometry for deterministic unit/UI tests; not human observations.
module.exports=function fixture(x=.5,y=0){
 const face=Array.from({length:478},()=>({x:.5,y:.4,z:0}));
 const put=(i,x,y,z=0)=>face[i]={x,y,z};
 put(33,.3,.4);put(133,.4,.4);put(362,.6,.4);put(263,.7,.4);
 put(159,.35,.382);put(145,.35,.418);put(386,.65,.382);put(374,.65,.418);
 put(468,.3+x*.1,.4+y*.1);put(473,.6+x*.1,.4+y*.1);
 put(10,.5,.2);put(152,.5,.8);put(1,.5,.5);
 const pose=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:0}));
 for(const[i,x,y]of[[11,.3,.3],[12,.7,.3],[13,.2,.45],[14,.8,.45],[15,.2,.6],[16,.8,.6],[23,.35,.6],[24,.65,.6],[25,.35,.8],[26,.65,.8],[27,.35,.95],[28,.65,.95]])pose[i]={x,y,z:0,visibility:1};
 return {faceLandmarks:face,poseLandmarks:pose};
};
