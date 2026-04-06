require('dotenv').config()
const { getPool } = require('./db')

async function ensureColumn(pool, dbName, table, column, definition) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?`,
        [dbName, table, column]
    )
    if (rows && rows[0] && rows[0].c === 0) {
        console.log(`Adding column ${column} to ${table}`)
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`)
        console.log(`Added ${column}`)
    } else {
        console.log(`Column ${column} already exists on ${table}`)
    }
}

async function runSchemaUpgrade() {
    const pool = await getPool()
    const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'treehole'
    try {
        await ensureColumn(pool, dbName, 'users', 'role', "`role` VARCHAR(32) NOT NULL DEFAULT 'user'")
        await ensureColumn(pool, dbName, 'users', 'editor_password', "`editor_password` VARCHAR(128) DEFAULT NULL")
        // Ensure editors table exists (for editor accounts migration)
        console.log('Ensuring editors table exists')
        await pool.query(`
            CREATE TABLE IF NOT EXISTS editors (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(128) NOT NULL UNIQUE,
                password_hash VARCHAR(256) NOT NULL,
                role VARCHAR(32) DEFAULT 'editor',
                status VARCHAR(32) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `)
        // Ensure replies.editor_id column exists
        await ensureColumn(pool, dbName, 'replies', 'editor_id', '`editor_id` INT NULL')
        console.log('Schema upgrade complete')
        return true
    } catch (e) {
        console.error('Schema upgrade failed', e)
        throw e
    }
}

// CLI mode: run when executed directly
if (require.main === module) {
    runSchemaUpgrade()
        .then(() => process.exit(0))
        .catch(() => process.exit(2))
}

module.exports = { runSchemaUpgrade }
