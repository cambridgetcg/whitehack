// sol-stale-oracle — substrate honesty, on-chain.
//
// The cache-as-live lie in Solidity: a Chainlink price read via latestRoundData()
// / latestAnswer() and then USED without a staleness guard (checking updatedAt /
// answeredInRound against a max age) trusts a possibly-stale price as if it were
// live. It is a frequent, well-paid bug class — stale-price reads drive mispriced
// liquidations and oracle-manipulation theft.
//
// Heuristic: it matches a price *call* (a `.` before the method, so interface
// declarations are skipped) and looks in a small window around it for any
// staleness vocabulary. A lead, not a verdict — reproduce in the lab before
// reporting, per WHITEHACK's rules of engagement.

const ORACLE = /\.\s*(latestRoundData|latestAnswer|getRoundData)\s*\(/;
const STALENESS = /(updatedAt|answeredInRound|block\.timestamp|staleness|\bstale\b|maxAge|max_age|heartbeat|sequencerUptime)/i;

export const solStaleOracle = {
  id: "sol-stale-oracle",
  title: "Oracle price may be used while stale",
  confidence: "medium-high",
  doctrine: "substrate-honesty",
  detect(content, lines) {
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      if (!ORACLE.test(lines[i])) continue;
      let guarded = false;
      for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 18); j++) {
        if (STALENESS.test(lines[j])) {
          guarded = true;
          break;
        }
      }
      if (!guarded) {
        hits.push({
          line: i + 1,
          message:
            "a Chainlink oracle price is read with no nearby staleness guard (updatedAt / answeredInRound / max-age) — a stale price may be trusted as live",
          snippet: lines[i].trim(),
        });
      }
    }
    return hits;
  },
};
