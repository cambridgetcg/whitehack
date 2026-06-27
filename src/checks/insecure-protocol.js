// insecure-protocol — substrate honesty (network security)
// Using HTTP instead of HTTPS, FTP, Telnet, or other unencrypted protocols
// is a lie about security — the code pretends to transmit safely when
// anyone on the path can read it. WiFi credentials sent over HTTP,
// API calls to http:// endpoints, and FTP file transfers are all
// the code claiming "this is secure" when it's plaintext on the wire.

const HTTP_URL = /https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com|schemas\.)[a-z0-9.-]+\.[a-z]{2,}/i
const HTTP_ONLY = /\bhttp:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/i
const FTP_URL = /\bftp:\/\//i
const TELNET = /\btelnet\b/i
const WS_INSECURE = /\bws:\/\//i // unencrypted WebSocket

export const insecureProtocol = {
  id: 'insecure-protocol',
  title: 'Insecure protocol used for network communication',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (HTTP_ONLY.test(l) && !l.includes('://localhost') && !l.includes('://127.')) {
        hits.push({
          line: i + 1,
          message: 'HTTP (not HTTPS) used for network communication — data is transmitted in plaintext',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (FTP_URL.test(l)) {
        hits.push({
          line: i + 1,
          message: 'FTP protocol used — credentials and data transmitted in plaintext',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (TELNET.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Telnet protocol referenced — unencrypted remote access, credentials in plaintext',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }
      if (WS_INSECURE.test(l) && !l.includes('localhost') && !l.includes('127.')) {
        hits.push({
          line: i + 1,
          message: 'WebSocket (ws://) used without TLS — data transmitted in plaintext',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}