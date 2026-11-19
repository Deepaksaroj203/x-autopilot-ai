// facebook_poster.js — Free Browser-based Facebook Auto-Poster via Playwright & Microsoft Edge
// Publishes high-engagement community & compliance updates directly to Facebook personal feed or managed page.
// Uses isolated browser session persistence (.facebook_user_data) — zero password exposure.

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const GenAI = require("@google/generative-ai");
const { generateOmnichannelPost } = require("./omnichannel_content");
const { generateSocialCard } = require("./social_image_generator");
const { getActiveProfile } = require("./config/config_loader");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is not set in .env.");
  process.exit(1);
}

const genAI = new GenAI.GoogleGenerativeAI(GEMINI_API_KEY);
const USER_DATA_DIR = path.join(__dirname, ".facebook_user_data");

/**
 * Publishes a post to Facebook
 * @param {string} postText - Text copy formatted for Facebook
 * @param {string|null} imagePath - Path to 1200x630 visual card
 * @param {Object} options - Automation execution options
 */
async function postToFacebook(postText, imagePath = null, { interactive = false } = {}) {
  console.log("🌐 Launching browser for Facebook automation...");
  let context;
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: "msedge",
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
      timeout: 25000,
    });
  } catch (_) {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
      timeout: 25000,
    });
  }

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    console.log("🔍 Checking Facebook session...");
    await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);

    // Dismiss common cookie consent prompts if present
    try {
      const cookieConsent = page.locator('button:has-text("Allow all cookies"), button:has-text("Only allow essential cookies")').first();
      if (await cookieConsent.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieConsent.click();
      }
    } catch (_) {}

    const loggedInIndicator = page.locator(
      'div[aria-label*="What\'s on your mind"], div[role="button"]:has-text("What\'s on your mind"), div[aria-label="Account controls and settings"], svg[aria-label="Your profile"]'
    ).first();

    // Wait up to 20s for React hydration instead of instant check (prevents false skips on slow disk/network)
    let isLoggedIn = false;
    try {
      await loggedInIndicator.waitFor({ state: "visible", timeout: 20000 });
      isLoggedIn = true;
    } catch (_) {
      isLoggedIn = false;
    }

    if (!isLoggedIn) {
      if (!interactive) {
        console.log("ℹ️ Facebook session not authenticated. Run setup_sessions.bat to connect. Skipping Facebook for this run.");
        await context.close();
        return { success: false, skipped: true, reason: "Awaiting one-time login in setup_sessions.bat" };
      }

      console.log("\n============================================================");
      console.log("🔑 FACEBOOK LOGIN REQUIRED (ONE-TIME SETUP)");
      console.log("============================================================");
      console.log("Please log into your Facebook account or Page manager in the opened window.");
      console.log("⏳ Session cookies will be saved permanently in .facebook_user_data...\n");

      await loggedInIndicator.waitFor({ state: "visible", timeout: 600000 });
      await page.waitForTimeout(4000);
      console.log("✅ Facebook Login confirmed! Session saved.\n");
    } else {
      console.log("✅ Authenticated on Facebook.");
    }

    console.log("📝 Opening post composer...");
    const profile = getActiveProfile();
    const targetUrl = process.env.FACEBOOK_PAGE_URL || profile?.facebookUrl || "https://www.facebook.com/";
    console.log(`🌐 Navigating to Facebook: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(3000);

    // Look for composer trigger (page profile or home feed)
    let composerTrigger = page.locator(
      'div[role="button"]:has-text("What\'s on your mind"), div[aria-label*="What\'s on your mind"], div[role="button"]:has-text("Write something"), div[role="button"]:has-text("Create post")'
    ).first();

    const canFindTrigger = await composerTrigger.isVisible({ timeout: 8000 }).catch(() => false);
    if (!canFindTrigger && targetUrl !== "https://www.facebook.com/") {
      console.log("ℹ️ Target page composer not directly visible; switching to main Facebook feed...");
      await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(3000);
      composerTrigger = page.locator(
        'div[role="button"]:has-text("What\'s on your mind"), div[aria-label*="What\'s on your mind"]'
      ).first();
    }

    await composerTrigger.waitFor({ state: "visible", timeout: 15000 });
    await composerTrigger.click();
    await page.waitForTimeout(2000);

    // Wait for text editor in modal dialog
    const textEditor = page.locator('div[role="dialog"] div[role="textbox"][contenteditable="true"]').first();
    await textEditor.waitFor({ state: "visible", timeout: 15000 });
    await textEditor.click();
    await page.waitForTimeout(500);

    console.log("✍️ Typing Facebook post content...");
    // Append trailing space so Facebook closes hashtag autocomplete dropdown instead of floating over the Post button
    await textEditor.fill(postText.trim() + " \n");
    await page.waitForTimeout(600);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);

    // Upload image if provided
    if (imagePath && fs.existsSync(imagePath)) {
      console.log(`🖼️ Attaching visual card to Facebook post: ${imagePath}`);
      try {
        const fileInput = page.locator('div[role="dialog"] input[type="file"][accept*="image"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(imagePath);
          await page.waitForTimeout(3000);
        } else {
          // Click Photo/video button inside dialog to reveal input
          const photoBtn = page.locator('div[role="dialog"] div[aria-label*="Photo/video"]').first();
          if (await photoBtn.isVisible().catch(() => false)) {
            await photoBtn.click({ force: true });
            await page.waitForTimeout(1500);
            const revealedInput = page.locator('div[role="dialog"] input[type="file"][accept*="image"]').first();
            if (await revealedInput.count() > 0) {
              await revealedInput.setInputFiles(imagePath);
              await page.waitForTimeout(3000);
            }
          }
        }
      } catch (mediaErr) {
        console.warn("⚠️ Facebook media upload fallback:", mediaErr.message);
      }
    }

    // Dismiss any lingering hashtag/mention autocomplete popover before clicking Post
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);

    // Click Post Button with 3-tier overlay bypass (prevents hashtag autocomplete pointer interception)
    console.log("🚀 Publishing post to Facebook...");
    const postSubmitBtn = page.locator('div[role="dialog"] div[aria-label="Post"][role="button"], div[role="dialog"] button:has-text("Post")').first();
    await postSubmitBtn.waitFor({ state: "visible", timeout: 15000 });
    try {
      await postSubmitBtn.click({ timeout: 5000 });
    } catch (_) {
      console.log("ℹ️ Standard Facebook Post click intercepted by popup, attempting force click...");
      try {
        await postSubmitBtn.click({ force: true, timeout: 5000 });
      } catch (_) {
        console.log("ℹ️ Executing direct DOM evaluate click for Facebook Post button...");
        await postSubmitBtn.evaluate((el) => {
          el.scrollIntoView();
          el.click();
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        });
      }
    }

    // Confirm submission: Verify composer dialog detaches / closes strictly
    console.log("⏳ Waiting for Facebook composer dialog to close...");
    const isDetached = await page.locator('div[role="dialog"]').first().waitFor({ state: "detached", timeout: 25000 }).then(() => true).catch(() => false);
    if (!isDetached) {
      const isVisible = await postSubmitBtn.isVisible().catch(() => false);
      if (isVisible) {
        const dialogText = await page.locator('div[role="dialog"]').first().innerText().catch(() => "");
        throw new Error(`Facebook Post dialog failed to close after submission. Dialog state: ${dialogText.slice(0, 150)}`);
      }
    }
    await page.waitForTimeout(5000);
    console.log("🎉 Post successfully published to Facebook!");
    return { success: true, platform: "facebook" };

  } catch (error) {
    console.error("❌ Facebook posting error:", error.message);
    try {
      await page.screenshot({ path: path.join(__dirname, "last_facebook_error.png") });
    } catch (_) {}
    throw error;
  } finally {
    await context.close();
  }
}

/**
 * Execute full autonomous Facebook workflow
 */
async function executeFacebookWorkflow({ interactive = true } = {}) {
  console.log("\n============================================================");
  console.log("🚀 INITIATING AUTONOMOUS FACEBOOK COMMUNITY OUTREACH RUNNER");
  console.log("============================================================\n");

  const content = await generateOmnichannelPost(genAI, "facebook");
  console.log("📰 Selected News Headline:", content.headline);

  const cardPath = await generateSocialCard({
    platform: "facebook",
    headline: content.headline,
    insight: content.insight,
    resourceTitle: content.resourceTitle,
    resourceUrl: content.resourceUrl,
    source: content.source,
    pubDate: content.pubDate,
    brandName: "Corporate Compliance",
    brandHandle: "corporatecompliance.in",
    categoryBadge: "COMMUNITY ADVISORY",
  });

  return await postToFacebook(content.facebook, cardPath, { interactive });
}

if (require.main === module) {
  executeFacebookWorkflow()
    .then(() => {
      console.log("✅ Facebook runner completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("💥 Fatal Facebook runner failure:", err);
      process.exit(1);
    });
}

module.exports = {
  postToFacebook,
  executeFacebookWorkflow,
};
