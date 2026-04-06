const { getPool } = require('../db')

async function createOrGetUser(openid) {
    const pool = await getPool()
    // Create if not exists (keeps role default)
    await pool.query('INSERT IGNORE INTO users (openid, anonymous_nick, anonymous_avatar, created_at) VALUES (?, ?, ?, NOW())', [openid, '匿名用户', ''])
    const [rows] = await pool.query('SELECT id, role FROM users WHERE openid=? LIMIT 1', [openid])
    if (rows && rows[0]) return rows[0]
    return { id: null, role: 'user' }
}

module.exports = { createOrGetUser }
