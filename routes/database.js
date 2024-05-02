const mysql = require('mysql');

// Create connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: '40406506',
    port: '3306',
    multipleStatements: true
});

// Log when a connection is established
pool.on('connection', () => {
    console.log('Connected to MySQL server');
});

pool.on('error', (err) => {
    console.error('Error connecting to MySQL:', err);
});

module.exports = pool;
