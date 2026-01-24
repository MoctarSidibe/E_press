const db = require('./database/db');

async function testLocations() {
    try {
        console.log('Testing connection...');
        const client = await db.pool.connect();
        console.log('Connected to database.');
        client.release();

        console.log('Checking locations table...');
        const result = await db.query('SELECT * FROM locations LIMIT 1');
        console.log('Locations table accessed successfully.');
        console.log('Columns:', result.fields.map(f => f.name));

        console.log('Querying for a user (fake UUID)...');
        const userResult = await db.query(
            'SELECT * FROM locations WHERE user_id = $1',
            ['00000000-0000-0000-0000-000000000000']
        );
        console.log('User locations query successful.');

    } catch (error) {
        console.error('ERROR DIAGNOSING LOCATIONS:');
        console.error(error);
    } finally {
        // Force exit
        process.exit();
    }
}

testLocations();
