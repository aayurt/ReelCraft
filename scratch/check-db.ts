
import { db } from "../lib/auth";
import { images, videos } from "../lib/schema";
import { eq } from "drizzle-orm";

async function check() {
  const projectId = 1;
  console.log(`Checking Project ${projectId}...`);

  const projectImages = await db.query.images.findMany({
    where: eq(images.projectId, projectId),
    orderBy: images.order,
  });

  const projectVideos = await db.query.videos.findMany({
    where: eq(videos.projectId, projectId),
  });

  console.log("Images:");
  projectImages.forEach(img => {
    const hasVideo = projectVideos.some(v => v.imageId === img.id);
    console.log(`ID: ${img.id}, Order: ${img.order}, Filename: ${img.filename}, URL: ${img.url}, HasVideo: ${hasVideo}`);
  });
}

check().catch(console.error);
