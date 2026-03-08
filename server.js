const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static('public'));

// Initialize 9-field table
const initDb = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            full_name TEXT, email TEXT, evang TEXT, 
            amount DECIMAL(10,2), quantity INTEGER, entry_date DATE, 
            location TEXT, notes TEXT, is_urgent BOOLEAN DEFAULT FALSE
        );
    `);
    console.log("Database initialized.");
};
initDb();

app.post('/api/save', async (req, res) => {
    try {
        const { name, email, ev, amt, qty, date, loc, note, urgent } = req.body;
        await pool.query(
            `INSERT INTO entries (full_name, email, evang, amount, quantity, entry_date, location, notes, is_urgent) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [name, email, ev, amt, qty, date, loc, note, urgent]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/stats', async (req, res) => {
    const result = await pool.query('SELECT evang, SUM(amount) as total FROM entries GROUP BY evang');
    res.json(result.rows);
});

app.listen(PORT, () => console.log(`Live at port ${PORT}`));