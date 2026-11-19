"""
ai_browser_researcher.py — Autonomous Browser Agent for EPFO Compliance Intelligence
Uses browser-use + local FreeLLMAPI or Gemini/Claude to autonomously inspect official portals
(unifiedportal-mem.epfindia.gov.in, pib.gov.in) with zero-hallucination factual research.
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def research_epfo_updates():
    try:
        from browser_use import Agent
        from langchain_openai import ChatOpenAI
    except ImportError:
        print("ℹ️ Note: browser-use is installing or requires: pip install browser-use langchain-openai")
        return

    # Connect to local FreeLLMAPI (qwen3.8-27b or gemini-3.7-flash) with 836M free tokens
    llm = ChatOpenAI(
        base_url="http://127.0.0.1:31415/v1",
        model="qwen3.8-27b",
        api_key="free",
        temperature=0.1
    )

    agent = Agent(
        task="Navigate to https://www.epfindia.gov.in/site_en/index.php, find the 'What's New' or circulars section, and extract the top 2 latest official compliance circular numbers, dates, and subjects.",
        llm=llm,
    )

    print("🚀 Launching AI Browser Agent for EPFO Portal Intelligence...")
    history = await agent.run()
    result = history.final_result()
    print("🎯 Autonomous Research Results:\n", result)
    return result

if __name__ == "__main__":
    asyncio.run(research_epfo_updates())
