// Authentication POSTs are never retried automatically.
export async function requestAuth(path,body,identity,fetcher=globalThis.fetch){
 let response;
 try{response=await fetcher('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',signal:AbortSignal.timeout(15000),headers:{...(identity?.id?{'x-bear-account':identity.id}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
 catch{throw Error('通信できません。接続を確認して再試行してください。');}
 const unavailable='認証APIが見つかりません。ローカルではWorkerのURLを開いてください。公開サイトでは管理者にお知らせください。';
 let result;try{result=await response.json();}catch{}
 if(response.status===404||response.status===405||result?.code==='AUTH_API_UNAVAILABLE')throw Error(unavailable);
 if(response.status>=500)throw Error('認証サーバーで問題が発生しました。少し待って再試行し、続く場合は管理者にお知らせください。');
 if(!response.ok){
  const messages={400:'入力内容を確認してください。',401:'ユーザーIDと認証情報を確認してください。',403:'この画面を再読み込みしてお試しください。',409:'このユーザーIDは使用されています。別のIDを選ぶかログインしてください。',413:'送信する入力全体が大きすぎます。入力内容を短くしてください。',415:'画面を再読み込みしてお試しください。',429:'試行回数が多いため、10分ほど待ってお試しください。'};
  // Only expected client errors carry public, application-owned guidance.
  throw Error([400,401,409,429].includes(response.status)&&typeof result?.error==='string'?result.error:messages[response.status]||'認証できませんでした。画面を再読み込みしてください。');
 }
 if(!result||typeof result!=='object'||result.error)throw Error(unavailable);
 const user=result.user,validUser=user&&typeof user.id==='string'&&!!user.id&&typeof user.login==='string'&&!!user.login;
 if(path==='session' ? !(user===null||validUser) : ['register','login','recover'].includes(path) ? !validUser : path==='logout' ? user!==null : result.imported!==true)throw Error(unavailable);
 if(['register','recover'].includes(path)&&typeof result.recovery!=='string')throw Error(unavailable);
 return result;
}
