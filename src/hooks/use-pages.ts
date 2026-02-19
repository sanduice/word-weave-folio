import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Page = Tables<"pages"> & { sort_order?: number | null };

export function usePages(spaceId: string | undefined) {
  return useQuery({
    queryKey: ["pages", spaceId],
    enabled: !!spaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("space_id", spaceId!)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Page[];
    },
  });
}

export function usePage(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pages").select("*").eq("id", pageId!).single();
      if (error) throw error;
      return data as Page;
    },
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: Omit<TablesInsert<"pages">, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("pages")
        .insert({ ...page, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Page;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pages", data.space_id] });
    },
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; content?: string; is_favorite?: boolean; parent_id?: string | null; sort_order?: number }) => {
      const { data, error } = await supabase.from("pages").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Page;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pages", data.space_id] });
      qc.invalidateQueries({ queryKey: ["page", data.id] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["recent-pages"] });
    },
  });
}

export function useFavoritePages() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*, spaces(name, icon)")
        .eq("is_favorite", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("title");
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentPages() {
  return useQuery({
    queryKey: ["recent-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recent_pages")
        .select("*, pages(id, title, space_id, spaces(name, icon))")
        .order("opened_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useTrackPageOpen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pageId: string) => {
      await supabase.from("recent_pages").delete().eq("page_id", pageId);
      const { error } = await supabase.from("recent_pages").insert({ page_id: pageId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recent-pages"] }),
  });
}

export function useSearchPages() {
  return useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase
        .from("pages")
        .select("id, title, content, space_id, spaces(name, icon)")
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useBacklinks(pageId: string | undefined) {
  return useQuery({
    queryKey: ["backlinks", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_links")
        .select("from_page_id, pages!page_links_from_page_id_fkey(id, title, space_id)")
        .eq("to_page_id", pageId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useReorderPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from("pages").update({ sort_order }).eq("id", id)
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
