# 构建阶段
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./

# 安装依赖并构建应用
RUN npm install
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine
WORKDIR /usr/src/app

# 从构建阶段复制构建好的应用到当前阶段
COPY --from=builder /usr/src/app/build ./build
COPY package*.json ./

# 安装仅运行时需要的依赖
RUN npm install --only=production

# 暴露端口
EXPOSE 3002

# 运行应用
CMD ["node", "build/index.mjs"]
