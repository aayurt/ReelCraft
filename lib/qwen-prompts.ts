export type PromptStyle = 'cinematic' | 'anime' | 'documentary' | 'commercial' | 'abstract' | 'portrait' | 'product' | 'nature' | 'sci-fi' | 'fantasy' | 'horror' | 'romance' | 'comedy' | 'custom';

export type Genre = 'action' | 'romance' | 'horror' | 'comedy' | 'sci-fi' | 'drama' | 'thriller' | 'documentary' | 'musical' | 'sports';

export type MotionIntensity = 'slow' | 'medium' | 'fast';

export type CameraMovement = 'static' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'orbit' | 'dolly';

export type LightingMood = 'natural' | 'golden-hour' | 'neon' | 'studio' | 'dramatic' | 'low-key';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

export type Duration = 3 | 4 | 5 | 6;

interface PromptTemplate {
  style: PromptStyle;
  prompt: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    style: 'cinematic',
    prompt: 'Cinematic film style with professional cinematography, smooth camera movements, dramatic lighting.',
  },
  {
    style: 'anime',
    prompt: 'Anime Japanese animation style with bold outlines, expressive character animation, vibrant colors.',
  },
  {
    style: 'documentary',
    prompt: 'Documentary style with naturalistic handheld camera, realistic lighting, environmental storytelling.',
  },
  {
    style: 'commercial',
    prompt: 'High-end commercial advertising style, polished and professional, clean lighting, product focus.',
  },
  {
    style: 'abstract',
    prompt: 'Abstract artistic style with experimental shapes, colors, and textures, dreamlike atmosphere.',
  },
  {
    style: 'portrait',
    prompt: 'Portrait style focusing on subject expression, soft background, intimate framing.',
  },
  {
    style: 'product',
    prompt: 'Product photography style with clean studio lighting, clean background, rotation motion.',
  },
  {
    style: 'nature',
    prompt: 'Nature documentary style with environmental wide shots, organic movement, natural lighting.',
  },
  {
    style: 'sci-fi',
    prompt: 'Science fiction style with futuristic technology, sleek designs, technological atmosphere.',
  },
  {
    style: 'fantasy',
    prompt: 'Fantasy style with magical elements, ethereal lighting, mythical creatures.',
  },
  {
    style: 'horror',
    prompt: 'Horror style with dark shadows, suspenseful atmosphere, eerie environment.',
  },
  {
    style: 'romance',
    prompt: 'Romantic style with warm soft lighting, emotional tone, intimate moments.',
  },
  {
    style: 'comedy',
    prompt: 'Comedy style with lively energy, vibrant colors, playful dynamics.',
  },
];

export const GENRE_OPTIONS: { value: Genre; label: string }[] = [
  { value: 'action', label: 'Action' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Horror' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'drama', label: 'Drama' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'musical', label: 'Musical' },
  { value: 'sports', label: 'Sports' },
];

export const MOTION_OPTIONS: { value: MotionIntensity; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'medium', label: 'Medium' },
  { value: 'fast', label: 'Fast' },
];

export const CAMERA_OPTIONS: { value: CameraMovement; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'pan-left', label: 'Pan Left' },
  { value: 'pan-right', label: 'Pan Right' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'dolly', label: 'Dolly' },
];

export const LIGHTING_OPTIONS: { value: LightingMood; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'neon', label: 'Neon' },
  { value: 'studio', label: 'Studio' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'low-key', label: 'Low Key' },
];

export const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '9:16', label: '9:16 (TikTok)' },
  { value: '1:1', label: '1:1 (Instagram)' },
  { value: '4:3', label: '4:3 (Standard)' },
];

export const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: 3, label: '3s' },
  { value: 4, label: '4s' },
  { value: 5, label: '5s' },
  { value: 6, label: '6s' },
];

const DEFAULT_PROMPT = 'Generate a video with natural motion from this image.';

export function generatePrompt(style: PromptStyle, custom?: string): string {
  if (style === 'custom') {
    return custom || DEFAULT_PROMPT;
  }

  const template = PROMPT_TEMPLATES.find((t) => t.style === style);
  return template?.prompt || DEFAULT_PROMPT;
}