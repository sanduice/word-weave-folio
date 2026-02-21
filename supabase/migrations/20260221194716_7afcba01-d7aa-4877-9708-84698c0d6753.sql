
-- Add icon and cover columns to pages table
ALTER TABLE public.pages ADD COLUMN icon_type text;
ALTER TABLE public.pages ADD COLUMN icon_value text;
ALTER TABLE public.pages ADD COLUMN cover_type text;
ALTER TABLE public.pages ADD COLUMN cover_url text;
ALTER TABLE public.pages ADD COLUMN cover_position_y real DEFAULT 0.5;

-- Create page-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('page-assets', 'page-assets', true);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload page assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'page-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone authenticated can view page assets
CREATE POLICY "Anyone can view page assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'page-assets');

-- RLS: users can delete their own page assets
CREATE POLICY "Users can delete own page assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'page-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
