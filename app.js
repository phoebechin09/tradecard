const express = require('express');
const path = require('path');
const app = express();
// const fetch = require('node-fetch');

const cardTemplate = {
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



app.get('/expansions', (req, res) => {
    res.render('expansions', { /* data */ });
});


// ***************************** DRAFTS HERE ***************************** //

app.get('/cards', async (req, res) => {
    try {
        let limit = req.query.limit || 30; 
        let offset = req.query.offset || 0;
        
        
        let url = `https://api.tcgdex.net/v2/en/base/baseset?limit=${limit}&offset=${offset}`;
        let response = await fetch(url); 
        let responseData = await response.json(); 

        let cardData = responseData.cards;

        res.render('cards', { cards_data: cardData }); 
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).json({ error: 'Error fetching card data' }); 
    }
});

// load more cards function
app.get('/cards', async (req, res) => {
    try {
        let limit = req.query.limit || 30; 
        let offset = req.query.offset || 0;
        
        let url = `https://api.tcgdex.net/v2/en/base/baseset?limit=${limit}&offset=${offset}`;
        let response = await fetch(url); 
        let responseData = await response.json(); 

        let cardData = responseData.cards;

        res.render('cards', { cards_data: cardData, offset: offset }); 
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).json({ error: 'Error fetching card data' }); 
    }
});






app.get('/navbar', async (req, res) => {
    try {
        let url = `https://api.tcgdex.net/v2/en/series`;
        let response = await fetch(url); 
        let responseData = await response.json(); 

        let seriesListData = responseData.cards;

        res.render('navbar', { seriesList_data: seriesListData }); 
    } catch (error) {
        console.error('Error fetching list of series data:', error);
        res.status(500).send('Error fetching list of series data'); 
    }
});








// ***************************** DRAFTS HERE ***************************** //


app.use(express.static(path.join(__dirname, 'public')));


const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

