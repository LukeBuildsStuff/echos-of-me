-- Add training_prompt_template field to questions table for LLM training
ALTER TABLE questions ADD COLUMN IF NOT EXISTS training_prompt_template TEXT;

-- Update existing questions with training prompt templates
-- These templates will be used to generate conversational training data

-- PERSONAL HISTORY & FAMILY MEMORIES
UPDATE questions SET training_prompt_template = 'Someone asks you about your earliest happy memories. Share that special moment as you would with family.' 
WHERE question_text = 'Tell me about your earliest happy memory. What made it so special?';

UPDATE questions SET training_prompt_template = 'Your child asks about family traditions that matter to you. Tell them about one you hope continues.' 
WHERE question_text = 'What''s a family tradition from your childhood that you hope continues for generations?';

UPDATE questions SET training_prompt_template = 'Someone asks about advice that shaped your life. Share that meaningful guidance as you would remember it.' 
WHERE question_text = 'Describe a time when your parent or grandparent gave you advice that stuck with you forever.';

UPDATE questions SET training_prompt_template = 'Your family wants to hear a funny story about your siblings. Tell them that story like you would at a family gathering.' 
WHERE question_text = 'What''s a story about your siblings or family that always makes you laugh?';

UPDATE questions SET training_prompt_template = 'Someone asks about holidays that were meaningful to your family. Share that special celebration.' 
WHERE question_text = 'Tell me about a holiday or celebration that was particularly meaningful in your family.';

UPDATE questions SET training_prompt_template = 'Your child notices they act like you sometimes. Share how you realized you were becoming like your own parent.' 
WHERE question_text = 'Describe a moment when you realized you''d become like your own parent - was it good or concerning?';

UPDATE questions SET training_prompt_template = 'Another parent asks how you handled disciplining your child. Share your approach and what you learned.' 
WHERE question_text = 'Tell me about a time you had to discipline your child and how you handled it.';

UPDATE questions SET training_prompt_template = 'A new parent asks about parenting mistakes. Share something you learned the hard way.' 
WHERE question_text = 'What''s something you learned about parenting only after making a mistake?';

UPDATE questions SET training_prompt_template = 'Someone asks about a proud parenting moment. Tell them about when your child surprised you.' 
WHERE question_text = 'Describe a moment when your child surprised you or made you incredibly proud.';

UPDATE questions SET training_prompt_template = 'Your adult child asks what lesson matters most to you. Share that important wisdom.' 
WHERE question_text = 'What''s a lesson you hope your children remember long after you''re gone?';

-- RELATIONSHIPS & LOVE
UPDATE questions SET training_prompt_template = 'Someone asks about your love story. Tell them how you knew you loved your partner.' 
WHERE question_text = 'Tell me the story of how you knew you loved your spouse or partner.';

UPDATE questions SET training_prompt_template = 'A friend asks about your wedding day. Share that magical moment that stood out.' 
WHERE question_text = 'Describe your wedding day - not the ceremony, but a specific moment that felt magical.';

UPDATE questions SET training_prompt_template = 'A couple asks how you got through marriage difficulties. Share how you worked through challenges.' 
WHERE question_text = 'What''s the hardest thing you''ve worked through in your marriage, and how did you get past it?';

UPDATE questions SET training_prompt_template = 'Someone asks about joyful moments with your partner. Tell them about a time you laughed together.' 
WHERE question_text = 'Tell me about a time when you and your partner laughed so hard you couldn''t stop.';

UPDATE questions SET training_prompt_template = 'Someone asks about understanding love. Share when you realized what unconditional love means.' 
WHERE question_text = 'Describe a moment when you realized what unconditional love really means.';

-- VALUES & BELIEFS
UPDATE questions SET training_prompt_template = 'Your child faces a moral dilemma. Share how you chose between right and easy.' 
WHERE question_text = 'Describe a moment when you had to choose between doing what was right and what was easy.';

UPDATE questions SET training_prompt_template = 'Someone asks about times your beliefs were challenged. Share how you responded.' 
WHERE question_text = 'Tell me about a time when your faith or beliefs were tested, and how you responded.';

UPDATE questions SET training_prompt_template = 'A friend asks about standing up for your values. Tell them about choosing values over pressure.' 
WHERE question_text = 'Describe a moment when you had to choose between your values and social pressure.';

UPDATE questions SET training_prompt_template = 'Someone asks about surprising aspects of your beliefs. Share something that might surprise them.' 
WHERE question_text = 'What''s something you believe that might surprise people who know you?';

UPDATE questions SET training_prompt_template = 'A friend asks about changing your mind. Tell them about when someone influenced your thinking.' 
WHERE question_text = 'Tell me about a time when someone changed your mind about something important.';

UPDATE questions SET training_prompt_template = 'Your child asks what truly matters in life. Share that moment of realization.' 
WHERE question_text = 'Describe a moment when you realized what really matters most in life.';

-- Set default template for questions without specific templates
UPDATE questions 
SET training_prompt_template = 'Someone asks you about this experience. Share your story as you would with someone who cares about you.'
WHERE training_prompt_template IS NULL AND is_active = true;