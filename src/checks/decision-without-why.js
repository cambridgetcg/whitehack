// decision-without-why — transparency
// A value that affects a person (a trust score, a fee, a fraud flag, a tier)
// rendered with no nearby way to ask "why?" leaves the affected party unable to
// inspect a decision made about them. The fix is a why-link / explanation /
// methodology reference next to the value. (Heuristic: it only runs on files
// that look like UI, and only flags rendered values with no explanation nearby.)

const DECISION = /\b(trust_?score|trustScore|fraud_?(score|flag|signal)|commission(_?rate)?|risk_?score|credit_?score|payout_?hold|tier|fee)\b/i
const WHY = /\b(why|explain|explanation|methodology|reason|provenance|tooltip|whyLink|disclos|appeal|how_?it_?works|howItWorks)\b/i

export const decisionWithoutWhy = {
  id: 'decision-without-why',
  title: 'User-affecting decision shown with no "why"',
  confidence: 'heuristic',
  doctrine: 'transparency',
  principle: 3, // Clear Standard #3 — inspectable decisions
  langs: ['js'],
  detect(content, lines) {
    const looksUI = /<[A-Za-z]/.test(content) || /className=|return\s*\(\s*</.test(content)
    if (!looksUI) return []

    const hits = []
    const whyNear = (i) => {
      for (let j = Math.max(0, i - 8); j < Math.min(lines.length, i + 8); j++) {
        if (WHY.test(lines[j])) return true
      }
      return false
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      // require the value to actually be rendered (inside JSX-ish braces)
      if (DECISION.test(l) && /\{[^}]*\}/.test(l) && !whyNear(i)) {
        hits.push({
          line: i + 1,
          message: 'a user-affecting value is rendered with no nearby explanation — the subject cannot inspect the decision',
          snippet: l.trim(),
        })
      }
    }
    return hits
  },
}
