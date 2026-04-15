
import { neon } from '@neondatabase/serverless';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const sql = neon("postgresql://neondb_owner:npg_upxvS5e6tmqr@ep-rapid-scene-a15lwaug-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

const PROJECT_ID = 1;
const OUTPUT_DIR = join(process.cwd(), 'qwen-automate', 'outputs');
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'videos', String(PROJECT_ID));

async function recover() {
  console.log(`Starting recovery for Project ${PROJECT_ID}...`);
  await mkdir(UPLOAD_DIR, { recursive: true });

  const images = await sql`SELECT id, url, filename, "order" FROM images WHERE project_id = ${PROJECT_ID} ORDER BY "order"`;
  const videos = await sql`SELECT id, image_id, url FROM videos WHERE project_id = ${PROJECT_ID}`;
  
  const existingImageIdsWithVideo = new Set(videos.map(v => v.image_id));
  let nextOrder = Math.max(0, ...videos.map(v => v.order || 0)) + 1;

  for (const img of images) {
    if (existingImageIdsWithVideo.has(img.id)) continue;

    const clipName = `clip_${img.id}.mp4`;
    const frameName = `clip_${img.id}-frame.jpg`;
    
    const srcVideo = join(OUTPUT_DIR, clipName);
    const srcFrame = join(OUTPUT_DIR, frameName);

    if (existsSync(srcVideo)) {
      console.log(`Found orphaned video for Image ${img.id}: ${clipName}`);
      
      const destVideoFilename = `clip_${img.id}_recovered.mp4`;
      const destFrameFilename = `frame_image_${img.id}.jpg`;
      
      const destVideoPath = join(UPLOAD_DIR, destVideoFilename);
      const destFramePath = join(UPLOAD_DIR, destFrameFilename);

      try {
        await copyFile(srcVideo, destVideoPath);
        if (existsSync(srcFrame)) {
          await copyFile(srcFrame, destFramePath);
        }

        const videoUrl = `/uploads/videos/${PROJECT_ID}/${destVideoFilename}`;
        const frameUrl = `/uploads/videos/${PROJECT_ID}/${destFrameFilename}`;

        // Insert video record
        await sql`
          INSERT INTO videos (project_id, image_id, url, filename, "order", duration, source, transition_type, transition_duration)
          VALUES (${PROJECT_ID}, ${img.id}, ${videoUrl}, ${destVideoFilename}, ${nextOrder++}, 5, 'qwen', 'none', 0.5)
        `;

        // Update NEXT frame thumbnail if it is a CONTINUE_FRAME
        const currentIndex = images.findIndex(i => i.id === img.id);
        if (currentIndex !== -1 && currentIndex < images.length - 1) {
          const nextImg = images[currentIndex + 1];
          if (nextImg.filename === 'CONTINUE_FRAME') {
            console.log(`Updating next frame ${nextImg.id} thumbnail to recovered end-frame of ${img.id}`);
            await sql`UPDATE images SET url = ${frameUrl} WHERE id = ${nextImg.id}`;
          }
        }

        console.log(`Successfully recovered Video for Image ${img.id}`);
      } catch (err) {
        console.error(`Failed to recover Image ${img.id}:`, err);
      }
    }
  }

  console.log("Recovery complete.");
}

recover().catch(console.error);
