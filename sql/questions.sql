-- TABELA DE CADERNOS DE QUESTÕES
CREATE TABLE IF NOT EXISTS question_sets (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    discipline TEXT,
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE QUESTÕES
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id TEXT REFERENCES question_sets(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    code TEXT,
    discipline TEXT,
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE RESULTADOS (HISTÓRICO)
CREATE TABLE IF NOT EXISTS question_results (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    set_id TEXT REFERENCES question_sets(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_results ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can manage their own question sets" ON question_sets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own questions" ON questions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own question results" ON question_results FOR ALL USING (auth.uid() = user_id);
