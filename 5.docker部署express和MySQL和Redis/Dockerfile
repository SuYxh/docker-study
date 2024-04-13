# 使用 Node.js 官方镜像
FROM node:16-alpine

# 创建并设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用程序代码
COPY . .

# 开放 3000 端口
EXPOSE 3000

# 启动应用程序
CMD ["node", "app.js"]