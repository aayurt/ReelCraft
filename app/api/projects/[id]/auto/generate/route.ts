import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { images } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generatePrompt, type PromptStyle } from "@/lib/qwen-prompts";
import { spawn } from "child_process";
import path from "path";

export const dynamic = 'force-dynamic';

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
  const { frameIds, promptStyle, customPrompt, mode } = body;

  if (!frameIds || frameIds.length === 0) {
    return NextResponse.json({ error: "No frames selected" }, { status: 400 });
  }

  const frames = await db.query.images.findMany({
    where: inArray(images.id, frameIds),
  });

  if (frames.length === 0) {
    return NextResponse.json({ error: "Frames not found" }, { status: 404 });
  }

  try {
    const results = [];

    for (const frame of frames) {
      const basePrompt = frame.prompt || generatePrompt(promptStyle as PromptStyle, customPrompt);
      
      let geminiPrompt: string;
      if (mode === "enhance") {
        geminiPrompt = `Enhance this prompt for AI video generation. Keep it concise (under 100 words). Only output the enhanced prompt nothing else:\n\n${basePrompt}`;
      } else {
        geminiPrompt = `Create a detailed prompt for AI video generation based on this image description. Include camera movement, lighting, and motion details. Keep it concise (under 100 words). Only output the prompt nothing else:\n\nImage: ${frame.filename}`;
      }

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
        originalPrompt: basePrompt,
        enhancedPrompt: enhancedPrompt.trim(),
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json({ error: "Failed to generate prompts" }, { status: 500 });
  }
}