import * as THREE from 'three';

// Fly camera owns input only while enabled; OrbitControls keeps its own saved pose.
export function createFreeCamera({camera,controls,canvas,invalidate,available,onChange}){
  const keys=new Set(),rotation=new THREE.Euler(0,0,0,'YXZ'),direction=new THREE.Vector3(),right=new THREE.Vector3(),delta=new THREE.Vector3();
  const movement=new Set(['KeyW','KeyA','KeyS','KeyD','KeyR','KeyC','ShiftLeft','ShiftRight']);
  let enabled=false,dragging=false,pointer=null,saved=null;
  const blocked=()=>!available()||!!document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"],[contenteditable=""]');
  function clear(){const changed=keys.size>0||dragging;keys.clear();dragging=false;const id=pointer;pointer=null;if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);if(changed)invalidate();}
  function sync(){rotation.setFromQuaternion(camera.quaternion,'YXZ');}
  function set(value){
    if(enabled===value)return;clear();enabled=value;
    if(value){saved={position:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,view:camera.view?{...camera.view}:null};camera.clearViewOffset();controls.enabled=false;camera.fov=55;sync();}
    else{controls.enabled=true;if(saved){camera.position.copy(saved.position);controls.target.copy(saved.target);camera.fov=saved.fov;controls.update();if(saved.view?.enabled){const v=saved.view;camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);}else camera.clearViewOffset();}}
    camera.updateProjectionMatrix();canvas.classList.toggle('free-camera',value);onChange(value);invalidate();
  }
  function down(e){
    if(e.code==='Escape'&&enabled&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopPropagation();set(false);return;}
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||blocked())return;
    if(e.code==='KeyF'&&!e.repeat){e.preventDefault();set(!enabled);return;}
    if(enabled&&movement.has(e.code)){e.preventDefault();keys.add(e.code);invalidate();}
  }
  function up(e){if(keys.delete(e.code))invalidate();}
  function pointerDown(e){if(!enabled||e.button!==2||blocked())return;e.preventDefault();dragging=true;pointer=e.pointerId;canvas.setPointerCapture(pointer);invalidate();}
  function pointerMove(e){if(!enabled||!dragging||e.pointerId!==pointer)return;rotation.y-=e.movementX*.003;rotation.x=THREE.MathUtils.clamp(rotation.x-e.movementY*.003,-Math.PI/2+.02,Math.PI/2-.02);camera.quaternion.setFromEuler(rotation);invalidate();}
  function pointerUp(e){if(e.pointerId===pointer)clear();}
  function context(e){if(enabled)e.preventDefault();}
  function visibility(){if(document.hidden)clear();}
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('focusin',clear);document.addEventListener('visibilitychange',visibility);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',clear);canvas.addEventListener('lostpointercapture',clear);canvas.addEventListener('contextmenu',context);
  return {
    get enabled(){return enabled;},set,sync,clear,
    rememberOrbit(){if(enabled&&saved){saved.position.copy(camera.position);saved.target.copy(controls.target);saved.fov=camera.fov;saved.view=camera.view?{...camera.view}:null;}},
    moving(){return enabled&&!blocked()&&(keys.size>0||dragging);},
    step(dt){
      if(!enabled||blocked()){clear();return false;}if(!keys.size)return false;
      camera.getWorldDirection(direction);right.crossVectors(direction,camera.up).normalize();delta.set(0,0,0);
      if(keys.has('KeyW'))delta.add(direction);if(keys.has('KeyS'))delta.sub(direction);if(keys.has('KeyD'))delta.add(right);if(keys.has('KeyA'))delta.sub(right);
      if(keys.has('KeyR'))delta.y+=1;if(keys.has('KeyC'))delta.y-=1;
      if(!delta.lengthSq())return false;delta.normalize().multiplyScalar(Math.min(dt,.1)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?24:8));camera.position.add(delta);return true;
    },
    place(floorY,underground=false){if(!enabled)return;clear();camera.clearViewOffset();camera.position.set(underground?-24:-14,floorY+2.4,underground?15:19);camera.lookAt(0,floorY+1.5,0);sync();invalidate();},
    dispose(){clear();document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('focusin',clear);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',clear);canvas.removeEventListener('lostpointercapture',clear);canvas.removeEventListener('contextmenu',context);}
  };
}
