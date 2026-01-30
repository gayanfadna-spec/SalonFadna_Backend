const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const ITEMS_LIST = [
    { name: 'Satiny - Ultimate Hair Solution', price: 3900.00, discountType: 'percentage', discountValue: 10 },
    { name: 'Moist Curl Leave on Conditioner', price: 2100.00, discountType: 'percentage', discountValue: 10 },
    { name: 'Zeitgain cream', price: 5700.00, discountType: 'percentage', discountValue: 10 },
    { name: 'Cleomark', price: 8400.00, discountType: 'percentage', discountValue: 10 },
    { name: 'Glorrya', price: 6600.00, discountType: 'percentage', discountValue: 10 },
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders')
    .then(async () => {
        console.log('Connected to MongoDB');
        await Product.deleteMany({}); // Clear existing if any (optional, but good for reset)
        await Product.insertMany(ITEMS_LIST);
        console.log('Products Seeded');
        mongoose.disconnect();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
