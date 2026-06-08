DROP FUNCTION IF EXISTS public.admin_sync_cycle(text, text, text);
DROP FUNCTION IF EXISTS public.admin_sync_cycle(text, uuid, text);

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
    v_new_schedule JSONB;
    v_week_key TEXT;
    v_slots JSONB;
    v_new_slots JSONB;
    v_slot JSONB;
    v_admin_nb_id TEXT;
    v_target_nb_id TEXT;
    v_nb_rec RECORD;
BEGIN
    -- 1. Get Admin ID
    SELECT id::TEXT INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    
    -- Cast explícito para ambos
    IF v_admin_id IS NULL OR v_admin_id != auth.uid()::TEXT THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- 2. Get Target User IF specified
    IF p_target_email IS NOT NULL AND p_target_email != '' THEN
        SELECT id::TEXT INTO v_target_user_id FROM auth.users WHERE email = p_target_email LIMIT 1;
        IF v_target_user_id IS NULL THEN
            RETURN '{"success": false, "error": "User not found"}'::jsonb;
        END IF;
    END IF;

    -- 3. Pegar dados do ciclo origem 
    SELECT * INTO v_source_cycle 
    FROM cycles 
    WHERE id::TEXT = p_cycle_id AND user_id::TEXT = v_admin_id;
    
    IF v_source_cycle.id IS NULL THEN
        RETURN '{"success": false, "error": "Source cycle not found"}'::jsonb;
    END IF;

    -- 4. Iterar usuários
    FOR v_user_loop_id IN 
        SELECT id::TEXT FROM auth.users WHERE (v_target_user_id IS NULL OR id::TEXT = v_target_user_id)
    LOOP
        -- Se for o admin, pula
        IF v_user_loop_id = v_admin_id THEN CONTINUE; END IF;

        -- NOVO: 4.1. Processar e Mapear o Schedule
        -- O schedule do admin aponta para cadernos do admin. O aluno precisa ter os cadernos mapeados ou clonados!
        v_new_schedule := '{}'::jsonb;
        
        IF v_source_cycle.schedule IS NOT NULL AND jsonb_typeof(v_source_cycle.schedule) = 'object' THEN
            FOR v_week_key, v_slots IN SELECT * FROM jsonb_each(v_source_cycle.schedule)
            LOOP
                v_new_slots := '[]'::jsonb;
                
                IF jsonb_typeof(v_slots) = 'array' THEN
                    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_slots)
                    LOOP
                        v_admin_nb_id := v_slot->>'notebookId';
                        
                        -- Buscar informacao do caderno no admin
                        SELECT discipline, name, subtitle INTO v_nb_rec 
                        FROM notebooks 
                        WHERE id::TEXT = v_admin_nb_id LIMIT 1;
                        
                        IF FOUND THEN
                            -- Validar se o aluno ja tem o caderno (mesma disciplina e nome)
                            SELECT id::TEXT INTO v_target_nb_id 
                            FROM notebooks 
                            WHERE user_id::TEXT = v_user_loop_id 
                              AND discipline = v_nb_rec.discipline 
                              AND name = v_nb_rec.name LIMIT 1;
                              
                            -- Se nao tiver, Clona o caderno do admin pro aluno!
                            IF v_target_nb_id IS NULL THEN
                                v_target_nb_id := gen_random_uuid()::TEXT;
                                
                                INSERT INTO notebooks (
                                    id, user_id, edital, discipline, name, subtitle,
                                    tec_link, tec_link_comment, error_notebook_link, error_notebook_comment,
                                    favorite_questions_link, law_link, obsidian_link, gemini_link_1, gemini_link_2,
                                    gemini_link_1_comment, law_link_comment, obsidian_link_comment, theme_weight,
                                    target_accuracy, accuracy, status, weight, relevance, trend, custom_score,
                                    is_week_completed, notes, images, extra_subtopics, extra_tec_notebooks, extra_error_notebooks
                                )
                                SELECT 
                                    v_target_nb_id::UUID, v_user_loop_id::UUID, edital, discipline, name, subtitle,
                                    tec_link, tec_link_comment, error_notebook_link, error_notebook_comment,
                                    favorite_questions_link, law_link, obsidian_link, gemini_link_1, gemini_link_2,
                                    gemini_link_1_comment, law_link_comment, obsidian_link_comment, theme_weight,
                                    target_accuracy, 0, 'Não Iniciado', weight, relevance, trend, custom_score,
                                    false, '', '{}'::text[], extra_subtopics, extra_tec_notebooks, extra_error_notebooks
                                FROM notebooks WHERE id::TEXT = v_admin_nb_id LIMIT 1;
                            END IF;
                            
                            -- Atualiza o slot com o novo ID do caderno do aluno
                            v_slot := jsonb_set(v_slot, '{notebookId}', to_jsonb(v_target_nb_id));
                        END IF;
                        
                        v_new_slots := v_new_slots || v_slot;
                    END LOOP;
                END IF;
                
                v_new_schedule := jsonb_set(v_new_schedule, ARRAY[v_week_key], v_new_slots);
            END LOOP;
        ELSE
            v_new_schedule := COALESCE(v_source_cycle.schedule, '{}'::jsonb);
        END IF;

        -- 4.2. Procurar ciclo existente com mesmo nome 
        SELECT id::TEXT INTO v_target_cycle_id 
        FROM cycles 
        WHERE user_id::TEXT = v_user_loop_id AND name = v_source_cycle.name LIMIT 1;

        IF v_target_cycle_id IS NULL THEN
            -- Criar novo 
            v_target_cycle_id := gen_random_uuid()::TEXT;
            
            INSERT INTO cycles (id, user_id, name, config, planning, weekly_completion, schedule)
            VALUES (
                v_target_cycle_id::UUID, 
                v_user_loop_id::UUID, 
                v_source_cycle.name, 
                COALESCE(v_source_cycle.config, '{}'::jsonb), 
                COALESCE(v_source_cycle.planning, '{}'::jsonb), 
                COALESCE(v_source_cycle.weekly_completion, '{}'::jsonb), 
                v_new_schedule
            );
        ELSE
            -- Atualizar
            UPDATE cycles SET 
                config = v_source_cycle.config, 
                planning = v_source_cycle.planning,
                weekly_completion = v_source_cycle.weekly_completion,
                schedule = v_new_schedule,
                last_access = NOW()
            WHERE id::TEXT = v_target_cycle_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
