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
                            $cond: [{ $in: ["$status", ["Cancelled", "Returned", "Pending Payment", "Payment Failed"]] }, 0, 1]
                        }
                    },
                    // Only sum revenue if status is VALID (Paid, Processing, Shipped, Completed)
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Cancelled", "Returned", "Pending Payment", "Payment Failed"]] }, 0, "$totalAmount"]
                        }
                    },
                    // Only sum items if status is VALID
                    totalItemsSold: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Cancelled", "Returned", "Pending Payment", "Payment Failed"]] }, 0, { $sum: "$items.quantity" }]
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
                    status: { $nin: ['Cancelled', 'Returned', 'Pending Payment', 'Payment Failed'] } // Exclude completely from item stat
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
