import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, videos } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
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
  
  const projectVideos = await db.query.videos.findMany({
    where: eq(videos.projectId, projectId),
    orderBy: [desc(videos.order)],
  });
  
  return Response.json(projectVideos);
}

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
  
  const contentType = request.headers.get("Content-Type") || "";
  
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), "uploads", "videos", id);
    await mkdir(uploadDir, { recursive: true });
    
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);
    
    const projectVideos = await db.query.videos.findMany({
      where: eq(videos.projectId, projectId),
    });
    
    const [video] = await db.insert(videos).values({
      projectId,
      url: `/uploads/videos/${id}/${filename}`,
      filename: file.name,
      order: projectVideos.length + 1,
      duration: project.defaultDuration,
      transitionType: "none",
      transitionDuration: 1,
      source: "manual",
    }).returning();
    
    return Response.json(video);
  }
  
  const body = await request.json();
  const { url, filename: fname, duration, transitionType, transitionDuration, source } = body;
  
  if (!url || !fname) {
    return Response.json({ error: "url and filename required" }, { status: 400 });
  }
  
  const projectVideos = await db.query.videos.findMany({
    where: eq(videos.projectId, projectId),
  });
  
  const [video] = await db.insert(videos).values({
    projectId,
    url,
    filename: fname,
    order: projectVideos.length + 1,
    duration: duration || project.defaultDuration,
    transitionType: transitionType || "none",
    transitionDuration: transitionDuration || 1,
    source: source || "generated",
  }).returning();
  
  return Response.json(video);
}