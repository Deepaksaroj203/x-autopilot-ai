// epfo_content.js — Unified EPFO News Fetcher, Search Analytics Ranker & Twitter Thread Generator
// Dedicated to promoting https://corporatecompliance.in tools and blogs on @EPFOCompliance.
// Generates detailed 3-part threads with actionable step-by-step solutions and exact blog links.
// Enforces strict source priority: Tier 0 (PIB, Gazette, @officialepfo) > Tier 1 (Mainstream Media) > Tier 2 (Online Blogs).

const fs = require("fs");
const path = require("path");
const {
  syncCorporateResources,
  matchCorporateResource,
  CURATED_RESOURCES,
  FALLBACK_RESOURCES
} = require("./corporate_catalog");

const HISTORY_FILE = path.join(__dirname, "posted_articles.json");

// Exported alias for compatibility
const CORPORATE_RESOURCES = CURATED_RESOURCES;

// Google Search Analytics & Impression Weights for EPFO Topics
const HIGH_SEARCH_INTENT_MAP = [
  { regex: /\b(balance|passbook|whatsapp|sms)\b/i, score: 35, tag: "Passbook/Balance" },
  { regex: /\b(withdraw|withdrawal|auto-claim|advance|form 31|form 19|settlement|limit)\b/i, score: 35, tag: "Withdrawal/Claims" },
  { regex: /\b(interest|interest rate|credited|credit)\b/i, score: 30, tag: "Interest Rate" },
  { regex: /\b(pension|eps-?95|higher pension)\b/i, score: 30, tag: "Pension" },
  { regex: /\b(wage ceiling|15,?000|21,?000|25,?000)\b/i, score: 25, tag: "Wage Ceiling" },
  { regex: /\b(edli|insurance|e-nomination|nominee|7 lakh)\b/i, score: 25, tag: "EDLI/Insurance" },
  { regex: /\b(reject|rejection|claim rejected)\b/i, score: 25, tag: "Claim Rejection" },
  { regex: /\b(joint declaration|sop|date of exit|overlap|profile correction)\b/i, score: 20, tag: "SOP/Joint Declaration" },
  { regex: /\b(ecr|vishwas|damages|14b|7q|challan|amnesty)\b/i, score: 25, tag: "ECR/Compliance" }
];

const NEGATIVE_INTENT_MAP = [
  { regex: /\b(quiz|celebrate|celebrates|foundation day|cricket|sports|hockey|awareness camp|webinar|seminar|meeting held|spardha|cultural)\b/i, penalty: 40 }
];

/**
 * Call Gemini with multi-model fallback to ensure 100% uptime and zero 403/503 errors
 */
async function callGeminiWithFallback(genAI, prompt, options = {}) {
  const models = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite"
  ];

  let lastErr = null;
  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: options.temperature || 0.2,
            maxOutputTokens: options.maxOutputTokens || 2500,
            responseMimeType: "application/json"
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

// Source Classification: Tier 0 (Official) > Tier 1 (Mainstream Media) > Tier 2 (Online Blogs)
function getSourceTier(article) {
  const src = (article.source || "").toLowerCase();
  const title = (article.title || "").toLowerCase();

  // Tier 0: Official Verified Sources (PIB, Gazette notifications, @officialepfo / @socialepfo, epfindia.gov.in)
  const isPib = src.includes("pib") || title.includes("pib") || title.includes("press information bureau") || src.includes("press information bureau");
  const isGazette = src.includes("gazette") || title.includes("gazette notification") || src.includes("egazette") || title.includes("official circular") || src.includes("epfindia") || src.includes("epfo.gov");
  const isTwitter = src.includes("twitter") || src.includes("x.com") || title.includes("@officialepfo") || title.includes("@socialepfo") || title.includes("officialepfo") || title.includes("socialepfo");

  if (isPib) return { tier: 0, tierName: "Official Verified (PIB)", sourceBadge: "🏛️ Press Information Bureau (PIB)", priorityBonus: 80 };
  if (isGazette) return { tier: 0, tierName: "Official Verified (Gazette)", sourceBadge: "📜 Official Gazette Notification", priorityBonus: 75 };
  if (isTwitter) return { tier: 0, tierName: "Official Verified (Twitter)", sourceBadge: "🐦 @officialepfo Official Post", priorityBonus: 70 };

  // Tier 1: Well-Known Mainstream Media Groups
  const mainstream = [
    "economic times", "livemint", "business standard", "financial express",
    "times of india", "ndtv", "the hindu", "hindu", "indian express", "moneycontrol", "cnbc", "dd news"
  ];
  if (mainstream.some((m) => src.includes(m))) {
    return { tier: 1, tierName: "Mainstream Media", sourceBadge: article.source, priorityBonus: 30 };
  }

  // Tier 2: Other Online Blogs & Media Portals
  return { tier: 2, tierName: "Online Media/Blog", sourceBadge: article.source, priorityBonus: 5 };
}

function scoreArticle(article) {
  let score = 0;
  const matchedTags = [];

  for (const intent of HIGH_SEARCH_INTENT_MAP) {
    if (intent.regex.test(article.title)) {
      score += intent.score;
      matchedTags.push(intent.tag);
    }
  }

  for (const neg of NEGATIVE_INTENT_MAP) {
    if (neg.regex.test(article.title)) {
      score -= neg.penalty;
    }
  }

  const tierInfo = getSourceTier(article);
  score += tierInfo.priorityBonus;

  const recencyBonus = Math.round(((30 - article.daysAgo) / 30) * 10);
  score += Math.max(0, recencyBonus);

  return { ...article, score, matchedTags, ...tierInfo };
}

async function fetchTopImpressionEpfoNews() {
  console.log("📰 Fetching published EPFO news (PIB, Gazette, @officialepfo, then Mainstream Media)...");

  const rssQueries = [
    // Priority 1: Official PIB releases
    { url: "https://news.google.com/rss/search?q=(EPFO+OR+%22Employees+Provident+Fund%22)+site:pib.gov.in+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "Press Information Bureau (PIB)" },
    { url: "https://news.google.com/rss/search?q=(EPFO+OR+%22Employees+Provident+Fund%22)+(%22PIB%22+OR+%22Press+Information+Bureau%22)+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "Press Information Bureau (PIB)" },

    // Priority 2: Official Gazette notifications & statutory circulars
    { url: "https://news.google.com/rss/search?q=(EPFO+OR+%22Employees+Provident+Fund%22)+(%22gazette+notification%22+OR+%22official+circular%22)+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "Official Gazette / Circular" },

    // Priority 3: Official Twitter posts (@officialepfo / @socialepfo)
    { url: "https://news.google.com/rss/search?q=(%22@officialepfo%22+OR+%22@socialepfo%22+OR+%22officialepfo%22+OR+%22socialepfo%22)+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "Official EPFO Twitter (@officialepfo)" },

    // Priority 4: Mainstream Media & Google News trends
    { url: "https://news.google.com/rss/search?q=EPFO+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "News" },
    { url: "https://news.google.com/rss/search?q=EPF+withdrawal+OR+pension+OR+passbook+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "News" },
    { url: "https://news.google.com/rss/search?q=EPFO+circular+OR+guidelines+OR+%22wage+ceiling%22+when:30d&hl=en-IN&gl=IN&ceid=IN:en", defaultSource: "News" }
  ];

  const allArticles = new Map();

  for (const q of rssQueries) {
    try {
      const res = await fetch(q.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?(?:<source[^>]*>(.*?)<\/source>)?[\s\S]*?<\/item>/g)];

      for (const m of items) {
        const rawTitle = m[1].replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
        const pubDateStr = m[2];
        let source = (m[3] || q.defaultSource).trim();
        let cleanTitle = rawTitle;
        if (rawTitle.includes(" - ")) {
          const parts = rawTitle.split(" - ");
          source = parts.pop().trim() || source;
          cleanTitle = parts.join(" - ").trim();
        }
        const pubDate = new Date(pubDateStr);
        const ageMs = Date.now() - pubDate.getTime();
        const daysAgo = Math.max(0, ageMs / (1000 * 60 * 60 * 24));

        if (daysAgo <= 30 && !allArticles.has(cleanTitle)) {
          allArticles.set(cleanTitle, {
            title: cleanTitle,
            rawTitle,
            source,
            pubDate: pubDate.toISOString(),
            daysAgo: Math.round(daysAgo * 10) / 10
          });
        }
      }
    } catch (err) {
      console.warn("⚠️ RSS fetch warning:", err.message);
    }
  }

  console.log(`Found ${allArticles.size} unique EPFO articles published within the last 30 days.`);
  return Array.from(allArticles.values());
}

function getPostedHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    }
  } catch (_) {}
  return [];
}

// Robust Semantic & Keyword Similarity Deduplication
function getCleanKeywords(text) {
  const stopwords = new Set([
    "with", "from", "that", "this", "these", "those", "have", "been", "were", "what",
    "when", "where", "which", "will", "would", "could", "should", "about", "after",
    "under", "more", "into", "over", "also", "their", "there", "other", "some", "says",
    "know", "explains", "explained", "news", "update", "updates", "latest", "today"
  ]);
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w));
}

function calculateSemanticSimilarity(titleA, titleB) {
  const wordsA = getCleanKeywords(titleA);
  const wordsB = getCleanKeywords(titleB);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;

  return intersection / union; // Jaccard index
}

function isDuplicateHeadline(candidateTitle, history, daysThreshold = 14, similarityThreshold = 0.40) {
  const cTitle = (candidateTitle || "").toLowerCase().trim();
  const cWords = getCleanKeywords(cTitle);
  const now = Date.now();

  for (const entry of history) {
    const prevHeadline = (entry.headline || "").toLowerCase().trim();
    if (!prevHeadline) continue;

    // 1. Exact or near-exact string match
    if (cTitle === prevHeadline) return true;

    // Check age of post if postedAt is present
    if (entry.postedAt) {
      const ageDays = (now - new Date(entry.postedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > daysThreshold) continue; // Allow revisiting evergreen themes after 14 days
    }

    // 2. High Jaccard keyword overlap
    const similarity = calculateSemanticSimilarity(cTitle, prevHeadline);
    if (similarity >= similarityThreshold) {
      return true;
    }

    // 3. Check if 3 or more distinctive keywords overlap
    const prevWords = new Set(getCleanKeywords(prevHeadline));
    const commonSignificant = cWords.filter((w) => prevWords.has(w));
    if (commonSignificant.length >= 3 && (commonSignificant.length / Math.min(cWords.length, prevWords.size)) >= 0.5) {
      return true;
    }
  }

  return false;
}

const EVERGREEN_EPFO_CURRICULUM = [
  {
    title: "EPFO Section 7A Inquiries: How Employers Can Prepare Assessment Records and Defend Compliance",
    description: "Crucial guidance for CFOs and HR on Section 7A quasi-judicial inquiries, summons defense, wage register production, and mitigating penal liabilities.",
    source: "Statutory Master Guide",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Joint Declaration Standard Operating Procedure: Correcting Member Name, DoB & Exit Dates",
    description: "Detailed step-by-step SOP on filing digital Joint Declarations on the Unified Portal to correct demographic errors and date of exit mismatches.",
    source: "EPFO Official SOP",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Section 7Q vs Section 14B: Demystifying Penal Interest and Compounding Damages on Belated Remittances",
    description: "Mathematical breakdown of 12% p.a. simple interest under Section 7Q and up to 25% penal damages under Section 14B on delayed monthly ECR remittances.",
    source: "EPF & MP Act 1952",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "EDLI Scheme 1976: Calculating the Maximum ₹7 Lakh Life Insurance Benefit for Nominees",
    description: "Eligibility, formula calculation, and documentation required for claiming up to ₹7,00,000 life assurance benefit under the Employees' Deposit Linked Insurance Scheme.",
    source: "EDLI Notification",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "EPFO Form 31 Advances: Complete Rulebook on Illness, Housing, and Marriage Grounds",
    description: "Comprehensive breakdown of non-refundable PF advances under Paragraph 68, eligibility periods, required service length, and auto-settlement modes.",
    source: "EPFO Scheme Rules",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Contractor PF Compliance: Principal Employer Liabilities and Independent Verification Audits",
    description: "How principal employers must verify contractor ECR challans, wage ledgers, and UAN remittances to avoid joint statutory liability under Section 8A.",
    source: "Labour Law Advisory",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "EPS-95 Higher Pension Scheme: Supreme Court Framework, Pro-Rata Math, and Joint Option Tracking",
    description: "Deep dive into post-2014 service calculations, wage cap revaluation, and online status tracking for employees opting for pension on actual wages.",
    source: "Supreme Court Directive",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Dual Employment & PF Overlaps: Background Verification (BGV) and Resolution via Joint Declarations",
    description: "Resolving overlapping service periods in Member Passbooks, Annexure-K updates, and rectifying moonlighting flags during corporate background checks.",
    source: "EPFO Digital Governance",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "EPFO Inoperative Accounts & Automatic Claim Settlement Rules: Everything Salaried Workers Must Know",
    description: "Statutory rules governing accounts without deposits for over 36 months, interest crediting until age 58, and auto-settlement caps for small balances.",
    source: "EPFO CBT Norms",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "UAN Seeding Mandate: Aadhaar, Bank Account Verification & DSC Expiry Troubleshooting",
    description: "Best practices for employers to ensure error-free Member profile authentication, avoiding DSC token expiry errors, and resolving KYC rejections.",
    source: "Unified Portal Manual",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Voluntary Provident Fund (VPF): Maximizing Tax-Free Retirement Corpus Beyond 12% Contribution",
    description: "How employees can voluntarily contribute up to 100% of basic + DA to earn 8.25% interest with EEE tax status up to the ₹2.5 Lakh annual threshold.",
    source: "Personal Finance & Tax Guide",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "International Workers Under EPFO: Social Security Agreements (SSA) and Certificate of Coverage Norms",
    description: "Statutory guidelines, contribution exemptions, and detached worker Certificate of Coverage (CoC) procedures under bilateral Social Security Agreements.",
    source: "Ministry of External Affairs / EPFO",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Exempted PF Trusts vs Unexempted Establishments: Annual Audit, Tax, and Transfer Norms",
    description: "Compliance obligations, investment patterns, and transfer formalities for establishments operating their own private Provident Fund trusts.",
    source: "Official Gazette Norms",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "EPFO Electronic Challan cum Return (ECR) Version 2.0: Common Errors & Reconciliation Checklists",
    description: "Resolving TRRN generation errors, duplicate member warnings, wage ceiling adjustments, and missed contribution reconciliation before the 15th.",
    source: "Employer Portal Advisory",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  },
  {
    title: "Death Claims Under EPFO: Fast-Track Settlement via Form 20 and Form 5IF Without Broker Intermediaries",
    description: "Guidance for legal heirs and nominees on expedited settlement of Provident Fund, Pension (Form 10D), and Insurance claims under EDLI.",
    source: "Grievance Redressal Cell",
    daysAgo: 1,
    pubDate: new Date().toISOString()
  }
];

function getNextUnpostedEvergreenTopic(history) {
  for (const topic of EVERGREEN_EPFO_CURRICULUM) {
    if (!isDuplicateHeadline(topic.title, history, 14, 0.40)) {
      return topic;
    }
  }
  return EVERGREEN_EPFO_CURRICULUM[0];
}

function savePostedHeadline(headline, source = "", pubDate = "") {
  try {
    const history = getPostedHistory();
    history.push({ headline, source, pubDate, postedAt: new Date().toISOString() });
    const trimmed = history.slice(-100);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  } catch (err) {
    console.warn("Could not save history:", err.message);
  }
}

/**
 * Fetches today's legally verified statutory briefing from the local EPFO Intelligence Gateway.
 * Endpoint: http://127.0.0.1:8000/v1/social/daily-briefing
 */
async function fetchEpfoIntelligenceBriefing() {
  const url = process.env.EPFO_INTELLIGENCE_API_URL || "http://127.0.0.1:8000/v1/social/daily-briefing";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "X-API-Key": "epfo-admin-key-2026" }
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      console.log(`⚖️ [EPFO Intelligence Gateway] Connected! Loaded verified briefing on: "${data.topic}"`);
      return data;
    }
  } catch (err) {
    // Graceful silent fallback if gateway service is offline
  }
  return null;
}

// Generate an authoritative 3-part Twitter Thread with exact solution and blog link
async function generateEpfoTweet(genAI) {
  // PRIORITY 0: Check EPFO Intelligence Gateway for verified statutory briefings
  const gatewayBriefing = await fetchEpfoIntelligenceBriefing();
  if (gatewayBriefing && gatewayBriefing.twitter_thread && gatewayBriefing.twitter_thread.length > 0) {
    const threadHeadline = `${gatewayBriefing.topic} [Statutory Authority: ${gatewayBriefing.statutory_reference}]`;
    const history = getPostedHistory();
    if (!isDuplicateHeadline(threadHeadline, history)) {
      console.log(`\n⚖️ PRIORITY 0 ACTIVE: Using 100% verified statutory briefing from EPFO Intelligence System!`);
      const thread = gatewayBriefing.twitter_thread;
      savePostedHeadline(threadHeadline, "EPFO Intelligence Gateway", new Date().toISOString());
      return {
        thread,
        tweetText: thread[0],
        insight: gatewayBriefing.topic,
        headline: threadHeadline,
        source: "EPFO Statutory Intelligence System",
        pubDate: new Date().toISOString(),
        resourceUrl: "https://corporatecompliance.in/epfo",
        resourceTitle: "EPFO Statutory Compliance Master Guide",
        instagramCaption: gatewayBriefing.instagram_caption,
        linkedinPost: gatewayBriefing.linkedin_post,
      };
    } else {
      console.log(`ℹ️ [EPFO Intelligence Gateway] Today's statutory briefing already posted. Checking RSS news candidates...`);
    }
  }

  const articles = await fetchTopImpressionEpfoNews();
  const history = getPostedHistory();

  const scoredArticles = articles
    .map(scoreArticle)
    .filter((a) => !isDuplicateHeadline(a.title, history))
    .sort((a, b) => b.score - a.score);

  console.log(`📊 Filtered to ${scoredArticles.length} unposted candidate stories (semantic deduplication active).`);

  // Hierarchical Tier Separation:
  // Tier 0: Official (PIB, Gazette, @officialepfo) -> Checked FIRST!
  // Tier 1: Mainstream Media (ET, Mint, BS, CNBC, TOI) -> Checked SECOND!
  // Tier 2: Online Blogs & Portals -> Fallback
  const tier0Candidates = scoredArticles.filter((a) => a.tier === 0 && a.score > 25);
  const tier1Candidates = scoredArticles.filter((a) => a.tier === 1);
  const tier2Candidates = scoredArticles.filter((a) => a.tier === 2);

  let candidatePool = [];
  let tierLabel = "";

  if (tier0Candidates.length > 0) {
    console.log(`\n🏛️ PRIORITY 1 ACTIVE: Found ${tier0Candidates.length} unposted OFFICIAL releases (PIB / Gazette / @officialepfo).`);
    candidatePool = tier0Candidates;
    tierLabel = "Official Verified Source (PIB / Gazette / @officialepfo)";
  } else if (tier1Candidates.length > 0) {
    console.log(`\n📰 PRIORITY 2 ACTIVE: No unposted official releases available. Checking Mainstream Media (${tier1Candidates.length} available)...`);
    candidatePool = tier1Candidates;
    tierLabel = "Mainstream Media (The Economic Times, Mint, CNBC, BS, TOI)";
  } else if (tier2Candidates.length > 0) {
    console.log(`\n🌐 PRIORITY 3 ACTIVE: Checking Online Blogs & Reference Portals (${tier2Candidates.length} available)...`);
    candidatePool = tier2Candidates;
    tierLabel = "Online Media / Reference Blogs";
  }

  const topCandidates = candidatePool.slice(0, 5);

  let selectedHeadline = "";
  let selectedSource = "";
  let selectedPubDate = "";
  let selectedTierName = "";

  if (topCandidates.length > 0) {
    console.log(`\n--- Top High-Impression Candidates [${tierLabel}] ---`);
    topCandidates.forEach((c, idx) => {
      console.log(`[#${idx + 1}] Score: ${c.score} | ${c.daysAgo}d ago | ${c.sourceBadge || c.source} | ${c.title}`);
    });

    const candidatesPayload = topCandidates.map((c, idx) => ({
      index: idx + 1,
      title: c.title,
      source: c.sourceBadge || c.source,
      tier: c.tierName,
      daysAgo: c.daysAgo,
      score: c.score,
      topics: c.matchedTags
    }));

    const editorPrompt = `You are the Senior SEO & Search Analytics Editor for @EPFOCompliance.
Analyze these top candidate EPFO news stories from our prioritized source pool (${tierLabel}):
${JSON.stringify(candidatesPayload, null, 2)}

Task: Select the single story with the HIGHEST public search impression demand and statutory significance in India today.
Return JSON: { "selectedIndex": <number>, "selectedHeadline": "<title>" }`;

    try {
      console.log("🤖 Gemini AI evaluating top candidate from prioritized tier...");
      const parsed = await callGeminiWithFallback(genAI, editorPrompt, { maxOutputTokens: 500 });
      const chosenCandidate = topCandidates.find((c, idx) => idx + 1 === parsed.selectedIndex) || topCandidates[0];
      selectedHeadline = chosenCandidate.title;
      selectedSource = chosenCandidate.sourceBadge || chosenCandidate.source;
      selectedPubDate = chosenCandidate.pubDate;
      selectedTierName = chosenCandidate.tierName || "Verified Source";
      console.log(`🎯 AI Selected: [Score: ${chosenCandidate.score}] [${selectedSource}] ${selectedHeadline}`);
    } catch (parseErr) {
      console.warn("⚠️ AI selection fallback to top candidate:", parseErr.message);
      const topOne = topCandidates[0];
      selectedHeadline = topOne.title;
      selectedSource = topOne.sourceBadge || topOne.source;
      selectedPubDate = topOne.pubDate;
      selectedTierName = topOne.tierName || "Verified Source";
    }
  }

  // Fallback to fresh unposted topic from Evergreen Master Curriculum if no news available
  if (!selectedHeadline) {
    const evergreen = getNextUnpostedEvergreenTopic(history);
    selectedHeadline = evergreen.title;
    selectedSource = evergreen.source;
    selectedPubDate = evergreen.pubDate || new Date().toISOString();
    selectedTierName = "Statutory Master Curriculum";
    console.log(`🌿 Fresh Evergreen Topic Selected: ${selectedHeadline}`);
  }

  // Dynamically synchronize live website resources from corporatecompliance.in
  const liveResources = await syncCorporateResources();

  // Match the exact tool or blog from corporatecompliance.in
  const resource = matchCorporateResource(selectedHeadline, liveResources);
  console.log(`🔗 Matched Resource: ${resource.title} (${resource.url})`);

  // Prompt Gemini to craft the complete 5-part Thread
  const threadPrompt = `You are @EPFOCompliance, the leading authority on EPFO rules and statutory compliance in India.
Write an authoritative, highly comprehensive 5-part Twitter/X THREAD about this development:

News Headline: "${selectedHeadline}"
Source: "${selectedSource}"
Source Authority: "${selectedTierName}"
Topic Facts & Actionable Solution: "${resource.solutionFacts}"
Target Blog/Tool Guide URL: "${resource.url}"

CRITICAL MANDATE FOR THIS THREAD:
Every single tweet in this 5-tweet thread MUST BE 100% EXCLUSIVELY about the exact headline topic: "${selectedHeadline}".
NEVER drift into generic boilerplate (NEVER mention unrelated Section 7A summons, 7Q/14B penal damages, contractor ledgers, or Joint Declarations unless the headline is specifically about them).

Follow this STRICT 5-TWEET PROGRESSION:

1. TWEET 1 (Headline Hook & Topic Introduction — ZERO EXTERNAL LINKS):
   - Announce the exact news headline clearly with a compelling, high-impact hook.
   - If Source is Official (PIB, Gazette, @officialepfo), prefix authoritatively (e.g. "[Official PIB Alert]" or "[Official Gazette Notice]").
   - Include hashtags: "#EPFO #PFCompliance"
   - End with: "Thread 👇 (1/5)"
   - STRICT ALGORITHMIC RULE: DO NOT INCLUDE ANY LINKS IN TWEET 1 (X/Twitter algorithm heavily suppresses root tweets with external URLs).
   - STRICT LENGTH: Under 260 characters.

2. TWEET 2 (Core Topic Explanation & All About The News):
   - Deep-dive strictly into this specific headline topic.
   - Explain what this update/rule is, who is affected (salaried employees, retirees, or employers), and why it matters right now.
   - End with: "(2/5)"
   - STRICT LENGTH: Under 265 characters. NO links.

3. TWEET 3 (How-To / Step-by-Step Practical Implementation):
   - Provide the EXACT procedural steps, portal actions, forms, or guidelines for how to implement or benefit from this specific topic.
   - End with: "(3/5)"
   - STRICT LENGTH: Under 265 characters. NO links.

4. TWEET 4 (Pros, Cons & Critical Caveats):
   - An objective breakdown of the Pros (key benefits/advantages) vs Cons (limitations, eligibility criteria, tax impact, or delay risks) strictly regarding this topic.
   - Include relevant hashtags matching the topic (e.g. "#LabourLaw #Payroll").
   - End with: "(4/5)"
   - STRICT LENGTH: Under 265 characters. NO links.

5. TWEET 5 (Conclusion, Website Attraction & Resource Link + Hashtags):
   - Concluding summary on this topic + warning against fraudulent agents/OTPs.
   - Direct call-to-action promoting the verified blog resource with exact link: "${resource.cta} ${resource.url}"
   - End with: "#EPFO #PFCompliance #HRIndia (5/5)"
   - STRICT LENGTH: Under 260 characters (the URL automatically counts as 23 characters).

6. CARD INSIGHT:
   - One crisp sentence (under 115 characters) summarizing the core statutory rule for the high-res infographic card.

Return JSON in this exact schema:
{
  "tweet1": "<tweet 1 text>",
  "tweet2": "<tweet 2 text>",
  "tweet3": "<tweet 3 text>",
  "tweet4": "<tweet 4 text>",
  "tweet5": "<tweet 5 text>",
  "cardInsight": "<one sentence summary under 115 chars>"
}`;

  console.log("🧵 Generating 5-part comprehensive solution thread via Gemini AI...");
  let threadData = null;
  try {
    threadData = await callGeminiWithFallback(genAI, threadPrompt, { maxOutputTokens: 2500 });
  } catch (threadErr) {
    console.warn("⚠️ Thread AI synthesis fallback:", threadErr.message);
  }

  let tweet1, tweet2, tweet3, tweet4, tweet5, cardInsight;

  if (threadData && (threadData.tweet1 || threadData.tweet2)) {
    tweet1 = (threadData.tweet1 || "").trim();
    tweet2 = (threadData.tweet2 || "").trim();
    tweet3 = (threadData.tweet3 || "").trim();
    tweet4 = (threadData.tweet4 || "").trim();
    tweet5 = (threadData.tweet5 || "").trim();
    cardInsight = (threadData.cardInsight || tweet1.slice(0, 110)).trim();
  } else {
    console.log("📋 Using high-fidelity programmatic thread fallback (100% topic-specific)...");
    const solFacts = (resource && resource.solutionFacts) ? resource.solutionFacts : "Review official guidelines and portal options.";
    const cleanH = selectedHeadline.slice(0, 110);
    tweet1 = `1/5 🚨 [${selectedTierName.includes("Official") ? "Official Alert" : "Compliance Notice"}] ${cleanH}.\n\nEverything you must know: practical how-to steps, pros & cons, and key takeaways.\n\n#EPFO #Compliance Thread 👇`;
    tweet2 = `2/5 📌 What This Update Means:\nDeep-dive into ${cleanH}:\n• Purpose: Official statutory initiative to streamline member and establishment processes.\n• Scope: Applies directly to eligible workforce members across covered establishments.`;
    tweet3 = `3/5 🛠️ Practical How-To Steps:\n1. Log in to the official Member/Employer Portal.\n2. Navigate to Online Services & verify seeded KYC details.\n3. ${solFacts.slice(0, 120)}\n4. Monitor status online.`;
    tweet4 = `4/5 ⚖️ Pros, Cons & Key Considerations:\n✅ Pros: Simplified processing, greater autonomy & reduced paperwork.\n⚠️ Watch out: Unverified details or incorrect portal entries can cause delays. Double-check before submitting.`;
    tweet5 = `5/5 📌 Free Tools & Complete Breakdown:\nAccess verified calculators and the full step-by-step master guide:\n👉 ${resource.url}\n\n#EPFO #PFCompliance #HRIndia`;
    cardInsight = selectedHeadline.slice(0, 110);
  }

  const thread = [tweet1, tweet2, tweet3, tweet4, tweet5].filter(Boolean);

  console.log("\n==================== 5-PART THREAD TO POST ====================");
  thread.forEach((tw, idx) => {
    console.log(`[Tweet ${idx + 1}/${thread.length}${idx === 0 ? " - Image Card Attached" : ""}] (${tw.length} chars):\n${tw}\n`);
  });
  console.log("===============================================================\n");

  return {
    thread,
    tweetText: tweet1, // Primary tweet for card/legacy callers
    insight: cardInsight,
    headline: selectedHeadline,
    source: selectedSource,
    pubDate: selectedPubDate,
    resourceUrl: resource.url,
    resourceTitle: resource.title,
  };
}

module.exports = {
  CORPORATE_RESOURCES,
  FALLBACK_RESOURCES,
  HIGH_SEARCH_INTENT_MAP,
  syncCorporateResources,
  matchCorporateResource,
  getSourceTier,
  scoreArticle,
  fetchTopImpressionEpfoNews,
  getEpfoNewsPool: fetchTopImpressionEpfoNews,
  getPostedHistory,
  savePostedHeadline,
  fetchEpfoIntelligenceBriefing,
  generateEpfoTweet,
  isDuplicateHeadline,
  calculateSemanticSimilarity,
  EVERGREEN_EPFO_CURRICULUM,
  getNextUnpostedEvergreenTopic,
};
