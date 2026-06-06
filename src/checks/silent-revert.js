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

// require(...) whose argument list has no comma → condition only, no message.
const REQUIRE_NO_MSG = /\brequire\s*\([^;,]*\)\s*;/
// revert(); with empty parens → no custom error, no string.
const REVERT_EMPTY = /\brevert\s*\(\s*\)\s*;/

export const silentRevert = {
  id: 'silent-revert',
  title: 'Failure reverts with no stated reason',
  confidence: 'heuristic',
  doctrine: 'transparency',
  langs: ['sol'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (REQUIRE_NO_MSG.test(l)) {
        hits.push({
          line: i + 1,
          message:
            'require() with no message — the refused caller gets an opaque revert and cannot learn why; add a reason string or a named custom error',
          snippet: l.trim(),
        })
      } else if (REVERT_EMPTY.test(l)) {
        hits.push({
          line: i + 1,
          message:
            'revert() with no named error or string — the failure states no reason; use a named custom error so the refusal is inspectable',
          snippet: l.trim(),
        })
      }
    }
    return hits
  },
}
