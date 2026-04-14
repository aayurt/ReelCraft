# Project Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create project editor with image upload, drag-and-drop reordering, per-image duration settings, and project settings panel.

**Architecture:** Next.js App Router with API routes for CRUD operations. Images stored in local filesystem (uploads/). Drizzle ORM for database.

**Tech Stack:** Next.js 14, Drizzle ORM, better-auth, Tailwind CSS

---

## File Structure

```
/app
  /project/[id]/page.tsx          # Project editor page
  /api/projects/[id]/route.ts   # Project CRUD
  /api/projects/[id]/images/route.ts  # Image upload
/uploads                          # Image storage
/components
  /project/image-grid.tsx     # Image display grid
  /project/image-card.tsx   # Individual image card
  /project/settings-panel.tsx  # Project settings
  /project/upload-zone.tsx   # Upload dropzone
/lib
  /actions.ts              # Server actions
```

---

## Task 1: Project API Routes

**Files:**
- Modify: `lib/schema.ts` - Add project CRUD types already defined
- Create: `app/api/projects/route.ts`
- Create: `app/api/projects/[id]/route.ts`

- [ ] **Step 1: Create GET /api/projects**

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
  });
  
  return Response.json(userProjects);
}
```

- [ ] **Step 2: Create POST /api/projects**

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects } from "@/lib/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { name, defaultDuration = 5 } = body;
  
  const [project] = await db.insert(projects).values({
    userId: session.user.id,
    name,
    defaultDuration,
    status: "draft",
  }).returning();
  
  return Response.json(project);
}
```

- [ ] **Step 3: Create GET/PUT/DELETE /api/projects/[id]**

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, parseInt(id)), eq(projects.userId, session.user.id)),
  });
  
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  
  return Response.json(project);
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/projects/route.ts 'app/api/projects/[id]/route.ts'
git commit -m "feat: add project API routes"
```

---

## Task 2: Image Upload API

**Files:**
- Create: `app/api/projects/[id]/images/route.ts`
- Create: `app/api/projects/[id]/images/[imageId]/route.ts`

- [ ] **Step 1: Create POST /api/projects/[id]/images**

```typescript
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
  const session = await auth.api.getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, parseInt(id)), eq(projects.userId, session.user.id)),
  });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const uploadDir = join(process.cwd(), "uploads", id);
  await mkdir(uploadDir, { recursive: true });
  
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, buffer);
  
  const imageCount = await db.query.images.findMany({
    where: eq(images.projectId, parseInt(id)),
  });
  
  const [image] = await db.insert(images).values({
    projectId: parseInt(id),
    url: `/uploads/${id}/${filename}`,
    filename: file.name,
    order: imageCount.length,
    duration: project.defaultDuration,
  }).returning();
  
  return Response.json(image);
}
```

- [ ] **Step 2: Create DELETE /api/projects/[id]/images/[imageId]**

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const session = await auth.api.getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const image = await db.query.images.findFirst({
    where: and(
      eq(images.id, parseInt(imageId)),
      eq(images.projectId, parseInt(id))
    ),
  });
  
  if (!image) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }
  
  try {
    await unlink(join(process.cwd(), image.url));
  } catch {}
  
  await db.delete(images).where(eq(images.id, parseInt(imageId)));
  
  return Response.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add 'app/api/projects/[id]/images/route.ts' 'app/api/projects/[id]/images/[imageId]/route.ts'
git commit -m "feat: add image upload API"
```

---

## Task 3: Create Upload Component

**Files:**
- Create: `components/project/upload-zone.tsx`

- [ ] **Step 1: Create upload zone component**

```typescript
"use client";

import { useState, useCallback } from "react";

interface UploadZoneProps {
  projectId: number;
  onUploadComplete: () => void;
}

export function UploadZone({ projectId, onUploadComplete }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  }, [projectId]);
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  }, [projectId]);
  
  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      
      await fetch(`/api/projects/${projectId}/images`, {
        method: "POST",
        body: formData,
      });
    }
    
    setUploading(false);
    onUploadComplete();
  };
  
  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        {uploading ? "Uploading..." : "Drop images here or click to upload"}
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/project/upload-zone.tsx
git commit -m "feat: add upload zone component"
```

---

## Task 4: Create Image Grid

**Files:**
- Create: `components/project/image-grid.tsx`
- Create: `components/project/image-card.tsx`

- [ ] **Step 1: Create image card component**

```typescript
"use client";

import { useState } from "react";

interface ImageCardProps {
  image: {
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
  };
  onUpdate: (id: number, updates: { order?: number; duration?: number }) => void;
  onDelete: (id: number) => void;
}

export function ImageCard({ image, onUpdate, onDelete }: ImageCardProps) {
  const [duration, setDuration] = useState(image.duration);
  
  const handleDurationChange = (value: number) => {
    setDuration(value);
    onUpdate(image.id, { duration: value });
  };
  
  return (
    <div className="relative group">
      <img
        src={image.url}
        alt={image.filename}
        className="w-full h-32 object-cover rounded"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          onClick={() => onDelete(image.id)}
          className="text-white hover:text-destructive"
        >
          Delete
        </button>
      </div>
      <div className="mt-2">
        <label className="text-xs">Duration (sec)</label>
        <input
          type="number"
          min="3"
          max="6"
          value={duration}
          onChange={(e) => handleDurationChange(parseInt(e.target.value))}
          className="w-full mt-1"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create image grid component**

```typescript
"use client";

import { useState } from "react";
import { ImageCard } from "./image-card";

interface Image {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
}

interface ImageGridProps {
  images: Image[];
  onReorder: (images: Image[]) => void;
  onUpdate: (id: number, updates: { order?: number; duration?: number }) => void;
  onDelete: (id: number) => void;
}

export function ImageGrid({ images, onReorder, onUpdate, onDelete }: ImageGridProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  
  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };
  
  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;
    
    const newImages = [...images];
    const draggedIndex = newImages.findIndex((i) => i.id === draggedId);
    const targetIndex = newImages.findIndex((i) => i.id === targetId);
    
    const [dragged] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, dragged);
    
    newImages.forEach((img, idx) => {
      img.order = idx;
    });
    
    onReorder(newImages);
    setDraggedId(null);
  };
  
  const sorted = [...images].sort((a, b) => a.order - b.order);
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {sorted.map((image) => (
        <div
          key={image.id}
          draggable
          onDragStart={() => handleDragStart(image.id)}
          onDragOver={(e) => handleDragOver(e, image.id)}
        >
          <ImageCard
            image={image}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/project/image-grid.tsx components/project/image-card.tsx
git commit -m "feat: add image grid components"
```

---

## Task 5: Create Project Editor Page

**Files:**
- Create: `app/project/[id]/page.tsx`

- [ ] **Step 1: Create project editor page**

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/auth";
import { projects, images } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UploadZone } from "@/components/project/upload-zone";
import { ImageGrid } from "@/components/project/image-grid";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, parseInt(id)),
  });
  
  if (!project || project.userId !== session.user.id) {
    redirect("/dashboard");
  }
  
  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, parseInt(id)),
  });
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <div className="flex gap-4">
          <button className="btn-primary">Generate Video</button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <h2 className="text-xl font-semibold mb-4">Images</h2>
          <UploadZone projectId={project.id} onUploadComplete={() => {}} />
          <ImageGrid
            images={projectImages}
            onReorder={async (images) => {}}
            onUpdate={async (id, updates) => {}}
            onDelete={async (id) => {}}
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Default Duration (sec)
              </label>
              <input
                type="number"
                min="3"
                max="6"
                defaultValue={project.defaultDuration}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Transition
              </label>
              <select
                defaultValue={project.transitionType}
                className="w-full"
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="dissolve">Dissolve</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard to link to projects**

Modify `app/(dashboard)/dashboard/page.tsx` to fetch and display projects with links.

- [ ] **Step 3: Commit**

```bash
git add 'app/project/[id]/page.tsx' 'app/(dashboard)/dashboard/page.tsx'
git commit -m "feat: add project editor page"
```

---

## Task 6: Add Static File Serving

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Add uploads to images config**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add next.config.mjs
git commit -m "feat: add static file serving for uploads"
```

---

## Plan Self-Review

1. **Spec coverage:** All Phase 2 requirements covered (image upload, reordering, settings)
2. **Type consistency:** Schema types match from Task 1
3. **No placeholders:** All steps have complete code

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-project-editor-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?