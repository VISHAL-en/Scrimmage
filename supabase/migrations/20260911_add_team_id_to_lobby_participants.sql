-- ==============================================================================
-- MIGRATION: Add optional team_id to lobby_participants
-- Description:
-- 1. Adds nullable team_id UUID column to public.lobby_participants
-- 2. Adds foreign key constraint from team_id to public.teams(id) with ON DELETE SET NULL
-- 3. Creates an index on lobby_participants(team_id) for performant queries
-- ==============================================================================

-- 1. Add nullable team_id column
ALTER TABLE public.lobby_participants
ADD COLUMN IF NOT EXISTS team_id UUID NULL;

-- 2. Add foreign key constraint to public.teams(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_lobby_participants_team'
  ) THEN
    ALTER TABLE public.lobby_participants
    ADD CONSTRAINT fk_lobby_participants_team
    FOREIGN KEY (team_id) REFERENCES public.teams(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create index on team_id
CREATE INDEX IF NOT EXISTS idx_lobby_participants_team_id
ON public.lobby_participants (team_id);
