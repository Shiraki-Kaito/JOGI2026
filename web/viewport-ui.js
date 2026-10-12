/** ソフトキーボードで狭くなる表示領域だけをモーダルへ渡す。3Dカメラはlayout viewportを維持。 */
export function bindViewportUI(win,doc){
 const style=doc.documentElement?.style;if(!style?.setProperty)return()=>{};
 const viewport=win.visualViewport;
 const sync=()=>{
  style.setProperty('--visible-height',Math.max(1,viewport?.height||win.innerHeight)+'px');
  style.setProperty('--visible-top',Math.max(0,viewport?.offsetTop||0)+'px');
 };
 const resize=()=>{sync();const field=doc.activeElement;
  if(field?.matches?.('input,textarea,select'))win.requestAnimationFrame?.(()=>field.scrollIntoView?.({block:'nearest',inline:'nearest'}));
 };
 const dispose=()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',sync);win.removeEventListener('resize',resize);win.removeEventListener('pagehide',hide);};
 const hide=event=>{if(!event.persisted)dispose();};
 viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',sync);win.addEventListener('resize',resize);win.addEventListener('pagehide',hide);sync();
 return dispose;
}
