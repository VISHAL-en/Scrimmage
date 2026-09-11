-- ==============================================================================
-- MIGRATION: Allow team members to accept their invitations and owners to manage roles
-- ==============================================================================

DROP POLICY IF EXISTS "Team owners can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Users can accept team invites" ON public.team_members;
DROP POLICY IF EXISTS "Users and owners can update team members" ON public.team_members;

CREATE POLICY "Users and owners can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  -- Member can accept/update their own record
  auth.uid() = profile_id
  OR
  -- Team owner can update member roles
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_members.team_id
      AND owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = profile_id
  OR
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_members.team_id
      AND owner_id = auth.uid()
  )
);
