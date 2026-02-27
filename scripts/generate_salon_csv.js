const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Salon = require('../models/Salon');

const generateCSV = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salon-orders');
        console.log('Connected to MongoDB');

        const salons = await Salon.find({});
        console.log(`Found ${salons.length} salons.`);

        const csvHeader = 'Name,Link,Code\n';
        const csvRows = salons.map(salon => {
            const link = `https://www.portal.fadnals.lk/order/${salon.uniqueId}`;
            const code = salon.salonCode || 'N/A';
            // Escape quotes in name and wrap in quotes to handle commas
            const name = `"${(salon.name || '').replace(/"/g, '""')}"`;
            return `${name},${link},${code}`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        const outputPath = path.join(__dirname, '../salons_with_names.csv');

        fs.writeFileSync(outputPath, csvContent);
        console.log(`CSV file generated at: ${outputPath}`);

        process.exit(0);
    } catch (error) {
        console.error('Error generating CSV:', error);
        process.exit(1);
    }
};

generateCSV();
