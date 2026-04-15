import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, videos } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { captureFrame } from "@/lib/qwen-video";
import { join } from "path";
import { existsSync } from "fs";
import { copyFile, mkdir } from "fs/promises";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, parseInt(id)),
      eq(projects.userId, session.user.id)
    ),
  });
  
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  
  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, parseInt(id)),
    orderBy: images.order,
  });
  
  const projectVideos = await db.query.videos.findMany({
    where: eq(videos.projectId, parseInt(id)),
    orderBy: videos.order,
  });

  // Self-healing: Sync continued frames with predecessor video end-frames if needed
  let needsSyncUpdate = false;
  for (let i = 0; i < projectImages.length - 1; i++) {
    const currentImg = projectImages[i];
    const nextImg = projectImages[i + 1];

    if (nextImg.filename === 'CONTINUE_FRAME') {
      const currentVideo = projectVideos.find(v => v.imageId === currentImg.id);
      if (currentVideo) {
        // Specifically check if the next image points to the PREVIOUS frame's results
        const expectedUrl = `/uploads/videos/${id}/frame_image_${currentImg.id}.jpg`;
        const expectedLocalUrl = `/uploads/videos/${id}/frame_image_local_${currentImg.id}.jpg`;
        
        if (nextImg.url !== expectedUrl && nextImg.url !== expectedLocalUrl) {
          console.log(`[Sync] Frame ${nextImg.id} thumbnail mismatch. Current: ${nextImg.url}, Expected: ${expectedUrl}. Fixing...`);
          try {
            const outputDir = join(process.cwd(), 'uploads', 'videos', id);
            await mkdir(outputDir, { recursive: true });
            
            // Check if one of the expected files already exists from a previous generation/sync
            const fullPath = join(process.cwd(), expectedUrl);
            const fullLocalPath = join(process.cwd(), expectedLocalUrl);
            
            if (existsSync(fullPath)) {
              console.log(`[Sync] Found existing end-frame for predecessor. Pointing Frame ${nextImg.id} to ${expectedUrl}`);
              await db.update(images).set({ url: expectedUrl }).where(eq(images.id, nextImg.id));
              nextImg.url = expectedUrl;
            } else if (existsSync(fullLocalPath)) {
              console.log(`[Sync] Found existing local end-frame for predecessor. Pointing Frame ${nextImg.id} to ${expectedLocalUrl}`);
              await db.update(images).set({ url: expectedLocalUrl }).where(eq(images.id, nextImg.id));
              nextImg.url = expectedLocalUrl;
            } else {
              // Not found, need to capture it fresh
              const videoFullPath = join(process.cwd(), currentVideo.url);
              if (existsSync(videoFullPath)) {
                console.log(`[Sync] No existing end-frame found. Capturing fresh from ${videoFullPath}...`);
                const tempFramePath = await captureFrame(videoFullPath, 'end');
                
                const destFilename = `frame_image_${currentImg.id}.jpg`;
                const destPath = join(outputDir, destFilename);
                
                await copyFile(tempFramePath, destPath);
                const frameRelUrl = `/uploads/videos/${id}/${destFilename}`;
                
                await db.update(images).set({ url: frameRelUrl }).where(eq(images.id, nextImg.id));
                nextImg.url = frameRelUrl;
                console.log(`[Sync] Captured and updated Frame ${nextImg.id}.`);
              }
            }
          } catch (err) {
            console.error(`[Sync] Failed to fix frame ${nextImg.id}:`, err);
          }
        }
      }
    }
  }
  
  return Response.json({ ...project, images: projectImages, videos: projectVideos });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { name, defaultDuration, transitionType, transitionDuration, audioUrl, status } = body;
  
  const [updated] = await db.update(projects)
    .set({ name, defaultDuration, transitionType, transitionDuration, audioUrl, status })
    .where(and(
      eq(projects.id, parseInt(id)),
      eq(projects.userId, session.user.id)
    ))
    .returning();
  
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  
  return Response.json(updated);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { name, defaultDuration, transitionType, transitionDuration, audioUrl, status } = body;
  
  const [updated] = await db.update(projects)
    .set({ name, defaultDuration, transitionType, transitionDuration, audioUrl, status })
    .where(and(
      eq(projects.id, parseInt(id)),
      eq(projects.userId, session.user.id)
    ))
    .returning();
  
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  
  return Response.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectIdNum = parseInt(id);

  await db.delete(videos).where(eq(videos.projectId, projectIdNum));
  await db.delete(images).where(eq(images.projectId, projectIdNum));
  
  const [deleted] = await db.delete(projects)
    .where(and(
      eq(projects.id, projectIdNum),
      eq(projects.userId, session.user.id)
    ))
    .returning();
  
  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  
  return Response.json({ success: true });
}