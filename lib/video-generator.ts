import { spawn } from "child_process";
import { mkdir, access, readFile, copyFile, writeFile, unlink } from "fs/promises";
import { join, dirname } from "path";

interface GenerateOptions {
  projectId: number;
  images: Array<{ url: string; duration: number }>;
  transitionType: "none" | "fade" | "slide" | "dissolve";
  transitionDuration: number;
  audioUrl: string | null;
  outputPath: string;
}

async function checkFfmpeg(): Promise<boolean> {
  try {
    await access("/usr/local/bin/ffmpeg");
    return true;
  } catch {
    try {
      await access("/usr/bin/ffmpeg");
      return true;
    } catch {
      return false;
    }
  }
}

export async function generateVideo(options: GenerateOptions): Promise<string> {
  const { projectId, images, transitionType = "none", transitionDuration = 0.5, audioUrl, outputPath } = options;
  
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    throw new Error("FFmpeg not installed. Please install FFmpeg first: brew install ffmpeg");
  }
  
  const tempDir = join(process.cwd(), "temp", String(projectId));
  await mkdir(tempDir, { recursive: true });
  await mkdir(dirname(outputPath), { recursive: true });
  
  const inputFiles: string[] = [];
  
  for (let i = 0; i < images.length; i++) {
    const srcPath = join(process.cwd(), images[i].url);
    const destPath = join(tempDir, `${String(i + 1).padStart(4, "0")}.jpg`);
    try {
      await copyFile(srcPath, destPath);
      inputFiles.push(destPath);
    } catch {
      console.error(`Failed to copy image: ${srcPath}`);
    }
  }
  
  if (inputFiles.length === 0) {
    throw new Error("No images to process");
  }
  
  const args: string[] = ["-y"];
  
  if (images.length === 1) {
    args.push("-loop", "1", "-i", inputFiles[0]);
  } else {
    for (const file of inputFiles) {
      args.push("-loop", "1", "-i", file);
    }
  }
  
  let filterComplex = "";
  const dur = images[0].duration / 1000;
  
  if (images.length === 1) {
    filterComplex = `fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:setsar=1,zoompan=z='min(zoom+0.001,1.5)':d=${Math.round(30 * dur)}:s=1080x1920`;
  } else if (transitionType === "none") {
    const scale = "fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:setsar=1";
    const trim = `trim=duration=${dur},setpts=PTS-STARTPTS`;
    const z = "zoompan=z='min(zoom+0.001,1.5)':d=25:s=1080x1920";
    filterComplex = `[0:v]${trim},${scale},${z}[v0]`;
    for (let i = 1; i < images.length; i++) {
      const td = (images[i].duration / 1000).toFixed(1);
      filterComplex += `;[${i}:v]trim=duration=${td},setpts=PTS-STARTPTS,${scale},${z}[v${i}]`;
    }
    filterComplex += `;${inputFiles.map((_, i) => `[v${i}]`).join("")}concat=n=${inputFiles.length}:v=1:a=0`;
  } else {
    const transDur = transitionDuration;
    const transFrames = Math.round(transDur * 30);
    
    for (let i = 0; i < images.length; i++) {
      const td = (images[i].duration / 1000).toFixed(2);
      let transFilter = "";
      
      if (transitionType === "fade") {
        transFilter = `fade=t=in:st=0:d=${transDur},fade=t=out:st=${parseFloat(td) - transDur}:d=${transDur}`;
      } else if (transitionType === "slide") {
        const dir = i % 2 === 0 ? "right" : "left";
        const xoff = dir === "right" ? "iw" : "-iw";
        transFilter = `x=${xoff}+${dir}*on*iw/${images[i].duration/1000}`;
      } else if (transitionType === "dissolve") {
        transFilter = `fade=t=in:st=0:d=${transDur},fade=t=out:st=${parseFloat(td) - transDur}:d=${transDur}`;
      }
      
      const scale = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:setsar=1";
      filterComplex += `[${i}:v]trim=duration=${td},setpts=PTS-STARTPTS,${scale},zoompan=z='min(zoom+0.001,1.5)':d=${Math.round(30 * parseFloat(td))}:s=1080x1920,${transFilter}[v${i}]`;
    }
    
    const inputs = inputFiles.map((_, i) => `[v${i}]`).join("");
    filterComplex += `;${inputs}concat=n=${inputFiles.length}:v=1:a=0`;
  }
  
  args.push("-filter_complex", filterComplex);
  args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "28");
  
  if (audioUrl) {
    const audioPath = join(process.cwd(), audioUrl);
    args.push("-i", audioPath, "-c:a", "aac", "-b:a", "192k", "-shortest");
  }
  
  args.push(outputPath);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args, { stdio: "pipe" });
    
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on("close", async (code) => {
      for (const file of inputFiles) {
        try { await unlink(file); } catch {}
      }
      
      if (code === 0) {
        resolve(outputPath);
      } else {
        console.error("FFmpeg stderr:", stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

export async function combineVideos(options: {
  videos: Array<{ url: string; duration: number; transitionType: string; transitionDuration: number }>;
  audioUrl: string | null;
  outputPath: string;
}): Promise<string> {
  const { videos, audioUrl, outputPath } = options;
  
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    throw new Error("FFmpeg not installed. Please install FFmpeg first: brew install ffmpeg");
  }
  
  if (videos.length === 0) {
    throw new Error("No videos to combine");
  }
  
  await mkdir(dirname(outputPath), { recursive: true });
  
  const inputArgs: string[] = ["-y"];
  for (const vid of videos) {
    inputArgs.push("-i", join(process.cwd(), vid.url));
  }
  
  let filterComplex = "";
  for (let i = 0; i < videos.length; i++) {
    const vid = videos[i];
    const dur = vid.duration;
    let transFilter = "";
    
    if (vid.transitionType === "fade") {
      const transDur = vid.transitionDuration;
      transFilter = `fade=t=in:st=0:d=${transDur},fade=t=out:st=${dur - transDur}:d=${transDur}`;
    } else if (vid.transitionType === "slide") {
      const dir = i % 2 === 0 ? "right" : "left";
      const xoff = dir === "right" ? "iw" : "-iw";
      transFilter = `x=${xoff}+${dir}*on*iw/${dur}`;
    } else if (vid.transitionType === "dissolve") {
      const transDur = vid.transitionDuration;
      transFilter = `fade=t=in:st=0:d=${transDur},fade=t=out:st=${dur - transDur}:d=${transDur}`;
    }
    
    const scale = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:setsar=1";
    if (transFilter) {
      filterComplex += `[${i}:v]trim=duration=${dur},setpts=PTS-STARTPTS,${scale},${transFilter}[v${i}]`;
    } else {
      filterComplex += `[${i}:v]trim=duration=${dur},setpts=PTS-STARTPTS,${scale}[v${i}]`;
    }
    
    if (i < videos.length - 1) {
      filterComplex += ";";
    }
  }
  
  const inputs = videos.map((_, i) => `[v${i}]`).join("");
  filterComplex += `;${inputs}concat=n=${videos.length}:v=1:a=0`;
  
  inputArgs.push("-filter_complex", filterComplex);
  inputArgs.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "28");
  
  if (audioUrl) {
    inputArgs.push("-i", join(process.cwd(), audioUrl), "-c:a", "aac", "-b:a", "192k", "-shortest");
  }
  
  inputArgs.push(outputPath);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", inputArgs, { stdio: "pipe" });
    
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        console.error("FFmpeg stderr:", stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

export async function captureFrame(videoPath: string, timestamp: string = "00:00:01"): Promise<string> {
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    throw new Error("FFmpeg not installed. Please install FFmpeg first: brew install ffmpeg");
  }
  
  const outputPath = videoPath.replace(".mp4", "-frame.jpg");
  
  const args = [
    "-y",
    "-ss", timestamp,
    "-i", videoPath,
    "-vframes", "1",
    "-q:v", "2",
    outputPath,
  ];
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}