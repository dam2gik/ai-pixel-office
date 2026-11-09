import {LIGHTING_PRESETS} from './lighting-layout.js';

export function createLightingPanel(lighting){
  const host=document.querySelector('.game-world'),toggle=document.createElement('button'),panel=document.createElement('section');
  toggle.id='lightingToggle';toggle.className='lighting-toggle';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','lightingPanel');panel.id='lightingPanel';panel.className='lighting-panel';panel.hidden=true;panel.setAttribute('aria-label','조명 설정');
  const heading=document.createElement('div');heading.className='lighting-heading';const title=document.createElement('strong');title.textContent='햇빛과 조명';const close=document.createElement('button');close.id='closeLightingPanel';close.textContent='×';close.setAttribute('aria-label','조명 설정 닫기');heading.append(title,close);panel.append(heading);
  const choices=document.createElement('div');choices.className='lighting-presets';const buttons=[];
  for(const [id,preset] of Object.entries(LIGHTING_PRESETS)){const button=document.createElement('button');button.dataset.lightingPreset=id;button.textContent=preset.label;button.onclick=()=>{lighting.setPreset(id);render();};choices.append(button);buttons.push(button);}panel.append(choices);
  const sliders={};
  for(const [kind,label,min] of [['sun','자연광',40],['lamps','실내·가로등',50]]){
    const field=document.createElement('label'),caption=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');caption.textContent=label;input.type='range';input.min=min;input.max=150;input.step=5;input.id=kind==='sun'?'lightingSun':'lightingLamps';input.setAttribute('aria-label',label+' 밝기');input.oninput=()=>{lighting.setStrength(kind,Number(input.value)/100);render();};field.append(caption,output,input);panel.append(field);sliders[kind]={input,output};
  }
  const note=document.createElement('p');note.textContent='시간대와 밝기를 바꿔 분위기를 조절하세요.';panel.append(note);host.append(toggle,panel);
  function open(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));}
  function render(){const state=lighting.stats();toggle.textContent=(state.preset==='night'?'☾':'☀')+' 조명 · '+LIGHTING_PRESETS[state.preset].label;for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.lightingPreset===state.preset));for(const [kind,field] of Object.entries(sliders)){const percent=Math.round(state[kind]*100);field.input.value=String(percent);field.output.textContent=percent+'%';}}
  toggle.onclick=()=>open(panel.hidden);close.onclick=()=>open(false);render();
  return {dispose(){toggle.remove();panel.remove();}};
}
