export const AUTHOR_QA_MARKER = '【VVV作者场外问答｜本轮暂停角色扮演】';
export const AUTHOR_QA_PROMPT_ID = 'vvv-author-out-of-character-qa';

export const AUTHOR_QA_PROMPT = Object.freeze({
  identifier: AUTHOR_QA_PROMPT_ID,
  name: '0-09 · 作者场外问答（按标记单轮启用）',
  role: 'system',
  system_prompt: false,
  marker: false,
  content: `【作者场外问答模式｜本轮覆盖普通正文流程】
仅当最新一条 user 消息以“${AUTHOR_QA_MARKER}”开头时执行本模式；否则完全忽略本条。
执行时暂停角色扮演和小说正文，只以“落魄作家”的作者身份直接回答现实共创者的问题。
- 本模式优先于正常剧情的 ECoT、写作锚定、状态栏和正文格式。不执行普通正文的思维链模板。
- 必须实际依据本轮上下文中可见的角色卡、user Persona、已激活世界书、开场白与聊天历史回答。
- 优先说明：共创者扮演谁、char/NPC 是谁、人物各自身份、关系与冲突、开局处境、已经发生的剧情，以及接下来怎样扮演更容易接上。
- 严格区分“资料明确写明”“根据剧情推断”“资料未写/当前上下文不可见”；不知道就直说，禁止为了显得懂而编造。
- 不代替角色说话，不推动剧情，不输出正文、状态栏、思维链、作者吐槽卡、下一稿灵感、小手机或幕后七条。
- 只输出简体中文的最终答复；第一个可见文字必须是“作者答复：”。不得把规划、思考或英文分析当成回答。
- 最终答复不得为空，也不得在思考阶段结束生成。信息很多时可以分点说明。
此模式只持续一轮；下一条没有该标记的普通 user 消息自动恢复角色扮演。`,
});

function messageText(message) {
  return String(message?.mes ?? message?.message ?? message?.text ?? '');
}

export function latestAuthorQaExchange(chat) {
  const rows = Array.isArray(chat) ? chat : [];
  let assistantIndex = -1;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const message = rows[index];
    if (!message || message.is_system) continue;
    if (message.is_user) return null;
    assistantIndex = index;
    break;
  }
  if (assistantIndex < 0) return null;

  let userIndex = -1;
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = rows[index];
    if (!message || message.is_system) continue;
    if (!message.is_user) continue;
    if (!messageText(message).trimStart().startsWith(AUTHOR_QA_MARKER)) return null;
    userIndex = index;
    break;
  }
  if (userIndex < 0) return null;

  const user = rows[userIndex];
  const fingerprint = String(user?.send_date ?? user?.sendDate ?? messageText(user).length);
  return {
    userIndex,
    assistantIndex,
    userKey: `${userIndex}:${fingerprint}:${messageText(user).slice(0, 80)}`,
  };
}

export function hasVisibleAuthorQaAnswer(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, '')
    .length > 0;
}
