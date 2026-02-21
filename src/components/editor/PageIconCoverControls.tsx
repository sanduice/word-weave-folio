import { useState } from "react";
import { Smile, Image as ImageIcon, Pencil, Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "./EmojiPicker";
import { CoverPicker } from "./CoverPicker";
import { CoverReposition } from "./CoverReposition";

interface PageIconCoverControlsProps {
  pageId: string;
  iconType: string | null;
  iconValue: string | null;
  coverType: string | null;
  coverUrl: string | null;
  coverPositionY: number;
  onUpdateIcon: (iconType: string | null, iconValue: string | null) => void;
  onUpdateCover: (coverType: string | null, coverUrl: string | null, coverPositionY?: number) => void;
}

export function PageIconCoverControls({
  pageId,
  iconType,
  iconValue,
  coverType,
  coverUrl,
  coverPositionY,
  onUpdateIcon,
  onUpdateCover,
}: PageIconCoverControlsProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [hoveringCover, setHoveringCover] = useState(false);

  const hasIcon = !!iconValue;
  const hasCover = !!coverUrl;
  const isGradient = coverType === "gallery";

  return (
    <>
      {/* Cover image */}
      {hasCover && !repositioning && (
        <div
          className="relative w-full h-[240px] sm:h-[160px] md:h-[240px] overflow-hidden group/cover"
          onMouseEnter={() => setHoveringCover(true)}
          onMouseLeave={() => setHoveringCover(false)}
        >
          {isGradient ? (
            <div className="w-full h-full" style={{ background: coverUrl! }} />
          ) : (
            <img
              src={coverUrl!}
              alt="Page cover"
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${coverPositionY * 100}%` }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {/* Cover controls on hover */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover/cover:opacity-100 transition-opacity">
            <CoverPicker
              pageId={pageId}
              hasCover
              onSelectGallery={(css) => onUpdateCover("gallery", css)}
              onSelectUpload={(url) => onUpdateCover("upload", url)}
              onSelectLink={(url) => onUpdateCover("link", url)}
              onRemove={() => onUpdateCover(null, null)}
              open={coverPickerOpen}
              onOpenChange={setCoverPickerOpen}
            >
              <Button size="sm" variant="secondary" className="h-7 text-xs bg-background/80 backdrop-blur-sm">
                <Pencil className="h-3 w-3 mr-1" /> Change
              </Button>
            </CoverPicker>
            {!isGradient && (
              <Button size="sm" variant="secondary" className="h-7 text-xs bg-background/80 backdrop-blur-sm" onClick={() => setRepositioning(true)}>
                <Move className="h-3 w-3 mr-1" /> Reposition
              </Button>
            )}
            <Button size="sm" variant="secondary" className="h-7 text-xs bg-background/80 backdrop-blur-sm" onClick={() => onUpdateCover(null, null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Cover repositioning mode */}
      {hasCover && repositioning && (
        <CoverReposition
          coverUrl={coverUrl!}
          coverType={coverType!}
          positionY={coverPositionY}
          onSave={(y) => {
            onUpdateCover(coverType, coverUrl, y);
            setRepositioning(false);
          }}
          onCancel={() => setRepositioning(false)}
        />
      )}

      {/* Icon + hover controls container */}
      <div className="max-w-3xl mx-auto w-full px-6">
        {/* Icon display */}
        {hasIcon && (
          <div className={`${hasCover ? "-mt-8" : "mt-8"}`}>
            <EmojiPicker
              onSelect={(emoji) => onUpdateIcon("emoji", emoji)}
              onRemove={() => onUpdateIcon(null, null)}
              hasIcon
              open={emojiOpen}
              onOpenChange={setEmojiOpen}
            >
              <button className="text-6xl sm:text-5xl leading-none hover:scale-110 transition-transform cursor-pointer">
                {iconValue}
              </button>
            </EmojiPicker>
          </div>
        )}

        {/* Add icon / Add cover buttons — shown on hover when missing */}
        {(!hasIcon || !hasCover) && (
          <div className={`flex gap-2 ${hasIcon ? "mt-2" : hasCover ? "mt-4" : "mt-8"} opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity`}>
            {!hasIcon && (
              <EmojiPicker
                onSelect={(emoji) => onUpdateIcon("emoji", emoji)}
                hasIcon={false}
                open={emojiOpen}
                onOpenChange={setEmojiOpen}
              >
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">
                  <Smile className="h-3.5 w-3.5 mr-1" /> Add icon
                </Button>
              </EmojiPicker>
            )}
            {!hasCover && (
              <CoverPicker
                pageId={pageId}
                hasCover={false}
                onSelectGallery={(css) => onUpdateCover("gallery", css)}
                onSelectUpload={(url) => onUpdateCover("upload", url)}
                onSelectLink={(url) => onUpdateCover("link", url)}
                onRemove={() => {}}
                open={coverPickerOpen}
                onOpenChange={setCoverPickerOpen}
              >
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">
                  <ImageIcon className="h-3.5 w-3.5 mr-1" /> Add cover
                </Button>
              </CoverPicker>
            )}
          </div>
        )}
      </div>
    </>
  );
}
