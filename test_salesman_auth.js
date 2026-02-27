require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

const runTests = async () => {
    try {
        console.log('--- Salesman Auth Verification ---');

        // 1. Create Salesman Account (Simulating Admin Action)
        const salesmanData = {
            username: `test_salesman_${Date.now()}`,
            password: 'password123'
        };

        console.log('1. Creating Salesman Account...');
        const createRes = await axios.post(`${API_URL}/auth/salesman`, salesmanData);
        if (createRes.data.success) {
            console.log('   [SUCCESS] Salesman account created:', createRes.data.data.username);
        }

        // 2. Login as Salesman
        console.log('2. Logging in as Salesman...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: salesmanData.username,
            password: salesmanData.password
        });

        if (loginRes.data.success) {
            console.log('   [SUCCESS] Login successful. Role:', loginRes.data.role);
            if (loginRes.data.role === 'salesman') {
                console.log('   [PASS] Role is correct.');
            } else {
                console.error('   [FAIL] Role is incorrect:', loginRes.data.role);
            }
        }

        console.log('--- Verification Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('   [ERROR]', err.response?.data || err.message);
        if (err.response?.data) console.error('   [DATA]', JSON.stringify(err.response.data, null, 2));
        process.exit(1);
    }
};

runTests();
