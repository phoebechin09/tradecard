const express = require('express');
const router = express.Router();
const { fetchAndStoreData, fetchAndStoreSeriesData } = require('./fetchAllData');
const connection = require('./database');

const util = require('util');
const queryAsync = util.promisify(connection.query).bind(connection);









function processCardData(rows) {
    return rows.map(cardItem => ({
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
}

const fetchAllFromDatabase = async (req, res, next) => {
    try {
        const seriesQuery = 'SELECT * FROM series';
        const fetchedSeriesData = await queryAsync(seriesQuery);

        if (!Array.isArray(fetchedSeriesData)) {
            throw new Error('Query did not return an array');
        }

        const processSeriesData = (rows) => {
            return rows.map(seriesItem => ({
                PKId: seriesItem.series_PK_id,
                id: seriesItem.series_id,
                name: seriesItem.name,
                logo: seriesItem.logo
            }));
        };

        res.locals.seriesData = processSeriesData(fetchedSeriesData);


    } catch (error) {
        console.error('Error fetching series data:', error);
        res.status(500).send('Error fetching series data');
    }

    try {
        const setQuery = 'SELECT * FROM card_set';
        const fetchedSetData = await queryAsync(setQuery);

        if (!Array.isArray(fetchedSetData)) {
            throw new Error('Query did not return an array');
        }

        const processSetData = (rows) => {
            return rows.map(setItem => ({
                PKId: setItem.card_set_id,
                id: setItem.set_id,
                name: setItem.name,
                logo: setItem.logo,
                symbol: setItem.symbol,
                cardCount: setItem.card_count,
                seriesPKId: setItem.series_PK_id
            }));
        };

        res.locals.setData = processSetData(fetchedSetData);
    } catch (error) {
        console.error('Error fetching set data:', error);
        res.status(500).send('Error fetching set data');
    }

    try {
        const cardQuery = 'SELECT * FROM card';
        const fetchedCardData = await queryAsync(cardQuery);

        if (!Array.isArray(fetchedCardData)) {
            throw new Error('Query did not return an array');
        }

        res.locals.cardData = processCardData(fetchedCardData);
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).send('Error fetching card data');
    }
    next();
};

const fetchSelectedSeriesAndSetData = async (req, res, next) => {
    try {
        const seriesId = req.params.seriesId;

        const filteredSeriesData = res.locals.seriesData.filter(series => series.id === seriesId);
        const selectedSeriesData = filteredSeriesData.length > 0 ? filteredSeriesData[0] : null;

        if (!selectedSeriesData) {
            throw new Error('Series data not found');
        }

        const seriesPKId = selectedSeriesData.PKId;

        const filteredSetData = res.locals.setData.filter(set => set.seriesPKId === seriesPKId);

        res.locals.selectedSeriesData = selectedSeriesData;
        res.locals.selectedSetData = filteredSetData;

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
    next();
};
router.use(fetchAllFromDatabase);
router.get(`/series_sets_list/:seriesId`, fetchSelectedSeriesAndSetData, (req, res) => {
    res.render('series_sets_list', {
        selectedSeriesData: res.locals.selectedSeriesData,
        selectedSetData: res.locals.selectedSetData,
    });
});
const fetchSelectedSetAndCardData = async (req, res, next) => {
    try {
        const setId = req.params.setId;

        const filteredSetData = res.locals.setData.filter(set => set.id === setId);
        const selectedSetData = filteredSetData.length > 0 ? filteredSetData[0] : null;

        if (!selectedSetData) {
            throw new Error('Set data not found');
        }

        const setPKId = selectedSetData.PKId;

        const filteredCardData = res.locals.cardData.filter(card => card.setPKId === setPKId);

        res.locals.selectedSetData = selectedSetData;
        res.locals.selectedCardData = filteredCardData;
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
    next();
};

router.get(`/set_cards_list/:setId`, fetchSelectedSetAndCardData, (req, res) => {
    res.render('set_cards_list', {
        selectedSetData: res.locals.selectedSetData,
        selectedCardData: res.locals.selectedCardData,
    });
});


const fetchSelectedCardData = async (req, res, next) => {
    try {
        const cardId = req.params.cardId;

        const filteredCardData = res.locals.cardData.filter(card => card.id === cardId);
        if (filteredCardData.length === 0) {
            return res.status(404).send('Card not found');
        }
        const query = `SELECT card_set.name AS set_name, card_set.card_count AS card_count, card_set.set_id, series.series_id, series.name AS series_name FROM card_set JOIN card ON card.card_set_id = card_set.card_set_id JOIN series ON card_set.series_PK_id = series.series_PK_id WHERE card.card_id = ?`;
        const filteredData = await queryAsync(query, cardId);
        if (filteredData.length === 0) {
            return res.status(404).send('Card data not found');
        }

        const mappedData = {
            cardSetID: filteredData[0].set_id,
            setCardCount: filteredData[0].card_count,
            cardSetName: filteredData[0].set_name,
            cardSeriesId: filteredData[0].series_id,
            cardSeriesName: filteredData[0].series_name
        };

        const attackQuery = `SELECT name, effect, cost, damage, card_id, card_PK_id FROM attack WHERE card_id = ?`
        const filteredAttack = await queryAsync(attackQuery, cardId);
        const mappedAttackData = filteredAttack ? filteredAttack.map(data => {
            function formatEnergyData(cost) {
                if (cost === null) {
                    return [];
                }
                const energyArray = cost.slice(1, -1).split(',');
                const energyCount = energyArray.reduce((acc, energy) => {
                    const trimmedEnergy = energy.trim().replace(/^"|"$/g, '');
                    acc[trimmedEnergy] = (acc[trimmedEnergy] || 0) + 1;
                    return acc;
                }, {});
                const formattedEnergy = Object.entries(energyCount).map(([energy, count]) => {
                    return `${energy} x${count}`;
                });
                return formattedEnergy;
            }
            const formattedEnergy = formatEnergyData(data.cost);
            return {
                name: data.name,
                effect: data.effect,
                cost: formattedEnergy,
                damage: data.damage,
                cardId: data.card_id,
                cardPKId: data.card_PK_id
            };
        }) : [];


        const weaknessQuery = `SELECT weakness.energy_type, weakness.value FROM weakness JOIN card ON card.card_PK_id = weakness.card_PK_id WHERE card.card_id = ?`;
        const filteredWeakness = await queryAsync(weaknessQuery, cardId);

        let mappedWeakness;
        if (filteredWeakness.length > 0) {
            // Extract the numeric value from the string
            const value = filteredWeakness[0].value.match(/\d+/)[0];
            mappedWeakness = [{
                type: filteredWeakness[0].energy_type,
                value: `x${value}`
            }];
        } else {
            mappedWeakness = null;
        }

        res.locals.selectedCardData = filteredCardData;
        res.locals.filteredData = mappedData;
        res.locals.filteredAttackData = mappedAttackData;
        res.locals.filteredWeaknessData = mappedWeakness;

    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).send('Error fetching data');
    }
    next();
};

router.get(`/cardinfo/:cardId`, fetchSelectedCardData, (req, res) => {
    res.render('cardinfo', {
        selectedCardInfo: res.locals.selectedCardData[0],
        selectedOtherInfo: res.locals.filteredData,
        selectedAttackInfo: res.locals.filteredAttackData,
        selectedWeaknessInfo: res.locals.filteredWeaknessData[0]
    });
});

router.get('/searchCardsKeyword', (req, res) => {
    const searchQuery = req.query.q;
    if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is missing' });
    }

    const sqlQuery = `
        SELECT *
        FROM card
        WHERE name LIKE ?
        OR illustrator LIKE ?
        OR ability_name LIKE ?
        OR evolveFrom LIKE ?
        OR energy_type LIKE ?
    `;
    const queryParams = Array(5).fill(`%${searchQuery}%`);

    connection.query(sqlQuery, queryParams, (error, results) => {
        if (error) {
            console.error('Error searching cards:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.locals.searchedCardData = processCardData(results);
        res.json(res.locals.searchedCardData);
    });
});

// Express route to serve card data
router.get('/api/cardData', (req, res) => {
    const cardData = res.locals.cardData;
    res.json(cardData);
});













// fetch from API and store into my database****************************************************************************
async function fetchDataAndInsertIntoDB() {
    try {
        const { baseSeriesData, dpSeriesData } = await fetchAndStoreData();
        const seriesListData = await fetchAndStoreSeriesData();

        // console.log('Structure of Base Series Data:', baseSeriesData);
        // console.log('Structure of DP Series Data:', dpSeriesData);

        for (const series of seriesListData) {
            const query = 'SELECT * FROM series WHERE name = ?';
            const rows = await connection.query(query, series.name);
            if (rows.length === 0) {
                await insertSeriesListData(series);
                console.log(`Inserted series ${series.name} into the database.`);
            } else {
                console.log(`Series ${series.name} already exists in the database, skipping insertion.`);
            }
        }

        await insertBaseSeriesData(baseSeriesData);
        await insertCardsSetFromBaseSeries(baseSeriesData);


        await insertDpSeriesData(dpSeriesData);
        await insertCardsSetFromDpSeriesData(dpSeriesData);

        return 'Data fetched and inserted successfully';
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        throw error;
    }
}

async function insertSeriesListData(seriesListData) {
    try {
        const insertionPromises = seriesListData.map(async series => {
            try {
                const query = `INSERT INTO series (series_id, name, logo) VALUES (?, ?, ?)`;
                const values = [series.id, series.name, series.logo];
                await connection.query(query, values);
            } catch (error) {
                console.error(`Error inserting series ${series.name}:`, error);
                throw error;
            }
        });
        await Promise.all(insertionPromises);
        return 'Series List Data fetched and inserted successfully';
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        throw error;
    }
}

async function insertBaseSeriesData(baseSeriesData) {
    try {
        console.log("Starting insertion process for base series...");
        const insertionPromises = [];

        for (const setItem of baseSeriesData.setDataBaseSeries) {
            try {
                // Insert sets into database
                console.log(`Inserting set: ${setItem.name}`);
                const setQuery = `INSERT INTO card_set (set_id, logo, name, symbol, card_count) VALUES (?, ?, ?, ?, ?)`;
                const setValues = [setItem.id, setItem.logo, setItem.name, setItem.symbol, setItem.cardCount.total,];
                await connection.query(setQuery, setValues);
                console.log(`Set inserted successfully`);
                console.log(`Set data: ${setValues}`);
                insertionPromises.push('Set inserted successfully');
            } catch (setError) {
                console.error(`Error inserting set: ${setError}`);
            }
        }
        await Promise.all(insertionPromises);
        console.log("All insertion processes for base series completed successfully.");
        return 'Data fetched and inserted successfully';
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        throw error;
    }
}

async function insertCardsSetFromBaseSeries(baseSeriesData) {
    try {
        console.log("Starting insertion process for sets from base series...");
        const insertionPromises = [];

        for (const setItem of baseSeriesData.setDataBaseSeries) {
            console.log(`Inserting cards from set: ${setItem.name}`);
            const setId = setItem.id;
            for (const cardItem of setItem.cards) {

                try {
                    console.log(`Inserting card: ${cardItem.name}`);
                    // Insert card data into the database
                    const cardQuery = `INSERT INTO card (card_id, local_id, illustrator, image, name, hp, ability_type, ability_name, ability_effect, evolveFrom, energy_type, rarity, stage, card_set_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    let abilityType = null;
                    let abilityName = null;
                    let abilityEffect = null;

                    if (cardItem.abilities && cardItem.abilities.length > 0) {
                        abilityType = cardItem.abilities[0].type || null;
                        abilityName = cardItem.abilities[0].name || null;
                        abilityEffect = cardItem.abilities[0].effect || null;
                    } else {
                        abilityType = null;
                        abilityName = null;
                        abilityEffect = null;
                    }

                    console.log(`Ability type: ${abilityType}, name: ${abilityName}, effect: ${abilityEffect}`);

                    const cardValues = [
                        cardItem.id,
                        cardItem.localId,
                        cardItem.illustrator || null,
                        cardItem.image || null,
                        cardItem.name || null,
                        cardItem.hp || null,
                        abilityType,
                        abilityName,
                        abilityEffect,
                        cardItem.evolveFrom || null,
                        JSON.stringify(cardItem.types) || null,
                        cardItem.rarity || null,
                        cardItem.stage || null,
                        setId
                    ];
                    await connection.query(cardQuery, cardValues);
                    console.log(`card_id: ${cardItem.id}, local_id: ${cardItem.localId}, illustrator: ${cardItem.illustrator}, image: ${cardItem.image}, 
                    name: ${cardItem.name}, hp: ${cardItem.hp}, ability_type: ${abilityType}, ability_name: $abilityName}, 
                    ability_effect: ${abilityEffect}, evolveFrom: ${cardItem.evolveFrom}, energy_type: ${JSON.stringify(cardItem.types)}, 
                    rarity: ${cardItem.rarity}, stage: ${cardItem.stage}, card_set_id: ${setId}`);
                    console.log(`Inserted card data successfully: ${cardValues}`);
                } catch (cardError) {
                    console.error(`Error inserting card: ${cardError}`);
                    throw cardError;
                }
                // Insert attack data into the database
                if (cardItem.attacks) {
                    if (Array.isArray(cardItem.attacks)) {
                        for (const attackItem of cardItem.attacks) {
                            try {
                                console.log(`Inserting attack: ${attackItem.name}`);
                                const attackQuery = `INSERT INTO attack (name, effect, cost, damage, card_id) VALUES (?, ?, ?, ?, ?)`;
                                const attackValues = [
                                    attackItem.name,
                                    attackItem.effect || null,
                                    JSON.stringify(attackItem.cost),
                                    attackItem.damage || null,
                                    cardItem.id
                                ];
                                await connection.query(attackQuery, attackValues);
                                console.log(`Attack inserted successfully`);
                                console.log(`Inserted attack data: ${attackValues}`);
                            } catch (attackError) {
                                console.error(`Error inserting attack: ${attackError}`);
                                throw attackError;
                            }
                        }
                    }
                    else {
                        try {
                            console.log(`Inserting attack: ${attackItem.name}`);
                            const attackQuery = `INSERT INTO attack (name, effect, cost, damage, card_id) VALUES (?, ?, ?, ?, ?)`;
                            const attackValues = [
                                attackItem.name,
                                attackItem.effect || null,
                                JSON.stringify(attackItem.cost),
                                attackItem.damage || null,
                                cardItem.id
                            ];
                            await connection.query(attackQuery, attackValues);
                            console.log(`Attack inserted successfully`);
                            console.log(`Inserted attack data: ${attackValues}`);
                        } catch (attackError) {
                            console.error(`Error inserting attack: ${attackError}`);
                            throw attackError;
                        }
                    }
                }
                // Insert weakness data for the card
                if (cardItem.weaknesses) {
                    try {
                        console.log(`Inserting weakness`);
                        const weaknessQuery = `INSERT INTO weakness (energy_type, value, card_id) VALUES (?, ?, ?)`;
                        const weaknessValues = [
                            cardItem.weaknesses[0].type || null,
                            JSON.stringify(cardItem.weaknesses[0].value) || null,
                            cardItem.id
                        ];
                        await connection.query(weaknessQuery, weaknessValues);
                        console.log(`Inserted weakness data: ${weaknessValues}`);
                    } catch (weaknessError) {
                        console.error(`Error inserting weakness: ${weaknessError}`);
                        throw weaknessError;
                    }
                }
                insertionPromises.push('Cards inserted successfully');
            }
        }
        await Promise.all(insertionPromises);

        console.log("All insertion processes for base series completed successfully.");
        return 'Data fetched and inserted successfully';
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        throw error;
    }

} // end of insertBaseSeriesData(baseSeriesData) method


async function insertDpSeriesData(dpSeriesData) {
    try {
        console.log("Starting insertion process for DP series...");
        const insertionPromises = [];

        for (const setItem of dpSeriesData.setDataDPSeries) {
            try {
                // Insert sets into database
                console.log(`Inserting set: ${setItem.name}`);
                const setQuery = `INSERT INTO card_set (set_id, logo, name, symbol, card_count) VALUES (?, ?, ?, ?, ?)`;
                const setValues = [setItem.id, setItem.logo, setItem.name, setItem.symbol, setItem.cardCount.total,];
                await connection.query(setQuery, setValues);
                console.log(`Set inserted successfully`);
                console.log(`Set data: ${setValues}`);
                insertionPromises.push('Set inserted successfully');
            } catch (setError) {
                console.error(`Error inserting set: ${setError}`);
            }
        }
        await Promise.all(insertionPromises);
        console.log("All insertion processes for DP series completed successfully.");
        return 'Data fetched and inserted successfully';
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        throw error;
    }
} // end of insertDPSeriesData(dpSeriesData) method

async function insertCardsSetFromDpSeriesData(dpSeriesData) {
    try {
        console.log("Starting insertion process for sets from DP series...");
        const insertionPromises = [];

        for (const setItem of dpSeriesData.setDataDPSeries) {
            console.log(`Inserting cards from set: ${setItem.name}`);
            const setId = setItem.id;
            for (const cardItem of setItem.cards) {

                try {
                    console.log(`Inserting card: ${cardItem.name}`);
                    // Insert card data into the database
                    const cardQuery = `INSERT INTO card (card_id, local_id, illustrator, image, name, hp, ability_type, ability_name, ability_effect, evolveFrom, energy_type, rarity, stage, card_set_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    let abilityType = null;
                    let abilityName = null;
                    let abilityEffect = null;

                    if (cardItem.abilities && cardItem.abilities.length > 0) {
                        abilityType = cardItem.abilities[0].type || null;
                        abilityName = cardItem.abilities[0].name || null;
                        abilityEffect = cardItem.abilities[0].effect || null;
                    } else {
                        abilityType = null;
                        abilityName = null;
                        abilityEffect = null;
                    }

                    console.log(`Ability type: ${abilityType}, name: ${abilityName}, effect: ${abilityEffect}`);

                    const cardValues = [
                        cardItem.id,
                        cardItem.localId,
                        cardItem.illustrator || null,
                        cardItem.image || null,
                        cardItem.name || null,
                        cardItem.hp || null,
                        abilityType,
                        abilityName,
                        abilityEffect,
                        cardItem.evolveFrom || null,
                        JSON.stringify(cardItem.types) || null,
                        cardItem.rarity || null,
                        cardItem.stage || null,
                        setId
                    ];
                    await connection.query(cardQuery, cardValues);
                    console.log(`card_id: ${cardItem.id}, local_id: ${cardItem.localId}, illustrator: ${cardItem.illustrator}, image: ${cardItem.image}, 
                    name: ${cardItem.name}, hp: ${cardItem.hp}, ability_type: ${abilityType}, ability_name: $abilityName}, 
                    ability_effect: ${abilityEffect}, evolveFrom: ${cardItem.evolveFrom}, energy_type: ${JSON.stringify(cardItem.types)}, 
                    rarity: ${cardItem.rarity}, stage: ${cardItem.stage}, card_set_id: ${setId}`);
                    console.log(`Inserted card data successfully: ${cardValues}`);
                } catch (cardError) {
                    console.error(`Error inserting card: ${cardError}`);
                    throw cardError;
                }
                // Insert attack data into the database
                if (cardItem.attacks) {
                    if (Array.isArray(cardItem.attacks)) {
                        for (const attackItem of cardItem.attacks) {
                            try {
                                console.log(`Inserting attack: ${attackItem.name}`);
                                const attackQuery = `INSERT INTO attack (name, effect, cost, damage, card_id) VALUES (?, ?, ?, ?, ?)`;
                                const attackValues = [
                                    attackItem.name,
                                    attackItem.effect || null,
                                    JSON.stringify(attackItem.cost),
                                    attackItem.damage || null,
                                    cardItem.id
                                ];
                                await connection.query(attackQuery, attackValues);
                                console.log(`Attack inserted successfully`);
                                console.log(`Inserted attack data: ${attackValues}`);
                            } catch (attackError) {
                                console.error(`Error inserting attack: ${attackError}`);
                                throw attackError;
                            }
                        }
                    }
                    else {
                        try {
                            console.log(`Inserting attack: ${attackItem.name}`);
                            const attackQuery = `INSERT INTO attack (name, effect, cost, damage, card_id) VALUES (?, ?, ?, ?, ?)`;
                            const attackValues = [
                                attackItem.name,
                                attackItem.effect || null,
                                JSON.stringify(attackItem.cost),
                                attackItem.damage || null,
                                cardItem.id
                            ];
                            await connection.query(attackQuery, attackValues);
                            console.log(`Attack inserted successfully`);
                            console.log(`Inserted attack data: ${attackValues}`);
                        } catch (attackError) {
                            console.error(`Error inserting attack: ${attackError}`);
                            throw attackError;
                        }
                    }
                }
                // Insert weakness data for the card
                if (cardItem.weaknesses) {
                    try {
                        console.log(`Inserting weakness`);
                        const weaknessQuery = `INSERT INTO weakness (energy_type, value, card_id) VALUES (?, ?, ?)`;
                        const weaknessValues = [
                            cardItem.weaknesses[0].type || null,
                            JSON.stringify(cardItem.weaknesses[0].value) || null,
                            cardItem.id
                        ];
                        await connection.query(weaknessQuery, weaknessValues);
                        console.log(`Inserted weakness data: ${weaknessValues}`);
                    } catch (weaknessError) {
                        console.error(`Error inserting weakness: ${weaknessError}`);
                        throw weaknessError;
                    }
                }
                insertionPromises.push('Cards inserted successfully');
            }
        }
        await Promise.all(insertionPromises);

        console.log("All insertion processes for DP series completed successfully.");
        return 'Data fetched and inserted successfully';
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        throw error;
    }
} // end of insertCardsSetFromDpSeriesData(dpSeriesData) method

// Handle the route FetchAndInsertData
// router.get('/FetchAndInsertData', async (req, res) => {
//     try {
//         console.log('calling function fetchDataAndInsertIntoDB();');
//         const result = await fetchDataAndInsertIntoDB();
//         res.send(result);

//     } catch (error) {
//         console.error('Error processing request:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


router.use(fetchAllFromDatabase);
module.exports = router;


