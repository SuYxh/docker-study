# 使用官方Node.js基础镜像作为基础 Alpine 版本的镜像体积小，启动快。这里使用了 builder 作为这个阶段的名称，便于在后续步骤中引用。
FROM node:18-alpine as builder

# 设置了容器内的工作目录为 /app。所有后续的 RUN, CMD, ENTRYPOINT, COPY, 和 ADD 指令都将在这个目录下执行。
WORKDIR /app

# 将项目文件复制到容器内
COPY package*.json ./
COPY ./ ./

# 安装项目依赖
RUN npm install

# 构建Vue应用
RUN npm run build

# 标记了一个新的构建阶段，使用轻量级的 Nginx Alpine 镜像作为基础
FROM nginx:stable-alpine

# 将定制的 Nginx 配置文件复制到容器中的相应位置
COPY nginx.conf /etc/nginx/nginx.conf

# 清理 Nginx 容器中默认的静态文件，为复制新的构建结果做准备
RUN rm -rf /usr/share/nginx/html/*

# 从前一个构建阶段（名为 builder）中复制构建好的 Vue 应用文件到 Nginx 容器的html服务目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口（通常是80或自定义端口）
EXPOSE 8080

# 启动Nginx服务，关闭守护进程模式，让 Nginx 在前台运行
CMD ["nginx", "-g", "daemon off;"]