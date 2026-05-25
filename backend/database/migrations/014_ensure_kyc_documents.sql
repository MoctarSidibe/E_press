-- Migration 014: Ensure kyc_documents table exists (009 may not have been applied)

CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    original_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);

-- Ensure KYC columns exist on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'not_submitted';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Admins and customers don't need KYC
UPDATE users SET kyc_status = 'approved' WHERE role IN ('admin', 'customer') AND kyc_status = 'not_submitted';
