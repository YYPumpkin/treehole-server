require('dotenv').config({ path: __dirname + '/.env' })
const { getPool, closePool } = require('./db')

    (async () => {
        let pool
        try {
            pool = await getPool()
            const [rows] = await pool.query('SELECT 1 as ok')
            console.log('DB query success', rows)
            const [users] = await pool.query('SELECT COUNT(*) as c FROM users')
            console.log('users count', users)
        } catch (e) {
            console.error('DB connection error:', e)
            process.exitCode = 1
        } finally {
            try { await closePool() } catch (e) { console.error('Error closing pool', e) }
        }
        // exit naturally
    })()
