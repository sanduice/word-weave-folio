import { useState } from "react";
import { GALLERY_COVERS } from "./emoji-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link2, X, Loader2 } from "lucide-react";

interface CoverPickerProps {
  pageId: string;
  hasCover: boolean;
  onSelectGallery: (css: string) => void;
  onSelectUpload: (url: string) => void;
  onSelectLink: (url: string) => void;
  onRemove: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CoverPicker({ pageId, hasCover, onSelectGallery, onSelectUpload, onSelectLink, onRemove, children, open, onOpenChange }: CoverPickerProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/covers/${pageId}.${ext}`;
      const { error } = await supabase.storage.from("page-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("page-assets").getPublicUrl(path);
      onSelectUpload(publicUrl);
      onOpenChange?.(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      onSelectLink(linkUrl.trim());
      onOpenChange?.(false);
      setLinkUrl("");
      setLinkPreview(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { onOpenChange?.(v); if (!v) { setLinkUrl(""); setLinkPreview(false); } }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start" sideOffset={8}>
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9">
            <TabsTrigger value="gallery" className="text-xs">Gallery</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
            <TabsTrigger value="link" className="text-xs">Link</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="p-3 mt-0">
            <div className="grid grid-cols-3 gap-2">
              {GALLERY_COVERS.map((g) => (
                <button
                  key={g.id}
                  className="h-14 rounded-md border border-border hover:ring-2 hover:ring-primary transition-all"
                  style={{ background: g.css }}
                  title={g.label}
                  onClick={() => { onSelectGallery(g.css); onOpenChange?.(false); }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="p-3 mt-0">
            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary transition-colors">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">JPG, PNG, WebP · Max 5MB</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </TabsContent>

          <TabsContent value="link" className="p-3 mt-0 space-y-2">
            <Input
              placeholder="Paste image URL..."
              value={linkUrl}
              onChange={(e) => { setLinkUrl(e.target.value); setLinkPreview(false); }}
              className="h-8 text-sm"
            />
            {linkUrl.trim() && (
              <button className="text-xs text-primary hover:underline" onClick={() => setLinkPreview(true)}>
                Preview
              </button>
            )}
            {linkPreview && linkUrl.trim() && (
              <div className="h-20 rounded-md overflow-hidden border border-border">
                <img src={linkUrl} alt="Preview" className="w-full h-full object-cover" onError={() => setLinkPreview(false)} />
              </div>
            )}
            <Button size="sm" className="w-full" onClick={applyLink} disabled={!linkUrl.trim()}>
              <Link2 className="h-3.5 w-3.5 mr-1" /> Apply
            </Button>
          </TabsContent>
        </Tabs>

        {hasCover && (
          <div className="border-t border-border p-2">
            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => { onRemove(); onOpenChange?.(false); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Remove cover
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
