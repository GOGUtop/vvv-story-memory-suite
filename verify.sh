#!/usr/bin/env bash
set -Eeuo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
command -v node >/dev/null || { echo "❌ 缺少 node" >&2; exit 1; }
command -v python3 >/dev/null || { echo "❌ 缺少 python3" >&2; exit 1; }
while IFS= read -r -d '' f; do node --input-type=module --check < "$f" >/dev/null; done < <(find "$HERE" -type f -name '*.js' -print0)
while IFS= read -r -d '' f; do node --check "$f" >/dev/null; done < <(find "$HERE" -type f -name '*.mjs' -print0)
while IFS= read -r -d '' f; do python3 -m json.tool "$f" >/dev/null; done < <(find "$HERE" -type f -name '*.json' -print0)
node "$HERE/tests/standalone-integrity.mjs"
echo "✅ VVV Story Memory Suite 静态校验全部通过"
