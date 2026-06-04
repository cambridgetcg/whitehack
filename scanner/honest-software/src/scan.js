import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { silentFailure } from "./checks/silent-failure.js";
import { cacheAsLive } from "./checks/cache-as-live.js";
import { decisionWithoutWhy } from "./checks/decision-without-why.js";
import { solStaleOracle } from "./checks/sol-stale-oracle.js";

const JS_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const SOL_EXT = new Set([".sol"]);
const ALL_EXT = new Set([...JS_EXT, ...SOL_EXT]);

// Each check declares which file kinds it understands, so a JS heuristic never
// runs on Solidity (or vice-versa) and the report stays clean.
const CHECKS = [
  { check: silentFailure, exts: JS_EXT },
  { check: cacheAsLive, exts: JS_EXT },
  { check: decisionWithoutWhy, exts: JS_EXT },
  { check: solStaleOracle, exts: SOL_EXT },
];

const IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "coverage",
  "out", "lib", "forge-std", "cache", "artifacts",
]);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (IGNORE.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (ALL_EXT.has(extname(e.name))) yield p;
  }
}

export async function scan(root) {
  const findings = [];
  for await (const file of walk(root)) {
    const ext = extname(file);
    let content;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (const { check, exts } of CHECKS) {
      if (!exts.has(ext)) continue;
      for (const hit of check.detect(content, lines)) {
        findings.push({
          file: relative(root, file) || file,
          line: hit.line,
          check: check.id,
          title: check.title,
          confidence: check.confidence,
          doctrine: check.doctrine,
          message: hit.message,
          snippet: hit.snippet,
        });
      }
    }
  }
  return findings;
}
