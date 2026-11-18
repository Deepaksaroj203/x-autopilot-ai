// daily_runner.js — Intelligent Dual-Slot Daily Automation Runner & Watchdog
// Ensures exactly 2 EPFO compliance threads are posted every day during peak Indian engagement windows.
// Features active internet polling, automatic missed-run catchup, and daily slot tracking.

const fs = require("fs");
const path = require("path");
const dns = require("dns");
const https = require("https");
const { runOmnichannel } = require("./omnichannel_runner");
const { executePostingWorkflow } = require("./browser_poster");

const STATUS_FILE = path.join(__dirname, "daily_posting_status.json");
const LOG_FILE = path.join(__dirname, "daily_runner.log");

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
  } catch (_) {}
}

// Check internet connectivity via fast DNS lookup with HTTPS fallback
function checkInternet() {
  return new Promise((resolve) => {
    dns.lookup("dns.google", { timeout: 4000 }, (err) => {
      if (!err) return resolve(true);

      // HTTPS fallback
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

// Polite wait loop for laptop to establish internet connection
async function waitForInternet(maxWaitMinutes = 45, checkIntervalSec = 15) {
  log("🔍 Checking active internet connection...");
  const isImmediatelyOnline = await checkInternet();
  if (isImmediatelyOnline) {
    log("🌐 Internet connection active.");
    return true;
  }

  log(`⏳ [OFFLINE] No active internet connection detected.`);
  log(`🔄 Laptop is currently offline. Polling every ${checkIntervalSec}s (timeout: ${maxWaitMinutes} mins)...`);

  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, checkIntervalSec * 1000));
    const online = await checkInternet();
    if (online) {
      log(`🌐 [ONLINE] Internet connection established! Proceeding with scheduled compliance post...`);
      // Wait 3 seconds for connection stability
      await new Promise((r) => setTimeout(r, 3000));
      return true;
    }
  }

  log(`❌ [TIMEOUT] No internet connection after ${maxWaitMinutes} minutes. Exiting run.`);
  return false;
}

// Compute Indian Standard Time (IST, UTC+5:30)
function getIstTime() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffsetMs = 5.5 * 3600000;
  const istDate = new Date(utcMs + istOffsetMs);

  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();

  return { istDate, dateStr, hours, minutes };
}

// Load daily posting status
function loadStatus() {
  if (fs.existsSync(STATUS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
    } catch (_) {}
  }
  return null;
}

function saveStatus(status) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
  } catch (err) {
    log(`⚠️ Could not save daily status: ${err.message}`);
  }
}

const ALL_PLATFORMS = ["linkedin", "instagram", "facebook", "twitter"];
const LOCK_FILE = path.join(__dirname, "daily_runner.lock");

function getMissingPlatforms(slotData) {
  const existing = (slotData && slotData.platforms) || {};
  return ALL_PLATFORMS.filter((p) => existing[p] !== "SUCCESS");
}

function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const stat = fs.statSync(LOCK_FILE);
      const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
      if (ageMinutes < 20) {
        log(`🔒 Another runner instance is active (lock age: ${ageMinutes.toFixed(1)}m). Exiting to avoid profile conflict.`);
        return false;
      }
      log(`🧹 Clearing stale lock file (${ageMinutes.toFixed(1)}m old).`);
    }
    fs.writeFileSync(LOCK_FILE, `${process.pid} ${new Date().toISOString()}`, "utf8");
    return true;
  } catch (_) {
    return true;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch (_) {}
}

// Evaluate which slot and which specific platforms should be run today
function evaluateSlot(status, hours, minutes) {
  // Morning Slot target: 09:30 AM IST (Window: >= 09:00 AM)
  // Evening Slot target: 06:00 PM IST (Window: >= 17:30 / 5:30 PM)

  const isMorningWindow = hours >= 9;
  const isEveningWindow = hours > 17 || (hours === 17 && minutes >= 30);

  const morningMissing = getMissingPlatforms(status.morning);
  const eveningMissing = getMissingPlatforms(status.evening);
  const morningHasAny = Object.keys(status.morning.platforms || {}).length > 0;
  const eveningHasAny = Object.keys(status.evening.platforms || {}).length > 0;

  // 1. Morning never ran yet
  if (!morningHasAny && !status.morning.done) {
    if (isMorningWindow) {
      return {
        slot: "morning",
        platforms: ALL_PLATFORMS,
        reason: isEveningWindow
          ? "Catch-up: Morning post was missed earlier today (executing now before evening slot)."
          : "Scheduled Morning Slot (Peak engagement window: 09:30 AM IST)."
      };
    }
    return {
      slot: null,
      platforms: [],
      reason: `Current time (${hours}:${String(minutes).padStart(2, "0")} IST) is before Morning peak window (09:00 AM).`
    };
  }

  // 2. Daytime partial catch-up for any missed Morning platforms (before evening window opens)
  if (!isEveningWindow && morningMissing.length > 0 && (status.morning.catchupCount || 0) < 3) {
    return {
      slot: "morning",
      platforms: morningMissing,
      reason: `Partial Recovery: Retrying missed Morning platforms [${morningMissing.join(", ")}] without double-posting completed ones.`
    };
  }

  // 3. Evening slot (fresh run or partial catch-up for missed Evening platforms)
  if (isEveningWindow) {
    if (!eveningHasAny && !status.evening.done) {
      return {
        slot: "evening",
        platforms: ALL_PLATFORMS,
        reason: "Scheduled Evening Slot (Peak engagement window: 06:00 PM IST)."
      };
    }
    if (eveningMissing.length > 0 && (status.evening.catchupCount || 0) < 3) {
      return {
        slot: "evening",
        platforms: eveningMissing,
        reason: `Partial Recovery: Retrying missed Evening platforms [${eveningMissing.join(", ")}] without double-posting completed ones.`
      };
    }
  } else {
    return {
      slot: null,
      platforms: [],
      reason: `Morning slot completed at ${status.morning.postedAt}. Evening slot opens at 05:30 PM IST.`
    };
  }

  return {
    slot: null,
    platforms: [],
    reason: `All done! Both daily slots (Morning & Evening) are completed across all 4 platforms for today.`
  };
}

async function runDailyScheduler(forceSlot = null) {
  const { dateStr, hours, minutes } = getIstTime();
  log(`================================================================`);
  log(`⏰ EPFO Omnichannel Social Daily Runner: ${dateStr} ${hours}:${String(minutes).padStart(2, "0")} IST`);
  log(`================================================================`);

  if (!acquireLock()) {
    return;
  }

  try {
    let status = loadStatus();

    // Reset or initialize if new calendar day
    if (!status || status.date !== dateStr) {
      log(`📅 Initializing fresh daily posting tracking for ${dateStr}...`);
      status = {
        date: dateStr,
        morning: { done: false, postedAt: null, headline: null, url: null, platforms: {}, catchupCount: 0 },
        evening: { done: false, postedAt: null, headline: null, url: null, platforms: {}, catchupCount: 0 }
      };
      saveStatus(status);
    }

    // Determine slot and target platforms
    let targetSlot = forceSlot;
    let targetPlatforms = ALL_PLATFORMS;
    if (!targetSlot) {
      const evaluation = evaluateSlot(status, hours, minutes);
      if (!evaluation.slot) {
        log(`ℹ️ ${evaluation.reason}`);
        log(`✨ No posting action needed at this time. Exiting cleanly.`);
        return;
      }
      targetSlot = evaluation.slot;
      targetPlatforms = evaluation.platforms;
      log(`🎯 Target Posting Slot: [${targetSlot.toUpperCase()}] | Platforms: [${targetPlatforms.join(", ")}] — ${evaluation.reason}`);
    } else {
      const missing = getMissingPlatforms(status[targetSlot]);
      if (missing.length > 0 && missing.length < ALL_PLATFORMS.length) {
        targetPlatforms = missing;
        log(`🎯 Forced Partial Recovery for [${targetSlot.toUpperCase()}]: [${targetPlatforms.join(", ")}]`);
      }
    }

    // Verify internet connectivity (with polite wait loop for Wi-Fi connection)
    const isOnline = await waitForInternet(45, 15);
    if (!isOnline) {
      log("❌ Aborting scheduled post due to prolonged internet outage.");
      process.exitCode = 1;
      return;
    }

    // Execute omnichannel posting with up to 2 outer retries on fatal errors
    const maxRetries = 2;
    let attempt = 0;
    let postedResult = null;

    while (attempt < maxRetries && !postedResult) {
      attempt++;
      try {
        log(`🚀 Executing ${targetSlot.toUpperCase()} Omnichannel Social syndication [${targetPlatforms.join(", ")}] (Attempt ${attempt}/${maxRetries})...`);
        postedResult = await runOmnichannel({ platforms: targetPlatforms });
      } catch (err) {
        log(`⚠️ Attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          log(`⏳ Waiting 2 minutes before retrying...`);
          await new Promise((r) => setTimeout(r, 120000));
        }
      }
    }

    if (postedResult && postedResult.success) {
      const prev = status[targetSlot] || { platforms: {}, catchupCount: 0 };
      const mergedPlatforms = { ...(prev.platforms || {}), ...(postedResult.results || {}) };
      const stillMissing = ALL_PLATFORMS.filter((p) => mergedPlatforms[p] !== "SUCCESS");
      const allSucceeded = stillMissing.length === 0;

      status[targetSlot] = {
        done: allSucceeded,
        postedAt: new Date().toISOString(),
        headline: postedResult.headline || prev.headline,
        source: postedResult.source || prev.source,
        url: postedResult.resourceUrl || prev.url,
        platforms: mergedPlatforms,
        catchupCount: allSucceeded ? (prev.catchupCount || 0) : (prev.catchupCount || 0) + 1
      };
      saveStatus(status);

      if (allSucceeded) {
        log(`🎉 FULL SUCCESS: ${targetSlot.toUpperCase()} slot published across ALL 4 social media platforms!`);
      } else {
        log(`⚠️ PARTIAL SUCCESS: ${targetSlot.toUpperCase()} posted, remaining platforms for auto-retry: [${stillMissing.join(", ")}]`);
      }
      log(`📌 Headline: "${status[targetSlot].headline}"`);
      log(`🔗 Promoted URL: ${status[targetSlot].url}`);
      log(`📊 Platform Summary: ${JSON.stringify(mergedPlatforms, null, 2)}`);
    } else {
      log(`❌ Failed to post ${targetSlot.toUpperCase()} after ${maxRetries} attempts.`);
      process.exitCode = 1;
    }
  } finally {
    releaseLock();
  }
}

// Allow CLI override: node daily_runner.js --force-morning / --force-evening
const args = process.argv.slice(2);
const forceSlot = args.includes("--force-morning")
  ? "morning"
  : args.includes("--force-evening")
  ? "evening"
  : null;

runDailyScheduler(forceSlot).catch((err) => {
  log(`💥 Fatal runner error: ${err.message}`);
  process.exit(1);
});
