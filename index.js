require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { authUser } = require('./lib/auth')
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
