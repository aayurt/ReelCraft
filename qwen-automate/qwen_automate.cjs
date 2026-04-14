const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const AUTH_STATES_DIR = path.join(__dirname, 'auth_states');
const ACCOUNT_STATE_FILE = path.join(AUTH_STATES_DIR, '.accountState.json');

function discoverAccounts() {
  if (!fs.existsSync(AUTH_STATES_DIR)) {
    return [];
  }
  const files = fs.readdirSync(AUTH_STATES_DIR)
    .filter(f => /^account\d+\.json$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });
  return files.map(f => path.join(AUTH_STATES_DIR, f));
}

function loadAccountState() {
  if (!fs.existsSync(ACCOUNT_STATE_FILE)) {
    return { lastIndex: -1 };
  }
  try {
    return JSON.parse(fs.readFileSync(ACCOUNT_STATE_FILE, 'utf8'));
  } catch {
    return { lastIndex: -1 };
  }
}

function saveAccountState(state) {
  fs.writeFileSync(ACCOUNT_STATE_FILE, JSON.stringify(state, null, 2));
}

function getNextAccountPath() {
  const accounts = discoverAccounts();
  if (accounts.length === 0) {
    throw new Error('No account*.json files found in auth_states/');
  }
  const state = loadAccountState();
  let nextIndex = state.lastIndex + 1;
  if (nextIndex >= accounts.length) {
    nextIndex = 0;
  }
  saveAccountState({ lastIndex: nextIndex });
  console.log(`Using account: account${nextIndex + 1}.json`);
  return accounts[nextIndex];
}

function getAccountPathByNumber(num) {
  const accounts = discoverAccounts();
  const index = num - 1;
  if (index < 0 || index >= accounts.length) {
    throw new Error(`Account ${num} not found. Available: 1-${accounts.length}`);
  }
  return accounts[index];
}

function resetAccountState() {
  saveAccountState({ lastIndex: -1 });
  console.log('Account state reset to account1');
}

async function generateVideoFromImage(imagePath, prompt, outputName, authStatePath, onRateLimit = null) {
  if (!fs.existsSync(authStatePath)) {
    throw new Error(`Auth state file not found: ${authStatePath}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authStatePath });
  const page = await context.newPage();

  try {
    console.log('Navigating to Qwen Chat...');
    await page.goto('https://chat.qwen.ai/');
    await page.waitForTimeout(5000);

    const pageContent = await page.content();
    if (pageContent.includes('Qwen Studio') || pageContent.includes('Big News')) {
      console.log('Detected Qwen Studio modal, attempting to close...');
      try {
        const modalCloseBtn = page.locator('.qwen-chat-comp-update-modal-close');
        if (await modalCloseBtn.isVisible({ timeout: 3000 })) {
          await modalCloseBtn.click();
          await page.waitForTimeout(1000);
          console.log('Modal closed successfully');
        }
      } catch {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    console.log('Clicking the features menu (+)...');
    await page.click('.mode-select-open');
    await page.waitForTimeout(1000);

    console.log('Selecting "Create Video"...');
    const createVideoBtn = page.getByText('Create Video', { exact: true });
    await createVideoBtn.click();
    await page.waitForTimeout(2000);

    console.log('Triggering file upload dialog...');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      (async () => {
        const userButton = page.locator('#uploadButton');
        if (await userButton.isVisible()) {
          await userButton.click();
        } else {
          await page.click('.mode-select-open');
          await page.waitForTimeout(1000);
          const uploadBtn = page.getByText('Upload attachment', { exact: false });
          await uploadBtn.click();
        }
      })()
    ]);

    await fileChooser.setFiles(imagePath);

    console.log('Waiting for upload to be processed by UI...');
    await page.waitForTimeout(20000);

    await page.screenshot({ path: `verify/upload_verify_${outputName.split('.')[0]}.png` });

    console.log(`Entering prompt: ${prompt}...`);
    const textarea = page.locator('.message-input-textarea');
    await textarea.fill(prompt);
    await page.waitForTimeout(5000);

    console.log('Starting video generation...');
    const sendButton = page.locator('.omni-button-content-btn');
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(2000);
    const limitMessages = [
      'You have reached the daily usage limit',
      'reached the daily usage limit',
      'Rate limit reached',
      'Usage exceeded',
      'quota exceeded'
    ];

    const pageContent1 = await page.content();
    for (const msg of limitMessages) {
      if (pageContent1.includes(msg)) {
        console.log(`Rate limit detected: "${msg}"`);
        await browser.close();
        if (onRateLimit) {
          return await onRateLimit();
        }
        throw new RateLimitError(`Rate limit hit: ${msg}`);
      }
    }

    console.log('Waiting for video generation to complete (this may take a few minutes)...');

    let downloadLink = null;
    const startTime = Date.now();
    const TIMEOUT = 1000000;

    while (Date.now() - startTime < TIMEOUT) {
      const videoLocator = page.locator('div.qwen-video').last();
      const videoFound = await videoLocator.count() > 0;

      if (videoFound) {
        const isModalOpen = await page.locator('div.qwen-video-viewer-content-close').isVisible();

        if (!isModalOpen) {
          console.log('Video detected! Clicking qwen-video to open preview...');
          try {
            await videoLocator.click({ timeout: 5000 });
            await page.waitForTimeout(3000);
          } catch (err) {
            console.log('Failed to click video container, retrying...');
          }
        }

        const downloadBtn = page.locator('div.qwen-media-preview-toolbar-item').filter({ hasText: 'Download' }).last();

        if (await downloadBtn.isVisible()) {
          downloadLink = downloadBtn;
          console.log('Download button found in qwen-media-preview-toolbar!');
          break;
        }
      }

      await page.waitForTimeout(5000);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 60 === 0) console.log(`Still waiting... ${elapsed}s elapsed.`);

      const checkLimitMessages = [
        'You have reached the daily usage limit',
        'reached the daily usage limit',
        'Rate limit reached',
        'Usage exceeded',
        'quota exceeded'
      ];
      const checkContent = await page.content();
      for (const msg of checkLimitMessages) {
        if (checkContent.includes(msg)) {
          console.log(`Rate limit detected during generation: "${msg}"`);
          await browser.close();
          if (onRateLimit) {
            return await onRateLimit();
          }
          throw new RateLimitError(`Rate limit hit: ${msg}`);
        }
      }
    }

    if (!downloadLink) {
      throw new Error('Video generation timed out or specific Qwen download button not found.');
    }

    console.log('Attempting download from Qwen modal...');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadLink.click()
    ]);

    const closeBtn = page.locator('div.qwen-video-viewer-content-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    } else {
      await page.keyboard.press('Escape');
    }

    const outputPath = path.join(__dirname, 'outputs', outputName);
    if (!fs.existsSync(path.join(__dirname, 'outputs'))) {
      fs.mkdirSync(path.join(__dirname, 'outputs'));
    }

    await download.saveAs(outputPath);
    console.log(`Video saved to: ${outputPath}`);

    return outputPath;

  } catch (error) {
    console.error('An error occurred during automation:', error);
    await page.screenshot({ path: 'error_screenshot.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);

    if (args[0] === '--reset') {
      resetAccountState();
      process.exit(0);
    }
    if (args[0] === '--list') {
      const accounts = discoverAccounts();
      console.log('Available accounts:');
      accounts.forEach((acc, i) => console.log(`  ${i + 1}: ${path.basename(acc)}`));
      process.exit(0);
    }

    const img = args[0] || 'input.jpg';
    const p = args[1] || 'Describe motion for the image';
    const out = args[2] || 'video_output.mp4';

    let auth;
    if (args[3]) {
      const num = parseInt(args[3]);
      if (!isNaN(num)) {
        auth = getAccountPathByNumber(num);
      } else {
        auth = args[3];
      }
    } else {
      auth = getNextAccountPath();
    }

    if (!fs.existsSync(img)) {
      console.log('Usage: node qwen_automate.cjs <image_path> <prompt> <output_name> [auth_account|auth_path|--reset|--list]');
      console.log('  auth_account: 1-7 (use account1.json, account2.json, etc.)');
      console.log('  auth_path:   path to custom auth state JSON');
      console.log('  --reset:     reset account state to start from account1');
      console.log('  --list:      list all available accounts');
      console.log('  (default):   auto-select next account (round-robin)');
      console.log('Example: node qwen_automate.cjs input.jpg "motion prompt" video.mp4');
      console.log('Example: node qwen_automate.cjs input.jpg "motion prompt" video.mp4 3');
      console.log('Example: node qwen_automate.cjs input.jpg "motion prompt" video.mp4 --reset');
      console.log('Please provide a valid image path.');
      process.exit(1);
    }

    async function retryWithNextAccount(attemptImage, attemptPrompt, attemptOutput, retriesLeft) {
      if (retriesLeft <= 0) {
        console.error('No more accounts to retry.');
        process.exit(1);
      }
      const nextAuth = getNextAccountPath();
      console.log(`Retrying with ${path.basename(nextAuth)}... (${retriesLeft} retries left)`);
      try {
        return await generateVideoFromImage(attemptImage, attemptPrompt, attemptOutput, nextAuth, () => retryWithNextAccount(attemptImage, attemptPrompt, attemptOutput, retriesLeft - 1));
      } catch (err) {
        if (err instanceof RateLimitError) {
          return retryWithNextAccount(attemptImage, attemptPrompt, attemptOutput, retriesLeft - 1);
        }
        throw err;
      }
    }

    try {
      await generateVideoFromImage(img, p, out, auth, () => retryWithNextAccount(img, p, out, 7));
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}

module.exports = { generateVideoFromImage, RateLimitError, getNextAccountPath, getAccountPathByNumber, discoverAccounts, resetAccountState };
