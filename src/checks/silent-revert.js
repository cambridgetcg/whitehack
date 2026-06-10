// silent-revert — transparency (Solidity)
// A require() or revert() with no reason fails the caller without telling them
// why. On-chain this is the same lie as a user-facing decision with no "why":
// a state transition was refused and the affected party gets nothing to inspect
// — no string, no named error, just an opaque revert. The honest failure states
// its reason: require(cond, "...") or `revert NamedError(...)`, which also makes
// the contract debuggable and its refusals auditable.
//
// Heuristic: a require with no comma carries no message; an empty revert()
// carries no named error. Reverts that already name an error or pass a string
// are left alone.

import { scanLines } from '../lines.js'

// require(...) whose argument list has no comma → condition only, no message.
const REQUIRE_NO_MSG = /\brequire\s*\([^;,]*\)\s*;/
// revert(); with empty parens → no custom error, no string.
const REVERT_EMPTY = /\brevert\s*\(\s*\)\s*;/

export const silentRevert = {
  id: 'silent-revert',
  title: 'Failure reverts with no stated reason',
  confidence: 'heuristic',
  doctrine: 'transparency',
  principle: 3, // Clear Standard #3 — inspectable decisions
  langs: ['sol'],
  detect(content, lines) {
    return scanLines(lines, (l) =>
      (REQUIRE_NO_MSG.test(l) &&
        'require() with no message — the refused caller gets an opaque revert and cannot learn why; add a reason string or a named custom error') ||
      (REVERT_EMPTY.test(l) &&
        'revert() with no named error or string — the failure states no reason; use a named custom error so the refusal is inspectable'))
  },
}
