const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const PARALLEL_EXECUTION_NUMBER = 1; // Number of parallel browsers
const HEADLESS_MODE = false;
const RETRY_ATTEMPTS = 5;

const VIDEO_GENERATION_TIMEOUT = 2000000; // 2000s
const DOWNLOAD_TIMEOUT = 30000;         // 30s
const UPLOAD_WAIT_TIME = 20000;         // 20s
const NAVIGATION_TIMEOUT = 5000;        // 5s

const AUTH_STATES_DIR = path.join(__dirname, 'auth_states');
const ACCOUNT_STATE_FILE = path.join(AUTH_STATES_DIR, '.accountState.json');
const OUTPUT_DIR = path.join(__dirname, 'outputs');

const SELECTORS = {
  MODAL_CLOSE: '.qwen-chat-comp-update-modal-close',
  MODE_SELECT: '.mode-select-open',
  TEXTAREA: '.message-input-textarea',
  SEND_BUTTON: '.omni-button-content-btn',
  VIDEO_DIV: 'div.qwen-video',
  DOWNLOAD_BTN: 'div.qwen-media-preview-toolbar-item',
  VIEWER_CLOSE: 'div.qwen-video-viewer-content-close',
  UPLOAD_BTN_ID: '#uploadButton'
};

const RATE_LIMIT_MESSAGES = [
  'Too many requests in a short period',
  'You have reached the daily usage limit',
  'reached the daily usage limit',
  'Rate limit reached',
  'Usage exceeded',
  'quota exceeded',
  'Requests rate limit exceeded'
];

// ==========================================
// LOGGING & UTILITIES
// ==========================================
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class RequestFloodError extends RateLimitError {
  constructor(message) {
    super(message);
    this.name = 'RequestFloodError';
  }
}

// ==========================================
// ACCOUNT MANAGEMENT
// ==========================================
function discoverAccounts() {
  if (!fs.existsSync(AUTH_STATES_DIR)) return [];
  return fs.readdirSync(AUTH_STATES_DIR)
    .filter(f => /^account\d+\.json$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    })
    .map(f => path.join(AUTH_STATES_DIR, f));
}

function loadAccountState() {
  if (!fs.existsSync(ACCOUNT_STATE_FILE)) return { lastIndex: -1 };
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
  if (accounts.length === 0) throw new Error('No account*.json files found');
  const state = loadAccountState();
  let nextIndex = (state.lastIndex + 1) % accounts.length;
  saveAccountState({ lastIndex: nextIndex });
  log(`Account selection: Using account ${path.basename(accounts[nextIndex])}`);
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
  log('Account state reset to account1');
}

function getAccountEmail(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 'Unknown';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.origins) {
      for (const origin of data.origins) {
        if (origin.origin === 'https://temp-mail.io' && origin.localStorage) {
          const emailItem = origin.localStorage.find(item => item.name === 'emails');
          if (emailItem) {
            const emails = JSON.parse(emailItem.value);
            if (emails[0] && emails[0].email) return emails[0].email;
          }
        }
      }
    }
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// ==========================================
// UI HELPERS
// ==========================================
async function dismissQwenStudioModal(page) {
  const pageContent = await page.content();
  if (pageContent.includes('Qwen Studio') || pageContent.includes('Big News')) {
    log('Detecting Qwen Studio modal, attempting to close...');
    try {
      const modalCloseBtn = page.locator(SELECTORS.MODAL_CLOSE);
      if (await modalCloseBtn.isVisible({ timeout: 1000 })) {
        await modalCloseBtn.click();
        await page.waitForTimeout(500);
        log('Modal closed successfully');
        return true;
      }
    } catch { }
    await page.keyboard.press('Escape');
    return true;
  }
  return false;
}

// ==========================================
// CORE LOGIC
// ==========================================
let activeBrowser = null;

// Graceful exit handlers
async function cleanup() {
  if (activeBrowser) {
    log('Gracefully closing browser before exit...');
    await activeBrowser.close();
    activeBrowser = null;
  }
}
process.on('SIGINT', async () => { await cleanup(); process.exit(0); });
process.on('SIGTERM', async () => { await cleanup(); process.exit(0); });

async function generateVideoFromImage(imagePath, prompt, outputName, authStatePath, onRateLimit = null) {
  if (!fs.existsSync(authStatePath)) {
    throw new Error(`Auth state file not found: ${authStatePath}`);
  }

  const email = getAccountEmail(authStatePath);
  const browser = await chromium.launch({ headless: HEADLESS_MODE });
  activeBrowser = browser; // Track for signal cleanup

  const context = await browser.newContext({
    storageState: authStatePath,
    viewport: { width: 1280, height: 720 },
    screen: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  let success = false;

  try {
    log(`STEP 1: Navigating to Qwen Chat (Email: ${email})...`);
    await page.goto('https://chat.qwen.ai/');
    await page.waitForTimeout(NAVIGATION_TIMEOUT);

    await dismissQwenStudioModal(page);

    log('STEP 2: Clicking the features menu (+)...');
    await page.click(SELECTORS.MODE_SELECT);
    await page.waitForTimeout(1000);

    log('STEP 3: Selecting "Create Video"...');
    await page.getByText('Create Video', { exact: true }).click();
    await page.waitForTimeout(2000);

    log('STEP 4: Triggering file upload dialog...');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      (async () => {
        const userButton = page.locator(SELECTORS.UPLOAD_BTN_ID);
        if (await userButton.isVisible()) {
          await userButton.click();
        } else {
          await page.click(SELECTORS.MODE_SELECT);
          await page.waitForTimeout(1000);
          await page.getByText('Upload attachment', { exact: false }).click();
        }
      })()
    ]);
    await fileChooser.setFiles(imagePath);

    log('STEP 5: Waiting for upload to be processed by UI...');
    await page.waitForTimeout(UPLOAD_WAIT_TIME);
    await page.screenshot({ path: `verify/upload_verify_${outputName.split('.')[0]}.png` });

    log(`STEP 6: Entering prompt: ${prompt}...`);
    await page.locator(SELECTORS.TEXTAREA).fill(prompt);
    await page.waitForTimeout(5000);

    log('STEP 7: Starting video generation...');
    const sendButton = page.locator(SELECTORS.SEND_BUTTON);
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    for (const msg of RATE_LIMIT_MESSAGES) {
      if (pageContent.includes(msg)) {
        log(`RATE LIMIT: Detected "${msg}"`);
        await browser.close();
        const isFlood = msg === 'Too many requests in a short period';
        if (onRateLimit) return await onRateLimit(isFlood);
        throw (isFlood ? new RequestFloodError(msg) : new RateLimitError(msg));
      }
    }

    log('STEP 8: Waiting for video generation...');
    let downloadLink = null;
    const startTime = Date.now();

    while ((Date.now() - startTime) < VIDEO_GENERATION_TIMEOUT) {
      const videoLocator = page.locator(SELECTORS.VIDEO_DIV).last();
      if (await videoLocator.count() > 0) {
        const isModalOpen = await page.locator(SELECTORS.VIEWER_CLOSE).isVisible();
        if (!isModalOpen) {
          log('SUCCESS: Video detected! Opening preview...');
          await dismissQwenStudioModal(page);
          try {
            await videoLocator.click({ timeout: 5000 });
            await page.waitForTimeout(3000);
          } catch {
            log('Notice: Failed to click video container, retrying...');
          }
        }
        const downloadBtn = page.locator(SELECTORS.DOWNLOAD_BTN).filter({ hasText: 'Download' }).last();
        if (await downloadBtn.isVisible()) {
          downloadLink = downloadBtn;
          log('STEP 9: Download button found!');
          break;
        }
      }
      
      if (page.isClosed()) break;
      await page.waitForTimeout(5000);
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 60 === 0) log(`Progress: Waiting... ${elapsed}s elapsed.`);
      await dismissQwenStudioModal(page);

      const checkContent = await page.content();
      for (const msg of RATE_LIMIT_MESSAGES) {
        if (checkContent.includes(msg)) {
          log(`RATE LIMIT: Detected: "${msg}"`);
          await browser.close();
          const isFlood = msg === 'Too many requests in a short period';
          if (onRateLimit) return await onRateLimit(isFlood);
          throw (isFlood ? new RequestFloodError(msg) : new RateLimitError(msg));
        }
      }
    }

    if (!downloadLink) throw new Error('Download button not defined');

    log('STEP 10: Finalizing download...');
    await downloadLink.waitFor({ state: 'visible', timeout: DOWNLOAD_TIMEOUT });
    log(`Waiting for browser download event (${DOWNLOAD_TIMEOUT / 1000}s timeout)...`);

    let download;
    try {
      const downloadPromise = page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT });
      await downloadLink.click();
      download = await downloadPromise;
      log('Download event received successfully');
    } catch {
      log('Download event timed out. Browser staying open for manual testing.');
      log('TIP: You can click the Download button in the browser window yourself.');
      throw new Error('Download failed to trigger automatically.');
    }

    const closeBtn = page.locator(SELECTORS.VIEWER_CLOSE);
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    } else {
      await page.keyboard.press('Escape');
    }

    const outputPath = path.join(OUTPUT_DIR, outputName);
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
    await download.saveAs(outputPath);
    log(`COMPLETED: Video saved to: ${outputPath}`);

    success = true;
    return outputPath;

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    try {
      await page.screenshot({ path: 'error_screenshot.png' });
    } catch { }
    throw error;
  } finally {
    if (success) {
      log('Closing browser after successful run.');
      await browser.close();
      activeBrowser = null;
    } else {
      log('KEEPING BROWSER OPEN for manual inspection.');
    }
  }
}

// ==========================================
// CLI & ENTRY POINT
// ==========================================
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args[0] === '--reset') { resetAccountState(); process.exit(0); }
    if (args[0] === '--list') {
      log('Available accounts:');
      discoverAccounts().forEach((acc, i) => console.log(`  ${i + 1}: ${path.basename(acc)}`));
      process.exit(0);
    }

    const img = args[0] || 'input.jpg';
    const p = args[1] || 'Describe motion for the image';
    const out = args[2] || 'video_output.mp4';
    let auth = args[3] ? (isNaN(parseInt(args[3])) ? args[3] : getAccountPathByNumber(parseInt(args[3]))) : getNextAccountPath();

    if (!fs.existsSync(img)) {
      log('Error: Image file not found.');
      process.exit(1);
    }

    async function retryWithNextAccount(attemptImg, attemptPrompt, attemptOut, retriesLeft, isFlood = false) {
      if (isFlood) { log('FLOOD DELAY: Waiting 2 minutes...'); await new Promise(r => setTimeout(r, 120000)); }
      if (retriesLeft <= 0) { log('RETRY FAILED: Maximum retries reached.'); process.exit(1); }
      const nextAuth = getNextAccountPath();
      const nextEmail = getAccountEmail(nextAuth);
      log(`RETRYING: ${path.basename(nextAuth)} (${nextEmail}) [${retriesLeft} left]`);
      try {
        return await generateVideoFromImage(attemptImg, attemptPrompt, attemptOut, nextAuth, (f) => retryWithNextAccount(attemptImg, attemptPrompt, attemptOut, retriesLeft - 1, f));
      } catch (err) {
        if (err instanceof RateLimitError) return retryWithNextAccount(attemptImg, attemptPrompt, attemptOut, retriesLeft - 1, err instanceof RequestFloodError);
        throw err;
      }
    }

    try {
      await generateVideoFromImage(img, p, out, auth, (f) => retryWithNextAccount(img, p, out, RETRY_ATTEMPTS, f));
    } catch (err) {
      log(`CRITICAL ERROR: ${err.message}`);
    }
  })();
}

module.exports = { generateVideoFromImage, RateLimitError, RequestFloodError, getNextAccountPath, getAccountPathByNumber, discoverAccounts, resetAccountState };
