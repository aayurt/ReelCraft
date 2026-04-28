import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardClient } from "@/components/dashboard-client";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/rbac";

export default async function DashboardPage() {
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  console.log({ session })
  // Server-side gating: require authentication first
  if (!session) {
    redirect("/login");
  }
  // If authenticated but not authorized, show NotAuthorized page
  const isModerator = canAccess(session?.user as any, "VIEW_DASHBOARD");
  if (!isModerator) {
    redirect("/not-authorized");
  }

  const userProjects = await db.query.projects.findMany({
    where: (p, { eq }) => eq(p.userId, session.user.id),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <form action={async () => {
          "use server";
          const headersList = await import("next/headers").then(h => h.headers());
          const session = await auth.api.getSession({ headers: headersList });
          if (session) {
            const [project] = await db.insert(projects).values({
              userId: session.user.id,
              name: "New Project",
              status: "draft",
            }).returning();
            redirect(`/project/${project.id}`);
          }
        }}>
          <Button type="submit">Create Project</Button>
        </form>
      </div>

      {userProjects.length === 0 ? (
        <div className="text-muted-foreground">
          No projects yet. Create your first project to get started.
        </div>
      ) : (
        <DashboardClient projects={userProjects} />
      )}
    </div>
  );
}
