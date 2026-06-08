-- Execute isso no SQL Editor do Supabase para dar acesso global aos Administradores

DO $$
BEGIN
    -- Permitir Admin ver e editar tudo em NOTEBOOKS
    DROP POLICY IF EXISTS "Admins can do everything in notebooks" ON notebooks;
    CREATE POLICY "Admins can do everything in notebooks"
        ON notebooks FOR ALL
        USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));
        
    -- Permitir Admin ver e editar tudo em DISCIPLINAS
    DROP POLICY IF EXISTS "Admins can do everything in disciplines" ON disciplines;
    CREATE POLICY "Admins can do everything in disciplines"
        ON disciplines FOR ALL
        USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));

    -- Permitir Admin ver e editar tudo em CYCLES
    DROP POLICY IF EXISTS "Admins can do everything in cycles" ON cycles;
    CREATE POLICY "Admins can do everything in cycles"
        ON cycles FOR ALL
        USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));

    -- (Opcional) Theorias e Questões
    DROP POLICY IF EXISTS "Admins can do everything in theories" ON theories;
    CREATE POLICY "Admins can do everything in theories"
        ON theories FOR ALL
        USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));

END;
$$;
