const twilio = require('twilio');

const sendOrderNotification = async (salonPhone, orderDetails) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = twilio(accountSid, authToken);
        const senderNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

        // Ensure salonPhone has standard format (e.g., +94...)
        // For simplicity, assuming format is close or just adding 'whatsapp:'
        // In productin, cleaner phone validation is needed.
        let formattedPhone = salonPhone;
        if (!salonPhone.startsWith('whatsapp:')) {
            // Basic check if it has '+'
            if (!salonPhone.startsWith('+')) {
                // Default to SL for this project context? Or just leave as is if user enters it.
                // Let's assume user enters valid format or we prepend basics
                formattedPhone = '+94' + parseInt(salonPhone, 10); // Remove leading 0
            }
            formattedPhone = 'whatsapp:' + formattedPhone;
        }

        const messageBody = `
📦 *New Order Received!* 
*Customer:* ${orderDetails.customerName}
*Phone:* ${orderDetails.customerPhone}
*Address:* ${orderDetails.address}, ${orderDetails.city}
*Total:* Rs.${orderDetails.totalAmount}
*Items:*
${orderDetails.items.map(i => `- ${i.productName} (x${i.quantity})`).join('\n')}

Please check your dashboard for details.
        `;

        const message = await client.messages.create({
            from: senderNumber,
            to: formattedPhone,
            body: messageBody
        });

        console.log(`WhatsApp sent to ${salonPhone}: ${message.sid}`);
        return true;
    } catch (error) {
        console.error('Error sending WhatsApp:', error.message);
        return false;
    }
};

module.exports = { sendOrderNotification };
