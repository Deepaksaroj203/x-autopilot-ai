// collage_broll_generator.js — Vox, Kurzgesagt & Johnny Harris Documentary Collage Engine
// Generates dynamic multi-panel B-roll grids, halftone cutouts with scissor borders, torn paper textures, and animated highlighter sweeps.

const fs = require("fs");
const path = require("path");

/**
 * Builds HTML/Canvas composition markup for a 9:16 Vox Documentary Collage scene.
 * Compatible with HyperFrames, Playwright frame capture, and Remotion HTML embedding.
 */
function generateCollageSceneHtml({
  headline = "THE HIDDEN REGULATORY BOTTLENECK",
  subText = "Section 7A Inquiry & 12% Penal Damages",
  highlightPhrase = "12% Penal Damages",
  statNumber = "₹15,000",
  statLabel = "Statutory Wage Cap",
  images = [],
  aspect = "9:16",
  accentColor = "#f43f5e"
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0">
  <title>Vox Documentary Collage Scene</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px;
      height: 1920px;
      background-color: #0b0f19;
      background-image: 
        radial-gradient(circle at 50% 20%, rgba(244, 63, 94, 0.12) 0%, transparent 60%),
        radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 50%),
        repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 8px);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      position: relative;
    }

    /* 35mm Subtle Film Grain Overlay */
    .film-grain {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 50;
    }

    /* Strict 9:16 Safe Zone Container (x: 60..900, y: 260..1480) */
    .safe-zone-container {
      position: absolute;
      top: 260px;
      left: 60px;
      width: 960px;
      height: 1220px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 10;
    }

    /* Top Advisory / Category Badge */
    .badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      background: rgba(244, 63, 94, 0.2);
      border: 2px solid ${accentColor};
      border-radius: 9999px;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #fecdd3;
      box-shadow: 0 8px 24px rgba(244, 63, 94, 0.25);
    }

    /* Headline with Animated Highlighter Sweep */
    .headline-box {
      margin-top: 24px;
    }
    .headline-title {
      font-size: 58px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -1px;
      color: #ffffff;
      text-shadow: 0 4px 18px rgba(0,0,0,0.8);
    }
    .highlighter-text {
      position: relative;
      display: inline;
      color: #0b0f19;
      font-weight: 900;
      padding: 2px 14px;
      border-radius: 4px;
      background: #fde047; /* Yellow Highlighter */
      box-shadow: 0 4px 14px rgba(253, 224, 71, 0.4);
    }

    /* Multi-Panel Collage Board */
    .collage-board {
      margin-top: 36px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      height: 480px;
    }
    .collage-card {
      position: relative;
      background: #1e293b;
      border: 3px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 24px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .collage-card.torn-paper {
      background: #f8fafc;
      color: #0f172a;
      transform: rotate(-2deg);
      border: 4px dashed #94a3b8;
    }
    .collage-card.halftone-cutout {
      background: #0f172a;
      transform: rotate(2.5deg);
      border: 3px solid #38bdf8;
    }

    /* Rubber Stamp Effect */
    .rubber-stamp {
      position: absolute;
      top: 20px;
      right: 20px;
      border: 5px solid #ef4444;
      color: #ef4444;
      padding: 8px 18px;
      font-size: 32px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 3px;
      border-radius: 12px;
      transform: rotate(-14deg);
      opacity: 0.92;
      mask-image: radial-gradient(circle, rgba(0,0,0,1) 70%, rgba(0,0,0,0.4) 100%);
    }

    /* Big Rolling Number Display */
    .stat-display {
      font-size: 76px;
      font-weight: 900;
      color: #38bdf8;
      letter-spacing: -2px;
      line-height: 1;
    }
    .stat-label-text {
      font-size: 26px;
      font-weight: 700;
      color: #94a3b8;
      margin-top: 8px;
    }

    /* Bottom Hook Pill / Retention Callout */
    .bottom-callout {
      background: rgba(15, 23, 42, 0.9);
      border: 2px solid rgba(56, 189, 248, 0.4);
      border-radius: 24px;
      padding: 22px 30px;
      display: flex;
      align-items: center;
      gap: 18px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    }
    .bottom-callout-icon {
      font-size: 42px;
    }
    .bottom-callout-text {
      font-size: 28px;
      font-weight: 700;
      color: #e2e8f0;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div class="film-grain"></div>

  <div class="safe-zone-container">
    <div>
      <div class="badge-row">
        <span class="badge">⚖️ Statutory Evidence Board</span>
        <span style="font-size: 22px; color: #94a3b8; font-weight: 700;">Beat 04 • Vox Split Grid</span>
      </div>

      <div class="headline-box">
        <h1 class="headline-title">
          ${headline.replace(highlightPhrase, `<span class="highlighter-text">${highlightPhrase}</span>`)}
        </h1>
      </div>

      <div class="collage-board">
        <!-- Card 1: Torn Paper Statutory Memo -->
        <div class="collage-card torn-paper">
          <div>
            <div style="font-size: 20px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Audit Finding #01</div>
            <div style="font-size: 32px; font-weight: 900; margin-top: 8px; color: #0f172a; line-height: 1.2;">
              ${subText}
            </div>
          </div>
          <div style="font-size: 22px; font-weight: 700; color: #ef4444;">
            ⚠️ Non-Negotiable Compliance Ceiling
          </div>
        </div>

        <!-- Card 2: Halftone Cutout with Rubber Stamp -->
        <div class="collage-card halftone-cutout">
          <div class="rubber-stamp">VERIFIED</div>
          <div>
            <div class="stat-display">${statNumber}</div>
            <div class="stat-label-text">${statLabel}</div>
          </div>
          <div style="font-size: 22px; font-weight: 600; color: #38bdf8;">
            🏛️ Governed under EPF &amp; MP Act 1952
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Retention Callout (Within Safe Zones) -->
    <div class="bottom-callout">
      <span class="bottom-callout-icon">💡</span>
      <div class="bottom-callout-text">
        <strong>HR Takeaway:</strong> Discrepancies trigger simple interest compounding under Section 7Q. Reconcile digital ledgers before filing.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds an FFmpeg complex filter string to overlay a 2-panel or 3-panel dynamic B-roll collage
 * over background footage with spring transitions.
 */
function buildFfmpegCollageFilter({
  baseVideo = "base.mp4",
  brollClip1 = "broll1.mp4",
  brollClip2 = "broll2.mp4",
  startTimeSec = 7.5,
  endTimeSec = 10.0
}) {
  return [
    `[1:v]scale=460:600:force_original_aspect_ratio=increase,crop=460:600[b1];`,
    `[2:v]scale=460:600:force_original_aspect_ratio=increase,crop=460:600[b2];`,
    `[b1]drawbox=x=0:y=0:w=460:h=600:color=white@0.8:t=4[b1_bordered];`,
    `[b2]drawbox=x=0:y=0:w=460:h=600:color=white@0.8:t=4[b2_bordered];`,
    `[0:v][b1_bordered]overlay=x=60:y=620:enable='between(t,${startTimeSec},${endTimeSec})'[ov1];`,
    `[ov1][b2_bordered]overlay=x=560:y=620:enable='between(t,${startTimeSec},${endTimeSec})'[outv]`
  ].join("");
}

module.exports = {
  generateCollageSceneHtml,
  buildFfmpegCollageFilter
};
