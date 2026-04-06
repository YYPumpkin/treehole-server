require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { authUser } = require('./lib/auth')
const { getPool } = require('./db')
const userRoutes = require('./routes/user')
const storyRoutes = require('./routes/story')
const editorRoutes = require('./routes/editor')

// Global error handlers to avoid process exit on uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

const app = express()
app.use(cors())
app.use(bodyParser.json())

// ── 静态文件服务：上传的图片通过 /uploads/xxx 访问 ──────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOADS_DIR))

// ── 图片上传接口 POST /api/upload/image ──────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg'
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`)
    }
})
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true)
        else cb(new Error('只允许上传图片'))
    }
})
app.post('/api/upload/image', (req, res, next) => {
    console.log('[upload] headers:', req.headers.authorization || req.headers.Authorization || '(no auth)')
    next()
}, authUser, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: '未收到文件' })
    const host = process.env.SERVER_HOST || `http://127.0.0.1:${process.env.PORT || 3000}`
    const url = `${host}/uploads/${req.file.filename}`
    console.log('[upload] success:', url)
    res.json({ success: true, data: { url } })
})

app.use('/api/user', userRoutes)
app.use('/api/story', storyRoutes)
app.use('/api/editor', editorRoutes)

// Health check endpoint for deployment diagnostics
app.get('/api/health', async (req, res) => {
    try {
        const pool = await getPool()
        const [rows] = await pool.query('SELECT 1 AS ok')
        res.json({ success: true, db: rows && rows.length ? true : false })
    } catch (e) {
        console.error('Health check DB error:', e)
        res.status(500).json({ success: false, message: 'DB connection failed', error: String(e) })
    }
})

// Debug endpoint (safe): 返回非敏感的运行时环境状态，便于排查
app.get('/api/debug', (req, res) => {
    const env = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '3000',
        DB_HOST: process.env.DB_HOST || 'unset',
        DB_PORT: process.env.DB_PORT || '3306(default)',
        DB_USER: process.env.DB_USER ? 'set' : 'unset(default root)',
        DB_PASS: process.env.DB_PASS ? 'set' : 'unset(empty)',
        DB_NAME: process.env.DB_NAME ? 'set' : 'unset',
        MIGRATE_ON_START: process.env.MIGRATE_ON_START || '0'
    }
    res.json({ success: true, env })
})

const PORT = process.env.PORT || 3000

async function startServer() {
    // If MIGRATE_ON_START is set to '1', run upgrade_schema.js before listening.
    if (process.env.MIGRATE_ON_START === '1') {
        try {
            console.log('MIGRATE_ON_START=1: running schema upgrade...')
            const { runSchemaUpgrade } = require('./upgrade_schema')
            await runSchemaUpgrade()
            console.log('Schema upgrade finished')
        } catch (e) {
            console.error('Schema upgrade failed at startup:', e)
            // continue to start server so we can inspect errors via API if needed
        }
    }

    app.listen(PORT, () => console.log(`server running on ${PORT}`))
}

startServer().catch(e => {
    console.error('Failed to start server', e)
})

// 全局错误处理中间件：捕获 body-parser 的 JSON 解析错误与未处理错误
app.use((err, req, res, next) => {
    if (!err) return next()
    // body-parser JSON 解析错误
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        console.error('JSON parse error:', err)
        return res.status(400).json({ success: false, message: '请求体 JSON 解析失败' })
    }
    console.error('Unhandled error middleware:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
})
