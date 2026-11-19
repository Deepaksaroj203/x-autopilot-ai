// super_beat_sheet.js — Unified Beat-Sheet Compiler for Viral YouTube Shorts & Reels
// Compiles 1.5s–2.5s visual beats, assigns multi-engine visual layers, frame-locked SFX, and 9:16 safe zones.

const fs = require("fs");
const path = require("path");

const ENGINES = {
  WAN2GP: "wan2gp_ai_video",          // Photorealistic cinematic AI footage (Wan2.1 GGUF / low-VRAM)
  HYPERFRAMES: "hyperframes_motion",  // Declarative 60fps HTML/CSS/WebGL UI cards & kinetic text
  ONETAKE: "onetake_glide",            // Smooth continuous single-take camera glide
  VOX_COLLAGE: "vox_collage_broll",   // Vox/Kurzgesagt halftone cutouts, torn paper, highlighter sweeps
  CLAUDE_BASE: "claude_animation_base"// Remotion + GSAP spring physics & transparent Manim diagrams
};

const SFX_LIBRARY = {
  HOOK_RISER: "sfx_riser_subtle_whoosh.wav",
  IMPACT_SLAM: "sfx_sub_bass_heavy_slam.wav",
  PAPER_FLIP: "sfx_documentary_paper_rustle.wav",
  HIGHLIGHTER: "sfx_marker_scratch_sweep.wav",
  POP_TICK: "sfx_ui_pop_bubble_tick.wav",
  CAMERA_SHUTTER: "sfx_flash_cut_shutter.wav",
  WHOOSH_PAN: "sfx_whip_pan_fast_whoosh.wav",
  COUNTDOWN_TICK: "sfx_precision_timer_tick.wav"
};

/**
 * Builds a viral beat sheet dividing a 30-60s Short into 1.5–2.5s beats.
 * @param {Object} opts
 * @param {string} opts.topic - Video concept or headline
 * @param {string} [opts.genre='facts_finance'] - kids_story | funny_comedy | facts_finance | tech_explainer
 * @param {number} [opts.durationSec=40] - Total video length (30-60s)
 * @param {string} [opts.scriptText] - Optional pre-written narration script
 */
function compileBeatSheet({ topic, genre = "facts_finance", durationSec = 40, scriptText = null }) {
  const beats = [];
  const beatCadence = 2.0; // 2.0 seconds per visual beat
  const totalBeats = Math.floor(durationSec / beatCadence);

  // Hook Beat (0.0s - 2.5s) — Crucial Retention Window
  beats.push({
    beat_index: 1,
    time_range: "0.0s–2.5s",
    start_sec: 0.0,
    end_sec: 2.5,
    spoken_line: scriptText ? extractSpokenLine(scriptText, 0, 1) : `Stop scrolling! This single detail about ${topic} changes everything you thought you knew.`,
    visual_engine: ENGINES.VOX_COLLAGE,
    activated_skills: ["yt-outliers", "yt-vox", "motion-foundations"],
    animations_and_fx: {
      camera: "Fast Ken Burns Push-in (1.00x -> 1.15x)",
      effect: "Halftone subject cutout with white scissor border on torn paper background + Animated Highlighter Sweep",
      transition_out: "3-frame Light Leak Flash Cut"
    },
    sfx_and_audio: {
      cue: SFX_LIBRARY.HOOK_RISER,
      timing_offset_sec: 0.0,
      music_duck_db: -22,
      impact_sfx: SFX_LIBRARY.CAMERA_SHUTTER
    },
    safe_zone: {
      x_min: 60,
      x_max: 900,
      y_min: 260,
      y_max: 1480
    }
  });

  // Beat 2 (2.5s - 5.0s) — Problem / Discovery Reveal
  beats.push({
    beat_index: 2,
    time_range: "2.5s–5.0s",
    start_sec: 2.5,
    end_sec: 5.0,
    spoken_line: scriptText ? extractSpokenLine(scriptText, 1, 2) : "Most people assume the obvious answer, but the actual data tells a completely different story.",
    visual_engine: ENGINES.CLAUDE_BASE,
    activated_skills: ["remotion-motion-graphics", "manim-skill", "motion-patterns"],
    animations_and_fx: {
      camera: "Static with 6-frame damped camera shake on landing frame",
      effect: "Spring-physics animated UI card ({ stiffness: 320, damping: 24 }) + Transparent Manim curved trend graph",
      transition_out: "Whip-pan blur (6 frames)"
    },
    sfx_and_audio: {
      cue: SFX_LIBRARY.IMPACT_SLAM,
      timing_offset_sec: 0.4,
      music_duck_db: -20,
      impact_sfx: SFX_LIBRARY.POP_TICK
    },
    safe_zone: { x_min: 60, x_max: 900, y_min: 260, y_max: 1480 }
  });

  // Beat 3 (5.0s - 7.5s) — Deep In-Scene Cinematic World
  beats.push({
    beat_index: 3,
    time_range: "5.0s–7.5s",
    start_sec: 5.0,
    end_sec: 7.5,
    spoken_line: scriptText ? extractSpokenLine(scriptText, 2, 3) : "When we examine how this operates in the real world, the hidden mechanics become undeniable.",
    visual_engine: ENGINES.WAN2GP,
    activated_skills: ["ai-video-gen", "one-shot-video", "cinematic-film"],
    animations_and_fx: {
      camera: "Continuous smooth one-take tracking shot, 1080x1920 60fps vertical full-bleed",
      effect: "Photorealistic AI video scene (Wan2.1 / Wan2GP prompt), 3% animated 35mm film grain, cinema teal-orange grade",
      transition_out: "Smooth crossfade (8 frames)"
    },
    sfx_and_audio: {
      cue: SFX_LIBRARY.WHOOSH_PAN,
      timing_offset_sec: 0.0,
      music_duck_db: -18,
      impact_sfx: null
    },
    safe_zone: { x_min: 60, x_max: 900, y_min: 260, y_max: 1480 }
  });

  // Beat 4 (7.5s - 10.0s) — Multi-Panel Split Screen & Evidence Board
  beats.push({
    beat_index: 4,
    time_range: "7.5s–10.0s",
    start_sec: 7.5,
    end_sec: 10.0,
    spoken_line: scriptText ? extractSpokenLine(scriptText, 3, 4) : "Notice how these three crucial factors align directly with the statutory guidelines.",
    visual_engine: ENGINES.VOX_COLLAGE,
    activated_skills: ["yt-broll", "yt-vox", "papermorph"],
    animations_and_fx: {
      camera: "Slow directional drift (-15px pan)",
      effect: "3-panel dynamic collage grid + Animated red pushpin lines + Rolling number counter",
      transition_out: "Masked wipe"
    },
    sfx_and_audio: {
      cue: SFX_LIBRARY.PAPER_FLIP,
      timing_offset_sec: 0.2,
      music_duck_db: -20,
      impact_sfx: SFX_LIBRARY.HIGHLIGHTER
    },
    safe_zone: { x_min: 60, x_max: 900, y_min: 260, y_max: 1480 }
  });

  // Additional Intermediate Story Beats (10s to duration - 4s)
  let currentSec = 10.0;
  let beatCounter = 5;
  while (currentSec < durationSec - 4.0) {
    const nextSec = Math.min(currentSec + 2.5, durationSec - 4.0);
    const enginePick = [ENGINES.HYPERFRAMES, ENGINES.WAN2GP, ENGINES.VOX_COLLAGE, ENGINES.CLAUDE_BASE][beatCounter % 4];
    
    beats.push({
      beat_index: beatCounter,
      time_range: `${currentSec.toFixed(1)}s–${nextSec.toFixed(1)}s`,
      start_sec: currentSec,
      end_sec: nextSec,
      spoken_line: scriptText ? extractSpokenLine(scriptText, beatCounter - 1, beatCounter) : `Key step ${beatCounter - 4}: Ensure all verification checks and digital ledgers match precisely before taking action.`,
      visual_engine: enginePick,
      activated_skills: ["motion-patterns", "remotion-captions", "audio-mix-maker"],
      animations_and_fx: {
        camera: "4K Punch-in jump cut (1.00x -> 1.12x on emphasis)",
        effect: "Word-by-word kinetic subtitle pop ({ scale: 1.15 }) + Drop shadow contrast pill",
        transition_out: "Chromatic aberration burst (4 frames)"
      },
      sfx_and_audio: {
        cue: SFX_LIBRARY.POP_TICK,
        timing_offset_sec: 0.1,
        music_duck_db: -20,
        impact_sfx: null
      },
      safe_zone: { x_min: 60, x_max: 900, y_min: 260, y_max: 1480 }
    });

    currentSec = nextSec;
    beatCounter++;
  }

  // Mandatory Stage 6 Anti-Abrupt Ending: Outro / Seamless Loop CTA Beat (Last 3.5s - 4.5s)
  beats.push({
    beat_index: beatCounter,
    time_range: `${currentSec.toFixed(1)}s–${durationSec.toFixed(1)}s`,
    start_sec: currentSec,
    end_sec: durationSec,
    spoken_line: scriptText ? extractSpokenLine(scriptText, beatCounter - 1, beatCounter) : "Follow for daily high-impact breakdowns, and save this guide so you never miss a compliance deadline.",
    visual_engine: ENGINES.HYPERFRAMES,
    activated_skills: ["motion-video-director", "video-director", "audio-mix-maker"],
    animations_and_fx: {
      camera: "Gentle ease-out zoom",
      effect: "Brand lower-third banner + Floating save/share icons + 0.7s graceful visual fade to dark / seamless loop cut",
      transition_out: "End of video"
    },
    sfx_and_audio: {
      cue: SFX_LIBRARY.POP_TICK,
      timing_offset_sec: 0.2,
      music_duck_db: -14,
      audio_fade_out_tail_sec: 1.8, // Mandatory 1.8s smooth audio fade-out tail
      impact_sfx: null
    },
    safe_zone: { x_min: 60, x_max: 900, y_min: 260, y_max: 1480 }
  });

  return {
    meta: {
      topic,
      genre,
      duration_sec: durationSec,
      total_beats: beats.length,
      aspect_ratio: "9:16",
      resolution: "1080x1920",
      target_framerate: 60,
      target_loudness_lufs: -14.0,
      true_peak_dbtp: -1.0,
      audio_master_profile: "Studio Warm Vocal Chain (85Hz HP, 175Hz Body, -2.4dB De-harsh, 6.5kHz Air, 3:1 Comp)",
      safe_zone_standard: "Strict 9:16 Safe Zones (x: 60..900, y: 260..1480)"
    },
    beats
  };
}

function extractSpokenLine(fullScript, index, nextIndex) {
  const sentences = fullScript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences[index]) return sentences[index] + ".";
  return sentences[sentences.length - 1] || "";
}

module.exports = {
  compileBeatSheet,
  ENGINES,
  SFX_LIBRARY
};
