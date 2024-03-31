const express = require('express');
const path = require('path');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

app.get('/login', (req, res) => {
    res.render('login', { /* data */ });
});

app.get('/signup', (req, res) => {
    res.render('signup', { /* data */ });
});

app.get('/tradecard', (req, res) => {
    res.render('tradecard', { /* data */ });
});

app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

