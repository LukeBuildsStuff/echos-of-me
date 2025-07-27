-- Replace generic questions with story-driven legacy questions
-- These questions capture specific moments, experiences, and wisdom

-- First, mark all current questions as inactive
UPDATE questions SET is_active = false;

-- Insert new legacy-focused questions using existing categories
INSERT INTO questions (question_text, category, complexity_level, is_active) VALUES

-- PERSONAL HISTORY & FAMILY MEMORIES
('Tell me about your earliest happy memory. What made it so special?', 'personal_history', 3, true),
('What''s a family tradition from your childhood that you hope continues for generations?', 'personal_history', 4, true),
('Describe a time when your parent or grandparent gave you advice that stuck with you forever.', 'personal_history', 5, true),
('What''s a story about your siblings or family that always makes you laugh?', 'personal_history', 3, true),
('Tell me about a holiday or celebration that was particularly meaningful in your family.', 'personal_history', 4, true),
('Describe a moment when you realized you''d become like your own parent - was it good or concerning?', 'personal_history', 5, true),
('Tell me about a time you had to discipline your child and how you handled it.', 'personal_history', 5, true),
('What''s something you learned about parenting only after making a mistake?', 'personal_history', 5, true),
('Describe a moment when your child surprised you or made you incredibly proud.', 'personal_history', 4, true),
('What''s a lesson you hope your children remember long after you''re gone?', 'personal_history', 5, true),
('Tell me about a time when you made a decision that completely changed your life path.', 'personal_history', 5, true),
('What''s the biggest mistake you''ve made, and what did it teach you?', 'personal_history', 5, true),
('Tell me about the scariest thing you''ve ever had to do, and how you found the courage.', 'personal_history', 5, true),
('Describe a time when you thought you wouldn''t get through something, but you did.', 'personal_history', 5, true),
('What''s something you were once terrible at but eventually mastered through persistence?', 'personal_history', 4, true),
('Tell me about the birth of your child - what was going through your mind?', 'personal_history', 4, true),
('Describe the last conversation you had with someone who''s no longer with us.', 'personal_history', 5, true),
('Tell me about something you wish you''d said to someone before it was too late.', 'personal_history', 5, true),
('What''s something you did that you''re not proud of, and how you''ve made peace with it?', 'personal_history', 5, true),
('If you could go back and change one decision, what would it be and why?', 'personal_history', 5, true),

-- RELATIONSHIPS & LOVE
('Tell me the story of how you knew you loved your spouse or partner.', 'relationships', 4, true),
('Describe your wedding day - not the ceremony, but a specific moment that felt magical.', 'relationships', 4, true),
('What''s the hardest thing you''ve worked through in your marriage, and how did you get past it?', 'relationships', 5, true),
('Tell me about a time when you and your partner laughed so hard you couldn''t stop.', 'relationships', 3, true),
('Describe a moment when you realized what unconditional love really means.', 'relationships', 5, true),
('Tell me about a friend who''s been there for you through thick and thin.', 'relationships', 4, true),
('Describe a time when you had to be there for a friend in crisis.', 'relationships', 4, true),
('What''s the funniest thing that ever happened between you and your best friend?', 'relationships', 3, true),
('Tell me about a time when your community came together to help someone.', 'relationships', 4, true),
('Describe a friendship that didn''t last, and what you learned from it.', 'relationships', 4, true),
('Tell me about a time when someone''s kindness completely surprised you.', 'relationships', 4, true),
('Tell me about a time when you had to comfort someone who was going through something you''d never experienced.', 'relationships', 4, true),
('Describe a time when you had to forgive someone who really hurt you.', 'relationships', 5, true),
('Tell me about a time when someone forgave you when they didn''t have to.', 'relationships', 4, true),

-- PROFESSIONAL & WORK
('Tell me about a job or project that taught you something important about yourself.', 'professional', 4, true),
('Describe a time when you had to work with someone difficult, and how you handled it.', 'professional', 4, true),
('What''s something you accomplished at work that you''re genuinely proud of?', 'professional', 3, true),
('Tell me about a mentor or colleague who influenced how you approach work and life.', 'professional', 4, true),
('Describe a moment when you realized your career wasn''t just about the paycheck.', 'professional', 4, true),

-- DAILY LIFE & MEANINGFUL MOMENTS
('Describe a moment when you felt completely at peace with the world.', 'daily_life', 4, true),
('What''s a small moment that ended up meaning everything to you?', 'daily_life', 4, true),
('Tell me about a time when you laughed until your stomach hurt.', 'daily_life', 3, true),
('Describe a moment when you realized you were stronger than you thought.', 'daily_life', 4, true),
('What''s something you still hope to accomplish before you''re gone?', 'daily_life', 4, true),
('Tell me about a dream you gave up on, and whether you have any regrets.', 'daily_life', 4, true),
('What do you hope the world will be like for your children''s children?', 'daily_life', 4, true),
('Tell me about something you want to learn or experience while you still can.', 'daily_life', 3, true),

-- VALUES & BELIEFS  
('Describe a moment when you had to choose between doing what was right and what was easy.', 'philosophy_values', 5, true),
('Tell me about a time when your faith or beliefs were tested, and how you responded.', 'philosophy_values', 5, true),
('Describe a moment when you had to choose between your values and social pressure.', 'philosophy_values', 5, true),
('What''s something you believe that might surprise people who know you?', 'philosophy_values', 4, true),
('Tell me about a time when someone changed your mind about something important.', 'philosophy_values', 4, true),
('Describe a moment when you realized what really matters most in life.', 'philosophy_values', 5, true),
('Describe what you hope your great-grandchildren will know about you.', 'philosophy_values', 4, true),

-- CREATIVE & SELF-EXPRESSION
('Tell me about a time when you had to express love through actions instead of words.', 'creative_expression', 4, true),
('Describe a time when you created something you were truly proud of.', 'creative_expression', 3, true),
('Tell me about a moment when you had to find a creative solution to a difficult problem.', 'creative_expression', 4, true),
('What''s something beautiful you''ve witnessed that took your breath away?', 'creative_expression', 3, true),
('Describe a time when music, art, or nature moved you to tears.', 'creative_expression', 4, true);

-- Update subcategories to be more meaningful for legacy preservation
UPDATE questions SET subcategory = 'legacy_preservation' WHERE is_active = true;