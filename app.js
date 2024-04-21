const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

const fetchAllData = async (req, res, next) => {
    try {
        // Fetch series list data
        let seriesUrl = 'https://api.tcgdex.net/v2/en/series';
        let seriesResponse = await fetch(seriesUrl);
        let seriesData = await seriesResponse.json();
        res.locals.seriesListData = seriesData;
    } catch (error) {
        console.error('Error fetching series list data:', error);
        res.status(500).send('Internal server error');
    }

    // Check if the request is for the /cards route
    try {
        if (req.path === '/cards') {
            let cardUrl = `https://api.tcgdex.net/v2/en/cards`;
            let cardResponse = await fetch(cardUrl);
            let cardData = await cardResponse.json();
            res.locals.cardData = cardData;
            console.log('Card data response status:', cardResponse.status);
            console.log(`fetched card data for ${req.path}`);

        } else {

            let allCardsUrl = 'https://api.tcgdex.net/v2/en/cards';
            let allCardsResponse = await fetch(allCardsUrl);
            let allCardsData = await allCardsResponse.json();

            const cardSkeleton = {
                category: null,
                id: null,
                illustrator: null,
                image: null,
                localId: null,
                name: null,
                rarity: null,
                variants: {
                    firstEdition: false,
                    holo: false,
                    normal: false,
                    reverse: false,
                    wPromo: false,
                },
                dexId: null,
                hp: null,
                types: null,
                evolveFrom: null,
                stage: null,
                abilities: null,
                attacks: null,
                weaknesses: null,
                retreat: null,
                legal: {
                    standard: false,
                    expanded: false,
                },
                energyType: null,
            };

            // Map each card in allCardsData to the cardSkeleton structure
            const parsedCards = allCardsData.map(card => {
                const parsedCard = { ...cardSkeleton }; // Create a new object based on cardSkeleton
                // Map each property from card to parsedCard
                for (const key in card) {
                    if (parsedCard.hasOwnProperty(key)) {
                        parsedCard[key] = card[key];
                    }
                }
                return parsedCard;
            });

            // Set parsed card data and series list data as variables
            res.locals.parsedCards = parsedCards;
            console.log(`fetched and parsed all card data`);
        }
    } catch (error) {
        console.error('Error fetching all card data:', error);
        res.status(500).send('Internal server error');
    }

    next();
};

app.get('/cards', fetchAllData, async (req, res) => {
    // Check if cardData exists in res.locals
    if (res.locals.cardData) {
        // Assign cardData to cards_data
        res.render('cards', { 
            cards_data: res.locals.cardData, 
            seriesList_data: res.locals.seriesListData 
        });

    } else {
        // Handle case where cardData is not available
        console.error('Card data is not available');
        res.status(500).send('Internal server error');
    }
});

app.get(`/series_sets_list/:seriesId`, async (req, res) => {
    try {
        const seriesId = req.params.seriesId;
        const url = `https://api.tcgdex.net/v2/en/series/${seriesId}`;
        const response = await fetch(url);
        const seriesData = await response.json();

        console.log(url);
        console.log(`seriesList_data: ${res.locals.seriesListData}`);

        res.render('series_sets_list', { 
            seriesList: seriesData, 
            seriesId: seriesId, 
            seriesList_data: res.locals.seriesListData, 
            parsedCard: res.locals.parsedCards 
        });
    } catch (error) {
        console.error('Error fetching series data:', error);
        res.status(500).send('Error fetching series data');
    }
});






const templates = [
    'navbar', 
    'tradecard', 
    'login', 
    'signup', 
    'expansions', 
    'series', 
    'cardinfo', 
    'footer'
];
app.get('/:template', fetchAllData, (req, res) => {
    const templateName = req.params.template;
    if (templates.includes(templateName)) {
        res.render(templateName, { 
            seriesList_data: res.locals.seriesListData, 
            parsedCard: res.locals.parsedCards, 
        });
    } else {
        res.status(404).send('Not Found');
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
