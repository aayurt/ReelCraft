"use client";

import { useState, useEffect } from "react";

interface VideoCardProps {
  video: {
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    transitionType: string;
    transitionDuration: number;
    source: string;
  };
  onUpdate: (id: number, updates: Partial<{
    order: number;
    duration: number;
    transitionType: string;
    transitionDuration: number;
  }>) => void;
  onDelete: (id: number) => void;
}

const TRANSITION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "dissolve", label: "Dissolve" },
];

export function VideoCard({ video, onUpdate, onDelete }: VideoCardProps) {
  const [duration, setDuration] = useState(video.duration);
  const [order, setOrder] = useState(video.order);
  const [transitionType, setTransitionType] = useState(video.transitionType);
  const [transitionDuration, setTransitionDuration] = useState(video.transitionDuration);
  
  useEffect(() => {
    setDuration(video.duration);
    setOrder(video.order);
    setTransitionType(video.transitionType);
    setTransitionDuration(video.transitionDuration);
  }, [video.duration, video.order, video.transitionType, video.transitionDuration]);

  const handleDurationChange = (value: number) => {
    setDuration(value);
    onUpdate(video.id, { duration: value });
  };
  
  const handleOrderChange = (value: number) => {
    setOrder(value);
    onUpdate(video.id, { order: value });
  };

  const handleTransitionChange = (value: string) => {
    setTransitionType(value);
    onUpdate(video.id, { transitionType: value });
  };

  const handleTransitionDurationChange = (value: number) => {
    setTransitionDuration(value);
    onUpdate(video.id, { transitionDuration: value });
  };
  
  return (
    <div className="relative group" data-testid="video-card">
      <video
        src={video.url}
        className="w-full h-32 object-cover rounded shadow-sm border border-border"
        muted
        preload="metadata"
      />
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded flex flex-col items-center justify-center gap-2">
        <button
          onClick={() => onDelete(video.id)}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
        >
          Remove
        </button>
        <span className="text-[10px] text-white/70">
          {video.source === "manual" ? "Manual" : "Generated"}
        </span>
      </div>
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Order</label>
            <input
              type="number"
              min="1"
              value={order}
              onChange={(e) => handleOrderChange(parseInt(e.target.value) || 1)}
              className="w-full mt-1 bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Seconds</label>
            <input
              type="number"
              min="1"
              max="15"
              value={duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value) || 3)}
              className="w-full mt-1 bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Transition</label>
            <select
              name="transitionType"
              value={transitionType}
              onChange={(e) => handleTransitionChange(e.target.value)}
              className="w-full mt-1 bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            >
              {TRANSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Duration (sec)</label>
            <input
              type="number"
              min="0.5"
              max="2"
              step="0.5"
              value={transitionDuration}
              onChange={(e) => handleTransitionDurationChange(parseFloat(e.target.value) || 1)}
              className="w-full mt-1 bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}