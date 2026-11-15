// linkedin_poster.js — Free Browser-based LinkedIn Auto-Poster via Playwright & Microsoft Edge
// Generates high-impact B2B thought-leadership articles with high-res branded graphics and publishes autonomously.
// Uses isolated browser session persistence (.linkedin_user_data) — zero password exposure.

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
const USER_DATA_DIR = path.join(__dirname, ".linkedin_user_data");

/**
 * Publishes a thought-leadership post to LinkedIn
 * @param {string} postText - Text copy formatted for LinkedIn
 * @param {string|null} imagePath - Path to 1200x628 or 1080x1080 visual card
 */
async function postToLinkedIn(postText, imagePath = null) {
  console.log("🌐 Launching browser for LinkedIn automation...");
  let context;
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: "msedge",
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  } catch (_) {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    console.log("🔍 Checking LinkedIn session...");
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    const loggedInIndicator = page.locator(
      'button.share-box-feed-entry__trigger, button:has-text("Start a post"), a[href*="/in/"], nav[aria-label="Primary"]'
    ).first();

    const isLoggedIn = await loggedInIndicator.isVisible().catch(() => false);

    if (!isLoggedIn) {
      console.log("\n============================================================");
      console.log("🔑 LINKEDIN LOGIN REQUIRED (ONE-TIME SETUP)");
      console.log("============================================================");
      console.log("Please log into your LinkedIn profile or company account in the opened window.");
      console.log("⏳ Session cookies will be preserved permanently in .linkedin_user_data...\n");

      await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await loggedInIndicator.waitFor({ state: "visible", timeout: 600000 });
      await page.waitForTimeout(4000);
      console.log("✅ LinkedIn Login confirmed! Session saved.\n");
    } else {
      console.log("✅ Authenticated on LinkedIn.");
    }

    console.log("📝 Opening post composer...");
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2500);

    // Click "Start a post" trigger
    const startPostBtn = page.locator('button.share-box-feed-entry__trigger, button:has-text("Start a post")').first();
    await startPostBtn.waitFor({ state: "visible", timeout: 15000 });
    await startPostBtn.click();
    await page.waitForTimeout(1500);

    // Wait for text editor modal
    const textEditor = page.locator('div.editor-content [contenteditable="true"], div.ql-editor, div[role="textbox"]').first();
    await textEditor.waitFor({ state: "visible", timeout: 15000 });
    await textEditor.click();
    await page.waitForTimeout(500);

    // Type post text
    console.log("✍️ Typing LinkedIn post copy...");
    await textEditor.fill(postText);
    await page.waitForTimeout(1000);

    // Upload image if provided
    if (imagePath && fs.existsSync(imagePath)) {
      console.log(`🖼️ Attaching visual infographic card: ${imagePath}`);
      try {
        const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
        
        // Find media button or file input
        const mediaBtn = page.locator('button[aria-label*="media"], button[aria-label*="photo"], button:has-text("Media")').first();
        if (await mediaBtn.isVisible().catch(() => false)) {
          await mediaBtn.click();
        }

        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(imagePath);
          await page.waitForTimeout(2500);

          // Click "Next" or "Done" on media dialog if present
          const nextBtn = page.locator('button:has-text("Next"), button:has-text("Done")').first();
          if (await nextBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(1500);
          }
        }
      } catch (mediaErr) {
        console.warn("⚠️ Media attachment fallback:", mediaErr.message);
      }
    }

    // Click Post Button
    console.log("🚀 Publishing post to LinkedIn...");
    const postSubmitBtn = page.locator('button.share-actions__primary-action, button:has-text("Post")').first();
    await postSubmitBtn.waitFor({ state: "visible", timeout: 10000 });
    await postSubmitBtn.click();

    await page.waitForTimeout(6000);
    console.log("🎉 Post successfully published to LinkedIn!");
    return { success: true, platform: "linkedin" };

  } catch (error) {
    console.error("❌ LinkedIn posting error:", error.message);
    try {
      await page.screenshot({ path: path.join(__dirname, "last_linkedin_error.png") });
    } catch (_) {}
    throw error;
  } finally {
    await context.close();
  }
}

/**
 * Execute full autonomous LinkedIn workflow: AI news synthesis + visual card + live post
 */
async function executeLinkedInWorkflow() {
  console.log("\n============================================================");
  console.log("🚀 INITIATING AUTONOMOUS LINKEDIN B2B THOUGHT LEADERSHIP RUNNER");
  console.log("============================================================\n");

  const content = await generateOmnichannelPost(genAI, "linkedin");
  console.log("📰 Selected News Headline:", content.headline);

  const cardPath = await generateSocialCard({
    platform: "linkedin",
    headline: content.headline,
    insight: content.insight,
    resourceTitle: content.resourceTitle,
    resourceUrl: content.resourceUrl,
    source: content.source,
    pubDate: content.pubDate,
    brandName: "Corporate Compliance",
    brandHandle: "corporatecompliance.in",
    categoryBadge: "B2B ADVISORY",
  });

  return await postToLinkedIn(content.linkedin, cardPath);
}

if (require.main === module) {
  executeLinkedInWorkflow()
    .then(() => {
      console.log("✅ LinkedIn runner completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("💥 Fatal LinkedIn runner failure:", err);
      process.exit(1);
    });
}

module.exports = {
  postToLinkedIn,
  executeLinkedInWorkflow,
};
