const cookieParser = require('cookie-parser');
const session = require('express-session');
const express = require('express'); // Import express

const twoHours = 1000 * 60 * 60 * 2;


const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');



// app.use(cookieParser());

const sessionConfig = {
    secret: secret,
    saveUninitialized: true,
    cookie: { maxAge: twoHours },
    resave: false,
  };

function isAuthenticated(req, res, next) {
  if (req.session.authenticated) {
    console.log('successful authentication');
    next();
  } else {
    console.log('unsuccessful authentication');
    res.redirect('/login');
  }
}

module.exports = { sessionConfig, isAuthenticated }; // Export the express app and isAuthenticated middleware
