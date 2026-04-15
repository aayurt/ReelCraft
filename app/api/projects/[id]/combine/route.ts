import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, videos } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { combineVideos } from "@/lib/video-generator";
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
  const { videos: videoClips, audioUrl } = body;
  
  if (!videoClips || videoClips.length === 0) {
    return Response.json({ error: "No videos to combine" }, { status: 400 });
  }
  
  const outputDir = join(process.cwd(), "uploads", "combined", id);
  await mkdir(outputDir, { recursive: true });
  
  const outputPath = join(outputDir, `${Date.now()}-combined.mp4`);
  
  try {
    await combineVideos({
      videos: videoClips,
      audioUrl,
      outputPath,
    });

    const outputFilename = outputPath.split('/').pop() || '';
    const outputUrl = `/uploads/combined/${id}/${outputFilename}`;
    
    const newVideo = await db.insert(videos).values({
      projectId,
      url: outputUrl,
      filename: outputFilename,
      order: 0,
      duration: 0,
      source: "combined",
    }).returning();

    return Response.json({ success: true, video: newVideo[0] });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Combine failed";
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

  const combinedVideos = await db.query.videos.findMany({
    where: and(
      eq(videos.projectId, projectId),
      eq(videos.source, "combined")
    ),
    orderBy: [desc(videos.createdAt)],
  });

  return Response.json({ videos: combinedVideos });
}