// Free Browser-based Twitter / X Auto-Poster via Playwright & Microsoft Edge
// Dedicated for @EPFOCompliance — Posts live 3-part EPFO compliance threads with actionable solutions,
// high-res branded news card images, and exact links to https://corporatecompliance.in blogs and tools.

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const GenAI = require("@google/generative-ai");
const { generateContent } = require("./content_engine");
const { generateEpfoTweet, savePostedHeadline } = require("./epfo_content");
const { generateTweetImage } = require("./image_generator");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set in .env.");
  process.exit(1);
}

const genAI = new GenAI.GoogleGenerativeAI(GEMINI_API_KEY);
const USER_DATA_DIR = path.join(__dirname, ".twitter_user_data");

async function postThreadViaBrowser(thread, imagePath = null, { interactive = false } = {}) {
  console.log("🌐 Launching Microsoft Edge browser...");
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1280, height: 850 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    console.log("🔍 Checking Twitter / X session...");
    await page.goto("https://x.com/home", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    const loggedInIndicator = page.locator(
      '[data-testid="SideNav_AccountSwitcher_Button"], a[data-testid="AppTabBar_Home_Link"], [data-testid="SideNav_NewTweet_Button"]'
    ).first();

    const isLoggedIn = await loggedInIndicator.isVisible().catch(() => false);

    if (!isLoggedIn) {
      if (!interactive) {
        console.log("ℹ️ Twitter / X session not authenticated. Run setup_sessions.bat to connect. Skipping Twitter for this run.");
        await context.close();
        return { success: false, skipped: true, reason: "Awaiting one-time login in setup_sessions.bat" };
      }

      console.log("\n============================================================");
      console.log("🔑 TWITTER / X LOGIN REQUIRED (ONE-TIME SETUP)");
      console.log("============================================================");
      console.log("Please log into @EPFOCompliance in the opened Edge window.");
      console.log("⏳ The browser will remain open until login is completed...\n");

      const currentUrl = page.url();
      if (!currentUrl.includes("/login") && !currentUrl.includes("/i/flow/login")) {
        await page.goto("https://x.com/i/flow/login", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      }

      await loggedInIndicator.waitFor({ state: "visible", timeout: 600000 });
      await page.waitForTimeout(4000);
      console.log("✅ Login confirmed! Session saved permanently.\n");
    } else {
      console.log("✅ Authenticated as @EPFOCompliance.");
    }

    console.log("📝 Navigating directly to dedicated tweet composer (https://x.com/compose/post)...");
    await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2500);

    // Locate the modal dialog specifically
    const dialog = page.locator('div[role="dialog"][aria-modal="true"]').first();
    await dialog.waitFor({ state: "visible", timeout: 20000 });

    // Check if any leftover modal/draft prompt exists and discard it
    try {
      const discardBtn = page.locator('button[data-testid="confirmationSheetConfirm"]');
      if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("🧹 Discarding leftover draft dialog...");
        await discardBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }
    } catch (_) {}

    // 1. Tweet 1 (Hook + Direct Reference Link + Infographic Image)
    const textbox0 = dialog.locator('div[role="textbox"]').first();
    await textbox0.waitFor({ state: "visible", timeout: 15000 });

    console.log(`✍️ Typing Tweet 1/${thread.length} (Subject Hook + Reference Link)...`);
    await textbox0.click({ force: true });
    await page.waitForTimeout(400);
    await page.keyboard.insertText(thread[0]);
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape"); // Dismiss hashtag autocomplete dropdown
    await page.waitForTimeout(1000);

    // Attach image card to Tweet 1
    if (imagePath && fs.existsSync(imagePath)) {
      console.log("📸 Attaching branded news card image to Tweet 1...");
      const fileInput = page.locator('input[data-testid="fileInput"], input[type="file"]').first();
      await fileInput.setInputFiles(imagePath);
      console.log("⏳ Waiting for image upload preview to render...");
      await dialog.locator('[data-testid="attachments"], div[aria-label="Image"], button[aria-label="Remove media"]').first().waitFor({ state: "visible", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }

    // 2. Chained Tweets (Tweet 2 through Tweet N) to form the full thread
    for (let i = 1; i < thread.length; i++) {
      console.log(`➕ Clicking 'Add post' to compose Tweet ${i + 1}/${thread.length}...`);
      const countBefore = await dialog.locator('div[role="textbox"]').count();
      
      const addBtn = dialog.locator('button[data-testid="addButton"], button[aria-label="Add post"]').first();
      await addBtn.scrollIntoViewIfNeeded().catch(() => {});
      await addBtn.click({ force: true });

      // Wait until new textarea actually spawns in the dialog
      try {
        await page.waitForFunction(
          (expected) => {
            const d = document.querySelector('div[role="dialog"][aria-modal="true"]');
            return d && d.querySelectorAll('div[role="textbox"]').length >= expected;
          },
          countBefore + 1,
          { timeout: 5000 }
        );
      } catch (err) {
        console.warn(`Retry clicking add button for Tweet ${i + 1}...`);
        await addBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(2000);
      }

      const countAfter = await dialog.locator('div[role="textbox"]').count();
      if (countAfter >= countBefore + 1) {
        const nextTextarea = dialog.locator('div[role="textbox"]').nth(i);
        await nextTextarea.scrollIntoViewIfNeeded();
        await nextTextarea.click({ force: true });
        await page.waitForTimeout(400);
        await page.keyboard.insertText(thread[i]);
        await page.waitForTimeout(400);
        await page.keyboard.press("Escape"); // Dismiss hashtag dropdown
        await page.waitForTimeout(800);
      } else {
        console.warn(`⚠️ Could not spawn thread textarea ${i + 1}; skipping chained tweet to prevent character overflow.`);
      }
    }

    // 3. Publish the thread / post atomically
    console.log("⏳ Waiting for Post button to become enabled...");
    const postAllBtn = dialog.locator('button[data-testid="tweetButton"]').first();
    await postAllBtn.waitFor({ state: "visible", timeout: 10000 });

    // Wait for active state
    await page.waitForFunction(() => {
      const d = document.querySelector('div[role="dialog"][aria-modal="true"]');
      const btn = d ? d.querySelector('button[data-testid="tweetButton"]') : document.querySelector('button[data-testid="tweetButton"]');
      return btn && btn.getAttribute("aria-disabled") !== "true" && !btn.disabled;
    }, { timeout: 15000 }).catch(() => {});

    const btnText = await postAllBtn.innerText().catch(() => "Post");
    console.log(`🚀 Clicking "${btnText}" button to publish full thread...`);
    await postAllBtn.click({ force: true });

    // 4. Confirm submission: Wait for the dialog to detach / close
    console.log("⏳ Waiting for Twitter backend to accept thread submission...");
    await dialog.waitFor({ state: "detached", timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // 5. Verify published thread on live profile
    console.log("🔍 Navigating to @EPFOCompliance profile to verify live publication...");
    await page.goto("https://x.com/EPFOCompliance", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(5000);

    console.log(`🎉 Complete ${thread.length}-part EPFO compliance thread posted successfully to @EPFOCompliance!`);
    return { success: true, platform: "twitter" };

  } catch (err) {
    console.error("❌ Browser automation error:", err.message);
    const screenshotPath = path.join(__dirname, "last_error.png");
    try {
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Diagnostic screenshot saved to: ${screenshotPath}`);
    } catch (_) {}
    throw err;
  } finally {
    console.log("🔒 Closing browser session...");
    await context.close();
  }
}

async function executePostingWorkflow() {
  const { thread, tweetText, insight, headline, source, pubDate, resourceTitle, resourceUrl } = await generateContent(genAI);

  // Generate high-res branded news card image for Tweet 1
  let imagePath = null;
  try {
    imagePath = await generateTweetImage({
      headline,
      insight,
      resourceTitle,
      resourceUrl,
      source,
      pubDate,
    });
  } catch (imgErr) {
    console.warn("⚠️ Image generation warning:", imgErr.message);
  }

  // Post the 3-part thread simultaneously
  await postThreadViaBrowser(thread, imagePath);
  savePostedHeadline(headline, source, pubDate);
  console.log(`✨ All done! Promoted: ${resourceTitle} (${resourceUrl})`);
  return { headline, source, resourceTitle, resourceUrl, thread };
}

async function main() {
  try {
    await executePostingWorkflow();
  } catch (err) {
    console.error("Execution failed:", err.message || err);
    process.exit(1);
  }
}

module.exports = {
  postThreadViaBrowser,
  executePostingWorkflow,
  main
};

if (require.main === module) {
  main();
}
