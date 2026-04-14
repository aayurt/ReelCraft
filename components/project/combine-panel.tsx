"use client";

import { useState } from "react";
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
}

interface CombinePanelProps {
  projectId: number;
  transitionType: string;
  transitionDuration: number;
  audioUrl: string | null;
  videos: VideoClip[];
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
  onSettingsChange,
}: CombinePanelProps) {
  const router = useRouter();
  const [combining, setCombining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleCombine = async () => {
    setCombining(true);
    setError(null);
    setResult(null);

    try {
      const sortedVideos = [...videos].sort((a, b) => a.order - b.order);
      const videoClips = sortedVideos.map(v => ({
        url: v.url,
        duration: v.duration,
        transitionType: v.transitionType === "none" ? "none" : (v.transitionType || transitionType),
        transitionDuration: v.transitionDuration || transitionDuration,
      }));

      const res = await fetch(`/api/projects/${projectId}/combine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videos: videoClips,
          audioUrl 
        }),
      });

      const data = await res.json();

      if (data.success || data.outputUrl) {
        setResult(data.outputUrl);
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
        disabled={combining}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border px-4 py-2.5 rounded-md font-medium disabled:opacity-50 transition-colors text-sm"
      >
        {combining ? "Combining..." : "Combine into Final Video"}
      </button>

      {error && <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</div>}
      {result && (
        <div className="space-y-2">
          <p className="text-sm text-green-500 bg-green-500/10 rounded px-3 py-2">Videos combined successfully!</p>
          <a
            href={result}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-primary underline underline-offset-2"
          >
            Download Final Video
          </a>
        </div>
      )}
    </div>
  );
}
