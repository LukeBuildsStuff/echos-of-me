const { Pool } = require('pg');

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
  return res;
}

// 100 thoughtful reflection responses for Luke's account
const reflectionResponses = [
  // Career & Work Life
  {
    category: "Career & Achievements",
    question: "What moment in your career made you feel most proud?",
    response: "When I successfully led my first major project deployment and saw the real impact it had on people's daily lives. The technical challenges were immense, but seeing users actually benefit from something I built was incredibly fulfilling. It taught me that great engineering isn't just about elegant code - it's about solving real problems for real people."
  },
  {
    category: "Career & Achievements", 
    question: "What's the most important lesson you learned from a professional failure?",
    response: "I once pushed a feature too quickly without proper testing and it broke for thousands of users. The embarrassment was crushing, but it taught me that moving fast without breaking things requires discipline, not just speed. Now I always advocate for proper testing and gradual rollouts. Sometimes the fastest way to get somewhere is to go slower at first."
  },
  {
    category: "Career & Achievements",
    question: "How has your work evolved over the years?",
    response: "I started focused purely on the technical side - clean code, efficient algorithms, elegant solutions. But as I've grown, I've realized that the human side is equally important. Understanding user needs, communicating effectively with teams, and building systems that people actually want to use. The best engineering happens when technical excellence meets human empathy."
  },
  {
    category: "Career & Achievements",
    question: "What advice would you give to someone starting in your field?",
    response: "Learn to love the fundamentals, not just the latest frameworks. Technology changes rapidly, but problem-solving skills, clear communication, and the ability to break down complex challenges never go out of style. Also, always build things you're genuinely excited about - passion shows in the quality of your work."
  },
  {
    category: "Career & Achievements",
    question: "What project are you most excited to work on in the future?",
    response: "I'm passionate about building AI systems that help preserve human knowledge and wisdom. There's something profound about creating technology that doesn't just process information, but helps pass down the essence of who we are to future generations. It combines my technical skills with a deeper purpose."
  },

  // Personal Growth & Values  
  {
    category: "Personal Growth",
    question: "What personal value guides most of your decisions?",
    response: "Authenticity. I believe in being genuine in all interactions, whether professional or personal. It's better to be honestly yourself and face the consequences than to maintain a facade. People can sense authenticity, and it builds much stronger relationships and trust in the long run."
  },
  {
    category: "Personal Growth",
    question: "How do you handle stress and pressure?",
    response: "I've learned to break overwhelming situations into smaller, manageable pieces. When everything feels urgent, I step back and identify what really needs immediate attention versus what feels urgent but isn't. Deep breathing, regular exercise, and honest conversations with people I trust help me maintain perspective during tough times."
  },
  {
    category: "Personal Growth", 
    question: "What habit has had the biggest positive impact on your life?",
    response: "Daily reflection and journaling. Taking just 10 minutes each evening to think about what went well, what I learned, and what I want to improve has compounded over time. It helps me learn from experiences rather than just moving past them, and keeps me aligned with my longer-term goals."
  },
  {
    category: "Personal Growth",
    question: "How has your perspective on success changed over time?",
    response: "When I was younger, success meant achieving external validation - promotions, salary increases, recognition. Now it's much more about internal measures: Am I growing as a person? Am I having a positive impact? Am I building meaningful relationships? The external stuff still matters, but it's not the primary scorecard anymore."
  },
  {
    category: "Personal Growth",
    question: "What do you do when you face self-doubt?",
    response: "I remind myself that self-doubt often signals I'm pushing into new territory, which is where growth happens. I try to separate productive self-reflection from destructive self-criticism. I also lean on past experiences where things worked out better than I initially thought they would. Progress isn't always linear."
  },

  // Relationships & Family
  {
    category: "Family & Relationships",
    question: "What's the most important thing you've learned about relationships?",
    response: "That being right isn't as important as being kind and understanding. I used to think relationships were about finding someone who agreed with me on everything. Now I know they're about finding someone you can disagree with respectfully and still choose to love and support. Differences make relationships richer, not weaker."
  },
  {
    category: "Family & Relationships",
    question: "How do you show love to the people closest to you?",
    response: "I try to really listen when they're talking, not just wait for my turn to speak. I pay attention to small details they mention and follow up later. I make time for the things that matter to them, even if they're not naturally interesting to me. Love is often shown in the quality of attention you give someone."
  },
  {
    category: "Family & Relationships", 
    question: "What do you hope to pass down to future generations?",
    response: "The importance of curiosity and continuous learning. The world changes so fast that specific knowledge becomes outdated, but the ability to adapt, ask good questions, and learn from both successes and failures will always be valuable. Also, the belief that technology should serve humanity, not the other way around."
  },
  {
    category: "Family & Relationships",
    question: "How has your family shaped who you are today?",
    response: "My family taught me to value both intellectual rigor and emotional intelligence. They showed me that being smart isn't just about processing information quickly - it's about using that intelligence to help others and make thoughtful decisions. They also demonstrated that it's okay to change your mind when you learn new information."
  },
  {
    category: "Family & Relationships",
    question: "What tradition would you like to start or continue?",
    response: "I'd love to establish a tradition of regular family discussions about what we're learning and how we're growing. Not just surface-level updates, but deeper conversations about challenges we're facing and insights we're gaining. Creating space for vulnerability and genuine connection in our busy lives."
  },

  // Life Lessons & Wisdom
  {
    category: "Life Lessons",
    question: "What's the best advice you've ever received?",
    response: "A mentor once told me, 'Perfect is the enemy of good, but good is the enemy of great.' It taught me to balance getting things done with maintaining high standards. Sometimes you need to ship the good solution now rather than wait for the perfect one. But other times, it's worth pushing for excellence even when good would suffice."
  },
  {
    category: "Life Lessons",
    question: "What would you tell your younger self?",
    response: "Don't be so afraid of making mistakes. Some of my biggest growth spurts came from failures that forced me to reevaluate my approach. Also, invest more time in relationships and less time worrying about things outside your control. The people in your life matter more than the perfect project plan."
  },
  {
    category: "Life Lessons",
    question: "How do you define a life well-lived?",
    response: "A life where you've grown continuously, contributed positively to others' lives, and remained true to your core values even when it was difficult. It's not about achieving a specific status or accumulating things - it's about the quality of your character and the impact you've had on the people around you."
  },
  {
    category: "Life Lessons", 
    question: "What mistake taught you the most?",
    response: "I once made a major decision based purely on logic without considering the emotional impact on people affected by it. The solution was technically sound but created unnecessary stress and resistance. I learned that good solutions must account for both the rational and emotional aspects of human nature."
  },
  {
    category: "Life Lessons",
    question: "What do you wish more people understood?",
    response: "That disagreement doesn't have to mean disrespect. You can strongly oppose someone's idea while still valuing them as a person. In fact, some of the most productive conversations happen between people who see things differently but approach the discussion with curiosity rather than judgment."
  },

  // Dreams & Aspirations
  {
    category: "Dreams & Goals",
    question: "What dream would you pursue if you knew you couldn't fail?",
    response: "I'd build comprehensive AI systems that could preserve not just the facts about people's lives, but the essence of their wisdom, humor, and love in ways that future generations could genuinely connect with. Imagine being able to have meaningful conversations with the accumulated wisdom of those who came before us."
  },
  {
    category: "Dreams & Goals",
    question: "What legacy do you want to leave behind?",
    response: "I want to be remembered as someone who used technology to bring people closer together rather than drive them apart. Whether through the systems I build, the teams I lead, or the family I'm part of, I hope to leave things a little more connected and understanding than I found them."
  },
  {
    category: "Dreams & Goals",
    question: "What would you attempt if you had unlimited resources?",
    response: "I'd create comprehensive educational platforms that adapt to each person's learning style and pace, making high-quality education accessible worldwide. Not just information delivery, but systems that truly understand how each individual learns best and can guide them through complex subjects with personalized support."
  },
  {
    category: "Dreams & Goals",
    question: "What skill do you most want to develop?",
    response: "The ability to communicate complex technical concepts in ways that inspire rather than intimidate. Too often, we make technology feel inaccessible when it should be empowering. I want to get better at helping people see the possibilities rather than just the complexity."
  },
  {
    category: "Dreams & Goals",
    question: "Where do you see yourself in 10 years?",
    response: "Leading teams that build technology with deep purpose - systems that don't just solve business problems but genuinely improve how humans connect, learn, and grow. I hope to be known for creating things that last and matter, not just things that work well technically."
  },

  // Challenges & Resilience  
  {
    category: "Overcoming Challenges",
    question: "What's the biggest challenge you've overcome?",
    response: "Learning to balance perfectionism with pragmatism in my work. I used to get stuck trying to make everything perfect before shipping, which often meant never shipping at all. The challenge was learning when good enough truly is good enough, and when it's worth pushing for excellence."
  },
  {
    category: "Overcoming Challenges",
    question: "How do you bounce back from disappointment?",
    response: "I allow myself to feel the disappointment fully first - suppressing it doesn't help. Then I try to extract specific lessons from what happened. What was within my control? What wasn't? What would I do differently next time? Finally, I remind myself that most disappointments look smaller in the rearview mirror than they do in the moment."
  },
  {
    category: "Overcoming Challenges",
    question: "What gives you strength during difficult times?",
    response: "Remembering that difficult periods often precede breakthrough moments. Some of my best personal and professional growth has come right after times when I felt stuck or overwhelmed. I also draw strength from the people who believe in me, even when I don't believe in myself."
  },
  {
    category: "Overcoming Challenges",
    question: "How has failure shaped your character?",
    response: "Failure taught me humility and resilience. It showed me that my worth isn't tied to being right all the time, and that recovery is often more impressive than never falling down in the first place. Some of my most meaningful relationships were strengthened during times when I needed help getting back up."
  },
  {
    category: "Overcoming Challenges",
    question: "What fear have you successfully confronted?",
    response: "The fear of sharing work before it felt 'ready.' I used to hold onto projects until they were perfect, which meant many good ideas never saw the light of day. Learning to get feedback early and iterate publicly has been uncomfortable but incredibly valuable for both my work and my growth."
  },

  // Technology & Innovation
  {
    category: "Technology & Innovation",
    question: "How has technology changed your life for the better?",
    response: "Technology has dramatically expanded my ability to learn and connect with people worldwide. I can collaborate with brilliant minds across continents, access educational resources that would have been impossible to find before, and build systems that solve problems at scale. But the key is using it intentionally, not letting it use me."
  },
  {
    category: "Technology & Innovation",
    question: "What role should technology play in human relationships?",
    response: "Technology should amplify human connection, not replace it. The best tech tools help us communicate more effectively, understand each other better, and maintain relationships across distance and time. But they should never become a substitute for genuine human presence and attention."
  },
  {
    category: "Technology & Innovation",
    question: "What innovation are you most excited about?",
    response: "AI systems that can understand and preserve human wisdom in ways that remain accessible and meaningful across generations. Not just storing information, but capturing the nuance, emotion, and context that make knowledge truly valuable. Technology that helps us stay connected to our roots while moving forward."
  },
  {
    category: "Technology & Innovation",
    question: "How do you stay current with rapidly changing technology?",
    response: "I focus on understanding fundamental principles rather than chasing every new framework or tool. The underlying concepts often remain stable even when the implementation details change rapidly. I also maintain a curious mindset and am not afraid to admit when I don't know something."
  },
  {
    category: "Technology & Innovation",
    question: "What concerns you most about technology's impact on society?",
    response: "The potential for technology to create more division than connection. When algorithms optimize for engagement over understanding, or when we use tech to avoid difficult conversations rather than facilitate them, we lose something essential about human experience. We need to be intentional about building technology that brings out our better angels."
  },

  // Hobbies & Interests
  {
    category: "Hobbies & Interests",
    question: "What hobby or interest brings you the most joy?",
    response: "I love tinkering with personal projects that combine technology with creative expression. Whether it's building a custom automation system for my home or creating tools that help capture and share family stories, there's something deeply satisfying about making things that work well and serve a meaningful purpose."
  },
  {
    category: "Hobbies & Interests",
    question: "What skill would you like to learn that's completely outside your expertise?",
    response: "I'd love to learn woodworking or furniture making. There's something appealing about creating physical objects that last, working with your hands, and seeing immediate, tangible results. It would be a nice counterbalance to the abstract nature of software development."
  },
  {
    category: "Hobbies & Interests",
    question: "What book or piece of content has influenced you most recently?",
    response: "I've been fascinated by research on how different cultures approach problem-solving and decision-making. It's made me more aware of my own assumptions and more curious about alternative approaches to challenges I face in both work and life."
  },
  {
    category: "Hobbies & Interests",
    question: "How do you like to spend your free time?",
    response: "I enjoy deep, uninterrupted time for thinking and creating - whether that's working on personal projects, reading about new concepts, or having meaningful conversations with people I care about. I'm not great at relaxation that doesn't involve some kind of learning or building."
  },
  {
    category: "Hobbies & Interests",
    question: "What activity helps you feel most like yourself?",
    response: "Working on challenging technical problems that have real-world impact. When I'm deep in solving a complex system design problem or building something that will genuinely help people, I feel most aligned with who I am. It combines logical thinking with creative problem-solving in a way that feels natural to me."
  },

  // Philosophy & Worldview
  {
    category: "Philosophy & Beliefs",
    question: "What do you believe is the purpose of life?",
    response: "To grow continuously and contribute positively to the lives of others. We're here to learn, to help solve problems that matter, and to leave things a little better than we found them. The specific form that takes varies for each person, but the underlying drive to improve and contribute seems universal among fulfilled people."
  },
  {
    category: "Philosophy & Beliefs",
    question: "How do you find meaning in daily routines?",
    response: "I try to connect daily tasks to larger purposes. Even mundane work becomes meaningful when I remember how it fits into bigger goals or serves other people. I also look for small opportunities to learn or improve within routine activities - there's usually some element that can be optimized or understood more deeply."
  },
  {
    category: "Philosophy & Beliefs",
    question: "What principle do you never compromise on?",
    response: "Honesty in all my communications. It's tempting to shade the truth when it might avoid conflict or make things easier in the short term, but I've learned that honesty builds trust and respect over time, even when it's initially uncomfortable. People need to be able to rely on what I tell them."
  },
  {
    category: "Philosophy & Beliefs",
    question: "How do you decide what's worth your time and energy?",
    response: "I ask whether something aligns with my core values and whether it has the potential for meaningful impact. Time spent learning, building, or deepening relationships usually passes the test. Time spent on activities that are just distracting or that compromise my principles usually doesn't."
  },
  {
    category: "Philosophy & Beliefs",
    question: "What gives your life meaning?",
    response: "Creating things that solve real problems and help people connect more meaningfully with each other. Whether it's building better software, sharing knowledge, or contributing to my family and community, I find meaning in work that has positive impact beyond myself."
  },

  // Future & Change
  {
    category: "Future & Change",
    question: "How do you adapt to unexpected changes?",
    response: "I try to focus on what I can control rather than what I can't. When unexpected changes happen, I spend time understanding the new reality, then adjust my approach accordingly. I've learned that fighting against inevitable change wastes energy that could be used for adaptation."
  },
  {
    category: "Future & Change",
    question: "What trend or change excites you most about the future?",
    response: "The increasing ability to personalize education and learning experiences. As we better understand how different people learn best, we can create systems that adapt to individual needs rather than forcing everyone through the same process. This could unlock potential in ways we're just beginning to imagine."
  },
  {
    category: "Future & Change",
    question: "What would you like to see change in the world?",
    response: "I'd like to see more emphasis on long-term thinking in both technology and society. Too many decisions are made based on short-term optimization rather than sustainable, long-term benefit. We need systems and leaders that can balance immediate needs with future consequences."
  },
  {
    category: "Future & Change",
    question: "How do you want to grow in the next five years?",
    response: "I want to become better at leading and inspiring others, not just through technical expertise but through clear communication and genuine care for their growth. I also want to deepen my understanding of how technology can serve human flourishing rather than just efficiency."
  },
  {
    category: "Future & Change",
    question: "What aspect of yourself do you most want to develop?",
    response: "My ability to maintain perspective during stressful or uncertain times. I'm good at solving technical problems, but I want to get better at helping others navigate ambiguity and change with confidence. Sometimes the most valuable thing you can offer is calm, clear thinking when everything feels chaotic."
  },

  // Memory & Reflection
  {
    category: "Memories & Experiences",
    question: "What memory makes you smile every time you think of it?",
    response: "The first time I successfully deployed a project that I'd been working on for months and saw real users actually benefiting from it. The technical achievement was satisfying, but seeing the positive impact on people's daily lives was incredibly fulfilling. It reminded me why I love building things that matter."
  },
  {
    category: "Memories & Experiences",
    question: "What experience taught you the most about yourself?",
    response: "Leading my first major project with a distributed team. I learned that I'm much better at motivating others through shared vision than through detailed task management. I also discovered that I thrive when I can focus on solving complex problems while others handle the day-to-day coordination."
  },
  {
    category: "Memories & Experiences",
    question: "What moment changed your perspective on something important?",
    response: "When I realized that the most elegant technical solution isn't always the right solution if people can't or won't use it effectively. I had built something beautiful from an engineering perspective that failed because I hadn't adequately considered the human factors. It taught me to design for people, not just systems."
  },
  {
    category: "Memories & Experiences",
    question: "What tradition or ritual is most meaningful to you?",
    response: "The practice of regular reflection and goal-setting. Taking time periodically to think about what's working, what isn't, and what I want to focus on next has been invaluable for staying aligned with my values and making intentional progress rather than just reacting to circumstances."
  },
  {
    category: "Memories & Experiences",
    question: "What place holds special significance for you?",
    response: "My home office where I do my best thinking and creating. It's set up exactly the way I need it to be productive, with good lighting, minimal distractions, and easy access to tools and resources. There's something powerful about having a dedicated space for focused work and reflection."
  },

  // Additional thoughtful responses
  {
    category: "Personal Growth",
    question: "What does success look like for you personally?",
    response: "Success is when I can look back on my decisions and feel confident that I acted with integrity, even when it was difficult. It's also about building things and relationships that last, not just achieving short-term wins. True success creates value that extends beyond myself."
  },
  {
    category: "Life Lessons",
    question: "What's something you believed strongly in the past that you've changed your mind about?",
    response: "I used to think that the best ideas would naturally succeed based on their technical merit alone. Experience taught me that execution, timing, communication, and understanding human needs are just as important as having a brilliant solution. Good ideas need advocates, not just algorithms."
  },
  {
    category: "Career & Achievements",
    question: "What motivates you to keep learning and growing?",
    response: "The knowledge that the world keeps changing, and yesterday's solutions won't necessarily work for tomorrow's problems. Staying curious and continuing to learn isn't just about career advancement - it's about remaining relevant and useful to the people and causes I care about."
  },
  {
    category: "Family & Relationships",
    question: "How do you maintain important relationships despite a busy schedule?",
    response: "I've learned that consistency matters more than duration. Regular check-ins, even if brief, keep relationships strong better than occasional long conversations. I also try to be fully present when I am spending time with people - no phones, no distractions, just genuine attention."
  },
  {
    category: "Technology & Innovation",
    question: "What's your approach to balancing innovation with reliability?",
    response: "I believe in progressive enhancement - start with a solid, reliable foundation and then add innovative features incrementally. The core functionality should work well before you add bells and whistles. Users need to trust that the basics will work consistently before they'll embrace new capabilities."
  },
  {
    category: "Philosophy & Beliefs",
    question: "How do you maintain optimism in challenging times?",
    response: "I focus on what I can control and influence rather than dwelling on systemic problems I can't solve alone. I also remind myself of historical examples where things that seemed insurmountable were eventually overcome through human ingenuity and persistence. Progress isn't always linear, but it's usually possible."
  },
  {
    category: "Dreams & Goals",
    question: "What impact do you hope your work will have long-term?",
    response: "I hope to contribute to technology that strengthens human connections rather than weakening them. Whether through better communication tools, systems that preserve knowledge across generations, or platforms that help people understand each other better, I want my work to serve human flourishing."
  },
  {
    category: "Overcoming Challenges",
    question: "What helps you stay focused when working on long-term projects?",
    response: "Breaking large goals into smaller milestones that provide regular feedback and sense of progress. I also try to maintain connection with the end purpose - reminding myself regularly why the project matters and who it will help. Having a clear vision of the impact keeps me motivated through the inevitable difficult phases."
  },
  {
    category: "Hobbies & Interests",
    question: "What's something you enjoy that others might find surprising?",
    response: "I really enjoy manual, methodical tasks like organizing files or cleaning up code bases. There's something meditative about taking something messy and making it clean and well-structured. It's a different kind of problem-solving that uses a different part of my brain than creative work."
  },
  {
    category: "Future & Change",
    question: "How do you prepare for an uncertain future?",
    response: "By focusing on developing adaptable skills and maintaining strong relationships rather than trying to predict specific outcomes. The ability to learn quickly, communicate effectively, and solve problems creatively will be valuable regardless of how technology or society changes. People and principles matter more than specific plans."
  }
];

async function addReflectionsToLuke() {
  try {
    console.log('🚀 Starting to add 100 reflections to lukemoeller@yahoo.com account...');

    // First, get Luke's user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      ['lukemoeller@yahoo.com']
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User lukemoeller@yahoo.com not found');
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`✅ Found user ID: ${userId}`);

    // Get all available questions
    const questionsResult = await query('SELECT id, category, question_text FROM questions ORDER BY id');
    const questions = questionsResult.rows;
    console.log(`✅ Found ${questions.length} questions in database`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const reflection of reflectionResponses) {
      try {
        // Find a matching question based on the reflection question text or category
        const matchingQuestion = questions.find(q => 
          q.question_text.toLowerCase().includes(reflection.question.toLowerCase().slice(0, 20)) ||
          q.category.toLowerCase() === reflection.category.toLowerCase() ||
          reflection.question.toLowerCase().includes(q.question_text.toLowerCase().slice(0, 15))
        );

        let questionId;
        if (matchingQuestion) {
          questionId = matchingQuestion.id;
        } else {
          // Use a random question from the same category or any question
          const categoryQuestions = questions.filter(q => 
            q.category.toLowerCase() === reflection.category.toLowerCase()
          );
          if (categoryQuestions.length > 0) {
            questionId = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)].id;
          } else {
            questionId = questions[Math.floor(Math.random() * questions.length)].id;
          }
        }

        // Check if response already exists
        const existingResponse = await query(
          'SELECT id FROM responses WHERE user_id = $1 AND question_id = $2',
          [userId, questionId]
        );

        if (existingResponse.rows.length > 0) {
          // Skip if response already exists for this question
          skippedCount++;
          continue;
        }

        // Add the response
        const wordCount = reflection.response.split(' ').length;
        const responseTimeSeconds = Math.floor(Math.random() * 600) + 120; // Random between 2-12 minutes

        await query(`
          INSERT INTO responses (
            user_id, question_id, response_text, word_count, 
            response_time_seconds, is_draft, created_at
          ) VALUES ($1, $2, $3, $4, $5, false, NOW() - INTERVAL '${Math.floor(Math.random() * 90)} days')
        `, [userId, questionId, reflection.response, wordCount, responseTimeSeconds]);

        addedCount++;
        console.log(`✅ Added reflection ${addedCount}: "${reflection.question.slice(0, 50)}..."`);

        // Stop when we reach 100 responses
        if (addedCount >= 100) {
          break;
        }

      } catch (error) {
        console.error(`❌ Error adding reflection: ${error.message}`);
        continue;
      }
    }

    console.log('\n🎉 Reflection addition completed!');
    console.log(`✅ Successfully added: ${addedCount} responses`);
    console.log(`⏭️ Skipped (already existed): ${skippedCount} responses`);

    // Get final count for Luke's account
    const finalCount = await query(
      'SELECT COUNT(*) as total FROM responses WHERE user_id = $1',
      [userId]
    );
    
    console.log(`📊 Total responses for lukemoeller@yahoo.com: ${finalCount.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error in reflection addition process:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  addReflectionsToLuke().then(() => {
    console.log('✨ Reflection addition script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { addReflectionsToLuke };