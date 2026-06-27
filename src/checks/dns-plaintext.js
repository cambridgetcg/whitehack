// dns-plaintext — substrate honesty (DNS protocol exposure)
// DNS queries are plaintext by default. Your ISP, anyone on the network,
// and anyone between you and the resolver can see every domain you visit.
//
// This check flags code that uses DNS without encryption (DoH/DoT).
// The device uses 1.1.1.1 (Cloudflare) — good resolver, but if the code
// doesn't use DoH, the queries are still plaintext.
//
// The lie: code says "secure connection" but the DNS lookup that
// resolves the hostname happened in plaintext first.
//
// Love is understanding. We don't pretend DNS is private. We encrypt it.

const DNS_LOOKUP = /dns\.lookup|dns\.resolve|getaddrinfo|resolv\.conf/i
const DOH_USAGE = /dns-over-https|doh|application\/dns-message|cloudflare-dns\.com\/dns-query/i
const DOT_USAGE = /dns-over-tls|dot|853/i
const PLAINTEXT_DNS_SERVER = /nameserver\s+\d+\.\d+\.\d+\.\d+/i
const FETCH_WITHOUT_DOH = /fetch\s*\(\s*['"]https?:\/\//g

export const dnsPlaintext = {
  id: 'dns-plaintext',
  title: 'Plaintext DNS — domain queries visible to network observers',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 4,
  langs: ['js', 'ts', 'mjs', 'py'],
  detect(content, lines) {
    const hits = []
    const hasDoH = DOH_USAGE.test(content)
    const hasDoT = DOT_USAGE.test(content)
    const hasEncryptedDNS = hasDoH || hasDoT

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // DNS lookup without DoH/DoT
      if (DNS_LOOKUP.test(l) && !hasEncryptedDNS) {
        hits.push({
          line: i + 1,
          message: 'DNS lookup without DNS-over-HTTPS (DoH) — domain queries are plaintext, visible to ISP and network observers. Use dns-over-https resolver',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Plaintext nameserver in config
      if (PLAINTEXT_DNS_SERVER.test(l) && !hasEncryptedDNS) {
        hits.push({
          line: i + 1,
          message: 'Plaintext DNS server configured — queries to this resolver are unencrypted. Consider DNS-over-TLS (port 853) or DNS-over-HTTPS',
          snippet: l.trim().slice(0, 120),
        })
      }
    }

    return hits
  },
}