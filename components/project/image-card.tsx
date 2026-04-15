"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  image: {
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    prompt: string;
    audioUrl: string | null;
  };
  status?: 'pending' | 'completed' | 'next' | 'uploaded';
  onClick: () => void;
  onUpdate: (id: number, updates: Partial<{ order: number; duration: number; prompt: string; audioUrl: string | null }>) => void;
  onDelete: (id: number) => void;
}

export function ImageCard({ image, status = 'pending', onClick, onUpdate, onDelete }: ImageCardProps) {
  const [duration, setDuration] = useState(image.duration);
  const [order, setOrder] = useState(image.order);

  useEffect(() => {
    setDuration(image.duration);
    setOrder(image.order);
  }, [image.duration, image.order]);

  const handleDurationChange = (value: number) => {
    setDuration(value);
    onUpdate(image.id, { duration: value });
  };

  const handleOrderChange = (value: number) => {
    setOrder(value);
    onUpdate(image.id, { order: value });
  };

  return (
    <div className={cn(
      "relative group rounded-lg transition-all duration-300 p-0.5",
      status === 'completed'
        ? "border-2 border-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        : status === 'next'
          ? "border-2 border-blue-800 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
          : status === 'uploaded'
            ? "border-2  border-green-500 shadow-[0_0_10px_rgba(250,204,21,0.15)]"
            : "border-2 border-blue-300 opacity-80"
    )}>
      <div className="relative overflow-hidden rounded-md">
        <img
          src={image.url}
          alt={image.filename}
          className="w-full h-32 object-cover rounded shadow-sm border border-border transition-all duration-300"
        />
        {image.filename === "CONTINUE_FRAME" && (
          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm z-10 border border-primary-foreground/20">
            Continued
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded flex flex-col items-center justify-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
        >
          Edit Frame
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
        >
          Remove
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Order</label>
          <input
            type="number"
            min="1"
            value={order}
            onChange={(e) => handleOrderChange(parseInt(e.target.value) || 1)}
            onBlur={() => setOrder(image.order)}
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
    </div>
  );
}