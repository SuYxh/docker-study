# 使用 docker 部署 node 项目-挂载

需求：想学习容器持久化，比如将应用的每个收到的请求记录到本机的文件中

场景：从一个简单的 Express 应用开始，它将用来演示如何使用 Docker 中的 `-v` 参数来挂载卷，这可以帮助数据持久化和文件共享。我们将创建一个 Express 应用，它简单地记录请求日志到一个文件中，并将这个文件通过 Docker 卷挂载到宿主机上。

## 创建 Express 应用

首先，创建一个简单的 Express 应用。这个应用将每个收到的请求记录到一个日志文件中。

**app.js**:
```javascript
import fs from 'fs'
import path from 'path'
import express from 'express'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

// 确保日志文件夹存在
// const logDirectory = '/Users/yangxinhao/Desktop/docker-study/logs'
const logDirectory = '/usr/src/app/logs'
const logFilename = path.join(logDirectory, 'access.log')
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true })
}

// 简单的请求日志功能
app.use((req, res, next) => {
  const log = `${new Date().toISOString()} - ${req.method} ${req.originalUrl}\n`
  fs.appendFileSync(`${logDirectory}/access.log`, log)
  next()
})

app.get('/', (req, res) => {
  res.send('Hello, Docker!')
})

app.get('/logs', (req, res) => {
  fs.readFile(logFilename, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the log file:', err)
      return res.status(500).send('Unable to read log file')
    }
    res.send(data)
  })
})

router.get('/config', async (req, res) => {
  const BASE_URL = process.env.BASE_URL
  const MODEL = process.env.MODEL
  const API_KEY = process.env.API_KEY
  const TOKEN = process.env.TOKEN

  res.send({
    code: '200',
    data: {
      common: 'common',
      BASE_URL,
      MODEL,
      API_KEY,
      TOKEN,
    },
  })
})

app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))

```

## 编写 Dockerfile

接下来，创建一个 Dockerfile 来打包这个 Express 应用。

**Dockerfile**:
```Dockerfile
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

```

## 运行和挂载

在你的宿主机上，运行 Docker 命令来启动容器，并使用 `-v` 参数将容器内的日志目录挂载到宿主机的指定路径。例如，你可以将容器内的 `/usr/src/app/logs` 挂载到宿主机的 `/path/to/your/logs`。

```bash
docker build -t jarvis0426/express-logger:1.0.0 .
# docker run -d -p 3002:3002 -v /path/to/your/logs:/usr/src/app/logs express-logger

docker run -d -p 3002:3002 --name express-logger -v /Users/yangxinhao/Desktop/docker-study/logs:/usr/src/app/logs jarvis0426/express-logger:1.0.0
```

这样，容器内的日志文件 `access.log` 将被写入到宿主机的 `/path/to/your/logs` 目录中，实现了数据的持久化和共享。

通过这个例子，可以看到如何结合 Express 应用和 Docker 来使用卷挂载实现数据持久化的操作。这对于生产环境中日志管理、数据备份等方面非常有用。

## 问题

经过上述步骤跑起来后可以发现：调用 logs 接口获取到的数据：
2024-04-12T08:47:16.759Z - GET /logs

说明目录没有挂载成功

根据你描述的情况，确实看起来像是容器内的日志路径没有正确挂载到宿主机指定的目录。这可能是因为在容器内部的应用使用的是一个不同于挂载点的路径。让我们一起检查并解决这个问题。

### 分析

在你的代码中，你指定了日志文件夹的路径为 `/Users/yangxinhao/Desktop/docker-study/logs`，这实际上是你宿主机的路径。**在 Docker 容器内，你应该使用容器内的路径而不是宿主机的路径**。因此，当你运行容器并挂载卷时，你指定的挂载路径应该与容器内的应用期望的日志路径一致。

### 解决

1. **修改应用代码**，确保日志目录指向的是容器内的路径，不是宿主机的路径。考虑到你已经通过 `-v` 参数在 Docker 命令中设置了挂载点为 `/usr/src/app/logs`，你的应用代码中也应该使用这个路径。

修改后的代码示例：
```javascript
// 确保日志文件夹存在
const logDirectory = '/usr/src/app/logs';
const logFilename = path.join(logDirectory, 'access.log');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}
```

2. **确保 Docker 命令正确**。根据你提供的 Docker 命令，看起来设置是正确的。但请确保容器内的应用确实使用的是 `/usr/src/app/logs` 作为日志路径。

```bash
docker run -d -p 3002:3002 --name express-logger -v /Users/yangxinhao/Desktop/docker-study/logs:/usr/src/app/logs jarvis0426/express-logger:1.0.0
```

### 验证挂载是否成功

- 你可以进入容器内部，查看日志文件是否与宿主机同步：
  ```bash
  docker exec -it express-logger /bin/sh
  cat /usr/src/app/logs/access.log
  ```

- 检查宿主机上的日志文件，看看是否有新的日志写入：
  ```bash
  cat /Users/yangxinhao/Desktop/docker-study/logs/access.log
  ```



可以看到修改以后就好了：

![image-20240412165644734](https://qn.huat.xyz/mac/202404121656825.png)



## 知识点

在使用 Docker 容器运行 Express 应用并处理日志文件时，遇到的问题主要涉及到了**文件路径**和**卷挂载**的理解。这里是几个关键的知识点，它们对于正确使用 Docker 非常重要：

### 1. 容器路径与宿主机路径的区别

在 Docker 容器中运行应用时，容器内的文件系统是隔离于宿主机的。这意味着容器内的路径是容器的局部文件系统路径，而不是宿主机的文件系统路径。当你在容器中指定日志文件存储的路径如 `/usr/src/app/logs` 时，这个路径是相对于容器的文件系统，而不是你的宿主机。

### 2. 卷挂载（Volume Mounting）

通过使用 `-v` 或 `--volume` 参数在 Docker 运行命令中挂载卷，可以将宿主机的一个目录或文件系统挂载到容器内的指定路径。这允许容器访问和操作宿主机的文件系统，是数据持久化和文件共享的关键技术。正确的挂载语法是：

```bash
-v [宿主机路径]:[容器内路径]
```

这样设置后，对容器路径的任何读写操作都会反映到宿主机路径上，反之亦然。

### 3. 环境隔离

Docker 容器的设计原则之一是提供一个隔离的运行环境。这意味着容器内部的环境（包括文件系统、网络配置等）应该与其他容器或宿主机环境隔离。因此，在容器内使用绝对路径或特定于宿主机的路径是不合适的，应该始终使用相对于容器环境的路径配置。

### 4. 文件权限

在使用 Docker 挂载卷时，文件和目录的权限问题也是常见的障碍。例如，如果容器以非 root 用户运行，但挂载的宿主机目录没有给予适当的访问权限，可能会导致容器内的应用无法正确读写文件。确保挂载的目录具有合适的权限是解决这类问题的关键。

### 总结

主要问题是在容器内使用了宿主机的路径，这导致了路径不匹配和数据不一致的问题。通过将应用中的日志目录路径调整为容器内的路径，并确保这个路径与你在 Docker 命令中设置的挂载卷路径相匹配，你可以确保日志文件的一致性和数据的持久化。这样的修正帮助你更好地理解和利用 Docker 的隔离和挂载功能，以便在未来的项目中避免类似的问题。

