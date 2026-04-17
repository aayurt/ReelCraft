"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageGrid } from "@/components/project/image-grid";
import { VideoGrid } from "@/components/project/video-grid";
import { PromptGeneratorPanel } from "./prompt-generator-panel";
import { GeneratePanel } from "./generate-panel";

interface Project {
  id: number;
  name: string;
  defaultDuration: number;
  transitionType: string;
  transitionDuration: number;
  audioUrl: string | null;
  status: string;
}

interface Image {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
  prompt: string;
  audioUrl: string | null;
}

interface Video {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
  transitionType: string;
  transitionDuration: number;
  source: string;
  imageId: number | null;
}

interface GeneratePageClientProps {
  project: Project;
  imagesList: Image[];
  videosList: Video[];
}

export function GeneratePageClient({ project, imagesList, videosList }: GeneratePageClientProps) {
  const router = useRouter();
  const [images, setImages] = useState(imagesList);
  const [videos, setVideos] = useState(videosList);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState<"prompts" | "generate">("prompts");

  useEffect(() => {
    setImages(imagesList);
  }, [imagesList]);

  useEffect(() => {
    setVideos(videosList);
  }, [videosList]);

  const handleUploadComplete = async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    const data = await res.json();
    setImages(data.images || []);
    router.refresh();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Generate</h1>
          <p className="text-muted-foreground text-sm mt-1">{project.name}</p>
        </div>
        <div className="flex gap-4">
          <a href={`/project/${project.id}`} className="text-sm hover:underline">
            ← Back to Editor
          </a>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setSelectedTab("prompts")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === "prompts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Prompt Generator
        </button>
        <button
          onClick={() => setSelectedTab("generate")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === "generate"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Video Generator
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Frames</h2>
            <ImageGrid
              projectId={project.id}
              onUploadComplete={handleUploadComplete}
              images={images}
              videos={videos}
              selectedImageIds={selectedImageIds}
              onToggleSelect={(id) => {
                setSelectedImageIds((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                );
              }}
              onSelectAll={() => setSelectedImageIds(images.map((img) => img.id))}
              onClearSelection={() => setSelectedImageIds([])}
              onReorder={async (newImages) => {
                setImages(newImages);
                await fetch(`/api/projects/${project.id}/images/reorder`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    images: newImages.map((img) => ({ id: img.id, order: img.order })),
                  }),
                });
              }}
              onUpdate={async (id, updates) => {
                setImages(images.map((img) => (img.id === id ? { ...img, ...updates } : img)));
                await fetch(`/api/projects/${project.id}/images/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updates),
                });
              }}
              onDelete={async (id) => {
                setImages(images.filter((img) => img.id !== id));
                await fetch(`/api/projects/${project.id}/images/${id}`, {
                  method: "DELETE",
                });
              }}
            />
          </div>

          {videos.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Videos</h2>
              <VideoGrid
                projectId={project.id}
                videos={videos}
                images={images}
                selectedVideoIds={selectedImageIds}
                onToggleSelect={(id) => {
                  setSelectedImageIds((prev) =>
                    prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                  );
                }}
                onReorder={async (newVideos) => {
                  setVideos(newVideos);
                  await fetch(`/api/projects/${project.id}/videos/reorder`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      videos: newVideos.map((vid) => ({ id: vid.id, order: vid.order })),
                    }),
                  });
                }}
                onUpdate={async (id, updates) => {
                  setVideos(videos.map((vid) => (vid.id === id ? { ...vid, ...updates } : vid)));
                  await fetch(`/api/projects/${project.id}/videos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                  });
                }}
                onDelete={async (id) => {
                  setVideos(videos.filter((vid) => vid.id !== id));
                  await fetch(`/api/projects/${project.id}/videos/${id}`, {
                    method: "DELETE",
                  });
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-8">
          {selectedTab === "prompts" ? (
            <div>
              <h2 className="text-xl font-semibold mb-1">Prompt Generator</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Generate or enhance prompts using Gemini AI.
              </p>
              <PromptGeneratorPanel projectId={project.id} images={images} />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-1">Video Generator</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Generate videos from your image frames.
              </p>
              <GeneratePanel projectId={project.id} images={images} onComplete={handleUploadComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}