const express = require('express')
const { MongoClient } = require('mongodb');
const path = require('path')
const dotenv = require('dotenv').config( {
        path: path.join(__dirname, '/src/.env')
});
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const app = express();
const upload = multer();

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '/src/views'))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));

const MONGODB_URI = 'mongodb+srv://makykari:11112004ar@cluster0.jrgn1k2.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'userDB';
const COLLECTION_NAME = 'users';

let db, collection;

app.use(session({
    secret: "qwerty",
    resave: false,
    saveUninitialized: true
}));

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8000;
}
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        console.log('Connected to MongoDB');
        db = client.db(DB_NAME);
        collection = db.collection(COLLECTION_NAME);
    })
    .catch(error => console.error('Error connecting to MongoDB:', error));

function authorizeUser(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/', authorizeUser, async (req, res) => {
    try {
        const recommendations = await db.collection('recommendations').find().toArray();
        const companyCards = await db.collection('cards').find().toArray();
        const user = req.session.user;
        res.render('index', { recommendations, companyCards, user});
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/register', async (req, res) => {
    const { name, password } = req.body;
    

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        name: name,
        password: hashedPassword,
        creationDate: new Date(),
        isAdmin: false,
        tickers: []
    };

    try {
        const existingUser = await collection.findOne({ name: name });
        if (existingUser) {
            return res.status(400).send('Username is already used.');
        }
    } catch (error) {
        console.error('Error checking existing username:', error);
        return res.status(500).send('Internal Server Error');
    }

    try {
        const result = await collection.insertOne(newUser);
        res.status(201).redirect('/');
    } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/login', async (req, res) => {
    const { name, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await collection.findOne({ name: name});

        if(!bcrypt.compare(password, hashedPassword)) {
            return res.status(401).send('Unauthorized: Invalid username or password.');
        }

        if (user) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.status(401).send('Unauthorized: Invalid username or password.');
        }
    } catch (error) {
        console.error('Error finding user:', error);
        res.status(500).send('Internal Server Error');
    }
});

var history;

app.post('/', authorizeUser, async (req, res) => {
    const ticker = req.body.ticker;
    const currentDate = Date.now();
    
    var response, detailedDataresponse, logoresponse;
    try {
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/2000-01-01/${currentDate}?adjusted=true&apiKey=${process.env.YAHOO_FINANCE_API_KEY}`;
        response = await fetch(url).then(response => response.json());
        
        if (!response || !response.results || response.results.length === 0) {
            res.send({ historyOfStock: {}, forecast: {}, detailedData: {}, logo: {}});
            return;
        }
        history = response.results;

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }

    try {
        const detailedDataUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${process.env.DETAILED_DATA_API_KEY}`;
        detailedDataresponse = await fetch(detailedDataUrl).then(response => response.json());

        if (!detailedDataresponse) {
            res.send({ historyOfStock: {}, forecast: {}, detailedData: {}, logo: {}});
            return;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }

    try {
        const logoUrl = `https://api.api-ninjas.com/v1/logo?name=${detailedDataresponse[0].companyName.toString().split(/[, .]+/)[0]}&X-Api-Key=${process.env.LOGO_API_KEY}`;
        logoresponse = await fetch(logoUrl).then(response => response.json());

        if (!logoresponse) {
            res.send({ historyOfStock: {}, forecast: {}, detailedData: {}, logo: {}});
            return;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }

    res.send({ historyOfStock: response.results, detailedData: detailedDataresponse, logo: logoresponse[0] });
});


app.get('/admin', isAdmin, async (req, res) => {
    try {
        const companyCards = await db.collection('cards').find().toArray();
        res.render('admin', { companyCards, user: req.session.user});
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.status(403).send('Forbidden: Only admins can access this page.');
    }
}

app.post('/admin/users', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await collection.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists');
        }

        await collection.insertOne({ username, password });
        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/admin/add_recommendations', async (req, res) => {
    try {
        const { stockTicker } = req.body;

        const existingRecommendation = await db.collection('recommendations').findOne({ stockTicker });

        if (existingRecommendation) {
            res.status(400).send('Recommendation already exists');
            return;
        }

        await db.collection('recommendations').insertOne({ stockTicker });
        res.status(201).send('Recommendation added successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/remove_recommendations', async (req, res) => {
    try {
        const { stockTicker } = req.body;
        const existingRecommendation = await db.collection('recommendations').findOne({ stockTicker });
        
        if (existingRecommendation) {
            await db.collection('recommendations').deleteOne({ stockTicker });
            res.status(200).send('Recommendation deleted successfully');
        } else {
            res.status(404).send('Recommendation not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/addCompany', upload.single('photo'), async (req, res) => {
    try {
        const { companyName, description} = req.body;
        const photo = req.file.buffer;
        const creationDate = new Date().toLocaleDateString();

        await db.collection('cards').insertOne({
            companyName,
            description,
            creationDate,
            photo
        });
        res.status(201).send('Company card added successfully');
    } catch (error) {
        console.error('Error adding company card:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/delete/:id', async (req, res) => {
    const companyId = req.params.id;
    try {
        await db.collection('cards').deleteOne({ _id: new ObjectId(companyId) });
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/update/:id', isAdmin ,async (req, res) => {
    const companyId = req.params.id;
    try {
        const company = await db.collection('cards').findOne({ _id: new ObjectId(companyId) });
        res.render('update', { company });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/update/:id', upload.single('photo'), async (req, res) => {
    const companyId = req.params.id;
    const { companyName, description } = req.body;
    const creationDate = new Date().toLocaleDateString();

    try {
        const existingCompany = await db.collection('cards').findOne({ _id: new ObjectId(companyId) });

        let updateData = {
            companyName: companyName || existingCompany.companyName,
            description: description || existingCompany.description,
            creationDate: creationDate,
        };

        if (req.file && req.file.buffer) {
            updateData.photo = req.file.buffer;
        } else {
            updateData.photo = existingCompany.photo;
        }

        const result = await db.collection('cards').updateOne({ _id: new ObjectId(companyId) }, { $set: updateData });

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/profile', authorizeUser, async (req, res) => {
    try {
        const user = req.session.user;

        const profile = await collection.findOne({ name: user.name });

        res.render('profile', { profile });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/addToProfile', authorizeUser, async (req, res) => {
    const ticker = req.body.ticker;
    const user = req.session.user;

    const twoDaysDifference = history[history.length - 1].c / history[history.length - 2].c * 100 - 100;

    try {
        const existingProfile = await collection.findOne({ name: user.name });
        if (existingProfile) {
            if (!existingProfile.tickers.includes(ticker)) {
                await collection.updateOne({ name: user.name }, { $push: { tickers: ticker, difference: twoDaysDifference } });
                res.status(201).send('Ticker added to profile');
            } else {
                res.status(400).send('Ticker already exists in profile');
            }
        }
        else{
            await collection.updateOne({ name: user.name }, { $push: { tickers: ticker, difference: twoDaysDifference } });
            res.status(201).send('Ticker added to profile');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
})