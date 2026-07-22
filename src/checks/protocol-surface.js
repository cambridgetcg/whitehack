// protocol-surface — substrate honesty (network protocol exposure)
// Scans for code that exposes network services without acknowledging the risk.
//
// The device has these ports listening on ALL interfaces (0.0.0.0):
//   :7777  — bun (custom server, anyone on the network can connect)
//   :777   — node (custom server)
//   :11434 — ollama (AI inference API — anyone can run inference!)
//   :22000 — syncthing (file sync — anyone can see shared folders)
//   :8770  — sharingd (AirDrop/Continuity)
//
// This check flags code that binds to 0.0.0.0 or :: (all interfaces)
// instead of 127.0.0.1 (localhost only) without acknowledging the exposure.
//
// Love is understanding. There is no fear in understanding.
// We don't hide from the network. We understand it. We bind to localhost
// when we don't need external access. We acknowledge when we do.

// Match 0.0.0.0 or :: as a bind target. The \b prevents matching
// 0.0.0.0 inside longer strings like UUIDs or hex. The :: must be
// preceded by whitespace, quote, or start-of-string to avoid matching
// it inside ::nsmiddleware, :::stardust, or other double-colon syntax.
// Removed bare \* — it matched `*]`, `*:`, `*)` in regex syntax, markdown
// bold (**Word**), and route patterns ([a-z]*$), none of which are bind calls.
const BIND_ALL = /(?:\b0\.0\.0\.0\b|(?<=^|[\s'"`{(,])::(?:[,)\]\s}"`]|$))/
const LISTEN_ALL = /\.listen\s*\(\s*(?:0|process\.env\.PORT|port|PORT)\b/
const OLLAMA_HOST = /OLLAMA_HOST|host\s*[:=]\s*['"]0\.0\.0\.0['"]/i

export const protocolSurface = {
  id: 'protocol-surface',
  title: 'Network protocol surface — service bound to all interfaces without acknowledgment',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'ts', 'mjs'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // Binding to 0.0.0.0 or :: without mentioning localhost or security
      if (BIND_ALL.test(l) && !l.includes('localhost') && !l.includes('127.0.0.1') && !l.includes('//') && !l.includes('secure')) {
        hits.push({
          line: i + 1,
          message: 'Service bound to all interfaces (0.0.0.0/::) — anyone on the local network can connect. Bind to 127.0.0.1 if external access is not needed',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // OLLAMA_HOST set to 0.0.0.0 — exposes AI inference to the network
      if (OLLAMA_HOST.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Ollama bound to 0.0.0.0 — AI inference API exposed to the entire local network. Anyone can run model inference. Bind to 127.0.0.1 unless you have a firewall',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // .listen(port) without a host defaults to all interfaces. Check each
      // line independently so line calculation stays linear in input size.
      if (LISTEN_ALL.test(l) && !l.includes('localhost') && !l.includes('127.0.0.1') && !l.includes('0.0.0.0')) {
        hits.push({
          line: i + 1,
          message: '.listen(port) without host argument — Node.js defaults to all interfaces. Add "127.0.0.1" as second argument if external access is not needed',
          snippet: l.trim().slice(0, 120),
        })
      }
    }

    return hits
  },
}
