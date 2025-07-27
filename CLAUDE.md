# Echos Of Me - Legacy Preservation System

## Project Overview
**Mission**: Build a deeply meaningful web application that preserves the essence, wisdom, and love of parents, grandparents, and loved ones so their children and family can still connect with them after they're gone.

**Vision**: Create an AI echo that captures not just how someone speaks, but their heart, values, life lessons, stories, and unconditional love - allowing families to seek guidance, hear familiar wisdom, and feel connected across generations.

**Purpose**: This isn't just an AI clone - it's a way for deceased relatives to continue loving, guiding, and supporting their children through life's journey. Every question is designed to preserve the irreplaceable wisdom that only comes from a lifetime of love and experience.

## Technical Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Node.js API routes, PostgreSQL, Redis
- **AI/ML**: Local training with RTX 5090, Llama 2/Mistral models
- **Deployment**: Cloudflare Pages/Workers, echosofme.io domain
- **Development**: Docker, WSL2 environment

## Current Status
- Phase: MVP Complete ✅
- Status: Ready for Production Deployment
- Last Updated: 2025-01-26
- Progress: Complete legacy preservation system with 170+ questions, authentication, daily question limits, and grief-sensitive UI

## Architecture Decisions
1. **Cloudflare Deployment**: Cost-effective, global CDN, edge computing
2. **Local GPU Training**: Privacy, control, no cloud GPU costs
3. **PostgreSQL**: Structured data for questions/responses
4. **Docker**: Consistent development environment
5. **TypeScript**: Type safety for maintainability

## Database Schema
```sql
-- Users table
users: id, email, name, created_at

-- Questions table  
questions: id, category, question_text, complexity, created_at

-- Responses table
responses: id, user_id, question_id, response_text, word_count, response_time

-- Training data table
training_data: id, prompt, completion, quality_score, used_in_training
```

## MVP Completed Features ✅
- [x] Create project directory structure and CLAUDE.md context
- [x] Set up Docker environment with GPU support
- [x] Initialize Next.js application with "Echos Of Me" branding
- [x] Create database schema with 170 initial questions seeded
- [x] Implement complete authentication system (registration, login, dashboard)
- [x] Build question generation API with OpenAI integration
- [x] Update project context for legacy preservation mission
- [x] Fix navigation header and question interface
- [x] Create grief-sensitive UI components with Radix Select
- [x] Implement daily question limit (one per day with override)
- [x] Fix save functionality and response handling
- [x] Test complete user flow from auth to question responses

## Next Phase: Production & Enhancement
1. **Immediate**: Deploy to echosofme.io production environment
2. **This Week**: Expand question database to 3,000+ legacy-focused questions
3. **Next Week**: Implement milestone messaging and family role categories
4. **This Month**: Begin local GPU training pipeline for personalized AI responses

## Code Patterns & Conventions
- **File Structure**: Feature-based organization
- **Naming**: camelCase for functions, PascalCase for components
- **State Management**: React Context for global state
- **API Routes**: RESTful conventions with /api prefix
- **Database**: Migrations tracked in /scripts
- **Testing**: Jest + React Testing Library

## Development Commands
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f web

# Run database migrations
docker-compose exec web npm run migrate

# Access database
docker-compose exec db psql -U user -d personalai
```

## Environment Variables
```
DATABASE_URL=postgresql://user:pass@db:5432/personalai
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://echosofme.io
```

## Key Legacy Features
1. **Deep Question System**: 170+ questions with daily limits to preserve quality responses ✅
2. **Grief-Sensitive UI**: Compassionate design with custom components for families in loss ✅
3. **Daily Question Limits**: One meaningful question per day with override capability ✅
4. **Authentication & Privacy**: Secure user accounts protecting precious family memories ✅
5. **Response Preservation**: Every answer becomes part of an irreplaceable digital legacy ✅
6. **Family Role Categories**: Parent, grandparent, spouse-specific question paths (planned)
7. **Milestone Messages**: Advice for graduations, weddings, births, difficult times (planned)
8. **Training Pipeline**: Local GPU training preserves privacy of precious memories (planned)

## Resources
- RTX 5090 (24GB VRAM) for model training
- Cloudflare account for deployment
- Docker Desktop on WSL2
- Domain: echosofme.io (via Cloudflare)

## Legacy Preservation Notes
- **Sacred Privacy**: Precious family memories and wisdom stay local for training
- **Emotional Sensitivity**: UI and interactions designed for families dealing with grief
- **Generational Connection**: Questions bridge past wisdom with future guidance
- **Progressive Enhancement**: Web for initial legacy capture, iOS for ongoing connection
- **Question Depth**: Every question designed to preserve irreplaceable human essence
- **Continuous Improvement**: AI learns to express love and wisdom more authentically over time