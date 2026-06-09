const mongoose = require('mongoose');
const Order = require('../models/Order');
const Agent = require('../models/Agent');
const NetAgent = require('../models/NetAgent');
require('dotenv').config({ path: '../.env' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const orders = await Order.find({ 
        $or: [
            { agentName: /samitha/i },
            { netAgent1Id: '6639c0fa3129532599268f7b' } // I don't know her ID yet, I will just search by name
        ]
    });
    console.log(`Found ${orders.length} orders matching 'samitha'`);
    orders.forEach(o => {
        console.log(`ID: ${o._id}, Name: ${o.agentName}, Status: ${o.status}, Date: ${o.createdAt}, NA1: ${o.netAgent1Id}, NA2: ${o.netAgent2Id}`);
    });
    process.exit();
}
check();
