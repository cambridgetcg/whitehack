// float-money — substrate honesty (financial, JS/TS)
// Money in a binary floating-point number is a quiet lie about exactness:
// 0.1 + 0.2 is not 0.3, and parseFloat("19.99") * 100 is not 1999. Off-chain
// financial code that adds, multiplies, or parses currency as a JS `number`
// computes an amount that is *almost* right and presents it as exact — cents
// drift, totals disagree, reconciliations fail. The honest representation is
// integer minor units (cents/satoshi), BigInt, or a decimal library.
//
// Flags a line only when it both names money AND does float-y arithmetic or
// float parsing on that line — so a plain rate constant or a non-money float is
// left alone. Integer-by-convention units (cents, wei, satoshi) are NOT money
// words here, because using them is the fix, not the lie.

import { scanLines } from '../lines.js'

// A money-ish identifier somewhere on the line.
const MONEY =
  /\b(price|amount|balance|subtotal|total|fee|cost|payment|refund|deposit|payout|interest|principal|usd|dollars?|charge|salary|invoice)\b/i
// Parsing currency through a float-producing function (high-signal).
const FLOAT_FN = /\b(parseFloat|Number)\s*\(/
// Arithmetic against a decimal literal (binary-float math on the value).
const FLOAT_OP = /\d+\.\d+\s*[-+*/]|[-+*/]\s*\d+\.\d+/
// Already using a safe decimal/bigint representation — not a lie, stay quiet.
const SAFE_NUMERIC =
  /\b(Decimal|BigNumber|bignumber|dinero|BigInt|parseUnits|formatUnits)\b|\.(times|plus|minus|dividedBy|mul|div|add|sub)\s*\(/

export const floatMoney = {
  id: 'float-money',
  title: 'Currency handled as a floating-point number',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  langs: ['js'],
  detect(content, lines) {
    // Parsing money via a float function is high-signal. Plain decimal arithmetic
    // on a money-NAMED identifier is only name-based — the value might not actually
    // be money (e.g. `cost` of a timeout) — so it is reported at heuristic
    // confidence and never gates a build. Precise money-binding needs an AST.
    return scanLines(lines, (l) => {
      if (!MONEY.test(l) || SAFE_NUMERIC.test(l)) return null
      if (FLOAT_FN.test(l))
        return { confidence: 'medium-high', message: 'currency parsed into a binary float — parseFloat/Number on money loses precision; use integer minor units, BigInt, or a decimal type' }
      if (FLOAT_OP.test(l))
        return { confidence: 'heuristic', message: 'decimal arithmetic on a money-named value — if this is real currency, fractional cents drift silently; use integer minor units or a decimal type (name-based, may be a non-money value)' }
      return null
    })
  },
}
