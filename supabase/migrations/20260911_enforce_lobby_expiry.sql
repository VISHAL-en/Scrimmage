-- ==============================================================================
-- MIGRATION: Server-Side Lobby Expiry Enforcement
-- Description:
-- 1. Updates join_lobby_as_team RPC to reject expired lobbies (scheduled_time + 15 min < now())
-- 2. Creates a BEFORE INSERT trigger on lobby_participants to reject expired solo joins
-- ==============================================================================

-- 1. Update join_lobby_as_team RPC with expiry check
CREATE OR REPLACE FUNCTION public.join_lobby_as_team(
  target_lobby_id UUID,
  target_team_id UUID,
  selected_member_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_is_captain BOOLEAN := FALSE;
  v_team_exists BOOLEAN := FALSE;
  v_selected_count INT;
  v_unique_count INT;
  v_valid_members_count INT;
  v_banned_count INT;
  v_existing_profiles_count INT;
  v_lobby_status TEXT;
  v_lobby_slot_count INT;
  v_lobby_scheduled_time TIMESTAMPTZ;
  v_current_participants_count INT;
  v_already_joined_count INT;
  v_member UUID;
BEGIN
  -- 1. Verify caller authentication
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validate input parameters
  IF target_lobby_id IS NULL OR target_team_id IS NULL OR selected_member_ids IS NULL THEN
    RAISE EXCEPTION 'Bad Request: Missing required parameters.'
      USING ERRCODE = '22000';
  END IF;

  v_selected_count := pg_catalog.array_length(selected_member_ids, 1);
  IF v_selected_count IS NULL OR v_selected_count < 1 OR v_selected_count > 3 THEN
    RAISE EXCEPTION 'Invalid team size: You must select between 1 and 3 team members.'
      USING ERRCODE = '22000';
  END IF;

  -- 3. Check for duplicate UUIDs in selected_member_ids
  SELECT pg_catalog.count(DISTINCT m)
  INTO v_unique_count
  FROM pg_catalog.unnest(selected_member_ids) AS m;

  IF v_unique_count <> v_selected_count THEN
    RAISE EXCEPTION 'Bad Request: Duplicate members specified in selection.'
      USING ERRCODE = '22000';
  END IF;

  -- 4. Verify team existence
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = target_team_id
  ) INTO v_team_exists;

  IF NOT v_team_exists THEN
    RAISE EXCEPTION 'Team not found.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 5. Verify caller is the owner/captain of the team
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = target_team_id AND owner_id = v_caller_id
  ) OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = target_team_id AND profile_id = v_caller_id AND role = 'owner'
  ) INTO v_is_captain;

  IF NOT v_is_captain THEN
    RAISE EXCEPTION 'Unauthorized: Only the team captain can join a scrim as a team.'
      USING ERRCODE = '42501';
  END IF;

  -- 6. Verify caller is included in the selected members
  IF NOT (v_caller_id = ANY(selected_member_ids)) THEN
    RAISE EXCEPTION 'Invalid selection: Team captain must be included in the participating roster.'
      USING ERRCODE = '22000';
  END IF;

  -- 7. Verify all selected members are approved active members (role = 'owner' OR 'member') of target_team_id
  SELECT pg_catalog.count(*)
  INTO v_valid_members_count
  FROM public.team_members
  WHERE team_id = target_team_id
    AND profile_id = ANY(selected_member_ids)
    AND role IN ('owner', 'member');

  IF v_valid_members_count <> v_selected_count THEN
    RAISE EXCEPTION 'Invalid roster: All selected players must be approved active members of this team.'
      USING ERRCODE = '22000';
  END IF;

  -- 8. Verify all selected members have valid profiles
  SELECT pg_catalog.count(*)
  INTO v_existing_profiles_count
  FROM public.profiles
  WHERE id = ANY(selected_member_ids);

  IF v_existing_profiles_count <> v_selected_count THEN
    RAISE EXCEPTION 'Invalid player: One or more selected members do not have a valid profile.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 9. Verify none of the selected members are banned
  SELECT pg_catalog.count(*)
  INTO v_banned_count
  FROM public.profiles
  WHERE id = ANY(selected_member_ids)
    AND is_banned = TRUE;

  IF v_banned_count > 0 THEN
    RAISE EXCEPTION 'Account restricted: One or more selected team members are currently banned.'
      USING ERRCODE = '42501';
  END IF;

  -- 10. Lock & verify target lobby status, slot capacity, and scheduled_time
  SELECT status, slot_count, scheduled_time
  INTO v_lobby_status, v_lobby_slot_count, v_lobby_scheduled_time
  FROM public.lobbies
  WHERE id = target_lobby_id
  FOR UPDATE;

  IF v_lobby_status IS NULL THEN
    RAISE EXCEPTION 'Lobby not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_lobby_status <> 'open' THEN
    RAISE EXCEPTION 'Lobby is not open for new joins (status: %).', v_lobby_status
      USING ERRCODE = '22000';
  END IF;

  -- 11. Check lobby expiration (15-minute grace period)
  IF (v_lobby_scheduled_time + INTERVAL '15 minutes') < pg_catalog.now() THEN
    RAISE EXCEPTION 'This scrim lobby has expired and is no longer accepting new participants.'
      USING ERRCODE = '22000';
  END IF;

  -- 12. Check current participants count and remaining capacity
  SELECT pg_catalog.count(*)
  INTO v_current_participants_count
  FROM public.lobby_participants
  WHERE lobby_id = target_lobby_id;

  IF (v_current_participants_count + v_selected_count) > v_lobby_slot_count THEN
    RAISE EXCEPTION 'Lobby full: Not enough open slots (need %, available %).',
      v_selected_count, (v_lobby_slot_count - v_current_participants_count)
      USING ERRCODE = '22000';
  END IF;

  -- 13. Check if any selected member is already in this lobby
  SELECT pg_catalog.count(*)
  INTO v_already_joined_count
  FROM public.lobby_participants
  WHERE lobby_id = target_lobby_id
    AND profile_id = ANY(selected_member_ids);

  IF v_already_joined_count > 0 THEN
    RAISE EXCEPTION 'Conflict: One or more selected members are already in this lobby.'
      USING ERRCODE = '23505';
  END IF;

  -- 14. Atomically insert all selected members with team_id
  FOREACH v_member IN ARRAY selected_member_ids LOOP
    INSERT INTO public.lobby_participants (
      lobby_id,
      profile_id,
      team_id,
      joined_at
    ) VALUES (
      target_lobby_id,
      v_member,
      target_team_id,
      pg_catalog.now()
    );
  END LOOP;

  -- 15. Return success result
  RETURN pg_catalog.jsonb_build_object(
    'success', TRUE,
    'lobby_id', target_lobby_id,
    'team_id', target_team_id,
    'joined_count', v_selected_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_lobby_as_team(UUID, UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_lobby_as_team(UUID, UUID, UUID[]) TO authenticated;

-- 2. Server-side trigger for solo participant inserts
CREATE OR REPLACE FUNCTION public.check_lobby_join_not_expired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lobby_status TEXT;
  v_scheduled_time TIMESTAMPTZ;
BEGIN
  SELECT status, scheduled_time
  INTO v_lobby_status, v_scheduled_time
  FROM public.lobbies
  WHERE id = NEW.lobby_id;

  IF v_lobby_status IS NULL THEN
    RAISE EXCEPTION 'Lobby not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_lobby_status <> 'open' THEN
    RAISE EXCEPTION 'Lobby is not open for new joins (status: %).', v_lobby_status
      USING ERRCODE = '22000';
  END IF;

  IF (v_scheduled_time + INTERVAL '15 minutes') < pg_catalog.now() THEN
    RAISE EXCEPTION 'This scrim lobby has expired and is no longer accepting new participants.'
      USING ERRCODE = '22000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_lobby_join_not_expired ON public.lobby_participants;
CREATE TRIGGER trg_check_lobby_join_not_expired
BEFORE INSERT ON public.lobby_participants
FOR EACH ROW
EXECUTE FUNCTION public.check_lobby_join_not_expired();
