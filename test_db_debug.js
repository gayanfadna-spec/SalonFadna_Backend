require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders';
console.log('Connecting to:', uri);

mongoose.connect(uri)
    .then(async () => {
        console.log('MongoDB connected successfully');
        try {
            console.log('Listing collections...');
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Collections:', collections.map(c => c.name));
            process.exit(0);
        } catch (err) {
            console.error('Error listing collections:', err);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
