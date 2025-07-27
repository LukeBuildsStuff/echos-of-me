-- Replace generic questions with story-driven legacy questions
-- These questions capture specific moments, experiences, and wisdom

-- First, mark all current questions as inactive
UPDATE questions SET is_active = false;

-- Insert new legacy-focused questions
INSERT INTO questions (question_text, category, complexity_level, emotional_depth, is_active) VALUES

-- CHILDHOOD & FAMILY MEMORIES
('Tell me about your earliest happy memory. What made it so special?', 'family_memories', 3, 7, true),
('What''s a family tradition from your childhood that you hope continues for generations?', 'family_memories', 4, 8, true),
('Describe a time when your parent or grandparent gave you advice that stuck with you forever.', 'family_memories', 5, 9, true),
('What''s a story about your siblings or family that always makes you laugh?', 'family_memories', 3, 6, true),
('Tell me about a holiday or celebration that was particularly meaningful in your family.', 'family_memories', 4, 7, true),

-- PARENTING WISDOM
('Describe a moment when you realized you''d become like your own parent - was it good or concerning?', 'parenting_wisdom', 5, 8, true),
('Tell me about a time you had to discipline your child and how you handled it.', 'parenting_wisdom', 6, 8, true),
('What''s something you learned about parenting only after making a mistake?', 'parenting_wisdom', 5, 7, true),
('Describe a moment when your child surprised you or made you incredibly proud.', 'parenting_wisdom', 4, 9, true),
('What''s a lesson you hope your children remember long after you''re gone?', 'parenting_wisdom', 6, 10, true),

-- LIFE LESSONS & WISDOM
('Tell me about a time when you made a decision that completely changed your life path.', 'life_lessons', 6, 8, true),
('Describe a moment when you had to choose between doing what was right and what was easy.', 'life_lessons', 7, 9, true),
('What''s the biggest mistake you''ve made, and what did it teach you?', 'life_lessons', 6, 8, true),
('Tell me about a time when someone''s kindness completely surprised you.', 'life_lessons', 4, 8, true),
('Describe a moment when you had to stand up for something you believed in, even though it was scary.', 'life_lessons', 7, 9, true),

-- LOVE & RELATIONSHIPS
('Tell me the story of how you knew you loved your spouse or partner.', 'love_relationships', 5, 10, true),
('Describe your wedding day - not the ceremony, but a specific moment that felt magical.', 'love_relationships', 4, 9, true),
('What''s the hardest thing you''ve worked through in your marriage, and how did you get past it?', 'love_relationships', 7, 9, true),
('Tell me about a time when you and your partner laughed so hard you couldn''t stop.', 'love_relationships', 3, 7, true),
('Describe a moment when you realized what unconditional love really means.', 'love_relationships', 6, 10, true),

-- CHALLENGES & GROWTH
('Tell me about the scariest thing you''ve ever had to do, and how you found the courage.', 'challenges_growth', 6, 8, true),
('Describe a time when you thought you wouldn''t get through something, but you did.', 'challenges_growth', 7, 9, true),
('What''s something you were once terrible at but eventually mastered through persistence?', 'challenges_growth', 5, 6, true),
('Tell me about a time when you had to comfort someone who was going through something you''d never experienced.', 'challenges_growth', 6, 8, true),
('Describe a moment when you realized you were stronger than you thought.', 'challenges_growth', 5, 8, true),

-- WORK & PURPOSE
('Tell me about a job or project that taught you something important about yourself.', 'work_purpose', 5, 6, true),
('Describe a time when you had to work with someone difficult, and how you handled it.', 'work_purpose', 5, 7, true),
('What''s something you accomplished at work that you''re genuinely proud of?', 'work_purpose', 4, 6, true),
('Tell me about a mentor or colleague who influenced how you approach work and life.', 'work_purpose', 5, 7, true),
('Describe a moment when you realized your career wasn''t just about the paycheck.', 'work_purpose', 6, 7, true),

-- FRIENDSHIP & COMMUNITY
('Tell me about a friend who''s been there for you through thick and thin.', 'friendship_community', 4, 8, true),
('Describe a time when you had to be there for a friend in crisis.', 'friendship_community', 5, 8, true),
('What''s the funniest thing that ever happened between you and your best friend?', 'friendship_community', 3, 6, true),
('Tell me about a time when your community came together to help someone.', 'friendship_community', 4, 7, true),
('Describe a friendship that didn''t last, and what you learned from it.', 'friendship_community', 6, 7, true),

-- VALUES & BELIEFS
('Tell me about a time when your faith or beliefs were tested, and how you responded.', 'values_beliefs', 7, 9, true),
('Describe a moment when you had to choose between your values and social pressure.', 'values_beliefs', 6, 8, true),
('What''s something you believe that might surprise people who know you?', 'values_beliefs', 5, 6, true),
('Tell me about a time when someone changed your mind about something important.', 'values_beliefs', 6, 7, true),
('Describe a moment when you realized what really matters most in life.', 'values_beliefs', 7, 10, true),

-- SPECIAL MOMENTS
('Tell me about the birth of your child - what was going through your mind?', 'special_moments', 5, 10, true),
('Describe a moment when you felt completely at peace with the world.', 'special_moments', 5, 9, true),
('What''s a small moment that ended up meaning everything to you?', 'special_moments', 4, 8, true),
('Tell me about a time when you laughed until your stomach hurt.', 'special_moments', 3, 7, true),
('Describe the last conversation you had with someone who''s no longer with us.', 'special_moments', 7, 10, true),

-- REGRETS & FORGIVENESS
('Tell me about something you wish you''d said to someone before it was too late.', 'regrets_forgiveness', 7, 10, true),
('Describe a time when you had to forgive someone who really hurt you.', 'regrets_forgiveness', 7, 9, true),
('What''s something you did that you''re not proud of, and how you''ve made peace with it?', 'regrets_forgiveness', 6, 8, true),
('Tell me about a time when someone forgave you when they didn''t have to.', 'regrets_forgiveness', 6, 9, true),
('If you could go back and change one decision, what would it be and why?', 'regrets_forgiveness', 6, 8, true),

-- HOPES & DREAMS
('What''s something you still hope to accomplish before you''re gone?', 'hopes_dreams', 5, 8, true),
('Tell me about a dream you gave up on, and whether you have any regrets.', 'hopes_dreams', 6, 7, true),
('Describe what you hope your great-grandchildren will know about you.', 'hopes_dreams', 6, 9, true),
('What do you hope the world will be like for your children''s children?', 'hopes_dreams', 5, 8, true),
('Tell me about something you want to learn or experience while you still can.', 'hopes_dreams', 4, 6, true);

-- Update categories to be more meaningful
UPDATE questions SET subcategory = 'legacy_preservation' WHERE is_active = true;