# Frame Prompt Modal Design

## Overview
Add prompt (required) and optional audio per frame. Click frame opens modal with prompt input + audio upload + delete.

## Database Changes

### images table
Add columns:
- `prompt` - text, NOT NULL (required)
- `audioUrl` - text, NULL (optional per-frame audio)

## UI Components

### ImageCard (`image-card.tsx`)
- On click anywhere → open modal
- Remove hover delete button (keep for quick delete)

### FrameModal (new component)
- **Prompt textarea** (required) - pre-filled if set
- **Audio upload** (optional) - file input with preview if audio set
- **Delete button** - always visible
- **Save button** - disabled until prompt filled

### FramePromptList (new component)
- Bottom section, readonly
- "Frame 1: [prompt]" | "Frame 2: [prompt]" | ...

## Data Flow

1. `ImageGrid` passes `images` array to `FramePromptList`
2. `ImageCard` onClick → opens modal with `image` data
3. Modal saves → call `onUpdate` with `{ prompt, audioUrl }`

## Props Updates

```ts
interface Image {
  id: number;
  url: string;
  filename: string;
  order: number;
  duration: number;
  prompt: string;       // new
  audioUrl: string | null; // new
}
```

## API Updates

- `PATCH /api/projects/[id]/images/[imageId]` - accept `{ prompt, audioUrl }` in body