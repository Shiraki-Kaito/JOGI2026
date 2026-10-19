import {COURSE} from './course.js';
export function speakerIcon(muted){
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 6 8H3v8h3l5 4Z"/>'+
 (muted?'<path d="m3 3 18 18"/>':'<path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>')+'</svg>';
}
export function createSound(preferences,button,Context=globalThis.AudioContext){
 let context=null,master=null,noise=null,loop=null;
 const voices=new Set(),retiring=new Set(),counts=new Map(),last=new Map();
 function render(){button.innerHTML=speakerIcon(preferences.muted);button.setAttribute('aria-pressed',String(!preferences.muted));button.setAttribute('aria-label',preferences.muted?'音をオンにする':'音をオフにする');}
 function disconnect(voice){voice.nodes.forEach(n=>{try{n.disconnect();}catch{}});voices.delete(voice);retiring.delete(voice);}
 function stopVoice(voice){try{voice.source.stop();}catch{}disconnect(voice);}
 function prepare(){
  if(preferences.muted)return;
  try{
   context??=new Context();
   if(!master){master=context.createGain();master.gain.value=.55;master.connect(context.destination);}
   master.gain.setValueAtTime(.55,context.currentTime);
   return Promise.resolve(context.resume()).catch(()=>{});
  }catch{}
 }
 function noiseBuffer(){
  if(noise)return noise;
  noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
  const data=noise.getChannelData(0);let seed=173;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
  return noise;
 }
 function voice(kind,freq,endFreq,length,volume,delay=0){
  while(voices.size>=12)stopVoice(voices.values().next().value);
  const start=context.currentTime+delay,source=kind==='noise'?context.createBufferSource():context.createOscillator(),gain=context.createGain(),nodes=[source,gain];
  if(kind==='noise'){source.buffer=noiseBuffer();const filter=context.createBiquadFilter();filter.type='bandpass';filter.Q.value=.7;filter.frequency.setValueAtTime(freq,start);filter.frequency.exponentialRampToValueAtTime(endFreq,start+length);source.connect(filter).connect(gain);nodes.push(filter);}
  else{source.type=kind;source.frequency.setValueAtTime(freq,start);source.frequency.exponentialRampToValueAtTime(endFreq,start+length);source.connect(gain);}
  gain.connect(master);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
  const v={source,nodes};voices.add(v);source.onended=()=>disconnect(v);
  source.start(start);source.stop(start+length+.01);
 }
 function play(event){
  if(preferences.muted||!master||context?.state!=='running')return false;
  const now=context.currentTime,minGap=event==='coin'?.045:event==='ui'?.06:0;
  if(now-(last.get(event)??-Infinity)<minGap)return false;
  last.set(event,now);const variant=counts.get(event)??0;counts.set(event,(variant+1)%3);
  const pitch=[1,1.035,.975][variant],length=[1,.94,1.06][variant];
  const note=(f,t,g,delay=0,type='sine')=>voice(type,f*pitch,f*pitch*.98,t*length,g,delay);
  const air=(f,to,t,g,delay=0)=>voice('noise',f*pitch,to*pitch,t*length,g,delay);
  try{
   switch(event){
    case 'coin':note(1046,.085,.065);note(1568,.11,.025,.025);break;
    case 'bag':note(659,.19,.06);note(988,.23,.045,.055);note(1318,.3,.035,.11);break;
    case 'jump':air(1900,600,.18,.10);break;
    case 'land':air(460,140,.18,.16);note(100,.10,.025,0,'triangle');break;
    case 'hit':air(180,65,.24,.18);voice('triangle',135,48,.19,.10);break;
    case 'goal':for(const [i,f] of [523,659,784,1046].entries())note(f,.32,.055,i*.10);air(3200,600,.18,.14,.03);air(2700,450,.22,.12,.18);break;
    case 'purchase':note(784,.15,.05);note(1175,.23,.045,.08);note(1568,.24,.025,.16);break;
    case 'door':
     air(1900,650,.045,.055);note(230,.065,.035,.025,'triangle');
     voice('triangle',185*pitch,92*pitch,.36*length,.022,.055);
     air(620,230,.38,.045,.055);break;
    case 'ui':note(480,.045,.025,0,'triangle');break;
    default:return false;
   }
   return true;
  }catch{return false;}
 }
 function stopGlide(){
  if(!loop)return;
  const old=loop;loop=null;retiring.add(old);
  try{old.gain.gain.cancelScheduledValues(context.currentTime);old.gain.gain.setTargetAtTime(0,context.currentTime,.035);old.source.stop(context.currentTime+.15);}catch{disconnect(old);}
 }
 function updateGlide({active=false,speed=0,turn=0,grounded=true}={}){
  if(!active||speed<1||preferences.muted||!master||context?.state!=='running'){stopGlide();return;}
  try{
   if(!loop){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=noiseBuffer();source.loop=true;filter.type='bandpass';filter.Q.value=.45;gain.gain.value=0;
    source.connect(filter).connect(gain).connect(master);
    loop={source,filter,gain,nodes:[source,filter,gain]};const current=loop;source.onended=()=>disconnect(current);source.start();
   }
   const amount=Math.max(0,Math.min(1,speed/COURSE.tuckSpeed));
   loop.gain.gain.setTargetAtTime((.025+.065*amount*amount)*(grounded?1:.55),context.currentTime,.16);
   loop.filter.frequency.setTargetAtTime(260+amount*950+Math.min(1,Math.abs(turn))*160,context.currentTime,.2);
   loop.source.playbackRate.setTargetAtTime(.75+amount*.5,context.currentTime,.2);
  }catch{stopGlide();}
 }
 function stop(){stopGlide();for(const v of [...voices,...retiring])stopVoice(v);last.clear();}
 function dispose(){stop();try{master?.disconnect();Promise.resolve(context?.close?.()).catch(()=>{});}catch{}}
 button.onclick=()=>{
  preferences.setMuted(!preferences.muted);render();
  if(preferences.muted){stop();try{master?.gain.setValueAtTime(0,context.currentTime);Promise.resolve(context?.suspend()).catch(()=>{});}catch{}}
  else prepare();
 };
 render();return {play,prepare,updateGlide,stop,dispose,tone:()=>play('ui'),get muted(){return preferences.muted;},get activeVoices(){return voices.size;},get gliding(){return !!loop;}};
}
