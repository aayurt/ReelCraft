interface FramePromptListProps {
  images: Array<{
    id: number;
    order: number;
    prompt: string;
  }>;
}

export function FramePromptList({ images }: FramePromptListProps) {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  
  if (sorted.length === 0) return null;
  
  return (
    <div className="border-t pt-4 mt-8">
      <h3 className="text-sm font-semibold mb-2">Frame Prompts</h3>
      <div className="space-y-1">
        {sorted.map((img, idx) => (
          <div key={img.id} className="text-sm text-muted-foreground">
            <span className="font-medium">Frame {idx + 1}:</span> {img.prompt || "(no prompt)"}
          </div>
        ))}
      </div>
    </div>
  );
}