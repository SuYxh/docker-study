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
