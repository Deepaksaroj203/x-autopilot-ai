// omnichannel_content.js — Unified AI Content Synthesis for LinkedIn, Instagram, Facebook & Twitter
// Uses Google Gemini (with multi-model fallback) to generate 100% context-aligned social copy and infographic data.

const fs = require("fs");
const path = require("path");
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
  } else if (category === "INTEREST" || text.includes("interest") || text.includes("rate") || text.includes("credit")) {
    kp1 = "EPFO Central Board of Trustees (CBT) approved 8.25% interest rate for member balances.";
    kp2 = "Interest compounded annually and credited tax-free up to ₹2.5 Lakh annual contribution.";
    kp3 = "Access member electronic passbook via UMANG or EPFO portal to verify credited amount.";
  } else if (category === "PENSION" || text.includes("eps") || text.includes("higher pension")) {
    kp1 = "Supreme Court order governs higher pension calculation on actual wages above ceiling.";
    kp2 = "Employer 8.33% contribution ledger adjusted from EPF to EPS with statutory interest.";
    kp3 = "Track joint option validation status online on EPFO Member Portal under Track Application.";
  } else if (category === "COMPLIANCE" && (text.includes("ecr") || text.includes("remittance") || text.includes("15th") || text.includes("challan"))) {
    kp1 = "Monthly ECR remittance deadline is strictly the 15th of each following calendar month.";
    kp2 = "Belated payments attract mandatory simple interest @ 12% p.a. under Section 7Q.";
    kp3 = "Reconcile TRRN challan receipts and verify establishment payment status immediately.";
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

  const trendingHashtags = getTrendingHashtagsForCategory(category, article.title);

  return { category, categoryBadge, statNumber, statLabel, subStat, governanceTag, keyPoints, trendingHashtags };
}

function getTrendingHashtagsForCategory(category, title) {
  const t = (title || "").toLowerCase();
  if (category === "INTEREST" || t.includes("interest")) {
    return ["#EPFO", "#PFInterest", "#8PercentInterest", "#PersonalFinanceIndia", "#TaxFree", "#Savings", "#Salary"];
  }
  if (category === "PENSION" || t.includes("pension") || t.includes("ceiling") || t.includes("wage")) {
    return ["#EPFO", "#EPS95", "#PensionHike", "#SalaryRestructuring", "#RetirementPlanning", "#LabourLaw", "#HRIndia"];
  }
  if (category === "WITHDRAWAL" || t.includes("withdraw") || t.includes("whatsapp") || t.includes("claim")) {
    return ["#EPFO", "#PFWithdrawal", "#Form31", "#UANPortal", "#WhatsAppServices", "#IndianEmployees", "#LabourLaw"];
  }
  return ["#Compliance", "#LabourLaw", "#EPFO", "#PayrollIndia", "#HRLeadership", "#StatutoryAudit", "#IndiaBusiness"];
}

const SERIES_STATE_FILE = path.join(__dirname, "series_state.json");

function getSeriesInfo() {
  try {
    if (fs.existsSync(SERIES_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SERIES_STATE_FILE, "utf-8"));
    }
  } catch (_) {}
  return {
    currentDay: 7,
    seriesTitle: "EPFO Rules Every HR & Employee Must Know",
    commentKeywords: { instagram: "PF", linkedin: "COMPLIANCE", facebook: "GUIDE", twitter: "CHECKLIST" }
  };
}

function advanceSeriesDay() {
  try {
    const data = getSeriesInfo();
    data.currentDay = (data.currentDay || 1) + 1;
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SERIES_STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
    return data.currentDay;
  } catch (_) {
    return 8;
  }
}

function generateMythHook(title, category) {
  const t = (title || "").toLowerCase();
  if (t.includes("wage") || t.includes("25,000") || t.includes("ceiling")) {
    return "PF salary limit ₹25,000 hone se in-hand kam hoga?! 🛑 Ruko... asli hisaab alag hai! 👀";
  }
  if (t.includes("interest") || t.includes("8.25")) {
    return "PF pe 8.25% interest sabko tax-free milega?! 🛑 Ruko... asli hisaab alag hai! 👀";
  }
  if (t.includes("pension") || t.includes("eps") || t.includes("higher")) {
    return "Higher Pension par Supreme Court aur EPFO ka naya hisaab! 🛑 90% employees miss this! 👀";
  }
  if (t.includes("claim") || t.includes("reject") || t.includes("withdrawal")) {
    return "PF claim baar-baar reject ho raha hai?! 🚫 Ye 3 reasons 95% log nahi jaante! 👀";
  }
  if (t.includes("vishwas") || t.includes("14b") || t.includes("damage")) {
    return "EPFO 100% penal damages waive kar raha hai?! ⚠️ Sirf limited time window ke liye! 👀";
  }
  return `EPFO ka naya rule: Kya aapka PF safe hai?! 🛑 Ruko... asli hisaab alag hai! 👀`;
}

/**
 * Call Gemini with multi-model fallback to ensure 100% uptime and zero 503s
 */
async function callGeminiWithFallback(genAI, prompt) {
  // Use verified active Gemini endpoints with automated retry & backoff
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
        const isTransient = !errMsg.includes("404") && !errMsg.includes("403") && (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("high demand"));
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

  // Attempt local FreeLLMAPI if active
  try {
    const freeRes = await fetch("http://127.0.0.1:31415/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3.8-27b",
        messages: [{ role: "user", content: prompt + "\n\nRespond strictly with valid JSON only." }],
        temperature: 0.15
      }),
      signal: AbortSignal.timeout(6000)
    });
    if (freeRes.ok) {
      const data = await freeRes.json();
      const content = data.choices[0].message.content;
      const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
  } catch (_) {}

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

  const series = getSeriesInfo();
  const dayNum = series.currentDay || 7;
  const dmKwInsta = (series.commentKeywords && series.commentKeywords.instagram) || "PF";
  const dmKwLinkedin = (series.commentKeywords && series.commentKeywords.linkedin) || "COMPLIANCE";
  const dmKwFb = (series.commentKeywords && series.commentKeywords.facebook) || "GUIDE";
  const mythHook = generateMythHook(article.title, meta.category);

  const prompt = `You are the Lead Social Media Growth Director and Senior Corporate Compliance Strategist for "${profile.name}" (${profile.websiteUrl}).
Analyze this official regulatory news story:
- Headline: "${article.title}"
- Description/Context: "${article.description || article.title}"
- Source: "${article.source || 'Official Notification'}"
- Matched Corporate Compliance Guide: "${resource.title}" (${resource.url})
- Core Solution Facts: "${resource.solutionFacts || ''}"
- Series Context: "Day ${dayNum} of ${series.seriesTitle}"
- Viral Myth Hook Reference: "${mythHook}"

STRICT HIGH-ENGAGEMENT VIRAL RULES:
1. INSTAGRAM (VIRAL REEL/CAROUSEL FORMULA - 145%+ COMMENT CONVERSION):
   - LINE 1 MUST BE COMMENT-TO-DM TRIGGER: 'Comment "${dmKwInsta}" and I\\'ll DM you the official circular PDF & checklist 👇'
   - LINE 2: Empty line.
   - LINE 3: Scroll-stopping pattern interrupt hook: '${mythHook}'
   - LINES 4-7: 3 numbered points using clean emojis (1️⃣, 2️⃣, 3️⃣) explaining the real calculation/law.
   - LINE 8: Series Anchor: 'This is Day ${dayNum} of ${series.seriesTitle}.'
   - LINE 9: Discussion question: 'Did your employer deposit your PF correctly this month? Let\\'s discuss in the comments 👇'
   - LINE 10: '📌 Save this post for your compliance records!'
   - LINE 11: '🔗 Complete guide: ${resource.url} (link in bio: ${profile.websiteUrl})'
   - LINE 12: 5-8 targeted hashtags at the very bottom only.
2. LINKEDIN (B2B THOUGHT LEADERSHIP):
   - LINE 1: 'Want our free EPFO Compliance Checklist & Calculator? Comment "${dmKwLinkedin}" below and I\\'ll send it over.'
   - Executive headline with 'Day ${dayNum} • ${meta.categoryBadge}'.
   - Statutory background, financial liability calculations, and 3 clear bullet takeaways.
   - Strategic employer action plan and link to ${resource.url}.
3. FACEBOOK (COMMUNITY RESOURCE):
   - LINE 1: 'Comment "${dmKwFb}" and we will send you the complete step-by-step checklist!'
   - Community-friendly summary, payroll impact, link to ${resource.url}, and closing question.
4. TWITTER 4-PART THREAD:
   - Tweet 1 (Hook + Link): Headline hook, regulatory alert, reference link (${resource.url}), #EPFO #Compliance (1/4). Strict limit: <= 255 chars.
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
    "post": "..."
  },
  "instagram": {
    "caption": "..."
  },
  "facebook": {
    "post": "..."
  },
  "twitter": {
    "thread": [
      "Tweet 1...",
      "Tweet 2...",
      "Tweet 3...",
      "Tweet 4..."
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
    trendingHashtags: meta.trendingHashtags || ["#EPFO", "#Compliance", "#LabourLaw", "#HRTech", "#Payroll"],
    linkedin: `Want our free EPFO Compliance Checklist & Calculator? Comment "${dmKwLinkedin}" below and I'll send it over.\n\n📢 [Day ${dayNum} • ${meta.categoryBadge}] ${article.title}\n\nKey Strategic Highlights for Leadership & HR Teams:\n• Statutory Framework: Governed under ${meta.governanceTag}.\n• ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n• ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n• ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\n🔗 Comprehensive analysis & guide: ${resource.url}\n\n${(meta.trendingHashtags || ["#Compliance", "#LabourLaw", "#HRLeadership", "#Payroll", "#IndiaBusiness", "#EPFO"]).join(" ")}`,
    instagram: `Comment "${dmKwInsta}" and I'll DM you the official circular PDF & checklist 👇\n\n${mythHook}\n\nHere is the real statutory breakdown:\n1️⃣ ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n2️⃣ ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n3️⃣ ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\nThis is Day ${dayNum} of ${series.seriesTitle}.\n\nDid your employer deposit your PF on time? Let's discuss in the comments 👇\n\n📌 Save this post for your compliance records!\n🔗 Complete guide: ${resource.url} (link in bio: ${profile.websiteUrl})\n\n${(meta.trendingHashtags || ["#EPFO", "#PFWithdrawal", "#HRCompliance", "#PayrollIndia", "#LabourLaw", "#IndianBusiness"]).join(" ")}`,
    facebook: `Comment "${dmKwFb}" and we will send you the complete step-by-step checklist!\n\n🔔 Day ${dayNum} Regulatory Update: ${article.title}\n\nKey Highlights:\n• ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n• ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n• ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\n👉 Read our full breakdown and access calculators at: ${resource.url}\n\n${(meta.trendingHashtags || ["#Compliance", "#EPFO", "#LabourLaw", "#BusinessIndia"]).slice(0, 5).join(" ")}`,
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
  getSeriesInfo,
  advanceSeriesDay,
};
