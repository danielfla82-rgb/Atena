CREATE OR REPLACE FUNCTION admin_push_notebook_field(
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

    -- Construct the update
    IF p_field = 'tec_link' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET tec_link = p_json_value->>'value' WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET tec_link = p_json_value->>'value' WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    ELSIF p_field = 'all_links' THEN
        IF v_target_user_id IS NOT NULL THEN
            UPDATE notebooks SET 
                tec_link = p_json_value->>'tec_link',
                tec_link_comment = p_json_value->>'tec_link_comment',
                extra_tec_notebooks = COALESCE((p_json_value->>'extra_tec_notebooks')::jsonb, '[]'::jsonb),
                error_notebook_link = p_json_value->>'error_notebook_link',
                error_notebook_comment = p_json_value->>'error_notebook_comment',
                extra_error_notebooks = COALESCE((p_json_value->>'extra_error_notebooks')::jsonb, '[]'::jsonb)
            WHERE user_id = v_target_user_id AND discipline = p_discipline AND name = p_name;
        ELSE
            UPDATE notebooks SET 
                tec_link = p_json_value->>'tec_link',
                tec_link_comment = p_json_value->>'tec_link_comment',
                extra_tec_notebooks = COALESCE((p_json_value->>'extra_tec_notebooks')::jsonb, '[]'::jsonb),
                error_notebook_link = p_json_value->>'error_notebook_link',
                error_notebook_comment = p_json_value->>'error_notebook_comment',
                extra_error_notebooks = COALESCE((p_json_value->>'extra_error_notebooks')::jsonb, '[]'::jsonb)
            WHERE user_id IS NOT NULL AND discipline = p_discipline AND name = p_name;
        END IF;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an RPC to save global templates bypassing RLS
CREATE OR REPLACE FUNCTION admin_save_global_notebook(
    p_admin_email TEXT,
    p_notebook_id UUID,
    p_payload JSONB
) RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_count INT := 0;
BEGIN
    IF p_admin_email NOT IN ('danielfla82@gmail.com', 'dcsrj@hotmail.com') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    SELECT id INTO v_admin_id FROM auth.users WHERE email = p_admin_email LIMIT 1;
    IF v_admin_id IS NULL OR v_admin_id != auth.uid() THEN
         RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Update the global template
    UPDATE notebooks SET 
        tec_link = p_payload->>'tec_link',
        tec_link_comment = p_payload->>'tec_link_comment',
        extra_tec_notebooks = COALESCE((p_payload->>'extra_tec_notebooks')::jsonb, '[]'::jsonb)
    WHERE id = p_notebook_id AND user_id IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'updated', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
