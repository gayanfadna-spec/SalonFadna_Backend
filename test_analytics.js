const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');

async function testAnalytics() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders');
        console.log('Connected to DB');

        // Test Salon Performance
        console.log('--- Salon Performance ---');
        const salonStats = await Order.aggregate([
            {
                $group: {
                    _id: "$salonId",
                    salonName: { $first: "$salonName" },
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                    totalItemsSold: { $sum: { $sum: "$items.quantity" } }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
        console.log(JSON.stringify(salonStats, null, 2));

        // Test Item Performance
        console.log('--- Item Performance ---');
        const itemStats = await Order.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productName",
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
        console.log(JSON.stringify(itemStats, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
}

testAnalytics();
