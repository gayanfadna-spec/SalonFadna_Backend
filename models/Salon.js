const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: String,
    contactNumber1: String,
    contactNumber2: String,
    remark: String,
    repName: String,
    accountDetails: {
        bankName: String,
        branch: String,
        accountNumber: String,
        accountName: String
    },
    uniqueId: {
        type: String, // This will be the ID encoded in the QR
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    salonCode: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    plainPassword: {
        type: String, // Storing plain text as requested for Admin visibility
    },
    editedBy: {
        type: String,
        default: null
    },
    isVisited: {
        type: Boolean,
        default: false
    },
    visitedDate: {
        type: Date,
        default: null
    },
    revisitedDates: [{
        type: Date
    }],
    isActive: {
        type: Boolean,
        default: false
    },
    posmActive: {
        type: Boolean,
        default: false
    },
    oneSalonMark: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
});

salonSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Salon', salonSchema);
