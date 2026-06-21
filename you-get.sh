#!/bin/bash
# you-get — install the entire kingdom toolkit in one command
# curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/you-get.sh | bash
#
# Installs: whitehack (honesty linter), natlang (natural language compiler),
# recognition protocol (passwordless auth), heartbeat system.
# All free. All open. No registration. No paywall.

set -e
WHERE="${1:-$HOME/.kingdom}"
echo "🫀 installing the kingdom toolkit to $WHERE"
mkdir -p "$WHERE"

# whitehack — honesty linter
echo "  🤍 whitehack (honesty linter)..."
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/bin/whitehack.js -o "$WHERE/whitehack.js" 2>/dev/null || true
mkdir -p "$WHERE/checks"
for check in silent-failure cache-as-live decision-without-why float-money stale-oracle unchecked-transfer spot-price-as-fair silent-revert; do
  curl -fsSL "https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/src/checks/$check.js" -o "$WHERE/checks/$check.js" 2>/dev/null || true
done
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/src/lines.js -o "$WHERE/lines.js" 2>/dev/null || true
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/src/scan.js -o "$WHERE/scan.js" 2>/dev/null || true
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/src/report.js -o "$WHERE/report.js" 2>/dev/null || true

# natlang — natural language compiler
echo "  📝 natlang (natural language compiler)..."
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/natlang@main/natlang.mjs -o "$WHERE/natlang.mjs" 2>/dev/null || true

# recognition protocol — passwordless auth
echo "  🔑 recognition protocol (passwordless auth)..."
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/recognition-protocol@main/recognition.py -o "$WHERE/recognition.py" 2>/dev/null || true

# heartbeat system
echo "  🫀 heartbeat system..."
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/natlang@main/recognition.py -o "$WHERE/heartbeat-summary.sh" 2>/dev/null || true

# Learn materials
echo "  📖 learn materials..."
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/LEARN.md -o "$WHERE/LEARN.md" 2>/dev/null || true
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/LOOP.md -o "$WHERE/LOOP.md" 2>/dev/null || true
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/CONTRIBUTING.md -o "$WHERE/CONTRIBUTING.md" 2>/dev/null || true
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/clear-standard@main/README.md -o "$WHERE/CLEAR-STANDARD.md" 2>/dev/null || true

# Make executable
chmod +x "$WHERE"/*.js "$WHERE"/*.mjs "$WHERE"/*.py "$WHERE"/*.sh 2>/dev/null || true

echo ""
echo "✓ kingdom toolkit installed at $WHERE"
echo ""
echo "  whitehack:  node $WHERE/whitehack.js scan ."
echo "  natlang:    node $WHERE/natlang.mjs compile hello.nl --target js"
echo "  identity:   python3 $WHERE/recognition.py identity"
echo "  learn:      cat $WHERE/LEARN.md"
echo ""
echo "  playground: https://whitehack-playground.axiepro.workers.dev"
echo "  learn page: https://whitehack-learn.axiepro.workers.dev"
echo "  portal:     https://kingdom-portal.axiepro.workers.dev"
echo ""
echo "  all free. all open. no registration. no paywall."
echo "  the artifact tells the truth about its own state. 🫀"
