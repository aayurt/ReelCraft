"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Project {
  id: number;
  name: string;
  status: string;
  createdAt: Date;
}

interface DashboardClientProps {
  projects: Project[];
}

export function DashboardClient({ projects }: DashboardClientProps) {
  const [projectList, setProjectList] = useState(projects);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setProjectToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setDeletingId(projectToDelete);
    setShowConfirm(false);

    try {
      const res = await fetch(`/api/projects/${projectToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjectList(projectList.filter(p => p.id !== projectToDelete));
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setDeletingId(null);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setProjectToDelete(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {projectList.map((project) => (
          <div key={project.id} className="relative group">
            <Link href={`/project/${project.id}`}>
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
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteClick(project.id);
              }}
              disabled={deletingId === project.id}
            >
              {deletingId === project.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Delete Project?</h2>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this project? This action cannot be undone and all frames and videos will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
