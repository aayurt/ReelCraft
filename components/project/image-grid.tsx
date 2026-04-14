"use client";

import { useState } from "react";
import { ImageCard } from "./image-card";
import { FrameModal } from "./frame-modal";
import { FramePromptList } from "./frame-prompt-list";

interface Image {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
}

interface ImageGridProps {
  projectId: number;
  images: Image[];
  onReorder: (images: Image[]) => void;
  onUpdate: (id: number, updates: { order?: number; duration?: number }) => void;
  onDelete: (id: number) => void;
  onUploadComplete: () => void;
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function ImageGrid({ projectId, images, onReorder, onUpdate, onDelete, onUploadComplete }: ImageGridProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<typeof images[number] | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    
    await fetch(`/api/projects/${projectId}/images`, {
      method: "POST",
      body: formData,
    });
    
    setUploading(false);
    onUploadComplete();
  };

  const handleDuplicateLast = async () => {
    if (images.length === 0) return;
    setUploading(true);
    const sortedImages = [...images].sort((a, b) => a.order - b.order);
    const lastImage = sortedImages[sortedImages.length - 1];
    
    await fetch(`/api/projects/${projectId}/images/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: lastImage.id })
    });
    
    setUploading(false);
    onUploadComplete();
  };
  
  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;
    
    const newImages = [...images];
    const draggedIndex = newImages.findIndex((i) => i.id === draggedId);
    const targetIndex = newImages.findIndex((i) => i.id === targetId);
    
    const [dragged] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, dragged);
    
    newImages.forEach((img, idx) => {
      img.order = idx + 1; // 1-based ordering for user friendliness
    });
    
    onReorder(newImages);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };
  
  const sorted = [...images].sort((a, b) => a.order - b.order);
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        {sorted.map((image, idx) => (
        <div key={image.id} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{getOrdinal(idx + 1)} frame</h3>
          <div
            draggable
            onDragStart={() => handleDragStart(image.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, image.id)}
            onDragEnd={handleDragEnd}
            className={`${draggedId === image.id ? 'opacity-50 border border-primary border-dashed rounded' : ''} cursor-grab active:cursor-grabbing transition-all`}
          >
            <ImageCard
              image={image}
              onClick={() => setSelectedImage(image)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        </div>
      ))}
      
      {/* Empty Next Frame Box */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{getOrdinal(images.length + 1)} frame</h3>
        <div className="border-2 border-dashed border-muted rounded-lg h-[180px] flex flex-col items-center justify-center gap-3 p-4 text-center hover:border-primary transition-colors bg-secondary/20">
          {uploading ? (
            <span className="text-sm font-medium animate-pulse">Processing...</span>
          ) : (
            <>
              <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition-opacity w-full">
                Upload Image
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              {images.length > 0 && (
                <button 
                  onClick={handleDuplicateLast}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline" 
                  disabled={uploading}
                >
                  Continue from last
                </button>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      <FramePromptList images={images} />

      {selectedImage && (
        <FrameModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onSave={async (updates) => {
            await onUpdate(selectedImage.id, updates);
            setSelectedImage(null);
          }}
          onDelete={() => {
            onDelete(selectedImage.id);
            setSelectedImage(null);
          }}
        />
      )}
    </div>
  );
}