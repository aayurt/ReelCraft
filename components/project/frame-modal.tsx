"use client";

import { useState, useEffect } from "react";

interface FrameModalProps {
  image: {
    id: number;
    url: string;
    filename: string;
    order: number;
    prompt: string;
    audioUrl: string | null;
  };
  onClose: () => void;
  onSave: (updates: { prompt: string; audioUrl: string | null; duration?: number }) => void;
  onDelete: () => void;
}

export function FrameModal({ image, onClose, onSave, onDelete }: FrameModalProps) {
  const [prompt, setPrompt] = useState(image.prompt);
  const [audioUrl, setAudioUrl] = useState(image.audioUrl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleSave = async () => {
    if (!prompt.trim()) return;
    setSaving(true);
    await onSave({ prompt, audioUrl });
    setSaving(false);
    onClose();
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Frame {image.order || image.id}</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Prompt (required)
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the video content..."
            className="w-full h-32 bg-background border rounded px-3 py-2 resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Audio (optional)
          </label>
          {audioUrl ? (
            <div className="flex items-center gap-2">
              <audio controls src={audioUrl} className="flex-1" />
              <button
                type="button"
                onClick={() => setAudioUrl(null)}
                className="text-red-500 text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="w-full"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!prompt.trim() || saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}