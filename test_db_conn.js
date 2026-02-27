require('dotenv').config();
const mongoose = require('mongoose');

const testDb = async () => {
    try {
        console.log('Testing DB connection to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('MongoDB Connected Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
};

testDb();
