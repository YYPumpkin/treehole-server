#!/usr/bin/env node
// run_with_timeout.js
// Usage: node run_with_timeout.js --file test_db.js --timeout 300000
const { spawn } = require('child_process')
// simple arg parsing: --file <path> --timeout ms
const raw = process.argv.slice(2)
let file = null
let timeout = 300000
for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '--file' && raw[i + 1]) { file = raw[i + 1]; i++ }
    else if (raw[i] === '--timeout' && raw[i + 1]) { timeout = parseInt(raw[i + 1], 10); i++ }
}
timeout = Number.isFinite(timeout) ? timeout : 300000
if (!file) {
    console.error('Usage: node run_with_timeout.js --file <script.js> --timeout <ms>')
    process.exit(2)
}

console.log(`Running file: ${file}`)
console.log(`Timeout: ${timeout} ms`)

const child = spawn('node', [file], { stdio: ['ignore', 'pipe', 'pipe'], shell: false })

let stdout = ''
let stderr = ''
const killTimer = setTimeout(() => {
    console.error(`Command exceeded timeout of ${timeout}ms - killing process`)
    try { child.kill('SIGKILL') } catch (e) { }
    analyzeAndExit()
}, timeout)

child.stdout.on('data', (d) => { const s = d.toString(); stdout += s; process.stdout.write(s) })
child.stderr.on('data', (d) => { const s = d.toString(); stderr += s; process.stderr.write(s) })
child.on('exit', (code, signal) => {
    clearTimeout(killTimer)
    console.log(`Process exited with code=${code} signal=${signal}`)
    analyzeAndExit(code)
})

function analyzeAndExit(code = null) {
    // Simple heuristics to suggest root cause
    const combined = (stdout + '\n' + stderr).toLowerCase()
    if (combined.includes('access denied') || combined.includes('er_access_denied_error')) {
        console.error('Detected database access denied error: check DB credentials in .env and user privileges.')
        process.exit(1)
    }
    if (combined.includes('connect econrefused') || combined.includes('ecOnnrefused') || combined.includes('connection refused')) {
        console.error('Detected connection refused: ensure database server is running and host/port are correct.')
        process.exit(1)
    }
    if (combined.includes('timeout') || combined.includes('etimedout')) {
        console.error('Detected timeout: operation is taking too long. Check DB performance, network, or long-running queries.')
        process.exit(1)
    }
    if (combined.includes('error')) {
        console.error('Process produced errors. See logs above for details.')
        process.exit(code || 1)
    }
    process.exit(code || 0)
}
