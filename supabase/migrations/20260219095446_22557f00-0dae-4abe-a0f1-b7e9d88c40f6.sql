
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS sort_order integer;

UPDATE public.pages p
SET sort_order = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY space_id, parent_id
           ORDER BY created_at ASC
         ) AS rn
  FROM public.pages
) sub
WHERE p.id = sub.id;
