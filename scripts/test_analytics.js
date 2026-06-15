const mongoose = require('mongoose');
const Order = require('../models/Order');
require('dotenv').config({ path: '../.env' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const groupByField = {
        $ifNull: [
            "$netAgent1Id", 
            { $ifNull: ["$agentId", "$agentName"] }
        ]
    };

    const stats = await Order.aggregate([
        { $match: { status: { $in: ["Paid", "COD", "Completed"] } } },
        {
            $group: {
                _id: groupByField,
                count: { $sum: 1 },
                sampleAgentName: { $first: "$agentName" }
            }
        },
        {
            $lookup: {
                from: "netagents",
                let: { searchId: { $convert: { input: "$_id", to: "objectId", onError: null, onNull: null } } },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$searchId"] } } },
                    { $project: { name: 1 } }
                ],
                as: "netAgentDocs"
            }
        },
        {
            $lookup: {
                from: "agents",
                let: { searchId: { $convert: { input: "$_id", to: "objectId", onError: null, onNull: null } } },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$searchId"] } } },
                    { $project: { name: 1 } }
                ],
                as: "agentDocs"
            }
        },
        {
            $addFields: {
                resolvedName: {
                    $cond: [
                        { $gt: [{ $size: "$netAgentDocs" }, 0] },
                        { $arrayElemAt: ["$netAgentDocs.name", 0] },
                        {
                            $cond: [
                                { $gt: [{ $size: "$agentDocs" }, 0] },
                                { $arrayElemAt: ["$agentDocs.name", 0] },
                                "$_id"
                            ]
                        }
                    ]
                }
            }
        }
    ]);
    
    console.log(JSON.stringify(stats, null, 2));
    process.exit();
}
check();
