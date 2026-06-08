UPDATE notebooks SET is_global = FALSE WHERE user_id IS NOT NULL AND is_global = TRUE;

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
