// master_hub.js — Interactive Terminal Menu for All Social Media & YouTube Reel Automations
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
  console.log("\x1b[36m                All Social Media, YouTube & Reel Engines in One Place\x1b[0m");
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
  console.log("    \x1b[32m5\x1b[0m. Post to Instagram Only (Viral Reel/Carousel Copy)");
  console.log("    \x1b[32m6\x1b[0m. Refresh / Connect Instagram Session (Interactive Edge Login)");
  console.log("    \x1b[32m7\x1b[0m. Multi-Platform Session Setup (Inspect Stored Sessions)\n");

  console.log("\x1b[35m  [B] SUPER YOUTUBE SHORTS & INSTAGRAM REEL MAKER (MULTI-ENGINE)\x1b[0m");
  console.log("  -----------------------------------------------------------------------------");
  console.log("    \x1b[32m8\x1b[0m. Generate Reel from Scratch (Topic Prompt -> 60fps Multi-Engine Video)");
  console.log("    \x1b[32m9\x1b[0m. 1-Link YouTube Long-to-Short Viral Clipper (Enter URL -> 9:16 Shorts)");
  console.log("   \x1b[32m10\x1b[0m. Compile 1.5s–2.5s Beat Sheet Preview (Timeline JSON Compiler)");
  console.log("   \x1b[32m11\x1b[0m. Generate Vox Documentary Collage Scene (HTML Preview in Browser)");
  console.log("   \x1b[32m12\x1b[0m. Auto-Upload Latest Rendered Short to YouTube (@arnavsaroj245)");
  console.log("   \x1b[32m13\x1b[0m. Connect YouTube Channel (@arnavsaroj245 1-Time Edge Login)");
  console.log("   \x1b[32m14\x1b[0m. Open Video Renders Output Folder in Windows Explorer\n");

  console.log("\x1b[34m  [C] WEB PLATFORM, WORKSPACE & SYSTEM WATCHDOGS\x1b[0m");
  console.log("  -----------------------------------------------------------------------------");
  console.log("   \x1b[32m15\x1b[0m. Open Website /automation Hub in Browser");
  console.log("   \x1b[32m16\x1b[0m. Open Key Workspace in Browser (/automation/workspace)");
  console.log("   \x1b[32m17\x1b[0m. Check Scheduled Watchdogs & GitHub Actions Runner Status");
  console.log("   \x1b[32m18\x1b[0m. Run Complete System Diagnostic Health Check\n");

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
    const choice = (await ask("\x1b[1m\x1b[33mSelect an Automation Tool (0-16): \x1b[0m")).trim();

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
      console.log("\x1b[36m[***] Publishing Viral Reel/Carousel Copy to Instagram...\x1b[0m\n");
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
      console.log("\x1b[35m=== SUPER REEL MAKER FROM SCRATCH (1080x1920 @ 60fps) ===\x1b[0m\n");
      let topic = await ask("Enter Topic/Concept [Default: Why 80% of EPFO Joint Declarations Get Rejected]: ");
      topic = topic.trim() || "Why 80% of EPFO Joint Declarations Get Rejected";

      let duration = await ask("Enter Target Duration in Seconds (30-60) [Default: 40]: ");
      duration = duration.trim() || "40";

      let style = await ask("Enter Visual Style (hybrid_super_reel / wan2gp_cinematic / vox_collage / hyperframes_motion) [Default: hybrid_super_reel]: ");
      style = style.trim() || "hybrid_super_reel";

      console.log("\n\x1b[36m[***] Compiling Super Reel Blueprint and Multi-Engine Visual Layers...\x1b[0m\n");
      await runCommand("node", [
        "super_reel_engine/super_reel_orchestrator.js",
        "--mode=scratch",
        `--topic="${topic}"`,
        `--duration=${duration}`,
        `--style="${style}"`
      ]);
      await pause();
    } else if (choice === "9") {
      console.log("\x1b[35m=== 1-LINK YOUTUBE TO VIRAL 9:16 SHORTS CLIPPER (OPUSCLIP ENGINE) ===\x1b[0m\n");
      let yturl = await ask("Enter YouTube Video URL [Default: sample]: ");
      yturl = yturl.trim() || "https://www.youtube.com/watch?v=sample";

      let clips = await ask("Number of Viral Clips to Extract (1-5) [Default: 3]: ");
      clips = clips.trim() || "3";

      console.log("\n\x1b[36m[***] Ingesting Video, Scoring Virality & Building 9:16 Face-Track Subtitles...\x1b[0m\n");
      await runCommand("node", [
        "super_reel_engine/super_reel_orchestrator.js",
        "--mode=clip",
        `--url="${yturl}"`,
        `--clips=${clips}`
      ]);
      await pause();
    } else if (choice === "10") {
      console.log("\x1b[35m=== LIVE 1.5s–2.5s BEAT SHEET TIMELINE COMPILER ===\x1b[0m\n");
      let topic = await ask("Enter Topic for Beat Sheet [Default: EPFO Interest Relief & Faster Settlement 2026]: ");
      topic = topic.trim() || "EPFO Interest Relief & Faster Settlement 2026";

      console.log("\n\x1b[36m[***] Compiling 1.5s–2.5s Visual Beat Cadence...\x1b[0m\n");
      const { compileBeatSheet } = require("./super_reel_engine/super_beat_sheet");
      const res = compileBeatSheet({ topic, durationSec: 40 });
      console.log(JSON.stringify(res, null, 2));
      await pause();
    } else if (choice === "11") {
      console.log("\x1b[35m=== VOX DOCUMENTARY COLLAGE & EVIDENCE BOARD GENERATOR ===\x1b[0m\n");
      let topic = await ask("Enter Evidence Board Headline [Default: THE HIDDEN STATUTORY BOTTLENECK]: ");
      topic = topic.trim() || "THE HIDDEN STATUTORY BOTTLENECK";

      console.log("\n\x1b[36m[***] Generating Vox Halftone Scissor Cutout & Highlighter HTML Scene...\x1b[0m\n");
      const { generateCollageSceneHtml } = require("./super_reel_engine/collage_broll_generator");
      const html = generateCollageSceneHtml({ headline: topic });
      const outPath = path.join(__dirname, "super_reel_engine", "renders", "vox_preview.html");
      fs.writeFileSync(outPath, html, "utf8");
      console.log("\x1b[32mSaved to:\x1b[0m", outPath);
      await runCommand(`start "" "${outPath}"`);
      await pause();
    } else if (choice === "12") {
      console.log("\x1b[35m=== AUTONOMOUS YOUTUBE SHORTS UPLOADER (@arnavsaroj245) ===\x1b[0m\n");
      await runCommand("node", ["youtube_poster.js"]);
      await pause();
    } else if (choice === "13") {
      console.log("\x1b[36m[***] Launching Microsoft Edge for YouTube Studio Login (@arnavsaroj245)...\x1b[0m\n");
      await runCommand("connect_youtube.bat");
      await pause();
    } else if (choice === "14") {
      console.log("\x1b[36m[***] Opening Video Renders Directory in Windows Explorer...\x1b[0m\n");
      const rendersPath = path.join(__dirname, "super_reel_engine", "renders");
      await runCommand(`explorer "${rendersPath}"`);
    } else if (choice === "15") {
      console.log("\x1b[36m[***] Opening /automation Hub in Default Web Browser...\x1b[0m\n");
      await runCommand(`start "" "https://corporatecompliance.in/automation"`);
    } else if (choice === "16") {
      console.log("\x1b[36m[***] Opening Unified Key Workspace in Default Web Browser...\x1b[0m\n");
      await runCommand(`start "" "https://corporatecompliance.in/automation/workspace"`);
    } else if (choice === "17") {
      console.log("\x1b[34m=== SCHEDULED WATCHDOGS & BACKGROUND TASKS ===\x1b[0m\n");
      await runCommand(`powershell -Command "Get-ScheduledTask -TaskName 'EPFO_*', 'GitHub_*' -ErrorAction SilentlyContinue | Select-Object TaskName, State, LastRunTime, NextRunTime | Format-Table -AutoSize"`);
      console.log("\nGitHub Actions Self-Hosted Runner Process:");
      await runCommand(`powershell -Command "Get-Process -Name 'Runner.Listener', 'Runner.Worker' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU, WorkingSet64 | Format-Table -AutoSize"`);
      await pause();
    } else if (choice === "18") {
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
      try {
        execSync("ping -n 1 dns.google", { stdio: "ignore" });
        console.log("[4/5] Internet Connectivity: Active (Online)");
      } catch (_) {
        console.log("[4/5] Internet Connectivity: Offline");
      }
      try {
        const status = fs.readFileSync(path.join(__dirname, "omnichannel_posting_status.json"), "utf8");
        console.log("\n[5/5] Latest Omnichannel Posting Status:\n", status);
      } catch (_) {}
      await pause();
    } else {
      console.log("\x1b[31m[!] Invalid selection. Please enter a number between 0 and 16.\x1b[0m");
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
