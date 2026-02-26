import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PageShare {
  id: string;
  page_id: string;
  shared_with_id: string | null;
  shared_email: string | null;
  permission: "view" | "edit" | "full_access";
  share_token: string;
  link_access: "none" | "view" | "edit";
  invited_by: string;
  created_at: string;
  updated_at: string;
  // joined profile data
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function usePageShares(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-shares", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_shares" as any)
        .select("*")
        .eq("page_id", pageId!);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        profile: null,
      })) as PageShare[];
    },
  });
}

export function useCreatePageShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pageId,
      email,
      permission = "view",
    }: {
      pageId: string;
      email: string;
      permission?: "view" | "edit" | "full_access";
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user exists in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      const insertData: any = {
        page_id: pageId,
        permission,
        invited_by: user.id,
        shared_email: email.toLowerCase().trim(),
      };

      if (profile) {
        insertData.shared_with_id = profile.id;
      }

      const { data, error } = await supabase
        .from("page_shares" as any)
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["page-shares", data.page_id] });
    },
  });
}

export function useUpdatePageShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      permission,
    }: {
      id: string;
      permission: "view" | "edit" | "full_access";
    }) => {
      const { data, error } = await supabase
        .from("page_shares" as any)
        .update({ permission })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["page-shares", data.page_id] });
    },
  });
}

export function useDeletePageShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
      const { error } = await supabase.from("page_shares" as any).delete().eq("id", id);
      if (error) throw error;
      return { pageId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["page-shares", data.pageId] });
    },
  });
}

export function useUpdateLinkAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pageId,
      linkAccess,
    }: {
      pageId: string;
      linkAccess: "none" | "view" | "edit";
    }) => {
      // Update link_access on all share records for this page, or create one
      const { data: existing } = await supabase
        .from("page_shares" as any)
        .select("id")
        .eq("page_id", pageId)
        .is("shared_with_id", null)
        .is("shared_email", null)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("page_shares" as any)
          .update({ link_access: linkAccess })
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { error } = await supabase.from("page_shares" as any).insert({
          page_id: pageId,
          link_access: linkAccess,
          invited_by: user.id,
          permission: "view",
        });
        if (error) throw error;
      }
      return { pageId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["page-shares", data.pageId] });
    },
  });
}
