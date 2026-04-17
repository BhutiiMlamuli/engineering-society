const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ---------- SQLite Database Setup ----------
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Newsletter subscribers table
  db.run(`CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Optional: courses table (for future dynamic downloads)
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester INTEGER,
    course_code TEXT,
    course_name TEXT,
    download_url TEXT
  )`);
});

// ---------- API Routes ----------

// GET all comments
app.get('/api/comments', (req, res) => {
  db.all(`SELECT name, message, created_at FROM comments ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST a new comment
app.post('/api/comments', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  db.run(`INSERT INTO comments (name, email, message) VALUES (?, ?, ?)`,
    [name, email, message],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Comment posted successfully' });
    }
  );
});

// POST newsletter subscription
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  db.run(`INSERT INTO subscribers (email) VALUES (?)`, [email], (err) => {
    if (err && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already subscribed' });
    }
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Subscribed successfully!' });
  });
});

// GET all courses (optional – for future use)
app.get('/api/courses', (req, res) => {
  db.all(`SELECT semester, course_code, course_name, download_url FROM courses ORDER BY semester, course_code`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/index.html`);
});