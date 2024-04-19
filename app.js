const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

const fetchSeriesListData = async (req, res, next) => {
    try {
        let url = 'https://api.tcgdex.net/v2/en/series';
        let response = await fetch(url);
        let responseData = await response.json();
        res.locals.seriesListData = responseData;

        console.log('Series list data fetched:', res.locals.seriesListData);

        next();
    } catch (error) {
        console.error('Error fetching series list data:', error);
        res.status(500).send('Internal server error');
    }
};



app.get('/navbar', fetchSeriesListData, (req, res) => {
    res.render('navbar', { seriesList_data: res.locals.seriesListData });
});

app.get('/tradecard', fetchSeriesListData, (req, res) => {
    res.render('tradecard', { seriesList_data: res.locals.seriesListData });
});

app.get('/login', fetchSeriesListData, (req, res) => {
    res.render('login', { seriesList_data: res.locals.seriesListData });
});

app.get('/signup', fetchSeriesListData, (req, res) => {
    res.render('signup', { seriesList_data: res.locals.seriesListData });
});

app.get('/expansions', fetchSeriesListData, (req, res) => {
    res.render('expansions', { seriesList_data: res.locals.seriesListData });
});

app.get('/series', fetchSeriesListData, (req, res) => {
res.render('series', { seriesList_data: res.locals.seriesListData });
});

app.get('/cards', fetchSeriesListData, async (req, res) => {
    try {
        let limit = req.query.limit || 30; 
        let offset = req.query.offset || 0;
        
        let url = `https://api.tcgdex.net/v2/en/cards?limit=${limit}&offset=${offset}`;
        let response = await fetch(url); 
        let responseData = await response.json(); 

        let cardData = responseData;

        res.render('cards', { cards_data: cardData, seriesList_data: res.locals.seriesListData }); 
        
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).json({ error: 'Error fetching card data' }); 
    }
});




const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
