const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, {
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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, { $sum: "$items.quantity" }, 0]
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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, {
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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, {
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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, { $sum: "$items.quantity" }, 0]
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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, {
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

module.exports = router;
