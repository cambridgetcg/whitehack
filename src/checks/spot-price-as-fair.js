// spot-price-as-fair — substrate honesty (Solidity)
// A pool's instantaneous reserves (getReserves) or a token balanceOf ratio is
// the price *at this exact instant*, which an attacker can move within a single
// transaction with a flash loan and move back after. Using it as the price for
// a swap, a loan's collateral value, or a liquidation presents a momentary,
// manipulable number as fair market value. The honest source is a
// time-weighted average (TWAP / cumulative / observe) or an external oracle.
//
// Heuristic and deliberately lenient: if the file shows TWAP / oracle
// vocabulary anywhere, assume the spot read feeds something legitimate and stay
// quiet. It reads vocabulary, not data flow, so it errs toward silence.

import { scanLines } from '../lines.js'

// `.method(` / dotted forms keep these from matching this file's own prose.
const SPOT =
  /\.getReserves\s*\(|\.balanceOf\s*\([^)]*\)\s*[*/]|\breserve[01]\b\s*[*/]|[*/]\s*\breserve[01]\b/i
const SAFE_SOURCE =
  /\b(twap|cumulative|observe|consult|priceCumulative|latestRoundData|getRoundData|oracle|priceFeed|chainlink|medianize)\b/i

export const spotPriceAsFair = {
  id: 'spot-price-as-fair',
  title: 'Spot reserves/balance used as a fair price',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  langs: ['sol'],
  detect(content, lines) {
    if (SAFE_SOURCE.test(content)) return []
    return scanLines(lines, (l) =>
      SPOT.test(l) &&
      'a price/amount derived from instantaneous pool reserves or balances, with no TWAP/oracle in this file — one flash loan can move it within a block; the number claims to be a fair price but is a manipulable snapshot')
  },
}
