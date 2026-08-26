import { useCallback, useMemo, useRef, useState } from "react";
import { FileImage, FileVideo, Music, Box, Layers, Film, X, Plus, Upload } from "lucide-react";
import { assetUrl } from "@/lib/flowex/idb";
import type { Asset, AssetKind } from "@/lib/flowex/types";

const kindConfig: Record<
  AssetKind,
  { icon: typeof FileImage; label: string; color: string; accent: string }
> = {
  image: {
    icon: FileImage,
    label: "Изображение",
    color: "text-emerald-400",
    accent: "border-emerald-500/30",
  },
  video: {
    icon: FileVideo,
    label: "Видео",
    color: "text-blue-400",
    accent: "border-blue-500/30",
  },
  audio: {
    icon: Music,
    label: "Аудио",
    color: "text-amber-400",
    accent: "border-amber-500/30",
  },
  model: {
    icon: Box,
    label: "3D модель",
    color: "text-purple-400",
    accent: "border-purple-500/30",
  },
  texture: {
    icon: Layers,
    label: "Текстура",
    color: "text-pink-400",
    accent: "border-pink-500/30",
  },
  animation: {
    icon: Film,
    label: "Анимация",
    color: "text-cyan-400",
    accent: "border-cyan-500/30",
  },
};

function AssetThumb({ asset, url }: { asset: Asset; url: string | undefined }) {
  const cfg = kindConfig[asset.kind];
  const Icon = cfg.icon;

  if (asset.kind === "image" && url) {
    return (
      <img
        src={url}
        alt={asset.name}
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />
    );
  }

  if (asset.kind === "video" && url) {
    return (
      <div className="relative h-full w-full">
        <video
          src={url}
          className="h-full w-full object-cover"
          muted
          loop
          preload="metadata"
          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
          onMouseLeave={(e) => {
            const v = e.currentTarget as HTMLVideoElement;
            v.pause();
            v.currentTime = 0;
          }}
        />
        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] tabular-nums">
          {asset.duration ? `${asset.duration.toFixed(1)}с` : ""}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2/40">
      <Icon className={`h-6 w-6 ${cfg.color}`} />
    </div>
  );
}

function formatSize(asset: Asset): string {
  if (asset.width && asset.height) return `${asset.width}×${asset.height}`;
  if (asset.duration) return `${asset.duration.toFixed(1)}с`;
  const ext = asset.fileName.split(".").pop()?.toUpperCase();
  return ext ?? "";
}

export function Library({
  assets,
  assetUrls,
  onRemove,
  onAttach,
}: {
  assets: Asset[];
  assetUrls: Record<string, string>;
  onRemove: (id: string) => void;
  onAttach: (files: FileList | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<AssetKind, Asset[]>();
    for (const a of assets) {
      const arr = map.get(a.kind) ?? [];
      arr.push(a);
      map.set(a.kind, arr);
    }
    return map;
  }, [assets]);

  const kindOrder: AssetKind[] = ["image", "texture", "model", "animation", "video", "audio"];

  return (
    <div className="flex h-full flex-col">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,audio/*,.glb,.gltf,.dds,.ktx,.ktx2,.hdr,.exr,.anim,.bvh,.fbx,.dae,.tga,.bmp,.tiff"
        multiple
        className="hidden"
        onChange={(e) => {
          onAttach(e.target.files);
          e.target.value = "";
        }}
      />

      {assets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 text-center">
          <div className="rounded-2xl bg-surface-2/40 p-4">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Библиотека пуста</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              Загрузите изображения, 3D модели, текстуры и анимации
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-surface-2/50 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Добавить файлы
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 pb-2 pt-1 scrollbar-thin">
          {kindOrder.map((kind) => {
            const items = groups.get(kind);
            if (!items?.length) return null;
            const cfg = kindConfig[kind];
            return (
              <div key={kind} className="mb-3">
                <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  <cfg.icon className={`h-3 w-3 ${cfg.color}`} />
                  {cfg.label}
                  <span className="text-muted-foreground/40">({items.length})</span>
                </p>
                <div className="space-y-1">
                  {items.map((a) => (
                    <div
                      key={a.id}
                      className={`group relative overflow-hidden rounded-xl border transition-all ${
                        hoveredId === a.id
                          ? `${cfg.accent} bg-surface-2/60 shadow-sm`
                          : "border-transparent bg-surface-2/20 hover:bg-surface-2/40"
                      }`}
                      onMouseEnter={() => setHoveredId(a.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface-2/40">
                          <AssetThumb asset={a} url={assetUrls[a.id]} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {formatSize(a) || a.fileName.split(".").pop()?.toUpperCase()}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemove(a.id)}
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                          title="Удалить"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assets.length > 0 ? (
        <div className="border-t border-border/20 p-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 bg-surface-2/20 py-2 text-[11px] text-muted-foreground transition-colors hover:border-border/60 hover:bg-surface-2/40 hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Добавить файлы
          </button>
        </div>
      ) : null}
    </div>
  );
}
