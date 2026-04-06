const config = (() => {
    try { return require('./config') } catch (e) { return {} }
})()

App({
    globalData: {
        host: config.host || "http://127.0.0.1:3000",
        token: null,
        user: null,
        role: null,
        cloudEnvId: null
    },
    onLaunch() {
        const token = wx.getStorageSync('token') || null
        const role = wx.getStorageSync('role') || null
        const user = wx.getStorageSync('user') || null
        if (token) this.globalData.token = token
        if (role) this.globalData.role = role
        if (user) this.globalData.user = user

        try {
            const cloudCfg = require('./cloud.env.json')
            if (cloudCfg && cloudCfg.envId && wx.cloud) {
                wx.cloud.init({ env: cloudCfg.envId, traceUser: true })
                this.globalData.cloudEnvId = cloudCfg.envId
            }
        } catch (e) { }
    },

    request(path, { method = 'GET', header = {}, data = {}, dataType = 'json' } = {}) {
        const APP = this
        const token = APP.getToken()
        if (token) header['Authorization'] = `Bearer ${token}`

        if (APP.globalData.cloudEnvId && wx.cloud && wx.cloud.callContainer) {
            return new Promise((resolve, reject) => {
                wx.cloud.callContainer({
                    config: { env: APP.globalData.cloudEnvId },
                    path: path.startsWith('/') ? path : ('/' + path),
                    method: method,
                    header: Object.assign({ 'X-WX-SERVICE': 'express', 'Content-Type': 'application/json' }, header),
                    data: data,
                    dataType: dataType,
                    success: (res) => resolve(res),
                    fail: (err) => reject(err)
                })
            })
        }

        return new Promise((resolve, reject) => {
            wx.request({
                url: (APP.globalData.host || '') + (path.startsWith('/') ? path : ('/' + path)),
                method: method,
                header: header,
                data: data,
                dataType: dataType,
                success: (r) => resolve(r),
                fail: (e) => reject(e)
            })
        })
    },

    getToken() { return this.globalData.token || wx.getStorageSync('token') },
    getRole() { return this.globalData.role || wx.getStorageSync('role') },
    getUser() { return this.globalData.user || wx.getStorageSync('user') },
    isEditor() { return this.getRole() === 'editor' },

    setAuth({ token, role, user }) {
        this.globalData.token = token || null
        this.globalData.role = role || null
        this.globalData.user = user || null
        if (token) wx.setStorageSync('token', token); else wx.removeStorageSync('token')
        if (role) wx.setStorageSync('role', role); else wx.removeStorageSync('role')
        if (user) wx.setStorageSync('user', user); else wx.removeStorageSync('user')
    },

    clearAuth() {
        this.globalData.token = null
        this.globalData.role = null
        this.globalData.user = null
        wx.removeStorageSync('token')
        wx.removeStorageSync('role')
        wx.removeStorageSync('user')
    }
})
