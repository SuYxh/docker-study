## Docker部署 express 和 MySQL

需求：使用 Docker Compose 来部署一个基于 Express 和 MySQL 的应用程序。

### 创建 `Dockerfile`

首先，我们需要为 Express 应用创建一个 `Dockerfile`。这个文件将定义如何构建 Express 应用的 Docker 镜像。

```Dockerfile
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
CMD ["node", "app.js"]
```

### 创建 `docker-compose.yml`

接下来，创建 `docker-compose.yml` 文件来定义和运行多个容器，包括 Express 应用和 MySQL 服务。

```yaml
version: '3.8'  # 使用 Docker Compose 文件格式版本 3.8。

services:  # 定义服务列表。
  app:  # 第一个服务：Express 应用。
    build:  # 构建选项。
      context: .  # 构建上下文目录设置为当前目录。
      dockerfile: Dockerfile  # 使用的 Dockerfile 名称。
    image: docker-express-mysql:latest  # 在这里定义构建后的镜像名字
    ports:
      - "3000:3000"  # 端口映射：将容器的 3000 端口映射到宿主机的 3000 端口。
    volumes:
      - .:/app  # 卷挂载：将当前目录挂载到容器的 /app 目录。
    # 环境变量应该从环境文件中进行读取，这里只是学习 docker-compose 的配置文件，所以直接写死在这里 
    environment:  # 环境变量设置，供应用使用。
      - MYSQL_HOST=mysql  # MySQL 服务器的主机名。
      - MYSQL_USER=root  # MySQL 用户名。
      - MYSQL_PASSWORD=password  # MySQL 用户密码。
      - MYSQL_DATABASE=exampledb  # 使用的数据库名称。
    depends_on:  # 依赖设置，指定当前服务依赖的其他服务。
      mysql:  # 依赖于 mysql 服务。
        condition: service_healthy  # 依赖条件：mysql 服务必须处于健康状态。
  
  mysql:  # 第二个服务：MySQL 数据库。
    image: mysql:8.0  # 使用的镜像为官方 MySQL 8.0 镜像。
    environment:  # 环境变量设置。
      MYSQL_ROOT_PASSWORD: password  # MySQL root 用户的密码。
      MYSQL_DATABASE: exampledb  # 初始化时创建的数据库名称。
    volumes:
      - ./mysql-data:/var/lib/mysql  # 卷挂载：将本地的 ./mysql-data 目录挂载到容器的 /var/lib/mysql 目录。
    healthcheck:  # 健康检查配置。
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]  # 健康检查命令。
      interval: 10s  # 检查间隔。
      timeout: 20s  # 超时时间。
      retries: 10  # 重试次数。
      start_period: 30s  # 启动前等待时间，用于服务启动初期。

volumes:  # 定义使用的数据卷。
  mysql-data:  # 命名卷：用于 MySQL 数据持久化。

```

> 如果项目中没有mysql-data 目录，需要手动创建 mysql-data 目录吗？
>
> `./mysql-data` 指的是相对于 `docker-compose.yml` 文件的位置的一个目录。如果这个目录不存在，Docker 将尝试创建它。如果由于权限不足等原因无法创建，您可能需要手动创建这个目录。

### 创建 Express 应用

在 `index.js` 文件中，可以使用以下代码来连接 MySQL 数据库：

```javascript
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

let connection;

async function initializeDatabase() {
  connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE
    )  ENGINE=INNODB;
  `;
  await connection.execute(createTableSql);
  console.log("Users table created or already exists.");
}

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

// Register user endpoint
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  console.log('req.body', req.body);
  if (!username || !password || !email) {
    return res.status(400).send('Username, password, and email are required');
  }

  try {
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email]
    );
    res.status(201).send({ message: 'User registered', userId: result.insertId });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Fetch user information endpoint
app.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await connection.query('SELECT id, username, email FROM users WHERE id = ?', [id]);
    if (rows.length > 0) {
      res.send(rows[0]);
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Fetch all users information endpoint
app.get('/users', async (req, res) => {
  try {
    const [rows] = await connection.query('SELECT id, username, email FROM users');
    res.send(rows);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});
```



### 运行

```shell
docker-compose up --build
```

![image-20240413172008378](https://qn.huat.xyz/mac/202404131720475.png)


运行 `docker-compose up --build` 命令来启动应用。这会构建 Express 应用的 Docker 镜像，启动一个 Express 容器和一个 MySQL 容器。



#### `docker-compose up`

- **启动服务**：这个命令会根据 `docker-compose.yml` 文件中定义的所有服务（例如您的 Express 应用和 MySQL 数据库），启动这些服务。如果服务所依赖的容器还未创建，Docker Compose 会先创建这些容器。
- **启动依赖关系**：根据 `depends_on` 选项，Docker Compose 会以正确的顺序启动服务。例如，在您的配置中，`app` 服务会等待 `mysql` 服务变为健康状态后才启动。
- **端口映射**：自动处理容器和宿主机之间的端口映射，如将容器的 3000 端口映射到宿主机的 3000 端口。
- **卷挂载**：自动处理定义的卷挂载，例如将代码目录挂载到 `app` 容器中，以及持久化 MySQL 数据到宿主机的指定目录。

#### `--build`

- **构建镜像**：在启动服务之前，这个选项会强制重新构建服务的 Docker 镜像。这对于确保使用最新的代码和依赖来构建镜像非常有用。
- **覆盖现有镜像**：如果本地已经存在对应服务的 Docker 镜像，使用 `--build` 会覆盖这些现有的镜像。





## MySQL 镜像

场景：我的电脑上没有 mysql，但是我现在需要这个环境，我应该怎么做呢？



使用 MySQL 镜像是一种非常方便的方式来设置和运行 MySQL 数据库，无需在您的电脑上直接安装 MySQL。这种方法不仅可以快速部署，还可以通过 Docker 容器实现环境的隔离，避免影响您的系统设置。以下是使用 MySQL Docker 镜像的基本步骤和必要的配置：

### 拉取 MySQL 镜像

首先，您需要从 Docker Hub 拉取官方的 MySQL 镜像。打开终端或命令行界面，运行以下命令：

```bash
docker pull mysql
```

这会下载最新的 MySQL 镜像。如果需要特定版本的 MySQL，可以指定版本号，例如：

```bash
docker pull mysql:5.7
```

### 运行 MySQL 容器

运行一个 MySQL 容器需要设定一些基本的环境变量，比如设置 root 用户的密码。以下是一个简单的例子：

```bash
docker run --name my-mysql -e MYSQL_ROOT_PASSWORD=mypassword -d mysql
```

这里的参数说明如下：
- `--name my-mysql`：给容器命名为 `my-mysql`。
- `-e MYSQL_ROOT_PASSWORD=mypassword`：设置 MySQL root 用户的密码为 `mypassword`。
- `-d`：在后台模式运行容器。
- `mysql`：使用的镜像名称。

### 配置端口映射（可选）

如果您想从宿主机访问容器中的 MySQL 服务，可以通过端口映射实现：

```bash
docker run --name my-mysql -e MYSQL_ROOT_PASSWORD=mypassword -p 3306:3306 -d mysql
```

这里 `-p 3306:3306` 将容器的 3306 端口映射到宿主机的同一个端口上。

### 持久化数据（可选）

为了确保 MySQL 数据库的数据在容器重启后仍然保留，您可以使用 Docker 的卷（volumes）功能来持久化数据：

```bash
docker run --name my-mysql -e MYSQL_ROOT_PASSWORD=mypassword -v /my/own/datadir:/var/lib/mysql -d mysql
```

这里 `-v /my/own/datadir:/var/lib/mysql` 将宿主机的 `/my/own/datadir` 目录挂载到容器的 `/var/lib/mysql` 目录，从而持久化 MySQL 的数据。

### 访问 MySQL 数据库

一旦 MySQL 容器正在运行，您可以使用任何 MySQL 客户端工具或命令行工具连接到数据库。如果您在本地机器上使用，则可以连接到 `localhost` 和您映射的端口。

```bash
mysql -h localhost -P 3306 --protocol=tcp -u root -p
```

这里，`-P 3306` 指定端口号，`-u root` 指定用户名为 root，`-p` 会提示您输入密码。

通过这些步骤，您可以轻松地在 Docker 中设置和运行一个 MySQL 环境，无需在您的电脑上安装 MySQL 软件。
