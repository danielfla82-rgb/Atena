-- Tabela de Simulados (Concursos)
CREATE TABLE IF NOT EXISTS public.mock_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    board TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Resultados de Simulados
CREATE TABLE IF NOT EXISTS public.mock_exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.mock_exams(id) ON DELETE CASCADE,
    discipline TEXT NOT NULL,
    accuracy NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    tec_link TEXT
);

-- Políticas de Segurança (RLS)
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios simulados" ON public.mock_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios simulados" ON public.mock_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios simulados" ON public.mock_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios simulados" ON public.mock_exams FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver seus próprios resultados de simulados" ON public.mock_exam_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios resultados de simulados" ON public.mock_exam_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios resultados de simulados" ON public.mock_exam_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios resultados de simulados" ON public.mock_exam_results FOR DELETE USING (auth.uid() = user_id);
