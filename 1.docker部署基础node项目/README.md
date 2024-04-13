# 使用 docker 部署 node 项目-基础版

普通nodejs程序，以express为例

- 没有使用数据库
- 没有使用 redis
- 无环境变量



## 创建 Dockerfile

```dockerfile
# 基于 Node.js 官方镜像
FROM node:18

# 创建并设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3002

# 启动应用
CMD ["npm", "run" ,"prod"]
```



`FROM node:18`

- 这一行指定了基础镜像，即构建您的镜像所依赖的镜像。这里使用的是官方的 Node.js 镜像，标签为 `18`，表示使用 Node.js 的 18.x 版本。Docker 会从 Docker Hub 上拉取这个基础镜像。

`WORKDIR /usr/src/app`

- `WORKDIR` 用于设置容器内的工作目录。之后的命令（如 `COPY` 和 `RUN`）都会在这个目录下执行。这里将工作目录设置为 `/usr/src/app`。

`COPY package*.json ./`

- 这一行将项目的 `package.json` 和 `package-lock.json`（如果存在）复制到工作目录中。这是为了在下一步中安装依赖时使用。

`RUN npm install`

- 这条命令在容器内运行 `npm install`，根据 `package.json` 和 `package-lock.json` 安装项目所需的依赖。

`COPY . .`

- 这条命令将项目中的所有文件复制到容器内的工作目录中。注意，这里使用了两个 `.`，第一个表示当前项目目录，第二个表示容器内的工作目录。

`RUN npm run build`

- 这条命令运行 `npm run build`，这通常是在生产环境下构建项目的命令。请确保您的 `package.json` 中有 `build` 脚本。

`EXPOSE 3002`

- 这条命令告诉 Docker 在运行容器时应该暴露哪个端口。这里暴露的是 3002 端口，因为您的应用程序是在这个端口上运行的。

`CMD ["npm", "run", "prod"]`

- `CMD` 指定了容器启动时要运行的命令。这里使用 `npm start` 来启动您的 Express 应用程序。这个命令应该在 `package.json` 的 `scripts` 部分定义。



## **构建 Docker 镜像**

语法：

```shell
docker build -t <your-dockerhub-username>/<your-image-name>:<tag> .
```

示例：

```shell
docker build -t jarvis0426/chatgpt-web-service-base:1.0.0 .
```

解析：

- `docker build`: 这是 Docker 的构建命令，用于从 Dockerfile 创建镜像。
- `-t` 参数用于为构建的镜像指定一个标签（tag）。这个标签通常包括仓库名、镜像名和版本号，格式为 `<repository>/<image-name>:<tag>`。在您的例子中，`jarvis0426` 是 Docker Hub 的用户名，`chatgpt-web-service-base` 是镜像的名称，`1.0.0` 是版本号。
- `.`: 这指定了 Dockerfile 的位置。在这个例子中，`.` 表示当前目录，意味着 Docker 将在当前目录下查找名为 `Dockerfile` 的文件，并使用它来构建镜像。



其他常见参数：

- `--file` 或 `-f`: 指定要使用的 Dockerfile 路径。默认情况下，Docker 会在当前目录下查找名为 `Dockerfile` 的文件。如果您的 Dockerfile 位于不同的位置或有不同的名称，您可以使用这个参数指定它。例如：`docker build -f path/to/your/Dockerfile .`
- `--build-arg`: 设置构建时的变量。这些变量可以在 Dockerfile 中使用，通常用于传递敏感信息或配置数据。例如：`docker build --build-arg API_KEY=your_api_key .`
- `--no-cache`: 构建镜像时不使用缓存。这确保了每一层都将重新构建，有助于获取最新的依赖和更新。例如：`docker build --no-cache -t my-image .`
- `--pull`: 总是尝试从远程仓库拉取更新的基础镜像，即使本地已经有了该镜像。这有助于确保基础镜像是最新的。例如：`docker build --pull -t my-image .`
- `--rm`: 构建完成后删除临时容器。这是默认行为，但如果您之前更改过此设置，可以使用此参数确保临时容器被清理。例如：`docker build --rm -t my-image .`



问题

```
❯ docker build -t jarvis0426/chatgpt-web-service-base:1.0.0 .

ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?

解决：把 docker 跑起来就好了。比如 如果你是 mac，你可以把 Docker 这个 APP 运行起来就好了
```



![image-20240412105407127](https://qn.huat.xyz/mac/202404121054236.png)





## **运行 Docker 容器**

语法：

```shell
docker run -d -p 3002:3002 --name <container-name> <your-image-name>:<tag>
```

示例：

```shell
docker run -d -p 3002:3002 --name chatgpt-service-base jarvis0426/chatgpt-web-service-base:1.0.0
```

解析：

- `docker run`: 这是 Docker 的运行命令，用于从镜像启动容器。
- `-d`: 这个选项让容器在后台运行（detached mode）。
- `-p 3002:3002`:  格式为 `-p <宿主机端口>:<容器端口>`。 这个选项映射了容器的端口到宿主机的端口。在这个例子中，容器的 3002 端口被映射到宿主机的 3002 端口，这意味着你可以通过访问宿主机的 3002 端口来访问容器中应用的服务。
- `--name chatgpt-service-base`: 这个选项给容器指定了一个名称，这样你可以通过名称来引用容器，而不是使用容器的 ID。
- `jarvis0426/chatgpt-web-service-base:1.0.0`: 这指定了要从哪个镜像启动容器。在这个例子中，它使用的是之前构建的 `jarvis0426/chatgpt-web-service-base` 镜像的 `1.0.0` 版本。

其他常见参数：

- `--name <容器名>`: 为容器指定一个名称，这样可以更方便地管理和引用容器。例如：`--name my-container`。
- `-e <环境变量>` 或 `--env <环境变量>`: 设置容器内的环境变量。可以多次使用此参数来设置多个环境变量。例如：`-e MY_VAR=my_value`。
- `-v <宿主机目录>:<容器目录>` 或 `--volume <宿主机目录>:<容器目录>`: 将宿主机的目录或文件挂载到容器中的指定目录。这用于数据持久化和共享文件。例如：`-v /host/path:/container/path`。
- `--restart <策略>`: 设置容器的重启策略。常见的策略包括 `no`（不重启，默认）、`always`（总是重启）、`on-failure`（失败时重启）。例如：`--restart always`。
- `--network <网络名>`: 将容器连接到指定的网络。这用于配置容器的网络连接。例如：`--network my-network`。
- `--rm`: 容器退出时自动删除容器。这对于临时容器很有用，可以避免留下无用的容器实例。



## **分享 Docker 镜像**



### **本地分享**

可以将构建好的镜像保存为一个文件，然后分享给他人。使用以下命令保存镜像为文件：

语法：

```shell
docker save -o <your-image-name>.tar <your-image-name>:<tag>
```

示例：

```shell
docker save -o chatgpt-web-service-base.tar chatgpt-web-service-base:1.0.0
```

将生成的 `chatgpt-web-service-base.tar` 文件分享给他人，他们可以使用以下命令加载镜像：

```shell
docker load -i chatgpt-web-service-base.tar
```



### **使用 Docker Hub**

您可以将镜像推送到 Docker Hub 或其他容器镜像仓库，然后他人可以直接从仓库拉取镜像。首先，需要在 Docker Hub 上创建一个仓库，然后使用以下命令推送镜像：

语法：

```shell
docker login
docker tag <your-image-name>:<tag> <your-dockerhub-username>/<your-image-name>:<tag>
docker push <your-dockerhub-username>/<your-image-name>:<tag>
```

例如：

```shell
docker login
docker tag chatgpt-web-service-base:1.0.0 jarvis0426/chatgpt-web-service-base:1.0.0
docker push jarvis0426/chatgpt-web-service-base:1.0.0
```

他人可以使用以下命令拉取并运行镜像：

```shell
docker pull jarvis0426/chatgpt-web-service-base:1.0.0
docker run -d -p 3002:3002 --name chatgpt-service jarvis0426/chatgpt-web-service-base:1.0.0
```



问题

````
docker login
docker tag chatgpt-web-service-base:1.0.0 jarvis0426/chatgpt-web-service-base:1.0.0
docker push jarvis0426/chatgpt-web-service-base:1.0.0
从这个命令可以看出，在推送到 docker hub  之前先登录，然后执行了 docker tag ，最后执行了 docker push ，如果不执行 docker tag 可以吗？


是的，如果您在构建镜像时已经使用了完整的名称（包括用户名和仓库名），那么在推送到 Docker Hub 之前，您不一定需要执行 `docker tag` 命令。

例如，如果您在构建镜像时直接使用了如下命令：

```sh
docker build -t jarvis0426/chatgpt-web-service-base:1.0.0 .
```

那么，您可以直接在登录 Docker Hub 之后执行 `docker push` 命令，而无需再次使用 `docker tag` 命令：

```sh
docker login
docker push jarvis0426/chatgpt-web-service-base:1.0.0
```

在这种情况下，由于镜像已经被正确地标记为 `jarvis0426/chatgpt-web-service-base:1.0.0`，所以直接推送即可。`docker tag` 命令主要用于给已有的镜像添加新的标签（tag），如果镜像在构建时已经被赋予了正确的标签，那么就不需要再次使用 `docker tag`。
````





## 构建优化

不同版本的镜像大小：

![image-20240412114223252](https://qn.huat.xyz/mac/202404121142346.png)



### 1.46G

1.0.3 这个版本是没有做任何优化的，大小居然达到了**1.46G**，对应的 Dockerfile

```dockerfile
# 基于 Node.js 官方镜像
FROM node:18

# 创建并设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3002

# 启动应用
CMD ["npm", "run" ,"prod"]
```

Docker 镜像大小主要取决于基础镜像的大小和在构建过程中添加的内容。由于基础镜像是 Node.js 的官方镜像，它本身就相对较大，再加上应用程序和依赖项，最终的镜像大小可能会变得相当大。



### 493MB

- **使用更轻量的基础镜像**

考虑使用 Node.js 的官方轻量级镜像，如 `node:18-alpine`。Alpine Linux 是一个非常小的 Linux 发行版，专为容器化而设计，可以显著减小镜像大小。

```
FROM node:18-alpine
```

只修改这一行代码，就能镜像大小就能降低约三分之二。



### 318MB

- **多阶段构建**

使用多阶段构建可以将构建过程分为多个阶段，每个阶段使用不同的基础镜像，最终只保留所需的文件。这样可以减少最终镜像的大小。

```dockerfile
# 构建阶段
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/build ./build
COPY package*.json ./
RUN npm install
EXPOSE 3002
CMD ["node", "build/index.mjs"]
```

#### 构建阶段

- `FROM node:18-alpine as builder`: 这一行指定了构建阶段使用的基础镜像（`node:18-alpine`），并给这个阶段命名为 `builder`。这个名称将在后面的阶段中用于引用当前阶段构建的结果。
- `WORKDIR /usr/src/app`: 设置工作目录为 `/usr/src/app`。
- `COPY package*.json ./`: 将 `package.json` 和 `package-lock.json`（如果存在）复制到工作目录。
- `RUN npm install`: 安装项目依赖。
- `COPY . .`: 将项目的所有其他文件复制到工作目录。
- `RUN npm run build`: 执行构建命令，通常会生成一个 `build` 目录，其中包含编译后的代码。

#### 运行阶段

- `FROM node:18-alpine`: 这一行开始了新的阶段，同样使用 `node:18-alpine` 作为基础镜像。这个阶段是为了运行应用准备的。
- `WORKDIR /usr/src/app`: 再次设置工作目录。
- `COPY --from=builder /usr/src/app/build ./build`: 从之前的构建阶段（名为 `builder`）复制 `build` 目录到当前工作目录的 `build` 目录中。这里只复制了我们需要运行应用的编译后的代码。
- `COPY package*.json ./`: 再次复制 `package.json` 和 `package-lock.json`（如果存在）。
- `RUN npm install`: 安装依赖。
- `EXPOSE 3002`: 暴露端口 3002。
- `CMD ["node", "build/index.mjs"]`: 设置容器启动时执行的命令，这里是使用 Node.js 运行编译后的代码。



#### 为什么使用多阶段构建？

- **减小镜像大小**：通过在构建阶段安装所有依赖和编译代码，然后在运行阶段只复制所需的编译后的代码和生产依赖，可以显著减小最终镜像的大小。
- **提高安全性**：构建阶段可能需要额外的工具和依赖，这些在运行阶段是不必要的，通过分离这两个阶段，可以减少最终镜像中潜在的安全风险。
- **优化构建缓存**：在多阶段构建中，每个阶段都可以利用 Docker 的层缓存，这可以加快后续构建的速度。





### 173MB

- **仅安装生产依赖**

在安装依赖时，使用 `npm install --only=production` 命令，这样可以避免安装不必要的开发依赖。

```dockerfile
# 构建阶段
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/build ./build
COPY package*.json ./
RUN npm install --only=production
EXPOSE 3002
CMD ["node", "build/index.mjs"]
```

`RUN npm install --only=production`: 安装仅生产环境所需的依赖，这样可以避免安装不必要的开发依赖，从而减小镜像大小。







## 构建不同环境

随便写了一个 dockerfile 跟上面那个没关系，目的是展示如何构建不同环境下的镜像

```dockerfile
# 基础镜像
FROM node:18-alpine as builder

# 工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用代码
COPY . .

# 设置构建参数
ARG API_KEY
ARG MODEL

# 将构建参数设置为环境变量
ENV API_KEY=${API_KEY}
ENV MODEL=${MODEL}


# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "index.mjs"]

```



### 测试环境

```shell
docker build \
  --build-arg API_KEY=your_api_key \
  --build-arg MODEL=test \
  -t jarvis0426/my-node-app:1.0.0 .
```



### 生产环境

```shell
docker build \
  --build-arg API_KEY=your_api_key \
  --build-arg MODEL=prod \
  -t jarvis0426/my-node-app:1.0.0 .
```



Nodejs 代码中通过 `process.env.API_KEY;` 来获取环境变量的值
