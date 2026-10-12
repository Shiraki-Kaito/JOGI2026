// Only UI preferences use these keys; account and run storage remain unchanged.
export function createPreferences(storage){
 let language='ja',muted=true;
 try{language=storage?.getItem('bear-ski-language')==='en'?'en':'ja';muted=storage?.getItem('bear-ski-muted')!=='false';}catch{}
 const save=(key,value)=>{try{storage?.setItem(key,value);}catch{}};
 return {get language(){return language;},get muted(){return muted;},
 setLanguage(value){language=value==='en'?'en':'ja';save('bear-ski-language',language);},
 setMuted(value){muted=!!value;save('bear-ski-muted',String(muted));}};
}
