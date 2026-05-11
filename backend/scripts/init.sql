-- DramaGenius 数据库初始化脚本
-- 自动在 PostgreSQL 容器启动时执行

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于模糊搜索

-- ========== 用户表 ==========
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ========== 项目表 ==========
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    concept TEXT,  -- 创意概要
    status VARCHAR(50) DEFAULT 'draft',  -- draft, in_progress, completed
    genre VARCHAR(100),  -- 题材类型
    target_audience VARCHAR(200),  -- 目标受众
    total_episodes INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ========== 角色表 ==========
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- protagonist, antagonist, supporting
    personality TEXT[],  -- 性格标签数组
    backstory TEXT,  -- 背景故事
    voice_desc TEXT,  -- 声音描述（用于 CosyVoice）
    appearance TEXT,  -- 外貌描述
    catchphrase TEXT,  -- 口头禅
    embedding_id VARCHAR(100),  -- 向量库ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_characters_project_id ON characters(project_id);

-- ========== 剧集表 ==========
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ep_number INTEGER NOT NULL,
    title VARCHAR(200),
    summary TEXT,  -- 本集概要
    status VARCHAR(50) DEFAULT 'draft',
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, ep_number)
);

CREATE INDEX idx_episodes_project_id ON episodes(project_id);

-- ========== 场景表 ==========
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    order_idx INTEGER NOT NULL,
    scene_type VARCHAR(50),  -- dialogue, action, transition, voiceover
    location VARCHAR(200),  -- 场景地点
    time_of_day VARCHAR(50),  -- 时间
    mood VARCHAR(100),  -- 氛围
    content TEXT NOT NULL,  -- 场景内容
    character_ids UUID[],  -- 出场角色
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenes_episode_id ON scenes(episode_id);
CREATE INDEX idx_scenes_order ON scenes(episode_id, order_idx);

-- ========== 决策点表 ==========
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
    description TEXT NOT NULL,  -- 决策点描述
    options JSONB NOT NULL,  -- 选项数组 [{label, consequence, monetization}]
    hot INTEGER DEFAULT 50,  -- 热度评分 0-100
    monetization_note TEXT,  -- 变现建议
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_decisions_project_id ON decisions(project_id);
CREATE INDEX idx_decisions_hot ON decisions(hot DESC);

-- ========== 舆情快照表 ==========
CREATE TABLE IF NOT EXISTS prophet_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    query TEXT NOT NULL,  -- 查询关键词
    keywords TEXT[],  -- 提取的关键词
    trends JSONB,  -- 趋势数据
    sentiment_score FLOAT,  -- 情感分数
    raw_data JSONB,  -- 原始分析数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prophet_snapshots_project_id ON prophet_snapshots(project_id);
CREATE INDEX idx_prophet_snapshots_created_at ON prophet_snapshots(created_at DESC);

-- ========== 语音资源表 ==========
CREATE TABLE IF NOT EXISTS voice_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    text TEXT NOT NULL,  -- 台词文本
    audio_url TEXT NOT NULL,  -- OSS 音频链接
    duration_ms INTEGER,  -- 时长
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voice_assets_character_id ON voice_assets(character_id);

-- ========== 导出记录表 ==========
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(50) NOT NULL,  -- docx, pdf, fountain
    file_url TEXT,  -- OSS 文件链接
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exports_project_id ON exports(project_id);

-- ========== 触发器: 自动更新 updated_at ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 示例数据（开发用） ==========
INSERT INTO users (id, email, name, password_hash) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'demo@dramagenius.ai', 'Demo User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.i3XLJkh0HQNz2y')
ON CONFLICT (email) DO NOTHING;

-- 提示信息
DO $$
BEGIN
    RAISE NOTICE 'DramaGenius 数据库初始化完成！';
    RAISE NOTICE '默认用户: demo@dramagenius.ai / demo123';
END $$;
