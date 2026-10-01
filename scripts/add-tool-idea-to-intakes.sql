-- Link a tool intake to an existing community tool idea (optional).
ALTER TABLE public.tool_intakes
    ADD COLUMN IF NOT EXISTS tool_idea_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tool_intakes_tool_idea_id_fkey'
          AND conrelid = 'public.tool_intakes'::regclass
    ) THEN
        ALTER TABLE public.tool_intakes
            ADD CONSTRAINT tool_intakes_tool_idea_id_fkey
            FOREIGN KEY (tool_idea_id)
            REFERENCES public.tool_ideas(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS tool_intakes_tool_idea_id_idx
    ON public.tool_intakes (tool_idea_id)
    WHERE tool_idea_id IS NOT NULL;