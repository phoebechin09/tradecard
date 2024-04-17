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



// Set EJS as the view engine
app.set('view engine', 'ejs');

// render login, signup and tradecard webpage
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


// ********** DRAFTS HERE ************ //


app.get('/cards', async (req, res) => {
    try {
        let url = `https://api.tcgdex.net/v2/en/cards/swsh3-136`;
        let response = await fetch(url); // Fetch card data from the API
        let cardData = await response.json(); // Parse response body as JSON
        res.render('cards', { cardData }); // Render the 'cards.ejs' template with cardData
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).send('Error fetching card data'); // Send an error response to the client
    }
});












// ********** DRAFTS HERE ************ //


app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

