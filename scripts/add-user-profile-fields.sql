-- Add user profile fields for legacy preservation
-- Migration to support the new onboarding flow

-- Add birthday field
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add primary and secondary family roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_roles TEXT[];

-- Add children birthdays (replacing children_ages)
ALTER TABLE users ADD COLUMN IF NOT EXISTS children_birthdays DATE[];

-- Add important people information
ALTER TABLE users ADD COLUMN IF NOT EXISTS important_people JSONB;

-- Add cultural background and significant events
ALTER TABLE users ADD COLUMN IF NOT EXISTS cultural_background TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS significant_events TEXT[];

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
CREATE INDEX IF NOT EXISTS idx_users_important_people ON users USING GIN (important_people);

-- Add comment for documentation
COMMENT ON COLUMN users.birthday IS 'User birthday for personalization and age-appropriate questions';
COMMENT ON COLUMN users.primary_role IS 'Primary family role: parent, grandparent, spouse, sibling, etc.';
COMMENT ON COLUMN users.secondary_roles IS 'Additional family roles the user fulfills';
COMMENT ON COLUMN users.children_birthdays IS 'Array of children birthdays for dynamic age calculation';
COMMENT ON COLUMN users.important_people IS 'JSON array of {name, relationship} for the most important people in user life';
COMMENT ON COLUMN users.cultural_background IS 'Array of cultural identities and backgrounds';
COMMENT ON COLUMN users.significant_events IS 'Array of major life events for context';