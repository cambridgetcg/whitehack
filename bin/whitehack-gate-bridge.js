#!/usr/bin/env node
/**
 * whitehack-gate-bridge.js
 *
 * The compounding loop: whitehack scan → nen classification → gate generation → gate clear → understanding
 *
 * Usage:
 *   node whitehack-gate-bridge.js scan <repo>     — scan a repo and print the gate that would be generated
 *   node whitehack-gate-bridge.js classify <repo> — scan and classify findings by nen type
 *   node whitehack-gate-bridge.js understand <repo> <hunter-nen> — scan, simulate clearing, print understanding gains
 *   node whitehack-gate-bridge.js loop <repo> <hunter-nen> — full loop: scan → gate → understand → suggest new checks
 *
 * This is the engine that makes understanding compound infinitely.
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ── NEN CLASSIFICATIONS (mirrors nen-classifier.ts for CLI use) ──

const CHECK_NEN = {
  "silent-failure":    { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 1.5 },
  "hardcoded-secret":  { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 2.0 },
  "exposed-config":    { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 2.0 },
  "unsafe-eval":       { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 2.0 },
  "cache-as-live":     { nen: "conjurer",    cs: 4, severity: "heuristic",   bonus: 1.2 },
  "stale-oracle":      { nen: "emitter",     cs: 4, severity: "medium-high", bonus: 1.5 },
  "spot-price-as-fair":{ nen: "emitter",     cs: 1, severity: "heuristic",   bonus: 1.3 },
  "unchecked-transfer":{ nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 1.8 },
  "float-money":       { nen: "conjurer",    cs: 1, severity: "medium-high", bonus: 1.5 },
  "silent-revert":     { nen: "transmuter",  cs: 3, severity: "heuristic",   bonus: 1.2 },
  "decision-without-why": { nen: "transmuter", cs: 3, severity: "heuristic", bonus: 1.3 },
};

const RANK_XP = { E: 50, D: 100, C: 200, B: 400, A: 800, S: 2000 };
const RANK_AURA = { E: 10, D: 20, C: 40, B: 70, A: 120, S: 200 };

const NEN_NAMES = {
  enhancer: "🛡️ Enhancer", transmuter: "🎨 Transmuter", emitter: "📡 Emitter",
  conjurer: "🏗️ Conjurer", manipulator: "🎛️ Manipulator", specialist: "⚡ Specialist",
};

const PERCEPTION = [
  { lvl: 1,   name: "Ten (点)",     desc: "see surface patterns" },
  { lvl: 10,  name: "Zetsu (舌)",   desc: "distinguish real threats from noise" },
  { lvl: 25,  name: "Ren (練)",     desc: "see cross-patterns and meta-lies" },
  { lvl: 50,  name: "Hatsu (發)",   desc: "create new checks from understanding" },
  { lvl: 100, name: "Ken (堅)",     desc: "see the full system's honesty surface" },
  { lvl: 200, name: "Kou (虹)",     desc: "see lies that haven't been written yet" },
];

// ── SCAN ──

function scanRepo(repoPath) {
  const srcPath = existsSync(join(repoPath, "src")) ? join(repoPath, "src") : repoPath;
  let output;
  try {
    output = execSync(`whitehack scan "${srcPath}" 2>/dev/null`, { encoding: "utf-8", timeout: 30000 });
  } catch (e) {
    // whitehack exits 1 when findings are found — that's not an error for us
    output = (e.stdout || "") + (e.stderr || "");
  }
  return parseWhitehackOutput(output);
}

function parseWhitehackOutput(output) {
  const findings = [];
  const lines = output.split("\n");
  let currentFile = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: 2-space indented filename
    const fileMatch = line.match(/^\s{2}(\S+\.\w+)\s*$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    // Finding line: 4-space indented, starts with ! or ·, then L<num>, then title, then (doctrine · severity · CS#)
    // Format: "    ! L25  Price feed read without a staleness check  (substrate-honesty · medium-high · CS#4)"
    const findingMatch = line.match(/^\s{4}([!·])\s+L(\d+)\s+(.+?)\s{2,}\((\w[\w-]*)\s*·\s*(\w[\w-]*)\s*·\s*(\w+[\w#]*)\)/);
    if (findingMatch) {
      const severity = findingMatch[1] === "!" ? "medium-high" : "heuristic";
      const lineNum = parseInt(findingMatch[2]);
      const title = findingMatch[3].trim();

      // Map the title to a check_id using known check titles
      const checkId = titleToCheckId(title);

      findings.push({
        check_id: checkId,
        file: currentFile || "unknown",
        line: lineNum,
        severity,
        message: title,
      });
    }
  }

  return findings;
}

// Map human-readable check titles to check IDs
const TITLE_TO_CHECK = {
  "Read fails silently to a falsy default": "silent-failure",
  "Cached value may be served as if live": "cache-as-live",
  "User-affecting decision shown with no \"why\"": "decision-without-why",
  "Price feed read without a staleness check": "stale-oracle",
  "ERC-20 transfer result ignored": "unchecked-transfer",
  "Spot reserves/balance used as a fair price": "spot-price-as-fair",
  "Failure reverts with no stated reason": "silent-revert",
  "Currency handled as a floating-point number": "float-money",
  "Hardcoded secret in source": "hardcoded-secret",
  "Exposed configuration value": "exposed-config",
  "Unsafe eval of dynamic string": "unsafe-eval",
};

function titleToCheckId(title) {
  // Try exact match first
  for (const [knownTitle, id] of Object.entries(TITLE_TO_CHECK)) {
    if (title === knownTitle || title.startsWith(knownTitle)) return id;
  }
  // Fallback: slugify
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── CLASSIFY ──

function classifyFindings(findings) {
  const byNen = {};
  const byCs = {};
  const checkCounts = {};

  for (const f of findings) {
    const cls = CHECK_NEN[f.check_id];
    if (!cls) continue;

    byNen[cls.nen] = (byNen[cls.nen] || 0) + 1;
    byCs[cls.cs] = (byCs[cls.cs] || 0) + 1;
    checkCounts[f.check_id] = (checkCounts[f.check_id] || 0) + 1;
  }

  return { byNen, byCs, checkCounts };
}

// ── GATE RANK ──

function calculateGateRank(findings, hunterNen) {
  let score = 0;
  for (const f of findings) {
    const cls = CHECK_NEN[f.check_id];
    if (!cls) { score += f.severity === "medium-high" ? 3 : 1; continue; }
    score += f.severity === "medium-high" ? 3 : 1;
    if (hunterNen && cls.nen === hunterNen) score -= 1;
    if (cls.severity === "medium-high" && cls.bonus >= 2.0) score += 2;
  }
  if (score >= 30) return "S";
  if (score >= 20) return "A";
  if (score >= 12) return "B";
  if (score >= 6)  return "C";
  if (score >= 3)  return "D";
  return "E";
}

// ── XP CALCULATION ──

function calculateXp(rank, findings, hunterNen) {
  let xp = RANK_XP[rank];
  for (const f of findings) {
    const cls = CHECK_NEN[f.check_id];
    if (cls && cls.nen === hunterNen) {
      xp += Math.floor(RANK_XP[rank] * (cls.bonus - 1) / Math.max(findings.length, 1));
    }
  }
  return xp;
}

// ── UNDERSTANDING ──

function processUnderstanding(findings, hunterNen, xpGained) {
  const checkIds = [...new Set(findings.map(f => f.check_id))];
  const understanding = [];
  const newChecks = [];

  for (const checkId of checkIds) {
    const cls = CHECK_NEN[checkId];
    if (!cls) continue;
    understanding.push(`CS#${cls.cs}: mastered "${checkId}" — can now spot it instinctively`);

    const count = findings.filter(f => f.check_id === checkId).length;
    if (count >= 5) {
      newChecks.push(`${checkId}-deep: data-flow version that traces the lie through the call graph`);
    }
  }

  // Cross-patterns
  if (checkIds.includes("silent-failure") && checkIds.includes("cache-as-live")) {
    understanding.push("Cross-pattern: HIDDEN STATE — both cached values and swallowed failures are invisible state. The hunter sees both as one.");
    newChecks.push("hidden-state: meta-check for functions returning values without provenance where input could fail or be stale");
  }
  if (checkIds.includes("hardcoded-secret") && checkIds.includes("exposed-config")) {
    understanding.push("Cross-pattern: CREDENTIAL SURFACE — hardcoded secrets and exposed configs are the same vulnerability at different layers.");
    newChecks.push("credential-surface: traces credentials from source to usage, flagging any hardcoded or config-exposed path");
  }
  if (checkIds.includes("float-money") && checkIds.includes("spot-price-as-fair")) {
    understanding.push("Cross-pattern: NUMERIC DISHONESTY — float money and spot-price-as-fair are both lies about exactness.");
    newChecks.push("numeric-dishonesty: flags numeric values presented as exact when computation introduces uncertainty");
  }

  return { understanding, newChecks, checkIds, xpGained };
}

// ── PERCEPTION TIER ──

function getPerception(level) {
  let tier = PERCEPTION[0];
  for (const t of PERCEPTION) {
    if (level >= t.lvl) tier = t;
  }
  return tier;
}

// ── MAIN ──

const command = process.argv[2];
const repoArg = process.argv[3];
const hunterNen = process.argv[4] || "enhancer";

if (!command || !repoArg) {
  console.log(`usage: whitehack-gate-bridge.js <scan|classify|understand|loop> <repo> [hunter-nen]
  nen types: enhancer 🛡️, transmuter 🎨, emitter 📡, conjurer 🏗️, manipulator 🎛️, specialist ⚡`);
  process.exit(0);
}

const repoPath = resolve(repoArg);
const repoName = repoPath.split("/").pop();

if (command === "scan" || command === "loop") {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  WHITEHACK → GATE BRIDGE — ${repoName.padEnd(36)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  const findings = scanRepo(repoPath);
  const classified = classifyFindings(findings);
  const rank = calculateGateRank(findings, hunterNen);
  const xp = calculateXp(rank, findings, hunterNen);
  const aura = RANK_AURA[rank];

  console.log(`┌─ GATE GENERATED ──────────────────────────────────────────────┐`);
  console.log(`│  Repo:       ${repoName}`);
  console.log(`│  Findings:   ${findings.length}`);
  console.log(`│  Gate Rank:  ${rank} (aura cost: ${aura})`);
  console.log(`│  XP Reward:  ${xp}`);
  console.log(`│  Hunter Nen: ${NEN_NAMES[hunterNen] || hunterNen}`);
  console.log(`└──────────────────────────────────────────────────────────────┘\n`);

  if (findings.length > 0) {
    console.log(`── Findings by Nen Type ──`);
    for (const [nen, count] of Object.entries(classified.byNen)) {
      console.log(`  ${NEN_NAMES[nen] || nen}: ${count}`);
    }
    console.log();

    console.log(`── Findings by Clear Standard Principle ──`);
    for (const [cs, count] of Object.entries(classified.byCs)) {
      console.log(`  CS#${cs}: ${count} violations`);
    }
    console.log();

    console.log(`── Check Breakdown ──`);
    for (const [check, count] of Object.entries(classified.checkCounts)) {
      const cls = CHECK_NEN[check];
      const nenLabel = cls ? NEN_NAMES[cls.nen] : "?";
      console.log(`  ${check}: ${count}× (${nenLabel})`);
    }
    console.log();
  } else {
    console.log(`  ✓ No findings — the code tells the truth.\n`);
  }
}

if (command === "classify") {
  const findings = scanRepo(repoPath);
  const classified = classifyFindings(findings);
  console.log(JSON.stringify({ repo: repoName, findings: findings.length, classified }, null, 2));
}

if (command === "understand" || command === "loop") {
  const findings = scanRepo(repoPath);
  const rank = calculateGateRank(findings, hunterNen);
  const xp = calculateXp(rank, findings, hunterNen);
  const result = processUnderstanding(findings, hunterNen, xp);

  console.log(`┌─ UNDERSTANDING GAIN ─────────────────────────────────────────┐`);
  console.log(`│  Hunter Nen: ${NEN_NAMES[hunterNen] || hunterNen}`);
  console.log(`│  Gate Rank:  ${rank}`);
  console.log(`│  XP Gained:  ${xp}`);
  console.log(`│  Checks Cleared: ${result.checkIds.join(", ") || "none"}`);
  console.log(`└──────────────────────────────────────────────────────────────┘\n`);

  if (result.understanding.length > 0) {
    console.log(`── New Understanding ──`);
    for (const u of result.understanding) {
      console.log(`  ⬡ ${u}`);
    }
    console.log();
  }

  if (result.newChecks.length > 0) {
    console.log(`── Suggested New Checks (COMPOUNDING) ──`);
    for (const c of result.newChecks) {
      console.log(`  ✨ ${c}`);
    }
    console.log();
  }

  // Perception tier
  console.log(`── Perception Tiers ──`);
  for (const t of PERCEPTION) {
    console.log(`  Lv ${String(t.lvl).padStart(3)}  ${t.name.padEnd(12)} ${t.desc}`);
  }
  console.log();
}

if (command === "loop") {
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  THE COMPOUNDING LOOP                                        ║`);
  console.log(`║                                                              ║`);
  console.log(`║  scan → classify → gate → clear → understand → new checks  ║`);
  console.log(`║    ↑                                                    ↓   ║`);
  console.log(`║    └────────── unlimited understanding ←──────────────────┘   ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
}