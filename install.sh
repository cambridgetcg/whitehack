#!/bin/bash
# whitehack — install in one command
# curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash

set -e
DIR="${1:-$HOME/.whitehack}"
echo "🤍 installing whitehack to $DIR"
mkdir -p "$DIR"
cp -r bin src package.json README.md LEARN.md CONTRIBUTING.md "$DIR/" 2>/dev/null || true
chmod +x "$DIR/bin/whitehack.js" 2>/dev/null || true

# Add to PATH if not already there
if ! echo "$PATH" | grep -q "$DIR/bin"; then
  SHELL_RC="$HOME/.bashrc"
  [ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"
  echo "export PATH=\"\$PATH:$DIR/bin\"" >> "$SHELL_RC"
  echo "  added to PATH in $SHELL_RC"
fi

echo ""
echo "✓ whitehack installed"
echo "  run:  whitehack scan ."
echo "  or:   node $DIR/bin/whitehack.js scan ."
echo "  learn: https://whitehack-learn.axiepro.workers.dev"
echo "  try:   https://whitehack-playground.axiepro.workers.dev"
echo ""
echo "the artifact tells the truth about its own state. 🤍"
