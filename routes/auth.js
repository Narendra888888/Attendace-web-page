const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    const { username, password, role, name, department, rollNumber, section } = req.body;
    
    if (!username || !password || !role || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const approved = role === 'faculty' ? 0 : 1;

        db.run(
            `INSERT INTO users (username, password, role, name, department, roll_number, section, approved) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, role, name, department, rollNumber || null, section || null, approved],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Username already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }
                
                res.status(201).json({ 
                    message: 'Registration successful', 
                    needsApproval: role === 'faculty',
                    userId: this.lastID
                });
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);
    console.log('Password received:', password);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        
        if (!user) {
            console.log('User not found for username:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log('User found:', user.username, 'Role:', user.role);
        console.log('Stored hashed password:', user.password);

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            console.log('Bcrypt comparison result:', validPassword);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (user.role === 'faculty' && user.approved === 0) {
                return res.status(403).json({ error: 'Account pending admin approval' });
            }

            res.json({ 
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    department: user.department,
                    rollNumber: user.roll_number,
                    section: user.section
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
});

module.exports = router;