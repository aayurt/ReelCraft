import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const projectId = Number(id);
  const imageIdNum = Number(imageId);
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
  
  const image = await db.query.images.findFirst({
    where: and(
      eq(images.id, imageIdNum),
      eq(images.projectId, projectId)
    ),
  });
  
  if (!image) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }
  
  try {
    await unlink(join(process.cwd(), image.url));
  } catch {
    // File may not exist, continue anyway
  }

  if (image.audioUrl) {
    try {
      await unlink(join(process.cwd(), image.audioUrl));
    } catch {
      // File may not exist, continue anyway
    }
  }
  
  await db.delete(images).where(eq(images.id, imageIdNum));
  
  return Response.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const projectId = Number(id);
  const imageIdNum = Number(imageId);
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
  
  const updates = await request.json();
  
  await db.update(images)
    .set({ duration: updates.duration, order: updates.order, prompt: updates.prompt, audioUrl: updates.audioUrl })
    .where(and(eq(images.id, imageIdNum), eq(images.projectId, projectId)));
    
  return Response.json({ success: true });
}