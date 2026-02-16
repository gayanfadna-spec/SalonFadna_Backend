const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Salon = require('../models/Salon');
const Counter = require('../models/Counter');
const { appendOrderToSheet } = require('../services/googleSheetsService');
const { sendOrderNotification } = require('../services/whatsappService');

const crypto = require('crypto');
const mongoose = require('mongoose');

// Create a Draft Order (Step 1)
router.post('/draft', async (req, res) => {
    try {
        const { salonId, customerName, customerPhone, additionalPhone, address, city } = req.body;

        const salon = await Salon.findById(salonId);
        if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

        // Generate Merchant Order ID
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const merchantOrderId = counter.seq.toString();

        const newOrder = new Order({
            salonId,
            salonName: salon.name,
            customerName,
            customerPhone,
            additionalPhone,
            address,
            city,
            status: 'Draft',
            merchantOrderId: merchantOrderId,
            items: [], // Empty initially
            totalAmount: 0 // Zero initially
        });

        await newOrder.save();

        res.status(201).json({
            success: true,
            orderId: newOrder._id,
            merchantOrderId: merchantOrderId
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Finalize Order (Step 3) - Update Draft or Create New
router.post('/finalize', async (req, res) => {
    try {
        const { orderId, salonId, customerName, customerPhone, additionalPhone, address, city, items, totalAmount, paymentMethod } = req.body;

        let order;
        let merchantOrderId;

        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
            // Update existing Draft
            order = await Order.findById(orderId);
            if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

            // Generate ID if missing (shouldn't happen for drafts created via API, but good safety)
            if (!order.merchantOrderId) {
                const counter = await Counter.findByIdAndUpdate(
                    { _id: 'orderId' },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                order.merchantOrderId = counter.seq.toString();
            }
            merchantOrderId = order.merchantOrderId;

            // Update fields
            order.items = items;
            order.totalAmount = totalAmount;
            order.paymentMethod = paymentMethod || 'Online';
            order.status = 'Pending Payment';
            // Update customer details just in case they changed in Step 1 after draft creation
            order.customerName = customerName;
            order.customerPhone = customerPhone;
            order.additionalPhone = additionalPhone;
            order.address = address;
            order.city = city;

            await order.save();

        } else {
            // Fallback: Create New (Legacy flow or if no draft)
            const salon = await Salon.findById(salonId);
            if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

            const counter = await Counter.findByIdAndUpdate(
                { _id: 'orderId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            merchantOrderId = counter.seq.toString();

            order = new Order({
                salonId,
                salonName: salon.name,
                customerName,
                customerPhone,
                additionalPhone,
                address,
                city,
                items,
                totalAmount,
                status: 'Pending Payment',
                paymentMethod: paymentMethod || 'Online',
                merchantOrderId: merchantOrderId
            });
            await order.save();
        }

        // Generate PayHere Hash (Only for Online Payment/Default)
        // ... (Reuse existing logic)
        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const payhereOrderId = merchantOrderId;
        const amount = totalAmount.toFixed(2);
        const currency = 'LKR';

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const amountFormated = amount;
        const hashStr = merchantId + payhereOrderId + amountFormated + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase();

        // Split Name
        const names = customerName.trim().split(' ');
        const firstName = names[0];
        const lastName = names.length > 1 ? names.slice(1).join(' ') : '.';

        res.status(201).json({
            success: true,
            orderId: order._id, // Return Mongo ID for internal use
            payhere: {
                merchant_id: merchantId,
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                notify_url: `${req.protocol}://${req.get('host')}/api/orders/notify`,
                order_id: payhereOrderId,
                items: 'Salon Order',
                currency: currency,
                amount: amount,
                first_name: firstName,
                last_name: lastName,
                email: 'customer@example.com',
                phone: customerPhone,
                address: address,
                city: city,
                country: 'Sri Lanka',
                delivery_address: address,
                delivery_city: city,
                delivery_country: 'Sri Lanka',
                delivery_country: 'Sri Lanka',
                hash: hash,
                sandbox: process.env.PAYHERE_Mode === 'sandbox' ? true : false
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Original POST / left for backward compatibility, but effectively replaced by /finalize logic above if we route client there. 
// OR we can make POST / delegate to the logic. 
// Let's Keep POST / as is for now, but client will prefer using /draft then /finalize.
// Actually, to avoid code duplication, let's just REPLACE the logic in POST / with the "Finalize" logic
// that checks for an optional orderId.
// Create a new Order (Pending Payment) - OR Update if ID provided
router.post('/', async (req, res) => {
    // Forward to finalize logic relative to this file? 
    // No, let's just use the code we wrote above.
    // I will replace the existing POST / content with the "Finalize" logic.
    try {
        const { orderId, salonId, customerName, customerPhone, additionalPhone, address, city, items, totalAmount, paymentMethod } = req.body;

        let order;
        let merchantOrderId;

        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
            // Update existing Draft
            order = await Order.findById(orderId);
            if (!order) {
                // proceed to create new if not found
            } else {
                if (!order.merchantOrderId) {
                    const counter = await Counter.findByIdAndUpdate(
                        { _id: 'orderId' },
                        { $inc: { seq: 1 } },
                        { new: true, upsert: true }
                    );
                    order.merchantOrderId = counter.seq.toString();
                }
                merchantOrderId = order.merchantOrderId;

                order.items = items;
                order.totalAmount = totalAmount;
                order.paymentMethod = paymentMethod || 'Online';
                order.status = 'Pending Payment';
                order.customerName = customerName;
                order.customerPhone = customerPhone;
                order.additionalPhone = additionalPhone;
                order.address = address;
                order.city = city;
                order.createdAt = Date.now(); // Update Date? Maybe keep original.

                await order.save();
            }
        }

        if (!order) {
            const salon = await Salon.findById(salonId);
            if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

            const selectedPaymentMethod = 'Online';
            const initialStatus = 'Pending Payment';

            // Generate Merchant Order ID
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'orderId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            merchantOrderId = counter.seq.toString();

            order = new Order({
                salonId,
                salonName: salon.name,
                customerName,
                customerPhone,
                additionalPhone,
                address,
                city,
                items,
                totalAmount,
                status: initialStatus,
                paymentMethod: selectedPaymentMethod,
                merchantOrderId: merchantOrderId
            });

            await order.save();
        }

        // Generate PayHere Hash (Only for Online Payment)
        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const orderIdForPayHere = merchantOrderId;
        const amount = totalAmount.toFixed(2);
        const currency = 'LKR';

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const amountFormated = amount;

        // Hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
        const hashStr = merchantId + orderIdForPayHere + amountFormated + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase();

        // Split Name for PayHere
        const names = customerName.trim().split(' ');
        const firstName = names[0];
        const lastName = names.length > 1 ? names.slice(1).join(' ') : '.';


        res.status(201).json({
            success: true,
            orderId: order._id,
            payhere: {
                merchant_id: merchantId,
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                notify_url: `${req.protocol}://${req.get('host')}/api/orders/notify`,
                order_id: orderIdForPayHere,
                items: 'Salon Order',
                currency: currency,
                amount: amount,
                first_name: firstName,
                last_name: lastName,
                email: 'customer@example.com', // Placeholder if not collected
                phone: customerPhone,
                address: address,
                city: city,
                country: 'Sri Lanka',
                delivery_address: address,
                delivery_city: city,
                delivery_country: 'Sri Lanka',
                delivery_country: 'Sri Lanka',
                hash: hash,
                sandbox: process.env.PAYHERE_Mode === 'sandbox' ? true : false
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PayHere Notify URL (Server to Server)
router.post('/notify', async (req, res) => {
    try {
        const {
            merchant_id,
            order_id,
            payment_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig
        } = req.body;

        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();

        // Verify Signature
        // local_md5sig = strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
        const signStr = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
        const localMd5sig = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

        if (localMd5sig === md5sig && status_code == 2) {
            // Payment Success
            // Try to find by merchantOrderId first
            let order = await Order.findOne({ merchantOrderId: order_id });
            if (!order) {
                // Fallback to _id if not found (for old orders potentially, though flow suggests new ones)
                // But PayHere sends back what we sent. If we sent merchantOrderId, we get that.
                // If it's an old order, we might have sent _id. So let's check both or determine based on format.
                // For now, let's assume if findOne(merchantOrderId) fails, we try findById just in case.
                if (mongoose.Types.ObjectId.isValid(order_id)) {
                    order = await Order.findById(order_id);
                }
            }

            if (order) {
                order.status = 'Paid';
                await order.save();

                // Add to Google Sheet only on success
                appendOrderToSheet(order);

                // Send WhatsApp Notification
                // Ensure salon has a contact number. We might need to fetch salon details if not fully in order.
                // Order model has salonName but maybe not phone. 
                // Let's fetch Salon to be sure or check if we stored it in Order (Order schema has salonId).
                const salon = await Salon.findById(order.salonId);
                if (salon && salon.contactNumber) {
                    await sendOrderNotification(salon.contactNumber, order);
                }

                console.log(`Order ${order_id} marked as Paid.`);
            }
        } else {
            console.log(`Payment verification failed or status checked: ${status_code}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Notify Error:', error);
        res.status(500).send('Error');
    }
});


// Update Order Status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        let updateData = {
            status,
            statusDate: new Date()
        };

        if (status === 'Returned') {
            updateData.returnedAt = new Date();
        } else if (status === 'Cancelled') {
            updateData.cancelledAt = new Date();
        }

        // Try to find by _id first, if not valid or not found, try merchantOrderId
        let order;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            order = await Order.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true }
            );
        }

        if (!order) {
            order = await Order.findOneAndUpdate(
                { merchantOrderId: req.params.id },
                updateData,
                { new: true }
            );
        }

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get customer details by phone (latest order)
router.get('/customer/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        // Find latest order by this phone number
        const order = await Order.findOne({ customerPhone: phone })
            .sort({ createdAt: -1 }) // Get the most recent one
            .select('customerName address city additionalPhone'); // returns specific fields

        if (!order) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, customer: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get orders (can filter by salonId)
router.get('/', async (req, res) => {
    try {
        const { salonId } = req.query;
        let query = {};
        if (salonId) {
            query.salonId = salonId;
        }
        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
