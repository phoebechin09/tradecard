const express = require('express');
const router = express.Router();
const { sessionConfig, isAuthenticated } = require('./config');
const session = require('express-session');
const connection = require('./database');
const bcrypt = require('bcrypt');

router.use(session(sessionConfig));

const util = require('util');
const queryAsync = util.promisify(connection.query).bind(connection);

router.post("/registerAccount", async (req, res) => {
    const user = req.body.user;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const sqlSearch = "SELECT * FROM account WHERE user_name = ?";
    const sqlInsert = "INSERT INTO account (user_name, user_password) VALUES (?,?)";

    connection.query(sqlSearch, [user], async (err, result) => {
        if (err) {
            console.error('Error searching user:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        console.log("------> Search Results:", result.length);

        if (result.length !== 0) {
            console.log("------> User already exists");
            res.json({ alreadyExistmessage: 'This username already exists!' });
        } else {
            connection.query(sqlInsert, [user, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    res.status(500).json({ error: 'Internal Server Error' });
                    return;
                }
                console.log("--------> Created new User:", result.insertId);
                const userId = result.insertId;
                const sessionobj = req.session;
                sessionobj.userName = user;
                sessionobj.userId = userId;
                req.session.authenticated = true;
                console.log("------> Successful Registration");
                res.status(200).json({ success: true });
                console.log('status sent to client side');
            });
        }
    });
});

// handle login
router.post('/loginToAccount', async (req, res) => {
    const user = req.body.user;
    const password = req.body.password;
    const checkuser = `SELECT * FROM account WHERE user_name = ?`;

    connection.query(checkuser, [user], async (err, rows) => {
        try {
            if (err) {
                console.error('Error searching user:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const numRows = rows.length;
            if (numRows > 0) {
                const hashedPassword = rows[0].user_password;

                // Compare the input password with the hashed password from the database
                const passwordMatch = await bcrypt.compare(password, hashedPassword);

                if (passwordMatch) {
                    console.log('password matches');
                    const sessionobj = req.session;
                    sessionobj.userName = rows[0].user_name;
                    sessionobj.userId = rows[0].user_id;
                    req.session.authenticated = true;
                    console.log("------> Successful Login");
                    res.status(200).json({ success: true });
                    console.log('status sent to client side');
                } else {
                    console.log("------> Incorrect password");
                    res.json({ message: 'Incorrect password. Please try again.' });
                }
            } else {
                console.log("------> User doesn't exist");
                res.json({ message: `User doesn't exist. Please register an account.` });
            }
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
});

router.get('/dashboard', isAuthenticated, async (req, res) => {
    console.log('Router handling dashboard...');
    const userId = req.session.userId;

    let mappedCollection = null;
    // Query to fetch data from MySQL where user_id matches
    const query = `SELECT user_collection.* FROM user_collection JOIN account ON user_collection.user_collection_id = account.user_collection_id WHERE account.user_id = ?`;

    try {
        const collectionQuery = queryAsync(query, [userId]);
        console.log(collectionQuery);
        if (collectionQuery.length > 0) {
            mappedCollection = collectionQuery.map(collectionItem => ({
                variant: collectionItem.variant,
                userId: collectionItem.user_id
            }));

            console.log('mapped collection');
        } else {
            console.log('empty collection');
        }
        res.locals.userCollection = mappedCollection;
        console.log('User collection:', res.locals.userCollection);
        res.render('dashboard', { user: req.session.userName, userCollection: res.locals.userCollection, isAuthenticated: req.session.authenticated });
    } catch (error) {
        console.error('Error fetching user collection:', error);
        res.status(500).send('Error fetching user collection');
    }
});

// Logout route handler
router.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        console.log('Session destroyed');
        console.log("------> Successful Logout");
        res.status(200).json({ success: true });
    });
});


// Route handlers
// function getUserDashboard(req, res) {
//   // Implementation
// }

// function updateUserSettings(req, res) {
//   // Implementation
// }

// function addCardToCollection(req, res) {
//   // Implementation
// }

// // Routes requiring authentication
// router.get('/dashboard', isAuthenticated, getUserDashboard);
// router.post('/update-settings', isAuthenticated, updateUserSettings);
// router.post('/add-card', isAuthenticated, addCardToCollection);

module.exports = router;
