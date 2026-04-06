const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'secret'

function signToken(payload, opts = {}) {
    return jwt.sign(payload, SECRET, Object.assign({ expiresIn: '7d' }, opts))
}

function verifyToken(token) {
    return jwt.verify(token, SECRET)
}

// Middleware for authenticated user (any role, but token must be valid)
function authUser(req, res, next) {
    // 支持 header Authorization 或 URL query ?token=xxx（wx.uploadFile 场景）
    const raw = req.headers.authorization || (req.query.token ? 'Bearer ' + req.query.token : '')
    if (!raw) return res.status(401).json({ success: false, message: 'unauthorized' })
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw
    try {
        const payload = verifyToken(token)
        // attach user payload
        req.user = payload
        next()
    } catch (e) {
        return res.status(401).json({ success: false, message: 'token 无效' })
    }
}

// Middleware for editor-only access
function authEditor(req, res, next) {
    const raw = req.headers.authorization
    if (!raw) return res.status(401).json({ success: false, message: 'unauthorized' })
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw
    try {
        const payload = verifyToken(token)
        if (!payload.role || payload.role !== 'editor') return res.status(403).json({ success: false, message: 'forbidden' })
        req.editor = payload
        next()
    } catch (e) {
        return res.status(401).json({ success: false, message: 'unauthorized' })
    }
}

module.exports = { signToken, verifyToken, authUser, authEditor }
