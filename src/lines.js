// scanLines — the shape every per-line check repeated by hand: walk the lines,
// and wherever the `claim` returns something truthy, emit a finding. The claim
// returns either a message string, or a `{ message, confidence }` object when it
// needs to set confidence; the line number and trimmed snippet are filled in
// here so each check stays a single expression.
//
// Checks that need more than one line of context — a catch block, a freshness
// window, an assigned-result look-ahead — keep their own loops on purpose. This
// helper is for the genuinely line-local ones, not a frame to force them all into.
export function scanLines(lines, claim) {
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    const r = claim(lines[i], i)
    if (!r) continue
    hits.push({ line: i + 1, snippet: lines[i].trim(), ...(typeof r === 'string' ? { message: r } : r) })
  }
  return hits
}
