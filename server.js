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

// Create tables if they don't exist
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

  // Courses table (study materials)
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester INTEGER NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT,
    download_url TEXT NOT NULL
  )`);

  // Insert sample courses if table is empty
  db.get(`SELECT COUNT(*) as count FROM courses`, (err, row) => {
    if (row.count === 0) {
      const sampleCourses = [
        // Semester 3
        { semester: 3, code: 'EEE271', name: 'Circuit Theory I', url: '/downloads/eee271.pdf' },
        { semester: 3, code: 'EEE272', name: 'Digital Electronics', url: '/downloads/eee272.pdf' },
        { semester: 3, code: 'EEE273', name: 'Electrical Materials', url: '/downloads/eee273.pdf' },
        // Semester 4
        { semester: 4, code: 'EEE281', name: 'Signals & Systems', url: '/downloads/eee281.pdf' },
        { semester: 4, code: 'EEE282', name: 'Microprocessors', url: '/downloads/eee282.pdf' },
        // Semester 5
        { semester: 5, code: 'EEE391', name: 'Power Systems', url: '/downloads/eee391.pdf' },
        { semester: 5, code: 'EEE392', name: 'Control Engineering', url: '/downloads/eee392.pdf' },
        // Semester 6
        { semester: 6, code: 'EEE401', name: 'Communication Systems', url: '/downloads/eee401.pdf' },
        { semester: 6, code: 'EEE402', name: 'Renewable Energy', url: '/downloads/eee402.pdf' },
        // Semester 7
        { semester: 7, code: 'EEE411', name: 'Embedded Systems', url: '/downloads/eee411.pdf' },
        // Semester 8
        { semester: 8, code: 'EEE421', name: 'Project Management', url: '/downloads/eee421.pdf' },
        // Semester 9
        { semester: 9, code: 'EEE431', name: 'Advanced DSP', url: '/downloads/eee431.pdf' },
        // Semester 10
        { semester: 10, code: 'EEE441', name: 'Smart Grid', url: '/downloads/eee441.pdf' }
      ];
      const stmt = db.prepare(`INSERT INTO courses (semester, course_code, course_name, download_url) VALUES (?, ?, ?, ?)`);
      sampleCourses.forEach(c => {
        stmt.run(c.semester, c.code, c.name, c.url);
      });
      stmt.finalize();
    }
  });
});

// ---------- API Routes ----------

// 1. Get all comments
app.get('/api/comments', (req, res) => {
  db.all(`SELECT name, message, created_at FROM comments ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Post a new comment
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

// 3. Subscribe to newsletter
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

// 4. Get all courses (optionally filter by semester)
app.get('/api/courses', (req, res) => {
  const semester = req.query.semester;
  let sql = `SELECT semester, course_code, course_name, download_url FROM courses`;
  let params = [];
  if (semester) {
    sql += ` WHERE semester = ?`;
    params.push(semester);
  }
  sql += ` ORDER BY semester, course_code`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});