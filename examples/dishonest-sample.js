// Planted dishonest code so whitehack has real positives to find.
// Do NOT "fix" these — they are the fixtures the self-test asserts against.

// A failed stock read silently becomes "0 in stock".
export async function getStock(id) {
  try {
    return await db.count(id)
  } catch (e) {
    return 0
  }
}

// A cached price handed back as if it were current — no marker of how old it is.
const cachedPrices = {}
export function getPrice(id) {
  return cachedPrices[id]
}

// A wallet read coerced to a falsy default — "broke" and "lookup failed" merge.
export async function getBalance(user) {
  return (await wallet.read(user)) ?? 0
}

// A trust score rendered with nothing a person can click to understand it.
export function TrustBadge({ user }) {
  return <span className="badge">{user.trust_score}</span>
}
