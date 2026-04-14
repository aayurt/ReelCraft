"use client";

import { useState } from "react";
import { VideoCard } from "./video-card";

interface Video {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
  transitionType: string;
  transitionDuration: number;
  source: string;
}

interface VideoGridProps {
  projectId: number;
  videos: Video[];
  onReorder: (videos: Video[]) => void;
  onUpdate: (id: number, updates: Partial<Video>) => void;
  onDelete: (id: number) => void;
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function VideoGrid({ projectId, videos, onReorder, onUpdate, onDelete }: VideoGridProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    
    await fetch(`/api/projects/${projectId}/videos`, {
      method: "POST",
      body: formData,
    });
    
    setUploading(false);
    window.location.reload();
  };

  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;
    
    const newVideos = [...videos];
    const draggedIndex = newVideos.findIndex((v) => v.id === draggedId);
    const targetIndex = newVideos.findIndex((v) => v.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [dragged] = newVideos.splice(draggedIndex, 1);
    newVideos.splice(targetIndex, 0, dragged);
    
    newVideos.forEach((vid, idx) => {
      vid.order = idx + 1;
    });
    
    onReorder(newVideos);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };
  
  const sorted = [...videos].sort((a, b) => a.order - b.order);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {sorted.map((video, idx) => (
          <div key={video.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{getOrdinal(idx + 1)} clip</h3>
            <div
              draggable
              onDragStart={() => handleDragStart(video.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, video.id)}
              onDragEnd={handleDragEnd}
              className={`${draggedId === video.id ? 'opacity-50 border border-primary border-dashed rounded' : ''} cursor-grab active:cursor-grabbing transition-all`}
            >
              <VideoCard
                video={video}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{getOrdinal(videos.length + 1)} clip</h3>
        <div className="border-2 border-dashed border-muted rounded-lg h-[180px] flex flex-col items-center justify-center gap-3 p-4 text-center hover:border-primary transition-colors bg-secondary/20">
          {uploading ? (
            <span className="text-sm font-medium animate-pulse">Processing...</span>
          ) : (
            <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition-opacity w-full">
              Upload Video
              <input type="file" accept="video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}