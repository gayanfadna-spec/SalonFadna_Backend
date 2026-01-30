const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    discountType: {
        type: String, // 'percentage' | 'amount' | 'none'
        enum: ['percentage', 'amount', 'none'],
        default: 'none'
    },
    discountValue: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Virtual to calculate final price
productSchema.virtual('finalPrice').get(function () {
    if (this.discountType === 'percentage') {
        return this.price - (this.price * (this.discountValue / 100));
    } else if (this.discountType === 'amount') {
        return Math.max(0, this.price - this.discountValue);
    }
    return this.price;
});

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
