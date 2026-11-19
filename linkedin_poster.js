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
 * @param {Object} [opts]
 * @param {boolean} [opts.interactive=false]
 */
async function postToLinkedIn(postText, imagePath = null, { interactive = false } = {}) {
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

    const loggedInIndicator = page.locator(
      'div[data-view-name="share-sharebox-focus"], button.share-box-feed-entry__trigger, button:has-text("Start a post"), a[href*="/in/"], nav[aria-label="Primary"]'
    ).first();

    let isLoggedIn = false;
    try {
      await loggedInIndicator.waitFor({ state: "visible", timeout: 15000 });
      isLoggedIn = true;
    } catch (_) {
      isLoggedIn = false;
    }

    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes("/login") || currentUrl.includes("/uas/") || currentUrl.includes("/checkpoint") || await page.locator('input[name="session_key"], button:has-text("Sign in")').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (isLoginPage) {
      isLoggedIn = false;
    }

    if (!isLoggedIn) {
      if (!interactive) {
        console.log("ℹ️ LinkedIn session not authenticated. Run run_linkedin_bot.bat to connect. Skipping LinkedIn for this run.");
        await context.close();
        return { success: false, skipped: true, reason: "Awaiting one-time login in run_linkedin_bot.bat" };
      }

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

    // Click "Start a post" trigger (Supports updated 2026 LinkedIn layout & native dialog)
    const startPostBtn = page.locator(
      'div[data-view-name="share-sharebox-focus"], button.share-box-feed-entry__trigger, button:has-text("Start a post"), div[aria-label="Start a post"], [role="button"]:has-text("Start a post")'
    ).first();
    await startPostBtn.waitFor({ state: "visible", timeout: 15000 });
    await startPostBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const dialog = page.locator('div[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 15000 });

    // Wait for text editor modal (Supports Tiptap ProseMirror & contenteditable)
    const textEditor = dialog.locator(
      'div.tiptap.ProseMirror, div[role="textbox"][contenteditable="true"], div.editor-content [contenteditable="true"]'
    ).first();
    await textEditor.waitFor({ state: "visible", timeout: 15000 });
    await textEditor.click({ force: true });
    await page.waitForTimeout(500);

    // Type post text via keyboard keystrokes (required for ProseMirror AST synchronization)
    console.log("✍️ Typing LinkedIn post copy...");
    await page.keyboard.insertText(postText);
    await page.waitForTimeout(1000);

    // Upload image if provided
    if (imagePath && fs.existsSync(imagePath)) {
      console.log(`🖼️ Attaching visual infographic card: ${imagePath}`);
      try {
        const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 10000 }).catch(() => null);
        
        // Find media button in dialog
        const mediaBtn = dialog.locator('button[aria-label*="media" i], button[aria-label*="photo" i], button:has(svg[data-test-icon*="image"]), button.share-promoted-detour-button, button:has-text("Media")').first();
        if (await mediaBtn.isVisible().catch(() => false)) {
          await mediaBtn.click();
        }

        const fileChooser = await fileChooserPromise;
        if (fileChooser) {
          await fileChooser.setFiles(imagePath);
          console.log("✅ File uploaded via filechooser.");
        } else {
          const fileInput = page.locator('input[type="file"]').first();
          await fileInput.setInputFiles(imagePath);
        }
        await page.waitForTimeout(3000);

        // Click "Next" on media editor dialog
        const nextBtn = page.locator('div[role="dialog"] button:has-text("Next"), div[role="dialog"] button:has-text("Done")').first();
        if (await nextBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
        }
      } catch (mediaErr) {
        console.warn("⚠️ Media attachment fallback:", mediaErr.message);
      }
    }

    // Click Post Button
    console.log("🚀 Publishing post to LinkedIn...");
    const postSubmitBtn = dialog.locator('button:has-text("Post"), button.share-actions__primary-action').first();
    await postSubmitBtn.waitFor({ state: "visible", timeout: 15000 });

    // Verify button is actually enabled
    let isLinkedInBtnEnabled = false;
    for (let w = 0; w < 12; w++) {
      const ariaDisabled = await postSubmitBtn.getAttribute("aria-disabled").catch(() => null);
      const isDis = await postSubmitBtn.isDisabled().catch(() => false);
      if (ariaDisabled !== "true" && !isDis) {
        isLinkedInBtnEnabled = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    if (!isLinkedInBtnEnabled) {
      throw new Error("LinkedIn Post button is disabled (content may not be registered in ProseMirror).");
    }

    await postSubmitBtn.click();
    console.log("⏳ Waiting for LinkedIn post dialog to detach...");
    await dialog.waitFor({ state: "detached", timeout: 30000 });
    await page.waitForTimeout(4000);
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
