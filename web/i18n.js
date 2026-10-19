import {createPreferences} from './preferences.js';
import {dictionary} from './translations.js';
let storage;try{storage=globalThis.localStorage;}catch{}
export const preferences=createPreferences(storage);
const escape=value=>value.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
const matcher=new RegExp(Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
export function translate(text,language=preferences.language){
 return language==='en'?String(text).replace(matcher,match=>dictionary[match]):String(text);
}
// Only presentation changes: form values, credentials and game objects remain untouched.
export function createLocalizer(){
 const texts=new WeakMap(),attributes=new WeakMap();
 function walk(node,language){
  if(!node)return;
  const parent=node.nodeType===1?node:node.parentElement;
  if(parent?.closest?.('[data-no-i18n],script,style'))return;
  if(node.nodeType===3){
   if(parent?.closest?.('textarea'))return;
   const old=texts.get(node),source=old&&node.nodeValue===old.rendered?old.source:node.nodeValue;
   const rendered=translate(source,language);texts.set(node,{source,rendered});
   if(node.nodeValue!==rendered)node.nodeValue=rendered;return;
  }
  if(node.nodeType===1){
   const saved=attributes.get(node)||{};attributes.set(node,saved);
   for(const key of ['aria-label','title','placeholder']){
    const value=node.getAttribute(key);if(value===null)continue;
    const old=saved[key],source=old&&value===old.rendered?old.source:value,rendered=translate(source,language);
    saved[key]={source,rendered};if(value!==rendered)node.setAttribute(key,rendered);
   }
  }
  for(const child of node.childNodes??[])walk(child,language);
 }
 return walk;
}
export function initI18n(){
 const localize=createLocalizer(),doc=globalThis.document,root=doc.getElementById('game');
 let observer;
 const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']};
 function change(language){
  preferences.setLanguage(language);observer?.disconnect();localize(root,preferences.language);
  doc.documentElement?.setAttribute('lang',preferences.language);
  doc.title=translate('Be The Bear — 雪山を、からだで滑ろう。',language);
  doc.querySelector?.('meta[name="description"]')?.setAttribute('content',translate('身体で操作する1,500mのスキーゲーム。クマと一緒に雪山へ。',language));
  for(const lang of ['ja','en'])doc.getElementById('lang-'+lang)?.setAttribute('aria-pressed',String(language===lang));
  observer?.observe(root,options);
 }
 if(globalThis.MutationObserver){
  observer=new MutationObserver(records=>{
   observer.disconnect();
   for(const record of records){
    if(record.type==='childList'){for(const node of record.addedNodes)localize(node,preferences.language);}
    else localize(record.target,preferences.language);
   }
   observer.observe(root,options);
  });
 }
 for(const lang of ['ja','en']){const button=doc.getElementById('lang-'+lang);if(button)button.onclick=()=>change(lang);}
 change(preferences.language);
 return {change};
}
