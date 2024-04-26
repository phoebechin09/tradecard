const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');



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

app.get('/:template', (req, res) => {
    const templateName = req.params.template;
    const templatePath = path.join(__dirname, 'views', `${templateName}.ejs`);

    // Check if template file exists
    fs.access(templatePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send('Not Found');
        } else {
            res.render(templateName, {
                seriesData: res.locals.seriesData,
                setData: res.locals.setData,
                cardData: res.locals.cardData
            });
        }
    });
});










const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
