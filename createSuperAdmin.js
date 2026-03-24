require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const createSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders');
        console.log('MongoDB Connected');

        const superAdminUsername = 'superadmin';
        const superAdminPassword = 'superadmin123';
        const superAdminEmail = 'superadmin@fadna.com';

        let admin = await Admin.findOne({ username: superAdminUsername });

        if (admin) {
            console.log('Super Admin already exists. Updating password...');
            admin.password = superAdminPassword;
            admin.email = superAdminEmail;
            await admin.save();
            console.log('Super Admin updated successfully');
        } else {
            admin = new Admin({
                username: superAdminUsername,
                email: superAdminEmail,
                password: superAdminPassword,
                role: 'admin' // In this app, 'admin' is the top role
            });
            await admin.save();
            console.log('Super Admin created successfully');
        }

        console.log('--- Credentials ---');
        console.log(`Username: ${superAdminUsername}`);
        console.log(`Password: ${superAdminPassword}`);
        console.log('-------------------');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createSuperAdmin();
