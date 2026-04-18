import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { images, characters } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generatePrompt, type PromptStyle } from "@/lib/qwen-prompts";
import { spawn } from "child_process";
import path from "path";

export const dynamic = 'force-dynamic';

type VideoStyle = 'cinematic' | 'anime' | 'documentary' | 'commercial' | 'abstract' | 'portrait' | 'product' | 'nature' | 'sci-fi' | 'fantasy' | 'horror' | 'romance' | 'comedy';
type Genre = 'action' | 'romance' | 'horror' | 'comedy' | 'sci-fi' | 'drama' | 'thriller' | 'documentary' | 'musical' | 'sports';
type MotionIntensity = 'slow' | 'medium' | 'fast';
type CameraMovement = 'static' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'orbit' | 'dolly';
type LightingMood = 'natural' | 'golden-hour' | 'neon' | 'studio' | 'dramatic' | 'low-key';
type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';
type Duration = 3 | 4 | 5 | 6;

interface WizardParams {
  frameIds: number[];
  characterIds?: number[];
  style?: VideoStyle;
  genres?: Genre[];
  motionIntensity?: MotionIntensity;
  cameraMovement?: CameraMovement;
  lightingMood?: LightingMood;
  aspectRatio?: AspectRatio;
  duration?: Duration;
  mode?: "generate" | "enhance";
}

function buildCharacterContext(chars: any[]): string {
  if (chars.length === 0) return "";
  const charList = chars.map(c => {
    let desc = `Character '${c.name}': ${c.visualDescription}. Voice: ${c.voiceDescription}.`;
    if (c.personality) desc += ` Personality: ${c.personality}.`;
    return desc;
  }).join(" ");
  return `${charList} Keep all characters consistent throughout the video.`;
}

function buildStyleContext(style: VideoStyle | undefined): string {
  if (!style) return "";
  const styleMap: Record<VideoStyle, string> = {
    'cinematic': 'Cinematic film style with professional cinematography.',
    'anime': 'Anime Japanese animation style with bold lines and expressive motion.',
    'documentary': 'Documentary style with realistic handheld camera and natural lighting.',
    'commercial': 'High-end commercial advertising style with polished visuals.',
    'abstract': 'Abstract artistic style with experimental shapes and colors.',
    'portrait': 'Portrait style focusing on the subject with soft focus.',
    'product': 'Product photography style with clean studio lighting.',
    'nature': 'Nature documentary style with environmental cinematography.',
    'sci-fi': 'Science fiction style with futuristic and technological elements.',
    'fantasy': 'Fantasy style with magical and ethereal visuals.',
    'horror': 'Horror style with dark atmosphere and suspenseful lighting.',
    'romance': 'Romantic style with warm soft lighting and emotional tone.',
    'comedy': 'Comedy style with lively and upbeat visual mood.',
  };
  return styleMap[style] || "";
}

function buildGenreContext(genres: Genre[] | undefined): string {
  if (!genres || genres.length === 0) return "";
  return `Genre: ${genres.join(', ')}.`;
}

function buildMotionContext(motion: MotionIntensity | undefined): string {
  if (!motion) return "";
  const motionMap: Record<MotionIntensity, string> = {
    'slow': 'Slow, gentle motion.',
    'medium': 'Moderate, balanced motion.',
    'fast': 'Fast, dynamic motion.',
  };
  return motionMap[motion] || "";
}

function buildCameraContext(camera: CameraMovement | undefined): string {
  if (!camera) return "";
  const cameraMap: Record<CameraMovement, string> = {
    'static': 'Camera remains static.',
    'pan-left': 'Camera pans left smoothly.',
    'pan-right': 'Camera pans right smoothly.',
    'zoom-in': 'Camera slowly zooms in.',
    'zoom-out': 'Camera slowly zooms out.',
    'orbit': 'Camera orbits around the subject.',
    'dolly': 'Camera dolly movement.',
  };
  return cameraMap[camera] || "";
}

function buildLightingContext(lighting: LightingMood | undefined): string {
  if (!lighting) return "";
  const lightingMap: Record<LightingMood, string> = {
    'natural': 'Natural daylight lighting.',
    'golden-hour': 'Golden hour warm lighting.',
    'neon': 'Neon lighting with vibrant colors.',
    'studio': 'Professional studio lighting.',
    'dramatic': 'Dramatic chiaroscuro lighting.',
    'low-key': 'Low-key dark atmospheric lighting.',
  };
  return lightingMap[lighting] || "";
}

function buildAspectRatioContext(aspect: AspectRatio | undefined): string {
  if (!aspect) return "";
  const aspectMap: Record<AspectRatio, string> = {
    '16:9': 'Aspect ratio 16:9 for widescreen.',
    '9:16': 'Aspect ratio 9:16 for vertical video.',
    '1:1': 'Aspect ratio 1:1 for square format.',
    '4:3': 'Aspect ratio 4:3 for standard format.',
  };
  return aspectMap[aspect] || "";
}

function buildWizardContext(params: WizardParams, chars: any[]): string {
  const parts: string[] = [];
  
  const charCtx = buildCharacterContext(chars);
  if (charCtx) parts.push(charCtx);
  
  const styleCtx = buildStyleContext(params.style);
  if (styleCtx) parts.push(styleCtx);
  
  const genreCtx = buildGenreContext(params.genres);
  if (genreCtx) parts.push(genreCtx);
  
  const motionCtx = buildMotionContext(params.motionIntensity);
  if (motionCtx) parts.push(motionCtx);
  
  const cameraCtx = buildCameraContext(params.cameraMovement);
  if (cameraCtx) parts.push(cameraCtx);
  
  const lightingCtx = buildLightingContext(params.lightingMood);
  if (lightingCtx) parts.push(lightingCtx);
  
  const aspectCtx = buildAspectRatioContext(params.aspectRatio);
  if (aspectCtx) parts.push(aspectCtx);
  
  if (params.duration) {
    parts.push(`Duration: ${params.duration} seconds.`);
  }
  
  return parts.join(" ");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { 
    frameIds, 
    characterIds, 
    style, 
    genres, 
    motionIntensity, 
    cameraMovement, 
    lightingMood, 
    aspectRatio, 
    duration,
    mode 
  } = body as WizardParams;

  if (!frameIds || frameIds.length === 0) {
    return NextResponse.json({ error: "No frames selected" }, { status: 400 });
  }

  const frames = await db.query.images.findMany({
    where: inArray(images.id, frameIds),
  });

  if (frames.length === 0) {
    return NextResponse.json({ error: "Frames not found" }, { status: 404 });
  }

  let projectCharacters = await db.query.characters.findMany({
    where: eq(characters.projectId, projectId),
  });

  if (characterIds && characterIds.length > 0) {
    const selectedChars = projectCharacters.filter(c => characterIds.includes(c.id));
    projectCharacters = selectedChars;
  }

  const wizardCtx = buildWizardContext(
    { frameIds: [], style, genres, motionIntensity, cameraMovement, lightingMood, aspectRatio, duration },
    projectCharacters
  );
  const charContext = buildCharacterContext(projectCharacters);

  try {
    const results = [];

    for (const frame of frames) {
      const basePrompt = frame.prompt || generatePrompt(style as PromptStyle, "");
      
      let promptInput: string;
      if (mode === "enhance") {
        promptInput = wizardCtx ? `${wizardCtx} ${basePrompt}` : basePrompt;
      } else {
        const parts: string[] = [];
        if (wizardCtx) parts.push(wizardCtx);
        parts.push(`Image: ${frame.filename}`);
        promptInput = parts.join(" ");
      }
      
      const geminiPrompt = `Create a detailed AI video generation prompt. Keep it under 100 words. Only output the enhanced prompt nothing else:\n\n${promptInput}`;

      console.log(`🎨 Generating prompt for frame ${frame.order}...`);
      
      const enhancedPrompt = await new Promise<string>((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'generate-prompt.js');
        const child = spawn('node', [scriptPath, geminiPrompt], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        
        let output = '';
        let error = '';
        
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error(error || 'Script failed'));
          }
        });
        
        child.on('error', reject);
      });
      
      results.push({
        frameId: frame.id,
        originalPrompt: promptInput,
        enhancedPrompt: enhancedPrompt.trim(),
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json({ error: "Failed to generate prompts" }, { status: 500 });
  }
}