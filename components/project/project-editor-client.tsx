"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, generations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

import { ImageGrid } from "@/components/project/image-grid";
import { GeneratePanel } from "@/components/project/generate-panel";
import { VideoTable } from "@/components/project/video-table";
import { CombinePanel } from "@/components/project/combine-panel";

interface ProjectEditorProps {
  project: {
    id: number;
    name: string;
    defaultDuration: number;
    transitionType: string;
    transitionDuration: number;
    audioUrl: string | null;
    status: string;
  };
  imagesList: Array<{
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    prompt: string;
    audioUrl: string | null;
  }>;
  videosList: Array<{
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    transitionType: string;
    transitionDuration: number;
    source: string;
    imageId: number | null;
  }>;
}

export function ProjectEditorClient({ project, imagesList, videosList }: ProjectEditorProps) {
  const router = useRouter();
  const [images, setImages] = useState(imagesList);
  const [videos, setVideos] = useState(videosList);
  const [saving, setSaving] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);

  const handleToggleSelect = (id: number) => {
    setSelectedImageIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedImageIds(images.map(img => img.id));
  };

  const handleClearSelection = () => {
    setSelectedImageIds([]);
  };

  useEffect(() => {
    setImages(imagesList);
  }, [imagesList]);

  useEffect(() => {
    setVideos(videosList);
  }, [videosList]);

  const saveSettings = async (updates: Partial<{
    name: string;
    defaultDuration: number;
    transitionType: string;
    transitionDuration: number;
  }>) => {
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
  };
  
  const handleUploadComplete = async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    const data = await res.json();
    setImages(data.images || []);
    setVideos(data.videos || []);
    router.refresh();
  };
  
  const handleGenerateComplete = async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    const data = await res.json();
    setImages(data.images || []);
    setVideos(data.videos || []);
    router.refresh();
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <input 
          className="text-3xl font-bold bg-transparent border-0 border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none focus:ring-0 px-0 w-1/2 transition-colors"
          defaultValue={project.name}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== project.name) {
               saveSettings({ name: e.target.value.trim() });
            }
          }}
          title="Click to rename project"
          disabled={saving}
        />
        <div className="flex gap-4">
          <a href="/dashboard" className="text-sm hover:underline">← Back to Dashboard</a>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Storyboard</h2>
            <CombinePanel
              projectId={project.id}
              transitionType={project.transitionType}
              transitionDuration={project.transitionDuration}
              audioUrl={project.audioUrl}
              videos={videos}
              selectedImageIds={selectedImageIds}
              onSettingsChange={saveSettings}
            />
            <ImageGrid
              projectId={project.id}
              onUploadComplete={handleUploadComplete}
              images={images}
              videos={videos}
              selectedImageIds={selectedImageIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onReorder={async (newImages) => {
                setImages(newImages);
                await fetch(`/api/projects/${project.id}/images/reorder`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ images: newImages.map(img => ({ id: img.id, order: img.order })) }),
                });
              }}
              onUpdate={async (id, updates) => {
                setImages(images.map(img => img.id === id ? { ...img, ...updates } : img));
                await fetch(`/api/projects/${project.id}/images/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updates),
                });
              }}
              onDelete={async (id) => {
                setImages(images.filter(img => img.id !== id));
                await fetch(`/api/projects/${project.id}/images/${id}`, {
                  method: "DELETE"
                });
              }}
            />
          </div>

          {/* Videos Table */}
          {videos.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Generated Videos</h2>
              <VideoTable
                projectId={project.id}
                videos={videos}
                images={images}
                onDelete={(id) => setVideos(videos.filter(v => v.id !== id))}
              />
            </div>
          )}
        </div>
        
        <div className="space-y-8">
          {/* Settings */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Default Duration (sec)
              </label>
              <input
                type="number"
                min="3"
                max="6"
                defaultValue={project.defaultDuration}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                onChange={(e) => saveSettings({ defaultDuration: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Generate Videos */}
          <div>
            <h2 className="text-xl font-semibold mb-1">Generate Videos</h2>
            <p className="text-xs text-muted-foreground mb-4">Generate a clip for each frame. Set a transition after each clip.</p>
            <GeneratePanel
              projectId={project.id}
              images={images}
              onComplete={handleGenerateComplete}
            />
            <a
              href={`/project/${project.id}/videos`}
              className="block text-center text-sm text-primary hover:underline mt-2"
            >
              Manage Videos →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}