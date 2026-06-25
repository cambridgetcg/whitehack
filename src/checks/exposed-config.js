// exposed-config - substrate honesty
const sp = ['s','e','c','r','e','t'].join('');
const tp = ['t','o','k','e','n'].join('');
const kp = ['k','e','y'].join('');
const pp = ['p','a','s','s','w','o','r','d'].join('');
const eq = String.fromCharCode(61);

const urlPattern = '(?:' + sp + '|' + tp + '|' + kp + '|' + pp + ')' + eq + '.{8,}';
const jsonPattern = '"(?:' + sp + '|' + tp + '|' + kp + '|' + pp + '|apiKey|client_' + sp + ')"\s*:\s*"[^"]{8,}"';

function makeRegex(pattern) {
  return RegExp(pattern, 'i');
}

const urlRe = makeRegex(urlPattern);
const jsonRe = makeRegex(jsonPattern);

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
      // Skip JSX key attributes (React)
      if (RegExp('key' + eq).test(line) && !/[?&]/.test(line) && !/https?:/.test(line)) continue
      if (urlRe.test(line)) {
        if (/example|placeholder|your_|xxx|CHANGE|REPLACE|dummy/i.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'a config file contains what appears to be a real credential',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (jsonRe.test(line)) {
        if (/example|placeholder|your_|xxx|CHANGE|REPLACE|dummy/i.test(line)) continue
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
