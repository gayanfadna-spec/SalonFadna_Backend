const axios = require('axios');

async function getIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        console.log('Your Public IP Address is:', response.data.ip);
        console.log('Please ensure this IP is whitelisted in your MongoDB Atlas dashboard.');
        console.log('Steps:');
        console.log('1. Go to MongoDB Atlas (https://cloud.mongodb.com/)');
        console.log('2. Navigate to "Network Access" under the Security section.');
        console.log('3. Add your current IP address.');
    } catch (error) {
        console.error('Could not fetch IP address. Please check your internet connection.');
    }
}

getIP();
