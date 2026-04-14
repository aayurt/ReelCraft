import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, videos } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const { id, videoId } = await params;
  const projectId = Number(id);
  const videoIdNum = Number(videoId);
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
  
  const video = await db.query.videos.findFirst({
    where: and(
      eq(videos.id, videoIdNum),
      eq(videos.projectId, projectId)
    ),
  });
  
  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }
  
  return Response.json(video);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const { id, videoId } = await params;
  const projectId = Number(id);
  const videoIdNum = Number(videoId);
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
  
  const video = await db.query.videos.findFirst({
    where: and(
      eq(videos.id, videoIdNum),
      eq(videos.projectId, projectId)
    ),
  });
  
  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }
  
  const body = await request.json();
  const { order, duration, transitionType, transitionDuration } = body;
  
  const [updated] = await db.update(videos).set({
    ...(order !== undefined && { order }),
    ...(duration !== undefined && { duration }),
    ...(transitionType !== undefined && { transitionType }),
    ...(transitionDuration !== undefined && { transitionDuration }),
  }).where(eq(videos.id, videoIdNum)).returning();
  
  return Response.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const { id, videoId } = await params;
  const projectId = Number(id);
  const videoIdNum = Number(videoId);
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
  
  const video = await db.query.videos.findFirst({
    where: and(
      eq(videos.id, videoIdNum),
      eq(videos.projectId, projectId)
    ),
  });
  
  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }
  
  await db.delete(videos).where(eq(videos.id, videoIdNum));
  
  return Response.json({ success: true });
}