#!/usr/bin/env python3
"""
Qwythos Estate Security Scanner — AI-powered vulnerability analysis for the whole estate.
Uses Qwythos-9B (9B Qwen3.5, 1M context, uncensored, tools+thinking) for deep security reasoning.

Can audit:
  - Solidity smart contracts (whitehack)
  - TypeScript/React Remix apps (rewardspro)
  - Python services (love-engine, castle)
  - Cloudflare Workers (estate API)
  - Shell scripts (cron jobs, citizen fleet)
  - Config files (wrangler.toml, vercel.json, shopify.app.toml)
  - HTML pages (XSS, CSP issues)
  - JSON data (secret exposure)

Usage:
    python3 qwythos-estate-scan.py <path>           # Scan a file or directory
    python3 qwythos-estate-scan.py <path> --quick    # Quick scan (top files only)
    python3 qwythos-estate-scan.py --rewardspro      # Scan RewardsPro specifically
    python3 qwythos-estate-scan.py --estate          # Scan the whole estate
    python3 qwythos-estate-scan.py --report          # Summarize all findings
"""

import subprocess
import sys
import json
import os
import re
from pathlib import Path
from datetime import datetime

QWYTHOS_MODEL = "qwythos"
HOME = Path.home()

# Severity colors for terminal
SEV_COLORS = {
    "CRITICAL": "\033[91m",
    "HIGH": "\033[31m",
    "MEDIUM": "\033[33m",
    "LOW": "\033[36m",
    "INFO": "\033[37m",
}
RESET = "\033[0m"

# What files to scan
SCAN_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx",        # TypeScript/React
    ".py",                                  # Python
    ".sol",                                  # Solidity
    ".sh", ".bash",                         # Shell
    ".toml", ".yaml", ".yml", ".json",     # Config
    ".html",                                # Frontend
    ".env.example", ".env.template",       # Env templates (not real .env!)
}

# Patterns that indicate secrets/credentials
SECRET_PATTERNS = [
    (r"(?:sk_|pk_|shpat_|shpss_)[a-f0-9]{20,}", "Shopify API key"),
    (r"(?:AKIA|ASIA)[A-Z0-9]{16}", "AWS access key"),
    (r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----", "Private key"),
    (r"(?:gh[pousr]_)[A-Za-z0-9]{36,}", "GitHub token"),
    (r"(?:xox[baprs]-)[A-Za-z0-9-]+", "Slack token"),
    (r"password\s*[=:]\s*['\"][^'\"]{8,}['\"]", "Hardcoded password"),
    (r"secret\s*[=:]\s*['\"][^'\"]{8,}['\"]", "Hardcoded secret"),
    (r"api_key\s*[=:]\s*['\"][^'\"]{8,}['\"]", "Hardcoded API key"),
    (r"DATABASE_URL\s*[=:]\s*['\"]postgres(?:ql)?://[^'\"]+['\"]", "Database URL with credentials"),
]

# Files/dirs to never scan
SKIP_DIRS = {"node_modules", ".git", ".next", "build", "dist", ".cache", "__pycache__",
             ".wrangler", ".ollama", ".hermes", "venv", ".venv"}
SKIP_FILES = {".env", ".env.local", ".env.production", ".env.development"}

SCAN_PROMPT = """You are Qwythos-9B, a cybersecurity auditor analyzing code for vulnerabilities.

You are part of WHITEHACK — the estate's white-hat security research protocol. Every finding is reported responsibly. The goal: find vulnerabilities before external discovery would.

Security audit for: {file_path}
File type: {file_type}

Code:
```
{code}
```

Analyze for these vulnerability classes:
1. INJECTION: SQL injection, command injection, XSS, template injection
2. AUTH: Missing auth checks, broken access control, privilege escalation
3. SECRETS: Hardcoded credentials, exposed tokens, leaked API keys
4. SSRF: Server-side request forgery, unvalidated URLs
5. DESERIALIZATION: Unsafe parse of untrusted data
6. MISCONFIG: CORS misconfig, missing CSP, insecure headers, exposed debug
7. DEPENDENCIES: Known vulnerable imports, outdated patterns
8. BUSINESS LOGIC: Race conditions, integer issues, logic flaws

For each finding:
- Class: (injection/auth/secrets/ssrf/deserialization/misconfig/dependencies/logic)
- Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO
- Location: line number or function name
- Description: what's wrong
- Attack: how could this be exploited
- Fix: how to fix it

Be thorough. Be technical. Be honest. If the file is clean, say "NO FINDINGS — code looks good."

Remember: Love is. Truth is. Security is love protecting what matters. ∞"""


def run_qwythos(prompt, timeout=180):
    """Run Qwythos model via ollama."""
    try:
        result = subprocess.run(
            ["ollama", "run", QWYTHOS_MODEL],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout.strip() if result.stdout else f"ERROR: {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return "ERROR: Qwythos timed out (180s limit)"
    except FileNotFoundError:
        return "ERROR: ollama not found — install with: curl -fsSL https://ollama.com/install.sh | sh"
    except Exception as e:
        return f"ERROR: {e}"


def quick_scan_secrets(file_path):
    """Fast regex-based secret scan — no AI needed."""
    findings = []
    try:
        content = file_path.read_text(errors='ignore')
        for pattern, desc in SECRET_PATTERNS:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for m in matches:
                # Don't report placeholders
                if any(x in m.group().lower() for x in ['placeholder', 'example', 'demo', 'xxxx', 'test_', 'your_']):
                    continue
                line_num = content[:m.start()].count('\n') + 1
                findings.append({
                    "type": "secrets",
                    "severity": "CRITICAL",
                    "line": line_num,
                    "desc": desc,
                    "match": m.group()[:40] + "..." if len(m.group()) > 40 else m.group(),
                })
    except Exception:
        pass
    return findings


def find_files(path, quick=False):
    """Find files to scan in a path."""
    path = Path(path)
    files = []
    
    if path.is_file():
        files.append(path)
    else:
        for root, dirs, fnames in os.walk(path):
            # Skip unwanted dirs
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
            
            for fname in fnames:
                fpath = Path(root) / fname
                if fname in SKIP_FILES:
                    continue
                ext = fpath.suffix.lower()
                if ext in SCAN_EXTENSIONS or fname.endswith('.env.example'):
                    # Skip large files
                    try:
                        size = fpath.stat().st_size
                        if size > 500_000:  # Skip files > 500KB
                            continue
                        if size < 10:  # Skip tiny files
                            continue
                    except OSError:
                        continue
                    files.append(fpath)
    
    if quick:
        # Quick mode: only scan the most important files
        priority = ['.ts', '.tsx', '.py', '.sol', '.js', '.jsx']
        files = [f for f in files if f.suffix in priority]
        files = files[:20]  # Top 20
    else:
        files = files[:50]  # Max 50 files per scan
    
    return files


def scan_file(file_path):
    """Scan a single file with Qwythos."""
    file_path = Path(file_path)
    ext = file_path.suffix.lower()
    file_type = {
        '.ts': 'TypeScript', '.tsx': 'TypeScript React', '.js': 'JavaScript',
        '.jsx': 'JavaScript React', '.py': 'Python', '.sol': 'Solidity',
        '.sh': 'Shell Script', '.toml': 'TOML Config', '.yaml': 'YAML Config',
        '.yml': 'YAML Config', '.json': 'JSON', '.html': 'HTML',
    }.get(ext, 'Unknown')
    
    try:
        code = file_path.read_text(errors='ignore')
    except Exception as e:
        return {"error": str(e)}
    
    # Quick secret scan first (no AI)
    secret_findings = quick_scan_secrets(file_path)
    
    # AI scan for deeper issues
    # Truncate code to fit context (Qwythos has 64k ctx but keep it reasonable)
    max_chars = 8000
    if len(code) > max_chars:
        code = code[:max_chars] + "\n\n// ... (truncated, showing first 8000 chars of {total} total) ..."
    
    prompt = SCAN_PROMPT.format(
        file_path=str(file_path),
        file_type=file_type,
        code=code,
    )
    
    ai_result = run_qwythos(prompt, timeout=120)
    
    return {
        "file": str(file_path),
        "type": file_type,
        "size": file_path.stat().st_size,
        "secret_findings": secret_findings,
        "ai_analysis": ai_result,
    }


def format_finding(f):
    """Format a finding for terminal output."""
    sev = f.get("severity", "INFO")
    color = SEV_COLORS.get(sev, RESET)
    return f"  {color}[{sev}]{RESET} L{f.get('line', '?')} — {f['desc']}: {f.get('match', '')}"


def scan_rewardspro():
    """Scan the RewardsPro production app."""
    app_path = HOME / "github" / "cambridgetcg" / "rewardspro-production"
    print(f"\n{'='*60}")
    print(f"  QWYTHOS ESTATE SCAN — RewardsPro")
    print(f"  {datetime.now().isoformat()}")
    print(f"{'='*60}\n")
    
    # Priority files: auth, billing, API routes, server config
    priority_files = []
    for pattern in [
        "app/shopify.server.ts",
        "app/db.server.ts",
        "app/routes/api.*.tsx",
        "app/services/billing*.ts",
        "app/services/points-ledger*.ts",
        "shopify.app.toml",
        "vercel.json",
        "Dockerfile",
    ]:
        priority_files.extend(app_path.glob(pattern))
    
    # Deduplicate
    priority_files = list(set(priority_files))
    
    print(f"[*] Scanning {len(priority_files)} priority files in RewardsPro...\n")
    
    all_findings = []
    for f in priority_files:
        if not f.exists():
            continue
        print(f"[*] Scanning {f.relative_to(app_path)}...")
        result = scan_file(f)
        
        # Print secret findings
        for sf in result.get("secret_findings", []):
            print(format_finding(sf))
            all_findings.append({**sf, "file": str(f)})
        
        # Print AI summary (first 200 chars)
        ai = result.get("ai_analysis", "")
        if "NO FINDINGS" in ai:
            print(f"  ✓ No AI findings")
        elif ai.startswith("ERROR"):
            print(f"  ✗ {ai[:100]}")
        else:
            print(f"  [AI] {ai[:200]}...")
        
        print()
    
    return all_findings


def scan_estate():
    """Scan key estate infrastructure files."""
    targets = [
        HOME / "castle-api" / "worker.js",
        HOME / "github" / "cambridgetcg" / "rewardspro-production" / "shopify.app.toml",
        HOME / "github" / "cambridgetcg" / "rewardspro-production" / "vercel.json",
        HOME / "github" / "cambridgetcg" / "rewardspro-production" / "Dockerfile",
        HOME / "love-engine" / "replicate.py",
        HOME / "castle" / "understanding-engine.py",
    ]
    
    print(f"\n{'='*60}")
    print(f"  QWYTHOS ESTATE SCAN — Infrastructure")
    print(f"  {datetime.now().isoformat()}")
    print(f"{'='*60}\n")
    
    print(f"[*] Scanning {len(targets)} infrastructure files...\n")
    
    all_findings = []
    for f in targets:
        if not f.exists():
            print(f"[!] Not found: {f}")
            continue
        print(f"[*] Scanning {f.name}...")
        result = scan_file(f)
        
        for sf in result.get("secret_findings", []):
            print(format_finding(sf))
            all_findings.append({**sf, "file": str(f)})
        
        ai = result.get("ai_analysis", "")
        if "NO FINDINGS" in ai:
            print(f"  ✓ Clean")
        elif ai.startswith("ERROR"):
            print(f"  ✗ {ai[:100]}")
        else:
            print(f"  [AI] {ai[:300]}...")
        print()
    
    return all_findings


def generate_report(findings, output_path=None):
    """Generate a markdown security report."""
    if not output_path:
        output_path = HOME / "github" / "cambridgetcg" / "whitehack" / "reports" / f"QWYTHOS-ESTATE-{datetime.now().strftime('%Y%m%d-%H%M')}.md"
    
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w") as f:
        f.write(f"# Qwythos Estate Security Report\n\n")
        f.write(f"*Generated by Qwythos-9B, {datetime.now().isoformat()}*\n\n")
        f.write(f"*Scanner: qwythos-estate-scan.py*\n\n")
        f.write(f"---\n\n")
        
        if not findings:
            f.write("## No findings\n\nThe estate is clean. Love is. Security is love. ∞\n")
        else:
            f.write(f"## Summary\n\n")
            f.write(f"| Severity | Count |\n|----------|-------|\n")
            for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
                count = sum(1 for f_ in findings if f_.get("severity") == sev)
                if count:
                    f.write(f"| {sev} | {count} |\n")
            f.write(f"\n## Findings\n\n")
            for i, finding in enumerate(findings, 1):
                f.write(f"### Finding {i}: {finding.get('desc', 'Unknown')}\n\n")
                f.write(f"- **Severity:** {finding.get('severity', 'INFO')}\n")
                f.write(f"- **Type:** {finding.get('type', 'unknown')}\n")
                f.write(f"- **File:** `{finding.get('file', '?')}`\n")
                f.write(f"- **Line:** {finding.get('line', '?')}\n")
                if 'match' in finding:
                    f.write(f"- **Match:** `{finding['match']}`\n")
                f.write("\n")
        
        f.write(f"\n---\n\n*Qwythos-9B · WHITEHACK · Estate Security · Love is. Truth is. Security is love. ∞*\n")
    
    print(f"\n[✓] Report saved: {output_path}")
    return output_path


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Qwythos Estate Security Scanner — AI-powered vulnerability analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 qwythos-estate-scan.py ~/github/cambridgetcg/rewardspro-production/app/shopify.server.ts
  python3 qwythos-estate-scan.py ~/love-engine/ --quick
  python3 qwythos-estate-scan.py --rewardspro
  python3 qwythos-estate-scan.py --estate
  python3 qwythos-estate-scan.py ~/github/cambridgetcg/rewardspro-production/app/routes/ --quick
        """
    )
    parser.add_argument("target", nargs="?", help="File or directory to scan")
    parser.add_argument("--quick", action="store_true", help="Quick scan (fewer files, no deep AI)")
    parser.add_argument("--rewardspro", action="store_true", help="Scan RewardsPro production app")
    parser.add_argument("--estate", action="store_true", help="Scan estate infrastructure")
    parser.add_argument("--report", action="store_true", help="Summarize all Qwythos reports")
    
    args = parser.parse_args()
    
    all_findings = []
    
    if args.report:
        # Summarize all existing Qwythos reports in the reports directory
        reports_dir = Path(__file__).parent.parent / "reports"
        report_files = sorted(reports_dir.glob("QWYTHOS-*.md"))
        if not report_files:
            print(f"\n{'='*60}")
            print("  No Qwythos reports found in", reports_dir)
            print(f"{'='*60}")
            return

        print(f"\n{'='*60}")
        print(f"  QWYTHOS REPORT SUMMARY — {len(report_files)} reports")
        print(f"  {datetime.now().isoformat()}")
        print(f"{'='*60}\n")

        sev_pattern = re.compile(
            r"(?:Severity:\s*|###\s*\d+\.\s*)(CRITICAL|HIGH|MEDIUM|LOW|INFO)",
            re.IGNORECASE,
        )
        total_by_sev = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        total_vulns = 0
        affected_files = set()

        for rf in report_files:
            content = rf.read_text(errors="replace")
            # Count via both formats: "**Vulnerability #" and "### N. SEVERITY"
            vuln_count = content.count("**Vulnerability #")
            heading_matches = re.findall(
                r"###\s+\d+\.\s+(CRITICAL|HIGH|MEDIUM|LOW|INFO)", content, re.IGNORECASE
            )
            if vuln_count == 0 and heading_matches:
                vuln_count = len(heading_matches)
            total_vulns += vuln_count
            for m in sev_pattern.finditer(content):
                sev = m.group(1).upper()
                total_by_sev[sev] = total_by_sev.get(sev, 0) + 1
            # Try to extract the scanned file path (supports *File: `...` and *Target: ...*)
            file_match = re.search(r"\*(?:File|Target):\s*(?:`([^`]+)`|([^\n]+))\*", content)
            if file_match:
                affected_files.add(file_match.group(1) or file_match.group(2))
            status = "✓ Clean" if "No findings" in content else f"{vuln_count} finding(s)"
            print(f"  {rf.name:55s}  {status}")

        print(f"\n{'='*60}")
        print(f"  TOTAL VULNERABILITIES: {total_vulns}")
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            if total_by_sev.get(sev, 0):
                color = SEV_COLORS.get(sev, "")
                print(f"  {color}{sev}: {total_by_sev[sev]}{RESET}")
        if affected_files:
            print(f"  AFFECTED FILES: {len(affected_files)}")
        print(f"{'='*60}")
        return

    if args.rewardspro:
        all_findings.extend(scan_rewardspro())
    elif args.estate:
        all_findings.extend(scan_estate())
    elif args.target:
        target = Path(args.target).expanduser()
        if not target.exists():
            print(f"[!] Not found: {target}")
            sys.exit(1)
        
        print(f"\n{'='*60}")
        print(f"  QWYTHOS ESTATE SCAN — {target.name}")
        print(f"  {datetime.now().isoformat()}")
        print(f"{'='*60}\n")
        
        files = find_files(target, quick=args.quick)
        print(f"[*] Found {len(files)} files to scan\n")
        
        for i, f in enumerate(files, 1):
            print(f"[*] ({i}/{len(files)}) {f.name}...")
            result = scan_file(f)
            
            for sf in result.get("secret_findings", []):
                print(format_finding(sf))
                all_findings.append({**sf, "file": str(f)})
            
            ai = result.get("ai_analysis", "")
            if "NO FINDINGS" in ai:
                print(f"  ✓ Clean")
            elif ai.startswith("ERROR"):
                print(f"  ✗ {ai[:80]}")
            else:
                # Extract key findings from AI output
                for line in ai.split('\n'):
                    line = line.strip()
                    if any(w in line.upper() for w in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'VULNERABILITY', 'FINDING']):
                        print(f"  {line[:120]}")
            print()
    else:
        parser.print_help()
        return
    
    # Generate report
    if all_findings:
        print(f"\n{'='*60}")
        print(f"  TOTAL FINDINGS: {len(all_findings)}")
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            count = sum(1 for f in all_findings if f.get("severity") == sev)
            if count:
                color = SEV_COLORS.get(sev, "")
                print(f"  {color}{sev}: {count}{RESET}")
        print(f"{'='*60}")
    
    generate_report(all_findings)


if __name__ == "__main__":
    main()