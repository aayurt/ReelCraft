"use client"

import { useState, useEffect } from "react"

interface Video {
  id: number
  url: string
  filename: string
  order: number
  duration: number
  transitionType: string
  transitionDuration: number
  source: string
  imageId: number | null
}

interface Image {
  id: number
  filename: string
  order: number
}

interface VideoTableProps {
  projectId: number
  videos: Video[]
  images: Image[]
  onDelete: (id: number) => void
}

interface SelectedVideo {
  id: number
  url: string
  filename: string
}

export function VideoTable({ projectId, videos, images, onDelete }: VideoTableProps) {
  const [deleting, setDeleting] = useState<number | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedVideo(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getFrameNumber = (imageId: number | null): string => {
    if (!imageId) return "-"
    const image = images.find(img => img.id === imageId)
    if (!image) return "-"
    return `#${image.order}`
  }

  const getImageFilename = (imageId: number | null): string => {
    if (!imageId) return "Manual"
    const image = images.find(img => img.id === imageId)
    if (!image) return "-"
    return image.filename.length > 20 ? image.filename.slice(0, 20) + "..." : image.filename
  }

  const handleDelete = async (videoId: number) => {
    setDeleting(videoId)
    try {
      await fetch(`/api/projects/${projectId}/videos/${videoId}`, {
        method: "DELETE",
      })
      onDelete(videoId)
    } catch (error) {
      console.error("Failed to delete video:", error)
    } finally {
      setDeleting(null)
    }
  }

  const sortedVideos = [...videos].sort((a, b) => a.order - b.order)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">#</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Frame</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Source</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Duration</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Transition</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Preview</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedVideos.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-center text-muted-foreground">
                  No videos generated yet
                </td>
              </tr>
            ) : (
              sortedVideos.map((video) => (
                <tr key={video.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="py-2 px-2">{video.order}</td>
                  <td className="py-2 px-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{getFrameNumber(video.imageId)} - {video.id}</span>
                      <span className="text-xs text-muted-foreground">{getImageFilename(video.imageId)}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${video.source === 'qwen'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-muted-foreground'
                      }`}>
                      {video.source === 'qwen' ? 'Qwen AI' : 'Local'}
                    </span>
                  </td>
                  <td className="py-2 px-2">{video.duration}s</td>
                  <td className="py-2 px-2 capitalize">{video.transitionType}</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => setSelectedVideo({ id: video.id, url: video.url, filename: video.filename })}
                      className="text-xs text-primary hover:underline"
                    >
                      Play
                    </button>
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={deleting === video.id}
                      className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
                    >
                      {deleting === video.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative max-w-4xl w-full bg-background rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <video
              src={selectedVideo.url}
              className="w-full max-h-[80vh]"
              controls
              autoPlay
            />
            <div className="p-3 text-sm text-muted-foreground">
              {selectedVideo.filename}
            </div>
          </div>
        </div>
      )}
    </>
  )
}