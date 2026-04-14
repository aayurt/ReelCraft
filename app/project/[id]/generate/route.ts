import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, generations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateVideo, captureFrame } from "@/lib/video-generator";
import { mkdir } from "fs/promises";
import { join } from "path";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, session.user.id)
    ),
  });
  
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  
  const body = await request.json();
  const { type = "new" } = body;
  
  const imageList = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });
  
  if (imageList.length === 0) {
    return Response.json({ error: "No images in project" }, { status: 400 });
  }
  
  const outputDir = join(process.cwd(), "uploads", id, "generated");
  await mkdir(outputDir, { recursive: true });
  
  const outputPath = join(outputDir, `${Date.now()}-video.mp4`);
  
  const [generation] = await db.insert(generations).values({
    projectId,
    type,
    status: "processing",
  }).returning();
  
  try {
    await generateVideo({
      projectId,
      images: imageList.map(img => ({ url: img.url, duration: img.duration })),
      transitionType: project.transitionType as any,
      transitionDuration: project.transitionDuration,
      audioUrl: project.audioUrl,
      outputPath,
    });
    
    await db.update(generations)
      .set({ status: "completed", outputUrl: outputPath, completedAt: new Date() })
      .where(eq(generations.id, generation.id));
    
    return Response.json({ success: true, outputUrl: outputPath });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
    
    await db.update(generations)
      .set({ status: "failed" })
      .where(eq(generations.id, generation.id));
    
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, session.user.id)
    ),
  });
  
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  
  const generationList = await db.query.generations.findMany({
    where: eq(generations.projectId, projectId),
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });
  
  return Response.json(generationList);
}