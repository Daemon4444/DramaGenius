#!/bin/bash
# DramaGenius v4 - 启动脚本
# 用法: bash start.sh [--build] [--port 3000]
#   --build  启动前重新构建前端
#   --port   指定端口号 (默认 3000)

set -e
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)
PORT=3000
DO_BUILD=false

# ── 解析参数 ──
while [[ $# -gt 0 ]]; do
  case $1 in
    --build) DO_BUILD=true; shift ;;
    --port)  PORT="$2"; shift 2 ;;
    *)       echo "未知参数: $1"; exit 1 ;;
  esac
done

# ── 检测 Python ──
PYTHON=""
for cmd in python3.11 python3.10 python3.9; do
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
  echo "[ERROR] 需要 Python >= 3.9，请先运行 bash setup.sh"
  exit 1
fi

# ── 按需构建前端 ──
if [ "$DO_BUILD" = true ] || [ ! -d "dist" ]; then
  echo ">> 构建前端..."
  npm run build 2>&1 | tail -3
  echo ""
fi

# ── 停止已有进程 ──
if command -v lsof &>/dev/null; then
  EXISTING=$(lsof -ti:$PORT 2>/dev/null || true)
elif command -v ss &>/dev/null; then
  EXISTING=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+' || true)
else
  EXISTING=""
fi

if [ -n "$EXISTING" ]; then
  echo ">> 停止端口 $PORT 上的已有进程 (PID: $EXISTING)..."
  kill -9 $EXISTING 2>/dev/null || true
  sleep 1
fi

# ── 检查关键文件 ──
if [ ! -f "backend/.env" ]; then
  echo "[ERROR] backend/.env 不存在，请先运行 bash setup.sh"
  exit 1
fi

if [ ! -d "dist" ]; then
  echo "[ERROR] dist/ 不存在，请先运行 npm run build"
  exit 1
fi

# ── 启动服务 ──
echo "=========================================="
echo "  DramaGenius v4"
echo "  Python:  $PYTHON ($($PYTHON --version 2>&1))"
echo "  Port:    $PORT"
echo "  Dist:    $(ls dist/assets/*.js 2>/dev/null | wc -l) JS + $(ls dist/assets/*.css 2>/dev/null | wc -l) CSS"
echo "=========================================="
echo ""
echo "  http://localhost:$PORT"
echo ""
echo "  Ctrl+C 停止服务"
echo "=========================================="
echo ""

cd backend
exec $PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
