const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Salon = require('../models/Salon');

// Get Salon Performance (Orders, Revenue, Items)
router.get('/salon-performance', async (req, res) => {
    try {
        const { salonId, agentId, startDate, endDate } = req.query;
        let matchStage = {};
        if (salonId) {
            matchStage.salonId = salonId;
        } else if (agentId) {
            matchStage.agentId = agentId;
        }
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$salonId",
                    salonName: { $first: "$salonName" },
                    totalOrders: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.commission", 0] }, "$$this.quantity"] }] }
                                }
                            }, 0]
                        }
                    },
                    totalItemsSold: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, { $sum: "$items.quantity" }, 0]
                        }
                    },
                    returnedOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] }
                    },
                    totalCommission: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.commission", 0] }, "$$this.quantity"] }] }
                                }
                            }, 0]
                        }
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Item Performance (Quantity, Revenue)
router.get('/item-performance', async (req, res) => {
    try {
        const { salonId, agentId, startDate, endDate } = req.query;
        let matchStage = {};
        if (salonId) {
            matchStage.salonId = salonId;
        } else if (agentId) {
            matchStage.agentId = agentId;
        }
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const stats = await Order.aggregate([
            {
                $match: {
                    ...matchStage,
                    status: { $in: ['Paid'] } // Only count Paid orders
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productName",
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: [{ $ifNull: ["$items.commission", 0] }, "$items.quantity"] } },
                    totalCommission: { $sum: { $multiply: [{ $ifNull: ["$items.commission", 0] }, "$items.quantity"] } }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Agent Performance (Orders, Revenue, Items)
router.get('/agent-performance', async (req, res) => {
    try {
        const { agentId, startDate, endDate } = req.query;
        let matchStage = {};
        if (agentId) {
            matchStage.agentId = agentId;
        }
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$agentId",
                    agentName: { $first: "$agentName" },
                    totalOrders: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.commission", 0] }, "$$this.quantity"] }] }
                                }
                            }, 0]
                        }
                    },
                    totalItemsSold: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, { $sum: "$items.quantity" }, 0]
                        }
                    },
                    returnedOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] }
                    },
                    totalCommission: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.commission", 0] }, "$$this.quantity"] }] }
                                }
                            }, 0]
                        }
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Rep Performance (Orders, Revenue, Items)
router.get('/rep-performance', async (req, res) => {
    try {
        const { startDate, endDate, groupByDate } = req.query;
        const isGroupByDate = groupByDate === 'true';
        let matchStage = {};

        // We only care about orders that have a valid repName
        matchStage.repName = { $exists: true, $nin: [null, "", "Unassigned", "1st", "1ST", "1st "] };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: isGroupByDate
                        ? { repName: "$repName", date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Colombo" } } }
                        : "$repName",
                    repName: { $first: "$repName" },
                    ...(isGroupByDate && { date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Colombo" } } } }),
                    totalOrders: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.commission", 0] }, "$$this.quantity"] }] }
                                }
                            }, 0]
                        }
                    },
                    totalItemsSold: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, { $sum: "$items.quantity" }, 0]
                        }
                    },
                    returnedOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] }
                    },
                    totalCommission: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "COD", "Shipped", "Completed"]] }, {
                                $reduce: {
                                    input: "$items",
                                    initialValue: 0,
                                    in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.commission", 0] }, "$$this.quantity"] }] }
                                }
                            }, 0]
                        }
                    }
                }
            },
            { $sort: isGroupByDate ? { date: 1 } : { totalRevenue: -1 } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Rep Activity Summary (Visited, Active, Revisited, POSM)
router.get('/rep-activity', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`[BACKEND] Rep-activity requested. startDate: ${startDate}, endDate: ${endDate}`);

        let start = startDate ? new Date(startDate) : null;
        let end = endDate ? new Date(endDate + 'T23:59:59.999Z') : null;

        // 1. Get Salon Activity Stats
        const salonStats = await Salon.aggregate([
            {
                $match: {
                    repName: { $nin: [null, "", "Unassigned", "1st", "1ST", "1st "] }
                }
            },
            {
                $group: {
                    _id: "$repName",
                    visited: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$isVisited", true] },
                                        ...(startDate ? [{ $gte: ["$visitedDate", start] }] : []),
                                        ...(endDate ? [{ $lte: ["$visitedDate", end] }] : [])
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    active: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        {
                                            $or: [
                                                // New visited in range
                                                {
                                                    $and: [
                                                        ...(startDate ? [{ $gte: ["$visitedDate", start] }] : []),
                                                        ...(endDate ? [{ $lte: ["$visitedDate", end] }] : [])
                                                    ]
                                                },
                                                // Revisited in range
                                                {
                                                    $gt: [
                                                        {
                                                            $size: {
                                                                $filter: {
                                                                    input: { $ifNull: ["$revisitedDates", []] },
                                                                    as: "d",
                                                                    cond: (startDate || endDate) ? {
                                                                        $and: [
                                                                            ...(startDate ? [{ $gte: ["$$d", start] }] : []),
                                                                            ...(endDate ? [{ $lte: ["$$d", end] }] : [])
                                                                        ]
                                                                    } : true
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    posm: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$posmActive", true] },
                                        {
                                            $or: [
                                                // New visited in range
                                                {
                                                    $and: [
                                                        ...(startDate ? [{ $gte: ["$visitedDate", start] }] : []),
                                                        ...(endDate ? [{ $lte: ["$visitedDate", end] }] : [])
                                                    ]
                                                },
                                                // Revisited in range
                                                {
                                                    $gt: [
                                                        {
                                                            $size: {
                                                                $filter: {
                                                                    input: { $ifNull: ["$revisitedDates", []] },
                                                                    as: "d",
                                                                    cond: (startDate || endDate) ? {
                                                                        $and: [
                                                                            ...(startDate ? [{ $gte: ["$$d", start] }] : []),
                                                                            ...(endDate ? [{ $lte: ["$$d", end] }] : [])
                                                                        ]
                                                                    } : true
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    revisited: {
                        $sum: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ["$revisitedDates", []] },
                                    as: "d",
                                    cond: (startDate || endDate) ? {
                                        $and: [
                                            ...(startDate ? [{ $gte: ["$$d", start] }] : []),
                                            ...(endDate ? [{ $lte: ["$$d", end] }] : [])
                                        ]
                                    } : true
                                }
                            }
                        }
                    }
                }
            }
        ]);

        // 2. Get Sales Activity (Unique Salons with valid orders)
        let orderMatch = {
            repName: { $nin: [null, "", "Unassigned", "1st", "1ST", "1st "] },
            status: { $in: ["Paid", "COD", "Shipped", "Completed"] }
        };
        if (startDate || endDate) {
            orderMatch.createdAt = {};
            if (startDate) orderMatch.createdAt.$gte = start;
            if (endDate) orderMatch.createdAt.$lte = end;
        }

        const salesStats = await Order.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: { repName: "$repName", salonId: "$salonId" }
                }
            },
            {
                $group: {
                    _id: "$_id.repName",
                    salesActive: { $sum: 1 }
                }
            }
        ]);

        // 3. Merge stats
        const mergedStats = salonStats.map(s => {
            const sales = salesStats.find(ss => ss._id === s._id);
            return {
                repName: s._id || "Unassigned",
                visited: s.visited || 0,
                active: s.active || 0,
                revisited: s.revisited || 0,
                posm: s.posm || 0,
                salesActive: sales ? sales.salesActive : 0
            };
        });

        // Add any reps that had sales but no salon activity in range
        salesStats.forEach(ss => {
            if (!mergedStats.find(m => m.repName === ss._id)) {
                mergedStats.push({
                    repName: ss._id || "Unassigned",
                    visited: 0,
                    active: 0,
                    revisited: 0,
                    posm: 0,
                    salesActive: ss.salesActive
                });
            }
        });

        mergedStats.sort((a, b) => a.repName.localeCompare(b.repName));

        console.log(`[BACKEND] Rep-activity returning ${mergedStats.length} records.`);
        res.json({ success: true, stats: mergedStats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get QR Orders Summary Rep-wise and Month-wise with Product counts
router.get('/rep-order-summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchStage = {
            status: { $in: ["Paid", "COD", "Shipped", "Completed"] },
            repName: { $nin: [null, "", "Unassigned", "1st", "1ST", "1st "] }
        };
        
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                        repName: "$repName",
                        productName: "$items.productName"
                    },
                    totalQuantity: { $sum: "$items.quantity" },
                    orderCount: { $addToSet: "$_id" },
                    monthName: { $first: { $dateToString: { format: "%b %Y", date: "$createdAt" } } }
                }
            },
            {
                $group: {
                    _id: {
                        month: "$_id.month",
                        repName: "$_id.repName"
                    },
                    monthName: { $first: "$monthName" },
                    products: {
                        $push: {
                            name: "$_id.productName",
                            quantity: "$totalQuantity"
                        }
                    },
                    totalItems: { $sum: "$totalQuantity" },
                    uniqueOrders: { $sum: { $size: "$orderCount" } }
                }
            },
            {
                $sort: { "_id.month": -1, "_id.repName": 1 }
            }
        ]);

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
