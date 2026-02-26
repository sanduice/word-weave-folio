import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Link2, UserPlus, X, Check, Copy } from "lucide-react";
import { usePageShares, useCreatePageShare, useUpdatePageShare, useDeletePageShare } from "@/hooks/use-page-shares";
import { usePage } from "@/hooks/use-pages";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-auth";

interface ShareDialogProps {
  pageId: string;
  children: React.ReactNode;
}

export function ShareDialog({ pageId, children }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [invitePermission, setInvitePermission] = useState<"view" | "edit" | "full_access">("view");
  const [copied, setCopied] = useState(false);

  const { data: page } = usePage(pageId);
  const { data: shares = [], isLoading } = usePageShares(pageId);
  const createShare = useCreatePageShare();
  const updateShare = useUpdatePageShare();
  const deleteShare = useDeletePageShare();
  const { user } = useSession();
  const { toast } = useToast();

  const isOwner = page?.user_id === user?.id;

  const handleInvite = async () => {
    if (!emailInput.trim()) return;
    const emails = emailInput.split(",").map((e) => e.trim()).filter(Boolean);
    for (const email of emails) {
      try {
        await createShare.mutateAsync({ pageId, email, permission: invitePermission });
      } catch (err: any) {
        toast({
          title: "Failed to invite",
          description: err?.message?.includes("duplicate")
            ? `${email} already has access`
            : err?.message || "Something went wrong",
          variant: "destructive",
        });
      }
    }
    setEmailInput("");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?page=${pageId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied", description: "Share link copied to clipboard" });
  };

  const userShares = shares.filter((s) => s.shared_with_id || s.shared_email);

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "?";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <h3 className="text-sm font-medium">Share</h3>

          {/* Invite section */}
          {isOwner && (
            <div className="flex gap-2">
              <Input
                placeholder="Email, separated by commas"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="h-8 text-sm flex-1"
              />
              <Select
                value={invitePermission}
                onValueChange={(v) => setInvitePermission(v as any)}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                  <SelectItem value="full_access">Full access</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8"
                onClick={handleInvite}
                disabled={!emailInput.trim() || createShare.isPending}
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Separator />

          {/* People with access */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mb-2">People with access</p>

            {/* Owner */}
            {user && (
              <div className="flex items-center gap-2 py-1.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user.user_metadata?.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">Owner</span>
              </div>
            )}

            {/* Shared users */}
            {userShares.map((share) => (
              <div key={share.id} className="flex items-center gap-2 py-1.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={share.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(share.profile?.full_name, share.shared_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {share.profile?.full_name || share.shared_email || "Pending"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {share.profile?.email || share.shared_email}
                  </p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-1">
                    <Select
                      value={share.permission}
                      onValueChange={(v) =>
                        updateShare.mutate({
                          id: share.id,
                          permission: v as any,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-[90px] text-xs border-0 bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">Can view</SelectItem>
                        <SelectItem value="edit">Can edit</SelectItem>
                        <SelectItem value="full_access">Full access</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteShare.mutate({ id: share.id, pageId })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground capitalize">
                    {share.permission.replace("_", " ")}
                  </span>
                )}
              </div>
            ))}

            {userShares.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Only you have access</p>
            )}
          </div>

          <Separator />

          {/* Copy link */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-2"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Link copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
