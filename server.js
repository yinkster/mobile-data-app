const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const { Parser } = require('json2csv');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. DATABASE CONNECTION
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static('public'));

// 2. SESSION CONFIG (For Admin Security)
app.use(session({
    secret: 'engagement-secret-key', // Change this to a random string
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour session
}));

// 3. INITIALIZE TABLE (Matches your 9 frontend fields)
const initDb = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS engagements (
            id SERIAL PRIMARY KEY,
            full_name TEXT,
            email TEXT,
            ev_name TEXT,
            location TEXT,
            age INTEGER,
            telephone TEXT,
            entry_date DATE,
            engagement_status TEXT,
            notes TEXT,
            is_urgent BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await pool.query(query);
    console.log("PostgreSQL: Engagements Table Ready.");
};
initDb();

// 4. Bouncer Middleware (Restricts access to Admin pages)
const isAdmin = (req, res, next) => {
    if (req.session.authenticated) return next();
    res.status(401).send('Unauthorized: Please login.');
};

// --- ROUTES ---

// SAVE DATA (From Mobile Form)
app.post('/api/save', async (req, res) => {
    const { name, email, ev, loc, age, tel, date, status, note, urgent } = req.body;
    const query = `
        INSERT INTO engagements 
        (full_name, email, ev_name, location, age, telephone, entry_date, engagement_status, notes, is_urgent) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
    
    try {
        await pool.query(query, [name, email, ev, loc, age, tel, date, status, note, urgent]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database save failed" });
    }
});

// ADMIN LOGIN
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === "DonutFan87") { // CHANGE YOUR PASSWORD HERE
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Invalid password" });
    }
});

// DOWNLOAD CSV (Protected)
app.get('/api/export', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM engagements ORDER BY created_at DESC');
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(result.rows);
        
        res.header('Content-Type', 'text/csv');
        res.attachment('engagements_export.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).send("Export failed");
    }
});

// GET DASHBOARD SUMMARY (Protected)
app.get('/api/summary', isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_engaged,
                COUNT(*) FILTER (WHERE engagement_status LIKE '1.%') as status_1,
                COUNT(*) FILTER (WHERE engagement_status LIKE '4.%') as status_4
            FROM engagements;
        `;
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch summary" });
    }
});

app.listen(PORT, () => console.log(`Server live on ${PORT}`));