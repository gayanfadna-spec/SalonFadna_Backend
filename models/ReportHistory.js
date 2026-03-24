const mongoose = require('mongoose');

const reportHistorySchema = new mongoose.Schema({
    reportType: { type: String, required: true },
    downloadedBy: { type: String, default: 'Admin' },
    recordCount: { type: Number, required: true },
    dateRange: { type: String, default: 'All Time' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReportHistory', reportHistorySchema);
