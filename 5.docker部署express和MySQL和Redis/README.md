## Docker部署 express  MySQL Redis

需求：使用 Docker Compose 来部署一个基于 Express 和 MySQL 以及 Redis 的应用程序。

为了使用 Docker Compose 部署一个基于 Express、MySQL 和 Redis 的应用程序，需要准备几个组件：Dockerfile、docker-compose.yml 文件、Express 应用程序代码以及一个环境变量文件（.env）。

### 创建 Dockerfile

首先，为你的 Express 应用程序创建一个 Dockerfile。这个 Dockerfile 将定义如何构建你的 Express 应用程序的 Docker 镜像。

```dockerfile
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
CMD ["node", "index.js"]
```

### 创建 docker-compose.yml

接着，创建 `docker-compose.yml` 文件来定义和运行你的多容器 Docker 应用程序。

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: example
      MYSQL_DATABASE: mydb
      MYSQL_USER: user
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - ./mysql-data:/var/lib/mysql
    restart: always

  redis:
    image: redis:6.0
    ports:
      - "6379:6379"
    volumes:
      - ./redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: always

  express-app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis
    restart: always

volumes:
  mysql-data:
  redis-data:

```

### 创建redis.conf

```
save 60 1
```

在 Redis 的配置中，`save 60 1` 是一条持久化设置指令，它指定了 Redis 数据持久化到磁盘的条件。这条指令的具体意义是：

- `60` 秒内如果至少有 `1` 次数据修改（键值对的改变），则 Redis 将自动将数据快照保存到磁盘上的持久化文件中（通常是 `dump.rdb`）。

#### 解析指令格式

- save [seconds] [changes]
  - **[seconds]**: 指定了时间窗口长度，即在这段时间内进行监控。
  - **[changes]**: 指定了必须达到的修改次数阈值。

#### 持久化行为

这种配置方式允许你定制 Redis 的数据备份频率和条件，确保数据的安全性，同时也可以根据实际业务需求平衡性能和数据安全之间的关系。例如，如果设置为 `save 900 1`，则表示如果在 900 秒内，数据库至少有一次修改，就进行一次数据快照保存。

#### 应用场景

这种设置对于确保在数据密集型应用中数据的安全非常有用，尤其是当数据丢失代价很高时。通过适当配置这些参数，可以使得 Redis 在发生故障时能够从最近的一次快照恢复，从而最大程度减少数据丢失。



如果你想让 Redis 在每次有数据变动时都进行持久化，你可以考虑使用 AOF（Append Only File）持久化方法，而不是 RDB。AOF 持久化会记录每个写操作到一个日志文件中，这样即使在发生故障的情况下，也能通过重新执行这些操作来重建整个数据集。

#### 配置 AOF 持久化

1. **开启 AOF**： 在 Redis 的配置文件中，设置 `appendonly` 为 `yes` 来开启 AOF 持久化。

   ```
   confCopy code
   appendonly yes
   ```

2. **设置 AOF 重写策略**： AOF 提供几种不同的策略来决定何时重写 AOF 文件以压缩其大小。最严格的策略是 `always`，即每次数据变动都会写入 AOF 文件。这种设置可以通过设置 `appendfsync` 为 `always` 实现。

   ```
   confCopy code
   appendfsync always
   ```

   注意，这种设置虽然可以最大程度地减少数据丢失的风险，但可能会严重影响性能，因为每个写命令都需要同步写入磁盘。

#### 考虑性能和数据安全性的平衡

虽然 `appendfsync always` 提供了最高级别的数据安全性，但在高负载的生产环境中，它可能会导致显著的性能瓶颈。更常见的配置是使用 `everysec`，这意味着大约每秒写入一次。这仍然提供了良好的持久性，同时对性能的影响相对较小：

```
confCopy code
appendfsync everysec
```

#### 在 Docker 中配置 Redis

在 `docker-compose.yml` 中，你可以添加一个卷来挂载自定义的 Redis 配置文件：

```
yamlCopy code
redis:
  image: redis
  ports:
    - "6379:6379"
  volumes:
    - ./redis-data:/data
    - ./redis.conf:/usr/local/etc/redis/redis.conf
  command: redis-server /usr/local/etc/redis/redis.conf
  restart: always
```

在这里，`./redis.conf` 是你的本地配置文件路径

通过这种配置，你可以达到每次数据有变动就持久化一次的需求，同时也需要考虑其对系统性能的影响。



### 环境配置 .env

可以创建一个 `.env` 文件来存储敏感或配置信息，然后在 `docker-compose.yml` 中引用。

```
MYSQL_HOST=mysql
MYSQL_USER=user
MYSQL_PASSWORD=password
MYSQL_DB=mydb
REDIS_HOST=redis
PORT=3000
```

### Express 应用示例

```javascript
const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require('body-parser');
const redis = require("redis");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());

let connection = null 

console.log("process.env.MYSQL_HOST", process.env.MYSQL_HOST);

// Create MySQL pool connection
async function createMySqlPool() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_DB,
    password: process.env.MYSQL_PASSWORD,
  });
  try {
    const connection = await pool.getConnection();
    console.log("Connected to MySQL!");
    connection.release();
    return pool;
  } catch (error) {
    console.error("Error connecting to MySQL:", error);
    throw error;
  }
}

// Create Redis client
async function createRedisClient() {
  const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:6379`,
  });
  try {
    await client.connect();
    console.log("Connected to Redis!");
    return client;
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=INNODB;
    `;
    await connection.execute(createTableSql);
    console.log("MySQL: Users table created or already exists.");
    return;
  } catch (error) {
    console.error(`MySQL connection failed: ${error.message} `);
  }
}

async function startServer() {
  try {
    connection = await createMySqlPool();
    await initializeDatabase();
    const redisClient = await createRedisClient();

    app.get("/mysql", async (req, res) => {
      try {
        const [results] = await pool.query("SELECT 1 + 1 AS solution");
        res.send(`The solution is: ${results[0].solution}`);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    app.get("/redis/set", async (req, res) => {
      try {
        await redisClient.set("testVal", "This is a test tlue");
        res.send(`The value from Redis: This is a test tlue`);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    app.get("/redis/get", async (req, res) => {
      try {
        const value = await redisClient.get("testVal");
        res.send(`The value from Redis get: ${value}`);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    app.get("/redis", async (req, res) => {
      try {
        await redisClient.set("test", "This is a test value");
        const value = await redisClient.get("test");
        res.send(`The value from Redis: ${value}`);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // Register user endpoint
    app.post("/register", async (req, res) => {
      const { username, password, email } = req.body;
      if (!username || !password || !email) {
        return res
          .status(400)
          .send("Username, password, and email are required");
      }

      try {
        const [result] = await connection.execute(
          "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
          [username, password, email]
        );
        res
          .status(201)
          .send({ message: "User registered", userId: result.insertId });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Fetch user information endpoint
    app.get("/user/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const cachedUser = await redisClient.get(`user:${id}`);
        if (cachedUser) {
          return res.send(JSON.parse(cachedUser));
        }
        const [rows] = await connection.query(
          "SELECT id, username, email FROM users WHERE id = ?",
          [id]
        );
        if (rows.length > 0) {
          await redisClient.set(`user:${id}`, JSON.stringify(rows[0]), {
            EX: 3600, // Cache expiration time in seconds
          });
          res.send(rows[0]);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Fetch all users information endpoint
    app.get("/users", async (req, res) => {
      try {
        const [rows] = await connection.query(
          "SELECT id, username, email FROM users"
        );
        res.send(rows);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Fetch all users data from Redis
    app.get("/redis/users", async (req, res) => {
      try {
        const keys = await redisClient.keys("user:*");
        const users = [];
        for (let key of keys) {
          const user = await redisClient.get(key);
          users.push(JSON.parse(user));
        }
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to one or more services:", error);
    process.exit(1);
  }
}

startServer();

```

### 构建和运行

使用以下命令来构建和运行你的 Docker Compose 项目：

```bash
docker-compose up --build
```

这将启动你的 Express 应用程序、MySQL 和 Redis 服务。

![image-20240413174021471](https://qn.huat.xyz/mac/202404131740551.png)

说明服务启动成功，但是我们也看到了一些报错，接下来我们进行优化。



### 优化

先启动 mysql、redis 后在启动 express 服务

```yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: example  # 设置 MySQL root 用户的密码
      MYSQL_DATABASE: mydb          # 创建初始数据库
      MYSQL_USER: user              # 设置 MySQL 用户名
      MYSQL_PASSWORD: password      # 设置 MySQL 用户密码
    ports:
      - "3306:3306"                 # 映射 MySQL 端口到宿主机
    volumes:
      - ./mysql-data:/var/lib/mysql # 持久化 MySQL 数据到宿主机
    restart: always                 # 若服务失败，总是尝试重启服务
    healthcheck:                    # 定义服务的健康检查
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s                 # 检查频率
      timeout: 5s                   # 检查超时时间
      retries: 5                    # 检查失败后的重试次数
      start_period: 30s             # 服务启动后，开始健康检查前的等待时间

  redis:
    image: redis:6.0
    ports:
      - "6379:6379"                 # 映射 Redis 端口到宿主机
    volumes:
      - ./redis-data:/data          # 持久化 Redis 数据到宿主机
      - ./redis.conf:/usr/local/etc/redis/redis.conf # 使用自定义配置文件
    command: redis-server /usr/local/etc/redis/redis.conf # 启动命令
    restart: always                 # 若服务失败，总是尝试重启服务
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s                 # 检查频率
      timeout: 5s                   # 检查超时时间
      retries: 5                    # 检查失败后的重试次数
      start_period: 10s             # 服务启动后，开始健康检查前的等待时间

  express-app:
    build:
      context: .                    # 指定 Docker 构建的上下文目录
      dockerfile: Dockerfile        # 指定用于构建的 Dockerfile
      args:
        - IMAGE_NAME=my-custom-express-app # 构建参数，传递给 Dockerfile
    image: my-custom-express-app:latest  # 自定义镜像名称及标签
    ports:
      - "3000:3000"                 # 映射 Express 应用端口到宿主机
    depends_on:
      mysql:
        condition: service_healthy  # 表示依赖 MySQL 服务的健康状态
      redis:
        condition: service_healthy  # 表示依赖 Redis 服务的健康状态
    restart: always                 # 若服务失败，总是尝试重启服务

volumes:
  mysql-data:                       # 定义用于 MySQL 数据持久化的卷
  redis-data:                       # 定义用于 Redis 数据持久化的卷
```



这下可以看到就没有那个报错了

![image-20240413174820173](https://qn.huat.xyz/mac/202404131748207.png)



通过 `depends_on` 确保在启动 `express-app` 服务前，`mysql` 和 `redis` 服务已经在运行。但需要注意，`depends_on` 仅仅是确保容器启动顺序，并不会等待 `mysql` 或 `redis` 服务完全就绪。如果需要等待数据库完全就绪，可能需要在 Express 应用中实现逻辑等待数据库连接成功，或使用第三方工具如 `wait-for-it`。



### `wait-for-it`

`wait-for-it` 是一个流行的 Bash 脚本，用于等待一个特定的服务在一个特定的端口上变为可用。这对于在依赖的服务（如数据库）完全启动并准备接受连接之前延迟应用程序启动是非常有用的。它通常在 Docker 容器中使用，特别是在使用 `docker-compose` 时，以确保服务启动顺序和依赖性。

#### 如何使用 

1. **下载脚本**：首先，你需要将 `wait-for-it` 脚本加入到你的项目中，通常是通过下载脚本到你的项目目录。

   ```bash
   wget https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
   chmod +x wait-for-it.sh
   ```

2. **修改 Dockerfile**：将脚本添加到你的 Docker 镜像中，并确保它是可执行的。

   ```dockerfile
   FROM node:16-alpine

   # 工作目录
   WORKDIR /app

   # 安装依赖
   COPY package*.json ./
   RUN npm install

   # 复制项目文件
   COPY . .

   # 复制 wait-for-it 脚本
   COPY wait-for-it.sh /usr/wait-for-it.sh
   RUN chmod +x /usr/wait-for-it.sh

   # 开放端口
   EXPOSE 3000

   # 启动命令
   CMD ["/usr/wait-for-it.sh", "mysql:3306", "--", "node", "index.js"]
   ```

3. **修改 docker-compose.yml**：在你的 `express-app` 服务中，使用 `wait-for-it.sh` 脚本作为 CMD 或 ENTRYPOINT 的一部分，指定依赖服务的主机名和端口，后跟 `--` 和你的原始启动命令。

   ```yaml
   express-app:
     build: .
     image: my-custom-express-app:latest
     ports:
       - "3000:3000"
     depends_on:
       - mysql
       - redis
     command: ["/usr/wait-for-it.sh", "mysql:3306", "--", "node", "index.js"]
     restart: always
   ```

#### 如何工作

`wait-for-it.sh` 脚本接受两个主要参数：一个是你要等待的服务的地址（在上面的例子中是 `mysql:3306`），另一个是实际启动你的应用程序的命令（在上面的例子中是 `node index.js`）。脚本会一直等待直到能成功连接到指定的地址和端口，一旦连接成功，它就会执行后面的命令。

这种方式非常适合确保你的应用程序在其依赖的服务完全就绪之前不会启动，减少了启动时的连接错误。





## MySQL、Redis环境

在上面我们已经学习了如何使用 docker 部署 express、MySQL、Redis，那么我们有时候只是需要MySQL、Redis这个环境，那我们应该怎么做呢？

提供一个只包含 MySQL 和 Redis 的 `docker-compose.yml` 示例：

```yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0  # 使用 MySQL 8.0 官方镜像
    environment:
      MYSQL_ROOT_PASSWORD: example  # 设置 MySQL root 用户的密码
      MYSQL_DATABASE: mydb          # 创建初始数据库
      MYSQL_USER: user              # 设置 MySQL 用户名
      MYSQL_PASSWORD: password      # 设置 MySQL 用户密码
    ports:
      - "3306:3306"                 # 映射 MySQL 端口到宿主机
    volumes:
      - ./mysql-data:/var/lib/mysql # 持久化 MySQL 数据到宿主机
    restart: always                 # 若服务失败，总是尝试重启服务
    healthcheck:                    # 定义服务的健康检查
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s                 # 检查频率
      timeout: 5s                   # 检查超时时间
      retries: 5                    # 检查失败后的重试次数
      start_period: 30s             # 服务启动后，开始健康检查前的等待时间

  redis:
    image: redis:6.0  # 使用 Redis 6.0 官方镜像
    ports:
      - "6379:6379"   # 映射 Redis 端口到宿主机
    volumes:
      - ./redis-data:/data                    # 持久化 Redis 数据到宿主机
      - ./redis.conf:/usr/local/etc/redis/redis.conf # 使用自定义配置文件，如果没有你就注释掉
    command: redis-server /usr/local/etc/redis/redis.conf # 启动命令
    restart: always                            # 若服务失败，总是尝试重启服务
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s                           # 检查频率
      timeout: 5s                             # 检查超时时间
      retries: 5                              # 检查失败后的重试次数
      start_period: 10s                       # 服务启动后，开始健康检查前的等待时间

volumes:
  mysql-data:  # 定义用于 MySQL 数据持久化的卷
  redis-data:  # 定义用于 Redis 数据持久化的卷

```

### 说明和使用方法

1. **MySQL 和 Redis 配置**：这个配置为 MySQL 和 Redis 设置了基本的环境变量、端口映射、数据卷以及健康检查。这些设置确保了服务的正常运行和数据的持久化。
2. **数据持久化**：通过在宿主机上映射卷，你可以保证即使容器停止运行，数据也不会丢失。例如，MySQL 数据保存在 `./mysql-data` 目录，Redis 数据保存在 `./redis-data` 目录。
3. **健康检查**：为每个服务添加健康检查确保服务真正可用后再认为容器启动成功。
4. **启动和停止服务**：
   - 启动服务：在包含 `docker-compose.yml` 文件的目录中运行 `docker-compose up` 命令。
   - 停止服务：运行 `docker-compose down` 命令来停止并移除容器。如果需要同时删除卷，可以添加 `--volumes` 选项。

使用这种配置，你可以快速部署 MySQL 和 Redis 环境，适用于多种场景，如本地开发、测试或作为其他应用的依赖服务。这样的设置也易于在需要时扩展，添加其他服务或修改现有服务配置。