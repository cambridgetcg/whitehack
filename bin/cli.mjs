#!/usr/bin/env node
// whitehack CLI — runnable via npx github:cambridgetcg/whitehack
import { scan } from '../src/scan.js'
import { report } from '../src/report.js'

const args = process.argv.slice(2)
const target = args[0] || '.'

const findings = await scan(target)
const code = report(findings, target)
process.exit(code)
