-- Minimal setup for a brand-new Supabase project.
-- Paste the whole file into Supabase SQL Editor and run once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- TABLES
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT 'Anonymous',
  avatar_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_members (
  room_code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, user_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL,
  title text NOT NULL,
  quadrant text NOT NULL CHECK (quadrant IN ('do','schedule','delegate','eliminate')),
  deadline date,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_members_room_idx ON public.room_members(room_code);
CREATE INDEX IF NOT EXISTS room_members_user_idx ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS tasks_room_idx ON public.tasks(room_code);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON public.tasks(deadline) WHERE deadline IS NOT NULL;

-- =========================
-- GRANTS
-- =========================
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

-- =========================
-- RLS
-- =========================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_room_member(_room text, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS '
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_code = _room AND user_id = _user
  );
';

GRANT EXECUTE ON FUNCTION private.is_room_member(text, uuid) TO authenticated, service_role;
DROP FUNCTION IF EXISTS public.is_room_member(text, uuid);

DROP POLICY IF EXISTS "Users join rooms as themselves" ON public.room_members;
CREATE POLICY "Users join rooms as themselves"
  ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users leave their own membership" ON public.room_members;
CREATE POLICY "Users leave their own membership"
  ON public.room_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members view same-room memberships" ON public.room_members;
CREATE POLICY "Members view same-room memberships"
  ON public.room_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_room_member(room_code, auth.uid())
  );

DROP POLICY IF EXISTS "Room members create tasks" ON public.tasks;
CREATE POLICY "Room members create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    private.is_room_member(room_code, auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Room members delete tasks" ON public.tasks;
CREATE POLICY "Room members delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (private.is_room_member(room_code, auth.uid()));

DROP POLICY IF EXISTS "Room members update tasks" ON public.tasks;
CREATE POLICY "Room members update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (private.is_room_member(room_code, auth.uid()))
  WITH CHECK (private.is_room_member(room_code, auth.uid()));

DROP POLICY IF EXISTS "Room members view tasks" ON public.tasks;
CREATE POLICY "Room members view tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (private.is_room_member(room_code, auth.uid()));

-- =========================
-- REALTIME
-- =========================
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
