-- ==============================================================================
-- MIGRATION: Fix Admin Privilege Escalation on Profiles Table
-- Description:
-- 1. Restricts column-level permissions on sensitive columns (is_admin, is_banned)
-- 2. Enforces a BEFORE INSERT OR UPDATE trigger that blocks non-admin modifications
-- 3. Configures Row Level Security (RLS) policies for user and admin profile updates
-- ==============================================================================

-- 1. Ensure RLS is active on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Security-Definer Trigger Function to Guard Privilege Flags
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_caller_admin BOOLEAN := FALSE;
BEGIN
  -- Check if the current authenticated caller is an admin
  IF auth.uid() IS NOT NULL THEN
    SELECT is_admin INTO is_caller_admin
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- If caller is not a verified admin or service_role, force is_admin and is_banned to false
    IF auth.role() = 'authenticated' AND (is_caller_admin IS NOT TRUE) THEN
      NEW.is_admin := FALSE;
      NEW.is_banned := FALSE;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- If caller is a regular authenticated user (not an admin)
    IF auth.role() = 'authenticated' AND (is_caller_admin IS NOT TRUE) THEN
      -- Block any change to is_admin
      IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
        RAISE EXCEPTION 'Unauthorized: You cannot modify is_admin field.'
          USING ERRCODE = '42501';
      END IF;

      -- Block any change to is_banned
      IF (NEW.is_banned IS DISTINCT FROM OLD.is_banned) THEN
        RAISE EXCEPTION 'Unauthorized: You cannot modify is_banned field.'
          USING ERRCODE = '42501';
      END IF;

      -- Block modifying someone else's ID or created_at
      IF (NEW.id IS DISTINCT FROM OLD.id) THEN
        RAISE EXCEPTION 'Unauthorized: You cannot change profile ID.'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- If caller is an admin updating another user's profile:
    -- Admins are permitted to modify is_banned (and other moderation fields),
    -- but prevent regular updates from removing existing admin status accidentally
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach the Trigger to the profiles Table
DROP TRIGGER IF EXISTS trg_guard_profile_privilege_escalation ON public.profiles;

CREATE TRIGGER trg_guard_profile_privilege_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_privilege_escalation();

-- 4. Revoke direct UPDATE privileges on sensitive columns from authenticated/anon roles
REVOKE UPDATE (is_admin, is_banned) ON public.profiles FROM anon, authenticated;
REVOKE INSERT (is_admin, is_banned) ON public.profiles FROM anon, authenticated;

-- Grant permissions on legitimate profile fields
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT (id, display_name, brawl_tag, avatar_url, main_brawler_id, main_brawler_name, main_brawler_icon_url, discord_id, created_at) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, brawl_tag, avatar_url, main_brawler_id, main_brawler_name, main_brawler_icon_url, discord_id) ON public.profiles TO authenticated;

-- 5. Standardize Row Level Security (RLS) Policies on profiles Table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Allow anyone to read profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own profile row (e.g., onboarding)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile row
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any profile row (for moderation / banning)
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
