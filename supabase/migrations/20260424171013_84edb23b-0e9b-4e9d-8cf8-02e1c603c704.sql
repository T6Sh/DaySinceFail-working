
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Roles (separate table per security policy)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "Roles viewable by self or admin" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Counters
CREATE TABLE public.counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  best_streak_days INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Counters readable if public or owned" ON public.counters FOR SELECT
  USING (is_public = true OR owner_id = auth.uid());
CREATE POLICY "Owners insert counters" ON public.counters FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update counters" ON public.counters FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners delete counters" ON public.counters FOR DELETE USING (owner_id = auth.uid());

-- Resets
CREATE TABLE public.counter_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_id UUID NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  streak_days INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
ALTER TABLE public.counter_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resets readable when counter readable" ON public.counter_resets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.counters c WHERE c.id = counter_id AND (c.is_public OR c.owner_id = auth.uid())));
CREATE POLICY "Owners insert resets" ON public.counter_resets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.counters c WHERE c.id = counter_id AND c.owner_id = auth.uid()));

-- Reactions
CREATE TABLE public.counter_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_id UUID NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('cheer','shame')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(counter_id, user_id, kind)
);
ALTER TABLE public.counter_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions readable if counter public" ON public.counter_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.counters c WHERE c.id = counter_id AND c.is_public));
CREATE POLICY "Auth users react to public counters" ON public.counter_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.counters c WHERE c.id = counter_id AND c.is_public));
CREATE POLICY "Users delete own reactions" ON public.counter_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Trigger: handle new user (create profile + default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF length(base_username) < 3 THEN base_username := 'user' || substr(NEW.id::text, 1, 6); END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'display_name', final_username));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: on counter reset, update best_streak and reset started_at
CREATE OR REPLACE FUNCTION public.handle_counter_reset()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.counters
  SET best_streak_days = GREATEST(best_streak_days, NEW.streak_days),
      started_at = NEW.reset_at
  WHERE id = NEW.counter_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_counter_reset AFTER INSERT ON public.counter_resets
  FOR EACH ROW EXECUTE FUNCTION public.handle_counter_reset();
