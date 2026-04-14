export type PromptStyle = 'cinematic' | 'product' | 'portrait' | 'landscape' | 'custom';

interface PromptTemplate {
  style: PromptStyle;
  prompt: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    style: 'cinematic',
    prompt: 'Camera slowly pans right following the subject. Golden hour lighting creates soft shadows. Smooth, professional cinematography.',
  },
  {
    style: 'product',
    prompt: 'Product rotates slowly on clean surface. Studio lighting with soft reflections. Minimalist product shot.',
  },
  {
    style: 'portrait',
    prompt: 'Subtle breathing motion in subject. Natural window light. Soft focus on face.',
  },
  {
    style: 'landscape',
    prompt: 'Wide establishing shot. Dawn light reveals atmosphere. Gentle environmental motion. Cinematic drone view.',
  },
];

const DEFAULT_PROMPT = 'Generate a video with natural motion from this image.';

export function generatePrompt(style: PromptStyle, custom?: string): string {
  if (style === 'custom') {
    return custom || '';
  }

  const template = PROMPT_TEMPLATES.find((t) => t.style === style);
  return template?.prompt || DEFAULT_PROMPT;
}