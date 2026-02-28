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
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Salon', salonSchema);
