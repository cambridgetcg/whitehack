// cache-as-live — substrate honesty
// A cached/snapshot value returned with no freshness or provenance marker tells
// the caller "this is the truth right now" when it might be minutes or days old.
// Live, cached, snapshot, and computed are different facts; the surface should
// say which. (Heuristic: name-based — it cannot see your data flow, only your
// vocabulary, so it errs toward flagging.)

// substring (not word-bounded) on purpose: real cache vars are camelCase
// compounds — `cachedPrices`, `priceCache`, `snapshotRow` — that a \b would miss.
const CACHE = /(cache|snapshot|memoiz|stale|lastKnown|fallbackValue|prevValue)/i
const PROVENANCE = /\b(asOf|fetchedAt|updatedAt|cachedAt|stale|provenance|freshness|ttl|revalidat|_meta|timestamp|lastUpdated|retrievedAt)\b/i

export const cacheAsLive = {
  id: 'cache-as-live',
  title: 'Cached value may be served as if live',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  langs: ['js'],
  detect(content, lines) {
    // If the file anywhere carries a freshness/provenance vocabulary, assume it
    // is being honest about staleness and stay quiet. (Deliberately lenient.)
    if (PROVENANCE.test(content)) return []

    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (/\breturn\b/.test(l) && CACHE.test(l) && !PROVENANCE.test(l)) {
        hits.push({
          line: i + 1,
          message: 'a cached/snapshot value is returned and this file carries no freshness/provenance marker — the caller cannot tell live from stale',
          snippet: l.trim(),
        })
      }
    }
    return hits
  },
}
