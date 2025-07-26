-- Schema updates for family role-specific questions
-- Run after initial schema creation

-- Add role and relationship tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_roles TEXT[]; -- Array of additional roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_years INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS children_ages INTEGER[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS significant_events TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS cultural_background TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS spiritual_orientation VARCHAR(20);

-- Create role-specific questions table
CREATE TABLE IF NOT EXISTS role_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  question_text TEXT NOT NULL UNIQUE,
  context_note TEXT,
  emotional_depth INTEGER CHECK (emotional_depth >= 1 AND emotional_depth <= 10),
  for_milestone VARCHAR(100),
  min_relationship_years INTEGER,
  max_relationship_years INTEGER,
  child_age_ranges TEXT[], -- e.g., ['infant', 'toddler', 'teen', 'adult']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create question sessions table for tracking emotional progression
CREATE TABLE IF NOT EXISTS question_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_mood VARCHAR(50),
  questions_delivered UUID[], -- Array of question IDs
  questions_answered UUID[], -- Array of question IDs
  emotional_depth_progression INTEGER[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, session_number)
);

-- Create milestone questions mapping
CREATE TABLE IF NOT EXISTS milestone_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_type VARCHAR(100) NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  role VARCHAR(50),
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_questions_role ON role_questions(role);
CREATE INDEX IF NOT EXISTS idx_role_questions_emotional_depth ON role_questions(emotional_depth);
CREATE INDEX IF NOT EXISTS idx_role_questions_category ON role_questions(category);
CREATE INDEX IF NOT EXISTS idx_question_sessions_user_id ON question_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_questions_milestone_type ON milestone_questions(milestone_type);

-- Add role context to responses for better AI training
ALTER TABLE responses ADD COLUMN IF NOT EXISTS answerer_role VARCHAR(50);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS relationship_context TEXT;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS emotional_state VARCHAR(50);

-- Create view for role-based question selection
CREATE OR REPLACE VIEW user_question_pool AS
SELECT 
  u.id as user_id,
  u.primary_role,
  q.id as question_id,
  q.question_text,
  q.category,
  COALESCE(rq.emotional_depth, 5) as emotional_depth,
  CASE 
    WHEN r.id IS NULL THEN false 
    ELSE true 
  END as answered,
  r.created_at as answered_at
FROM users u
CROSS JOIN questions q
LEFT JOIN role_questions rq ON q.question_text = rq.question_text
LEFT JOIN responses r ON r.user_id = u.id AND r.question_id = q.id
WHERE (rq.role = u.primary_role OR rq.role IS NULL);

-- Function to get personalized questions
CREATE OR REPLACE FUNCTION get_personalized_questions(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_target_depth INTEGER DEFAULT NULL
)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  category VARCHAR,
  emotional_depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.question_id,
    q.question_text,
    q.category,
    q.emotional_depth
  FROM user_question_pool q
  WHERE 
    q.user_id = p_user_id 
    AND q.answered = false
    AND (p_target_depth IS NULL OR ABS(q.emotional_depth - p_target_depth) <= 2)
  ORDER BY 
    CASE WHEN p_target_depth IS NOT NULL 
      THEN ABS(q.emotional_depth - p_target_depth) 
      ELSE RANDOM() 
    END
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql;

-- Sample data for role-specific questions
INSERT INTO role_questions (role, category, question_text, context_note, emotional_depth) VALUES
('parent', 'birth_early_years', 'Tell me about the moment you first saw me and what went through your heart.', 'Only parents can share these intimate first moments', 10),
('parent', 'birth_early_years', 'What were your biggest fears and hopes when you brought me home as a baby?', 'Only parents can share these intimate first moments', 10),
('grandparent', 'generational_wisdom', 'What changes in the world concern you most for your grandchildren''s future?', 'Wisdom that spans generations and historical perspective', 9),
('spouse', 'intimate_knowledge', 'What do you want our children to know about how much I loved you?', 'Things only a life partner truly knows', 10),
('sibling', 'shared_childhood', 'What childhood memories do we share that no one else would understand?', 'The unique bond of growing up together', 8)
ON CONFLICT (question_text) DO NOTHING;