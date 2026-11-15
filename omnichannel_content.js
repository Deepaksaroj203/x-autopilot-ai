// omnichannel_content.js — Unified AI Content Synthesis for LinkedIn, Instagram, Facebook & Twitter
// Uses Google Gemini 2.5 Flash to generate platform-native formatting for each social network.

const { getActiveProfile } = require("./config/config_loader");
const { getEpfoNewsPool } = require("./epfo_content");

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
    const pool = await getEpfoNewsPool();
    if (pool && pool.length > 0) {
      article = pool[Math.floor(Math.random() * pool.length)];
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

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a senior B2B social media growth strategist for "${profile.name}" (${profile.websiteUrl}).
Based on this official compliance news article:
Headline: "${article.title}"
Context: "${article.description || article.title}"
Source: "${article.source || 'Official Notification'}"

Create tailored content for LinkedIn, Instagram, Facebook, and Twitter.
Format your output STRICTLY as a valid JSON object matching this schema:
{
  "headline": "Punchy 6-10 word title for image graphic",
  "insight": "1-2 sentence core actionable takeaway for image card (max 140 chars)",
  "resourceTitle": "Name of relevant tool or guide at ${profile.websiteUrl}",
  "linkedin": {
    "post": "Long-form B2B thought leadership post (800-1400 chars). Start with an executive hook. Use paragraph spacing. Include 3 bullet takeaways. State compliance impact for HR/CFOs. End with a call to visit ${profile.websiteUrl} and 4-6 professional hashtags like #Compliance #LabourLaw #HRTech #IndiaBusiness #Payroll"
  },
  "instagram": {
    "caption": "High-engagement visual post caption (400-800 chars). Start with a punchy emoji hook. 4 bulleted takeaways. Strong CTA ('📌 Save this post for your compliance records', '🔗 Link in bio for statutory calculators'). Include 12-18 relevant hashtags like #compliance #labourlaw #epfo #hrcommunity #startupindia #taxupdates"
  },
  "facebook": {
    "post": "Engaging community page post (400-800 chars). Conversational, trustworthy tone. Clearly explain how this affects employers and employees. Direct link to ${profile.websiteUrl}. End with a conversation question ('Have you reviewed your establishment status yet?')."
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
        insight: data.insight || "Review statutory compliance guidelines and calculator tools.",
        resourceTitle: data.resourceTitle || "Statutory Calculators",
        resourceUrl: profile.websiteUrl,
        source: article.source,
        pubDate: article.pubDate,
        linkedin: data.linkedin?.post,
        instagram: data.instagram?.caption,
        facebook: data.facebook?.post,
        twitter: data.twitter?.thread || [article.title],
      };
    }
  } catch (err) {
    console.warn("⚠️ Gemini content synthesis fallback:", err.message);
  }

  // Graceful Fallback
  return {
    article,
    headline: article.title,
    insight: "Ensure compliance with statutory norms and verify employer liabilities.",
    resourceTitle: "Statutory Tools & Guides",
    resourceUrl: profile.websiteUrl,
    source: article.source,
    pubDate: article.pubDate,
    linkedin: `📢 [Statutory Advisory] ${article.title}\n\nKey Highlights for Employers & HR Leaders:\n• Proactive compliance avoids arrears and penal interest under §§ 7Q & 14B.\n• Verify wage thresholds and statutory ceilings.\n• Access interactive payroll and retiral calculators online.\n\n🔗 Explore statutory tools: ${profile.websiteUrl}\n\n#Compliance #LabourLaw #HRLeadership #Payroll #IndiaBusiness`,
    instagram: `🚨 URGENT UPDATE: ${article.title}\n\nKey takeaways you need to know today:\n👉 Official regulatory circular released\n👉 Critical impact on employee retiral benefits\n👉 Verify your establishment filing records\n\n📌 Save this post for your compliance records!\n🔗 Direct tools & calculator link in bio: ${profile.websiteUrl}\n\n#compliance #labourlaw #epfo #hrcommunity #taxcompliance #payroll`,
    facebook: `🔔 Important Compliance Update for Establishments & Employees:\n\n${article.title}\n\nUnderstanding your statutory obligations is essential to avoid unnecessary interest and damages. We have broken down the complete notification and calculation formulas on our platform.\n\n👉 Read the complete breakdown and calculate your liability at ${profile.websiteUrl}\n\nHave you verified your compliance status for this month?`,
    twitter: [
      `🚨 [Update] ${article.title}\n\nFull advisory & calculators: ${profile.websiteUrl} #Compliance (1/3)`,
      `Key Takeaway: Understanding statutory calculations and employer liabilities under recent circulars. (2/3)`,
      `Use our certified calculators to verify compliance at ${profile.websiteUrl} (3/3)`
    ]
  };
}

module.exports = {
  generateOmnichannelPost,
};
