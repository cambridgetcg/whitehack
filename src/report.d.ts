import type { WhitehackFinding } from './types.js'

export const VERSION: 'v0.10.0-dev.0'
export function report(findings: readonly WhitehackFinding[], target: string): 0 | 1
