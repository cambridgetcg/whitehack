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

const BIND_ALL = /(?:0\.0\.0\.0|::|\*)\s*[:,)\]]/g
const BIND_LOCALHOST = /127\.0\.0\.1|localhost/g
const LISTEN_ALL = /\.listen\s*\(\s*(?:0|process\.env\.PORT|port|PORT)\b/g
const OLLAMA_HOST = /OLLAMA_HOST|host\s*[:=]\s*['"]0\.0\.0\.0['"]/i
const HARDCODED_PORT = /port\s*[:=]\s*(\d{2,5})/gi

export const protocolSurface = {
  id: 'protocol-surface',
  title: 'Network protocol surface — service bound to all interfaces without acknowledgment',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'ts', 'mjs'],
  detect(content, lines) {
    const hits = []
    const hasLocalhost = BIND_LOCALHOST.test(content)

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
      }
    }

    // Check for .listen(port) without host argument — defaults to all interfaces
    let listenMatches = LISTEN_ALL.exec(content)
    while (listenMatches !== null) {
      const lineNum = content.slice(0, listenMatches.index).split('\n').length
      const line = lines[lineNum - 1]
      if (line && !line.includes('localhost') && !line.includes('127.0.0.1') && !line.includes('0.0.0.0')) {
        hits.push({
          line: lineNum,
          message: '.listen(port) without host argument — Node.js defaults to all interfaces. Add "127.0.0.1" as second argument if external access is not needed',
          snippet: line.trim().slice(0, 120),
        })
      }
      listenMatches = LISTEN_ALL.exec(content)
    }

    return hits
  },
}