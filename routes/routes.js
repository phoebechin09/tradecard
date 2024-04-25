const express = require('express');
const router = express.Router();
const { fetchAndStoreData, fetchAndStoreSeriesData } = require('./fetchAllData');

const mysql = require('mysql');


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tcgcove',
    port: '3306',
    multipleStatements: true
});



connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL server');
});


async function fetchDataAndInsertIntoDB() {
    try {
        const { baseSeriesData, dpSeriesData } = await fetchAndStoreData();
        const seriesListData = await fetchAndStoreSeriesData();

        // console.log('Structure of Base Series Data:', baseSeriesData);
        console.log('Structure of DP Series Data:', dpSeriesData);

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


        // Insert baseSeriesData into base_series table
        await insertBaseSeriesData(baseSeriesData);
        await insertCardsSetFromBaseSeries(baseSeriesData);


        // Insert dpSeriesData into dp_series table
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
                console.log(`Inserted series: ${series.name}`);
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
router.get('/FetchAndInsertData', async (req, res) => {
    try {
        console.log('calling function fetchDataAndInsertIntoDB();');
        const result = await fetchDataAndInsertIntoDB();
        res.send(result);

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});



module.exports = router;



