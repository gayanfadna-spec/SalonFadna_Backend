const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: String,
    contactNumber: String,
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
    password: {
        type: String,
        required: true
    },
    plainPassword: {
        type: String, // Storing plain text as requested for Admin visibility
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Salon', salonSchema);
