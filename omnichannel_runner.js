// omnichannel_runner.js — Master Social Autopilot Runner for LinkedIn, Instagram, Facebook & Twitter
// Coordinates cross-platform posting with offline resilience, active internet watchdog, and daily tracking.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const https = require("https");
const GenAI = require("@google/generative-ai");

const { generateOmnichannelPost } = require("./omnichannel_content");
const { generateSocialCard } = require("./social_image_generator");
const { postToLinkedIn } = require("./linkedin_poster");
const { postToInstagram } = require("./instagram_poster");
const { postToFacebook } = require("./facebook_poster");
const { postThreadViaBrowser } = require("./browser_poster");

const STATUS_FILE = path.join(__dirname, "omnichannel_posting_status.json");
const LOG_FILE = path.join(__dirname, "omnichannel_runner.log");

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
  } catch (_) {}
}

function checkInternet() {
  return new Promise((resolve) => {
    dns.lookup("dns.google", { timeout: 4000 }, (err) => {
      if (!err) return resolve(true);
      const req = https.get("https://www.google.com", { timeout: 5000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  });
}

async function waitForInternet(maxWaitMinutes = 30, checkIntervalSec = 15) {
  log("🔍 Checking active internet connection...");
  if (await checkInternet()) {
    log("🌐 Internet connection active.");
    return true;
  }

  log(`⏳ [OFFLINE] No active internet connection. Polling every ${checkIntervalSec}s (timeout: ${maxWaitMinutes}m)...`);
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, checkIntervalSec * 1000));
    if (await checkInternet()) {
      log("🌐 Connection restored!");
      return true;
    }
  }

  log("❌ Internet polling timeout reached.");
  return false;
}

async function runOmnichannel({ platforms = ["linkedin", "instagram", "facebook", "twitter"] } = {}) {
  log(`🚀 Starting Omnichannel Autopilot Runner for targets: [${platforms.join(", ")}]`);

  const online = await waitForInternet();
  if (!online) {
    log("🛑 Aborting run: No internet connection.");
    return false;
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    log("❌ GEMINI_API_KEY missing from environment.");
    return false;
  }

  const genAI = new GenAI.GoogleGenerativeAI(GEMINI_API_KEY);

  log("📰 Synthesizing authoritative regulatory news & cross-platform copy...");
  const content = await generateOmnichannelPost(genAI);
  log(`📌 Master Headline: "${content.headline}"`);

  const results = {};

  // 1. LinkedIn Publication
  if (platforms.includes("linkedin")) {
    try {
      log("💼 Dispatching to LinkedIn...");
      const cardPath = await generateSocialCard({
        platform: "linkedin",
        headline: content.headline,
        insight: content.insight,
        resourceTitle: content.resourceTitle,
        resourceUrl: content.resourceUrl,
        source: content.source,
        pubDate: content.pubDate,
      });
      const res = await postToLinkedIn(content.linkedin, cardPath, { interactive: false });
      if (res && res.skipped) {
        results.linkedin = "SKIPPED: " + res.reason;
        log(`ℹ️ LinkedIn skipped: ${res.reason}`);
      } else {
        results.linkedin = "SUCCESS";
        log("✅ LinkedIn publication complete.");
      }
    } catch (e) {
      log(`⚠️ LinkedIn failed: ${e.message}`);
      results.linkedin = "FAILED: " + e.message;
    }
  }

  // 2. Instagram Publication
  if (platforms.includes("instagram")) {
    try {
      log("📸 Dispatching to Instagram...");
      const cardPath = await generateSocialCard({
        platform: "instagram",
        headline: content.headline,
        insight: content.insight,
        resourceTitle: content.resourceTitle,
        resourceUrl: content.resourceUrl,
        source: content.source,
        pubDate: content.pubDate,
      });
      const res = await postToInstagram(content.instagram, cardPath, { interactive: false });
      if (res && res.skipped) {
        results.instagram = "SKIPPED: " + res.reason;
        log(`ℹ️ Instagram skipped: ${res.reason}`);
      } else {
        results.instagram = "SUCCESS";
        log("✅ Instagram publication complete.");
      }
    } catch (e) {
      log(`⚠️ Instagram failed: ${e.message}`);
      results.instagram = "FAILED: " + e.message;
    }
  }

  // 3. Facebook Publication
  if (platforms.includes("facebook")) {
    try {
      log("📢 Dispatching to Facebook...");
      const cardPath = await generateSocialCard({
        platform: "facebook",
        headline: content.headline,
        insight: content.insight,
        resourceTitle: content.resourceTitle,
        resourceUrl: content.resourceUrl,
        source: content.source,
        pubDate: content.pubDate,
      });
      const res = await postToFacebook(content.facebook, cardPath, { interactive: false });
      if (res && res.skipped) {
        results.facebook = "SKIPPED: " + res.reason;
        log(`ℹ️ Facebook skipped: ${res.reason}`);
      } else {
        results.facebook = "SUCCESS";
        log("✅ Facebook publication complete.");
      }
    } catch (e) {
      log(`⚠️ Facebook failed: ${e.message}`);
      results.facebook = "FAILED: " + e.message;
    }
  }

  // 4. Twitter / X Publication
  if (platforms.includes("twitter") || platforms.includes("x")) {
    try {
      log("🐦 Dispatching to Twitter / X...");
      const cardPath = await generateSocialCard({
        platform: "twitter",
        headline: content.headline,
        insight: content.insight,
        resourceTitle: content.resourceTitle,
        resourceUrl: content.resourceUrl,
        source: content.source,
        pubDate: content.pubDate,
      });
      const res = await postThreadViaBrowser(content.twitter, cardPath, { interactive: false });
      if (res && res.skipped) {
        results.twitter = "SKIPPED: " + res.reason;
        log(`ℹ️ Twitter / X skipped: ${res.reason}`);
      } else {
        results.twitter = "SUCCESS";
        log("✅ Twitter / X publication complete.");
      }
    } catch (e) {
      log(`⚠️ Twitter / X failed: ${e.message}`);
      results.twitter = "FAILED: " + e.message;
    }
  }

  // Save run history
  const statusData = {
    lastRunAt: new Date().toISOString(),
    headline: content.headline,
    results,
  };

  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), "utf8");
  } catch (_) {}

  log(`🎉 Omnichannel run completed. Summary: ${JSON.stringify(results)}`);
  return {
    success: true,
    headline: content.headline,
    source: content.source,
    resourceUrl: content.resourceUrl,
    results,
  };
}

// Parse command line flags: --platforms=all or --platforms=linkedin,instagram
if (require.main === module) {
  const args = process.argv.slice(2);
  let requestedPlatforms = ["linkedin", "instagram", "facebook", "twitter"];

  const platformArg = args.find((a) => a.startsWith("--platforms=") || a.startsWith("--platform="));
  if (platformArg) {
    const val = platformArg.split("=")[1].toLowerCase().trim();
    if (val !== "all") {
      requestedPlatforms = val.split(",").map((s) => s.trim());
    }
  }

  runOmnichannel({ platforms: requestedPlatforms })
    .then(() => process.exit(0))
    .catch((err) => {
      log(`💥 Fatal Omnichannel error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  runOmnichannel,
};
