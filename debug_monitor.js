const axios = require('axios');

async function testApi() {
    console.log("Testing Salon Performance...");
    try {
        const res1 = await axios.get('http://localhost:5000/api/analytics/salon-performance');
        console.log("Status:", res1.status);
        console.log("Data:", JSON.stringify(res1.data).substring(0, 100));
        console.log("Content-Type:", res1.headers['content-type']);
    } catch (e) {
        console.error("Salon Perf Failed:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.log("Data:", typeof e.response.data === 'string' ? e.response.data.substring(0, 100) : "JSON Data");
        }
    }

    console.log("\nTesting Item Performance...");
    try {
        const res2 = await axios.get('http://localhost:5000/api/analytics/item-performance');
        console.log("Status:", res2.status);
        console.log("Data:", JSON.stringify(res2.data).substring(0, 100));
    } catch (e) { console.error("Item Perf Failed:", e.message); }

    console.log("\nTesting Orders...");
    try {
        const res3 = await axios.get('http://localhost:5000/api/orders');
        console.log("Status:", res3.status);
        console.log("Data:", JSON.stringify(res3.data).substring(0, 100));
        console.log("Content-Type:", res3.headers['content-type']);
    } catch (e) { console.error("Orders Failed:", e.message); }
}

testApi();
