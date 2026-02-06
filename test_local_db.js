const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/salon-orders';
console.log('Connecting to local DB:', uri);

mongoose.connect(uri)
    .then(async () => {
        console.log('Local MongoDB connected successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('Local connection error:', err.message);
        process.exit(1);
    });
