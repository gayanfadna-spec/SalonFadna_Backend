const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Salon = require('../models/Salon');
const Agent = require('../models/Agent');
const NetAgent = require('../models/NetAgent');

async function backfillRepNames() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const orders = await Order.find({ repName: { $exists: false } }); // or you can run on all: {}
        console.log(`Found ${orders.length} orders lacking repName.`);

        let updatedCount = 0;

        for (let order of orders) {
            let repName = '';

            if (order.salonId) {
                const salon = await Salon.findOne({
                    $or: [
                        { _id: mongoose.Types.ObjectId.isValid(order.salonId) ? order.salonId : null },
                        { uniqueId: order.salonId }
                    ]
                });
                if (salon && salon.repName) repName = salon.repName;
            } else if (order.agentId) {
                let agent = await Agent.findOne({
                    $or: [
                        { _id: mongoose.Types.ObjectId.isValid(order.agentId) ? order.agentId : null },
                        { uniqueId: order.agentId }
                    ]
                });
                if (!agent) {
                    agent = await NetAgent.findOne({
                        $or: [
                            { _id: mongoose.Types.ObjectId.isValid(order.agentId) ? order.agentId : null },
                            { uniqueId: order.agentId }
                        ]
                    });
                }
                if (agent && agent.repName) repName = agent.repName;
            }

            if (repName) {
                order.repName = repName;
                await order.save();
                updatedCount++;
            }
        }

        console.log(`Successfully backfilled ${updatedCount} orders with repName.`);
        console.log("Done.");
        process.exit(0);
    } catch (err) {
        console.error("Error backfilling repNames:", err);
        process.exit(1);
    }
}

backfillRepNames();
