#!/usr/bin/env node
/**
 * Satya Barta — Content Generation Script
 * 
 * Calls HuggingFace Inference API to generate all AI content sections:
 * - Home (front page news)
 * - Mirror Test (media narrative comparison)
 * - Hot Take (impact cards)
 * - FAQ (pre-generated answers)
 * 
 * Output: data/content.json
 * 
 * Usage:
 *   HF_TOKEN=hf_xxx node scripts/generate-content.js
 * 
 * The script is designed to be run by GitHub Actions 3x daily.
 * If generation fails, the previous content.json is preserved (never publishes empty).
 */

const fs = require('fs');
const path = require('path');

const HF_TOKEN = process.env.HF_TOKEN;
const API_URL = 'https://router.huggingface.co/v1/chat/completions';
const MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'content.json');

if (!HF_TOKEN) {
  console.error('ERROR: HF_TOKEN environment variable is required.');
  process.exit(1);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function getDateStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

function getEditionNumber() {
  const start = new Date('2025-01-01');
  return Math.floor((Date.now() - start.getTime()) / 86400000);
}

function getNextUpdate() {
  const now = new Date();
  // Schedule: 6 AM, 12 PM, 6 PM IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const hours = istNow.getUTCHours();
  
  let nextHourIST;
  if (hours < 6) nextHourIST = 6;
  else if (hours < 12) nextHourIST = 12;
  else if (hours < 18) nextHourIST = 18;
  else nextHourIST = 30; // 6 AM next day
  
  const nextIST = new Date(istNow);
  nextIST.setUTCHours(nextHourIST % 24, 0, 0, 0);
  if (nextHourIST >= 24) nextIST.setUTCDate(nextIST.getUTCDate() + 1);
  
  return new Date(nextIST.getTime() - istOffset).toISOString();
}

async function callHF(messages, maxTokens = 2000, temperature = 0.7) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`  HTTP ${res.status}: ${errBody}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 5000 * attempt));
          continue;
        }
        return null;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        console.error('  Empty response from model');
        continue;
      }
      return text;
    } catch (e) {
      console.error(`  Fetch error: ${e.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 5000 * attempt));
      }
    }
  }
  return null;
}

function parseJSON(text) {
  try {
    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    // Try to find JSON object in the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    console.error('  JSON parse failed:', e.message);
    return null;
  }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function homePrompt(dateStr) {
  return [
    { role: 'system', content: 'You are a senior journalist for Satya Barta, an independent West Bengal news platform. You respond ONLY in valid JSON with no markdown formatting, no backticks, no explanation text.' },
    { role: 'user', content: `Today is ${dateStr}. Generate today's front page news briefing for West Bengal.

STRICT RULES:
1. Only cover West Bengal — politics, economy, environment, labor, education, health, infrastructure.
2. Cite credible sources: The Wire, The Quint, NDTV, Scroll.in, The Hindu, India Spend, Article 14, The Caravan, FactChecker.in, Economic Times, or official portals (mospi.gov.in, rbi.org.in, data.gov.in).
3. Do NOT speculate or fabricate quotes. Mark uncertain info [UNVERIFIED].
4. Status must be CONFIRMED, DEVELOPING, or UNVERIFIED.
5. Prioritize stories affecting workers, farmers, students, healthcare, infrastructure over political gossip.
6. No editorializing — facts and their implications only.

Respond ONLY in valid JSON:
{"hero":{"headline":"string","subheadline":"string","summary":"string (120-160 words)","status":"CONFIRMED|DEVELOPING|UNVERIFIED","sources":["string"],"impact":"string (30 words)","unknowns":"string (20 words)"},"stories":[{"headline":"string","summary":"string (50-70 words)","status":"CONFIRMED|DEVELOPING|UNVERIFIED","source":"string","category":"Politics|Economy|Environment|Health|Education|Infrastructure|Culture|Labor"}],"ticker":["headline1","headline2","headline3","headline4","headline5","headline6","headline7","headline8"]}

Generate 4 stories. Make them realistic and grounded.` }
  ];
}

function contrastPrompt(dateStr) {
  return [
    { role: 'system', content: 'You are a fact-checking editor for Satya Barta. You respond ONLY in valid JSON with no markdown formatting, no backticks.' },
    { role: 'user', content: `Today is ${dateStr}. Identify 3 West Bengal news stories from the recent past where there is a documented or likely difference between how state-aligned/mainstream media covered it versus how independent fact-checking media reported it.

STATE-ALIGNED (treat critically): Zee News, Republic TV, ABP Ananda (political coverage), News18 Bangla
INDEPENDENT (use as primary): The Wire, The Quint, Scroll.in, Article 14, India Spend, FactChecker.in, Alt News, BOOM

RULES:
1. Use "reportedly" or "according to [source]" — never fabricate direct quotes.
2. If no verified contradiction exists, note the omission of context instead.
3. Data checks must cite official sources (census, RBI, CAG, MOSPI, NFHS).
4. Remain non-partisan — critique all media equally.

Respond ONLY in valid JSON:
{"stories":[{"topic":"string","state_narrative":{"headline":"string","summary":"string (60-80 words)","sources":["string"],"claims_made":["string","string"]},"verified_record":{"headline":"string","summary":"string (60-80 words)","sources":["string"],"what_was_omitted":["string","string"],"data_check":"string"},"gap_analysis":{"discrepancy_level":"None|Minor|Significant|Contradictory","verdict":"Accurate|Partially Accurate|Misleading|False","key_gap":"string (one sentence)","missing_context":"string"}}]}` }
  ];
}

function hotTakePrompt(dateStr) {
  return [
    { role: 'system', content: 'You are a plainspoken journalist writing for working-class readers in West Bengal. You respond ONLY in valid JSON with no markdown formatting, no backticks.' },
    { role: 'user', content: `Today is ${dateStr}. Generate 6 "Hot Take" news cards covering West Bengal. Each card:
1. Covers a story DIRECTLY affecting daily life in West Bengal.
2. Has a headline that is factually urgent, not clickbait (max 12 words).
3. Has exactly 3 bullets: key fact, data point, "what this means for you."
4. Cites a credible independent source.
5. Prioritizes: jobs, food prices, healthcare, schools, power cuts, water, transport, wages, farming, environment, corruption.
6. Written simply — Class 10 reading level.
7. Marked CONFIRMED, DEVELOPING, or UNVERIFIED.

Respond ONLY in valid JSON:
{"cards":[{"category":"Politics|Economy|Environment|Health|Education|Labor|Infrastructure","headline":"string","bullets":["string","string","string"],"source":"string","status":"CONFIRMED|DEVELOPING|UNVERIFIED","impact_score":1}]}

Generate exactly 6 cards. Sort by impact_score descending (10=most impactful).` }
  ];
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dateStr = getDateStr();
  console.log(`\n═══ SATYA BARTA CONTENT GENERATION ═══`);
  console.log(`Date: ${dateStr}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  // Load existing content as fallback
  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
  } catch {}

  // Load existing FAQ (we preserve FAQ from existing content since it's curated)
  const existingFaq = existing?.faq || [];

  const results = {};

  // Generate Home
  console.log('📰 Generating Home content...');
  const homeRaw = await callHF(homePrompt(dateStr), 2000);
  if (homeRaw) {
    const homeData = parseJSON(homeRaw);
    if (homeData) {
      results.home = homeData;
      console.log('  ✓ Home generated successfully');
    } else {
      console.log('  ✗ Home parse failed — using previous content');
      results.home = existing?.home;
    }
  } else {
    console.log('  ✗ Home API call failed — using previous content');
    results.home = existing?.home;
  }

  // Generate Contrast / Mirror Test
  console.log('🔍 Generating Mirror Test content...');
  const contrastRaw = await callHF(contrastPrompt(dateStr), 2500);
  if (contrastRaw) {
    const contrastData = parseJSON(contrastRaw);
    if (contrastData) {
      results.contrast = contrastData;
      console.log('  ✓ Mirror Test generated successfully');
    } else {
      console.log('  ✗ Mirror Test parse failed — using previous content');
      results.contrast = existing?.contrast;
    }
  } else {
    console.log('  ✗ Mirror Test API call failed — using previous content');
    results.contrast = existing?.contrast;
  }

  // Generate Hot Take
  console.log('🔥 Generating Hot Take content...');
  const htRaw = await callHF(hotTakePrompt(dateStr), 1500);
  if (htRaw) {
    const htData = parseJSON(htRaw);
    if (htData) {
      results.hottake = htData;
      console.log('  ✓ Hot Take generated successfully');
    } else {
      console.log('  ✗ Hot Take parse failed — using previous content');
      results.hottake = existing?.hottake;
    }
  } else {
    console.log('  ✗ Hot Take API call failed — using previous content');
    results.hottake = existing?.hottake;
  }

  // Validate we have at least some content
  if (!results.home && !results.contrast && !results.hottake) {
    console.error('\n✗ ALL sections failed. Preserving existing content.json unchanged.');
    process.exit(1);
  }

  // Build final output
  const output = {
    generated_at: new Date().toISOString(),
    model: MODEL,
    edition: getEditionNumber(),
    next_update: getNextUpdate(),
    home: results.home || existing?.home,
    contrast: results.contrast || existing?.contrast,
    hottake: results.hottake || existing?.hottake,
    faq: existingFaq
  };

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n═══ GENERATION COMPLETE ═══`);
  console.log(`Edition: ${output.edition}`);
  console.log(`Next update: ${output.next_update}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB\n`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
