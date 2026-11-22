// master_hub.js — Interactive Terminal Menu for All Social Media & Platform Automations
const readline = require("readline");
const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

process.chdir(__dirname);

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function printHeader() {
  console.log("\x1b[36m===============================================================================\x1b[0m");
  console.log("\x1b[1m\x1b[37m            CORPORATE COMPLIANCE — MASTER AI AUTOMATION HUB (2026)\x1b[0m");
  console.log("\x1b[36m                All Social Media, Thought Leadership & Automations\x1b[0m");
  console.log("\x1b[36m===============================================================================\x1b[0m\n");
}

function printMenu() {
  clearScreen();
  printHeader();

  console.log("\x1b[33m  [A] OMNICHANNEL SOCIAL MEDIA AUTOPILOT (4 PLATFORMS)\x1b[0m");
  console.log("  -----------------------------------------------------------------------------");
  console.log("    \x1b[32m1\x1b[0m. Run Full Omnichannel Post (LinkedIn + Twitter/X + Facebook)");
  console.log("    \x1b[32m2\x1b[0m. Post to LinkedIn Only (350-500w B2B Masterclass + Visual Infographic)");
  console.log("    \x1b[32m3\x1b[0m. Post to Twitter / X Only (5-Part Regulatory Advisory Thread + News Card)");
  console.log("    \x1b[32m4\x1b[0m. Post to Facebook Only (Community Breakdown + Lead Magnet)");
  console.log("    \x1b[32m5\x1b[0m. Post to Instagram Only (Carousel & Narrative Content)");
  console.log("    \x1b[32m6\x1b[0m. Refresh / Connect Instagram Session (Interactive Edge Login)");
  console.log("    \x1b[32m7\x1b[0m. Multi-Platform Session Setup (Inspect Stored Sessions)\n");

  console.log("\x1b[35m  [B] YOUTUBE SHORTS & VIDEO UPLOAD AUTOMATION\x1b[0m");
  console.log("  -----------------------------------------------------------------------------");
  console.log("    \x1b[32m8\x1b[0m. Connect YouTube Channel (@arnavsaroj245 1-Time Edge Login)");
  console.log("    \x1b[32m9\x1b[0m. Upload Existing High-Quality Video to YouTube Shorts (@arnavsaroj245)\n");

  console.log("\x1b[34m  [C] WEB PLATFORM, WORKSPACE & SYSTEM WATCHDOGS\x1b[0m");
  console.log("  -----------------------------------------------------------------------------");
  console.log("   \x1b[32m10\x1b[0m. Open Website /automation Hub in Browser");
  console.log("   \x1b[32m11\x1b[0m. Open Key Workspace in Browser (/automation/workspace)");
  console.log("   \x1b[32m12\x1b[0m. Check Scheduled Tasks & GitHub Actions Runner Status");
  console.log("   \x1b[32m13\x1b[0m. Run Complete System Diagnostic Health Check\n");

  console.log("    \x1b[31m0\x1b[0m. Exit Hub");
  console.log("\x1b[36m===============================================================================\x1b[0m\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function pause() {
  console.log("\n\x1b[90mPress Enter to return to the menu...\x1b[0m");
  await ask("");
}

function runCommand(cmd, args = []) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true });
    child.on("close", resolve);
  });
}

async function main() {
  while (true) {
    printMenu();
    const choice = (await ask("\x1b[1m\x1b[33mSelect an Automation Tool (0-13): \x1b[0m")).trim();

    clearScreen();
    printHeader();

    if (choice === "0") {
      console.log("\x1b[32mThank you for using Corporate Compliance AI Automation Hub. Goodbye!\x1b[0m\n");
      rl.close();
      process.exit(0);
    } else if (choice === "1") {
      console.log("\x1b[36m[***] Launching Full Omnichannel Autopilot Runner...\x1b[0m\n");
      await runCommand("node", ["omnichannel_runner.js", "--platforms=linkedin,twitter,facebook"]);
      await pause();
    } else if (choice === "2") {
      console.log("\x1b[36m[***] Publishing B2B Thought-Leadership Masterclass to LinkedIn...\x1b[0m\n");
      await runCommand("node", ["omnichannel_runner.js", "--platforms=linkedin"]);
      await pause();
    } else if (choice === "3") {
      console.log("\x1b[36m[***] Publishing 5-Part Regulatory Advisory Thread to Twitter / X...\x1b[0m\n");
      await runCommand("node", ["omnichannel_runner.js", "--platforms=twitter"]);
      await pause();
    } else if (choice === "4") {
      console.log("\x1b[36m[***] Publishing Community Compliance Guide to Facebook...\x1b[0m\n");
      await runCommand("node", ["omnichannel_runner.js", "--platforms=facebook"]);
      await pause();
    } else if (choice === "5") {
      console.log("\x1b[36m[***] Publishing Narrative Copy to Instagram...\x1b[0m\n");
      await runCommand("node", ["omnichannel_runner.js", "--platforms=instagram"]);
      await pause();
    } else if (choice === "6") {
      console.log("\x1b[36m[***] Launching Microsoft Edge for Instagram Session Refresh...\x1b[0m\n");
      await runCommand("connect_instagram.bat");
      await pause();
    } else if (choice === "7") {
      console.log("\x1b[36m[***] Launching Multi-Platform Session Configuration Utility...\x1b[0m\n");
      await runCommand("setup_sessions.bat");
      await pause();
    } else if (choice === "8") {
      console.log("\x1b[36m[***] Launching Microsoft Edge for YouTube Studio Login (@arnavsaroj245)...\x1b[0m\n");
      await runCommand("connect_youtube.bat");
      await pause();
    } else if (choice === "9") {
      console.log("\x1b[35m=== AUTONOMOUS YOUTUBE SHORTS UPLOADER (@arnavsaroj245) ===\x1b[0m\n");
      const videoPath = await ask("Enter path to video file (.mp4) to upload: ");
      if (videoPath.trim()) {
        const title = await ask("Enter Short Title (with #Shorts) [Default: EPFO Compliance Guide #Shorts]: ");
        const titleArg = title.trim() ? `--title="${title.trim()}"` : "";
        await runCommand("node", ["youtube_poster.js", `--video="${videoPath.trim()}"`, titleArg].filter(Boolean));
      } else {
        console.log("No video file entered.");
      }
      await pause();
    } else if (choice === "10") {
      console.log("\x1b[36m[***] Opening /automation Hub in Default Web Browser...\x1b[0m\n");
      await runCommand(`start "" "https://corporatecompliance.in/automation"`);
    } else if (choice === "11") {
      console.log("\x1b[36m[***] Opening Unified Key Workspace in Default Web Browser...\x1b[0m\n");
      await runCommand(`start "" "https://corporatecompliance.in/automation/workspace"`);
    } else if (choice === "12") {
      console.log("\x1b[34m=== SCHEDULED TASKS & BACKGROUND SERVICES ===\x1b[0m\n");
      await runCommand(`powershell -Command "Get-ScheduledTask -TaskName 'EPFO_*', 'GitHub_*' -ErrorAction SilentlyContinue | Select-Object TaskName, State, LastRunTime, NextRunTime | Format-Table -AutoSize"`);
      console.log("\nGitHub Actions Self-Hosted Runner Process:");
      await runCommand(`powershell -Command "Get-Process -Name 'Runner.Listener', 'Runner.Worker' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU, WorkingSet64 | Format-Table -AutoSize"`);
      await pause();
    } else if (choice === "13") {
      console.log("\x1b[34m=== SYSTEM DIAGNOSTIC HEALTH CHECK ===\x1b[0m\n");
      console.log("[1/5] Node.js Version:", process.version);
      try {
        const ff = execSync("where ffmpeg", { encoding: "utf8" }).trim().split("\n")[0];
        console.log("[2/5] FFmpeg Binary:", ff);
      } catch (_) {
        console.log("[2/5] FFmpeg Binary: Not Found");
      }
      try {
        const yt = execSync("where yt-dlp", { encoding: "utf8" }).trim().split("\n")[0];
        console.log("[3/5] yt-dlp Binary:", yt);
      } catch (_) {
        console.log("[3/5] yt-dlp Binary: Not Found");
      }

      console.log("\n[4/5] Stored User Data Sessions:");
      const sessions = [
        { name: "Twitter/X", dir: ".twitter_user_data" },
        { name: "LinkedIn", dir: ".linkedin_user_data" },
        { name: "Facebook", dir: ".facebook_user_data" },
        { name: "Instagram", dir: ".instagram_user_data" },
        { name: "YouTube", dir: ".youtube_user_data" }
      ];
      for (const s of sessions) {
        const exists = fs.existsSync(path.join(__dirname, s.dir));
        console.log(`  - ${s.name.padEnd(12)}: ${exists ? "Ready (Persistent Session Stored)" : "Not Configured"}`);
      }

      console.log("\n[5/5] Core Autopilot Scripts:");
      const scripts = [
        "omnichannel_runner.js",
        "poster.js",
        "daily_runner.js",
        "youtube_poster.js",
        "setup_sessions.js"
      ];
      for (const sc of scripts) {
        console.log(`  - ${sc.padEnd(25)}: ${fs.existsSync(path.join(__dirname, sc)) ? "OK" : "Missing"}`);
      }
      await pause();
    } else {
      console.log("\x1b[31m[!] Invalid selection. Please enter a number between 0 and 13.\x1b[0m\n");
      await pause();
    }
  }
}

main().catch((err) => {
  console.error("Fatal Error in Automation Hub:", err);
  rl.close();
});
