"""
tts_synthesizer.py — Studio Neural Voiceover & Subtitle Generator
Uses Microsoft Edge TTS with automatic voice fallback and SRT timestamp export.
"""

import sys
import os
import asyncio
import re

try:
    import edge_tts
except ImportError:
    print("Error: edge_tts is not installed. Please install it using: pip install edge-tts")
    sys.exit(1)

FALLBACK_VOICES = [
    "en-US-GuyNeural",
    "en-US-ChristopherNeural",
    "en-US-AriaNeural",
    "en-US-EricNeural",
    "en-US-JennyNeural"
]

def format_srt_time(ms):
    hours = int(ms // 3600000)
    minutes = int((ms % 3600000) // 60000)
    seconds = int((ms % 60000) // 1000)
    millis = int(ms % 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"

def format_ass_time(ms):
    hours = int(ms // 3600000)
    minutes = int((ms % 3600000) // 60000)
    seconds = int((ms % 60000) // 1000)
    centis = int((ms % 1000) // 10)
    return f"{hours:01d}:{minutes:02d}:{seconds:02d}.{centis:02d}"

async def synthesize_speech(text, audio_out_path, srt_out_path=None, ass_out_path=None, preferred_voice="en-US-GuyNeural"):
    # Ensure parent directory exists
    os.makedirs(os.path.dirname(os.path.abspath(audio_out_path)), exist_ok=True)
    
    # Try voices in priority order
    voices_to_try = [preferred_voice] + [v for v in FALLBACK_VOICES if v != preferred_voice]
    
    last_err = None
    for voice in voices_to_try:
        try:
            communicate = edge_tts.Communicate(text, voice, rate="+2%", pitch="+0Hz")
            submaker = edge_tts.SubMaker()
            
            with open(audio_out_path, "wb") as f:
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] in ("SentenceBoundary", "WordBoundary"):
                        submaker.feed(chunk)
            
            srt_content = submaker.get_srt()
            
            if srt_out_path:
                with open(srt_out_path, "w", encoding="utf-8") as f:
                    f.write(srt_content)
            
            # Generate Kinetic ASS Subtitles if requested
            if ass_out_path:
                generate_kinetic_ass(srt_content, ass_out_path)
                
            return {
                "success": True,
                "voice": voice,
                "audioPath": audio_out_path,
                "srtPath": srt_out_path,
                "assPath": ass_out_path
            }
        except Exception as e:
            last_err = e
            continue
            
    return {
        "success": False,
        "error": str(last_err)
    }

def generate_kinetic_ass(srt_text, ass_path):
    """
    Transforms SRT into broadcast-grade kinetic karaoke .ass subtitles
    Strictly within 9:16 safe zone (MarginV: 400).
    """
    ass_header = """[Script Info]
Title: Super Reel Kinetic Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,52,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,4.5,2,2,80,80,320,1
Style: Highlight,Arial Black,56,&H0000FFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,105,105,1,0,1,5.0,2,2,80,80,320,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    
    # Simple regex parser for SRT blocks
    blocks = re.split(r'\n\s*\n', srt_text.strip())
    for block in blocks:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if len(lines) >= 3:
            time_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', lines[1])
            if time_match:
                start_srt, end_srt = time_match.groups()
                
                # Convert SRT time to ASS time
                def srt_to_ass(st):
                    h, m, rest = st.split(':')
                    s, ms = rest.split(',')
                    return f"{int(h):d}:{m}:{s}.{int(ms)//10:02d}"
                
                start_ass = srt_to_ass(start_srt)
                end_ass = srt_to_ass(end_srt)
                caption = " ".join(lines[2:])
                
                # Highlight important words in neon yellow
                words = caption.split()
                if len(words) <= 3:
                    # Short punchy phrase -> highlight all
                    formatted = r"{\c&H0000FFFF\b1}" + caption.upper() + r"{\r}"
                else:
                    # Emphasize middle/key words
                    mid = len(words) // 2
                    formatted_words = []
                    for i, w in enumerate(words):
                        if i == mid or len(w) > 6:
                            formatted_words.append(r"{\c&H0000FFFF}" + w.upper() + r"{\c&H00FFFFFF}")
                        else:
                            formatted_words.append(w.upper())
                    formatted = " ".join(formatted_words)
                
                events.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{formatted}")

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_header + "\n".join(events) + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python tts_synthesizer.py <text> <audio_out_path> [srt_out_path] [ass_out_path]")
        sys.exit(1)
        
    text_input = sys.argv[1]
    audio_path = sys.argv[2]
    srt_path = sys.argv[3] if len(sys.argv) > 3 else None
    ass_path = sys.argv[4] if len(sys.argv) > 4 else None
    
    result = asyncio.run(synthesize_speech(text_input, audio_path, srt_path, ass_path))
    import json
    print(json.dumps(result))
