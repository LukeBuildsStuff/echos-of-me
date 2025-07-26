-- Schema for Milestone Messages and Life Detail Entries
-- Allows users to create diary-like entries and messages for future events

-- Milestone messages table
CREATE TABLE IF NOT EXISTS milestone_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type VARCHAR(50) NOT NULL,
  custom_milestone_name VARCHAR(200),
  recipient_name VARCHAR(200),
  message_title VARCHAR(500) NOT NULL,
  message_content TEXT NOT NULL,
  trigger_date DATE,
  trigger_age INTEGER,
  trigger_event VARCHAR(500),
  emotional_tone VARCHAR(50) NOT NULL,
  tags TEXT[],
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  INDEX idx_milestone_user_id (user_id),
  INDEX idx_milestone_type (milestone_type),
  INDEX idx_milestone_recipient (recipient_name),
  INDEX idx_milestone_trigger_date (trigger_date)
);

-- Life detail entries table (diary-like entries)
CREATE TABLE IF NOT EXISTS life_detail_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  related_people TEXT[],
  emotional_depth INTEGER CHECK (emotional_depth >= 1 AND emotional_depth <= 10),
  attached_question_id UUID REFERENCES questions(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  INDEX idx_life_entry_user_id (user_id),
  INDEX idx_life_entry_date (entry_date),
  INDEX idx_life_entry_category (category),
  INDEX idx_life_entry_emotional_depth (emotional_depth)
);

-- Full text search indexes for content searching
CREATE INDEX IF NOT EXISTS idx_milestone_messages_search 
  ON milestone_messages 
  USING gin(to_tsvector('english', message_title || ' ' || message_content));

CREATE INDEX IF NOT EXISTS idx_life_entries_search 
  ON life_detail_entries 
  USING gin(to_tsvector('english', title || ' ' || content));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_milestone_messages_updated_at 
  BEFORE UPDATE ON milestone_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_life_detail_entries_updated_at 
  BEFORE UPDATE ON life_detail_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easy querying
CREATE OR REPLACE VIEW upcoming_milestones AS
SELECT 
  mm.*,
  u.name as author_name,
  u.email as author_email
FROM milestone_messages mm
JOIN users u ON mm.user_id = u.id
WHERE 
  (mm.trigger_date IS NOT NULL AND mm.trigger_date > CURRENT_DATE)
  OR mm.trigger_age IS NOT NULL
  OR mm.trigger_event IS NOT NULL
ORDER BY mm.trigger_date ASC NULLS LAST;

CREATE OR REPLACE VIEW recent_life_entries AS
SELECT 
  lde.*,
  u.name as author_name,
  q.question_text as prompted_by_question
FROM life_detail_entries lde
JOIN users u ON lde.user_id = u.id
LEFT JOIN questions q ON lde.attached_question_id = q.id
WHERE lde.entry_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY lde.entry_date DESC, lde.created_at DESC;

-- Function to get triggered milestones for a recipient
CREATE OR REPLACE FUNCTION get_triggered_milestones(
  p_recipient_name VARCHAR,
  p_recipient_age INTEGER DEFAULT NULL,
  p_recent_events TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  milestone_id UUID,
  message_title VARCHAR,
  message_content TEXT,
  milestone_type VARCHAR,
  emotional_tone VARCHAR,
  author_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mm.id,
    mm.message_title,
    mm.message_content,
    mm.milestone_type,
    mm.emotional_tone,
    u.name
  FROM milestone_messages mm
  JOIN users u ON mm.user_id = u.id
  WHERE 
    (mm.recipient_name = p_recipient_name OR mm.recipient_name IS NULL)
    AND (
      (mm.trigger_date IS NOT NULL AND mm.trigger_date <= CURRENT_DATE)
      OR (mm.trigger_age IS NOT NULL AND p_recipient_age IS NOT NULL AND p_recipient_age >= mm.trigger_age)
      OR (mm.trigger_event IS NOT NULL AND p_recent_events IS NOT NULL AND mm.trigger_event = ANY(p_recent_events))
    )
    AND mm.is_private = false
  ORDER BY mm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search life entries
CREATE OR REPLACE FUNCTION search_life_entries(
  p_user_id UUID,
  p_search_term TEXT,
  p_category VARCHAR DEFAULT NULL,
  p_min_depth INTEGER DEFAULT 1,
  p_max_depth INTEGER DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  entry_date DATE,
  title VARCHAR,
  content TEXT,
  category VARCHAR,
  emotional_depth INTEGER,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lde.id,
    lde.entry_date,
    lde.title,
    lde.content,
    lde.category,
    lde.emotional_depth,
    lde.tags
  FROM life_detail_entries lde
  WHERE 
    lde.user_id = p_user_id
    AND (p_category IS NULL OR lde.category = p_category)
    AND lde.emotional_depth BETWEEN p_min_depth AND p_max_depth
    AND (
      p_search_term IS NULL 
      OR to_tsvector('english', lde.title || ' ' || lde.content) @@ plainto_tsquery('english', p_search_term)
      OR p_search_term = ANY(lde.tags)
      OR p_search_term = ANY(lde.related_people)
    )
  ORDER BY lde.entry_date DESC, lde.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample milestone messages
INSERT INTO milestone_messages (
  user_id, 
  milestone_type, 
  recipient_name, 
  message_title, 
  message_content, 
  emotional_tone, 
  tags
) 
SELECT 
  u.id,
  'wedding',
  'My Children',
  'On Your Wedding Day',
  'My dearest child, as you stand at the altar today, know that my love surrounds you. May your marriage be filled with the same joy, laughter, and deep companionship that has blessed our family. Remember that love is a choice you make every day, not just a feeling. Choose each other, always.',
  'celebratory',
  ARRAY['wedding', 'love', 'marriage', 'blessing']
FROM users u
LIMIT 1
ON CONFLICT DO NOTHING;