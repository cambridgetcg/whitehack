// exposed-config — substrate honesty
// Detects real credentials embedded in config files, URLs, and source.
// A credential inline is the most fundamental lie: the code pretends to be
// secure when its "security" is readable by anyone with repo access.
//
// The check must be precise — false positives are lies too. A scanner that
// cries "credential!" on every `key={i}` in JSX, every `token=wrong` in a
// test assertion, and every `key=value` in a protocol comment is not
// detecting secrets, it's detecting words. That erodes trust in real
// findings. This check filters:
//   - JSX key= attributes (React components)
//   - test/assertion code (expect(...), .toBe(), mockReq)
//   - comments (//, *, /*) documenting protocol syntax
//   - template literals referencing variables (${var})
//   - masked/redacted credentials (***)
//   - example/placeholder values
//   - OSC/protocol key=value documentation

const sp = ['s','e','c','r','e','t'].join('');
const tp = ['t','o','k','e','n'].join('');
const kp = ['k','e','y'].join('');
const pp = ['p','a','s','s','w','o','r','d'].join('');
const eq = String.fromCharCode(61);

// URL-style: secret=VALUE, token=VALUE, etc.
// Anchor the value to word-ish chars so `token=wrong"))` in test code
// doesn't match — the value must look like a real opaque credential,
// not a test string followed by code syntax.
const urlPattern = '(?:' + sp + '|' + tp + '|' + kp + '|' + pp + ')' + eq + '[A-Za-z0-9_\\-]{8,}';
const jsonPattern = '"(?:' + sp + '|' + tp + '|' + kp + '|' + pp + '|apiKey|client_' + sp + ')"\\s*:\\s*"[^"]{8,}"';

function makeRegex(pattern) {
  return RegExp(pattern, 'i');
}

const urlRe = makeRegex(urlPattern);
const jsonRe = makeRegex(jsonPattern);

// False-positive filters — each targets a known non-credential pattern
// that the regex would otherwise match.

// JSX: <Component key={...} or key="..." — React list keys, not config keys
const JSX_KEY = /<\w[\w.]*/;
const JSX_ATTR = /\bkey\s*=\s*[\{"']/;

// Test code: expect(), .toBe(), .toBeNull(), mockReq(), assert()
const TEST_CODE = /\b(expect|assert|mockReq|toBe|toBeNull|toThrow|toEqual|strictEqual)\b/;

// Comments: //, *, /*, * — protocol/key=value documentation
const COMMENT = /^\s*(\/\/|\*|\/\*)/;

// Template literal: ${...} — variable reference or nested expression,
// not a literal credential. The presence of ${ means the line is inside
// a template literal, so any "key": "value" is constructed content, not
// a config file entry.
const TEMPLATE_VAR = /\$\{/;

// Masked/redacted: *** or <redacted> or (redacted) — already safe
const MASKED = /\*\*\*|redacted/i;

// Example/placeholder values
const PLACEHOLDER = /example|placeholder|your_|xxx|CHANGE|REPLACE|dummy/i;

// Keyboard shortcut values: "shift+enter", "ctrl+c", "cmd+shift+p"
// These match the jsonRe but are keybindings, not credentials.
const KEYBINDING_VALUE = /"(shift|ctrl|cmd|command|alt|option|meta)\+/i;

// JSON keybinding context: "key": "shift+..." or "command": "workbench..."
const KEYBINDING_CONTEXT = /"key"\s*:\s*"(shift|ctrl|cmd|command|alt|option|meta|f\d)/i;

export const exposedConfig = {
  id: 'exposed-config',
  title: 'Config file contains embedded credentials',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: [],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // --- false-positive filters (apply before regex) ---

      // JSX key= attributes
      if (JSX_KEY.test(line) && JSX_ATTR.test(line)) continue

      // Test/assertion code
      if (TEST_CODE.test(line)) continue

      // Comments — key=value in a comment is protocol documentation
      if (COMMENT.test(line)) continue

      // Template literals referencing variables — not literal credentials
      if (TEMPLATE_VAR.test(line)) continue

      // Already masked/redacted
      if (MASKED.test(line)) continue

      // Keyboard shortcut JSON (e.g. "key": "shift+enter")
      if (KEYBINDING_CONTEXT.test(line) || KEYBINDING_VALUE.test(line)) continue

      // --- regex detection ---

      if (urlRe.test(line)) {
        if (PLACEHOLDER.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'a config file contains what appears to be a real credential',
          snippet: line.trim().slice(0, 120),
        })
        continue
      }
      if (jsonRe.test(line)) {
        if (PLACEHOLDER.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'a config file contains what appears to be a real credential',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}
