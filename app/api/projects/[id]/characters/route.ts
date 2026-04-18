import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, characters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, session.user.id)
    ),
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const projectCharacters = await db.query.characters.findMany({
    where: eq(characters.projectId, projectId),
  });

  return NextResponse.json(projectCharacters);
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, session.user.id)
    ),
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, visualDescription, voiceDescription, personality, referenceImageUrl } = body;

  if (!name || !visualDescription || !voiceDescription) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [character] = await db.insert(characters).values({
    projectId,
    name,
    visualDescription,
    voiceDescription,
    personality: personality || null,
    referenceImageUrl: referenceImageUrl || null,
  }).returning();

  return NextResponse.json(character);
}