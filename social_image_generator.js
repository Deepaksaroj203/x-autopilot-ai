// social_image_generator.js — High-Res Branded Card Generator for Instagram, LinkedIn, Facebook & Twitter
// Renders pixel-perfect visual graphics via Playwright with 2x retina scale factor (zero native C++ dependencies).

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate platform-optimized high-res infographic card
 * @param {Object} opts
 * @param {'instagram'|'linkedin'|'facebook'|'twitter'} opts.platform
 * @param {string} opts.headline
 * @param {string} opts.insight
 * @param {string} opts.resourceTitle
 * @param {string} opts.resourceUrl
 * @param {string} opts.source
 * @param {string} opts.pubDate
 * @param {string} [opts.brandName]
 * @param {string} [opts.brandHandle]
 * @param {string} [opts.categoryBadge]
 */
async function generateSocialCard(opts) {
  const {
    platform = "instagram",
    headline,
    insight,
    resourceTitle = "Compliance Tools",
    resourceUrl = "https://corporatecompliance.in",
    source = "Official Gazette / Regulatory Alert",
    pubDate,
    brandName = "Corporate Compliance",
    brandHandle = "@corporatecompliance.in",
    categoryBadge = "STATUTORY UPDATE"
  } = opts;

  const safeHeadline = escapeHtml(headline || "Statutory Regulatory Notification");
  const safeInsight = escapeHtml(insight || "Key compliance guidelines and employer advisory notes.");
  const safeTitle = escapeHtml(resourceTitle);
  const safeSource = escapeHtml(source);
  const safeBrandName = escapeHtml(brandName);
  const safeBrandHandle = escapeHtml(brandHandle);
  const safeCategory = escapeHtml(categoryBadge);

  const formattedDate = pubDate
    ? new Date(pubDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  let width = 1200;
  let height = 675;
  let themeGradient = "radial-gradient(circle at 10% 20%, #132742 0%, #0a1120 90%)";
  let accentColor = "#3b82f6";
  let badgeIcon = "⚖️";
  let platformLabel = "Official Advisory";
  let aspectRatio = "16:9";

  if (platform === "instagram") {
    // 1080x1080 Square (1:1) or 1080x1350 Portrait (4:5)
    width = 1080;
    height = 1080;
    aspectRatio = "1:1";
    themeGradient = "radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0b0f19 50%, #030712 100%)";
    accentColor = "#ec4899"; // Pink/Purple vibrant modern accent
    badgeIcon = "🚨";
    platformLabel = "Breaking Update";
  } else if (platform === "linkedin") {
    // 1200x628 Executive Landscape (or 1080x1080)
    width = 1200;
    height = 628;
    aspectRatio = "1.91:1";
    themeGradient = "radial-gradient(circle at 15% 15%, #0a2540 0%, #061224 85%)";
    accentColor = "#0ea5e9"; // Crisp LinkedIn executive blue
    badgeIcon = "🏛️";
    platformLabel = "Executive Legal Brief";
  } else if (platform === "facebook") {
    // 1200x630 Community Landscape
    width = 1200;
    height = 630;
    aspectRatio = "1.91:1";
    themeGradient = "radial-gradient(circle at 10% 20%, #0f2b48 0%, #081426 90%)";
    accentColor = "#2563eb"; // Facebook vibrant blue
    badgeIcon = "📢";
    platformLabel = "Compliance Alert";
  }

  const outputFilename = `generated_${platform}_image.png`;
  const outputPath = path.join(__dirname, outputFilename);
  console.log(`🎨 Rendering high-res card for ${platform.toUpperCase()} (${width}x${height})...`);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${width}px;
      height: ${height}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif;
      background: ${themeGradient};
      color: #ffffff;
      padding: ${platform === 'instagram' ? '56px 48px' : '44px 50px'};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
    .bg-grid {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
      background-size: ${platform === 'instagram' ? '44px 44px' : '40px 40px'};
      z-index: 1;
    }
    .glow-orb-top {
      position: absolute;
      top: -100px;
      right: -80px;
      width: 440px;
      height: 440px;
      background: radial-gradient(circle, ${accentColor}33 0%, transparent 70%);
      border-radius: 50%;
      z-index: 1;
    }
    .glow-orb-bottom {
      position: absolute;
      bottom: -100px;
      left: -80px;
      width: 380px;
      height: 380px;
      background: radial-gradient(circle, #10b98122 0%, transparent 70%);
      border-radius: 50%;
      z-index: 1;
    }
    .content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-primary {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(14, 165, 233, 0.18);
      border: 1px solid ${accentColor}66;
      padding: ${platform === 'instagram' ? '10px 22px' : '8px 18px'};
      border-radius: 24px;
      font-size: ${platform === 'instagram' ? '16px' : '13px'};
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #93c5fd;
    }
    .badge-date {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: ${platform === 'instagram' ? '10px 22px' : '8px 18px'};
      border-radius: 20px;
      font-size: ${platform === 'instagram' ? '15px' : '13px'};
      font-weight: 600;
      color: #cbd5e1;
      letter-spacing: 0.4px;
    }
    .main-body {
      margin: auto 0;
      display: flex;
      flex-direction: column;
      gap: ${platform === 'instagram' ? '28px' : '18px'};
    }
    .headline {
      font-size: ${platform === 'instagram' ? '40px' : '34px'};
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      letter-spacing: -0.6px;
      text-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      display: -webkit-box;
      -webkit-line-clamp: ${platform === 'instagram' ? '4' : '3'};
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .advisory-box {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-left: 6px solid #10b981;
      border-radius: 18px;
      padding: ${platform === 'instagram' ? '22px 26px' : '16px 22px'};
      display: flex;
      align-items: flex-start;
      gap: 16px;
      backdrop-filter: blur(10px);
    }
    .advisory-icon {
      font-size: ${platform === 'instagram' ? '28px' : '24px'};
      flex-shrink: 0;
      margin-top: 2px;
    }
    .advisory-text {
      font-size: ${platform === 'instagram' ? '20px' : '17px'};
      line-height: 1.45;
      color: #e2e8f0;
      font-weight: 500;
      display: -webkit-box;
      -webkit-line-clamp: ${platform === 'instagram' ? '3' : '2'};
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: ${platform === 'instagram' ? '18px 26px' : '12px 22px'};
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: ${platform === 'instagram' ? '42px' : '34px'};
      height: ${platform === 'instagram' ? '42px' : '34px'};
      background: linear-gradient(135deg, #2563eb, #10b981);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: ${platform === 'instagram' ? '18px' : '15px'};
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
    .brand-name {
      font-size: ${platform === 'instagram' ? '20px' : '17px'};
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.2px;
    }
    .brand-tag {
      font-size: ${platform === 'instagram' ? '14px' : '12px'};
      color: #94a3b8;
      display: block;
      margin-top: 2px;
    }
    .action-pill {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: ${platform === 'instagram' ? '16px' : '14px'};
      padding: ${platform === 'instagram' ? '12px 24px' : '9px 20px'};
      border-radius: 24px;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-orb-top"></div>
  <div class="glow-orb-bottom"></div>
  <div class="content">
    <div class="header">
      <div class="badge-primary">
        <span>${badgeIcon}</span>
        <span>${safeCategory}</span>
      </div>
      <div class="badge-date">
        <span>${safeSource} • ${formattedDate}</span>
      </div>
    </div>

    <div class="main-body">
      <div class="headline">${safeHeadline}</div>
      <div class="advisory-box">
        <div class="advisory-icon">💡</div>
        <div class="advisory-text">${safeInsight}</div>
      </div>
    </div>

    <div class="footer">
      <div class="brand-left">
        <div class="brand-logo">CC</div>
        <div>
          <span class="brand-name">${safeBrandName}</span>
          <span class="brand-tag">${safeBrandHandle}</span>
        </div>
      </div>
      <div class="action-pill">
        <span>${safeTitle}</span>
        <span>&rarr;</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch (_) {
    browser = await chromium.launch({ headless: true });
  }

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2, // 2x deviceScaleFactor yields crystal-clear 4K-ready outputs
    });

    await page.setContent(htmlContent, { waitUntil: "load" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: outputPath, type: "png" });
    console.log(`✅ ${platform.toUpperCase()} visual card generated: ${outputPath}`);
    return outputPath;
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateSocialCard,
};
