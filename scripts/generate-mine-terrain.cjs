const fs=require('node:fs');
let seed=1;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
const output={version:1,floors:{}};
for(const floor of [-3,-4,-5,-6]){
  seed=9143+Math.abs(floor)*353;const main=[[-29,-1],[-21,1],[-12,-1.4],[-3,1.4],[6,-.8],[15,1.3],[27,-1.2]];
  const paths=[main,[[-22,1],[-20,-5],[-25,-9],[-24,-16]],[[-6,0],[-8,-5],[-3,-10],[-1,-17]],[[11,0],[14,-5],[9,-10],[18,-16]],[[-5,0],[-9,6],[-4,13],[2,18]],[[19,0],[16,7],[21,12],[24,18]],[[-5,8],[8,6],[12.6,10],[16,7]]];
  const cells=[],rubble=[],ores=[],rails=[],supports=[];
  for(let x=-29.8;x<28;x+=1.25)for(let z=-17.8;z<20;z+=1.25){
    const open=paths.some((path,k)=>path.some((p,i)=>i>0&&distance(x,z,path[i-1],p)<(k===0?2.35:2.1)+rand()*.3));
    const plaza=x<-16&&z>3||x>-16&&x<9&&z>8&&z<15||Math.hypot(x+27,z-18)<4;
    const protectedSpot=[[-20,-3.8],[10,-3.8],[12.6,10],[-18.7,6.1]].some(p=>Math.hypot(x-p[0],z-p[1])<2.3);
    if(!open&&!plaza&&!protectedSpot){
      const h=1.7+rand()*2.6;cells.push([+(x+(rand()-.5)*.15).toFixed(2),+(z+(rand()-.5)*.15).toFixed(2),+(1.1+rand()*.2).toFixed(2),+(1.1+rand()*.2).toFixed(2),+h.toFixed(2),+(rand()-.5).toFixed(2),Math.floor(rand()*4)]);
      if(rand()<.22)ores.push([+x.toFixed(2),+(z+.67).toFixed(2),+(0.4+rand()*1.4).toFixed(2),rand()<.78?'coal':floor<=-5?'crystal':'copper']);
    }else if(rand()<.18&&Math.hypot(x+18.7,z-8.1)>3)rubble.push([+(x+(rand()-.5)*.6).toFixed(2),+(z+(rand()-.5)*.6).toFixed(2),+(.12+rand()*.3).toFixed(2),+rand().toFixed(2)]);
  }
  for(let i=1;i<main.length;i++){
    const a=main[i-1],b=main[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(d/.9);
    for(let j=0;j<n;j++){const t=j/n;rails.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[1]-a[1],b[0]-a[0])]);}
    supports.push([(a[0]+b[0])/2,(a[1]+b[1])/2,2.6+rand()*.55]);
  }
  output.floors[floor]={cells,rubble,ores,rails,supports};
}
fs.writeFileSync('electron/mine-terrain.json',JSON.stringify(output));console.log('Generated deterministic irregular mine terrain for B3–B6.');
