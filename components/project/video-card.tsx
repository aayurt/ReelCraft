import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check, Play, Pause } from "lucide-react";

interface VideoCardProps {
  video: {
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    transitionType: string;
    transitionDuration: number;
    source: string;
    imageId: number | null;
  };
  thumbnailUrl?: string;
  fileExists?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onClick?: () => void;
  onUpdate: (id: number, updates: Partial<{
    order: number;
    duration: number;
    transitionType: string;
    transitionDuration: number;
  }>) => void;
  onDelete: (id: number) => void;
}

const TRANSITION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "dissolve", label: "Dissolve" },
];

export function VideoCard({ 
  video, 
  thumbnailUrl,
  fileExists = true,
  selected = false,
  onToggleSelect,
  onClick,
  onUpdate, 
  onDelete 
}: VideoCardProps) {
  const [duration, setDuration] = useState(video.duration);
  const [order, setOrder] = useState(video.order);
  const [transitionType, setTransitionType] = useState(video.transitionType);
  const [transitionDuration, setTransitionDuration] = useState(video.transitionDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    setDuration(video.duration);
    setOrder(video.order);
    setTransitionType(video.transitionType);
    setTransitionDuration(video.transitionDuration);
  }, [video.duration, video.order, video.transitionType, video.transitionDuration]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleDurationChange = (value: number) => {
    setDuration(value);
    onUpdate(video.id, { duration: value });
  };
  
  const handleOrderChange = (value: number) => {
    setOrder(value);
    onUpdate(video.id, { order: value });
  };

  const handleTransitionChange = (value: string) => {
    setTransitionType(value);
    onUpdate(video.id, { transitionType: value });
  };

  const handleTransitionDurationChange = (value: number) => {
    setTransitionDuration(value);
    onUpdate(video.id, { transitionDuration: value });
  };
  
  return (
    <div className={cn(
      "relative group rounded-lg transition-all duration-300 p-0.5",
      selected
        ? "border-2 border-primary shadow-[0_0_15px_rgba(var(--primary),0.25)]"
        : "border border-border"
    )} data-testid="video-card">
      <div 
        className="relative overflow-hidden rounded-md"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Selection Checkbox */}
        <div 
          className="absolute top-2 left-2 z-20"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className={cn(
              "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer",
              selected 
                ? "bg-primary border-primary shadow-lg" 
                : "bg-black/20 border-white/50 backdrop-blur-sm group-hover:border-white opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />}
          </div>
        </div>

        {fileExists && thumbnailUrl && !isPlaying ? (
          <div 
            className="relative w-full h-32 rounded overflow-hidden cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <img 
              src={thumbnailUrl} 
              alt={video.filename}
              className="w-full h-full object-cover"
            />
            {fileExists && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-8 h-8 text-white fill-white ml-0.5 opacity-80" />
              </div>
            )}
          </div>
        ) : fileExists ? (
          <video
            ref={videoRef}
            src={video.url}
            className="w-full h-32 object-cover rounded cursor-pointer"
            muted
            loop
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          />
        ) : !fileExists && thumbnailUrl ? (
          <div className="relative w-full h-32 rounded overflow-hidden">
            <img 
              src={thumbnailUrl} 
              alt={video.filename}
              className="w-full h-full object-cover"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            />
          </div>
        ) : null}
        
        {/* Play/Pause Overlay - only show if file exists */}
        {fileExists && (
          <div 
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-none"
          >
            <div className="bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/30 transform transition-transform group-hover:scale-110">
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white fill-white" />
              ) : (
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-3 gap-2 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video.id);
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
            >
              Remove
            </button>
            <button
              onClick={togglePlay}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
          <span className="text-[10px] text-white/70">
            {video.source === "manual" ? "Manual" : "Generated"}
          </span>
        </div>
      </div>
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Order</label>
            <input
              type="number"
              min="1"
              value={order}
              onChange={(e) => handleOrderChange(parseInt(e.target.value) || 1)}
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
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Transition</label>
            <select
              name="transitionType"
              value={transitionType}
              onChange={(e) => handleTransitionChange(e.target.value)}
              className="w-full mt-1 bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            >
              {TRANSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Duration (sec)</label>
            <input
              type="number"
              min="0.5"
              max="2"
              step="0.5"
              value={transitionDuration}
              onChange={(e) => handleTransitionDurationChange(parseFloat(e.target.value) || 1)}
              className="w-full mt-1 bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}