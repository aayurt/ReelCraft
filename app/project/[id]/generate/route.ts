import { auth, db } from '@/lib/auth';
import { generatePrompt, type PromptStyle } from '@/lib/qwen-prompts';
import { generateVideosMixed, RateLimitError } from '@/lib/qwen-video';
import { generations, images, projects, videos } from '@/lib/schema';
import { generateVideo as generateVideoLocal } from '@/lib/video-generator';
import { and, eq } from 'drizzle-orm';
import { existsSync } from 'fs';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
  const { frameTransitions = {}, source = 'qwen', frameIds = [], promptStyle = 'cinematic', customPrompt = '' } = body;

  const allImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
  });

  const sortedImages = [...allImages].sort((a, b) => a.order - b.order);

  const imagesToGenerate = frameIds.length > 0
    ? sortedImages.filter(img => frameIds.includes(img.id))
    : sortedImages;

  if (imagesToGenerate.length === 0) {
    return Response.json({ error: 'No images selected for generation' }, { status: 400 });
  }

  const outputDir = join(process.cwd(), 'uploads', 'videos', id);
  await mkdir(outputDir, { recursive: true });

  const generatedVideos = [];

  try {
    if (source === 'qwen') {
      const authStateDir = join(process.cwd(), 'qwen-automate', 'auth_states');
      const authStatePaths = [
        join(authStateDir, 'account1.json'),
        join(authStateDir, 'account2.json'),
        join(authStateDir, 'account3.json'),
        join(authStateDir, 'account4.json'),
        join(authStateDir, 'account5.json'),
        join(authStateDir, 'account6.json'),
        join(authStateDir, 'account7.json'),
        join(authStateDir, 'account8.json'),
        join(authStateDir, 'account9.json'),
        join(authStateDir, 'account10.json'),
        join(authStateDir, 'account11.json'),
        join(authStateDir, 'account12.json'),
        join(authStateDir, 'account13.json'),
        join(authStateDir, 'account14.json'),
        join(authStateDir, 'account15.json'),
        join(authStateDir, 'account16.json'),
        join(authStateDir, 'account17.json'),
        join(authStateDir, 'account18.json'),
      ];

      console.log(`Starting Qwen video generation for ${imagesToGenerate.length} frames...`);

      const existingVideos = await db.query.videos.findMany({
        where: eq(videos.projectId, projectId),
      });
      const videoPathMap = new Map(existingVideos.map(v => [v.imageId, v.url]));

      // Validate dependencies for CONTINUE_FRAME and prepare predecessors
      const qwenFrames = [];
      const generatingFrameIds = new Set(imagesToGenerate.map(img => img.id));

      for (const img of imagesToGenerate) {
        const isContinue = img.filename === 'CONTINUE_FRAME';
        let predecessorVideoPath: string | undefined;

        if (isContinue) {
          // Find the image that precedes this one in the global sortedImages list
          const currentIndex = sortedImages.findIndex(i => i.id === img.id);
          if (currentIndex <= 0) {
            return Response.json({ error: `Frame ${img.id} is CONTINUE_FRAME but has no predecessor.` }, { status: 400 });
          }

          const predecessor = sortedImages[currentIndex - 1];
          const hasExistingVideo = videoPathMap.has(predecessor.id);
          const isBeingGenerated = generatingFrameIds.has(predecessor.id);

          if (!hasExistingVideo && !isBeingGenerated) {
            return Response.json({
              error: `Frame ${img.id} is a continued frame, but its predecessor (Frame ${predecessor.id}) has not been generated yet. Please generate the predecessor first.`
            }, { status: 400 });
          }

          if (hasExistingVideo) {
            const relPath = videoPathMap.get(predecessor.id)!;
            predecessorVideoPath = join(process.cwd(), relPath);
          }
        }

        qwenFrames.push({
          id: img.id,
          url: img.url,
          filename: img.filename,
          duration: img.duration,
          prompt: img.prompt || generatePrompt(promptStyle as PromptStyle, customPrompt),
          predecessorVideoPath
        });
      }

      console.log('Parallel for normal frames/chains, sequential within chains...');

      const results = await generateVideosMixed(
        qwenFrames,
        authStatePaths,
        3
      );

      console.log(`Generation complete. Processing ${results.length} results...`);

      const existingVideosForInsert = await db.query.videos.findMany({
        where: eq(videos.projectId, projectId),
      });
      let nextVideoOrder = existingVideosForInsert.length + 1;

      for (const result of results) {
        try {
          console.log(`[Processing] Image ID: ${result.imageId}...`);
          const sourceVideoPath = result.videoPath;
          const destFilename = `clip_${result.imageId}_${Date.now()}.mp4`;
          const destPath = join(outputDir, destFilename);

          if (!existsSync(sourceVideoPath)) {
            console.warn(`[Processing] Source video not found for image ${result.imageId}: ${sourceVideoPath}`);
            continue;
          }

          console.log(`[Processing] Copying video to final storage: ${destFilename}`);
          await copyFile(sourceVideoPath, destPath);

          // Handle captured frame image if it exists
          if (result.frameImagePath) {
            const frameSourcePath = result.frameImagePath;
            const frameDestFilename = `frame_image_${result.imageId}.jpg`;
            const frameDestPath = join(outputDir, frameDestFilename);

            if (existsSync(frameSourcePath)) {
              await copyFile(frameSourcePath, frameDestPath);
              const frameRelUrl = `/uploads/videos/${id}/${frameDestFilename}`;

              const currentIndex = sortedImages.findIndex(i => i.id === result.imageId);
              if (currentIndex !== -1 && currentIndex < sortedImages.length - 1) {
                const nextImage = sortedImages[currentIndex + 1];
                if (nextImage.filename === 'CONTINUE_FRAME') {
                  console.log(`[Processing] Updating NEXT frame ${nextImage.id} image to current end-frame: ${frameRelUrl}`);
                  await db.update(images).set({
                    url: frameRelUrl
                  }).where(eq(images.id, nextImage.id));
                }
              }
            }
          }

          const img = imagesToGenerate.find((i) => i.id === result.imageId);
          const transitionType = img ? (frameTransitions[img.id] || project.transitionType) : project.transitionType;
          const transitionDuration = project.transitionDuration;

          const [video] = await db.insert(videos).values({
            projectId,
            imageId: result.imageId,
            url: `/uploads/videos/${id}/${destFilename}`,
            filename: destFilename,
            order: nextVideoOrder++,
            duration: img?.duration || 5,
            transitionType: transitionType as any,
            transitionDuration,
            source: 'qwen',
          }).returning();

          generatedVideos.push(video);
      console.log(`Successfully processed ${generatedVideos.length}/${qwenResults.length} videos`);
      return Response.json({ success: true, videos: generatedVideos });
    } else {
      for (let i = 0; i < imagesToGenerate.length; i++) {
        const img = imagesToGenerate[i];
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

        // Capture end frame and update next image if it's a CONTINUE_FRAME
        try {
          const { captureFrame: captureLocalFrame } = await import('@/lib/video-generator');
          const tempFramePath = await captureLocalFrame(outputPath, 'end');

          const frameDestFilename = `frame_image_local_${img.id}.jpg`;
          const frameDestPath = join(outputDir, frameDestFilename);

          if (existsSync(tempFramePath)) {
            await copyFile(tempFramePath, frameDestPath);
            const frameRelUrl = `/uploads/videos/${id}/${frameDestFilename}`;

            const currentIndex = sortedImages.findIndex(si => si.id === img.id);
            if (currentIndex !== -1 && currentIndex < sortedImages.length - 1) {
              const nextImage = sortedImages[currentIndex + 1];
              if (nextImage.filename === 'CONTINUE_FRAME') {
                console.log(`[Generate-Local] Updating NEXT frame ${nextImage.id} image to current end-frame: ${frameRelUrl}`);
                await db.update(images).set({
                  url: frameRelUrl
                }).where(eq(images.id, nextImage.id));
              }
            }
          }
        } catch (captureErr) {
          console.error("[Generate-Local] Failed to capture frame for sync:", captureErr);
        }

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