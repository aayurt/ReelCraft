import { useState } from "react";
import { PROMPT_TEMPLATES, generatePrompt, type PromptStyle } from "@/lib/qwen-prompts";
import { Sparkles, Copy, Check, RefreshCw } from "lucide-react";

interface Frame {
  id: number;
  filename: string;
  url: string;
  order: number;
  duration: number;
  prompt: string;
  audioUrl: string | null;
}

interface PromptGeneratorPanelProps {
  projectId: number;
  images: Frame[];
}

export function PromptGeneratorPanel({ projectId, images }: PromptGeneratorPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
  const [promptStyle, setPromptStyle] = useState<PromptStyle>("cinematic");
  const [customPrompt, setCustomPrompt] = useState("");
  const [mode, setMode] = useState<"generate" | "enhance">("generate");
  const [results, setResults] = useState<Array<{
    frameId: number;
    originalPrompt: string;
    enhancedPrompt: string;
  }>>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...images].sort((a, b) => a.order - b.order);

  const toggleFrame = (id: number) => {
    setSelectedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFrames(new Set(sorted.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedFrames(new Set());
  };

  const handleGenerate = async () => {
    if (selectedFrames.size === 0) {
      setError("Select at least one frame");
      return;
    }
    setGenerating(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(`/api/projects/${projectId}/auto/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameIds: Array.from(selectedFrames),
          promptStyle,
          customPrompt,
          mode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || "Failed to generate prompts");
      }
    } catch {
      setError("Failed to generate prompts");
    } finally {
      setGenerating(false);
    }
  };

  const handleUsePrompt = async (frameId: number, prompt: string) => {
    try {
      await fetch(`/api/projects/${projectId}/images/${frameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
    } catch (error) {
      console.error("Failed to save prompt:", error);
    }
  };

  const handleCopyPrompt = (prompt: string, frameId: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(frameId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="select-all-prompts"
            checked={selectedFrames.size === sorted.length && sorted.length > 0}
            onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
            className="w-4 h-4"
          />
          <label htmlFor="select-all-prompts" className="text-xs font-medium cursor-pointer">
            Select All
          </label>
        </div>
        <span className="text-xs text-muted-foreground">
          {selectedFrames.size} of {sorted.length} selected
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("generate")}
          className={`py-2 px-3 rounded text-xs font-medium transition-all ${
            mode === "generate"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Sparkles className="w-3 h-3 inline mr-1" />
          Generate
        </button>
        <button
          onClick={() => setMode("enhance")}
          className={`py-2 px-3 rounded text-xs font-medium transition-all ${
            mode === "enhance"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <RefreshCw className="w-3 h-3 inline mr-1" />
          Enhance
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Prompt Style</label>
        <select
          value={promptStyle}
          onChange={(e) => setPromptStyle(e.target.value as PromptStyle)}
          className="w-full text-xs bg-background border border-border rounded px-2 py-2"
        >
          {PROMPT_TEMPLATES.map((t) => (
            <option key={t.style} value={t.style}>
              {t.style.charAt(0).toUpperCase() + t.style.slice(1)}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {promptStyle === "custom" && (
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter custom prompt..."
            className="w-full text-xs bg-background border border-border rounded px-2 py-2"
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Frames</p>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {sorted.map((frame) => (
            <div
              key={frame.id}
              className={`flex items-center gap-2 rounded p-2 transition-colors ${
                selectedFrames.has(frame.id) ? "bg-muted/50" : "opacity-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedFrames.has(frame.id)}
                onChange={() => toggleFrame(frame.id)}
                className="w-4 h-4"
              />
              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                <img
                  src={frame.url}
                  alt={frame.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  Frame {frame.order}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {frame.prompt || "No prompt"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || selectedFrames.size === 0}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {generating ? "Generating..." : `${mode === "generate" ? "Generate" : "Enhance"} Prompts`}
      </button>

      {error && <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-2">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-foreground">Generated Prompts</p>
          {results.map((result, idx) => (
            <div key={result.frameId} className="space-y-2 bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Frame {idx + 1}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopyPrompt(result.enhancedPrompt, result.frameId)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Copy"
                  >
                    {copiedId === result.frameId ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground line-through">
                {result.originalPrompt.slice(0, 60)}
                {result.originalPrompt.length > 60 ? "..." : ""}
              </p>
              <p className="text-xs text-foreground">{result.enhancedPrompt}</p>
              <button
                onClick={() => handleUsePrompt(result.frameId, result.enhancedPrompt)}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded"
              >
                Use Prompt
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}