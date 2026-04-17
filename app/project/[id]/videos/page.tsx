import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, videos } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { VideosPageClient } from "@/components/project/videos-page-client";

export default async function VideosPage({
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
  
  return (
    <VideosPageClient 
      project={project} 
      videosList={projectVideos}
    />
  );
}