const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const SalonSchema = new mongoose.Schema({
    name: String,
    isActive: Boolean,
    activeDate: Date,
    posmActive: Boolean,
    posmDate: Date,
    repName: String,
    visitedDate: Date,
    isVisited: Boolean
});

const Salon = mongoose.model('Salon', SalonSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const sample = await Salon.find({ isActive: true }).limit(5);
        console.log('Active Salons Sample:');
        sample.forEach(s => {
            console.log(`Name: ${s.name}, Rep: ${s.repName}, Active: ${s.isActive}, ActiveDate: ${s.activeDate}, VisitedDate: ${s.visitedDate}`);
        });

        const counts = await Salon.countDocuments({ isActive: true, activeDate: { $exists: false } });
        console.log(`Count of active salons without activeDate: ${counts}`);

        const totalActive = await Salon.countDocuments({ isActive: true });
        console.log(`Total active salons: ${totalActive}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
