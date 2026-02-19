
-- Fix permissive INSERT/UPDATE/DELETE on page_links and recent_pages
-- page_links: scope writes via pages ownership (user must own the from_page)
DROP POLICY IF EXISTS "Allow all access to page_links" ON public.page_links;

ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_links_select" ON public.page_links
  FOR SELECT USING (true);

CREATE POLICY "page_links_insert" ON public.page_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pages WHERE id = from_page_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "page_links_delete" ON public.page_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pages WHERE id = from_page_id AND user_id = auth.uid()
    )
  );

-- recent_pages: scope to authenticated user's pages only
DROP POLICY IF EXISTS "Allow all access to recent_pages" ON public.recent_pages;

ALTER TABLE public.recent_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recent_pages_select" ON public.recent_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pages WHERE id = page_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "recent_pages_insert" ON public.recent_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pages WHERE id = page_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "recent_pages_delete" ON public.recent_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pages WHERE id = page_id AND user_id = auth.uid()
    )
  );
