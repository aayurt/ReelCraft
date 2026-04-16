import { spawn } from 'child_process';
import { access } from 'fs/promises';
import { join } from 'path';

interface QwenGenerateOptions {
  imagePath: string;
  prompt: string;
  outputName: string;
  authStatePath: string;
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function captureFrame(videoPath: string, timestamp: string = "00:00:01"): Promise<string> {
  const outputPath = videoPath.replace(".mp4", "-frame.jpg");

  let args: string[];
  if (timestamp === 'end') {
    // Capture the last frame using -sseof
    args = [
      "-y",
      "-sseof", "-0.1",
      "-i", videoPath,
      "-update", "1",
      "-q:v", "2",
      outputPath,
    ];
  } else {
    args = [
      "-y",
      "-ss", timestamp,
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      outputPath,
    ];
  }

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

async function checkQwenAutomate(): Promise<boolean> {
  try {
    const scriptPath = join(process.cwd(), 'qwen-automate', 'qwen_automate.cjs');
    await access(scriptPath);
    return true;
  } catch {
    return false;
  }
}

export async function generateVideoWithQwen(options: QwenGenerateOptions, maxRetries: number = 5): Promise<string> {
  const { imagePath, prompt, outputName, authStatePath } = options;

  const hasAutomate = await checkQwenAutomate();
  if (!hasAutomate) {
    throw new Error('Qwen automate script not found. Please ensure qwen-automate directory exists.');
  }

  const attempt = async (attemptNumber: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const scriptPath = join(process.cwd(), 'qwen-automate', 'qwen_automate.cjs');
      const nodeProcess = spawn('node', [scriptPath, imagePath, prompt, outputName, authStatePath], {
        stdio: 'pipe',
        cwd: join(process.cwd(), 'qwen-automate')
      });

      let stdout = '';
      let stderr = '';
      let timeout: NodeJS.Timeout;

      const timeoutMs = 33 * 60 * 1000; // 33 minutes (aligned with VIDEO_GENERATION_TIMEOUT)
      timeout = setTimeout(() => {
        nodeProcess.kill();
        reject(new Error(`Qwen generation timed out after ${timeoutMs / 1000 / 60} minutes (attempt ${attemptNumber}/${maxRetries})`));
      }, timeoutMs);

      nodeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      nodeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      nodeProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          const outputPath = join(process.cwd(), 'qwen-automate', 'outputs', outputName);
          resolve(outputPath);
        } else {
          if (stderr.includes('Too many requests') ||
            stderr.includes('Rate limit') ||
            stderr.includes('quota exceeded') ||
            stderr.includes('Requests rate limit exceeded')) {
            reject(new RateLimitError(`Rate limit hit: ${stderr}`));
          } else {
            reject(new Error(`Qwen generation failed with code ${code}: ${stderr}`));
          }
        }
      });

      nodeProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  };

  let lastError: Error | null = null;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`Qwen generation attempt ${i}/${maxRetries}...`);
      return await attempt(i);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTimeout = lastError.message.includes('timed out');
      const isRateLimit = error instanceof RateLimitError;

      if (isRateLimit) {
        throw error;
      }

      if (i < maxRetries && isTimeout) {
        console.log(`Attempt ${i} timed out, retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else if (i < maxRetries) {
        console.log(`Attempt ${i} failed: ${lastError.message}, retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError || new Error('Qwen generation failed after all retries');
}

export async function generateVideosSequential(
  frames: Array<{
    id: number;
    url: string;
    filename: string;
    duration: number;
    prompt: string;
  }>,
  authStatePath: string,
  outputDir: string
): Promise<Array<{ videoPath: string; imageId: number }>> {
  const results: Array<{ videoPath: string; imageId: number }> = [];
  let previousVideoPath: string | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const isContinueFrame = frame.filename === 'CONTINUE_FRAME';

    let imagePath: string;
    let prompt: string;

    if (isContinueFrame && previousVideoPath) {
      const frameImagePath = await captureFrame(previousVideoPath, 'end');
      imagePath = frameImagePath;
      prompt = frame.prompt || 'Continue the motion from this image. Maintain the same style and motion.';
    } else {
      const imageUrl = frame.url.startsWith('/') ? frame.url : `/${frame.url}`;
      imagePath = join(process.cwd(), imageUrl);
      prompt = frame.prompt || 'Generate a video with natural motion from this image.';
    }

    const outputName = `clip_${frame.id}.mp4`;

    try {
      const videoPath = await generateVideoWithQwen({
        imagePath,
        prompt,
        outputName,
        authStatePath
      });

      previousVideoPath = videoPath;
      results.push({ videoPath, imageId: frame.id });
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      throw new Error(`Failed to generate video for frame ${frame.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

export async function generateVideosParallel(
  frames: Array<{
    id: number;
    url: string;
    filename: string;
    duration: number;
    prompt: string;
  }>,
  authStatePaths: string[],
  maxConcurrent: number = 3
): Promise<Array<{ videoPath: string; imageId: number; frameImagePath?: string }>> {
  const results: Array<{ videoPath: string; imageId: number; frameImagePath?: string }> = [];
  const queue = [...frames];
  const active: Array<{ promise: Promise<{ videoPath: string; imageId: number }>; frameId: number; authIndex: number }> = [];
  const completed: Set<number> = new Set();

  // Semaphore for auth states
  const availableAuthIndices = new Set(authStatePaths.map((_, i) => i));

  const acquireAuthIndex = async (): Promise<number> => {
    while (availableAuthIndices.size === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    const val = availableAuthIndices.values().next().value; if (val === undefined) throw new Error("Pool exhausted"); const index = val as number;
    availableAuthIndices.delete(index);
    return index;
  };

  const releaseAuthIndex = (index: number) => {
    availableAuthIndices.add(index);
  };

  const runTask = async () => {
    const frame = queue.shift();
    if (!frame) return;

    const authIndex = await acquireAuthIndex();
    try {
      const imageUrl = frame.url.startsWith('/') ? frame.url : `/${frame.url}`;
      const imagePath = join(process.cwd(), imageUrl);
      const prompt = frame.prompt || 'Generate a video with natural motion from this image.';
      const outputName = `clip_${frame.id}.mp4`;

      let videoPath: string | undefined;

      try {
        videoPath = await generateVideoWithQwen({
          imagePath,
          prompt,
          outputName,
          authStatePath: authStatePaths[authIndex]
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          console.log(`Rate limit hit with user ${authIndex + 1} for frame ${frame.id}, trying next...`);
          // release current and try to get a NEW one
          releaseAuthIndex(authIndex);
          const nextAuthIndex = await acquireAuthIndex();
          try {
            videoPath = await generateVideoWithQwen({
              imagePath,
              prompt,
              outputName,
              authStatePath: authStatePaths[nextAuthIndex]
            });
          } finally {
            releaseAuthIndex(nextAuthIndex);
          }
        } else {
          throw error;
        }
      } finally {
        // Only release if we didn't release inside the catch
        if (availableAuthIndices.has(authIndex) === false && videoPath) {
          releaseAuthIndex(authIndex);
        }
      }

      if (videoPath) {
        console.log(`[Parallel] Capturing end-frame from ${videoPath} for result`);
        const frameImagePath = await captureFrame(videoPath, 'end');
        results.push({ videoPath, imageId: frame.id, frameImagePath });
      }
    } catch (err) {
      console.error(`Failed to generate video for frame ${frame.id}:`, err);
      // Put frame back or throw? For now throw to match existing error behavior
      // But we must release the account!
      if (!availableAuthIndices.has(authIndex)) releaseAuthIndex(authIndex);
      throw err;
    }

    // Pick up next task
    await runTask();
  };

  const pool: Promise<void>[] = [];
  for (let i = 0; i < maxConcurrent && i < frames.length; i++) {
    pool.push(runTask());
  }

  await Promise.all(pool);
  return results.sort((a, b) => a.imageId - b.imageId);
}

export async function generateVideosMixed(
  frames: Array<{
    id: number;
    url: string;
    filename: string;
    duration: number;
    prompt: string;
    predecessorVideoPath?: string; // Path to video for CONTINUE_FRAME
  }>,
  authStatePaths: string[],
  maxParallel: number = 3
): Promise<Array<{ videoPath: string; imageId: number; frameImagePath?: string }>> {
  // Group frames into chains
  const chains: Array<typeof frames> = [];
  const frameMap = new Map(frames.map(f => [f.id, f]));

  // Sort by order of appearance (assuming IDs or another way to track sequence)
  // For now, we assume 'frames' passed are in correct order of dependency if sequential.

  let currentChain: typeof frames = [];
  for (const frame of frames) {
    const isContinue = frame.filename === 'CONTINUE_FRAME';
    // A new chain starts if it's NOT a continue frame, 
    // OR if it's a continue frame but we don't have a previous video path to continue from in THIS batch
    if (!isContinue || (isContinue && frame.predecessorVideoPath && currentChain.length === 0)) {
      if (currentChain.length > 0) chains.push(currentChain);
      currentChain = [frame];
    } else {
      currentChain.push(frame);
    }
  }
  if (currentChain.length > 0) chains.push(currentChain);

  const results: Array<{ videoPath: string; imageId: number; frameImagePath?: string }> = [];

  // Semaphore for auth states
  const availableAuthIndices = new Set(authStatePaths.map((_, i) => i));
  const acquireAuthIndex = async (): Promise<number> => {
    while (availableAuthIndices.size === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    const val = availableAuthIndices.values().next().value; if (val === undefined) throw new Error("Pool exhausted"); const index = val as number;
    availableAuthIndices.delete(index);
    return index;
  };
  const releaseAuthIndex = (index: number) => {
    availableAuthIndices.add(index);
  };

  // Process chains in parallel
  const chainQueue = [...chains];
  const activeChains: Promise<void>[] = [];

  const runChain = async (chain: typeof frames) => {
    const authIndex = await acquireAuthIndex();

    try {
      let previousVideoPath = chain[0].predecessorVideoPath || null;

      for (const frame of chain) {
        try {
          const isContinue = frame.filename === 'CONTINUE_FRAME';
          let imagePath: string;
          let frameImagePath: string | undefined;

          if (isContinue && previousVideoPath) {
            console.log(`[Chain] Capturing end-frame from ${previousVideoPath} for frame ${frame.id}`);
            imagePath = await captureFrame(previousVideoPath, 'end');
            frameImagePath = imagePath;
          } else {
            const imageUrl = frame.url.startsWith('/') ? frame.url : `/${frame.url}`;
            imagePath = join(process.cwd(), imageUrl);
          }

          const outputName = `clip_${frame.id}.mp4`;
          const videoPath = await generateVideoWithQwen({
            imagePath,
            prompt: frame.prompt,
            outputName,
            authStatePath: authStatePaths[authIndex]
          });

          previousVideoPath = videoPath;

          console.log(`[Chain] Capturing end-frame from ${videoPath} for frame ${frame.id}`);
          const endFramePath = await captureFrame(videoPath, 'end');
          results.push({ videoPath, imageId: frame.id, frameImagePath: endFramePath });
        } catch (error) {
          console.error(`[Chain] Error generating frame ${frame.id}:`, error);
          // If a frame fails in a chain, we MUST stop the chain because subsequent frames depend on it
          break;
        }
      }
    } finally {
      releaseAuthIndex(authIndex);
    }
  };

  const pool: Promise<void>[] = [];
  for (let i = 0; i < maxParallel && chainQueue.length > 0; i++) {
    const chain = chainQueue.shift()!;
    pool.push((async () => {
      await runChain(chain);
      while (chainQueue.length > 0) {
        const nextChain = chainQueue.shift()!;
        await runChain(nextChain);
      }
    })());
  }

  await Promise.all(pool);
  return results.sort((a, b) => a.imageId - b.imageId);
}

export { RateLimitError };
