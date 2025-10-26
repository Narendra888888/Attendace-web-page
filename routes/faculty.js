const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../database');
const { hashPassword } = require('../hash');
const router = express.Router();

// Multer configuration for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload attendance via Excel file
router.post('/upload-attendance-file', upload.single('file'), (req, res) => {
    const { date, facultyId } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ error: 'Empty file' });
        }

        const stmt = db.prepare(
            `INSERT INTO attendance (date, roll_number, status, department, section, marked_by) 
             VALUES (?, ?, ?, ?, ?, ?)`
        );

        let successCount = 0;
        let errorCount = 0;

        data.forEach(row => {
            try {
                const rollNumber = row.RollNumber || row.rollNumber || row.roll_number;
                const status = (row.Status || row.status || 'present').toLowerCase();
                const department = row.Department || row.department;
                const section = row.Section || row.section;

                if (rollNumber && department && section) {
                    stmt.run(date, rollNumber, status, department, section, facultyId);
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (err) {
                errorCount++;
            }
        });

        stmt.finalize();

        // Clean up uploaded file
        const fs = require('fs');
        fs.unlinkSync(req.file.path);

        res.json({ 
            message: 'Attendance uploaded successfully',
            successCount,
            errorCount,
            total: data.length
        });
    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ error: 'Error processing file' });
    }
});

// Upload attendance via CSV text
router.post('/upload-attendance-csv', (req, res) => {
    const { date, csvData, facultyId } = req.body;
    
    if (!csvData || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const lines = csvData.trim().split('\n');
        
        if (lines.length < 2) {
            return res.status(400).json({ error: 'Invalid CSV data' });
        }

        const stmt = db.prepare(
            `INSERT INTO attendance (date, roll_number, status, department, section, marked_by) 
             VALUES (?, ?, ?, ?, ?, ?)`
        );

        let successCount = 0;
        let errorCount = 0;

        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim());
            
            if (parts.length >= 5) {
                try {
                    const rollNumber = parts[0];
                    const department = parts[2];
                    const section = parts[3];
                    const status = parts[4].toLowerCase();

                    stmt.run(date, rollNumber, status, department, section, facultyId);
                    successCount++;
                } catch (err) {
                    errorCount++;
                }
            } else {
                errorCount++;
            }
        }

        stmt.finalize();

        res.json({ 
            message: 'Attendance uploaded successfully',
            successCount,
            errorCount,
            total: lines.length - 1
        });
    } catch (error) {
        console.error('CSV processing error:', error);
        res.status(500).json({ error: 'Error processing CSV data' });
    }
});

// Get attendance history
router.get('/attendance-history', (req, res) => {
    const { department, section, startDate, endDate } = req.query;

    let query = `SELECT date, roll_number, status, department, section 
                 FROM attendance WHERE 1=1`;
    const params = [];

    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }
    if (section) {
        query += ' AND section = ?';
        params.push(section);
    }
    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }

    query += ' ORDER BY date DESC, roll_number';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(rows);
    });
});

// Add new students from Excel data
router.post('/add-students', async (req, res) => {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty students data' });
    }

    const userStmt = db.prepare(
        `INSERT INTO users (username, password, role, name, department, section, roll_number, approved) 
         VALUES (?, ?, 'student', ?, ?, ?, ?, 1)`
    );

    const studentStmt = db.prepare(
        `INSERT INTO students (roll_number, name, department, section) 
         VALUES (?, ?, ?, ?)`
    );

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
        try {
            const { username, password, name, department, section } = student;
            const rollNumber = student['roll number'];
            if (username && password && name && department && section && rollNumber) {
                const hashedPassword = await hashPassword(password);
                userStmt.run(username, hashedPassword, name, department, section, rollNumber);
                studentStmt.run(rollNumber, name, department, section);
                successCount++;
            } else {
                errorCount++;
            }
        } catch (err) {
            console.error(err);
            errorCount++;
        }
    }

    userStmt.finalize();
    studentStmt.finalize((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error finalizing statement' });
        }
        
        res.json({
            message: 'Students added successfully',
            successCount,
            errorCount,
            total: students.length
        });
    });
});

router.post('/submit-attendance', (req, res) => {
    const { date, attendanceData, facultyId } = req.body;

    if (!date || !attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty attendance data' });
    }

    const stmt = db.prepare(
        `INSERT INTO attendance (date, roll_number, status, department, section, marked_by) 
         VALUES (?, ?, ?, ?, ?, ?)`
    );

    let successCount = 0;
    let errorCount = 0;

    for (const record of attendanceData) {
        try {
            const { roll_number, status, department, section } = record;
            if (roll_number && status && department && section) {
                stmt.run(date, roll_number, status, department, section, facultyId);
                successCount++;
            } else {
                errorCount++;
            }
        } catch (err) {
            errorCount++;
        }
    }

    stmt.finalize((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error finalizing statement' });
        }
        
        res.json({
            message: 'Attendance submitted successfully',
            successCount,
            errorCount,
            total: attendanceData.length
        });
    });
});

module.exports = router;