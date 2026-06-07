CREATE OR REPLACE FUNCTION admin_sync_theory(
    p_admin_email TEXT,
    p_theory_id UUID,
    p_target_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_target_user_id UUID;
    v_user_id UUID;
    v_count INT := 0;
    v_target_theory_id UUID;
    v_source_theory RECORD;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    IF v_admin_id IS NULL OR v_admin_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_target_email IS NOT NULL AND p_target_email != '' THEN
        SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_target_email LIMIT 1;
        IF v_target_user_id IS NULL THEN
            RETURN '{"success": false, "error": "User not found"}'::jsonb;
        END IF;
    END IF;

    -- Pegar dados da origem
    SELECT * INTO v_source_theory FROM theories WHERE id = p_theory_id AND user_id = v_admin_id;
    IF v_source_theory.id IS NULL THEN
        RETURN '{"success": false, "error": "Source theory not found"}'::jsonb;
    END IF;

    -- Iterar usuários
    FOR v_user_id IN 
        SELECT id FROM auth.users WHERE (v_target_user_id IS NULL OR id = v_target_user_id)
    LOOP
        -- Pula o admin
        IF v_user_id = v_admin_id THEN CONTINUE; END IF;

        -- Procurar teoria com mesma disc e topic e subtopic
        SELECT id INTO v_target_theory_id FROM theories 
        WHERE user_id = v_user_id 
          AND discipline = v_source_theory.discipline 
          AND topic = v_source_theory.topic
          AND (subtopic = v_source_theory.subtopic OR (subtopic IS NULL AND v_source_theory.subtopic IS NULL))
        LIMIT 1;

        IF v_target_theory_id IS NULL THEN
            v_target_theory_id := gen_random_uuid();
            INSERT INTO theories (id, user_id, discipline, topic, subtopic, content)
            VALUES (v_target_theory_id, v_user_id, v_source_theory.discipline, v_source_theory.topic, v_source_theory.subtopic, v_source_theory.content);
        ELSE
            UPDATE theories SET 
                content = v_source_theory.content,
                updated_at = NOW()
            WHERE id = v_target_theory_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_sync_question_set(
    p_admin_email TEXT,
    p_set_name TEXT,
    p_discipline TEXT,
    p_subject TEXT,
    p_obs1 TEXT,
    p_obs2 TEXT,
    p_questions JSONB,
    p_target_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_target_user_id UUID;
    v_user_id UUID;
    v_count INT := 0;
    v_set_id TEXT;
    q RECORD;
BEGIN
    -- Obter admin_id
    SELECT id INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    IF v_admin_id IS NULL OR v_admin_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_target_email IS NOT NULL AND p_target_email != '' THEN
        SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_target_email LIMIT 1;
        IF v_target_user_id IS NULL THEN
            RETURN '{"success": false, "error": "User not found"}'::jsonb;
        END IF;
    END IF;

    -- Iterar usuários-alvo (apenas 1 se especificado, ou TODOS que já têm esse caderno se p_target_email for NULL)
    FOR v_user_id IN 
        SELECT DISTINCT user_id FROM question_sets WHERE (v_target_user_id IS NULL OR user_id = v_target_user_id) AND name = p_set_name
        UNION
        SELECT v_target_user_id WHERE v_target_user_id IS NOT NULL
    LOOP
        IF v_user_id IS NULL THEN CONTINUE; END IF;

        -- Localizar o question_set do usuário com o mesmo nome
        SELECT id INTO v_set_id FROM question_sets WHERE user_id = v_user_id AND name = p_set_name LIMIT 1;

        -- Se não existe, cria um
        IF v_set_id IS NULL THEN
            v_set_id := gen_random_uuid()::text;
            INSERT INTO question_sets (id, user_id, name, discipline, subject, obs1, obs2)
            VALUES (v_set_id, v_user_id, p_set_name, p_discipline, p_subject, p_obs1, p_obs2);
        ELSE
            -- Se existe, atualiza as obs e discipline
            UPDATE question_sets SET discipline = p_discipline, subject = p_subject, obs1 = p_obs1, obs2 = p_obs2
            WHERE id = v_set_id;
        END IF;

        -- Apagar questões antigas
        DELETE FROM questions WHERE set_id = v_set_id;

        -- Inserir novas questões
        FOR q IN SELECT * FROM jsonb_array_elements(p_questions)
        LOOP
            INSERT INTO questions (id, user_id, set_id, text, correct_answer, explanation, code, discipline, subject)
            VALUES (
                gen_random_uuid()::text, v_user_id, v_set_id, 
                q.value->>'text', q.value->>'correct_answer', q.value->>'explanation', 
                q.value->>'code', q.value->>'discipline', q.value->>'subject'
            );
        END LOOP;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_sync_cycle(
    p_admin_email TEXT,
    p_cycle_id UUID,
    p_target_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_target_user_id UUID;
    v_user_id UUID;
    v_count INT := 0;
    v_target_cycle_id UUID;
    v_source_cycle RECORD;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    IF v_admin_id IS NULL OR v_admin_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_target_email IS NOT NULL AND p_target_email != '' THEN
        SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_target_email LIMIT 1;
        IF v_target_user_id IS NULL THEN
            RETURN '{"success": false, "error": "User not found"}'::jsonb;
        END IF;
    END IF;

    -- Pegar dados do ciclo origem
    SELECT * INTO v_source_cycle FROM cycles WHERE id = p_cycle_id AND user_id = v_admin_id;
    IF v_source_cycle.id IS NULL THEN
        RETURN '{"success": false, "error": "Source cycle not found"}'::jsonb;
    END IF;

    -- Iterar usuários
    FOR v_user_id IN 
        SELECT id FROM auth.users WHERE (v_target_user_id IS NULL OR id = v_target_user_id)
    LOOP
        -- Se for o admin, pula
        IF v_user_id = v_admin_id THEN CONTINUE; END IF;

        -- Procurar ciclo existente com mesmo nome
        SELECT id INTO v_target_cycle_id FROM cycles WHERE user_id = v_user_id AND name = v_source_cycle.name LIMIT 1;

        IF v_target_cycle_id IS NULL THEN
            -- Criar novo
            v_target_cycle_id := gen_random_uuid();
            INSERT INTO cycles (id, user_id, name, config, planning, weekly_completion, schedule)
            VALUES (v_target_cycle_id, v_user_id, v_source_cycle.name, COALESCE(v_source_cycle.config, '{}'::jsonb), COALESCE(v_source_cycle.planning, '{}'::jsonb), COALESCE(v_source_cycle.weekly_completion, '{}'::jsonb), COALESCE(v_source_cycle.schedule, '{}'::jsonb));
        ELSE
            -- Atualizar
            UPDATE cycles SET 
                config = v_source_cycle.config, 
                planning = v_source_cycle.planning,
                weekly_completion = v_source_cycle.weekly_completion,
                schedule = v_source_cycle.schedule,
                last_access = NOW()
            WHERE id = v_target_cycle_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION admin_sync_edital_config(
    p_admin_email TEXT,
    p_edital_json JSONB,
    p_target_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_target_user_id UUID;
    v_user_id UUID;
    v_count INT := 0;
    v_cycle_id UUID;
    v_config JSONB;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    IF v_admin_id IS NULL OR v_admin_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_target_email IS NOT NULL AND p_target_email != '' THEN
        SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_target_email LIMIT 1;
        IF v_target_user_id IS NULL THEN
            RETURN '{"success": false, "error": "User not found"}'::jsonb;
        END IF;
    END IF;

    -- Iterar usuários (Especifico ou TODOS)
    -- NOTA: Se p_target_email for NULL, atualiza TODOS os usuários que possuem pelo menos 1 ciclo
    FOR v_user_id IN 
        SELECT DISTINCT user_id FROM cycles WHERE (v_target_user_id IS NULL OR user_id = v_target_user_id)
    LOOP
        IF v_user_id IS NULL THEN CONTINUE; END IF;

        -- Pega o ciclo mais recente
        SELECT id, config INTO v_cycle_id, v_config FROM cycles WHERE user_id = v_user_id ORDER BY last_access DESC LIMIT 1;

        IF v_cycle_id IS NOT NULL THEN
            -- Se v_config for null, inicializa
            v_config := COALESCE(v_config, '{}'::jsonb);
            
            v_config := jsonb_set(v_config, '{structuredEdital}', COALESCE(p_edital_json->'structuredEdital', '[]'::jsonb));
            IF p_edital_json->>'editalText' IS NOT NULL THEN
                v_config := jsonb_set(v_config, '{editalText}', p_edital_json->'editalText');
            END IF;

            UPDATE cycles SET config = v_config WHERE id = v_cycle_id;
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
