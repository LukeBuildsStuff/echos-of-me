-- Add password reset fields to users table
-- Migration: Add reset_token and reset_token_expires columns

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Add comment for documentation
COMMENT ON COLUMN users.reset_token IS 'Secure token for password reset, generated using crypto.randomBytes';
COMMENT ON COLUMN users.reset_token_expires IS 'Expiration timestamp for reset token, typically 24 hours from generation';