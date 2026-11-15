# Omnichannel Social Autopilot Suite (LinkedIn, Instagram, Facebook & Twitter)

Complete autonomous thought-leadership and visual news auto-poster suite powered by **Google Gemini 2.5 Flash**, **Playwright Browser Workers**, and **Dynamic High-Resolution Card Generation**.

Operates with **Zero API paywalls** and **Zero password risk** (via persistent browser profile sessions).

---

## 1. Supported Platforms & Native Formats

| Platform | Content Architecture | Visual Dimensions | Session Storage | Launcher Script |
| :--- | :--- | :--- | :--- | :--- |
| **LinkedIn** | Long-form B2B thought-leadership (800–1,500 chars), structured paragraphs, bulleted takeaways, B2B hashtags | 1200x628 Executive Landscape (or 1080x1080) | `.linkedin_user_data` | `run_linkedin_bot.bat` |
| **Instagram** | High-engagement visual caption (400–800 chars), emoji hooks, 4 bullet takeaways, CTA, 15–20 hashtags | 1080x1080 Square (1:1 Retina) | `.instagram_user_data` | `run_instagram_bot.bat` |
| **Facebook** | Community & page updates (400–800 chars), conversational breakdown, direct website reference link | 1200x630 Community Card | `.facebook_user_data` | `run_facebook_bot.bat` |
| **Twitter / X** | 3-to-5 tweet comprehensive educational threads, auto-hashtags, website link in Tweet #1 | 1200x675 16:9 Landscape Card | `.twitter_user_data` | `run_browser_bot.bat` |

---

## 2. One-Time Setup (2 Minutes)

### Prerequisites
1. Node.js (v18+) installed.
2. Free Google Gemini API Key in `.env`:
   ```env
   GEMINI_API_KEY="your-free-gemini-key"
   ACTIVE_NICHE="epfo" # or finance, ai_tech, crypto, custom
   ```

### Quick Install
```bash
npm install
```

---

## 3. How Zero-Password Session Delegation Works

You **never** enter or share your account password in code or config files. 

1. On your very first run of any bot (e.g. `node linkedin_poster.js` or `run_instagram_bot.bat`), a real Microsoft Edge / Chromium browser window will open automatically.
2. The bot politely pauses and asks you to log in to your account normally (with your 2FA, authenticator, or Google/Apple sign-in).
3. Once logged in, the browser detects your active feed and securely saves your session cookies and authentication tokens in an isolated local directory:
   - LinkedIn: `.linkedin_user_data`
   - Instagram: `.instagram_user_data`
   - Facebook: `.facebook_user_data`
   - Twitter/X: `.twitter_user_data`
4. From that moment forward, the bot runs **100% autonomously** in the background. You never have to log in again!

---

## 4. How to Run

### Option A: Run Individual Platforms
* **LinkedIn**: Double-click `run_linkedin_bot.bat` or run:
  ```bash
  node linkedin_poster.js
  ```
* **Instagram**: Double-click `run_instagram_bot.bat` or run:
  ```bash
  node instagram_poster.js
  ```
* **Facebook**: Double-click `run_facebook_bot.bat` or run:
  ```bash
  node facebook_poster.js
  ```
* **Twitter / X**: Double-click `run_browser_bot.bat` or run:
  ```bash
  node browser_poster.js
  ```

### Option B: Omnichannel Cross-Platform Syndicate (All-in-One)
To publish a single breaking regulatory or industry news release across **all 4 platforms simultaneously**:
* Double-click `run_omnichannel_bot.bat` or run:
  ```bash
  node omnichannel_runner.js --platforms=all
  ```
* Or choose specific targets:
  ```bash
  node omnichannel_runner.js --platforms=linkedin,instagram
  ```

---

## 5. Offline Resilient Watchdog & Scheduling

The `omnichannel_runner.js` includes an active internet watchdog:
* If your laptop or server is temporarily offline when a scheduled run triggers, the script pauses and polls your connection every 15 seconds.
* The moment your connection restores, it immediately executes the scheduled post and logs the results in `omnichannel_posting_status.json`.

### Recommended Daily Posting Schedule:
* **Slot 1 (Morning Executive Digest)**: 09:30 AM IST (Peak B2B LinkedIn & Twitter commute hours)
* **Slot 2 (Evening Deep Dive)**: 06:00 PM IST (Peak Instagram & Facebook community activity)
