const Razorpay = require('razorpay');

async function testOrder() {
    try {
        const keyId = 'rzp_test_TezDynuxlmka0H';
        const keySecret = 'lVhRZ4uXaL7dP4InKwk711hO';
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
        
        const options = {
            amount: 10000,
            currency: 'INR',
            receipt: 'test_rcpt_1'
        };
        
        console.log("Creating order...");
        const order = await rzp.orders.create(options);
        console.log("Order created successfully:", order);
    } catch (err) {
        console.error("Razorpay Error:", err);
    }
}

testOrder();
