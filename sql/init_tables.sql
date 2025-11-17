-- Cwriter Supabase 数据库初始化脚本
-- 请将此脚本复制到Supabase SQL编辑器中执行

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 用户表 (users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    preferences JSONB DEFAULT '{}'::jsonb,
    storage_path VARCHAR(255),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. 作品元数据表 (works_metadata)
CREATE TABLE IF NOT EXISTS public.works_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    local_file_path VARCHAR(500),
    structure_type VARCHAR(20) DEFAULT 'single' CHECK (structure_type IN ('single', 'chapterized')),
    is_active BOOLEAN DEFAULT true,
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0
);

-- 3. 专有名词元数据表 (glossary_metadata)
CREATE TABLE IF NOT EXISTS public.glossary_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID NOT NULL REFERENCES public.works_metadata(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('foreshadowing', 'character', 'setting', 'location', 'item')),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#666666',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    occurrence_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- 4. 地图模块元数据表 (map_modules_metadata)
CREATE TABLE IF NOT EXISTS public.map_modules_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID NOT NULL REFERENCES public.works_metadata(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_module_id UUID REFERENCES public.map_modules_metadata(id) ON DELETE SET NULL,
    position_data JSONB DEFAULT '{}'::jsonb,
    module_type VARCHAR(20) DEFAULT 'area' CHECK (module_type IN ('area', 'room', 'building', 'landmark')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    connections JSONB DEFAULT '[]'::jsonb
);

-- 5. AI调用日志表 (ai_usage_logs)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    work_id UUID REFERENCES public.works_metadata(id) ON DELETE SET NULL,
    ai_agent_type VARCHAR(50) NOT NULL,
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    token_usage INTEGER DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    response_time_ms INTEGER
);

-- 6. 用户会话表 (user_sessions) - 用于多设备同步
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 创建索引以提高查询性能

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 作品元数据表索引
CREATE INDEX IF NOT EXISTS idx_works_metadata_user_id ON public.works_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_works_metadata_updated_at ON public.works_metadata(updated_at);
CREATE INDEX IF NOT EXISTS idx_works_metadata_is_active ON public.works_metadata(is_active);

-- 专有名词元数据表索引
CREATE INDEX IF NOT EXISTS idx_glossary_metadata_work_id ON public.glossary_metadata(work_id);
CREATE INDEX IF NOT EXISTS idx_glossary_metadata_user_id ON public.glossary_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_glossary_metadata_category ON public.glossary_metadata(category);
CREATE INDEX IF NOT EXISTS idx_glossary_metadata_is_active ON public.glossary_metadata(is_active);

-- 地图模块元数据表索引
CREATE INDEX IF NOT EXISTS idx_map_modules_work_id ON public.map_modules_metadata(work_id);
CREATE INDEX IF NOT EXISTS idx_map_modules_user_id ON public.map_modules_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_map_modules_parent_id ON public.map_modules_metadata(parent_module_id);

-- AI调用日志表索引
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent_type ON public.ai_usage_logs(ai_agent_type);

-- 用户会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id ON public.user_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON public.user_sessions(last_active);

-- 创建用于全文搜索的索引
CREATE INDEX IF NOT EXISTS idx_works_metadata_title_search ON public.works_metadata USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_glossary_metadata_name_search ON public.glossary_metadata USING gin(to_tsvector('simple', name));

-- 设置行级安全策略 (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_modules_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 用户只能访问自己的数据
CREATE POLICY "用户只能访问自己的数据" ON public.users FOR ALL USING (auth.uid() = id);

CREATE POLICY "用户只能访问自己的作品" ON public.works_metadata FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "用户只能访问自己的专有名词" ON public.glossary_metadata FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "用户只能访问自己的地图模块" ON public.map_modules_metadata FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "用户只能访问自己的AI日志" ON public.ai_usage_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "用户只能访问自己的会话" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);

-- 创建触发器函数 - 自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间的表创建触发器
CREATE TRIGGER update_works_metadata_updated_at 
    BEFORE UPDATE ON public.works_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_map_modules_metadata_updated_at 
    BEFORE UPDATE ON public.map_modules_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建统计专有名词使用次数的函数
CREATE OR REPLACE FUNCTION update_glossary_occurrence_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 当作品内容更新时，这里可以添加逻辑来统计专有名词出现次数
    -- 目前先留空，后续可以根据实际需求实现
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 注释说明
COMMENT ON TABLE public.users IS '用户基本信息表';
COMMENT ON TABLE public.works_metadata IS '作品元数据表，存储作品的基本信息和文件路径';
COMMENT ON TABLE public.glossary_metadata IS '专有名词管理表，用于高亮和一致性检查';
COMMENT ON TABLE public.map_modules_metadata IS '地图模块数据表，支持层级化的空间描述';
COMMENT ON TABLE public.ai_usage_logs IS 'AI使用日志表，用于监控和成本控制';
COMMENT ON TABLE public.user_sessions IS '用户会话表，支持多设备同步';

-- 插入默认数据（可选）
-- INSERT INTO public.users (id, username, email) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'demo_user', 'demo@cwriter.com');

-- 显示创建结果
SELECT '数据库初始化完成' as status;