const mysql = require('mysql2/promise')
let pool = null
async function getPool() {
    if (pool) return pool
    const opts = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'treehole',
        password: process.env.DB_PASS || '',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        charset: 'utf8mb4'
    }
    // TiDB Cloud Serverless 需要 SSL
    if (process.env.DB_SSL === '1') {
        opts.ssl = { rejectUnauthorized: true }
    }
    pool = mysql.createPool(opts)
    // 尝试快速连接测试，失败时记录详细错误，保留 pool 以便后续重试
    try {
        const conn = await pool.getConnection()
        await conn.ping()
        conn.release()
        console.log('DB pool created and ping OK')
    } catch (e) {
        console.error('Warning: initial DB ping failed:', e)
        // 不抛出，以便应用可继续启动用于调试（health endpoint 会报告错误）
    }
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
