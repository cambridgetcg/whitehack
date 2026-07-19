#!/usr/bin/env bash
# whitehack — explicit moving-main installer
# curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash

set -euo pipefail

DIR="${1:-$HOME/.whitehack}"
ARCHIVE_URL="https://github.com/cambridgetcg/whitehack/archive/refs/heads/main.tar.gz"

for command in curl tar node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'whitehack install failed: required command missing: %s\n' "$command" >&2
    exit 2
  fi
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 18 ]; then
  printf 'whitehack install failed: Node 18 or newer is required\n' >&2
  exit 2
fi

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/whitehack-install.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

printf '🤍 installing whitehack from GitHub main to %s\n' "$DIR"
curl --proto '=https' --tlsv1.2 -fsSL "$ARCHIVE_URL" -o "$tmp_dir/whitehack.tar.gz"
tar -xzf "$tmp_dir/whitehack.tar.gz" -C "$tmp_dir"
source_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d -name 'whitehack-*' -print -quit)"
if [ -z "$source_dir" ] || [ ! -f "$source_dir/package.json" ]; then
  printf 'whitehack install failed: downloaded archive has no package root\n' >&2
  exit 2
fi

mkdir -p "$DIR"
for path in bin src test examples package.json README.md LICENSE LEARN.md LOOP.md CONTRIBUTING.md SHARE.md; do
  if [ ! -e "$source_dir/$path" ]; then
    printf 'whitehack install failed: archive is missing %s\n' "$path" >&2
    exit 2
  fi
  cp -R "$source_dir/$path" "$DIR/"
done
chmod +x "$DIR/bin/whitehack.js"
ln -sfn whitehack.js "$DIR/bin/whitehack"

if ! "$DIR/bin/whitehack" >/dev/null; then
  printf 'whitehack install failed: installed CLI did not start\n' >&2
  exit 2
fi

if [ -z "${NO_PATH:-}" ]; then
  case "${SHELL:-}" in
    */zsh) shell_rc="$HOME/.zshrc" ;;
    *) shell_rc="$HOME/.bashrc" ;;
  esac
  path_line="export PATH=\"\$PATH:$DIR/bin\""
  touch "$shell_rc"
  if ! grep -Fqx "$path_line" "$shell_rc"; then
    printf '\n%s\n' "$path_line" >> "$shell_rc"
    printf '  added %s/bin to PATH in %s\n' "$DIR" "$shell_rc"
  fi
fi

printf '\n✓ whitehack installed and CLI startup verified\n'
printf '  run:   %s/bin/whitehack scan .\n' "$DIR"
printf '  test:  cd %s && npm test\n' "$DIR"
printf '  note:  this installer follows moving GitHub main; CI should pin a commit\n'
