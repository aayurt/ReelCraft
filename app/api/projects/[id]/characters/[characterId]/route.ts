import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, characters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id, characterId } = await params;
  const projectId = Number(id);
  const charId = Number(characterId);

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

  const character = await db.query.characters.findFirst({
    where: and(
      eq(characters.id, charId),
      eq(characters.projectId, projectId)
    ),
  });

  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json(character);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id, characterId } = await params;
  const projectId = Number(id);
  const charId = Number(characterId);

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

  const [updated] = await db.update(characters)
    .set({
      ...(name && { name }),
      ...(visualDescription && { visualDescription }),
      ...(voiceDescription && { voiceDescription }),
      ...(personality !== undefined && { personality }),
      ...(referenceImageUrl !== undefined && { referenceImageUrl }),
    })
    .where(and(
      eq(characters.id, charId),
      eq(characters.projectId, projectId)
    ))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id, characterId } = await params;
  const projectId = Number(id);
  const charId = Number(characterId);

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

  const [deleted] = await db.delete(characters)
    .where(and(
      eq(characters.id, charId),
      eq(characters.projectId, projectId)
    ))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}