// omnichannel_content.js — Unified AI Content Synthesis for LinkedIn, Instagram, Facebook & Twitter
// Uses Google Gemini 2.5 Flash to generate platform-native formatting for each social network.

const { getActiveProfile } = require("./config/config_loader");
const { fetchTopImpressionEpfoNews } = require("./epfo_content");

function detectArticleMetadata(article) {
  const text = ((article.title || "") + " " + (article.description || "")).toLowerCase();
  
  let category = "GENERAL";
  let categoryBadge = "STATUTORY UPDATE";
  let statNumber = "100%";
  let statLabel = "Verified Compliance";
  let keyPoints = [
    "Official regulatory advisory released under statutory provisions",
    "Establishes critical guidelines for workforce benefits and filings",
    "Review establishment liabilities to ensure zero penal damages"
  ];

  // Extract explicit monetary amounts, percentages, or numbers from headline
  const numMatch = (article.title || "").match(/(?:₹|rs\.?|inr)\s?([\d,]+)|\b(\d+\.?\d*)\s?%|\b(\d+)\s?(?:lakh|crore|employees|staff|days)\b/i);
  if (numMatch) {
    if (numMatch[1]) statNumber = `₹${numMatch[1]}`;
    else if (numMatch[2]) statNumber = `${numMatch[2]}%`;
    else if (numMatch[3]) statNumber = numMatch[0].trim();
  }

  if (text.includes("pension") || text.includes("eps") || text.includes("cbt")) {
    category = "PENSION";
    categoryBadge = "EPS-95 PENSION UPDATE";
    if (statNumber === "100%") { statNumber = "₹3,000"; statLabel = "Proposed Min Pension"; }
    else { statLabel = "Pension Revaluation"; }
    keyPoints = [
      "CBT review & Finance Ministry consultation on minimum monthly pension",
      "Proposed upward revision from current ₹1,000 to ₹3,000 baseline",
      "Statutory retiral security impact for over 78 lakh eligible pensioners"
    ];
  } else if (text.includes("interest") || text.includes("credit")) {
    category = "INTEREST";
    categoryBadge = "ANNUAL INTEREST RATE";
    if (statNumber === "100%") { statNumber = "8.25%"; statLabel = "Credited Rate"; }
    keyPoints = [
      "Official interest rate credited annually to verified member accounts",
      "Compounded monthly and credited after statutory gazette notification",
      "Verify member passbook credit entries via online portal"
    ];
  } else if (text.includes("withdraw") || text.includes("claim") || text.includes("form 31") || text.includes("advance")) {
    category = "WITHDRAWAL";
    categoryBadge = "AUTO-CLAIM & WITHDRAWAL";
    if (statNumber === "100%") { statNumber = "3 Days"; statLabel = "Auto-Settlement Window"; }
    keyPoints = [
      "Streamlined auto-mode settlement up to statutory advance thresholds",
      "Requires KYC compliance, active UAN, and verified bank account linking",
      "Avoid claim rejections by verifying member profile & date of exit"
    ];
  } else if (text.includes("wage") || text.includes("ceiling") || text.includes("15,000") || text.includes("21,000")) {
    category = "WAGE_CEILING";
    categoryBadge = "WAGE CEILING REVISION";
    if (statNumber === "100%") { statNumber = "₹21,000"; statLabel = "Proposed Wage Ceiling"; }
    keyPoints = [
      "Proposed enhancement of statutory wage threshold from ₹15,000 to ₹21,000",
      "Expands mandatory social security coverage to millions of new workers",
      "Employers must prepare for revised payroll liability calculations"
    ];
  } else if (text.includes("7q") || text.includes("14b") || text.includes("damage") || text.includes("penalty") || text.includes("ecr")) {
    category = "COMPLIANCE";
    categoryBadge = "STATUTORY PENALTY AUDIT";
    if (statNumber === "100%") { statNumber = "§§ 7Q & 14B"; statLabel = "Penal Damages & Interest"; }
    keyPoints = [
      "Strict penal interest levied under § 7Q alongside graded damages under § 14B",
      "Timely ECR and challan remittances prevent compounding arrears",
      "Audit establishment compliance records to ensure clean statutory status"
    ];
  }

  return { category, categoryBadge, statNumber, statLabel, keyPoints };
}

/**
 * Generate platform-specific social copy from curated regulatory & industry news
 * @param {Object} genAI - Initialized GoogleGenerativeAI instance
 * @param {'linkedin'|'instagram'|'facebook'|'twitter'|'all'} targetPlatform
 */
async function generateOmnichannelPost(genAI, targetPlatform = "linkedin") {
  const profile = getActiveProfile();
  let article = null;

  // 1. Ingest verified regulatory or niche pool
  if (profile.id === "epfo") {
    try {
      const pool = await fetchTopImpressionEpfoNews();
      if (pool && pool.length > 0) {
        article = pool[Math.floor(Math.random() * pool.length)];
      }
    } catch (e) {
      console.warn("⚠️ Error fetching EPFO news pool, using fallback:", e.message);
    }
  }

  // Fallback to profile feeds or default
  if (!article) {
    article = {
      title: `${profile.name}: Statutory Compliance Guidelines & Advisory`,
      description: "Critical employer compliance updates, statutory filing obligations, and workforce security norms.",
      link: profile.websiteUrl,
      source: "Official Ministry / Gazette Release",
      pubDate: new Date().toISOString()
    };
  }

  const meta = detectArticleMetadata(article);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `You are a senior social media growth director and corporate compliance strategist for "${profile.name}" (${profile.websiteUrl}).
Analyze this official regulatory news release:
Headline: "${article.title}"
Context: "${article.description || article.title}"
Source: "${article.source || 'Official Notification'}"

CRITICAL REQUIREMENTS:
1. FACTUAL ACCURACY: State ONLY verified, accurate facts and numbers directly stated or implied by the article. Zero hallucinations.
2. VISUAL CARD CONTENT: Provide rich, specific data for a unique infographic card that visually tells the whole story (including a prominent stat number, label, and exactly 3 verified, distinct factual bullet points).
3. HOT TRENDING HASHTAGS: Select high-impression, currently trending hashtags for this specific topic, combining statutory tags with viral business tags.

Format your output STRICTLY as a valid JSON object matching this schema:
{
  "category": "${meta.category}",
  "categoryBadge": "${meta.categoryBadge}",
  "headline": "Punchy, catchy, high-curiosity 6-10 word title for image card",
  "statNumber": "${meta.statNumber}",
  "statLabel": "${meta.statLabel}",
  "keyPoints": [
    "Verified core fact 1 from the article (max 85 chars)",
    "Verified rule, threshold, or consequence 2 from the article (max 85 chars)",
    "Actionable employer/employee step or deadline 3 from the article (max 85 chars)"
  ],
  "insight": "1-2 sentence core actionable takeaway for image card (max 120 chars)",
  "resourceTitle": "Name of relevant tool or guide at ${profile.websiteUrl}",
  "trendingHashtags": ["#EPFO", "#Compliance", "...10-15 relevant tags"],
  "linkedin": {
    "post": "Long-form B2B thought leadership post (800-1400 chars). Start with an executive hook. Use paragraph spacing. Detail the compliance background. Include 3 bullet takeaways with exact numbers/sections. State compliance impact for HR/CFOs. End with a call to visit ${profile.websiteUrl} and 5-7 professional hashtags like #Compliance #LabourLaw #HRTech #IndiaBusiness #Payroll"
  },
  "instagram": {
    "caption": "High-engagement visual post caption (400-800 chars). Start with a punchy emoji hook. 4 bulleted takeaways. Strong CTA ('📌 Save this post for your compliance records', '🔗 Link in bio for statutory calculators'). Include 18-22 relevant trending hashtags like #compliance #labourlaw #epfo #hrcommunity #startupindia #taxupdates"
  },
  "facebook": {
    "post": "Engaging community page post (400-800 chars). Conversational, trustworthy tone. Clearly explain how this affects employers and employees. Direct link to ${profile.websiteUrl}. End with a conversation question ('Have you reviewed your establishment status yet?'). Include 4-6 hashtags."
  },
  "twitter": {
    "thread": [
      "Tweet 1 (Hook + Link + Image tag): Hook, core context, link (${profile.websiteUrl}) (1/3)",
      "Tweet 2 (Actionable Breakdown): Key insights, practical steps (2/3)",
      "Tweet 3 (CTA): Conclusion, check out ${profile.websiteUrl} (3/3)"
    ]
  }
}`;

  try {
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        article,
        headline: data.headline || article.title,
        category: data.category || meta.category,
        categoryBadge: data.categoryBadge || meta.categoryBadge,
        statNumber: data.statNumber || meta.statNumber,
        statLabel: data.statLabel || meta.statLabel,
        keyPoints: (Array.isArray(data.keyPoints) && data.keyPoints.length >= 3) ? data.keyPoints : meta.keyPoints,
        insight: data.insight || "Ensure compliance with statutory norms and verify employer liabilities.",
        resourceTitle: data.resourceTitle || "Statutory Calculators",
        resourceUrl: profile.websiteUrl,
        source: article.source,
        pubDate: article.pubDate,
        trendingHashtags: data.trendingHashtags || ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech"],
        linkedin: data.linkedin?.post,
        instagram: data.instagram?.caption,
        facebook: data.facebook?.post,
        twitter: buildTwitterThread(data.twitter, article, meta, profile),
      };
    }
  } catch (err) {
    console.warn("⚠️ Gemini content synthesis fallback:", err.message);
  }

  // Graceful Fallback
  return {
    article,
    headline: article.title,
    category: meta.category,
    categoryBadge: meta.categoryBadge,
    statNumber: meta.statNumber,
    statLabel: meta.statLabel,
    keyPoints: meta.keyPoints,
    insight: "Ensure compliance with statutory norms and verify employer liabilities.",
    resourceTitle: "Statutory Tools & Guides",
    resourceUrl: profile.websiteUrl,
    source: article.source,
    pubDate: article.pubDate,
    trendingHashtags: ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech", "#PensionUpdate"],
    linkedin: `📢 [${meta.categoryBadge}] ${article.title}\n\nKey Highlights for Employers & HR Leaders:\n• ${meta.keyPoints[0]}\n• ${meta.keyPoints[1]}\n• ${meta.keyPoints[2]}\n\n🔗 Explore statutory calculators & compliance tools: ${profile.websiteUrl}\n\n#Compliance #LabourLaw #HRLeadership #Payroll #IndiaBusiness #EPFO`,
    instagram: `🚨 URGENT ${meta.categoryBadge}: ${article.title}\n\nKey Facts You Must Know Today:\n👉 ${meta.keyPoints[0]}\n👉 ${meta.keyPoints[1]}\n👉 ${meta.keyPoints[2]}\n\n📌 Save this post for your compliance records!\n🔗 Direct tools & calculator link in bio: ${profile.websiteUrl}\n\n#compliance #labourlaw #epfo #hrcommunity #taxcompliance #payroll #startupindia #pensionupdate #indianbusiness #cfoindia`,
    facebook: `🔔 Important Compliance Update for Establishments & Employees:\n\n${article.title}\n\nKey Points to Review:\n• ${meta.keyPoints[0]}\n• ${meta.keyPoints[1]}\n• ${meta.keyPoints[2]}\n\nUnderstanding your statutory obligations is essential to avoid unnecessary interest and damages. We have broken down the complete notification and calculation formulas on our platform.\n\n👉 Read the complete breakdown and calculate your liability at ${profile.websiteUrl}\n\nHave you verified your compliance status for this month?\n\n#Compliance #EPFO #LabourLaw #BusinessIndia`,
    twitter: buildTwitterThread(null, article, meta, profile)
  };
}

function buildTwitterThread(rawTwitter, article, meta, profile) {
  let list = [];
  if (Array.isArray(rawTwitter)) {
    list = rawTwitter;
  } else if (rawTwitter && Array.isArray(rawTwitter.thread)) {
    list = rawTwitter.thread;
  } else if (rawTwitter && Array.isArray(rawTwitter.tweets)) {
    list = rawTwitter.tweets;
  } else if (rawTwitter && typeof rawTwitter.post === "string") {
    list = [rawTwitter.post];
  } else if (typeof rawTwitter === "string") {
    list = [rawTwitter];
  }

  if (list.length < 3) {
    list = [
      `🚨 [Update] ${article.title}\n\nKey Metric: ${meta.statNumber} (${meta.statLabel})\nFull advisory & calculators: ${profile.websiteUrl} #Compliance (1/3)`,
      `Key Takeaways:\n• ${meta.keyPoints[0]}\n• ${meta.keyPoints[1]} (2/3)`,
      `Action Step: ${meta.keyPoints[2]}\n\nUse our certified calculators to verify compliance at ${profile.websiteUrl} #EPFO #HRTech (3/3)`
    ];
  }

  return list.slice(0, 3).map((tweet) => {
    let t = String(tweet).trim();
    if (t.length > 270) {
      t = t.slice(0, 265) + "...";
    }
    return t;
  });
}

module.exports = {
  generateOmnichannelPost,
};
