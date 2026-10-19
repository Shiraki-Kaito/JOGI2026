// カメラの骨格プレビュー専用。入力変換・判定はpose-inputに置く。
const connections=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28]];
export function drawSkeleton(canvas,p,full,video=null){
  // Canvasとvideoを同じアスペクト比でcontain表示し、余白を含めて骨格を一致させる。
  const width=400,height=video?.videoWidth>0&&video?.videoHeight>0?Math.max(1,Math.round(width*video.videoHeight/video.videoWidth)):300;
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  canvas.parentElement?.style?.setProperty('--camera-ratio',String(width/height));
  const c=canvas.getContext('2d');c.clearRect(0,0,width,height);if(!p||p.length<29)return;
  c.strokeStyle=full?'#a3ecdd':'#ffd17a';c.lineWidth=2;
  for(const [a,b]of connections){c.beginPath();c.moveTo(p[a].x*width,p[a].y*height);c.lineTo(p[b].x*width,p[b].y*height);c.stroke();}
  for(const i of [11,12,13,14,15,16,23,24,25,26,27,28]){c.beginPath();c.arc(p[i].x*width,p[i].y*height,3,0,Math.PI*2);c.fillStyle='#fff';c.fill();}
}
