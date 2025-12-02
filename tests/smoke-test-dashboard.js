// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:3000';
let token = '';
let orderId = '';

async function main() {
    console.log('Starting Smoke Test for ASM Dashboard APIs...');

    // 1. Login
    console.log('Logging in as ASM...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'asm_ajith', password: 'asm123' }),
    });

    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    token = loginRes.headers.get('set-cookie').split(';')[0].split('=')[1];
    console.log('Login successful.');

    // 2. Fetch Master Data for IDs
    console.log('Fetching Master Data...');
    const dealersRes = await fetch(`${BASE_URL}/api/dealers`, { headers: { Cookie: `session_token=${token}` } });
    const dealers = await dealersRes.json();
    const dealer = dealers[0];

    const oemsRes = await fetch(`${BASE_URL}/api/catalog/oems`, { headers: { Cookie: `session_token=${token}` } });
    const oems = await oemsRes.json();
    const oem = oems[0]; // Tata

    const vehiclesRes = await fetch(`${BASE_URL}/api/catalog/vehicles?oemId=${oem.id}`, { headers: { Cookie: `session_token=${token}` } });
    const vehicles = await vehiclesRes.json();
    const vehicle = vehicles[0];

    const typesRes = await fetch(`${BASE_URL}/api/catalog/vehicle-types?vehicleId=${vehicle.id}`, { headers: { Cookie: `session_token=${token}` } });
    const types = await typesRes.json();
    const type = types[0];

    const designsRes = await fetch(`${BASE_URL}/api/catalog/designs?vehicleTypeId=${type.id}`, { headers: { Cookie: `session_token=${token}` } });
    const designs = await designsRes.json();
    const design = designs[0]; // Should be PCS, BOTH

    // 3. Create Order (DRAFT)
    console.log('Creating Draft Order...');
    const createRes = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `session_token=${token}` },
        body: JSON.stringify({
            dealerId: dealer.id,
            dealerMobile: '9876543210',
            paymentType: 'ADVANCE',
            items: [{
                designId: design.id,
                quantity: 5,
                unitType: design.unitType,
                seatType: design.seatOption === 'BOTH' ? 'SINGLE' : design.seatOption,
                colorId: design.colors[0]?.id,
                productCode: design.productCode
            }]
        }),
    });

    if (!createRes.ok) {
        const err = await createRes.json();
        console.error(JSON.stringify(err, null, 2));
        throw new Error(`Create failed: ${createRes.status}`);
    }
    const createdOrder = await createRes.json();
    orderId = createdOrder.id;
    console.log(`Draft Order Created: ${orderId} (${createdOrder.status})`);

    // 4. List Orders
    console.log('Listing Orders...');
    const listRes = await fetch(`${BASE_URL}/api/orders?page=1&limit=5`, {
        headers: { Cookie: `session_token=${token}` }
    });
    const listData = await listRes.json();
    console.log(`Found ${listData.meta.total} orders.`);
    const found = listData.data.find(o => o.id === orderId);
    if (!found) throw new Error('Created order not found in list');

    // 5. Get Detail
    console.log('Fetching Detail...');
    const detailRes = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
        headers: { Cookie: `session_token=${token}` }
    });
    const detail = await detailRes.json();
    if (detail.id !== orderId) throw new Error('Detail ID mismatch');
    console.log('Detail fetched.');

    // 6. Update Order (PATCH)
    console.log('Updating Order...');
    const updateRes = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: `session_token=${token}` },
        body: JSON.stringify({
            dealerId: dealer.id,
            dealerMobile: '9876543210',
            paymentType: 'ADVANCE',
            items: [{
                designId: design.id,
                quantity: 10, // Changed from 5 to 10
                unitType: design.unitType,
                seatType: design.seatOption === 'BOTH' ? 'SINGLE' : design.seatOption,
                colorId: design.colors[0]?.id,
                productCode: design.productCode
            }]
        }),
    });
    if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}`);
    const updatedOrder = await updateRes.json();
    if (updatedOrder.totalQuantity !== 10) throw new Error('Update failed: Quantity mismatch');
    console.log('Order Updated.');

    // 7. Submit Order
    console.log('Submitting Order...');
    const submitRes = await fetch(`${BASE_URL}/api/orders/${orderId}/submit`, {
        method: 'POST',
        headers: { Cookie: `session_token=${token}` }
    });
    if (!submitRes.ok) throw new Error(`Submit failed: ${submitRes.status}`);
    const submittedOrder = await submitRes.json();
    if (submittedOrder.status !== 'SUBMITTED') throw new Error('Submit failed: Status mismatch');
    console.log('Order Submitted.');

    console.log('Smoke Test PASSED ✅');
}

main().catch(console.error);
