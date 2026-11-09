import * as THREE from 'three';

// One shared, faceted bevel for props and characters. Terrain and tiny trim
// stay on the twelve-triangle cube; both shapes can still be instanced.
export function createDetailGeometry(){
  const cube=new THREE.BoxGeometry(1,1,1);
  const carved=new THREE.BufferGeometry(),vertices=[];
  function face(points){
    const [a,b,c]=points.map(p=>new THREE.Vector3(...p));
    if(new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).dot(a)<0)points.reverse();
    for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);
  }
  const inset=.435;
  // Six inset faces, twelve sloping edges, and eight clipped corners.
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3;
    face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const p=[];p[axis]=sign*.5;p[u]=a*inset;p[v]=b*inset;return p;}));
  }
  for(let axis=0;axis<3;axis++)for(const a of [-1,1])for(const b of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3;
    face([[-inset,.5,inset],[inset,.5,inset],[inset,inset,.5],[-inset,inset,.5]].map(([x,y,z])=>{const p=[];p[axis]=x;p[u]=a*y;p[v]=b*z;return p;}));
  }
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])face([[x*.5,y*inset,z*inset],[x*inset,y*.5,z*inset],[x*inset,y*inset,z*.5]]);
  carved.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  carved.computeVertexNormals();
  return {cube,carved,forBox(w,h,d){
    const smallest=Math.min(w,h,d),largest=Math.max(w,h,d);
    return smallest>=.09&&largest<=4.5&&largest/smallest<24?carved:cube;
  },dispose(){cube.dispose();carved.dispose();}};
}
