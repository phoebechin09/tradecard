const mysql = require('mysql');

// Create connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tcgcove',
    port: '3306',
    multipleStatements: true
});

// Log when a connection is established
pool.on('connection', () => {
    console.log('Connected to MySQL server');
});

// Log any errors that occur during connection
pool.on('error', (err) => {
    console.error('Error connecting to MySQL:', err);
});

module.exports = pool;
