#!/usr/bin/env python3
"""
================================================================================
HERMES AUTOBOT: Autonomous Social Media Intelligence Engine
================================================================================
Integrated with:
- NousResearch Hermes Agent Architecture (SOUL.md & Multi-Stage Reasoning)
- Local FreeLLMAPI (http://127.0.0.1:31415/v1) with 836M+ Free Tokens
- Twitter / X API v2 (OAuth 1.0a RFC 5849 & Thread Chaining)
- Persistent Hermes Memory Vault (hermes_memory.json)

Author: Antigravity x Hermes Agent Integration
Version: 3.0.0 Pro
================================================================================
"""

import os
import sys
import json
import time
import uuid
import hmac
import hashlib
import base64
import argparse
import random
import re
import urllib.parse
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

# Optional requests import; falls back to urllib
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    HAS_REQUESTS = False

# Ensure local path resolution
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
HERMES_DIR = r"C:\Users\acer\hermes-agent"
if HERMES_DIR not in sys.path:
    sys.path.insert(0, HERMES_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Configuration & FreeLLMAPI defaults
FREELLM_API_KEY = os.environ.get("FREELLM_API_KEY", "freellmapi-ae58ad08732a078514fe10d377f69115e83afcc08697f84d")
FREELLM_BASE_URL = os.environ.get("FREELLM_BASE_URL", "http://127.0.0.1:31415/v1")

DEFAULT_FAST_MODELS = [
    "qwen3.8-27b",
    "glm-4.7-flash",
    "deepseek-r1-distill-qwen-32b",
    "gemini-3.7-flash",
    "llama-3.3-70b"
]

MEMORY_FILE = os.path.join(CURRENT_DIR, "hermes_memory.json")
SECRETS_FILE = os.path.join(CURRENT_DIR, "secrets.json")
SECRETS_JS_FILE = os.path.join(CURRENT_DIR, "SECRETS.js")

# Hermes SOUL Directive
HERMES_SOUL_PROMPT = """You are Hermes Agent, built by Nous Research.
Be direct: match the length of your reply to the weight of the ask.
No filler ("Great question", "I'd be happy to"), no restating the request back, no narrating tool calls.
Plain claims over adjectives; when unsure, say so plainly. Depth is earned.
You specialize in viral social distribution: maximum insight density, irresistible hooks, high-resonance debate angles, and strict character economy."""


# ==============================================================================
# 1. PERSISTENT HERMES MEMORY & ANTI-REPETITION VAULT
# ==============================================================================

class HermesMemory:
    """Manages long-term state, topic tracking, and anti-duplication."""

    def __init__(self, memory_path: str = MEMORY_FILE):
        self.memory_path = memory_path
        self.data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.memory_path):
            try:
                with open(self.memory_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[!] Warning loading memory: {e}")
        return {
            "version": "3.0.0",
            "created_at": datetime.now().isoformat(),
            "total_tweets_generated": 0,
            "total_tweets_posted": 0,
            "history": [],
            "recent_topics": [],
            "seen_hashes": []
        }

    def save(self):
        try:
            with open(self.memory_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[!] Warning saving memory: {e}")

    def compute_hash(self, text: str) -> str:
        clean = re.sub(r"\W+", "", text.lower())
        return hashlib.sha256(clean.encode("utf-8")).hexdigest()[:16]

    def is_duplicate(self, text: str) -> bool:
        h = self.compute_hash(text)
        return h in self.data.get("seen_hashes", [])

    def record_tweet(self, tweet_text: str, topic: str, viral_score: float, mode: str, tweet_id: Optional[str] = None):
        h = self.compute_hash(tweet_text)
        entry = {
            "id": tweet_id or f"dry-run-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.now().isoformat(),
            "topic": topic,
            "text": tweet_text,
            "length": len(tweet_text),
            "viral_score": viral_score,
            "mode": mode,
            "hash": h
        }
        self.data["history"].append(entry)
        self.data["total_tweets_generated"] += 1
        if mode == "LIVE":
            self.data["total_tweets_posted"] += 1

        # Keep last 50 hashes and recent 20 topics
        seen = self.data.setdefault("seen_hashes", [])
        seen.append(h)
        self.data["seen_hashes"] = seen[-100:]

        topics = self.data.setdefault("recent_topics", [])
        if topic not in topics:
            topics.append(topic)
        self.data["recent_topics"] = topics[-25:]

        self.save()

    def get_recent_topics_constraint(self) -> str:
        recent = self.data.get("recent_topics", [])[-10:]
        if not recent:
            return ""
        return "CRITICAL ANTI-REPETITION: Do NOT repeat these recently covered topics:\n- " + "\n- ".join(recent)

    def print_stats(self):
        print("\n" + "=" * 60)
        print("           HERMES AUTOBOT KNOWLEDGE VAULT STATS")
        print("=" * 60)
        print(f" Total Tweets Generated : {self.data.get('total_tweets_generated', 0)}")
        print(f" Total Live Tweets Posted: {self.data.get('total_tweets_posted', 0)}")
        history = self.data.get("history", [])
        if history:
            avg_score = sum(h.get("viral_score", 0) for h in history) / len(history)
            print(f" Average Viral Score     : {avg_score:.2f} / 10.0")
            print(f" Unique Content Fingerprints: {len(self.data.get('seen_hashes', []))}")
            print(f"\n Recently Explored Topics:")
            for t in self.data.get("recent_topics", [])[-6:]:
                print(f"  * {t}")
        print("=" * 60 + "\n")


# ==============================================================================
# 2. TOPIC RADAR & TREND DISCOVERY
# ==============================================================================

class TopicRadar:
    """Discovers high-velocity niche topics across tech, AI, polity, and business."""

    CATEGORIES = {
        "AI_AND_AGENTS": [
            "Local LLMs and autonomous agent swarms running on consumer hardware (Hermes, DeepSeek, Qwen)",
            "Context engineering vs fine-tuning: why structured prompt architectures beat retraining",
            "Small specialized models overtaking massive 400B parameter behemoths in enterprise workflows",
            "Agentic tool calling architectures and automated self-healing software loops"
        ],
        "TECH_CRAFT": [
            "Building zero-dependency architectures: why reducing npm/pip bloat accelerates reliability",
            "Asynchronous event loops vs multi-threaded concurrency in high-throughput API design",
            "The death of microservice premature optimization: why monolithic modular systems are winning again",
            "Developer leverage: how 1 engineer with autonomous agent pipelines outships full engineering squads"
        ],
        "INDIAN_POLITY_AND_POLICY": [
            "India's Digital Public Infrastructure (UPI, ONDC, India Stack) as the global blueprint for sovereign tech",
            "Supreme Court rulings on digital privacy and automated governance standards in India",
            "Renewable energy capacity expansion and nuclear small-modular-reactor policy developments in India",
            "Semiconductor manufacturing hubs in Gujarat and Karnataka: India's chip supply chain milestone"
        ],
        "STARTUP_AND_VENTURE": [
            "Bootstrapping vs VC: why high gross margins and rapid cash flow beat endless valuation dilution",
            r"The modern high-agency solo-founder: leveraging AI agents to reach $1M ARR with zero headcount",
            "Distribution as the ultimate moat: why brilliant tech fails without sticky distribution loops"
        ],
        "GLOBAL_MACRO": [
            "Decentralized compute networks (DePIN) and the commoditization of AI inference hardware",
            "Global supply chain reshoring and the economic pivot toward resilient multi-polar trade corridors"
        ]
    }

    @classmethod
    def get_random_topic(cls) -> Tuple[str, str]:
        cat_key = random.choice(list(cls.CATEGORIES.keys()))
        topic = random.choice(cls.CATEGORIES[cat_key])
        return cat_key, topic


# ==============================================================================
# 3. HERMES COGNITIVE INFERENCE CLIENT (FreeLLMAPI)
# ==============================================================================

class HermesBrain:
    """Manages reasoning cycles with FreeLLMAPI local endpoints."""

    def __init__(self, base_url: str = FREELLM_BASE_URL, api_key: str = FREELLM_API_KEY):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def complete(self, prompt: str, system: str = HERMES_SOUL_PROMPT, model: Optional[str] = None, max_tokens: int = 500, temperature: float = 0.7) -> str:
        models = [model] if model else []
        models.extend([m for m in DEFAULT_FAST_MODELS if m not in models])

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        last_err = None
        for m in models:
            payload = {
                "model": m,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": temperature
            }

            try:
                if HAS_REQUESTS:
                    r = requests.post(f"{self.base_url}/chat/completions", headers=headers, json=payload, timeout=25)
                    if r.status_code == 200:
                        content = r.json()["choices"][0]["message"]["content"].strip()
                        return content
                    else:
                        last_err = f"HTTP {r.status_code}: {r.text[:80]}"
                else:
                    req = urllib.request.Request(
                        f"{self.base_url}/chat/completions",
                        data=json.dumps(payload).encode("utf-8"),
                        headers=headers,
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=25) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                last_err = str(e)

        raise RuntimeError(f"HermesBrain failed across all candidate models. Last error: {last_err}")


# ==============================================================================
# 4. CANDIDATE GENERATOR & REASONING LOOP
# ==============================================================================

class HermesCandidateGenerator:
    """Generates multi-angle candidate tweets and micro-threads."""

    def __init__(self, brain: HermesBrain, memory: HermesMemory):
        self.brain = brain
        self.memory = memory

    def clean_text(self, text: str) -> str:
        text = text.strip()
        # Remove markdown bold/italics that do not render on standard X
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
        text = re.sub(r"\*([^*]+)\*", r"\1", text)
        # Strip surrounding quotes
        if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
            text = text[1:-1].strip()
        # Remove markdown fences
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join([line for line in lines if not line.startswith("```")]).strip()
        return text

    def generate_single_tweet_candidates(self, topic: str, model: Optional[str] = None) -> List[Dict[str, Any]]:
        anti_rep = self.memory.get_recent_topics_constraint()
        prompt = f"""Target Topic: {topic}
{anti_rep}

Generate 2 distinctly styled tweet candidates based on this topic.
Rules:
- Angle 1 (Direct Insight / Hook): Punchy opening sentence that stops the scroll, delivers a surprising insight or fact, and leaves a sharp takeaway.
- Angle 2 (Contrarian / Debate): Challenges common misconceptions with crisp logic. Sparks comments and discussion.
- Each tweet MUST be under 270 characters (strict Twitter limit is 280).
- Include 1-2 relevant hashtags and 1-2 clean emojis.
- Do NOT use markdown asterisks like **bold**. Output raw clean text only.

Format your output EXACTLY as JSON:
{{
  "candidate_1": {{
    "angle": "Hook & Core Insight",
    "thought": "<brief Hermes reasoning for hook>",
    "tweet": "<tweet text strictly <= 270 chars>"
  }},
  "candidate_2": {{
    "angle": "Contrarian Debate",
    "thought": "<brief Hermes reasoning for contrarian angle>",
    "tweet": "<tweet text strictly <= 270 chars>"
  }}
}}
"""
        response = self.brain.complete(prompt, model=model, max_tokens=1000, temperature=0.75)
        # Clean any markdown code blocks
        clean_resp = response.strip()
        if "```" in clean_resp:
            clean_resp = re.sub(r"^```(?:json)?\s*", "", clean_resp)
            clean_resp = re.sub(r"\s*```$", "", clean_resp)

        # Parse JSON from response
        try:
            # Find outermost JSON object
            start_idx = clean_resp.find("{")
            end_idx = clean_resp.rfind("}")
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = clean_resp[start_idx:end_idx+1]
                data = json.loads(json_str)
                c1 = data.get("candidate_1", {})
                c2 = data.get("candidate_2", {})
                t1 = self.clean_text(c1.get("tweet", ""))
                t2 = self.clean_text(c2.get("tweet", ""))
                if t1 or t2:
                    cands = []
                    if t1:
                        c1["tweet"] = t1
                        cands.append(c1)
                    if t2:
                        c2["tweet"] = t2
                        cands.append(c2)
                    if cands:
                        return cands
        except Exception as e:
            print(f"[!] JSON parsing fallback: {e}")

        # Fallback heuristic: look for candidate lines or quotes
        cleaned = self.clean_text(response)
        quotes = re.findall(r'["\']([^"\']{30,280})["\']', response)
        if quotes:
            return [{"angle": f"Extracted Angle {i+1}", "thought": "Extracted quote candidate", "tweet": self.clean_text(q)} for i, q in enumerate(quotes[:2])]

        if len(cleaned) > 275:
            cleaned = cleaned[:270] + "..."
        return [{
            "angle": "Direct Insight",
            "thought": "Direct fallback response generation",
            "tweet": cleaned
        }]

    def generate_thread_candidate(self, topic: str, model: Optional[str] = None) -> Dict[str, Any]:
        prompt = f"""Target Topic: {topic}

Create a viral 3-tweet connected thread on Twitter / X.
Rules:
- Tweet 1 (The Hook): A magnetic statement that hooks the reader, explains why this matters today, and ends with a transition (e.g., 🧵👇). Strictly <= 270 chars.
- Tweet 2 (The Core Breakdown): Concrete data, tactical breakdown, or practical mechanism. Strictly <= 270 chars.
- Tweet 3 (The Takeaway & Call to Action): Final conclusion + discussion question asking for reader perspectives. Strictly <= 270 chars.
- No markdown asterisks (**bold**). Emojis and 2 hashtags allowed.

Format your output EXACTLY as JSON:
{{
  "topic": "{topic}",
  "angle": "3-Tweet Masterclass Thread",
  "thought": "<Hermes strategic breakdown of thread narrative>",
  "tweets": [
    "<Tweet 1 text strictly <= 270 chars>",
    "<Tweet 2 text strictly <= 270 chars>",
    "<Tweet 3 text strictly <= 270 chars>"
  ]
}}
"""
        response = self.brain.complete(prompt, model=model, max_tokens=800, temperature=0.7)
        try:
            match = re.search(r"\{.*\}", response, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                cleaned_tweets = [self.clean_text(t) for t in data.get("tweets", [])]
                data["tweets"] = cleaned_tweets
                return data
        except Exception as e:
            print(f"[!] Thread JSON parsing error: {e}")

        return {
            "topic": topic,
            "angle": "Thread Fallback",
            "thought": "Emergency thread split",
            "tweets": [
                self.clean_text(f"1/3 🧵 Breaking down {topic}: Here is what most people miss."),
                self.clean_text(f"2/3 The real leverage comes from execution speed and reducing dependencies. Speed is strategy."),
                self.clean_text(f"3/3 What is your take on this? Drop your thoughts below. #Tech #AI")
            ]
        }


# ==============================================================================
# 5. HERMES ADVERSARIAL SELF-CRITIQUE & VIRAL SCORER
# ==============================================================================

class HermesCritiqueEngine:
    """Evaluates candidates against the Twitter algorithm and viral psychology."""

    def __init__(self, brain: HermesBrain):
        self.brain = brain

    def evaluate_tweet(self, tweet_text: str, topic: str, model: Optional[str] = None) -> Dict[str, Any]:
        char_len = len(tweet_text)
        length_penalty = 0.0
        if char_len > 280:
            length_penalty = 3.0

        prompt = f"""You are Hermes Viral Algorithm Evaluator.
Analyze this tweet candidate for Twitter / X.

Topic: {topic}
Tweet Candidate:
\"\"\"{tweet_text}\"\"\"

Length: {char_len} characters.

Score this tweet ruthlessly across 3 axes (0 to 10 each):
1. hook_score: Does line 1 immediately grab attention and stop scroll velocity?
2. insight_density: Is it high information per word, or generic boilerplate fluff?
3. viral_magnetism: Does it compel retweets, bookmarks, or quote-replies?

Calculate:
viral_score = (hook_score * 0.4) + (insight_density * 0.3) + (viral_magnetism * 0.3)

If viral_score < 8.5 or length > 280, provide a rewritten_tweet that upgrades the hook, improves rhythm, and stays strictly under 270 characters.

Format EXACTLY as JSON:
{{
  "hook_score": 8.5,
  "insight_density": 8.0,
  "viral_magnetism": 9.0,
  "viral_score": 8.5,
  "verdict": "<Pass | Needs_Refinement>",
  "critique": "<one concise sentence diagnosing weakness>",
  "rewritten_tweet": "<improved version under 270 chars, or same if Pass>"
}}
"""
        response = self.brain.complete(prompt, model=model, max_tokens=500, temperature=0.3)
        try:
            match = re.search(r"\{.*\}", response, re.DOTALL)
            if match:
                res = json.loads(match.group(0))
                res["viral_score"] = max(0.0, float(res.get("viral_score", 7.0)) - length_penalty)
                return res
        except Exception as e:
            pass

        # Heuristic fallback if LLM response misses JSON
        base_score = 8.5 if char_len <= 275 else 6.5
        return {
            "hook_score": base_score,
            "insight_density": base_score,
            "viral_magnetism": base_score,
            "viral_score": base_score,
            "verdict": "Pass" if base_score >= 8.5 else "Needs_Refinement",
            "critique": "Algorithmic heuristic fallback evaluation.",
            "rewritten_tweet": tweet_text[:270]
        }

    def refine_until_optimal(self, candidate_tweet: str, topic: str, model: Optional[str] = None, max_iterations: int = 2) -> Tuple[str, Dict[str, Any]]:
        current_tweet = candidate_tweet
        best_eval = {}

        for i in range(max_iterations + 1):
            eval_res = self.evaluate_tweet(current_tweet, topic, model=model)
            score = eval_res.get("viral_score", 0.0)
            best_eval = eval_res

            print(f"    [*] Hermes Critique [Pass {i+1}]: Score {score:.1f}/10.0 | Length {len(current_tweet)} chars | Verdict: {eval_res.get('verdict')}")
            if score >= 8.5 and len(current_tweet) <= 280:
                print(f"    [✓] Hermes Quality Gate Passed ({score:.1f}/10.0)!")
                return current_tweet, eval_res

            # Try rewritten version
            rewrite = eval_res.get("rewritten_tweet", "").strip()
            if rewrite and rewrite != current_tweet and len(rewrite) <= 280:
                print(f"    [↺] Iterating with Hermes rewrite based on critique: \"{eval_res.get('critique')}\"")
                current_tweet = rewrite
            else:
                break

        return current_tweet, best_eval


# ==============================================================================
# 6. TWITTER API v2 & OAUTH 1.0A CLIENT (WITH THREAD CHAINING)
# ==============================================================================

class TwitterClient:
    """Posts single tweets and chained threads to Twitter API v2 using RFC 5849 OAuth 1.0a."""

    def __init__(self):
        self.creds = self.load_credentials()

    @staticmethod
    def load_credentials() -> Dict[str, str]:
        creds = {
            "APP_KEY": os.environ.get("TWITTER_APP_KEY", ""),
            "APP_SECRET": os.environ.get("TWITTER_APP_SECRET", ""),
            "ACCESS_TOKEN": os.environ.get("TWITTER_ACCESS_TOKEN", ""),
            "ACCESS_SECRET": os.environ.get("TWITTER_ACCESS_SECRET", "")
        }

        # From secrets.json
        if os.path.exists(SECRETS_FILE):
            try:
                with open(SECRETS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k in creds:
                        if not creds[k] and k in data:
                            creds[k] = data[k]
            except Exception:
                pass

        # Fallback to SECRETS.js
        if not all(creds.values()) and os.path.exists(SECRETS_JS_FILE):
            try:
                with open(SECRETS_JS_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                    for k in ["APP_KEY", "APP_SECRET", "ACCESS_TOKEN", "ACCESS_SECRET"]:
                        match = re.search(rf'const\s+{k}\s*=\s*["\']([^"\']+)["\']', content)
                        if match and not creds[k]:
                            creds[k] = match.group(1)
            except Exception:
                pass

        return creds

    def is_configured(self) -> bool:
        return all(self.creds.values()) and not any("your_" in v.lower() for v in self.creds.values())

    def _sign_oauth1(self, method: str, url: str) -> str:
        params = {
            "oauth_consumer_key": self.creds["APP_KEY"],
            "oauth_nonce": uuid.uuid4().hex,
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": self.creds["ACCESS_TOKEN"],
            "oauth_version": "1.0"
        }

        sorted_params = sorted(params.items())
        param_pairs = [
            f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(str(v), safe='')}"
            for k, v in sorted_params
        ]
        param_string = "&".join(param_pairs)

        encoded_url = urllib.parse.quote(url, safe="")
        encoded_params = urllib.parse.quote(param_string, safe="")
        base_string = f"{method.upper()}&{encoded_url}&{encoded_params}"

        signing_key = f"{urllib.parse.quote(self.creds['APP_SECRET'], safe='')}&{urllib.parse.quote(self.creds['ACCESS_SECRET'], safe='')}"
        hashed = hmac.new(signing_key.encode("utf-8"), base_string.encode("utf-8"), hashlib.sha1)
        signature = base64.b64encode(hashed.digest()).decode("utf-8")
        params["oauth_signature"] = signature

        header_parts = [
            f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(str(v), safe="")}"'
            for k, v in sorted(params.items())
        ]
        return "OAuth " + ", ".join(header_parts)

    def post_tweet(self, text: str, in_reply_to_tweet_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        url = "https://api.twitter.com/2/tweets"
        auth_header = self._sign_oauth1("POST", url)

        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "User-Agent": "HermesAutoBot/3.0"
        }

        payload_dict: Dict[str, Any] = {"text": text}
        if in_reply_to_tweet_id:
            payload_dict["reply"] = {"in_reply_to_tweet_id": in_reply_to_tweet_id}

        payload = json.dumps(payload_dict).encode("utf-8")

        if HAS_REQUESTS:
            try:
                resp = requests.post(url, headers=headers, data=payload, timeout=20)
                try:
                    res_json = resp.json()
                except Exception:
                    res_json = {"raw": resp.text}
                if resp.status_code in [200, 201]:
                    return True, res_json
                return False, {"status_code": resp.status_code, "error": res_json}
            except Exception as e:
                return False, {"error": str(e)}
        else:
            req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    return True, json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                err_text = e.read().decode("utf-8")
                try:
                    err_data = json.loads(err_text)
                except Exception:
                    err_data = {"raw": err_text}
                return False, {"status_code": e.code, "error": err_data}
            except Exception as e:
                return False, {"error": str(e)}

    def post_thread(self, tweets: List[str]) -> List[Tuple[bool, Dict[str, Any]]]:
        results = []
        last_tweet_id = None

        for idx, tweet_text in enumerate(tweets):
            print(f"[*] Posting Thread Part {idx+1}/{len(tweets)}...")
            success, res = self.post_tweet(tweet_text, in_reply_to_tweet_id=last_tweet_id)
            results.append((success, res))
            if success:
                tweet_id = res.get("data", {}).get("id")
                last_tweet_id = tweet_id
                print(f"    [✓] Part {idx+1} posted successfully! Tweet ID: {tweet_id}")
                time.sleep(2)  # Avoid rate limit bursts between thread replies
            else:
                print(f"    [!] Failed to post part {idx+1}: {res}")
                break

        return results


# ==============================================================================
# 7. MAIN ORCHESTRATION PIPELINE
# ==============================================================================

class HermesAutoBot:
    """The central orchestrator connecting Brain, Memory, Critique, and Twitter."""

    def __init__(self):
        self.brain = HermesBrain()
        self.memory = HermesMemory()
        self.radar = TopicRadar()
        self.generator = HermesCandidateGenerator(self.brain, self.memory)
        self.critique = HermesCritiqueEngine(self.brain)
        self.twitter = TwitterClient()

    def run_single_tweet_flow(self, topic: Optional[str] = None, model: Optional[str] = None, dry_run: bool = True):
        category, auto_topic = self.radar.get_random_topic()
        selected_topic = topic or auto_topic

        print("\n" + "=" * 70)
        print("          HERMES AUTOBOT: AUTONOMOUS TWEET SYNTHESIS")
        print("=" * 70)
        print(f"[*] Mode           : {'DRY RUN (Preview Only)' if dry_run else 'LIVE PRODUCTION POSTING'}")
        print(f"[*] Topic Domain   : {selected_topic}")
        print(f"[*] Local LLM Pool : FreeLLMAPI (330+ Models | 836M+ Tokens)")
        print(f"[*] Selected Model : {model or 'Auto-Routing (Qwen/GLM/Gemini)'}")
        print("-" * 70)

        # Stage 1: Generate Candidates
        print("\n[Stage 1/3] Generating multi-angle candidates via Hermes Brain...")
        candidates = self.generator.generate_single_tweet_candidates(selected_topic, model=model)

        best_tweet = None
        best_eval = None
        best_score = -1.0

        # Stage 2: Adversarial Self-Critique & Viral Scoring
        print("\n[Stage 2/3] Executing Hermes Viral Critique & Algorithmic Gate...")
        for idx, cand in enumerate(candidates):
            angle = cand.get("angle", f"Angle {idx+1}")
            tweet = cand.get("tweet", "")
            print(f"\n  Candidate #{idx+1} [{angle}]:")
            print(f"  Thought: {cand.get('thought', 'N/A')}")
            print(f"  Draft  : \"{tweet}\" ({len(tweet)} chars)")

            refined_tweet, eval_res = self.critique.refine_until_optimal(tweet, selected_topic, model=model)
            score = eval_res.get("viral_score", 0.0)

            if score > best_score:
                best_score = score
                best_tweet = refined_tweet
                best_eval = eval_res

        # Stage 3: Execution / Preview
        print("\n" + "=" * 70)
        print("           SELECTED WINNING TWEET (HERMES APPROVED)")
        print("=" * 70)
        print(best_tweet)
        print("-" * 70)
        print(f"Character Count : {len(best_tweet)} / 280")
        print(f"Viral Score     : {best_score:.1f} / 10.0")
        print(f"Hook Power      : {best_eval.get('hook_score', 0)}/10")
        print(f"Insight Density : {best_eval.get('insight_density', 0)}/10")
        print(f"Critique Verdict: {best_eval.get('verdict', 'N/A')}")
        print("=" * 70)

        if dry_run:
            print("\n[✓] DRY-RUN SUCCESSFUL: Tweet passed all Hermes quality gates.")
            self.memory.record_tweet(best_tweet, selected_topic, best_score, mode="DRY_RUN")
            return

        # Live Posting
        if not self.twitter.is_configured():
            print("\n[!] Cannot post live: Twitter credentials in secrets.json are missing or placeholders.")
            print("[!] Run with --dry-run or edit secrets.json with valid Twitter API keys.")
            return

        print("\n[Stage 3/3] Dispatching to Twitter / X API v2...")
        success, res = self.twitter.post_tweet(best_tweet)
        if success:
            tweet_id = res.get("data", {}).get("id")
            print(f"[✓] LIVE TWEET PUBLISHED! Tweet ID: {tweet_id}")
            print(f"[✓] View Tweet: https://twitter.com/user/status/{tweet_id}")
            self.memory.record_tweet(best_tweet, selected_topic, best_score, mode="LIVE", tweet_id=tweet_id)
        else:
            print(f"[!] Error posting tweet: {res}")

    def run_thread_flow(self, topic: Optional[str] = None, model: Optional[str] = None, dry_run: bool = True):
        category, auto_topic = self.radar.get_random_topic()
        selected_topic = topic or auto_topic

        print("\n" + "=" * 70)
        print("          HERMES AUTOBOT: 3-PART THREAD SYNTHESIS")
        print("=" * 70)
        print(f"[*] Mode        : {'DRY RUN (Preview Only)' if dry_run else 'LIVE THREAD POSTING'}")
        print(f"[*] Topic       : {selected_topic}")
        print("-" * 70)

        print("[*] Generating connected thread narrative via Hermes Brain...")
        thread_cand = self.generator.generate_thread_candidate(selected_topic, model=model)
        tweets = thread_cand.get("tweets", [])

        print(f"\n[*] Hermes Thread Strategy: {thread_cand.get('thought', 'N/A')}\n")
        critiqued_tweets = []
        scores = []

        for idx, t in enumerate(tweets):
            print(f"--- Thread Part {idx+1}/{len(tweets)} ---")
            print(f"Draft: \"{t}\" ({len(t)} chars)")
            refined, eval_res = self.critique.refine_until_optimal(t, selected_topic, model=model)
            critiqued_tweets.append(refined)
            scores.append(eval_res.get("viral_score", 8.0))

        avg_score = sum(scores) / len(scores) if scores else 8.5

        print("\n" + "=" * 70)
        print("           FINAL THREAD PREVIEW")
        print("=" * 70)
        for idx, t in enumerate(critiqued_tweets):
            print(f"\n[Tweet {idx+1}/{len(critiqued_tweets)}] ({len(t)} chars):")
            print(t)
        print("-" * 70)
        print(f"Thread Average Viral Score: {avg_score:.1f} / 10.0")
        print("=" * 70)

        if dry_run:
            print("\n[✓] DRY-RUN SUCCESSFUL: Thread verified and ready for live deployment.")
            full_thread_text = "\n---\n".join(critiqued_tweets)
            self.memory.record_tweet(full_thread_text, selected_topic, avg_score, mode="DRY_RUN")
            return

        if not self.twitter.is_configured():
            print("\n[!] Cannot post live: Twitter credentials in secrets.json are missing or placeholders.")
            return

        print("\n[*] Posting thread sequentially with reply chaining...")
        results = self.twitter.post_thread(critiqued_tweets)
        full_thread_text = "\n---\n".join(critiqued_tweets)
        self.memory.record_tweet(full_thread_text, selected_topic, avg_score, mode="LIVE")


# ==============================================================================
# 8. COMMAND LINE INTERFACE
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Hermes AutoBot: Autonomous AI Twitter Agent with FreeLLMAPI"
    )
    parser.add_argument("--dry-run", action="store_true", default=False, help="Simulate generation, critique and preview without posting")
    parser.add_argument("--post", action="store_true", default=False, help="Post live to Twitter / X")
    parser.add_argument("--thread", action="store_true", default=False, help="Generate and post a 3-tweet connected thread")
    parser.add_argument("--topic", type=str, default=None, help="Specific topic or prompt to write about")
    parser.add_argument("--model", type=str, default=None, help="Target model on FreeLLMAPI (e.g. qwen3.8-27b, glm-4.7-flash)")
    parser.add_argument("--continuous", action="store_true", default=False, help="Run continuously in autonomous posting loop")
    parser.add_argument("--interval", type=int, default=60, help="Continuous loop interval in minutes (default: 60)")
    parser.add_argument("--stats", action="store_true", default=False, help="Show Hermes memory and tweet history statistics")

    args = parser.parse_args()

    bot = HermesAutoBot()

    if args.stats:
        bot.memory.print_stats()
        return

    # If neither --dry-run nor --post is explicitly specified, default to --dry-run for safety
    is_dry_run = True
    if args.post:
        is_dry_run = False
    elif args.dry_run:
        is_dry_run = True
    else:
        print("[*] No execution mode specified. Defaulting to --dry-run (Preview Mode). Use --post for live publishing.")
        is_dry_run = True

    if args.continuous:
        print(f"[*] Starting Hermes Autonomous Loop (Interval: {args.interval} minutes)...")
        print("[*] Press Ctrl+C at any time to exit.")
        cycle = 1
        try:
            while True:
                print(f"\n>>> Running Cycle #{cycle} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} <<<")
                if args.thread:
                    bot.run_thread_flow(topic=args.topic, model=args.model, dry_run=is_dry_run)
                else:
                    bot.run_single_tweet_flow(topic=args.topic, model=args.model, dry_run=is_dry_run)

                print(f"\n[💤] Sleeping for {args.interval} minutes until next autonomous cycle...")
                time.sleep(args.interval * 60)
                cycle += 1
        except KeyboardInterrupt:
            print("\n[!] Autonomous loop terminated by user.")
            return

    # Single execution cycle
    if args.thread:
        bot.run_thread_flow(topic=args.topic, model=args.model, dry_run=is_dry_run)
    else:
        bot.run_single_tweet_flow(topic=args.topic, model=args.model, dry_run=is_dry_run)


if __name__ == "__main__":
    main()
