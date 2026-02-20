import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Folder {
  id: string;
  space_id: string;
  parent_folder_id: string | null;
  user_id: string;
  name: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export function useFolders(spaceId: string | undefined) {
  return useQuery({
    queryKey: ["folders", spaceId],
    enabled: !!spaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("space_id", spaceId!)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Folder[];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folder: { space_id: string; parent_folder_id?: string | null; name?: string; sort_order?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("folders")
        .insert({ ...folder, user_id: user.id, name: folder.name ?? "New Folder" })
        .select()
        .single();
      if (error) throw error;
      return data as Folder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["folders", data.space_id] });
    },
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; parent_folder_id?: string | null; sort_order?: number }) => {
      const { data, error } = await supabase
        .from("folders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Folder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["folders", data.space_id] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

export function useReorderFolders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from("folders").update({ sort_order }).eq("id", id)
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

/** Walk ancestors to detect circular nesting: returns true if ancestorId is an ancestor of folderId */
export function isFolderAncestor(folders: Folder[], folderId: string, ancestorId: string): boolean {
  let current = folders.find((f) => f.id === folderId);
  while (current) {
    if (current.parent_folder_id === ancestorId) return true;
    current = folders.find((f) => f.id === current!.parent_folder_id);
  }
  return false;
}
