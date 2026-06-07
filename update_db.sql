-- 1. SESSÕES LÍQUIDAS (Cronômetro)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    date TEXT NOT NULL
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own study sessions" ON study_sessions;
CREATE POLICY "Users can manage their own study sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

-- 2. BANCO DE QUESTÕES
CREATE TABLE IF NOT EXISTS question_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL,
    subject TEXT NOT NULL,
    obs1 TEXT,
    obs2 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own question sets" ON question_sets;
CREATE POLICY "Users can manage their own question sets" ON question_sets FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Global question sets accessible to all" ON question_sets;
CREATE POLICY "Global question sets accessible to all" ON question_sets FOR SELECT USING (user_id IS NULL);

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    code TEXT,
    discipline TEXT,
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own questions" ON questions;
CREATE POLICY "Users can manage their own questions" ON questions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Global questions accessible to all" ON questions;
CREATE POLICY "Global questions accessible to all" ON questions FOR SELECT USING (user_id IS NULL);

CREATE TABLE IF NOT EXISTS question_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE question_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own question results" ON question_results;
CREATE POLICY "Users can manage their own question results" ON question_results FOR ALL USING (auth.uid() = user_id);

-- 3. MÓDULOS TEÓRICOS
CREATE TABLE IF NOT EXISTS theories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    discipline TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE theories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own theories" ON theories;
CREATE POLICY "Users can manage their own theories" ON theories FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Global theories accessible to all" ON theories;
CREATE POLICY "Global theories accessible to all" ON theories FOR SELECT USING (user_id IS NULL);

-- 4. SIMULADOS E PLATAFORMA TEC
CREATE TABLE IF NOT EXISTS mock_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    notes TEXT,
    board JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own mock exams" ON mock_exams;
CREATE POLICY "Users can manage their own mock exams" ON mock_exams FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS mock_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL,
    discipline TEXT NOT NULL,
    accuracy NUMERIC NOT NULL,
    date TEXT NOT NULL,
    tec_link TEXT,
    tec_average NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own mock exam results" ON mock_exam_results;
CREATE POLICY "Users can manage their own mock exam results" ON mock_exam_results FOR ALL USING (auth.uid() = user_id);

-- 5. FUNÇÕES DE SINCRONIZAÇÃO ADMIN DO ATENA
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{isAdmin}', 'true')
  WHERE email = target_email;
  
  RETURN FOUND;
END;
$$;
