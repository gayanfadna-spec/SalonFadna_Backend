const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    salonId: {
        type: String,
        required: true,
    },
    merchantOrderId: {
        type: String,
        unique: true,
        sparse: true // Allow null/undefined for old orders
    },
    salonName: String,
    customerName: {
        type: String,
        required: true,
    },
    customerPhone: {
        type: String,
        required: true,
    },
    additionalPhone: {
        type: String, // Optional
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    items: [
        {
            productId: String,
            productName: String,
            quantity: Number,
            price: Number,
        }
    ],
    totalAmount: Number,
    status: {
        type: String,
        enum: ['Pending Payment', 'Paid', 'Processing', 'Shipped', 'Completed', 'Cancelled', 'Returned', 'Payment Failed', 'Draft'],
        default: 'Pending Payment'
    },
    paymentMethod: {
        type: String,
        enum: ['Online', 'Cash on Delivery'],
        default: 'Online'
    },
    statusDate: {
        type: Date,
        default: Date.now
    },
    returnedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Order', orderSchema);
