import * as THREE from 'three';

// Detail lives in local world units, so a long wall has the same fine grain as
// a small prop. Instance transforms are included without adding any draw calls.
export function detailedMaterial(color,{kind,lighting}={}){
  const c=new THREE.Color(color),r=c.r,g=c.g,b=c.b;
  kind??=r>g*1.16&&g>b*1.18?'wood':g>r*1.12&&g>b*1.12?'leaf':'mineral';
  const style={wood:1,leaf:2,fabric:3,hair:4,mineral:0,tile:5,water:6,brick:7,marble:8,stone:9,glass:10,glazing:10,plaster:0,earth:11,rock:12,metal:13}[kind]??0;
  const material=new THREE.MeshStandardMaterial({color,roughness:kind==='glass'||kind==='glazing'?.16:kind==='metal'?.35:kind==='marble'?.28:kind==='water'?.3:kind==='leaf'?.88:.82,
    ...(kind==='metal'||kind==='glazing'?{metalness:kind==='metal'?.5:.18}:{}),
    ...(kind==='lamp'?{emissive:new THREE.Color(color),emissiveIntensity:.6,roughness:.3}:{}),
    ...(kind==='glass'?{transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,metalness:.12}:{})});
  material.userData.surface=kind;
  material.customProgramCacheKey=()=>`office-detail-v4-${style}-${kind}-${lighting?'lit':'preview'}`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=`varying vec3 vDetailPoint; varying vec3 vDetailNormal;\n${shader.vertexShader}`.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 detailPoint=vec4(position,1.0); vec3 detailNormal=normal;
      #ifdef USE_INSTANCING
        detailPoint=instanceMatrix*detailPoint;
        detailNormal=mat3(instanceMatrix)*detailNormal;
      #else
        detailPoint=modelMatrix*detailPoint;
        detailNormal=mat3(modelMatrix)*detailNormal;
      #endif
      vDetailPoint=detailPoint.xyz; vDetailNormal=normalize(detailNormal);`);
    shader.fragmentShader=`varying vec3 vDetailPoint; varying vec3 vDetailNormal;
      float detailHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      ${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 n=abs(vDetailNormal); vec2 p=n.y>max(n.x,n.z)?vDetailPoint.xz:(n.x>n.z?vDetailPoint.zy:vDetailPoint.xy);
      float fine=detailHash(floor(p*64.0))-.5;
      float broad=detailHash(floor(p*16.0))-.5;
      float footprint=max(length(dFdx(p)),length(dFdy(p)));
      float detail=fine*.045/(1.0+footprint*64.0)+broad*.045/(1.0+footprint*16.0);
      ${style===1?`float grain=sin(p.x*250.0+sin(p.y*8.0)*2.0); detail+=grain*.035/(1.0+footprint*64.0);
        vec2 plank=fract(p/vec2(.14,.7)); vec2 aa=fwidth(p/vec2(.14,.7));
        float seam=(1.0-smoothstep(.008,.008+aa.x*1.5,min(plank.x,1.0-plank.x)))*.075; detail-=seam;`:''}
      ${style===2?'detail+= (detailHash(floor(p*26.0))-.5)*.18/(1.0+footprint*26.0);':''}
      ${style===3?'detail+=sin(p.x*230.0)*sin(p.y*230.0)*.025/(1.0+footprint*48.0);':''}
      ${style===4?'detail+=sin(p.y*125.0+sin(p.x*15.0))*.045/(1.0+footprint*64.0);':''}
      ${style===5?`vec2 tile=fract(p/.25);vec2 edge=fwidth(p/.25);
        vec2 distanceToEdge=min(tile,1.0-tile);
        float joint=1.0-smoothstep(.004,.004+max(edge.x,edge.y),min(distanceToEdge.x,distanceToEdge.y));
        detail-=joint*.13;
        detail+=(detailHash(floor(p/.25))-.5)*.035;`:''}
      ${style===6?'detail+=sin(p.x*26.0+sin(p.y*16.0)*1.4)*.04/(1.0+footprint*20.0);':''}
      ${style===7?`vec2 brick=p/vec2(.48,.22);brick.x+=mod(floor(brick.y),2.0)*.5;
        vec2 edge=min(fract(brick),1.0-fract(brick));vec2 aa=fwidth(brick);
        float mortar=1.0-smoothstep(.025,.025+max(aa.x,aa.y),min(edge.x,edge.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.64,.59,.49),mortar*.65);
        detail+=(detailHash(floor(brick))-.5)*.2;`:''}
      ${style===8?`float vein=sin(p.x*3.8+p.y*2.3+sin(p.x*1.7-p.y*2.1)*2.0);
        detail-=pow(1.0-abs(vein),14.0)*.27;
        detail+=sin(p.x*1.1+p.y*.6)*.035;`:''}
      ${style===9?`vec2 stone=p/vec2(.65,.38);stone.x+=mod(floor(stone.y),2.0)*.35;
        vec2 edge=min(fract(stone),1.0-fract(stone));vec2 aa=fwidth(stone);
        detail-=(1.0-smoothstep(.02,.02+max(aa.x,aa.y),min(edge.x,edge.y)))*.21;
        detail+=(detailHash(floor(stone))-.5)*.16;`:''}
      ${style===11?'detail+=(detailHash(floor(p*1.8))-.5)*.18+(detailHash(floor(p*7.0))-.5)*.08;':''}
      ${style===12?'detail+=(detailHash(floor(p*3.0))-.5)*.15+(detailHash(floor(p*15.0))-.5)*.07;':''}
      diffuseColor.rgb*=1.0+detail;
      `);
    if(lighting){
      Object.assign(shader.uniforms,lighting);
      shader.vertexShader='varying vec3 vOfficeWorldPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 officePoint=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          officePoint=instanceMatrix*officePoint;
        #endif
        vOfficeWorldPosition=(modelMatrix*officePoint).xyz;`);
      shader.fragmentShader=`varying vec3 vOfficeWorldPosition;
        uniform vec4 uOfficeLamps[${lighting.uOfficeLamps.value.length}];uniform vec4 uOfficeStreetLamps[19];uniform float uOfficeLampPower;uniform float uOfficeDaylight;uniform float uOfficeOutside;uniform float uOfficeSectionFill;uniform vec3 uOfficeSunDirection;uniform vec3 uOfficeSunTint;uniform vec3 uOfficeSkyTint;
        vec3 officeLamp(vec4 lamp,vec3 point,vec3 normal){vec3 ray=lamp.xyz-point;float d2=max(dot(ray,ray),.02);if(d2>=lamp.w*lamp.w)return vec3(0.0);float edge=1.0-d2/(lamp.w*lamp.w);return vec3(edge*edge/(1.0+d2*.09)*(.12+.88*max(dot(normal,ray*inversesqrt(d2)),0.0)));}
        ${shader.fragmentShader}`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        vec3 officeNormal=normalize(inverseTransformDirection(normal,viewMatrix));
        float underground=1.0-smoothstep(-2.6,-.3,vOfficeWorldPosition.y);
        reflectedLight.directDiffuse*=mix(1.0,.08,underground);reflectedLight.directSpecular*=mix(1.0,.14,underground);
        vec3 lampIrradiance=vec3(0.0);
        if(uOfficeOutside>.5){
          for(int i=0;i<19;i++)lampIrradiance+=officeLamp(uOfficeStreetLamps[i],vOfficeWorldPosition,officeNormal)*vec3(1.0,.75,.42);
        }else{
          int floorIndex=clamp(int(floor((vOfficeWorldPosition.y+.15)/6.0))+6,0,${lighting.uOfficeLamps.value.length/8-1});
          vec3 lampTint=floorIndex<=3?vec3(1.0,.68,.34):vec3(1.0,.87,.65);
          for(int i=0;i<8;i++)lampIrradiance+=officeLamp(uOfficeLamps[floorIndex*8+i],vOfficeWorldPosition,officeNormal)*lampTint;
        }
        float skyBounce=(.035+uOfficeDaylight*.055)*max(officeNormal.y,0.0);
        vec3 bounce=mix(uOfficeSkyTint*.055,vec3(.22,.23,.24),underground)+uOfficeSunTint*skyBounce*(1.0-underground);
        bounce+=vec3(.17,.19,.21)*underground*uOfficeSectionFill*(.3+.7*max(dot(officeNormal,normalize(vec3(.55,.3,.8))),0.0));
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*(bounce+lampIrradiance*uOfficeLampPower*2.7);
        ${[6,8,10].includes(style)?`vec3 eyeRay=normalize(vOfficeWorldPosition-cameraPosition);vec3 reflectedSky=reflect(eyeRay,officeNormal);float fresnel=pow(1.0-max(dot(-eyeRay,officeNormal),0.0),5.0);
          vec3 reflection=mix(uOfficeSkyTint*.35,uOfficeSkyTint,.3+.7*max(reflectedSky.y,0.0));float sunGlint=pow(max(dot(reflectedSky,uOfficeSunDirection),0.0),${style===8?'42.0':'90.0'});
          reflectedLight.indirectSpecular+=(reflection*(.045+fresnel*.35)+uOfficeSunTint*sunGlint*.3)*(.15+uOfficeDaylight)*mix(1.0,.18,underground);`:''}
      `);
      if(kind==='lamp')shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=.7+uOfficeLampPower*1.3;');
      if(kind==='glazing')shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        vec2 officeWindow=floor((vOfficeWorldPosition.xz+vec2(22.0,12.0))/4.0);float windowOn=step(.25,detailHash(officeWindow+floor((vOfficeWorldPosition.y+.15)/6.0)*7.1));
        totalEmissiveRadiance+=vec3(1.0,.64,.28)*(1.0-clamp(uOfficeDaylight,0.0,1.0))*windowOn*.28*uOfficeLampPower;`);
    }
  };
  return material;
}
