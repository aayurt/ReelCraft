import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images as imagesSchema } from "@/lib/schema";
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
  
  const { images } = await request.json();
  
  if (!images || !Array.isArray(images)) {
    return Response.json({ error: "Invalid images array" }, { status: 400 });
  }
  
  // Use a transaction or sequential updates
  for (const img of images) {
    await db.update(imagesSchema)
      .set({ order: img.order })
      .where(and(eq(imagesSchema.id, img.id), eq(imagesSchema.projectId, projectId)));
  }
  
  return Response.json({ success: true });
}
