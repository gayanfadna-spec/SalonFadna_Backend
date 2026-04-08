const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const NetAgent = require('../models/NetAgent');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto');
const upload = multer({ storage: multer.memoryStorage() });
const Order = require('../models/Order');

// Net Agent Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const agent = await NetAgent.findOne({ username });
        if (!agent) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        const isMatch = await bcrypt.compare(password, agent.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        res.json({ success: true, agent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new Net.Agent
router.post('/', async (req, res) => {
    try {
        const { name, location, contactNumber1, contactNumber2, remark, accountDetails,
            isVisited, visitedDate, revisitedDates, isActive, posmActive, repName,
            username: customUsername, password: customPassword } = req.body;

        const uniqueId = new mongoose.Types.ObjectId().toString();

        // Use custom username if provided, otherwise generate it
        let username = customUsername;
        if (!username) {
            const baseName = name.replace(/\s+/g, '').toLowerCase();
            const randomSuffix = crypto.randomBytes(2).toString('hex');
            username = `na_${baseName}_${randomSuffix}`;
        }

        // Use custom password if provided, otherwise generate it
        let plainPassword = customPassword;
        if (!plainPassword) {
            plainPassword = crypto.randomBytes(4).toString('hex');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);

        let agentCode = undefined;
        if (!req.body.isDraft) {
            const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
            const randomNums = Math.floor(100 + Math.random() * 900);
            agentCode = `NA${randomChars}${randomNums}`;
        }

        const newAgent = new NetAgent({
            name, location, contactNumber1, contactNumber2, remark, repName,
            accountDetails,
            isVisited: isVisited || false,
            visitedDate: visitedDate || null,
            revisitedDates: revisitedDates || [],
            isActive: isActive || false,
            posmActive: posmActive || false,
            uniqueId,
            username,
            password: passwordHash,
            plainPassword,
            agentCode,
            parentNetAgentId: req.body.parentNetAgentId || null,
            level: req.body.level || 1
        });

        newAgent.uniqueId = newAgent._id.toString();
        await newAgent.save();

        let qrUrl = null;
        let qrCodeImage = null;

        if (!req.body.isDraft) {
            const baseUrl = process.env.FRONTEND_URL || 'https://www.portal.fadnals.lk';
            qrUrl = `${baseUrl}/net-agent-order/${newAgent.uniqueId}`;
            qrCodeImage = await QRCode.toDataURL(qrUrl);
        }

        res.status(201).json({
            success: true,
            agent: newAgent,
            qrCode: qrCodeImage,
            qrUrl,
            credentials: req.body.isDraft ? null : { username, password: plainPassword }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk Create Net.Agents
router.post('/bulk', async (req, res) => {
    try {
        const { count } = req.body;
        const numAgents = parseInt(count, 10);
        if (isNaN(numAgents) || numAgents <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid count' });
        }

        const createdAgents = [];
        for (let i = 0; i < numAgents; i++) {
            const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 3);
            const randomNums = Math.floor(100 + Math.random() * 900);
            const agentCode = `NA${randomChars}${randomNums}`;
            const name = `NetAgent ${agentCode}`;
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const baseName = name.replace(/\s+/g, '').toLowerCase();
            const randomSuffix = crypto.randomBytes(2).toString('hex');
            const username = `na_${baseName}_${randomSuffix}`;
            const plainPassword = crypto.randomBytes(4).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(plainPassword, salt);

            const newAgent = new NetAgent({
                name,
                location: 'Not Specified',
                contactNumber1: '', contactNumber2: '', remark: '', repName: '',
                accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' },
                uniqueId, username, password: passwordHash, plainPassword, agentCode
            });
            newAgent.uniqueId = newAgent._id.toString();
            await newAgent.save();
            createdAgents.push(newAgent);
        }

        res.status(201).json({ success: true, message: `${numAgents} net agents created`, agents: createdAgents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk Upload Excel/CSV
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a file' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const createdAgents = [];

        for (const row of data) {
            try {
                const name = row['Name'] || row['name'] || row['Agent Name'];
                if (!name) continue;
                const location = row['Location'] || row['location'] || 'Not Specified';
                const contactNumber1 = String(row['Phone 1'] || row['contactNumber1'] || row['Phone'] || '');
                const contactNumber2 = String(row['Phone 2'] || row['contactNumber2'] || '');
                const repName = req.body.repName || row['Rep Name'] || '';
                const remark = row['Remark'] || '';

                const uniqueId = new mongoose.Types.ObjectId().toString();

                // Use custom username if provided in Excel, else generate
                let username = row['Username'] || row['username'];
                if (!username) {
                    const baseName = (name.replace(/\s+/g, '').toLowerCase()) || 'na';
                    username = `na_${baseName}_${crypto.randomBytes(2).toString('hex')}`;
                }

                // Use custom password if provided in Excel, else generate
                let plainPassword = row['Password'] || row['password'];
                if (!plainPassword) {
                    plainPassword = crypto.randomBytes(4).toString('hex');
                }

                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(plainPassword, salt);

                const newAgent = new NetAgent({
                    name, location, contactNumber1, contactNumber2, remark, repName,
                    accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' },
                    uniqueId, username, password: passwordHash, plainPassword,
                    isVisited: true, visitedDate: new Date()
                });
                newAgent.uniqueId = newAgent._id.toString();
                await newAgent.save();
                createdAgents.push(newAgent);
            } catch (err) {
                console.error('Row error:', err);
            }
        }

        res.status(200).json({ success: true, message: `${createdAgents.length} net agents registered.` });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to process file' });
    }
});

// Get all Net.Agents
router.get('/', async (req, res) => {
    try {
        const { parentNetAgentId, level } = req.query;
        let query = {};
        if (parentNetAgentId) query.parentNetAgentId = parentNetAgentId;
        if (level) query.level = level;

        const agents = await NetAgent.find(query).sort({ createdAt: -1 });
        res.json({ success: true, agents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get orders for a NetAgent1 (all their NetAgent2 orders)
router.get('/:id/child-orders', async (req, res) => {
    try {
        const orders = await Order.find({ netAgent1Id: req.params.id }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get orders for a NetAgent2
router.get('/:id/my-orders', async (req, res) => {
    try {
        const orders = await Order.find({ netAgent2Id: req.params.id }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Net.Agent by ID
router.get('/:id', async (req, res) => {
    try {
        let agent;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            agent = await NetAgent.findById(req.params.id);
        }
        if (!agent) agent = await NetAgent.findOne({ uniqueId: req.params.id });
        if (!agent) return res.status(404).json({ success: false, message: 'Net Agent not found' });
        res.json({ success: true, agent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign details to existing Net.Agent by code
router.put('/assign', async (req, res) => {
    try {
        const { assignToCode, name, location, contactNumber1, contactNumber2, remark,
            accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName } = req.body;

        if (!assignToCode) return res.status(400).json({ success: false, message: 'Agent code required' });

        const updatedAgent = await NetAgent.findOneAndUpdate(
            { agentCode: assignToCode },
            { name, location, contactNumber1, contactNumber2, remark, accountDetails, editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName },
            { new: true }
        );

        if (!updatedAgent) return res.status(404).json({ success: false, message: 'No pre-registered net agent found with this code' });
        res.json({ success: true, agent: updatedAgent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Net.Agent
router.put('/:id', async (req, res) => {
    try {
        const { name, location, contactNumber1, contactNumber2, remark, accountDetails,
            editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName,
            username, password } = req.body;

        let query = mongoose.Types.ObjectId.isValid(req.params.id)
            ? { _id: req.params.id }
            : { uniqueId: req.params.id };

        const updateData = {
            name, location, contactNumber1, contactNumber2, remark, accountDetails,
            editedBy, isVisited, visitedDate, revisitedDates, isActive, posmActive, repName
        };

        if (username) updateData.username = username;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
            updateData.plainPassword = password;
        }

        const updatedAgent = await NetAgent.findOneAndUpdate(
            query,
            updateData,
            { new: true }
        );
        if (!updatedAgent) return res.status(404).json({ success: false, message: 'Net Agent not found' });
        res.json({ success: true, agent: updatedAgent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Net.Agent
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await NetAgent.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Net Agent not found' });
        res.json({ success: true, message: 'Net Agent deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
