const express = require('express');
const db = require('../database');
const router = express.Router();

// Get pending faculty approvals
router.get('/pending-faculty', (req, res) => {
    db.all(
        `SELECT id, username, name, department, created_at 
         FROM users 
         WHERE role = 'faculty' AND approved = 0
         ORDER BY created_at DESC`,
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            res.json(rows);
        }
    );
});

// Approve faculty
router.put('/approve-faculty/:id', (req, res) => {
    const facultyId = req.params.id;

    db.run('UPDATE users SET approved = 1 WHERE id = ? AND role = ?', 
        [facultyId, 'faculty'], 
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Faculty not found' });
            }
            res.json({ message: 'Faculty approved successfully' });
        }
    );
});

// Delete faculty
router.delete('/delete-faculty/:id', (req, res) => {
    const facultyId = req.params.id;

    db.run('DELETE FROM users WHERE id = ? AND role = ?', 
        [facultyId, 'faculty'], 
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Faculty not found' });
            }
            res.json({ message: 'Faculty deleted successfully' });
        }
    );
});

// Get daily attendance statistics
router.get('/daily-stats', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    db.all(
        `SELECT 
            department,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
         FROM attendance 
         WHERE date = ?
         GROUP BY department
         ORDER BY department`,
        [date],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            
            const stats = rows.map(row => ({
                department: row.department,
                total: row.total,
                present: row.present,
                absent: row.absent,
                percentage: ((row.present / row.total) * 100).toFixed(2)
            }));

            res.json({ date, stats });
        }
    );
});

// Get monthly attendance average
router.get('/monthly-stats', (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1);
    const monthStr = month.toString().padStart(2, '0');

    db.all(
        `SELECT 
            department,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
         FROM attendance
         WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
         GROUP BY department
         ORDER BY department`,
        [year.toString(), monthStr],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            
            const stats = rows.map(row => ({
                department: row.department,
                total: row.total,
                present: row.present,
                percentage: ((row.present / row.total) * 100).toFixed(2)
            }));

            res.json({ year, month, stats });
        }
    );
});

// Get all students
router.get('/students', (req, res) => {
    const department = req.query.department;
    const section = req.query.section;

    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }
    if (section) {
        query += ' AND section = ?';
        params.push(section);
    }

    query += ' ORDER BY roll_number';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(rows);
    });
});

// Get attendance log
router.get('/attendance-log', (req, res) => {
    db.all(
        `SELECT 
            u.name as marked_by,
            a.department,
            a.section,
            a.date,
            strftime('%Y-%m-%d %H:%M', a.created_at) as marked_at
         FROM attendance a
         JOIN users u ON a.marked_by = u.id
         WHERE a.marked_by IS NOT NULL
         GROUP BY u.name, a.department, a.section, a.date, marked_at
         ORDER BY marked_at DESC
         LIMIT 100`,
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            res.json(rows);
        }
    );
});

// Get section attendance
router.get('/section-attendance', (req, res) => {
    const { department, section, date } = req.query;

    if (!department || !section || !date) {
        return res.status(400).json({ error: 'Department, section, and date are required' });
    }

    db.all(
        `SELECT 
            a.roll_number, 
            a.status, 
            u.name as marked_by,
            a.created_at as marked_at
         FROM attendance a
         LEFT JOIN users u ON a.marked_by = u.id
         WHERE a.department = ? AND a.section = ? AND a.date = ?
         ORDER BY a.roll_number`,
        [department, section, date],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Server error' });
            }
            res.json(rows);
        }
    );
});

module.exports = router;