const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting Smoke Test for Orders API...');

    // 1. Login to get token
    console.log('Logging in as ASM...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'asm_ajith', password: 'asm123' }),
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status}`);
    }

    const cookie = loginRes.headers.get('set-cookie');
    console.log('Login successful. Token obtained.');

    // 2. Fetch Master Data to build payload
    console.log('Fetching Master Data...');
    const dealers = await (await fetch('http://localhost:3000/api/dealers', { headers: { Cookie: cookie } })).json();
    const oems = await (await fetch('http://localhost:3000/api/catalog/oems')).json();
    const vehicles = await (await fetch(`http://localhost:3000/api/catalog/vehicles?oemId=${oems[0].id}`)).json();
    const types = await (await fetch(`http://localhost:3000/api/catalog/vehicle-types?vehicleId=${vehicles[0].id}`)).json();
    const designs = await (await fetch(`http://localhost:3000/api/catalog/designs?vehicleTypeId=${types[0].id}`)).json();

    const dealer = dealers[0];
    const design = designs[0];

    console.log(`Using Dealer: ${dealer.name}`);
    console.log(`Using Design: ${design.productCode} (${design.unitType})`);

    // 3. Create Order Payload
    const payload = {
        dealerId: dealer.id,
        dealerMobile: '9876543210',
        paymentType: 'ADVANCE',
        items: [
            {
                designId: design.id,
                quantity: 5,
                unitType: design.unitType,
                productCode: design.productCode,
                colorId: design.colors[0]?.id || null
            }
        ]
    };

    // 4. Submit Order
    console.log('Submitting Order...');
    const orderRes = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
        },
        body: JSON.stringify(payload),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
        console.error('Order creation failed:', orderData);
        throw new Error(`Order creation failed: ${orderRes.status}`);
    }

    console.log('Order Created Successfully!');
    console.log('Order Number:', orderData.orderNumber);
    console.log('Total Quantity:', orderData.totalQuantity);

    if (orderData.totalQuantity !== 5) throw new Error('Quantity mismatch');
    if (orderData.status !== 'SUBMITTED') throw new Error('Status mismatch');

    console.log('Smoke Test PASSED ✅');
}

main()
    .catch(e => {
        console.error('Smoke Test FAILED ❌', e);
        process.exit(1);
    });
