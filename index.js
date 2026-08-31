import { isAuthorQaRequest, injectAuthorQaPrompt, initAuthorQa } from './modules/author-qa/index.js';

(() => {
'use strict';
const VERSION='1.0.0';
const BUILD='vvv-story-memory-suite-1.0.0-fixed42-base';

if(globalThis.__VVV_STORY_MEMORY_SUITE_INSTANCE__){
  console.warn('[VVV Story Memory Suite] duplicate load blocked',globalThis.__VVV_STORY_MEMORY_SUITE_INSTANCE__);
  return;
}
globalThis.__VVV_STORY_MEMORY_SUITE_INSTANCE__=BUILD;

// The standalone package intentionally reuses the original global bridge names because
// 0-32 and relay already depend on them. If the old 0-00 frontend is still active,
// do not start a second copy of the same state machine.
if(globalThis.__VVV_UNIFIED_CORE_INSTANCE__ || globalThis.vvvTheaterMemoryInterceptor){
  globalThis.__VVV_STORY_MEMORY_SUITE_BLOCKED_BY_LEGACY__=true;
  console.warn('[VVV Story Memory Suite] old VVV unified/theater frontend detected; standalone runtime not started to avoid duplicate memory writes. Disable/remove the old 0-00 frontend, then reload.');
  return;
}

const runtime={account:'',booted:false,bootError:null,modules:{theater:false,relay:false,authorQa:false},startedAt:Date.now()};

function stContext(){
  try{
    if(globalThis.SillyTavern?.getContext)return globalThis.SillyTavern.getContext();
    if(globalThis.SillyTavern?.context)return globalThis.SillyTavern.context;
    if(globalThis.getContext)return globalThis.getContext();
  }catch{}
  return null;
}
function toast(msg,type='info'){
  const t=globalThis.toastr;
  if(t?.[type])t[type](msg,'VVV · 剧情与记忆核心');
  else console.log('[VVV Story Memory Suite]',msg);
}
async function account(){
  try{
    const r=await fetch('/api/users/me',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)return '';
    const d=await r.json();
    return String(d?.handle||'').trim().toLowerCase();
  }catch{return '';}
}

// Shared SillyTavern event bus: keep exactly one native binding per event.
const eventHandlers=new Map();
const nativeEventBindings=new Map();
function bindNativeEvent(name){
  if(nativeEventBindings.has(name))return true;
  const c=stContext();
  const source=c?.eventSource;
  const types=c?.event_types||c?.eventTypes||globalThis.event_types||{};
  if(!source?.on)return false;
  const actual=types[name]||name;
  const dispatch=(...args)=>{
    const set=eventHandlers.get(name);if(!set?.size)return;
    for(const fn of [...set]){
      try{const out=fn(...args);if(out?.catch)out.catch(e=>console.error(`[VVV Story Memory] event ${name} failed`,e));}
      catch(e){console.error(`[VVV Story Memory] event ${name} failed`,e);}
    }
  };
  source.on(actual,dispatch);
  nativeEventBindings.set(name,{actual,dispatch});
  return true;
}
const events={
  on(name,handler){
    if(typeof handler!=='function')return()=>{};
    const key=String(name||'');if(!key)return()=>{};
    if(!eventHandlers.has(key))eventHandlers.set(key,new Set());
    eventHandlers.get(key).add(handler);
    if(!bindNativeEvent(key))setTimeout(()=>bindNativeEvent(key),250);
    return()=>eventHandlers.get(key)?.delete(handler);
  },
  emit(name,...args){for(const fn of [...(eventHandlers.get(String(name))||[])])try{fn(...args);}catch(e){console.error(e);}},
  bindPending(){for(const name of eventHandlers.keys())bindNativeEvent(name);},
  diagnostics(){return {channels:eventHandlers.size,nativeBindings:nativeEventBindings.size};},
};

// Shared serial task groups used by relay and 0-32.
const taskGroups=new Map();
const activeTasks=new Map();
const tasks={
  async run(name,fn,{group='state-write'}={}){
    const label=String(name||'task'),g=String(group||'state-write');
    const previous=taskGroups.get(g)||Promise.resolve();
    let release;const gate=new Promise(r=>release=r);
    const chain=previous.catch(()=>{}).then(()=>gate);taskGroups.set(g,chain);
    await previous.catch(()=>{});
    activeTasks.set(label,{name:label,group:g,startedAt:Date.now()});
    try{return await fn();}
    finally{activeTasks.delete(label);release();if(taskGroups.get(g)===chain)taskGroups.delete(g);}
  },
  isBusy(group=''){return group?[...activeTasks.values()].some(x=>x.group===group):activeTasks.size>0;},
  list(){return [...activeTasks.values()].map(x=>({...x,ageMs:Date.now()-x.startedAt}));},
};

const overlayRegistry=new Map();
function closeKnownOverlays(except=''){
  for(const [key,row] of overlayRegistry){if(key===except)continue;try{row.close?.();}catch{}}
  if(except!=='theater'){
    try{document.getElementById('vvvtm-modal')?.setAttribute('hidden','');}catch{}
    try{document.getElementById('vvvtm-role-phone')?.setAttribute('hidden','');}catch{}
  }
  if(except!=='relay')try{globalThis.VVVUnifiedRelay?.close?.();}catch{}
  if(except!=='author-qa')try{document.querySelector('.vvvsm-author-qa-dialog')?.remove();}catch{}
}
const overlays={
  register(key,api={}){overlayRegistry.set(String(key),api||{});},
  activate(key){closeKnownOverlays(String(key||''));},
  closeAll(){closeKnownOverlays('');},
  diagnostics(){return [...overlayRegistry.keys()];},
};

const viewportState={cleanup:null,last:null};
function syncVisualViewport(){
  const vv=globalThis.visualViewport;
  const mobile=matchMedia?.('(max-width: 800px)')?.matches||matchMedia?.('(pointer: coarse)')?.matches;
  const width=Math.max(1,Math.round(vv?.width||globalThis.innerWidth||document.documentElement.clientWidth||1));
  const height=Math.max(1,Math.round(vv?.height||globalThis.innerHeight||document.documentElement.clientHeight||1));
  const left=Math.round(vv?.offsetLeft||0),top=Math.round(vv?.offsetTop||0);
  const next={left,top,width,height,mobile:!!mobile};
  const root=document.documentElement;
  root.style.setProperty('--vvvu-vv-left',`${left}px`);root.style.setProperty('--vvvu-vv-top',`${top}px`);
  root.style.setProperty('--vvvu-vv-width',`${width}px`);root.style.setProperty('--vvvu-vv-height',`${height}px`);
  root.toggleAttribute('data-vvvu-mobile',!!mobile);viewportState.last=next;return next;
}
function bindVisualViewport(){
  if(viewportState.cleanup)return;
  const vv=globalThis.visualViewport;let frame=0;
  const fn=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;syncVisualViewport();});};
  vv?.addEventListener('resize',fn,{passive:true});vv?.addEventListener('scroll',fn,{passive:true});
  globalThis.addEventListener('resize',fn,{passive:true});globalThis.addEventListener('orientationchange',fn,{passive:true});
  viewportState.cleanup=()=>{if(frame)cancelAnimationFrame(frame);vv?.removeEventListener('resize',fn);vv?.removeEventListener('scroll',fn);globalThis.removeEventListener('resize',fn);globalThis.removeEventListener('orientationchange',fn);};
  syncVisualViewport();
}
const viewport={sync:syncVisualViewport,bind:bindVisualViewport,diagnostics:()=>viewportState.last||{}};

globalThis.VVVUnifiedCore={version:VERSION,build:BUILD,runtime,events,tasks,overlays,viewport,toast};

async function safeImport(path,label){
  try{const mod=await import(new URL(path,import.meta.url).href+`?u=${encodeURIComponent(BUILD)}`);runtime.modules[label]=true;return mod||true;}
  catch(e){runtime.bootError=e;console.error(`[VVV Story Memory] ${label} load failed`,e);toast(`${label}模块加载失败：${e.message}`,'error');return false;}
}

const bootPromise=(async()=>{
  runtime.account=await account();
  // Server plugin fixed42 is intentionally still vvv-only; keep behavior identical.
  if(runtime.account!=='vvv'){
    console.info('[VVV Story Memory Suite] current account is not vvv; standalone core remains idle.');
    runtime.booted=true;return;
  }
  viewport.bind();
  await safeImport('./modules/theater/index.js','theater');
  for(let i=0;i<120&&!globalThis.VVVUnifiedRelay;i++)await new Promise(r=>setTimeout(r,50));
  runtime.modules.relay=!!globalThis.VVVUnifiedRelay;
  try{await initAuthorQa({events,overlays,toast,getContext:stContext});runtime.modules.authorQa=true;}catch(e){console.error('[VVV Story Memory] author QA init failed',e);}
  events.bindPending();runtime.booted=true;
  console.info('[VVV Story Memory Suite] ready',JSON.parse(JSON.stringify(runtime)));
})();

// Single interceptor entry. Author QA only changes the one marked round; 0-32 keeps
// its original interception for all normal rounds.
globalThis.vvvStoryMemoryInterceptor=async function(chat,contextSize,abort,type){
  await bootPromise;if(runtime.account!=='vvv'||!Array.isArray(chat))return;
  try{if(isAuthorQaRequest(chat))injectAuthorQaPrompt(chat);}catch(e){console.error('[VVV Story Memory] author QA interceptor failed',e);}
  try{if(typeof globalThis.vvvTheaterMemoryInterceptor==='function')await globalThis.vvvTheaterMemoryInterceptor(chat,contextSize,abort,type);}catch(e){console.error('[VVV Story Memory] theater interceptor failed',e);}
};

globalThis.VVVStoryMemorySuite={version:VERSION,build:BUILD,runtime,boot:()=>bootPromise,openMemory:()=>globalThis.openVVVTheaterMemory?.(),openRelay:()=>globalThis.VVVUnifiedRelay?.open?.(),openAuthorQa:()=>globalThis.VVVStoryMemoryAuthorQa?.open?.()};
})();
