#!/bin/bash
# ============================================================
# Move Your Body - 启动脚本
# ============================================================

set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "  Move Your Body - 体感锻炼游戏"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
  echo "   https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "✅ Node.js $(node -v)"

# 安装依赖（首次或 package.json 变更后）
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
  echo ""
  echo "📦 正在安装依赖..."
  npm install
fi

echo ""
echo "🚀 启动开发服务器..."
echo ""
echo "  本地访问:   https://localhost:5173/"
echo "  局域网访问: https://$(ipconfig getifaddr en0 2>/dev/null || echo '你的IP'):5173/"
echo ""
echo "  手机访问时需接受自签名证书"
echo "  按 Ctrl+C 停止"
echo ""

npm run dev
