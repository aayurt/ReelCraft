import { useState } from 'react';

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

  const sorted = [...images].sort((a, b) => a.order - b.order);

  const setTransition = (id: number, value: string) => {
    setFrameTransitions((prev) => ({ ...prev, [id]: value }));
  };

  const setTransitionDuration = (id: number, value: number) => {
    setTransitionDurations((prev) => ({ ...prev, [id]: value }));
  };

  const handleGenerate = async () => {
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

    try {
      const res = await fetch(`/project/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameTransitions: transitionsWithDuration,
          source,
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
        <div className='space-y-3'>
          {sorted.map((frame, idx) => (
            <div key={frame.id} className='flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2'>
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
      )}

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
        disabled={generating || sorted.length === 0}
        className='w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md font-medium disabled:opacity-50 transition-opacity text-sm'
      >
        {generating ? 'Generating...' : 'Generate Videos'}
      </button>

      {error && <div className='text-sm text-destructive bg-destructive/10 rounded px-3 py-2'>{error}</div>}
      {result && <div className='text-sm text-green-500 bg-green-500/10 rounded px-3 py-2'>Videos generated successfully!</div>}
    </div>
  );
}
