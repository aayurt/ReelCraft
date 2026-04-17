declare module "gemini-automate/services/gemini.js" {
  export class GeminiWebService {
    constructor();
    ask(prompt: string, retryCount?: number): Promise<string>;
  }
}

declare module "qwen-automate/qwen_automate.js" {
  export class QwenAutomate {
    constructor();
    generate(imageUrl: string, prompt: string): Promise<{ videoUrl: string }>;
  }
}