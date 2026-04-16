"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface VideoClip {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
  transitionType: string;
  transitionDuration: number;
  source: string;
  imageId?: number | null;
}

interface CombinedVideo {
  id: number;
  url: string;
  filename: string;
  createdAt: string;
}

interface CombinePanelProps {
  projectId: number;
  transitionType: string;
  transitionDuration: number;
  audioUrl: string | null;
  videos: VideoClip[];
  selectedImageIds?: number[];
  selectedVideoIds?: number[];
  onSettingsChange: (updates: Partial<{
    transitionType: string;
    transitionDuration: number;
  }>) => void;
}

const TRANSITION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "dissolve", label: "Dissolve" },
];

export function CombinePanel({
  projectId,
  transitionType,
  transitionDuration,
  audioUrl,
  videos,
  selectedImageIds,
  selectedVideoIds,
  onSettingsChange,
}: CombinePanelProps) {
  const router = useRouter();
  const [combining, setCombining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedVideos, setCombinedVideos] = useState<CombinedVideo[]>([]);

  const selectedVideos = videos.filter(v => {
    if (selectedVideoIds) return selectedVideoIds.includes(v.id);
    if (selectedImageIds) return v.imageId && selectedImageIds.includes(v.imageId);
    return true;
  });

  useEffect(() => {
    fetch(`/api/projects/${projectId}/combine`)
      .then(res => res.json())
      .then(data => {
        if (data.videos) setCombinedVideos(data.videos);
      })
      .catch(console.error);
  }, [projectId]);

  const handleCombine = async () => {
    setCombining(true);
    setError(null);

    try {
      const sortedVideos = [...selectedVideos].sort((a, b) => a.order - b.order);
      const videoClips = sortedVideos.map(v => ({
        url: v.url,
        duration: v.duration,
        transitionType: v.transitionType === "none" ? "none" : (v.transitionType || transitionType),
        transitionDuration: v.transitionDuration || transitionDuration,
      }));

      if (videoClips.length === 0) {
        setError("Please select at least one frame with a generated video.");
        setCombining(false);
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/combine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videos: videoClips,
          audioUrl 
        }),
      });

      const data = await res.json();

      if (data.success && data.video) {
        setCombinedVideos(prev => [data.video, ...prev]);
      } else {
        setError(data.error || "Combine failed");
      }
    } catch {
      setError("Failed to combine videos");
    } finally {
      setCombining(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Global Transition */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Transition Style
        </label>
        <select
          value={transitionType}
          onChange={(e) => onSettingsChange({ transitionType: e.target.value })}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
        >
          {TRANSITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Transition Duration */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Transition Duration (sec)
        </label>
        <input
          type="number"
          min="0.5"
          max="2"
          step="0.5"
          value={transitionDuration}
          onChange={(e) => onSettingsChange({ transitionDuration: Number(e.target.value) })}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Audio */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Background Audio
        </label>
        {audioUrl ? (
          <div className="flex items-center gap-2">
            <audio controls src={audioUrl} className="flex-1 h-8" />
            <button
              type="button"
              className="text-destructive text-xs font-medium hover:underline flex-shrink-0"
              onClick={async () => {
                await fetch(`/api/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audioUrl: null }),
                });
                router.refresh();
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="audio/*"
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm file:mr-2 file:text-xs file:bg-primary file:text-primary-foreground file:border-0 file:rounded file:px-2 file:py-1 file:cursor-pointer"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("audio", file);
              await fetch(`/api/projects/${projectId}/audio`, {
                method: "POST",
                body: formData,
              });
              router.refresh();
            }}
          />
        )}
      </div>

      <button
        onClick={handleCombine}
        disabled={combining || selectedVideos.length === 0}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border px-4 py-2.5 rounded-md font-medium disabled:opacity-50 transition-colors text-sm"
      >
        {combining 
          ? "Combining..." 
          : `Combine ${selectedVideos.length > 0 ? selectedVideos.length : 'all'} selected clips`}
      </button>

      {error && <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</div>}
      {combinedVideos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Combined Videos</p>
          <div className="space-y-2">
            {combinedVideos.map((video) => (
              <div key={video.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                <video src={video.url} controls className="h-16 w-auto rounded" />
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(video.createdAt).toLocaleString()}
                  </span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View / Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
