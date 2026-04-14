import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, videos } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

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