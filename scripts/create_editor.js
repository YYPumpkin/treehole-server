#!/usr/bin/env node
require('dotenv').config()
const readline = require('readline')
const { createEditor } = require('../services/editorService')

async function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans) }))
}

; (async () => {
    try {
        const username = process.argv[2] || await prompt('username: ')
        const password = process.argv[3] || await prompt('password: ')
        if (!username || !password) { console.error('username and password required'); process.exit(2) }
        const r = await createEditor(username.trim(), password)
        console.log('Created editor:', r)
        process.exit(0)
    } catch (e) {
        console.error('Failed to create editor', e)
        process.exit(1)
    }
})()
