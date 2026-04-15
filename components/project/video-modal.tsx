"use client";

import { cn } from "@/lib/utils";
import { X, ExternalLink, Trash2 } from "lucide-react";

interface VideoModalProps {
  video: {
    id: number;
    url: string;
    filename: string;
    source: string;
  };
  onClose: () => void;
  onDelete?: () => void;
}

export function VideoModal({ video, onClose, onDelete }: VideoModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-neutral-900 rounded-2xl overflow-hidden max-w-5xl w-full aspect-video shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header/Toolbar */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex flex-col">
            <h3 className="text-white font-medium text-lg truncate max-w-[300px]">
              {video.filename}
            </h3>
            <span className="text-white/50 text-[10px] uppercase tracking-wider font-bold">
              {video.source === "manual" ? "Manual Upload" : "AI Generated"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href={video.url} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  onClose();
                }}
                className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 transition-colors"
                title="Delete video"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <video 
          src={video.url} 
          className="w-full h-full"
          controls
          autoPlay
          playsInline
        />

        {/* Footer info (optional) */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Ready for merging</span>
          </div>
        </div>
      </div>
    </div>
  );
}
