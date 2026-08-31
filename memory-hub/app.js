const API='/api/plugins/vvv-theater-memory-server';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={archives:[],selected:null,data:null,tab:'overview',results:[],deleteRefs:new Map(),deleteSeq:0,archiveSelections:new Set(),csrfToken:''};

async function get(path){
  const r=await fetch(`${API}${path}`,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok===false)throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}
function headerHas(headers,name){return Object.keys(headers||{}).some(k=>k.toLowerCase()===String(name||'').toLowerCase())}
function extractHtmlError(text=''){
  const raw=String(text||'');
  const pre=raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1]||'';
  const strip=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  return strip(pre)||strip(raw).slice(0,500);
}
function externalRequestHeaders(){
  const roots=[];
  try{if(window.opener&&window.opener!==window)roots.push(window.opener)}catch{}
  try{if(window.parent&&window.parent!==window)roots.push(window.parent)}catch{}
  roots.push(window);
  for(const root of roots){
    try{
      const ctx=root?.SillyTavern?.getContext?.()||root?.SillyTavern?.context||null;
      const fn=ctx?.getRequestHeaders||root?.getRequestHeaders;
      if(typeof fn==='function')return {...fn.call(ctx||root)};
    }catch{}
  }
  return {};
}
async function requestMutationHeaders(forceFresh=false){
  let headers={'Content-Type':'application/json','Accept':'application/json'};
  const external=externalRequestHeaders();
  if(Object.keys(external).length)headers={...external,...headers};
  if(!forceFresh&&!headerHas(headers,'X-CSRF-Token')&&!headerHas(headers,'X-CSRF-TOKEN')){
    try{
      const mod=await import('/script.js');
      if(typeof mod.getRequestHeaders==='function')headers={...mod.getRequestHeaders(),...headers};
    }catch{}
  }
  // Memory Hub can be opened as a standalone same-origin page. In that case it
  // has no SillyTavern JS context, so fetch a token bound to the current session
  // directly from SillyTavern instead of submitting a stale/empty header.
  if(forceFresh||(!headerHas(headers,'X-CSRF-Token')&&!headerHas(headers,'X-CSRF-TOKEN'))){
    const csrf=await fetch('/csrf-token',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    const data=await csrf.json().catch(()=>({}));
    if(!csrf.ok||!data?.token)throw new Error(data?.error||`无法刷新 CSRF token（HTTP ${csrf.status}）`);
    state.csrfToken=String(data.token);
    headers['X-CSRF-Token']=state.csrfToken;
  }
  return headers;
}
async function mutationAttempt(path,method,body,forceFresh=false){
  const headers=await requestMutationHeaders(forceFresh);
  const r=await fetch(`${API}${path}`,{method,credentials:'same-origin',cache:'no-store',headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let j={};
  try{j=text?JSON.parse(text):{}}catch{j={error:extractHtmlError(text)}}
  return {r,j,text};
}
async function mutation(path,method,body){
  let result=await mutationAttempt(path,method,body,false);
  const csrfRejected=result.r.status===403&&/csrf|forbidden/i.test(`${result.j?.error||''} ${result.j?.message||''} ${result.text||''}`);
  if(csrfRejected)result=await mutationAttempt(path,method,body,true);
  if(!result.r.ok||result.j.ok===false)throw new Error(result.j.error||result.j.message||extractHtmlError(result.text)||`HTTP ${result.r.status}`);
  return result.j;
}
function date(v){if(!v)return '时间未记录';const d=new Date(Number(v));return Number.isFinite(d.getTime())?d.toLocaleString('zh-CN',{hour12:false}):String(v)}
function daypart(time=''){const m=String(time).match(/(?:^|\D)([01]?\d|2[0-3])\s*(?::|：|点|时)/);if(!m)return '';const h=Number(m[1]);if(h<=4)return '凌晨';if(h<=8)return '早上';if(h<=11)return '上午';if(h<=13)return '中午';if(h<=17)return '下午';if(h<=22)return '晚上';return '深夜'}
function storyParse(value=''){
  const text=String(value||'').trim();let year='',month='',day='',time='';
  const full=[...text.matchAll(/\b((?:1[0-9]\d{2}|20\d{2}|21\d{2}))[-\/.年]\s*(1[0-2]|0?[1-9])(?:[-\/.月]\s*(3[01]|[12]\d|0?[1-9]))?/g)].at(-1);
  if(full){year=full[1]||'';month=String(Number(full[2]||0)||'');day=String(Number(full[3]||0)||'')}
  if(!month||!day){const md=[...text.matchAll(/(?:^|\D)(1[0-2]|0?[1-9])\s*(?:月|[-\/.])\s*(3[01]|[12]\d|0?[1-9])\s*(?:日|号)?/g)].at(-1);if(md){month=String(Number(md[1]));day=String(Number(md[2]))}}
  const c=[...text.matchAll(/(?:^|\D)([01]?\d|2[0-3])\s*(?::|：|点|时)\s*([0-5]?\d)?\s*(?:分)?/g)].at(-1);if(c)time=`${String(Number(c[1])).padStart(2,'0')}:${String(Number(c[2]||0)).padStart(2,'0')}`;
  return {year,month,day,time};
}
function storyMerge(a={},b={}){return {year:a.year||b.year||'',month:a.month||b.month||'',day:a.day||b.day||'',time:a.time||b.time||''}}
function storyLabel(parts={}){const d=parts.month&&parts.day?(parts.year?`${parts.year}年${parts.month}月${parts.day}日`:`${parts.month}月${parts.day}日`):'';return [d,parts.time?daypart(parts.time):'',parts.time||''].filter(Boolean).join(' ')||'时间未记录'}
function floorStory(floor){const n=Number(floor),rows=state.data?.view?.mainline||[];if(!Number.isFinite(n))return {};const candidates=rows.filter(r=>Number(r['楼层']??r._sourceFloor)<=n).sort((a,b)=>Number(b['楼层']??b._sourceFloor)-Number(a['楼层']??a._sourceFloor));const row=candidates[0];return row?storyParse(`${row['日期']||''} ${row['开始时间']||''}`):{}}
function story(row){const own=storyParse([row?.['日期']||row?.date||'',row?.['开始时间']||row?.time||row?.storyTime||row?._recordedStoryTime||''].filter(Boolean).join(' '));const fallback=floorStory(row?.['楼层']??row?._sourceFloor??row?.floor??row?.sourceFloor);return storyLabel(storyMerge(own,fallback))}
function orderItems(row){const items=Array.isArray(row?.items)?row.items:[];return items.map(x=>`${x.name||x.title||x.itemName||'商品'}${x.spec||x.variant?`（${x.spec||x.variant}）`:''} ×${x.quantity||x.qty||1}`).join('；')||row?.itemSummary||row?.summary||'商品未记录'}
function snippet(value,max=520){const raw=String(value??'').replace(/\s+/g,' ').trim();if(raw.length<=max)return raw;return `${raw.slice(0,Math.max(0,max-1))}…`}
function setStatus(text){$('#content').innerHTML=`<div class="empty big">${esc(text)}</div>`}
function resetHubViewport({sidebar=false}={}){
  const apply=()=>{
    try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch{try{window.scrollTo(0,0)}catch{}}
    try{document.documentElement.scrollTop=0}catch{}
    try{document.body.scrollTop=0}catch{}
    const main=document.querySelector('.hub-main');if(main)main.scrollTop=0;
    const content=document.querySelector('#content');if(content)content.scrollTop=0;
    if(sidebar){const list=document.querySelector('#archive-list');if(list)list.scrollTop=0}
  };
  apply();
  requestAnimationFrame(()=>requestAnimationFrame(apply));
}
try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch{}

async function loadArchives(){
  try{
    const j=await get('/hub/characters');state.archives=j.archives||[];renderArchives();
    if(state.selected){const same=state.archives.find(a=>a.archiveId===state.selected.archiveId&&a.characterKey===state.selected.characterKey);if(same)await selectArchive(same);else state.selected=null}
    if(!state.selected&&state.archives[0])await selectArchive(state.archives[0]);
    if(!state.archives.length){state.selected=null;state.data=null;$('#archive-title').textContent='暂无永久档案';$('#archive-subtitle').textContent='继续在酒馆中运行 0-32 后会自动建立档案';setStatus('没有可显示的永久档案。')}
  }catch(e){setStatus(`Memory Hub 无法读取永久档案：${e.message}`)}
}
function archiveKey(a){return `${String(a?.characterKey||'')}\u0000${String(a?.archiveId||'')}`}
function archiveRowsFiltered(){const q=$('#archive-filter').value.trim().toLowerCase();return state.archives.filter(a=>!q||`${a.characterName} ${a.chatName}`.toLowerCase().includes(q))}
function updateArchiveBulkBar(){
  const count=state.archiveSelections.size;
  const label=$('#archive-selected-count');if(label)label.textContent=count?`已选 ${count} 个`:'未选择';
  const button=$('#archive-bulk-delete');if(button){button.disabled=!count;button.textContent=count?`批量删除 ${count}`:'批量删除'}
}
function toggleArchiveSelection(a,checked){const key=archiveKey(a);if(checked)state.archiveSelections.add(key);else state.archiveSelections.delete(key);updateArchiveBulkBar()}
function selectVisibleArchives(){for(const a of archiveRowsFiltered())state.archiveSelections.add(archiveKey(a));renderArchives()}
function clearArchiveSelections(){state.archiveSelections.clear();renderArchives()}
function renderArchives(){
  const rows=archiveRowsFiltered();
  // Drop selections that no longer exist after a refresh.
  const live=new Set(state.archives.map(archiveKey));for(const key of [...state.archiveSelections])if(!live.has(key))state.archiveSelections.delete(key);
  $('#archive-list').innerHTML=rows.length?rows.map(a=>`<div class="archive-row ${state.selected?.archiveId===a.archiveId?'active':''}"><label class="archive-select" title="加入批量删除"><input type="checkbox" data-archive-select="${esc(a.archiveId)}" data-character="${esc(a.characterKey)}" ${state.archiveSelections.has(archiveKey(a))?'checked':''}><span></span></label><button class="archive ${state.selected?.archiveId===a.archiveId?'active':''}" data-archive="${esc(a.archiveId)}" data-character="${esc(a.characterKey)}"><b>${esc(a.characterName||'未命名角色')}</b><small>${esc(a.chatName||'未命名聊天')} · ${date(a.updatedAt)}</small></button><button class="archive-trash" data-archive-delete="${esc(a.archiveId)}" data-character="${esc(a.characterKey)}" title="删除这个档案">🗑</button></div>`).join(''):'<div class="empty">没有匹配档案</div>';
  document.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>selectArchive(state.archives.find(a=>a.archiveId===b.dataset.archive&&a.characterKey===b.dataset.character)));
  document.querySelectorAll('[data-archive-select]').forEach(b=>b.onchange=()=>{const a=state.archives.find(x=>x.archiveId===b.dataset.archiveSelect&&x.characterKey===b.dataset.character);if(a)toggleArchiveSelection(a,b.checked)});
  document.querySelectorAll('[data-archive-delete]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const a=state.archives.find(x=>x.archiveId===b.dataset.archiveDelete&&x.characterKey===b.dataset.character);if(a)await deleteArchive(a)});
  updateArchiveBulkBar();
}
async function bulkDeleteArchives(){
  const selected=state.archives.filter(a=>state.archiveSelections.has(archiveKey(a)));
  if(!selected.length)return;
  const preview=selected.slice(0,8).map(a=>`• ${a.characterName||'未命名角色'} / ${a.chatName||'未命名聊天'}`).join('\n');
  if(!confirm(`确认批量删除 ${selected.length} 个永久档案？\n\n${preview}${selected.length>8?`\n…另外 ${selected.length-8} 个`:''}\n\n这些档案会移入服务端 hub-trash 回收区，不会直接物理销毁。`))return;
  const btn=$('#archive-bulk-delete');if(btn){btn.disabled=true;btn.textContent='正在删除…'}
  try{
    const result=await mutation('/hub/archive/bulk-delete','POST',{archives:selected.map(a=>({characterKey:a.characterKey,archiveId:a.archiveId}))});
    const deletedKeys=new Set((result.deleted||[]).map(x=>`${x.characterKey}\u0000${x.archiveId}`));
    if(state.selected&&deletedKeys.has(archiveKey(state.selected))){state.selected=null;state.data=null}
    state.archiveSelections.clear();
    await loadArchives();
    resetHubViewport();
    if((result.errors||[]).length)alert(`已删除 ${result.deleted?.length||0} 个；另有 ${result.errors.length} 个失败。\n\n${result.errors.slice(0,6).map(x=>x.error).join('\n')}`);
  }catch(e){alert(`批量删除失败：${e.message}`)}finally{updateArchiveBulkBar()}
}
async function selectArchive(a,{resetScroll=true}={}){if(!a)return;state.selected=a;renderArchives();setStatus('正在载入永久记忆…');if(resetScroll)resetHubViewport();try{const q=new URLSearchParams({characterKey:a.characterKey,archiveId:a.archiveId});state.data=await get(`/hub/archive?${q}`);$('#archive-title').textContent=a.characterName||'未命名角色';$('#archive-subtitle').textContent=`${a.chatName||'未命名聊天'} · 最后保存 ${date(a.updatedAt)}`;renderStats();render();if(resetScroll)resetHubViewport()}catch(e){setStatus(e.message);if(resetScroll)resetHubViewport()}}
function renderStats(){const v=state.data?.view||{};const rows=[['时间线',v.mainline?.length||0],['待约定',(v.promises||[]).filter(x=>!/已兑现|已完成|取消/.test(x['状态']||'')).length],['人物',v.people?.length||0],['关系',v.relations?.length||0],['原子记忆',(v.anchors?.length||0)+(v.episodeFacts?.length||0)+(v.lifeFacts?.length||0)],['手机订单',v.orders?.length||0]];$('#stats').innerHTML=rows.map(([a,b])=>`<article class="stat"><span>${a}</span><b>${b}</b></article>`).join('')}
function recent(rows,n=8){return (rows||[]).slice(-n).reverse()}
function registerDelete(path,item,label='删除'){if(!path||!item)return '';const id=`d${++state.deleteSeq}`;state.deleteRefs.set(id,{path,item,label});return `<button class="memory-delete" data-hub-delete="${id}" title="从当前永久档案中删除这条记忆">删除</button>`}
async function deleteMemory(ref){if(!state.selected||!ref)return;const title=ref.item?.['事件概要']||ref.item?.['约定内容']||ref.item?.['姓名']||ref.item?.event||ref.item?.fact||ref.item?.storeName||ref.item?.merchant||ref.label||'这条记忆';if(!confirm(`确认删除「${snippet(title,90)}」？\n\n会从当前 Memory Hub 视图和后续召回中移除；删除前的历史快照仍保留。`))return;await mutation('/hub/item','DELETE',{characterKey:state.selected.characterKey,archiveId:state.selected.archiveId,path:ref.path,item:ref.item});await selectArchive(state.selected,{resetScroll:false})}
function bindDeletes(){document.querySelectorAll('[data-hub-delete]').forEach(b=>b.onclick=async()=>{const ref=state.deleteRefs.get(b.dataset.hubDelete);if(!ref)return;b.disabled=true;try{await deleteMemory(ref)}catch(e){alert(`删除失败：${e.message}`)}finally{b.disabled=false}})}
async function deleteArchive(a){if(!confirm(`确认删除整个档案？\n\n角色：${a.characterName||'未命名角色'}\n聊天：${a.chatName||'未命名聊天'}\n\n档案会移入服务端回收区；如果这是当前正在玩的聊天，0-32 后续保存时可能自动建立一个新的空档案。`))return;try{await mutation('/hub/archive','DELETE',{characterKey:a.characterKey,archiveId:a.archiveId});state.archiveSelections.delete(archiveKey(a));if(state.selected?.archiveId===a.archiveId&&state.selected?.characterKey===a.characterKey){state.selected=null;state.data=null}await loadArchives();resetHubViewport()}catch(e){alert(`删除档案失败：${e.message}`)}}

function render(){
  if(!state.data)return;state.deleteRefs.clear();state.deleteSeq=0;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));const v=state.data.view||{};
  if(state.tab==='overview')overview(v);else if(state.tab==='timeline')timeline(v);else if(state.tab==='promises')promises(v);else if(state.tab==='people')people(v);else if(state.tab==='orders')orders(v);else if(state.tab==='facts')facts(v);else if(state.tab==='search')searchResults();
  bindDeletes();
}
function overview(v){const events=recent(v.mainline,6);const ps=recent((v.promises||[]).filter(x=>!/已兑现|已完成|取消/.test(x['状态']||'')),6);$('#content').innerHTML=`<div class="grid"><article class="card"><h3>📍 当前场景</h3><p>${esc(Object.entries(v.scene||{}).filter(([,x])=>x).map(([k,x])=>`${k}: ${x}`).join(' · ')||'未记录')}</p></article><article class="card"><h3>🧠 这个页面现在解决什么</h3><p>永久档案可观察、可搜索，也可以手动删除错误记忆。时间显示统一为“年月日 + 时段 + HH:mm”；后续向量 RAG 和重排序继续接到这里。</p></article></div><h3>最近事件</h3><div class="list">${events.map(r=>eventCard(r,'tables.mainline')).join('')||'<div class="empty">暂无</div>'}</div><h3>待兑现约定</h3><div class="list">${ps.map(r=>promiseCard(r,'tables.promises')).join('')||'<div class="empty">暂无</div>'}</div>`}
function eventCard(r,path='tables.mainline'){return `<article class="row-card"><div><b class="stamp">${esc(story(r))}</b><div class="floor">第 ${esc(r['楼层']??r._sourceFloor??'?')} 层</div></div><div><h3>${esc(snippet(r['事件概要']||'未命名事件',620))}</h3><div class="meta"><span class="pill">${esc(r['状态']||'')}</span></div></div><div class="row-actions"><span>›</span>${registerDelete(path,r)}</div></article>`}
function promiseCard(r,path='tables.promises'){const recorded=storyLabel(storyMerge(storyParse(r._recordedStoryTime||''),floorStory(r['楼层']??r._sourceFloor)));return `<article class="row-card"><div><b class="stamp">记录：${esc(recorded)}</b><div class="floor">第 ${esc(r['楼层']??r._sourceFloor??'?')} 层</div></div><div><h3>${esc(snippet(r['约定内容']||'未命名约定',520))}</h3><p>兑现：${esc(r._due||r['约定时间']||'未定')} · ${esc(r['核心角色']||'')}</p></div><div class="row-actions"><span class="pill good">${esc(r['状态']||'待兑现')}</span>${registerDelete(path,r)}</div></article>`}
function timeline(v){$('#content').innerHTML=`<div class="list">${(v.mainline||[]).slice().reverse().map(r=>eventCard(r,'tables.mainline')).join('')||'<div class="empty">暂无时间线</div>'}</div>`}
function promises(v){$('#content').innerHTML=`<div class="list">${(v.promises||[]).slice().reverse().map(r=>promiseCard(r,'tables.promises')).join('')||'<div class="empty">暂无约定</div>'}</div>`}
function people(v){const rel=new Map();for(const r of v.relations||[]){for(const n of [r['角色A'],r['角色B']].filter(Boolean)){if(!rel.has(n))rel.set(n,[]);rel.get(n).push(r)}}$('#content').innerHTML=`<div class="grid">${(v.people||[]).map(p=>`<article class="card memory-card"><div class="card-head"><h3>${esc(p['姓名']||'未命名')}</h3>${registerDelete('tables.people',p)}</div><p>${esc(p['身份']||'身份未记录')} · ${esc(p['年龄']||'年龄未知')}</p><p>${esc(snippet(p['性格']||p['备注']||'',460))}</p><div class="meta"><span>${(rel.get(p['姓名'])||[]).length} 条关系</span></div></article>`).join('')||'<div class="empty">暂无人物</div>'}</div><h3>人物关系</h3><div class="list">${(v.relations||[]).map(r=>`<article class="card relation"><div class="node">${esc(r['角色A']||'?')}</div><div><b>${esc(r['关系描述']||'关系未记录')}</b><p>${esc(snippet(r['情感态度']||r._psychologyChange||'',420))}</p></div><div class="relation-end"><div class="node">${esc(r['角色B']||'?')}</div>${registerDelete('tables.relations',r)}</div></article>`).join('')}</div>`}
function orders(v){$('#content').innerHTML=`<div class="list">${(v.orders||[]).map(r=>{const platform=String(r.platform||'');const p=platform?`phone.commerce.${platform}.orders`:'';return `<article class="row-card"><div><b class="stamp">${esc(story(r))}</b><div class="floor">第 ${esc(r.sourceFloor??'?')} 层 · ${esc(platform)}</div></div><div><h3>${esc(r.storeName||r.merchant||'未记录商户')}</h3><p class="order-items">${esc(orderItems(r))}</p><p>实付：${esc(r.amount??'未记录')} · 状态：${esc(r.status||'')}</p></div><div class="row-actions"><span class="pill good">系统真值</span>${p?registerDelete(p,r):''}</div></article>`}).join('')||'<div class="empty">暂无手机订单</div>'}</div>`}
function facts(v){const rows=[...(v.anchors||[]).map(x=>({...x,_t:'核心锚点',_text:x.event||x.details,_time:[x.date,x.time].filter(Boolean).join(' '),_path:'memoryAnchors',_raw:x})),...(v.episodeFacts||[]).map(x=>({...x,_t:'原子事件',_text:x.fact,_time:x.time||'',_path:'episodeFacts',_raw:x})),...(v.lifeFacts||[]).map(x=>({...x,_t:'生活事实',_text:x.fact||`${x.key||x.category}: ${x.value||''}`,_time:x.time||'',_path:'lifeFacts',_raw:x}))].sort((a,b)=>Number(b.floor||0)-Number(a.floor||0));$('#content').innerHTML=`<div class="list">${rows.map(r=>`<article class="row-card"><div><b class="stamp">${esc(storyLabel(storyMerge(storyParse(r._time),floorStory(r.floor))))}</b><div class="floor">第 ${esc(r.floor??'?')} 层</div></div><div><h3>${esc(r._t)}</h3><p>${esc(snippet(r._text||'',560))}</p></div><div class="row-actions"><span class="pill">${esc(r.importance||r.status||'')}</span>${registerDelete(r._path,r._raw)}</div></article>`).join('')||'<div class="empty">暂无原子记忆</div>'}</div>`}
async function runSearch(){if(!state.selected)return;const q=$('#memory-query').value.trim();const p=new URLSearchParams({characterKey:state.selected.characterKey,archiveId:state.selected.archiveId,q,limit:'80'});setStatus('正在检索永久记忆…');try{const j=await get(`/hub/search?${p}`);state.results=j.results||[];state.tab='search';render()}catch(e){setStatus(e.message)}}
function searchResults(){const q=$('#memory-query').value.trim();$('#content').innerHTML=`<div class="meta" style="margin-bottom:10px">${state.results.length} 条命中 · 查询「${esc(q||'最近记忆')}」</div><div class="list">${state.results.map(r=>`<article class="row-card search-hit"><div><b class="stamp">${esc(storyLabel(storyMerge(storyParse(r.storyTime||''),floorStory(r.floor))))}</b><div class="floor">第 ${esc(r.floor??'?')} 层 · ${esc(r.type)}</div></div><div><h3>${esc(r.title)}</h3><p>${esc(snippet(r.text,520))}</p></div><div class="row-actions"><span class="pill">${esc(r.score??'')}</span>${r.deletePath&&r.deleteItem?registerDelete(r.deletePath,r.deleteItem):''}</div></article>`).join('')||'<div class="empty">没有命中</div>'}</div>`}

$('#archive-filter').addEventListener('input',renderArchives);$('#archive-select-visible').onclick=selectVisibleArchives;$('#archive-clear-selection').onclick=clearArchiveSelections;$('#archive-bulk-delete').onclick=bulkDeleteArchives;$('#refresh').onclick=loadArchives;$('#back-st').onclick=()=>{location.href='/'};$('#memory-search').onclick=runSearch;$('#memory-query').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});
loadArchives();
