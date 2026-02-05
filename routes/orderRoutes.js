const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Salon = require('../models/Salon');
const { appendOrderToSheet } = require('../services/googleSheetsService');
const { sendOrderNotification } = require('../services/whatsappService');

const crypto = require('crypto');

// Create a new Order (Pending Payment)
router.post('/', async (req, res) => {
    try {

        const { salonId, customerName, customerPhone, additionalPhone, address, city, items, totalAmount, paymentMethod } = req.body;

        const salon = await Salon.findById(salonId);
        if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

        const selectedPaymentMethod = paymentMethod || 'Online';
        const initialStatus = selectedPaymentMethod === 'Cash on Delivery' ? 'Processing' : 'Pending Payment';

        const newOrder = new Order({
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
            paymentMethod: selectedPaymentMethod
        });

        await newOrder.save();

        if (selectedPaymentMethod === 'Cash on Delivery') {
            // Processing for COD: Notify and Add to Sheet immediately
            try {
                appendOrderToSheet(newOrder); // Fire and forget or await? Original code awaits in notify. Safe to await.
                if (salon.contactNumber) {
                    await sendOrderNotification(salon.contactNumber, newOrder);
                }
            } catch (notifyError) {
                console.error("Notification Error for COD:", notifyError);
                // Continue, don't fail the order response
            }

            return res.status(201).json({
                success: true,
                orderId: newOrder._id,
                message: 'Order placed successfully via Cash on Delivery'
            });
        }

        // Generate PayHere Hash (Only for Online Payment)
        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const orderId = newOrder._id.toString();
        const amount = totalAmount.toFixed(2);
        const currency = 'LKR';

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const amountFormated = amount; // PayHere expects simple format, but documentation says standard decimal.

        // Hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
        const hashStr = merchantId + orderId + amountFormated + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase();

        res.status(201).json({
            success: true,
            orderId: newOrder._id,
            payhere: {
                merchant_id: merchantId,
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                notify_url: `${req.protocol}://${req.get('host')}/api/orders/notify`, // Or public URL in prod
                order_id: orderId,
                items: 'Salon Order',
                currency: currency,
                amount: amount,
                first_name: customerName,
                last_name: '',
                email: 'customer@example.com', // Optional
                phone: customerPhone,
                address: address,
                city: city,
                country: 'Sri Lanka',
                hash: hash
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
            const order = await Order.findById(order_id);
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

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
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
