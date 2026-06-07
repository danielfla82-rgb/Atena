-- TABELA DE TEORIAS
CREATE TABLE IF NOT EXISTS theories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    discipline TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE theories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own theories" ON theories FOR ALL USING (auth.uid() = user_id);
