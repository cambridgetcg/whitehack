// stale-oracle — substrate honesty (Solidity)
// A price feed answers "here is the price" — but a feed can be hours old, or
// frozen, or reporting a round that never closed. A contract that reads the
// answer without checking how fresh it is turns "the price as of some unknown
// past moment" into "the price right now". Markets have been drained on exactly
// this lie. The honest read validates updatedAt / answeredInRound (and reverts
// or degrades visibly when the feed is stale), instead of trusting the number.
//
// Two shapes are caught:
//   • deprecated getters (latestAnswer / getAnswer) that return ONLY a number,
//     with no round or timestamp — staleness is not merely unchecked, it is
//     uncheckable. Always flagged.
//   • latestRoundData / getRoundData where this file never mentions any
//     freshness vocabulary at all — the round data is read and the staleness
//     fields are presumably dropped on the floor. Flagged unless the file shows
//     it is doing staleness work somewhere (heuristic, deliberately lenient).

// `.method(` call form — the leading dot keeps these from matching the bare
// words in this file's own comments and alternation lists.
const DEPRECATED = /\.(latestAnswer|getAnswer)\s*\(/
const ROUND_DATA = /\.(latestRoundData|getRoundData)\s*\(/

// If the file does ANY of this, assume it handles freshness and stay quiet.
const STALENESS =
  /\b(updatedAt|answeredInRound|roundId|staleness|stale|heartbeat|sequencer|secondsSince|maxAge|maxDelay|maxStale)\b|block\.timestamp\s*-/i

export const staleOracle = {
  id: 'stale-oracle',
  title: 'Price feed read without a staleness check',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 4, // Clear Standard #4 — stated freshness
  langs: ['sol'],
  detect(content, lines) {
    const hits = []
    // Staleness must be handled NEAR the feed read, not anywhere in the file.
    // v0.2 checked the whole file, so a single unrelated mention of (say)
    // "heartbeat" silenced every feed read — trivially defeated, and a source
    // of false-negatives. Scope to a window around the call instead. (A proper
    // same-function/dataflow scope via AST is on the roadmap.)
    const handledNear = (i) => {
      const lo = Math.max(0, i - 3)
      const hi = Math.min(lines.length, i + 16)
      for (let j = lo; j < hi; j++) if (STALENESS.test(lines[j])) return true
      return false
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      if (DEPRECATED.test(l)) {
        hits.push({
          line: i + 1,
          message:
            'deprecated price getter returns only a number — no round or timestamp, so staleness is uncheckable; an old or frozen price is served as current',
          snippet: l.trim(),
        })
        continue
      }

      if (ROUND_DATA.test(l) && !handledNear(i)) {
        hits.push({
          line: i + 1,
          message:
            'price feed read but this file never validates updatedAt / answeredInRound — a stale or halted feed is handed back as a live price',
          snippet: l.trim(),
        })
      }
    }
    return hits
  },
}
