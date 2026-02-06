const axios = require('axios');

async function test() {
    try {
        console.log('Fetching salons...');
        const res = await axios.get('http://localhost:5000/api/salons');
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

test();
