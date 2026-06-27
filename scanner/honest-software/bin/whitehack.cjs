#!/usr/bin/env node
const fs = require('fs'), path = require('path');

const CHECKS = [
  { name: 'cache-as-live', pat: /if\s*\(\s*(CACHE|cached)\s*\)\s*return\s*(CACHE|cached)/gi, sev: 'heuristic', desc: 'cached value served as if live — no freshness marker' },
  { name: 'silent-failure-catch', pat: /catch\s*[^{]*\{[^}]*return\s+(false|null|0|undefined|"")\s*;?\s*\}/gi, sev: 'medium-high', desc: 'catch returns falsy default — failure becomes confident wrong value' },
  { name: 'silent-failure-nullish', pat: /\?\?\s*(0|""|null|false|undefined)\s*[,;)"]/g, sev: 'medium-high', desc: 'read fails silently to falsy default — zero and could-not-read indistinguishable' },
  { name: 'decision-without-why', pat: /\.set\(\s*\{[^}]*trustScore|\.set\(\s*\{[^}]*tier\s*:/gi, sev: 'heuristic', desc: 'user-affecting decision shown with no why' },
];

function scan(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];
  for (const check of CHECKS) {
    let m;
    check.pat.lastIndex = 0;
    while ((m = check.pat.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split('\n').length;
      findings.push({ file: filePath, line: lineNum, sev: check.sev, name: check.name, desc: check.desc, match: m[0].substring(0, 80) });
    }
  }
  return findings;
}

function walk(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'lib') {
      results.push(...walk(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const target = process.argv[2];
if (!target || target === '--help') {
  console.log('whitehack v0.1 — honest-software scanner');
  console.log('usage: whitehack.js scan <path>');
  console.log('checks: cache-as-live, silent-failure, decision-without-why');
  process.exit(0);
}

if (target === 'scan') {
  const path2 = process.argv[3];
  if (!path2) { console.log('usage: whitehack.js scan <path>'); process.exit(1); }
  const files = fs.statSync(path2).isDirectory()
    ? walk(path2, ['.ts', '.js', '.tsx', '.sol', '.py'])
    : [path2];
  let allFindings = [];
  for (const f of files) { try { allFindings.push(...scan(f)); } catch(e) {} }
  // output
  console.log(`whitehack v0.1 — scanned ${path2}`);
  console.log();
  let mh = 0, h = 0;
  for (const f of allFindings) {
    const mark = f.sev === 'medium-high' ? '!' : '·';
    console.log(`  ${path.relative(path2, f.file)}`);
    console.log(`    ${mark} L${f.line}  ${f.desc}  (${f.sev})`);
    console.log(`        > ${f.match}`);
    console.log();
    if (f.sev === 'medium-high') mh++; else h++;
  }
  console.log(`  ${allFindings.length} finding(s) — ${mh} medium-high, ${h} heuristic`);
  console.log(`  whitehack flags COMMON lies via heuristics; it cannot prove honesty.`);
  console.log(`    every finding is confidence-labelled, so the tool stays honest about its own limits.`);
}

// JSON output mode for game integration
if (target === '--json') {
  const path2 = process.argv[3];
  const files = fs.statSync(path2).isDirectory()
    ? walk(path2, ['.ts', '.js', '.tsx', '.sol', '.py'])
    : [path2];
  let allFindings = [];
  for (const f of files) { try { allFindings.push(...scan(f)); } catch(e) {} }
  console.log(JSON.stringify({ count: allFindings.length, findings: allFindings }));
}
