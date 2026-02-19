
-- 1. Add user_id to spaces
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE public.spaces SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
ALTER TABLE public.spaces ALTER COLUMN user_id SET NOT NULL;

-- 2. Add user_id to pages
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE public.pages SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
ALTER TABLE public.pages ALTER COLUMN user_id SET NOT NULL;

-- 3. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Profiles RLS policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Auto-create profile trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

-- 7. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Enable RLS on spaces and pages
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- 9. Drop old permissive policies for spaces
DROP POLICY IF EXISTS "Allow all access to spaces" ON public.spaces;

-- 10. New scoped RLS for spaces
CREATE POLICY "spaces_select_own" ON public.spaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "spaces_insert_own" ON public.spaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spaces_update_own" ON public.spaces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "spaces_delete_own" ON public.spaces
  FOR DELETE USING (auth.uid() = user_id);

-- 11. Drop old permissive policies for pages
DROP POLICY IF EXISTS "Allow all access to pages" ON public.pages;

-- 12. New scoped RLS for pages
CREATE POLICY "pages_select_own" ON public.pages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pages_insert_own" ON public.pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pages_update_own" ON public.pages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "pages_delete_own" ON public.pages
  FOR DELETE USING (auth.uid() = user_id);

-- 13. Updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
