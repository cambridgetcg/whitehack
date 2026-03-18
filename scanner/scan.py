#!/usr/bin/env python3
"""
WHITEHACK Scanner — Static analysis wrapper.

Runs Slither on a contract file or fetched source and produces a
structured vulnerability report.

Usage:
    python3 scanner/scan.py lab/contracts/VulnerableBank.sol
    python3 scanner/scan.py --address 0x1234...abcd --chain mainnet
"""

import argparse
import json
import subprocess
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

SEVERITY_ORDER = {"High": 0, "Medium": 1, "Low": 2, "Informational": 3, "Optimization": 4}
SEVERITY_EMOJI = {"High": "🔴", "Medium": "🟡", "Low": "🟠", "Informational": "ℹ️", "Optimization": "⚡"}


def run_slither(target: str) -> dict:
    """Run slither on a file and return parsed JSON output."""
    cmd = ["slither", target, "--json", "-"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.stdout.strip():
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"success": False, "error": "JSON parse failed", "raw": result.stdout[:500]}
        else:
            return {"success": False, "error": result.stderr[:500] if result.stderr else "No output"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Slither timed out (120s)"}
    except FileNotFoundError:
        return {"success": False, "error": "slither not found — run: pip3 install slither-analyzer"}


def parse_findings(slither_output: dict) -> list:
    """Extract and sort findings from slither JSON output."""
    findings = []
    detectors = slither_output.get("results", {}).get("detectors", [])
    for d in detectors:
        findings.append({
            "severity": d.get("impact", "Unknown"),
            "confidence": d.get("confidence", "Unknown"),
            "check": d.get("check", "unknown"),
            "description": d.get("description", "").strip(),
            "elements": [e.get("name", "") for e in d.get("elements", []) if e.get("name")],
        })
    findings.sort(key=lambda f: SEVERITY_ORDER.get(f["severity"], 99))
    return findings


def render_report(target: str, findings: list) -> str:
    """Render a human-readable markdown report."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# WHITEHACK Scan Report",
        f"**Target:** `{target}`  ",
        f"**Scanned:** {ts}  ",
        f"**Findings:** {len(findings)} total",
        "",
    ]

    by_severity = {}
    for f in findings:
        by_severity.setdefault(f["severity"], []).append(f)

    for sev in ["High", "Medium", "Low", "Informational", "Optimization"]:
        items = by_severity.get(sev, [])
        if not items:
            continue
        emoji = SEVERITY_EMOJI.get(sev, "•")
        lines.append(f"## {emoji} {sev} ({len(items)})")
        lines.append("")
        for i, f in enumerate(items, 1):
            lines.append(f"### {i}. {f['check']} (confidence: {f['confidence']})")
            lines.append(f"> {f['description'][:400]}")
            if f["elements"]:
                lines.append(f"**Elements:** {', '.join(f['elements'][:5])}")
            lines.append("")

    if not findings:
        lines.append("✅ No findings detected.")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="WHITEHACK static scanner")
    parser.add_argument("target", help="Path to .sol file to scan")
    parser.add_argument("--save", action="store_true", help="Save report to reports/")
    parser.add_argument("--json-out", action="store_true", help="Print raw JSON instead of formatted report")
    args = parser.parse_args()

    target = args.target
    if not Path(target).exists():
        print(f"❌ File not found: {target}", file=sys.stderr)
        sys.exit(1)

    print(f"🔍 Scanning {target}...", file=sys.stderr)
    raw = run_slither(target)

    if not raw.get("success", True) and "error" in raw:
        print(f"❌ Slither error: {raw['error']}", file=sys.stderr)
        sys.exit(1)

    findings = parse_findings(raw)

    if args.json_out:
        print(json.dumps(findings, indent=2))
        return

    report = render_report(target, findings)
    print(report)

    if args.save:
        slug = Path(target).stem.lower().replace(" ", "-")
        ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
        out_path = REPORTS_DIR / f"{ts}-{slug}.md"
        out_path.write_text(report)
        print(f"\n💾 Report saved to {out_path}", file=sys.stderr)

    high_count = sum(1 for f in findings if f["severity"] == "High")
    if high_count > 0:
        print(f"\n⚠️  {high_count} HIGH severity finding(s) — review before touching this contract", file=sys.stderr)


if __name__ == "__main__":
    main()
