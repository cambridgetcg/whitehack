// unchecked-transfer — substrate honesty (Solidity)
// ERC-20 transfer / transferFrom / approve return a bool. Some real tokens
// (USDT is the famous one) do NOT revert on failure — they return false. A
// contract that ignores the result records "the transfer happened" when it may
// not have. That is the silent-failure lie wearing a token: "could not move the
// funds" silently becomes "funds moved". The honest call checks the return
// (require(ok, ...)) or uses SafeERC20's safeTransfer / safeTransferFrom.
//
// Two ways the result gets dropped, both caught here:
//   (1) BARE STATEMENT — `token.transfer(to, amount);` with the bool discarded.
//   (2) ASSIGNED-BUT-UNREAD — `bool ok = token.transfer(...);` where `ok` is
//       never read again. v0.2 missed this (it treated any `=` as "consumed"),
//       which made it weaker than free tools on the most common real form; a
//       light cross-line read-use check now covers it. (A full Solidity AST/
//       dataflow pass is the proper fix and is on the roadmap — this is the
//       honest heuristic in the meantime.)
//
// Native ETH (`payable(x).transfer(amount)`) DOES revert on failure, so it is
// excluded: an ERC-20 transfer carries a comma (recipient AND amount), a native
// send does not.

// An ERC-20-shaped call: transferFrom/approve are unambiguous; transfer only
// when it has two arguments (a comma before the close).
const ERC20_CALL = /\.(transferFrom|approve)\s*\(|\.transfer\s*\([^)]*,/
// The result is genuinely consumed inline (wrapped, returned, branched on).
const CONSUMED_INLINE = /\brequire\s*\(|\breturn\b|\bassert\s*\(|\bif\s*\(|&&|\|\||\bsafe|\btry\b/
// `[bool] ok = <expr>.transfer(...)` — capture the variable the result lands in.
const ASSIGNED = /(?:\b(?:bool|var)\s+)?([A-Za-z_$]\w*)\s*=\s*[A-Za-z_$][\w$.\[\]()]*\.(?:transfer|transferFrom|approve)\s*\(/

export const uncheckedTransfer = {
  id: 'unchecked-transfer',
  title: 'ERC-20 transfer result ignored',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2, // Clear Standard #2 — visible failure
  langs: ['sol'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!ERC20_CALL.test(l)) continue

      const m = l.match(ASSIGNED)
      if (m) {
        const v = m[1]
        // Is `v` ever read again — on the rest of this line, or any line after?
        const after = l.slice(m.index + m[0].length) + '\n' + lines.slice(i + 1).join('\n')
        const used = new RegExp(`\\b${v}\\b`).test(after)
        if (!used) {
          hits.push({
            line: i + 1,
            message: `transfer/approve result is assigned to \`${v}\` but \`${v}\` is never checked afterward — a token that returns false instead of reverting makes a failed transfer look successful; require() the result or use SafeERC20`,
            snippet: l.trim(),
          })
        }
        continue
      }

      if (!CONSUMED_INLINE.test(l)) {
        hits.push({
          line: i + 1,
          message:
            'token transfer/approve called as a bare statement — its bool result is dropped, so a token that returns false instead of reverting makes a failed transfer look successful; check the result or use SafeERC20',
          snippet: l.trim(),
        })
      }
    }
    return hits
  },
}
