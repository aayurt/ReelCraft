
import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_upxvS5e6tmqr@ep-rapid-scene-a15lwaug-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function check() {
  const projectId = 1;
  console.log(`Checking Project ${projectId}...`);

  const images = await sql`
    SELECT id, url, filename, "order" 
    FROM images 
    WHERE project_id = ${projectId} 
    ORDER BY "order"
  `;

  const videos = await sql`
    SELECT id, image_id, url, filename, "order" 
    FROM videos 
    WHERE project_id = ${projectId}
  `;

  console.log("Images:");
  console.table(images);

  console.log("Videos:");
  console.table(videos);
}

check().catch(console.error);
