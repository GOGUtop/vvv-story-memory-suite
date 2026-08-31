const START_MARKERS = [
  /<!--\s*Start\s+(?:of\s+)?(?:the\s+)?ECoT\s*-->/gi,
  /&lt;!--\s*Start\s+(?:of\s+)?(?:the\s+)?ECoT\s*--&gt;/gi,
  /<!--\s*START\s*:\s*THINKING\s*-->/gi,
  /&lt;!--\s*START\s*:\s*THINKING\s*--&gt;/gi,
  /<!--\s*START\s+THE\s+VISIBLE\s+THINK\s*-->/gi,
  /&lt;!--\s*START\s+THE\s+VISIBLE\s+THINK\s*--&gt;/gi,
  /<!--\s*START\s*:\s*VVV_ECOT\s*-->/gi,
  /&lt;!--\s*START\s*:\s*VVV_ECOT\s*--&gt;/gi,
  /<!--\s*START\s+THE\s+VISIBLE\s+VVV_ECOT\s*-->/gi,
  /&lt;!--\s*START\s+THE\s+VISIBLE\s+VVV_ECOT\s*--&gt;/gi,
];

const END_MARKERS = [
  /<!--\s*End\s+(?:of\s+)?(?:the\s+)?ECoT\s*-->/gi,
  /&lt;!--\s*End\s+(?:of\s+)?(?:the\s+)?ECoT\s*--&gt;/gi,
  /<!--\s*END\s*:\s*THINKING\s*-->/gi,
  /&lt;!--\s*END\s*:\s*THINKING\s*--&gt;/gi,
  /<!--\s*END\s*:\s*VVV_ECOT\s*-->/gi,
  /&lt;!--\s*END\s*:\s*VVV_ECOT\s*--&gt;/gi,
];

const OPEN_TAG = /<\s*(think|thinking|analysis|reasoning|ecot|vvv_ecot)\b[^>]*>|&lt;\s*(think|thinking|analysis|reasoning|ecot|vvv_ecot)\b[^&]*&gt;/gi;

function matches(text, patterns) {
  const found = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      found.push({ index: match.index, end: match.index + match[0].length, value: match[0] });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

function closingTags(text, tag, encoded) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = encoded
    ? new RegExp(`&lt;\\s*\\/\\s*${escaped}\\s*&gt;`, 'gi')
    : new RegExp(`<\\s*\\/\\s*${escaped}\\s*>`, 'gi');
  return matches(text, [pattern]);
}

function recapOpenLinePattern(flags = 'gim') {
  return new RegExp('(?:^|\\r?\\n)[ \\t]*(?:<\\s*前文回顾\\s*>|&lt;\\s*前文回顾\\s*&gt;)[ \\t]*(?=\\r?\\n|$)', flags);
}

function firstRecapBoundary(text, after = 0) {
  const tail=String(text||'').slice(after);
  const patterns=[
    recapOpenLinePattern('im'),
    /(?:^|\n)\s*[-—_\s]*前文章节与重要设定回顾开始[-—_\s]*(?:\n|$)/im,
  ];
  const indexes=patterns.map(pattern=>tail.search(pattern)).filter(index=>index>=0);
  return indexes.length?after+Math.min(...indexes):text.length;
}

function lastContentBoundary(text, after = 0) {
  const source=String(text||'');
  const patterns=[/<\s*content\b[^>]*>/gi,/&lt;\s*content\b[^&]*&gt;/gi];
  let found=null;
  for(const pattern of patterns){
    pattern.lastIndex=after;
    for(const match of source.matchAll(pattern))if((match.index??-1)>=after)found={index:match.index,value:match[0]};
  }
  return found;
}

// Models occasionally obey the visible ECoT plan but forget the literal
// </Think> close before starting the scene protocol.  The old fallback then
// treated <time> +正文 as reasoning and the pretty fold swallowed the title.
// Only accept protocol tags on their own line as a recovery boundary so a
// discussion that merely mentions "<time>" inside a Phase is not split.
function firstPostReasoningBoundary(text, after = 0, before = null) {
  const source=String(text||'');
  const limit=Number.isInteger(before)?Math.max(after,before):source.length;
  const tail=source.slice(after,limit);
  const patterns=[
    // Hidden post-think transport blocks can appear before <time>. They are
    // display-regex material, not ECoT. Cut reasoning here so the normal
    // SillyTavern regex pipeline can hide/transform them afterwards.
    /(?:^|\r?\n)[ \t]*(?:\[STATEMENT\]|\[神本无相\])[ \t]*(?=\r?\n|$)/im,
    /(?:^|\r?\n)[ \t]*(?:<\s*time\s*>|&lt;\s*time\s*&gt;)[ \t]*(?=\r?\n|$)/im,
    /(?:^|\r?\n)[ \t]*(?:<\s*content\b[^>]*>|&lt;\s*content\b[^&]*&gt;)[ \t]*(?=\r?\n|$)/im,
    /(?:^|\r?\n)[ \t]*(?:<\s*LinLanStatus\b[^>]*>|&lt;\s*LinLanStatus\b[^&]*&gt;)[ \t]*(?=\r?\n|$)/im,
  ];
  const hits=patterns.map(pattern=>tail.search(pattern)).filter(index=>index>=0);
  if(!hits.length)return null;
  const relative=Math.min(...hits);
  // Patterns may include the preceding newline; keep that newline out of the
  // reasoning card while returning the actual tag position for正文 rendering.
  const chunk=tail.slice(relative);
  const tagOffset=chunk.search(/(?:\[STATEMENT\]|\[神本无相\]|<|&lt;)/i);
  return after+relative+(tagOffset>=0?tagOffset:0);
}

// SillyTavern/provider reasoning parsers may occasionally capture the visible
// checklist together with the first scene protocol when a model emits an outer
// <thinking> wrapper around our public ECoT. Recover that transport tail so
// [STATEMENT]/<time>/<content> can return to the normal display-regex pipeline.
export function splitNativeReasoningProtocolLeak(value) {
  const source=String(value??'');
  if(!source)return {reasoning:'',tail:'',healed:false};
  const boundary=firstPostReasoningBoundary(source,0,source.length);
  if(boundary===null)return {reasoning:normalizeECoTText(source),tail:'',healed:false};
  const reasoning=normalizeECoTText(source.slice(0,boundary));
  let tail=source.slice(boundary)
    .replace(/(?:^|\r?\n)[ \t]*<\s*\/\s*(?:think|thinking|analysis|reasoning|ecot|vvv_ecot)\s*>[ \t]*(?=\r?\n|$)/gi,'\n')
    .replace(/(?:^|\r?\n)[ \t]*&lt;\s*\/\s*(?:think|thinking|analysis|reasoning|ecot|vvv_ecot)\s*&gt;[ \t]*(?=\r?\n|$)/gi,'\n')
    .replace(/(?:^|\r?\n)[ \t]*(?:<!--\s*END\s*:\s*(?:THINKING|VVV_ECOT)\s*-->|&lt;!--\s*END\s*:\s*(?:THINKING|VVV_ECOT)\s*--&gt;)[ \t]*(?=\r?\n|$)/gi,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
  return {reasoning,tail,healed:Boolean(tail)};
}

export function unwrapContentTransport(value) {
  return String(value??'')
    .replace(/<\s*\/?\s*content\b[^>]*>/gi,'')
    .replace(/&lt;\s*\/?\s*content\b[^&]*&gt;/gi,'')
    .trim();
}

export function mergeReasoningForDisplay(...groups) {
  const parts=[...new Set(groups.flat().map(value=>String(value??'').trim()).filter(Boolean))];
  return parts.length?[parts.join('\n\n')]:[];
}

export function splitLeakedWorkflowAnchorsForDisplay(value) {
  let source=String(value??'');
  if(!source)return {text:'',anchors:[]};
  const anchors=[];
  const startPattern=/(?:<!--|<![—–-]{1,2}|&lt;![—–-]{1,2})\s*((?:(?:第[一二三四五六七八九十\d]+次)?(?:风格|剧情|进度|写作))锚定)\s*[：:]?/gi;
  let guard=0;
  while(guard++<12){
    startPattern.lastIndex=0;
    const start=startPattern.exec(source);if(!start)break;
    const from=start.index??0,bodyStart=from+start[0].length;
    const tail=source.slice(bodyStart);
    const close=tail.search(/(?:-->|[—–-]{1,2}>|[—–-]{1,2}&gt;)/i);
    const recapBoundary=firstRecapBoundary(tail);
    const boundaries=[
      recapBoundary<tail.length?recapBoundary:-1,
      tail.search(/<\s*content\b[^>]*>/i),tail.search(/&lt;\s*content\b[^&]*&gt;/i),
      tail.search(/<\s*time\b[^>]*>/i),tail.search(/<\s*LinLanStatus\b[^>]*>/i),
    ].filter(index=>index>=0);
    let length;
    if(close>=0 && (!boundaries.length||close<Math.min(...boundaries)))length=bodyStart+close+tail.slice(close).match(/^(?:-->|[—–-]{1,2}>|[—–-]{1,2}&gt;)/i)[0].length-from;
    else if(boundaries.length)length=bodyStart+Math.min(...boundaries)-from;
    else break;
    const block=source.slice(from,from+length);
    const clean=normalizeECoTText(block)
      .replace(/^(?:<!--|<![—–-]{1,2}|&lt;![—–-]{1,2})\s*/i,'')
      .replace(/\s*(?:-->|[—–-]{1,2}>|[—–-]{1,2}&gt;)\s*$/i,'')
      .trim();
    if(clean)anchors.push(clean);source=`${source.slice(0,from)}\n${source.slice(from+length)}`;
  }
  return {text:source.replace(/\n{4,}/g,'\n\n\n').trim(),anchors:[...new Set(anchors)]};
}

export function stripLeakedWorkflowAnchorBlocks(value){
  return splitLeakedWorkflowAnchorsForDisplay(value).text;
}

export function splitLeakedRecapForDisplay(value) {
  let source = String(value ?? '');
  if (!source) return { text: '', recaps: [] };
  const recaps = [];

  // Closed transport blocks may occur before or after正文. Extract their
  // payload for a collapsed card while preserving narrative on both sides.
  source = source.replace(/(?:^|\r?\n)[ \t]*(?:<\s*前文回顾\s*>|&lt;\s*前文回顾\s*&gt;)[ \t]*\r?\n([\s\S]*?)(?:^|\r?\n)[ \t]*(?:<\s*\/\s*前文回顾\s*>|&lt;\s*\/\s*前文回顾\s*&gt;)[ \t]*(?=\r?\n|$)/gim, (_whole, body) => {
    const clean=String(body||'').trim();
    if(clean)recaps.push(clean);
    return '';
  });

  // A truncated recap has no closing tag. Its paired protocol headers and
  // source labels distinguish it from ordinary narrative uses of “回顾”.
  const open = recapOpenLinePattern('gim');
  const header = /(?:^|\n)\s*[-—_\s]*前文章节与重要设定回顾开始[-—_\s]*(?:\n|$)/gim;
  const openCandidates=[...source.matchAll(open)];
  const headerCandidates=[...source.matchAll(header)];
  const leaked = [...openCandidates,...headerCandidates.filter(item => /(?:虚构叙事|剧情至上|非现实事件|来源:(?:chat-floor|important-message)|本轮精准原文召回)/i.test(source.slice(item.index, item.index + 520)))].sort((a,b)=>a.index-b.index)[0];
  if (leaked) {
    const content=lastContentBoundary(source,leaked.index+leaked[0].length);
    const recapEnd=content?.index??source.length;
    const payload=source.slice(leaked.index,recapEnd)
      .replace(/^(?:\r?\n)?[ \t]*(?:<\s*前文回顾\s*>|&lt;\s*前文回顾\s*&gt;)[ \t]*(?=\r?\n|$)/i,'')
      .replace(/^\s*[-—_\s]*前文章节与重要设定回顾开始[-—_\s]*/i,'')
      .trim();
    if(payload)recaps.push(payload);
    source = `${source.slice(0, leaked.index)}\n${content?source.slice(content.index):''}`;
  }
  return { text:source.replace(/\n{4,}/g, '\n\n\n').trimEnd(), recaps:[...new Set(recaps)] };
}

export function stripLeakedRecapBlocks(value) {
  return splitLeakedRecapForDisplay(value).text;
}

function stripStandaloneCssBlocks(value) {
  const lines=String(value??'').split('\n');
  const kept=[];
  const cssStart=/^(?:@(?:keyframes|media|supports|font-face|page|layer|container)\b[^{}\n]*|[.#][A-Za-z_-][\w-]*(?:[^{}\n]*)?|(?:html|body|main|section|article|header|footer|button|input|textarea|select|option|svg|path|div|span|p|img)(?:[\s.#:[>+~][^{}\n]*)?)\s*(?:,|\{)/i;
  for(let index=0;index<lines.length;index+=1){
    const line=lines[index];
    if(!cssStart.test(line.trim())){kept.push(line);continue;}
    let probe=index,depth=0,opened=false;
    while(probe<lines.length){
      const current=lines[probe];
      depth+=(current.match(/\{/g)||[]).length-(current.match(/\}/g)||[]).length;
      if(current.includes('{'))opened=true;
      probe+=1;
      if(opened&&depth<=0)break;
      if(!opened&&probe-index>4)break;
    }
    if(!opened){kept.push(line);continue;}
    index=probe-1;
  }
  return kept.join('\n');
}

function stripEmbeddedUiPayloads(value) {
  let source=String(value??'');
  source=source
    .replace(/```(?:html?|css|javascript|js|xml)\s*\n[\s\S]*?```/gi,' ')
    .replace(/<!doctype\s+html\b[^>]*>[\s\S]*?<\/html\s*>/gi,' ')
    .replace(/&lt;!doctype\s+html\b[^&]*&gt;[\s\S]*?&lt;\/html\s*&gt;/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
    .replace(/&lt;style\b[^&]*&gt;[\s\S]*?&lt;\/style\s*&gt;/gi,' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
    .replace(/&lt;script\b[^&]*&gt;[\s\S]*?&lt;\/script\s*&gt;/gi,' ')
    .replace(/<(?:svg|canvas|iframe)\b[^>]*>[\s\S]*?<\/(?:svg|canvas|iframe)\s*>/gi,' ')
    .replace(/&lt;(?:svg|canvas|iframe)\b[^&]*&gt;[\s\S]*?&lt;\/(?:svg|canvas|iframe)\s*&gt;/gi,' ')
    .replace(/<!doctype\s+html\b[^>]*>/gi,' ')
    .replace(/&lt;!doctype\s+html\b[^&]*&gt;/gi,' ');
  return stripStandaloneCssBlocks(source);
}

// Retrieval must index the visible story, never the preset's private workflow.
// Keep this beside the display boundary parser so both paths agree on where
// reasoning ends and正文 begins.
export function sanitizeRetrievalDocumentText(value) {
  let source=String(value??'').replace(/\r\n?/g,'\n').trim();
  if(!source)return '';
  source=splitECoTForDisplay(source).text;
  source=stripLeakedWorkflowAnchorBlocks(source);
  source=stripLeakedRecapBlocks(source);
  source=stripEmbeddedUiPayloads(source);
  source=unwrapContentTransport(source)
    .replace(/<(?:think|thinking|analysis|reasoning|ecot|vvv_ecot|scratchpad|reflection|planning|memory)\b[^>]*>[\s\S]*?<\/(?:think|thinking|analysis|reasoning|ecot|vvv_ecot|scratchpad|reflection|planning|memory)>/gi,' ')
    .replace(/&lt;(?:think|thinking|analysis|reasoning|ecot|vvv_ecot|scratchpad|reflection|planning|memory)\b[^&]*&gt;[\s\S]*?&lt;\/(?:think|thinking|analysis|reasoning|ecot|vvv_ecot|scratchpad|reflection|planning|memory)\s*&gt;/gi,' ')
    .replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/&lt;!--[\s\S]*?--&gt;/gi,' ')
    .replace(/^\s*```(?:html|xml|markdown|md|text)?\s*/i,'')
    .replace(/\s*```\s*$/i,'')
    .replace(/<\/?[A-Za-z][\w:.-]*\b[^>]*>/g,' ')
    .replace(/&lt;\/?[A-Za-z][\w:.-]*\b[^&]*&gt;/gi,' ')
    .replace(/(?:^|\n)\s*(?:<!doctype\s+html\b[^>]*>|&lt;!doctype\s+html\b[^&]*&gt;)\s*/gi,'\n')
    .replace(/^\s*(?:正文|正式正文|开始正文)[。．.:：]*\s*$/gmi,'')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n[ \t]+/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]{2,}/g,' ')
    .trim();
  return stripStandaloneCssBlocks(source).replace(/\n{3,}/g,'\n\n').trim();
}

export function normalizeECoTText(value) {
  return String(value ?? '')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
    .replace(/<!--\s*(?:Start|End)\s+(?:of\s+)?(?:the\s+)?ECoT\s*-->/gi, '')
    .replace(/<\/?\s*(?:think|thinking|analysis|reasoning|ecot|vvv_ecot)\b[^>]*>/gi, '')
    .replace(/^\s*(?:正文|正式正文|开始正文)[。．.:：]*\s*$/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitECoTForDisplay(value) {
  const source = String(value ?? '');
  if (!source) return { text: '', reasoning: [], protected: false, complete: true };

  const starts = matches(source, START_MARKERS);
  if (starts.length) {
    const start = starts[0];
    // The fixed preset owns the whole marked block. Always use the final End
    // marker, because the model can quote or emit </thinking> during self-checks.
    const recapBoundary=firstRecapBoundary(source,start.end);
    const ends = matches(source, END_MARKERS).filter(item => item.index >= start.end && item.index < recapBoundary);
    const end = ends.at(-1);
    // Protocol output is a stronger boundary than a *late* ECoT end marker.
    // Some models emit [STATEMENT]/<time> first and only print the requested
    // <!-- END: THINKING --> afterwards. If we blindly trust that late marker,
    // the scene title is swallowed into the reasoning card and display regexes
    // never see it. Keep the explicit end marker only when it occurs before
    // formal scene transport begins.
    const protocolBoundary=firstPostReasoningBoundary(source,start.end,recapBoundary);
    if (end && (protocolBoundary===null || end.index<=protocolBoundary)) {
      const reasoning = normalizeECoTText(source.slice(start.end, end.index));
      return {
        text: `${source.slice(0, start.index)}\n${source.slice(end.end)}`,
        reasoning: reasoning ? [reasoning] : [],
        protected: true,
        complete: true,
      };
    }

    // If only the End comment is missing, the final matching reasoning close
    // is still a safe boundary and preserves正文 emitted afterwards.
    const tail = source.slice(start.end);
    OPEN_TAG.lastIndex = 0;
    const opening = OPEN_TAG.exec(tail);
    if (opening) {
      const tag = opening[1] || opening[2];
      const encoded = !opening[1];
      const openingEnd = start.end + opening.index + opening[0].length;
      const close = closingTags(source, tag, encoded).filter(item => item.index >= openingEnd && item.index < recapBoundary)[0];
      if (close && (protocolBoundary===null || close.index<=protocolBoundary)) {
        const reasoning = normalizeECoTText(source.slice(start.end, close.end));
        return {
          text: `${source.slice(0, start.index)}\n${source.slice(close.end)}`,
          reasoning: reasoning ? [reasoning] : [],
          protected: true,
          complete: true,
          fallbackBoundary: true,
        };
      }
    }

    if(protocolBoundary!==null){
      const reasoning=normalizeECoTText(source.slice(start.end,protocolBoundary));
      return {
        text:`${source.slice(0,start.index)}\n${source.slice(protocolBoundary)}`,
        reasoning:reasoning?[reasoning]:[],
        protected:true,
        complete:true,
        protocolBoundaryFallback:true,
      };
    }

    const reasoning = normalizeECoTText(source.slice(start.end));
    return {
      text: source.slice(0, start.index),
      reasoning: reasoning ? [reasoning] : [],
      protected: true,
      complete: false,
    };
  }

  OPEN_TAG.lastIndex = 0;
  const opening = OPEN_TAG.exec(source);
  if (!opening) return { text: source, reasoning: [], protected: false, complete: true };
  const tag = opening[1] || opening[2];
  const encoded = !opening[1];
  const openingEnd=opening.index+opening[0].length;
  // Some presets omit the Start comment and emit extra internal checks after
  // </thinking>. The explicit final ECoT marker remains the authoritative
  // boundary; otherwise those checks leak between the fold and正文.
  const recapBoundary=firstRecapBoundary(source,openingEnd);
  const protocolBoundary=firstPostReasoningBoundary(source,openingEnd,recapBoundary);
  const ends=matches(source,END_MARKERS).filter(item=>item.index>=openingEnd&&item.index<recapBoundary);
  const end=ends.at(-1);
  if(end && (protocolBoundary===null || end.index<=protocolBoundary)){
    const reasoning=normalizeECoTText(source.slice(openingEnd,end.index));
    return {
      text:`${source.slice(0,opening.index)}\n${source.slice(end.end)}`,
      reasoning:reasoning?[reasoning]:[],
      protected:true,
      complete:true,
      explicitEndBoundary:true,
    };
  }
  const closes = closingTags(source, tag, encoded).filter(item => item.index >= openingEnd);
  const close = closes[0];
  if (!close || (protocolBoundary!==null && protocolBoundary<close.index)) {
    if(protocolBoundary!==null){
      const reasoning=normalizeECoTText(source.slice(openingEnd,protocolBoundary));
      return {
        text:`${source.slice(0,opening.index)}\n${source.slice(protocolBoundary)}`,
        reasoning:reasoning?[reasoning]:[],
        protected:true,
        complete:true,
        protocolBoundaryFallback:true,
      };
    }
    const reasoning = normalizeECoTText(source.slice(openingEnd));
    return {
      text: source.slice(0, opening.index),
      reasoning: reasoning ? [reasoning] : [],
      protected: true,
      complete: false,
    };
  }

  const reasoning = normalizeECoTText(source.slice(openingEnd, close.index));
  return {
    text: `${source.slice(0, opening.index)}\n${source.slice(close.end)}`,
    reasoning: reasoning ? [reasoning] : [],
    protected: true,
    complete: true,
  };
}
