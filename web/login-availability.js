import {registrationIdError} from './auth-validation.js';

export async function checkLoginAvailability(login,signal,fetcher=globalThis.fetch){
 const response=await fetcher('/api/auth/availability',{method:'POST',credentials:'same-origin',signal,headers:{'content-type':'application/json'},body:JSON.stringify({login})});
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('availability failed');
 const result=await response.json();
 if(typeof result?.available!=='boolean'||Object.keys(result).length!==1)throw Error('invalid availability response');
 return result.available;
}

// 入力世代を比較するため、Abortを無視した応答でも古い判定は表示しない。
export function createLoginAvailability({check=checkLoginAvailability,onChange,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer,deadline,controller,version=0,current='',status='idle';
 const emit=(kind,message)=>{status=kind;onChange({kind,message});};
 function cancel(){version++;clearTimer(timer);clearTimer(deadline);controller?.abort();controller=null;}
 function update(login,active=true){
  cancel();current=login;
  if(!active){emit('idle','');return;}
  const error=registrationIdError(login);
  if(error){emit('invalid',error);return;}
  emit('checking','確認中…');
  const own=version;
  timer=setTimer(async()=>{
   controller=new AbortController();
   deadline=setTimer(()=>{if(own!==version)return;version++;controller.abort();emit('error','確認できませんでした');},8000);
   try{
    const available=await check(login,controller.signal);
    if(own!==version)return;
    emit(available?'available':'taken',available?'このIDは使用できます':'このIDは既に使用されています');
   }catch{if(own===version)emit('error','確認できませんでした');}
   finally{if(own===version)clearTimer(deadline);}
  },300);
 }
 return {update,stop(){cancel();emit('idle','');},isTaken:login=>status==='taken'&&current===login,get status(){return status;}};
}
