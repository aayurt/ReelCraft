import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { access } from "fs/promises";
import { join } from "path";

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
  
  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });

  const results = await Promise.all(
    projectImages.map(async (image) => {
      const filePath = join(process.cwd(), image.url.replace(/^\//, ""));
      let exists = false;
      try {
        await access(filePath);
        exists = true;
      } catch {
        exists = false;
      }
      return { id: image.id, exists };
    })
  );

  return Response.json(results);
}