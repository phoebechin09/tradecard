const express = require('express');
const path = require('path');
const { sessionConfig } = require('./routes/config');
const fs = require('fs');

const app = express();

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');



// routes
const publicRoutes = require('./routes/routes');
const authRoutes = require('./routes/authRoutes');

try {
    app.use('/', publicRoutes);
    console.log('Setting up public routes');
} catch (error) {
    console.error('Error setting up public routes:', error);
}

try {
    app.use('/', authRoutes);
    console.log('Setting up auth routes');
} catch (error) {
    console.error('Error setting up public routes:', error);
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
