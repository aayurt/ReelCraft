import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, videos } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { captureFrame } from "@/lib/qwen-video";
import { join } from "path";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

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
  const { imageId } = body;
  
  if (!imageId) {
    return Response.json({ error: "No imageId provided" }, { status: 400 });
  }
  
  const sourceImage = await db.query.images.findFirst({
    where: and(eq(images.id, Number(imageId)), eq(images.projectId, projectId)),
  });
  
  if (!sourceImage) {
    return Response.json({ error: "Source image not found" }, { status: 404 });
  }
  
  const allProjectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });

  // Check if there's an existing video for the source image to capture its end frame
  let imageUrl = sourceImage.url;
  const sourceVideo = await db.query.videos.findFirst({
    where: and(eq(videos.imageId, sourceImage.id), eq(videos.projectId, projectId)),
  });

  if (sourceVideo) {
    try {
      const videoFullPath = join(process.cwd(), sourceVideo.url);
      if (existsSync(videoFullPath)) {
        console.log(`[Duplicate] Found video for source image. Capturing end frame from ${videoFullPath}`);
        const tempFramePath = await captureFrame(videoFullPath, 'end');
        
        const outputDir = join(process.cwd(), 'uploads', 'videos', id);
        await mkdir(outputDir, { recursive: true });
        
        const destFilename = `frame_image_dup_${Date.now()}.jpg`;
        const destPath = join(outputDir, destFilename);
        
        await copyFile(tempFramePath, destPath);
        imageUrl = `/uploads/videos/${id}/${destFilename}`;
        console.log(`[Duplicate] Captured and saved new end-frame: ${imageUrl}`);
      }
    } catch (err) {
      console.error("[Duplicate] Failed to capture frame during duplication:", err);
      // Fallback to sourceImage.url is already set
    }
  }
  
  const [newImage] = await db.insert(images).values({
    projectId,
    url: imageUrl,
    filename: "CONTINUE_FRAME",
    order: allProjectImages.length + 1,
    duration: sourceImage.duration,
    prompt: sourceImage.prompt,
    audioUrl: sourceImage.audioUrl,
  }).returning();
  
  return Response.json(newImage);
}
