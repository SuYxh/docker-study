# 使用 Node.js 的官方镜像
FROM node:14-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制其他源代码文件
COPY . .

# 暴露端口 3000
EXPOSE 3000

# 运行 Express 应用
CMD ["node", "index.js"]