const rect=(left,top,width,height)=>({left,top,width,height});
/** 描画済みのクマ/入口矩形から、雪ボタンを配置する。単位はCSS px。 */
export function lobbyActionLayout(width,height,bear,door,insets={}){
 const left=Math.max(12,(insets.left||0)+8),right=Math.max(12,(insets.right||0)+8),bottom=Math.max(12,insets.bottom||0);
 const portrait=width/height<=1.1,gap=12,footer=64;
 let play,shop;
 if(portrait){
  const playHeight=Math.min(92,Math.max(64,height*.08)),shopHeight=48;
  const playTop=height-bottom-footer-playHeight,shopTop=door.top+door.height+gap;
  if(shopTop+shopHeight+gap<=playTop){
   const shopWidth=Math.min(250,width*.42,bear.left-left-gap);
   const shopLeft=Math.max(left,Math.min(door.left+door.width/2-shopWidth/2,bear.left-gap-shopWidth));
   shop=rect(shopLeft,shopTop,shopWidth,shopHeight);
   const playWidth=Math.min(560,width-left-right);play=rect((width-playWidth)/2,playTop,playWidth,playHeight);
  }else{
   // 高さが足りない縦画面だけ横並び。建物/クマより下、フッターより上を使う。
   const available=width-left-right-gap,shopWidth=available*.36;
   shop=rect(left,playTop+playHeight-shopHeight,shopWidth,shopHeight);
   play=rect(left+shopWidth+gap,playTop,available-shopWidth,playHeight);
  }
 }else{
  const playHeight=Math.min(140,height<350?54:Math.max(64,height*.17));
  const playLeft=Math.max(door.left+door.width+gap,Math.min(width*.354,bear.left-gap-Math.max(130,width*.29)));
  const playWidth=Math.min(width*.29,bear.left-gap-playLeft,width-right-playLeft);
  const playTop=Math.min(height*.68,height-bottom-footer-playHeight);
  play=rect(playLeft,playTop,playWidth,playHeight);
  const shopWidth=Math.min(270,Math.max(112,width*.133)),shopHeight=Math.min(82,Math.max(48,height*.09));
  const shopLeft=Math.max(left,width*.218,door.left+door.width+gap);
  const shopTop=Math.min(height*.615,shopLeft+shopWidth+gap>playLeft?playTop-shopHeight-gap:playTop);
  shop=rect(shopLeft,shopTop,shopWidth,shopHeight);
 }
 return {'shop-button':shop,'play-button':play};
}
