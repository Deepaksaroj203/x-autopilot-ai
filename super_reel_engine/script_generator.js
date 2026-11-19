// script_generator.js — High-Retention Script & Visual Blueprint Synthesizer

require("dotenv").config();

async function generateScriptAndBeats({ topic = "Why 80% of EPFO Joint Declarations Get Rejected", genre = "facts_finance", durationSec = 40 }) {
  // Normalize topic
  let cleanTopic = topic.trim();
  if (cleanTopic.toLowerCase() === "catoon") {
    cleanTopic = "The Evolution and Hidden Secrets of Classic Cartoons";
  }

  // Attempt Gemini AI if key exists, with fallback
  let geminiResult = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      geminiResult = await fetchGeminiScript(cleanTopic, durationSec);
    } catch (e) {
      // Quiet fallback
    }
  }

  if (geminiResult) {
    return geminiResult;
  }

  return generateAlgorithmicScript(cleanTopic, genre, durationSec);
}

async function fetchGeminiScript(topic, durationSec) {
  const targetWords = Math.round(durationSec * 2.5); // ~100-110 words for 40s
  const prompt = `Write a viral YouTube Shorts script about: "${topic}".
Duration: ~${durationSec} seconds (${targetWords} words).
Tone: Authoritative, punchy, curiosity-driven.
Format as JSON:
{
  "hook": "First 3-second attention grabber",
  "fullScript": "Complete spoken voiceover narration ending with a 4-second CTA to follow and save",
  "keyStats": [
    { "number": "Stat or key phrase", "label": "Short description" }
  ],
  "steps": ["Point 1", "Point 2", "Point 3"]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("No candidates");

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const parsed = JSON.parse(jsonMatch[0]);
  return buildBeatsFromScriptData(topic, parsed, durationSec);
}

function generateAlgorithmicScript(topic, genre, durationSec) {
  const isEpfo = /epfo|pf|pension|declaration|compliance/i.test(topic);
  const isCartoon = /cartoon|animation|disney|anime/i.test(topic);

  let hook = "";
  let bodySentences = [];
  let stats = [];
  let steps = [];

  if (isEpfo) {
    hook = `Stop! If you're submitting an EPFO Joint Declaration, there is an eighty percent chance it gets instantly rejected!`;
    bodySentences = [
      `Most employers and members fail on one critical detail: the Annexure-K wage history mismatch.`,
      `When your establishment record doesn't align with the Unified Member Profile down to the exact date of exit, Section 7A audits automatically flag the submission.`,
      `To resolve this, verify your digital signature certificate, cross-reference Form 3A ledger balances, and upload clear joint documentation.`,
      `Never submit blindly without matching your employer KYC first. Follow for daily compliance updates and save this video for your next filing.`
    ];
    stats = [
      { number: "80%", label: "Portal Rejection Rate" },
      { number: "Sec 7A", label: "Statutory Scrutiny" },
      { number: "3 Days", label: "Resolution Window" }
    ];
    steps = [
      "Cross-verify Annexure-K against wage register",
      "Validate DSC & employer e-sign validity",
      "Submit joint declaration with ledger proofs"
    ];
  } else if (isCartoon) {
    hook = `Did you know that ninety percent of early cartoon animations used a secret technique that modern CGI still can't beat?`;
    bodySentences = [
      `Back in the Golden Age of animation, artists hand-drew twenty-four frames for every single second of screen time.`,
      `They relied on the twelve core Disney principles, especially squash and stretch, giving rubber-hose characters that irresistible living elasticity.`,
      `Today, master studios combine these vintage hand-drawn arcs with spring physics to create jaw-dropping viral motion.`,
      `Mastering these motion arcs is how timeless animation is created. Follow for more animation deep dives and save this reel.`
    ];
    stats = [
      { number: "24 FPS", label: "Hand-Drawn Cel Rate" },
      { number: "12 Rules", label: "Disney Principles" },
      { number: "1928", label: "Golden Era Genesis" }
    ];
    steps = [
      "Squash & stretch to express physical weight",
      "Natural curved motion arcs over straight lines",
      "Staging & anticipation before explosive action"
    ];
  } else {
    hook = `Stop scrolling! This hidden breakdown about ${topic} reveals what ninety-nine percent of people completely overlook.`;
    bodySentences = [
      `When you examine the actual data behind ${topic}, the conventional wisdom falls apart completely.`,
      `Industry insiders rely on three foundational pillars that separate elite results from average execution.`,
      `First, identify the root structural constraint before making changes. Second, execute with calibrated timing and precision.`,
      `Third, lock in verified checks before moving forward. Follow for daily elite breakdowns and save this for reference.`
    ];
    stats = [
      { number: "99%", label: "Miss This Critical Step" },
      { number: "3 Pillars", label: "Proven Framework" },
      { number: "10X", label: "Long-term Impact" }
    ];
    steps = [
      "Identify the core underlying constraint",
      "Apply precision calibration",
      "Verify structural integrity"
    ];
  }

  const fullScript = [hook, ...bodySentences].join(" ");
  return buildBeatsFromScriptData(topic, { hook, fullScript, keyStats: stats, steps }, durationSec);
}

function buildBeatsFromScriptData(topic, data, durationSec) {
  const sentences = data.fullScript.match(/[^.!?]+[.!?]+/g) || [data.fullScript];
  const beats = [];
  const beatDuration = durationSec / Math.max(sentences.length, 6);

  let currentTime = 0;

  sentences.forEach((sentence, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === sentences.length - 1;
    const startSec = currentTime;
    const endSec = currentTime + beatDuration;
    currentTime = endSec;

    let beatType = "body";
    if (isFirst) beatType = "hook";
    else if (isLast) beatType = "outro";
    else if (idx === 1) beatType = "problem";
    else if (idx === 2) beatType = "revelation";
    else beatType = "solution";

    const stat = (data.keyStats && data.keyStats[idx % data.keyStats.length]) || { number: "VERIFIED", label: "Official Advisory" };
    const stepText = (data.steps && data.steps[idx % data.steps.length]) || "";

    beats.push({
      beatIndex: idx + 1,
      beatType,
      startSec,
      endSec,
      durationSec: beatDuration,
      spokenText: sentence.trim(),
      headline: isFirst ? topic.toUpperCase() : (isLast ? "TAKE ACTION NOW" : `KEY BREAKDOWN #${idx}`),
      subtext: sentence.trim(),
      statNumber: stat.number,
      statLabel: stat.label,
      stepHighlight: stepText
    });
  });

  return {
    topic,
    fullScript: data.fullScript,
    totalDurationSec: durationSec,
    beats
  };
}

module.exports = { generateScriptAndBeats };
