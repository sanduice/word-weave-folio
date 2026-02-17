
-- Spaces table
CREATE TABLE public.spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📄',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- Single-user app: allow all access
CREATE POLICY "Allow all access to spaces" ON public.spaces FOR ALL USING (true) WITH CHECK (true);

-- Pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pages" ON public.pages FOR ALL USING (true) WITH CHECK (true);

-- Page links table (for backlinks)
CREATE TABLE public.page_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  to_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_page_id, to_page_id)
);

ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to page_links" ON public.page_links FOR ALL USING (true) WITH CHECK (true);

-- Recent pages tracking
CREATE TABLE public.recent_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recent_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to recent_pages" ON public.recent_pages FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger for pages
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_pages_space_id ON public.pages(space_id);
CREATE INDEX idx_pages_parent_id ON public.pages(parent_id);
CREATE INDEX idx_pages_is_favorite ON public.pages(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_page_links_from ON public.page_links(from_page_id);
CREATE INDEX idx_page_links_to ON public.page_links(to_page_id);
CREATE INDEX idx_recent_pages_opened ON public.recent_pages(opened_at DESC);
