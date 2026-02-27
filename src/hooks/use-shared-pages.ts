import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SharedPage {
  id: string;
  page_id: string;
  permission: string;
  created_at: string;
  invited_by: string;
  page: {
    id: string;
    title: string;
    icon_type: string | null;
    icon_value: string | null;
    space_id: string;
  } | null;
  inviter_profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export function useSharedPages() {
  return useQuery({
    queryKey: ["shared-pages"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("page_shares" as any)
        .select("id, page_id, permission, created_at, invited_by")
        .eq("shared_with_id", user.id);
      if (error) throw error;

      const shares = data as any[];
      if (!shares.length) return [];

      // Fetch page data for all shared pages
      const pageIds = [...new Set(shares.map((s) => s.page_id))];
      const { data: pages } = await supabase
        .from("pages")
        .select("id, title, icon_type, icon_value, space_id")
        .in("id", pageIds);

      // Fetch inviter profiles
      const inviterIds = [...new Set(shares.map((s) => s.invited_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", inviterIds);

      const pageMap = new Map((pages ?? []).map((p) => [p.id, p]));
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return shares
        .map((s) => ({
          ...s,
          page: pageMap.get(s.page_id) ?? null,
          inviter_profile: profileMap.get(s.invited_by) ?? null,
        }))
        .filter((s) => s.page !== null) as SharedPage[];
    },
  });
}
