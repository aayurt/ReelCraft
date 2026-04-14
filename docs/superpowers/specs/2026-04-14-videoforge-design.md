# VideoForge - Content Creation Tool for Video Makers

## Project Overview

**VideoForge** - A content creation tool for video makers that lets users upload image sequences, generate videos with configurable durations and transitions, and integrate with OpenCut for further editing.

---

## Stack & Architecture

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Auth**: Better Auth with email/password
- **Database**: Neon PostgreSQL (serverless Postgres)
- **Storage**: Local filesystem (uploads/)
- **Video Processing**: FFmpeg (ffmpeg-static for server-side)
- **Styling**: Tailwind CSS
- **State Management**: React useState/useReducer

### Architecture
- Next.js API routes for backend logic
- Server-side video processing (FFmpeg)
- File-based storage for uploaded images
- In-process queue-based generation

---

## Data Model

### User
```typescript
{
  id: string;
  email: string;
  createdAt: Date;
}
```

### Project
```typescript
{
  id: string;
  userId: string;
  name: string;
  defaultDuration: number; // 3-6 seconds
  transitionType: 'none' | 'fade' | 'slide' | 'dissolve';
  transitionDuration: number;
  audioUrl: string | null;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
```

### Image
```typescript
{
  id: string;
  projectId: string;
  url: string;
  filename: string;
  order: number;
  duration: number; // 3-6 seconds
  createdAt: Date;
}
```

### Generation
```typescript
{
  id: string;
  projectId: string;
  type: 'continue' | 'new';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
}
```

---

## Core Features

### 1. Authentication
- Better Auth email/password login
- Register page
- Protected routes via middleware
- Session management

### 2. Dashboard
- Grid view of user's projects
- Project cards: thumbnail, name, image count, last modified
- Create new project modal
- Actions: rename, delete

### 3. Project Editor
- Image upload (bulk, up to 100s)
- Drag-and-drop reordering
- Per-image duration (3-6 sec)
- Settings panel:
  - Default frame duration
  - Transition type
  - Transition duration
  - Audio upload (MP3/WAV)

### 4. Video Generation
- **Continue mode**: Uses last generated video's end frame
  - Auto-capture frame from previous output
  - Prepend to current sequence
- **New mode**: Fresh start with uploaded images
- Generation queue with status tracking

### 5. Export Pipeline
- FFmpeg combine images + durations
- Apply transitions
- Lay in audio track
- Output MP4
- OpenCut project export

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/* | Better Auth routes |
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/[id] | Get project details |
| PUT | /api/projects/[id] | Update project |
| DELETE | /api/projects/[id] | Delete project |
| POST | /api/projects/[id]/images | Upload images |
| PUT | /api/projects/[id]/images | Update image order/settings |
| DELETE | /api/projects/[id]/images/[imageId] | Delete image |
| POST | /api/projects/[id]/generate | Start generation |
| GET | /api/projects/[id]/generate | Get generation status |
| POST | /api/generations/[id]/capture-frame | Capture end frame |

---

## Pages

| Route | Description |
|-------|-------------|
| / | Landing/redirect |
| /login | Login page |
| /register | Register page |
| /dashboard | Project list |
| /project/[id] | Project editor |
| /project/[id]/preview | Video preview |

---

## UI/UX Guidelines

- Clean, professional aesthetic
- Dark mode default (video editor preference)
- Drag-and-drop for reordering
- Progress indicators for generation
- Responsive (desktop-first for professional users)

---

## Non-Functional Requirements

- Max 100 images per project
- Image formats: JPG, PNG, WebP
- Audio formats: MP3, WAV
- Video output: MP4 (H.264)
- Generation timeout: 5 minutes per project

---

## Phased Implementation

### Phase 1: Auth + Dashboard
- Better Auth setup
- Project CRUD
- Basic dashboard UI

### Phase 2: Project Editor
- Image upload
- Reordering
- Per-image settings

### Phase 3: Video Generation
- FFmpeg integration
- Continue/new logic
- Queue system

### Phase 4: Export + OpenCut
- Video output
- OpenCut export
- Polish UI