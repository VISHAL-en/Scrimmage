-- ==============================================================================
-- MIGRATION: Fix team_members RLS policies for team owners and applicants
-- Description:
-- 1. Ensures RLS is enabled on public.team_members
-- 2. Grants authenticated users ability to insert pending join requests
-- 3. Grants team owners ability to insert owner records upon team creation
-- 4. Ensures team members are viewable by everyone
-- ==============================================================================

-- 1. Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insert policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can request to join team" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Allow member insert" ON public.team_members;
DROP POLICY IF EXISTS "Users and owners can insert team members" ON public.team_members;

-- 3. Create the comprehensive INSERT policy for team_members:
CREATE POLICY "Users and owners can insert team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Players can request to join as pending
  (auth.uid() = profile_id AND role = 'pending')
  OR
  -- Team owner can insert themselves as owner or manage team roster
  (EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_members.team_id
      AND owner_id = auth.uid()
  ))
);

-- 4. Ensure SELECT policy allows viewing team members
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone"
ON public.team_members
FOR SELECT
USING (true);
