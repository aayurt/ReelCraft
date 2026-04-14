import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, videos } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
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
  const { videos: videoOrders } = body;
  
  if (!Array.isArray(videoOrders)) {
    return Response.json({ error: "videos array required" }, { status: 400 });
  }
  
  for (const { id, order } of videoOrders) {
    await db.update(videos).set({ order }).where(eq(videos.id, id));
  }
  
  return Response.json({ success: true });
}