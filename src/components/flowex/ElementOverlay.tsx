import { useCallback, useMemo, useRef, useState } from "react";
import type { Project, SceneElement } from "@/lib/flowex/types";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/flowex/idb";

type Draft = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function ElementOverlay({
  project,
  assetUrls,
  interactive,
  onSelect,
  onUpdate,
  onRemove,
  selectedId,
}: {
  project: Project;
  assetUrls: Record<string, string>;
  interactive: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<SceneElement>) => void;
  onRemove: (id: string) => void;
}) {
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize";
    start: Draft;
    origin: { x: number; y: number };
  } | null>(null);
  const dragState = useRef(drag);
  dragState.current = drag;

  const styleFor = useCallback((el: SceneElement) => {
    const base: React.CSSProperties = {
      left: `${el.x * 100}%`,
      top: `${el.y * 100}%`,
      width: `${el.w * 100}%`,
      height: `${el.h * 100}%`,
      transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
      zIndex: el.z ?? 1,
      opacity: el.visible === false ? 0 : (el.opacity ?? 1),
    };
    return base;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, el: SceneElement) => {
      if (!interactive || el.lock) return;
      e.preventDefault();
      e.stopPropagation();
      const bounds = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
      const start: Draft = { x: el.x, y: el.y, w: el.w, h: el.h };
      const origin = {
        x: (e.clientX - bounds.left) / bounds.width,
        y: (e.clientY - bounds.top) / bounds.height,
      };
      onSelect(el.id);
      setDrag({ id: el.id, mode: "move", start, origin });
    },
    [interactive, onSelect],
  );

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent, el: SceneElement) => {
      if (!interactive || el.lock) return;
      e.preventDefault();
      e.stopPropagation();
      const start: Draft = { x: el.x, y: el.y, w: el.w, h: el.h };
      const origin = { x: e.clientX, y: e.clientY };
      onSelect(el.id);
      setDrag({ id: el.id, mode: "resize", start, origin });
    },
    [interactive, onSelect],
  );

  const eventOverlayRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragState.current;
      if (!d) return;
      const overlay = eventOverlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const dx = (e.clientX - d.origin.x) / rect.width;
      const dy = (e.clientY - d.origin.y) / rect.height;
      if (d.mode === "move") {
        onUpdate(d.id, { x: d.start.x + dx, y: d.start.y + dy });
      } else {
        onUpdate(d.id, { w: d.start.w + dx, h: d.start.h + dy });
      }
    },
    [onUpdate],
  );

  const handlePointerUp = useCallback(() => setDrag(null), []);

  // Attach global move/up listeners while dragging
  useMemo(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      if (dragState.current?.mode === "move") handlePointerMove(e);
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, handlePointerMove]);

  const sorted = useMemo(
    () => [...project.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [project.elements],
  );

  return (
    <div ref={eventOverlayRef} className="pointer-events-none absolute inset-0">
      {sorted.map((el) => {
        const selected = selectedId === el.id;
        return (
          <div
            key={el.id}
            style={styleFor(el)}
            className={cn(
              "absolute",
              interactive && "cursor-move pointer-events-auto",
              selected && "ring-2 ring-[var(--accent)]",
              interactive && !el.lock && "hover:ring-1 hover:ring-[var(--accent)]/50",
            )}
            onPointerDown={(e) => onPointerDown(e, el)}
          >
            <ElementContent el={el} assetUrl={assetUrls[el.assetId ?? ""]} />
            {selected && interactive ? (
              <>
                <div
                  onPointerDown={(e) => onResizePointerDown(e, el)}
                  className="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-full bg-[var(--accent)] ring-2 ring-white/40"
                />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(el.id);
                  }}
                  className="absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs ring-2 ring-white/30"
                  title="Удалить"
                >
                  ×
                </button>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ElementContent({ el, assetUrl: url }: { el: SceneElement; assetUrl: string | undefined }) {
  if (el.kind === "image") {
    return url ? (
      <img
        src={url}
        alt=""
        style={{ objectFit: el.objectFit ?? "cover", width: "100%", height: "100%" }}
        draggable={false}
        className="pointer-events-none"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 text-xs text-muted-foreground">
        🖼
      </div>
    );
  }
  if (el.kind === "shape") {
    const shapeStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      background: el.fill ?? "#22d3ee",
      opacity: el.opacity ?? 1,
    };
    if (el.shape === "circle") shapeStyle.borderRadius = "50%";
    else if (el.radius !== undefined && el.radius > 0)
      shapeStyle.borderRadius = `${el.radius * 100}%`;
    else if (el.shape === "triangle") {
      // triangle via clip-path
      shapeStyle.background = "none";
      shapeStyle.clipPath = "polygon(50% 0, 100% 100%, 0 100%)";
      // need background on a wrapper, so render differently
    }
    if (el.shape === "triangle") {
      return (
        <div
          className="pointer-events-none h-full w-full"
          style={{
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            background: el.fill ?? "#f59e0b",
          }}
        />
      );
    }
    return <div className="pointer-events-none h-full w-full" style={shapeStyle} />;
  }
  // text
  return (
    <div
      className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        fontSize: `${el.fontSize ?? 24}px`,
        color: el.color ?? "#fff",
        fontFamily: el.fontFamily,
        fontWeight: el.bold ? 700 : 400,
        textAlign: el.align ?? "center",
      }}
    >
      <span className="whitespace-pre-wrap break-words">{el.text}</span>
    </div>
  );
}
