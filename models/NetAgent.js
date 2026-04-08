const mongoose = require('mongoose');

const netAgentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: String,
    contactNumber1: String,
    contactNumber2: String,
    remark: String,
    repName: String,
    accountDetails: {
        bankName: String,
        branch: String,
        accountNumber: String,
        accountName: String
    },
    uniqueId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    agentCode: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    plainPassword: { type: String },
    parentNetAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'NetAgent', default: null },
    level: { type: Number, default: 1, enum: [1, 2] },
    editedBy: { type: String, default: null },
    isVisited: { type: Boolean, default: false },
    visitedDate: { type: Date, default: null },
    revisitedDates: [{ type: Date }],
    isActive: { type: Boolean, default: false },
    posmActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('NetAgent', netAgentSchema);
