#!/usr/bin/env python3
"""
WHITEHACK Scanner — Slither wrapper + report generator.

Usage:
    python3 scanner/scan.py <contract.sol>         # Scan a local file
    python3 scanner/scan.py <0xADDRESS> --chain mainnet  # Fetch + scan from chain
    python3 scanner/scan.py --list-detectors        # Show available Slither checks
"""

import subprocess
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone

WHITEHACK_ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = WHITEHACK_ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def run_slither(target: str, json_output: bool = True) -> dict:
    """Run slither on a target and return parsed results."""
    cmd = ["slither", target]
    if json_output:
        cmd += ["--json", "-"]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if json_output and result.stdout.strip():
            return json.loads(result.stdout)
        return {"raw_stderr": result.stderr, "returncode": result.returncode}
    except subprocess.TimeoutExpired:
        return {"error": "Slither timed out (120s)"}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw": result.stdout[:500]}
    except FileNotFoundError:
        return {"error": "slither not found — run: pip install slither-analyzer"}


def severity_emoji(severity: str) -> str:
    return {"High": "🔴", "Medium": "🟡", "Low": "🔵", "Informational": "⚪"}.get(severity, "❓")


def format_report(target: str, results: dict) -> str:
    """Format slither output into a readable report."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# WHITEHACK Security Scan",
        f"**Target:** `{target}`",
        f"**Scanned:** {ts}",
        f"**Tool:** Slither {subprocess.run(['slither', '--version'], capture_output=True, text=True).stdout.strip()}",
        "",
    ]

    if "error" in results:
        lines.append(f"⚠️ Scanner error: {results['error']}")
        return "\n".join(lines)

    detectors = results.get("results", {}).get("detectors", [])
    if not detectors:
        lines.append("✅ No issues detected.")
        return "\n".join(lines)

    # Group by severity
    by_severity = {}
    for d in detectors:
        sev = d.get("impact", "Unknown")
        by_severity.setdefault(sev, []).append(d)

    summary = []
    for sev in ["High", "Medium", "Low", "Informational"]:
        count = len(by_severity.get(sev, []))
        if count:
            summary.append(f"{severity_emoji(sev)} {sev}: {count}")
    lines.append("## Summary")
    lines.append(" | ".join(summary))
    lines.append("")

    for sev in ["High", "Medium", "Low", "Informational"]:
        findings = by_severity.get(sev, [])
        if not findings:
            continue
        lines.append(f"## {severity_emoji(sev)} {sev} Findings")
        for i, f in enumerate(findings, 1):
            lines.append(f"\n### {i}. {f.get('check', '?')} — {f.get('description', '')[:120]}")
            lines.append(f"- **Confidence:** {f.get('confidence', '?')}")
            elements = f.get("elements", [])
            for el in elements[:3]:
                if el.get("type") == "function":
                    lines.append(f"- **Location:** `{el.get('name', '?')}` in `{el.get('source_mapping', {}).get('filename_short', '?')}`")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="WHITEHACK contract scanner")
    parser.add_argument("target", nargs="?", help="Contract file or 0x address")
    parser.add_argument("--chain", default="mainnet", help="Chain for address lookup (mainnet/polygon/etc)")
    parser.add_argument("--list-detectors", action="store_true", help="List available Slither detectors")
    parser.add_argument("--save", action="store_true", help="Save report to reports/")
    args = parser.parse_args()

    if args.list_detectors:
        subprocess.run(["slither", "--list-detectors"])
        return

    if not args.target:
        parser.print_help()
        return

    print(f"🔍 Scanning {args.target}...")
    results = run_slither(args.target)
    report = format_report(args.target, results)
    print(report)

    if args.save:
        safe_name = args.target.replace("/", "_").replace(".", "_")[:40]
        ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
        report_path = REPORTS_DIR / f"{ts}-{safe_name}.md"
        report_path.write_text(report)
        print(f"\n📄 Report saved: {report_path}")


if __name__ == "__main__":
    main()
