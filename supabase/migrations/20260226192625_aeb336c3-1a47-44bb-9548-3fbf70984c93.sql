
-- Create todo_lists table
CREATE TABLE public.todo_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled List',
  icon text NOT NULL DEFAULT '📋',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todo_lists_select_own" ON public.todo_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todo_lists_insert_own" ON public.todo_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todo_lists_update_own" ON public.todo_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todo_lists_delete_own" ON public.todo_lists FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_todo_lists_updated_at
  BEFORE UPDATE ON public.todo_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add todo_list_id to todos (nullable for now)
ALTER TABLE public.todos ADD COLUMN todo_list_id uuid REFERENCES public.todo_lists(id) ON DELETE CASCADE;

-- Migrate existing todos: create a default list per space that has todos, then assign
DO $$
DECLARE
  rec RECORD;
  new_list_id uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT space_id, user_id FROM public.todos
  LOOP
    INSERT INTO public.todo_lists (space_id, user_id, name, icon)
    VALUES (rec.space_id, rec.user_id, 'Todo List', '📋')
    RETURNING id INTO new_list_id;

    UPDATE public.todos
    SET todo_list_id = new_list_id
    WHERE space_id = rec.space_id AND user_id = rec.user_id AND todo_list_id IS NULL;
  END LOOP;
END;
$$;
