#!/bin/bash
# DramaGenius 本地开发环境启动脚本

set -e

echo "🎬 DramaGenius 开发环境启动"
echo "=========================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

# 进入 backend 目录
cd "$(dirname "$0")"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/.env 填入 DASHSCOPE_API_KEY"
    echo "   申请地址: https://dashscope.console.aliyun.com/"
    exit 1
fi

# 检查是否设置了 API Key
if grep -q "DASHSCOPE_API_KEY=\"\"" .env || grep -q "DASHSCOPE_API_KEY=''" .env; then
    echo "⚠️  请先在 backend/.env 中填入 DASHSCOPE_API_KEY"
    echo "   申请地址: https://dashscope.console.aliyun.com/"
    exit 1
fi

# 启动 Docker 服务
echo "🐳 启动 Docker 服务 (PostgreSQL, Redis, Elasticsearch)..."
docker-compose up -d postgres redis elasticsearch

echo "⏳ 等待数据库启动..."
sleep 10

# 初始化数据库
echo "📦 初始化数据库..."
docker-compose exec -T postgres psql -U postgres -d dramagenius < scripts/init.sql 2>/dev/null || true

# 检查 Python 虚拟环境
if [ ! -d "venv" ]; then
    echo "🐍 创建 Python 虚拟环境..."
    python3.11 -m venv venv || python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📦 安装 Python 依赖..."
pip install -q -r requirements.txt

# 安装 Scrapling 浏览器
echo "🌐 安装 Scrapling 浏览器 (首次需要)..."
scrapling install camoufox 2>/dev/null || true

# 启动 FastAPI
echo ""
echo "✅ 环境准备完成！"
echo ""
echo "🚀 启动 FastAPI 服务..."
echo "   API 地址: http://localhost:8000"
echo "   文档地址: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
