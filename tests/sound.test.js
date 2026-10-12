import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSound} from '../web/sound.js';
function setup(){
 const nodes=[],sources=[];let context;
 const param=()=>({value:0,calls:[],setValueAtTime(v,t){this.value=v;this.calls.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.calls.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.calls.push(['exp',v,t]);},setTargetAtTime(v,t,tau){this.calls.push(['target',v,t,tau]);},cancelScheduledValues(){}});
 class Context{
  constructor(){context=this;this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination={};}
  node(kind){const n={kind,gain:param(),frequency:param(),playbackRate:param(),Q:param(),connect(target){this.target=target;return target;},disconnect(){this.disconnected=true;},start(t=0){this.started=t;},stop(t=0){this.stopped=t;if(t<=context.currentTime)this.onended?.();}};nodes.push(n);if(kind==='osc'||kind==='buffer')sources.push(n);return n;}
  createGain(){return this.node('gain');}createOscillator(){return this.node('osc');}createBufferSource(){return this.node('buffer');}createBiquadFilter(){return this.node('filter');}
  createBuffer(c,length){return {getChannelData:()=>new Float32Array(length)};}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
 }
 const prefs={muted:false,setMuted(v){this.muted=v;}},button={setAttribute(){}},sound=createSound(prefs,button,Context);
 return {sound,prefs,button,nodes,sources,get context(){return context;}};
}
test('each event has a distinct synthesis pattern and three bounded variations',()=>{
 const signatures=new Set();
 for(const event of ['coin','bag','jump','land','hit','goal','purchase','ui']){
  const a=setup();a.sound.prepare();
  const pitches=[];
  for(let i=0;i<3;i++){a.context.currentTime=i;const start=a.sources.length;assert.equal(a.sound.play(event),true);
   const made=a.sources.slice(start);
   assert.ok(made.length<=6);
   const signature=made.map(n=>[n.kind,n.type,n.frequency.calls,n.started-i,Number((n.stopped-i).toFixed(3))]);
   if(i===0)signatures.add(JSON.stringify(signature));
   pitches.push(JSON.stringify(signature));a.sound.stop();
  }
  assert.equal(new Set(pitches).size,3,event);
 }
 assert.equal(signatures.size,8);
});
test('coin bursts are throttled and live effect voices never exceed twelve',()=>{
 const a=setup();a.sound.prepare();a.sound.play('coin');const n=a.sources.length;
 for(let i=0;i<20;i++)assert.equal(a.sound.play('coin'),false);
 assert.equal(a.sources.length,n);
 for(let i=0;i<100;i++){a.context.currentTime+=.05;a.sound.play('bag');assert.ok(a.sound.activeVoices<=12);}
 a.sound.stop();assert.equal(a.sound.activeVoices,0);
 assert.ok(a.sources.every(n=>n.disconnected));
});
test('glide uses one loop, follows speed smoothly and mute stops every source',()=>{
 const a=setup();a.sound.prepare();
 a.sound.updateGlide({active:true,speed:25.5});const loop=a.sources.find(n=>n.loop),gain=loop.target.target;
 const low=gain.gain.calls.at(-1)[1];
 a.sound.updateGlide({active:true,speed:46.5,turn:1});
 assert.equal(a.sources.filter(n=>n.loop).length,1);assert.ok(gain.gain.calls.at(-1)[1]>low);assert.equal(gain.gain.calls.at(-1)[0],'target');
 a.sound.play('goal');a.button.onclick();
 assert.equal(a.sound.muted,true);assert.equal(a.sound.gliding,false);assert.equal(a.sound.activeVoices,0);assert.ok(a.sources.every(n=>n.disconnected));assert.match(a.button.innerHTML,/m3 3 18 18/);
 a.sound.updateGlide({active:true,speed:46.5});assert.equal(a.sound.gliding,false);
 a.button.onclick();a.sound.updateGlide({active:true,speed:25.5});assert.equal(a.sound.gliding,true);
 a.sound.stop();assert.equal(a.sound.gliding,false);
 a.sound.dispose();assert.equal(a.context.state,'closed');
});
test('paused glide fades out and an unavailable audio device cannot break the game',async()=>{
 const a=setup();a.sound.prepare();a.sound.updateGlide({active:true,speed:25.5});const source=a.sources[0];
 a.sound.updateGlide({active:false});assert.equal(a.sound.gliding,false);assert.ok(source.stopped<=a.context.currentTime+.15);
 const blocked=createSound({muted:false,setMuted(){}},{setAttribute(){}},class{constructor(){throw Error('unavailable');}});
 assert.doesNotThrow(()=>{blocked.prepare();blocked.play('goal');blocked.updateGlide({active:true,speed:40});blocked.stop();blocked.dispose();});
 const rejected=setup();rejected.sound.prepare();rejected.context.resume=()=>Promise.reject(Error('blocked'));await rejected.sound.prepare();
});
