-- 1. Sincronização do Ciclo do Mentor com suporte flexível a TEXT/UUID
CREATE OR REPLACE FUNCTION admin_sync_cycle(
    p_admin_email TEXT,
    p_cycle_id TEXT,
    p_target_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_admin_id TEXT;
    v_target_user_id TEXT;
    v_user_loop_id TEXT;
    v_count INT := 0;
    v_target_cycle_id TEXT;
    v_source_cycle RECORD;
BEGIN
    SELECT id::TEXT INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    IF v_admin_id IS NULL OR v_admin_id != auth.uid()::TEXT THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_target_email IS NOT NULL AND p_target_email != '' THEN
        SELECT id::TEXT INTO v_target_user_id FROM auth.users WHERE email = p_target_email LIMIT 1;
        IF v_target_user_id IS NULL THEN
            RETURN '{"success": false, "error": "User not found"}'::jsonb;
        END IF;
    END IF;

    -- Pegar dados do ciclo origem, ignorando falhas de tipos fortes de UUID
    SELECT * INTO v_source_cycle FROM cycles WHERE id::TEXT = p_cycle_id AND user_id::TEXT = v_admin_id;
    IF v_source_cycle.id IS NULL THEN
        RETURN '{"success": false, "error": "Source cycle not found"}'::jsonb;
    END IF;

    -- Iterar usuários
    FOR v_user_loop_id IN 
        SELECT id::TEXT FROM auth.users WHERE (v_target_user_id IS NULL OR id::TEXT = v_target_user_id)
    LOOP
        -- Se for o admin, pula
        IF v_user_loop_id = v_admin_id THEN CONTINUE; END IF;

        -- Procurar ciclo existente com mesmo nome
        SELECT id::TEXT INTO v_target_cycle_id FROM cycles WHERE user_id::TEXT = v_user_loop_id AND name = v_source_cycle.name LIMIT 1;

        IF v_target_cycle_id IS NULL THEN
            -- Criar novo gerando um id via gen_random_uuid() TEXT
            v_target_cycle_id := gen_random_uuid()::TEXT;
            
            INSERT INTO cycles (id, user_id, name, config, planning, weekly_completion, schedule)
            VALUES (
                -- Cast back to UUID se a coluna for UUID, mas Postgres converte automaticamente texto de formato UUID
                v_target_cycle_id::UUID, 
                v_user_loop_id::UUID, 
                v_source_cycle.name, 
                COALESCE(v_source_cycle.config, '{}'::jsonb), 
                COALESCE(v_source_cycle.planning, '{}'::jsonb), 
                COALESCE(v_source_cycle.weekly_completion, '{}'::jsonb), 
                COALESCE(v_source_cycle.schedule, '{}'::jsonb)
            );
        ELSE
            -- Atualizar
            UPDATE cycles SET 
                config = v_source_cycle.config, 
                planning = v_source_cycle.planning,
                weekly_completion = v_source_cycle.weekly_completion,
                schedule = v_source_cycle.schedule,
                last_access = NOW()
            WHERE id::TEXT = v_target_cycle_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
