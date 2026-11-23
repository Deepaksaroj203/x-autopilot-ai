// omnichannel_content.js — Unified AI Content Synthesis for LinkedIn, Instagram, Facebook & Twitter
// Uses Google Gemini (with multi-model fallback) to generate 100% context-aligned social copy and infographic data.

const fs = require("fs");
const path = require("path");
const { getActiveProfile } = require("./config/config_loader");
const {
  fetchTopImpressionEpfoNews,
  scoreArticle,
  getPostedHistory,
  savePostedHeadline,
  isDuplicateHeadline,
  getNextUnpostedEvergreenTopic
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

  // 1. Ingest verified regulatory news and filter out already posted stories with semantic deduplication
  if (profile.id === "epfo") {
    try {
      const pool = await fetchTopImpressionEpfoNews();
      const history = getPostedHistory();

      const scored = pool
        .map(scoreArticle)
        .filter((a) => !isDuplicateHeadline(a.title, history))
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        article = scored[0];
        console.log(`🎯 Omnichannel selected top unposted story: [Score: ${article.score}] ${article.title}`);
      } else {
        console.log("ℹ️ No unposted candidate in current RSS news pool. Selecting next topic from Statutory Master Curriculum...");
        const evergreen = getNextUnpostedEvergreenTopic(history);
        article = {
          title: evergreen.title,
          description: evergreen.description,
          link: profile.websiteUrl,
          source: evergreen.source,
          pubDate: evergreen.pubDate || new Date().toISOString()
        };
        console.log(`🌿 Fresh Evergreen Topic Selected: "${article.title}"`);
      }
    } catch (e) {
      console.warn("⚠️ Error fetching EPFO news pool, using fallback:", e.message);
    }
  }

  // Fallback if no pool item found
  if (!article) {
    const history = getPostedHistory();
    const evergreen = getNextUnpostedEvergreenTopic(history);
    article = {
      title: evergreen.title,
      description: evergreen.description,
      link: profile.websiteUrl,
      source: evergreen.source,
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

STRICT HIGH-ENGAGEMENT VIRAL RULES ACROSS ALL PLATFORMS:

1. LINKEDIN (C-SUITE & HR THOUGHT LEADERSHIP MASTERCLASS — 350-500 WORDS OF HIGH DOMAIN INTELLIGENCE):
   - Hook: High-impact opening line exposing an expensive regulatory exposure, costly compliance mistake, or strategic workforce impact for Indian businesses specifically regarding "${article.title}".
   - Executive Advisory Badge: '🏛️ [DAY ${dayNum} • STATUTORY COMPLIANCE ADVISORY] ${article.title}'
   - Regulatory Framework: Cite the governing Act and specific provisions strictly applicable to this headline (e.g. relevant scheme sections, Paragraphs of EPF/EPS/EDLI schemes).
   - Operational Reality: Why portal errors happen, reconciliation issues, or member claim rejections on this specific topic.
   - 4-Step Strategic Actionable Playbook for Leadership & HR Teams (100% SPECIFIC TO "${article.title}"):
     Craft 4 concrete, actionable, deeply practical steps strictly for this exact topic (e.g. member portal audits, documentation checklists, payroll updates, or employee advisory). ZERO generic copy-paste boilerplate!
   - Salaried Member Advisory: What employees must check in their Member Passbook / UAN profile regarding this update.
   - Lead Magnet / Comment-to-DM Trigger: 'Want our comprehensive EPFO Audit Checklist & Compliance Toolkit? Comment "${dmKwLinkedin}" below and our team will send the full resource directly to your message box.'
   - Live Verification Guide Link: '📌 Read the complete step-by-step statutory breakdown and access free calculators: ${resource.url}'
   - Strategic Hashtags: 5-6 professional B2B tags (#EPFO #LabourLaw #Compliance #HRLeadership #PayrollManagement #CorporateGovernance).

2. TWITTER 5-PART THREAD (STRICT 100% HEADLINE-FOCUSED THREAD — ZERO OFF-TOPIC DRIFT):
   CRITICAL MANDATE: Every single tweet in this 5-tweet thread MUST BE 100% EXCLUSIVELY about the exact headline topic: "${article.title}".
   NEVER drift into generic boilerplate (NEVER mention unrelated Section 7A summons, 7Q/14B penal damages, contractor ledgers, or Joint Declarations unless the headline is specifically about them).

   Follow this STRICT 5-TWEET PROGRESSION:
   - Tweet 1 (Headline Hook & News Introduction — ZERO EXTERNAL LINKS):
     Start with a compelling hook specifically introducing the headline topic. Explain what this update/news is.
     End with: #EPFO #PFCompliance Thread 👇 (1/5)
     STRICT LIMIT: <= 270 chars. STRICTLY NO URLS in Tweet 1 to protect algorithmic reach.

   - Tweet 2 (Core Topic Explanation & All About The News):
     Deep-dive strictly into this specific headline. Explain the background, what the new circular/announcement actually states, who is affected (salaried employees, retirees, or employers), and why this matters right now.
     End with: (2/5)
     STRICT LIMIT: <= 270 chars. No links.

   - Tweet 3 (How-To / Step-by-Step Practical Implementation):
     Provide actionable step-by-step guidance on how to implement or benefit from this exact topic. What exact forms, portal tabs, verification checks, or procedures must the member or HR follow?
     End with: (3/5)
     STRICT LIMIT: <= 270 chars. No links.

   - Tweet 4 (Pros, Cons & Critical Caveats):
     A realistic, objective breakdown of the Pros (key benefits/advantages) vs Cons (limitations, eligibility criteria, tax impact, or delay risks) strictly regarding this topic.
     End with: (4/5)
     STRICT LIMIT: <= 270 chars. No links.

   - Tweet 5 (Conclusion, Website Attraction & Resource Link + Hashtags):
     A punchy concluding takeaway on this topic + high-converting invitation to access free calculators & step-by-step guides on our website + exact link: "${resource.cta} ${resource.url}".
     End with: targeted hashtags strictly related to this topic (5/5).
     STRICT LIMIT: <= 270 chars.

3. FACEBOOK (IN-DEPTH COMMUNITY & PAYROLL RESOURCE):
   - Line 1: '📢 Comment "${dmKwFb}" below to receive our full step-by-step resolution checklist directly in your inbox!'
   - Executive Title: '🔔 [Day ${dayNum} Regulatory Advisory] ${article.title}'
   - Clear Plain-Language Breakdown: Explain the issue clearly so that everyday employees and small business owners understand the real impact on their PF and pension.
   - 4 Key Takeaways strictly tailored to this headline:
     📌 What Changed: ...
     ⚖️ Governing Rule / Legal Mandate: ...
     💡 What Salaried Employees Must Do: ...
     🛡️ What Employers & HR Must Do: ...
   - Step-by-step practical implementation guide (3 clear bullet points).
   - Full Link: '👉 Read the complete guide & calculate your eligibility at: ${resource.url}'
   - Closing engagement question to spark shares and comments.
   - Hashtags: 4-5 relevant community tags.

4. INSTAGRAM (VIRAL REEL/CAROUSEL FORMULA — HIGH SAVES & COMMENTS):
   - LINE 1 MUST BE COMMENT-TO-DM TRIGGER: 'Comment "${dmKwInsta}" and I\'ll DM you the official circular PDF & checklist 👇'
   - LINE 2: Empty line.
   - LINE 3: Scroll-stopping pattern interrupt hook: Craft a dynamic, high-curiosity hook specifically about "${article.title}". Do NOT use generic or mismatched hooks. Expose the surprising rule, hidden catch, or big question people are asking.
   - LINES 4-7: 3 numbered points using clean emojis (1️⃣, 2️⃣, 3️⃣) explaining the real statutory rule, what changed, and the exact action to take.
   - LINE 8: Series Anchor: 'This is Day ${dayNum} of ${series.seriesTitle}.'
   - LINE 9: Discussion question tailored to this topic.
   - LINE 10: '📌 Save this post for your compliance records!'
   - LINE 11: '🔗 Complete guide: ${resource.url} (link in bio: ${profile.websiteUrl})'
   - LINE 12: 5-8 targeted hashtags strictly matching this topic.

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
      "Tweet 4...",
      "Tweet 5..."
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
    linkedin: `🚨 Most Indian employers and HR teams don't realize their statutory exposures until an inquiry is initiated under Section 7A or damages are levied under Section 14B.

🏛️ [DAY ${dayNum} • STATUTORY COMPLIANCE ADVISORY]
${article.title}

📊 The Regulatory Framework & Financial Exposure:
• Governing Act: ${meta.governanceTag}
• Direct Financial Liability: Belated monthly remittances trigger automatic simple interest under Section 7Q (12% p.a.) plus statutory penal damages under Section 14B scaling up to 25%.
• Operational Reality: ${meta.solutionFacts || 'Ensure timely monthly ECR remittance by the 15th to maintain clean audit standing.'}

🔍 Key Strategic Highlights for Leadership & Payroll Teams:
1️⃣ ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}
2️⃣ ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}
3️⃣ ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}

📋 4-Step Strategic Action Plan for Employers:
• Step 1: Reconcile gross vs. EPF contributory wages across all contractor and payroll ledgers before monthly filing.
• Step 2: Verify Annexure-K synchronization and electronic transfer requests to avoid employee dispute backlogs.
• Step 3: Ensure strict Aadhaar-UAN seeding and digital signature certificate (DSC) validity on the Unified Portal.
• Step 4: Conduct monthly pre-deposit compliance audits rather than relying on year-end financial reconciliation.

💡 What Salaried Employees & Members Must Check:
• Regularly inspect your monthly Member Passbook to verify that employer deductions match payroll slips.
• Never disclose UAN passwords, login credentials, or OTPs to unauthorized third parties.

🎁 FREE COMPLIANCE RESOURCE:
Want our comprehensive EPFO Audit Checklist & Automated Penal Damages Calculator?
Comment "${dmKwLinkedin}" below and our compliance desk will message you the complete toolkit.

📌 Read our complete verified legal breakdown & worked calculation example:
👉 ${resource.url}

${(meta.trendingHashtags || ["#EPFO", "#Compliance", "#LabourLaw", "#HRLeadership", "#PayrollManagement", "#CorporateGovernance", "#IndiaBusiness"]).join(" ")}`,
    instagram: `Comment "${dmKwInsta}" and I'll DM you the official circular PDF & checklist 👇\n\n${mythHook}\n\nHere is the real statutory breakdown every salaried professional and employer must know:\n1️⃣ ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}\n2️⃣ ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}\n3️⃣ ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}\n\nThis is Day ${dayNum} of ${series.seriesTitle}.\n\nDid your employer deposit your PF on time? Let's discuss in the comments 👇\n\n📌 Save this post for your compliance records!\n🔗 Complete guide: ${resource.url} (link in bio: ${profile.websiteUrl})\n\n${(meta.trendingHashtags || ["#EPFO", "#PFWithdrawal", "#HRCompliance", "#PayrollIndia", "#LabourLaw", "#IndianBusiness"]).join(" ")}`,
    facebook: `📢 Comment "${dmKwFb}" below to get our complete EPFO Compliance Checklist & Resolution Guide sent directly to you!

🔔 [Day ${dayNum} Regulatory Advisory] ${article.title}

Essential Statutory Breakdown for Employers & Employees:
• Governing Mandate: ${meta.governanceTag}
• Core Rule: ${meta.solutionFacts || 'Compliance filing deadlines must be strictly maintained to prevent penal interest and damages.'}

📌 Key Highlights & Operational Realities:
• ${meta.keyPoints[0].badge}: ${meta.keyPoints[0].text}
• ${meta.keyPoints[1].badge}: ${meta.keyPoints[1].text}
• ${meta.keyPoints[2].badge}: ${meta.keyPoints[2].text}

💡 Action Plan:
1. Verify monthly ECR submissions on the EPFO Employer Portal before the 15th.
2. Cross-check member KYC and Aadhaar seeding to ensure seamless pension transfer processing.
3. Keep digital records of all Joint Declarations and Annexure-K filings.

👉 Read our full breakdown and access calculators at: ${resource.url}

${(meta.trendingHashtags || ["#Compliance", "#EPFO", "#LabourLaw", "#BusinessIndia", "#Payroll"]).slice(0, 5).join(" ")}`,
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

  // Ensure 5 distinct tweets strictly following: Headline Hook -> Core News Breakdown -> Practical How-To -> Pros/Cons -> Conclusion + Website CTA
  if (list.length < 5) {
    const cleanTitle = (article.title || "Statutory EPFO Update").slice(0, 110);
    const kp0 = meta?.keyPoints?.[0]?.text || "Official circular details approved statutory framework.";
    const kp1 = meta?.keyPoints?.[1]?.text || "Review eligibility criteria and portal documentation.";

    list = [
      `1/5 [Official Alert] ${cleanTitle}.\n\nHere is everything you need to know about this major update: how it works, step-by-step practical implementation, pros & cons, and key takeaways.\n\n#EPFO #PFCompliance Thread 👇`,
      `2/5 📌 What Is This Update About?\nDeep-dive into ${cleanTitle}:\n\n• Core Update: ${kp0}\n• Who It Affects: Applies to eligible employees, members, and covered establishments across India.`,
      `3/5 🛠️ How-To: Step-by-Step Practical Implementation:\n1. Log in to your Unified Member / Employer Portal.\n2. Navigate to the online services tab & verify active KYC.\n3. ${kp1}\n4. Track claim or filing reference status online.`,
      `4/5 ⚖️ Pros, Cons & Critical Caveats:\n✅ Pros: Faster processing, enhanced transparency & simplified options.\n⚠️ Watch out: Incomplete KYC, unlinked Aadhaar, or incorrect bank details can trigger delays. Review before submitting.`,
      `5/5 🛡️ Conclusion & Helpful Resources:\nUnderstanding the exact fine print protects your retirement savings from unnecessary delays.\n\nCalculate eligibility & read our verified breakdown:\n👉 ${blogUrl}\n\n#LabourLaw #Payroll #FinanceIndia`
    ];
  }

  return list.slice(0, 5).map((tweet) => {
    let t = String(tweet).trim();
    if (t.length > 270) {
      t = t.slice(0, 265) + "...";
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
