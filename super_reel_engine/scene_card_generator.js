// scene_card_generator.js — Broadcast-Grade 1080x1920 (9:16) Card Renderer
// Uses Playwright to render high-contrast, safe-zone compliant visual cards for each beat.

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

async function renderAllBeatCards(beats, outputDir, onProgress = null) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  const cardPaths = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const html = generateBeatHtml(beat, i + 1, beats.length);
    await page.setContent(html);

    const cardPath = path.join(outputDir, `beat_card_${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: cardPath });
    cardPaths.push({
      path: cardPath,
      durationSec: beat.durationSec,
      beatIndex: i + 1
    });

    if (onProgress) {
      const pct = Math.round(((i + 1) / beats.length) * 100);
      onProgress(pct, `Beat ${i + 1}/${beats.length}`);
    }
  }

  await browser.close();
  return cardPaths;
}

function generateBeatHtml(beat, index, total) {
  const isHook = beat.beatType === "hook" || index === 1;
  const isOutro = beat.beatType === "outro" || index === total;
  const isProblem = beat.beatType === "problem";
  const isSolution = beat.beatType === "solution";

  let accentColor = "#00F0FF"; // Cyan default
  let tagText = "VERIFIED BREAKDOWN";
  let tagBg = "rgba(0, 240, 255, 0.15)";
  let tagBorder = "#00F0FF";

  if (isHook) {
    accentColor = "#FF0055";
    tagText = "CRITICAL ALERT";
    tagBg = "rgba(255, 0, 85, 0.2)";
    tagBorder = "#FF0055";
  } else if (isProblem) {
    accentColor = "#FFB800";
    tagText = "SYSTEM CONFLICT EXPOSED";
    tagBg = "rgba(255, 184, 0, 0.2)";
    tagBorder = "#FFB800";
  } else if (isSolution) {
    accentColor = "#00FFA3";
    tagText = "VERIFIED FIX PROTOCOL";
    tagBg = "rgba(0, 255, 163, 0.2)";
    tagBorder = "#00FFA3";
  } else if (isOutro) {
    accentColor = "#00F0FF";
    tagText = "OFFICIAL ADVISORY 2026";
    tagBg = "rgba(0, 240, 255, 0.2)";
    tagBorder = "#00F0FF";
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1080px;
      height: 1920px;
      background: radial-gradient(circle at 50% 20%, #151828 0%, #08090E 70%, #030407 100%);
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      position: relative;
    }

    /* Ambient Glows */
    .glow-top {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 500px;
      background: radial-gradient(circle, ${accentColor}33 0%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
    }

    /* Strict 9:16 Safe Zone Container */
    .safe-container {
      width: 1080px;
      height: 1920px;
      padding: 280px 80px 240px 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }

    /* Header / Tag */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      display: inline-block;
      background: ${tagBg};
      border: 2px solid ${tagBorder};
      color: ${accentColor};
      padding: 12px 30px;
      border-radius: 40px;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      box-shadow: 0 0 25px ${accentColor}40;
    }
    .beat-counter {
      font-size: 26px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 1px;
    }

    /* Center Main Card */
    .main-card {
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid rgba(255, 255, 255, 0.12);
      border-radius: 36px;
      padding: 50px 50px;
      backdrop-filter: blur(24px);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      position: relative;
    }

    .headline {
      font-size: 64px;
      font-weight: 900;
      line-height: 1.15;
      margin: 0 0 26px 0;
      background: linear-gradient(135deg, #FFFFFF 30%, ${accentColor});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .subtext {
      font-size: 36px;
      line-height: 1.45;
      color: #CBD5E1;
      margin: 0 0 36px 0;
      font-weight: 500;
    }

    /* Stat Box */
    .stat-container {
      display: flex;
      align-items: center;
      gap: 30px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 24px 36px;
      margin-top: 10px;
    }
    .stat-number {
      font-size: 96px;
      font-weight: 900;
      color: ${accentColor};
      line-height: 1;
      text-shadow: 0 0 35px ${accentColor}80;
      white-space: nowrap;
    }
    .stat-label {
      font-size: 28px;
      font-weight: 700;
      color: #F8FAFC;
      line-height: 1.3;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Step Pill */
    .step-box {
      margin-top: 30px;
      display: flex;
      align-items: center;
      gap: 20px;
      background: rgba(255, 255, 255, 0.07);
      border-left: 6px solid ${accentColor};
      border-radius: 12px;
      padding: 20px 24px;
      font-size: 30px;
      font-weight: 600;
      color: #E2E8F0;
    }

    /* Footer Branding */
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 2px solid rgba(255, 255, 255, 0.1);
      padding-top: 30px;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #F1F5F9;
      text-transform: uppercase;
    }
    .brand-url {
      font-size: 26px;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="glow-top"></div>
  <div class="safe-container">
    <div class="header-bar">
      <span class="badge">${tagText}</span>
      <span class="beat-counter">${index}/${total}</span>
    </div>

    <div class="main-card">
      <h1 class="headline">${beat.headline}</h1>
      <p class="subtext">${beat.subtext}</p>
      
      <div class="stat-container">
        <div class="stat-number">${beat.statNumber || "EPFO"}</div>
        <div class="stat-label">${beat.statLabel || "Statutory Guide"}</div>
      </div>

      ${beat.stepHighlight ? `
        <div class="step-box">
          <span>⚡ ${beat.stepHighlight}</span>
        </div>
      ` : ""}
    </div>

    <div class="footer-bar">
      <span class="brand-title">CORPORATE COMPLIANCE</span>
      <span class="brand-url">corporatecompliance.in</span>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderAllBeatCards };
