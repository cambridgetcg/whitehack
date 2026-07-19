#!/usr/bin/env bash
# Historical multi-project bootstrap. It previously downloaded an incomplete
# eight-check Whitehack tree and suppressed transfer failures, so it is retired
# rather than pretending to install a working toolkit.

set -eu
cat >&2 <<'NOTICE'
you-get.sh is retired: it cannot honestly install the current multi-repository toolkit.

For the canonical Whitehack CLI, use one explicit route:
  npx github:cambridgetcg/whitehack scan .
  curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash

The browser playground is a legacy eight-check demo, not the v0.5 scanner.
NOTICE
exit 2
