"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, generations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

import { ImageGrid } from "@/components/project/image-grid";
import { GenerateButton } from "@/components/project/generate-button";

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
}

export function ProjectEditorClient({ project, imagesList }: ProjectEditorProps) {
  const router = useRouter();
  const [images, setImages] = useState(imagesList);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setImages(imagesList);
  }, [imagesList]);

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
    setImages(data.images);
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
        <div className="col-span-2">
          <h2 className="text-xl font-semibold mb-4">Storyboard</h2>
          <ImageGrid
            projectId={project.id}
            onUploadComplete={handleUploadComplete}
            images={images}
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
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">
                Default Duration (sec)
              </label>
              <input
                type="number"
                min="3"
                max="6"
                defaultValue={project.defaultDuration}
                className="w-full bg-background border rounded px-3 py-2"
                onChange={(e) => saveSettings({ defaultDuration: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Transition
              </label>
              <select
                defaultValue={project.transitionType}
                className="w-full bg-background border rounded px-3 py-2"
                onChange={(e) => saveSettings({ transitionType: e.target.value })}
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="dissolve">Dissolve</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Transition Duration (sec)
              </label>
              <input
                type="number"
                min="0.5"
                max="2"
                step="0.5"
                defaultValue={project.transitionDuration}
                className="w-full bg-background border rounded px-3 py-2"
                onChange={(e) => saveSettings({ transitionDuration: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Audio
              </label>
              {project.audioUrl ? (
                <div className="flex items-center gap-2">
                  <audio controls src={project.audioUrl} className="flex-1" />
                  <button
                    type="button"
                    className="text-red-500 text-sm"
                    onClick={async () => {
                      await fetch(`/api/projects/${project.id}`, {
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
                  className="w-full bg-background border rounded px-3 py-2"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("audio", file);
                    await fetch(`/api/projects/${project.id}/audio`, {
                      method: "POST",
                      body: formData,
                    });
                    router.refresh();
                  }}
                />
              )}
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Generate</h2>
          <GenerateButton projectId={project.id} onComplete={handleUploadComplete} />
        </div>
      </div>
    </div>
  );
}