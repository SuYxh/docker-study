# 使用 docker 部署 node 项目-增加环境变量



## Dockerfile

在构建时候增加`BASE_URL` 和 `MODEL` 这2个环境变量， 在运行 docker 时候需要需要增加 `API_KEY` 和 `TOKEN` 这个2个环境变量

```dockerfile
# 构建阶段
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./

# 设置构建阶段的环境变量
ARG BASE_URL
ARG MODEL
ENV BASE_URL=${BASE_URL}
ENV MODEL=${MODEL}

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



## 构建



### 构建测试环境

```shell
docker build \
  --build-arg BASE_URL=https://test.example.com \
  --build-arg MODEL=test \
  -t jarvis0426/my-node-app:test1.0.0 .
```

推送 docker hub

```shell
docker push jarvis0426/my-node-app:test1.0.0
```



### 构建生产环境

```shell
docker build \
  --build-arg BASE_URL=https://prod.example.com \
  --build-arg MODEL=prod \
  -t jarvis0426/my-node-app:prod1.0.0 .
```

推送 docker hub

```shell
docker push jarvis0426/my-node-app:prod1.0.0
```



## 运行



### 运行测试环境

```shell
docker run -d -p 3002:3002 \
  -e API_KEY=your_test_api_key \
  -e TOKEN=your_test_token \
  --name my-node-app-test \
  jarvis0426/my-node-app:test1.0.0
```



请求示例

![image-20240412132836501](https://qn.huat.xyz/mac/202404121328568.png)





### 运行生产环境

```shell
docker run -d -p 3003:3002 \
  -e API_KEY=your_prod_api_key \
  -e TOKEN=your_prod_token \
  --name  my-node-app-prod \
  jarvis0426/my-node-app:prod1.0.0
```

> 宿主机的 3002 端口已经被占用了，所以这里改成了 3003



请求示例

![image-20240412133043490](https://qn.huat.xyz/mac/202404121330525.png)



## 问题

我们测试了上述的 2 个不同环境下的镜像，可以发现：

2 个版本的`BASE_URL` 和` MODEL` 都没有值，这是为什么呢？

在之前的 dockerfile 中，`BASE_URL` 和 `MODEL` 是在构建镜像时作为构建参数传递的，而不是作为运行时的环境变量。这意味着它们只在构建过程中可用，而不会在运行容器时自动设置为环境变量。要在运行时访问这些变量，您需要在 Dockerfile 的运行阶段将它们设置为环境变量，如下所示：



### 修改 dockerfile

```dockerfile
# 构建阶段
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./
COPY script.js ./

# 设置构建参数
ARG BASE_URL
ARG MODEL

# 使用构建参数
RUN echo "Docker build -> Base URL: $BASE_URL"
RUN echo "Docker build -> Model: $MODEL"

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

# 将构建参数设置为环境变量
ENV BASE_URL=${BASE_URL}
ENV MODEL=${MODEL}

EXPOSE 3002
CMD ["node", "build/index.mjs"]
```

这样，当您运行容器时，`BASE_URL` 和 `MODEL` 将作为环境变量设置，您的应用将能够访问它们。

请注意，您还需要在构建镜像时提供这些参数，就像您之前做的那样。



### 增加 `script.js`

在项目根目录下增加和dockerfile 同级

```js
// 使用 Node.js 的 fs（文件系统）模块来写文件
const fs = require('fs')
const path = require('path')

// 从环境变量中读取 MODEL 值
const model = process.env.MODEL

// 创建 env 文件的内容
const content = `MODEL=${model}`

// 写入 env 文件
fs.writeFile(path.join(__dirname, 'env'), content, (err) => {
  if (err) {
    console.error('Failed to write env file:', err)
    process.exit(1)
  }
  else {
    console.log('env file written successfully')
  }
})
```

> 这里只是一个示例，已经可以说明我们在构建的时候可以拿到 MODEL 这个参数，然后我们就可以根据这个配置去打包生产或者测试包了



### 修改 build 命令

```shell
"build": "node script.js && npm run clean && tsup"
```





### 构建镜像

```shell
# 构建测试
docker build \
  --build-arg BASE_URL=https://test.example.com \
  --build-arg MODEL=test \
  -t jarvis0426/my-node-app:test1.0.1 .
  
# 构建生产  
docker build \
  --build-arg BASE_URL=https://prod.example.com \
  --build-arg MODEL=prod \
  -t jarvis0426/my-node-app:prod1.0.1 .
```



### 运行容器

```shell
# 运行测试
docker run -d -p 3002:3002 \
	-e BASE_URL=https://test.example.com \
	-e MODEL=test \
  -e API_KEY=your_test_api_key \
  -e TOKEN=your_test_token \
  --name my-node-app-test \
  jarvis0426/my-node-app:test1.0.1
 
# 运行生产
docker run -d -p 3003:3002 \
  -e BASE_URL=https://prod.example.com \
  -e MODEL=prod \
  -e API_KEY=your_prod_api_key \
  -e TOKEN=your_prod_token \
  --name  my-node-app-prod \
jarvis0426/my-node-app:prod1.0.1
```





测试环境-请求示例：

![image-20240412160040568](https://qn.huat.xyz/mac/202404121600681.png)





正式环境-请求示例：

![image-20240412160136076](https://qn.huat.xyz/mac/202404121601138.png)



> 数据库我也可以通过这种方式进行配置和链接





### 内容检查 

检查 `script.js` 生成的 `env` 文件中是什么？

```
docker exec my-node-app-test cat /usr/src/app/env
```

需要现将容器运行起来，然后这个命令就能看到文件的内容，从而也能说明我们在` script.js ` 中确实可以获取到`MODEL` 的值，我们就可以根据不同环境执行不同的构建脚本了。

进入容器的命令：

```shell
docker exec -it my-node-app-test /bin/sh
```

解释：

- `docker exec`: 运行一个命令在运行中的容器里。
- `-it`: 这个参数组合是 `-i` 和 `-t` 的缩写，`-i` 表示开启交互式模式，允许您与容器进行交互；`-t` 分配一个伪终端，这让您感觉就像在使用一个常规终端一样。
- `my-node-app-test`: 指定要进入的容器的名称。
- `/bin/sh`: 在容器中执行的命令，这里是启动一个 shell。根据容器内部的 Linux 发行版，您也可以尝试使用 `/bin/bash`，但在大多数基于 Alpine 的容器中，默认的 shell 是 `sh`。

一旦执行这个命令，您将会进入容器的终端，可以浏览文件系统、运行命令、查看日志文件等等。当您完成操作并想退出容器时，可以简单地键入 `exit`。



### ARG 和 ENV 有什么区别？使用场景分别是什么？


在 Docker 中，`ARG` 和 `ENV` 是两种不同的指令，它们用于设置环境变量，但它们的用途和行为有显著差异。

#### ARG (构建参数)
- **定义**：`ARG` 在 Dockerfile 中定义了一个变量，它可以在构建 Docker 镜像的过程中使用。这个变量的作用范围仅限于构建过程，一旦镜像构建完成，这个变量就不会被包含在最终的镜像中。
- **用途**：`ARG` 主要用于传递构建时的参数，如版本号、下载链接或者配置选项，这些参数通常在构建时需要，但不需要在运行容器时保留。
- **示例**：
  ```dockerfile
  ARG VERSION=latest
  RUN curl -o app.jar http://example.com/app-${VERSION}.jar
  ```

#### ENV (环境变量)
- **定义**：`ENV` 在 Dockerfile 中设置环境变量，这些变量不仅在镜像构建过程中可用，而且在容器运行时也会保留。
- **用途**：`ENV` 用于定义将在运行时提供给容器内应用的环境变量。它们对于配置软件行为非常有用，尤其是那些响应环境变量配置的应用程序。
- **示例**：
  ```dockerfile
  ENV DB_HOST=db.example.com
  ENV DB_PORT=5432
  ```

#### 使用场景比较

- **ARG**：
  - 在 Docker 构建过程中需要一些特定的值来执行构建命令，如下载特定版本的应用或依赖。
  - 当你需要根据构建参数来定制镜像，但不希望这些参数在运行容器时可用或暴露时。
  - 可以通过在构建 Docker 镜像时使用 `--build-arg` 参数来动态传入这些值。

- **ENV**：
  - 当你需要设置将持久化到镜像中，并在容器启动时作为环境变量提供给容器内运行的应用时。
  - 在运行时配置应用，如数据库连接信息、服务端口等。
  - 可以在创建容器时通过 `-e` 或 `--env` 选项覆盖 `ENV` 设置的值，提供运行时的灵活性。

总结，`ARG` 用于影响镜像的构建过程，而 `ENV` 用于影响容器的运行时行为。选择使用哪个取决于你需要的配置值是仅在构建时使用还是需要持续影响运行时的环境。
