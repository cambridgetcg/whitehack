import assert from 'node:assert/strict'
import test from 'node:test'

import { scanText } from '../src/core.js'

test('multi-line WiFi credential findings point to the matched source line', () => {
  const source = `const config = {
  ssid: "office",
  password: "correct horse battery staple",
}`
  const findings = scanText(source, { file: 'wifi.ts' })
    .filter(({ check }) => check === 'wifi-protocol')

  assert.equal(findings.length, 1)
  assert.equal(findings[0].line, 2)
})
