const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Salon = require('../models/Salon');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Find salon by username
        const salon = await Salon.findOne({ username });
        if (!salon) {
            return res.status(400).json({ success: false, message: 'Invalid Username' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, salon.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Password' });
        }

        // 3. Return success with salon details
        res.status(200).json({
            success: true,
            message: 'Login Successful',
            salon: {
                _id: salon._id,
                name: salon.name,
                location: salon.location
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

const crypto = require('crypto');

// Create a new Salon and return QR Code
router.post('/', async (req, res) => {
    try {
        const { name, location, contactNumber } = req.body;
        // Generate a simple unique ID (could be more robust)
        const uniqueId = new mongoose.Types.ObjectId().toString(); // Use Mongo ID or custom

        // Generate Username: remove spaces, lowercase, add random 4 chars
        const baseName = name.replace(/\s+/g, '').toLowerCase();
        const randomSuffix = crypto.randomBytes(2).toString('hex');
        const username = `${baseName}_${randomSuffix}`;

        // Generate Password: random 8 chars
        const plainPassword = crypto.randomBytes(4).toString('hex');

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);

        // Generate Short Unique Salon Code (e.g., 6 chars alphanumeric)
        // Simple implementation: Random 3 char prefix + Random 3 numeric
        const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
        const randomNums = Math.floor(100 + Math.random() * 900);
        const salonCode = `${randomChars}${randomNums}`;

        const newSalon = new Salon({
            name,
            location,
            contactNumber,
            uniqueId: uniqueId,
            username,
            password: passwordHash,
            plainPassword: plainPassword, // Save for admin visibility
            salonCode: salonCode
        });

        // Use _id as the unique identifier for simplicity in QR
        newSalon.uniqueId = newSalon._id.toString();

        await newSalon.save();

        // Generate QR Code Data URL
        // The URL will point to the frontend order page
        // Assuming frontend runs on port 5173 for local dev
        // Update BASE_URL in .env for production
        const baseUrl = process.env.FRONTEND_URL || 'https://fadna-salon.onrender.com';
        const qrUrl = `${baseUrl}/order/${newSalon.uniqueId}`;

        const qrCodeImage = await QRCode.toDataURL(qrUrl);

        res.status(201).json({
            success: true,
            salon: newSalon,
            qrCode: qrCodeImage,
            qrUrl: qrUrl,
            credentials: {
                username,
                password: plainPassword
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all salons
router.get('/', async (req, res) => {
    try {
        const salons = await Salon.find().sort({ createdAt: -1 });
        res.json({ success: true, salons });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get salon by ID
router.get('/:id', async (req, res) => {
    try {
        let salon;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            salon = await Salon.findById(req.params.id);
        }

        if (!salon) {
            salon = await Salon.findOne({ uniqueId: req.params.id });
        }

        if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
        res.json({ success: true, salon });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Salon
router.put('/:id', async (req, res) => {
    try {
        const { name, location, contactNumber } = req.body;
        const updatedSalon = await Salon.findByIdAndUpdate(
            req.params.id,
            { name, location, contactNumber },
            { new: true }
        );
        if (!updatedSalon) return res.status(404).json({ success: false, message: 'Salon not found' });
        res.json({ success: true, salon: updatedSalon });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Salon
router.delete('/:id', async (req, res) => {
    try {
        const deletedSalon = await Salon.findByIdAndDelete(req.params.id);
        if (!deletedSalon) return res.status(404).json({ success: false, message: 'Salon not found' });
        res.json({ success: true, message: 'Salon deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
