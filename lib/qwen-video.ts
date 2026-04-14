import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { access, mkdir } from 'fs/promises';
import { writeFile, unlink } from 'fs/promises';

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

async function captureFrame(videoPath: string, timestamp: string = "00:00:01"): Promise<string> {
  const outputPath = videoPath.replace('.mp4', '-frame.jpg');
  
  const args = [
    '-y',
    '-ss', timestamp,
    '-i', videoPath,
    '-vframes', '1',
    '-q:v', '2',
    outputPath,
  ];

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

      const timeoutMs = 10 * 60 * 1000; // 10 minutes
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
          if (stderr.includes('Rate limit') || stderr.includes('quota exceeded')) {
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
      const frameImagePath = await captureFrame(previousVideoPath, '00:00:04');
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
): Promise<Array<{ videoPath: string; imageId: number }>> {
  const results: Array<{ videoPath: string; imageId: number }> = [];
  const queue = [...frames];
  const active: Array<{ promise: Promise<{ videoPath: string; imageId: number }>; frameId: number; authIndex: number }> = [];
  const completed: Set<number> = new Set();

  const getNextAuthState = (usedIndices: Set<number>): number => {
    for (let i = 0; i < authStatePaths.length; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }
    return 0;
  };

  const usedAuthIndices = new Set<number>();

  const processQueue = async (): Promise<void> => {
    while (queue.length > 0 && active.length < maxConcurrent) {
      const frame = queue.shift()!;
      const authIndex = getNextAuthState(usedAuthIndices);
      usedAuthIndices.add(authIndex);
      
      const promise = (async () => {
        const imageUrl = frame.url.startsWith('/') ? frame.url : `/${frame.url}`;
        const imagePath = join(process.cwd(), imageUrl);
        const prompt = frame.prompt || 'Generate a video with natural motion from this image.';
        const outputName = `clip_${frame.id}.mp4`;

        let videoPath: string | undefined;
        let usedAuthIndex = authIndex;
        
        try {
          videoPath = await generateVideoWithQwen({
            imagePath,
            prompt,
            outputName,
            authStatePath: authStatePaths[usedAuthIndex]
          });
        } catch (error) {
          if (error instanceof RateLimitError) {
            console.log(`Rate limit hit with user ${usedAuthIndex + 1} for frame ${frame.id}, trying next user...`);
            for (let retryAuth = 1; retryAuth < authStatePaths.length; retryAuth++) {
              const nextAuthIndex = (usedAuthIndex + retryAuth) % authStatePaths.length;
              console.log(`Retrying with user ${nextAuthIndex + 1}...`);
              try {
                videoPath = await generateVideoWithQwen({
                  imagePath,
                  prompt,
                  outputName,
                  authStatePath: authStatePaths[nextAuthIndex]
                });
                usedAuthIndex = nextAuthIndex;
                break;
              } catch (retryError) {
                if (retryError instanceof RateLimitError) {
                  console.log(`Rate limit also hit with user ${nextAuthIndex + 1}, trying next...`);
                  continue;
                }
                throw retryError;
              }
            }
            
            if (!videoPath) {
              throw new Error(`All ${authStatePaths.length} users hit rate limit for frame ${frame.id}`);
            }
          } else {
            throw error;
          }
        }

        return { videoPath: videoPath!, imageId: frame.id };
      })();

      active.push({ promise, frameId: frame.id, authIndex });
    }

    if (active.length === 0) return;

    const completedPromises = await Promise.allSettled(active.map(a => a.promise));
    
    for (let i = 0; i < active.length; i++) {
      const result = completedPromises[i];
      const frameId = active[i].frameId;

      if (result.status === 'fulfilled') {
        results.push(result.value);
        completed.add(frameId);
      } else {
        if (result.reason instanceof RateLimitError) {
          throw result.reason;
        }
        throw new Error(`Failed to generate video for frame ${frameId}: ${result.reason}`);
      }
    }

    if (queue.length > 0) {
      await processQueue();
    }
  };

  await processQueue();

  return results.sort((a, b) => a.imageId - b.imageId);
}

export async function generateVideosMixed(
  frames: Array<{ 
    id: number; 
    url: string; 
    filename: string; 
    duration: number; 
    prompt: string;
  }>,
  authStatePaths: string[],
  maxParallel: number = 3
): Promise<Array<{ videoPath: string; imageId: number }>> {
  const results: Array<{ videoPath: string; imageId: number }> = [];
  
  const continueFrames: Array<{ id: number; url: string; filename: string; duration: number; prompt: string }> = [];
  const normalFrames: Array<{ id: number; url: string; filename: string; duration: number; prompt: string }> = [];

  for (const frame of frames) {
    if (frame.filename === 'CONTINUE_FRAME') {
      continueFrames.push(frame);
    } else {
      normalFrames.push(frame);
    }
  }

  if (normalFrames.length > 0) {
    console.log(`Generating ${normalFrames.length} normal frames in parallel (max ${maxParallel} concurrent)...`);
    const normalResults = await generateVideosParallel(normalFrames, authStatePaths, maxParallel);
    results.push(...normalResults);
    
    const lastNormalResult = normalResults[normalResults.length - 1];
    if (lastNormalResult && continueFrames.length > 0) {
      console.log(`Starting sequential generation for ${continueFrames.length} CONTINUE frames...`);
      
      let previousVideoPath = lastNormalResult.videoPath;
      let authIndex = 0;
      
      for (const frame of continueFrames) {
        console.log(`Capturing end frame from: ${previousVideoPath}`);
        const frameImagePath = await captureFrame(previousVideoPath, '00:00:04');
        
        const prompt = frame.prompt || 'Continue the motion from this image. Maintain the same style and motion.';
        const outputName = `clip_${frame.id}.mp4`;
        
        let videoPath: string | undefined;
        let usedAuthIndex = authIndex % authStatePaths.length;
        
        try {
          videoPath = await generateVideoWithQwen({
            imagePath: frameImagePath,
            prompt,
            outputName,
            authStatePath: authStatePaths[usedAuthIndex]
          });
        } catch (error) {
          if (error instanceof RateLimitError) {
            console.log(`Rate limit hit with user ${usedAuthIndex + 1}, trying next user...`);
            for (let retryAuth = 1; retryAuth < authStatePaths.length; retryAuth++) {
              const nextAuthIndex = (usedAuthIndex + retryAuth) % authStatePaths.length;
              console.log(`Retrying with user ${nextAuthIndex + 1}...`);
              try {
                videoPath = await generateVideoWithQwen({
                  imagePath: frameImagePath,
                  prompt,
                  outputName,
                  authStatePath: authStatePaths[nextAuthIndex]
                });
                usedAuthIndex = nextAuthIndex;
                break;
              } catch (retryError) {
                if (retryError instanceof RateLimitError) {
                  console.log(`Rate limit also hit with user ${nextAuthIndex + 1}, trying next...`);
                  continue;
                }
                throw retryError;
              }
            }
            
            if (!videoPath) {
              throw new Error(`All ${authStatePaths.length} users hit rate limit for CONTINUE frame ${frame.id}`);
            }
          } else {
            throw error;
          }
        }

        authIndex++;
        previousVideoPath = videoPath!;
        results.push({ videoPath, imageId: frame.id });
      }
    }
  } else if (continueFrames.length > 0) {
    console.log(`Generating ${continueFrames.length} CONTINUE frames sequentially...`);
    
    const firstFrame = continueFrames[0];
    const imageUrl = firstFrame.url.startsWith('/') ? firstFrame.url : `/${firstFrame.url}`;
    const imagePath = join(process.cwd(), imageUrl);
    const prompt = firstFrame.prompt || 'Generate a video with natural motion from this image.';
    const outputName = `clip_${firstFrame.id}.mp4`;
    
    let previousVideoPath: string | undefined;
    let firstAuthIndex = 0;
    
    try {
      previousVideoPath = await generateVideoWithQwen({
        imagePath,
        prompt,
        outputName,
        authStatePath: authStatePaths[firstAuthIndex]
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.log(`Rate limit hit with user ${firstAuthIndex + 1}, trying next user...`);
        for (let retryAuth = 1; retryAuth < authStatePaths.length; retryAuth++) {
          const nextAuthIndex = (firstAuthIndex + retryAuth) % authStatePaths.length;
          console.log(`Retrying with user ${nextAuthIndex + 1}...`);
          try {
            previousVideoPath = await generateVideoWithQwen({
              imagePath,
              prompt,
              outputName,
              authStatePath: authStatePaths[nextAuthIndex]
            });
            firstAuthIndex = nextAuthIndex;
            break;
          } catch (retryError) {
            if (retryError instanceof RateLimitError) {
              console.log(`Rate limit also hit with user ${nextAuthIndex + 1}, trying next...`);
              continue;
            }
            throw retryError;
          }
        }
        
        if (!previousVideoPath) {
          throw new Error(`All ${authStatePaths.length} users hit rate limit for first CONTINUE frame`);
        }
      } else {
        throw error;
      }
    }
    
    results.push({ videoPath: previousVideoPath!, imageId: firstFrame.id });
    
    for (let i = 1; i < continueFrames.length; i++) {
      const frame = continueFrames[i];
      console.log(`Capturing end frame from: ${previousVideoPath}`);
      const frameImagePath = await captureFrame(previousVideoPath, '00:00:04');
      
      const framePrompt = frame.prompt || 'Continue the motion from this image. Maintain the same style and motion.';
      const frameOutputName = `clip_${frame.id}.mp4`;
      
      let usedAuthIndex = i % authStatePaths.length;
      let videoPath: string | undefined;
      
      try {
        videoPath = await generateVideoWithQwen({
          imagePath: frameImagePath,
          prompt: framePrompt,
          outputName: frameOutputName,
          authStatePath: authStatePaths[usedAuthIndex]
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          console.log(`Rate limit hit with user ${usedAuthIndex + 1}, trying next user...`);
          for (let retryAuth = 1; retryAuth < authStatePaths.length; retryAuth++) {
            const nextAuthIndex = (usedAuthIndex + retryAuth) % authStatePaths.length;
            console.log(`Retrying with user ${nextAuthIndex + 1}...`);
            try {
              videoPath = await generateVideoWithQwen({
                imagePath: frameImagePath,
                prompt: framePrompt,
                outputName: frameOutputName,
                authStatePath: authStatePaths[nextAuthIndex]
              });
              usedAuthIndex = nextAuthIndex;
              break;
            } catch (retryError) {
              if (retryError instanceof RateLimitError) {
                console.log(`Rate limit also hit with user ${nextAuthIndex + 1}, trying next...`);
                continue;
              }
              throw retryError;
            }
          }
          
          if (!videoPath) {
            throw new Error(`All ${authStatePaths.length} users hit rate limit for CONTINUE frame ${frame.id}`);
          }
        } else {
          throw error;
        }
      }

      previousVideoPath = videoPath!;
      results.push({ videoPath, imageId: frame.id });
    }
  }

  return results.sort((a, b) => a.imageId - b.imageId);
}

export { RateLimitError };