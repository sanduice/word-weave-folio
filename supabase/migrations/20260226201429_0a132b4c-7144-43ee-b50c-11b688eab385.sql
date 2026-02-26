
-- 1. Create page_shares table FIRST
CREATE TABLE public.page_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  shared_with_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_email text,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'full_access')),
  share_token uuid DEFAULT gen_random_uuid(),
  link_access text NOT NULL DEFAULT 'none' CHECK (link_access IN ('none', 'view', 'edit')),
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, shared_with_id),
  UNIQUE (page_id, shared_email)
);

ALTER TABLE public.page_shares ENABLE ROW LEVEL SECURITY;

-- 2. Helper function (now table exists)
CREATE OR REPLACE FUNCTION public.has_page_access(
  _user_id uuid, _page_id uuid, _min_permission text DEFAULT 'view'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pages WHERE id = _page_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM page_shares
    WHERE page_id = _page_id
    AND shared_with_id = _user_id
    AND (
      _min_permission = 'view'
      OR (_min_permission = 'edit' AND permission IN ('edit', 'full_access'))
      OR (_min_permission = 'full_access' AND permission = 'full_access')
    )
  )
$$;

-- 3. RLS policies on page_shares
CREATE POLICY "page_shares_select" ON public.page_shares
FOR SELECT USING (
  EXISTS (SELECT 1 FROM pages WHERE pages.id = page_shares.page_id AND pages.user_id = auth.uid())
  OR shared_with_id = auth.uid()
);

CREATE POLICY "page_shares_insert" ON public.page_shares
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pages WHERE pages.id = page_shares.page_id AND pages.user_id = auth.uid())
  AND invited_by = auth.uid()
);

CREATE POLICY "page_shares_update" ON public.page_shares
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM pages WHERE pages.id = page_shares.page_id AND pages.user_id = auth.uid())
);

CREATE POLICY "page_shares_delete" ON public.page_shares
FOR DELETE USING (
  EXISTS (SELECT 1 FROM pages WHERE pages.id = page_shares.page_id AND pages.user_id = auth.uid())
  OR shared_with_id = auth.uid()
);

-- 4. Update pages RLS to allow shared access
DROP POLICY IF EXISTS "pages_select_own" ON public.pages;
DROP POLICY IF EXISTS "pages_update_own" ON public.pages;

CREATE POLICY "pages_select_own" ON public.pages
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM page_shares
    WHERE page_shares.page_id = pages.id
    AND page_shares.shared_with_id = auth.uid()
  )
);

CREATE POLICY "pages_update_own" ON public.pages
FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM page_shares
    WHERE page_shares.page_id = pages.id
    AND page_shares.shared_with_id = auth.uid()
    AND page_shares.permission IN ('edit', 'full_access')
  )
);

-- 5. Update comments SELECT for shared users
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pages
    WHERE pages.id = comments.page_id
    AND (
      pages.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM page_shares
        WHERE page_shares.page_id = pages.id
        AND page_shares.shared_with_id = auth.uid()
      )
    )
  )
);

-- 6. Profiles readable by all authenticated users (for share UI)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (true);

-- 7. Trigger & indexes
CREATE TRIGGER update_page_shares_updated_at
BEFORE UPDATE ON public.page_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_page_shares_page_id ON public.page_shares(page_id);
CREATE INDEX idx_page_shares_shared_with_id ON public.page_shares(shared_with_id);
CREATE INDEX idx_page_shares_share_token ON public.page_shares(share_token);
