const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Find agent by username (check both Agent and NetAgent collections)
        let agent = await Agent.findOne({ username });
        let isNetAgent = false;

        if (!agent) {
            const NetAgent = require('../models/NetAgent');
            agent = await NetAgent.findOne({ username });
            if (agent) isNetAgent = true;
        }

        if (!agent) {
            return res.status(400).json({ success: false, message: 'Invalid Username' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, agent.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Password' });
        }

        // 3. Return success with agent details
        res.status(200).json({
            success: true,
            message: 'Login Successful',
            agent: {
                _id: agent._id,
                name: agent.name,
                location: agent.location,
                isNetAgent: isNetAgent
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

const crypto = require('crypto');

// Create a new Agent and return QR Code
router.post('/', async (req, res) => {
    try {
        const { name, location, contactNumber1, contactNumber2, remark, accountDetails, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;
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

        // Generate Short Unique Agent Code (e.g., 6 chars alphanumeric), skip if draft
        let agentCode = undefined;
        if (!req.body.isDraft) {
            const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
            const randomNums = Math.floor(100 + Math.random() * 900);
            agentCode = `${randomChars}${randomNums}`;
        }

        const newAgent = new Agent({
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
            agentCode: agentCode
        });

        // Use _id as the unique identifier for simplicity in QR
        newAgent.uniqueId = newAgent._id.toString();

        await newAgent.save();

        let qrUrl = null;
        let qrCodeImage = null;

        if (!req.body.isDraft) {
            // Generate QR Code Data URL
            const baseUrl = process.env.FRONTEND_URL || 'https://www.portal.fadnals.lk';
            qrUrl = `${baseUrl}/agent-order/${newAgent.uniqueId}`;
            qrCodeImage = await QRCode.toDataURL(qrUrl);
        }

        res.status(201).json({
            success: true,
            agent: newAgent,
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

// Bulk Create Agents
router.post('/bulk', async (req, res) => {
    try {
        const { count } = req.body;
        const numAgents = parseInt(count, 10);

        if (isNaN(numAgents) || numAgents <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid count provided' });
        }

        const createdAgents = [];
        const baseUrl = process.env.FRONTEND_URL || 'https://www.portal.fadnals.lk';

        for (let i = 0; i < numAgents; i++) {
            // Generate Short Unique Agent Code
            const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
            const randomNums = Math.floor(100 + Math.random() * 900);
            const agentCode = `${randomChars}${randomNums}`;

            // Name based on code
            const name = `Agent ${agentCode}`;

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

            const newAgent = new Agent({
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
                agentCode: agentCode
            });

            // Use _id as uniqueId logic same as single create
            newAgent.uniqueId = newAgent._id.toString();

            await newAgent.save();

            // Generate QR (optional to return here, but likely client wants to valid creation first)
            // returning minimal info for list
            createdAgents.push(newAgent);
        }

        res.status(201).json({
            success: true,
            message: `${numAgents} agents created successfully`,
            agents: createdAgents
        });

    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk Upload Excel or CSV for Agents
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an excel or csv file' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const createdAgents = [];

        for (const row of data) {
            try {
                const name = row['Name'] || row['name'] || row['Agent Name'];
                if (!name) continue; // Skip rows without name

                const location = row['Location'] || row['location'] || 'Not Specified';
                const contactNumber1 = String(row['Phone 1'] || row['Contact Number 1'] || row['contactNumber1'] || row['Phone'] || '');
                const contactNumber2 = String(row['Phone 2'] || row['Contact Number 2'] || row['contactNumber2'] || '');
                const repName = req.body.repName || row['Rep Name'] || row['repName'] || '';
                const remark = row['Remark'] || row['remark'] || '';

                const uniqueId = new mongoose.Types.ObjectId().toString();
                const baseName = name.replace(/\s+/g, '').toLowerCase() || 'agent';
                const randomSuffix = crypto.randomBytes(2).toString('hex');
                const username = `${baseName}_${randomSuffix}`;

                const plainPassword = crypto.randomBytes(4).toString('hex');
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(plainPassword, salt);

                const newAgent = new Agent({
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

                newAgent.uniqueId = newAgent._id.toString();
                await newAgent.save();
                createdAgents.push(newAgent);
            } catch (err) {
                console.error('Error creating agent from row:', row, err);
            }
        }

        res.status(200).json({ success: true, message: `${createdAgents.length} agents registered successfully.` });

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to process file' });
    }
});

// Get all agents
router.get('/', async (req, res) => {
    try {
        const agents = await Agent.find().sort({ createdAt: -1 });
        res.json({ success: true, agents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
    try {
        let agent;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            agent = await Agent.findById(req.params.id);
        }

        if (!agent) {
            agent = await Agent.findOne({ uniqueId: req.params.id });
        }

        if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.json({ success: true, agent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign details to an existing agent by Agent Code
router.put('/assign', async (req, res) => {
    try {
        const { assignToCode, name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;

        if (!assignToCode) {
            return res.status(400).json({ success: false, message: 'Agent code is required for assignment' });
        }

        const updatedAgent = await Agent.findOneAndUpdate(
            { agentCode: assignToCode },
            { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName },
            { new: true }
        );

        if (!updatedAgent) {
            return res.status(404).json({ success: false, message: 'No pre-registered agent found with this code' });
        }

        res.json({ success: true, agent: updatedAgent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Merge Draft Details to an existing pre-registered agent
router.put('/:id/merge', async (req, res) => {
    try {
        const { assignToCode, name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;
        const draftAgentId = req.params.id;

        if (!assignToCode) return res.status(400).json({ success: false, message: 'Assign code required for merging' });

        // Find the bulk agent
        const bulkAgent = await Agent.findOne({ agentCode: assignToCode });
        if (!bulkAgent) return res.status(404).json({ success: false, message: 'Pre-registered agent not found' });

        // Find the draft agent
        const draftAgent = await Agent.findById(draftAgentId);
        if (!draftAgent) return res.status(404).json({ success: false, message: 'Draft agent not found' });

        // Update bulk agent with new details
        bulkAgent.name = name;
        bulkAgent.location = location;
        bulkAgent.contactNumber1 = contactNumber1;
        bulkAgent.contactNumber2 = contactNumber2;
        bulkAgent.remark = remark;
        bulkAgent.repName = repName;
        bulkAgent.accountDetails = accountDetails;
        bulkAgent.editedBy = editedBy;
        bulkAgent.isVisited = isVisited;
        bulkAgent.visitedDate = visitedDate;
        bulkAgent.revisitedDates = revisitedDates;
        bulkAgent.isActive = isActive;
        bulkAgent.posmActive = posmActive;

        await bulkAgent.save();

        // Delete the draft agent to clean up
        await Agent.findByIdAndDelete(draftAgentId);

        res.json({ success: true, agent: bulkAgent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Agent
router.put('/:id', async (req, res) => {
    try {
        const { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;
        let query = {};
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query = { _id: req.params.id };
        } else {
            query = { uniqueId: req.params.id };
        }

        const updatedAgent = await Agent.findOneAndUpdate(
            query,
            { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName },
            { new: true }
        );
        if (!updatedAgent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.json({ success: true, agent: updatedAgent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Agent
router.delete('/:id', async (req, res) => {
    try {
        const deletedAgent = await Agent.findByIdAndDelete(req.params.id);
        if (!deletedAgent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
