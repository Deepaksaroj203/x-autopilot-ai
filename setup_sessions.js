// setup_sessions.js — Interactive 1-Time Session Setup for LinkedIn, Instagram, Facebook & Twitter
// Opens Microsoft Edge for you to log into your accounts directly.
// Cookies and session storage are saved locally in isolated profile directories:
// - .linkedin_user_data
// - .instagram_user_data
// - .facebook_user_data
// - .twitter_user_data
// Zero passwords are stored or shared.

const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { chromium } = require("playwright");

const PLATFORMS = {
  linkedin: {
    name: "LinkedIn",
    dir: path.join(__dirname, ".linkedin_user_data"),
    url: "https://www.linkedin.com/login",
    feedUrl: "https://www.linkedin.com/feed/",
    loginPrompt: 'input[name="session_password"], a[href*="/login"]',
    indicator: 'a[href*="/in/"], nav[aria-label="Primary"]'
  },
  instagram: {
    name: "Instagram",
    dir: path.join(__dirname, ".instagram_user_data"),
    url: "https://www.instagram.com/accounts/login/",
    feedUrl: "https://www.instagram.com/",
    loginPrompt: 'input[name="password"], a[href*="/accounts/login"]',
    indicator: 'svg[aria-label="New post"], a[role="link"]:has-text("Create"), svg[aria-label="Home"], a[href*="/direct/inbox/"]'
  },
  facebook: {
    name: "Facebook",
    dir: path.join(__dirname, ".facebook_user_data"),
    url: "https://www.facebook.com/login",
    feedUrl: "https://www.facebook.com/",
    loginPrompt: 'input[name="pass"], button[name="login"], form[data-testid="royal_login_form"]',
    indicator: 'div[aria-label*="What\'s on your mind"], div[role="button"]:has-text("What\'s on your mind"), div[aria-label="Account controls and settings"], svg[aria-label="Your profile"]'
  },
  twitter: {
    name: "Twitter / X",
    dir: path.join(__dirname, ".twitter_user_data"),
    url: "https://x.com/i/flow/login",
    feedUrl: "https://x.com/home",
    loginPrompt: 'a[href="/login"], [data-testid="loginButton"]',
    indicator: '[data-testid="SideNav_AccountSwitcher_Button"], a[data-testid="AppTabBar_Home_Link"], [data-testid="SideNav_NewTweet_Button"]'
  }
};

async function checkSession(platformKey) {
  const p = PLATFORMS[platformKey];
  if (!fs.existsSync(p.dir)) return false;

  let context;
  try {
    context = await chromium.launchPersistentContext(p.dir, {
      channel: "msedge",
      headless: true,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  } catch (_) {
    try {
      context = await chromium.launchPersistentContext(p.dir, {
        headless: true,
        viewport: { width: 1280, height: 850 },
        args: ["--disable-blink-features=AutomationControlled"],
      });
    } catch (_) {
      return false;
    }
  }

  try {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto(p.feedUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(3000);
    const hasLoginPrompt = await page.locator(p.loginPrompt).first().isVisible({ timeout: 2500 }).catch(() => false);
    const hasIndicator = await page.locator(p.indicator).first().isVisible({ timeout: 3500 }).catch(() => false);
    return hasIndicator && !hasLoginPrompt;
  } catch (_) {
    return false;
  } finally {
    if (context) await context.close();
  }
}

async function loginToPlatform(platformKey) {
  const p = PLATFORMS[platformKey];
  console.log("\n============================================================");
  console.log(`🔐 LAUNCHING MICROSOFT EDGE FOR ${p.name.toUpperCase()} LOGIN`);
  console.log("============================================================");
  console.log(`1. A Microsoft Edge window will now open.`);
  console.log(`2. Log into your ${p.name} account with your normal credentials.`);
  console.log(`3. Complete 2FA / OTP if prompted.`);
  console.log(`4. Once logged in and viewing your feed, session cookies will be saved.`);
  console.log(`⏳ Waiting for login (timeout: 10 minutes)...\n`);

  let context;
  try {
    context = await chromium.launchPersistentContext(p.dir, {
      channel: "msedge",
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  } catch (_) {
    context = await chromium.launchPersistentContext(p.dir, {
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 35000 });

    const indicator = page.locator(p.indicator).first();
    console.log("💡 Tip: When you see your profile or feed in Edge, you can also press Enter in this console window to confirm immediately.");
    
    // Auto-detect or user press Enter
    const autoDetect = indicator.waitFor({ state: "visible", timeout: 600000 }).then(() => true).catch(() => false);
    const manualConfirm = promptChoice("👉 Press Enter once logged in (or wait for auto-detection): ").then(() => true);

    await Promise.race([autoDetect, manualConfirm]);
    await page.waitForTimeout(3000);

    console.log(`\n🎉 SUCCESS: ${p.name} login confirmed! Session cookies preserved locally in:`);
    console.log(`   ${p.dir}\n`);
    return true;
  } catch (err) {
    console.error(`❌ ${p.name} login timed out or failed:`, err.message);
    return false;
  } finally {
    await context.close();
  }
}

function promptChoice(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  const arg = (process.argv[2] || "").toLowerCase().replace(/^--?/, "");

  if (arg === "status") {
    console.log("============================================================");
    console.log(" 🌐 CORPORATE COMPLIANCE — OMNICHANNEL SESSION STATUS");
    console.log("============================================================");
    for (const key of Object.keys(PLATFORMS)) {
      process.stdout.write(`• ${PLATFORMS[key].name}: `);
      const active = await checkSession(key);
      console.log(active ? "✅ CONNECTED" : "❌ NOT LOGGED IN");
    }
    return;
  }

  if (arg === "linkedin" || arg === "instagram" || arg === "facebook" || arg === "twitter") {
    await loginToPlatform(arg);
    return;
  }

  if (arg === "all") {
    for (const key of ["linkedin", "instagram", "facebook", "twitter"]) {
      console.log(`\nChecking ${PLATFORMS[key].name}...`);
      const active = await checkSession(key);
      if (!active) {
        console.log(`Connecting ${PLATFORMS[key].name}...`);
        await loginToPlatform(key);
      } else {
        console.log(`✅ ${PLATFORMS[key].name} is already connected.`);
      }
    }
    return;
  }

  console.log("============================================================");
  console.log(" 🌐 CORPORATE COMPLIANCE — OMNICHANNEL SESSION MANAGER");
  console.log("============================================================");
  console.log("Checking current authentication status...\n");

  const statuses = {};
  for (const key of Object.keys(PLATFORMS)) {
    process.stdout.write(`• Checking ${PLATFORMS[key].name}... `);
    const active = await checkSession(key);
    statuses[key] = active;
    console.log(active ? "✅ CONNECTED" : "❌ NOT LOGGED IN");
  }

  console.log("\nChoose an option:");
  console.log("  1) Connect LinkedIn");
  console.log("  2) Connect Instagram");
  console.log("  3) Connect Facebook");
  console.log("  4) Connect Twitter / X");
  console.log("  5) Connect All Missing Accounts Sequentially");
  console.log("  0) Exit\n");

  const choice = await promptChoice("Enter option [0-5]: ");

  if (choice === "1") {
    await loginToPlatform("linkedin");
  } else if (choice === "2") {
    await loginToPlatform("instagram");
  } else if (choice === "3") {
    await loginToPlatform("facebook");
  } else if (choice === "4") {
    await loginToPlatform("twitter");
  } else if (choice === "5") {
    for (const key of Object.keys(PLATFORMS)) {
      if (!statuses[key]) {
        console.log(`\nStarting setup for ${PLATFORMS[key].name}...`);
        await loginToPlatform(key);
      } else {
        console.log(`\n✅ ${PLATFORMS[key].name} is already connected. Skipping.`);
      }
    }
  } else {
    console.log("Exiting.");
  }

  console.log("\nSession setup complete. You can run setup_sessions.bat anytime to manage accounts.");
}

if (require.main === module) {
  main().catch((err) => console.error("Setup error:", err));
}

module.exports = {
  checkSession,
  loginToPlatform,
  PLATFORMS
};
