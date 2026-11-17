// omnichannel_content.js — Unified AI Content Synthesis for LinkedIn, Instagram, Facebook & Twitter
// Uses Google Gemini 2.5 Flash to generate platform-native formatting for each social network.

const { getActiveProfile } = require("./config/config_loader");
const {
  fetchTopImpressionEpfoNews,
  scoreArticle,
  getPostedHistory,
  savePostedHeadline
} = require("./epfo_content");
const {
  syncCorporateResources,
  matchCorporateResource
} = require("./corporate_catalog");

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
  } else if (text.includes("7q") || text.includes("14b") || text.includes("damage") || text.includes("penalty") || text.includes("ecr") || text.includes("vishwas")) {
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
async function generateOmnichannelPost(genAI, targetPlatform = "all") {
  const profile = getActiveProfile();
  let article = null;

  // 1. Ingest verified regulatory news and filter out already posted stories
  if (profile.id === "epfo") {
    try {
      const pool = await fetchTopImpressionEpfoNews();
      const history = getPostedHistory();
      const postedSet = new Set(history.map((h) => (h.headline || "").toLowerCase().trim()));

      const scored = pool
        .map(scoreArticle)
        .filter((a) => !postedSet.has((a.title || "").toLowerCase().trim()))
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        // Pick the top scoring unposted candidate
        article = scored[0];
        console.log(`🎯 Omnichannel selected top unposted story: [Score: ${article.score}] ${article.title}`);
      } else if (pool.length > 0) {
        article = pool[0];
      }
    } catch (e) {
      console.warn("⚠️ Error fetching EPFO news pool, using fallback:", e.message);
    }
  }

  // Fallback if no pool item found
  if (!article) {
    article = {
      title: "EPFO Scrutiny on Belated ECR Remittances & Sections 7Q & 14B Penal Damages",
      description: "Critical employer compliance updates, statutory filing obligations, and workforce security norms.",
      link: profile.websiteUrl,
      source: "Official Gazette / PIB",
      pubDate: new Date().toISOString()
    };
  }

  const meta = detectArticleMetadata(article);

  // Synchronize live website catalog and match the exact relatable blog/tool guide
  let resource = {
    title: "Statutory Compliance Guides & Calculators",
    url: profile.websiteUrl,
    cta: "Explore full compliance guide & calculators:",
    solutionFacts: "Ensure timely monthly ECR remittance by the 15th to avoid penal interest under Section 7Q (12% p.a.) and damages under Section 14B. Correct member profile & exit dates promptly via Unified Portal."
  };

  try {
    const liveResources = await syncCorporateResources();
    const matched = matchCorporateResource(article.title + " " + (article.description || ""), liveResources);
    if (matched && matched.url) {
      resource = matched;
    }
  } catch (err) {
    console.warn("⚠️ Resource matching fallback:", err.message);
  }

  console.log(`🔗 Omnichannel Matched Resource: ${resource.title} -> ${resource.url}`);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.8-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `You are a senior social media director and corporate compliance strategist for "${profile.name}" (${profile.websiteUrl}).
Analyze this official regulatory news release:
Headline: "${article.title}"
Context: "${article.description || article.title}"
Source: "${article.source || 'Official Notification'}"
Relatable Website Blog / Resource: "${resource.title}" (${resource.url})
Key Solution Facts: "${resource.solutionFacts}"

CRITICAL REQUIREMENTS:
1. FACTUAL ACCURACY: State ONLY verified, accurate facts and numbers directly stated or implied by the article. Zero hallucinations.
2. VISUAL CARD CONTENT: Provide rich, specific data for an infographic card (prominent stat number, label, and exactly 3 verified, distinct bullet points).
3. HOT TRENDING HASHTAGS: High-impression hashtags (#EPFO, #Compliance, #LabourLaw, #Payroll, #HRIndia).
4. RELATABLE BLOG LINK: You MUST integrate the direct relatable blog guide link: "${resource.url}" across platforms.
5. TWITTER 4-PART THREAD STRUCTURE:
   - Tweet 1 (The Problem / Regulatory Alert Hook): News alert, who is impacted, attach reference link (${resource.url}), #EPFO #Compliance (1/4). Strict limit: <= 255 chars.
   - Tweet 2 (Statutory & Legal Analysis): Background rules, sections (§ 7Q interest @12%, § 14B damages, circular dates, employer risks). (2/4). Strict limit: <= 260 chars. No links.
   - Tweet 3 (Practical Actionable Solution): Concrete step-by-step resolution for employers/members (ECR filing, Joint Declaration, exit date correction, UAN seeding). (3/4). Strict limit: <= 260 chars. No links.
   - Tweet 4 (Conclusion & Relatable Blog): Conclusion, final risk mitigation advice, direct guide link (${resource.url}), #LabourLaw #Compliance #HRTech (4/4). Strict limit: <= 255 chars.

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
  "resourceTitle": "${resource.title}",
  "resourceUrl": "${resource.url}",
  "trendingHashtags": ["#EPFO", "#Compliance", "#LabourLaw", "#Payroll", "#HRIndia"],
  "linkedin": {
    "post": "Long-form B2B thought leadership post (800-1400 chars). Start with an executive hook on the problem. Detail the statutory breakdown. Include 3 bullet takeaways. State compliance impact for HR/CFOs. End with a call to read the detailed guide at ${resource.url} and hashtags like #Compliance #LabourLaw #HRTech #IndiaBusiness #Payroll"
  },
  "instagram": {
    "caption": "High-engagement visual post caption (400-800 chars). Start with a punchy emoji hook. 4 bulleted takeaways. Strong CTA ('📌 Save this post for your compliance records', '🔗 Complete guide at ${resource.url} and link in bio: ${profile.websiteUrl}'). Include 18-22 relevant hashtags."
  },
  "facebook": {
    "post": "Engaging community page post (400-800 chars). Conversational, trustworthy tone. Clearly explain how this affects employers and employees. Direct link to ${resource.url}. End with a conversation question ('Have you reviewed your establishment compliance yet?'). Include 4-6 hashtags."
  },
  "twitter": {
    "thread": [
      "Tweet 1 (Hook + Link): Headline hook, regulatory alert, reference link (${resource.url}) #EPFO #Compliance (1/4)",
      "Tweet 2 (Legal Breakdown): In-depth statutory rules, interest/damages sections (2/4)",
      "Tweet 3 (Action Plan): Practical solution steps for HR/employers/members (3/4)",
      "Tweet 4 (Conclusion & Blog Link): Conclusion, check our full breakdown at ${resource.url} #LabourLaw #Compliance (4/4)"
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
        resourceTitle: data.resourceTitle || resource.title,
        resourceUrl: data.resourceUrl || resource.url,
        source: article.source,
        pubDate: article.pubDate,
        trendingHashtags: data.trendingHashtags || ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech"],
        linkedin: data.linkedin?.post,
        instagram: data.instagram?.caption,
        facebook: data.facebook?.post,
        twitter: buildTwitterThread(data.twitter, article, meta, profile, resource),
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
    resourceTitle: resource.title,
    resourceUrl: resource.url,
    source: article.source,
    pubDate: article.pubDate,
    trendingHashtags: ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech", "#PensionUpdate"],
    linkedin: `📢 [${meta.categoryBadge}] ${article.title}\n\nKey Highlights for Employers & HR Leaders:\n• ${meta.keyPoints[0]}\n• ${meta.keyPoints[1]}\n• ${meta.keyPoints[2]}\n\n🔗 Explore statutory calculators & compliance tools: ${resource.url}\n\n#Compliance #LabourLaw #HRLeadership #Payroll #IndiaBusiness #EPFO`,
    instagram: `🚨 URGENT ${meta.categoryBadge}: ${article.title}\n\nKey Facts You Must Know Today:\n👉 ${meta.keyPoints[0]}\n👉 ${meta.keyPoints[1]}\n👉 ${meta.keyPoints[2]}\n\n📌 Save this post for your compliance records!\n🔗 Direct tools & guide link: ${resource.url} (link in bio)\n\n#compliance #labourlaw #epfo #hrcommunity #taxcompliance #payroll #startupindia #pensionupdate #indianbusiness #cfoindia`,
    facebook: `🔔 Important Compliance Update for Establishments & Employees:\n\n${article.title}\n\nKey Points to Review:\n• ${meta.keyPoints[0]}\n• ${meta.keyPoints[1]}\n• ${meta.keyPoints[2]}\n\nUnderstanding your statutory obligations is essential to avoid unnecessary interest and damages. We have broken down the complete notification and calculation formulas on our platform.\n\n👉 Read the complete breakdown and calculate your liability at ${resource.url}\n\nHave you verified your compliance status for this month?\n\n#Compliance #EPFO #LabourLaw #BusinessIndia`,
    twitter: buildTwitterThread(null, article, meta, profile, resource)
  };
}

function buildTwitterThread(rawTwitter, article, meta, profile, resource) {
  const blogUrl = (resource && resource.url) ? resource.url : profile.websiteUrl;
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

  // Ensure 4 distinct tweets: Problem -> Legal Breakdown -> Actionable Solution -> Conclusion + Relatable Blog
  if (list.length < 4) {
    list = [
      `1/4 🚨 Compliance Alert: ${article.title.slice(0, 120)}\n\nReview liability & guidelines: ${blogUrl} #EPFO #Compliance`,
      `2/4 🔍 Legal Analysis:\n• Under § 7Q: Penal interest @ 12% p.a. mandatory\n• Under § 14B: Compounding damages apply for belated remittance\n• Timely ECR filing protects against statutory recovery.`,
      `3/4 💡 Action Plan for Employers:\n• Reconcile monthly payroll before 10th\n• File ECR & remit dues by 15th\n• Complete UAN & Aadhaar seeding for all employees\n• Resolve service overlaps promptly.`,
      `4/4 ⚖️ Conclusion: Avoid bank attachments & prosecution through proactive compliance.\n\nRead our comprehensive guide & calculators:\n👉 ${blogUrl}\n\n#LabourLaw #PF #HRIndia`
    ];
  }

  return list.slice(0, 4).map((tweet) => {
    let t = String(tweet).trim();
    if (t.length > 255) {
      t = t.slice(0, 250) + "...";
    }
    return t;
  });
}

module.exports = {
  generateOmnichannelPost,
  savePostedHeadline,
};
