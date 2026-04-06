const express = require('express')
const router = express.Router()
const { signToken } = require('../lib/auth')
const { createOrGetUser } = require('../services/userService')

router.post('/login', async (req, res) => {
    try {
        const code = req.body.code || 'demo'
        const openid = 'demo_openid_' + (code.slice(-4) || '0000')
        try {
            const user = await createOrGetUser(openid)
            const role = 'user'
            const token = signToken({ openid, role })
            // return structured response with user object
            res.json({ success: true, data: { token, role, openid, user } })
        } catch (e) {
            console.error('DB error in /user/login:', e)
            return res.status(500).json({ success: false, message: '数据库错误' })
        }
    } catch (err) {
        console.error('Error in /user/login:', err)
        res.status(500).json({ success: false, message: '服务器内部错误' })
    }
})

module.exports = router
