
-- Fix infinite recursion: pages policies reference page_shares, which references pages

-- 1. Fix page_shares policies to use security definer function instead of querying pages directly
DROP POLICY IF EXISTS "page_shares_select" ON public.page_shares;
DROP POLICY IF EXISTS "page_shares_insert" ON public.page_shares;
DROP POLICY IF EXISTS "page_shares_update" ON public.page_shares;
DROP POLICY IF EXISTS "page_shares_delete" ON public.page_shares;

-- Helper: check if user owns the page (no recursion risk)
CREATE OR REPLACE FUNCTION public.is_page_owner(_user_id uuid, _page_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM pages WHERE id = _page_id AND user_id = _user_id)
$$;

-- Helper: check if user has a share record for a page
CREATE OR REPLACE FUNCTION public.is_page_shared_with(_user_id uuid, _page_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM page_shares WHERE page_id = _page_id AND shared_with_id = _user_id)
$$;

-- Helper: check if user has edit+ share for a page
CREATE OR REPLACE FUNCTION public.has_page_edit_access(_user_id uuid, _page_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM page_shares 
    WHERE page_id = _page_id 
    AND shared_with_id = _user_id 
    AND permission IN ('edit', 'full_access')
  )
$$;

-- page_shares policies using security definer functions
CREATE POLICY "page_shares_select" ON public.page_shares
FOR SELECT USING (
  public.is_page_owner(auth.uid(), page_id)
  OR shared_with_id = auth.uid()
);

CREATE POLICY "page_shares_insert" ON public.page_shares
FOR INSERT WITH CHECK (
  public.is_page_owner(auth.uid(), page_id)
  AND invited_by = auth.uid()
);

CREATE POLICY "page_shares_update" ON public.page_shares
FOR UPDATE USING (
  public.is_page_owner(auth.uid(), page_id)
);

CREATE POLICY "page_shares_delete" ON public.page_shares
FOR DELETE USING (
  public.is_page_owner(auth.uid(), page_id)
  OR shared_with_id = auth.uid()
);

-- 2. Fix pages policies to use security definer functions
DROP POLICY IF EXISTS "pages_select_own" ON public.pages;
DROP POLICY IF EXISTS "pages_update_own" ON public.pages;

CREATE POLICY "pages_select_own" ON public.pages
FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_page_shared_with(auth.uid(), id)
);

CREATE POLICY "pages_update_own" ON public.pages
FOR UPDATE USING (
  auth.uid() = user_id
  OR public.has_page_edit_access(auth.uid(), id)
);

-- 3. Fix comments policy too
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select" ON public.comments
FOR SELECT USING (
  public.is_page_owner(auth.uid(), page_id)
  OR public.is_page_shared_with(auth.uid(), page_id)
);
