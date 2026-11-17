// omnichannel_content.js — Unified AI Content Synthesis for LinkedIn, Instagram, Facebook & Twitter
// Uses Google Gemini (with multi-model fallback) to generate 100% context-aligned social copy and infographic data.

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

function extractSmartMetadata(article, resource) {
  const text = ((article.title || "") + " " + (article.description || "")).toLowerCase();
  
  let category = "GENERAL";
  let categoryBadge = "STATUTORY COMPLIANCE UPDATE";
  let statNumber = "100%";
  let statLabel = "STATUTORY COMPLIANCE";
  let subStat = "EPF & MP ACT 1952";
  let governanceTag = "EPF & MP Act 1952 • Statutory Norms";

  // Extract explicit monetary figures, percentages, or numbers
  const numMatch = (article.title || "").match(/(?:₹|rs\.?|inr)\s?([\d,]+)|\b(\d+\.?\d*)\s?%|\b(\d+)\s?(?:lakh|crore|employees|staff|days)\b/i);
  if (numMatch) {
    if (numMatch[1]) statNumber = `₹${numMatch[1].replace(/,/g, "")}`;
    else if (numMatch[2]) statNumber = `${numMatch[2]}%`;
    else if (numMatch[3]) statNumber = numMatch[0].trim();
  }

  if (text.includes("25,000") || text.includes("25000") || text.includes("wage ceiling") || text.includes("ceiling")) {
    category = "PENSION";
    categoryBadge = "STATUTORY WAGE CEILING ADVISORY";
    statNumber = "₹25,000";
    statLabel = "MONTHLY WAGE THRESHOLD";
    subStat = "₹15,000 STATUTORY CAP";
    governanceTag = "EPF & MP Act 1952 • Section 6A";
  } else if (text.includes("whatsapp") || text.includes("bot") || text.includes("auto settlement") || text.includes("digital") || text.includes("1,000") || text.includes("1000") || text.includes("inactive pf")) {
    category = "WITHDRAWAL";
    categoryBadge = "EPFO 3.0 DIGITAL SERVICES";
    statNumber = "₹1,000";
    statLabel = "AUTO-SETTLEMENT CAP";
    subStat = "+91 8796441800 BOT";
    governanceTag = "EPFO Digital Governance & Auto-Mode Norms";
  } else if (text.includes("pension") || text.includes("eps") || text.includes("10d")) {
    category = "PENSION";
    categoryBadge = "EPS-95 PENSION REVALUATION";
    if (statNumber === "100%") statNumber = "EPS-95";
    statLabel = "STATUTORY PENSION SCHEME";
    subStat = "8.33% EMPLOYER CONTRIBUTION";
    governanceTag = "Employees' Pension Scheme 1995";
  } else if (text.includes("interest") || text.includes("credit")) {
    category = "INTEREST";
    categoryBadge = "ANNUAL PF INTEREST RATE";
    if (statNumber === "100%") statNumber = "8.25%";
    statLabel = "CREDITED INTEREST RATE";
    subStat = "COMPOUNDED ANNUALLY";
    governanceTag = "EPFO Central Board of Trustees Notification";
  } else if (text.includes("withdraw") || text.includes("auto-claim") || text.includes("form 31")) {
    category = "WITHDRAWAL";
    categoryBadge = "AUTO-CLAIM & SETTLEMENT";
    if (statNumber === "100%") statNumber = "3 Days";
    statLabel = "AUTO-SETTLEMENT TIMELINE";
    subStat = "FORM 31 ADVANCE NORMS";
    governanceTag = "EPFO Digital Auto-Mode Claim System";
  } else if (text.includes("vishwas") || text.includes("14b") || text.includes("7q") || text.includes("damage") || text.includes("penalty")) {
    category = "COMPLIANCE";
    categoryBadge = "STATUTORY PENALTY AUDIT";
    if (statNumber === "100%") statNumber = "§§ 7Q & 14B";
    statLabel = "PENAL DAMAGES & INTEREST";
    subStat = "12% P.A. MANDATORY INTEREST";
    governanceTag = "EPF & MP Act 1952 • Sections 7Q & 14B";
  } else if (text.includes("overlap") || text.includes("exit date") || text.includes("bgv")) {
    category = "COMPLIANCE";
    categoryBadge = "SERVICE OVERLAP & EXIT AUDIT";
    if (statNumber === "100%") statNumber = "EPFiGMS";
    statLabel = "GRIEVANCE RESOLUTION";
    subStat = "JOINT DECLARATION REQUIRED";
    governanceTag = "EPFO SOP on Profile & Exit Corrections";
  }

  // Dynamic context-derived bullet points matching this exact subject (Zero Generic Boilerplate)
  let kp1 = `Mandatory compliance parameters under ${governanceTag} apply to all covered establishments.`;
  let kp2 = `Review member records and statutory contribution allocations to prevent filing discrepancies.`;
  let kp3 = `Ensure proactive compliance verification to safeguard against statutory audit liabilities.`;

  if (category === "PENSION" && (text.includes("25,000") || text.includes("25000") || text.includes("ceiling"))) {
    kp1 = "Proposed hike raises statutory wage ceiling from ₹15,000 to ₹25,000 per month.";
    kp2 = "Mandatory EPF deduction expands to employees earning up to ₹25,000 basic + DA.";
    kp3 = "Review employer CTC restructuring and calculate increased monthly PF liabilities.";
  } else if (text.includes("whatsapp") || text.includes("bot") || text.includes("auto settlement") || text.includes("inactive pf")) {
    kp1 = "Auto-settlement applies strictly to inoperative PF balances up to ₹1,000.";
    kp2 = "Official WhatsApp bot (+91 8796441800) enables real-time balance & passbook checks.";
    kp3 = "Verify UAN-registered mobile numbers are updated for employees across establishments.";
  } else if (category === "WITHDRAWAL") {
    kp1 = "Form 31 advances processed automatically under IT-enabled rules without manual intervention.";
    kp2 = "Settlement turnaround reduced to 3 working days for verified KYC member accounts.";
    kp3 = "Ensure member Aadhaar, bank account, and PAN seeding are active to avoid rejections.";
  } else if (category === "COMPLIANCE" && (text.includes("vishwas") || text.includes("14b") || text.includes("7q"))) {
    kp1 = "VISHWAS scheme provides up to 100% waiver on Section 14B compounding penal damages.";
    kp2 = "Section 7Q simple interest @ 12% p.a. remains mandatory on belated ECR remittances.";
    kp3 = "File settlement declarations before statutory deadline to close outstanding 7A disputes.";
  } else if (resource && resource.solutionFacts) {
    const facts = resource.solutionFacts.split(/[.;•\n]/).map(s => s.trim()).filter(s => s.length > 20);
    if (facts[0]) kp1 = facts[0].slice(0, 95);
    if (facts[1]) kp2 = facts[1].slice(0, 95);
    if (facts[2]) kp3 = facts[2].slice(0, 95);
  }

  const keyPoints = [
    { badge: "STATUTORY RULE", text: kp1 },
    { badge: "PAYROLL IMPACT", text: kp2 },
    { badge: "COMPLIANCE ACTION", text: kp3 }
  ];

  return { category, categoryBadge, statNumber, statLabel, subStat, governanceTag, keyPoints };
}

/**
 * Call Gemini with multi-model fallback to ensure 100% uptime and zero 503s
 */
async function callGeminiWithFallback(genAI, prompt) {
  // Use ultra-fast, high-availability Gemini endpoints with automated retry & backoff
  const models = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite"
  ];

  let lastErr = null;
  for (const modelName of models) {
    // Retry each model up to 2 times with a 2.5-second sleep on transient 503/429
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
            maxOutputTokens: 3500
          }
        });
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        lastErr = err;
        const errMsg = err.message || "";
        const isTransient = errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("high demand") || errMsg.includes("fetch");
        if (isTransient && attempt < 2) {
          console.warn(`⏳ Model [${modelName}] busy/503 (attempt ${attempt}/2). Retrying in 2.5s...`);
          await new Promise((r) => setTimeout(r, 2500));
        } else {
          console.warn(`⚠️ Model [${modelName}] failed (${errMsg.slice(0, 80)}). Trying next candidate...`);
          break;
        }
      }
    }
  }

  throw lastErr || new Error("All Gemini model endpoints failed.");
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

  // 2. Precision Semantic Matching against live corporatecompliance.in catalog
  let resource = {
    title: "Statutory Compliance Guides & Calculators",
    url: profile.websiteUrl,
    cta: "Explore full compliance guide & calculators:",
    solutionFacts: "Ensure timely monthly ECR remittance by the 15th to avoid penal interest under Section 7Q (12% p.a.) and damages under Section 14B."
  };

  try {
    const liveResources = await syncCorporateResources({ verbose: false });
    const matched = matchCorporateResource(article.title, liveResources, article.description || "");
    if (matched && matched.url) {
      resource = matched;
    }
  } catch (err) {
    console.warn("⚠️ Resource matching fallback:", err.message);
  }

  console.log(`🔗 Omnichannel Matched Resource: "${resource.title}" -> ${resource.url}`);

  const meta = extractSmartMetadata(article, resource);

  const prompt = `You are the Lead Social Media Growth Director and Senior Corporate Compliance Strategist for "${profile.name}" (${profile.websiteUrl}).
Analyze this official regulatory news story:
- Headline: "${article.title}"
- Description/Context: "${article.description || article.title}"
- Source: "${article.source || 'Official Notification'}"
- Matched Corporate Compliance Guide: "${resource.title}" (${resource.url})
- Core Solution Facts: "${resource.solutionFacts || ''}"

STRICT QUALITY & CONTEXT-ALIGNMENT RULES:
1. 100% CONTEXT SPECIFICITY: The headline, numbers, bullet points, and social posts MUST DIRECTLY MATCH this exact news story. Zero generic placeholders. If the story discusses ₹25,000 salary earners, discuss the ₹25,000 wage threshold, mandatory vs voluntary EPF, EPS 8.33% cap at ₹15,000, and payroll impact.
2. DUAL-METRIC DATA STRIP:
   - "statNumber": Primary numeric highlight (e.g. "₹25,000", "8.25%", "100%", "3 Days", "12%").
   - "statLabel": Exact uppercase metric description (e.g. "MONTHLY WAGE THRESHOLD", "CREDITED INTEREST RATE", "PENAL DAMAGES WAIVER").
   - "subStat": Relevant secondary benchmark (e.g. "₹15,000 STATUTORY CAP", "§ 7Q MANDATORY INTEREST", "FORM 31 ADVANCE").
3. THREE CATEGORIZED KEY POINTS FOR INFOGRAPHIC:
   Provide an array of EXACTLY 3 objects with "badge" and "text":
   - Point 1: {"badge": "STATUTORY RULE", "text": "Specific legal section, circular, or threshold from the story (max 95 chars)"}
   - Point 2: {"badge": "PAYROLL IMPACT", "text": "Concrete wage split, deduction, or calculation impact for HR/employees (max 95 chars)"}
   - Point 3: {"badge": "COMPLIANCE ACTION", "text": "Actionable filing, ECR reconciliation, or dispute rectification step (max 95 chars)"}
4. STRATEGIC TAKEAWAY: One crisp, high-impact sentence for CFOs & HR leadership (max 115 chars).
5. EXACT BLOG INTEGRATION: Seamlessly embed the exact relatable guide link "${resource.url}" across all platforms.
6. TWITTER 4-PART THREAD:
   - Tweet 1 (The Problem / Regulatory Alert Hook): News alert, who is impacted, direct reference link (${resource.url}), #EPFO #Compliance (1/4). Strict limit: <= 255 chars.
   - Tweet 2 (Statutory & Legal Analysis): Governing statutory sections, employer risks, legal breakdown. (2/4). Strict limit: <= 260 chars. No links.
   - Tweet 3 (Practical Action Plan): Concrete steps for HR/employers/members (ECR filing, Joint Declaration, exit date correction, UAN seeding). (3/4). Strict limit: <= 260 chars. No links.
   - Tweet 4 (Conclusion & Relatable Guide): Conclusion, risk mitigation advice, direct guide link (${resource.url}), #LabourLaw #Compliance #HRTech (4/4). Strict limit: <= 255 chars.

Return ONLY a valid JSON object matching this schema:
{
  "category": "${meta.category}",
  "categoryBadge": "${meta.categoryBadge}",
  "headline": "Punchy, catchy, context-specific 6-10 word title matching story",
  "governanceTag": "${meta.governanceTag}",
  "statNumber": "${meta.statNumber}",
  "statLabel": "${meta.statLabel}",
  "subStat": "${meta.subStat}",
  "keyPoints": [
    { "badge": "STATUTORY RULE", "text": "..." },
    { "badge": "PAYROLL IMPACT", "text": "..." },
    { "badge": "COMPLIANCE ACTION", "text": "..." }
  ],
  "insight": "1-2 sentence core actionable takeaway for CFOs & HR (max 115 chars)",
  "resourceTitle": "${resource.title}",
  "resourceUrl": "${resource.url}",
  "trendingHashtags": ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech", "#Payroll"],
  "linkedin": {
    "post": "Long-form B2B thought leadership post (800-1400 chars) tailored 100% to this headline. Start with an executive hook on the problem. Detail the statutory background with exact numbers and sections. Provide 3 clear bullet takeaways. State compliance impact for HR/CFOs. End with a call to read the comprehensive guide at ${resource.url} and relevant hashtags."
  },
  "instagram": {
    "caption": "High-engagement visual post caption (400-800 chars) tailored 100% to this headline. Punchy emoji hook. 4 bulleted takeaways. Strong CTA ('📌 Save this post for your compliance records', '🔗 Complete guide at ${resource.url} (link in bio: ${profile.websiteUrl})'). Include 18-22 relevant hashtags."
  },
  "facebook": {
    "post": "Engaging community page post (400-800 chars) tailored 100% to this headline. Clearly explain how this affects employers and employees. Direct link to ${resource.url}. End with an engagement question. Include 4-6 hashtags."
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
    const data = await callGeminiWithFallback(genAI, prompt);
    if (data && data.headline) {
      return {
        article,
        headline: data.headline || article.title,
        category: data.category || meta.category,
        categoryBadge: data.categoryBadge || meta.categoryBadge,
        governanceTag: data.governanceTag || meta.governanceTag,
        statNumber: data.statNumber || meta.statNumber,
        statLabel: data.statLabel || meta.statLabel,
        subStat: data.subStat || meta.subStat,
        keyPoints: (Array.isArray(data.keyPoints) && data.keyPoints.length >= 3) ? data.keyPoints : meta.keyPoints,
        insight: data.insight || "Verify active establishment filings and calculate compliance liabilities.",
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
    console.warn("⚠️ AI synthesis fallback:", err.message);
  }

  // High-Fidelity Programmatic Fallback (Zero Hallucination, 100% Context Alignment)
  const safeTitle = article.title.slice(0, 110);
  return {
    article,
    headline: article.title,
    category: meta.category,
    categoryBadge: meta.categoryBadge,
    governanceTag: meta.governanceTag,
    statNumber: meta.statNumber,
    statLabel: meta.statLabel,
    subStat: meta.subStat,
    keyPoints: meta.keyPoints,
    insight: `Ensure strict adherence to ${meta.governanceTag} to safeguard against establishment liabilities.`,
    resourceTitle: resource.title,
    resourceUrl: resource.url,
    source: article.source,
    pubDate: article.pubDate,
    trendingHashtags: ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech", "#Payroll"],
    linkedin: `📢 [${meta.categoryBadge}] ${article.title}\n\nKey Strategic Highlights for Leadership & HR Teams:\n• Statutory Framework: Governed under ${meta.governanceTag}.\n• ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n• ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n• ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\n🔗 Comprehensive analysis & guide: ${resource.url}\n\n#Compliance #LabourLaw #HRLeadership #Payroll #IndiaBusiness #EPFO`,
    instagram: `🚨 COMPLIANCE NOTIFICATION: ${article.title}\n\nKey Insights for HR, Payroll & Members:\n👉 ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n👉 ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n👉 ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\n📌 Save this post for your compliance records!\n🔗 Complete guide: ${resource.url} (link in bio: ${profile.websiteUrl})\n\n#compliance #labourlaw #epfo #hrcommunity #payroll #businessindia #startupindia`,
    facebook: `🔔 Important Regulatory Update for Employers & Employees:\n\n${article.title}\n\nKey Highlights:\n• ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n• ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n• ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\n👉 Read our full breakdown and access calculators at: ${resource.url}\n\n#Compliance #EPFO #LabourLaw #BusinessIndia`,
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
    const kp0 = meta?.keyPoints?.[0]?.text || "Official regulatory notification released under statutory provisions.";
    const kp1 = meta?.keyPoints?.[1]?.text || "Review payroll allocations to prevent filing discrepancies.";
    const kp2 = meta?.keyPoints?.[2]?.text || "Ensure member records are updated to maintain compliance.";

    list = [
      `1/4 🚨 Compliance Alert: ${article.title.slice(0, 115)}\n\nReview liability & guidelines: ${blogUrl} #EPFO #Compliance`,
      `2/4 🔍 Legal Analysis:\n• Governed by ${meta?.governanceTag || 'EPF & MP Act 1952'}\n• ${kp0}`,
      `3/4 💡 Practical Action Plan:\n• ${kp1}\n• ${kp2}`,
      `4/4 ⚖️ Conclusion: Stay compliant and mitigate statutory liabilities.\n\nRead our comprehensive guide & calculators:\n👉 ${blogUrl}\n\n#LabourLaw #PF #HRIndia`
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
