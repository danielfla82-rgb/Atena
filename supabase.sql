-- EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE DISCIPLINAS (MÃES)
CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    edital TEXT,
    weight TEXT NOT NULL,
    relevance TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE CADERNOS (NOTEBOOKS)
CREATE TABLE IF NOT EXISTS notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    edital TEXT,
    discipline TEXT NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    tec_link TEXT,
    error_notebook_link TEXT,
    error_notebook_comment TEXT,
    favorite_questions_link TEXT,
    law_link TEXT,
    obsidian_link TEXT,
    gemini_link_1 TEXT,
    gemini_link_2 TEXT,
    target_accuracy NUMERIC DEFAULT 90,
    accuracy NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Não Iniciado',
    last_practice TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    accuracy_history JSONB DEFAULT '[]'::jsonb,
    week_id TEXT,
    weight TEXT DEFAULT 'Médio',
    relevance TEXT DEFAULT 'Média',
    trend TEXT DEFAULT 'Estável',
    custom_score NUMERIC,
    is_week_completed BOOLEAN DEFAULT FALSE,
    notes TEXT DEFAULT '',
    images JSONB DEFAULT '[]'::jsonb,
    extra_subtopics JSONB DEFAULT '[]'::jsonb,
    extra_error_notebooks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE CICLOS (CYCLES)
CREATE TABLE IF NOT EXISTS cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_access TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    config JSONB DEFAULT '{}'::jsonb,
    planning JSONB DEFAULT '{}'::jsonb,
    weekly_completion JSONB DEFAULT '{}'::jsonb,
    schedule JSONB DEFAULT '{}'::jsonb
);

-- 4. TABELA DE NOTAS (POST-ITS)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    color TEXT NOT NULL,
    is_bold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE RELATÓRIOS (REPORTS)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL,
    summary TEXT,
    data JSONB NOT NULL
);

-- 6. TABELA DE PROTOCOLO (CHECKLIST)
CREATE TABLE IF NOT EXISTS protocol (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE FRAMEWORK (PIRÂMIDE)
CREATE TABLE IF NOT EXISTS frameworks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    values TEXT DEFAULT '',
    dream TEXT DEFAULT '',
    motivation TEXT DEFAULT '',
    action TEXT DEFAULT '',
    habit TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --- POLÍTICAS DE SEGURANÇA (RLS) ---

-- Habilitar RLS em todas as tabelas
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (Usuário só vê o que é dele)
-- Disciplines
CREATE POLICY "Users can manage their own disciplines" ON disciplines FOR ALL USING (auth.uid() = user_id);
-- Notebooks
CREATE POLICY "Users can manage their own notebooks" ON notebooks FOR ALL USING (auth.uid() = user_id);
-- Cycles
CREATE POLICY "Users can manage their own cycles" ON cycles FOR ALL USING (auth.uid() = user_id);
-- Notes
CREATE POLICY "Users can manage their own notes" ON notes FOR ALL USING (auth.uid() = user_id);
-- Reports
CREATE POLICY "Users can manage their own reports" ON reports FOR ALL USING (auth.uid() = user_id);
-- Protocol
CREATE POLICY "Users can manage their own protocol" ON protocol FOR ALL USING (auth.uid() = user_id);
-- Frameworks
CREATE POLICY "Users can manage their own frameworks" ON frameworks FOR ALL USING (auth.uid() = user_id);
