const { google } = require('googleapis');
const path = require('path');

// Placeholder for credentials - User needs to add credentials.json to backend root
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // Add to .env

const appendOrderToSheet = async (order) => {
    try {
        if (!require('fs').existsSync(CREDENTIALS_PATH)) {
            console.log('Skipping Google Sheets upload: credentials.json not found');
            return;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });

        // Format items for sheet
        const itemsString = order.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');

        await googleSheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Orders!A:G', // Assumes sheet name is 'Orders'
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [
                    [
                        new Date().toLocaleString(),
                        order.salonName,
                        order.customerName,
                        order.address,
                        order.city,
                        order.customerPhone,
                        order.additionalPhone || '',
                        itemsString,
                        order.totalAmount,
                        order.status
                    ]
                ],
            },
        });
        console.log('Order added to Google Sheet');
    } catch (error) {
        console.error('Error adding to Google Sheet:', error.message);
        // Do not fail the request if sheets fails, just log it.
    }
};

module.exports = { appendOrderToSheet };
