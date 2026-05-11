#!/bin/bash
# DramaGenius v4 - 环境安装脚本
# 用法: bash setup.sh

set -e
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

echo "=========================================="
echo "  DramaGenius v4 - 环境安装"
echo "=========================================="

# ── 检测 Python 3.11 ──
PYTHON=""
for cmd in python3.11 python3.10 python3.9 python3; do
  if command -v "$cmd" &>/dev/null; then
    ver=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+')
    major=$(echo "$ver" | cut -d. -f1)
    minor=$(echo "$ver" | cut -d. -f2)
    if [ "$major" -ge 3 ] && [ "$minor" -ge 9 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "[ERROR] 需要 Python >= 3.9，当前系统未找到"
  echo "  系统默认 python3: $(python3 --version 2>&1)"
  echo "  请安装 Python 3.11: yum install python3.11 或 apt install python3.11"
  exit 1
fi
echo "[OK] Python: $PYTHON ($($PYTHON --version 2>&1))"

# ── 检测 Node.js ──
if ! command -v node &>/dev/null; then
  echo "[ERROR] 需要 Node.js >= 18，请先安装"
  exit 1
fi
NODE_VER=$(node --version | grep -oP '\d+' | head -1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "[ERROR] Node.js 版本过低 ($(node --version))，需要 >= 18"
  exit 1
fi
echo "[OK] Node.js: $(node --version)"

# ── 安装前端依赖 ──
echo ""
echo ">> 安装前端依赖..."
npm install --legacy-peer-deps 2>&1 | tail -3

# ── 安装后端依赖 ──
echo ""
echo ">> 安装后端 Python 依赖..."
$PYTHON -m pip install \
  uvicorn fastapi python-multipart \
  dashscope openai \
  pydantic pydantic-settings \
  httpx python-dotenv \
  sqlalchemy python-jose passlib \
  email-validator elasticsearch \
  2>&1 | tail -5

# ── 检查 .env 文件 ──
echo ""
echo ">> 检查环境变量..."

if [ ! -f ".env" ]; then
  cat > .env << 'ENVEOF'
VITE_API_BASE=/api
VITE_USE_REAL_API=true
ENVEOF
  echo "[CREATED] .env (前端环境变量)"
else
  echo "[OK] .env 已存在"
fi

if [ ! -f "backend/.env" ]; then
  cat > backend/.env << 'ENVEOF'
DEV_SKIP_DB=true
DASHSCOPE_API_KEY=
PUBLIC_HOST=
ENVEOF
  echo "[CREATED] backend/.env (后端环境变量)"
  echo "[WARNING] 请编辑 backend/.env 填入 DASHSCOPE_API_KEY"
else
  echo "[OK] backend/.env 已存在"
  # 检查关键配置
  if grep -q "DASHSCOPE_API_KEY=$" backend/.env || grep -q "DASHSCOPE_API_KEY=\"\"" backend/.env; then
    echo "[WARNING] DASHSCOPE_API_KEY 未配置，TTS/LLM 功能将不可用"
  fi
fi

# ── 构建前端 ──
echo ""
echo ">> 构建前端..."
npm run build 2>&1 | tail -5

# ── 确保临时目录存在 ──
mkdir -p backend/static/temp

echo ""
echo "=========================================="
echo "  安装完成!"
echo "=========================================="
echo ""
echo "  启动命令:  bash start.sh"
echo "  访问地址:  http://localhost:3000"
echo ""
echo "  如需修改配置:"
echo "    前端: .env"
echo "    后端: backend/.env"
echo ""
