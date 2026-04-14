"use client";

import { useState, useEffect } from "react";

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
  onClick: () => void;
  onUpdate: (id: number, updates: { order?: number; duration?: number }) => void;
  onDelete: (id: number) => void;
}

export function ImageCard({ image, onClick, onUpdate, onDelete }: ImageCardProps) {
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
    <div className="relative group" onClick={onClick}>
      {image.filename === "CONTINUE_FRAME" ? (
        <div className="w-full h-32 bg-secondary rounded flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-primary/50 relative overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mb-2 opacity-80"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="15" y1="3" y2="3"/><line x1="9" x2="15" y1="21" y2="21"/><line x1="9" x2="15" y1="9" y2="9"/><line x1="9" x2="15" y1="15" y2="15"/></svg>
          <span className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Continued Frame</span>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        </div>
      ) : (
        <img
          src={image.url}
          alt={image.filename}
          className="w-full h-32 object-cover rounded shadow-sm border border-border"
        />
      )}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
        <button
          onClick={() => onDelete(image.id)}
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