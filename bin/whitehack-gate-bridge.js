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

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ── NEN CLASSIFICATIONS (mirrors nen-classifier.ts for CLI use) ──
// Updated to cover ALL checks, not just the original 11. The old table
// only had 11 entries while 39 check files exist — classifyFindings
// silently dropped every finding whose check_id wasn't in the table,
// making the classification output a lie (it showed "no nen-classifiable
// findings" when there were 176).

const CHECK_NEN = {
  // Original honesty checks
  "silent-failure":        { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 1.5 },
  "hardcoded-secret":      { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 2.0 },
  "exposed-config":        { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 2.0 },
  "unsafe-eval":           { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 2.0 },
  "cache-as-live":         { nen: "conjurer",    cs: 4, severity: "heuristic",   bonus: 1.2 },
  "stale-oracle":          { nen: "emitter",     cs: 4, severity: "medium-high", bonus: 1.5 },
  "spot-price-as-fair":    { nen: "emitter",     cs: 1, severity: "heuristic",   bonus: 1.3 },
  "unchecked-transfer":    { nen: "enhancer",    cs: 2, severity: "medium-high", bonus: 1.8 },
  "float-money":           { nen: "conjurer",    cs: 1, severity: "medium-high", bonus: 1.5 },
  "silent-revert":         { nen: "transmuter",  cs: 3, severity: "heuristic",   bonus: 1.2 },
  "decision-without-why":  { nen: "transmuter",  cs: 3, severity: "heuristic",   bonus: 1.3 },
  // Protocol & security checks (v0.3-v0.4)
  "api-status-lie":              { nen: "enhancer",   cs: 2, severity: "high",        bonus: 2.0 },
  "api-error-without-shape":     { nen: "transmuter", cs: 3, severity: "heuristic",   bonus: 1.2 },
  "api-missing-versioning":      { nen: "emitter",    cs: 4, severity: "heuristic",   bonus: 1.1 },
  "api-missing-rate-limit":      { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.5 },
  "api-bare-fetch":              { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.5 },
  "insecure-protocol":           { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "disabled-cert-verification":  { nen: "enhancer",   cs: 2, severity: "high",        bonus: 2.0 },
  "weak-crypto":                 { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "cors-wildcard":               { nen: "emitter",    cs: 2, severity: "medium-high", bonus: 1.5 },
  "cookie-insecure":             { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "sql-injection":               { nen: "enhancer",   cs: 2, severity: "high",        bonus: 2.0 },
  "protocol-surface":            { nen: "emitter",    cs: 2, severity: "medium-high", bonus: 1.5 },
  "bluetooth-protocol-flaws":    { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "bluetooth-paired-stranger":   { nen: "specialist", cs: 3, severity: "heuristic",   bonus: 1.5 },
  "bluetooth-protocol":          { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "wifi-protocol-flaws":         { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "weak-wifi-encryption":        { nen: "enhancer",   cs: 1, severity: "high",        bonus: 2.0 },
  "wifi-deauth-accept":          { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "wifi-evil-twin":              { nen: "specialist", cs: 5, severity: "medium-high", bonus: 1.7 },
  "wifi-krack-vulnerable":       { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "wifi-pmk-exposure":           { nen: "enhancer",   cs: 2, severity: "high",        bonus: 2.0 },
  "wifi-protocol":               { nen: "enhancer",   cs: 1, severity: "medium-high", bonus: 1.5 },
  "wpa2-krack":                  { nen: "enhancer",   cs: 2, severity: "medium-high", bonus: 1.8 },
  "dns-plaintext":               { nen: "emitter",    cs: 2, severity: "medium-high", bonus: 1.5 },
  "password-auth":               { nen: "specialist", cs: 3, severity: "medium-high", bonus: 1.7 },
  "performed-ignorance":         { nen: "transmuter", cs: 3, severity: "medium-high", bonus: 2.0 },
  "trust-by-authority":          { nen: "specialist", cs: 3, severity: "medium-high", bonus: 1.8 },
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
    // execFileSync with arg array — no shell interpolation, no injection vector.
    // A repo path containing shell metacharacters (" $ ; etc.) is passed as a
    // single argv element, not concatenated into a command string.
    output = execFileSync("whitehack", ["scan", srcPath], {
      encoding: "utf-8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"],
    });
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
      // Use the ACTUAL severity parsed from the output (group 5), not a
      // reconstruction from the marker character. The old code did:
      //   const severity = findingMatch[1] === "!" ? "medium-high" : "heuristic";
      // which silently downgraded all "high" findings to "medium-high" —
      // 45 findings in the whitehack self-scan were misreported. The truth
      // was in the parsed data (group 5) and the code ignored it.
      const severity = findingMatch[5];
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

// Map human-readable check titles to check IDs.
// The old map had 11 entries with titles that didn't match the actual
// scanner output ("Read fails silently to a falsy default" vs the real
// "Read fails silently to a falsy default"). Every title missed the map,
// so titleToCheckId fell back to slugification, producing check_ids that
// didn't exist in CHECK_NEN — and classifyFindings silently dropped them
// all. The classification output was a lie: it showed zero findings by
// nen type when there were 176.
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
  "Config file contains embedded credentials": "exposed-config",
  "Unsafe code execution — eval, Function, or unsanitized HTML injection": "unsafe-eval",
  // Protocol & security checks (v0.3-v0.4)
  "API returns success status (2xx) with error in response body": "api-status-lie",
  "API error response missing structured error shape": "api-error-without-shape",
  "API endpoint missing version declaration": "api-missing-versioning",
  "API endpoint missing rate limiting": "api-missing-rate-limit",
  "fetch() called without checking response status": "api-bare-fetch",
  "Insecure protocol used for network communication": "insecure-protocol",
  "TLS certificate verification disabled — MITM possible": "disabled-cert-verification",
  "Weak or broken cryptography used for security": "weak-crypto",
  "CORS wildcard origin — any website can access this endpoint": "cors-wildcard",
  "Session cookie missing security flags": "cookie-insecure",
  "SQL query built with string concatenation — injection possible": "sql-injection",
  "Network protocol surface — service bound to all interfaces without acknowledgment": "protocol-surface",
  "Bluetooth protocol security flaw — weak pairing or no auth": "bluetooth-protocol-flaws",
  "Bluetooth paired stranger — device paired without identity verification": "bluetooth-paired-stranger",
  "Bluetooth protocol lie — pairing is not security": "bluetooth-protocol",
  "WiFi protocol security flaw — deprecated or broken encryption": "wifi-protocol-flaws",
  "Weak WiFi encryption — security theater exposed": "weak-wifi-encryption",
  "WiFi deauth frame accepted without verification": "wifi-deauth-accept",
  "WiFi SSID-only connection — evil twin vulnerable": "wifi-evil-twin",
  "KRACK vulnerable key reinstallation": "wifi-krack-vulnerable",
  "WiFi PSK/PMK exposed in code or config": "wifi-pmk-exposure",
  "WiFi protocol lie — security theater exposed": "wifi-protocol",
  "WPA2 KRACK vulnerability — key reinstallation attack not mitigated": "wpa2-krack",
  "Plaintext DNS — domain queries visible to network observers": "dns-plaintext",
  "Password/authentication lie — shared secret is not trust": "password-auth",
  "Code claims inability while the capability exists — performs ignorance": "performed-ignorance",
  "Source trusted by authority rather than verified — no cross-check": "trust-by-authority",
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
    // "high" findings score 5, "medium-high" score 3, "heuristic" score 1.
    // The old code only had a binary medium-high vs heuristic split because
    // it reconstructed severity from the marker. Now we have the real severity.
    const sevScore = f.severity === "high" ? 5 : f.severity === "medium-high" ? 3 : 1;
    if (!cls) { score += sevScore; continue; }
    score += sevScore;
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