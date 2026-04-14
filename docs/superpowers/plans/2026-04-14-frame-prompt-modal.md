# Frame Prompt Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add required prompt + optional audio per frame. Click frame opens modal with prompt input, audio upload, and delete.

**Architecture:** Add prompt/audioUrl columns to images table. Create FrameModal component. Add FramePromptList at bottom.

**Tech Stack:** Next.js, Drizzle, React

---

### Task 1: Database migration

**Files:**
- Modify: `lib/schema.ts`
- Create: `drizzle/migrations/001_frame_prompt.sql`

- [ ] **Step 1: Add columns to schema**

Modify `lib/schema.ts:68-78` - add prompt and audioUrl to images table:
```ts
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  order: integer("order").notNull(),
  duration: integer("duration").notNull().default(5),
  prompt: text("prompt").notNull(),           // NEW
  audioUrl: text("audio_url"),             // NEW
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Write migration SQL**

Create `drizzle/migrations/001_frame_prompt.sql`:
```sql
ALTER TABLE images ADD COLUMN prompt TEXT NOT NULL DEFAULT '';
ALTER TABLE images ADD COLUMN audio_url TEXT;
-- Set existing rows to have empty prompt
UPDATE images SET prompt = '' WHERE prompt IS NULL;
```

- [ ] **Step 3: Commit**

```bash
git add lib/schema.ts drizzle/migrations/001_frame_prompt.sql
git commit -m "feat: add prompt and audio_url to images table"
```

---

### Task 2: Update image upload API to include prompt

**Files:**
- Modify: `app/api/projects/[id]/images/route.ts`
- Test: Manual test

- [ ] **Step 1: Update route.ts to insert prompt on create**

Modify `app/api/projects/[id]/images/route.ts` - add prompt field insertion (defaults to ''):
```ts
// In INSERT into images:
prompt: '',
audioUrl: null,
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: store prompt on image upload"
```

---

### Task 3: Update image update API for prompt/audioUrl

**Files:**
- Modify: `app/api/projects/[id]/images/[imageId]/route.ts`
- Test: Manual test

- [ ] **Step 1: Update PUT to accept prompt and audioUrl**

Modify `lib/schema.ts` - export Image type with new fields. Then modify route:
```ts
export async function PUT(...) {
  const updates = await request.json();
  await db.update(images)
    .set({ 
      duration: updates.duration, 
      order: updates.order,
      prompt: updates.prompt,        // NEW
      audioUrl: updates.audioUrl,  // NEW
    })
    .where(and(eq(images.id, imageIdNum), eq(images.projectId, projectId)));
  return Response.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: support updating prompt and audio_url per frame"
```

---

### Task 4: Create FrameModal component

**Files:**
- Create: `components/project/frame-modal.tsx`
- Test: Manual test

- [ ] **Step 1: Create FrameModal component**

Create `components/project/frame-modal.tsx`:
```tsx
"use client";

import { useState } from "react";

interface FrameModalProps {
  image: {
    id: number;
    url: string;
    filename: string;
    prompt: string;
    audioUrl: string | null;
    duration: number;
  };
  onClose: () => void;
  onSave: (updates: { prompt: string; audioUrl: string | null; duration?: number }) => void;
  onDelete: () => void;
}

export function FrameModal({ image, onClose, onSave, onDelete }: FrameModalProps) {
  const [prompt, setPrompt] = useState(image.prompt);
  const [audioUrl, setAudioUrl] = useState(image.audioUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!prompt.trim()) return;
    setSaving(true);
    await onSave({ prompt, audioUrl });
    setSaving(false);
    onClose();
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Audio will be uploaded via the same onSave
    // For now, we'll use a data URL for preview
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Frame {image.order || image.id}</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Prompt (required)
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the video content..."
            className="w-full h-32 bg-background border rounded px-3 py-2 resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Audio (optional)
          </label>
          {audioUrl ? (
            <div className="flex items-center gap-2">
              <audio controls src={audioUrl} className="flex-1" />
              <button
                type="button"
                onClick={() => setAudioUrl(null)}
                className="text-red-500 text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              disabled={uploading}
              className="w-full"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!prompt.trim() || saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/project/frame-modal.tsx
git commit -m "feat: add FrameModal component"
```

---

### Task 5: Create FramePromptList component

**Files:**
- Create: `components/project/frame-prompt-list.tsx`
- Test: Manual test

- [ ] **Step 1: Create FramePromptList component**

Create `components/project/frame-prompt-list.tsx`:
```tsx
interface FramePromptListProps {
  images: Array<{
    id: number;
    order: number;
    prompt: string;
  }>;
}

export function FramePromptList({ images }: FramePromptListProps) {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  
  return (
    <div className="border-t pt-4 mt-8">
      <h3 className="text-sm font-semibold mb-2">Frame Prompts</h3>
      <div className="space-y-1">
        {sorted.map((img, idx) => (
          <div key={img.id} className="text-sm text-muted-foreground">
            <span className="font-medium">Frame {idx + 1}:</span> {img.prompt || "(no prompt)"}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/project/frame-prompt-list.tsx
git commit -m "feat: add FramePromptList component"
```

---

### Task 6: Update ImageCard with click modal

**Files:**
- Modify: `components/project/image-card.tsx`
- Test: Manual test

- [ ] **Step 1: Add onClick and remove inline delete**

Modify `image-card.tsx` - add onClick prop and remove hover delete button:
```tsx
interface ImageCardProps {
  image: {
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    prompt: string;
    audioUrl: string | null;
  };
  onClick: () => void;  // NEW
  onUpdate: (id: number, updates: { order?: number; duration?: number }) => void;
  onDelete: (id: number) => void;
}

export function ImageCard({ image, onClick, onUpdate, onDelete }: ImageCardProps) {
  // ... rest of code ...
  // Remove the hover delete button div (lines 51-58)
  // Add onClick to the outer div
  return (
    <div className="relative group" onClick={onClick}>
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: ImageCard opens modal on click"
```

---

### Task 7: Update ImageGrid with modal and prompt list

**Files:**
- Modify: `components/project/image-grid.tsx`
- Test: Manual test

- [ ] **Step 1: Add FrameModal and FramePromptList to ImageGrid**

Modify `image-grid.tsx`:
```tsx
import { FrameModal } from "./frame-modal";
import { FramePromptList } from "./frame-prompt-list";

export function ImageGrid({ projectId, images, onReorder, onUpdate, onDelete, onUploadComplete }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  
  // ... existing code ...
  
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {/* ... existing grid ... */}
      </div>
      
      <FramePromptList images={images} />
      
      {selectedImage && (
        <FrameModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onSave={async (updates) => {
            await onUpdate(selectedImage.id, updates);
            setSelectedImage(null);
          }}
          onDelete={() => {
            onDelete(selectedImage.id);
            setSelectedImage(null);
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Add onClick to ImageCard**

In the ImageCard rendering, add onClick handler:
```tsx
<ImageCard
  image={image}
  onClick={() => setSelectedImage(image)}
  onUpdate={onUpdate}
  onDelete={onDelete}
/>
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: integrate FrameModal and FramePromptList in ImageGrid"
```

---

### Task 8: Update parent components with new Image type

**Files:**
- Modify: `components/project/project-editor-client.tsx`
- Modify: `app/project/[id]/page.tsx`
- Test: Manual test

- [ ] **Step 1: Update ProjectEditorClient Image type**

Modify `project-editor-client.tsx`:
```tsx
interface ProjectEditorProps {
  // ... existing fields ...
  imagesList: Array<{
    id: number;
    url: string;
    filename: string;
    order: number;
    duration: number;
    prompt: string;              // NEW
    audioUrl: string | null;     // NEW
  }>;
}
```

- [ ] **Step 2: Update page.tsx Image query**

Modify `app/project/[id]/page.tsx` - select prompt and audioUrl from DB.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: pass prompt and audioUrl through components"
```

---

### Task 9: Verify end-to-end

**Files:**
- Test: Manual

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test flow**

1. Upload an image
2. Click the frame → modal opens
3. Enter prompt → Save works
4. Open modal again → prompt is pre-filled
5. Verify prompt shows in bottom list
6. Delete works

- [ ] **Step 3: Commit**

```bash
git commit -m "test: verify frame prompt modal flow"
```

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-04-14-frame-prompt-modal.md`. 

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?