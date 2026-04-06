const express = require('express')
const router = express.Router()
const { getPool } = require('../db')
const { authUser } = require('../lib/auth')

function safeParseJSON(val) {
    if (!val) return []
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch (e) { return [] }
}

// Create a new story (authenticated user only)
router.post('/create', authUser, async (req, res) => {
    try {
        const openid = req.user && req.user.openid
        const content = (req.body.content || '').trim()
        if (!content) return res.status(400).json({ success: false, message: '内容不能为空' })
        // images: array of fileID strings (CloudBase) or empty array
        const images = Array.isArray(req.body.images) ? JSON.stringify(req.body.images) : '[]'
        const pool = await getPool()
        const [r] = await pool.query(
            'INSERT INTO stories (user_openid, content, images, status, created_at) VALUES (?, ?, ?, ?, NOW())',
            [openid, content, images, 'pending']
        )
        res.json({ success: true, data: { id: r.insertId } })
    } catch (err) {
        console.error('Error in /story/create:', err)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

// List stories belonging to the authenticated user
router.get('/list/my', authUser, async (req, res) => {
    try {
        const openid = req.user && req.user.openid
        const pool = await getPool()
        const [rows] = await pool.query(
            'SELECT id, LEFT(content,60) AS preview, images, status, created_at FROM stories WHERE user_openid=? AND is_deleted=0 ORDER BY created_at DESC',
            [openid]
        )
        // parse images JSON string → array
        const data = rows.map(r => Object.assign({}, r, { images: safeParseJSON(r.images) }))
        res.json({ success: true, data })
    } catch (err) {
        console.error('Error in /story/list/my:', err)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

// Detail: only the owner (authenticated) can view
router.get('/detail', authUser, async (req, res) => {
    try {
        const id = req.query.id
        const openid = req.user && req.user.openid
        const pool = await getPool()
        const [[story]] = await pool.query(
            'SELECT id, content, images, status, created_at, user_openid FROM stories WHERE id=? AND is_deleted=0',
            [id]
        )
        if (!story) return res.status(404).json({ success: false, message: '未找到' })
        if (story.user_openid !== openid) return res.status(403).json({ success: false, message: '没有权限查看该投稿' })
        const [replies] = await pool.query('SELECT id, content, created_at FROM replies WHERE story_id=? ORDER BY created_at', [id])
        delete story.user_openid
        story.images = safeParseJSON(story.images)
        res.json({ success: true, data: Object.assign(story, { replies }) })
    } catch (err) {
        console.error('Error in /story/detail:', err)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

module.exports = router
