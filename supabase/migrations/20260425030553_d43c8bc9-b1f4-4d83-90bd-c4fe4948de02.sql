-- 1. blocks table
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Only the blocker sees their own block rows
CREATE POLICY "Blocker sees own blocks"
  ON public.blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users block as themselves"
  ON public.blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users unblock as themselves"
  ON public.blocks FOR DELETE
  USING (blocker_id = auth.uid());

-- 2. Helper: are two users blocked in either direction?
CREATE OR REPLACE FUNCTION public.is_blocked_pair(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  )
$$;

-- 3. Auto-remove follows in both directions when a block is created
CREATE OR REPLACE FUNCTION public.handle_new_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE (follower_id = NEW.blocker_id AND followee_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND followee_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_block_created
  AFTER INSERT ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_block();

-- 4. Update RLS on existing tables to hide blocked users in both directions

-- profiles: hide blocked profile rows
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable unless blocked"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NULL
    OR id = auth.uid()
    OR NOT public.is_blocked_pair(auth.uid(), id)
  );

-- counters: hide counters of blocked users
DROP POLICY IF EXISTS "Counters readable if public or owned" ON public.counters;
CREATE POLICY "Counters readable if public or owned, unless blocked"
  ON public.counters FOR SELECT
  USING (
    (owner_id = auth.uid())
    OR (
      is_public = true
      AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), owner_id))
    )
  );

-- follows: hide follow rows involving blocked users
DROP POLICY IF EXISTS "Follows are publicly readable" ON public.follows;
CREATE POLICY "Follows readable unless involving block"
  ON public.follows FOR SELECT
  USING (
    auth.uid() IS NULL
    OR (
      NOT public.is_blocked_pair(auth.uid(), follower_id)
      AND NOT public.is_blocked_pair(auth.uid(), followee_id)
    )
  );

-- Prevent following blocked / blocker users
DROP POLICY IF EXISTS "Users follow as themselves" ON public.follows;
CREATE POLICY "Users follow as themselves, unless blocked"
  ON public.follows FOR INSERT
  WITH CHECK (
    follower_id = auth.uid()
    AND NOT public.is_blocked_pair(auth.uid(), followee_id)
  );

-- counter_reactions: hide reactions on/by blocked users (parent counter visibility already filtered, but also hide reactions authored by blocked users)
DROP POLICY IF EXISTS "Reactions readable if counter public" ON public.counter_reactions;
CREATE POLICY "Reactions readable if counter visible and not from blocked user"
  ON public.counter_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.counters c
      WHERE c.id = counter_reactions.counter_id
        AND c.is_public
        AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), c.owner_id))
    )
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), user_id))
  );