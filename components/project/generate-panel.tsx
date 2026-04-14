import { useState, useEffect } from 'react';
import { PROMPT_TEMPLATES, generatePrompt, type PromptStyle } from '@/lib/qwen-prompts';

interface Frame {
  id: number;
  filename: string;
  url: string;
  order: number;
  duration: number;
  prompt: string;
  audioUrl: string | null;
}

interface GeneratePanelProps {
  projectId: number;
  images: Frame[];
  onComplete?: () => void;
}

const TRANSITION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'dissolve', label: 'Dissolve' },
];

const SOURCE_OPTIONS = [
  { value: 'qwen', label: 'Qwen AI', description: 'High quality AI video generation' },
  { value: 'local', label: 'Local FFmpeg', description: 'Fast local video generation' },
];

export function GeneratePanel({ projectId, images, onComplete }: GeneratePanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [frameTransitions, setFrameTransitions] = useState<Record<number, string>>({});
  const [transitionDurations, setTransitionDurations] = useState<Record<number, number>>({});
  const [source, setSource] = useState<'qwen' | 'local'>('qwen');
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
  const [promptStyle, setPromptStyle] = useState<PromptStyle>('cinematic');
  const [customPrompt, setCustomPrompt] = useState('');

  const sorted = [...images].sort((a, b) => a.order - b.order);

  useEffect(() => {
    setSelectedFrames(new Set(sorted.map(f => f.id)));
  }, [images]);

  const toggleFrame = (id: number) => {
    setSelectedFrames(prev => {
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
    setSelectedFrames(new Set(sorted.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFrames(new Set());
  };

  const selectedCount = selectedFrames.size;

  const setTransition = (id: number, value: string) => {
    setFrameTransitions((prev) => ({ ...prev, [id]: value }));
  };

  const setTransitionDuration = (id: number, value: number) => {
    setTransitionDurations((prev) => ({ ...prev, [id]: value }));
  };

  const handleGenerate = async () => {
    if (selectedFrames.size === 0) {
      setError('Please select at least one frame to generate');
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);

    const transitionsWithDuration: Record<string, { type: string; duration: number }> = {};
    for (const [id, type] of Object.entries(frameTransitions)) {
      transitionsWithDuration[id] = {
        type,
        duration: transitionDurations[Number(id)] || 1,
      };
    }

    const frameIds = Array.from(selectedFrames);

    try {
      const res = await fetch(`/project/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameTransitions: transitionsWithDuration,
          source,
          frameIds,
          promptStyle,
          ...(promptStyle === 'custom' && { customPrompt }),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.outputUrl);
        onComplete?.();
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch {
      setError('Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className='space-y-4'>
      {sorted.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Add frames to the storyboard first.</p>
      ) : (
        <>
          <div className='flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2'>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id='select-all'
                checked={selectedCount === sorted.length}
                onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                className='w-4 h-4 rounded border-border text-primary focus:ring-primary'
              />
              <label htmlFor='select-all' className='text-xs font-medium text-foreground cursor-pointer'>
                Select All
              </label>
            </div>
            <span className='text-xs text-muted-foreground'>
              {selectedCount} of {sorted.length} selected
            </span>
          </div>
          <div className='space-y-3'>
            {sorted.map((frame, idx) => (
              <div key={frame.id} className={`flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2 ${!selectedFrames.has(frame.id) ? 'opacity-40' : ''}`}>
                <input
                  type='checkbox'
                  checked={selectedFrames.has(frame.id)}
                  onChange={() => toggleFrame(frame.id)}
                  className='w-4 h-4 rounded border-border text-primary focus:ring-primary'
                />
                <div className='w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-border'>
                  {frame.filename === 'CONTINUE_FRAME' ? (
                    <div className='w-full h-full bg-primary/20 flex items-center justify-center'>
                      <span className='text-[9px] text-primary font-bold'>CONT</span>
                    </div>
                  ) : (
                    <img src={frame.url} alt={frame.filename} className='w-full h-full object-cover' />
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-foreground'>Frame {idx + 1}</p>
                  <p className='text-[10px] text-muted-foreground truncate'>{frame.duration}s</p>
                </div>
                <select
                  value={frameTransitions[frame.id] ?? 'none'}
                  onChange={(e) => setTransition(frame.id, e.target.value)}
                  className='text-xs bg-background border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none transition-all'
                  title='Transition after this frame'
                >
                  {TRANSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {frameTransitions[frame.id] && frameTransitions[frame.id] !== 'none' && (
                  <input
                    type='number'
                    min='0.5'
                    max='2'
                    step='0.5'
                    value={transitionDurations[frame.id] || 1}
                    onChange={(e) => setTransitionDuration(frame.id, parseFloat(e.target.value) || 1)}
                    className='w-14 text-xs bg-background border border-border rounded px-1 py-1 focus:ring-1 focus:ring-primary outline-none'
                    title='Transition duration'
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className='bg-secondary/30 rounded-lg p-3 space-y-2'>
        <p className='text-xs font-semibold text-foreground'>Prompt Style</p>
        <select
          value={promptStyle}
          onChange={(e) => setPromptStyle(e.target.value as PromptStyle)}
          className='w-full text-xs bg-background border border-border rounded px-2 py-2 focus:ring-1 focus:ring-primary outline-none'
        >
          {PROMPT_TEMPLATES.map((t) => (
            <option key={t.style} value={t.style}>
              {t.style.charAt(0).toUpperCase() + t.style.slice(1)}
            </option>
          ))}
          <option value='custom'>Custom Prompt</option>
        </select>
        {promptStyle === 'custom' && (
          <input
            type='text'
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder='Enter custom prompt...'
            className='w-full text-xs bg-background border border-border rounded px-2 py-2 focus:ring-1 focus:ring-primary outline-none'
          />
        )}
      </div>

      <div className='bg-secondary/30 rounded-lg p-3 space-y-2'>
        <p className='text-xs font-semibold text-foreground'>Video Source</p>
        <div className='flex gap-2'>
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSource(opt.value as 'qwen' | 'local')}
              className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-all ${
                source === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background border border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className='text-[10px] text-muted-foreground'>
          {source === 'qwen'
            ? 'AI-powered video generation (takes longer, higher quality)'
            : 'Fast local generation using FFmpeg'}
        </p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || sorted.length === 0 || selectedCount === 0}
        className='w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md font-medium disabled:opacity-50 transition-opacity text-sm'
      >
        {generating ? 'Generating...' : `Generate ${selectedCount > 0 ? selectedCount : ''} Video${selectedCount !== 1 ? 's' : ''}`}
      </button>

      {error && <div className='text-sm text-destructive bg-destructive/10 rounded px-3 py-2'>{error}</div>}
      {result && <div className='text-sm text-green-500 bg-green-500/10 rounded px-3 py-2'>Videos generated successfully!</div>}
    </div>
  );
}
