const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    console.log('[DEBUG] Login Body:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    try {
        const admin = await Admin.findOne({ username }).select('+password');

        if (!admin) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await admin.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = admin.getSignedJwtToken();
        res.status(200).json({ success: true, token, role: admin.role, username: admin.username });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ success: false, error: 'Email could not be sent' });
        }

        const resetToken = admin.getResetPasswordToken();

        await admin.save({ validateBeforeSave: false });

        // Create reset url
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reset-password/${resetToken}`;

        const message = `
            <h1>You have requested a password reset</h1>
            <p>Please go to this link to reset your password:</p>
            <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
        `;

        try {
            // Reusable transporter object using the default SMTP transport
            const transporter = nodemailer.createTransport({
                service: 'gmail', // Use your preferred service
                auth: {
                    user: process.env.EMAIL_USERNAME,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            // If no email creds are set, just log it for dev
            if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
                console.log('Skipping email send (no credentials). Reset Link:', resetUrl);
                return res.status(200).json({ success: true, data: 'Email sent (simulated check console)' });
            }

            await transporter.sendMail({
                from: process.env.EMAIL_FROM || 'noreply@fadnasalon.com',
                to: admin.email,
                subject: 'Password Reset Token',
                html: message
            });

            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            console.log(err);
            admin.resetPasswordToken = undefined;
            admin.resetPasswordExpire = undefined;

            await admin.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, error: 'Email could not be sent' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res, next) => {
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');

    try {
        const admin = await Admin.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({ success: false, error: 'Invalid token' });
        }

        admin.password = req.body.password;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpire = undefined;

        await admin.save();

        const token = admin.getSignedJwtToken();

        res.status(200).json({ success: true, token });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Create Salesman Account
// @route   POST /api/auth/salesman
// @access  Private/Admin
exports.createSalesman = async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Please provide a username and password' });
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, error: 'Database not connected. Please check your IP whitelist in MongoDB Atlas.' });
        }

        const existingUser = await Admin.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }

        const payload = { username, password, role: 'salesman' };
        if (req.body.email) {
            payload.email = req.body.email;
        }

        const salesman = await Admin.create(payload);

        res.status(201).json({
            success: true,
            data: {
                id: salesman._id,
                username: salesman.username,
                role: salesman.role
            }
        });
    } catch (err) {
        console.error('Account Creation Error:', err);
        let errorMsg = 'Server Error';
        if (err.name === 'MongooseServerSelectionError') {
            errorMsg = 'Database connection error. Check IP whitelist.';
        } else if (err.code === 11000) {
            errorMsg = 'Duplicate key error. Field: ' + Object.keys(err.keyValue).join(', ');
        }
        res.status(500).json({ success: false, error: errorMsg });
    }
};

// @desc    Get all accounts (Admin and Salesman)
// @route   GET /api/auth/accounts
// @access  Private/Admin
exports.getAccounts = async (req, res, next) => {
    try {
        const accounts = await Admin.find({}).select('-password');
        res.status(200).json({ success: true, accounts });
    } catch (err) {
        console.error('Fetch Accounts Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Delete an account
// @route   DELETE /api/auth/accounts/:id
// @access  Private/Admin
exports.deleteAccount = async (req, res, next) => {
    try {
        const account = await Admin.findById(req.params.id);

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (account.role === 'admin') {
            return res.status(403).json({ success: false, error: 'Cannot delete admin accounts directly from this panel' });
        }

        await account.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.error('Delete Account Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};


// @desc    Update an account
// @route   PUT /api/auth/accounts/:id
// @access  Private/Admin
exports.updateAccount = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const account = await Admin.findById(req.params.id);

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (username) {
            // Check if another account already has this username
            const existingUser = await Admin.findOne({ username });
            if (existingUser && existingUser._id.toString() !== account._id.toString()) {
                return res.status(400).json({ success: false, error: 'Username already exists' });
            }
            account.username = username;
        }

        if (password) {
            account.password = password; // The pre('save') hook will hash this
        }

        await account.save();

        res.status(200).json({
            success: true,
            data: { id: account._id, username: account.username, role: account.role }
        });
    } catch (err) {
        console.error('Update Account Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
