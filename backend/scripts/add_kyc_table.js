const db = require('../database/db');

async function addKycTable() {
    console.log('🔄 Creating kyc_documents table...');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS kyc_documents (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL,
                file_url TEXT NOT NULL,
                original_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id)
        `);

        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'not_submitted'`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMP`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT`);

        await client.query(`UPDATE users SET kyc_status = 'approved' WHERE role IN ('admin', 'customer') AND (kyc_status IS NULL OR kyc_status = 'not_submitted')`);

        await client.query('COMMIT');
        console.log('✅ kyc_documents table created successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

addKycTable();
