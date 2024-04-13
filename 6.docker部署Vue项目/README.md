## Docker部署Vue项目

### 准备Vue项目

```shell
pnpm create vite
```



![image-20240413160240689](https://qn.huat.xyz/mac/202404131602803.png)



目录结构如下：

```
.
├── .gitignore
├── README.md
├── index.html
├── package.json
├── public
│   └── vite.svg
├── src
│   ├── App.vue
│   ├── assets
│   │   └── vue.svg
│   ├── components
│   │   └── HelloWorld.vue
│   ├── main.ts
│   ├── style.css
│   └── vite-env.d.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```





### 创建Dockerfile

在Vue项目的根目录下创建一个名为`Dockerfile`的文件（无扩展名），该文件将指导Docker如何构建您的应用镜像。下面是Dockerfile的内容：

```Dockerfile
# 使用官方Node.js基础镜像作为基础 Alpine 版本的镜像体积小，启动快。这里使用了 builder 作为这个阶段的名称，便于在后续步骤中引用。
FROM node:16-alpine as builder

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
```

在这个例子中：

- 使用了两个阶段构建，第一阶段（`builder`）用于安装依赖和构建Vue应用，第二阶段基于Nginx镜像，仅包含最终的构建产物，减小了镜像大小。
- Nginx配置文件（`nginx.conf`）需要与Dockerfile同目录，并根据需要进行配置。

### 配置Nginx

创建一个名为`nginx.conf`的配置文件，以指定Nginx如何为您的Vue应用提供服务。这是一个基本示例：

```nginx
# 用户指定 Nginx 运行时使用的系统用户
user  nginx;

# 设置 Nginx 能够启动的工作进程数量，auto 根据可用 CPU 核心数自动设置
worker_processes  auto;

# 配置错误日志的路径和日志级别
error_log  /var/log/nginx/error.log notice;

# 设置存储 Nginx 主进程 PID 的文件位置
pid        /var/run/nginx.pid;

# 事件块，用于配置针对 worker 进程的连接处理
events {
    worker_connections  1024;  # 每个 worker 进程允许的最大连接数
}

# HTTP 块，用于配置 HTTP 服务器的相关设置
http {
    include       /etc/nginx/mime.types;  # 引入 MIME 类型的配置
    default_type  application/octet-stream;  # 默认 MIME 类型

    # 日志格式定义
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    # 访问日志的路径和使用的日志格式
    access_log  /var/log/nginx/access.log  main;

    sendfile        on;  # 开启高效文件传输模式
    #tcp_nopush     on;  # 注释掉的 tcp_nopush 指令可以控制数据包发送的策略

    keepalive_timeout  65;  # 长连接的超时时间（单位：秒）

    gzip  on;  # 开启 gzip 压缩

    # 服务器块，定义一个服务
    server {
        listen       8080;  # 监听的端口
        server_name  localhost;  # 服务器名称

        # 重定向所有 HTTP 请求到 HTTPS
        # location / {
        #     return 301 https://$host$request_uri;
        # }

        # location 块，定义对特定请求的处理
        location / {
            root   /usr/share/nginx/html;  # 根目录
            index  index.html;  # 默认文件
            try_files $uri $uri/ /index.html;  # 尝试提供请求的文件或目录，不存在则返回 index.html
        }

        # 配置错误页面
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;  # 错误页面的根目录
        }
    }

    # HTTPS server configuration
    # server {
    #     listen       443 ssl;  # 更改监听端口为 443，并启用 ssl
    #     server_name  localhost;

    #     ssl_certificate      /path/to/your/certificate.pem;  # 证书文件路径
    #     ssl_certificate_key  /path/to/your/private.key;  # 私钥文件路径

    #     ssl_session_cache    shared:SSL:1m;
    #     ssl_session_timeout  5m;

    #     ssl_ciphers  HIGH:!aNULL:!MD5;
    #     ssl_prefer_server_ciphers  on;

    #     location / {
    #         root   /usr/share/nginx/html;
    #         index  index.html;
    #         try_files $uri $uri/ /index.html;
    #     }

    #     error_page   500 502 503 504  /50x.html;
    #     location = /50x.html {
    #         root   /usr/share/nginx/html;
    #     }
    # }
}

```

这个配置文件设置了基本的Nginx服务器配置，并指定了一个监听8080端口的服务器，其根目录指向Vue应用的构建输出目录。`try_files`指令确保任何未匹配到静态资源的请求都重定向到`index.html`，这对于单页应用（SPA）的路由处理至关重要。

### 构建Docker镜像

在项目根目录下打开终端，执行以下命令构建Docker镜像：

```sh
docker build -t jarvis0426/my-vue-app:1.0.0 .
```



![image-20240413163651726](https://qn.huat.xyz/mac/202404131636826.png)

可以看到镜像还是非常小的。



### 运行Docker容器

构建完成后，使用以下命令运行Docker容器：

```sh
docker run -d -p 8080:8080 --name my-vue-app jarvis0426/my-vue-app:1.0.0
```

这会启动一个新的Docker容器，将容器内部的8080端口映射到主机的指定端口。

现在，您可以通过访问`http://localhost:8080`（或相应主机IP地址）来访问部署在Docker容器内的Vue应用。



### 推送到 docker hub

```shell
docker push jarvis0426/my-vue-app:1.0.0
```





### **总结**

以上就是使用Docker部署Vue项目的详细步骤。通过这种方式，您可以获得一个独立、便携且易于管理和扩展的应用部署环境，有利于在不同的环境（开发、测试、生产）中保持一致性，并简化持续集成和持续部署（CI/CD）流程。
