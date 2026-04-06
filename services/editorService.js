const { getPool } = require('../db')
const bcrypt = require('bcryptjs')

async function createEditor(username, password) {
    const pool = await getPool()
    const hash = await bcrypt.hash(password, 10)
    const [r] = await pool.query('INSERT INTO editors (username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, NOW())', [username, hash, 'editor', 'active'])
    return { id: r.insertId, username }
}

async function getEditorByUsername(username) {
    const pool = await getPool()
    const [rows] = await pool.query('SELECT id, username, password_hash, role, status FROM editors WHERE username=? LIMIT 1', [username])
    return (rows && rows[0]) ? rows[0] : null
}

async function verifyPassword(storedHash, password) {
    return bcrypt.compare(password, storedHash)
}

module.exports = { createEditor, getEditorByUsername, verifyPassword }
