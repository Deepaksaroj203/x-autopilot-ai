// stagehand_agent.js — AI-Resilient Browser Automation for Social Media Auto-Poster
// Leverages @browserbasehq/stagehand and Playwright to eliminate brittle selector breakage.
// If a hardcoded selector fails due to platform UI changes, this module utilizes AI visual/DOM reasoning to locate and interact with the elements.

require("dotenv").config();
const { Stagehand } = require("@browserbasehq/stagehand");

/**
 * Perform a resilient click on an element described in natural language.
 * Tries fallback CSS/XPath selectors first for sub-millisecond execution.
 * If all standard selectors fail or time out, elevates to AI Stagehand reasoning.
 *
 * @param {import('playwright').Page} page - Active Playwright page
 * @param {string} naturalDescription - E.g. "Click the create new post button"
 * @param {string[]} [selectors=[]] - Array of candidate CSS/XPath selectors
 * @param {number} [timeout=4000] - Timeout for each selector candidate in ms
 */
async function resilientClick(page, naturalDescription, selectors = [], timeout = 4000) {
  // 1. Fast path: try exact selectors
  for (const selector of selectors) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.isVisible({ timeout })) {
        await loc.click();
        return { success: true, method: "selector", selector };
      }
    } catch (_) {}
  }

  // 2. Text-heuristic search in active DOM
  console.log(`ℹ️ Selectors timed out for "${naturalDescription}". Attempting heuristic fuzzy DOM lookup...`);
  try {
    const textMatches = page.locator(`button:has-text("${naturalDescription}"), div[role="button"]:has-text("${naturalDescription}"), a:has-text("${naturalDescription}")`).first();
    if (await textMatches.isVisible({ timeout: 2500 })) {
      await textMatches.click();
      return { success: true, method: "heuristic" };
    }
  } catch (_) {}

  // 3. Stagehand AI-guided action fallback
  console.log(`🤖 Invoking Stagehand AI agent to resolve: "${naturalDescription}"...`);
  try {
    const stagehand = new Stagehand({
      env: "LOCAL",
      verbose: 0,
      debugDom: false
    });
    // If page is available to stagehand
    if (stagehand && stagehand.page && typeof stagehand.page.act === "function") {
      await stagehand.page.act(naturalDescription);
      return { success: true, method: "stagehand" };
    }
  } catch (err) {
    console.warn(`⚠️ Stagehand fallback warning: ${err.message}`);
  }

  throw new Error(`Unable to perform resilient click for "${naturalDescription}" across all selectors and heuristics.`);
}

/**
 * Perform resilient text input into a field.
 *
 * @param {import('playwright').Page} page
 * @param {string} naturalDescription
 * @param {string} textToFill
 * @param {string[]} [selectors=[]]
 * @param {number} [timeout=4000]
 */
async function resilientFill(page, naturalDescription, textToFill, selectors = [], timeout = 4000) {
  for (const selector of selectors) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.isVisible({ timeout })) {
        await loc.click();
        await page.waitForTimeout(300);
        await loc.fill(textToFill);
        return { success: true, method: "selector", selector };
      }
    } catch (_) {}
  }

  // Fallback: search for contenteditable or role="textbox"
  console.log(`ℹ️ Looking for active textbox heuristic for "${naturalDescription}"...`);
  try {
    const box = page.locator('div[role="textbox"], div[contenteditable="true"], textarea').last();
    if (await box.isVisible({ timeout: 3000 })) {
      await box.click();
      await page.waitForTimeout(300);
      await box.fill(textToFill);
      return { success: true, method: "heuristic-textbox" };
    }
  } catch (_) {}

  throw new Error(`Unable to fill input for "${naturalDescription}".`);
}

module.exports = {
  resilientClick,
  resilientFill,
};
