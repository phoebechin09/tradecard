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
        console.log(req.session.userName);
         console.log('Router handling dashboard...');
         const userId = req.session.userId;
    try {
        
        console.log(userId);
        // Query to fetch data from MySQL where user_id matches
        const query = `SELECT * FROM user_collection WHERE user_id = ?`;


        const collectionQuery = await queryAsync(query, [userId]);
        console.log(collectionQuery);
        if (collectionQuery.length > 0) {
            const mappedCollection = collectionQuery.map(collectionItem => ({
                variant: collectionItem.variant,
                cardPKId: collectionItem.card_PK_id
            }));
            res.locals.userCollection = mappedCollection;
            console.log('mapped collection');
        } else {
            console.log('empty collection');
            res.locals.userCollection = null;
        }

        console.log('User collection:', res.locals.userCollection);

    } catch (error) {
        console.error('Error fetching user collection:', error);
        res.status(500).send('Error fetching user collection');
    }


    try {
        
        const normalVariantQuery = `SELECT COUNT(*) AS normal_count FROM user_collection WHERE variant = 'Normal' AND user_id = ?`;
        const normalVariantRows = await queryAsync(normalVariantQuery, [userId]);

        if (normalVariantRows.length > 0) {
            const normalVariantCount = normalVariantRows[0].normal_count;
            res.locals.normalVariantCount = normalVariantCount;
        } else {
            console.error('No rows returned for normal variant count');
            res.status(500).send('No rows returned for normal variant count');
        }
    } catch (error) {
        console.error('Error fetching normal variant count:', error);
        res.status(500).send('Error fetching normal variant count');
    }
    try {
        
        const holoVariantQuery = `SELECT COUNT(*) AS holo_count FROM user_collection WHERE variant = 'Reverse Holo' AND user_id = ?`;
        const holoVariantRows = await queryAsync(holoVariantQuery, [userId]);

        if (holoVariantRows.length > 0) {
            const holoVariantCount = holoVariantRows[0].holo_count;

            res.locals.holoVariantCount = holoVariantCount;
        } else {
            console.error('No rows returned for holo variant count');
            res.status(500).send('No rows returned for holo variant count');
        }
    } catch (error) {
        console.error('Error fetching holo variant count:', error);
        res.status(500).send('Error fetching holo variant count');
    }
    res.locals.totalCount = res.locals.holoVariantCount + res.locals.normalVariantCount;

try{
    const uniqueQuery =  `SELECT COUNT(DISTINCT CONCAT(card_PK_id, '_', variant)) AS uniqueCount  FROM user_collection WHERE user_id = ?;`
    uniqueRows = await queryAsync(uniqueQuery, [userId]);
    if (uniqueRows.length > 0) {
        const uniqueCount = uniqueRows[0].uniqueCount;
        res.locals.uniqueCount = uniqueCount;
    } else {
        console.error('No rows returned for holo variant count');
        res.status(500).send('No rows returned for holo variant count');
    }

} catch (error) {
    console.error('Error fetching unique count:', error);
    res.status(500).send('Error fetching unique count');
}

try{
    const seriesCountQuery =  `SELECT COUNT(DISTINCT cs.series_PK_id) AS uniqueSeriesCount FROM user_collection uc JOIN card c ON uc.card_PK_id = c.card_PK_id JOIN card_set cs ON c.card_set_id = cs.card_set_id WHERE uc.user_id = ?;`
    seriesCountRows = await queryAsync(seriesCountQuery, [userId]);
    if (seriesCountRows.length > 0) {
        const seriesCount = seriesCountRows[0].uniqueSeriesCount;
        res.locals.seriesCount = seriesCount;
    } else {
        console.error('No rows returned for holo variant count');
        res.status(500).send('No rows returned for holo variant count');
    }

} catch (error) {
    console.error('Error fetching unique count:', error);
    res.status(500).send('Error fetching unique count');
}

    
    res.render('dashboard', {
        user: req.session.userName,
        userCollection: res.locals.userCollection,
        isAuthenticated: req.session.authenticated,
        normalVarCount: res.locals.normalVariantCount,
        holoVarCount: res.locals.holoVariantCount,
        totalCount: res.locals.totalCount,
        uniqueCount: res.locals.uniqueCount,
        seriesCount: res.locals.seriesCount
    });
});

router.get('/wishlistStatus/:cardId', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const cardId = req.params.cardId;

    // SQL query to check if the card is in the user's wishlist
    const query = 'SELECT COUNT(*) AS wishlist_exists FROM wishlist WHERE user_id = ? AND card_PK_id = ?';

    connection.query(query, [userId, cardId], (err, result) => {
        if (err) {
            console.error('Error checking wishlist status:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (result[0].wishlist_exists > 0) {
            res.json({ exists: true });
        }
    });
});

router.post('/addToWishlist', isAuthenticated, async (req, res) => {
    console.log('router handling insert to wishlist...');
    const cardPKId = req.body.cardPKId; // Extract item ID from request body

    // Get userId from session
    const userId = req.session.userId;

    // SQL query to insert item into wishlist table
    const insertQuery = 'INSERT INTO wishlist (user_id, card_PK_id) VALUES (?, ?)';

    connection.query(insertQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error adding item to wishlist:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log('Item added to wishlist');
        }
    });

});

router.post('/removeFromWishlist', isAuthenticated, async (req, res) => {
    console.log('router handling remove from wishlist...');
    const cardPKId = req.body.cardPKId;

    const userId = req.session.userId;
    const deleteQuery = 'DELETE FROM wishlist WHERE user_id = ? AND card_PK_id = ?';

    connection.query(deleteQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error deleting item to wishlist:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Item deleted from wishlist');
        }
    });
});

router.get('/collectionStatus/:cardId', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const cardId = req.params.cardId;

    // SQL query to check if the card is in the user's wishlist
    const query = 'SELECT COUNT(*) AS collectionCoount FROM user_collection WHERE user_id = ? AND card_PK_id = ?';

    connection.query(query, [userId, cardId], (err, result) => {
        if (err) {
            console.error('Error checking wishlist status:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (result[0].wishlist_exists > 0) {
            res.json({ exists: true });
        }
    });
});

router.post('/addHoloToCollection', isAuthenticated, async (req, res) => {
    console.log('router handling add holo to collection...');
    const cardPKId = req.body.cardPKId;

    const userId = req.session.userId;
    const insertQuery = `INSERT INTO user_collection (user_id, card_PK_id, variant) VALUES (?, ?, 'Reverse Holo')`;

    connection.query(insertQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error adding holo to collectiont:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Holo added to collection');
        }
    });
});

router.post('/addNormalToCollection', isAuthenticated, async (req, res) => {
    console.log('router handling add normal to collection...');
    const cardPKId = req.body.cardPKId;

    const userId = req.session.userId;
    const insertQuery = `INSERT INTO user_collection (user_id, card_PK_id, variant) VALUES (?, ?, 'Normal')`;

    connection.query(insertQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error adding normal to collectiont:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Normal added to collection');
        }
    });
});

router.post('/rmNormalFromCollection', isAuthenticated, async (req, res) => {
    console.log('router handling remove normal from collection...');
    const cardPKId = req.body.cardPKId;

    const userId = req.session.userId;
    const rmQuery = `DELETE FROM user_collection WHERE user_id = ? AND card_PK_id = ? AND variant = 'Normal' LIMIT 1;`;

    connection.query(rmQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error adding normal to collectiont:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Normal removed from collection');
        }
    });
});

router.post('/rmHoloFromCollection', isAuthenticated, async (req, res) => {
    console.log('router handling remove holo from collection...');
    const cardPKId = req.body.cardPKId;

    const userId = req.session.userId;
    const rmQuery = `DELETE FROM user_collection WHERE user_id = ? AND card_PK_id = ? AND variant = 'Reverse Holo' LIMIT 1;`;

    connection.query(rmQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error removing holo from collectiont:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Removed holo from collection');
        }
    });
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



module.exports = router;
