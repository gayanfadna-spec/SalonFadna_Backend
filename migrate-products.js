require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const col = mongoose.connection.collection('products');

        // Set Satiny to salon only
        const result = await col.updateOne(
            { name: { $regex: 'Satiny', $options: 'i' } },
            { $set: { target: 'salon' } }
        );
        console.log('Modified:', result.modifiedCount);

        // Verify all
        const products = await col.find({}).toArray();
        products.forEach(p => console.log(`  ${p.name}: target = ${p.target}`));
        process.exit(0);
    })
    .catch(err => { console.error(err.message); process.exit(1); });
doc
