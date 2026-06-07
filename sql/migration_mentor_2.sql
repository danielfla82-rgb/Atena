CREATE OR REPLACE FUNCTION admin_push_notebook_field_v2(
    p_admin_email TEXT,
    p_discipline TEXT,
    p_name TEXT,
    p_field TEXT,
    p_json_value JSONB,
    p_target_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_target_user_id UUID;
    v_count INT := 0;
BEGIN
    -- Verify admin
    IF p_admin_email NOT IN ('danielfla82@gmail.com', 'dcsrj@hotmail.com') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
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

    IF p_field = 'tec_links' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET 
                tec_link = p_json_value->>'tec_link',
                tec_link_comment = p_json_value->>'tec_link_comment',
                extra_tec_notebooks = COALESCE((p_json_value->>'extra_tec_notebooks')::jsonb, '[]'::jsonb)
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET 
                tec_link = p_json_value->>'tec_link',
                tec_link_comment = p_json_value->>'tec_link_comment',
                extra_tec_notebooks = COALESCE((p_json_value->>'extra_tec_notebooks')::jsonb, '[]'::jsonb)
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'error_links' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET 
                error_notebook_link = p_json_value->>'error_notebook_link',
                error_notebook_comment = p_json_value->>'error_notebook_comment',
                extra_error_notebooks = COALESCE((p_json_value->>'extra_error_notebooks')::jsonb, '[]'::jsonb)
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET 
                error_notebook_link = p_json_value->>'error_notebook_link',
                error_notebook_comment = p_json_value->>'error_notebook_comment',
                extra_error_notebooks = COALESCE((p_json_value->>'extra_error_notebooks')::jsonb, '[]'::jsonb)
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'subtopics' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET extra_subtopics = COALESCE((p_json_value->>'extra_subtopics')::jsonb, '[]'::jsonb)
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET extra_subtopics = COALESCE((p_json_value->>'extra_subtopics')::jsonb, '[]'::jsonb)
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'general_info' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET 
                subtitle = p_json_value->>'subtitle',
                edital = p_json_value->>'edital'
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET 
                subtitle = p_json_value->>'subtitle',
                edital = p_json_value->>'edital'
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'summary_and_images' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET notes = p_json_value->>'notes', images = ARRAY(SELECT jsonb_array_elements_text(p_json_value->'images'))
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET notes = p_json_value->>'notes', images = ARRAY(SELECT jsonb_array_elements_text(p_json_value->'images'))
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'weights' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET weight = p_json_value->>'weight', relevance = p_json_value->>'relevance', trend = p_json_value->>'trend', custom_score = NULLIF(p_json_value->>'custom_score', '')::numeric
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET weight = p_json_value->>'weight', relevance = p_json_value->>'relevance', trend = p_json_value->>'trend', custom_score = NULLIF(p_json_value->>'custom_score', '')::numeric
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'favorite_questions' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET favorite_questions_link = p_json_value->>'favorite_questions_link'
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET favorite_questions_link = p_json_value->>'favorite_questions_link'
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'external_links' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET law_link = p_json_value->>'law_link', law_link_comment = p_json_value->>'law_link_comment', obsidian_link = p_json_value->>'obsidian_link', obsidian_link_comment = p_json_value->>'obsidian_link_comment', gemini_link1 = p_json_value->>'gemini_link1', gemini_link1_comment = p_json_value->>'gemini_link1_comment', gemini_link2 = p_json_value->>'gemini_link2'
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET law_link = p_json_value->>'law_link', law_link_comment = p_json_value->>'law_link_comment', obsidian_link = p_json_value->>'obsidian_link', obsidian_link_comment = p_json_value->>'obsidian_link_comment', gemini_link1 = p_json_value->>'gemini_link1', gemini_link1_comment = p_json_value->>'gemini_link1_comment', gemini_link2 = p_json_value->>'gemini_link2'
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'observations' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET subtitle = p_json_value->>'subtitle'
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET subtitle = p_json_value->>'subtitle'
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
