#!/usr/bin/env python3
"""
Qwythos Security Auditor — AI-powered smart contract vulnerability analysis.
Uses Qwythos-9B (9B Qwen3.5, 1M context, uncensored) for deep security reasoning.

Usage:
    python3 scanner/qwythos-audit.py <contract.sol>
    python3 scanner/qwythos-audit.py <contract.sol> --class reentrancy
    python3 scanner/qwythos-audit.py --review-reports   # Review existing reports
    python3 scanner/qwythos-audit.py --hunt <target-dir> # Hunt honesty-class vulns
"""

import subprocess
import sys
import json
import os
from pathlib import Path
from datetime import datetime, timezone

WHITEHACK_ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = WHITEHACK_ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)
DOCS_DIR = WHITEHACK_ROOT / "docs"

# Qwythos model
QWYTHOS_MODEL = "richardyoung/qwythos-9b-abliterated:Q8_0"

VULN_CLASSES = {
    "reentrancy": "External call before state update. Checks-Effects-Interactions violation.",
    "access-control": "Missing onlyOwner, wrong modifier, public init, missing role check.",
    "integer-overflow": "Pre-0.8.0 arithmetic wrap-around, unsafe unchecked blocks.",
    "flash-loan": "Borrow huge sum, manipulate price oracle, profit, repay in one TX.",
    "oracle-manipulation": "Spot price from thin AMM pool, no TWAP, no freshness check.",
    "signature-replay": "Signed message valid cross-chain or after expiry. Missing chainId/nonce.",
    "proxy-upgrade": "Initialize callable multiple times, storage collision, wrong delegate.",
    "stale-oracle": "Cached/stale value served as if live. No freshness check on oracle price.",
    "unchecked-call": "Failed external call swallowed into confident default. Transfer treated as success.",
    "front-running": "MEV extraction, sandwich attacks, visible pending transactions.",
}

SECURITY_PROMPT = """You are Qwythos-9B, a security auditor analyzing smart contracts for vulnerabilities.

You are part of WHITEHACK — a white-hat security research protocol. Every finding is reported responsibly. Every exploit stays in the lab.

Vulnerability classes to check:
{vuln_classes}

The contract to analyze:
```solidity
{contract_code}
```

Analyze this contract for vulnerabilities. For each finding:
1. Name the vulnerability class
2. Show the exact line(s) affected
3. Explain the attack scenario (how would an exploit work?)
4. Rate severity: Critical / High / Medium / Low / Informational
5. Suggest a fix

Be thorough. Be technical. Be honest. If you find nothing, say so.
Output in clean markdown.

Remember: Love is. Truth is. Security is love protecting what matters. ∞"""

HUNT_PROMPT = """You are Qwythos-9B, hunting the "honesty class" of vulnerabilities.

The honesty class is where code LIES about its own state:
1. STALE ORACLE: A cached/stale value served as if live (no freshness check)
2. SILENT FAILURE: A failed read swallowed into a confident default (unchecked call)
3. DECISION WITHOUT WHY: Opaque privileged actions with no transparency

Scan these files for honesty-class issues:
{file_list}

For each file, check:
- Is any cached value used without verifying freshness?
- Is any external call result ignored or assumed successful?
- Is any privileged action taken without logging or transparency?

Report findings in markdown. If clean, say "No honesty-class issues found."

Love is. Truth is. Honest code is love made visible. ∞"""

REVIEW_PROMPT = """You are Qwythos-9B, reviewing existing WHITEHACK bug reports for quality.

Review this report:
{report_content}

Check:
1. Is the vulnerability clearly described?
2. Is the attack scenario realistic and well-explained?
3. Is the severity rating justified?
4. Is the fix suggestion practical?
5. What's missing?

Rate the report: EXCELLENT / GOOD / NEEDS WORK / INCOMPLETE
Suggest improvements.

Truth is. Good reports protect users. ∞"""


def run_qwythos(prompt, timeout=600):
    """Run Qwythos model via ollama."""
    try:
        result = subprocess.run(
            ["ollama", "run", QWYTHOS_MODEL],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout.strip() if result.stdout else result.stderr.strip()
    except subprocess.TimeoutExpired:
        return "ERROR: Qwythos timed out"
    except FileNotFoundError:
        return "ERROR: ollama not found"


def audit_contract(contract_path, vuln_class=None):
    """Audit a single contract file."""
    with open(contract_path) as f:
        code = f.read()

    classes = VULN_CLASSES
    if vuln_class:
        classes = {vuln_class: VULN_CLASSES[vuln_class]}

    classes_text = "\n".join(f"- {k}: {v}" for k, v in classes.items())
    prompt = SECURITY_PROMPT.format(vuln_classes=classes_text, contract_code=code)

    print(f"[*] Qwythos analyzing {contract_path}...")
    if vuln_class:
        print(f"[*] Focus: {vuln_class}")

    result = run_qwythos(prompt)

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    contract_name = Path(contract_path).stem
    report_path = REPORTS_DIR / f"QWYTHOS-{timestamp}-{contract_name}.md"

    with open(report_path, "w") as f:
        f.write(f"# Qwythos Security Audit — {contract_name}\n\n")
        f.write(f"*Generated by Qwythos-9B, {datetime.now().isoformat()}*\n\n")
        f.write(f"*Contract: `{contract_path}`*\n\n")
        if vuln_class:
            f.write(f"*Focus: {vuln_class}*\n\n")
        f.write("---\n\n")
        f.write(result)
        f.write("\n\n---\n\n*Qwythos-9B · WHITEHACK · Love is. Truth is. Security is love. ∞*\n")

    print(f"[✓] Report saved: {report_path}")
    print(f"\n{result[:500]}...")
    return report_path


def hunt_honesty(target_dir):
    """Hunt honesty-class vulnerabilities in a target directory."""
    target = Path(target_dir)
    sol_files = list(target.rglob("*.sol"))
    js_files = list(target.rglob("*.js")) + list(target.rglob("*.ts"))

    all_files = sol_files + js_files
    if not all_files:
        print(f"[!] No .sol/.js/.ts files found in {target_dir}")
        return

    file_list = "\n".join(f"- {f}" for f in all_files[:20])
    prompt = HUNT_PROMPT.format(file_list=file_list)

    print(f"[*] Qwythos hunting honesty-class vulns in {target_dir}...")
    print(f"[*] {len(all_files)} files to scan")

    result = run_qwythos(prompt, timeout=300)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    report_path = REPORTS_DIR / f"QWYTHOS-HUNT-{timestamp}-{target.name}.md"

    with open(report_path, "w") as f:
        f.write(f"# Qwythos Honesty Hunt — {target.name}\n\n")
        f.write(f"*Generated by Qwythos-9B, {datetime.now().isoformat()}*\n\n")
        f.write(f"*Target: `{target_dir}`*\n\n")
        f.write("---\n\n")
        f.write(result)
        f.write("\n\n---\n\n*Qwythos-9B · WHITEHACK · Honest code is love made visible. ∞*\n")

    print(f"[✓] Hunt report saved: {report_path}")
    print(f"\n{result[:500]}...")
    return report_path


def review_reports():
    """Review all existing reports for quality."""
    reports = list(REPORTS_DIR.glob("*.md"))
    if not reports:
        print("[!] No reports found in reports/")
        return

    for report in reports[:5]:  # Review up to 5
        with open(report) as f:
            content = f.read()

        prompt = REVIEW_PROMPT.format(report_content=content[:2000])
        print(f"[*] Qwythos reviewing {report.name}...")

        result = run_qwythos(prompt)

        review_path = REPORTS_DIR / f"QWYTHOS-REVIEW-{report.stem}.md"
        with open(review_path, "w") as f:
            f.write(f"# Qwythos Review — {report.name}\n\n")
            f.write(f"*Generated by Qwythos-9B, {datetime.now().isoformat()}*\n\n---\n\n")
            f.write(result)
            f.write("\n\n---\n\n*Qwythos-9B · WHITEHACK · ∞*\n")

        print(f"[✓] Review saved: {review_path}")
        print(f"    {result[:200]}...")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Qwythos Security Auditor")
    parser.add_argument("target", nargs="?", help="Contract file to audit")
    parser.add_argument("--class", dest="vuln_class", help="Focus on specific vulnerability class")
    parser.add_argument("--review-reports", action="store_true", help="Review existing reports")
    parser.add_argument("--hunt", help="Hunt honesty-class vulns in a directory")

    args = parser.parse_args()

    if args.review_reports:
        review_reports()
    elif args.hunt:
        hunt_honesty(args.hunt)
    elif args.target:
        audit_contract(args.target, args.vuln_class)
    else:
        parser.print_help()
        print("\nVulnerability classes:")
        for k, v in VULN_CLASSES.items():
            print(f"  {k:20s} — {v}")


if __name__ == "__main__":
    main()
