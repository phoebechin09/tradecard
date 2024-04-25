const express = require('express');
const path = require('path');
const app = express();




// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// routes
const routes = require('./routes/routes');

try {
    app.use('/', routes);
    console.log('Setting up route');
} catch (error) {
    console.error('Error setting up routes:', error);
}


// *********************************************************************************



// const templates = [
//     'navbar', 
//     'tradecard', 
//     'login', 
//     'signup', 
//     'expansions', 
//     'series', 
//     'cardinfo', 
//     'footer'
// ];
// app.get('/:template', fetchAllData, (req, res) => {
//     const templateName = req.params.template;
//     if (templates.includes(templateName)) {
//         res.render(templateName, { 
//             seriesList_data: res.locals.seriesListData, 
//             parsedCard: res.locals.parsedCards, 
//         });
//     } else {
//         res.status(404).send('Not Found');
//     }
// });

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
