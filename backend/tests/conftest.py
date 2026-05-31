"""
DramaGenius 测试全局配置
"""
import os
import sys

# 确保 app 包可导入
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# 设置测试环境变量（在任何 app import 之前）
os.environ["DEV_SKIP_DB"] = "true"
os.environ["DASHSCOPE_API_KEY"] = "test-key"
os.environ["JWT_SECRET"] = "test-jwt-secret-for-testing"
os.environ["SECRET_KEY"] = "test-secret-key"
