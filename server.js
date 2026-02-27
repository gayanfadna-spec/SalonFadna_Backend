require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Replaces bodyParser.json()
app.use(express.urlencoded({ extended: true })); // Replaces bodyParser.urlencoded()

const fs = require('fs');
app.use((req, res, next) => {
    console.log(`[DEBUG] Request: ${req.method} ${req.originalUrl}`);
    console.log(`[DEBUG] Content-Type: ${req.headers['content-type']}`);
    console.log(`[DEBUG] Body:`, JSON.stringify(req.body));
    next();
});

// Routes
const salonRoutes = require('./routes/salonRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/salons', salonRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
//app.use('/api/auth/forgot-password', require('./routes/authRoutes'));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders')
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:');
        console.error(err.message);
        if (err.name === 'MongooseServerSelectionError') {
            console.error('TIP: Check if your current IP is whitelisted in MongoDB Atlas.');
        }
    });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


//70 684 53 99

