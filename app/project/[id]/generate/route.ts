import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, videos, generations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateVideo, captureFrame } from "@/lib/video-generator";
import { mkdir, unlink } from "fs/promises";
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
  const { frameTransitions = {} } = body;
  
  const imageList = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });
  
  if (imageList.length === 0) {
    return Response.json({ error: "No images in project" }, { status: 400 });
  }
  
  const outputDir = join(process.cwd(), "uploads", "videos", id);
  await mkdir(outputDir, { recursive: true });
  
  const sortedImages = [...imageList].sort((a, b) => a.order - b.order);
  const generatedVideos = [];
  
  try {
    for (let i = 0; i < sortedImages.length; i++) {
      const img = sortedImages[i];
      const transitionType = frameTransitions[img.id] || project.transitionType;
      const transitionDuration = project.transitionDuration;
      
      const outputPath = join(outputDir, `${Date.now()}-${i}-video.mp4`);
      
      await generateVideo({
        projectId,
        images: [{ url: img.url, duration: img.duration, transitionType: transitionType as any, transitionDuration }],
        audioUrl: null,
        outputPath,
      });
      
      const existingVideos = await db.query.videos.findMany({
        where: eq(videos.projectId, projectId),
      });
      
      const [video] = await db.insert(videos).values({
        projectId,
        url: `/uploads/videos/${id}/${outputPath.split("/").pop()}`,
        filename: `clip-${i + 1}.mp4`,
        order: existingVideos.length + 1,
        duration: img.duration,
        transitionType: transitionType as any,
        transitionDuration,
        source: "generated",
      }).returning();
      
      generatedVideos.push(video);
    }
    
    return Response.json({ success: true, videos: generatedVideos });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
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