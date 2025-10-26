const express = require('express');
const db = require('../database');
const router = express.Router();

// Get student attendance records
router.get('/attendance/:rollNumber', (req, res) => {
    const rollNumber = req.params.rollNumber;

    let query = `SELECT date, status, department, section, created_at FROM attendance WHERE roll_number = ? ORDER BY date DESC`;

    db.all(query, [rollNumber], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }

            const present = rows.filter(r => r.status === 'present').length;
            const absent = rows.filter(r => r.status === 'absent').length;
            const total = present + absent;
            const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

            res.json({
                rollNumber,
                present,
                absent,
                total,
                percentage,
                records: rows
            });
        }
    );
});

// Get student monthly average
router.get('/monthly-average/:rollNumber', (req, res) => {
    const rollNumber = req.params.rollNumber;
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1);
    const monthStr = month.toString().padStart(2, '0');

    db.all(
        `SELECT status 
         FROM attendance 
         WHERE roll_number = ? 
         AND strftime('%Y', date) = ? 
         AND strftime('%m', date) = ?`,
        [rollNumber, year.toString(), monthStr],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }

            const present = rows.filter(r => r.status === 'present').length;
            const total = rows.length;
            const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

            res.json({ 
                rollNumber,
                year,
                month,
                present,
                total,
                percentage 
            });
        }
    );
});

// Get student info
router.get('/info/:rollNumber', (req, res) => {
    const rollNumber = req.params.rollNumber;

    db.get(
        'SELECT * FROM students WHERE roll_number = ?',
        [rollNumber],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            if (!row) {
                return res.status(404).json({ error: 'Student not found' });
            }
            res.json(row);
        }
    );
});

module.exports = router;