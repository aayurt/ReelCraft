import { auth } from '@/lib/auth';
import { db } from '@/lib/auth';
import { projects, images, videos, generations } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateVideo as generateVideoLocal, captureFrame } from '@/lib/video-generator';
import { generateVideosMixed, RateLimitError } from '@/lib/qwen-video';
import { mkdir, unlink, copyFile } from 'fs/promises';
import { join, dirname } from 'path';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const headersList = await import('next/headers').then((h) => h.headers());
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await request.json();
  const { frameTransitions = {}, source = 'qwen' } = body;

  const imageList = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });

  if (imageList.length === 0) {
    return Response.json({ error: 'No images in project' }, { status: 400 });
  }

  const outputDir = join(process.cwd(), 'uploads', 'videos', id);
  await mkdir(outputDir, { recursive: true });

  const sortedImages = [...imageList].sort((a, b) => a.order - b.order);
  const generatedVideos = [];

  try {
    if (source === 'qwen') {
      const authStateDir = join(process.cwd(), 'qwen-automate', 'auth_states');
      const authStatePaths = [
        join(authStateDir, 'user1.json'),
        join(authStateDir, 'user2.json'),
        join(authStateDir, 'user3.json'),
        join(authStateDir, 'user4.json'),
        join(authStateDir, 'user5.json'),
        join(authStateDir, 'user6.json'),
      ];

      console.log(`Starting Qwen video generation for ${sortedImages.length} frames...`);
      console.log('Parallel for normal frames (using 6 users), sequential for CONTINUE frames...');

      const qwenResults = await generateVideosMixed(
        sortedImages.map((img) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          duration: img.duration,
          prompt: img.prompt || '',
        })),
        authStatePaths,
        3
      );

      console.log(`Generated ${qwenResults.length} videos with Qwen`);

      for (const result of qwenResults) {
        const sourceVideoPath = result.videoPath;
        const destFilename = `clip_${result.imageId}.mp4`;
        const destPath = join(outputDir, destFilename);

        await copyFile(sourceVideoPath, destPath);

        const img = sortedImages.find((i) => i.id === result.imageId);
        const transitionType = img ? (frameTransitions[img.id] || project.transitionType) : project.transitionType;
        const transitionDuration = project.transitionDuration;

        const existingVideos = await db.query.videos.findMany({
          where: eq(videos.projectId, projectId),
        });

        const [video] = await db.insert(videos).values({
          projectId,
          imageId: result.imageId,
          url: `/uploads/videos/${id}/${destFilename}`,
          filename: destFilename,
          order: existingVideos.length + 1,
          duration: img?.duration || 5,
          transitionType: transitionType as any,
          transitionDuration,
          source: 'qwen',
        }).returning();

        generatedVideos.push(video);
      }

      return Response.json({ success: true, videos: generatedVideos });
    } else {
      for (let i = 0; i < sortedImages.length; i++) {
        const img = sortedImages[i];
        const transitionType = frameTransitions[img.id] || project.transitionType;
        const transitionDuration = project.transitionDuration;

        const outputPath = join(outputDir, `${Date.now()}-${i}-video.mp4`);

        await generateVideoLocal({
          projectId,
          images: [
            {
              url: img.url,
              duration: img.duration,
              transitionType: transitionType as any,
              transitionDuration,
            },
          ],
          audioUrl: null,
          outputPath,
        });

        const existingVideos = await db.query.videos.findMany({
          where: eq(videos.projectId, projectId),
        });

        const [video] = await db.insert(videos).values({
          projectId,
          imageId: img.id,
          url: `/uploads/videos/${id}/${outputPath.split('/').pop()}`,
          filename: `clip-${i + 1}.mp4`,
          order: existingVideos.length + 1,
          duration: img.duration,
          transitionType: transitionType as any,
          transitionDuration,
          source: 'local',
        }).returning();

        generatedVideos.push(video);
      }

      return Response.json({ success: true, videos: generatedVideos });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Generation failed';
    console.error('Generation error:', errorMessage);

    if (error instanceof RateLimitError) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.', isRateLimit: true },
        { status: 429 }
      );
    }

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const headersList = await import('next/headers').then((h) => h.headers());
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  const generationList = await db.query.generations.findMany({
    where: eq(generations.projectId, projectId),
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });

  return Response.json(generationList);
}