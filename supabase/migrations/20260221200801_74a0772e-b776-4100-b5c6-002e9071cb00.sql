
-- Create comments table
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  selected_text text,
  block_id text,
  start_offset integer,
  end_offset integer,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create comment_replies table
CREATE TABLE public.comment_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- Comments RLS: SELECT - user can see comments on pages they own
CREATE POLICY "comments_select" ON public.comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pages WHERE pages.id = comments.page_id AND pages.user_id = auth.uid()
));

-- Comments RLS: INSERT - user can comment on pages they own
CREATE POLICY "comments_insert" ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = comments.page_id AND pages.user_id = auth.uid())
);

-- Comments RLS: UPDATE - comment author can update their own
CREATE POLICY "comments_update" ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

-- Comments RLS: DELETE - comment author or page owner
CREATE POLICY "comments_delete" ON public.comments FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = comments.page_id AND pages.user_id = auth.uid())
);

-- Comment replies RLS: SELECT
CREATE POLICY "comment_replies_select" ON public.comment_replies FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.comments
  JOIN public.pages ON pages.id = comments.page_id
  WHERE comments.id = comment_replies.comment_id AND pages.user_id = auth.uid()
));

-- Comment replies RLS: INSERT
CREATE POLICY "comment_replies_insert" ON public.comment_replies FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.comments
    JOIN public.pages ON pages.id = comments.page_id
    WHERE comments.id = comment_replies.comment_id AND pages.user_id = auth.uid()
  )
);

-- Comment replies RLS: DELETE
CREATE POLICY "comment_replies_delete" ON public.comment_replies FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.comments
    JOIN public.pages ON pages.id = comments.page_id
    WHERE comments.id = comment_replies.comment_id AND pages.user_id = auth.uid()
  )
);

-- Trigger for updated_at on comments
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_comments_page_id ON public.comments(page_id);
CREATE INDEX idx_comment_replies_comment_id ON public.comment_replies(comment_id);
