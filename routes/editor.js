const express = require('express')
const router = express.Router()
const { getPool } = require('../db')
const { getEditorByUsername, verifyPassword } = require('../services/editorService')
const { signToken, authEditor } = require('../lib/auth')

function safeParseJSON(val) {
    if (!val) return []
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch (e) { return [] }
}

// Editor login: ONLY accept credentials from editors table
router.post('/login', async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ success: false, message: '账号和密码必填' })
    try {
        const editor = await getEditorByUsername(username)
        if (!editor) return res.status(401).json({ success: false, message: '账号或密码错误' })
        const ok = await verifyPassword(editor.password_hash, password)
        if (!ok) return res.status(401).json({ success: false, message: '账号或密码错误' })
        const token = signToken({ editorId: editor.id, username: editor.username, role: 'editor' })
        return res.json({ success: true, data: { token, role: 'editor', user: { id: editor.id, username: editor.username } } })
    } catch (e) {
        console.error('DB error in /editor/login', e)
        return res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

// Get stories for editor (supports ?status=&page=&limit=)
router.get('/stories', authEditor, async (req, res) => {
    try {
        const status = req.query.status || null
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(100, parseInt(req.query.limit) || 20)
        const offset = (page - 1) * limit
        const pool = await getPool()
        let q = 'SELECT id, user_openid, LEFT(content,200) AS preview, images, status, created_at FROM stories WHERE is_deleted=0'
        const params = []
        if (status) { q += ' AND status=?'; params.push(status) }
        q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)
        const [rows] = await pool.query(q, params)
        const data = rows.map(r => Object.assign({}, r, { images: safeParseJSON(r.images) }))
        res.json({ success: true, data })
    } catch (e) {
        console.error('Error in /editor/stories', e)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

// Get story detail for editor
router.get('/story/:id', authEditor, async (req, res) => {
    try {
        const id = req.params.id
        const pool = await getPool()
        const [[story]] = await pool.query('SELECT id, user_openid, content, images, status, created_at FROM stories WHERE id=?', [id])
        if (!story) return res.status(404).json({ success: false, message: '未找到' })
        story.images = safeParseJSON(story.images)
        const [replies] = await pool.query('SELECT id, editor_id, editor_name, content, images, created_at FROM replies WHERE story_id=? ORDER BY created_at', [id])
        res.json({ success: true, data: Object.assign(story, { replies }) })
    } catch (e) {
        console.error('Error in /editor/story/:id', e)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

// Reply (requires editor auth)
router.post('/reply', authEditor, async (req, res) => {
    try {
        const { story_id, content } = req.body
        const editor_name = req.editor && req.editor.username ? req.editor.username : '编辑'
        if (!story_id) return res.status(400).json({ success: false, message: 'story_id 必填' })
        const text = (content || '').trim()
        if (!text) return res.status(400).json({ success: false, message: '回复内容不能为空' })
        if (text.length > 2000) return res.status(400).json({ success: false, message: '回复内容过长（最多2000字符）' })
        const pool = await getPool()
        const editorId = req.editor && req.editor.editorId ? req.editor.editorId : null
        await pool.query('INSERT INTO replies (story_id, editor_id, editor_name, content, created_at) VALUES (?, ?, ?, ?, NOW())', [story_id, editorId, editor_name, text])
        await pool.query('UPDATE stories SET status=?, updated_at=NOW() WHERE id=?', ['replied', story_id])
        res.json({ success: true })
    } catch (e) {
        console.error('Error in /editor/reply', e)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

module.exports = router
