const mongoose = require('mongoose');

const RepSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a rep name'],
        unique: true
    },
    includeInReports: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Rep', RepSchema);
