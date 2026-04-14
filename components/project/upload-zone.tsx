"use client";

import { useState, useCallback } from "react";

interface UploadZoneProps {
  projectId: number;
  onUploadComplete: () => void;
}

export function UploadZone({ projectId, onUploadComplete }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  }, [projectId]);
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  }, [projectId]);
  
  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      
      await fetch(`/api/projects/${projectId}/images`, {
        method: "POST",
        body: formData,
      });
    }
    
    setUploading(false);
    onUploadComplete();
  };
  
  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors mb-4"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        {uploading ? "Uploading..." : "Drop images here or click to upload"}
      </label>
    </div>
  );
}