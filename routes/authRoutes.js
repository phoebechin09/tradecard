const express = require('express');
const router = express.Router();
const { sessionConfig, isAuthenticated } = require('./config');
const session = require('express-session');
const connection = require('./database');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

router.use(session(sessionConfig));

const util = require('util');
const queryAsync = util.promisify(connection.query).bind(connection);


router.post("/registerAccount", [
    body('user').trim().isLength({ min: 1 }).escape(),
    body('password').trim().isLength({ min: 1 }).escape(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

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

// dashboard page *****************************************************************************************************
router.get('/dashboard', isAuthenticated, async (req, res) => {
    console.log('Router handling dashboard...');
    const userId = req.session.userId;
    try {

        console.log(userId);
        const query = `SELECT * FROM user_collection 
        JOIN user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id
        WHERE user_collection_album.user_id = ?`;
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

        const normalVariantQuery = `SELECT COUNT(*) AS normal_count  FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id WHERE variant = 'Normal' AND user_collection_album.user_id = ?;`;
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

        const holoVariantQuery = `SELECT COUNT(*) AS holo_count  FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id WHERE variant = 'Reverse Holo' AND user_collection_album.user_id = ?;`;
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

    try {
        const uniqueQuery = `SELECT COUNT(DISTINCT CONCAT(card_PK_id, '_', variant)) AS uniqueCount FROM user_collection JOIN user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id WHERE user_collection_album.user_id = ?;`
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

    try {
        const seriesCountQuery = `SELECT COUNT(DISTINCT cs.series_PK_id) AS uniqueSeriesCount 
        FROM user_collection uc 
        JOIN card c ON uc.card_PK_id = c.card_PK_id 
        JOIN card_set cs ON c.card_set_id = cs.card_set_id 
        JOIN user_collection_album uca ON uc.user_collection_album_id = uca.user_collection_album_id 
        WHERE uca.user_id = ?;`
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
    

    try {
        const pokemonCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE category = 'Pokemon' AND user_collection_album.user_id = ?`;
        const pokemonCountRows = await queryAsync(pokemonCountQuery, [userId]);

        if (pokemonCountRows.length > 0) {
            const pokemonCount = pokemonCountRows[0].count;
            res.locals.pokemonCount = pokemonCount;
        } else {
            console.error('No rows returned for pokemon count');
            res.status(500).send('No rows returned for pokemon count');
        }
    } catch (error) {
        console.error('Error fetching pokemon count:', error);
        res.status(500).send('Error fetching normal variant count');
    }
    try {
        const trainerCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE category = 'Trainer' AND user_collection_album.user_id = ?`;
        const trainerCountRows = await queryAsync(trainerCountQuery, [userId]);

        if (trainerCountRows.length > 0) {
            const trainerCount = trainerCountRows[0].count;
            res.locals.trainerCount = trainerCount;
        } else {
            console.error('No rows returned for trainer count');
            res.status(500).send('No rows returned for trainer ount');
        }
    } catch (error) {
        console.error('Error fetching normal trainer count:', error);
        res.status(500).send('Error fetching trainer count');
    }
    try {
        const energyCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE category = 'Energy' AND user_collection_album.user_id = ?`;
        const energyCountRows = await queryAsync(energyCountQuery, [userId]);

        if (energyCountRows.length > 0) {
            const energyCount = energyCountRows[0].count;
            res.locals.energyCount = energyCount;
        } else {
            console.error('No rows returned for energy count');
            res.status(500).send('No rows returned for energy count');
        }
    } catch (error) {
        console.error('Error fetching energy count:', error);
        res.status(500).send('Error fetching energy count');
    }
   
    try {
        const commonCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE rarity = 'Common' AND user_collection_album.user_id = ?`;
        const commonCountRows = await queryAsync(commonCountQuery, [userId]);

        if (commonCountRows.length > 0) {
            const commonCount = commonCountRows[0].count;
            res.locals.commonCount = commonCount;
        } else {
            console.error('No rows returned for common count');
            res.status(500).send('No rows common for energy count');
        }
    } catch (error) {
        console.error('Error fetching common count:', error);
        res.status(500).send('Error fetching common count');
    }
    try {
        const rareCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE rarity = 'Rare' AND user_collection_album.user_id = ?`;
        const rareCountRows = await queryAsync(rareCountQuery, [userId]);

        if (rareCountRows.length > 0) {
            const rareCount = rareCountRows[0].count;
            res.locals.rareCount = rareCount;
        } else {
            console.error('No rows returned for rare count');
            res.status(500).send('No rows returned for rare count');
        }
    } catch (error) {
        console.error('Error fetching rare count:', error);
        res.status(500).send('Error fetching rare count');
    }
    try {
        const uncommonCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE rarity = 'Uncommon' AND user_collection_album.user_id = ?`;
        const uncommonCountRows = await queryAsync(uncommonCountQuery, [userId]);

        if (uncommonCountRows.length > 0) {
            const uncommonCount = uncommonCountRows[0].count;
            res.locals.uncommonCount = uncommonCount;
        } else {
            console.error('No rows returned for rare count');
            res.status(500).send('No rows returned for rare count');
        }
    } catch (error) {
        console.error('Error fetching rare count:', error);
        res.status(500).send('Error fetching rare count');
    }
    try {
        const rareHoloCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE rarity = 'Rare Holo' AND user_collection_album.user_id = ?`;
        const rareHoloCountRows = await queryAsync(rareHoloCountQuery, [userId]);

        if (rareHoloCountRows.length > 0) {
            const rareHoloCount = rareHoloCountRows[0].count;
            res.locals.rareHoloCount = rareHoloCount;
        } else {
            console.error('No rows returned for rare count');
            res.status(500).send('No rows returned for rare count');
        }
    } catch (error) {
        console.error('Error fetching rare count:', error);
        res.status(500).send('Error fetching rare count');
    }
    try {
        const rareHoloLVXCountQuery = `SELECT COUNT(*) AS count FROM user_collection JOIN  user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id JOIN card ON user_collection.card_PK_id = card.card_PK_id
        WHERE rarity = 'Rare Holo LV.X' AND user_collection_album.user_id = ?`;
        const rareHoloLVXCountRows = await queryAsync(rareHoloLVXCountQuery, [userId]);

        if (rareHoloLVXCountRows.length > 0) {
            const rareHoloLVXCount = rareHoloLVXCountRows[0].count;
            res.locals.rareHoloLVXCount = rareHoloLVXCount;
        } else {
            console.error('No rows returned for rare count');
            res.status(500).send('No rows returned for rare count');
        }
    } catch (error) {
        console.error('Error fetching rare count:', error);
        res.status(500).send('Error fetching rare count');
    }
    res.render('dashboard', {
        user: req.session.userName,
        userCollection: res.locals.userCollection,
        isAuthenticated: req.session.authenticated,
        normalVarCount: res.locals.normalVariantCount,
        holoVarCount: res.locals.holoVariantCount,
        totalCount: res.locals.totalCount,
        uniqueCount: res.locals.uniqueCount,
        seriesCount: res.locals.seriesCount,
        pokemonCount: res.locals.pokemonCount,
        trainerCount: res.locals.trainerCount,
        energyCount: res.locals.energyCount,
        commonCount: res.locals.commonCount,
        rareCount: res.locals.rareCount,
        uncommonCount: res.locals.uncommonCount,
        rareHoloCount: res.locals.rareHoloCount,
        rareHoloLVXCount: res.locals.rareHoloLVXCount
    });
});

router.get('/cardsincollection', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    console.log('Router handling cards in collection...');
    try {
        const userUniqueCardsQuery = `SELECT DISTINCT card.* FROM card JOIN user_collection ON card.card_PK_id = user_collection.card_PK_id 
        JOIN user_collection_album ON user_collection.user_collection_album_id = user_collection_album.user_collection_album_id 
        WHERE user_collection_album.user_id = ?;`
        userUniqueCardsRows = await queryAsync(userUniqueCardsQuery, [userId]);
        if (userUniqueCardsRows.length > 0) {
            const mappedUniqueCards = userUniqueCardsRows.map(cardItem => ({
                PKId: cardItem.card_PK_id,
                id: cardItem.card_id,
                localId: cardItem.local_id,
                illustrator: cardItem.illustrator,
                image: cardItem.image,
                name: cardItem.name,
                hp: cardItem.hp,
                abilityType: cardItem.ability_type,
                abilityName: cardItem.ability_name,
                abilityEffect: cardItem.ability_effect,
                evolveFrom: cardItem.evolveFrom,
                energyType: cardItem.energy_type,
                rarity: cardItem.rarity,
                stage: cardItem.stage,
                setName: cardItem.card_set_name,
                setPKId: cardItem.card_set_id,
            }));
            res.locals.userUniqueCards = mappedUniqueCards;
            // console.log(res.locals.userUniqueCards);
        } else {
            console.error('empty collection');

        }
    } catch (error) {
        console.error('Error fetching unique count:', error);
        res.status(500).send('Error fetching unique count');
    }

    res.render('cardsincollection', {
        user: req.session.userName,
        userCollection: res.locals.userCollection,
        isAuthenticated: req.session.authenticated,
        normalVarCount: res.locals.normalVariantCount,
        holoVarCount: res.locals.holoVariantCount,
        totalCount: res.locals.totalCount,
        uniqueCount: res.locals.uniqueCount,
        seriesCount: res.locals.seriesCount,
        mappedUniqueCards: res.locals.userUniqueCards,
        userSeries: res.locals.userSeries
    });

});

router.get('/seriesincollection', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        const userSeriesQuery = `SELECT DISTINCT s.* 
        FROM series s  
        JOIN card_set cs ON s.series_PK_id = cs.series_PK_id  
        JOIN card c ON cs.card_set_id = c.card_set_id  
        JOIN user_collection uc ON c.card_PK_id = uc.card_PK_id  
        JOIN user_collection_album uca ON uc.user_collection_album_id = uca.user_collection_album_id  
        WHERE uca.user_id = ?;`
        userSeriesRows = await queryAsync(userSeriesQuery, [userId]);
        if (userSeriesRows.length > 0) {
            const mappedUniqueSeries = userSeriesRows.map(seriesItem => ({
                PKId: seriesItem.series_PK_id,
                id: seriesItem.series_id,
                name: seriesItem.name,
                logo: seriesItem.logo
            }));
            res.locals.userSeries = mappedUniqueSeries;
        } else {
            console.error('No rows returned for userSeries');
            res.status(500).send('No rows returned for userSeries');
        }
        console.log(res.locals.userSeries);

    } catch (error) {
        console.error('Error fetching userSeries:', error);
        res.status(500).send('Error fetching userSeries');
    }
    res.render('seriesincollection', {
        user: req.session.userName,
        userCollection: res.locals.userCollection,
        isAuthenticated: req.session.authenticated,
        normalVarCount: res.locals.normalVariantCount,
        holoVarCount: res.locals.holoVariantCount,
        totalCount: res.locals.totalCount,
        uniqueCount: res.locals.uniqueCount,
        seriesCount: res.locals.seriesCount,
        mappedUniqueCards: res.locals.userUniqueCards,
        userSeries: res.locals.userSeries
    });
});


// user collections page *****************************************************************************************************
router.get('/otherscollections', isAuthenticated, async (req, res) => {
    if (req.session.authenticated) {
        const userId = req.session.userId;
        try {
            const otherCollectionQuery = `SELECT user_collection_album.*, account.user_name FROM user_collection_album 
            JOIN account ON  account.user_id = user_collection_album.user_id
            WHERE account.user_id != ?;
            `;
            const otherCollectionRows = await queryAsync(otherCollectionQuery, [userId]);

            if (otherCollectionRows.length > 0) {
                const mappedOthersCollection = otherCollectionRows.map(collectionItem => ({
                    userAlbumId: collectionItem.user_collection_album_id,
                    otherUserId: collectionItem.user_id,
                    name: collectionItem.user_name,
                }));
                res.locals.otherUserCollection = mappedOthersCollection;
            } else {
                console.log('empty collection');
                res.locals.otherUserCollection = null;
            }
        } catch (error) {
            console.error('Error fetching collection:', error);
            res.status(500).send('Error fetching collection');
        }
        res.render('otherscollections', {
            user: req.session.userName,
            userCollection: res.locals.userCollection,
            isAuthenticated: req.session.authenticated,
            otherUserCollectionList: res.locals.otherUserCollection,
        });

    }
});

router.get('/othersccollectioninfo/:userId', isAuthenticated, async (req, res) => {

    try {
        const userName = req.params.userId;
        const otherCollectionQuery = `SELECT user_collection_album.*, account.user_name FROM user_collection_album 
        JOIN account ON  account.user_id = user_collection_album.user_id
        WHERE account.user_name = ?;
        `;
        const otherCollectionRows = await queryAsync(otherCollectionQuery, [userName]);

        if (otherCollectionRows.length > 0) {
            const mappedOthersCollection = otherCollectionRows.map(collectionItem => ({
                userAlbumId: collectionItem.user_collection_album_id,
                otherUserId: collectionItem.user_id,
                name: collectionItem.user_name,
            }));
            res.locals.otherUser = mappedOthersCollection;
            // console.log('other user:', mappedOthersCollection);
            console.log('mapped other user');
        } else {
            console.log('empty other user');
            res.locals.otherUser = null;
        }
    } catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).send('Error fetching collection');
    }
    try {
        const userName = req.params.userId;
        const userUniqueCardsQuery = `SELECT DISTINCT card.* FROM card JOIN user_collection ON card.card_PK_id = user_collection.card_PK_id JOIN 
        user_collection_album ON user_collection_album.user_collection_album_id = user_collection.user_collection_album_id
        JOIN account ON user_collection_album.user_id = account.user_id WHERE account.user_name = ?;`
        userUniqueCardsRows = await queryAsync(userUniqueCardsQuery, [userName]);
        if (userUniqueCardsRows.length > 0) {
            const mappedUniqueCards = userUniqueCardsRows.map(cardItem => ({
                PKId: cardItem.card_PK_id,
                id: cardItem.card_id,
                localId: cardItem.local_id,
                illustrator: cardItem.illustrator,
                image: cardItem.image,
                name: cardItem.name,
                hp: cardItem.hp,
                abilityType: cardItem.ability_type,
                abilityName: cardItem.ability_name,
                abilityEffect: cardItem.ability_effect,
                evolveFrom: cardItem.evolveFrom,
                energyType: cardItem.energy_type,
                rarity: cardItem.rarity,
                stage: cardItem.stage,
                setName: cardItem.card_set_name,
                setPKId: cardItem.card_set_id,
            }));
            res.locals.otherUserCards = mappedUniqueCards;
        } else {
            console.error('empty collection');

        }
    } catch (error) {
        console.error('Error fetching other user collection info:', error);
        res.status(500).send('Error fetching other user collection info');
    }
    try {
        const userName = req.params.userId;
        const otherCollectionLikesQuery = `SELECT COUNT(user_collection_hearts.user_collection_album_id) AS hearts_count
        FROM user_collection_hearts
        JOIN account ON user_collection_hearts.user_id = account.user_id
        WHERE account.user_name = ?;
        `;
        const otherCollectionLikeRows = await queryAsync(otherCollectionLikesQuery, [userName]);

        if (otherCollectionLikeRows.length > 0) {
            const heartCount = otherCollectionLikeRows[0].hearts_count
            res.locals.heartsCount = heartCount;
            console.log('Liked count:', heartCount);
        } else {
            console.log('no likes');
            res.locals.otherUserLikes = 0;
        }
    } catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).send('Error fetching collection');
    }

    res.render('othersccollectioninfo', {
        currentUser: req.session.userName,
        isAuthenticated: req.session.authenticated,
        userSeries: res.locals.userSeries,
        otherUserCollection: res.locals.otherUser,
        otherUserCards: res.locals.otherUserCards,
        userName: req.params.userId,
        heartsCount: res.locals.heartsCount
    });

});

router.get('/heartCollectionStatus/:userAlbumId', isAuthenticated, (req, res) => {
    const currentUserId = req.session.userId;
    const userAlbumId = req.params.userAlbumId;

    const query = 'SELECT COUNT(*) AS albumheart_exists FROM user_collection_hearts WHERE user_id = ? AND user_collection_album_id = ?';

    connection.query(query, [currentUserId, userAlbumId], (err, result) => {
        if (err) {
            console.error('Error checking wishlist status:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (result[0].albumheart_exists > 0) {
            console.log('heart exists');
            res.json({ exists: true });
        }
    });
});

router.post('/heartAlbum', isAuthenticated, async (req, res) => {
    console.log('router handling heart album...');
    const userAlbumId = req.body.userAlbumId;
    const userId = req.session.userId;

    const insertQuery = 'INSERT INTO user_collection_hearts (user_id, user_collection_album_id) VALUES (?, ?)';

    connection.query(insertQuery, [userId, userAlbumId], (err, result) => {
        if (err) {
            console.error('Error adding item to wishlist:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Heart Collection inserted');
        }
    });
});

router.post('/unheartAlbum', isAuthenticated, async (req, res) => {
    console.log('router handling unheart album...');
    const userAlbumId = req.body.userAlbumId;
    const userId = req.session.userId;

    const rmQuery = 'DELETE FROM user_collection_hearts WHERE user_id = ? AND user_collection_album_id = ?';

    connection.query(rmQuery, [userId, userAlbumId], (err, result) => {
        if (err) {
            console.error('Error remving heart from collection:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Heart Collection removed');
        }
    });
});


// wishlist ****************************************************************************************************************************
router.get('/wishlist', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        const userWishlistQuery = `SELECT DISTINCT w.*, c.card_id, c.local_id, c.illustrator, c.image, c.name, c.hp, c.ability_type, c.ability_name, c.ability_effect, c.evolveFrom, c.energy_type, c.rarity, c.stage, c.card_set_name, c.card_set_id FROM wishlist w JOIN card c ON w.card_PK_id = c.card_PK_id WHERE w.user_id = ?`
        userWishlistRows = await queryAsync(userWishlistQuery, [userId]);
        if (userWishlistRows.length > 0) {
            const mappedWishlist = userWishlistRows.map(wishlistItem => ({
                cardPKId: wishlistItem.card_PK_id,
                userId: wishlistItem.user_id,
                id: wishlistItem.card_id,
                localId: wishlistItem.local_id,
                illustrator: wishlistItem.illustrator,
                image: wishlistItem.image,
                name: wishlistItem.name,
                hp: wishlistItem.hp,
                abilityType: wishlistItem.ability_type,
                abilityName: wishlistItem.ability_name,
                abilityEffect: wishlistItem.ability_effect,
                evolveFrom: wishlistItem.evolveFrom,
                energyType: wishlistItem.energy_type,
                rarity: wishlistItem.rarity,
                stage: wishlistItem.stage,
                setName: wishlistItem.card_set_name,
                setPKId: wishlistItem.card_set_id,
            }));
            res.locals.userWishlist = mappedWishlist;
            console.log(res.locals.userWishlist);
        } else {
            console.error('No rows returned for wishlist');
            res.status(500).send('No rows returned for wishlist');
        }
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Error fetching wishlist');
    }
    res.render('wishlist', {
        user: req.session.userName,
        mappedWishlist: res.locals.userWishlist,
        isAuthenticated: req.session.authenticated
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
    const cardPKId = req.body.cardPKId;
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

// add to collection **************************************************************************************************************************


router.post('/addHoloToCollection', isAuthenticated, async (req, res) => {
    console.log('router handling add holo to collection...');
    const cardPKId = req.body.cardPKId;

    const userId = req.session.userId;
    const insertQuery = `INSERT INTO user_collection (user_collection_album_id, card_PK_id, variant) VALUES ((SELECT user_collection_album_id FROM user_collection_album WHERE user_id = ?), ?, 'Reverse Holo');`;

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
    const insertQuery = `INSERT INTO user_collection (user_collection_album_id, card_PK_id, variant) VALUES ((SELECT user_collection_album_id FROM user_collection_album WHERE user_id = ?), ?, 'Normal');`;

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
    const rmQuery = `DELETE FROM user_collection 
    WHERE user_collection_album_id = (SELECT user_collection_album_id FROM user_collection_album WHERE user_id = ?) 
    AND card_PK_id = ? 
    AND variant = 'Normal' 
    LIMIT 1;`;

    connection.query(rmQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error removing normal from collection:', err);
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
    const rmQuery = `DELETE FROM user_collection 
    WHERE user_collection_album_id = (SELECT user_collection_album_id FROM user_collection_album WHERE user_id = ?) 
    AND card_PK_id = ? 
    AND variant = 'Reverse Holo' 
    LIMIT 1;`;

    connection.query(rmQuery, [userId, cardPKId], (err, result) => {
        if (err) {
            console.error('Error removing holo from collection:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ success: true });
            console.log('Removed holo from collection');
        }
    });
});

// Logout route handler
router.get('/logout', (req, res) => {
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
