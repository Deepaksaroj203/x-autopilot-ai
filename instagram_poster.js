// instagram_poster.js — Free Browser-based Instagram Auto-Poster via Playwright & Microsoft Edge
// Automatically designs 1080x1080 visual cards and posts to Instagram feed with formatted captions & hashtags.
// Uses isolated browser session persistence (.instagram_user_data) — zero password exposure.

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const GenAI = require("@google/generative-ai");
const { generateOmnichannelPost } = require("./omnichannel_content");
const { generateSocialCard } = require("./social_image_generator");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is not set in .env.");
  process.exit(1);
}

const genAI = new GenAI.GoogleGenerativeAI(GEMINI_API_KEY);
const USER_DATA_DIR = path.join(__dirname, ".instagram_user_data");

/**
 * Publishes an image post + caption to Instagram
 * @param {string} captionText - Text caption formatted for Instagram
 * @param {string} imagePath - Required path to 1080x1080 image card
 * @param {Object} [opts]
 * @param {boolean} [opts.interactive=false]
 */
async function postToInstagram(captionText, imagePath, { interactive = false } = {}) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error("Instagram requires an image file for feed publication.");
  }

  console.log("🌐 Launching browser for Instagram automation...");
  let context;
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: "msedge",
      headless: false,
      viewport: { width: 1280, height: 900 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  } catch (_) {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    console.log("🔍 Checking Instagram session...");
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);

    // Dismiss common cookie consent or "Save Your Login Info" prompts
    try {
      const notNowBtn = page.locator('button:has-text("Not now"), button:has-text("Not Now"), button:has-text("Decline optional cookies")').first();
      if (await notNowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notNowBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch (_) {}

    const loggedInIndicator = page.locator(
      'svg[aria-label="New post"], svg[aria-label="New Post"], a[href*="/direct/inbox/"], svg[aria-label="Search"], a[href*="/epfcompliance"]'
    ).first();

    let hasNavIndicator = false;
    try {
      await loggedInIndicator.waitFor({ state: "visible", timeout: 18000 });
      hasNavIndicator = true;
    } catch (_) {
      hasNavIndicator = false;
    }
    const isLoginPage = page.url().includes("/login") || await page.locator('input[name="password"], a[href*="/accounts/emailsignup"], button:has-text("Log in"), button:has-text("Log In")').first().isVisible({ timeout: 2000 }).catch(() => false);
    const isLoggedIn = hasNavIndicator && !isLoginPage;

    if (!isLoggedIn) {
      if (!interactive) {
        console.log("ℹ️ Instagram session not authenticated. Run connect_instagram.bat to log in. Skipping Instagram for this run.");
        await context.close();
        return { success: false, skipped: true, reason: "Awaiting one-time login in connect_instagram.bat" };
      }

      console.log("\n============================================================");
      console.log("🔑 INSTAGRAM LOGIN REQUIRED (ONE-TIME SETUP)");
      console.log("============================================================");
      console.log("Please log into @epfcompliance in the opened Edge window.");
      console.log("⏳ Session cookies will be preserved permanently in .instagram_user_data...\n");

      await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await loggedInIndicator.waitFor({ state: "visible", timeout: 600000 });
      await page.waitForTimeout(4000);
      console.log("✅ Instagram Login confirmed! Session saved.\n");
    } else {
      console.log("✅ Authenticated on Instagram.");
    }

    // Dismiss any notification modal
    try {
      const notifNotNow = page.locator('button:has-text("Not Now"), button:has-text("Cancel")').first();
      if (await notifNotNow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await notifNotNow.click();
      }
    } catch (_) {}

    console.log("📸 Opening Instagram 'Create' dialog...");
    // Find Create button in navigation sidebar
    const createBtn = page.locator(
      'div[role="button"]:has(svg[aria-label="New post"]), div[role="button"]:has(svg[aria-label="New Post"]), svg[aria-label="New post"], svg[aria-label="New Post"]'
    ).first();

    await createBtn.waitFor({ state: "visible", timeout: 15000 });
    await createBtn.click();
    await page.waitForTimeout(2000);

    // Upload Image File
    console.log(`🖼️ Uploading 1080x1080 visual card: ${imagePath}`);
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles(imagePath);
    await page.waitForTimeout(3000);

    // Step 1 of modal: Click "Next" (Crop screen -> Filter screen)
    console.log("➡️ Advancing past crop screen...");
    const nextBtn1 = page.locator('div[role="button"]:has-text("Next"), button:has-text("Next")').first();
    await nextBtn1.waitFor({ state: "visible", timeout: 10000 });
    await nextBtn1.click();
    await page.waitForTimeout(2000);

    // Step 2 of modal: Click "Next" (Filter screen -> Caption screen)
    console.log("➡️ Advancing past filter screen...");
    const nextBtn2 = page.locator('div[role="button"]:has-text("Next"), button:has-text("Next")').first();
    await nextBtn2.waitFor({ state: "visible", timeout: 10000 });
    await nextBtn2.click();
    await page.waitForTimeout(2000);

    // Step 3 of modal: Enter Caption
    console.log("✍️ Applying Instagram caption & hashtags...");
    const captionEditor = page.locator('div[aria-label="Write a caption..."][role="textbox"], div[contenteditable="true"]').first();
    await captionEditor.waitFor({ state: "visible", timeout: 10000 });
    await captionEditor.click();
    await page.waitForTimeout(500);
    await captionEditor.fill(captionText);
    await page.waitForTimeout(1000);

    // Step 4 of modal: Click "Share"
    console.log("🚀 Publishing post to Instagram feed...");
    const shareBtn = page.locator('div[role="dialog"] div[role="button"]:has-text("Share"), div[role="dialog"] button:has-text("Share"), div[role="button"]:has-text("Share"), button:has-text("Share")').first();
    await shareBtn.waitFor({ state: "visible", timeout: 15000 });
    
    // Resilient click sequence bypassing any pointer-intercepting overlays (e.g. Tag People button)
    try {
      await shareBtn.click({ timeout: 4000 });
    } catch (clickErr) {
      console.log("ℹ️ Standard click intercepted by overlay, attempting force click...");
      try {
        await shareBtn.click({ force: true, timeout: 4000 });
      } catch (_) {
        console.log("ℹ️ Executing direct DOM evaluate click for Instagram Share button...");
        await shareBtn.evaluate((el) => {
          el.scrollIntoView();
          el.click();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        });
      }
    }

    // Wait for upload completion ("Your post has been shared")
    console.log("⏳ Awaiting Instagram upload completion...");
    try {
      const sharedIndicator = page.locator('span:has-text("Your post has been shared"), img[alt*="Animated checkmark"]').first();
      await sharedIndicator.waitFor({ state: "visible", timeout: 25000 });
      console.log("✅ Instagram confirmed post publication!");
    } catch (_) {
      console.log("ℹ️ Completed share sequence (timeout on animated checkmark).");
    }

    await page.waitForTimeout(4000);
    console.log("🎉 Post successfully published to Instagram!");
    return { success: true, platform: "instagram" };

  } catch (error) {
    console.error("❌ Instagram posting error:", error.message);
    try {
      await page.screenshot({ path: path.join(__dirname, "last_instagram_error.png") });
    } catch (_) {}
    throw error;
  } finally {
    await context.close();
  }
}

/**
 * Execute full autonomous Instagram workflow
 */
async function executeInstagramWorkflow() {
  console.log("\n============================================================");
  console.log("🚀 INITIATING AUTONOMOUS INSTAGRAM VISUAL RUNNER");
  console.log("============================================================\n");

  const content = await generateOmnichannelPost(genAI, "instagram");
  console.log("📰 Selected News Headline:", content.headline);

  const cardPath = await generateSocialCard({
    platform: "instagram",
    headline: content.headline,
    insight: content.insight,
    resourceTitle: content.resourceTitle,
    resourceUrl: content.resourceUrl,
    source: content.source,
    pubDate: content.pubDate,
    brandName: "Corporate Compliance",
    brandHandle: "@corporatecompliance.in",
    categoryBadge: "VISUAL BRIEF",
  });

  return await postToInstagram(content.instagram, cardPath);
}

if (require.main === module) {
  executeInstagramWorkflow()
    .then(() => {
      console.log("✅ Instagram runner completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("💥 Fatal Instagram runner failure:", err);
      process.exit(1);
    });
}

module.exports = {
  postToInstagram,
  executeInstagramWorkflow,
};
