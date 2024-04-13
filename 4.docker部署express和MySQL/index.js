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

