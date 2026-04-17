import { chromium } from 'playwright';

async function generatePrompt(prompt) {
  let browser = null;
  let page = null;

  try {
    const headless = process.env.BROWSER_HEADLESS !== 'false';
    console.log(`  - Browser mode: ${headless ? 'Headless' : 'Headed'}`);

    browser = await chromium.launch({
      headless: headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    page = await context.newPage();

    console.log('  - Navigating to Gemini App...');
    await page.goto('https://gemini.google.com/app', {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(3000);

    const acceptButton = await page.$('button:has-text("Accept all")');
    if (acceptButton) {
      await acceptButton.click();
      await page.waitForTimeout(2000);
    }

    console.log(`  - Sending prompt...`);
    
    const promptInput = await page.$('div[contenteditable="true"]');
    if (promptInput) {
      await promptInput.click();
      await page.keyboard.type(prompt, { delay: 50 });
      await page.keyboard.press('Enter');
    } else {
      return 'Error: Prompt input not found';
    }

    console.log('  - Waiting for response...');
    await page.waitForTimeout(15000);

    // Try to find the response in different ways
    // Method 1: Look for response-content class
    const responseContent = await page.$('.response-content');
    if (responseContent) {
      const text = await responseContent.innerText();
      if (text && text.length > 10) {
        console.log(`✅ Response found via .response-content`);
        return text;
      }
    }

    // Method 2: Look for any div with model role
    const modelDivs = await page.$$('div[role="img"], div[role="presentation"]');
    for (const div of modelDivs) {
      const text = await div.innerText().catch(() => '');
      if (text && text.length > 20 && text.length < 10000) {
        console.log(`✅ Response found via role`);
        return text;
      }
    }

    // Method 3: Look at last few paragraphs
    const paras = await page.$$('p');
    if (paras.length > 0) {
      const lastP = paras[paras.length - 1];
      const text = await lastP.innerText().catch(() => '');
      if (text && text.length > 10) {
        console.log(`✅ Response found via p tag`);
        return text;
      }
    }

    return 'Error: No response found';
  } catch (error) {
    console.error('Error:', error.message);
    return `Error: ${error.message}`;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const prompt = process.argv[2];
if (!prompt) {
  console.error('Please provide a prompt');
  process.exit(1);
}

generatePrompt(prompt).then((result) => {
  console.log('RESULT:' + result);
  process.exit(0);
}).catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});