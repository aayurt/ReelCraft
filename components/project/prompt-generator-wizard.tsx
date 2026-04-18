"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Check, Copy, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PROMPT_TEMPLATES,
  GENRE_OPTIONS,
  MOTION_OPTIONS,
  CAMERA_OPTIONS,
  LIGHTING_OPTIONS,
  ASPECT_OPTIONS,
  DURATION_OPTIONS,
  type PromptStyle,
  type Genre,
  type MotionIntensity,
  type CameraMovement,
  type LightingMood,
  type AspectRatio,
  type Duration,
} from "@/lib/qwen-prompts";

interface Character {
  id: number;
  name: string;
  visualDescription: string;
  voiceDescription: string;
  personality: string | null;
}

interface Frame {
  id: number;
  filename: string;
  url: string;
  order: number;
  duration: number;
  prompt: string;
}

interface PromptGeneratorWizardProps {
  projectId: number;
  images: Frame[];
  onClose: () => void;
}

type WizardStep = "character" | "style" | "genre" | "motion" | "camera" | "lighting" | "aspect" | "duration" | "frames" | "review";

const STEPS: WizardStep[] = [
  "character",
  "style",
  "genre",
  "motion",
  "camera",
  "lighting",
  "aspect",
  "duration",
  "frames",
  "review",
];

export function PromptGeneratorWizard({ projectId, images, onClose }: PromptGeneratorWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  const [characterSearch, setCharacterSearch] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>([]);
  const [showCharDropdown, setShowCharDropdown] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState<PromptStyle>("cinematic");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>("medium");
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>("static");
  const [lightingMood, setLightingMood] = useState<LightingMood>("natural");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState<Duration>(5);

  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<number>>(new Set());

  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Array<{ frameId: number; originalPrompt: string; enhancedPrompt: string }>>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowCharDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (characterSearch.startsWith("@")) {
      setShowCharDropdown(true);
    } else {
      setShowCharDropdown(false);
    }
  }, [characterSearch]);

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`);
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } catch (err) {
      console.error("Failed to fetch characters:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(characterSearch.replace("@", "").toLowerCase())
  );

  const toggleCharacter = (id: number) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setCharacterSearch("");
    setShowCharDropdown(false);
  };

  const toggleGenre = (genre: Genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleFrame = (id: number) => {
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFrames = () => {
    setSelectedFrameIds(new Set(images.map((f) => f.id)));
  };

  const deselectAllFrames = () => {
    setSelectedFrameIds(new Set());
  };

  const canProceed = () => {
    switch (currentStep) {
      case "frames":
        return selectedFrameIds.size > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/auto/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameIds: Array.from(selectedFrameIds),
          characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
          style: selectedStyle,
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          motionIntensity,
          cameraMovement,
          lightingMood,
          aspectRatio,
          duration,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      }
    } catch (err) {
      console.error("Failed to generate:", err);
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
    } catch (err) {
      console.error("Failed to save prompt:", err);
    }
  };

  const handleCopyPrompt = (prompt: string, frameId: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(frameId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStepTitle = () => {
    const titles: Record<WizardStep, string> = {
      character: "1. Add Characters",
      style: "2. Video Style",
      genre: "3. Genre",
      motion: "4. Motion",
      camera: "5. Camera",
      lighting: "6. Lighting",
      aspect: "7. Aspect Ratio",
      duration: "8. Duration",
      frames: "9. Select Frames",
      review: "10. Review & Generate",
    };
    return titles[currentStep];
  };

  const selectedCharacters = characters.filter((c) => selectedCharacterIds.includes(c.id));

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="relative bg-neutral-900 rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] shadow-2xl border border-white/10 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{getStepTitle()}</h2>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-white text-sm">Generated Prompts ({results.length})</p>
              {results.map((result, idx) => (
                <div key={result.frameId} className="space-y-2 bg-neutral-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">Frame {idx + 1}</p>
                    <button
                      onClick={() => handleCopyPrompt(result.enhancedPrompt, result.frameId)}
                      className="p-1 text-white/60 hover:text-white"
                    >
                      {copiedId === result.frameId ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-white/80 text-sm">{result.enhancedPrompt}</p>
                  <button
                    onClick={() => handleUsePrompt(result.frameId, result.enhancedPrompt)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-medium"
                  >
                    Use Prompt
                  </button>
                </div>
              ))}
              <Button onClick={onClose} className="w-full mt-4" variant="default">
                Done
              </Button>
            </div>
          ) : (
            <>
              {currentStep === "character" && (
                <div className="space-y-4">
                  <p className="text-white/60 text-sm">
                    Type <span className="text-amber-400">@</span> to search and add characters for consistent generation.
                  </p>
                  <div ref={searchRef} className="relative">
                    <Input
                      placeholder="Type @ to search characters..."
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                      className="bg-neutral-800 border-white/20 text-white placeholder:text-white/40"
                    />
                    {showCharDropdown && characterSearch.startsWith("@") && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-white/20 rounded-lg max-h-48 overflow-y-auto z-10">
                        {filteredCharacters.length === 0 ? (
                          <p className="p-3 text-white/60 text-sm">No characters found</p>
                        ) : (
                          filteredCharacters.map((char) => (
                            <button
                              key={char.id}
                              onClick={() => toggleCharacter(char.id)}
                              className="w-full p-3 text-left hover:bg-neutral-700 transition-colors"
                            >
                              <p className="text-white font-medium">{char.name}</p>
                              <p className="text-white/60 text-xs truncate">{char.visualDescription}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedCharacters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-white/60 text-xs">Selected:</p>
                      {selectedCharacters.map((char) => (
                        <div
                          key={char.id}
                          className="flex items-center justify-between bg-neutral-800 rounded-lg p-3"
                        >
                          <div>
                            <p className="text-white font-medium">{char.name}</p>
                            <p className="text-white/60 text-xs truncate">{char.visualDescription}</p>
                          </div>
                          <button
                            onClick={() => toggleCharacter(char.id)}
                            className="text-red-400 hover:text-red-500 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === "style" && (
                <div className="grid grid-cols-2 gap-2">
                  {PROMPT_TEMPLATES.map((t) => (
                    <button
                      key={t.style}
                      onClick={() => setSelectedStyle(t.style)}
                      className={`p-4 rounded-lg text-left transition-all ${
                        selectedStyle === t.style
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      <p className="font-medium capitalize">{t.style.replace("-", " ")}</p>
                      <p className="text-xs opacity-70 truncate">{t.prompt}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "genre" && (
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => toggleGenre(g.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedGenres.includes(g.value)
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "motion" && (
                <div className="grid grid-cols-3 gap-2">
                  {MOTION_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMotionIntensity(m.value)}
                      className={`p-4 rounded-lg text-center transition-all ${
                        motionIntensity === m.value
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      <p className="font-medium">{m.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "camera" && (
                <div className="grid grid-cols-2 gap-2">
                  {CAMERA_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCameraMovement(c.value)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        cameraMovement === c.value
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      <p className="text-sm font-medium">{c.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "lighting" && (
                <div className="grid grid-cols-2 gap-2">
                  {LIGHTING_OPTIONS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLightingMood(l.value)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        lightingMood === l.value
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      <p className="text-sm font-medium">{l.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "aspect" && (
                <div className="grid grid-cols-2 gap-2">
                  {ASPECT_OPTIONS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAspectRatio(a.value)}
                      className={`p-4 rounded-lg text-center transition-all ${
                        aspectRatio === a.value
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      <p className="font-medium">{a.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "duration" && (
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`p-4 rounded-lg text-center transition-all ${
                        duration === d.value
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-800 text-white/80 hover:bg-neutral-700"
                      }`}
                    >
                      <p className="font-medium text-lg">{d.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === "frames" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">
                      {selectedFrameIds.size} of {images.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllFrames}
                        className="text-amber-400 text-sm hover:text-amber-300"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAllFrames}
                        className="text-white/60 text-sm hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {[...images]
                      .sort((a, b) => a.order - b.order)
                      .map((frame) => (
                        <button
                          key={frame.id}
                          onClick={() => toggleFrame(frame.id)}
                          className={`relative rounded-lg overflow-hidden transition-all ${
                            selectedFrameIds.has(frame.id)
                              ? "ring-2 ring-amber-500"
                              : "opacity-50"
                          }`}
                        >
                          <img
                            src={frame.url}
                            alt={frame.filename}
                            className="w-full h-20 object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <p className="text-white text-xs">Frame {frame.order}</p>
                          </div>
                          {selectedFrameIds.has(frame.id) && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-black" />
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {currentStep === "review" && (
                <div className="space-y-4">
                  <div className="bg-neutral-800 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">Character(s)</span>
                      <span className="text-white">
                        {selectedCharacters.length > 0
                          ? selectedCharacters.map((c) => c.name).join(", ")
                          : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Style</span>
                      <span className="text-white capitalize">{selectedStyle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Genre</span>
                      <span className="text-white">
                        {selectedGenres.length > 0
                          ? selectedGenres.map((g) => g).join(", ")
                          : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Motion</span>
                      <span className="text-white capitalize">{motionIntensity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Camera</span>
                      <span className="text-white capitalize">{cameraMovement.replace("-", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Lighting</span>
                      <span className="text-white capitalize">{lightingMood.replace("-", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Aspect</span>
                      <span className="text-white">{aspectRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Duration</span>
                      <span className="text-white">{duration}s</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-3">
                      <span className="text-white/60">Frames</span>
                      <span className="text-white">{selectedFrameIds.size} selected</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-lg py-3"
                  >
                    {generating ? (
                      "Generating..."
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 inline mr-2" />
                        Generate Prompts
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {results.length === 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <button
              onClick={prevStep}
              disabled={stepIndex === 0}
              className="flex items-center text-white/60 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex gap-1">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === stepIndex
                      ? "bg-amber-500"
                      : idx < stepIndex
                      ? "bg-white/50"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            {currentStep !== "review" ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center text-white/60 hover:text-white disabled:opacity-30"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </div>
  );
}