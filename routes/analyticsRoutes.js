const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Get Salon Performance (Orders, Revenue, Items)
router.get('/salon-performance', async (req, res) => {
    try {
        const { salonId } = req.query;
        let matchStage = {};
        if (salonId) {
            matchStage.salonId = salonId;
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
                            $cond: [{ $in: ["$status", ["Paid", "Processing", "Shipped", "Completed"]] }, "$totalAmount", 0]
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
        const { salonId } = req.query;
        let matchStage = {};
        if (salonId) {
            matchStage.salonId = salonId;
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
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
