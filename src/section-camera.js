import * as THREE from 'three';
import {FLOOR_IDS,floorElevation} from './floors.js';

// Fit the complete underground section into the space above the command dock.
// This changes only the camera: all floors retain their original coordinates.
export function fitSectionCamera(camera,controls,container){
  const width=container.clientWidth||1,height=container.clientHeight||1,rect=container.getBoundingClientRect();
  const dock=document.querySelector('.command-card'),switcher=document.querySelector('.floor-switch');
  const top=Math.max(170,(switcher?.getBoundingClientRect().bottom||150)-rect.top+16),bottom=Math.max(top+180,(dock?.getBoundingClientRect().top||height-185)-rect.top-18);
  const usableHeight=Math.max(180,bottom-top),usableWidth=Math.max(240,width-240),center=new THREE.Vector3(-1,(-37+floorElevation(Math.max(...FLOOR_IDS))+4)/2,4),out=new THREE.Vector3(1,.38,1.3).normalize();
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),out).normalize(),up=new THREE.Vector3().crossVectors(out,right).normalize();
  const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),tanH=tanV*camera.aspect,corners=[];let distance=0;
  for(const x of [-32,34])for(const y of [-37,floorElevation(Math.max(...FLOOR_IDS))+4])for(const z of [-20,28]){
    const point=new THREE.Vector3(x,y,z),delta=point.clone().sub(center),depth=delta.dot(out);corners.push(point);
    distance=Math.max(distance,depth+Math.abs(delta.dot(right))/(tanH*usableWidth/width*.92),depth+Math.abs(delta.dot(up))/(tanV*usableHeight/height*.92));
  }
  distance*=.86;
  camera.clearViewOffset();controls.target.copy(center);camera.position.copy(center).addScaledVector(out,distance);controls.update();camera.updateMatrixWorld(true);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const point of corners){point.project(camera);const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  camera.setViewOffset(width,height,(minX+maxX)/2-width/2,(minY+maxY)/2-(top+bottom)/2,width,height);
}
