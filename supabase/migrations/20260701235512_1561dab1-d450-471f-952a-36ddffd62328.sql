
-- 1) Move SECURITY DEFINER helper out of the exposed public API schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_room_member(_room text, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_code = _room AND user_id = _user
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_room_member(text, uuid) TO authenticated, service_role;

-- 2) Rewrite policies to use the private helper
DROP POLICY IF EXISTS "Room members create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Room members delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Room members update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Room members view tasks" ON public.tasks;

CREATE POLICY "Room members create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (private.is_room_member(room_code, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Room members delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (private.is_room_member(room_code, auth.uid()));

CREATE POLICY "Room members update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (private.is_room_member(room_code, auth.uid()))
  WITH CHECK (private.is_room_member(room_code, auth.uid()));

CREATE POLICY "Room members view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (private.is_room_member(room_code, auth.uid()));

-- 3) Restrict room_members SELECT to members of the same room
DROP POLICY IF EXISTS "Authenticated can view room members" ON public.room_members;

CREATE POLICY "Members view same-room memberships" ON public.room_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_room_member(room_code, auth.uid())
  );

-- 4) Drop the now-unused public wrapper so it is no longer callable via the API
DROP FUNCTION IF EXISTS public.is_room_member(text, uuid);
