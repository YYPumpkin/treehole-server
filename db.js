const mysql = require('mysql2/promise')
let pool = null
async function getPool() {
    if (pool) return pool
    pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'treehole',
        password: process.env.DB_PASS || '',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        charset: 'utf8mb4'
    })
    return pool
}

async function closePool() {
    if (pool) {
        try {
            await pool.end()
        } catch (e) {
            console.error('Error closing pool', e)
        }
        pool = null
    }
}

module.exports = { getPool, closePool }
