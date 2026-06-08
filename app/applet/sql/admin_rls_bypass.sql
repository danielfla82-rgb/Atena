-- Grant full access to admins in RLS

DO $$
DECLARE
    admin_email TEXT;
BEGIN
    FOR admin_email IN SELECT unnest(ARRAY['danielfla82@gmail.com', 'dcsrj@hotmail.com'])
    LOOP
        -- Notebooks
        DROP POLICY IF EXISTS "Admins can do everything in notebooks" ON notebooks;
        CREATE POLICY "Admins can do everything in notebooks"
            ON notebooks FOR ALL
            USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));
            
        -- Disciplines
        DROP POLICY IF EXISTS "Admins can do everything in disciplines" ON disciplines;
        CREATE POLICY "Admins can do everything in disciplines"
            ON disciplines FOR ALL
            USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));

        -- Cycles
        DROP POLICY IF EXISTS "Admins can do everything in cycles" ON cycles;
        CREATE POLICY "Admins can do everything in cycles"
            ON cycles FOR ALL
            USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));
            
        -- Theory
        DROP POLICY IF EXISTS "Admins can do everything in theories" ON theories;
        CREATE POLICY "Admins can do everything in theories"
            ON theories FOR ALL
            USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));

        -- Questions
        DROP POLICY IF EXISTS "Admins can do everything in questions" ON questions;
        CREATE POLICY "Admins can do everything in questions"
            ON questions FOR ALL
            USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'danielfla82@gmail.com' OR email = 'dcsrj@hotmail.com'));
    END LOOP;
END;
$$;
