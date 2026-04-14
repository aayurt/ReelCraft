import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const headersList = await import("next/headers").then(h => h.headers());
  const session = await auth.api.getSession({ headers: headersList });
  console.log({ session })
  if (!session) {
    redirect("/login");
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
        <div className="grid grid-cols-3 gap-4">
          {userProjects.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`}>
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Status: {project.status}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}