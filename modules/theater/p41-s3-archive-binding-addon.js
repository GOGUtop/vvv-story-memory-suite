(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));
  let enhanceTimer=0;
  function bridge(){return globalThis.VVVTheaterMemoryBridge||null;}
  const LEGACY_ARCHIVE_STYLE_ID='vvvtm-s5-archive-style';
  function removeLegacyArchiveStyle(){document.getElementById(LEGACY_ARCHIVE_STYLE_ID)?.remove();}
  function downloadJson(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  async function syncNow(button){const b=bridge();if(!b?.syncPermanentArchive)throw new Error('永久档案桥未加载');button&&(button.disabled=true);try{await b.syncPermanentArchive('manual-archive-sync');alert('✅ 当前聊天的0-32全部生成数据已同步到角色卡永久档案。');}finally{button&&(button.disabled=false)}}
  async function exportBundle(button){const b=bridge();if(!b?.exportCurrentCharacterArchives)throw new Error('永久档案桥未加载');button&&(button.disabled=true);try{await b.syncPermanentArchive?.('before-cardvault-export');const d=await b.exportCurrentCharacterArchives();const bundle=d?.bundle||d;const name=String(bundle?.characterName||'角色').replace(/[\\/:*?"<>|]+/g,'_');downloadJson(`${name}_0-32角色卡伴随档案.json`,bundle);alert('✅ 已导出角色卡伴随档案。CardVault可直接保存同一bundle。');}finally{button&&(button.disabled=false)}}
  function panelHtml(){
    const b=bridge(),binding=b?.getArchiveBinding?.()||{},identity=b?.getArchiveIdentity?.()||{};
    const ready=Boolean(binding.archiveId);
    return `<div id="vvvtm-s5-archive-dialog" role="dialog" aria-modal="true" aria-label="0-32永久档案">
      <div class="s5-head"><h3>📁 永久档案 <span class="s5-status ${ready?'s5-ok':'s5-warn'}">${ready?'● 已绑定':'● 正在建立'}</span></h3><button class="s5-close" data-s5-close>×</button></div>
      <p class="s5-note">当前角色卡/聊天产生的记忆、时间线、人物与关系、约定秘密、各级总结、手机、朋友圈、日记、纪念日、彼间私文、人物外观、章节与检索源都保存在这里。S10按“角色卡 + 每个聊天记录”独立永久绑定：新聊天使用新档案，切回旧聊天仍恢复旧档；插件升级/回退只替换代码，普通保存不会自动删除任何历史。</p>
      <div class="s5-info">
        <div><small>角色</small><b>${esc(identity.characterName||'未识别')}</b></div>
        <div><small>当前聊天档案 ID</small><b title="${esc(binding.archiveId||'')}">${esc(binding.archiveId||'建立中…')}</b></div>
        <div><small>宝塔永久目录</small><b title="${esc(binding.relativePath||'')}">${esc(binding.relativePath||'data/vvv/vvv-theater-memory/card-archives/...')}</b></div>
        <div><small>CardVault 桥</small><b>${globalThis.VVVTheaterMemoryBridge?.exportCurrentCharacterArchives?'已就绪':'等待加载'}</b></div>
      </div>
      <div class="s5-actions"><button data-s5-sync>立即同步</button><button data-s5-export>📦 导出CardVault伴随档案</button></div>
    </div>`;
  }
  function ensureTopButton(){
    const actions=document.querySelector('#vvvtm-modal .vvvtm-head-actions');if(!actions)return;
    let btn=document.getElementById('vvvtm-s5-archive-button');
    if(!btn){btn=document.createElement('button');btn.id='vvvtm-s5-archive-button';btn.type='button';btn.textContent='📁 永久档案';btn.title='查看当前角色/聊天绑定的0-32永久档案';const exportBtn=actions.querySelector('[data-action="export"]');if(exportBtn)actions.insertBefore(btn,exportBtn);else actions.appendChild(btn);}
  }
  function ensureOverlay(){
    const modal=document.getElementById('vvvtm-modal');if(!modal)return null;
    let overlay=document.getElementById('vvvtm-s5-archive-overlay');
    if(!overlay){overlay=document.createElement('div');overlay.id='vvvtm-s5-archive-overlay';overlay.hidden=true;modal.appendChild(overlay);}
    return overlay;
  }
  function closePanel(){const overlay=document.getElementById('vvvtm-s5-archive-overlay');if(overlay)overlay.hidden=true;}
  function openPanel(){
    const overlay=ensureOverlay();if(!overlay)return;
    overlay.innerHTML=panelHtml();overlay.hidden=false;
    overlay.querySelector('[data-s5-close]')?.addEventListener('click',closePanel);
    overlay.querySelector('[data-s5-sync]')?.addEventListener('click',async e=>{try{await syncNow(e.currentTarget);openPanel()}catch(err){alert(`同步失败：${err.message}`)}});
    overlay.querySelector('[data-s5-export]')?.addEventListener('click',async e=>{try{await exportBundle(e.currentTarget)}catch(err){alert(`导出失败：${err.message}`)}});
  }
  function removeOverviewCard(){document.getElementById('vvvtm-s3-archive-card')?.remove();}
  function removeOldTakeoverText(){document.querySelectorAll('#vvvtm-content .vvvtm-counter-note').forEach(n=>{if(/旧档安全锁|旧档一键接管/.test(n.textContent||''))n.remove()});}
  function enhance(){removeLegacyArchiveStyle();ensureTopButton();ensureOverlay();removeOverviewCard();removeOldTakeoverText();}

  globalThis.VVVTheaterCardVaultBridge=Object.assign(globalThis.VVVTheaterCardVaultBridge||{}, {
    schema:'vvv-theater-cardvault-bundle-v2',
    async exportForCurrentCharacter(){const b=bridge();await b?.syncPermanentArchive?.('cardvault-bridge-export');const d=await b?.exportCurrentCharacterArchives?.();return d?.bundle||d;},
    async importForCurrentCharacter(bundle){const b=bridge();const d=await b?.importCharacterArchives?.(bundle);return d;},
    getCurrentBinding(){return bridge()?.getArchiveBinding?.()||{};},
  });
  globalThis.dispatchEvent?.(new CustomEvent('vvv-theater-cardvault-bridge-ready',{detail:{schema:'vvv-theater-cardvault-bundle-v2'}}));

  function scheduleEnhance(delay=40){if(enhanceTimer)clearTimeout(enhanceTimer);enhanceTimer=setTimeout(()=>{enhanceTimer=0;enhance();},delay);}
  function start(){enhance();globalThis.addEventListener('vvvtm-ui-ready',()=>scheduleEnhance(0));globalThis.addEventListener('vvvtm-content-rendered',()=>scheduleEnhance(0));document.addEventListener('click',e=>{if(e.target.closest?.('#vvvtm-s5-archive-button')){e.preventDefault();e.stopPropagation();openPanel();return;}if(e.target?.id==='vvvtm-s5-archive-overlay')closePanel();},true);console.info('[0-32·P41-S10] 永久档案顶部按钮 + CardVault桥v2已加载；U1.7改为0-32自有UI事件驱动，无全局DOM观察器。');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
