#!/usr/bin/env bash
set -Eeuo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ST="${1:-/home/www/SillyTavern}"
SRC="$HERE/server-plugin/vvv-theater-memory-server"
DST="$ST/plugins/vvv-theater-memory-server"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$(dirname "$ST")/VVV_STORY_MEMORY_SERVER_BACKUP_$STAMP"
fail(){ echo "❌ $*" >&2; exit 1; }
ok(){ echo "✅ $*"; }
[ -d "$ST" ] || fail "找不到 SillyTavern：$ST"
[ -f "$SRC/index.mjs" ] || fail "仓库缺少 server-plugin/vvv-theater-memory-server/index.mjs"
command -v node >/dev/null || fail "缺少 node"
node --check "$SRC/index.mjs" >/dev/null
mkdir -p "$BACKUP"
if [ -d "$DST" ]; then cp -a "$DST" "$BACKUP/vvv-theater-memory-server"; ok "已备份旧服务端插件：$BACKUP"; fi
rm -rf "$DST"
mkdir -p "$(dirname "$DST")"
cp -a "$SRC" "$DST"
OWNER_GROUP="$(stat -c '%u:%g' "$ST")"
chown -R "$OWNER_GROUP" "$DST" || true
chmod -R u+rwX,go+rX "$DST"
ok "vvv-theater-memory-server 已更新"
echo "ℹ️ 永久记忆目录不会删除；仍使用 dataRoot/vvv/vvv-theater-memory"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe SillyTavern >/dev/null 2>&1; then pm2 restart SillyTavern --update-env
  elif pm2 describe sillytavern >/dev/null 2>&1; then pm2 restart sillytavern --update-env
  else echo "⚠️ PM2 中未找到 SillyTavern，请在宝塔手动重启"; fi
else echo "⚠️ 未检测到 PM2，请在宝塔手动重启 SillyTavern"; fi
