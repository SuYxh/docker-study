# 构建阶段
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./
COPY script.js ./

# 设置构建参数
ARG BASE_URL
ARG MODEL

# 设置环境变量以供脚本使用
ENV BASE_URL=${BASE_URL}
ENV MODEL=${MODEL}

# 安装依赖
RUN npm install
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/env ./env
COPY package*.json ./
RUN npm install --only=production
EXPOSE 3002
CMD ["node", "build/index.mjs"]
