import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  page_id: string;
  user_id: string;
  content: string;
  selected_text: string | null;
  block_id: string | null;
  start_offset: number | null;
  end_offset: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string | null; avatar_url: string | null; email: string | null };
  replies?: CommentReply[];
  isOrphaned?: boolean;
}

export interface CommentReply {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null; email: string | null };
}

export function useComments(pageId: string | undefined) {
  return useQuery({
    queryKey: ["comments", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("comments" as any)
        .select("*")
        .eq("page_id", pageId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: replies, error: repliesError } = await supabase
        .from("comment_replies" as any)
        .select("*")
        .in("comment_id", (comments as any[]).map((c: any) => c.id))
        .order("created_at", { ascending: true });
      if (repliesError) throw repliesError;

      // Fetch profiles for all user_ids
      const userIds = [
        ...new Set([
          ...(comments as any[]).map((c: any) => c.user_id),
          ...(replies as any[] || []).map((r: any) => r.user_id),
        ]),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url, email: p.email }])
      );

      return (comments as any[]).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id),
        replies: ((replies as any[]) || [])
          .filter((r: any) => r.comment_id === c.id)
          .map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) })),
      })) as Comment[];
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      page_id: string;
      content: string;
      selected_text: string | null;
      user_id: string;
    }) => {
      const { data, error } = await supabase
        .from("comments" as any)
        .insert({
          page_id: params.page_id,
          content: params.content,
          selected_text: params.selected_text,
          user_id: params.user_id,
          status: "open",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as any as Comment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["comments", data.page_id] });
    },
  });
}

export function useReplyToComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { comment_id: string; content: string; user_id: string; page_id: string }) => {
      const { data, error } = await supabase
        .from("comment_replies" as any)
        .insert({
          comment_id: params.comment_id,
          content: params.content,
          user_id: params.user_id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as any), page_id: params.page_id };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["comments", data.page_id] });
    },
  });
}

export function useUpdateCommentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: string; page_id: string }) => {
      const { error } = await supabase
        .from("comments" as any)
        .update({ status: params.status } as any)
        .eq("id", params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["comments", data.page_id] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; page_id: string }) => {
      const { error } = await supabase.from("comments" as any).delete().eq("id", params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["comments", data.page_id] });
    },
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; page_id: string }) => {
      const { error } = await supabase.from("comment_replies" as any).delete().eq("id", params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["comments", data.page_id] });
    },
  });
}
