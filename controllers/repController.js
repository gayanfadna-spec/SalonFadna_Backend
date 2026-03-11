const Rep = require('../models/Rep');

exports.getReps = async (req, res) => {
    try {
        const reps = await Rep.find();
        res.status(200).json({ success: true, count: reps.length, data: reps });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

exports.createRep = async (req, res) => {
    try {
        const rep = await Rep.create(req.body);
        res.status(201).json({ success: true, data: rep });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'Rep name already exists' });
        }
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

exports.deleteRep = async (req, res) => {
    try {
        const rep = await Rep.findByIdAndDelete(req.params.id);
        if (!rep) {
            return res.status(404).json({ success: false, error: 'Rep not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
