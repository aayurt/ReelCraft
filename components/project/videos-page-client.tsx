"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VideoGrid } from "@/components/project/video-grid";
import { CombinePanel } from "@/components/project/combine-panel";
import { CheckSquare, X } from "lucide-react";

interface Project {
  id: number;
  name: string;
  defaultDuration: number;
  transitionType: string;
  transitionDuration: number;
  audioUrl: string | null;
}

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

interface VideosPageClientProps {
  project: Project;
  videosList: VideoClip[];
}

export function VideosPageClient({ project, videosList }: VideosPageClientProps) {
  const router = useRouter();
  const [videos, setVideos] = useState(videosList);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);

  const handleToggleSelect = (id: number) => {
    setSelectedVideoIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedVideoIds(videos.map(v => v.id));
  };

  const handleClearSelection = () => {
    setSelectedVideoIds([]);
  };

  useEffect(() => {
    setVideos(videosList);
  }, [videosList]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-muted-foreground text-sm mt-1">{project.name}</p>
        </div>
        <div className="flex gap-4">
          <a href={`/project/${project.id}`} className="text-sm hover:underline">← Back to Editor</a>
        </div>
      </div>

      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border mb-6">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {selectedVideoIds.length} clips selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 rounded transition-colors"
            >
              <CheckSquare className="w-3 h-3" /> Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 bg-background border border-border hover:bg-muted rounded transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <h2 className="text-xl font-semibold mb-4">Video Clips</h2>
          <VideoGrid
            projectId={project.id}
            videos={videos}
            selectedVideoIds={selectedVideoIds}
            onToggleSelect={handleToggleSelect}
            onReorder={async (newVideos) => {
              setVideos(newVideos);
              await fetch(`/api/projects/${project.id}/videos/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videos: newVideos.map(vid => ({ id: vid.id, order: vid.order })) }),
              });
            }}
            onUpdate={async (id, updates) => {
              setVideos(videos.map(vid => vid.id === id ? { ...vid, ...updates } : vid));
              await fetch(`/api/projects/${project.id}/videos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
              });
            }}
            onDelete={async (id) => {
              setVideos(videos.filter(vid => vid.id !== id));
              await fetch(`/api/projects/${project.id}/videos/${id}`, {
                method: "DELETE"
              });
              router.refresh();
            }}
          />
        </div>
        
        <div className="space-y-8">
          {/* Combine */}
          <div>
            <h2 className="text-xl font-semibold mb-1">Combine Video</h2>
            <p className="text-xs text-muted-foreground mb-4">Merge selected clips into a final video with transitions.</p>
            <CombinePanel
              projectId={project.id}
              transitionType={project.transitionType}
              transitionDuration={project.transitionDuration}
              audioUrl={project.audioUrl}
              videos={videos}
              selectedVideoIds={selectedVideoIds}
              onSettingsChange={async () => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}