const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const orderService = require('../services/order.service');

async function verifySystemFlow() {
    console.log('🕵️ SYSTEM VERIFICATION: Starting Triple Check...\n');

    const client = await db.pool.connect();
    let orderId;
    let customerId, driverId;

    try {
        await client.query('BEGIN');

        // 1. DATA INTEGRITY CHECK
        console.log('1️⃣  Checking User Roles...');
        const customers = await client.query("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
        const drivers = await client.query("SELECT id FROM users WHERE role = 'driver' LIMIT 1");
        const cleaners = await client.query("SELECT id FROM users WHERE role = 'cleaner' LIMIT 1");

        if (!customers.rows[0] || !drivers.rows[0] || !cleaners.rows[0]) {
            throw new Error('❌ Missing required roles (Need 1 Customer, 1 Driver, 1 Cleaner)');
        }
        customerId = customers.rows[0].id;
        driverId = drivers.rows[0].id;
        console.log('✅ Roles confirmed: Customer, Driver, Cleaner exist.\n');

        // 2. ORDER CREATION (Sync: Customer -> Database)
        console.log('2️⃣  Simulating Order Creation (Customer Flow)...');
        const locations = await client.query("SELECT id FROM locations WHERE user_id = $1 LIMIT 2", [customerId]);
        if (locations.rows.length < 2) throw new Error('Customer needs 2 locations');

        // Create a simple test order
        const categoryResult = await client.query('SELECT id FROM clothing_categories LIMIT 1');
        if (categoryResult.rows.length === 0) throw new Error('No categories found');
        const categoryId = categoryResult.rows[0].id;

        const orderData = {
            items: [{ categoryId: categoryId, quantity: 2, notes: "Test Item" }],
            pickupLocationId: locations.rows[0].id,
            deliveryLocationId: locations.rows[1].id,
            pickupType: 'immediate',
            paymentMethod: 'cash'
        };

        const createdOrder = await orderService.createOrder(customerId, orderData);
        orderId = createdOrder.id;

        if (createdOrder.status !== 'pending') throw new Error('New order status should be pending');
        if (!createdOrder.qr_code_data) throw new Error('QR Code data missing from new order');
        console.log(`✅ Order Created: ${createdOrder.order_number} (Status: ${createdOrder.status})`);
        console.log('✅ QR Code Generated');

        // 3. COURIER ACCEPTANCE (Sync: Database -> Courier)
        console.log('\n3️⃣  Simulating Driver Acceptance...');
        const acceptedOrder = await orderService.assignPickupDriver(orderId, driverId);
        if (acceptedOrder.status !== 'assigned') throw new Error('Order status should be assigned');
        if (acceptedOrder.pickup_driver_id !== driverId) throw new Error('Driver ID mismatch');
        console.log(`✅ Driver Assigned (Status: ${acceptedOrder.status})`);

        // 4. PICKUP (Sync: Courier -> Cleaner Notification)
        console.log('\n4️⃣  Simulating Driver Pickup (QR Scan)...');
        const pickedUpOrder = await orderService.updateOrderStatus(orderId, 'picked_up', driverId);
        if (pickedUpOrder.status !== 'picked_up') throw new Error('Order status should be picked_up');
        console.log(`✅ Order Picked Up (Status: ${pickedUpOrder.status})`);

        // 5. CLEANER RECEPTION (Sync: Cleaner -> Facility)
        console.log('\n5️⃣  Simulating Cleaner Reception...');
        // Cleaners find orders by querying 'picked_up' status orders via QR
        // Cleaner accepts it
        const receivedOrder = await orderService.updateOrderStatus(orderId, 'in_facility', cleaners.rows[0].id);
        if (receivedOrder.status !== 'in_facility') throw new Error('Order status should be in_facility');
        console.log(`✅ Order Received at Facility (Status: ${receivedOrder.status})`);

        // 6. PROCESSING & READY (Sync: Cleaner -> Courier Notification)
        console.log('\n6️⃣  Simulating Cleaning Completion...');
        const readyOrder = await orderService.updateOrderStatus(orderId, 'ready', cleaners.rows[0].id);
        if (readyOrder.status !== 'ready') throw new Error('Order status should be ready');
        console.log(`✅ Order Marked Ready (Status: ${readyOrder.status})`);

        // 7. DELIVERY ASSIGNMENT & COMPLETION
        console.log('\n7️⃣  Simulating Delivery...');
        const deliveryAssigned = await orderService.assignDeliveryDriver(orderId, driverId);
        if (deliveryAssigned.status !== 'out_for_delivery') throw new Error('Order status should be out_for_delivery');
        console.log(`✅ Out for Delivery (Status: ${deliveryAssigned.status})`);

        const deliveredOrder = await orderService.updateOrderStatus(orderId, 'delivered', driverId);
        if (deliveredOrder.status !== 'delivered') throw new Error('Order status should be delivered');
        console.log(`✅ Order Delivered (Status: ${deliveredOrder.status})`);

        console.log('\n🎉 TRIPLE CHECK PASSED: Full Lifecycle Verified Successfully!');

        await client.query('ROLLBACK'); // Rollback so we don't spam DB
        console.log('\n(Test data rolled back - Database is clean)');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        if (error.detail) console.error('Details:', error.detail);
    } finally {
        client.release();
        process.exit();
    }
}

verifySystemFlow();
