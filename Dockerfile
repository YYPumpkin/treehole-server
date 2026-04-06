FROM node:18-alpine

# TreeHole Server
WORKDIR /app

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 拷贝 package 文件并安装依赖（生产环境）
COPY package*.json ./
RUN npm install --production

# 拷贝源码
COPY . .

# 为健康检查安装 curl（alpine 环境）
RUN apk add --no-cache curl

# 运行时使用非 root 用户
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

# 健康检查（访问 /api/health）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "index.js"]
