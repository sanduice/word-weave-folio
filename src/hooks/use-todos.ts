import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Todo {
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "none" | "low" | "medium" | "high";
  due_date: string | null;
  sort_order: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTodos(spaceId?: string, filter?: "todo" | "done") {
  return useQuery({
    queryKey: ["todos", spaceId, filter],
    enabled: !!spaceId,
    queryFn: async () => {
      let query = supabase
        .from("todos")
        .select("*")
        .eq("space_id", spaceId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (filter === "done") {
        query = query.eq("status", "done");
      } else if (filter === "todo") {
        query = query.neq("status", "done");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Todo[];
    },
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { space_id: string; title?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("todos")
        .insert({ space_id: input.space_id, title: input.title ?? "", user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Todo> & { id: string }) => {
      const { data, error } = await supabase
        .from("todos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}
