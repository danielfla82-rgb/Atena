-- 1. FIX QUESTION SETS (Adicionar colunas faltantes)
ALTER TABLE question_sets
ADD COLUMN IF NOT EXISTS obs1 TEXT,
ADD COLUMN IF NOT EXISTS obs2 TEXT;

-- 2. FIX NOTEBOOKS (Adicionar comentários de links e novos pesos textuais)
ALTER TABLE notebooks
ADD COLUMN IF NOT EXISTS law_link_comment TEXT,
ADD COLUMN IF NOT EXISTS obsidian_link_comment TEXT,
ADD COLUMN IF NOT EXISTS gemini_link_1_comment TEXT,
ADD COLUMN IF NOT EXISTS theme_weight TEXT;

-- 3. FIX MOCK EXAMS (Remover restrições de colunas errôneas caso tenham sido criadas)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mock_exams' AND column_name = 'date'
    ) THEN
        ALTER TABLE mock_exams ALTER COLUMN date DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mock_exams' AND column_name = 'total_questions'
    ) THEN
        ALTER TABLE mock_exams ALTER COLUMN total_questions DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mock_exams' AND column_name = 'correct_answers'
    ) THEN
        ALTER TABLE mock_exams ALTER COLUMN correct_answers DROP NOT NULL;
    END IF;
END $$;

-- 4. GARANTIR POLÍTICAS DO QUESTION SETS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'question_sets' 
        AND policyname = 'Users can manage their own question sets'
    ) THEN
        CREATE POLICY "Users can manage their own question sets" ON question_sets FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;
