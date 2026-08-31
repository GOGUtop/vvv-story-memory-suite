# VVV · 剧情与记忆核心

基于 **R21 fixed42** 独立拆分的 SillyTavern 扩展。只保留并发布以下核心能力：

- **0-32 · 永不落幕的剧场**：完整记忆、当前场景、人物/关系、约定与秘密、手机、彼间私文、订单、世界地图、单一世界线等能力。
- **AI 剧情推进 / 接力**：保留原 `vvv_story_relay` 设置、导演、连续性、四阶段、视角与发送链路。
- **RAG / Memory Hub**：继续使用原 `vvv-theater-memory-server`、永久档案、BM25/向量/VCP、Memory Hub。
- **作者场外问答**：单轮暂停角色扮演；回答结束后下一条普通消息恢复 RP。

## 数据兼容

本仓库**故意不改**以下键与目录，因此会继续读取原来的数据：

- `vvv_theater_memory`
- `vvv_story_relay`
- `/api/plugins/vvv-theater-memory-server`
- `dataRoot/vvv/vvv-theater-memory`

升级/拆分不会自动删除永久档案。

## GitHub 安装 / 订阅

仓库创建后固定使用：

`https://github.com/nanjun434-byte/vvv-story-memory-suite`

在 SillyTavern 的扩展安装界面使用上面的 GitHub 仓库地址安装。仓库根目录就是标准扩展目录，`auto_update=true`。

> **重要：不要让旧 `vvv-unified-core` 和本独立版同时运行 0-32。** 本独立版检测到旧 0-00/0-32 前端时会主动停机，避免同一轮写两次记忆。迁移完成后关闭或移除旧 0-00 前端，再刷新酒馆。

## 服务端插件

RAG、永久档案、独立 API、Memory Hub 等能力依赖 `vvv-theater-memory-server`。你原服务器已经安装过时，可以继续沿用；需要用仓库版本更新时，在仓库目录运行：

```bash
bash install-server.sh /home/www/SillyTavern
```

服务端仍按原行为只允许账号 `vvv`，数据目录不变。

## 自检

```bash
bash verify.sh
```

## fixed42 保留项

本独立版直接以 fixed42 为代码基线，保留 fixed39 单一世界、fixed40 新档保护、fixed41 正常生成顺序修复、fixed42 网络状态单一真值修复。

## v1.0.1 公共订阅修复

- 移除仅账号 `vvv` 才启动的限制；所有 SillyTavern 账号均可加载。
- 服务端永久数据继续按账号目录隔离，不会互相串档。
- 扩展菜单增加固定入口：0-32 / 剧情推进 / 问作者 / Memory Hub。
- 如果检测到旧版 VVV 0-00/0-32 仍在运行，会明确提示冲突，而不是“已安装但什么都不显示”。
