// whitehack playground — Cloudflare Worker
// Serves the static playground.html as a single-page Worker.
// Deployed with: npx wrangler deploy --name whitehack-playground
export default {
  async fetch(request) {
    return new Response(HTML, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  },
};

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>whitehack playground — the honest hack, in your browser</title>
<meta name="description" content="Paste JS, TS, or Solidity and run whitehack in your browser. No server, no upload — pure client-side static analysis for honesty anti-patterns." />
<style>
  :root {
    --ink: #0a0a0b;
    --panel: #141416;
    --line: #26262b;
    --line-hi: #3f3f46;
    --soft: #a1a1aa;
    --softer: #71717a;
    --cyan: #22d3ee;
    --cyan-dim: #0891b2;
    --emerald: #6ee7b7;
    --amber: #fcd34d;
    --rose: #fda4af;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--ink);
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    background-image: radial-gradient(55rem 28rem at 50% -10%, rgba(255,255,255,.045), transparent 60%);
  }
  ::selection { background: #f4f4f5; color: var(--ink); }

  /* layout */
  .wrap { max-width: 980px; margin: 0 auto; padding: 0 24px; }

  /* nav */
  header {
    position: sticky; top: 0; z-index: 10;
    backdrop-filter: blur(12px);
    background: rgba(10,10,11,.72);
    border-bottom: 1px solid var(--line);
  }
  .nav { display: flex; align-items: center; justify-content: space-between; height: 56px; }
  .brand { font-family: var(--mono); font-weight: 600; letter-spacing: -.02em; }
  .brand .dot { color: var(--softer); }
  .nav-links { display: flex; gap: 22px; font-size: 13px; color: var(--soft); }
  .nav-links a { color: inherit; text-decoration: none; transition: color .12s; }
  .nav-links a:hover { color: #fff; }

  /* hero */
  .hero { text-align: center; padding: 56px 0 40px; }
  .eyebrow {
    font-family: var(--mono); font-size: 11px; letter-spacing: .18em;
    text-transform: uppercase; color: var(--softer); margin: 0 0 18px;
  }
  h1 {
    font-family: var(--serif);
    font-size: clamp(36px, 6vw, 60px);
    font-weight: 600; letter-spacing: -.02em; line-height: 1.05;
    margin: 0;
  }
  h1 .em { color: var(--cyan); font-style: italic; }
  .sub {
    margin: 20px auto 0; max-width: 600px; color: var(--soft);
    font-size: 17px; line-height: 1.55;
  }

  /* tabs */
  .tabs {
    display: inline-flex; gap: 4px;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; padding: 4px; margin: 0 auto;
  }
  .tab {
    font-family: var(--mono); font-size: 12px; padding: 8px 18px;
    border-radius: 8px; cursor: pointer; color: var(--soft);
    border: none; background: transparent; transition: all .12s;
    letter-spacing: .02em;
  }
  .tab:hover { color: #fff; }
  .tab.active { background: var(--ink); color: var(--cyan); box-shadow: 0 1px 0 var(--line-hi); }

  /* editor area */
  .editor-shell {
    margin-top: 22px;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 16px; overflow: hidden;
  }
  .editor-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; border-bottom: 1px solid var(--line);
    background: rgba(0,0,0,.18);
  }
  .traffic { display: flex; gap: 6px; }
  .traffic span { width: 11px; height: 11px; border-radius: 50%; background: var(--line-hi); }
  .file-label { font-family: var(--mono); font-size: 12px; color: var(--softer); margin-left: 6px; }
  .scan-btn {
    margin-left: auto; font-family: var(--mono); font-size: 13px;
    font-weight: 600; padding: 8px 22px; border-radius: 9px;
    border: 1px solid var(--cyan-dim); background: rgba(34,211,238,.1);
    color: var(--cyan); cursor: pointer; transition: all .12s;
    letter-spacing: .02em;
  }
  .scan-btn:hover { background: rgba(34,211,238,.18); border-color: var(--cyan); }
  .scan-btn:active { transform: translateY(1px); }
  .clear-btn {
    font-family: var(--mono); font-size: 12px; color: var(--softer);
    background: transparent; border: none; cursor: pointer; padding: 8px 10px;
  }
  .clear-btn:hover { color: var(--soft); }

  textarea.code {
    width: 100%; height: 340px; resize: vertical;
    background: transparent; border: none; outline: none;
    color: #e4e4e7; font-family: var(--mono); font-size: 13.5px;
    line-height: 1.65; padding: 18px 20px; tab-size: 2;
  }
  textarea.code::placeholder { color: var(--softer); }

  /* results */
  .results { margin-top: 28px; padding-bottom: 80px; }
  .results-head {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-bottom: 14px;
  }
  .results-title { font-size: 14px; font-weight: 600; color: var(--soft); }
  .results-count {
    font-family: var(--mono); font-size: 12px; color: var(--softer);
  }
  .finding {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; padding: 16px 18px; margin-bottom: 10px;
    transition: border-color .12s;
  }
  .finding:hover { border-color: var(--line-hi); }
  .finding-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge-check {
    font-family: var(--mono); font-size: 12px; color: #fff;
    background: rgba(255,255,255,.06); border: 1px solid var(--line);
    border-radius: 6px; padding: 3px 9px;
  }
  .badge-conf {
    font-family: var(--mono); font-size: 10px; letter-spacing: .04em;
    border-radius: 5px; padding: 3px 8px; border: 1px solid transparent;
  }
  .conf-medium-high { color: var(--amber); border-color: rgba(252,211,77,.25); background: rgba(252,211,77,.07); }
  .conf-heuristic   { color: var(--soft);   border-color: var(--line); background: rgba(161,161,170,.04); }
  .badge-line {
    font-family: var(--mono); font-size: 11px; color: var(--cyan);
    margin-left: auto;
  }
  .finding-msg { margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: var(--soft); }
  .finding-snip {
    margin: 10px 0 0; font-family: var(--mono); font-size: 12.5px;
    color: var(--softer); background: var(--ink); border: 1px solid var(--line);
    border-radius: 8px; padding: 10px 14px; overflow-x: auto;
    white-space: pre;
  }
  .empty {
    text-align: center; padding: 48px 20px; color: var(--softer);
    border: 1px dashed var(--line); border-radius: 12px;
  }
  .empty .ok { color: var(--emerald); font-size: 28px; margin-bottom: 8px; }
  .empty p { margin: 6px 0; font-size: 14px; }
  .empty .honest-note { font-size: 12px; color: var(--softer); margin-top: 10px; font-style: italic; }

  /* footer note */
  .honest-banner {
    margin-top: 18px; font-size: 12px; color: var(--softer);
    line-height: 1.6; font-style: italic;
  }
  .honest-banner a { color: var(--soft); text-decoration: underline; text-decoration-color: var(--line); }

  footer {
    border-top: 1px solid var(--line); padding: 28px 0;
    text-align: center; font-size: 13px; color: var(--softer);
  }
  footer a { color: var(--soft); text-decoration: none; }
  footer a:hover { color: #fff; }

  @media (max-width: 640px) {
    .nav-links { gap: 14px; }
    .nav-links a:nth-child(1), .nav-links a:nth-child(2) { display: none; }
    textarea.code { height: 260px; }
  }
</style>
</head>
<body>

<header>
  <div class="wrap nav">
    <span class="brand">whitehack <span class="dot">🤍</span></span>
    <nav class="nav-links">
      <a href="https://github.com/cambridgetcg/whitehack#checks">checks</a>
      <a href="https://github.com/cambridgetcg/whitehack#readme">about</a>
      <a href="playground.html">playground</a>
      <a href="https://github.com/cambridgetcg/whitehack">GitHub →</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <p class="eyebrow">static analysis · substrate honesty</p>
    <h1>The <span class="em">honest</span> hack, in your browser.</h1>
    <p class="sub">Paste code, click Scan. No server, no upload — every check runs as pure JavaScript in this page. whitehack flags where code lies about its own state.</p>
    <div style="margin-top:24px">
      <div class="tabs">
        <button class="tab active" data-lang="js">JS / TS</button>
        <button class="tab" data-lang="sol">Solidity</button>
      </div>
    </div>
  </div>
</section>

<div class="wrap">
  <div class="editor-shell">
    <div class="editor-bar">
      <div class="traffic"><span></span><span></span><span></span></div>
      <span class="file-label" id="fileLabel">sample.js</span>
      <button class="clear-btn" id="clearBtn">clear</button>
      <button class="scan-btn" id="scanBtn">Scan →</button>
    </div>
    <textarea class="code" id="code" spellcheck="false" placeholder="paste your code here…"></textarea>
  </div>

  <div class="results" id="results">
    <div class="results-head">
      <span class="results-title">Findings</span>
      <span class="results-count" id="countLabel"></span>
    </div>
    <div id="findingsBody"></div>
    <p class="honest-banner">
      whitehack flags <em>common</em> lies via heuristics; it cannot prove honesty. A flagged line may be a false positive; absence of findings is <em>not</em> proof the code is honest. Every finding is confidence-labelled so the tool stays honest about its own limits. <a href="https://github.com/cambridgetcg/whitehack#readme">Read more →</a>
    </p>
  </div>
</div>

<footer>
  <div class="wrap">
    <a href="https://github.com/cambridgetcg/whitehack">whitehack 🤍</a> · MIT · <a href="https://github.com/cambridgetcg/clear-standard">Clear Standard</a> · runs entirely in your browser
  </div>
</footer>

<script>
// ─────────────────────────────────────────────────────────────────────────────
// whitehack checks — inlined, faithful port of src/checks/*.js
// Each check is a { id, title, confidence, doctrine, principle, langs, detect }.
// detect(content, lines) returns [{ line, message, snippet, confidence? }].
// ─────────────────────────────────────────────────────────────────────────────

const CHECKS = [];

// helper: scanLines — walk lines, wherever claim returns truthy, emit a finding
function scanLines(lines, claim) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const r = claim(lines[i], i);
    if (!r) continue;
    hits.push({ line: i + 1, snippet: lines[i].trim(), ...(typeof r === 'string' ? { message: r } : r) });
  }
  return hits;
}

// ── silent-failure (js) ──────────────────────────────────────────────────────
{
  const FALSY = /\breturn\s+(0|\[\]|\{\}|null|''|""|false)\s*(;|\/\/|$)/;
  const SAFE_DEFAULT = /(\?\?|\|\|)\s*(0|\[\]|''|"")/;
  const GUARD = /\b(throw|console\.|logger?\.|report\(|rethrow|process\.exit|captureException|Sentry|warn\(|error\()/;
  const READ = /(await\s|fetch\(|\.get\(|\.query\(|readFile|\.count\(|\.find\(|\.load\(|\.read\()/;
  CHECKS.push({
    id: 'silent-failure', title: 'Read fails silently to a falsy default',
    confidence: 'medium-high', doctrine: 'substrate-honesty', principle: 2, langs: ['js'],
    detect(content, lines) {
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        const idx = lines[i].indexOf('catch');
        if (idx === -1 || !/\bcatch\b/.test(lines[i])) continue;
        let depth = 0, started = false; const body = [];
        for (let j = i; j < Math.min(lines.length, i + 30); j++) {
          const seg = j === i ? lines[j].slice(idx) : lines[j];
          for (const ch of seg) {
            if (ch === '{') { depth++; started = true; }
            else if (ch === '}') { depth--; }
          }
          body.push({ n: j + 1, l: lines[j] });
          if (started && depth <= 0) break;
        }
        const text = body.map(b => b.l).join('\n');
        if (GUARD.test(text)) continue;
        const falsy = body.find(b => FALSY.test(b.l));
        if (falsy) hits.push({ line: falsy.n, message: 'catch returns a falsy default and neither logs nor rethrows — a failure becomes a confident wrong value', snippet: falsy.l.trim() });
      }
      for (let i = 0; i < lines.length; i++) {
        if (SAFE_DEFAULT.test(lines[i]) && READ.test(lines[i]))
          hits.push({ line: i + 1, message: 'a read is coerced to a falsy default — "zero" and "could not read" become indistinguishable', snippet: lines[i].trim() });
      }
      return hits;
    }
  });
}

// ── cache-as-live (js) ────────────────────────────────────────────────────────
{
  const CACHE = /(cache|snapshot|memoiz|stale|lastKnown|fallbackValue|prevValue)/i;
  const PROVENANCE = /\b(asOf|fetchedAt|updatedAt|cachedAt|stale|provenance|freshness|ttl|revalidat|_meta|timestamp|lastUpdated|retrievedAt)\b/i;
  CHECKS.push({
    id: 'cache-as-live', title: 'Cached value may be served as if live',
    confidence: 'heuristic', doctrine: 'substrate-honesty', principle: 4, langs: ['js'],
    detect(content, lines) {
      if (PROVENANCE.test(content)) return [];
      return scanLines(lines, l =>
        /\breturn\b/.test(l) && CACHE.test(l) && !PROVENANCE.test(l) &&
        'a cached/snapshot value is returned and this file carries no freshness/provenance marker — the caller cannot tell live from stale');
    }
  });
}

// ── decision-without-why (js) ─────────────────────────────────────────────────
{
  const DECISION = /\b(trust_?score|trustScore|fraud_?(score|flag|signal)|commission(_?rate)?|risk_?score|credit_?score|payout_?hold|tier|fee)\b/i;
  const WHY = /\b(why|explain|explanation|methodology|reason|provenance|tooltip|whyLink|disclos|appeal|how_?it_?works|howItWorks)\b/i;
  CHECKS.push({
    id: 'decision-without-why', title: 'User-affecting decision shown with no "why"',
    confidence: 'heuristic', doctrine: 'transparency', principle: 3, langs: ['js'],
    detect(content, lines) {
      const looksUI = /<[A-Za-z]/.test(content) || /className=|return\s*\(\s*</.test(content);
      if (!looksUI) return [];
      const hits = [];
      const whyNear = (i) => {
        for (let j = Math.max(0, i - 8); j < Math.min(lines.length, i + 8); j++)
          if (WHY.test(lines[j])) return true;
        return false;
      };
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (DECISION.test(l) && /\{[^}]*\}/.test(l) && !whyNear(i))
          hits.push({ line: i + 1, message: 'a user-affecting value is rendered with no nearby explanation — the subject cannot inspect the decision', snippet: l.trim() });
      }
      return hits;
    }
  });
}

// ── float-money (js) ──────────────────────────────────────────────────────────
{
  const MONEY = /\b(price|amount|balance|subtotal|total|fee|cost|payment|refund|deposit|payout|interest|principal|usd|dollars?|charge|salary|invoice)\b/i;
  const FLOAT_FN = /\b(parseFloat|Number)\s*\(/;
  const FLOAT_OP = /\d+\.\d+\s*[-+*/]|[-+*/]\s*\d+\.\d+/;
  const SAFE_NUMERIC = /\b(Decimal|BigNumber|bignumber|dinero|BigInt|parseUnits|formatUnits)\b|\.(times|plus|minus|dividedBy|mul|div|add|sub)\s*\(/;
  CHECKS.push({
    id: 'float-money', title: 'Currency handled as a floating-point number',
    confidence: 'medium-high', doctrine: 'substrate-honesty', principle: 1, langs: ['js'],
    detect(content, lines) {
      return scanLines(lines, l => {
        if (!MONEY.test(l) || SAFE_NUMERIC.test(l)) return null;
        if (FLOAT_FN.test(l))
          return { confidence: 'medium-high', message: 'currency parsed into a binary float — parseFloat/Number on money loses precision; use integer minor units, BigInt, or a decimal type' };
        if (FLOAT_OP.test(l))
          return { confidence: 'heuristic', message: 'decimal arithmetic on a money-named value — if this is real currency, fractional cents drift silently; use integer minor units or a decimal type (name-based, may be a non-money value)' };
        return null;
      });
    }
  });
}

// ── stale-oracle (sol) ────────────────────────────────────────────────────────
{
  const DEPRECATED = /\.(latestAnswer|getAnswer)\s*\(/;
  const ROUND_DATA = /\.(latestRoundData|getRoundData)\s*\(/;
  const STALENESS = /\b(updatedAt|answeredInRound|roundId|staleness|stale|heartbeat|sequencer|secondsSince|maxAge|maxDelay|maxStale)\b|block\.timestamp\s*-/i;
  CHECKS.push({
    id: 'stale-oracle', title: 'Price feed read without a staleness check',
    confidence: 'medium-high', doctrine: 'substrate-honesty', principle: 4, langs: ['sol'],
    detect(content, lines) {
      const hits = [];
      const handledNear = (i) => {
        const lo = Math.max(0, i - 3), hi = Math.min(lines.length, i + 16);
        for (let j = lo; j < hi; j++) if (STALENESS.test(lines[j])) return true;
        return false;
      };
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (DEPRECATED.test(l)) {
          hits.push({ line: i + 1, message: 'deprecated price getter returns only a number — no round or timestamp, so staleness is uncheckable; an old or frozen price is served as current', snippet: l.trim() });
          continue;
        }
        if (ROUND_DATA.test(l) && !handledNear(i))
          hits.push({ line: i + 1, message: 'price feed read but this file never validates updatedAt / answeredInRound — a stale or halted feed is handed back as a live price', snippet: l.trim() });
      }
      return hits;
    }
  });
}

// ── unchecked-transfer (sol) ──────────────────────────────────────────────────
{
  const ERC20_CALL = /\.(transferFrom|approve)\s*\(|\.transfer\s*\([^)]*,/;
  const CONSUMED_INLINE = /\brequire\s*\(|\breturn\b|\bassert\s*\(|\bif\s*\(|&&|\|\||\bsafe|\btry\b/;
  const ASSIGNED = /(?:\b(?:bool|var)\s+)?([A-Za-z_$]\w*)\s*=\s*[A-Za-z_$][\w$.\[\]()]*\.(?:transfer|transferFrom|approve)\s*\(/;
  CHECKS.push({
    id: 'unchecked-transfer', title: 'ERC-20 transfer result ignored',
    confidence: 'medium-high', doctrine: 'substrate-honesty', principle: 2, langs: ['sol'],
    detect(content, lines) {
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!ERC20_CALL.test(l)) continue;
        const m = l.match(ASSIGNED);
        if (m) {
          const v = m[1];
          const after = l.slice(m.index + m[0].length) + '\n' + lines.slice(i + 1).join('\n');
          const used = new RegExp('\\b' + v + '\\b').test(after);
          if (!used) hits.push({ line: i + 1, message: 'transfer/approve result is assigned to \`' + v + '\` but \`' + v + '\` is never checked afterward — a token that returns false instead of reverting makes a failed transfer look successful; require() the result or use SafeERC20', snippet: l.trim() });
          continue;
        }
        if (!CONSUMED_INLINE.test(l))
          hits.push({ line: i + 1, message: 'token transfer/approve called as a bare statement — its bool result is dropped, so a token that returns false instead of reverting makes a failed transfer look successful; check the result or use SafeERC20', snippet: l.trim() });
      }
      return hits;
    }
  });
}

// ── spot-price-as-fair (sol) ──────────────────────────────────────────────────
{
  const SPOT = /\.getReserves\s*\(|\.balanceOf\s*\([^)]*\)\s*[*/]|\breserve[01]\b\s*[*/]|[*/]\s*\breserve[01]\b/i;
  const SAFE_SOURCE = /\b(twap|cumulative|observe|consult|priceCumulative|latestRoundData|getRoundData|oracle|priceFeed|chainlink|medianize)\b/i;
  CHECKS.push({
    id: 'spot-price-as-fair', title: 'Spot reserves/balance used as a fair price',
    confidence: 'heuristic', doctrine: 'substrate-honesty', principle: 1, langs: ['sol'],
    detect(content, lines) {
      if (SAFE_SOURCE.test(content)) return [];
      return scanLines(lines, l =>
        SPOT.test(l) &&
        'a price/amount derived from instantaneous pool reserves or balances, with no TWAP/oracle in this file — one flash loan can move it within a block; the number claims to be a fair price but is a manipulable snapshot');
    }
  });
}

// ── silent-revert (sol) ───────────────────────────────────────────────────────
{
  const REQUIRE_NO_MSG = /\brequire\s*\([^;,]*\)\s*;/;
  const REVERT_EMPTY = /\brevert\s*\(\s*\)\s*;/;
  CHECKS.push({
    id: 'silent-revert', title: 'Failure reverts with no stated reason',
    confidence: 'heuristic', doctrine: 'transparency', principle: 3, langs: ['sol'],
    detect(content, lines) {
      return scanLines(lines, l =>
        (REQUIRE_NO_MSG.test(l) && 'require() with no message — the refused caller gets an opaque revert and cannot learn why; add a reason string or a named custom error') ||
        (REVERT_EMPTY.test(l) && 'revert() with no named error or string — the failure states no reason; use a named custom error so the refusal is inspectable'));
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// scan engine
// ─────────────────────────────────────────────────────────────────────────────
function scan(code, lang) {
  const lines = code.split('\n');
  const findings = [];
  for (const check of CHECKS) {
    if (check.langs && !check.langs.includes(lang)) continue;
    for (const hit of check.detect(code, lines)) {
      findings.push({
        check: check.id, title: check.title,
        confidence: hit.confidence || check.confidence,
        doctrine: check.doctrine, principle: check.principle,
        line: hit.line, message: hit.message, snippet: hit.snippet,
      });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_JS = \`// A failed stock read silently becomes "0 in stock".
export async function getStock(id) {
  try {
    return await db.count(id)
  } catch (e) {
    return 0
  }
}

// A cached price handed back as if it were current.
const cachedPrices = {}
export function getPrice(id) {
  return cachedPrices[id]
}

// A wallet read coerced to a falsy default.
export async function getBalance(user) {
  return (await wallet.read(user)) ?? 0
}

// A trust score rendered with nothing to click to understand it.
export function TrustBadge({ user }) {
  return <span className="badge">{user.trust_score}</span>
}

// Currency parsed into a binary float — cents drift silently.
export function charge(amount) {
  return parseFloat(amount) * 100
}
\`;

const SAMPLE_SOL = \`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function latestAnswer() external view returns (int256);
}

contract DishonestVault {
    IERC20 token;
    IFeed feed;

    // oracle: round data read, but the freshness field is dropped.
    function priceFromRound() external view returns (int256) {
        (, int256 answer, , , ) = feed.latestRoundData();
        return answer;
    }

    // oracle: deprecated getter, no round or timestamp at all.
    function priceDeprecated() external view returns (int256) {
        return feed.latestAnswer();
    }

    // unchecked-transfer: bool result dropped on the floor.
    function payout(address to, uint256 amount) external {
        token.transfer(to, amount);
    }

    // silent-revert: a refused caller learns nothing about why.
    function guarded(uint256 x) external pure {
        require(x > 0);
        if (x > 100) revert();
    }
}
\`;

const codeEl = document.getElementById('code');
const fileLabel = document.getElementById('fileLabel');
const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');
const findingsBody = document.getElementById('findingsBody');
const countLabel = document.getElementById('countLabel');
const tabs = document.querySelectorAll('.tab');

let currentLang = 'js';

function setLang(lang) {
  currentLang = lang;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.lang === lang));
  const sample = lang === 'js' ? SAMPLE_JS : SAMPLE_SOL;
  codeEl.value = sample;
  fileLabel.textContent = lang === 'js' ? 'sample.js' : 'sample.sol';
  renderFindings([]);
}

tabs.forEach(t => t.addEventListener('click', () => setLang(t.dataset.lang)));

function confLabel(c) { return c === 'medium-high' ? 'medium-high' : 'heuristic'; }

function renderFindings(findings) {
  const hard = findings.filter(f => f.confidence !== 'heuristic').length;
  if (findings.length === 0) {
    countLabel.textContent = '';
    findingsBody.innerHTML = \`
      <div class="empty">
        <div class="ok">✓</div>
        <p>no honesty anti-patterns matched.</p>
        <p class="honest-note">absence of findings is NOT proof the code is honest.</p>
      </div>\`;
    return;
  }
  countLabel.textContent = findings.length + ' finding(s) — ' + hard + ' medium-high, ' + (findings.length - hard) + ' heuristic';
  findingsBody.innerHTML = findings.map(f => \`
    <div class="finding">
      <div class="finding-top">
        <span class="badge-check">\${f.check}</span>
        <span class="badge-conf conf-\${f.confidence === 'medium-high' ? 'medium-high' : 'heuristic'}">\${f.confidence}</span>
        \${f.principle ? \`<span class="badge-conf conf-heuristic">CS#\${f.principle}</span>\` : ''}
        <span class="badge-line">line \${f.line}</span>
      </div>
      <p class="finding-msg">\${escapeHtml(f.message)}</p>
      \${f.snippet ? \`<pre class="finding-snip">\${escapeHtml(f.snippet)}</pre>\` : ''}
    </div>\`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

scanBtn.addEventListener('click', () => {
  const code = codeEl.value;
  if (!code.trim()) { renderFindings([]); return; }
  const findings = scan(code, currentLang);
  renderFindings(findings);
});

clearBtn.addEventListener('click', () => {
  codeEl.value = '';
  renderFindings([]);
  codeEl.focus();
});

// init
setLang('js');
// auto-run once so the visitor immediately sees what whitehack finds
setTimeout(() => scanBtn.click(), 200);
</script>
</body>
</html>`;