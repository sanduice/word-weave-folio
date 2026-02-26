import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodoList {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useTodoLists(spaceId?: string) {
  return useQuery({
    queryKey: ["todo_lists", spaceId],
    enabled: !!spaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_lists")
        .select("*")
        .eq("space_id", spaceId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TodoList[];
    },
  });
}

export function useCreateTodoList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { space_id: string; name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("todo_lists")
        .insert({ space_id: input.space_id, name: input.name ?? "Untitled List", user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as TodoList;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo_lists"] }),
  });
}

export function useUpdateTodoList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TodoList> & { id: string }) => {
      const { data, error } = await supabase
        .from("todo_lists")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TodoList;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo_lists"] }),
  });
}

export function useDeleteTodoList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todo_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todo_lists"] });
      qc.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
