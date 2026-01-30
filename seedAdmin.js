require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders');
        console.log('MongoDB Connected');

        let admin = await Admin.findOne({ username: 'admin' });//

        if (admin) {
            console.log('Admin found. Updating email...');
            admin.email = 'gayanfadna@gmail.com';
            admin.password = 'admin123'; // Reset password to default if needed
            await admin.save();
            console.log('Admin updated successfully');
        } else {
            admin = new Admin({
                username: 'admin',
                email: 'gayanfadna@gmail.com',
                password: 'admin123'
            });
            await admin.save();
            console.log('Admin seeded successfully');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
