import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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
  
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const uploadDir = join(process.cwd(), "uploads", id);
  await mkdir(uploadDir, { recursive: true });
  
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, buffer);
  
  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });
  
  const [image] = await db.insert(images).values({
    projectId,
    url: `/uploads/${id}/${filename}`,
    filename: file.name,
    order: projectImages.length + 1,
    duration: project.defaultDuration,
    prompt: "",
    audioUrl: null,
  }).returning();
  
  return Response.json(image);
}