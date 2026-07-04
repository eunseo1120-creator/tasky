CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  room_code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view comments"
  ON public.task_comments FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));

CREATE POLICY "Room members create comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_room_member(room_code, auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users delete own comments"
  ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS task_comments_room_idx ON public.task_comments(room_code);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON public.task_comments(task_id);
