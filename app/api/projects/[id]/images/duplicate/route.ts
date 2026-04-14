import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

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
  
  const [newImage] = await db.insert(images).values({
    projectId,
    url: sourceImage.url,
    filename: "CONTINUE_FRAME",
    order: allProjectImages.length,
    duration: sourceImage.duration,
  }).returning();
  
  return Response.json(newImage);
}
