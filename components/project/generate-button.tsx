"use client";

import { useState } from "react";

interface GenerateButtonProps {
  projectId: number;
  onComplete?: () => void;
}

export function GenerateButton({ projectId, onComplete }: GenerateButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "new" }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.outputUrl);
        onComplete?.();
      } else {
        setError(data.error || "Generation failed");
      }
    } catch (err) {
      setError("Failed to generate video");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* <div>
        <label className="block text-sm font-medium mb-2">Generation Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "new" | "continue")}
          className="w-full bg-background border rounded px-3 py-2"
        >
          <option value="new">New Video</option>
          <option value="continue">Continue from Last</option>
        </select>
      </div> */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium disabled:opacity-50"
      >
        {generating ? "Generating..." : "Generate Video"}
      </button>
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      {result && (
        <div className="text-sm text-green-500">Video generated successfully!</div>
      )}
    </div>
  );
}