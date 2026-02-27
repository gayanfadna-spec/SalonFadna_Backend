const axios = require('axios');

async function testLogin() {
    try {
        console.log('Attempting login with username/password...');
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'password123'
        });
        console.log('Login Success:', res.status, res.data);
    } catch (err) {
        console.error('Login Failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testLogin();
