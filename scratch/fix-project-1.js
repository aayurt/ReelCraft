
const { db } = require("../lib/auth");
const { images, videos } = require("../lib/schema");
const { eq, and } = require("drizzle-orm");
const { captureFrame } = require("../lib/qwen-video");
const { existsSync } = require("fs");
const { join } = require("path");
const { copyFile, mkdir } = require("fs/promises");

async function fixProject(projectId) {
  console.log(`Fixing Project ${projectId}...`);

  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
    orderBy: images.order,
  });

  const projectVideos = await db.query.videos.findMany({
    where: eq(videos.projectId, projectId),
  });

  for (let i = 0; i < projectImages.length - 1; i++) {
    const currentImg = projectImages[i];
    const nextImg = projectImages[i + 1];

    if (nextImg.filename === 'CONTINUE_FRAME') {
      const currentVideo = projectVideos.find(v => v.imageId === currentImg.id);
      if (currentVideo) {
        console.log(`Found video for Frame ${currentImg.id}. Updating Frame ${nextImg.id}...`);
        const videoFullPath = join(process.cwd(), currentVideo.url);
        
        if (existsSync(videoFullPath)) {
          console.log(`Capturing end-frame from ${videoFullPath}`);
          const tempFramePath = await captureFrame(videoFullPath, 'end');
          
          const outputDir = join(process.cwd(), 'uploads', 'videos', String(projectId));
          await mkdir(outputDir, { recursive: true });
          const destFilename = `frame_image_fix_${nextImg.id}.jpg`;
          const destPath = join(outputDir, destFilename);
          
          await copyFile(tempFramePath, destPath);
          const frameRelUrl = `/uploads/videos/${projectId}/${destFilename}`;
          
          await db.update(images).set({ url: frameRelUrl }).where(eq(images.id, nextImg.id));
          console.log(`Updated Frame ${nextImg.id} to ${frameRelUrl}`);
        } else {
          console.warn(`Video file not found: ${videoFullPath}`);
        }
      }
    }
  }
  console.log("Done.");
}

fixProject(1).catch(console.error);
