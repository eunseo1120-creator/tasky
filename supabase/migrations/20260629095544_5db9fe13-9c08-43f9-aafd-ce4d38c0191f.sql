
-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT 'Anonymous',
  avatar_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================
-- ROOM MEMBERS
-- =========================
CREATE TABLE public.room_members (
  room_code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view room members"
  ON public.room_members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users join rooms as themselves"
  ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users leave their own membership"
  ON public.room_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX room_members_room_idx ON public.room_members(room_code);
CREATE INDEX room_members_user_idx ON public.room_members(user_id);

-- =========================
-- Helper: is_room_member (SECURITY DEFINER, avoids RLS recursion on tasks)
-- =========================
CREATE OR REPLACE FUNCTION public.is_room_member(_room text, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_code = _room AND user_id = _user
  );
$$;

-- =========================
-- TASKS
-- =========================
CREATE TABLE public.tasks (
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));

CREATE POLICY "Room members create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_room_member(room_code, auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Room members update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_room_member(room_code, auth.uid()))
  WITH CHECK (public.is_room_member(room_code, auth.uid()));

CREATE POLICY "Room members delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));

CREATE INDEX tasks_room_idx ON public.tasks(room_code);
CREATE INDEX tasks_deadline_idx ON public.tasks(deadline) WHERE deadline IS NOT NULL;

-- =========================
-- updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_touch_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- Auto-create profile on signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'Anonymous'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- Realtime
-- =========================
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
