export function createInterfaceVisibility(){
  const button=document.createElement('button');button.id='uiVisibilityToggle';button.className='hud-button ui-visibility-toggle';button.type='button';button.setAttribute('aria-keyshortcuts','H');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="ui-eye-slash" d="M3 3l18 18"/></svg><span class="ui-toggle-key" aria-hidden="true">H</span>';
  document.querySelector('#fullscreenToggle').before(button);
  let hidden=false,previousFocus=null;
  function render(){const label=hidden?'인터페이스 보이기 (H)':'인터페이스 숨기기 (H)';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(hidden));}
  function toggle(){
    hidden=!hidden;document.body.classList.toggle('ui-hidden',hidden);render();
    if(hidden){previousFocus=document.activeElement;button.focus({preventScroll:true});}
    else if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function keydown(event){
    if(event.code!=='KeyH'||event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
    const target=event.target,active=document.activeElement;
    if(document.querySelector('dialog[open]')||target?.closest?.('input,textarea,select')||target?.isContentEditable||active?.isContentEditable)return;
    event.preventDefault();event.stopPropagation();toggle();
  }
  button.addEventListener('click',toggle);document.addEventListener('keydown',keydown,true);render();
  return {dispose(){button.removeEventListener('click',toggle);document.removeEventListener('keydown',keydown,true);document.body.classList.remove('ui-hidden');button.remove();}};
}
