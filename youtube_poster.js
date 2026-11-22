// youtube_poster.js — Autonomous YouTube Shorts Uploader via Playwright & Microsoft Edge
// Targets channel: @arnavsaroj245 (https://www.youtube.com/@arnavsaroj245)
// Uses persistent browser profile (.youtube_user_data) for zero API quota limits & permanent login.

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const USER_DATA_DIR = path.join(__dirname, ".youtube_user_data");
const HISTORY_FILE = path.join(__dirname, "youtube_upload_history.json");
const TARGET_CHANNEL = process.env.YOUTUBE_CHANNEL || "@arnavsaroj2415";

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [YouTube Studio] ${msg}`);
}

/**
 * Uploads a rendered 9:16 video to YouTube as a YouTube Short.
 * @param {Object} params
 * @param {string} params.videoPath - Absolute path to the .mp4 video file
 * @param {string} params.title - Video title (max 100 chars, e.g. "EPFO Joint Declaration Guide #Shorts")
 * @param {string} params.description - Video description with keywords & backlinks
 * @param {string[]} [params.tags] - Video search tags
 * @param {boolean} [params.interactive=false] - If true, pauses for manual login if session expired
 * @returns {Promise<{success: boolean, videoUrl?: string, error?: string, skipped?: boolean}>}
 */
async function uploadShortToYoutube({
  videoPath,
  title = "EPFO Rules Every Employee Must Know #Shorts #EPFO #Compliance",
  description = "Complete guide on EPFO compliance and PF rules.\n\nRead the full verified breakdown at https://corporatecompliance.in\n\n#Shorts #EPFO #PF #Finance #Compliance #India",
  tags = ["Shorts", "EPFO", "PF", "ProvidentFund", "Compliance", "Finance"],
  interactive = false
} = {}) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error(`Video file not found at: ${videoPath}`);
  }

  // Ensure title contains #Shorts for YouTube Shorts algorithmic classification
  if (!title.toLowerCase().includes("#shorts")) {
    title = `${title.slice(0, 90).trim()} #Shorts`;
  }
  title = title.slice(0, 100);

  log(`Preparing auto-upload to YouTube channel: ${TARGET_CHANNEL}`);
  log(`Video: ${path.basename(videoPath)} (${(fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  log(`Title: "${title}"`);

  let context;
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: "msedge",
      headless: !interactive,
      viewport: { width: 1366, height: 900 },
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ],
      timeout: 30000
    });
  } catch (_) {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: !interactive,
      viewport: { width: 1366, height: 900 },
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ],
      timeout: 30000
    });
  }

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    log("Navigating to YouTube Studio (https://studio.youtube.com)...");
    await page.goto("https://studio.youtube.com", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    // Check authentication
    const currentUrl = page.url();
    const needsLogin = currentUrl.includes("accounts.google.com") || 
                       currentUrl.includes("/signin") || 
                       await page.locator('input[type="email"], a[href*="signin"]').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (needsLogin) {
      if (!interactive) {
        log(`⚠️ YouTube Studio session not logged in for channel ${TARGET_CHANNEL}.`);
        log(`Run connect_youtube.bat once to complete one-time login. Skipping upload for this background run.`);
        await context.close();
        return {
          success: false,
          skipped: true,
          reason: `Awaiting one-time login for ${TARGET_CHANNEL} via connect_youtube.bat`
        };
      }

      console.log("\n============================================================");
      console.log(`🔑 YOUTUBE LOGIN REQUIRED FOR CHANNEL: ${TARGET_CHANNEL}`);
      console.log("============================================================");
      console.log(`Please sign in to Google/YouTube in the opened Microsoft Edge window.`);
      console.log(`Select or sign in as: ${TARGET_CHANNEL}`);
      console.log(`Session will be permanently remembered in .youtube_user_data...\n`);

      // Wait up to 10 minutes for user to complete login
      await page.waitForURL(/studio\.youtube\.com/, { timeout: 600000 });
      log("Login detected! Waiting for Studio dashboard to stabilize...");
      await page.waitForTimeout(5000);
    }

    log(`✅ Authenticated in YouTube Studio for channel: ${TARGET_CHANNEL}`);

    // Click CREATE button
    log("Opening Upload Dialog...");
    const createBtn = page.locator('ytcp-button#create-icon, button#create-icon, button[aria-label="Create"], #create-icon').first();
    await createBtn.waitFor({ state: "visible", timeout: 15000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    // Click "Upload videos"
    const uploadVideosItem = page.locator('tp-yt-paper-item:has-text("Upload videos"), [test-id="upload-beta"], ytcp-text-menu #text-item-0').first();
    
    // Setup file chooser interceptor
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 20000 }).catch(() => null),
      uploadVideosItem.click().catch(() => {})
    ]);

    if (fileChooser) {
      log(`Passing video file to YouTube file chooser...`);
      await fileChooser.setFiles(videoPath);
    } else {
      // Fallback: direct input[type="file"] selector
      log(`Locating hidden input[type="file"]...`);
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(videoPath);
    }

    log("Video uploaded to Studio buffer. Waiting for metadata editor to load...");
    await page.waitForTimeout(5000);

    // Wait for the upload details dialog
    const dialog = page.locator('ytcp-uploads-dialog, ytcp-video-metadata-editor').first();
    await dialog.waitFor({ state: "visible", timeout: 30000 });

    // Step 1: Fill Title
    log("Configuring Short Title...");
    const titleBox = page.locator('ytcp-social-suggestions-textbox#title-textarea div#textbox, div#textbox[aria-label*="title" i]').first();
    await titleBox.waitFor({ state: "visible", timeout: 15000 });
    await titleBox.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type(title, { delay: 10 });
    await page.waitForTimeout(1000);

    // Step 2: Fill Description
    log("Configuring Description & Backlinks...");
    const descBox = page.locator('ytcp-social-suggestions-textbox#description-textarea div#textbox, div#textbox[aria-label*="description" i]').first();
    if (await descBox.isVisible().catch(() => false)) {
      await descBox.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Backspace");
      await page.keyboard.type(description, { delay: 5 });
      await page.waitForTimeout(1000);
    }

    // Step 3: Audience declaration — Select "No, it's not made for kids" (required by YouTube)
    log("Setting Audience: 'No, it's not made for kids'...");
    const notForKidsRadio = page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], tp-yt-paper-radio-button:has-text("No, it\'s not made for kids")').first();
    await notForKidsRadio.scrollIntoViewIfNeeded().catch(() => {});
    await notForKidsRadio.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);

    // Capture YouTube video short link if already generated in dialog
    let videoUrl = null;
    try {
      const linkLocator = page.locator('a.ytcp-video-info, span.ytcp-video-info, a[href*="youtu.be"]').first();
      if (await linkLocator.isVisible({ timeout: 4000 })) {
        videoUrl = (await linkLocator.getAttribute("href")) || (await linkLocator.innerText());
        if (videoUrl && !videoUrl.startsWith("http")) videoUrl = `https://${videoUrl}`;
      }
    } catch (_) {}

    // Step 4: Advance through Video elements & Checks tabs by clicking "NEXT"
    log("Navigating to Visibility step...");
    for (let step = 0; step < 3; step++) {
      const nextBtn = page.locator('ytcp-button#next-button, button:has-text("Next"), [id="next-button"]').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Step 5: Visibility — Select "Public"
    log("Setting Visibility to PUBLIC...");
    const publicRadio = page.locator('tp-yt-paper-radio-button[name="PUBLIC"], tp-yt-paper-radio-button:has-text("Public")').first();
    await publicRadio.scrollIntoViewIfNeeded().catch(() => {});
    await publicRadio.click({ force: true });
    await page.waitForTimeout(2000);

    // Extract link from visibility tab if not captured earlier
    if (!videoUrl) {
      try {
        const linkLocator = page.locator('a[href*="youtu.be"], a.ytcp-video-info').first();
        videoUrl = await linkLocator.getAttribute("href");
      } catch (_) {}
    }

    // Step 6: Click Publish / Done
    log("Publishing Short...");
    const doneBtn = page.locator('ytcp-button#done-button, button:has-text("Publish"), button:has-text("Save"), [id="done-button"]').first();
    await doneBtn.waitFor({ state: "visible", timeout: 10000 });
    await doneBtn.click();

    log("Waiting for upload confirmation...");
    await page.waitForTimeout(6000);

    // Try once more to get link from completion modal
    if (!videoUrl) {
      try {
        const modalLink = page.locator('a[href*="youtu.be"], a[href*="youtube.com/shorts"]').first();
        if (await modalLink.isVisible({ timeout: 5000 })) {
          videoUrl = await modalLink.getAttribute("href");
        }
      } catch (_) {}
    }

    const finalUrl = videoUrl || `https://www.youtube.com/${TARGET_CHANNEL.replace(/^@/, '')}/shorts`;
    log(`🚀 SUCCESS! Short published to ${TARGET_CHANNEL}: ${finalUrl}`);

    // Save to upload history
    saveUploadHistory({
      channel: TARGET_CHANNEL,
      title,
      videoPath,
      videoUrl: finalUrl,
      publishedAt: new Date().toISOString()
    });

    await page.waitForTimeout(3000);
    await context.close();

    return {
      success: true,
      channel: TARGET_CHANNEL,
      videoUrl: finalUrl,
      title
    };

  } catch (err) {
    log(`❌ YouTube upload error: ${err.message}`);
    try {
      const snapPath = path.join(__dirname, "youtube_upload_error.png");
      await page.screenshot({ path: snapPath, fullPage: true });
      log(`Diagnostic screenshot saved: ${snapPath}`);
    } catch (_) {}

    if (context) await context.close();
    return {
      success: false,
      error: err.message
    };
  }
}

function saveUploadHistory(entry) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
    history.unshift(entry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), "utf8");
  } catch (_) {}
}

module.exports = {
  uploadShortToYoutube,
  TARGET_CHANNEL,
  USER_DATA_DIR
};

// CLI invocation
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const isConnect = args.includes("--connect");
    const videoArg = args.find(a => a.startsWith("--video="));
    const titleArg = args.find(a => a.startsWith("--title="));

    if (isConnect) {
      console.log(`\nStarting interactive YouTube Studio session login for ${TARGET_CHANNEL}...`);
      let context;
      try {
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
          channel: "msedge",
          headless: false,
          viewport: { width: 1366, height: 900 },
          args: ["--disable-blink-features=AutomationControlled"]
        });
      } catch (_) {
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
          headless: false,
          viewport: { width: 1366, height: 900 },
          args: ["--disable-blink-features=AutomationControlled"]
        });
      }
      const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
      console.log("Navigating to https://studio.youtube.com...");
      await page.goto("https://studio.youtube.com", { waitUntil: "domcontentloaded", timeout: 60000 });
      console.log(`\nPlease complete sign-in for ${TARGET_CHANNEL} in the opened Edge browser window.`);
      console.log("Press Ctrl+C or close the browser when finished.");
      await page.waitForURL(/studio\.youtube\.com/, { timeout: 600000 }).catch(() => {});
      await page.waitForTimeout(5000);
      await context.close();
      console.log("✅ YouTube session preserved in .youtube_user_data.");
      return;
    }

    let videoFile = videoArg ? videoArg.replace("--video=", "").replace(/^["']|["']$/g, "") : null;
    if (!videoFile) {
      // Find latest render in super_reel_engine/renders
      const rendersDir = path.join(__dirname, "super_reel_engine", "renders");
      if (fs.existsSync(rendersDir)) {
        const mp4s = fs.readdirSync(rendersDir)
          .filter(f => f.endsWith(".mp4"))
          .map(f => path.join(rendersDir, f))
          .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        if (mp4s.length > 0) videoFile = mp4s[0];
      }
    }

    if (!videoFile || !fs.existsSync(videoFile)) {
      console.error("❌ No video file specified or found in super_reel_engine/renders.");
      process.exit(1);
    }

    const title = titleArg ? titleArg.replace("--title=", "").replace(/^["']|["']$/g, "") : "Why 80% of EPFO Joint Declarations Get Rejected #Shorts";
    const res = await uploadShortToYoutube({
      videoPath: videoFile,
      title,
      interactive: true
    });

    console.log("\nUpload Result:", JSON.stringify(res, null, 2));
  })();
}
