import * as THREE from 'three';
import {FLOOR_IDS,floorElevation} from './floors.js';
import {FLOOR_LIGHTS,STREET_LIGHTS,EXTERIOR_ACCENT_LIGHTS,LIGHTING_PRESETS,LIGHTS_PER_FLOOR} from './lighting-layout.js';

export function createOfficeLighting({scene,renderer,invalidate}){
  let preset='day',sunScale=1,lampScale=1,environment='inside',floor='1';
  try{const saved=JSON.parse(localStorage.getItem('pixelOffice.lighting')||'null');if(saved&&Object.hasOwn(LIGHTING_PRESETS,saved.preset)){preset=saved.preset;sunScale=THREE.MathUtils.clamp(Number(saved.sun)||1,.4,1.5);lampScale=THREE.MathUtils.clamp(Number(saved.lamps)||1,.5,1.5);}}catch{}
  const sun=new THREE.DirectionalLight(),sky=new THREE.HemisphereLight();sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.045;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun,sun.target,sky);
  const positions=FLOOR_IDS.flatMap(f=>Array.from({length:LIGHTS_PER_FLOOR},(_,i)=>{const p=FLOOR_LIGHTS[f][i];return new THREE.Vector4(p?.x||0,p?.y||0,p?.z||0,p?.radius||0);}));
  const outdoorLamps=[...STREET_LIGHTS,...EXTERIOR_ACCENT_LIGHTS];
  const uniforms={uOfficeLamps:{value:positions},uOfficeStreetLamps:{value:outdoorLamps.map(p=>new THREE.Vector4(p.x,p.y,p.z,p.radius))},uOfficeLampPower:{value:1},uOfficeDaylight:{value:1},uOfficeOutside:{value:0},uOfficeSectionFill:{value:0},uOfficeSunDirection:{value:new THREE.Vector3()},uOfficeSunTint:{value:new THREE.Color()},uOfficeSkyTint:{value:new THREE.Color()}};
  // One background draw, no fullscreen postprocessing chain or additional shadows.
  const skyGeometry=new THREE.PlaneGeometry(2,2),skyMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{...uniforms,uSkyInverseProjection:{value:new THREE.Matrix4()},uSkyCameraWorld:{value:new THREE.Matrix4()},uSkyHorizon:{value:new THREE.Color()}},vertexShader:`varying vec2 vSkyNdc;void main(){vSkyNdc=position.xy;gl_Position=vec4(position.xy,1.0,1.0);}`,fragmentShader:`
    varying vec2 vSkyNdc;uniform mat4 uSkyInverseProjection;uniform mat4 uSkyCameraWorld;uniform vec3 uOfficeSunDirection;uniform vec3 uOfficeSunTint;uniform vec3 uOfficeSkyTint;uniform vec3 uSkyHorizon;uniform float uOfficeDaylight;
    void main(){vec4 view=uSkyInverseProjection*vec4(vSkyNdc,1.0,1.0);vec3 ray=normalize((uSkyCameraWorld*vec4(view.xyz/view.w,0.0)).xyz);float altitude=clamp(ray.y,0.0,1.0);vec3 color=mix(uSkyHorizon,uOfficeSkyTint,pow(altitude,.55));float alignment=max(dot(ray,uOfficeSunDirection),0.0);color+=uOfficeSunTint*pow(alignment,12.0)*.13*uOfficeDaylight;color+=uOfficeSunTint*smoothstep(.99965,.9999,alignment)*1.5;gl_FragColor=vec4(color,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const skyMesh=new THREE.Mesh(skyGeometry,skyMaterial);skyMesh.frustumCulled=false;skyMesh.renderOrder=-1000;skyMesh.visible=false;scene.add(skyMesh);
  const haloGeometry=new THREE.PlaneGeometry(1,1),halos=[];
  function haloGroup(root,lamps,color){
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uHaloColor:{value:new THREE.Color(color)},uOfficeLampPower:uniforms.uOfficeLampPower},vertexShader:`varying vec2 vHaloUv;void main(){vHaloUv=uv;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);center.xy+=position.xy*1.6;gl_Position=projectionMatrix*center;}`,fragmentShader:`varying vec2 vHaloUv;uniform vec3 uHaloColor;uniform float uOfficeLampPower;void main(){float r=length(vHaloUv-.5);float glow=exp(-r*r*24.0)*(1.0-smoothstep(.25,.5,r));if(glow<.005)discard;gl_FragColor=vec4(uHaloColor*uOfficeLampPower,glow*.16);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
    const mesh=new THREE.InstancedMesh(haloGeometry,material,lamps.length),matrix=new THREE.Matrix4();lamps.forEach((p,i)=>mesh.setMatrixAt(i,matrix.makeTranslation(p.x,p.y-.06,p.z)));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);halos.push({mesh,material});
  }
  function installFixtures({roots,box,batchStatic}){
    for(const f of FLOOR_IDS){const group=new THREE.Group();roots[f].add(group);for(const p of FLOOR_LIGHTS[f])if(!p.existing){box(group,p.x,p.y+.12,p.z,2,.16,.42,'#65766f');box(group,p.x,p.y,p.z,1.8,.08,.3,'#f5dfac','lamp');}batchStatic(group);haloGroup(group,FLOOR_LIGHTS[f],f<=-3?'#ffca83':'#f4e4b9');}
  }
  const streetHaloRoot=new THREE.Group();scene.add(streetHaloRoot);streetHaloRoot.visible=false;haloGroup(streetHaloRoot,outdoorLamps,'#ffdb9e');
  function apply(){
    const p=LIGHTING_PRESETS[preset];uniforms.uOfficeDaylight.value=p.daylight*sunScale;uniforms.uOfficeLampPower.value=p.lamps*lampScale;uniforms.uOfficeOutside.value=environment==='outside'?1:0;uniforms.uOfficeSectionFill.value=environment==='inside'&&floor==='all'?1:0;
    uniforms.uOfficeSunDirection.value.set(...p.direction).normalize();uniforms.uOfficeSunTint.value.set(p.sun);uniforms.uOfficeSkyTint.value.set(p.sky);skyMaterial.uniforms.uSkyHorizon.value.set(p.horizon);
    sun.color.set(p.sun);sun.intensity=p.sunPower*sunScale;sky.color.set(p.sky);sky.groundColor.set(p.ground);sky.intensity=p.skyPower;renderer.toneMappingExposure=p.exposure;
    const targetY=environment==='outside'?0:floor==='all'?-12:floorElevation(floor),span=environment==='outside'?100:floor==='all'?70:44;
    sun.target.position.set(0,targetY,0);sun.position.copy(sun.target.position).addScaledVector(uniforms.uOfficeSunDirection.value,environment==='outside'?125:90);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:environment==='outside'?280:200});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
    skyMesh.visible=streetHaloRoot.visible=environment==='outside';document.querySelector('.game-world')?.classList.toggle('lighting-night',preset==='night'&&environment==='outside');invalidate();
  }
  function save(){try{localStorage.setItem('pixelOffice.lighting',JSON.stringify({preset,sun:sunScale,lamps:lampScale}));}catch{}}
  return {sun,uniforms,installFixtures,
    configure(mode,view){environment=mode;floor=String(view);apply();},
    setPreset(value){if(!Object.hasOwn(LIGHTING_PRESETS,value))return;preset=value;apply();save();},
    setStrength(kind,value){const n=Number(value);if(!Number.isFinite(n))return;if(kind==='sun')sunScale=THREE.MathUtils.clamp(n,.4,1.5);if(kind==='lamps')lampScale=THREE.MathUtils.clamp(n,.5,1.5);apply();save();},
    update(camera){skyMaterial.uniforms.uSkyInverseProjection.value.copy(camera.projectionMatrixInverse);skyMaterial.uniforms.uSkyCameraWorld.value.copy(camera.matrixWorld);},
    stats(){return {preset,sun:sunScale,lamps:lampScale,sunPower:sun.intensity,exposure:renderer.toneMappingExposure,shadowMaps:1,shaderLamps:positions.filter(p=>p.w>0).length,streetLamps:STREET_LIGHTS.length,sectionFill:uniforms.uOfficeSectionFill.value,skyShader:skyMesh.visible};},
    dispose(){scene.remove(sun,sun.target,sky,skyMesh,streetHaloRoot);skyGeometry.dispose();skyMaterial.dispose();haloGeometry.dispose();for(const h of halos){h.mesh.removeFromParent();h.mesh.dispose();h.material.dispose();}}
  };
}
