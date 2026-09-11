-- ==============================================================================
-- MIGRATION: Fix Squad Invitation Acceptance (RLS & RPC)
-- ==============================================================================

-- 1. Ensure RLS UPDATE policy allows invited players to accept
DROP POLICY IF EXISTS "Team owners can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Users can accept team invites" ON public.team_members;
DROP POLICY IF EXISTS "Users and owners can update team members" ON public.team_members;

CREATE POLICY "Users and owners can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  -- Member can accept/update their own invitation record
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

-- 2. Secure RPC to accept a team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_current_teams_count INT;
  v_team_approved_count INT;
  v_invite_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Check if an invite actually exists for this user
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND profile_id = v_user_id
      AND role = 'invited'
  ) INTO v_invite_exists;

  IF NOT v_invite_exists THEN
    RAISE EXCEPTION 'No pending invitation found for this squad.';
  END IF;

  -- Check user's 3-team limit
  SELECT COUNT(*) INTO v_current_teams_count
  FROM public.team_members
  WHERE profile_id = v_user_id
    AND role IN ('owner', 'member');

  IF v_current_teams_count >= 3 THEN
    RAISE EXCEPTION 'You have already reached the 3-team limit.';
  END IF;

  -- Check squad's 3-player capacity
  SELECT COUNT(*) INTO v_team_approved_count
  FROM public.team_members
  WHERE team_id = p_team_id
    AND role IN ('owner', 'member');

  IF v_team_approved_count >= 3 THEN
    RAISE EXCEPTION 'This squad is already full (3/3 players).';
  END IF;

  -- Update invitation to full membership
  UPDATE public.team_members
  SET role = 'member'
  WHERE team_id = p_team_id
    AND profile_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Invitation accepted.');
END;
$$;

-- 3. Secure RPC to decline a team invitation
CREATE OR REPLACE FUNCTION public.decline_team_invitation(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  DELETE FROM public.team_members
  WHERE team_id = p_team_id
    AND profile_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Invitation declined.');
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_team_invitation(UUID) TO authenticated;
