const express = require('express');
const router = express.Router();
const ReportHistory = require('../models/ReportHistory');

// Save a new report log
router.post('/history', async (req, res) => {
    try {
        const { reportType, downloadedBy, recordCount, dateRange } = req.body;
        const log = new ReportHistory({ reportType, downloadedBy, recordCount, dateRange });
        await log.save();
        res.status(201).json({ success: true, log });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get report history
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const history = await ReportHistory.find().sort({ createdAt: -1 }).limit(limit);
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
