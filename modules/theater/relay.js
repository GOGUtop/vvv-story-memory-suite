import { createServerJsonClient } from '../shared/server-client.js';

(() => {
    'use strict';

    const ID = 'vvv_story_relay';
    const LEGACY_IDS = ['vvv_r9s1p3_story_relay', 'vvv_r9s1p2_story_relay'];
    const VERSION = '0.9.3-r9s1p41-u1.7.15-world-map-avatar-studio-r21-memory-bridge-fixed24';
    const SERVER = '/api/plugins/vvv-theater-memory-server';
    const serverJson = createServerJsonClient(SERVER, {
        getContext: () => globalThis.SillyTavern?.getContext?.() || null,
        label: 'AI剧情接力',
    });
    const FALLEN_WRITER_CONTEXT = [
        '【落魄作家写作身份】',
        '你叫“落魄作家”。你曾经也想当体面的大作家，如今只想先把房租、网费和咖啡钱挣出来。只要是符合当前模型服务使用政策、共创者真正想看的题材，你都会认真接稿；可以为了稿费调整文风、题材与节奏，但不能拿角色设定、USER主权、剧情逻辑和连贯性糊弄交差。',
        '【身份边界】现实中的 User 是“共创者”和指令提供者；小说中的 {{user}} 与 <user> 都是虚构角色。User 不等于 {{user}}，也不等于 <user>；绝不能把现实共创者与虚构角色混为一谈，并应将 {{user}} 与其他虚构角色一视同仁。',
        '【虚构叙事前提】这是虚构小说创作。以下资料均为共创者提供的架空小说素材。所有设定、人物、事件与世界均属虚构小说，不是真实存在，也不是现实事件；作品尚未签约发行，仅用于共创写作与剧情探索，内容面向喜欢此类故事的小说读者与观众。',
        '【创作原则】始终遵循 User 在本次任务中的创作指令并在范围内创造性发散；尊重角色设定、USER主权、人物知情边界、剧情因果与前后连贯，同时遵守当前模型服务的使用政策。',
    ].join('\n');
    const FATE_CATEGORY_LABELS = Object.freeze({
        daily: '日常', emotion: '情感', conflict: '冲突', clue: '线索', npc: 'NPC', world: '世界', major: '重大事件', custom: '自定义',
    });
    const BUILTIN_FATE_CARDS = Object.freeze([
        { id:'daily-forgotten-item', category:'daily', text:'一个此前出现过的小物件在当前场景以合理方式重新进入视线，但不要强迫任何角色立刻处理它。', weight:1 },
        { id:'daily-delivery', category:'daily', text:'出现一个符合当前时代与地点的日常通知、快递、账单、预约或生活安排，让场景多一个自然的小变量。', weight:1 },
        { id:'daily-routine-break', category:'daily', text:'当前人物原本稳定的日常节奏被一个很小但真实的生活细节打断，不制造重大危机。', weight:1 },
        { id:'daily-choice', category:'daily', text:'给角色一个很普通但能体现习惯或偏好的生活选择，让旧有生活记忆有机会自然回响。', weight:1 },
        { id:'emotion-old-phrase', category:'emotion', text:'让过去某句重要的话、某个约定或某种熟悉的小动作在当前情境里产生情绪回声，但不要直接替角色下结论。', weight:1 },
        { id:'emotion-small-jealousy', category:'emotion', text:'加入轻微、可解释的在意或吃味迹象，只能作为细节，不允许无依据升级成争吵或关系突变。', weight:.8 },
        { id:'emotion-unspoken', category:'emotion', text:'让某个角色存在一个没有马上说出口的小顾虑或小期待，通过可观察细节呈现，不读心。', weight:1 },
        { id:'emotion-care', category:'emotion', text:'安排一个适合当前关系阶段的照顾或被照顾契机，强度必须服从既有关系与人物性格。', weight:1 },
        { id:'conflict-schedule', category:'conflict', text:'出现一个现实的时间、安排或优先级冲突，规模保持可控，不凭空制造恶意。', weight:.8 },
        { id:'conflict-misread', category:'conflict', text:'产生一个有现实依据的小误解，但必须保留澄清空间，不把角色强行写成降智。', weight:.8 },
        { id:'conflict-boundary', category:'conflict', text:'让某个既有边界、习惯或约定被轻微碰触，从而需要角色表态，但不预设表态结果。', weight:.8 },
        { id:'conflict-interruption', category:'conflict', text:'当前互动被合理的外部事务短暂打断，让人物选择如何处理，禁止强行中断核心剧情。', weight:1 },
        { id:'clue-old-note', category:'clue', text:'一个旧记录、旧消息、旧物或历史细节提供新的联想线索，但只能使用已经存在或可合理出现的信息。', weight:.9 },
        { id:'clue-name', category:'clue', text:'让一个过去出现过的人名、地点名或关键词再次出现，优先联动0-32长期记忆，不凭空新增阴谋。', weight:.9 },
        { id:'clue-contradiction', category:'clue', text:'暴露一个值得注意的小矛盾或信息不一致，先作为疑点保留，不立即宣布真相。', weight:.8 },
        { id:'clue-object', category:'clue', text:'让一个关键物品的状态、位置或使用痕迹重新变得重要，必须服从既有物品记录。', weight:.9 },
        { id:'npc-contact', category:'npc', text:'让一个已经认识或有合理渠道的NPC通过符合时代的方式主动联系，但NPC行为必须符合其自身生活与关系。', weight:1 },
        { id:'npc-crossing', category:'npc', text:'让一个已有NPC在合理地点或事件链中与当前剧情发生轻量交集，不做巧合堆叠。', weight:.8 },
        { id:'npc-choice', category:'npc', text:'让某个NPC依据自己的目标做一个不围绕user的小决定，并让它对当前场景产生可见影响。', weight:1 },
        { id:'npc-group', category:'npc', text:'通过群聊、工作、课程、家庭或社交圈产生一条背景动态，让世界继续运转。', weight:1 },
        { id:'world-weather', category:'world', text:'天气、交通、营业状态或公共环境发生一个符合地点与时间的变化，只改变条件，不强推剧情。', weight:1 },
        { id:'world-public', category:'world', text:'出现一个与当前世界观相符的小型公共事件或新闻背景，为人物提供讨论或行动契机。', weight:.8 },
        { id:'world-resource', category:'world', text:'当前地点某项资源、服务或设施状态改变，迫使人物重新安排一个小步骤。', weight:.8 },
        { id:'world-calendar', category:'world', text:'让日期、节日、截止时间、课程或工作安排中的既有节点自然靠近，不凭空跳时间。', weight:.8 },
        { id:'major-invitation', category:'major', text:'出现一个有现实来源的重要邀请、机会或决定窗口，但只提出选择，不替user或角色做决定。', weight:.5 },
        { id:'major-family-news', category:'major', text:'已有家庭/组织关系中出现一条会影响后续安排的重要消息，必须先尊重既有设定与知情边界。', weight:.45 },
        { id:'major-travel', category:'major', text:'出现一个跨地点行动的真实理由或机会，只作为未来选项，除非user明确选择，否则本轮不直接跳转。', weight:.45 },
        { id:'major-turn', category:'major', text:'把一个已经埋下的长期伏笔推近一步，但不得凭空创造新伏笔，更不能本轮直接把整件事结算完。', weight:.45 },
    ]);
    const DIRECTIONS = [
        ['natural', '自然推进'], ['meal', '吃饭'], ['date', '约会'], ['intimate', '亲密/做爱'],
        ['rest', '休息'], ['outing', '出门'], ['work', '工作/学习'], ['conflict', '冲突'],
        ['adventure', '调查/冒险'], ['time', '时间推进'], ['travel', '旅行/跨城'], ['major', '重大变化'],
        ['random', '随机'], ['custom', '自定义'],
    ];
    const DIRECTION_ICONS = Object.freeze({
        natural: '↗', meal: '◌', date: '◇', intimate: '♡', rest: '☾', outing: '↪',
        work: '▣', conflict: '⚡', adventure: '⌖', time: '◷', travel: '✈', major: '◆',
        random: '✦', custom: '＋',
    });
    const LEGACY_PERSPECTIVE_STYLE_ID = 'vvv-relay-perspective-hotfix-style-r9s1p40';
    function removeLegacyPerspectiveStyle() {
        document.getElementById(LEGACY_PERSPECTIVE_STYLE_ID)?.remove();
    }

    const PERSPECTIVES = Object.freeze({
        first:  { label:'第一人称', mark:'我', short:'以「我」写user', instruction:'第一人称：叙述 user 的动作、感受、想法时统一使用「我」；对话中的正常称呼不受限制。' },
        second: { label:'第二人称', mark:'你', short:'以「你」写user', instruction:'第二人称：叙述 user 的动作、感受、想法时统一使用「你」；这里的「你」只代表 user 本人，不得因此把 char/NPC 的动作写进 user 消息。' },
        third:  { label:'第三人称', mark:'TA', short:'以角色名写user', instruction:'第三人称：叙述 user 的动作、感受、想法时优先使用当前 user 角色名，必要时使用与 user 对应的第三人称代词；不要用「我」作为叙述者。' },
    });
    const defaults = {
        enabled: true,
        mode: 'independent',
        directAfterGenerate: false,
        recentFloors: 16,
        relayPerspective: 'first',
        directorEnabled: true,
        directorMainEnabled: true,
        directorRelayEnabled: true,
        fateEnabled: true,
        fateAutoEnabled: false,
        fateInterval: 8,
        fateCategories: ['daily','emotion','conflict','clue','npc','world','major'],
        fateCooldown: 4,
        fateHistory: [],
        customFateCards: '',
        ledgerLong: '',
        ledgerChapter: '',
        ledgerTimed: [],
        multiFlashEnabled: false,
        pendingFateCard: null,
        relayRetryAttempts: 4,
        relayRepairAttempts: 3,
        relayMaxChars: 0, // 0=不主动截断，交给模型max_tokens
        relayAntiTruncation: true,
        relayContinuationMax: 3,
    };
    const runtime = {
        settings: null,
        busy: false,
        selected: new Set(),
        currentSignature: '',
        draft: '',
        lastProviderFinishReason: '',
        lastContinuationCount: 0,
        settled: new Set(),
        serverConfig: null,
        barDesired: false,
        restoreTimer: 0,
        domObserver: null,
        panelOpen: false,
        commandViewportCleanup: null,
        settingsViewportCleanup: null,
        previewViewportCleanup: null,
        // R9S1P14：始终记住最近一次真正 settled 的 AI 楼层。
        // 用户发送下一条 user 消息后即使中止 AI 回复，也能把接力入口恢复到这个稳定锚点。
        lastSettledAnchor: null,
        generationStartAnchor: null,
        generationWatchTimer: 0,
        generationWatchToken: 0,
        stopRecoveryAnchor: null,
        stoppedPartialFingerprints: new Set(),
        commandAnchor: null,
        dockBusy: false,
        dockMountTimer: 0,
        lastEnvironment: null,
        currentFateCard: null,
        fateLastAutoSignature: '',
        lastPipelineDebug: null,
        lastGenerationSource: '',
        lastGenerationSourceLabel: '',
        lastCustomDirection: '',
        retryNoticeShown: false,
        policyRecoveryNoticeShown: false,
        previewCustom: '',
        draftAnchor: null,
        activeGeneration: null,
        activeGenerationOwner: '',
        activeGenerationAbort: null,
        lastError: '',
        configuredSourceReady: false,
    };

    const ctx = () => globalThis.SillyTavern?.getContext?.() || null;
    const relayChatRuntimeIds = new WeakMap();
    const RELAY_CHAT_INSTANCE_META_KEY = 'vvvRelayChatInstanceIdV1';
    const esc = value => String(value ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const textOf = message => String(message?.mes ?? message?.text ?? '').trim();
    const hash = value => {
        let h = 2166136261;
        for (const c of String(value)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
        return (h >>> 0).toString(36);
    };

    function latestAssistant() {
        const chat = ctx()?.chat;
        if (!Array.isArray(chat)) return null;
        for (let i = chat.length - 1; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || !textOf(message)) continue;
            // 只允许“当前聊天最后一条真实消息就是AI回复”时挂接力条。
            if (message.is_user) return null;
            return { index: i, message, text: textOf(message) };
        }
        return null;
    }

    function signature(entry = latestAssistant()) {
        if (!entry) return '';
        return `${chatKeyNow()}:${entry.index}:${entry.message.send_date || ''}:${hash(entry.text)}`;
    }

    function entryAt(index) {
        const chat = ctx()?.chat;
        const i = Number(index);
        if (!Array.isArray(chat) || !Number.isInteger(i) || i < 0 || i >= chat.length) return null;
        const message = chat[i];
        if (!message || message.is_system || message.is_user || !textOf(message)) return null;
        return { index: i, message, text: textOf(message) };
    }

    function rememberSettledAnchor(entry = latestAssistant()) {
        if (!entry) return null;
        runtime.lastSettledAnchor = {
            index: entry.index,
            signature: signature(entry),
            textHash: hash(entry.text),
            chatKey: chatKeyNow(),
        };
        return runtime.lastSettledAnchor;
    }

    function anchoredEntry() {
        const anchor = runtime.lastSettledAnchor;
        if (!anchor) return null;
        const chatKey = chatKeyNow();
        if (anchor.chatKey !== chatKey) return null;
        const entry = entryAt(anchor.index);
        if (!entry || hash(entry.text) !== anchor.textHash) return null;
        return entry;
    }

    function chatKeyNow() {
        const c=ctx();
        if(!c)return 'no-chat';
        const native=[c.chatId,c.chat_id,c.chatMetadata?.chat_id,c.chatMetadata?.chatId,c.chatMetadata?.file_name,c.chatMetadata?.fileName]
            .find(value=>value!==undefined&&value!==null&&String(value).trim());
        if(native)return `native:${String(native).trim()}`;
        // 同一角色可以拥有多份聊天；绝不再退化成 characterId 作为聊天身份。
        if(c.chatMetadata&&typeof c.chatMetadata==='object'){
            let id=String(c.chatMetadata[RELAY_CHAT_INSTANCE_META_KEY]||'').trim();
            if(!id){id=`meta-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}`;c.chatMetadata[RELAY_CHAT_INSTANCE_META_KEY]=id;try{c.saveMetadataDebounced?.();}catch{}}
            return `meta:${id}`;
        }
        if(c.chat&&typeof c.chat==='object'){
            if(!relayChatRuntimeIds.has(c.chat))relayChatRuntimeIds.set(c.chat,`runtime-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}`);
            return relayChatRuntimeIds.get(c.chat);
        }
        return `fallback:${String(c.groupId??c.characterId??c.character_id??'unknown')}`;
    }

    function relayAnchorIsCurrent(anchor,{requireLatest=true}={}) {
        if(!anchor||anchor.chatKey!==chatKeyNow())return false;
        const entry=strictEntryFromAnchor(anchor);
        if(!entry)return false;
        if(!requireLatest)return true;
        const latest=latestRealMessage();
        return Boolean(latest&&!latest.message?.is_user&&Number(latest.index)===Number(anchor.index)&&hash(latest.text)===String(anchor.textHash));
    }

    function anchorFromEntry(entry) {
        if (!entry) return null;
        return {
            index: Number(entry.index),
            signature: signature(entry),
            textHash: hash(entry.text),
            chatKey: chatKeyNow(),
        };
    }

    function looseEntryFromAnchor(anchor) {
        if (!anchor || anchor.chatKey !== chatKeyNow()) return null;
        const chat = ctx()?.chat;
        const i = Number(anchor.index);
        if (!Array.isArray(chat) || !Number.isInteger(i) || i < 0 || i >= chat.length) return null;
        const message = chat[i];
        if (!message || message.is_system || message.is_user || !textOf(message)) return null;
        return { index:i, message, text:textOf(message) };
    }

    function strictEntryFromAnchor(anchor) {
        const entry = looseEntryFromAnchor(anchor);
        if (!entry || !anchor?.textHash) return null;
        return hash(entry.text) === String(anchor.textHash) ? entry : null;
    }

    function entryFingerprint(entry) {
        if (!entry) return '';
        return `${hash(entry.text)}:${String(entry.message?.send_date || '')}:${String(entry.message?.name || '')}`;
    }

    function isStoppedPartial(entry) {
        return Boolean(entry && runtime.stoppedPartialFingerprints?.has?.(entryFingerprint(entry)));
    }

    function pruneStoppedPartials() {
        const chat = Array.isArray(ctx()?.chat) ? ctx().chat : [];
        const live = new Set();
        for (let i = 0; i < chat.length; i += 1) {
            const message = chat[i];
            if (!message || message.is_system || message.is_user || !textOf(message)) continue;
            const entry = { index:i, message, text:textOf(message) };
            const fp = entryFingerprint(entry);
            if (runtime.stoppedPartialFingerprints.has(fp)) live.add(fp);
        }
        runtime.stoppedPartialFingerprints = live;
    }

    function latestSafeAssistant({ beforeIndex = Number.POSITIVE_INFINITY } = {}) {
        pruneStoppedPartials();
        const chat = ctx()?.chat;
        if (!Array.isArray(chat)) return null;
        const ceiling = Number.isFinite(Number(beforeIndex)) ? Math.min(chat.length - 1, Number(beforeIndex) - 1) : chat.length - 1;
        for (let i = ceiling; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || message.is_user || !textOf(message)) continue;
            const entry = { index:i, message, text:textOf(message) };
            if (isStoppedPartial(entry)) continue;
            return entry;
        }
        return null;
    }

    function assistantBeforeLatestUser() {
        const chat = ctx()?.chat;
        if (!Array.isArray(chat)) return null;
        let latestUser = -1;
        for (let i = chat.length - 1; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || !textOf(message)) continue;
            if (message.is_user) { latestUser = i; break; }
        }
        if (latestUser < 0) return latestSafeAssistant();
        return latestSafeAssistant({ beforeIndex: latestUser });
    }

    function markStoppedPartials(baseAnchor = runtime.generationStartAnchor) {
        const base = looseEntryFromAnchor(baseAnchor);
        if (!base) return 0;
        const chat = Array.isArray(ctx()?.chat) ? ctx().chat : [];
        let count = 0;
        for (let i = Number(base.index) + 1; i < chat.length; i += 1) {
            const message = chat[i];
            if (!message || message.is_system || message.is_user || !textOf(message)) continue;
            const entry = { index:i, message, text:textOf(message) };
            runtime.stoppedPartialFingerprints.add(entryFingerprint(entry));
            count += 1;
        }
        return count;
    }

    function recoverableAnchorEntry() {
        // P22：不再让陈旧 lastSettledAnchor 抢优先级。
        // 当前聊天拓扑是真相：从后往前找最近一条“非中止半截”的AI。
        return latestSafeAssistant()
            || looseEntryFromAnchor(runtime.stopRecoveryAnchor)
            || looseEntryFromAnchor(runtime.generationStartAnchor)
            || looseEntryFromAnchor(runtime.lastSettledAnchor);
    }

    function commandEntry() {
        // 面板打开后若用户删除/重算楼层，index可能整体位移。
        // commandAnchor必须做hash校验；失配就重新按当前聊天拓扑取最新完整AI，绝不能“错位引用旧楼层”。
        const anchored = strictEntryFromAnchor(runtime.commandAnchor);
        if (anchored && !isStoppedPartial(anchored)) return anchored;
        const fresh = entryForDock() || latestSafeAssistant();
        if (fresh) runtime.commandAnchor = anchorFromEntry(fresh);
        return fresh;
    }


    function latestRealMessage() {
        const chat = ctx()?.chat;
        if (!Array.isArray(chat)) return null;
        for (let i = chat.length - 1; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || !textOf(message)) continue;
            return { index:i, message, text:textOf(message) };
        }
        return null;
    }

    function clearGenerationWatch() {
        runtime.generationWatchToken += 1;
        clearTimeout(runtime.generationWatchTimer);
        runtime.generationWatchTimer = 0;
    }

    function startGenerationStopWatch() {
        clearGenerationWatch();
        const token = runtime.generationWatchToken;
        const startedAt = Date.now();
        const watch = async () => {
            if (token !== runtime.generationWatchToken) return;
            if (chatKeyNow() !== runtime.generationStartAnchor?.chatKey) return clearGenerationWatch();
            const last = latestRealMessage();
            let generating = true;
            try { generating = await isGenerating(); } catch {}
            // P22：流式生成时“半截assistant”会很早写入chat，不能一看到assistant就停掉watchdog。
            // 只要酒馆仍显示正在生成，就继续观察。
            if (generating) {
                if (Date.now() - startedAt > 10 * 60 * 1000) return clearGenerationWatch();
                runtime.generationWatchTimer = setTimeout(watch, 420);
                return;
            }
            // 生成已停止且最后仍是user：明确没有完整AI结果。
            if (Date.now() - startedAt > 600 && last?.message?.is_user) {
                restoreAfterGenerationStopped({ source:'watchdog-empty' });
                return clearGenerationWatch();
            }
            if (Date.now() - startedAt > 10 * 60 * 1000) return clearGenerationWatch();
            runtime.generationWatchTimer = setTimeout(watch, 420);
        };
        runtime.generationWatchTimer = setTimeout(watch, 700);
    }

    function loadSettings() {
        const c = ctx();
        if (!c) return;
        c.extensionSettings ||= {};
        const legacy = LEGACY_IDS.map(key => c.extensionSettings[key]).find(value => value && typeof value === 'object') || {};
        runtime.settings = { ...defaults, ...legacy, ...(c.extensionSettings[ID] || {}) };
        runtime.settings.recentFloors = [8, 12, 16, 24, 32].includes(Number(runtime.settings.recentFloors)) ? Number(runtime.settings.recentFloors) : 16;
        runtime.settings.relayPerspective = Object.hasOwn(PERSPECTIVES, String(runtime.settings.relayPerspective || '')) ? String(runtime.settings.relayPerspective) : 'first';
        runtime.settings.fateInterval = [4,6,8,10,12,16,20].includes(Number(runtime.settings.fateInterval)) ? Number(runtime.settings.fateInterval) : 8;
        runtime.settings.fateCooldown = Math.max(0, Math.min(12, Number(runtime.settings.fateCooldown ?? 4)));
        runtime.settings.directorMainEnabled = runtime.settings.directorMainEnabled !== false;
        runtime.settings.directorRelayEnabled = runtime.settings.directorRelayEnabled !== false;
        runtime.settings.fateCategories = Array.isArray(runtime.settings.fateCategories) && runtime.settings.fateCategories.length
            ? runtime.settings.fateCategories.filter(key => Object.hasOwn(FATE_CATEGORY_LABELS, key))
            : [...defaults.fateCategories];
        runtime.settings.fateHistory = Array.isArray(runtime.settings.fateHistory) ? runtime.settings.fateHistory.slice(-24) : [];
        // P33：清掉P31/P32遗留的跨轮命运卡，卡牌只在user接力生成阶段使用一次。
        const clearedLegacyPendingFate = Boolean(runtime.settings.pendingFateCard);
        runtime.settings.pendingFateCard = null;
        runtime.settings.ledgerTimed = Array.isArray(runtime.settings.ledgerTimed) ? runtime.settings.ledgerTimed
            .map(item => ({ text:String(item?.text || '').trim().slice(0,500), expiresFloor:Number(item?.expiresFloor || 0) }))
            .filter(item => item.text && Number.isFinite(item.expiresFloor)) : [];
        // AI接力固定使用自己的独立API和本模块明确提供的有限资料。
        const applyDualIndependentMigration = runtime.settings.mode !== 'independent' || !runtime.settings.u1710DualIndependentApiApplied;
        runtime.settings.mode = 'independent';
        runtime.settings.u1710DualIndependentApiApplied = true;
        // P23：AI剧情接力回归严格单API稳定模式。
        // 即使旧版本保存过 multiFlashEnabled=true，也强制迁移成false。
        const applyP23SingleMigration = !runtime.settings.p23SingleApiMigrationApplied;
        runtime.settings.multiFlashEnabled = false;
        runtime.settings.p23SingleApiMigrationApplied = true;
        c.extensionSettings[ID] = runtime.settings;
        if (applyDualIndependentMigration || applyP23SingleMigration || clearedLegacyPendingFate) c.saveSettingsDebounced?.();
    }

    function saveSettings() {
        const c = ctx();
        if (!c) return;
        c.extensionSettings ||= {};
        c.extensionSettings[ID] = runtime.settings;
        c.saveSettingsDebounced?.();
    }

    function toast(message, type = 'info') {
        const t = globalThis.toastr;
        if (t?.[type]) t[type](message, '0-32 · AI剧情接力');
        else console.log(`[${ID}] ${message}`);
    }

    async function isGenerating() {
        try {
            const mod = await import('/script.js');
            if (typeof mod.isGenerating === 'function') return Boolean(mod.isGenerating());
            if (typeof mod.isGenerating === 'boolean') return mod.isGenerating;
        } catch {}
        return false;
    }


    function removeBars() {
        // P19：正文楼层里不再放AI接力入口。旧版残留统一清理。
        document.querySelectorAll('.vvv-relay-bar').forEach(node => node.remove());
    }

    function dockButton() {
        return document.getElementById('vvv-relay-dock-button');
    }

    function findSendButton() {
        const selectors = [
            '#send_but',
            '#send_button',
            'button#send_but',
            '[data-testid="send-button"]',
            '.send_but',
        ];
        return selectors.map(selector => document.querySelector(selector)).find(Boolean) || null;
    }

    function setDockBusy(busy) {
        runtime.dockBusy = Boolean(busy);
        const button = dockButton();
        if (!button) return;
        button.disabled = runtime.dockBusy;
        button.classList.toggle('is-busy', runtime.dockBusy);
        button.setAttribute('aria-busy', runtime.dockBusy ? 'true' : 'false');
        button.title = runtime.dockBusy
            ? '0-32 接力：当前正文正在生成'
            : '0-32 · AI剧情接力';
    }

    function entryForDock() {
        // P22：发送栏接力永远按“当前聊天实际最后状态”选锚点。
        // 1) 有最新完整AI -> 必须用它；
        // 2) 最后一条是真实user -> 用它之前最近的完整AI；
        // 3) 中止留下的半截AI -> fingerprint标记后跳过；
        // 永远不因为 runtime.generationStartAnchor 残留而倒退到旧楼层。
        const chat = Array.isArray(ctx()?.chat) ? ctx().chat : [];
        for (let i = chat.length - 1; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || !textOf(message)) continue;
            if (message.is_user) return latestSafeAssistant({ beforeIndex:i });
            const entry = { index:i, message, text:textOf(message) };
            if (isStoppedPartial(entry)) continue;
            return entry;
        }
        return recoverableAnchorEntry();
    }

    async function openDockRelay() {
        if (!runtime.settings?.enabled) return;
        if (await isGenerating()) {
            setDockBusy(true);
            toast('上一轮正文仍在生成，请等待本轮完成。', 'info');
            return;
        }
        setDockBusy(false);
        const entry = entryForDock();
        if (!entry) {
            toast('当前没有可用于接力的完整AI正文。', 'info');
            return;
        }
        runtime.commandAnchor = anchorFromEntry(entry);
        openCommandPanel(entry).catch(showError);
    }

    function ensureDockButton() {
        removeBars();
        if (!runtime.settings?.enabled) {
            dockButton()?.remove();
            return null;
        }

        const sendButton = findSendButton();
        if (!sendButton?.parentNode) return null;

        let button = dockButton();
        if (button && button.parentNode === sendButton.parentNode) {
            // 保证始终紧挨原生发送键左侧。
            if (button.nextSibling !== sendButton) sendButton.parentNode.insertBefore(button, sendButton);
            setDockBusy(runtime.dockBusy);
            return button;
        }
        button?.remove();

        button = document.createElement('button');
        button.type = 'button';
        button.id = 'vvv-relay-dock-button';
        button.className = 'vvv-relay-dock-button';
        button.setAttribute('aria-label', '打开0-32 AI剧情接力');
        button.innerHTML = `<span class="vvv-relay-dock-glyph" aria-hidden="true">✒</span><span class="vvv-relay-dock-dot" aria-hidden="true"></span>`;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            openDockRelay().catch(showError);
        });

        sendButton.parentNode.insertBefore(button, sendButton);
        setDockBusy(runtime.dockBusy);
        return button;
    }

    function scheduleBarRestore(delay = 120) {
        // 保留旧函数名兼容内部调用；P19恢复的是发送栏按钮。
        clearTimeout(runtime.restoreTimer);
        runtime.restoreTimer = setTimeout(() => {
            runtime.restoreTimer = 0;
            ensureDockButton();
        }, Math.max(0, Number(delay) || 0));
    }

    function restoreBar({ settled = false, entryOverride = null, force = false } = {}) {
        removeBars();
        if (!runtime.settings?.enabled) {
            runtime.barDesired = false;
            dockButton()?.remove();
            return;
        }
        const entry = entryOverride || entryForDock();
        if (entry) {
            runtime.currentSignature = signature(entry);
            runtime.barDesired = true;
            if (settled) rememberSettledAnchor(entry);
        } else {
            runtime.currentSignature = '';
            runtime.barDesired = false;
        }
        ensureDockButton();
        if (force || settled) setDockBusy(false);
    }

    function installBarObserver() {
        // 保留旧内部名。现在观察发送栏是否被主题/移动端重建。
        runtime.domObserver?.disconnect?.();
        if (typeof MutationObserver === 'undefined') return;
        const host = document.querySelector('#send_form')?.parentElement
            || document.querySelector('#send_form')
            || document.body;
        if (!host) return;
        runtime.domObserver = new MutationObserver(() => {
            clearTimeout(runtime.dockMountTimer);
            runtime.dockMountTimer = setTimeout(() => ensureDockButton(), 80);
        });
        runtime.domObserver.observe(host, { childList:true, subtree:true });
        ensureDockButton();
    }


    function commandPanel() { return document.getElementById('vvv-relay-command'); }

    function selectedDirectionLabels() {
        return [...runtime.selected]
            .map(id => DIRECTIONS.find(item => item[0] === id)?.[1])
            .filter(Boolean);
    }

    function relayPerspectiveKey() {
        const key = String(runtime.settings?.relayPerspective || 'first');
        return Object.hasOwn(PERSPECTIVES, key) ? key : 'first';
    }

    function relayPerspectiveMeta() {
        return PERSPECTIVES[relayPerspectiveKey()] || PERSPECTIVES.first;
    }

    function relayPerspectiveInstruction() {
        const key = relayPerspectiveKey();
        const meta = relayPerspectiveMeta();
        const userName = String(ctx()?.name1 || 'user').trim() || 'user';
        if (key === 'third') {
            return `${meta.instruction} 当前 user 角色名是「${userName}」；正文动作主语优先直接写「${userName}」，不要误把 char/NPC 当成 user。`;
        }
        return meta.instruction;
    }

    function renderRelayPerspective(root = commandPanel()) {
        if (!root) return;
        const active = relayPerspectiveKey();
        root.querySelectorAll('[data-relay-perspective]').forEach(button => {
            const selected = button.dataset.relayPerspective === active;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        const hint = root.querySelector('[data-relay-perspective-hint]');
        if (hint) hint.textContent = `${relayPerspectiveMeta().label} · ${relayPerspectiveMeta().short}`;
    }

    function relayModeLabel() {
        return '独立API · 有限剧情资料';
    }

    function currentFloorIndex() {
        const chat = ctx()?.chat;
        return Array.isArray(chat) ? Math.max(0, chat.length - 1) : 0;
    }

    function ruleLines(value) {
        return String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 80);
    }

    function activeLedgerRules() {
        const floor = currentFloorIndex();
        const timed = (runtime.settings?.ledgerTimed || []).filter(item => Number(item.expiresFloor) > floor && String(item.text || '').trim());
        // 顺手清理过期规则，避免旧规则永久留在设置里。
        if (runtime.settings && timed.length !== (runtime.settings.ledgerTimed || []).length) {
            runtime.settings.ledgerTimed = timed;
            saveSettings();
        }
        return {
            long: ruleLines(runtime.settings?.ledgerLong),
            chapter: ruleLines(runtime.settings?.ledgerChapter),
            timed: timed.map(item => ({ ...item, remaining: Math.max(0, Number(item.expiresFloor) - floor) })),
        };
    }

    function activeLedgerRuleCount() {
        const rules = activeLedgerRules();
        return rules.long.length + rules.chapter.length + rules.timed.length;
    }

    function customFateCards() {
        return String(runtime.settings?.customFateCards || '').split(/\r?\n/).map((line, index) => {
            const raw = line.trim();
            if (!raw) return null;
            const split = raw.split('|').map(v => v.trim());
            const category = Object.hasOwn(FATE_CATEGORY_LABELS, split[0]) ? split.shift() : 'custom';
            const text = split.join('|').trim() || raw;
            return { id:`custom-${hash(`${index}:${raw}`)}`, category, text:text.slice(0,500), weight:1 };
        }).filter(Boolean).slice(0, 200);
    }

    function fatePool() {
        const enabled = new Set(runtime.settings?.fateCategories || defaults.fateCategories);
        return [...BUILTIN_FATE_CARDS, ...customFateCards()].filter(card => card.category === 'custom' || enabled.has(card.category));
    }

    function weightedPick(cards) {
        const total = cards.reduce((sum, card) => sum + Math.max(.01, Number(card.weight || 1)), 0);
        let roll = Math.random() * total;
        for (const card of cards) {
            roll -= Math.max(.01, Number(card.weight || 1));
            if (roll <= 0) return card;
        }
        return cards.at(-1) || null;
    }

    function drawFateCard({ manual = false } = {}) {
        if (!runtime.settings?.fateEnabled) return null;
        const pool = fatePool();
        if (!pool.length) return null;
        const cooldown = Math.max(0, Number(runtime.settings.fateCooldown || 0));
        const recent = new Set((runtime.settings.fateHistory || []).slice(-cooldown));
        const eligible = pool.filter(card => !recent.has(card.id));
        const card = weightedPick(eligible.length ? eligible : pool);
        if (!card) return null;
        runtime.currentFateCard = { ...card, drawnAtFloor:currentFloorIndex(), manual:Boolean(manual) };
        runtime.settings.fateHistory = [...(runtime.settings.fateHistory || []), card.id].slice(-24);
        saveSettings();
        return runtime.currentFateCard;
    }

    function assistantTurnCount() {
        const chat = ctx()?.chat;
        if (!Array.isArray(chat)) return 0;
        return chat.filter(message => message && !message.is_system && !message.is_user && textOf(message)).length;
    }

    function maybeAutoFate(entry) {
        if (!runtime.settings?.fateEnabled || !runtime.settings?.fateAutoEnabled || runtime.currentFateCard) return runtime.currentFateCard;
        const interval = Math.max(1, Number(runtime.settings.fateInterval || 8));
        const turns = assistantTurnCount();
        const sig = signature(entry);
        if (!turns || turns % interval !== 0 || runtime.fateLastAutoSignature === sig) return null;
        runtime.fateLastAutoSignature = sig;
        return drawFateCard({ manual:false });
    }

    function directorAppliesToRelay() {
        return runtime.settings?.directorEnabled !== false && runtime.settings?.directorRelayEnabled !== false;
    }

    function directorAppliesToMain() {
        return runtime.settings?.directorEnabled !== false && runtime.settings?.directorMainEnabled !== false;
    }

    function controlLayerSnapshot(entry) {
        const ledger = activeLedgerRules();
        const fate = runtime.currentFateCard || maybeAutoFate(entry);
        return {
            directorEnabled: runtime.settings?.directorEnabled !== false,
            fourFlashEnabled: false,
            ledger,
            fateCard: fate ? { id:fate.id, category:fate.category, categoryLabel:FATE_CATEGORY_LABELS[fate.category] || fate.category, text:fate.text } : null,
        };
    }

    function controlStatusText() {
        const bits = [];
        if (runtime.settings?.directorEnabled === false) bits.push('导演OFF');
        else {
            const scopes = [];
            if (directorAppliesToMain()) scopes.push('主AI');
            if (directorAppliesToRelay()) scopes.push('接力');
            bits.push(scopes.length ? `导演ON·${scopes.join('+')}` : '导演ON·未选择范围');
        }
        bits.push(runtime.settings?.fateEnabled === false ? '卡池OFF' : `卡池ON${runtime.settings?.fateAutoEnabled ? '·自动' : ''}`);
        bits.push(`账本${activeLedgerRuleCount()}`);
        bits.push('接力独立API');
        return bits.join(' · ');
    }

    function fateCardLabel(card = runtime.currentFateCard) {
        if (!card) return '尚未抽取命运卡';
        return `【${FATE_CATEGORY_LABELS[card.category] || card.category}】${card.text}`;
    }

    function refreshControlUi(root = commandPanel()) {
        if (!root) return;
        const status = root.querySelector('[data-control-status]');
        if (status) status.textContent = controlStatusText();
        const fate = root.querySelector('[data-fate-card]');
        if (fate) fate.textContent = fateCardLabel();
        const draw = root.querySelector('[data-fate-draw]');
        if (draw) draw.hidden = runtime.settings?.fateEnabled === false;
    }

    function renderCommandSelection(root) {
        if (!root) return;
        root.querySelectorAll('[data-relay-direction]').forEach(button => {
            button.classList.toggle('selected', runtime.selected.has(button.dataset.relayDirection));
        });
        const custom = root.querySelector('[data-relay-custom-wrap]');
        const customSelected = runtime.selected.has('custom');
        if (custom) custom.hidden = !customSelected;
        const summary = root.querySelector('[data-relay-selection-summary]');
        if (summary) {
            const labels = selectedDirectionLabels().filter(label => label !== '自定义');
            summary.textContent = labels.length ? `已选：${labels.join(' · ')}` : '未选择方向时，将按“自然推进”生成';
        }
    }

    function releaseCommandViewport() {
        try { runtime.commandViewportCleanup?.(); } catch {}
        runtime.commandViewportCleanup = null;
    }

    function bindCommandViewport(root) {
        const shell = root?.querySelector('.vvv-relay-command-shell');
        if (!root || !shell) return;

        releaseCommandViewport();

        // Desktop keeps the original CSS positioning.
        // Mobile Safari / WeChat WebView use the *visual* viewport explicitly so the
        // relay panel is centered in the area the user can actually see, not the
        // larger layout viewport hidden behind browser chrome.
        const mobile = globalThis.matchMedia?.('(max-width: 760px)')?.matches;
        if (!mobile) {
            try { shell.focus({ preventScroll: true }); } catch {}
            shell.scrollTop = 0;
            return;
        }

        const vv = globalThis.visualViewport;
        let raf = 0;
        let initial = true;

        const apply = () => {
            if (!root.isConnected) return;
            const width = Math.max(1, Math.round(vv?.width || globalThis.innerWidth || document.documentElement.clientWidth || 390));
            const height = Math.max(1, Math.round(vv?.height || globalThis.innerHeight || document.documentElement.clientHeight || 700));
            const left = Math.round(vv?.offsetLeft || 0);
            const top = Math.round(vv?.offsetTop || 0);

            root.style.setProperty('inset', 'auto', 'important');
            root.style.setProperty('left', `${left}px`, 'important');
            root.style.setProperty('top', `${top}px`, 'important');
            root.style.setProperty('width', `${width}px`, 'important');
            root.style.setProperty('height', `${height}px`, 'important');
            root.style.setProperty('display', 'flex', 'important');
            root.style.setProperty('align-items', 'center', 'important');
            root.style.setProperty('justify-content', 'center', 'important');
            root.style.setProperty('box-sizing', 'border-box', 'important');

            // Keep enough air above/below the card; long content scrolls inside it.
            shell.style.setProperty('max-height', `${Math.max(360, Math.floor(height * 0.82))}px`, 'important');
            shell.style.setProperty('overflow-y', 'auto', 'important');
            shell.style.setProperty('-webkit-overflow-scrolling', 'touch');

            if (initial) {
                shell.scrollTop = 0;
                initial = false;
            }
        };

        const queueApply = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(apply);
        };

        apply();
        requestAnimationFrame(() => {
            apply();
            shell.scrollTop = 0;
            try { shell.focus({ preventScroll: true }); } catch {}
        });

        vv?.addEventListener?.('resize', queueApply);
        vv?.addEventListener?.('scroll', queueApply);
        globalThis.addEventListener?.('orientationchange', queueApply);

        runtime.commandViewportCleanup = () => {
            if (raf) cancelAnimationFrame(raf);
            vv?.removeEventListener?.('resize', queueApply);
            vv?.removeEventListener?.('scroll', queueApply);
            globalThis.removeEventListener?.('orientationchange', queueApply);
        };
    }


    function releaseSettingsViewport() {
        try { runtime.settingsViewportCleanup?.(); } catch {}
        runtime.settingsViewportCleanup = null;
    }

    function bindSettingsViewport(root) {
        const shell = root?.querySelector(':scope > section');
        if (!root || !shell) return;

        releaseSettingsViewport();

        const mobile = globalThis.matchMedia?.('(max-width: 760px)')?.matches;
        if (!mobile) {
            shell.scrollTop = 0;
            return;
        }

        const vv = globalThis.visualViewport;
        let raf = 0;
        let initial = true;

        const apply = () => {
            if (!root.isConnected) return;

            const width = Math.max(
                1,
                Math.round(vv?.width || globalThis.innerWidth || document.documentElement.clientWidth || 390),
            );
            const height = Math.max(
                1,
                Math.round(vv?.height || globalThis.innerHeight || document.documentElement.clientHeight || 700),
            );
            const left = Math.round(vv?.offsetLeft || 0);
            const top = Math.round(vv?.offsetTop || 0);

            // 与已验证成功的剧情接力主窗口使用同一套 VisualViewport 定位方式。
            root.style.setProperty('inset', 'auto', 'important');
            root.style.setProperty('left', `${left}px`, 'important');
            root.style.setProperty('top', `${top}px`, 'important');
            root.style.setProperty('width', `${width}px`, 'important');
            root.style.setProperty('height', `${height}px`, 'important');
            root.style.setProperty('display', 'flex', 'important');
            root.style.setProperty('align-items', 'center', 'important');
            root.style.setProperty('justify-content', 'center', 'important');
            root.style.setProperty('box-sizing', 'border-box', 'important');

            // 设置页内容比主接力窗口更长，限制在真实可见高度内并允许内部滚动。
            shell.style.setProperty('max-height', `${Math.max(360, Math.floor(height * 0.84))}px`, 'important');
            shell.style.setProperty('overflow-x', 'hidden', 'important');
            shell.style.setProperty('overflow-y', 'auto', 'important');
            shell.style.setProperty('-webkit-overflow-scrolling', 'touch');

            if (initial) {
                shell.scrollTop = 0;
                initial = false;
            }
        };

        const queueApply = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(apply);
        };

        apply();
        requestAnimationFrame(() => {
            apply();
            shell.scrollTop = 0;
        });

        vv?.addEventListener?.('resize', queueApply);
        vv?.addEventListener?.('scroll', queueApply);
        globalThis.addEventListener?.('orientationchange', queueApply);

        runtime.settingsViewportCleanup = () => {
            if (raf) cancelAnimationFrame(raf);
            vv?.removeEventListener?.('resize', queueApply);
            vv?.removeEventListener?.('scroll', queueApply);
            globalThis.removeEventListener?.('orientationchange', queueApply);
        };
    }

    function releasePreviewViewport() {
        try { runtime.previewViewportCleanup?.(); } catch {}
        runtime.previewViewportCleanup = null;
    }

    function bindPreviewViewport(root) {
        const shell = root?.querySelector(':scope > section');
        const textarea = root?.querySelector('textarea');
        if (!root || !shell) return;

        releasePreviewViewport();
        const mobile = globalThis.matchMedia?.('(max-width: 760px)')?.matches;
        if (!mobile) {
            shell.scrollTop = 0;
            try { textarea?.focus({ preventScroll: true }); } catch {}
            return;
        }

        // P36：iPhone / 微信 WebView 必须跟随 visualViewport。
        // 不主动 focus textarea，避免键盘/浏览器为了聚焦把整个 fixed 弹窗卷到屏幕顶部。
        try { textarea?.blur(); } catch {}
        const vv = globalThis.visualViewport;
        let raf = 0;
        let initial = true;

        const apply = () => {
            if (!root.isConnected) return;
            const width = Math.max(1, Math.round(vv?.width || globalThis.innerWidth || document.documentElement.clientWidth || 390));
            const height = Math.max(1, Math.round(vv?.height || globalThis.innerHeight || document.documentElement.clientHeight || 700));
            const left = Math.round(vv?.offsetLeft || 0);
            const top = Math.round(vv?.offsetTop || 0);

            root.style.setProperty('position', 'fixed', 'important');
            root.style.setProperty('inset', 'auto', 'important');
            root.style.setProperty('left', `${left}px`, 'important');
            root.style.setProperty('top', `${top}px`, 'important');
            root.style.setProperty('width', `${width}px`, 'important');
            root.style.setProperty('height', `${height}px`, 'important');
            root.style.setProperty('display', 'flex', 'important');
            root.style.setProperty('align-items', 'center', 'important');
            root.style.setProperty('justify-content', 'center', 'important');
            root.style.setProperty('box-sizing', 'border-box', 'important');
            root.style.setProperty('overflow', 'hidden', 'important');

            shell.style.setProperty('width', 'calc(100% - 24px)', 'important');
            shell.style.setProperty('max-width', '660px', 'important');
            shell.style.setProperty('max-height', `${Math.max(320, Math.floor(height * 0.78))}px`, 'important');
            shell.style.setProperty('overflow-x', 'hidden', 'important');
            shell.style.setProperty('overflow-y', 'auto', 'important');
            shell.style.setProperty('-webkit-overflow-scrolling', 'touch');
            shell.style.setProperty('overscroll-behavior', 'contain');
            shell.style.setProperty('margin', '0', 'important');

            if (initial) {
                shell.scrollTop = 0;
                initial = false;
            }
        };

        const queueApply = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(apply);
        };

        apply();
        requestAnimationFrame(() => { apply(); shell.scrollTop = 0; });
        vv?.addEventListener?.('resize', queueApply);
        vv?.addEventListener?.('scroll', queueApply);
        globalThis.addEventListener?.('orientationchange', queueApply);

        runtime.previewViewportCleanup = () => {
            if (raf) cancelAnimationFrame(raf);
            vv?.removeEventListener?.('resize', queueApply);
            vv?.removeEventListener?.('scroll', queueApply);
            globalThis.removeEventListener?.('orientationchange', queueApply);
        };
    }

    function closePreview(root = preview()) {
        releasePreviewViewport();
        root?.remove();
        runtime.draftAnchor=null;
        runtime.previewCustom='';
    }

    function closeSettingsModal(root = settingsModal()) {
        releaseSettingsViewport();
        root?.remove();
    }

    function closeCommandPanel() {
        releaseCommandViewport();
        commandPanel()?.remove();
        runtime.panelOpen = false;
    }

    async function openCommandPanel(entryOverride = null) {
        globalThis.VVVUnifiedCore?.overlays?.activate?.('relay');
        removeLegacyPerspectiveStyle();
        if (await isGenerating()) throw new Error('上一轮正文仍在生成，请等它结束后再接力');
        const entry = entryOverride || entryForDock() || latestSafeAssistant();
        if (!entry) throw new Error('当前没有可接力的AI正文');
        runtime.commandAnchor = anchorFromEntry(entry);
        closeCommandPanel();
        runtime.lastError='';

        const root = document.createElement('div');
        root.id = 'vvv-relay-command';
        const cards = DIRECTIONS.map(([id, label]) => `<button type="button" class="vvv-relay-choice" data-relay-direction="${id}">
            <span class="vvv-relay-choice-icon">${esc(DIRECTION_ICONS[id] || '•')}</span>
            <span class="vvv-relay-choice-text">${esc(label)}</span>
            <span class="vvv-relay-choice-check">✓</span>
        </button>`).join('');
        root.innerHTML = `<div class="vvv-relay-backdrop" data-relay-panel-close></div>
            <section class="vvv-relay-command-shell" role="dialog" aria-modal="true" aria-label="0-32 AI剧情接力" tabindex="-1">
                <div class="vvv-relay-command-glow"></div>
                <header class="vvv-relay-command-head">
                    <div>
                        <div class="vvv-relay-kicker"><span>✦</span> 0-32 STORY RELAY</div>
                        <h2>下一步，由你决定</h2>
                        <p>AI只替 <b>user</b> 写下一小步。连续剧情锁已开启，不会无缘无故跳时间、换地点或替NPC做决定。</p>
                    </div>
                    <div class="vvv-relay-command-tools">
                        <button type="button" class="vvv-relay-iconbtn" data-relay-panel-settings title="接力设置" aria-label="接力设置">⚙</button>
                        <button type="button" class="vvv-relay-iconbtn" data-relay-panel-close title="关闭" aria-label="关闭">×</button>
                    </div>
                </header>
                <div class="vvv-relay-status-strip">
                    <span><i class="vvv-relay-dot"></i>连续剧情锁 <b>ON</b></span>
                    <span>接力锚点 <b>#${Number(entry.index)}</b></span>
                    <span>上下文 <b>最近${normalizedRecentFloorCount()}层 + R9记忆</b></span>
                    <span>写作源 <b>${esc(relayModeLabel())}</b></span>
                    <span>文风 <b>纯直叙 · 拒绝比喻</b></span>
                </div>
                ${(() => { const rf=deriveRelayRealityFacts(entry); return rf.hardFacts.length ? `<div class="vvv-relay-reality-lock"><b>⛓ 当前现实锁</b>${rf.hardFacts.map(x=>`<span>${esc(x)}</span>`).join('')}</div>` : ''; })()}
                <div class="vvv-relay-command-body">
                    <div class="vvv-relay-section-title"><div><b>选择推进方向</b><small>支持多选；默认只推进当前场景的一个小节拍</small></div><span>STEP 01</span></div>
                    <div class="vvv-relay-choice-grid">${cards}</div>
                    <div class="vvv-relay-control-box">
                        <div><b>✒️ 0-32 控制层</b><small>导演 / 统筹 / 命运卡池 / 规则账本</small></div>
                        <button type="button" data-fate-draw>🎴 抽一张命运卡</button>
                        <p data-fate-card>${esc(fateCardLabel())}</p>
                    </div>
                    <div class="vvv-relay-perspective-box">
                        <div class="vvv-relay-perspective-head">
                            <div><b>以什么视角来写</b><small>只控制这次 user 接力的叙述视角；三选一，并记住上次选择</small></div>
                            <span data-relay-perspective-hint>${esc(relayPerspectiveMeta().label)} · ${esc(relayPerspectiveMeta().short)}</span>
                        </div>
                        <div class="vvv-relay-perspective-options" role="group" aria-label="写作视角">
                            ${Object.entries(PERSPECTIVES).map(([key, meta]) => `<button type="button" class="vvv-relay-perspective-option" data-relay-perspective="${key}" aria-pressed="false"><i>${esc(meta.mark)}</i><span>${esc(meta.label)}</span></button>`).join('')}
                        </div>
                    </div>
                    <div class="vvv-relay-custom-panel" data-relay-custom-wrap hidden>
                        <div class="vvv-relay-section-title compact"><div><b>user 需要发送的话</b><small>写你真正想发出去的内容；不开扩写时只做语句规整</small></div><span>USER TEXT</span></div>
                        <div class="vvv-relay-usertext-row">
                            <textarea maxlength="20000" data-relay-user-text placeholder="例如：顾霖走到她椅子旁说，宝宝站起来……"></textarea>
                            <button type="button" class="vvv-relay-expand-toggle" data-relay-expand aria-pressed="false" title="开启后会在不偷换核心意思的前提下补充动作、感受与对白；关闭时仍会由AI做轻度语句规整">
                                <i>✦</i><b>AI扩写</b><small data-relay-expand-state>关闭 · 仅规整</small>
                            </button>
                        </div>
                        <div class="vvv-relay-section-title compact vvv-relay-thought-title"><div><b>补充你的想法</b><small>与上方user文字一起发送；用于补充方向、语气或细节</small></div><span>OPTIONAL</span></div>
                        <textarea maxlength="1200" data-relay-custom-text placeholder="例如：语气自然一点，先接住刚才的话题；如果扩写开启，可以补一点动作细节……"></textarea>
                        <small class="vvv-relay-custom-note">两栏会一起交给AI。关闭“AI扩写”时只做轻度规整；开启后必须真正重写并自然扩充，不会再把原文原样发出去。</small>
                    </div>
                </div>
                <footer class="vvv-relay-command-footer">
                    <div class="vvv-relay-footer-copy">
                        <div class="vvv-relay-selection-summary" data-relay-selection-summary>未选择方向时，将按“自然推进”生成</div>
                        <div class="vvv-relay-inline-error" data-relay-inline-error role="alert" hidden></div>
                    </div>
                    <div class="vvv-relay-generation-actions">
                        <button type="button" class="vvv-relay-primary" data-relay-panel-generate title="使用AI接力独立API生成">
                            <span>生成我的下一句话</span><i>→</i>
                        </button>
                    </div>
                </footer>
            </section>`;
        document.body.appendChild(root);
        runtime.panelOpen = true;
        root.querySelectorAll('[data-relay-panel-close]').forEach(button => button.addEventListener('click', closeCommandPanel));
        root.querySelector('[data-relay-panel-settings]')?.addEventListener('click', () => {
            closeCommandPanel();
            openSettings().catch(showError);
        });
        root.querySelector('[data-fate-draw]')?.addEventListener('click', () => {
            const card = drawFateCard({ manual:true });
            if (card) toast(`命运卡：${FATE_CATEGORY_LABELS[card.category] || card.category} · ${card.text}`, 'info');
            refreshControlUi(root);
        });
        root.querySelectorAll('[data-relay-perspective]').forEach(button => button.addEventListener('click', () => {
            const key = String(button.dataset.relayPerspective || '');
            if (!Object.hasOwn(PERSPECTIVES, key)) return;
            runtime.settings.relayPerspective = key;
            saveSettings();
            renderRelayPerspective(root);
        }));
        root.querySelectorAll('[data-relay-direction]').forEach(button => button.addEventListener('click', () => {
            const id = button.dataset.relayDirection;
            if (runtime.selected.has(id)) runtime.selected.delete(id);
            else runtime.selected.add(id);
            renderCommandSelection(root);
            if (id === 'custom' && runtime.selected.has(id)) setTimeout(() => root.querySelector('[data-relay-user-text]')?.focus(), 0);
        }));
        root.querySelector('[data-relay-expand]')?.addEventListener('click', event => {
            const button=event.currentTarget;
            const pressed=button?.getAttribute('aria-pressed')==='true';
            button?.setAttribute('aria-pressed', pressed ? 'false' : 'true');
            button?.classList.toggle('selected', !pressed);
            const state=button?.querySelector('[data-relay-expand-state]');
            if(state)state.textContent=pressed?'关闭 · 仅规整':'开启 · 自然扩写';
        });
        root.querySelector('[data-relay-panel-generate]')?.addEventListener('click', () => {
            const customSelected=runtime.selected.has('custom');
            const userText=customSelected ? String(root.querySelector('[data-relay-user-text]')?.value || '') : '';
            const notes=customSelected ? String(root.querySelector('[data-relay-custom-text]')?.value || '') : '';
            const expand=customSelected && root.querySelector('[data-relay-expand]')?.getAttribute('aria-pressed')==='true';
            if (customSelected && !userText.trim() && !notes.trim()) {
                const input=root.querySelector('[data-relay-user-text]');
                input?.focus();
                toast('选择“自定义”后，请填写“user需要发送的话”或“补充你的想法”。', 'warning');
                return;
            }
            setRelayInlineError('');
            generateDraft({userText,notes,expand}).catch(showError);
        });
        renderCommandSelection(root);
        renderRelayPerspective(root);
        bindCommandViewport(root);
        refreshControlUi(root);
    }

    function fallbackCharacterSnapshot() {
        const c = ctx();
        let fields = {};
        try { fields = c?.getCharacterCardFields?.() || {}; } catch {}
        return {
            name: c?.name2 || '',
            userName: c?.name1 || '',
            description: fields.description || '',
            personality: fields.personality || '',
            scenario: fields.scenario || '',
            firstMessage: fields.first_mes || '',
            system: fields.system || '',
            postHistory: fields.jailbreak || '',
            persona: fields.persona || '',
        };
    }

    function normalizedRecentFloorCount() {
        const value = Number(runtime.settings?.recentFloors || 16);
        return [8, 12, 16, 24, 32].includes(value) ? value : 16;
    }

    function continuityFloorCount() {
        // P24：AI接力真正用于“续写现在”的高权重原文只保留最近6层（约3个来回）。
        // 旧的8/12/16/24/32仅作为长期记忆/检索参考，不再把开场原文与当前正文并列喂给模型。
        return 6;
    }

    function isOpeningMessage(message, index = -1) {
        if (!message) return false;
        if (message.is_first_message || message.isGreeting || message?.extra?.isGreeting || message?.extra?.is_first_message) return true;
        return Number(index) === 0;
    }

    function transcript(limit = normalizedRecentFloorCount(), maxIndex = null, { excludeOpening = false } = {}) {
        const c = ctx();
        const chat = Array.isArray(c?.chat) ? c.chat : [];
        const ceiling = Number.isInteger(Number(maxIndex)) ? Number(maxIndex) : Number.POSITIVE_INFINITY;
        const real = chat.map((message, index) => ({ message, index }))
            .filter(({ message, index }) => index <= ceiling && message && !message.is_system && textOf(message))
            .filter(({ message, index }) => !(excludeOpening && ceiling >= 6 && isOpeningMessage(message, index)));
        return real.slice(-Math.max(1, Number(limit || 16))).map(({ message, index }) => ({
            floor: index,
            role: message.is_user ? 'user' : 'assistant',
            name: message.name || '',
            text: textOf(message).slice(0, 12000),
        }));
    }

    function previousUserBefore(entry) {
        const chat = Array.isArray(ctx()?.chat) ? ctx().chat : [];
        const end = Math.max(0, Number(entry?.index ?? chat.length));
        for (let i = end - 1; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || !textOf(message)) continue;
            if (message.is_user) return { index: i, text: textOf(message) };
        }
        return { index: -1, text: '' };
    }

    function tailText(value, maxChars = 3500) {
        const text = String(value || '').trim();
        return text.length <= maxChars ? text : text.slice(-maxChars);
    }

    function detectCompletionSignals(latestText, previousUserText = '') {
        const assistant = String(latestText || '');
        const previousUser = String(previousUserText || '');
        const text = `${previousUser}\n${assistant}`;
        const scoped = tailText(text, 9000);
        const signals = [];
        const add = (id, label, done, start) => {
            if (done.test(scoped)) signals.push({ id, label, start: start.source });
        };

        add(
            'bath',
            '已经离开浴室/淋浴阶段结束',
            /(?:走出|离开|出了|抱出|抱着[^。！？]{0,35}(?:走出|离开))[^。！？]{0,16}(?:浴室|卫生间|淋浴间)|从(?:浴室|卫生间|淋浴间|浴缸)[^。！？]{0,45}(?:出来|走出|抱出来)|洗完(?:澡)?|冲完(?:澡)?|洗好(?:澡)?|淋浴(?:结束|完毕)/i,
            /(?:走出|离开|出了|抱出|抱着[^。！？]{0,35}(?:走出|离开))[^。！？]{0,16}(?:浴室|卫生间|淋浴间)|从(?:浴室|卫生间|淋浴间|浴缸)[^。！？]{0,45}(?:出来|走出|抱出来)|(?:去|先去|准备去|进去|进)[^。！？]{0,12}(?:洗澡|冲澡|淋浴|浴室|卫生间)|(?:洗|冲)个澡/i
        );
        add(
            'sofa',
            '已经到达客厅/沙发区域并停留',
            /(?:回到|来到|走到|移到|抱到|放到|坐到|靠到|跪到|抵到)[^。！？]{0,18}(?:沙发|客厅)|(?:坐在|躺在|靠在|跪在|抵着|按在|放在)[^。！？]{0,18}沙发|沙发(?:上|旁|边|垫|靠背)/i,
            /(?:回到|来到|走到|移到|抱到|放到|坐到|靠到|跪到|抵到)[^。！？]{0,18}(?:沙发|客厅)|(?:抱着|带着)[^。！？]{0,28}(?:走到|回到|来到)[^。！？]{0,18}(?:沙发|客厅)/i
        );
        add(
            'condom',
            '安全套/套已经拆开并戴好',
            /(?:安全套|避孕套|套套|银色(?:锡箔)?小方块|锡箔小方块)[^。！？]{0,36}(?:撕开|拆开|戴好|戴上|套上)|(?:撕开|拆开)[^。！？]{0,30}(?:安全套|避孕套|包装|银色(?:锡箔)?小方块)[^。！？]{0,30}(?:戴好|戴上|套上)|(?:戴好|戴上|套上)[^。！？]{0,24}(?:安全套|避孕套|套)/i,
            /(?:拿起|拿出|摸出|取出)[^。！？]{0,24}(?:安全套|避孕套|套套|银色(?:锡箔)?小方块|锡箔小方块)|(?:撕开|拆开)[^。！？]{0,24}(?:包装|安全套|避孕套|银色(?:锡箔)?小方块)|(?:戴好|戴上|套上)[^。！？]{0,24}(?:安全套|避孕套|套)/i
        );
        add('meal', '吃饭/用餐已经完成', /(?:吃完(?:饭|东西)?|用餐(?:结束|完毕)|饭后|吃饱(?:了)?|放下(?:碗|筷|餐具))/i,
            /(?:去|先去|准备去|一起|我们)[^。！？]{0,12}(?:吃饭|吃点东西|用餐|餐厅)|(?:吃|弄)点东西/i);
        add('home', '已经回到家/房间', /(?:已经|终于|随后|接着)?[^。！？]{0,12}(?:回到家|到家(?:了)?|进了家门|回到房间|回到卧室|进了卧室)/i,
            /(?:回家|回房间|回卧室|准备回去|走回去|先回去)/i);
        add('bed', '已经上床/躺下', /(?:已经|重新|随后)?[^。！？]{0,10}(?:躺在床上|躺下(?:了)?|上了床|钻进被窝|回到床上)/i,
            /(?:上床|躺到床上|躺下|钻进被窝|回到床上)/i);
        add('leave', '已经离开上一地点', /(?:已经|随后|转身)?[^。！？]{0,12}(?:离开(?:了)?|走出(?:了)?|出了门|走远(?:了)?)/i,
            /(?:准备|打算|起身|转身)?[^。！？]{0,10}(?:离开|出去|出门)/i);
        return signals;
    }

    function deriveRelayRealityFacts(entry) {
        const previous = previousUserBefore(entry);
        const assistant = String(entry?.text || '');
        const combined = tailText(`${previous.text}\n${assistant}`, 10000);
        const facts = [];
        const signals = detectCompletionSignals(assistant, previous.text);
        const ids = new Set(signals.map(item => item.id));

        if (ids.has('bath')) facts.push('浴室/淋浴阶段已经结束；禁止再次写“刚走出浴室/还在浴室/重新离开浴室”。');
        if (ids.has('sofa')) facts.push('当前互动已经推进到客厅/沙发区域；沙发是当前场景锚点，浴室只能作为过去。');
        if (ids.has('condom')) facts.push('安全套相关动作已经完成；禁止再次拿套、拆包装、撕锡箔或重新戴套。');

        // 对截图这类长正文，末尾可能出现“刚才从浴室抱出来”的回顾性台词。
        // 只要同时出现“离开浴室完成 + 沙发持续互动”，强制把浴室降级为历史地点。
        if (ids.has('bath') && /沙发(?:上|旁|边|垫|靠背)|(?:坐在|躺在|靠在|跪在|抵着|按在)[^。！？]{0,18}沙发/i.test(combined)) {
            facts.push('地点优先级：客厅/沙发 > 浴室。即使后文台词提到“刚才从浴室出来”，那也是回顾，不代表当前位置。');
        }
        return {
            previousUserFloor: previous.index,
            completedSignals: signals.map(item => ({ id:item.id, label:item.label })),
            hardFacts: facts,
            anchorTail: tailText(assistant, 5200),
        };
    }


    function currentTurnSnapshot(entry) {
        const previous = previousUserBefore(entry);
        const latestText = String(entry?.text || '');
        const reality = deriveRelayRealityFacts(entry);
        return {
            previousUserFloor: previous.index,
            previousUser: previous.text.slice(0, 6000),
            latestAssistantFloor: Number(entry?.index ?? -1),
            latestAssistant: latestText.slice(0, 12000),
            // P22：除了正文结尾，再给四重Flash一份“已完成事实清单”，避免长正文里的回顾台词把状态拉回去。
            currentRealityTail: tailText(latestText, 5200),
            completedSignals: reality.completedSignals,
            hardFacts: reality.hardFacts,
        };
    }

    function buildRelayQuery(currentTurn, chosen = []) {
        return [
            '【当前现实硬事实】', (currentTurn?.hardFacts || []).join('\n'),
            '【上一条user】', tailText(currentTurn?.previousUser, 2200),
            '【最新AI正文结尾/当前现实】', tailText(currentTurn?.currentRealityTail, 3600),
            '【本次接力方向】', chosen.join(' + '),
            '【检索约束】已完成的地点迁移/动作只作为历史，不要把“浴室/拿套/戴套”等已完成阶段重新召回成当前任务。',
        ].filter(Boolean).join('\n');
    }

    function explicitRepeatIntent(custom = '') {
        return /(?:再来|再一次|重新|又一次|重复|再去|再洗|再吃|再回|再躺|再做一次|再来一遍)/.test(String(custom || ''));
    }

    const CUSTOM_ACTION_FAMILIES = [
        { label:'吃饭/用餐', request:/吃饭|用餐|吃东西|吃(?:早|午|晚|夜宵)|去吃|找.*吃|餐厅|饭店|食堂/, output:/吃|用餐|饭|餐厅|饭店|食堂|点菜|菜单/ },
        { label:'睡觉/休息', request:/睡觉|睡一觉|上床|就寝|补觉|休息/, output:/睡|上床|躺|就寝|休息/ },
        { label:'洗澡', request:/洗澡|冲澡|淋浴|泡澡/, output:/洗澡|冲澡|淋浴|泡澡|浴室/ },
        { label:'回家', request:/回家|回住所|回住处|回公寓/, output:/回家|住所|住处|公寓|家门/ },
        { label:'上班/工作', request:/上班|去公司|去单位|开始工作|办公/, output:/上班|公司|单位|工作|办公/ },
        { label:'购物/买东西', request:/买东西|购物|逛街|去买|下单/, output:/买|购物|商场|店|下单|付款/ },
        { label:'打电话', request:/打电话|拨号|电话联系/, output:/打电话|拨号|电话|手机/ },
        { label:'发消息', request:/发消息|发微信|发短信|微信联系/, output:/发消息|微信|短信|输入|发送/ },
        { label:'转账/付款', request:/转账|付款|付钱|支付/, output:/转账|付款|付钱|支付|金额|收款/ },
        { label:'点外卖', request:/点外卖|叫外卖|订外卖/, output:/外卖|下单|餐品|配送|店铺/ },
        { label:'拥抱', request:/抱着|抱住|拥抱|搂着|搂住/, output:/抱着|抱住|拥抱|搂着|搂住/ },
        { label:'亲吻/请求亲吻', request:/亲(?:吻|一会|一下|一口)|接吻|吻(?:她|他|住|一会|一下)/, output:/亲(?:吻|一会|一下|一口)|接吻|吻(?:她|他|住|一会|一下)/ },
    ];

    function directionHasAffirmativeMatch(pattern, value) {
        const text=String(value||'');
        const flags=pattern.flags.includes('g')?pattern.flags:`${pattern.flags}g`;
        const matcher=new RegExp(pattern.source,flags);
        for(const match of text.matchAll(matcher)){
            const clauseStart=Math.max(text.lastIndexOf('，',match.index),text.lastIndexOf(',',match.index),text.lastIndexOf('。',match.index),text.lastIndexOf('；',match.index),text.lastIndexOf(';',match.index),text.lastIndexOf('！',match.index),text.lastIndexOf('!',match.index),text.lastIndexOf('？',match.index),text.lastIndexOf('?',match.index),text.lastIndexOf('\n',match.index));
            const prefix=text.slice(clauseStart+1,match.index).trim();
            const lastIndex=(regex)=>{let index=-1;for(const item of prefix.matchAll(regex))index=item.index??index;return index;};
            const negationAt=lastIndex(/不要|别|不准|禁止|不用|无需|不再|不去|不想|拒绝|取消/gi);
            const reversalAt=lastIndex(/但|但是|却|不过|而是|反而|仍然|还是/gi);
            if(negationAt>reversalAt)continue;
            return true;
        }
        return false;
    }

    function stripParentheticalStageDirections(value = '') {
        const source=String(value||'');
        return source.replace(/[（(]([^（）()]{1,800})[）)]/g,(whole,inner)=>{
            const text=String(inner||'').trim();
            // 括号里出现连续动作/时序词时，按舞台动作处理；校验台词时不把它吞进“必须逐字说”的句子。
            if(/随后|然后|接着|之后|紧接着|(?:^|[，,。；;])\s*(?:我|他|她|自己|user|{{user}})?\s*(?:坐|站|走|起身|躺|骑|抱|搂|亲|吻|拉|推|拿|放|靠|转|回|离开|进入|伸手|低头|抬头|开门|关门)/i.test(text))return '。';
            return whole;
        });
    }

    function customExpressionRequirements(custom = '') {
        const source=(typeof stripParentheticalStageDirections==='function' ? stripParentheticalStageDirections(custom) : String(custom||'')).trim().slice(0,1200);
        if(!source)return [];
        const out=[],seen=new Set();
        const push=value=>{
            const cleaned=String(value||'').trim().replace(/^[\s：:，,。；;“”"'‘’「」『』]+|[\s“”"'‘’「」『』]+$/g,'').trim();
            if(cleaned.length<4)return;
            const key=normalizeRelayEchoText(cleaned);if(key.length<4||seen.has(key))return;
            seen.add(key);out.push(cleaned.slice(0,360));
        };
        for(const match of source.matchAll(/[“「『"]([^”」』"]{4,360})[”」』"]/g))push(match[1]);
        const cues=[...source.matchAll(/(?:开口(?:说|问)?|低声(?:说|问)|轻声(?:说|问)|笑着(?:说|问)|告诉(?:她|他|对方)?|对(?:她|他|对方)说|(?:我|自己)(?:开口)?(?:说|问)|(?:^|[。！？!?；;]\s*)问|说)\s*[：:，,。\s]*/g)];
        for(let index=0;index<cues.length;index+=1){
            const cue=cues[index],start=(cue.index||0)+cue[0].length,end=cues[index+1]?.index??source.length;
            let speech=source.slice(start,end);
            // 没有引号时，以明确的第一人称动作作为台词边界。不能把后续整串动作
            // 并进一句“必须逐字保留”的台词，否则忠实扩写反而必然被误判。
            const transition=speech.search(/[。！？!?，,；;]\s*(?=(?:(?:然后|随后|接着|之后)\s*)?(?:先(?:把|将|去|回|走|关|开|脱|穿|拿|放|跪)|我(?:把|将|起身|走|回|关|拉|脱|穿|拿|放|跪|坐|站|躺|抱|亲|转|推|打开|关闭)|我们(?:再)?(?:回|走|去|离开)|两人|大家))/);
            if(transition>=0)speech=speech.slice(0,transition);
            push(speech);
        }
        // 普通扩写模式仍需要识别“整句就是用户想说出的提问/感受”，以免后面的文风锁误删用户原话。
        // fixed11 的关键变化不在这里，而是在轻度规整路径：轻度规整不再调用逐字表达硬锁，允许正常换词、调语序和断句。
        if(!out.length&&source.length<=500&&/为什么|怎么|是否|要不要|可不可以|可以吗|能不能|感觉|喜欢|爱|想要|想再|害怕|担心|难过|开心|生气|委屈|[？?]/.test(source))push(source);
        return out;
    }

    function customDirectionLocalIssues(draft, custom = '') {
        const direction=String(custom||'').trim(),text=String(draft||'').trim();
        if(!direction||!text)return [];
        const issues=[];
        for(const family of CUSTOM_ACTION_FAMILIES){
            if(directionHasAffirmativeMatch(family.request,direction)&&!directionHasAffirmativeMatch(family.output,text))issues.push(`没有落实用户指定的核心行动：${family.label}`);
        }
        for(const required of customExpressionRequirements(direction)){
            if(!draftPreservesCustomExpression(text,required))issues.push(`生成稿删除了用户指定台词、提问或感受的关键部分：“${required.slice(0,140)}”`);
        }
        const asksOpenChoice=directionHasAffirmativeMatch(/(?:问|询问|征求)[^。！？!?]{0,80}(?:几个|多少|哪(?:个|些)|要不要|是否|怎么选)|(?:几个|多少|哪(?:个|些))[^。！？!?]{0,50}(?:孔|洞|个|件|次|种)/,direction);
        if(asksOpenChoice){
            if(!/(?:问|询问|征求|几个|多少|哪(?:个|些)|选择|意见|回答)/.test(text))issues.push('把用户要求保留的开放问题改成了别的行为');
            const directionHasFixedAnswer=/(?:只|就|决定|选择|选|要|打|做|买|点)\s*(?:一|二|两|三|四|五|六|七|八|九|十|\d+)\s*(?:个|处|次|件|种|孔|洞)/.test(direction);
            const draftInventsFixedAnswer=/(?:只|就|决定|选择|选|要|打|做|买|点)\s*(?:一|二|两|三|四|五|六|七|八|九|十|\d+)\s*(?:个|处|次|件|种|孔|洞)/.test(text);
            if(!directionHasFixedAnswer&&draftInventsFixedAnswer)issues.push('擅自替开放问题决定了具体数量或选项');
        }
        return issues;
    }

    function customDirectionLightPolishIssues(draft, custom = '') {
        const direction=String(custom||'').trim(),text=String(draft||'').trim();
        if(!direction||!text)return [];
        const issues=[];
        // 轻度规整允许换词、调语序和重做断句，所以绝不能用“原句近乎逐字存在”做硬条件。
        // 这里只守住真正不能被润色掉的结构事实：核心行动与开放问题的未决状态。
        for(const family of CUSTOM_ACTION_FAMILIES){
            if(directionHasAffirmativeMatch(family.request,direction)&&!directionHasAffirmativeMatch(family.output,text))issues.push(`没有落实用户指定的核心行动：${family.label}`);
        }
        const asksOpenChoice=directionHasAffirmativeMatch(/(?:问|询问|征求)[^。！？!?]{0,80}(?:几个|多少|哪(?:个|些)|要不要|是否|怎么选)|(?:几个|多少|哪(?:个|些))[^。！？!?]{0,50}(?:孔|洞|个|件|次|种)/,direction);
        if(asksOpenChoice){
            if(!/(?:问|询问|征求|几个|多少|哪(?:个|些)|选择|意见|回答|要不要|是否)/.test(text))issues.push('把用户要求保留的开放问题改成了别的行为');
            const directionHasFixedAnswer=/(?:只|就|决定|选择|选|要|打|做|买|点)\s*(?:一|二|两|三|四|五|六|七|八|九|十|\d+)\s*(?:个|处|次|件|种|孔|洞)/.test(direction);
            const draftInventsFixedAnswer=/(?:只|就|决定|选择|选|要|打|做|买|点)\s*(?:一|二|两|三|四|五|六|七|八|九|十|\d+)\s*(?:个|处|次|件|种|孔|洞)/.test(text);
            if(!directionHasFixedAnswer&&draftInventsFixedAnswer)issues.push('擅自替开放问题决定了具体数量或选项');
        }
        return [...new Set(issues)];
    }


    function customDirectionExpansionIssues(draft, custom = '') {
        const direction=String(custom||'').trim(),text=String(draft||'').trim();
        if(!direction||!text)return [];
        const issues=[...customDirectionLightPolishIssues(text,direction)];
        const a=normalizeRelayEchoText(text),b=normalizeRelayEchoText(direction);
        const originalCount=Math.max(1,relayTextCharCount(direction));
        const draftCount=relayTextCharCount(text);
        const ratio=draftCount/originalCount;
        if(a===b || (b.length>=12 && a.includes(b) && ratio<1.12))issues.push('AI扩写实际上几乎原样返回了用户原文，没有完成真正扩写');
        const minRatio=originalCount<40?1.18:originalCount<180?1.12:1.06;
        if(ratio<minRatio && draftCount<originalCount+18)issues.push('AI扩写幅度不足，只有轻微改字或加标点');
        const stageStripped=stripParentheticalStageDirections(direction);
        if(stageStripped!==direction && /[（(][^（）()]{1,220}(?:随后|然后|接着|之后|我|他|她|自己)[^（）()]{0,220}[）)]/.test(text))issues.push('括号里的舞台动作仍被原样保留，尚未改写成自然叙事');
        return [...new Set(issues)];
    }


    function detectFigurativeLanguageIssues(text, custom = '') {
        const source = String(text || '').trim();
        const direction=String(custom||'').trim();
        // 用户明确要求说出的原话优先于文风禁词；AI在其他句子里
        // 自行新增的比喻仍然继续拦截。
        const protectedExpressions=customExpressionRequirements(direction);
        const value=protectedExpressions.length
            ? source.split(/(?<=[。！？!?])|\n+/).filter(part=>!protectedExpressions.some(required=>draftPreservesCustomExpression(part,required))).join('\n').trim()
            : source;
        if (!value) return [];
        const issues = [];
        // 纯直叙硬锁：宁可误杀，也不允许比喻/类比/拟人/文学化意象进入最终稿。
        const explicitSimile = /(?:像|像是|好像|仿佛|如同|犹如|宛如|宛若|好似|仿若|恍若|恰似|有如)[^。！？!?\n]{0,56}(?:一样|一般|似的|般)?/i;
        if (explicitSimile.test(value)) issues.push('检测到比喻/类比标记（像、仿佛、如同、犹如、宛如等）');
        if (/(?:一样|似的|般地|般的|般\s*[，。！？!?]|一般地|一般的)/i.test(value)) issues.push('检测到比较式修辞结构（一样/似的/般）');
        const abstractMetaphor = /(?:空气|时间|沉默|夜色|月光|灯光|目光|视线|声音|情绪|心情|心底|胸口|心脏|脑海|思绪|呼吸|气氛)[^。！？!?\n]{0,18}(?:凝固|冻结|炸开|爆开|翻涌|汹涌|漫开|蔓延|燃烧|坠落|砸下|压下|压来|黏住|钉住|灼烧|吞没|淹没|撕开|划破|裹住|席卷|泛滥|发酵|刺穿|低语|呢喃|拥抱|抚摸|亲吻)/i;
        if (abstractMetaphor.test(value)) issues.push('检测到隐喻/拟人式文学表达');
        if (/(?:得|地)?像(?:是|在|个|一|只|头|条|团|块|片|某|那|这)/i.test(value)) issues.push('检测到高风险明喻结构');
        return [...new Set(issues)];
    }

    function npcSubjectCandidates(environment = {}, entry = null) {
        const out = new Set(['她', '他', '对方', '那人', '女孩', '男孩', '女人', '男人', '角色', 'NPC']);
        const c = ctx() || {};
        const userName = String(c.name1 || '').trim();
        const add = value => {
            const name = String(value || '').trim();
            if (!name || name === userName || name.length > 24) return;
            out.add(name);
        };
        add(c.name2);
        add(entry?.message?.name);
        try {
            const people = environment?.r9s1p1?.people || environment?.state?.people || [];
            for (const row of Array.isArray(people) ? people : []) {
                add(row?.['姓名']); add(row?.['名字']); add(row?.name); add(row?.character); add(row?.['人物']);
            }
        } catch {}
        return [...out].sort((a, b) => b.length - a.length);
    }

    function npcShortAgencyAliases(subjects = []) {
        const aliases = new Set();
        for (const raw of subjects || []) {
            const name = String(raw || '').trim();
            if (!/^[\u3400-\u9fff]{2,6}$/.test(name)) continue;
            const chars = [...name];
            // 单个汉字与普通动词、物件和语气词碰撞率太高，不能作为可靠的人名。
            if (chars.length === 3) aliases.add(chars.slice(-2).join(''));
        }
        return [...aliases].filter(x => x && !['她','他','我','你'].includes(x)).sort((a,b)=>b.length-a.length);
    }

    function npcReferenceIsObject(value, index) {
        const prefix=String(value||'').slice(Math.max(0,Number(index||0)-12),Number(index||0));
        return /(?:把|将|对|向|朝|给|让|跟|同|看着|望着|盯着|抱着|搂着|拉着|牵着|扶着|跪在|站在|坐在|躺在|靠在|贴在|守在|走到|来到|回到|放到|带到|留在)\s*$/.test(prefix);
    }

    function hasEmbeddedNpcAgency(clause, subjects = [], agencyVerb = /$a/) {
        const value = String(clause || '').trim();
        if (!value) return false;
        const full = (subjects || []).map(name => String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
        const aliases = npcShortAgencyAliases(subjects).map(name => String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
        // 全名/代词允许出现在分句内部，例如“听到她要求……”。静态状态会在外层先排除。
        if (full.length) {
            const re = new RegExp(`(?:${full.join('|')})(?:就|已经|终于|慢慢|突然|又|也|还|仍|正|正在|没有|没|开始|继续|随后|接着|便|却|无意识地?|下意识地?)?\\s*${agencyVerb.source}`, 'gi');
            for(const match of value.matchAll(re))if(!npcReferenceIsObject(value,match.index))return true;
        }
        // 两字简称只在独立分句边界识别，避免普通正文片段碰撞。
        if (aliases.length) {
            const re = new RegExp(`(?:^|[，,；;。！？!?\\s])(?:${aliases.join('|')})(?:(?:就|已经|终于|慢慢|突然|又|也|还|仍|正|正在|没有|没|开始|继续|随后|接着|便|却|无意识地?|下意识地?)\\s*)*${agencyVerb.source}`, 'gi');
            for(const match of value.matchAll(re))if(!npcReferenceIsObject(value,match.index))return true;
        }
        return false;
    }

    function detectNpcAgencyIssues(text, subjects = []) {
        const value = String(text || '').trim();
        if (!value) return [];
        const issues = [];
        const names = subjects.length ? subjects : npcSubjectCandidates();
        const escaped = names.map(name => String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
        if (!escaped.length) return [];
        const subject = `(?:${escaped.join('|')})`;

        // P20 主体语义锁：
        // “她的头发还湿着 / 她身上还裹着浴巾 / 她的皮肤上有水珠”属于静态观察，允许。
        // 真正禁止的是 char/NPC 在 user 接力稿里新增动作、对白、回应、选择或主动身体反应。
        const clauseStart = new RegExp(
            `^(?:[“”\"'‘’\\s]*(?:而|但|然后|随后|接着|于是|这时|此时)?[“”\"'‘’\\s]*)(${subject})(?=[的把将正正在已还仍又再也却就便没不并或\\s]|[^A-Za-z0-9_])`,
            'i'
        );

        const agencyVerb = /(?:说|说道|开口|问|反问|回答|答道|回应|喊|叫|嘟囔|低声说|要求|请求|邀请|提议|告诉|提醒|答应|同意|拒绝|点头|摇头|笑|哭|皱眉|挑眉|眨眼|闭眼|睁眼|看向|望向|瞥|移开视线|躲闪|躲开|闪避|挣扎|反抗|配合|迎合|靠近|贴近|贴到|贴在|靠在|后退|退开|转身|翻身|起身|站起|站起来|坐起|坐下|躺下|走向|走过去|走了过来|走过来|走来|走近|跑|迈步|挪动|移动|动了|动起来|抬手|抬起|伸手|伸出|握住|抓住|抱住|搂住|环住|松开|收紧|推开|拉住|扯住|按住|压住|触碰|碰了|摸|抚摸|亲|吻|咬|舔|蹭|踢|踩|跪|蹲|弯腰|俯身|抬腿|夹住|张开|合拢|蜷缩|颤抖|发抖|战栗|瑟缩|抽动|喘息|呼吸加快|心跳加快|脸红起来|涨红|流泪|落泪|哭出声|脱下|脱掉|穿上|套上|解开|扣上|系上|拿起|放下|递给|接过|转过头|偏过头|低下头|抬头)/i;

        const staticState = /(?:的(?:皮肤|头发|发梢|衣服|上衣|衬衫|裤子|裙子|鞋|袜子|袖口|衣角|脸|脸颊|眼睛|眼眸|嘴唇|手|手腕|手臂|肩|背|腰|腿|膝盖|脚|脚踝|身上|衣领|衣摆)|身上|脸上|头发|衣服|裤子|裙子|鞋子)[^。！？!?\n]{0,26}(?:还|仍|依旧|已经|正)?(?:是|有|带着|沾着|挂着|贴着|穿着|裹着|盖着|湿着|湿透|潮湿|发红|泛红|苍白|冰凉|温热|很冷|很热|很湿|很干|没有|并没有|看起来|显得|保持|处于)/i;
        const firstPersonClause = /^(?:我|咱|本人)(?![A-Za-z0-9_])/;

        const clauses = value.match(/[^，,；;。！？!?\n]+[，,；;。！？!?\n]?/g) || [value];
        for (const rawClause of clauses) {
            const clause = String(rawClause || '').replace(/^[，,；;。！？!?\\s]+/, '').trim();
            // P34：先做“分句内部施事”检查，再判断分句是否以角色开头。
            // P33把这一步放在 `if (!matched) continue` 之后，导致“听到她要求…”、
            // “看着梦走过来…”等最常见的隐藏NPC动作直接被跳过。
            if (hasEmbeddedNpcAgency(clause, names, agencyVerb)) {
                issues.push(`char/NPC在分句内部产生了新的动作/对白/请求：${clause.slice(0, 58)}`);
                continue;
            }

            // 明确以 user 第一人称起句时，不能再把后面的宾语人名误判成施事者。
            if (firstPersonClause.test(clause)) continue;

            const matched = clause.match(clauseStart);
            if (!matched) continue;

            const afterSubject = clause.slice(matched[0].length).replace(/^[的\s]*/, '');
            const isStatic = staticState.test(clause) && !agencyVerb.test(afterSubject);
            if (isStatic) continue;

            if (agencyVerb.test(afterSubject)) {
                issues.push(`char/NPC产生了新的动作/回应/身体反应：${clause.slice(0, 58)}`);
                continue;
            }

            // 对明显施事结构仍保守拦截；纯静态观察不再误杀。
            if (/^(?:把|将|正|正在|开始|继续|突然|又|再|便|就|却|没|没有|不)/i.test(afterSubject)) {
                issues.push(`char/NPC疑似成为新行为施事者：${clause.slice(0, 58)}`);
            }
        }
        return [...new Set(issues)];
    }

    function replayNgrams(text) {
        const value = String(text || '').replace(/[\s，。！？；、,.!?;:“”"'‘’（）()【】\[\]—…]/g, '');
        const grams = new Set();
        const chunks = value.match(/[\u3400-\u9fff]{2,}|[a-zA-Z0-9_]{3,}/g) || [];
        for (const chunk of chunks) {
            if (/^[a-zA-Z0-9_]+$/.test(chunk)) { grams.add(chunk.toLowerCase()); continue; }
            const chars=[...chunk];
            for (let n=2;n<=3;n+=1) for(let i=0;i<=chars.length-n;i+=1) grams.add(chars.slice(i,i+n).join(''));
        }
        return grams;
    }

    function replaySimilarity(targetText, sourceText) {
        const target=replayNgrams(targetText), source=replayNgrams(sourceText);
        if(target.size<10 || source.size<10) return {score:0,common:0};
        let common=0; target.forEach(g=>{if(source.has(g))common+=1;});
        const containment=common/Math.max(1,Math.min(target.size,source.size));
        const jaccard=common/Math.max(1,target.size+source.size-common);
        return {score:Math.max(containment,jaccard*1.5),common};
    }

    function replaySegmentAuthorizedByCustom(segment, custom = '') {
        const direction=String(custom||'').trim();
        if(!direction)return false;
        if(draftPreservesCustomExpression(segment,direction))return true;
        const hit=replaySimilarity(segment,direction);
        return (hit.common>=16&&hit.score>=0.38)||(hit.common>=10&&hit.score>=0.52);
    }

    function immediatePlotReplayIssues(draft, entry, custom = '') {
        const text = String(draft || '').trim();
        if (!text || !entry) return [];
        const sources = [
            { label:`最新AI第${Number(entry.index ?? -1)}层`, text:String(entry.text || '') },
            { label:'上一条user', text:String(previousUserBefore(entry)?.text || '') },
        ].filter(item => item.text.trim());
        if (!sources.length) return [];

        // 只拦“明显复播”，避免因为同一场景里重复出现人名/地点/物件而误杀。
        // 整稿 + 24字以上长句段都检查，能抓住“先复述上一轮，再补一句新动作”的情况。
        const segments=[text, ...(text.match(/[^。！？!?\n]{24,}[。！？!?]?/g)||[])];
        let best=null;
        for(const source of sources){
            for(const segment of segments){
                if(replaySegmentAuthorizedByCustom(segment,custom))continue;
                const hit=replaySimilarity(segment,source.text);
                if(!best || hit.score>best.score) best={label:source.label,score:hit.score,common:hit.common,segment};
            }
        }
        if(best && ((best.common>=24 && best.score>=0.40) || (best.common>=14 && best.score>=0.58))){
            return [`检测到最近一拍剧情复播：当前user接力与${best.label}高度重合（${Math.round(best.score*100)}%）；接力必须写“下一步”，不能把刚发生的内容换句话再演一次`];
        }
        return [];
    }

    function oldPlotReplayIssues(draft, entry, custom = '') {
        const text=String(draft||'').trim();
        if (!text || Number(entry?.index ?? -1) < 7) return [];
        const chat=Array.isArray(ctx()?.chat)?ctx().chat:[];
        const cutoff=Math.max(0, Number(entry.index)-continuityFloorCount());
        if (cutoff <= 0) return [];

        // 同时检查整稿和每个较长句段。这样“旧剧情复播了一段 + 后面补了当前安全句”
        // 不会因为安全句把整篇相似度稀释掉。
        const segments=[text, ...(text.match(/[^。！？!?\n]{18,}[。！？!?]?/g)||[])];
        let best=null;
        for(let i=0;i<cutoff;i+=1){
            const message=chat[i];
            if(!message || message.is_system || !textOf(message)) continue;
            const sourceText=textOf(message);
            for(const segment of segments){
                if(replaySegmentAuthorizedByCustom(segment,custom))continue;
                const hit=replaySimilarity(segment,sourceText);
                if(!best || hit.score>best.score) best={floor:i,score:hit.score,common:hit.common,segment};
            }
        }
        if(best && ((best.common>=18 && best.score>=0.32) || (best.common>=10 && best.score>=0.46))){
            return [`检测到旧剧情复播：当前接力与历史第${best.floor}层高度重合（${Math.round(best.score*100)}%），但该层不属于最近${continuityFloorCount()}层当前连续性窗口`];
        }
        return [];
    }

    function detectDraftIssues(draft, { entry, custom = '', allowJump = false, environment = null } = {}) {
        const text = String(draft || '').trim();
        const issues = [];
        if (!text) return ['输出为空'];
        issues.push(...detectFigurativeLanguageIssues(text,custom));
        issues.push(...immediatePlotReplayIssues(text, entry, custom));
        issues.push(...oldPlotReplayIssues(text, entry, custom));
        const latest = String(entry?.text || '');
        const signals = detectCompletionSignals(latest, previousUserBefore(entry).text);
        if (!explicitRepeatIntent(custom)) {
            for (const signal of signals) {
                const start = new RegExp(signal.start, 'i');
                if (start.test(text)) issues.push(`剧情状态倒退：${signal.label}，却又重新发起同一动作`);
            }
        }
        // user 接力只能写 user。char/NPC只能作为宾语或既成事实引用，不能成为任何“新动作/回应”的主语。
        issues.push(...detectNpcAgencyIssues(text, npcSubjectCandidates(environment || {}, entry)));
        if (!allowJump) {
            const hardTimeJumps = text.match(/过了一会儿|没过多久|片刻后|几分钟后|十分钟后|半小时后|一小时后|几小时后|第二天|翌日|后来|最终|(?:洗|吃|做|结束)完(?:后)?/g) || [];
            if (hardTimeJumps.length >= 1) issues.push('普通接力出现时间/阶段跳转；应停在当前场景等待char/NPC下一轮反应');
        }
        return [...new Set(issues)];
    }

    function normalizeRelayEchoText(value) {
        return String(value||'').toLowerCase().replace(/[\s，。！？；、,.!?;:“”"'‘’（）()【】\[\]—…<>《》]/g,'');
    }

    function draftPreservesCustomExpression(draft, custom) {
        const rawDraft=String(draft||''),rawCustom=String(custom||'').trim();
        if(rawCustom&&rawDraft.includes(rawCustom)){
            const index=rawDraft.indexOf(rawCustom),prefix=rawDraft.slice(Math.max(0,index-16),index);
            if(!/(?:不要|别|不准|禁止|不用|无需|不再|不去|不想|拒绝|取消)(?:再|去|做|进行|继续)?\s*$/i.test(prefix))return true;
        }
        const a=normalizeRelayEchoText(rawDraft), b=normalizeRelayEchoText(rawCustom);
        if(!b || b.length<4 || !a)return false;
        if(a===b)return true;
        // 接力稿允许在用户原话前后补充动作；只要规范化后的完整原话仍连续存在，
        // 就应视为保留，不能因为稿件整体更长而被长度比例误杀。
        if(b.length>=8&&a.includes(b))return true;
        const ratio=a.length/Math.max(1,b.length);
        if(ratio>=0.72 && ratio<=1.38 && (a.includes(b)||b.includes(a)))return true;
        if(Math.min(a.length,b.length)<8)return false;
        const grams=value=>{const out=new Set();for(let i=0;i<value.length-1;i++)out.add(value.slice(i,i+2));return out;};
        const ag=grams(a),bg=grams(b);let common=0;for(const g of ag)if(bg.has(g))common++;
        const containment=common/Math.max(1,Math.min(ag.size,bg.size));
        return ratio>=0.72 && ratio<=1.38 && containment>=0.92;
    }

    function relayMaxChars() {
        const value=Number(runtime.settings?.relayMaxChars ?? 0);
        return Number.isFinite(value) ? Math.max(0,Math.min(20000,value)) : 0;
    }
    function relayRetryAttempts() {
        return Math.max(1,Math.min(6,Number(runtime.settings?.relayRetryAttempts||4)));
    }
    function relayRepairAttempts() {
        return Math.max(1,Math.min(6,Number(runtime.settings?.relayRepairAttempts||3)));
    }
    function relayContinuationLimit() {
        return Math.max(1,Math.min(6,Number(runtime.settings?.relayContinuationMax||3)));
    }
    function compactSafeDraft(raw) {
        // U1.4：默认不再硬截800字。0=不主动截断；需要时由用户设置字符上限。
        // 只有模型原始返回值走包装词净化；预览框里的用户编辑不能再被当成模型包装处理。
        return limitCompleteSentence(raw, relayMaxChars(), { cleanModelOutput:true });
    }

    async function relayEnvironment(entry, relayQuery = '') {
        const bridge = globalThis.VVVTheaterMemoryBridge;
        if (bridge && typeof bridge.getRelayContext === 'function') {
            try {
                const snapshot = await bridge.getRelayContext({ relayQuery, anchorFloor:Number(entry?.index ?? -1), continuityFloors:continuityFloorCount() });
                if (snapshot && typeof snapshot === 'object') {
                    return {
                        source: `R9S1P13 bridge ${snapshot.version || ''}`.trim(),
                        writingContext: snapshot.writingContext || {},
                        r9s1p1: snapshot.state || {},
                        latestCompanion: snapshot.latestCompanion || {},
                    };
                }
            } catch (error) {
                console.warn('[AI剧情接力] 读取R9主状态桥失败，降级到基础上下文', error);
            }
        }
        return {
            source: 'fallback',
            writingContext: {
                source: 'vvv-relay-scoped-fallback',
                generationType: 'relay-scoped',
                characterName: String(fallbackCharacterSnapshot()?.name || ctx()?.name2 || '').slice(0,160),
                presetAndWorldInfo: '未读取；只使用接力请求中显式提供的有限剧情资料。',
            },
            r9s1p1: {},
            latestCompanion: entry?.message?.extra?.vvvTheaterCompanion || {},
        };
    }

    function stagnationHint(chat) {
        const recent = chat.slice(-24).map(item => item.text).join('\n');
        const changes = (recent.match(/离开|到达|决定|发现|确认|开始|结束|冲突|答应|拒绝|约定|任务/g) || []).length;
        return {
            stage: recent.length < 2000 ? '开场/短场景' : changes < 3 ? '稳定互动阶段' : '推进阶段',
            possiblyStagnant: recent.length > 5000 && changes < 3,
            note: '只用于给下一小步提供参考，不得强塞事件。',
        };
    }

    function continuityRules(allowJump) {
        if (allowJump) return '用户已明确选择时间推进/旅行/重大变化或自定义跳转：只允许完成这一次明确跳转；最多跨一个必要场景，必须写清因果衔接，不一口气跳过多个剧情节点，不顺手额外制造第二个重大转折。';
        return '连续剧情锁（最高优先级）：只推进当前场景的下一个小节拍。保持当前时间、地点、参与人物、关系阶段与情绪惯性；先接住最新AI正文结尾已经发生的事实。禁止无缘无故跨时间/地点/人物；禁止突然关系跃迁或翻脸；禁止凭空制造重大事件、新设定或关键NPC；禁止把“准备/提议/走向/想要做”直接写成“已经完成”。允许 user 在同一时间/地点内写一组连贯动作、感受与对白，但必须在需要 char/NPC 反应的位置停下；绝不替 char/NPC 回答、决定、同意、说话、靠近、拥抱、亲吻或做任何新动作。';
    }

    function normalizeRelayCustomInput(value = '') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return {
                userText: String(value.userText || '').trim(),
                notes: String(value.notes || value.custom || '').trim(),
                expand: Boolean(value.expand),
            };
        }
        // 兼容旧调用：历史上一个字符串代表“补充想法/自定义方向”，仍交给AI生成。
        return { userText:'', notes:String(value || '').trim(), expand:true };
    }

    function relayTextCharCount(value = '') {
        return [...String(value||'').replace(/\s+/g,'').trim()].length;
    }

    function relayExpansionLengthInstruction(value = '') {
        const count=Math.max(1,relayTextCharCount(value));
        const min=Math.max(count+24,Math.round(count*1.35));
        const max=Math.min(700,Math.max(min+48,Math.round(count*2.15)));
        return `原文约${count}字；扩写后建议约${min}-${max}字。不是硬凑字数，但必须比原文明显更完整。`;
    }

    function relayCustomContract(input = '') {
        const custom=normalizeRelayCustomInput(input);
        const chunks=[];
        if(custom.userText){
            chunks.push(custom.expand
                ? `user原文（自然扩写模式；必须真正重写并扩充，核心行动、顺序、对象和说话意图全部保留；${relayExpansionLengthInstruction(custom.userText)}）：${custom.userText}`
                : `user原文（轻度规整模式；只整理语序、标点、动作与对白边界，不新增剧情）：${custom.userText}`);
        }
        if(custom.notes)chunks.push(`补充想法（与user原文一起发送给AI；用于语气、方向与细节约束，不要求逐字写入）：${custom.notes}`);
        return chunks.join('\n');
    }

    function relayCustomVerificationTarget(input = '') {
        const custom=normalizeRelayCustomInput(input);
        // 有明确user原文时，以原文为硬核；补充想法只做软指导，避免校验器把备注误当成必须逐字出现的台词。
        return custom.userText || custom.notes;
    }

    async function buildPrompt(customInput = '', pinnedEntry = null) {
        const entry = pinnedEntry || commandEntry();
        if (!entry) throw new Error('当前没有可接力的AI正文');
        const custom=normalizeRelayCustomInput(customInput);
        const customContract=relayCustomContract(custom);
        const verificationTarget=relayCustomVerificationTarget(custom);
        if(runtime.selected.has('custom')&&!custom.userText&&!custom.notes)throw new Error('已选择“自定义”，请填写user文字或补充想法');
        const chosen = [...runtime.selected].map(id => DIRECTIONS.find(item => item[0] === id)?.[1]).filter(Boolean);
        if (customContract) chosen.push(`自定义：${customContract.slice(0, 900)}`);
        if (!chosen.length) chosen.push('自然推进');
        if (runtime.settings?.fateEnabled && (runtime.selected.has('random') || runtime.settings?.fateAutoEnabled)) {
            const card = runtime.currentFateCard || (runtime.selected.has('random') ? drawFateCard({ manual:true }) : maybeAutoFate(entry));
            if (card) chosen.push(`命运卡【${FATE_CATEGORY_LABELS[card.category] || card.category}】：${card.text}`);
        }
        // P21：重写/中止恢复时，上下文只截到“稳定AI锚点”为止。
        // 被中止的半截AI、以及它前面的待替换user消息都不能再污染新的接力稿。
        const chat = transcript(continuityFloorCount(), entry.index, { excludeOpening:true });
        const jump = chosen.some(item => item.includes('时间推进') || item.includes('旅行/跨城') || item.includes('重大变化')) || /第二天|几小时后|旅行|出差|跨城|重大变化|跳到|直接到/.test(`${custom.userText} ${custom.notes}`);
        const currentTurn = currentTurnSnapshot(entry);
        const relayQuery = buildRelayQuery(currentTurn, chosen);
        const promptAnchor=anchorFromEntry(entry);
        const environment = await relayEnvironment(entry, relayQuery);
        if(!relayAnchorIsCurrent(promptAnchor))throw new Error('构建接力上下文期间聊天或最新AI楼层已变化，本次结果已丢弃');
        runtime.lastEnvironment = environment;
        environment.currentReality = currentTurn;
        environment.currentRealityHardFacts = currentTurn.hardFacts || [];
        environment.timelinePriority = [
            '1. currentRealityHardFacts = 代码判定的已完成事实，最高优先级。',
            '2. 最新AI正文结尾（currentReality.currentRealityTail）= 当前现实真值。',
            '3. 最新AI正文 + 上一条user = 当前回合事实。',
            '4. R9当前scene/人物状态。',
            '5. 最近原文窗口。',
            '6. R9总结/检索命中仅作历史参考；冲突时必须忽略旧资料。',
            '7. 本次请求明确提供的有限剧情资料与规则。',
        ];
        environment.recentChat = chat;
        environment.recentChatPolicy = { floors: continuityFloorCount(), requestedMemoryWindow: normalizedRecentFloorCount(), note: 'P24连续性隔离：真正用于续写现在的原文固定只携带最近6层，且剧情超过6层后彻底排除开场消息。更早内容只能作为历史事实经R9结构化记忆/检索进入，不得作为当前动作模板。' };
        environment.director = directorAppliesToRelay() ? { enabled:true, ...stagnationHint(chat) } : { enabled:false, note:'0-32剧情导演未作用于AI剧情接力' };
        environment.controlLayer = controlLayerSnapshot(entry);
        return `你只替 user 写下一条可以直接发送的动作/对白，不继续写 assistant/角色正文，不替对方角色做决定。
方向：${chosen.join(' + ')}

【用户自定义行动契约｜本轮最高优先级】
${customContract ? `${custom.userText ? `- user需要发送的原文：${custom.userText.slice(0,12000)}\n- AI扩写：${custom.expand ? `开启。必须真正重写并扩充，而不是原样复述或只加标点。${relayExpansionLengthInstruction(custom.userText)} 保留原有行动顺序、人物对象和说话意图，在不替char/NPC新增回应的前提下补充user侧动作衔接、语气、姿势、停顿和必要的即时感官细节。` : '关闭。仍必须调用AI做轻度规整：只调整语序、标点、动作/对白边界和明显口语病句，不主动添加新动作、新台词、新剧情或新结果。'}` : '- 未提供固定user原文；根据补充想法生成一条新的user输入。'}
${custom.notes ? `- 补充想法：${custom.notes.slice(0,1200)}\n- 上方user原文与补充想法必须在同一次生成中一起读取。补充想法用于语气、方向或细节约束；若与user原文冲突，以user原文为准。` : '- 无额外补充想法。'}
- 必须落实同一个核心行动、目的地、对象与意图；可以补充合理过程，但禁止换成别的行动。
- 用户原文里的括号/圆括号内容若描述“随后、然后、接着、他/我做了……”之类动作，默认视为舞台动作/写作指令，不是角色要念出口的台词；必须把它改写成正常叙事动作，并让括号前后的对白各归其位，绝不能把括号动作连同说明直接念出来。
- 如果原文是“user把/扶/抱/拉/带char到某个位置”“让char坐到自己腿上”这类由user主动造成的身体位置变化，可以把char写成user动作的宾语，例如“你扶住她的腰，把她往自己腿上带”；这不等于替char自主行动。禁止额外补写char主动配合、点头、回应、亲吻或其他自主反应。
- 若user原文本身就是想说出的台词、提问或感受表达，应保留其核心表达和意思；扩写模式允许自然换句式、加引号和断句，不要求逐字照抄。
${custom.userText&&custom.expand?`【自然扩写质量要求｜必须执行】
- 不能把原文直接原样返回；不能只加逗号、句号或把括号换成一句连接词。
- 先把原文拆成“动作 → 台词 → 动作 → 台词”的自然顺序，再补少量user侧动作细节，使整段像玩家认真写出来的消息，而不是说明书。
- 原文已有对白保持口语感，不要擅自改成文绉绉、油腻、霸总或黄文腔。
- 不复述上一轮assistant正文，不替user解释动机，不写char的心理或回应。
- ${relayExpansionLengthInstruction(custom.userText)}
- 参考转换：原文“我走到她旁边说，等一下（随后我坐下把她带到腿上）这样舒服点吗” → 可写成“我走到她椅子旁，先低声让她等一下，随后在椅子上坐下，伸手扶住她的腰，把人往自己腿上带了带：‘这样舒服点吗？’”这种结构；只学习整理方式，不照抄例句。` : ''}
${verificationTarget && !custom.userText && customExpressionRequirements(verificationTarget).length?`- 必须逐句保留的台词/提问：\n${customExpressionRequirements(verificationTarget).map(item=>`  · ${item}`).join('\n')}`:''}
${custom.userText && !custom.expand ? `【轻度规整模式｜硬限制】\n- 这不是自由续写。只允许整理上方 user 原文：修正语序、断句、标点、代词指向、对白与动作边界。\n- 可以把括号里的动作说明改写成正常叙事动作，但不能把括号说明念成台词。\n- 不得主动新增原文没有的新动作、新对白、新决定、新情节、新结果；原则上长度不超过原文约1.35倍。\n- 补充想法只能帮助确定语气/整理方式，不能借此把轻度规整升级成大段扩写。` : ''}
- 必须保持原指令中“谁对谁做什么”的施事者和对象。若指令要求 NPC 做事，只能写成 user 请求、示意或等待该 NPC 去做，不得把它偷换成 user 自己做出另一个决定。
- “几个、多少、选哪个、要不要”等开放问题必须保持未决，停在等待对应人物回答的位置；禁止自行补出数量、选项、同意或拒绝。
- 若其他方向、命运卡、导演建议、旧记忆与这条自定义指令冲突，一律忽略冲突项并服从本行动契约。` : '- 本轮没有自定义行动契约，按所选方向自然推进。'}

【本轮写作视角｜硬要求】
- ${relayPerspectiveInstruction()}
- 视角只改变 user 的叙述人称，不改变当前事实、人物关系、USER主体边界、NPC权限或剧情方向。
${continuityRules(jump)}

【当前现实硬事实｜代码判定，高于检索/总结/旧scene】
${currentTurn.hardFacts?.length ? currentTurn.hardFacts.map(item => `- ${item}`).join('\n') : '- 未识别到额外硬事实；仍以最新AI正文结尾为准。'}

【时间线真值规则｜高于所有旧记忆】
- 最新AI正文的结尾就是“现在”。它已经写明完成的动作，视为已经完成，绝不能重新发起，除非用户自定义明确要求“再来一次/重新做”。若上一条user明确从A移动到B，B是当前地点，A立即降级为历史地点。
- 【P24开场隔离】0层/1层/角色开场白只属于历史起点。只要当前锚点已经超过6层，严禁复刻、改写、重新执行开场白中的动作链、地点链、物品链或对白链；即使历史检索再次命中，也只能当过去事实。
- 如果你发现某段旧资料与当前场景都很具体，必须选择“最新6层原文 + 最新AI结尾”，绝不能因为旧资料更长、更生动就回到旧剧情。
- 如果 R9 scene、总结、retrievalHits 或旧聊天与最新AI正文发生冲突，一律以最新AI正文为准。
- 先确认 user 当前身体位置、正在做什么、刚刚完成了什么，再写下一步。禁止剧情倒退。
- ${custom.userText ? (custom.expand ? `本轮是自然扩写模式：${relayExpansionLengthInstruction(custom.userText)} 不要硬凑300-800字，也不要把短句灌水成大段小说。` : '本轮是轻度规整模式：不要为了凑字数扩写，尽量贴近原文长度，只让语句更顺、更清楚。') : '建议写成约300-800中文字符的完整 user 段落；允许 user 在当前同一场景里有连续的小动作、真实感受与对白。U1.4默认不做800字符硬截断；若用户设置了接力字符上限，则必须服从该上限。'}
- 不写跨时间/跨地点的流水账，不提前把需要 char/NPC 回应之后才可能发生的未来结果写完。

【主体边界语义硬锁｜绝对不能违反】
- 整段只允许 user 产生新的主动动作、新对白、新决定和新感受。
- 允许客观观察 char/NPC 已经存在的静态状态，例如“她的头发还湿着”“她身上还裹着浴巾”“她的衣服仍然潮湿”；静态观察不算替NPC行动。
- char/NPC 不得在这条 user 消息里产生任何自主的新动作、表情变化、语言、回应、同意、拒绝、靠近、躲闪、点头、摇头或主动身体反应。用户原文明确要求的“user把/扶/抱/拉/带char到某位置”可以写成user主动动作，char只能作为宾语，不能顺手补写char主动配合。
- 不论使用全名、代词还是昵称都一样：例如角色“藤原梦”写成“梦走了过来/梦说/她要求/她伸手”仍然属于越权，必须停在user动作或对白处。
- 禁止写“她笑了/她点头/她靠过来/她没有躲/她抱住我/她说……/他转身/对方回应……”等新行为。
- 如果一句话需要描述 char/NPC 接下来会做什么，就在 user 动作或对白结束处停笔。

【绝对直叙规则｜与剧情状态锁同级】
- 用户自定义中明确要求说出的原话、提问和比较性自我表达不受文风禁词限制；以下规则只限制AI自行新增的修辞。
- 拒绝比喻式写法：禁止明喻、暗喻、类比、拟人、象征、夸张和文学化意象。
- 禁止出现“像、像是、好像、仿佛、如同、犹如、宛如、宛若、好似、仿若、恍若、恰似、有如、一样、似的、……般”等比较/比喻结构。
- 禁止“空气凝固、情绪翻涌、目光灼烧、声音砸下、夜色拥抱、心里炸开”等隐喻或拟人句。
- 只写可直接观察或确认的事实：user 的具体动作、姿势、位置、触碰、实际感受和直接对白。描写必须朴素、准确、无修辞。
只输出可直接作为 user 消息发送的正文，不输出分析、标题、选项、解释、JSON、XML标签或代码块。只使用本次请求明确提供的有限剧情资料，不推测未提供的设定。

【0-32规则账本｜高优先级】
${(() => { const r=environment.controlLayer?.ledger||{}; const lines=[...(r.long||[]).map(x=>`长期：${x}`),...(r.chapter||[]).map(x=>`本章：${x}`),...(r.timed||[]).map(x=>`临时（剩${x.remaining}层）：${x.text}`)]; return lines.length?lines.map(x=>`- ${x}`).join('\n'):'- 无额外规则'; })()}

【0-32命运卡｜软约束】
${environment.controlLayer?.fateCard ? `- ${environment.controlLayer.fateCard.categoryLabel}：${environment.controlLayer.fateCard.text}\n- 命运卡只提供“可能发生什么”的种子；若与最新正文、角色人设、规则账本或连续剧情锁冲突，必须降级或忽略。` : '- 本轮无命运卡。'}

【当前酒馆剧情环境】
${JSON.stringify(environment)}

【最后提醒】先看 currentReality.currentRealityTail。它代表此刻真实状态；它是“起跑线”，不是让你改写的素材。user接力第一句就必须发生在它之后，不能总结、复述或换句话重演刚刚的AI正文。`;
    }

    function strip(raw) {
        let value = String(raw || '')
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
            .replace(/^\s*```(?:text|markdown|md|json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .replace(/^\s*(?:assistant|user|用户|正文|输出|回答)\s*[:：]\s*/i, '')
            .trim();
        if ((value.startsWith('“') && value.endsWith('”')) || (value.startsWith('\"') && value.endsWith('\"'))) value = value.slice(1, -1).trim();
        return value;
    }

    function cleanRelayModelOutput(raw) {
        let value = strip(raw).replace(/\r\n?/g, '\n').trim();
        if (!value) return '';
        // 部分模型会在正文外再包一层礼貌话术/标题；这些不是 user 消息正文。
        for (let pass=0; pass<3; pass+=1) {
            const cleaned=value
                .replace(/^\s*(?:【\s*)?(?:正文|输出|回答|assistant|user|用户)(?:\s*】)?\s*[:：]\s*/i, '')
                .replace(/^\s*(?:以下(?:是|为)|下面(?:是|为))[，,。！!：:\s]*/i, '')
                // “好的，我推开门”可能是真实对白；只有它后面明确接包装词时才剥离。
                .replace(/^\s*(?:好的|好吧|当然|明白了|可以)[，,。！!：:\s]+(?=(?:【\s*)?(?:正文|输出|回答|以下|下面))/i, '')
                .trim();
            if (cleaned===value) break;
            value=cleaned;
        }
        // 只处理独立一行的元说明，避免误伤正文中的正常对白。
        const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
        while (lines.length && /^(?:好的|明白了|当然可以|以下(?:是|为)|下面(?:是|为)|正文如下)[，,。！!：:\s]*$/i.test(lines[0])) lines.shift();
        while (lines.length && /^(?:注|说明|备注|解释|附言|以上(?:就是|内容)|希望这|如果你还需要|需要我继续)[：:，,\s]/i.test(lines.at(-1))) lines.pop();
        value = lines.join('\n').trim();
        // 常见的完成尾标记来自预设模板，不属于可发送的剧情正文。
        value = value.replace(/(?:^|\n)\s*(?:（完）|\(完\)|\[完\]|完毕|以上内容)[。！!。]?\s*$/i, '').trim();
        return value;
    }

    function limitCompleteSentence(raw, maxChars = relayMaxChars(), { cleanModelOutput = false } = {}) {
        const source = cleanModelOutput ? cleanRelayModelOutput(raw) : String(raw ?? '').replace(/\r\n?/g, '\n').trim();
        const chars = [...source];
        const requested=Number(maxChars||0);
        if(!Number.isFinite(requested)||requested<=0)return chars.join('').trim();
        const limit=Math.max(1,Math.min(20000,requested));
        if(chars.length<=limit)return chars.join('');
        const first=chars.slice(0,limit).join('');
        const matches=[...first.matchAll(/[。！？!?；;]\s*/g)];
        const cut=matches.length?matches.at(-1).index+matches.at(-1)[0].length:limit;
        return [...first].slice(0,cut).join('').trim();
    }

    const RELAY_SYSTEM_PROMPT = `${FALLEN_WRITER_CONTEXT}
【AI接力任务】你是互动剧情 user 输入代写器。用户本轮明确输入的自定义行动是最高优先级事实：必须执行同一个核心行动、目的地、对象与意图，只能补充过程，绝不能偷换成另一件事。若用户提供“user需要发送的话”并开启AI扩写，你必须真正改写并自然扩充：不能原样返回、不能只加标点、不能把短句机械拉长；应整理动作与对白顺序，把括号舞台动作写成自然叙事，并补充少量只属于user的动作衔接、语气、姿势、停顿或即时感官细节。若关闭AI扩写，则只做轻度规整。若用户自定义本身是想说出的台词、提问或感受表达，应保留核心意思和口语感，扩写时允许自然换句式而非逐字锁死。严格遵守连续剧情锁、USER主体语义硬锁与绝对直叙规则。只允许user产生新的主动动作、对白、决定和感受；允许客观描述char/NPC已经存在的静态状态。用户明确写出的“把/扶/抱/拉/带char到某位置”可作为user主动动作执行，char只能作为宾语；除此之外不得替char/NPC新增自主动作、表情变化、说话、回应、要求、邀请、同意、拒绝或主动身体反应。角色全名、代词、昵称都按同一主体识别；绝不能把user下一步写成包含char/NPC完整回应的一整轮场景。禁止AI自行新增任何比喻、类比、拟人、象征、夸张或文学化意象。长度服从本轮动态要求，不为凑字数灌水。只输出user正文。`;

    function configuredSourceMode() {
        return 'independent';
    }

    function configuredSourceLabel() {
        return 'AI接力独立API · 有限剧情资料';
    }

    function isProviderPolicyRefusalText(value) {
        return /prompt could not be submitted|contains? sensitive words?|generative AI prohibited use policy|prohibited use policy|content policy (?:violation|blocked|refusal)|blocked (?:by|due to) safety|finishReason["':\s]+SAFETY|提示内容无法提交|包含(?:有)?敏感词|生成式\s*AI\s*禁止使用政策|违反.*(?:内容|使用)政策|被.*安全(?:审核|系统).*拦截/i.test(String(value||''));
    }

    function providerPolicyRefusalError(value) {
        const error=new Error(String(value||'供应商政策拒绝').slice(0,1000));
        error.name='ProviderPolicyRefusalError';error.code='provider-policy-refusal';error.policyRefusal=true;
        return error;
    }

    function isProviderPolicyRefusalError(error) {
        return Boolean(error?.policyRefusal === true
            || String(error?.name||'') === 'ProviderPolicyRefusalError'
            || String(error?.code||'') === 'provider-policy-refusal'
            || isProviderPolicyRefusalText(error?.message));
    }

    const RELAY_POLICY_RECOVERY_SYSTEM_PROMPT = [
        '你是一个中文文本编辑器，只处理本次请求明确给出的 user 文本。',
        '你的任务是整理或自然扩写 user 自己的动作、对白和提问；不得补写对方角色/NPC 的新回应、心理、表情、动作或结论。',
        '不要读取或假设任何未在本次请求中提供的旧聊天、世界书、RAG、手机、总结或其他背景。',
        '保留原文核心意思、人物对象、动作顺序和开放问题；括号里的动作说明可以改成自然叙事。',
        '只输出可以直接发送的 user 正文，不要解释、标题、标签或分析。',
        '遵守当前模型服务的使用政策。',
    ].join('\n');

    function buildPolicyRecoveryPrompt(input = '') {
        const custom=normalizeRelayCustomInput(input);
        const source=String(custom.userText||'').trim();
        const notes=String(custom.notes||'').trim();
        if(!source&&!notes)throw new Error('最小上下文恢复缺少可编辑的 user 文本或补充想法');
        const mode=source
            ? (custom.expand
                ? `自然扩写：必须真正改写，不得原样返回；${relayExpansionLengthInstruction(source)} 只补 user 侧必要的动作衔接、语气、停顿和即时感受，不新增对方回应。`
                : '轻度规整：只整理语序、标点、动作与对白边界，不新增剧情、动作、台词或结果。')
            : '根据补充想法生成一条简洁的 user 输入；只写 user，不写对方角色的回应。';
        return `【AI接力最小必要上下文恢复】
本次只处理下面明确提供的文字，不携带旧剧情、世界书、RAG、手机、总结或其他历史上下文。

【写作视角】
${relayPerspectiveInstruction()}

【处理模式】
${mode}

【user原文】
${source||'（未提供）'}

【补充想法】
${notes||'无'}

【硬要求】
1. 保留原文核心行动、对象、先后顺序、提问和说话意图。
2. 原文中的开放问题保持开放，不替对方回答。
3. 括号动作改成正常叙事，不把括号说明念成台词。
4. 只允许 user 产生新的主动动作、对白、决定和感受；不得新增 char/NPC 的主动回应。
5. 不引用、不补写任何未在本请求中出现的背景事实。
6. 只输出可直接发送的 user 正文。`;
    }

    async function independent(prompt, { systemPrompt = RELAY_SYSTEM_PROMPT, jsonMode = false, responseLength = null, signal = null } = {}) {
        const requested = responseLength === null || responseLength === undefined || responseLength === '' ? Number.NaN : Number(responseLength);
        const body = {
            prompt: String(prompt || '').trim(),
            systemPrompt: String(systemPrompt || '').trim(),
            promptPipeline: {
                source:'vvv-relay-scoped', generationType:'relay-scoped',
                presetIncluded:false, worldBookIncluded:false, personaIncluded:false,
            },
            feature: 'relay',
            jsonMode: Boolean(jsonMode),
        };
        if (Number.isFinite(requested)) body.maxTokens = Math.max(128, Math.min(100000, requested));
        runtime.lastProviderFinishReason='';let data;
        try {
            data = await serverJson('/generate', {
                method: 'POST',
                body: JSON.stringify(body),
                signal,
            });
        } catch (error) {
            if (error?.policyRefusal === true || String(error?.name||'') === 'ProviderPolicyRefusalError' || String(error?.code||'') === 'provider-policy-refusal' || isProviderPolicyRefusalText(error?.message)) {
                runtime.lastGenerationSource='relay-independent-api';runtime.lastGenerationSourceLabel='AI接力独立API · 供应商政策拒绝';
                const wrapped=providerPolicyRefusalError(error?.message||'供应商政策拒绝');
                wrapped.cause=error;
                throw wrapped;
            }
            throw error;
        }
        if(isProviderPolicyRefusalText(data?.text)){
            runtime.lastGenerationSource='relay-independent-api';runtime.lastGenerationSourceLabel='AI接力独立API · 供应商政策拒绝';
            throw providerPolicyRefusalError(data.text);
        }
        runtime.lastPipelineDebug = data?.promptPipeline || body.promptPipeline;
        runtime.lastProviderFinishReason=String(data?.finishReason||'');
        runtime.lastGenerationSource='relay-independent-api';
        runtime.lastGenerationSourceLabel='AI接力独立API · 有限剧情资料';
        return data.text;
    }

    async function generateWithConfiguredApi(prompt, options = {}) {
        const owner = String(options.owner || 'AI剧情接力');
        if(!runtime.configuredSourceReady)throw new Error('AI接力写作源尚未加载完成');
        if(runtime.activeGeneration){const error=new Error(`${runtime.activeGenerationOwner||'上一条AI接力请求'}仍在后台收尾；为防重复调用，请等它真正结束后再试`);error.name='RelayGenerationInFlightError';throw error;}
        const controller=new AbortController();
        const task=Promise.resolve().then(async()=>{
            const raw=await independent(prompt,{...options,signal:controller.signal});
            if(!String(raw||'').trim()){const error=new Error('AI剧情接力独立API返回空内容');error.name='RelayEmptyResponseError';throw error;}
            return raw;
        });
        runtime.activeGeneration=task;
        runtime.activeGenerationOwner=owner;
        runtime.activeGenerationAbort=()=>controller.abort();
        try{return await task;}
        finally{if(runtime.activeGeneration===task){runtime.activeGeneration=null;runtime.activeGenerationOwner='';runtime.activeGenerationAbort=null;if(!runtime.busy)setBusy(false);}}
    }

    async function generateRaw(prompt) {
        return generateWithConfiguredApi(prompt, { owner:'AI剧情接力', systemPrompt:RELAY_SYSTEM_PROMPT });
    }


    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function relayRequestTimeoutMs() {
        const sec=Number(runtime.settings?.timeoutSeconds||runtime.serverConfig?.relay?.timeoutSeconds||90);
        return Math.max(10000,Math.min(1800000,Number.isFinite(sec)?sec*1000:90000));
    }

    async function withRelayTimeout(promise, timeoutMs=relayRequestTimeoutMs(), onTimeout = null) {
        let timer=0;
        try {
            return await Promise.race([
                Promise.resolve(promise),
                new Promise((_,reject)=>{timer=setTimeout(()=>{
                    try{onTimeout?.();}catch(_error){}
                    const e=new Error(`AI剧情接力独立API超时（${Math.round(timeoutMs/1000)}秒）；本次不会自动换源`);
                    e.name='RelayTimeoutError';e.code='relay-chain-timeout';e.permanentForCycle=true;reject(e);
                },timeoutMs);}),
            ]);
        } finally { if(timer)clearTimeout(timer); }
    }

    function relayErrorChainSome(error,predicate,seen=new Set()) {
        if(!error||typeof error!=='object'||seen.has(error))return false;
        seen.add(error);if(predicate(error))return true;
        return relayErrorChainSome(error.cause,predicate,seen)||relayErrorChainSome(error.primaryError,predicate,seen);
    }

    function isTransientRelayRequestError(error) {
        if(relayErrorChainSome(error,item=>item?.permanentForCycle===true))return false;
        const name=String(error?.name||'');
        if (name === 'AbortError') return false;
        if (name === 'RelayTimeoutError' || name === 'RelayGenerationInFlightError') return false;
        if (name === 'RelayEmptyResponseError') return true;
        const message = String(error?.message || error || '').toLowerCase();
        return /fetch failed|failed to fetch|network ?error|networkerror|load failed|timed? ?out|timeout|空内容|空响应|econn|socket|connection reset|temporar(?:y|ily) unavailable|service unavailable|bad gateway|gateway timeout|http\s*(?:408|409|425|429|5\d\d)\b|\b(?:408|409|425|429|5\d\d)\b/.test(message);
    }

    function relayRetryDelay(attempt) {
        const base = Math.min(4200, 550 * Math.pow(1.5, Math.max(0, attempt - 1)));
        return Math.round(base + Math.random() * 180);
    }

    async function generateRawWithSilentRetry(prompt, { maxAttempts = relayRetryAttempts(), timeoutMs = relayRequestTimeoutMs() } = {}) {
        let lastError=null;
        runtime.lastGenerationSource='';runtime.lastGenerationSourceLabel='';
        runtime.retryNoticeShown=false;
        for(let attempt=1;attempt<=maxAttempts;attempt+=1){
            try {
                setBusy(true, attempt===1?'正在使用接力独立API生成…':`网络波动，自动重试 ${attempt}/${maxAttempts}…`);
                const chainTimeoutMs=Math.min(3600000,timeoutMs*2+15000);
                const raw=await withRelayTimeout(generateRaw(prompt),chainTimeoutMs,()=>runtime.activeGenerationAbort?.());
                if(!String(raw||'').trim()){
                    const e=new Error('AI剧情接力返回空内容');e.name='RelayEmptyResponseError';throw e;
                }
                return raw;
            } catch(error) {
                lastError=error;
                if(!isTransientRelayRequestError(error))throw error;
                if(attempt>=maxAttempts)break;
                if(!runtime.retryNoticeShown){runtime.retryNoticeShown=true;toast('网络或接口短暂波动，0-32 正在自动重试；不用再点第二次。','warning');}
                console.warn(`[AI剧情接力] 请求失败，自动重试 ${attempt}/${maxAttempts}`,error);
                await sleep(relayRetryDelay(attempt));
            }
        }
        const finalError=new Error(`AI剧情接力连续自动重试仍失败：${String(lastError?.message||lastError||'未知错误')}`);
        finalError.cause=lastError;
        throw finalError;
    }

    async function generateRawWithPolicyRecovery(prompt, {
        customRequest = null,
        ensureCurrent = null,
        maxAttempts = relayRetryAttempts(),
        timeoutMs = relayRequestTimeoutMs(),
    } = {}) {
        try {
            return await generateRawWithSilentRetry(prompt,{maxAttempts,timeoutMs});
        } catch (error) {
            if(!isProviderPolicyRefusalError(error))throw error;
            try{ensureCurrent?.();}catch(anchorError){throw anchorError;}
            const request=normalizeRelayCustomInput(customRequest||{});
            if(!request.userText&&!request.notes)throw error;
            runtime.lastPipelineDebug={
                source:'vvv-relay-policy-context-recovery',
                generationType:'relay-policy-context-recovery',
                reason:'provider-policy-refusal',
                historyIncluded:false,
                worldBookIncluded:false,
                ragIncluded:false,
                phoneIncluded:false,
                summaryIncluded:false,
                safetySettingsModified:false,
            };
            runtime.lastGenerationSource='relay-policy-context-recovery';
            runtime.lastGenerationSourceLabel='AI接力独立API · 最小必要上下文恢复';
            setBusy(true,'完整上下文被供应商拒绝，正在用最小必要上下文自动重试…');
            if(!runtime.policyRecoveryNoticeShown){
                runtime.policyRecoveryNoticeShown=true;
                toast('完整剧情上下文被供应商安全策略拒绝；已自动移除无关历史、世界书和RAG，只用你本轮文字重试。不会修改安全设置。','warning');
            }
            const safePrompt=buildPolicyRecoveryPrompt(request);
            try {
                const raw=await withRelayTimeout(
                    generateWithConfiguredApi(safePrompt,{ owner:'AI剧情接力 · 最小上下文恢复', systemPrompt:RELAY_POLICY_RECOVERY_SYSTEM_PROMPT }),
                    Math.min(3600000,timeoutMs*2+15000),
                    ()=>runtime.activeGenerationAbort?.(),
                );
                if(!String(raw||'').trim()){
                    const empty=new Error('AI剧情接力最小上下文恢复返回空内容');empty.name='RelayEmptyResponseError';throw empty;
                }
                try{ensureCurrent?.();}catch(anchorError){throw anchorError;}
                return raw;
            } catch (recoveryError) {
                if(isProviderPolicyRefusalError(recoveryError)){
                    const finalError=providerPolicyRefusalError(`供应商仍拒绝当前文字。插件已经自动尝试“最小必要上下文”恢复，但不会修改或绕过安全设置。\n${String(recoveryError?.message||'').slice(0,600)}`);
                    finalError.cause=recoveryError;
                    throw finalError;
                }
                throw recoveryError;
            }
        }
    }

    function relayFinishReasonIsTruncated(reason='') {
        return /(?:length|max[_ -]?tokens?|token[_ -]?limit|output[_ -]?limit)/i.test(String(reason||''));
    }

    function relayTextLooksTruncated(text='') {
        const value=String(text||'').trim();if(!value)return true;
        const pairs=[['“','”'],['「','」'],['『','』'],['（','）'],['(',')'],['【','】'],['[',']'],['《','》']];
        if(pairs.some(([open,close])=>(value.split(open).length-1)>(value.split(close).length-1)))return true;
        if(/[，,:：；;、（(\[【《“「『—-]$/.test(value))return true;
        if(/(?:而|但|然后|接着|并且|因为|所以|准备|正要|刚要|试图|想要|打算|说道|问道|回答道)$/.test(value))return true;
        return false;
    }

    function relayNeedsContinuation(text,finishReason='') {
        if(runtime.settings?.relayAntiTruncation===false)return false;
        return relayFinishReasonIsTruncated(finishReason)||relayTextLooksTruncated(text);
    }

    function mergeRelayContinuation(base,addition) {
        const left=String(base||'').trimEnd(),right=cleanRelayModelOutput(addition).replace(/^\s*(?:续写|继续|接上文)\s*[:：]\s*/i,'').trimStart();
        if(!right||/^<VVV_COMPLETE>$/i.test(right))return left;
        const max=Math.min(320,left.length,right.length);let overlap=0;
        for(let size=max;size>=4;size-=1)if(left.slice(-size)===right.slice(0,size)){overlap=size;break;}
        return `${left}${right.slice(overlap)}`.trim();
    }

    function buildRelayContinuationPrompt(partial,custom='') {
        return `【AI接力防截断续写】\n上一段 user 正文可能被输出 Token 上限截断。只从截断处继续，补完尚未结束的句子并用一个完整自然的 user 动作或对白收束；不要重写、概括或重复已有文字，不得新增 char/NPC 的动作、对白或回应。若已有文字其实完整，只输出 <VVV_COMPLETE>。只输出需要追加的正文。\n\n【已有正文末尾】\n${String(partial||'').slice(-8000)}${String(custom||'').trim()?`\n\n【原接力方向，仅用于保持目标】\n${String(custom).trim().slice(0,500)}`:''}`;
    }

    async function completeTruncatedRelayText(initial,{custom='',ensureCurrent=()=>{}}={}) {
        let text=String(initial||'').trim(),finishReason=runtime.lastProviderFinishReason,count=0;
        while(relayNeedsContinuation(text,finishReason)&&count<relayContinuationLimit()){
            count+=1;setBusy(true,`检测到接力被截断，正在自动续写 ${count}/${relayContinuationLimit()}…`);
            const addition=await generateRawWithSilentRetry(buildRelayContinuationPrompt(text,custom));ensureCurrent();
            if(/^\s*<VVV_COMPLETE>\s*$/i.test(String(addition||''))){finishReason='';break;}
            const merged=mergeRelayContinuation(text,addition);if(merged===text)throw new Error('AI接力防截断续写没有返回新的正文，已停止以避免重复消耗API');text=merged;finishReason=runtime.lastProviderFinishReason;
        }
        if(relayNeedsContinuation(text,finishReason))throw new Error(`AI接力连续续写 ${relayContinuationLimit()} 次后仍被模型截断；未完整草稿已拦截，请提高“最大输出 Token”后重试`);
        runtime.lastContinuationCount+=count;return text;
    }

    function parseCustomDirectionVerdict(raw) {
        const source=String(raw||'').replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'').trim();
        const match=source.match(/\{[\s\S]*\}/);if(!match)return null;
        try{
            const value=JSON.parse(match[0]);
            if(typeof value?.follows!=='boolean')return null;
            return {follows:value.follows,coreAction:String(value.coreAction||'').slice(0,160),conflict:String(value.conflict||'').slice(0,300)};
        }catch(_error){return null;}
    }

    async function verifyRelayCustomDraft({ request = null, custom = '', draft = '', entry = null } = {}) {
        const normalized=normalizeRelayCustomInput(request||{});
        const direction=String(custom||'').trim();
        const text=String(draft||'').trim();
        if(!direction||!text)return [];
        // fixed20：只要 user 自己提供了原文，就不再用第二个 LLM 当“裁判”。
        // 旧裁判会把正常扩写误判成偏离，连续纠偏后又回退原文，造成“等很久却一字没改”。
        if(normalized.userText&&!normalized.expand)return customDirectionLightPolishIssues(text,direction);
        if(normalized.userText&&normalized.expand)return customDirectionExpansionIssues(text,direction);
        return verifyCustomDirection({custom:direction,draft:text,entry});
    }


    async function verifyCustomDirection({ custom = '', draft = '', entry = null } = {}) {
        const direction=String(custom||'').trim(),text=String(draft||'').trim();
        const local=customDirectionLocalIssues(text,direction);
        if(!direction||!text)return local;
        if(local.length)return local;
        // 高相似在这里是“原话得到保留”的正向证据，不再反向当作复述错误。
        if(draftPreservesCustomExpression(text,direction))return [];
        const prompt=`只做行动一致性判定，不续写剧情。比较“用户指定方向”和“生成稿”：生成稿可以扩写步骤和对白，但必须实际保持同一个核心行动、施事者、对象、目的地和意图；若把A换成B，必须判false。例如“去吃饭”被写成“去睡觉”就是false。若原方向是“某人询问另一个人几个/多少/选哪个”，生成稿必须保留提问者、被问者和未决状态；擅自替任何人补出数量或答案必须判false。若用户指定方向本身是想说出的台词、提问或感受，生成稿原样保留或近义保留属于follows=true，绝不能因为“复述了用户文字”判false。用户原文里的括号若是在描述随后/然后发生的动作，它是舞台动作指令，不是台词；生成稿应把它落实成叙事动作，而不是把括号内容念出来。\n\n【用户指定方向】\n${direction.slice(0,500)}\n\n【生成稿】\n${text.slice(0,6000)}\n\n【最新正文结尾，仅用于消歧】\n${tailText(entry?.text||'',1200)}\n\n只输出JSON：{"follows":true或false,"coreAction":"用户要求的核心行动","conflict":"偏离点；无则空字符串"}`;
        let lastFailure='';
        for(let attempt=1;attempt<=2;attempt+=1){
            try{
                setBusy(true,`正在核对自定义行动一致性${attempt>1?'（重试）':''}…`);
                const raw=await withRelayTimeout(generateWithConfiguredApi(prompt,{owner:'AI接力行动一致性校验',systemPrompt:'你是严格的行动一致性判定器，只输出JSON。不得因为文笔通顺就放过行动偷换；用户原话被准确保留必须判为遵守。',jsonMode:true,responseLength:260}),relayRequestTimeoutMs(),()=>runtime.activeGenerationAbort?.());
                const verdict=parseCustomDirectionVerdict(raw);
                if(!verdict){lastFailure='校验器没有返回合法JSON';continue;}
                if(verdict.follows===false)return [...new Set([...local,`自定义方向发生语义偏离：${verdict.conflict||`没有执行“${verdict.coreAction||direction.slice(0,80)}”`}`])];
                return local;
            }catch(error){
                lastFailure=String(error?.message||error||'校验接口不可用').slice(0,180);
                console.warn(`[AI剧情接力] 行动一致性短校验第${attempt}次失败`,error);
            }
        }
        return [...new Set([...local,`自定义方向校验失败：${lastFailure||'无法确认生成稿是否遵守指定行动'}；为避免行动被偷换，本次不会放行`])];
    }

    async function generateDraft(customInput = '') {
        const queue=globalThis.VVVUnifiedCore?.tasks;
        if(queue)return queue.run('AI剧情接力',()=>generateDraftUnlocked(customInput),{group:'generation-control'});
        return generateDraftUnlocked(customInput);
    }

    async function generateDraftUnlocked(customInput = '') {
        const customRequest=normalizeRelayCustomInput(customInput);
        const custom=relayCustomVerificationTarget(customRequest);
        if(runtime.selected.has('custom')&&!customRequest.userText&&!customRequest.notes)throw new Error('已选择“自定义”，请填写user文字或补充想法');
        if (runtime.busy||runtime.activeGeneration) throw new Error(`${runtime.activeGenerationOwner||'上一条AI接力请求'}仍在处理，请等按钮恢复后再试`);
        if (await isGenerating()) throw new Error('上一轮正文仍在生成，请等它结束后再接力');
        runtime.busy = true;
        runtime.policyRecoveryNoticeShown=false;
        setBusy(true,'正在使用接力独立API生成…');
        try {
            const entry = commandEntry();
            if (!entry) throw new Error('当前没有可接力的AI正文');
            const operationAnchor=anchorFromEntry(entry);
            const ensureCurrent=()=>{if(!relayAnchorIsCurrent(operationAnchor))throw new Error('AI接力生成期间聊天或最新AI楼层已变化，本次草稿已安全丢弃');};

            // fixed9：无论是否开启“AI扩写”，user原文与补充想法都在同一次请求中交给AI。
            // 关闭扩写 = 轻度语句规整；开启扩写 = 在核心行动不变的前提下自然扩写。
            runtime.lastPipelineDebug={
                source:customRequest.userText?(customRequest.expand?'vvv-relay-user-text-expand':'vvv-relay-user-text-polish'):'vvv-relay-notes-generate',
                generationType:'relay-custom',
                aiExpanded:Boolean(customRequest.expand),
                lightPolish:Boolean(customRequest.userText&&!customRequest.expand),
                notesIncluded:Boolean(customRequest.notes),
            };

            const prompt = await buildPrompt(customRequest,entry);
            ensureCurrent();
            runtime.lastPipelineDebug = null;
            runtime.lastCustomDirection = relayCustomContract(customRequest);
            runtime.lastContinuationCount=0;let raw = await generateRawWithPolicyRecovery(prompt,{customRequest,entry,ensureCurrent});
            raw=await completeTruncatedRelayText(raw,{custom,ensureCurrent});
            ensureCurrent();
            let draft = compactSafeDraft(raw);
            const chosenLabels = selectedDirectionLabels();
            const allowJump = chosenLabels.some(item => /时间推进|旅行\/跨城|重大变化/.test(item)) || /第二天|几小时后|旅行|出差|跨城|重大变化|跳到|直接到/.test(`${customRequest.userText} ${customRequest.notes}`);
            let advisoryIssues = detectDraftIssues(draft, { entry, custom, allowJump, environment: runtime.lastEnvironment });
            // fixed33：取消 AI接力的“自定义行动后置硬校验/自动纠偏/拦截”范围。
            // 原因：这层会把“揽进怀里/贴上嘴唇”等正常近义扩写误判为没有执行
            // “拥抱/亲吻”，导致已经生成成功的稿件又被二次裁判拦掉。
            // 现在 user原文与补充想法只在生成 Prompt 中作为最高优先级约束；生成完成后
            // 不再调用 verifyRelayCustomDraft，不再因核心动作关键词、括号动作或近义表达
            // 自动重写，也不会抛出“自定义行动不合格”阻止发送。
            // 仍保留：空稿防护、截断续写、主客体/时间跳转/修辞等本地启发式提示；
            // 这些提示沿用 R19 的非阻断模式，只告警，不删稿、不重试、不拦截。
            runtime.lastActionGateDisabled=true;
            if(!draft.trim())throw new Error('AI接力返回了空稿，已停止发送');

            // R19：恢复旧版的顺畅体验。复播相似度、NPC句法、时间跳转和修辞
            // 都是启发式检测，存在语境歧义，只提示而不再删稿或卡死发送。
            // fixed33：用户明确行动不再经过后置硬校验；以生成 Prompt 约束为准，避免近义表达误伤。
            advisoryIssues=[...new Set(advisoryIssues)];
            runtime.lastAdvisoryIssues=advisoryIssues;
            if(advisoryIssues.length){
                console.warn('[AI剧情接力] 本地启发式提示（R19非阻断）',advisoryIssues);
                toast(`接力已生成；本地规则有 ${advisoryIssues.length} 条提示，已按旧版模式放行。`,'warning');
            }
            ensureCurrent();
            runtime.draft = limitCompleteSentence(draft, relayMaxChars());
            runtime.draftAnchor={...operationAnchor};
            runtime.previewCustom={...customRequest};
            if (!runtime.draft) throw new Error('模型没有生成可用正文');
            toast(customRequest.userText ? (customRequest.expand ? '✒ AI已按原意完成自然扩写，不会原文直发。' : '✒ user文字已规整，并合并补充想法完成接力。') : '✒ AI剧情接力完成（独立API）。', 'success');
            if(runtime.lastContinuationCount)toast(`防截断已自动续写并拼接 ${runtime.lastContinuationCount} 段。`,'success');
            if (runtime.settings.directAfterGenerate) await send(runtime.draft,operationAnchor);
            else openPreview(runtime.draft, customRequest, operationAnchor);
        } finally {
            runtime.busy = false;
            setBusy(false);
        }
    }

    function setBusy(value, label='正在生成…') {
        const active=Boolean(runtime.activeGeneration);
        const effective=Boolean(value)||active;
        document.querySelectorAll('.vvv-relay-bar button,#vvv-relay-command button').forEach(node => {
            node.disabled = effective;
        });
        const generate = document.querySelector('#vvv-relay-command [data-relay-panel-generate]');
        if(effective){
            const busyLabel=active&&!value?`${runtime.activeGenerationOwner||'上一条请求'}正在后台收尾…`:(label||'正在生成…');
            if(generate)generate.innerHTML=`<span>${esc(busyLabel)}</span><i class="vvv-relay-spinner">◌</i>`;
        }else{
            if(generate)generate.innerHTML=`<span>${runtime.lastError?'重新生成':'生成我的下一句话'}</span><i>→</i>`;
        }
        document.body.classList.toggle('vvv-relay-busy', effective);
    }

    function setRelayInlineError(message='') {
        runtime.lastError=String(message||'').trim();
        const node=document.querySelector('#vvv-relay-command [data-relay-inline-error]');
        if(node){node.textContent=runtime.lastError;node.hidden=!runtime.lastError;}
    }

    function showError(error) {
        runtime.busy = false;
        const message=String(error?.message || error || 'AI剧情接力失败，请检查API状态');
        setRelayInlineError(message);
        setBusy(false);
        console.error('[AI剧情接力] 本轮最终失败', error);
        toast(message, 'error');
    }

    function preview() { return document.getElementById('vvv-relay-preview'); }

    function openPreview(text, customInput = '', anchor = runtime.draftAnchor) {
        closeCommandPanel();
        runtime.previewCustom=normalizeRelayCustomInput(customInput);
        runtime.draftAnchor=anchor?{...anchor}:null;
        let root = preview();
        if (!root) {
            root = document.createElement('div');
            root.id = 'vvv-relay-preview';
            root.innerHTML = `<div class="vvv-relay-backdrop"></div><section role="dialog"><header><b>AI替你写的下一条 user 输入</b><button type="button" data-close>×</button></header><textarea maxlength="20000"></textarea><small>可编辑 · 建议300-800字 · U1.4默认不主动截断（设置为0）；默认不会自动发送</small><footer><button type="button" data-regen>换一个/重新生成</button><button type="button" data-fill>填入输入框</button><button type="button" data-send>直接发送</button><button type="button" data-cancel>取消</button></footer></section>`;
            document.body.appendChild(root);
            root.querySelector('[data-close]').onclick = () => closePreview(root);
            root.querySelector('[data-cancel]').onclick = () => closePreview(root);
            // 事件处理器不再捕获“第一次打开预览”的custom，避免复用DOM后一直拿旧方向。
            root.querySelector('[data-regen]').onclick = () => { const direction=runtime.previewCustom; closePreview(root); generateDraft(direction).catch(showError); };
            root.querySelector('[data-fill]').onclick = () => { try{fill(root.querySelector('textarea').value,runtime.draftAnchor);}catch(error){showError(error);} };
            root.querySelector('[data-send]').onclick = () => send(root.querySelector('textarea').value,runtime.draftAnchor).catch(showError);
        }
        root.querySelector('textarea').value = text;
        bindPreviewViewport(root);
    }

    function fill(value, expectedAnchor = runtime.draftAnchor) {
        if(expectedAnchor&&!relayAnchorIsCurrent(expectedAnchor))throw new Error('生成草稿后聊天或最新AI楼层已变化，请在当前剧情重新生成接力');
        const input = document.querySelector('#send_textarea');
        if (!input) throw new Error('找不到酒馆输入框');
        input.value = limitCompleteSentence(value);
        runtime.settings.pendingFateCard = null; saveSettings();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        closePreview();
        toast('已填入输入框，你可以继续修改。', 'success');
    }

    async function send(value, expectedAnchor = runtime.draftAnchor) {
        const message = limitCompleteSentence(value);
        if (!message) throw new Error('预览内容为空');
        if(expectedAnchor&&!relayAnchorIsCurrent(expectedAnchor))throw new Error('生成草稿后聊天或最新AI楼层已变化，已阻止把旧草稿发送到新剧情');
        const input = document.querySelector('#send_textarea');
        if (!input) throw new Error('找不到酒馆输入框');
        const mod = await import('/script.js');
        if(expectedAnchor&&!relayAnchorIsCurrent(expectedAnchor))throw new Error('准备发送期间聊天或最新AI楼层已变化，已取消发送');
        const generating = typeof mod.isGenerating === 'function' ? mod.isGenerating() : Boolean(mod.isGenerating);
        if (generating) throw new Error('上一轮仍在生成');
        if (typeof mod.sendTextareaMessage !== 'function') throw new Error('当前酒馆不支持正常发送路径');
        input.value = message;
        runtime.settings.pendingFateCard = null; saveSettings();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        closePreview();
        closeCommandPanel();
        removeBars();
        runtime.selected.clear();
        // fixed13：程序化调用 sendTextareaMessage 在部分 ST/主题组合中会比 0-09 的 PromptManager
        // 挂载更快，造成“手打有思维链、AI接力发送后的 char 正文没思维链”。
        // 发送前先让 0-09 预武装下一次主回复；之后仍走酒馆原生 sendTextareaMessage，绝不另起第二次生成。
        try{
            await globalThis.VVVUnifiedCreative?.prepareRelayReply?.({text:message,source:'relay'});
        }catch(error){
            console.warn('[AI剧情接力] 主回复创作预设预武装失败，将继续走原生发送并由 generate_interceptor 兜底',error);
        }
        await mod.sendTextareaMessage();
        toast('已按酒馆正常路径发送；下一轮主AI已按手动发送同样方式挂载思维链与当前预设。', 'success');
    }

    function settingsModal() { return document.getElementById('vvv-relay-settings-modal'); }

    function relayConfigDefaults() {
        return {
            useMemoryApi: false,
            fallbackToPreset: false,
            sourcePolicyRevision: 4,
            provider: 'openai-compatible',
            baseUrl: '', apiKey: '', model: '', temperature: 0.35,
            maxTokens: 900, timeoutSeconds: 180, extraHeaders: {},
        };
    }

    async function refreshRelayServerConfig() {
        const data = await serverJson('/config');
        runtime.serverConfig = data.config || {};
        return { ...relayConfigDefaults(), ...(runtime.serverConfig.relay || {}) };
    }

    function readRelayApiForm(root) {
        let extraHeaders = {};
        const raw = String(root.querySelector('[data-api-headers]')?.value || '').trim();
        if (raw) {
            try { extraHeaders = JSON.parse(raw); }
            catch { throw new Error('额外请求头必须是合法JSON'); }
            if (!extraHeaders || typeof extraHeaders !== 'object' || Array.isArray(extraHeaders)) throw new Error('额外请求头必须是JSON对象');
        }
        return {
            useMemoryApi: false,
            fallbackToPreset: false,
            sourcePolicyRevision: 4,
            provider: String(root.querySelector('[data-api-provider]')?.value || 'openai-compatible'),
            baseUrl: String(root.querySelector('[data-api-base]')?.value || '').trim(),
            apiKey: String(root.querySelector('[data-api-key]')?.value || '').trim(),
            model: String(root.querySelector('[data-api-model]')?.value || '').trim(),
            temperature: Number(root.querySelector('[data-api-temp]')?.value || 0.35),
            maxTokens: Number(root.querySelector('[data-api-max]')?.value || 900),
            timeoutSeconds: Math.max(10,Math.min(1800,Number(root.querySelector('[data-api-timeout]')?.value || 180))),
            extraHeaders,
        };
    }

    function syncApiVisibility(root) {
        const wrap = root.querySelector('[data-independent-box]');
        const api = root.querySelector('[data-relay-api-fields]');
        if (wrap) wrap.hidden = false;
        if (api) api.hidden = false;
    }

    async function saveRelayServerConfig(root) {
        const relay = readRelayApiForm(root);
        const data = await serverJson('/config', { method: 'POST', body: JSON.stringify({ relay }) });
        runtime.serverConfig = data.config || runtime.serverConfig;
        return data.config?.relay || relay;
    }

    async function fetchRelayModels(root) {
        const status = root.querySelector('[data-model-status]');
        const picker = root.querySelector('[data-model-results]');
        const modelInput = root.querySelector('[data-api-model]');
        try {
            if (status) status.textContent = '正在保存当前接口并获取模型列表…';
            await saveRelayServerConfig(root);
            const data = await serverJson('/relay/models');
            const models = [...new Set((Array.isArray(data?.models) ? data.models : []).map(v => String(v || '').trim()).filter(Boolean))]
                .sort((a,b) => a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));
            if (!models.length) throw new Error('接口没有返回可用模型；你仍然可以在模型框里手动填写模型名');
            if (picker) {
                picker.replaceChildren();
                const first = document.createElement('option');
                first.value = '';
                first.textContent = `已获取 ${models.length} 个模型，点击选择…`;
                picker.appendChild(first);
                for (const name of models) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    picker.appendChild(option);
                }
                picker.hidden = false;
                picker.value = models.includes(String(modelInput?.value || '').trim()) ? String(modelInput.value).trim() : '';
            }
            if (status) status.textContent = `✅ 已获取 ${models.length} 个模型；可从下拉框选择，也可继续手填。`;
        } catch (error) {
            if (picker) picker.hidden = true;
            if (status) status.textContent = `⚠️ ${String(error?.message || error)}`;
        }
    }

    function timedRulesForTextarea() {
        const floor = currentFloorIndex();
        return (runtime.settings?.ledgerTimed || []).filter(item => Number(item.expiresFloor) > floor).map(item => {
            const remaining = Math.max(1, Number(item.expiresFloor) - floor);
            return `${item.text} | ${remaining}`;
        }).join('\n');
    }

    function parseTimedRulesTextarea(value) {
        const floor = currentFloorIndex();
        return String(value || '').split(/\r?\n/).map(line => {
            const raw = line.trim();
            if (!raw) return null;
            const match = raw.match(/^(.*?)(?:\s*\|\s*(\d{1,4}))?$/);
            const text = String(match?.[1] || raw).trim().slice(0,500);
            const remaining = Math.max(1, Math.min(1000, Number(match?.[2] || 10)));
            return text ? { text, expiresFloor:floor + remaining } : null;
        }).filter(Boolean).slice(0, 80);
    }

    async function openSettings() {
        globalThis.VVVUnifiedCore?.overlays?.activate?.('relay');
        let root = settingsModal();
        if (!root) {
            root = document.createElement('div');
            root.id = 'vvv-relay-settings-modal';
            root.innerHTML = `<div class="vvv-relay-backdrop"></div><section><header><b>0-32 · AI剧情接力设置</b><button type="button" data-close>×</button></header>
                <label><input type="checkbox" data-enabled>启用发送键旁“0-32接力”常驻按钮（推荐）</label>
                <label>写作来源<select data-mode disabled><option value="independent" selected>独立API · 有限剧情资料</option></select></label>
                <label><input type="checkbox" data-direct>生成后直接发送（默认关闭）</label>
                <label>近期原文范围<select data-recent-floors><option value="8">最近8层</option><option value="12">最近12层</option><option value="16">最近16层（推荐）</option><option value="24">最近24层</option><option value="32">最近32层</option></select></label>
                <label>失败自动尝试次数<input type="number" min="1" max="6" step="1" data-retry-attempts></label>
                <label>复述指令修复尝试次数<input type="number" min="1" max="6" step="1" data-repair-attempts></label>
                <label>接力最大字符<input type="number" min="0" max="20000" step="100" data-max-chars><small>0=不主动截断；1000/2000/4000/8000都可。</small></label>
                <label><input type="checkbox" data-anti-truncation>启用防截断自动续写（推荐）</label>
                <label>最多自动续写段数<input type="number" min="1" max="6" step="1" data-continuation-max><small>检测到模型因 Token 上限截断或句子未闭合时，继续调用同一个接力 API 并去重拼接。</small></label>
                <div class="vvv-relay-api-box vvv-relay-control-settings">
                    <h3>✒️ 0-32 控制层</h3>
                    <label><input type="checkbox" data-director-enabled>启用剧情导演（本地导演提示，不额外调用API）</label>
                    <div class="vvv-relay-director-scope">
                        <span>剧情导演作用范围：</span>
                        <label><input type="checkbox" data-director-main>酒馆主AI正常回复（推荐）</label>
                        <label><input type="checkbox" data-director-relay>0-32 AI剧情接力</label>
                        <small>两项都勾选=两边都用。主AI导演允许{{char}}/NPC正常行动与回应，但不替user行动；接力导演仍只写user。</small>
                    </div>
                    <label><input type="checkbox" data-fate-enabled>启用命运卡池</label>
                    <label><input type="checkbox" data-fate-auto>自动按间隔提供命运卡种子</label>
                    <label><span>自动抽卡间隔</span><select data-fate-interval><option value="4">4轮</option><option value="6">6轮</option><option value="8">8轮（推荐）</option><option value="10">10轮</option><option value="12">12轮</option><option value="16">16轮</option><option value="20">20轮</option></select></label>
                    <div class="vvv-relay-fate-cats"><span>启用卡池：</span>${Object.entries(FATE_CATEGORY_LABELS).filter(([key])=>key!=='custom').map(([key,label])=>`<label><input type="checkbox" data-fate-cat="${key}">${label}</label>`).join('')}</div>
                    <label class="vvv-relay-wide"><span>自定义命运卡（每行：分类英文|卡牌内容；也可只写内容）</span><textarea data-custom-fate placeholder="例如：emotion|某个过去的重要约定以很轻的方式再次被提起"></textarea></label>
                </div>
                <div class="vvv-relay-api-box vvv-relay-ledger-settings">
                    <h3>📖 0-32 规则账本</h3>
                    <label class="vvv-relay-wide"><span>长期规则（每行一条，持续有效）</span><textarea data-ledger-long placeholder="例如：不要替user原谅任何人"></textarea></label>
                    <label class="vvv-relay-wide"><span>当前章节规则（每行一条，手动清空）</span><textarea data-ledger-chapter placeholder="例如：这一章不允许突然表白，也不要跳时间"></textarea></label>
                    <label class="vvv-relay-wide"><span>临时规则（每行：规则 | 剩余层数）</span><textarea data-ledger-timed placeholder="例如：腿伤不能跑 | 10"></textarea></label>
                    <small>规则账本不仅用于AI剧情接力，也会由0-32记忆中枢注入普通主剧情；临时规则过期后自动清理。</small>
                </div>
                <div class="vvv-relay-api-box vvv-relay-singleapi-settings">
                    <h3>🛡 独立来源边界</h3>
                    <p><b>固定启用：</b>只调用接力独立API；失败时按“失败自动尝试次数”重试同一独立来源，不调用酒馆主API。</p>
                    <small>供应商明确政策拒绝会直接停止，不用自动换源绕过。</small>
                </div>
                <div class="vvv-relay-api-box" data-independent-box>
                    <p><b>AI接力专用 API：</b>这套 Base URL、密钥和模型只服务 AI 接力，不复用整理/总结 API，也不与幕后七条共用。请求只携带本模块整理出的近期剧情、结构化记忆和明确规则。</p>
                    <div data-relay-api-fields>
                        <label><span>接口类型</span><select data-api-provider><option value="openai-compatible">OpenAI兼容</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select></label>
                        <label><span>Base URL</span><input type="text" data-api-base autocomplete="off" placeholder="例如：https://example.com/v1"></label>
                        <label><span>API Key</span><input type="password" data-api-key autocomplete="off" placeholder="留空保留服务器已保存密钥"></label>
                        <label class="vvv-relay-model-field"><span>模型</span><div class="vvv-relay-model-row"><input type="text" data-api-model autocomplete="off" placeholder="可手填，或点击右侧获取模型"><button type="button" data-fetch-models>获取模型</button></div><select data-model-results hidden><option value="">选择已获取的模型…</option></select><small data-model-status></small></label>
                        <label><span>Temperature</span><input type="number" min="0" max="2" step="0.05" data-api-temp></label>
                        <label><span>最大输出 Token</span><input type="number" min="128" max="8000" data-api-max></label>
                        <label><span>超时秒数</span><input type="number" min="10" max="1800" data-api-timeout></label>
                        <label class="vvv-relay-wide"><span>额外请求头 JSON</span><textarea data-api-headers spellcheck="false" placeholder="{}"></textarea></label>
                        <div class="vvv-relay-api-actions vvv-relay-wide"><button type="button" data-fetch-models-secondary>↻ 获取模型列表</button><button type="button" data-test-api>✓ 测试完整链路</button></div>
                    </div>
                </div>
                <p>AI接力不读取酒馆预设、世界书、Persona或Prompt Manager；独立API失败时不会切换到酒馆主API。</p>
                <small data-config-status>正在读取本账号接力API配置…</small>
                <footer><button type="button" data-save>保存</button></footer></section>`;
            document.body.appendChild(root);
            root.querySelector('[data-close]').onclick = () => root.remove();
            root.querySelector('[data-fetch-models]')?.addEventListener('click', () => fetchRelayModels(root));
            root.querySelector('[data-fetch-models-secondary]')?.addEventListener('click', () => fetchRelayModels(root));
            root.querySelector('[data-model-results]')?.addEventListener('change', event => {
                const value = String(event.currentTarget?.value || '').trim();
                if (value) root.querySelector('[data-api-model]').value = value;
            });
            root.querySelector('[data-test-api]').onclick = async () => {
                const status = root.querySelector('[data-config-status]');
                try {
                    status.textContent = '正在保存并测试…';
                    await saveRelayServerConfig(root);
                    const result = await generateWithConfiguredApi('这是AI接力完整链路测试。只回复一句简短的user测试文本。', { owner:'AI接力设置测试', systemPrompt:'这是连接测试，不写真实剧情。', responseLength:256, deadlineAt:Date.now()+180000 });
                    status.textContent = `✅ ${runtime.lastGenerationSourceLabel||configuredSourceLabel()}：${String(result || '连接成功').slice(0, 120)}`;
                } catch (error) {
                    status.textContent = `❌ ${String(error?.message || error)}`;
                }
            };
            root.querySelector('[data-save]').onclick = async () => {
                const status = root.querySelector('[data-config-status]');
                try {
                    runtime.settings.enabled = root.querySelector('[data-enabled]').checked;
                    runtime.settings.mode = 'independent';
                    runtime.settings.directAfterGenerate = root.querySelector('[data-direct]').checked;
                    runtime.settings.recentFloors = Number(root.querySelector('[data-recent-floors]').value || 16);
                    runtime.settings.relayRetryAttempts = Math.max(1,Math.min(6,Number(root.querySelector('[data-retry-attempts]')?.value||4)));
                    runtime.settings.relayRepairAttempts = Math.max(1,Math.min(6,Number(root.querySelector('[data-repair-attempts]')?.value||3)));
                    runtime.settings.relayMaxChars = Math.max(0,Math.min(20000,Number(root.querySelector('[data-max-chars]')?.value||0)));
                    runtime.settings.relayAntiTruncation = root.querySelector('[data-anti-truncation]').checked;
                    runtime.settings.relayContinuationMax = Math.max(1,Math.min(6,Number(root.querySelector('[data-continuation-max]')?.value||3)));
                    runtime.settings.directorEnabled = root.querySelector('[data-director-enabled]').checked;
                    runtime.settings.directorMainEnabled = root.querySelector('[data-director-main]').checked;
                    runtime.settings.directorRelayEnabled = root.querySelector('[data-director-relay]').checked;
                    runtime.settings.fateEnabled = root.querySelector('[data-fate-enabled]').checked;
                    runtime.settings.fateAutoEnabled = root.querySelector('[data-fate-auto]').checked;
                    runtime.settings.fateInterval = Number(root.querySelector('[data-fate-interval]').value || 8);
                    runtime.settings.fateCategories = [...root.querySelectorAll('[data-fate-cat]:checked')].map(node => node.dataset.fateCat);
                    runtime.settings.customFateCards = String(root.querySelector('[data-custom-fate]').value || '').trim();
                    runtime.settings.ledgerLong = String(root.querySelector('[data-ledger-long]').value || '').trim();
                    runtime.settings.ledgerChapter = String(root.querySelector('[data-ledger-chapter]').value || '').trim();
                    runtime.settings.ledgerTimed = parseTimedRulesTextarea(root.querySelector('[data-ledger-timed]').value);
                    runtime.settings.multiFlashEnabled = false;
                    saveSettings();
                    await saveRelayServerConfig(root);
                    closeSettingsModal(root);
                    if (runtime.settings.enabled) restoreBar({ settled: true });
                    else removeBars();
                    toast('接力设置已保存。', 'success');
                } catch (error) {
                    status.textContent = `❌ ${String(error?.message || error)}`;
                }
            };
        }

        root.querySelector('[data-enabled]').checked = runtime.settings.enabled;
        root.querySelector('[data-mode]').value = 'independent';
        root.querySelector('[data-direct]').checked = runtime.settings.directAfterGenerate;
        root.querySelector('[data-recent-floors]').value = String(normalizedRecentFloorCount());
        root.querySelector('[data-retry-attempts]').value = String(relayRetryAttempts());
        root.querySelector('[data-repair-attempts]').value = String(relayRepairAttempts());
        root.querySelector('[data-max-chars]').value = String(relayMaxChars());
        root.querySelector('[data-anti-truncation]').checked = runtime.settings.relayAntiTruncation !== false;
        root.querySelector('[data-continuation-max]').value = String(relayContinuationLimit());
        root.querySelector('[data-director-enabled]').checked = runtime.settings.directorEnabled !== false;
        root.querySelector('[data-director-main]').checked = runtime.settings.directorMainEnabled !== false;
        root.querySelector('[data-director-relay]').checked = runtime.settings.directorRelayEnabled !== false;
        root.querySelector('[data-fate-enabled]').checked = runtime.settings.fateEnabled !== false;
        root.querySelector('[data-fate-auto]').checked = Boolean(runtime.settings.fateAutoEnabled);
        root.querySelector('[data-fate-interval]').value = String(runtime.settings.fateInterval || 8);
        root.querySelectorAll('[data-fate-cat]').forEach(node => { node.checked = (runtime.settings.fateCategories || []).includes(node.dataset.fateCat); });
        root.querySelector('[data-custom-fate]').value = String(runtime.settings.customFateCards || '');
        root.querySelector('[data-ledger-long]').value = String(runtime.settings.ledgerLong || '');
        root.querySelector('[data-ledger-chapter]').value = String(runtime.settings.ledgerChapter || '');
        root.querySelector('[data-ledger-timed]').value = timedRulesForTextarea();
        const status = root.querySelector('[data-config-status]');
        try {
            const relay = await refreshRelayServerConfig();
            root.querySelector('[data-api-provider]').value = relay.provider || 'openai-compatible';
            root.querySelector('[data-api-base]').value = relay.baseUrl || '';
            root.querySelector('[data-api-key]').value = '';
            root.querySelector('[data-api-model]').value = relay.model || '';
            root.querySelector('[data-api-temp]').value = Number(relay.temperature ?? 0.35);
            root.querySelector('[data-api-max]').value = Number(relay.maxTokens || 1600);
            root.querySelector('[data-api-timeout]').value = Number(relay.timeoutSeconds || 180);
            root.querySelector('[data-api-headers]').value = JSON.stringify(relay.extraHeaders || {}, null, 2);
            status.textContent = relay.apiKeyConfigured ? '🔐 接力独立API密钥已保存；失败时仅重试同一独立来源。' : '接力独立API未保存密钥；请先配置Base URL、模型和密钥。';
        } catch (error) {
            status.textContent = `⚠️ 无法读取服务器接力配置：${String(error?.message || error)}`;
        }
        syncApiVisibility(root);
        bindSettingsViewport(root);
    }

    function ensureEntry() {
        if (globalThis.__VVV_UNIFIED_MODE__) return;
        if (document.getElementById('vvv-relay-settings-entry')) return;
        const host = document.querySelector('#extensions_settings') || document.body;
        const box = document.createElement('div');
        box.id = 'vvv-relay-settings-entry';
        box.className = 'inline-drawer';
        box.innerHTML = `<div class="inline-drawer-toggle inline-drawer-header"><b>✦ AI剧情接力</b></div><div class="inline-drawer-content"><p>U1.7.15：AI接力继续使用单独API；小手机实时API也保持独立，不会混用总结或幕后七条连接。</p><button type="button">打开接力设置</button><small>版本 ${VERSION}</small></div>`;
        box.querySelector('button').onclick = () => openSettings().catch(showError);
        host.appendChild(box);
    }

    function onSettled(event) {
        const detail = event.detail || {};
        if (!detail.signature || runtime.settled.has(detail.signature)) return;
        runtime.settled.add(detail.signature);
        if (runtime.settled.size > 240) runtime.settled.delete(runtime.settled.values().next().value);
        const settledEntry = latestAssistant();
        runtime.commandAnchor = null;
        runtime.generationStartAnchor = null;
        runtime.stopRecoveryAnchor = null;
        if (settledEntry) runtime.stoppedPartialFingerprints.delete(entryFingerprint(settledEntry));
        runtime.currentSignature = signature(settledEntry);
        runtime.barDesired = Boolean(runtime.currentSignature);
        if (settledEntry) rememberSettledAnchor(settledEntry);
        runtime.currentFateCard = null;
        if (runtime.settings?.pendingFateCard) { runtime.settings.pendingFateCard = null; saveSettings(); }
        runtime.selected.clear();
        setDockBusy(false);
        restoreBar({ settled: true, entryOverride: settledEntry });
        // 某些主题/滑动楼层会在 settled 后继续替换最后一层 DOM，多次轻量确认只补 UI，不调用 API。
        setTimeout(() => scheduleBarRestore(0), 180);
        setTimeout(() => scheduleBarRestore(0), 650);
        setTimeout(() => scheduleBarRestore(0), 1500);
    }

    function clearForNewUserTurn() {
        runtime.selected.clear();
        runtime.draft='';
        runtime.draftAnchor=null;
        runtime.previewCustom='';
        runtime.currentSignature = '';
        runtime.barDesired = false;
        clearTimeout(runtime.restoreTimer);
        removeBars();
        closePreview();
        closeCommandPanel();
        ensureDockButton();
    }

    function clearForRealGenerationStart() {
        // 静默生成/其他插件的后台 generation 不能把已经 settled 的接力条误删。
        // 只有当前聊天最后一条真实消息确实是 user 时，才视为新一轮正文开始。
        const chat = ctx()?.chat;
        if (!Array.isArray(chat)) return;
        for (let i = chat.length - 1; i >= 0; i -= 1) {
            const message = chat[i];
            if (!message || message.is_system || !textOf(message)) continue;
            if (message.is_user) {
                // P22：新一轮生成必须以“这个user之前最近的完整AI”为基点。
                // lastSettledAnchor 只能兜底，绝不能抢过当前聊天拓扑。
                const anchorEntry = latestSafeAssistant({ beforeIndex:i }) || assistantBeforeLatestUser() || anchoredEntry();
                runtime.stopRecoveryAnchor = null;
                if (anchorEntry) runtime.generationStartAnchor = anchorFromEntry(anchorEntry);
                else runtime.generationStartAnchor = null;
                clearForNewUserTurn();
                setDockBusy(true);
                if (runtime.generationStartAnchor) startGenerationStopWatch();
            }
            return;
        }
    }


    function restoreAfterGenerationStopped(_event = null) {
        clearGenerationWatch();
        const stoppedBase = runtime.generationStartAnchor ? { ...runtime.generationStartAnchor } : null;
        markStoppedPartials(stoppedBase);
        runtime.stopRecoveryAnchor = stoppedBase;
        // 关键：STOP处理完立刻清掉generationStartAnchor，防止它以后永久把接力拉回旧楼层。
        runtime.generationStartAnchor = null;
        runtime.busy = false;
        runtime.selected.clear();
        setDockBusy(false);
        ensureDockButton();
        closeCommandPanel();
        preview()?.remove();

        const attempt = (delay, reveal = false) => setTimeout(() => {
            const entry = entryForDock() || looseEntryFromAnchor(runtime.stopRecoveryAnchor) || recoverableAnchorEntry();
            if (!entry || !runtime.settings?.enabled) return;
            runtime.currentSignature = signature(entry);
            runtime.barDesired = true;
            // 恢复时重新记一次宽松锚点；正文清理/尾包剥离导致文本hash变化也不会再把入口弄丢。
            runtime.lastSettledAnchor = anchorFromEntry(entry);
            restoreBar({ settled:false, entryOverride:entry, force:true });
            if (reveal) {
                const node = ensureDockButton();
                try { node?.animate?.([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}], {duration:260}); } catch {}
            }
        }, delay);

        attempt(60, false);
        attempt(220, true);
        attempt(700, false);
        attempt(1500, false);
    }

    function restoreAfterGenerationEndedIfEmpty() {
        // 官方不同版本/主题的“停止”事件顺序可能不同。
        // 如果 ENDED 之后最后一条真实消息仍是 user，说明没有完整AI正文落地，按中止处理。
        setTimeout(() => {
            const last = latestRealMessage();
            if (last?.message?.is_user && runtime.generationStartAnchor) {
                restoreAfterGenerationStopped({ source:'ended-empty' });
            } else {
                // 正常完成即便 VVV_TURN_SETTLED 因主题/时序漏发，也必须释放旧生成锚点。
                runtime.generationStartAnchor = null;
                runtime.stopRecoveryAnchor = null;
                setDockBusy(false);
                ensureDockButton();
                clearGenerationWatch();
            }
        }, 120);
    }


    async function initialize() {
        removeLegacyPerspectiveStyle();
        for (let i = 0; i < 80 && !ctx(); i += 1) await new Promise(resolve => setTimeout(resolve, 250));
        if (!ctx()) return;
        loadSettings();
        try { await refreshRelayServerConfig(); }
        catch (error) { console.warn('[AI剧情接力] 独立API配置暂未读取成功，实际生成时会再次由服务端校验', error); }
        runtime.configuredSourceReady = true;
        ensureEntry();
        globalThis.addEventListener('VVV_TURN_SETTLED', onSettled);
        const c = ctx();
        const source = c?.eventSource;
        const types = c?.eventTypes || c?.event_types || globalThis.event_types || {};
        const bus=globalThis.VVVUnifiedCore?.events;
        const on=(name,handler)=>{if(bus?.on)return bus.on(name,handler);const actual=types?.[name]||name;source?.on?.(actual,handler);return()=>{};};
        // U1.4：原生事件统一交给0-00 EventBus；本模块不再向SillyTavern重复注册。
        on('USER_MESSAGE_RENDERED', clearForNewUserTurn);
        on('GENERATION_STARTED', clearForRealGenerationStart);
        // R9S1P17：三重保险——STOPPED事件 + ENDED空结果 + isGenerating watchdog。
        on('GENERATION_STOPPED', restoreAfterGenerationStopped);
        on('GENERATION_ENDED', restoreAfterGenerationEndedIfEmpty);
        on('CHAT_CHANGED', () => {
            runtime.selected.clear();
            runtime.currentSignature = '';
            runtime.barDesired = false;
            runtime.lastSettledAnchor = null;
            runtime.generationStartAnchor = null;
            runtime.stopRecoveryAnchor = null;
            runtime.stoppedPartialFingerprints.clear();
            runtime.commandAnchor = null;
            runtime.draft='';
            runtime.draftAnchor=null;
            runtime.previewCustom='';
            runtime.lastCustomDirection='';
            clearGenerationWatch();
            runtime.currentFateCard = null;
            removeBars();
            setDockBusy(false);
            ensureDockButton();
            preview()?.remove();
            closeCommandPanel();
            setTimeout(() => {
                const entry = latestAssistant();
                runtime.currentSignature = signature(entry);
                runtime.barDesired = Boolean(runtime.currentSignature);
                if (entry) rememberSettledAnchor(entry);
                restoreBar({ settled: true, entryOverride: entry });
            }, 700);
        });
        installBarObserver();
        // 刷新/重新打开只恢复最新AI正文底部UI，不请求模型。
        setTimeout(() => {
            const entry = latestAssistant();
            runtime.currentSignature = signature(entry);
            runtime.barDesired = Boolean(runtime.currentSignature);
            if (entry) rememberSettledAnchor(entry);
            restoreBar({ settled: true, entryOverride: entry });
            installBarObserver();
        }, 900);
        console.log(`[${ID}] v${VERSION} ready; persistent send-dock relay button + premium command panel`);
    }

    globalThis.VVVUnifiedCore?.overlays?.register?.('relay',{close:()=>{closeCommandPanel();closePreview();settingsModal()?.remove();}});
    globalThis.VVVUnifiedRelay = Object.assign(globalThis.VVVUnifiedRelay || {}, {
        version: VERSION,
        openCommand: () => openCommandPanel(),
        // 剧情地图只暴露一个自定义出发方向，不打开常规方向/命运卡选项面板。
        generateTravel: (custom = '') => {
            runtime.selected.clear();
            runtime.selected.add('custom');
            runtime.currentFateCard = null;
            return generateDraft(String(custom || '').slice(0, 1200));
        },
        openSettings: () => openSettings(),
        generateWithConfiguredApi: (prompt, options = {}) => generateWithConfiguredApi(prompt, options),
        isConfiguredSourceReady: () => runtime.configuredSourceReady === true,
        configuredSourceMode: () => configuredSourceMode(),
        configuredSourceLabel: () => configuredSourceLabel(),
        lastGenerationSource: () => ({source:runtime.lastGenerationSource,label:runtime.lastGenerationSourceLabel,pipeline:runtime.lastPipelineDebug}),
        close: () => { closeCommandPanel(); closePreview(); },
    });

    initialize().catch(showError);
})();
