import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, generations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

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
  
  const lastGen = await db.query.generations.findFirst({
    where: and(
      eq(generations.projectId, projectId),
      eq(generations.status, "completed")
    ),
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });
  
  if (!lastGen || !lastGen.outputUrl) {
    return Response.json({ error: "No generated video to export" }, { status: 400 });
  }
  
  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });
  
  const exportData = {
    projectName: project.name,
    videoPath: lastGen.outputUrl,
    thumbnailUrl: lastGen.thumbnailUrl,
    images: projectImages,
    settings: {
      defaultDuration: project.defaultDuration,
      transitionType: project.transitionType,
      transitionDuration: project.transitionDuration,
    },
    generatedAt: lastGen.completedAt,
  };
  
  return Response.json({
    success: true,
    videoPath: lastGen.outputUrl,
    exportData,
  });
}