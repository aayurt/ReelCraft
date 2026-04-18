import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images, videos, characters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProjectEditorClient } from "@/components/project/project-editor-client";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    redirect("/login");
  }
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, session.user.id)
    ),
  });
  
  if (!project) {
    redirect("/dashboard");
  }
  
  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
    columns: {
      id: true,
      url: true,
      filename: true,
      order: true,
      duration: true,
      prompt: true,
      audioUrl: true,
    },
  });
  
  const projectVideos = await db.query.videos.findMany({
    where: eq(videos.projectId, projectId),
    columns: {
      id: true,
      url: true,
      filename: true,
      order: true,
      duration: true,
      transitionType: true,
      transitionDuration: true,
      source: true,
      imageId: true,
    },
  });
  
  const projectCharacters = await db.query.characters.findMany({
    where: eq(characters.projectId, projectId),
  });
  
  return (
    <ProjectEditorClient 
      project={project} 
      imagesList={projectImages}
      videosList={projectVideos}
      charactersList={projectCharacters}
    />
  );
}