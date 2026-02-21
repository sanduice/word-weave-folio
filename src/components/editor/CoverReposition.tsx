import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface CoverRepositionProps {
  coverUrl: string;
  coverType: string;
  positionY: number;
  onSave: (positionY: number) => void;
  onCancel: () => void;
}

export function CoverReposition({ coverUrl, coverType, positionY, onSave, onCancel }: CoverRepositionProps) {
  const [y, setY] = useState(positionY);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isGradient = coverType === "gallery";

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setY(newY);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-[240px] md:h-[240px] sm:h-[160px] cursor-grab active:cursor-grabbing select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {isGradient ? (
          <div className="w-full h-full" style={{ background: coverUrl }} />
        ) : (
          <img
            src={coverUrl}
            alt="Cover"
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `center ${y * 100}%` }}
            draggable={false}
          />
        )}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(y)}>Save position</Button>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm text-xs px-3 py-1 rounded-full text-muted-foreground">
        Drag to reposition
      </div>
    </div>
  );
}
