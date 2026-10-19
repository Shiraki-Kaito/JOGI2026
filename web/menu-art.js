import {lobbyActionLayout} from './lobby-actions.js';
// 透明余白を含む原寸と、影を除く操作対象の範囲（px）。
const SPRITES={
 title:{width:1289,height:1220,body:{left:64,top:24,width:1174,height:1180}},
 lobby:{width:1374,height:1145,body:{left:470,top:133,width:820,height:908}}
};
const rect=(left,top,width,height)=>({left,top,width,height});
function spriteAt(body,spec){
 const scale=body.height/spec.body.height;
 return rect(body.left-spec.body.left*scale,body.top-spec.body.top*scale,spec.width*scale,spec.height*scale);
}
/** CSS pxの矩形を絵とボタンへ共用する。プレイ座標には接続しない。 */
export function menuArtworkLayout(state,width,height,insets={}){
 const portrait=width/height<=1.1,low=!portrait&&height<=500,title=state==='title';
 const left=Math.max(12,insets.left||0),right=Math.max(12,insets.right||0),bottom=Math.max(12,insets.bottom||0);
 const buttonHeight=Math.max(48,Math.min(112,height*.12));
 const buttonWidth=portrait?(width-left-right-22)/2:Math.min(360,width*.20);
 const buttonTop=portrait?Math.min(height*.79,height-bottom-82-buttonHeight):height*.59;
 // クマの構図は従来の右側予約幅から維持し、実ボタンの配置と切り離す。
 const bearRightLimit=width-right-buttonWidth-18;
 let bear;
 if(title){
  const h=portrait?Math.min(height*.36,width*.80):height*(low?.42:.40),w=h*SPRITES.title.body.width/SPRITES.title.body.height;
  bear=rect(portrait?width*.03:width*.137,(portrait?height*.76:height*.895)-h,w,h);
 }else{
  const h=portrait?Math.min(height*.22,width*.46):height*.22,w=h*SPRITES.lobby.body.width/SPRITES.lobby.body.height;
  const center=portrait?width*.73:Math.min(width*.69,bearRightLimit-w/2);
  bear=rect(center-w/2,(portrait?buttonTop-24:height*.78)-h,w,h);
 }
 // 縦画面は左壁を切り取り、入口を残す。小屋全体を小さく収める構図にしない。
 const cabinHeight=height*(portrait?.58:low?.84:.74),cabinWidth=cabinHeight*1273/1236;
 const cabin=rect(portrait?Math.min(-width*.012,Math.max(width*.43-cabinWidth*.74,left-cabinWidth*.43)):-width*.012,portrait?height*.21:height*.105,cabinWidth,cabinHeight);
 const door=rect(cabin.left+cabin.width*.43,cabin.top+cabin.height*.52,cabin.width*.17,cabin.height*.37);
 const logoWidth=width*(portrait?.94:low?.58:.62);
 const logo=rect(width*(portrait?.03:low?.20:.215),portrait?Math.max(100,height*.18):low?70:height*.113,logoWidth,logoWidth*429/2094);
 return {portrait,title,bear,cabin,door,logo,sprite:spriteAt(bear,SPRITES[title?'title':'lobby']),
  buttons:title?{}:lobbyActionLayout(width,height,bear,door,insets),cabinVisible:!title};
}

/** 素材のデコードと配置を終えたフレームで初期表示を解放する。 */
export function createMenuArtwork(win,doc){
 const host=doc.getElementById('menu-art');
 if(!host?.querySelectorAll)return {render:()=>false,setScarf(){}};
 const titleBear=doc.getElementById('menu-title-bear'),lobbyBear=doc.getElementById('menu-lobby-bear');
 const cabin=doc.getElementById('menu-chalet'),heading=doc.querySelector('.snow-logo');
 const images=[...host.querySelectorAll('img'),heading.querySelector('img')];
 const bearTarget=doc.getElementById('bear-start'),shopTarget=doc.getElementById('shop-open');
 let ready=false,key='',active=false,insets={};
 const measure=()=>{
  const css=win.getComputedStyle(doc.documentElement);
  insets={left:parseFloat(css.getPropertyValue('--safe-left'))||0,right:parseFloat(css.getPropertyValue('--safe-right'))||0,bottom:parseFloat(css.getPropertyValue('--safe-bottom'))||0};key='';
 };
 const loaded=image=>new Promise((resolve,reject)=>{
  if(image.complete){image.naturalWidth?resolve():reject();return;}
  image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});
 }).then(()=>image.decode());
 // 失敗時にも旧タイトルへ戻さず、初期背景を保つ。
 Promise.all(images.map(loaded)).then(()=>{ready=true;key='';}).catch(()=>{});
 win.addEventListener('resize',measure);measure();
 const hide=event=>{if(!event.persisted){win.removeEventListener('resize',measure);win.removeEventListener('pagehide',hide);}};
 win.addEventListener('pagehide',hide);
 const setRect=(element,r)=>{for(const [name,value] of Object.entries(r))element.style[name]=value+'px';};
 return {
  setScarf(id,color){host.classList.toggle('has-scarf',id!=='none'&&!!color);if(color)host.style.setProperty('--menu-scarf',color);},
  render(state){
   const visible=ready&&(state==='title'||state==='lobby'||state==='choosing');
   if(active!==visible){active=visible;host.hidden=!visible;doc.body.classList.toggle('reference-menu',visible);key='';}
   if(!visible)return false;
   const scene=state==='title'?'title':'lobby',width=win.innerWidth,height=win.innerHeight,next=scene+':'+width+':'+height;
   if(next===key)return true;
   key=next;const layout=menuArtworkLayout(scene,width,height,insets);host.dataset.scene=scene;
   setRect(scene==='title'?titleBear:lobbyBear,layout.sprite);setRect(cabin,layout.cabin);setRect(heading,layout.logo);
   setRect(bearTarget,layout.bear);setRect(shopTarget,layout.door);
   // タイトルでは親のstartが非表示。home()が同じフレームでクマへフォーカスできるよう残す。
   bearTarget.hidden=false;shopTarget.hidden=layout.title;
   if(layout.title){bearTarget.disabled=true;shopTarget.disabled=true;}
   for(const [id,r] of Object.entries(layout.buttons))setRect(doc.getElementById(id),r);
   if(layout.title){
    doc.getElementById('title-start').disabled=false;
    doc.body.classList.toggle('menu-pending',false);
   }
   return true;
  }
 };
}
