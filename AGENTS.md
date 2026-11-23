# Auto Social AI Bot (Hermes & Omnichannel) — Agent Engineering & Skill Routing Rules

## 1. Project Context
- **Vertical**: Automated daily statutory compliance broadcasts across Twitter/X, LinkedIn, Facebook, Instagram, and YouTube Studio for `corporatecompliance.in`.
- **Target Audience**: Indian Employers, CFOs, HR Leaders, Payroll Managers, and Salaried EPF Members.
- **Primary Source**: Verified EPFO Gazette Notifications, Circulars, and Intelligence Brain (`http://127.0.0.1:8000/v1/social/daily-briefing`).

---

## 2. Dynamic Skill Routing Decision Matrix
All automated subagents, code revisions, and content pipelines must strictly execute through the following integrated skills installed in `.agents/skills/`:

| Objective & Phase | Activated Skills | Implementation Directives & Standards |
|---|---|---|
| **LinkedIn Thought Leadership** | `linkedin-content-generator`, `linkedin-post-writer`, `copywriting-psychologist` | Generate 350–500 word executive masterclasses. Enforce loss-aversion opening hooks, concrete 4-step HR playbooks, and high-conversion comment-to-DM triggers (`COMPLIANCE`). Zero boilerplate or generic fluff. |
| **Twitter / X Advisory Threads** | `x-article-publisher-skill`, `x-twitter-scraper`, `copywriting` | Craft 5-part algorithmic threads (1/5 Hook -> 2/5 Regulatory Mandate -> 3/5 Portal Procedure -> 4/5 Caveats/Risks -> 5/5 Resource Link). Protect algorithmic distribution by never putting links in Tweet 1. |
| **Direct Response & Hook Psychology** | `copywriting-psychologist`, `copywriting` | Apply cognitive psychology: loss aversion (7Q interest, 14B damages, delayed settlements), open loops, and pattern interrupts. Eliminate corporate jargon in favor of crisp, definitive authority. |
| **YouTube Shorts & Video SEO** | `youtube-seo-optimizer`, `youtube-automation`, `youtube-transcript` | Optimize video upload metadata for channel `@arnavsaroj2415`. Enforce high-CTR titles (under 90 chars + `#Shorts`), keyword-dense descriptions, and targeted compliance tags. |
| **Visual Creatives & Carousels** | `ad-creative`, `instagram-automation`, `content-creator` | Structure 9:16 social cards and carousels with high-contrast typography, statutory metric callouts, and clean category badges. |
| **Browser Stability & Scraping** | `browser-automation`, `web-scraper` | Maintain persistent session isolation in `.user_data` directories. Implement robust locator polling, headless fallback recovery, and stealth flags (`--disable-blink-features=AutomationControlled`). |
| **Agentic Quality & Verification** | `ai-agents-architect`, `agent-evaluation`, `prompt-engineering` | Evaluate all AI-generated posts against zero-hallucination rubrics: verify Act citations, penal sections, and statutory rates against real gazettes before dispatch. |
| **Error Diagnostics & Debugging** | `systematic-debugging` | Analyze runner failure logs (`omnichannel_runner.log`, `daily_runner.log`) to diagnose network timeouts, selector changes, or expired session tokens without speculative edits. |

---

## 3. Operational Standards
- **Zero Hallucination on Law**: All cited sections (Section 7A, 7Q, 14B, Paragraph 68B, Form 11, Joint Declaration) must adhere to authentic statutory language.
- **Persistent Sessions**: Never hardcode credentials. Route browser automation through persistent profile directories (`.twitter_user_data`, `.linkedin_user_data`, etc.).
- **Silent Background Execution**: Scheduled tasks must execute via `wscript.exe` / `run_silent.vbs` to ensure 0ms console window flashes.
