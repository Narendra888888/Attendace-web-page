const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './attendance.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('✅ Database connected successfully');
    }
});

// Initialize tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
        name TEXT NOT NULL,
        department TEXT,
        roll_number TEXT,
        section TEXT,
        approved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        roll_number TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        section TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Attendance table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
        department TEXT NOT NULL,
        section TEXT NOT NULL,
        marked_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (roll_number) REFERENCES students(roll_number),
        FOREIGN KEY (marked_by) REFERENCES users(id)
    )`);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_roll ON attendance(roll_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_dept ON attendance(department)`);

    console.log('✅ Database tables initialized');
});

module.exports = db;
