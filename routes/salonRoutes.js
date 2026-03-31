const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Salon = require('../models/Salon');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

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
        const { name, location, contactNumber1, contactNumber2, remark, accountDetails, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;
        // Generate a simple unique ID (could be more robust)
        const uniqueId = new mongoose.Types.ObjectId().toString(); // Use Mongo ID or custom

        // Use custom username if provided, else generate
        let username = req.body.username;
        if (!username) {
            const baseName = name.replace(/\s+/g, '').toLowerCase();
            const randomSuffix = crypto.randomBytes(2).toString('hex');
            username = `${baseName}_${randomSuffix}`;
        }

        // Use custom password if provided, else generate
        let plainPassword = req.body.password;
        if (!plainPassword) {
            plainPassword = crypto.randomBytes(4).toString('hex');
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);

        // Generate Short Unique Salon Code (e.g., 6 chars alphanumeric), skip if draft
        let salonCode = undefined;
        if (!req.body.isDraft) {
            const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
            const randomNums = Math.floor(100 + Math.random() * 900);
            salonCode = `${randomChars}${randomNums}`;
        }

        const newSalon = new Salon({
            name,
            location,
            contactNumber1,
            contactNumber2,
            remark,
            repName,
            accountDetails,
            isVisited: isVisited || false,
            visitedDate: visitedDate || null,
            revisitedDates: revisitedDates || [],
            isActive: isActive || false,
            posmActive: posmActive || false,
            uniqueId: uniqueId,
            username,
            password: passwordHash,
            plainPassword: plainPassword, // Save for admin visibility
            salonCode: salonCode
        });

        // Use _id as the unique identifier for simplicity in QR
        newSalon.uniqueId = newSalon._id.toString();

        await newSalon.save();

        let qrUrl = null;
        let qrCodeImage = null;

        if (!req.body.isDraft) {
            // Generate QR Code Data URL
            const baseUrl = process.env.FRONTEND_URL || 'https://www.portal.fadnals.lk';
            qrUrl = `${baseUrl}/order/${newSalon.uniqueId}`;
            qrCodeImage = await QRCode.toDataURL(qrUrl);
        }

        res.status(201).json({
            success: true,
            salon: newSalon,
            qrCode: qrCodeImage,
            qrUrl: qrUrl,
            credentials: req.body.isDraft ? null : {
                username,
                password: plainPassword
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk Create Salons
router.post('/bulk', async (req, res) => {
    try {
        const { count } = req.body;
        const numSalons = parseInt(count, 10);

        if (isNaN(numSalons) || numSalons <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid count provided' });
        }

        const createdSalons = [];
        const baseUrl = process.env.FRONTEND_URL || 'https://www.portal.fadnals.lk';

        for (let i = 0; i < numSalons; i++) {
            // Generate Short Unique Salon Code
            const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
            const randomNums = Math.floor(100 + Math.random() * 900);
            const salonCode = `${randomChars}${randomNums}`;

            // Name based on code
            const name = `Salon ${salonCode}`;

            // Unique ID
            const uniqueId = new mongoose.Types.ObjectId().toString();

            // Username
            const baseName = name.replace(/\s+/g, '').toLowerCase();
            const randomSuffix = crypto.randomBytes(2).toString('hex');
            const username = `${baseName}_${randomSuffix}`;

            // Password
            const plainPassword = crypto.randomBytes(4).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(plainPassword, salt);

            const newSalon = new Salon({
                name,
                location: 'Not Specified', // Default location
                contactNumber1: '',
                contactNumber2: '',
                remark: '',
                repName: '',
                accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' },
                uniqueId: uniqueId,
                username,
                password: passwordHash,
                plainPassword: plainPassword,
                salonCode: salonCode
            });

            // Use _id as uniqueId logic same as single create
            newSalon.uniqueId = newSalon._id.toString();

            await newSalon.save();

            // Generate QR (optional to return here, but likely client wants to valid creation first)
            // returning minimal info for list
            createdSalons.push(newSalon);
        }

        res.status(201).json({
            success: true,
            message: `${numSalons} salons created successfully`,
            salons: createdSalons
        });

    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk Upload Excel or CSV for Salons
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an excel or csv file' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const createdSalons = [];

        for (const row of data) {
            try {
                const name = row['Name'] || row['name'] || row['Salon Name'];
                if (!name) continue; // Skip rows without name

                const location = row['Location'] || row['location'] || 'Not Specified';
                const contactNumber1 = String(row['Phone 1'] || row['Contact Number 1'] || row['contactNumber1'] || row['Phone'] || '');
                const contactNumber2 = String(row['Phone 2'] || row['Contact Number 2'] || row['contactNumber2'] || '');
                const repName = req.body.repName || row['Rep Name'] || row['repName'] || '';
                const remark = row['Remark'] || row['remark'] || '';

                const uniqueId = new mongoose.Types.ObjectId().toString();
                
                // Use custom username if provided in Excel, else generate
                let username = row['Username'] || row['username'];
                if (!username) {
                    const baseName = name.replace(/\s+/g, '').toLowerCase() || 'salon';
                    const randomSuffix = crypto.randomBytes(2).toString('hex');
                    username = `${baseName}_${randomSuffix}`;
                }

                // Use custom password if provided in Excel, else generate
                let plainPassword = row['Password'] || row['password'];
                if (!plainPassword) {
                    plainPassword = crypto.randomBytes(4).toString('hex');
                }

                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(plainPassword, salt);

                const newSalon = new Salon({
                    name,
                    location,
                    contactNumber1,
                    contactNumber2,
                    remark,
                    repName,
                    accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' },
                    uniqueId: uniqueId,
                    username,
                    password: passwordHash,
                    plainPassword,
                    isVisited: true,
                    visitedDate: new Date()
                });

                newSalon.uniqueId = newSalon._id.toString();
                await newSalon.save();
                createdSalons.push(newSalon);
            } catch (err) {
                console.error('Error creating salon from row:', row, err);
            }
        }

        res.status(200).json({ success: true, message: `${createdSalons.length} salons registered successfully.` });

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to process file' });
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

// Generate a COD QR Code for an existing salon
router.get('/:id/qr-cod', async (req, res) => {
    try {
        let salon;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            salon = await Salon.findById(req.params.id);
        }
        if (!salon) {
            salon = await Salon.findOne({ uniqueId: req.params.id });
        }

        if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

        const baseUrl = process.env.FRONTEND_URL || 'https://www.portal.fadnals.lk';
        const codUrl = `${baseUrl}/order-cod/${salon._id}`;
        const qrCodeImage = await QRCode.toDataURL(codUrl);

        res.json({
            success: true,
            salon: { _id: salon._id, name: salon.name },
            codQrCode: qrCodeImage,
            codUrl: codUrl
        });
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

// Assign details to an existing salon by Salon Code
router.put('/assign', async (req, res) => {
    try {
        const { assignToCode, name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;

        if (!assignToCode) {
            return res.status(400).json({ success: false, message: 'Salon code is required for assignment' });
        }

        const updatedSalon = await Salon.findOneAndUpdate(
            { salonCode: assignToCode },
            { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName },
            { new: true }
        );

        if (!updatedSalon) {
            return res.status(404).json({ success: false, message: 'No pre-registered salon found with this code' });
        }

        res.json({ success: true, salon: updatedSalon });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Merge Draft Details to an existing pre-registered salon
router.put('/:id/merge', async (req, res) => {
    try {
        const { assignToCode, name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;
        const draftSalonId = req.params.id;

        if (!assignToCode) return res.status(400).json({ success: false, message: 'Assign code required for merging' });

        // Find the bulk salon
        const bulkSalon = await Salon.findOne({ salonCode: assignToCode });
        if (!bulkSalon) return res.status(404).json({ success: false, message: 'Pre-registered salon not found' });

        // Find the draft salon
        const draftSalon = await Salon.findById(draftSalonId);
        if (!draftSalon) return res.status(404).json({ success: false, message: 'Draft salon not found' });

        // Update bulk salon with new details
        bulkSalon.name = name;
        bulkSalon.location = location;
        bulkSalon.contactNumber1 = contactNumber1;
        bulkSalon.contactNumber2 = contactNumber2;
        bulkSalon.remark = remark;
        bulkSalon.repName = repName;
        bulkSalon.accountDetails = accountDetails;
        bulkSalon.editedBy = editedBy;
        bulkSalon.isVisited = isVisited;
        bulkSalon.visitedDate = visitedDate;
        bulkSalon.revisitedDates = revisitedDates;
        bulkSalon.isActive = isActive;
        bulkSalon.posmActive = posmActive;

        await bulkSalon.save();

        // Delete the draft salon to clean up
        await Salon.findByIdAndDelete(draftSalonId);

        res.json({ success: true, salon: bulkSalon });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle Salon Mark Status
router.put('/:id/toggle-mark', async (req, res) => {
    try {
        const { oneSalonMark } = req.body;
        let query = {};
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query = { _id: req.params.id };
        } else {
            query = { uniqueId: req.params.id };
        }

        const updatedSalon = await Salon.findOneAndUpdate(
            query,
            { oneSalonMark },
            { new: true }
        );
        if (!updatedSalon) return res.status(404).json({ success: false, message: 'Salon not found' });
        res.json({ success: true, salon: updatedSalon });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Salon
router.put('/:id', async (req, res) => {
    try {
        const { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;
        let query = {};
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query = { _id: req.params.id };
        } else {
            query = { uniqueId: req.params.id };
        }

        const updateData = { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName };

        // Handle custom username and password update
        if (req.body.username) {
            updateData.username = req.body.username;
        }
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(req.body.password, salt);
            updateData.plainPassword = req.body.password;
        }

        const updatedSalon = await Salon.findOneAndUpdate(
            query,
            updateData,
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
