-- Apply in the Supabase SQL editor before deploying the resubmission API.
CREATE OR REPLACE FUNCTION public.resubmit_tool_intake(
    p_intake_id public.tool_intakes.id%TYPE,
    p_submitted_by public.tool_intakes.submitted_by%TYPE,
    p_values jsonb,
    p_category_ids integer[],
    p_contributors jsonb
)
RETURNS SETOF public.tool_intakes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    intake public.tool_intakes%ROWTYPE;
    new_values public.tool_intakes%ROWTYPE;
    contributor jsonb;
    contributor_id public.contributors.id%TYPE;
BEGIN
    SELECT * INTO intake
    FROM public.tool_intakes
    WHERE id = p_intake_id
    FOR UPDATE;

    IF NOT FOUND OR intake.status <> 'needs_changes'
        OR intake.submitted_by IS DISTINCT FROM p_submitted_by THEN
        RETURN;
    END IF;

    new_values := jsonb_populate_record(NULL::public.tool_intakes, p_values);
    UPDATE public.tool_intakes SET
        version = new_values.version,
        display_name = new_values.display_name,
        description = new_values.description,
        license = new_values.license,
        icon = new_values.icon,
        csp_exceptions = new_values.csp_exceptions,
        configurations = new_values.configurations,
        tool_idea_id = new_values.tool_idea_id,
        validation_warnings = new_values.validation_warnings,
        features = new_values.features,
        min_api = new_values.min_api,
        mcp_enabled = new_values.mcp_enabled,
        status = 'pending_review',
        reviewer_notes = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE id = p_intake_id
    RETURNING * INTO intake;

    DELETE FROM public.tool_intake_categories WHERE tool_intake_id = p_intake_id;
    INSERT INTO public.tool_intake_categories (tool_intake_id, category_id)
    SELECT p_intake_id, category_id FROM unnest(p_category_ids) AS category_id;

    DELETE FROM public.tool_intake_contributors WHERE tool_intake_id = p_intake_id;
    FOR contributor IN SELECT value FROM jsonb_array_elements(p_contributors)
    LOOP
        IF NULLIF(contributor->>'name', '') IS NULL THEN
            CONTINUE;
        END IF;
        SELECT id INTO contributor_id
        FROM public.contributors
        WHERE name = contributor->>'name'
            AND profile_url IS NOT DISTINCT FROM NULLIF(contributor->>'url', '')
        LIMIT 1;

        IF NOT FOUND THEN
            INSERT INTO public.contributors (name, profile_url)
            VALUES (contributor->>'name', NULLIF(contributor->>'url', ''))
            RETURNING id INTO contributor_id;
        END IF;
        INSERT INTO public.tool_intake_contributors (tool_intake_id, contributor_id)
        VALUES (p_intake_id, contributor_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN NEXT intake;
END;
$$;

REVOKE ALL ON FUNCTION public.resubmit_tool_intake(uuid, uuid, jsonb, integer[], jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_tool_intake(uuid, uuid, jsonb, integer[], jsonb) TO service_role;
