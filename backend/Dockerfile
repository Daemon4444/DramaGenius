# DramaGenius Backend - Python 3.11
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖 + Scrapling 浏览器依赖
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    # Scrapling/Playwright 浏览器依赖
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装 Scrapling 浏览器 (Camoufox for StealthyFetcher)
RUN scrapling install camoufox

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
