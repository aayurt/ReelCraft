import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects } from "@/lib/schema";

export async function GET() {
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session || !session.data) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userProjects = await db.query.projects.findMany({
    where: (p, { eq }) => eq(p.userId, session.data.user.id),
  });
  
  return Response.json(userProjects);
}

export async function POST(request: Request) {
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session || !session.data) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { name, defaultDuration = 5 } = body;
  
  const [project] = await db.insert(projects).values({
    userId: session.data.user.id,
    name,
    defaultDuration,
    status: "draft",
  }).returning();
  
  return Response.json(project);
}