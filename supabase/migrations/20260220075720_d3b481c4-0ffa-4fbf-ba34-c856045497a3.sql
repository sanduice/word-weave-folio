
-- Create folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'New Folder',
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY folders_select ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY folders_insert ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY folders_update ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY folders_delete ON public.folders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to pages (nullable, ON DELETE SET NULL keeps pages at root)
ALTER TABLE public.pages ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;
